import { Stack } from "expo-router";
import { useEffect } from "react";
import { handleRecurringUpdates, initializeDatabase } from "./database";
import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { BudgetProvider } from './context/BudgetContext';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';
import { NotificationService } from './services/NotificationService';

export default function RootLayout() {

  useEffect(() => {
    const initializeDB = async () => {
      await initializeDatabase();
    };
    initializeDB();
    handleRecurringUpdates();

    const initializeNotifications = async () => {
      try {
        const notificationService = NotificationService.getInstance();
        await notificationService.initialize();

        // Set up notification listeners
        const notificationListener = notificationService.addNotificationListener(
          (notification) => {
            console.log('Received notification:', notification);
          }
        );

        const responseListener = notificationService.addNotificationResponseListener(
          (response) => {
            console.log('Notification response:', response);
          }
        );

        // Cleanup listeners on unmount
        return () => {
          notificationService.removeNotificationListener(notificationListener);
          notificationService.removeNotificationListener(responseListener);
        };
      } catch (error) {
        console.error('Failed to initialize notifications:', error);
      }
    };

    initializeNotifications();
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
              animation: 'slide_from_right',
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
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen
            name="addPurchaseScreen"
            options={{
              title: 'Add Planned Purchase',
              headerStyle: {
                backgroundColor: '#043927',
              },
              headerTintColor: '#fff',
              animation: 'slide_from_right',
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
              animation: 'flip',
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
