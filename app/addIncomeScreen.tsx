import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, Alert, StyleSheet, Switch, FlatList } from 'react-native';
import { addIncome, getIncome } from './database';
import { useRouter } from 'expo-router';

export default function AddIncomeScreen() {
  const [amount, setAmount] = useState('');
  const [source, setSource] = useState('');
  const [income, setIncome] = useState([]);
  const [isRecurring, setIsRecurring] = useState(false);
  const router = useRouter();

  const fetchData = async () => {
      const data = await getIncome();
      setIncome(data);
    };
  
    useEffect(() => {
      fetchData();
    }, []);
  
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

    const nextDueDate = getNextMonthDate();

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      Alert.alert("Error", "Please enter a valid amount.");
      return;
    }

    await addIncome(source, numericAmount, isRecurring, nextDueDate);
    Alert.alert("Success", "Income added successfully!");
    setAmount('');
    setSource('');
    router.push('/'); // Navigate back to Dashboard
  };

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

      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 20 }}>
              <Text>Recurring Monthly</Text>
              <Switch value={isRecurring} onValueChange={setIsRecurring} />
            </View>

      <Button title="Add Income" onPress={handleAddIncome} />

      {income.length === 0 ? (
              <Text>No income yet.</Text>
            ) : (
              <FlatList
                data={income}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                  <View style={styles.incomeBox}>
                    <Text style={styles.income}>
                      {item.source} - NGN{item.amount}, {item.date}
                    </Text>
                  </View>
                )}
                showsVerticalScrollIndicator={false}
              />
            )}
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
  incomeBox: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    backgroundColor: "#fff", 
    padding: 10, 
    marginTop: 10, 
    borderRadius: 10,
    flexWrap: "wrap"
  },
  income: { 
    fontSize: 16, 
    color: "#333" 
  }
});
