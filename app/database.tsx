import * as SQLite from 'expo-sqlite';
import * as FileSystem from 'expo-file-system';
import { Alert } from 'react-native';
import { router } from 'expo-router';
import { SecureStorageService } from './services/SecureStorageService';
import { NotificationService } from './services/NotificationService';

// Database types
interface Income {
  id: number;
  source: string;
  amount: number;
  date: string;
  is_recurring: number;
  recurring_date: string | null;
}

interface Expense {
  id: number;
  item: string;
  amount: number;
  date: string;
  is_recurring: number;
  recurring_date: string | null;
}

interface PlannedPurchase {
  id: number;
  item: string;
  amount: number;
  purchased: number;
}

interface Savings {
  id: number;
  amount: number;
  frequency: string;
  date: string;
}

interface DatabaseResult {
  total?: number;
}

// Validation types
interface ValidationResult {
  isValid: boolean;
  error?: string;
}

// Validation functions
const validateAmount = (amount: number): ValidationResult => {
  if (isNaN(amount)) {
    return { isValid: false, error: "Amount must be a valid number" };
  }
  if (amount < 0) {
    return { isValid: false, error: "Amount cannot be negative" };
  }
  if (amount > Number.MAX_SAFE_INTEGER) {
    return { isValid: false, error: "Amount is too large" };
  }
  return { isValid: true };
};

const validateString = (value: string, fieldName: string, maxLength: number = 100): ValidationResult => {
  if (!value || value.trim().length === 0) {
    return { isValid: false, error: `${fieldName} cannot be empty` };
  }
  if (value.length > maxLength) {
    return { isValid: false, error: `${fieldName} is too long (max ${maxLength} characters)` };
  }
  return { isValid: true };
};

const validateDate = (date: string): ValidationResult => {
  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) {
    return { isValid: false, error: "Invalid date format" };
  }
  if (dateObj > new Date()) {
    return { isValid: false, error: "Date cannot be in the future" };
  }
  return { isValid: true };
};

const validateRecurringDate = (date: string): ValidationResult => {
  if (!date) {
    return { isValid: true, error: "" };
  }

  // For monthly recurring transactions, date should be in format "DD"
  const dayPattern = /^([1-9]|0[1-9]|[12][0-9]|3[01])$/;
  if (!dayPattern.test(date)) {
    return { 
      isValid: false, 
      error: "Recurring date must be a valid day of the month (1-31)" 
    };
  }

  const day = parseInt(date);
  if (day < 1 || day > 31) {
    return { 
      isValid: false, 
      error: "Recurring date must be between 1 and 31" 
    };
  }

  return { isValid: true, error: "" };
};

// Database configuration
const DB_NAME = 'budgetTracker.db';

// Database connection management
let db: SQLite.SQLiteDatabase | null = null;
let isInitialized = false;

export const initializeDatabase = async (): Promise<boolean> => {
  if (isInitialized) {
    return true;
  }

  try {
    db = await SQLite.openDatabaseAsync(DB_NAME);
    await db.execAsync(`PRAGMA foreign_keys = ON;`);
    
    // Create tables
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS income (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source TEXT NOT NULL,
        amount REAL NOT NULL,
        date TEXT NOT NULL,
        is_recurring INTEGER DEFAULT 0,
        recurring_date TEXT
      );

      CREATE TABLE IF NOT EXISTS expenses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        item TEXT NOT NULL,
        amount REAL NOT NULL,
        date TEXT NOT NULL,
        is_recurring INTEGER DEFAULT 0,
        recurring_date TEXT
      );

      CREATE TABLE IF NOT EXISTS planned_purchases (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        item TEXT NOT NULL,
        amount REAL NOT NULL,
        purchased INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS savings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        amount REAL NOT NULL,
        frequency TEXT NOT NULL,
        date TEXT NOT NULL
      );
    `);

    isInitialized = true;
    console.log("Database initialized successfully ✅");
    return true;
  } catch (error) {
    console.error("Failed to initialize database:", error);
    Alert.alert(
      "Database Error",
      "Failed to initialize the database. Please restart the app."
    );
    return false;
  }
};

export const getDatabase = async (): Promise<SQLite.SQLiteDatabase> => {
  if (!isInitialized) {
    await initializeDatabase();
  }
  if (!db) {
    throw new Error("Database connection not available");
  }
  return db;
};

const safeDatabaseOperation = async <T extends unknown>(
  operation: (db: SQLite.SQLiteDatabase) => Promise<T>
): Promise<T | null> => {
  try {
    const database = await getDatabase();
    return await operation(database);
  } catch (error) {
    console.error("Database operation failed:", error);
    Alert.alert("Error", "An unexpected error occurred. Please try again.");
    return null;
  }
};

// Database operations with validation
export const addPlannedPurchase = async (item: string, amount: number): Promise<boolean> => {
  // Validate inputs
  const itemValidation = validateString(item, "Item name");
  if (!itemValidation.isValid) {
    Alert.alert("Validation Error", itemValidation.error);
    return false;
  }

  const amountValidation = validateAmount(amount);
  if (!amountValidation.isValid) {
    Alert.alert("Validation Error", amountValidation.error);
    return false;
  }

  return await safeDatabaseOperation(async (db) => {
    await db.runAsync(
      `INSERT INTO planned_purchases (item, amount, purchased) VALUES (?, ?, 0);`,
      [item.trim(), amount]
    );
    console.log(`Planned purchase added: ${item} - ${amount}`);
    Alert.alert("Success", "Purchase added successfully!");
    router.push('/plannedPurchasesScreen');
    return true;
  }) || false;
};

export const getPlannedPurchases = async () => {
  return await safeDatabaseOperation(async (db) => {
    const results = await db.getAllAsync(
      `SELECT * FROM planned_purchases ORDER BY purchased ASC, id DESC;`
    );
    return results;
  }) || [];
};

export const getIncome = async () => {
  return await safeDatabaseOperation(async (db) => {
    const results = await db.getAllAsync(`SELECT * FROM income ORDER BY date DESC;`);
    return results;
  }) || [];
};

export const getExpenses = async () => {
  return await safeDatabaseOperation(async (db) => {
    const results = await db.getAllAsync(`SELECT * FROM expenses ORDER BY date DESC;`);
    return results;
  }) || [];
};

export const markPurchaseAsBought = async (id: number, amount: number, item: string): Promise<boolean> => {
  return await safeDatabaseOperation(async (db) => {
    const result = await db.getFirstAsync<PlannedPurchase>(
      "SELECT * FROM planned_purchases WHERE id = ?",
      [id]
    );

    if (!result) {
      Alert.alert("Error", "Purchase not found");
      return false;
    }

    if (result.purchased) {
      Alert.alert("Already Bought", "This item has already been marked as bought.");
      return false;
    }

    // Start transaction
    await db.execAsync('BEGIN TRANSACTION');

    try {
      // Mark purchase as bought
      await db.runAsync(
        `UPDATE planned_purchases SET purchased = 1 WHERE id = ?;`,
        [id]
      );

      // Check for existing expense
      const existingExpense = await db.getFirstAsync(
        "SELECT * FROM expenses WHERE item = ?",
        [item]
      );

      if (existingExpense) {
        Alert.alert("Already Added", "This expense has already been recorded.");
        await db.execAsync('ROLLBACK');
        return false;
      }

      // Add expense
      const currentDate = new Date().toISOString().split('T')[0];
      await db.runAsync(
        `INSERT INTO expenses (item, amount, date) VALUES (?, ?, ?);`,
        [item, amount, currentDate]
      );

      await db.execAsync('COMMIT');
      Alert.alert("Success", "Purchase marked as bought!");
      return true;
    } catch (error) {
      await db.execAsync('ROLLBACK');
      throw error;
    }
  }) || false;
};

export const getTotalIncome = async (): Promise<number> => {
  return await safeDatabaseOperation(async (db) => {
    const result = await db.getFirstAsync<DatabaseResult>(`SELECT SUM(amount) as total FROM income;`);
    return result?.total || 0;
  }) || 0;
};

export const getTotalExpenses = async (): Promise<number> => {
  return await safeDatabaseOperation(async (db) => {
    const result = await db.getFirstAsync<DatabaseResult>(`SELECT SUM(amount) as total FROM expenses;`);
    return result?.total || 0;
  }) || 0;
};

export const getBalance = async (): Promise<number> => {
  const income = await getTotalIncome();
  const expenses = await getTotalExpenses();
  return income - expenses;
};

export const addIncome = async (
  source: string,
  amount: number,
  isRecurring: boolean,
  recurringDate: string
): Promise<boolean> => {
  // Validate inputs
  const sourceValidation = validateString(source, "Source");
  if (!sourceValidation.isValid) {
    Alert.alert("Validation Error", sourceValidation.error);
    return false;
  }

  const amountValidation = validateAmount(amount);
  if (!amountValidation.isValid) {
    Alert.alert("Validation Error", amountValidation.error);
    return false;
  }

  if (isRecurring) {
    const recurringDateValidation = validateRecurringDate(recurringDate);
    if (!recurringDateValidation.isValid) {
      Alert.alert("Validation Error", recurringDateValidation.error);
      return false;
    }
  }

  return await safeDatabaseOperation(async (db) => {
    const date = new Date().toISOString().split('T')[0];
    const recurringDates = isRecurring ? recurringDate : null;
    
    await db.runAsync(
      `INSERT INTO income (source, amount, date, is_recurring, recurring_date) 
       VALUES (?, ?, ?, ?, ?);`,
      [source.trim(), amount, date, isRecurring ? 1 : 0, recurringDates]
    );
    
    console.log(`Income added: ${source}, ${amount}`);
    Alert.alert("Success", "Income added successfully!");
    router.back();
    return true;
  }) || false;
};

export const addExpense = async (
  item: string,
  amount: number,
  isRecurring: boolean,
  recurringDate: string
): Promise<boolean> => {
  // Validate inputs
  const itemValidation = validateString(item, "Item name");
  if (!itemValidation.isValid) {
    Alert.alert("Validation Error", itemValidation.error);
    return false;
  }

  const amountValidation = validateAmount(amount);
  if (!amountValidation.isValid) {
    Alert.alert("Validation Error", amountValidation.error);
    return false;
  }

  if (isRecurring) {
    const recurringDateValidation = validateRecurringDate(recurringDate);
    if (!recurringDateValidation.isValid) {
      Alert.alert("Validation Error", recurringDateValidation.error);
      return false;
    }
  }

  return await safeDatabaseOperation(async (db) => {
    const date = new Date().toISOString().split('T')[0];
    const recurringDates = isRecurring ? recurringDate : null;
    
    await db.runAsync(
      'INSERT INTO expenses (item, amount, date, is_recurring, recurring_date) VALUES (?, ?, ?, ?, ?)',
      [item.trim(), amount, date, isRecurring ? 1 : 0, recurringDates]
    );
    
    // Check budget threshold immediately after adding expense
    const totalExpenses = await getTotalExpenses();
    const secureStorage = SecureStorageService.getInstance();
    const threshold = await secureStorage.getSecureItem('budget_threshold');
    
    if (threshold) {
      const thresholdAmount = parseFloat(threshold);
      if (totalExpenses >= thresholdAmount) {
        const notificationService = NotificationService.getInstance();
        await notificationService.scheduleBudgetAlert(
          'Budget Limit Alert',
          `You have reached ${thresholdAmount.toLocaleString()} NGN in expenses`,
          thresholdAmount
        );
      }
    }
    
    console.log(`Expense added: ${item}, ${amount}`);
    Alert.alert("Success", "Expense added successfully!");
    router.back();
    return true;
  }) || false;
};

export const deletePurchase = async (key: number): Promise<boolean> => {
  return await safeDatabaseOperation(async (db) => {
    await db.runAsync(
      `DELETE FROM planned_purchases WHERE id = ?;`,
      [key]
    );
    console.log(`Purchase with ID ${key} deleted successfully`);
    return true;
  }) || false;
};

export const handleRecurringUpdates = async () => {
  const today = new Date();
  const currentDay = today.getDate();

  // Process recurring income
  try {
    if (!db) return;
    const recurringIncome = await db.getAllAsync<Income>('SELECT * FROM income WHERE is_recurring = 1');
    for (const income of recurringIncome) {
      if (income.recurring_date && parseInt(income.recurring_date) === currentDay) {
        await db.runAsync(
          'INSERT INTO income (amount, source, date, is_recurring, recurring_date) VALUES (?, ?, ?, ?, ?)',
          [income.amount, income.source, today.toISOString().split('T')[0], 1, income.recurring_date]
        );
      }
    }

    // Process recurring expenses
    if (!db) return;
    const recurringExpenses = await db.getAllAsync<Expense>('SELECT * FROM expenses WHERE is_recurring = 1');
    for (const expense of recurringExpenses) {
      if (expense.recurring_date && parseInt(expense.recurring_date) === currentDay) {
        await db.runAsync(
          'INSERT INTO expenses (amount, item, date, is_recurring, recurring_date) VALUES (?, ?, ?, ?, ?)',
          [expense.amount, expense.item, today.toISOString().split('T')[0], 1, expense.recurring_date]
        );
      }
    }
  } catch (error) {
    console.error("Error processing recurring updates:", error);
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

export const clearIncomeTable = async (): Promise<boolean> => {
  return await safeDatabaseOperation(async (db) => {
    await db.runAsync('DELETE FROM income;');
    return true;
  }) || false;
};

export const clearExpensesTable = async (): Promise<boolean> => {
  return await safeDatabaseOperation(async (db) => {
    await db.runAsync('DELETE FROM expenses;');
    return true;
  }) || false;
};

export const clearPlannedPurchasesTable = async (): Promise<boolean> => {
  return await safeDatabaseOperation(async (db) => {
    await db.runAsync('DELETE FROM planned_purchases;');
    return true;
  }) || false;
};

export const clearAllData = async (): Promise<boolean> => {
  return await safeDatabaseOperation(async (db) => {
    await db.runAsync('DELETE FROM income;');
    await db.runAsync('DELETE FROM expenses;');
    await db.runAsync('DELETE FROM planned_purchases;');
    await db.runAsync('DELETE FROM savings;');
    return true;
  }) || false;
};

// Initialize database when the module is imported
initializeDatabase().catch(error => {
  console.error("Failed to initialize database:", error);
});

