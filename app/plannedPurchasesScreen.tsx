import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity } from 'react-native';
import { getPlannedPurchases, markPurchaseAsBought } from './database';

export default function PlannedPurchasesScreen() {
  const [purchases, setPurchases] = useState([]);

  const fetchData = async () => {
    const data = await getPlannedPurchases();
    setPurchases(data);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleMarkAsBought = async (id: number, amount: number, item: string) => {
    await markPurchaseAsBought(id, amount, item);
    fetchData(); // Refresh the list
  };

  return (
    <View style={{ padding: 20 }}>
      <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 10 }}>Planned Purchases</Text>

      {purchases.length === 0 ? (
        <Text>No planned purchases yet.</Text>
      ) : (
        <FlatList
          data={purchases}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => handleMarkAsBought(item.id, item.amount, item.item)}
              style={{
                padding: 15,
                backgroundColor: item.purchased ? '#d3d3d3' : '#90ee90',
                marginBottom: 10,
                borderRadius: 10,
              }}
            >
              <Text style={{ fontSize: 16 }}>{item.item} - NGN{item.amount}</Text>
              <Text>{item.purchased ? "✅ Bought" : "🛒 Tap to Buy"}</Text>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}
