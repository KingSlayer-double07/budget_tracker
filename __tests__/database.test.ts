// Runs the real database module against an in-memory SQLite database

jest.mock("expo-sqlite", () => ({
  openDatabaseAsync: jest.fn(async () =>
    require("../test-utils/sqlite").createTestDatabase()
  ),
}))

jest.mock("expo-secure-store", () => {
  const store = new Map<string, string>()
  return {
    __store: store,
    setItemAsync: jest.fn(async (key: string, value: string) => {
      store.set(key, value)
    }),
    getItemAsync: jest.fn(async (key: string) => store.get(key) ?? null),
    deleteItemAsync: jest.fn(async (key: string) => {
      store.delete(key)
    }),
  }
})

jest.mock("../app/services/NotificationService", () => {
  const sendBudgetAlert = jest.fn(async () => {})
  return {
    NotificationService: { getInstance: () => ({ sendBudgetAlert }) },
  }
})

type Database = typeof import("../app/database")

let database: Database
let sendBudgetAlert: jest.Mock
let alertSpy: jest.SpyInstance

// Fake only the clock; the module's small delays still use real timers
const setToday = (date: Date) => {
  jest.useFakeTimers({
    now: date,
    doNotFake: [
      "setTimeout",
      "clearTimeout",
      "setInterval",
      "clearInterval",
      "setImmediate",
      "clearImmediate",
      "nextTick",
      "queueMicrotask",
    ],
  })
}

const insertExpense = async (item: string, amount: number, date: string) => {
  const db = await database.getDatabase()
  await db.runAsync(
    "INSERT INTO expenses (item, amount, date) VALUES (?, ?, ?)",
    [item, amount, date]
  )
}

const allRows = async (table: "income" | "expenses") => {
  const db = await database.getDatabase()
  return db.getAllAsync<any>(`SELECT * FROM ${table} ORDER BY id`)
}

beforeEach(async () => {
  // Fresh module state, database and secure store for every test
  jest.resetModules()
  setToday(new Date(2026, 10, 26, 12)) // 26 Nov 2026, noon local time
  require("expo-secure-store").__store.clear()
  alertSpy = jest.spyOn(require("react-native").Alert, "alert")
  alertSpy.mockImplementation(() => {})
  database = require("../app/database")
  sendBudgetAlert = require("../app/services/NotificationService")
    .NotificationService.getInstance().sendBudgetAlert
  await database.initializeDatabase()
})

afterEach(() => {
  jest.useRealTimers()
  jest.restoreAllMocks()
})

describe("adding entries", () => {
  it("stores an expense with today's local date", async () => {
    expect(await database.addExpense("  Groceries ", 5000, false, "")).toBe(
      true
    )
    const [expense] = await allRows("expenses")
    expect(expense).toMatchObject({
      item: "Groceries",
      amount: 5000,
      date: "2026-11-26",
      is_recurring: 0,
      recurring_date: null,
    })
  })

  it("rejects invalid expenses without saving them", async () => {
    expect(await database.addExpense("", 100, false, "")).toBe(false)
    expect(await database.addExpense("Rent", -1, false, "")).toBe(false)
    expect(await database.addExpense("Rent", 100, true, "32")).toBe(false)
    expect(await allRows("expenses")).toHaveLength(0)
    expect(alertSpy).toHaveBeenCalledTimes(3)
  })

  it("totals income, expenses and balance", async () => {
    await database.addIncome("Salary", 300000, false, "")
    await database.addExpense("Rent", 120000, false, "")
    await database.addExpense("Food", 30000, false, "")
    expect(await database.getTotalIncome()).toBe(300000)
    expect(await database.getTotalExpenses()).toBe(150000)
    expect(await database.getBalance()).toBe(150000)
  })
})

describe("planned purchases", () => {
  it("records a bought purchase as an expense, only once", async () => {
    await database.addPlannedPurchase("Headphones", 45000)
    const [purchase] = (await database.getPlannedPurchases()) as any[]

    expect(
      await database.markPurchaseAsBought(purchase.id, 45000, "Headphones")
    ).toBe(true)
    expect(
      await database.markPurchaseAsBought(purchase.id, 45000, "Headphones")
    ).toBe(false)

    const expenses = await allRows("expenses")
    expect(expenses).toHaveLength(1)
    expect(expenses[0]).toMatchObject({
      item: "Headphones",
      amount: 45000,
      date: "2026-11-26",
    })
  })
})

describe("getMonthlyExpenses", () => {
  it("only counts the current month", async () => {
    await insertExpense("Last month", 1000, "2026-10-31")
    await insertExpense("This month", 2000, "2026-11-01")
    await insertExpense("Today", 500, "2026-11-26")
    await insertExpense("Last year", 9000, "2025-11-15")
    // Entries saved before dates were stored as local YYYY-MM-DD
    await insertExpense("Old format", 250, "2026-11-10T08:00:00.000Z")

    expect(await database.getMonthlyExpenses()).toBe(2750)
    expect(await database.getMonthlyExpenses(new Date(2026, 9, 5))).toBe(1000)
  })
})

describe("checkBudgetThreshold", () => {
  const setThreshold = (value: string) =>
    require("expo-secure-store").__store.set("budget_threshold", value)

  it("does nothing when no budget is set", async () => {
    await insertExpense("Rent", 100000, "2026-11-02")
    await database.checkBudgetThreshold()
    expect(sendBudgetAlert).not.toHaveBeenCalled()
  })

  it("does not alert below the threshold", async () => {
    setThreshold("50000")
    await insertExpense("Food", 49999, "2026-11-02")
    await database.checkBudgetThreshold()
    expect(sendBudgetAlert).not.toHaveBeenCalled()
  })

  it("ignores spending from previous months", async () => {
    setThreshold("50000")
    await insertExpense("Old rent", 200000, "2026-10-02")
    await insertExpense("Food", 10000, "2026-11-02")
    await database.checkBudgetThreshold()
    expect(sendBudgetAlert).not.toHaveBeenCalled()
  })

  it("alerts once per month when the threshold is reached", async () => {
    setThreshold("50000")
    await insertExpense("Rent", 50000, "2026-11-02")
    await database.checkBudgetThreshold()
    await insertExpense("Food", 5000, "2026-11-20")
    await database.checkBudgetThreshold()

    expect(sendBudgetAlert).toHaveBeenCalledTimes(1)
    expect(sendBudgetAlert.mock.calls[0][1]).toContain("50,000 NGN this month")

    // A new month can alert again
    setToday(new Date(2026, 11, 3, 12))
    await insertExpense("December rent", 60000, "2026-12-02")
    await database.checkBudgetThreshold()
    expect(sendBudgetAlert).toHaveBeenCalledTimes(2)
  })

  it("alerts again this month once the alert flag is cleared", async () => {
    setThreshold("50000")
    await insertExpense("Rent", 80000, "2026-11-02")
    await database.checkBudgetThreshold()

    // What the settings screen does when the threshold changes
    setThreshold("70000")
    require("expo-secure-store").__store.delete(
      database.BUDGET_ALERT_MONTH_KEY
    )
    await database.checkBudgetThreshold()
    expect(sendBudgetAlert).toHaveBeenCalledTimes(2)
  })
})

describe("recurring transactions", () => {
  it("adds a due recurring expense once per day", async () => {
    setToday(new Date(2026, 9, 26, 9)) // set up on 26 Oct
    await database.addExpense("Netflix", 4500, true, "26")

    setToday(new Date(2026, 10, 26, 9)) // due again on 26 Nov
    await database.handleRecurringUpdates()
    await database.handleRecurringUpdates()

    const expenses = await allRows("expenses")
    expect(expenses).toHaveLength(2)
    expect(expenses[1]).toMatchObject({
      item: "Netflix",
      date: "2026-11-26",
      is_recurring: 0,
    })
  })

  it("does not duplicate an entry added on its own due day", async () => {
    await database.addIncome("Salary", 300000, true, "26")
    await database.handleRecurringUpdates()
    expect(await allRows("income")).toHaveLength(1)
  })

  it("catches up on due dates missed while the app was closed", async () => {
    setToday(new Date(2026, 7, 10, 9)) // set up on 10 Aug, due on the 26th
    await database.addIncome("Salary", 300000, true, "26")

    setToday(new Date(2026, 10, 30, 9)) // first opened again on 30 Nov
    await database.handleRecurringUpdates()
    await database.handleRecurringUpdates()

    const dates = (await allRows("income")).map((row) => row.date)
    expect(dates).toEqual([
      "2026-08-10",
      "2026-08-26",
      "2026-09-26",
      "2026-10-26",
      "2026-11-26",
    ])
  })

  it("does not add the next occurrence before its due day", async () => {
    setToday(new Date(2026, 9, 26, 9))
    await database.addExpense("Rent", 150000, true, "28")
    await database.handleRecurringUpdates()
    expect((await allRows("expenses")).map((row) => row.date)).toEqual([
      "2026-10-26",
    ])
  })

  it("uses the last day of shorter months for days 29-31", async () => {
    setToday(new Date(2026, 9, 15, 9))
    await database.addExpense("Rent", 150000, true, "31")

    setToday(new Date(2027, 2, 1, 9)) // 1 Mar 2027
    await database.handleRecurringUpdates()

    const dates = (await allRows("expenses")).map((row) => row.date)
    expect(dates).toEqual([
      "2026-10-15",
      "2026-10-31",
      "2026-11-30",
      "2026-12-31",
      "2027-01-31",
      "2027-02-28",
    ])
  })

  it("does not bring back an occurrence that was deleted", async () => {
    setToday(new Date(2026, 9, 1, 9))
    await database.addExpense("Gym", 15000, true, "5")
    setToday(new Date(2026, 9, 5, 9))
    await database.handleRecurringUpdates()

    const occurrence = (await allRows("expenses"))[1]
    expect(occurrence.date).toBe("2026-10-05")
    await database.deleteExpense(occurrence.id)

    setToday(new Date(2026, 9, 20, 9))
    await database.handleRecurringUpdates()
    expect(await allRows("expenses")).toHaveLength(1)
  })

  it("continues after the latest recorded occurrence for existing entries", async () => {
    // Data from before progress was tracked: an occurrence already recorded
    // on 26 Oct, but nothing for September
    const db = await database.getDatabase()
    await db.runAsync(
      "INSERT INTO income (source, amount, date, is_recurring, recurring_date) VALUES ('Salary', 300000, '2026-08-01', 1, '26')"
    )
    await db.runAsync(
      "INSERT INTO income (source, amount, date) VALUES ('Salary', 300000, '2026-10-26')"
    )

    setToday(new Date(2026, 10, 26, 9))
    await database.handleRecurringUpdates()

    const dates = (await allRows("income")).map((row) => row.date)
    expect(dates).toEqual(["2026-08-01", "2026-10-26", "2026-11-26"])
  })

  it("stops recurring by id", async () => {
    setToday(new Date(2026, 9, 26, 9))
    await database.addExpense("Gym", 15000, true, "26")
    const [gym] = await allRows("expenses")

    expect(await database.stopRecurring("expenses", gym.id)).toBe(true)
    setToday(new Date(2026, 10, 26, 9))
    await database.handleRecurringUpdates()

    const expenses = await allRows("expenses")
    expect(expenses).toHaveLength(1)
    expect(expenses[0]).toMatchObject({ is_recurring: 0, recurring_date: null })
  })

  it("stops recurring by name and day, leaving other entries alone", async () => {
    setToday(new Date(2026, 9, 26, 9))
    await database.addIncome("Salary", 300000, true, "26")
    await database.addIncome("Rental income", 50000, true, "26")

    expect(await database.stopRecurringByName("income", "Salary", "26")).toBe(
      true
    )
    setToday(new Date(2026, 10, 26, 9))
    await database.handleRecurringUpdates()

    const sources = (await allRows("income")).map((row) => row.source)
    expect(sources).toEqual(["Salary", "Rental income", "Rental income"])
  })
})

describe("getNextDueDate", () => {
  const at = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h)

  it("returns this month's due date when it hasn't passed", () => {
    expect(database.getNextDueDate(28, at(2026, 11, 26))).toEqual(
      at(2026, 11, 28, 7)
    )
  })

  it("moves to next month once the due time has passed", () => {
    expect(database.getNextDueDate(26, at(2026, 11, 26))).toEqual(
      at(2026, 12, 26, 7)
    )
  })

  it("uses the last day of shorter months instead of rolling over", () => {
    expect(database.getNextDueDate(31, at(2026, 11, 2))).toEqual(
      at(2026, 11, 30, 7)
    )
    expect(database.getNextDueDate(31, at(2027, 1, 31, 8))).toEqual(
      at(2027, 2, 28, 7)
    )
  })
})
