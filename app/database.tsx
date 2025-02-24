import * as SQLite from 'expo-sqlite';
import * as FileSystem from 'expo-file-system';
import { Alert } from 'react-native';

// Open the database asynchronously
let db: SQLite.SQLiteDatabase | null = null;

const setupDatabase = async () => {
  try {
    db = await SQLite.openDatabaseAsync('budgetTracker.db');
    await db.execAsync(`PRAGMA foreign_keys = ON;`); // Ensure foreign keys work (optional)

    // Create tables
    await db.execAsync(
      `CREATE TABLE IF NOT EXISTS income (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source TEXT NOT NULL,
        amount REAL NOT NULL,
        date TEXT NOT NULL,
        is_recurring INTEGER DEFAULT 0,
        recurring_date TEXT
      );`
    );

    await db.execAsync(
      `CREATE TABLE IF NOT EXISTS expenses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        item TEXT NOT NULL,
        amount REAL NOT NULL,
        date TEXT NOT NULL,
        is_recurring INTEGER DEFAULT 0,
        recurring_date TEXT
      );`
    );

    await db.execAsync(
      `CREATE TABLE IF NOT EXISTS planned_purchases (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        item TEXT NOT NULL,
        amount REAL NOT NULL,
        purchased INTEGER DEFAULT 0
      );`
    );

    await db.execAsync(
      `CREATE TABLE IF NOT EXISTS savings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        amount REAL NOT NULL,
        frequency TEXT NOT NULL,
        date TEXT NOT NULL
      );`
    );

    console.log("Database setup complete ✅");
  } catch (error) {
    console.error("Error setting up database:", error);
  }
};

export const addPlannedPurchase = async (item: string, amount: number) => {
    try {
      if (!db) return;
  
      await db.runAsync(
        `INSERT INTO planned_purchases (item, amount, purchased) VALUES (?, ?, 0);`,
        [item, amount]
      );
  
      console.log(`Planned purchase added: ${item} - ${amount}`);
    } catch (error) {
      console.error("Error adding planned purchase:", error);
    }
};

export const getPlannedPurchases = async () => {
    try {
      if (!db) return [];
  
      const results = await db.getAllAsync(`SELECT * FROM planned_purchases ORDER BY purchased ASC, id DESC;`);
      return results; // Returns an array of purchases
    } catch (error) {
      console.error("Error fetching planned purchases:", error);
      return [];
    }
};

export const getIncome = async () => {
  try {
    if (!db) return [];

    const results = await db.getAllAsync(`SELECT * FROM income ORDER BY date DESC;`);
    return results; // Returns an array of purchases
  } catch (error) {
    console.error("Error fetching Income:", error);
    return [];
  }
};

export const getExpenses = async () => {
  try {
    if (!db) return [];

    const results = await db.getAllAsync(`SELECT * FROM expenses ORDER BY date DESC;`);
    return results; // Returns an array of purchases
  } catch (error) {
    console.error("Error fetching Expenses:", error);
    return [];
  }
};

export const markPurchaseAsBought = async (id: number, amount: number, item:string) => {
    try {
      if (!db) return;
  
      // Step 1: Update planned purchase to mark as purchased
      const result = await db.getFirstAsync(
        "SELECT * FROM planned_purchases WHERE id = ?",
        [id]
      );
  
      if (!result) return;
  
      const { item, amount, purchased } = result;
  
      if (purchased) {
        Alert.alert("Already Bought", "This item has already been marked as bought.");
        return;
      } else {
        // Mark purchase as bought
      await db.runAsync(`UPDATE planned_purchases SET purchased = 1 WHERE id = ?;`, [id]);
      Alert.alert("Success", "Purchase marked as bought!");
      }
  
      
  
      // Check if expense already exists to prevent duplicates
    const existingExpense = await db.getFirstAsync(
      "SELECT * FROM expenses WHERE item = ?",
      [item]
    );

    if (existingExpense) {
      Alert.alert("Already Added", "This expense has already been recorded.");
      return;
    }

    // Step 2: Insert expense into expenses table
      const currentDate = new Date().toISOString().split('T')[0]; // Format: YYYY-MM-DD
      await db.runAsync(`INSERT INTO expenses (item, amount, date) VALUES (?, ?, ?);`, [item, amount, currentDate]);
  
      console.log(`Purchase marked as bought: ID ${id}, Amount: ${amount}`);
    } catch (error) {
      console.error("Error marking purchase as bought:", error);
    }
};

export const getTotalIncome = async (): Promise<number> => {
    try {
      if (!db) return 0;
      const result = await db.getFirstAsync(`SELECT SUM(amount) as total FROM income;`);
      return result?.total || 0; // Return 0 if no income exists
    } catch (error) {
      console.error("Error fetching total income:", error);
      return 0;
    }
};
  
  export const getTotalExpenses = async (): Promise<number> => {
    try {
      if (!db) return 0;
      const result = await db.getFirstAsync(`SELECT SUM(amount) as total FROM expenses;`);
      return result?.total || 0; // Return 0 if no expenses exist
    } catch (error) {
      console.error("Error fetching total expenses:", error);
      return 0;
    }
};
  
  export const getBalance = async (): Promise<number> => {
    const income = await getTotalIncome();
    const expenses = await getTotalExpenses();
    return income - expenses;
};

export const addIncome = async (source: string, amount: number, isRecurring: boolean, recurringDate: string) => {
    try {
      if (!db) return;
      const date = new Date().toISOString().split('T')[0]; // Current date
      const recurringDates = isRecurring ? recurringDate : null;
      await db.runAsync(
        `INSERT INTO income (source, amount, date, is_recurring, recurring_date) VALUES (?, ?, ?, ?, ?);`,
        [source, amount, date, isRecurring ? 1 : 0, recurringDates]);
      console.log(`Income added: ${source}, ${amount}`);
    } catch (error) {
      console.error("Error adding income:", error);
    }
};

export const addExpense = async (item: string, amount: number,  isRecurring: boolean, recurringDate: string) => {
  try {
    if (!db) return;
    const date = new Date().toISOString().split('T')[0];
    const recurringDate = isRecurring ? date : null;
    await db.runAsync(
    'INSERT INTO expenses (item, amount, date, is_recurring, recurring_date) VALUES (?, ?, ?, ?, ?)',
    [item, amount, date, isRecurring ? 1 : 0, recurringDate]);
    console.log(`Expense added: ${item}, ${amount}`);
  } catch (error) {
    console.error("Error adding expense", error);
  }
  
};

export const deletePurchase = async (key: number) => {
  try {
    Alert.alert(
      "Delete Purchase",
      "Are you sure you want to delete this record? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Yes, Delete", onPress: async () => {
          if (!db) return;
          await db.runAsync(
            `DELETE FROM planned_purchases WHERE id = ?;`, 
            [key]
          );
          console.log(`Purchase with ID ${key} deleted successfully`);
          Alert.alert("Success", "Purchase deleted successfully");
          } 
        },
      ]
    );
  } catch (error) {
    Alert.alert("Error", "Unable to delete data");
    console.error("Database Error:", error);
  }
};
  
export const handleRecurringUpdates = async () => {
  const today = new Date();
  const currentMonth = today.getFullYear() + '-' + (today.getMonth() + 1); // YYYY-MM
  

  // Process recurring income
  try {
    if (!db) return;
    const recurringIncome = await db.getAllAsync('SELECT * FROM income WHERE is_recurring = 1');
    for (const income of recurringIncome) {
      if (!income.recurring_date || !income.recurring_date.startsWith(currentMonth)) {
        await db.runAsync(
        'INSERT INTO income (amount, source, date, is_recurring, recurring_date) VALUES (?, ?, ?, ?, ?)',
        [income.amount, income.source, today.toISOString().split('T')[0], 1, currentMonth]
      );
    }
  }
  } catch (error){
    console.error("Error processing recurring income", error);
  }
  

  // Process recurring expenses
    if (!db) return;
  const recurringExpenses = await db.getAllAsync('SELECT * FROM expenses WHERE is_recurring = 1');
  for (const expense of recurringExpenses) {
    if (!expense.recurring_date || !expense.recurring_date.startsWith(currentMonth)) {
      await db.runAsync(
        'INSERT INTO expenses (cost, item, date, is_recurring, recurring_date) VALUES (?, ?, ?, ?, ?)',
        [expense.cost, expense.item, today.toISOString().split('T')[0], 1, currentMonth]
      );
    }
  }
};

export const resetDatabase = async () => {
  try {
    const dbPath = `${FileSystem.documentDirectory}SQLite/budgetTracker.db`;
    
    // Confirm before deleting
    Alert.alert(
      "Reset Database",
      "Are you sure you want to reset all data? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Yes, Reset", onPress: async () => {
            await FileSystem.deleteAsync(dbPath);
            Alert.alert("Success", "Database has been reset. Restart the app.");
          } 
        },
      ]
    );
  } catch (error) {
    Alert.alert("Error", "Something went wrong while resetting the database.");
    console.error(error);
  }
};

 

// Export functions for database access
export { setupDatabase, db };
