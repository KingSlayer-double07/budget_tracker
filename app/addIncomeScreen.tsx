import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Switch, FlatList, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useBudget } from './context/BudgetContext';
import { NotificationService } from './services/NotificationService';
import { clearIncomeTable } from './database';

export default function AddIncomeScreen() {
  const [amount, setAmount] = useState('');
  const [source, setSource] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringDate, setRecurringDate] = useState('');
  const router = useRouter();
  const { incomeList, isLoading, error, addNewIncome, refreshData } = useBudget();
  
  // Function to get the first day of the next month
  const getNextMonthDate = () => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth() + 1, 1).toISOString().split("T")[0];
  };
  
  const handleSubmit = async () => {
    if (!source.trim() || !amount.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    try {
      const success = await addNewIncome(source, numAmount, true, recurringDate);
      if (success) {
        // Schedule notification for recurring income if date is provided
        if (isRecurring && recurringDate) {
          const notificationService = NotificationService.getInstance();
          const day = parseInt(recurringDate);
          
          // Create a date for the next occurrence
          const nextDate = new Date();
          nextDate.setDate(day);
          nextDate.setHours(7, 0, 0, 0); // Set to 7:00 AM
          
          // If the day has already passed this month, schedule for next month
          if (nextDate < new Date()) {
            nextDate.setMonth(nextDate.getMonth() + 1);
          }
          
          await notificationService.scheduleRecurringTransaction(
            'Recurring Income Due',
            `Your recurring income of NGN${numAmount.toLocaleString()} from ${source} is due next on ${nextDate.toLocaleDateString()}`,
            nextDate,
            `recurring-income-${source}-${recurringDate}`
          );
        }

        Alert.alert('Success', 'Income added successfully!');
        setSource('');
        setAmount('');
        setRecurringDate('');
      } else {
        Alert.alert('Error', 'Failed to add income. Please try again.');
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    }
  };

  const handleClearIncome = async () => {
    Alert.alert(
      'Clear Income Data',
      'Are you sure you want to clear all income data? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Clear Income',
          style: 'destructive',
          onPress: async () => {
            try {
              const success = await clearIncomeTable();
              if (success) {
                await refreshData();
                Alert.alert('Success', 'All income data has been cleared');
              } else {
                Alert.alert('Error', 'Failed to clear income data');
              }
            } catch (error) {
              console.error('Error clearing income data:', error);
              Alert.alert('Error', 'Failed to clear income data');
            }
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#28a745" />
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
      <Text style={styles.heading}>Add Income</Text>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Source</Text>
      <TextInput
        style={styles.input}
        value={source}
        onChangeText={setSource}
          placeholder="e.g., Salary, Freelance"
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

      <View style={styles.recurring}>
        <Text style={styles.recurringText}>Recurring Monthly</Text>
        <Switch value={isRecurring} onValueChange={setIsRecurring} />
      </View>

      {isRecurring && (
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Recurring Date (Day of Month)</Text>
          <TextInput
            style={styles.input}
            value={recurringDate}
            onChangeText={setRecurringDate}
            placeholder="e.g., 15"
            keyboardType="numeric"
            placeholderTextColor="#666"
          />
          <Text style={styles.hint}>Enter a day between 1 and 31</Text>
        </View>
      )}

      <TouchableOpacity style={styles.addButton} onPress={handleSubmit}>
        <Text style={styles.addButtonText}>Add Income</Text>
      </TouchableOpacity>

      <View style={styles.listHeader}>
        <Text style={styles.listHeading}>Income History</Text>
        <TouchableOpacity 
          style={[styles.clearButton, incomeList.length === 0 && styles.clearButtonDisabled]} 
          onPress={handleClearIncome}
          disabled={incomeList.length === 0}
        >
          <Text style={styles.clearButtonText}>Clear All</Text>
        </TouchableOpacity>
      </View>
      
      {incomeList.length === 0 ? (
        <Text style={styles.emptyText}>No income recorded yet.</Text>
      ) : (
        <FlatList
          data={incomeList}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <View style={styles.incomeBox}>
              <View style={styles.incomeContent}>
                <Text style={styles.incomeSource}>{item.source}</Text>
                <Text style={styles.incomeAmount}>NGN{item.amount.toLocaleString()}</Text>
              </View>
              <Text style={styles.timestamp}>{item.date}</Text>
            </View>
          )}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContainer}
        />
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
    color: '#28a745',
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
  recurring: { 
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  recurringText: {
    fontSize: 16,
    color: '#333',
  },
  addButton: {
    backgroundColor: '#28a745',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  listHeading: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  listContainer: {
    paddingBottom: 20,
  },
  incomeBox: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  incomeContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  incomeSource: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
  },
  incomeAmount: {
    fontSize: 16, 
    color: '#28a745',
    fontWeight: 'bold',
  },
  timestamp: { 
    fontSize: 12, 
    color: '#757575',
    fontStyle: 'italic',
  },
  emptyText: {
    textAlign: 'center',
    color: '#757575',
    fontSize: 16,
    marginTop: 20,
  },
  hint: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  clearButton: {
    backgroundColor: '#dc3545',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 5,
  },
  clearButtonDisabled: {
    backgroundColor: '#dc354580',
  },
  clearButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
