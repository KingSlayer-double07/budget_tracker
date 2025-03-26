import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Animated } from 'react-native';
import { useBudget } from './context/BudgetContext';
import { Swipeable } from 'react-native-gesture-handler';

export default function PlannedPurchasesScreen() {
  const { 
    plannedPurchases, 
    isLoading, 
    error, 
    markAsBought, 
    deletePlannedPurchase,
    refreshData 
  } = useBudget();

  const handleMarkAsBought = async (id: number, amount: number, item: string) => {
    const success = await markAsBought(id, amount, item);
    if (success) {
      Alert.alert("Success", "Purchase marked as bought!");
    } else {
      Alert.alert("Error", "Failed to mark purchase as bought. Please try again.");
    }
  };

  const handleDelete = async (id: number) => {
    Alert.alert(
      "Delete Purchase",
      "Are you sure you want to delete this planned purchase?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const success = await deletePlannedPurchase(id);
            if (success) {
              Alert.alert("Success", "Purchase deleted successfully!");
            } else {
              Alert.alert("Error", "Failed to delete purchase. Please try again.");
            }
          }
        }
      ]
    );
  };

  const renderLeftActions = (item: any) => {
    if (item.purchased) return null; // Don't show swipe actions for purchased items

    return (
      <TouchableOpacity
        style={styles.rightAction}
        onPress={() => handleMarkAsBought(item.id, item.amount, item.item)}
      >
        <Text style={styles.actionText}>Mark as Bought</Text>
      </TouchableOpacity>
    );
  };

  const renderRightActions = (item: any) => {
    return (
      <TouchableOpacity
        style={styles.leftAction}
        onPress={() => handleDelete(item.id)}
      >
        <Text style={styles.actionText}>Delete</Text>
      </TouchableOpacity>
    );
  };

  const renderItem = ({ item }: { item: any }) => (
    <Swipeable
      renderRightActions={() => renderRightActions(item)}
      renderLeftActions={() => renderLeftActions(item)}
      rightThreshold={40}
      leftThreshold={40}
      overshootRight={false}
      overshootLeft={false}
    >
      <View style={[
        styles.purchase,
        item.purchased && styles.purchasedItem
      ]}>
        <View style={styles.purchaseContent}>
          <Text style={styles.purchaseName}>{item.item}</Text>
          <Text style={styles.purchaseAmount}>NGN{item.amount.toLocaleString()}</Text>
        </View>
        <View style={styles.purchaseInfo}>
          <Text style={styles.deleteText}>
            Swipe left to delete
          </Text>
        <Text style={styles.purchaseStatus}>
          {item.purchased ? "✅ Bought" : "🛒 Swipe right to buy"}
        </Text>
        </View>
      </View>
    </Swipeable>
  );

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
      <Text style={styles.heading}>Planned Purchases</Text>

      {plannedPurchases.length === 0 ? (
        <Text style={styles.emptyText}>No planned purchases yet.</Text>
      ) : (
        <FlatList
          data={plannedPurchases}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
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
    marginBottom: 20,
    color: '#333',
  },
  listContainer: {
    paddingBottom: 20,
  },
  purchase: {
    padding: 15,
    backgroundColor: '#90ee90',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 10,
  },
  purchasedItem: {
    backgroundColor: '#c8e6c9',
    opacity: 0.8,
  },
  purchaseContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  purchaseInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  purchaseName: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
  },
  purchaseAmount: {
    fontSize: 16,
    color: '#333',
    fontWeight: 'bold',
  },
  purchaseStatus: {
    fontSize: 14,
    color: '#666',
    textAlign: 'right',
  },
  deleteText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'left'
  },
  rightAction: {
    backgroundColor: '#28a745',
    justifyContent: 'center',
    alignItems: 'center',
    width: 100,
    height: '100%',
    borderRadius: 8,
    marginBottom: 10,
  },
  leftAction: {
    backgroundColor: '#dc3545',
    justifyContent: 'center',
    alignItems: 'center',
    width: 100,
    height: '100%',
    borderRadius: 8,
    marginBottom: 10,
  },
  actionText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  emptyText: {
    textAlign: 'center',
    color: '#757575',
    fontSize: 16,
    marginTop: 20,
  },
});
