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
      <Text>Item:</Text>
      <TextInput
        value={item}
        onChangeText={setItem}
        placeholder="Enter item name"
        style={{ borderBottomWidth: 1, marginBottom: 10 }}
      />

      <Text>Amount:</Text>
      <TextInput
        value={amount}
        onChangeText={setAmount}
        placeholder="Enter amount"
        keyboardType="numeric"
        style={{ borderBottomWidth: 1, marginBottom: 10 }}
      />

      <View style={styles.buttonContainer}>
        <Button title="Add Purchase" onPress={handleAddPurchase} />
        <Button title="View Purchases" onPress={() => router.push('/plannedPurchasesScreen')} />
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    flexWrap: 'wrap',
    marginTop: 10,
  }
});