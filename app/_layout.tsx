import { Stack } from "expo-router";
import { useEffect } from "react";
import { handleRecurringUpdates, setupDatabase } from "./database";
import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";

export default function RootLayout() {

  useEffect(() => {
    const initializeDB = async () => {
      await setupDatabase();
    };
    initializeDB();
    handleRecurringUpdates();
  }, []);

  return (
          <Stack>
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="addPurchaseScreen" options={{ headerShown: false }} />
            <Stack.Screen name="plannedPurchasesScreen" options={{ headerShown: false }} />
            <Stack.Screen name="addIncomeScreen" options={{ headerShown: false }} />
            <Stack.Screen name="addExpenseScreen" options={{ headerShown: false }} />
          </Stack>
  );
}
