import {
  Stack,
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "expo-router"
import { useEffect, useState } from "react"
import * as Notifications from "expo-notifications"
import { initializeDatabase, stopRecurringByName } from "./database"
import { BudgetProvider } from "./context/BudgetContext"
import { AuthProvider, useAuth } from "./context/AuthContext"
import { GestureHandlerRootView } from "react-native-gesture-handler"
import { StatusBar } from "expo-status-bar"
import { View, Text, AppState } from "react-native"
import { makeStyles, useTheme } from "../theme"
import { Button, LoadingState } from "./components/ui"
import {
  NotificationService,
  CANCEL_FUTURE_ACTION,
} from "./services/NotificationService"
import { PasscodeModal } from "./components/PasscodeModal"
import { TransactionsProvider } from "./context/TransactionsContext"

function AppContent() {
  const [isLoading, setIsLoading] = useState(true)
  const [isWrongPasscode, setIsWrongPasscode] = useState(false)
  const {
    isAuthenticated,
    authError,
    handleAuthentication,
    showPasscodeModal,
    isNewPasscode,
    handlePasscodeSubmit,
    setShowPasscodeModal,
  } = useAuth()
  const [authenticated, setAuthenticated] = useState(false)
  const theme = useTheme()
  const styles = useStyles()

  // Navigation colours (screen backgrounds, cards) follow the app theme
  const baseNavigationTheme = theme.dark ? DarkTheme : DefaultTheme
  const navigationTheme = {
    ...baseNavigationTheme,
    colors: {
      ...baseNavigationTheme.colors,
      primary: theme.colors.primary,
      background: theme.colors.background,
      card: theme.colors.surface,
      text: theme.colors.text,
      border: theme.colors.border,
    },
  }

  useEffect(() => {
    initializeApp()
  }, [])

  // Handle notification actions; registered synchronously so the cleanup runs
  useEffect(() => {
    const notificationService = NotificationService.getInstance()
    // The same tap can arrive both via the listener and as the last response
    const handledResponses = new Set<string>()

    const handleResponse = async (
      response: Notifications.NotificationResponse
    ) => {
      const { actionIdentifier, notification } = response
      const { data } = notification.request.content
      const responseKey = `${notification.request.identifier}-${notification.date}-${actionIdentifier}`
      if (handledResponses.has(responseKey)) return
      handledResponses.add(responseKey)

      if (
        actionIdentifier === CANCEL_FUTURE_ACTION &&
        typeof data?.identifier === "string" &&
        (data.table === "income" || data.table === "expenses") &&
        typeof data.name === "string" &&
        typeof data.recurringDay === "string"
      ) {
        try {
          await stopRecurringByName(data.table, data.name, data.recurringDay)
          await notificationService.cancelFutureOccurrences(
            data.name,
            data.identifier
          )
        } catch (error) {
          console.error("Error cancelling future occurrences:", error)
        }
      }
    }

    const responseListener =
      notificationService.addNotificationResponseListener(handleResponse)

    // A tap that launched the app from a closed state may arrive before the
    // listener exists; handle it once, then clear it so it isn't re-handled
    const lastResponse = Notifications.getLastNotificationResponse()
    if (lastResponse) {
      Notifications.clearLastNotificationResponse()
      handleResponse(lastResponse)
    }

    return () => {
      notificationService.removeNotificationListener(responseListener)
    }
  }, [])

  // Handle app state changes
  useEffect(() => {
    const subscription = AppState.addEventListener(
      "change",
      async (nextAppState: string) => {
        if (nextAppState === "active") {
          // Re-authenticate when app comes to foreground
          await handleAuthentication()
        }
      }
    )

    return () => {
      subscription.remove()
    }
  }, [handleAuthentication])

  const initializeApp = async () => {
    try {
      // Initialize database
      await initializeDatabase()

      // Set Authentication
      setAuthenticated(isAuthenticated)

      // Initialize notifications
      const notificationService = NotificationService.getInstance()
      await notificationService.initialize()

      // Initial authentication check
      await handleAuthentication()
    } catch (error) {
      console.error("Error initializing app:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const submitPasscode = async (passcode: string) => {
    const success = await handlePasscodeSubmit(passcode)
    setIsWrongPasscode(!success)
  }

  if (isLoading) {
    return <LoadingState />
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      {/* Headers are green (light) or near-black (dark), so light icons suit both */}
      <StatusBar style="light" />
      {!authenticated && !isAuthenticated ? (
        <View style={styles.authContainer}>
          <Text style={styles.authTitle}>Budget Tracker</Text>
          <Text style={styles.authMessage}>
            {authError || "Please authenticate to access your budget data"}
          </Text>
          <Button
            title="Authenticate"
            onPress={handleAuthentication}
          />
        </View>
      ) : (
        <ThemeProvider value={navigationTheme}>
          <BudgetProvider>
            <TransactionsProvider>
              <Stack
                screenOptions={{
                  headerStyle: { backgroundColor: theme.colors.headerBackground },
                  headerTintColor: theme.colors.headerText,
                  headerTitleStyle: { fontWeight: "700" },
                  headerShadowVisible: false,
                  contentStyle: { backgroundColor: theme.colors.background },
                  animation: "slide_from_right",
                }}>
                <Stack.Screen
                  name="(tabs)"
                  options={{ headerShown: false }}
                />
                <Stack.Screen
                  name="addPurchaseScreen"
                  options={{ title: "New Planned Purchase" }}
                />
                <Stack.Screen
                  name="settingsScreen"
                  options={{ title: "Settings" }}
                />
              </Stack>
            </TransactionsProvider>
          </BudgetProvider>
        </ThemeProvider>
      )}
      <PasscodeModal
        visible={showPasscodeModal}
        isNewPasscode={isNewPasscode}
        isWrongPasscode={isWrongPasscode}
        onCancel={() => {
          setAuthenticated(false), setShowPasscodeModal(false)
        }}
        onSubmit={submitPasscode}
        onInputChange={() => setIsWrongPasscode(false)}
      />
    </GestureHandlerRootView>
  )
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

export const unstable_settings = {
  web: false,
};

const useStyles = makeStyles(({ colors, spacing, font }) => ({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  authContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.background,
    padding: spacing.xl,
  },
  authTitle: {
    fontSize: font.title,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing.md,
  },
  authMessage: {
    fontSize: font.body,
    color: colors.textMuted,
    textAlign: "center",
    marginBottom: spacing.xl,
  },
}))
