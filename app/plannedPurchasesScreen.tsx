import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { deletePurchase, getPlannedPurchases, markPurchaseAsBought } from './database';

export default function PlannedPurchasesScreen() {
  const [purchases, setPurchases] = useState([]);

  const fetchData = async () => {
    const data = await getPlannedPurchases();
    setPurchases(data);
  };

  useEffect(() => {
    fetchData();
  }, []);

  //function to handle the process of marking a purchase as bought
  const handleMarkAsBought = async (id: number, amount: number, item: string) => {
    await markPurchaseAsBought(id, amount, item);
    fetchData(); // Refresh the list
  };

  return (
    <View style={{ padding: 20 }}>
      <Text style={styles.heading}>Planned Purchases</Text>

      {purchases.length === 0 ? (
        <Text>No planned purchases yet.</Text>
      ) : (
        <FlatList
          data={purchases}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <View>
            <TouchableOpacity
              onPress={() => handleMarkAsBought(item.id, item.amount, item.item)}
              style={styles.purchase}
            >
              <Text style={{ fontSize: 16 }}>{item.item} - NGN{item.amount}</Text>
              <Text>{item.purchased ? "✅ Bought" : "🛒 Tap to Buy"}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.deleteButton} onPress={() => deletePurchase(item.id)}>
              <Text style={styles.deleteText}>Delete Purchase</Text>
            </TouchableOpacity>
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
  heading: { 
    fontSize: 20, 
    fontWeight: 'bold', 
    marginBottom: 10 
  },
  purchase: {
    padding: 15,
    backgroundColor: item.purchased ? '#d3d3d3' : '#90ee90',
    marginBottom: 10,
    borderRadius: 10,
  },
  deleteButton: { 
      backgroundColor: "#e91e63", 
      padding: 10, 
      borderRadius: 10, 
      marginBottom: 10,
      marginTop: -5,
      alignItems: "center"
    },
    refreshButton: { 
      justifyContent: "center", 
      backgroundColor: "#fff", 
      padding: 10, 
      marginTop: 10, 
      borderRadius: 10,
    },
    deleteText: { 
      fontSize: 18, 
      color: "#fff" 
    },
    watermark: {
      position: 'static',
      bottom: 10,
      right: 10,
      fontSize: 12,
      color: 'rgba(0, 0, 0, 0.3)', // Faded text
    }
})
