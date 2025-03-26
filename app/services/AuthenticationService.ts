import * as LocalAuthentication from 'expo-local-authentication';
import { SecureStorageService } from './SecureStorageService';
import { Alert } from 'react-native';

export class AuthenticationService {
  private static instance: AuthenticationService;
  private secureStorage: SecureStorageService;
  private readonly PASSCODE_KEY = 'user_passcode';

  private constructor() {
    this.secureStorage = SecureStorageService.getInstance();
  }

  public static getInstance(): AuthenticationService {
    if (!AuthenticationService.instance) {
      AuthenticationService.instance = new AuthenticationService();
    }
    return AuthenticationService.instance;
  }

  public async isBiometricAvailable(): Promise<boolean> {
    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      return compatible && enrolled;
    } catch (error) {
      console.error('Error checking biometric availability:', error);
      return false;
    }
  }

  public async authenticateWithBiometrics(): Promise<boolean> {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to access your budget data',
        fallbackLabel: 'Use passcode',
        disableDeviceFallback: false,
        cancelLabel: 'Cancel'
      });

      return result.success;
    } catch (error) {
      console.error('Error during biometric authentication:', error);
      return false;
    }
  }

  public async saveBiometricPreference(enabled: boolean): Promise<void> {
    try {
      const preferences = await this.secureStorage.getUserPreferences() || {};
      preferences.biometricEnabled = enabled;
      await this.secureStorage.saveUserPreferences(preferences);
    } catch (error) {
      console.error('Error saving biometric preference:', error);
      throw new Error('Failed to save biometric preference');
    }
  }

  public async isBiometricEnabled(): Promise<boolean> {
    try {
      const preferences = await this.secureStorage.getUserPreferences();
      return preferences?.biometricEnabled || false;
    } catch (error) {
      console.error('Error checking biometric preference:', error);
      return false;
    }
  }

  private async setPasscode(passcode: string): Promise<void> {
    try {
      await this.secureStorage.saveSecureItem(this.PASSCODE_KEY, passcode);
    } catch (error) {
      console.error('Error saving passcode:', error);
      throw new Error('Failed to save passcode');
    }
  }

  private async getPasscode(): Promise<string | null> {
    try {
      return await this.secureStorage.getSecureItem(this.PASSCODE_KEY);
    } catch (error) {
      console.error('Error getting passcode:', error);
      return null;
    }
  }

  private async authenticateWithPasscode(): Promise<boolean> {
    return new Promise(async (resolve) => {
      const storedPasscode = await this.getPasscode();
      
      if (!storedPasscode) {
        // If no passcode is set, prompt to create one
        Alert.prompt(
          'Set Passcode',
          'Please enter a 4-digit passcode to secure your app',
          [
            {
              text: 'Cancel',
              onPress: () => resolve(false),
              style: 'cancel'
            },
            {
              text: 'OK',
              onPress: async (passcode) => {
                if (passcode && /^\d{4}$/.test(passcode)) {
                  await this.setPasscode(passcode);
                  resolve(true);
                } else {
                  Alert.alert('Invalid Passcode', 'Please enter a 4-digit passcode');
                  resolve(false);
                }
              }
            }
          ],
          'secure-text'
        );
      } else {
        // If passcode exists, prompt to enter it
        Alert.prompt(
          'Enter Passcode',
          'Please enter your 4-digit passcode',
          [
            {
              text: 'Cancel',
              onPress: () => resolve(false),
              style: 'cancel'
            },
            {
              text: 'OK',
              onPress: (passcode) => {
                if (passcode === storedPasscode) {
                  resolve(true);
                } else {
                  Alert.alert('Incorrect Passcode', 'Please try again');
                  resolve(false);
                }
              }
            }
          ],
          'secure-text'
        );
      }
    });
  }

  public async authenticate(): Promise<boolean> {
    try {
      const isEnabled = await this.isBiometricEnabled();
      if (!isEnabled) {
        return true; // If biometrics are not enabled, allow access
      }

      const isAvailable = await this.isBiometricAvailable();
      if (isAvailable) {
        // Try biometric authentication first
        const biometricResult = await this.authenticateWithBiometrics();
        if (biometricResult) {
          return true;
        }
      }

      // If biometrics fail or are not available, fall back to passcode
      return await this.authenticateWithPasscode();
    } catch (error) {
      console.error('Error during authentication:', error);
      return false;
    }
  }
} 