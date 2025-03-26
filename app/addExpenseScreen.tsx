import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Switch, FlatList, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useBudget } from './context/BudgetContext';
import { NotificationService } from './services/NotificationService';

export default function AddExpenseScreen() {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringDate, setRecurringDate] = useState('');
  const router = useRouter();
  const { expenseList, isLoading, error, addNewExpense, refreshData } = useBudget();
  
  // Function to get the first day of the next month
  const getNextMonthDate = () => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth() + 1, 1).toISOString().split("T")[0];
  };

  const handleSaveExpense = async () => {
    if (!name || !amount) {
      Alert.alert("Error", "Please enter both name and amount.");
      return;
    }

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      Alert.alert("Error", "Please enter a valid amount.");
      return;
    }

    try {
      const success = await addNewExpense(name.trim(), numericAmount, isRecurring, recurringDate);
      
      if (success) {
        // Schedule notification for recurring expense if enabled
        if (isRecurring && recurringDate) {
          const notificationService = NotificationService.getInstance();
          const [year, month] = recurringDate.split('-');
          const notificationDate = new Date(parseInt(year), parseInt(month) - 1, 1);
          
          await notificationService.scheduleRecurringTransaction(
            'Recurring Expense Due',
            `Your recurring expense of NGN${numericAmount.toLocaleString()} for ${name} is due`,
            notificationDate,
            `recurring-expense-${name}-${recurringDate}`
          );
        }

        setName('');
    setAmount('');
        setIsRecurring(false);
        setRecurringDate('');
        Alert.alert("Success", "Expense added successfully!");
      } else {
        Alert.alert("Error", "Failed to add expense. Please try again.");
      }
    } catch (error) {
      Alert.alert("Error", "An unexpected error occurred. Please try again.");
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
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
      <Text style={styles.heading}>Add Expense</Text>

      <TextInput
        style={styles.input}
        placeholder="Expense Name (e.g., Rent, Utilities)"
        value={name}
        onChangeText={setName}
        autoCapitalize="words"
      />

      <TextInput
        style={styles.input}
        placeholder="Amount"
        value={amount}
        onChangeText={setAmount}
        keyboardType="numeric"
      />

      <View style={styles.recurring}>
        <Text style={styles.recurringText}>Recurring Monthly</Text>
        <Switch value={isRecurring} onValueChange={setIsRecurring} />
      </View>

      {isRecurring && (
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Recurring Date (YYYY-MM)</Text>
          <TextInput
            style={styles.input}
            value={recurringDate}
            onChangeText={setRecurringDate}
            placeholder="e.g., 2024-03"
            placeholderTextColor="#666"
          />
        </View>
      )}

      <TouchableOpacity style={styles.addButton} onPress={handleSaveExpense}>
        <Text style={styles.addButtonText}>Add Expense</Text>
      </TouchableOpacity>

      <Text style={styles.listHeading}>Expense History</Text>
      
      {expenseList.length === 0 ? (
        <Text style={styles.emptyText}>No expenses recorded yet.</Text>
      ) : (
            <FlatList
          data={expenseList}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <View style={styles.expenseBox}>
              <View style={styles.expenseContent}>
                <Text style={styles.expenseName}>{item.item}</Text>
                <Text style={styles.expenseAmount}>NGN{item.amount.toLocaleString()}</Text>
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
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  input: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    fontSize: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
    backgroundColor: '#007bff',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  addButtonText: {
    color: 'white',
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
  expenseBox: { 
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
  expenseContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  expenseName: {
    fontSize: 16, 
    color: '#333',
    fontWeight: '600',
  },
  expenseAmount: {
    fontSize: 16,
    color: '#dc3545',
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
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
  },
});