import { Stack } from "expo-router";
import { useEffect } from "react";
import { handleRecurringUpdates, initializeDatabase } from "./database";
import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { BudgetProvider } from './context/BudgetContext';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';

export default function RootLayout() {

  useEffect(() => {
    const initializeDB = async () => {
      await initializeDatabase();
    };
    initializeDB();
    handleRecurringUpdates();
  }, []);

  return (
    <GestureHandlerRootView style={styles.container}>
      <BudgetProvider>
        <Stack>
          <Stack.Screen
            name="index"
            options={{
              title: 'Budget Tracker',
              headerStyle: {
                backgroundColor: '#043927',
              },
              headerTintColor: '#fff',
            }}
          />
          <Stack.Screen
            name="addIncomeScreen"
            options={{
              title: 'Add Income',
              headerStyle: {
                backgroundColor: '#043927',
              },
              headerTintColor: '#fff',
            }}
          />
          <Stack.Screen
            name="addExpenseScreen"
            options={{
              title: 'Add Expense',
              headerStyle: {
                backgroundColor: '#043927',
              },
              headerTintColor: '#fff',
            }}
          />
          <Stack.Screen
            name="addPurchaseScreen"
            options={{
              title: 'Add Planned Purchase',
              headerStyle: {
                backgroundColor: '#043927',
              },
              headerTintColor: '#000',
            }}
          />
          <Stack.Screen
            name="plannedPurchasesScreen"
            options={{
              title: 'Planned Purchases',
              headerStyle: {
                backgroundColor: '#043927',
              },
              headerTintColor: '#fff',
            }}
          />
        </Stack>
      </BudgetProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
