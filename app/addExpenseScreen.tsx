import React, { useState, useEffect } from "react";
import { View, Text, TextInput, Button, Switch, Alert, FlatList } from "react-native";
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
        router.push('/'); // Navigate back to Dashboard
  };

  return (
    <View style={{ padding: 20 }}>
      <Text style={{ fontSize: 18, fontWeight: "bold", marginBottom: 10 }}>Add Expense</Text>

      <TextInput
        placeholder="Expense Name"
        value={name}
        onChangeText={setName}
        style={{ borderBottomWidth: 1, marginBottom: 15, padding: 8 }}
      />

      <TextInput
        placeholder="Amount"
        value={amount}
        onChangeText={setAmount}
        keyboardType="numeric"
        style={{ borderBottomWidth: 1, marginBottom: 15, padding: 8 }}
      />

      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 20 }}>
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
                          <Text style={{ 
                            fontSize: 16,
                            padding: 15,
                            backgroundColor: '#90ee90',
                            margin: 10,
                            borderRadius: 10,
                            flexWrap: "wrap"
                          }}>Expense:{item.item} - NGN{item.amount} Date:{item.date}</Text>
                      )}
                    />
                  )}
    </View>
  );

}
