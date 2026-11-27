import React, { useEffect, useState } from "react"
import { ScrollView, View, Text, Switch, Alert, Pressable } from "react-native"
import { AuthenticationService } from "../services/AuthenticationService"
import { SecureStorageService } from "../services/SecureStorageService"
import { useBudget } from "../context/BudgetContext"
import {
  clearAllData,
  checkBudgetThreshold,
  BUDGET_ALERT_MONTH_KEY,
} from "../services/database"
import { useAuth } from "../context/AuthContext"
import CategoryManager from "../components/CategoryManager"
import { Button, Card, Field } from "../components/ui"
import { makeStyles, useTheme } from "../theme"

export default function SettingsScreen() {
  const [biometricEnabled, setBiometricEnabled] = useState(false)
  const [biometricAvailable, setBiometricAvailable] = useState(false)
  const [budgetThreshold, setBudgetThreshold] = useState("")
  const [hasPasscode, setHasPasscode] = useState(false)
  const [newPasscode, setNewPasscode] = useState("")
  const { refreshData } = useBudget()
  const authService = AuthenticationService.getInstance()
  // The passcode prompt is rendered once by the root layout
  const { isAuthenticated, handleAuthentication, authError } = useAuth()
  const styles = useStyles()
  const { colors } = useTheme()

  useEffect(() => {
    initializeScreen()
  }, [])

  const initializeScreen = async () => {
    try {
      // Authenticate User, unless already authenticated at the app level
      if (!isAuthenticated) {
        await handleAuthentication()
      }

      // Load Settings
      await loadSettings()

    } catch (error) {
      Alert.alert("Error", "Error Loading Screen")
      console.error("Error Loading Screen:", error)
    }
  }

  const loadSettings = async () => {
    try {
      const secureStorage = SecureStorageService.getInstance()

      // Check biometric availability
      const isAvailable = await authService.isBiometricAvailable()
      setBiometricAvailable(isAvailable)

      // Load biometric settings
      const biometricEnabled = await secureStorage.getSecureItem(
        "biometric_enabled"
      )
      setBiometricEnabled(biometricEnabled === "true")

      // Load budget threshold
      const threshold = await secureStorage.getSecureItem("budget_threshold")
      // No alerts until a monthly budget is set
      setBudgetThreshold(threshold ?? "")

      //Load Passcode
      const hasPasscode = await authService.hasPasscode()
      if (hasPasscode) {
        const passcode = await authService.getPasscode()
        setNewPasscode(passcode ?? "")
        setHasPasscode(true)
      } else {
        setHasPasscode(false)
      }
    } catch (error) {
      console.error("Error loading settings:", error)
      Alert.alert("Error", "Failed to load settings")
    }
  }

  const toggleBiometric = async () => {
    try {
      const secureStorage = SecureStorageService.getInstance()
      const newValue = !biometricEnabled

      await secureStorage.saveSecureItem(
        "biometric_enabled",
        newValue.toString()
      )
      await authService.saveBiometricPreference(newValue)
      setBiometricEnabled(newValue)

      Alert.alert(
        "Success",
        `Authentication ${newValue ? "enabled" : "disabled"}`
      )
    } catch (error) {
      console.error("Error toggling authentication:", error)
      Alert.alert("Error", "Failed to update authentication settings")
    }
  }

  const updateBudgetThreshold = async () => {
    try {
      const threshold = parseFloat(budgetThreshold)
      if (isNaN(threshold) || threshold <= 0) {
        Alert.alert("Error", "Please enter a valid threshold amount")
        return
      }

      const secureStorage = SecureStorageService.getInstance()
      await secureStorage.saveSecureItem(
        "budget_threshold",
        threshold.toString()
      )

      // Allow the alert to fire again this month against the new threshold
      await secureStorage.deleteSecureItem(BUDGET_ALERT_MONTH_KEY)
      await checkBudgetThreshold()
      // The dashboard shows spending against the budget
      await refreshData()

      Alert.alert("Success", "Budget threshold updated successfully")
    } catch (error) {
      console.error("Error updating budget threshold:", error)
      Alert.alert("Error", "Failed to update budget threshold")
    }
  }

  const changePasscode = async () => {
    try {
      if (newPasscode.length !== 4 || !/^\d+$/.test(newPasscode)) {
        Alert.alert("Error", "Invalid Passcode")
        return
      }
      authService.setPasscode(newPasscode)
      Alert.alert("Success", "Passcode change successfull")
    } catch (error) {
      console.error("Error Changing Passcode:", error)
      Alert.alert("Error", "Failed to change passcode")
    }
  }

  const handleDelete = async () => {
    Alert.alert("Reset Passcode", "Are you sure you want to remove passcode?", [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Reset",
        style: "destructive",
        onPress: () => {
          try {
            authService.delPasscode()
            loadSettings()
          } catch (error) {
            Alert.alert("Error", "Action Unsuccessfull")
          }
        },
      },
    ])
  }

  const handleClearDatabase = async () => {
    Alert.alert(
      "Clear All Data",
      "Are you sure you want to clear all data? This action is irreversible.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Clear All Data",
          style: "destructive",
          onPress: async () => {
            try {
              const success = await clearAllData()
              if (success) {
                await refreshData()
                Alert.alert("Success", "All data has been cleared")
              } else {
                Alert.alert("Error", "Failed to clear data")
              }
            } catch (error) {
              console.error("Error clearing database:", error)
              Alert.alert("Error", "Failed to clear data")
            }
          },
        },
      ]
    )
  }

  const switchColors = {
    trackColor: { false: colors.border, true: colors.primarySoft },
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled">
      {!isAuthenticated ? (
        <View style={styles.authContainer}>
          <Text style={styles.authTitle}>Settings are locked</Text>
          <Text style={styles.authMessage}>
            {authError || "Please authenticate to access your budget data"}
          </Text>
          <Button
            title="Authenticate"
            onPress={handleAuthentication}
          />
        </View>
      ) : (
        <View>
          <Text style={styles.groupLabel}>Budget</Text>
          <Card style={styles.card}>
            <Field
              label="Monthly budget (₦)"
              value={budgetThreshold}
              onChangeText={setBudgetThreshold}
              keyboardType="numeric"
              placeholder="e.g. 250000"
              hint="You'll be alerted once when this month's spending reaches it"
            />
            <Button
              title="Save Budget"
              onPress={updateBudgetThreshold}
            />
          </Card>

          <Text style={styles.groupLabel}>Categories</Text>
          <CategoryManager />

          <Text style={styles.groupLabel}>Security</Text>
          <Card style={styles.card}>
            <View style={styles.settingRow}>
              <View style={styles.settingText}>
                <Text style={styles.settingLabel}>Lock the app</Text>
                <Text style={styles.settingHint}>
                  {biometricEnabled
                    ? biometricAvailable
                      ? "Unlock with fingerprint or face, or your passcode"
                      : "Unlock with your passcode"
                    : "Anyone with your phone can open the app"}
                </Text>
              </View>
              <Switch
                value={biometricEnabled}
                onValueChange={toggleBiometric}
                {...switchColors}
                thumbColor={
                  biometricEnabled ? colors.primary : colors.surfaceMuted
                }
              />
            </View>

            {hasPasscode && biometricEnabled && (
              <View style={styles.passcode}>
                <Field
                  label="Passcode"
                  value={newPasscode}
                  secureTextEntry
                  maxLength={4}
                  onChangeText={setNewPasscode}
                  keyboardType="numeric"
                  placeholder="••••"
                />
                <Button
                  title="Change Passcode"
                  variant="secondary"
                  onPress={changePasscode}
                />
                <Pressable
                  onPress={handleDelete}
                  hitSlop={8}
                  style={styles.linkButton}>
                  <Text style={styles.dangerLink}>Remove passcode</Text>
                </Pressable>
              </View>
            )}
          </Card>

          <Text style={styles.groupLabel}>Data</Text>
          <Card style={styles.card}>
            <Text style={styles.settingHint}>
              Deletes all income, expenses and planned purchases on this phone.
              This can't be undone.
            </Text>
            <Button
              title="Clear All Data"
              variant="danger"
              onPress={handleClearDatabase}
              style={styles.dangerButton}
            />
          </Card>
        </View>
      )}
    </ScrollView>
  )
}

const useStyles = makeStyles(({ colors, spacing, font }) => ({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xl * 2,
  },
  groupLabel: {
    fontSize: font.caption,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: colors.textMuted,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  card: {
    marginBottom: spacing.xl,
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  settingText: {
    flex: 1,
    gap: 2,
  },
  settingLabel: {
    fontSize: font.body,
    fontWeight: "600",
    color: colors.text,
  },
  settingHint: {
    fontSize: font.label,
    color: colors.textMuted,
    lineHeight: 20,
  },
  passcode: {
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  linkButton: {
    alignSelf: "center",
    marginTop: spacing.md,
  },
  dangerLink: {
    fontSize: font.label,
    fontWeight: "600",
    color: colors.danger,
  },
  dangerButton: {
    marginTop: spacing.md,
  },
  authContainer: {
    alignItems: "center",
    paddingVertical: spacing.xl * 2,
    gap: spacing.md,
  },
  authTitle: {
    fontSize: font.title,
    fontWeight: "700",
    color: colors.text,
  },
  authMessage: {
    fontSize: font.body,
    color: colors.textMuted,
    textAlign: "center",
    marginBottom: spacing.md,
  },
}))
