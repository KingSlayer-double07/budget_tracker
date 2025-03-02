import React, { useState } from 'react';
import { View, Text, TextInput, Button, Alert, StyleSheet } from 'react-native';
import { addPlannedPurchase } from './database';
import { useRouter } from 'expo-router';

export default function AddPurchaseScreen() {
  const [item, setItem] = useState('');
  const [amount, setAmount] = useState('');
  const router = useRouter();

  const handleAddPurchase = async () => {
    if (!item || !amount) {
      Alert.alert("Error", "Please enter an item and amount.");
      return;
    }

    await addPlannedPurchase(item, parseFloat(amount));
    Alert.alert("Success", "Purchase added successfully!");
    setItem('');
    setAmount('');
    router.push('/plannedPurchasesScreen');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Add Purchase</Text>

      <TextInput
        value={item}
        onChangeText={setItem}
        placeholder="Enter item name"
        style={styles.input}
      />

      <TextInput
        value={amount}
        onChangeText={setAmount}
        placeholder="Enter amount"
        keyboardType="numeric"
        style={styles.input}
      />

      <View style={styles.buttonContainer}>
        <Button title="Add Purchase" onPress={handleAddPurchase} />
        <Button title="View Purchases" onPress={() => router.push('/plannedPurchasesScreen')} />
      </View>
      <Text style={styles.watermark}>Made by Slayer</Text>
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'flex-start',
    backgroundColor: '#f5f5f5',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    flexWrap: 'wrap',
    marginTop: 10,
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
  watermark: {
    position: 'static',
    bottom: 10,
    right: 10,
    fontSize: 12,
    color: 'rgba(0, 0, 0, 0.3)', // Faded text
  }
});