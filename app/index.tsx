import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Platform, Alert } from 'react-native';
import { useRouter } from "expo-router";
import { getTotalIncome, getTotalExpenses, getBalance, resetDatabase } from './database';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';

// Background Task Name
const NOTIFICATION_TASK = "DAILY_NOTIFICATION_TASK";

// Register Background Task
TaskManager.defineTask(NOTIFICATION_TASK, async () => {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Daily Balance Reminder",
      body: "Check your current balance in the app!",
      sound: true,
    },
    trigger: { hour: 9, minute: 0, repeats: true },
  });
});

// Request Permissions & Schedule Notification
const scheduleDailyNotification = async () => {
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== "granted") {
    Alert.alert("Permission required", "Please enable notifications in settings.");
    return;
  }

  // Cancel existing notifications to avoid duplicates
  await Notifications.cancelAllScheduledNotificationsAsync();

  // Ensure the task is registered
  await Notifications.registerTaskAsync(NOTIFICATION_TASK);

  Alert.alert("Scheduled", "Daily notification set for 9 AM!");
  console.log("Notification Scheduled");
};

export default function Index() {
  const [income, setIncome] = useState("");
  const [expenses, setExpenses] = useState("");
  const [balance, setBalance] = useState("");
  const [balanceCheck, setBalanceCheck] = useState(0);
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  
  

  const fetchData = async () => {
    const totalIncome = await getTotalIncome();
    const totalExpenses = await getTotalExpenses();
    const balanceAmount = await getBalance();
    
    setIncome(parseFloat(totalIncome.toFixed(2)).toLocaleString());
    setExpenses(parseFloat(totalExpenses.toFixed(2)).toLocaleString());
    setBalance(parseFloat(balanceAmount.toFixed(2)).toLocaleString());
    setBalanceCheck(balanceAmount);
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const requestPermissions = async () => {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission required", "Please enable notifications in settings.");
      }
      if (status === "granted") console.log("Permission granted");
    };
    requestPermissions();
  }, []);

  const sendTestNotification = async () => {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Test Notification",
        body: "This is a test notification from your app!",
        sound: true,
      },
      trigger: null, // Send immediately
    });
    console.log("Notification Sent");
    scheduleDailyNotification();
  };

  const dailyNotification = async () => {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Current Balance",
        body: ""
      }
    })
  }
  
  //pul-to-refresh function
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, []);

  // Pie Chart Data
  const pieData = [
    {
      key: 1,
      value: parseFloat(expenses),
      svg: { fill: '#FF6B6B' }, // Red for expenses
      label: 'Expenses',
    },
    {
      key: 2,
      value: parseFloat(income),
      svg: { fill: '#4CAF50' }, // Green for income
      label: 'Income',
    },
  ].filter((item) => item.value > 0); // Ensure no zero values in the pie chart


  return (
    <ScrollView 
    style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Text style={styles.heading}>Your Dashboard</Text>
      
      <View style={styles.card}>
        <Text style={styles.label}>💰 Total Income:</Text>
        <Text style={styles.value}>NGN{income}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>🛒 Total Expenses:</Text>
        <Text style={styles.value}>NGN{expenses}</Text>
      </View>

      <View style={styles.card}>
        <Text style={[styles.value, balanceCheck >= 0 ? styles.positive : styles.negative]}>
          📊 Balance: NGN{balance}
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
        <TouchableOpacity style={styles.deleteButton} onPress={resetDatabase}>
          <Text style={styles.buttonText}>Delete Database</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity style={styles.watermark} onPress={sendTestNotification}>
        <Text>Made by Slayer</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f4f4f4',
  },
  heading: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
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
    backgroundColor: '#007bff',
    padding: 5,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 5,
  },
  deleteButton: {
    flexBasis: '45%',
    backgroundColor: '#dc3545',
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
  chartContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: 'bold',
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