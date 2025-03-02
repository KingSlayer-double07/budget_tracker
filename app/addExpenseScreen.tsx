import React, { useState, useEffect } from "react";
import { View, Text, TextInput, Button, Switch, Alert, FlatList, StyleSheet, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { addExpense, getExpenses } from "./database";

export default function AddExpenseScreen() {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [expenses, setExpenses] = useState([]);
  const [isRecurring, setIsRecurring] = useState(false); // Default to not recurring
  const router = useRouter();

  const fetchData = async () => {
    const data = await getExpenses();
    setExpenses(data);
  };
    
  useEffect(() => {
    fetchData();
  }, []);
  
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

    const nextDueDate = getNextMonthDate();

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      Alert.alert("Error", "Please enter a valid amount.");
      return;
    }

    await addExpense(name, numericAmount, isRecurring, nextDueDate);
    Alert.alert("Success", "Expense added successfully!");
    setAmount('');
    setName('');
    router.back();
    fetchData();
  };


  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Add Expense</Text>

      <TextInput
        placeholder="Expense Name"
        value={name}
        onChangeText={setName}
        style={styles.input}
      />

      <TextInput
        placeholder="Amount"
        value={amount}
        onChangeText={setAmount}
        keyboardType="numeric"
        style={styles.input}
      />

      <View style={styles.recurring}>
        <Text>Recurring Monthly</Text>
        <Switch value={isRecurring} onValueChange={setIsRecurring} />
      </View>

      <Button title="Save Expense" onPress={handleSaveExpense} />

      {expenses.length === 0 ? (
        <Text>No Expense yet.</Text>
      ) : (
            <FlatList
              data={expenses}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <View style={styles.expenseBox}>
                  <Text style={styles.expense}>
                    Expense:{item.item} - NGN{item.amount}
                  </Text>
                  <Text style={styles.timestamp}>Date:{item.date}</Text>
                </View>
              )}
            />
          )}
      <TouchableOpacity style={styles.refreshButton} onPress={() => fetchData()}>
        <Text>Refresh Page</Text>
      </TouchableOpacity>
      <Text style={styles.watermark}>Made by Slayer</Text>
    </View>
  );

}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'flex-start',
    backgroundColor: '#f4f4f4',
  },
  heading: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  input: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  recurring: { 
    flexDirection: "row", 
    alignItems: "center", 
    marginBottom: 20 
  },
  expenseBox: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    backgroundColor: "#fff", 
    padding: 10, 
    marginTop: 10, 
    borderRadius: 10,
    flexWrap: "wrap"
  },
  refreshButton: { 
    justifyContent: "center", 
    backgroundColor: "#fff", 
    padding: 10, 
    marginTop: 10, 
    borderRadius: 10,
  },
  expense: { 
    fontSize: 16, 
    color: "#333" 
  },
  delete: { 
    fontSize: 18, 
    color: "#e91e63" 
  },
  timestamp: { 
    fontSize: 12, 
    color: "#757575", 
    marginTop: 15,
    fontStyle: "italic" 
  },
  watermark: {
    position: 'static',
    bottom: 10,
    right: 10,
    fontSize: 12,
    color: 'rgba(0, 0, 0, 0.3)', // Faded text
  }
});