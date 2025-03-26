import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Switch, TextInput, TouchableOpacity, Alert } from 'react-native';
import { AuthenticationService } from './services/AuthenticationService';
import { SecureStorageService } from './services/SecureStorageService';
import { NotificationService } from './services/NotificationService';
import { useBudget } from './context/BudgetContext';
import { clearAllData } from './database';

export default function SettingsScreen() {
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [budgetThreshold, setBudgetThreshold] = useState('');
  const { totalIncome, refreshData } = useBudget();
  const authService = AuthenticationService.getInstance();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const secureStorage = SecureStorageService.getInstance();
      
      // Load biometric settings
      const biometricEnabled = await secureStorage.getSecureItem('biometric_enabled');
      setBiometricEnabled(biometricEnabled === 'true');
      
      // Load budget threshold
      const threshold = await secureStorage.getSecureItem('budget_threshold');
      if (threshold) {
        setBudgetThreshold(threshold);
      } else {
        // Default to 80% of total income
        const defaultThreshold = (totalIncome * 0.8).toString();
        setBudgetThreshold(defaultThreshold);
        await secureStorage.saveSecureItem('budget_threshold', defaultThreshold);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      Alert.alert('Error', 'Failed to load settings');
    }
  };

  const toggleBiometric = async () => {
    try {
      const secureStorage = SecureStorageService.getInstance();
      const newValue = !biometricEnabled;
      
      await secureStorage.saveSecureItem('biometric_enabled', newValue.toString());
      setBiometricEnabled(newValue);
      
      Alert.alert(
        'Success',
        `Biometric authentication ${newValue ? 'enabled' : 'disabled'}`
      );
    } catch (error) {
      console.error('Error toggling biometric:', error);
      Alert.alert('Error', 'Failed to update biometric settings');
    }
  };

  const updateBudgetThreshold = async () => {
    try {
      const threshold = parseFloat(budgetThreshold);
      if (isNaN(threshold) || threshold <= 0) {
        Alert.alert('Error', 'Please enter a valid threshold amount');
        return;
      }

      const secureStorage = SecureStorageService.getInstance();
      await secureStorage.saveSecureItem('budget_threshold', threshold.toString());
      
      // Schedule budget alert with new threshold
      const notificationService = NotificationService.getInstance();
      await notificationService.scheduleBudgetAlert(
        'Budget Limit Alert',
        `You have reached ${threshold.toLocaleString()} NGN in expenses`,
        threshold
      );

      Alert.alert('Success', 'Budget threshold updated successfully');
    } catch (error) {
      console.error('Error updating budget threshold:', error);
      Alert.alert('Error', 'Failed to update budget threshold');
    }
  };

  const handleClearDatabase = async () => {
    Alert.alert(
      'Clear All Data',
      'Are you sure you want to clear all data? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Clear All Data',
          style: 'destructive',
          onPress: async () => {
            try {
              const success = await clearAllData();
              if (success) {
                await refreshData();
                Alert.alert('Success', 'All data has been cleared');
              } else {
                Alert.alert('Error', 'Failed to clear data');
              }
            } catch (error) {
              console.error('Error clearing database:', error);
              Alert.alert('Error', 'Failed to clear data');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Settings</Text>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Security</Text>
        <View style={styles.setting}>
          <Text style={styles.settingLabel}>Biometric Authentication</Text>
          <Switch
            value={biometricEnabled}
            onValueChange={toggleBiometric}
            disabled={!biometricAvailable}
          />
        </View>
        {!biometricAvailable && (
          <Text style={styles.warning}>
            Biometric authentication is not available on this device
          </Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Budget Alerts</Text>
        <View style={styles.setting}>
          <Text style={styles.settingLabel}>Budget Threshold (NGN)</Text>
          <TextInput
            style={styles.input}
            value={budgetThreshold}
            onChangeText={setBudgetThreshold}
            keyboardType="numeric"
            placeholder="Enter threshold amount"
          />
        </View>
        <TouchableOpacity style={styles.button} onPress={updateBudgetThreshold}>
          <Text style={styles.buttonText}>Update Threshold</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Database Management</Text>
        <TouchableOpacity 
          style={[styles.button, styles.dangerButton]} 
          onPress={handleClearDatabase}
        >
          <Text style={styles.buttonText}>Clear All Data</Text>
        </TouchableOpacity>
      </View>
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
  section: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  setting: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  settingLabel: {
    fontSize: 16,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    padding: 8,
    width: 150,
    textAlign: 'right',
  },
  button: {
    backgroundColor: '#007bff',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  warning: {
    color: '#dc3545',
    fontSize: 14,
    marginTop: 5,
  },
  dangerButton: {
    backgroundColor: '#dc3545',
  },
}); 