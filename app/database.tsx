import * as SQLite from "expo-sqlite"
import * as FileSystem from "expo-file-system"
import { Alert } from "react-native"
import { SecureStorageService } from "./services/SecureStorageService"
import { NotificationService } from "./services/NotificationService"

// Database types
interface Income {
  id: number
  source: string
  amount: number
  date: string
  is_recurring: number
  recurring_date: string | null
  last_processed: string | null
}

interface Expense {
  id: number
  item: string
  amount: number
  date: string
  is_recurring: number
  recurring_date: string | null
  last_processed: string | null
}

interface PlannedPurchase {
  id: number
  item: string
  amount: number
  purchased: number
  due_date: string | null
}

interface Savings {
  id: number
  amount: number
  frequency: string
  date: string
}

interface DatabaseResult {
  total?: number
}

// Validation types
interface ValidationResult {
  isValid: boolean
  error?: string
}

// Validation functions
const validateAmount = (amount: number): ValidationResult => {
  if (isNaN(amount)) {
    return { isValid: false, error: "Amount must be a valid number" }
  }
  if (amount < 0) {
    return { isValid: false, error: "Amount cannot be negative" }
  }
  if (amount > Number.MAX_SAFE_INTEGER) {
    return { isValid: false, error: "Amount is too large" }
  }
  return { isValid: true }
}

const validateString = (
  value: string,
  fieldName: string,
  maxLength: number = 100
): ValidationResult => {
  if (!value || value.trim().length === 0) {
    return { isValid: false, error: `${fieldName} cannot be empty` }
  }
  if (value.length > maxLength) {
    return {
      isValid: false,
      error: `${fieldName} is too long (max ${maxLength} characters)`,
    }
  }
  return { isValid: true }
}

const validateFullDate = (
  date: string,
  allowFuture: boolean = false
): ValidationResult => {
  // Check if the date string matches YYYY-MM-DD format
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/
  if (!dateRegex.test(date)) {
    return { isValid: false, error: "Date must be in YYYY-MM-DD format" }
  }

  // Parse the date components
  const [year, month, day] = date.split("-").map(Number)

  // Validate year
  if (year < 2000 || year > 2100) {
    return { isValid: false, error: "Year must be between 2000 and 2100" }
  }

  // Validate month
  if (month < 1 || month > 12) {
    return { isValid: false, error: "Month must be between 1 and 12" }
  }

  // Validate day
  const daysInMonth = new Date(year, month, 0).getDate()
  if (day < 1 || day > daysInMonth) {
    return {
      isValid: false,
      error: `Day must be between 1 and ${daysInMonth} for the given month`,
    }
  }

  // Check if the date is in the future
  const dateObj = new Date(year, month - 1, day)
  if (!allowFuture && dateObj > new Date()) {
    return { isValid: false, error: "Date cannot be in the future" }
  }

  return { isValid: true }
}

const validateDayOfMonth = (day: string): ValidationResult => {
  if (!day) {
    return { isValid: true, error: "" }
  }

  // For monthly recurring transactions, date should be in format "DD"
  const dayPattern = /^([1-9]|0[1-9]|[12][0-9]|3[01])$/
  if (!dayPattern.test(day)) {
    return {
      isValid: false,
      error: "Recurring date must be a valid day of the month (1-31)",
    }
  }

  const dayNum = parseInt(day)
  if (dayNum < 1 || dayNum > 31) {
    return {
      isValid: false,
      error: "Recurring date must be between 1 and 31",
    }
  }

  return { isValid: true, error: "" }
}

// Format a date as YYYY-MM-DD in local time (toISOString uses UTC)
const toLocalDateString = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

// Database configuration
const DB_NAME = "budgetTracker.db"

// Database connection management
let db: SQLite.SQLiteDatabase | null = null
let isInitialized = false
let isConnecting = false

export const initializeDatabase = async (): Promise<boolean> => {
  if (isInitialized) {
    return true
  }

  if (isConnecting) {
    // Wait for the existing connection attempt to complete
    await delay(1000)
    return isInitialized
  }

  isConnecting = true

  try {
    db = await SQLite.openDatabaseAsync(DB_NAME)
    await db.execAsync(`PRAGMA foreign_keys = ON;`)
    await db.execAsync(`PRAGMA busy_timeout = 5000;`) // Set busy timeout to 5 seconds

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
        purchased INTEGER DEFAULT 0,
        due_date TEXT
      );

      CREATE TABLE IF NOT EXISTS savings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        amount REAL NOT NULL,
        frequency TEXT NOT NULL,
        date TEXT NOT NULL
      );
    `)

    // Check if due_date column exists in planned_purchases table
    const tableInfo = await db.getFirstAsync(
      "SELECT name FROM pragma_table_info('planned_purchases') WHERE name = 'due_date'"
    )

    if (!tableInfo) {
      // Add due_date column if it doesn't exist
      await db.execAsync(`
        ALTER TABLE planned_purchases ADD COLUMN due_date TEXT;
      `)
    }

    // Track how far each recurring entry has been processed, so missed due
    // dates can be caught up without re-adding deleted occurrences
    for (const table of ["income", "expenses"]) {
      const column = await db.getFirstAsync(
        `SELECT name FROM pragma_table_info('${table}') WHERE name = 'last_processed'`
      )
      if (!column) {
        await db.execAsync(`ALTER TABLE ${table} ADD COLUMN last_processed TEXT;`)
      }
    }

    isInitialized = true
    return true
  } catch (error) {
    console.error("Failed to initialize database:", error)
    Alert.alert(
      "Database Error",
      "Failed to initialize the database. Please restart the app."
    )
    return false
  } finally {
    isConnecting = false
  }
}

export const getDatabase = async (): Promise<SQLite.SQLiteDatabase> => {
  if (!isInitialized) {
    await initializeDatabase()
  }
  if (!db) {
    throw new Error("Database connection not available")
  }
  return db
}

const safeDatabaseOperation = async <T extends unknown>(
  operation: (db: SQLite.SQLiteDatabase) => Promise<T>
): Promise<T | null> => {
  try {
    const database = await getDatabase()
    return await operation(database)
  } catch (error) {
    console.error("Database operation failed:", error)
    Alert.alert("Error", "An unexpected error occurred. Please try again.")
    return null
  }
}

// Add a delay between operations to prevent database locks
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

// Database operations with validation
export const addPlannedPurchase = async (
  item: string,
  amount: number,
  dueDate?: string
): Promise<boolean> => {
  // Validate inputs
  const itemValidation = validateString(item, "Item name")
  if (!itemValidation.isValid) {
    Alert.alert("Validation Error", itemValidation.error)
    return false
  }

  const amountValidation = validateAmount(amount)
  if (!amountValidation.isValid) {
    Alert.alert("Validation Error", amountValidation.error)
    return false
  }

  // Validate due date if provided
  if (dueDate) {
    // Due dates are expected to be in the future
    const dateValidation = validateFullDate(dueDate, true)
    if (!dateValidation.isValid) {
      Alert.alert("Validation Error", dateValidation.error)
      return false
    }
  }

  return (
    (await safeDatabaseOperation(async (db) => {
      await db.runAsync(
        `INSERT INTO planned_purchases (item, amount, purchased, due_date) VALUES (?, ?, 0, ?);`,
        [item.trim(), amount, dueDate || null]
      )
      return true
    })) || false
  )
}

export const getPlannedPurchases = async () => {
  return (
    (await safeDatabaseOperation(async (db) => {
      const results = await db.getAllAsync(
        `SELECT * FROM planned_purchases ORDER BY purchased ASC, id DESC;`
      )
      return results
    })) || []
  )
}

export const getSpecificPurchase = async (id: number) => {
  return (
    (await safeDatabaseOperation(async (db) => {
      const result = await db.getFirstAsync<PlannedPurchase>(
        "SELECT * FROM planned_purchases WHERE id = ?",
        [id]
      )
      return result
    }))
  )
}

export const getIncome = async () => {
  return (
    (await safeDatabaseOperation(async (db) => {
      const results = await db.getAllAsync(
        `SELECT * FROM income ORDER BY date DESC;`
      )
      return results
    })) || []
  )
}

export const getExpenses = async () => {
  return (
    (await safeDatabaseOperation(async (db) => {
      const results = await db.getAllAsync(
        `SELECT * FROM expenses ORDER BY date DESC;`
      )
      return results
    })) || []
  )
}

export const markPurchaseAsBought = async (
  id: number,
  amount: number,
  item: string
): Promise<boolean> => {
  return (
    (await safeDatabaseOperation(async (db) => {
      const result = await db.getFirstAsync<PlannedPurchase>(
        "SELECT * FROM planned_purchases WHERE id = ?",
        [id]
      )

      if (!result) {
        Alert.alert("Error", "Purchase not found")
        return false
      }

      if (result.purchased) {
        Alert.alert(
          "Already Bought",
          "This item has already been marked as bought."
        )
        return false
      }

      // Start transaction
      await db.execAsync("BEGIN TRANSACTION")

      try {
        // Mark purchase as bought
        await db.runAsync(
          `UPDATE planned_purchases SET purchased = 1 WHERE id = ?;`,
          [id]
        )

        // Add expense
        const currentDate = toLocalDateString(new Date())
        await db.runAsync(
          `INSERT INTO expenses (item, amount, date) VALUES (?, ?, ?);`,
          [item, amount, currentDate]
        )

        await db.execAsync("COMMIT")
        return true
      } catch (error) {
        await db.execAsync("ROLLBACK")
        throw error
      }
    })) || false
  )
}

export const changePurchaseAmount = async (
  id: number,
  amount: number,
  newAmount: number,
  item: string
): Promise<boolean> => {
  return (
    (await safeDatabaseOperation(async (db) => {
      const result = await getSpecificPurchase(id);

      if (!result) {
        Alert.alert("Error", "Purchase not found")
        return false
      }

      if (result.purchased) {
        Alert.alert(
          "Already Bought",
          "This item has already been marked as bought. \n Its amount can no longer be edited"
        )
        return false
      }

      // Start transaction
      await db.execAsync("BEGIN TRANSACTION")

      try {
        // Edit purchase amount
        await db.runAsync(
          `UPDATE planned_purchases SET amount = ? WHERE id = ?;`,
          [newAmount, id]
        )

        await db.execAsync("COMMIT")
        return true
      } catch (error) {
        console.error(error)
        await db.execAsync("ROLLBACK")
        throw error
      }
    })) || false
  )
}

export const getTotalIncome = async (): Promise<number> => {
  return (
    (await safeDatabaseOperation(async (db) => {
      const result = await db.getFirstAsync<DatabaseResult>(
        `SELECT SUM(amount) as total FROM income;`
      )
      return result?.total || 0
    })) || 0
  )
}

export const getTotalExpenses = async (): Promise<number> => {
  return (
    (await safeDatabaseOperation(async (db) => {
      const result = await db.getFirstAsync<DatabaseResult>(
        `SELECT SUM(amount) as total FROM expenses;`
      )
      return result?.total || 0
    })) || 0
  )
}

// Total expenses recorded in the given month (defaults to the current month)
export const getMonthlyExpenses = async (
  month: Date = new Date()
): Promise<number> => {
  const monthPrefix = toLocalDateString(month).slice(0, 7) // YYYY-MM
  return (
    (await safeDatabaseOperation(async (db) => {
      const result = await db.getFirstAsync<DatabaseResult>(
        `SELECT SUM(amount) as total FROM expenses WHERE date LIKE ?;`,
        [`${monthPrefix}%`]
      )
      return result?.total || 0
    })) || 0
  )
}

const BUDGET_THRESHOLD_KEY = "budget_threshold"
// Month (YYYY-MM) in which the budget alert last fired, so it fires once per month
export const BUDGET_ALERT_MONTH_KEY = "budget_alert_month"

// Notify once per month when this month's expenses reach the budget threshold
export const checkBudgetThreshold = async (): Promise<void> => {
  try {
    const secureStorage = SecureStorageService.getInstance()
    const threshold = parseFloat(
      (await secureStorage.getSecureItem(BUDGET_THRESHOLD_KEY)) ?? ""
    )
    if (isNaN(threshold) || threshold <= 0) return

    const currentMonth = toLocalDateString(new Date()).slice(0, 7)
    const alertedMonth = await secureStorage.getSecureItem(
      BUDGET_ALERT_MONTH_KEY
    )
    if (alertedMonth === currentMonth) return

    const monthlyExpenses = await getMonthlyExpenses()
    if (monthlyExpenses < threshold) return

    await NotificationService.getInstance().sendBudgetAlert(
      "Budget Limit Alert",
      `You've spent ${monthlyExpenses.toLocaleString()} NGN this month, reaching your ${threshold.toLocaleString()} NGN budget`
    )
    await secureStorage.saveSecureItem(BUDGET_ALERT_MONTH_KEY, currentMonth)
  } catch (error) {
    console.error("Error checking budget threshold:", error)
  }
}

export const getBalance = async (): Promise<number> => {
  const income = await getTotalIncome()
  const expenses = await getTotalExpenses()
  return income - expenses
}

export const addIncome = async (
  source: string,
  amount: number,
  isRecurring: boolean,
  recurringDate: string
): Promise<boolean> => {
  // Validate inputs
  const sourceValidation = validateString(source, "Source")
  if (!sourceValidation.isValid) {
    Alert.alert("Validation Error", sourceValidation.error)
    return false
  }

  const amountValidation = validateAmount(amount)
  if (!amountValidation.isValid) {
    Alert.alert("Validation Error", amountValidation.error)
    return false
  }

  if (isRecurring) {
    const recurringDateValidation = validateDayOfMonth(recurringDate)
    if (!recurringDateValidation.isValid) {
      Alert.alert("Validation Error", recurringDateValidation.error)
      return false
    }
  }

  return (
    (await safeDatabaseOperation(async (db) => {
      const date = toLocalDateString(new Date())
      const recurringDates = isRecurring ? recurringDate : null

      await db.runAsync(
        `INSERT INTO income (source, amount, date, is_recurring, recurring_date) 
       VALUES (?, ?, ?, ?, ?);`,
        [source.trim(), amount, date, isRecurring ? 1 : 0, recurringDates]
      )

      return true
    })) || false
  )
}

export const addExpense = async (
  item: string,
  amount: number,
  isRecurring: boolean,
  recurringDate: string
): Promise<boolean> => {
  // Validate inputs
  const itemValidation = validateString(item, "Item name")
  if (!itemValidation.isValid) {
    Alert.alert("Validation Error", itemValidation.error)
    return false
  }

  const amountValidation = validateAmount(amount)
  if (!amountValidation.isValid) {
    Alert.alert("Validation Error", amountValidation.error)
    return false
  }

  if (isRecurring) {
    const recurringDateValidation = validateDayOfMonth(recurringDate)
    if (!recurringDateValidation.isValid) {
      Alert.alert("Validation Error", recurringDateValidation.error)
      return false
    }
  }

  return (
    (await safeDatabaseOperation(async (db) => {
      const date = toLocalDateString(new Date())
      const recurringDates = isRecurring ? recurringDate : null

      await db.runAsync(
        "INSERT INTO expenses (item, amount, date, is_recurring, recurring_date) VALUES (?, ?, ?, ?, ?)",
        [item.trim(), amount, date, isRecurring ? 1 : 0, recurringDates]
      )

      return true
    })) || false
  )
}

export const deletePurchase = async (key: number): Promise<boolean> => {
  return (
    (await safeDatabaseOperation(async (db) => {
      await db.runAsync(`DELETE FROM planned_purchases WHERE id = ?;`, [key])
      await delay(100) // Add a small delay
      return true
    })) || false
  )
}

export const deleteIncome = async (key: number): Promise<boolean> => {
  return (
    (await safeDatabaseOperation(async (db) => {
      await db.runAsync(`DELETE FROM income WHERE id = ?;`, [key])
      await delay(100) // Add a small delay
      return true
    })) || false
  )
}

export const deleteExpense = async (key: number): Promise<boolean> => {
  return (
    (await safeDatabaseOperation(async (db) => {
      await db.runAsync(`DELETE FROM expenses WHERE id = ?;`, [key])
      await delay(100) // Add a small delay
      return true
    })) || false
  )
}

// Stop a recurring income or expense from being added again in future months
export const stopRecurring = async (
  table: "income" | "expenses",
  id: number
): Promise<boolean> => {
  return (
    (await safeDatabaseOperation(async (db) => {
      await db.runAsync(
        `UPDATE ${table} SET is_recurring = 0, recurring_date = NULL WHERE id = ?;`,
        [id]
      )
      return true
    })) || false
  )
}

// Stop a recurring entry identified by its name and day of month, for
// notification actions that don't know the row id
export const stopRecurringByName = async (
  table: "income" | "expenses",
  name: string,
  recurringDay: string
): Promise<boolean> => {
  const nameColumn = table === "income" ? "source" : "item"
  return (
    (await safeDatabaseOperation(async (db) => {
      await db.runAsync(
        `UPDATE ${table} SET is_recurring = 0, recurring_date = NULL
         WHERE is_recurring = 1 AND ${nameColumn} = ? AND recurring_date = ?;`,
        [name, recurringDay]
      )
      return true
    })) || false
  )
}

// Due dates of a monthly recurring entry after `after` up to and including
// `today` (both YYYY-MM-DD). Days past the end of a month (29-31) fall on
// that month's last day.
const dueDatesBetween = (
  dayOfMonth: number,
  after: string,
  today: string
): string[] => {
  const dates: string[] = []
  let [year, month] = after.split("-").map(Number)
  const [endYear, endMonth] = today.split("-").map(Number)
  while (year < endYear || (year === endYear && month <= endMonth)) {
    const daysInMonth = new Date(year, month, 0).getDate()
    const due = toLocalDateString(
      new Date(year, month - 1, Math.min(dayOfMonth, daysInMonth))
    )
    if (due > after && due <= today) dates.push(due)
    month++
    if (month > 12) {
      month = 1
      year++
    }
  }
  return dates
}

// The next due date (at 7:00) of an entry recurring on `dayOfMonth`, from
// `from` onwards. Days past the end of a month fall on its last day.
export const getNextDueDate = (dayOfMonth: number, from: Date = new Date()) => {
  for (let offset = 0; ; offset++) {
    const year = from.getFullYear()
    const month = from.getMonth() + offset
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const due = new Date(year, month, Math.min(dayOfMonth, daysInMonth), 7)
    if (due >= from) return due
  }
}

// Record every occurrence of the recurring entries in one table that has
// fallen due since it was last processed, including days the app was closed
const processRecurringTable = async (
  database: SQLite.SQLiteDatabase,
  table: "income" | "expenses",
  today: string
) => {
  const nameColumn = table === "income" ? "source" : "item"
  const entries = await database.getAllAsync<Income & Expense>(
    `SELECT * FROM ${table} WHERE is_recurring = 1`
  )

  for (const entry of entries) {
    const dayOfMonth = parseInt(entry.recurring_date ?? "")
    if (isNaN(dayOfMonth)) continue
    const name = (entry as any)[nameColumn] as string

    // Continue from the last processed date; for entries created before that
    // was tracked, from the latest occurrence already recorded
    let after = (entry.last_processed ?? entry.date).slice(0, 10)
    if (!entry.last_processed) {
      const latest = await database.getFirstAsync<{ date: string | null }>(
        `SELECT MAX(substr(date, 1, 10)) as date FROM ${table}
         WHERE ${nameColumn} = ? AND amount = ? AND id != ? AND is_recurring = 0`,
        [name, entry.amount, entry.id]
      )
      if (latest?.date && latest.date > after) after = latest.date
    }

    for (const due of dueDatesBetween(dayOfMonth, after, today)) {
      // Occurrences are plain entries so only the original keeps recurring
      await database.runAsync(
        `INSERT INTO ${table} (${nameColumn}, amount, date, is_recurring, recurring_date) VALUES (?, ?, ?, 0, NULL)`,
        [name, entry.amount, due]
      )
    }

    await database.runAsync(
      `UPDATE ${table} SET last_processed = ? WHERE id = ?`,
      [today, entry.id]
    )
  }
}

export const handleRecurringUpdates = async () => {
  const today = toLocalDateString(new Date())
  try {
    if (!db) return
    await processRecurringTable(db, "income", today)
    await processRecurringTable(db, "expenses", today)
  } catch (error) {
    console.error("Error processing recurring updates:", error)
  }
}

export const clearIncomeTable = async (): Promise<boolean> => {
  return (
    (await safeDatabaseOperation(async (db) => {
      await db.runAsync("DELETE FROM income;")
      return true
    })) || false
  )
}

export const clearExpensesTable = async (): Promise<boolean> => {
  return (
    (await safeDatabaseOperation(async (db) => {
      await db.runAsync("DELETE FROM expenses;")
      return true
    })) || false
  )
}

export const clearPlannedPurchasesTable = async (): Promise<boolean> => {
  return (
    (await safeDatabaseOperation(async (db) => {
      await db.runAsync("DELETE FROM planned_purchases WHERE purchased = 0;")
      return true
    })) || false
  )
}

export const clearAllData = async (): Promise<boolean> => {
  return (
    (await safeDatabaseOperation(async (db) => {
      await db.runAsync("DELETE FROM income;")
      await db.runAsync("DELETE FROM expenses;")
      await db.runAsync("DELETE FROM planned_purchases;")
      await db.runAsync("DELETE FROM savings;")
      return true
    })) || false
  )
}

// Initialize database when the module is imported
initializeDatabase().catch((error) => {
  console.error("Failed to initialize database:", error)
})
