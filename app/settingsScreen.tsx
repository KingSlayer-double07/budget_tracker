import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity, Alert } from 'react-native';
import { AuthenticationService } from './services/AuthenticationService';

export default function SettingsScreen() {
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const authService = AuthenticationService.getInstance();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const isAvailable = await authService.isBiometricAvailable();
      setBiometricAvailable(isAvailable);
      
      if (isAvailable) {
        const isEnabled = await authService.isBiometricEnabled();
        setBiometricEnabled(isEnabled);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      Alert.alert('Error', 'Failed to load settings');
    }
  };

  const toggleBiometric = async () => {
    try {
      if (!biometricEnabled) {
        // Test biometric authentication before enabling
        const authenticated = await authService.authenticateWithBiometrics();
        if (!authenticated) {
          Alert.alert('Authentication Failed', 'Please try again');
          return;
        }
      }

      await authService.saveBiometricPreference(!biometricEnabled);
      setBiometricEnabled(!biometricEnabled);
      Alert.alert(
        'Success',
        biometricEnabled 
          ? 'Biometric authentication disabled' 
          : 'Biometric authentication enabled'
      );
    } catch (error) {
      console.error('Error toggling biometric:', error);
      Alert.alert('Error', 'Failed to update biometric settings');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Settings</Text>
      
      <View style={styles.settingItem}>
        <View style={styles.settingInfo}>
          <Text style={styles.settingTitle}>Biometric Authentication</Text>
          <Text style={styles.settingDescription}>
            Use your device's biometric authentication (fingerprint/face ID) to secure your budget data
          </Text>
        </View>
        <Switch
          value={biometricEnabled}
          onValueChange={toggleBiometric}
          disabled={!biometricAvailable}
        />
      </View>

      {!biometricAvailable && (
        <Text style={styles.warningText}>
          Biometric authentication is not available on your device
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f4f4f4',
  },
  heading: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#043927',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
  },
  settingInfo: {
    flex: 1,
    marginRight: 15,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 5,
  },
  settingDescription: {
    fontSize: 14,
    color: '#666',
  },
  warningText: {
    color: '#dc3545',
    fontSize: 14,
    marginTop: 10,
    textAlign: 'center',
  },
}); 