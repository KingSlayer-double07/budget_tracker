import { Stack } from "expo-router";
import { useEffect, useState } from "react";
import { handleRecurringUpdates, initializeDatabase } from "./database";
import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { BudgetProvider } from './context/BudgetContext';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet, View, ActivityIndicator } from 'react-native';
import { NotificationService } from './services/NotificationService';
import { AuthenticationService } from './services/AuthenticationService';
import ExpoInsights from 'expo-insights';

export default function RootLayout() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const authService = AuthenticationService.getInstance();

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      // Initialize database
      await initializeDatabase();
      
      // Handle recurring updates
      handleRecurringUpdates();

      // Initialize notifications
      const notificationService = NotificationService.getInstance();
      await notificationService.initialize();

      // Set up notification listeners
      const notificationListener = notificationService.addNotificationListener(
        (notification) => {
          console.log('Received notification:', notification);
        }
      );

      const responseListener = notificationService.addNotificationResponseListener(
        async (response) => {
          console.log('Notification response:', response);
          
          const { actionIdentifier, notification } = response;
          const { data } = notification.request.content;

          if (actionIdentifier === 'CANCEL_FUTURE' && data?.identifier) {
            try {
              await notificationService.cancelFutureOccurrences(data.identifier);
              console.log('Future occurrences cancelled for:', data.identifier);
            } catch (error) {
              console.error('Error cancelling future occurrences:', error);
            }
          }
        }
      );

      // Check authentication
      const authenticated = await authService.authenticate();
      setIsAuthenticated(authenticated);

      // Cleanup listeners on unmount
      return () => {
        notificationService.removeNotificationListener(notificationListener);
        notificationService.removeNotificationListener(responseListener);
      };
    } catch (error) {
      console.error('Error initializing app:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#043927" />
      </View>
    );
  }

  if (!isAuthenticated) {
    return null; // Or show an authentication screen
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      <BudgetProvider>
        <Stack
          screenOptions={{
            headerStyle: {
              backgroundColor: '#043927',
            },
            headerTintColor: '#fff',
            headerTitleStyle: {
              fontWeight: 'bold',
            },
          }}
        >
          <Stack.Screen
            name="index"
            options={{
              title: 'Budget Tracker',
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen
            name="addIncomeScreen"
            options={{
              title: 'Add Income',
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen
            name="addExpenseScreen"
            options={{
              title: 'Add Expense',
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen
            name="addPurchaseScreen"
            options={{
              title: 'Add Purchase',
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen
            name="plannedPurchasesScreen"
            options={{
              title: 'Planned Purchases',
              animation: 'flip',
            }}
          />
          <Stack.Screen
            name="settingsScreen"
            options={{
              title: 'Settings',
              animation: 'simple_push',
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
