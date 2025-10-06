import * as LocalAuthentication from "expo-local-authentication"
import { SecureStorageService } from "./SecureStorageService"
import { Alert, Platform } from "react-native"

export class AuthenticationService {
  private static instance: AuthenticationService
  private secureStorage: SecureStorageService
  private readonly PASSCODE_KEY = "user_passcode"

  private constructor() {
    this.secureStorage = SecureStorageService.getInstance()
  }

  public static getInstance(): AuthenticationService {
    if (!AuthenticationService.instance) {
      AuthenticationService.instance = new AuthenticationService()
    }
    return AuthenticationService.instance
  }

  public async isBiometricAvailable(): Promise<boolean> {
    try {
      const compatible = await LocalAuthentication.hasHardwareAsync()
      const enrolled = await LocalAuthentication.isEnrolledAsync()
      return compatible && enrolled
    } catch (error) {
      console.error("Error checking biometric availability:", error)
      return false
    }
  }

  public async authenticateWithBiometrics(): Promise<boolean> {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Authenticate to access your budget data",
        fallbackLabel: "Use passcode",
        disableDeviceFallback: false,
        cancelLabel: "Cancel",
      })

      return result.success
    } catch (error) {
      console.error("Error during biometric authentication:", error)
      return false
    }
  }

  public async saveBiometricPreference(enabled: boolean): Promise<void> {
    try {
      const preferences = (await this.secureStorage.getUserPreferences()) || {}
      preferences.biometricEnabled = enabled
      await this.secureStorage.saveUserPreferences(preferences)
    } catch (error) {
      console.error("Error saving biometric preference:", error)
      throw new Error("Failed to save biometric preference")
    }
  }

  public async isBiometricEnabled(): Promise<boolean> {
    try {
      const preferences = await this.secureStorage.getUserPreferences()
      return preferences?.biometricEnabled || false
    } catch (error) {
      console.error("Error checking biometric preference:", error)
      return false
    }
  }

  public async setPasscode(passcode: string): Promise<void> {
    try {
      await this.secureStorage.saveSecureItem(this.PASSCODE_KEY, passcode)
    } catch (error) {
      console.error("Error saving passcode:", error)
      throw new Error("Failed to save passcode")
    }
  }

  public async getPasscode(): Promise<string | null> {
    try {
      const passcode = await this.secureStorage.getSecureItem(this.PASSCODE_KEY)
      return passcode
    } catch (error) {
      console.error("Error getting passcode:", error)
      return null
    }
  }

  public async hasPasscode(): Promise<boolean> {
    try {
      const passcode = await this.getPasscode()
      return passcode !== null
    } catch (error) {
      console.error("Error checking passcode existence:", error)
      return false
    }
  }

  public async delPasscode(): Promise<void> {
    try {
      await this.secureStorage.deleteSecureItem(this.PASSCODE_KEY)
      Alert.alert("Success", "Password Reset")
    } catch (error) {
      console.error("Error Deleting Passcode", error)
    }
  }

  public async authenticateWithPasscode(passcode: string): Promise<boolean> {
    try {
      const storedPasscode = await this.getPasscode()

      if (!storedPasscode) {
        // If no passcode is set, save the new one
        await this.setPasscode(passcode)
        return true
      } else {
        // If passcode exists, verify it
        return passcode === storedPasscode
      }
    } catch (error) {
      console.error("Error during passcode authentication:", error)
      return false
    }
  }

  public async authenticate(): Promise<boolean> {
    try {
      const isAvailable = await this.isBiometricAvailable()
      if (isAvailable) {
        // Try biometric authentication first
        const biometricResult = await this.authenticateWithBiometrics()
        if (biometricResult) {
          return true
        }
        // If biometrics fail, fall back to passcode
        return false // The UI will handle showing the passcode modal
      } else {
        // If biometrics are not available, fall back to passcode
        console.log("Biometrics not available, falling back to passcode")
        return false // The UI will handle showing the passcode modal
      }
    } catch (error) {
      console.error("Error during authentication:", error)
      return false // The UI will handle showing the passcode modal
    }
  }
}
