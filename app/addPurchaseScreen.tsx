import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useBudget } from './context/BudgetContext';
import { NotificationService } from './services/NotificationService';

export default function AddPurchaseScreen() {
  const [item, setItem] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const router = useRouter();
  const { isLoading, error, addNewPlannedPurchase, refreshData } = useBudget();

  const handleAddPurchase = async () => {
    if (!item || !amount) {
      Alert.alert("Error", "Please enter an item and amount.");
      return;
    }

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      Alert.alert("Error", "Please enter a valid amount.");
      return;
    }

    try {
      const success = await addNewPlannedPurchase(item.trim(), numericAmount);
      
      if (success) {
        // Schedule notification for planned purchase if due date is provided
        if (dueDate) {
          const notificationService = NotificationService.getInstance();
          const [year, month, day] = dueDate.split('-');
          const notificationDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
          
          await notificationService.schedulePurchaseReminder(
            'Planned Purchase Due',
            `Your planned purchase of ${item} for NGN${numericAmount.toLocaleString()} is due on ${notificationDate.toLocaleDateString()}`,
            notificationDate,
            `planned-purchase-${item}-${dueDate}`
          );
        }

        setItem('');
        setAmount('');
        setDueDate('');
        Alert.alert("Success", "Planned purchase added successfully!");
      } else {
        Alert.alert("Error", "Failed to add planned purchase. Please try again.");
      }
    } catch (error) {
      Alert.alert("Error", "An unexpected error occurred. Please try again.");
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ffc107" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={refreshData}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Add Planned Purchase</Text>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Item Name</Text>
        <TextInput
          style={styles.input}
          value={item}
          onChangeText={setItem}
          placeholder="e.g., New Phone, Laptop"
          placeholderTextColor="#666"
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Amount (NGN)</Text>
        <TextInput
          style={styles.input}
          value={amount}
          onChangeText={setAmount}
          placeholder="Enter amount"
          keyboardType="numeric"
          placeholderTextColor="#666"
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Due Date (YYYY-MM-DD)</Text>
        <TextInput
          style={styles.input}
          value={dueDate}
          onChangeText={setDueDate}
          placeholder="e.g., 2024-03-15"
          placeholderTextColor="#666"
        />
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.addButton} onPress={handleAddPurchase}>
          <Text style={styles.addButtonText}>Add Planned Purchase</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.viewButton} 
          onPress={() => router.push('/plannedPurchasesScreen')}
        >
          <Text style={styles.viewButtonText}>View Purchases</Text>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f4f4f4',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f4f4f4',
    padding: 20,
  },
  errorText: {
    color: 'red',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#007bff',
    padding: 10,
    borderRadius: 5,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  heading: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffc107',
    marginBottom: 30,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  buttonContainer: {
    marginTop: 20,
    gap: 10,
  },
  addButton: {
    backgroundColor: '#ffc107',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  addButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  viewButton: {
    backgroundColor: '#6c757d',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  viewButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});