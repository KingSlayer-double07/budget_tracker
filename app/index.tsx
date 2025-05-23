import React from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from "expo-router";
import { useBudget } from './context/BudgetContext';
import { NotificationService } from './services/NotificationService';
import { useAuth } from './context/AuthContext';

export default function Index() {
  const router = useRouter();
  const {
    totalIncome,
    totalExpenses,
    balance,
    isLoading,
    error,
    refreshData
  } = useBudget();
  const {
    handleAuthentication
  } = useAuth();

  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await refreshData();
    setRefreshing(false);
  }, [refreshData]);

  const testNotification = async () => {
    try {
      const notificationService = NotificationService.getInstance();
      await notificationService.testNotification();
      Alert.alert('Success', 'Test notification scheduled! You should receive it now.');
    } catch (error) {
      Alert.alert('Error', 'Failed to schedule test notification. Please check your notification permissions.');
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
    <ScrollView 
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <Text style={styles.heading}>Your Dashboard</Text>
        <TouchableOpacity 
          style={styles.settingsButton}
          onPress={() => router.push('/settingsScreen')}
        >
          <Text style={styles.settingsButtonText}>⚙️</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.card}>
        <Text style={styles.label}>💰 Total Income:</Text>
        <Text style={styles.value}>NGN{totalIncome.toLocaleString()}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>🛒 Total Expenses:</Text>
        <Text style={styles.value}>NGN{totalExpenses.toLocaleString()}</Text>
      </View>

      <View style={styles.card}>
        <Text style={[styles.value, balance >= 0 ? styles.positive : styles.negative]}>
          📊 Balance: NGN{balance.toLocaleString()}
        </Text>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.button} onPress={() => router.push('/addIncomeScreen')}>
          <Text style={styles.buttonText}>Manage Income</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={() => router.push('/addExpenseScreen')}>
          <Text style={styles.buttonText}>Manage Expense</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={() => router.push('/addPurchaseScreen')}>
          <Text style={styles.buttonText}>Manage Purchases</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.button, styles.testButton]} onPress={() => router.push('/statsScreen')}>
          <Text style={styles.buttonText}>View Stats</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f4f4f4',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
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
  },
  settingsButton: {
    padding: 10,
  },
  settingsButtonText: {
    fontSize: 24,
  },
  card: {
    padding: 20,
    backgroundColor: 'white',
    borderRadius: 10,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
  },
  value: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  positive: {
    color: 'green',
  },
  negative: {
    color: 'red',
  },
  buttonContainer: {
    flexDirection: 'row',
    marginInline: 5,
    justifyContent: 'space-evenly',
    flexWrap: 'wrap',
    marginTop: 10,
  },
  button: {
    flexBasis: '45%',
    backgroundColor: '#043927',
    padding: 5,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 5,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  testButton: {
    backgroundColor: '#6c757d',
  },
});