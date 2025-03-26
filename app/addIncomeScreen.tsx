import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Switch, FlatList, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useBudget } from './context/BudgetContext';

export default function AddIncomeScreen() {
  const [amount, setAmount] = useState('');
  const [source, setSource] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const router = useRouter();
  const { incomeList, isLoading, error, addNewIncome, refreshData } = useBudget();

  // Function to get the first day of the next month
  const getNextMonthDate = () => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth() + 1, 1).toISOString().split("T")[0];
  };

  const handleAddIncome = async () => {
    if (!amount || !source) {
      Alert.alert("Error", "Please enter both source and amount.");
      return;
    }

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      Alert.alert("Error", "Please enter a valid amount.");
      return;
    }

    const nextDueDate = getNextMonthDate();
    const success = await addNewIncome(source.trim(), numericAmount, isRecurring, nextDueDate);
    
    if (success) {
      setAmount('');
      setSource('');
      setIsRecurring(false);
      Alert.alert("Success", "Income added successfully!");
    } else {
      Alert.alert("Error", "Failed to add income. Please try again.");
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
      <Text style={styles.heading}>Add Income</Text>

      <TextInput
        style={styles.input}
        placeholder="Income Source (e.g., Salary, Freelance)"
        value={source}
        onChangeText={setSource}
      />
      
      <TextInput
        style={styles.input}
        placeholder="Amount"
        keyboardType="numeric"
        value={amount}
        onChangeText={setAmount}
      />

      <View style={styles.recurring}>
        <Text style={styles.recurringText}>Recurring Monthly</Text>
        <Switch value={isRecurring} onValueChange={setIsRecurring} />
      </View>

      <TouchableOpacity style={styles.addButton} onPress={handleAddIncome}>
        <Text style={styles.addButtonText}>Add Income</Text>
      </TouchableOpacity>

      <Text style={styles.listHeading}>Income History</Text>
      
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
});
