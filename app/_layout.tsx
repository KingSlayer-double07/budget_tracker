import { Stack, useRouter } from "expo-router"
import { useEffect, useState } from "react"
import { handleRecurringUpdates, initializeDatabase } from "./database"
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native"
import { BudgetProvider } from "./context/BudgetContext"
import { AuthProvider, useAuth } from "./context/AuthContext"
import { GestureHandlerRootView } from "react-native-gesture-handler"
import {
  StyleSheet,
  View,
  ActivityIndicator,
  Text,
  TouchableOpacity,
  AppState,
  Alert,
} from "react-native"
import { NotificationService } from "./services/NotificationService"
//import { AuthenticationService } from './services/AuthenticationService';
import { PasscodeModal } from "./components/PasscodeModal"
import { TransactionsProvider } from "./context/TransactionsContext"

function AppContent() {
  const [isLoading, setIsLoading] = useState(true)
  const {
    isAuthenticated,
    authError,
    handleAuthentication,
    showPasscodeModal,
    isNewPasscode,
    handlePasscodeSubmit,
    setShowPasscodeModal,
  } = useAuth()
  const router = useRouter()
  const [authenticated, setAuthenticated] = useState(false)

  useEffect(() => {
    initializeApp()
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
      // Handle recurring updates
      handleRecurringUpdates()

      // Initialize notifications
      const notificationService = NotificationService.getInstance()
      await notificationService.initialize()

      // Set up notification listeners
      const notificationListener = notificationService.addNotificationListener(
        (notification) => {
          console.log("Received notification:", notification)
        }
      )

      const responseListener =
        notificationService.addNotificationResponseListener(
          async (response) => {
            console.log("Notification response:", response)

            const { actionIdentifier, notification } = response
            const { data } = notification.request.content

            if (actionIdentifier === "CANCEL_FUTURE" && data?.identifier) {
              try {
                await notificationService.cancelFutureOccurrences(
                  data.selected,
                  data.identifier
                )
                console.log(
                  "Future occurrences cancelled for:",
                  data.identifier
                )
              } catch (error) {
                console.error("Error cancelling future occurrences:", error)
              }
            }
          }
        )

      // Initial authentication check
      await handleAuthentication()

      // Cleanup listeners on unmount
      return () => {
        notificationService.removeNotificationListener(notificationListener)
        notificationService.removeNotificationListener(responseListener)
      }
    } catch (error) {
      console.error("Error initializing app:", error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator
          size="large"
          color="#043927"
        />
      </View>
    )
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      {!authenticated && !isAuthenticated ? (
        <View style={styles.authContainer}>
          <Text style={styles.authTitle}>Budget Tracker</Text>
          <Text style={styles.authMessage}>
            {authError || "Please authenticate to access your budget data"}
          </Text>
          <TouchableOpacity
            style={styles.authButton}
            onPress={handleAuthentication}>
            <Text style={styles.authButtonText}>Authenticate</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <BudgetProvider>
          <TransactionsProvider>
            <Stack
              screenOptions={{
                headerStyle: {
                  backgroundColor: "#043927",
                },
                headerTintColor: "#fff",
                headerTitleStyle: {
                  fontWeight: "bold",
                },
              }}>
              <Stack.Screen
                name="index"
                options={{
                  title: "Budget Tracker",
                  animation: "slide_from_right",
                }}
              />
              <Stack.Screen
                name="addIncomeScreen"
                options={{
                  title: "Add Income",
                  animation: "slide_from_right",
                }}
              />
              <Stack.Screen
                name="addExpenseScreen"
                options={{
                  title: "Add Expense",
                  animation: "slide_from_right",
                }}
              />
              <Stack.Screen
                name="addPurchaseScreen"
                options={{
                  title: "Add Planned Purchase",
                  animation: "slide_from_right",
                }}
              />
              <Stack.Screen
                name="plannedPurchasesScreen"
                options={{
                  title: "Planned Purchases",
                  animation: "flip",
                }}
              />
              <Stack.Screen
                name="settingsScreen"
                options={{
                  title: "Settings",
                  animation: "simple_push",
                }}
              />
              <Stack.Screen
                name="statsScreen"
                options={{
                  title: "Statistics",
                  animation: "slide_from_right",
                }}
              />
            </Stack>
          </TransactionsProvider>
        </BudgetProvider>
      )}
      <PasscodeModal
        visible={showPasscodeModal}
        isNewPasscode={isNewPasscode}
        onCancel={() => {
          setAuthenticated(false), setShowPasscodeModal(false)
        }}
        onSubmit={handlePasscodeSubmit}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f4f4f4",
  },
  authContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f4f4f4",
    padding: 20,
  },
  authTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#043927",
    marginBottom: 20,
  },
  authMessage: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 30,
  },
  authButton: {
    backgroundColor: "#043927",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  authButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
})
