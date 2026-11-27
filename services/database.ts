import * as SQLite from "expo-sqlite"
import * as FileSystem from "expo-file-system"
import { Alert } from "react-native"
import { SecureStorageService } from "./SecureStorageService"
import { NotificationService } from "./NotificationService"

// Database types
interface Income {
  id: number
  source: string
  amount: number
  date: string
  is_recurring: number
  recurring_date: string | null
  last_processed: string | null
  // Values later occurrences use when a repeating entry was edited for
  // future months only; set whenever next_amount is not null
  next_name: string | null
  next_amount: number | null
}

interface Expense {
  id: number
  item: string
  amount: number
  date: string
  is_recurring: number
  recurring_date: string | null
  last_processed: string | null
  category_id: number | null
  next_name: string | null
  next_amount: number | null
  next_category_id: number | null
}

export interface Category {
  id: number
  name: string
}

// Starting categories, created the first time the app runs
export const DEFAULT_CATEGORIES = [
  "Food & Groceries",
  "Transport",
  "Rent & Housing",
  "Utilities & Bills",
  "Data & Airtime",
  "Health",
  "Entertainment",
  "Shopping",
  "Family & Gifts",
  "Savings & Investments",
  "Other",
]

// Label for expenses without a category
export const UNCATEGORIZED = "Uncategorized"

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

    // Expense categories; the defaults are only added when the table is first
    // created, so categories removed later stay removed
    const categoriesTable = await db.getFirstAsync(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'categories'"
    )
    if (!categoriesTable) {
      await db.execAsync(`
        CREATE TABLE categories (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL UNIQUE COLLATE NOCASE
        );
      `)
      for (const name of DEFAULT_CATEGORIES) {
        await db.runAsync("INSERT INTO categories (name) VALUES (?)", [name])
      }
    }

    // Existing expenses have no category (shown as Uncategorized)
    const categoryColumn = await db.getFirstAsync(
      "SELECT name FROM pragma_table_info('expenses') WHERE name = 'category_id'"
    )
    if (!categoryColumn) {
      await db.execAsync("ALTER TABLE expenses ADD COLUMN category_id INTEGER;")
    }

    // Future-month values for repeating entries, so editing what later months
    // record doesn't rewrite the month the entry was first added in
    const nextColumns: [string, string][] = [
      ["income", "next_name TEXT"],
      ["income", "next_amount REAL"],
      ["expenses", "next_name TEXT"],
      ["expenses", "next_amount REAL"],
      ["expenses", "next_category_id INTEGER"],
    ]
    for (const [table, definition] of nextColumns) {
      const name = definition.split(" ")[0]
      const column = await db.getFirstAsync(
        `SELECT name FROM pragma_table_info('${table}') WHERE name = ?`,
        [name]
      )
      if (!column) {
        await db.execAsync(`ALTER TABLE ${table} ADD COLUMN ${definition};`)
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
        `SELECT e.*, c.name AS category_name FROM expenses e
         LEFT JOIN categories c ON c.id = e.category_id
         ORDER BY e.date DESC, e.id DESC;`
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

// Total income recorded in the given month (defaults to the current month)
export const getMonthlyIncome = async (
  month: Date = new Date()
): Promise<number> => {
  const monthPrefix = toLocalDateString(month).slice(0, 7) // YYYY-MM
  return (
    (await safeDatabaseOperation(async (db) => {
      const result = await db.getFirstAsync<DatabaseResult>(
        `SELECT SUM(amount) as total FROM income WHERE date LIKE ?;`,
        [`${monthPrefix}%`]
      )
      return result?.total || 0
    })) || 0
  )
}

export const BUDGET_THRESHOLD_KEY = "budget_threshold"
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
  recurringDate: string,
  categoryId: number | null = null
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
        "INSERT INTO expenses (item, amount, date, is_recurring, recurring_date, category_id) VALUES (?, ?, ?, ?, ?, ?)",
        [
          item.trim(),
          amount,
          date,
          isRecurring ? 1 : 0,
          recurringDates,
          categoryId,
        ]
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

// Validate an edited name and amount, alerting on the first problem
const validateEdit = (name: string, nameLabel: string, amount: number) => {
  for (const result of [validateString(name, nameLabel), validateAmount(amount)]) {
    if (!result.isValid) {
      Alert.alert("Validation Error", result.error)
      return false
    }
  }
  return true
}

// What an edit to an entry changes:
// - "entry": the entry itself; if it repeats, later months follow it too
// - "future": only what a repeating entry records in later months, so the
//   month it was first added in (the entry itself) keeps its values
export type EditScope = "entry" | "future"

// Change an income entry's source and amount
export const updateIncome = async (
  id: number,
  source: string,
  amount: number,
  scope: EditScope = "entry"
): Promise<boolean> => {
  if (!validateEdit(source, "Source", amount)) return false
  return (
    (await safeDatabaseOperation(async (db) => {
      const entry = await db.getFirstAsync<Income>(
        "SELECT * FROM income WHERE id = ?",
        [id]
      )
      if (!entry) return false
      const name = source.trim()
      if (scope === "future" && entry.is_recurring) {
        // Matching the entry again means later months simply follow it
        const same = name === entry.source && amount === entry.amount
        await db.runAsync(
          "UPDATE income SET next_name = ?, next_amount = ? WHERE id = ?",
          [same ? null : name, same ? null : amount, id]
        )
      } else {
        await db.runAsync(
          `UPDATE income SET source = ?, amount = ?, next_name = NULL,
           next_amount = NULL WHERE id = ?`,
          [name, amount, id]
        )
      }
      return true
    })) || false
  )
}

// Change an expense's name, amount and category
export const updateExpense = async (
  id: number,
  item: string,
  amount: number,
  categoryId: number | null,
  scope: EditScope = "entry"
): Promise<boolean> => {
  if (!validateEdit(item, "Item name", amount)) return false
  return (
    (await safeDatabaseOperation(async (db) => {
      const entry = await db.getFirstAsync<Expense>(
        "SELECT * FROM expenses WHERE id = ?",
        [id]
      )
      if (!entry) return false
      const name = item.trim()
      if (scope === "future" && entry.is_recurring) {
        // Matching the entry again means later months simply follow it
        const same =
          name === entry.item &&
          amount === entry.amount &&
          categoryId === entry.category_id
        await db.runAsync(
          `UPDATE expenses SET next_name = ?, next_amount = ?,
           next_category_id = ? WHERE id = ?`,
          same ? [null, null, null, id] : [name, amount, categoryId, id]
        )
      } else {
        await db.runAsync(
          `UPDATE expenses SET item = ?, amount = ?, category_id = ?,
           next_name = NULL, next_amount = NULL, next_category_id = NULL
           WHERE id = ?`,
          [name, amount, categoryId, id]
        )
      }
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
        `UPDATE ${table} SET is_recurring = 0, recurring_date = NULL,
         next_name = NULL, next_amount = NULL WHERE id = ?;`,
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
        `UPDATE ${table} SET is_recurring = 0, recurring_date = NULL,
         next_name = NULL, next_amount = NULL
         WHERE is_recurring = 1 AND recurring_date = ?
           AND (CASE WHEN next_amount IS NOT NULL THEN next_name
                ELSE ${nameColumn} END) = ?;`,
        [recurringDay, name]
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

    // Values edited for future months only take over from the entry's own
    const edited = entry.next_amount !== null && entry.next_amount !== undefined
    const nextName = edited ? entry.next_name ?? name : name
    const nextAmount = edited ? entry.next_amount! : entry.amount
    const nextCategory = edited ? entry.next_category_id : entry.category_id

    for (const due of dueDatesBetween(dayOfMonth, after, today)) {
      // Occurrences are plain entries so only the original keeps recurring;
      // expense occurrences keep the category in effect
      if (table === "expenses") {
        await database.runAsync(
          "INSERT INTO expenses (item, amount, date, is_recurring, recurring_date, category_id) VALUES (?, ?, ?, 0, NULL, ?)",
          [nextName, nextAmount, due, nextCategory ?? null]
        )
      } else {
        await database.runAsync(
          "INSERT INTO income (source, amount, date, is_recurring, recurring_date) VALUES (?, ?, ?, 0, NULL)",
          [nextName, nextAmount, due]
        )
      }
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

export const getCategories = async (): Promise<Category[]> => {
  return (
    (await safeDatabaseOperation((db) =>
      db.getAllAsync<Category>(
        "SELECT id, name FROM categories ORDER BY name COLLATE NOCASE"
      )
    )) || []
  )
}

// Check a category name is present and not already used (ignoring case)
const validateCategoryName = async (
  db: SQLite.SQLiteDatabase,
  name: string,
  exceptId?: number
): Promise<ValidationResult> => {
  const validation = validateString(name, "Category name", 40)
  if (!validation.isValid) return validation
  if (name.trim().toLowerCase() === UNCATEGORIZED.toLowerCase()) {
    return { isValid: false, error: `"${UNCATEGORIZED}" is reserved` }
  }
  const existing = await db.getFirstAsync<Category>(
    "SELECT id FROM categories WHERE name = ? COLLATE NOCASE AND id != ?",
    [name.trim(), exceptId ?? -1]
  )
  if (existing) {
    return { isValid: false, error: `"${name.trim()}" already exists` }
  }
  return { isValid: true }
}

export const addCategory = async (name: string): Promise<boolean> => {
  return (
    (await safeDatabaseOperation(async (db) => {
      const validation = await validateCategoryName(db, name)
      if (!validation.isValid) {
        Alert.alert("Validation Error", validation.error)
        return false
      }
      await db.runAsync("INSERT INTO categories (name) VALUES (?)", [
        name.trim(),
      ])
      return true
    })) || false
  )
}

export const renameCategory = async (
  id: number,
  name: string
): Promise<boolean> => {
  return (
    (await safeDatabaseOperation(async (db) => {
      const validation = await validateCategoryName(db, name, id)
      if (!validation.isValid) {
        Alert.alert("Validation Error", validation.error)
        return false
      }
      await db.runAsync("UPDATE categories SET name = ? WHERE id = ?", [
        name.trim(),
        id,
      ])
      return true
    })) || false
  )
}

// Remove a category; its expenses become Uncategorized
export const deleteCategory = async (id: number): Promise<boolean> => {
  return (
    (await safeDatabaseOperation(async (db) => {
      await db.execAsync("BEGIN TRANSACTION")
      try {
        await db.runAsync(
          "UPDATE expenses SET category_id = NULL WHERE category_id = ?",
          [id]
        )
        await db.runAsync(
          "UPDATE expenses SET next_category_id = NULL WHERE next_category_id = ?",
          [id]
        )
        await db.runAsync("DELETE FROM categories WHERE id = ?", [id])
        await db.execAsync("COMMIT")
        return true
      } catch (error) {
        await db.execAsync("ROLLBACK")
        throw error
      }
    })) || false
  )
}

// Change an expense's category; null makes it Uncategorized
export const setExpenseCategory = async (
  expenseId: number,
  categoryId: number | null
): Promise<boolean> => {
  return (
    (await safeDatabaseOperation(async (db) => {
      await db.runAsync("UPDATE expenses SET category_id = ? WHERE id = ?", [
        categoryId,
        expenseId,
      ])
      return true
    })) || false
  )
}

export interface CategoryTotal {
  categoryId: number | null
  name: string
  total: number
}

// Spending per category in the given month (defaults to the current month),
// largest first; expenses without a category are grouped as Uncategorized
export const getMonthlyExpensesByCategory = async (
  month: Date = new Date()
): Promise<CategoryTotal[]> => {
  const monthPrefix = toLocalDateString(month).slice(0, 7) // YYYY-MM
  const rows =
    (await safeDatabaseOperation((db) =>
      db.getAllAsync<{
        category_id: number | null
        name: string | null
        total: number
      }>(
        `SELECT c.id AS category_id, c.name AS name, SUM(e.amount) AS total
         FROM expenses e
         LEFT JOIN categories c ON c.id = e.category_id
         WHERE e.date LIKE ?
         GROUP BY c.id
         ORDER BY total DESC`,
        [`${monthPrefix}%`]
      )
    )) || []
  return rows.map((row) => ({
    categoryId: row.category_id,
    name: row.name ?? UNCATEGORIZED,
    total: row.total,
  }))
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
