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

jest.mock("../services/NotificationService", () => {
  const sendBudgetAlert = jest.fn(async () => {})
  return {
    NotificationService: { getInstance: () => ({ sendBudgetAlert }) },
  }
})

type Database = typeof import("../services/database")

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
  database = require("../services/database")
  sendBudgetAlert = require("../services/NotificationService")
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

describe("getMonthlyIncome", () => {
  it("only counts the current month", async () => {
    const db = await database.getDatabase()
    for (const [source, amount, date] of [
      ["October salary", 300000, "2026-10-25"],
      ["Salary", 300000, "2026-11-25"],
      ["Side gig", 45000, "2026-11-02"],
    ] as const) {
      await db.runAsync(
        "INSERT INTO income (source, amount, date) VALUES (?, ?, ?)",
        [source, amount, date]
      )
    }
    expect(await database.getMonthlyIncome()).toBe(345000)
    expect(await database.getMonthlyIncome(new Date(2026, 9, 1))).toBe(300000)
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

describe("expense categories", () => {
  const categoryId = async (name: string) =>
    (await database.getCategories()).find((c) => c.name === name)!.id

  it("starts with the default categories", async () => {
    const names = (await database.getCategories()).map((c) => c.name)
    expect(names.sort()).toEqual([...database.DEFAULT_CATEGORIES].sort())
  })

  it("does not bring back removed defaults on the next start", async () => {
    await database.deleteCategory(await categoryId("Health"))

    // Restart the module against the same database
    const db = await database.getDatabase()
    jest.resetModules()
    require("expo-sqlite").openDatabaseAsync.mockResolvedValueOnce(db)
    const restarted: Database = require("../services/database")
    await restarted.initializeDatabase()

    const names = (await restarted.getCategories()).map((c) => c.name)
    expect(names).not.toContain("Health")
    expect(names).toHaveLength(database.DEFAULT_CATEGORIES.length - 1)
  })

  it("adds and renames categories, rejecting duplicates", async () => {
    expect(await database.addCategory("  Church ")).toBe(true)
    expect(await database.addCategory("church")).toBe(false)
    expect(await database.addCategory("Uncategorized")).toBe(false)
    expect(await database.addCategory("   ")).toBe(false)

    const church = await categoryId("Church")
    expect(await database.renameCategory(church, "Transport")).toBe(false)
    expect(await database.renameCategory(church, "Tithe & Offering")).toBe(true)
    // Renaming to a different case of its own name is allowed
    const tithe = await categoryId("Tithe & Offering")
    expect(await database.renameCategory(tithe, "tithe & offering")).toBe(true)
    expect(alertSpy).toHaveBeenCalledTimes(4)
  })

  it("saves the category with an expense and shows its name", async () => {
    const transport = await categoryId("Transport")
    await database.addExpense("Bolt ride", 3500, false, "", transport)
    await database.addExpense("Snacks", 1200, false, "")

    const expenses = await database.getExpenses()
    expect(expenses).toEqual([
      expect.objectContaining({ item: "Snacks", category_name: null }),
      expect.objectContaining({
        item: "Bolt ride",
        category_id: transport,
        category_name: "Transport",
      }),
    ])
  })

  it("changes an expense's category and makes it Uncategorized", async () => {
    await database.addExpense("Bolt ride", 3500, false, "")
    const [expense] = await allRows("expenses")

    await database.setExpenseCategory(expense.id, await categoryId("Transport"))
    expect((await allRows("expenses"))[0].category_id).toBe(
      await categoryId("Transport")
    )

    await database.setExpenseCategory(expense.id, null)
    expect((await allRows("expenses"))[0].category_id).toBeNull()
  })

  it("makes a removed category's expenses Uncategorized", async () => {
    const food = await categoryId("Food & Groceries")
    await database.addExpense("Market", 20000, false, "", food)
    await database.deleteCategory(food)

    expect((await allRows("expenses"))[0].category_id).toBeNull()
    expect((await database.getCategories()).map((c) => c.id)).not.toContain(
      food
    )
  })

  it("keeps the category on recurring occurrences", async () => {
    const bills = await categoryId("Utilities & Bills")
    setToday(new Date(2026, 9, 10, 9))
    await database.addExpense("Electricity", 25000, true, "15", bills)

    setToday(new Date(2026, 9, 15, 9))
    await database.handleRecurringUpdates()

    const expenses = await allRows("expenses")
    expect(expenses).toHaveLength(2)
    expect(expenses[1]).toMatchObject({ date: "2026-10-15", category_id: bills })
  })

  it("totals this month's spending by category, largest first", async () => {
    const food = await categoryId("Food & Groceries")
    const transport = await categoryId("Transport")
    await insertExpense("Last month", 99000, "2026-10-20")
    await database.addExpense("Market", 20000, false, "", food)
    await database.addExpense("Restaurant", 15000, false, "", food)
    await database.addExpense("Bolt", 5000, false, "", transport)
    await database.addExpense("Misc", 8000, false, "")

    expect(await database.getMonthlyExpensesByCategory()).toEqual([
      { categoryId: food, name: "Food & Groceries", total: 35000 },
      { categoryId: null, name: "Uncategorized", total: 8000 },
      { categoryId: transport, name: "Transport", total: 5000 },
    ])
  })
})

describe("editing entries", () => {
  it("changes an expense's name, amount and category but not its date", async () => {
    await insertExpense("Grocries", 5000, "2026-11-20")
    const [before] = await allRows("expenses")
    const food = (await database.getCategories()).find(
      (c) => c.name === "Food & Groceries"
    )!.id

    expect(await database.updateExpense(before.id, " Groceries ", 5500, food)).toBe(
      true
    )
    const [after] = (await database.getExpenses()) as any[]
    expect(after).toMatchObject({
      item: "Groceries",
      amount: 5500,
      date: "2026-11-20",
      category_name: "Food & Groceries",
    })

    expect(await database.updateExpense(before.id, "Groceries", 5500, null)).toBe(
      true
    )
    expect((await allRows("expenses"))[0].category_id).toBeNull()
  })

  it("changes an income entry's source and amount", async () => {
    await database.addIncome("Salry", 300000, false, "")
    const [income] = await allRows("income")
    expect(await database.updateIncome(income.id, "Salary", 320000)).toBe(true)
    expect((await allRows("income"))[0]).toMatchObject({
      source: "Salary",
      amount: 320000,
    })
  })

  it("rejects invalid edits without changing the entry", async () => {
    await database.addIncome("Salary", 300000, false, "")
    const [income] = await allRows("income")
    expect(await database.updateIncome(income.id, "  ", 1000)).toBe(false)
    expect(await database.updateIncome(income.id, "Salary", -5)).toBe(false)
    expect(await database.updateIncome(income.id, "Salary", NaN)).toBe(false)
    expect((await allRows("income"))[0]).toMatchObject({
      source: "Salary",
      amount: 300000,
    })
    expect(alertSpy).toHaveBeenCalledTimes(3)
  })

  // Gym set up on 5 Sep (₦15,000), then processed for 5 Oct
  const setUpGym = async () => {
    setToday(new Date(2026, 8, 5, 9))
    await database.addExpense("Gym", 15000, true, "5")
    setToday(new Date(2026, 9, 5, 9))
    await database.handleRecurringUpdates()
    return (await allRows("expenses"))[0]
  }

  const expenseRows = async () =>
    (await allRows("expenses")).map((row) => [row.item, row.amount, row.date])

  it("changes only later months when a repeating expense is edited for future months", async () => {
    const gym = await setUpGym()
    const transport = (await database.getCategories()).find(
      (c) => c.name === "Transport"
    )!.id
    await database.updateExpense(gym.id, "Gym membership", 18000, transport, "future")

    // September, the month the entry was added in, keeps its amount
    expect(await database.getMonthlyExpenses(new Date(2026, 8, 1))).toBe(15000)

    setToday(new Date(2026, 10, 5, 9))
    await database.handleRecurringUpdates()
    expect(await expenseRows()).toEqual([
      ["Gym", 15000, "2026-09-05"],
      ["Gym", 15000, "2026-10-05"],
      ["Gym membership", 18000, "2026-11-05"],
    ])
    const november = (await allRows("expenses"))[2]
    expect(november.category_id).toBe(transport)
  })

  it("changes the entry and later months when edited as a whole", async () => {
    const gym = await setUpGym()
    await database.updateExpense(gym.id, "Gym", 15000, null, "future")
    // Matching the entry again clears the future-only values
    expect((await allRows("expenses"))[0].next_amount).toBeNull()

    await database.updateExpense(gym.id, "Gym", 16000, null, "future")
    await database.updateExpense(gym.id, "Gym (typo fixed)", 15500, null)

    setToday(new Date(2026, 10, 5, 9))
    await database.handleRecurringUpdates()
    expect(await expenseRows()).toEqual([
      ["Gym (typo fixed)", 15500, "2026-09-05"],
      ["Gym", 15000, "2026-10-05"],
      ["Gym (typo fixed)", 15500, "2026-11-05"],
    ])
  })

  it("stops a repeating income by its future-months name", async () => {
    setToday(new Date(2026, 8, 25, 9))
    await database.addIncome("Salary", 300000, true, "25")
    const [salary] = await allRows("income")
    await database.updateIncome(salary.id, "Salary (new job)", 350000, "future")

    // The reminder shows the future name, so that's what its action sends
    expect(await database.stopRecurringByName("income", "Salary", "25")).toBe(true)
    expect((await allRows("income"))[0].is_recurring).toBe(1)
    await database.stopRecurringByName("income", "Salary (new job)", "25")
    expect((await allRows("income"))[0]).toMatchObject({
      source: "Salary",
      amount: 300000,
      is_recurring: 0,
      next_amount: null,
    })
  })

  it("clears a removed category from future-month values", async () => {
    const gym = await setUpGym()
    const health = (await database.getCategories()).find(
      (c) => c.name === "Health"
    )!.id
    await database.updateExpense(gym.id, "Gym", 18000, health, "future")
    await database.deleteCategory(health)
    expect((await allRows("expenses"))[0].next_category_id).toBeNull()
  })
})

describe("back-dating entries", () => {
  it("stores the chosen date and rejects future or invalid ones", async () => {
    expect(
      await database.addExpense("Fuel", 20000, false, "", null, "2026-10-03")
    ).toBe(true)
    expect(await database.addIncome("Gift", 5000, false, "", "2026-11-26")).toBe(
      true
    )
    expect(
      await database.addExpense("Later", 100, false, "", null, "2026-11-27")
    ).toBe(false)
    expect(
      await database.addExpense("Typo", 100, false, "", null, "2026-02-30")
    ).toBe(false)

    expect((await allRows("expenses")).map((row) => row.date)).toEqual([
      "2026-10-03",
    ])
    expect((await allRows("income"))[0].date).toBe("2026-11-26")
    expect(alertSpy).toHaveBeenCalledTimes(2)
  })

  it("fills in the months since a back-dated repeating entry", async () => {
    await database.addExpense("Rent", 100000, true, "1", null, "2026-09-01")
    await database.handleRecurringUpdates()
    expect((await allRows("expenses")).map((row) => row.date)).toEqual([
      "2026-09-01",
      "2026-10-01",
      "2026-11-01",
    ])
  })

  it("moves an entry's date when edited, but not for future months", async () => {
    await database.addIncome("Bonus", 50000, false, "")
    const [bonus] = await allRows("income")
    await database.updateIncome(bonus.id, "Bonus", 50000, "entry", "2026-11-02")
    expect((await allRows("income"))[0].date).toBe("2026-11-02")

    setToday(new Date(2026, 9, 26, 9))
    await database.addExpense("Gym", 15000, true, "26")
    setToday(new Date(2026, 10, 26, 12))
    const [gym] = await allRows("expenses")
    await database.updateExpense(gym.id, "Gym", 18000, null, "future", "2026-01-01")
    expect((await allRows("expenses"))[0].date).toBe("2026-10-26")
  })
})

describe("backups", () => {
  const storeItem = (key: string) =>
    require("expo-secure-store").__store.get(key) ?? null

  // A spread of data touching every table
  const fillSampleData = async () => {
    await database.addCategory("Church")
    const church = (await database.getCategories()).find(
      (c) => c.name === "Church"
    )!.id
    await database.addIncome("Salary", 300000, true, "25", "2026-10-25")
    await database.addExpense("Tithe", 30000, false, "", church, "2026-11-02")
    await database.addExpense("Gym", 15000, true, "5", null, "2026-11-05")
    const [, gym] = await allRows("expenses")
    await database.updateExpense(gym.id, "Gym", 18000, null, "future")
    await database.addPlannedPurchase("Laptop", 900000, "2027-01-15")
    await require("expo-secure-store").setItemAsync(
      database.BUDGET_THRESHOLD_KEY,
      "250000"
    )
  }

  const snapshot = async () => ({
    income: await allRows("income"),
    expenses: await database.getExpenses(),
    planned: await database.getPlannedPurchases(),
    categories: await database.getCategories(),
  })

  it("restores exactly what was exported, replacing what's there", async () => {
    await fillSampleData()
    const before = await snapshot()
    // Through JSON, as it goes through the backup file
    const backup = JSON.parse(JSON.stringify(await database.exportData()))

    // Change everything after the backup
    await database.clearAllData()
    await database.addExpense("Not in the backup", 1, false, "")
    await database.deleteCategory(before.categories[0].id)
    await require("expo-secure-store").deleteItemAsync(
      database.BUDGET_THRESHOLD_KEY
    )
    await require("expo-secure-store").setItemAsync(
      database.BUDGET_ALERT_MONTH_KEY,
      "2026-11"
    )

    expect(await database.restoreData(backup)).toBeNull()
    expect(await snapshot()).toEqual(before)
    expect(storeItem(database.BUDGET_THRESHOLD_KEY)).toBe("250000")
    // The budget alert can fire again for the restored data
    expect(storeItem(database.BUDGET_ALERT_MONTH_KEY)).toBeNull()

    // Ids continue after the restored ones
    await database.addExpense("New", 1, false, "")
    const ids = (await allRows("expenses")).map((row) => row.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it("rejects files that aren't usable backups, changing nothing", async () => {
    await fillSampleData()
    const before = await snapshot()
    const good = await database.exportData()

    const bad: unknown[] = [
      null,
      { hello: "world" },
      { ...good, version: database.BACKUP_VERSION + 1 },
      { ...good, tables: undefined },
      { ...good, tables: { ...good.tables, income: "nope" } },
      { ...good, tables: { ...good.tables, expenses: [{ item: "No id" }] } },
      {
        ...good,
        tables: { ...good.tables, expenses: [{ id: 1, item: { nested: 1 } }] },
      },
    ]
    for (const data of bad) {
      expect(await database.restoreData(data)).toEqual(expect.any(String))
    }
    expect(await snapshot()).toEqual(before)
  })

  it("rolls back a restore that fails part way", async () => {
    await fillSampleData()
    const before = await snapshot()
    const backup = await database.exportData()
    // Valid shape, but income needs an amount, so the insert fails
    backup.tables.income = [{ id: 1, source: "Broken", date: "2026-11-01" }]

    expect(await database.restoreData(backup)).toMatch(/left as it was/)
    expect(await snapshot()).toEqual(before)
  })

  it("restores backups from older versions with fewer columns", async () => {
    const old = {
      format: database.BACKUP_FORMAT,
      version: 1,
      exportedAt: "2026-06-01T10:00:00.000Z",
      settings: { monthlyBudget: null },
      tables: {
        categories: [{ id: 1, name: "Food" }],
        income: [
          {
            id: 1,
            source: "Salary",
            amount: 250000,
            date: "2026-05-25",
            is_recurring: 0,
            recurring_date: null,
          },
        ],
        // No category_id, last_processed or next_* columns yet
        expenses: [
          {
            id: 1,
            item: "Bread",
            amount: 1200,
            date: "2026-05-26",
            is_recurring: 0,
            recurring_date: null,
          },
        ],
        planned_purchases: [],
        // No savings table in the file at all
      },
    }

    expect(await database.restoreData(old)).toBeNull()
    expect((await database.getCategories()).map((c) => c.name)).toEqual(["Food"])
    expect(await database.getExpenses()).toEqual([
      expect.objectContaining({
        item: "Bread",
        category_id: null,
        category_name: null,
        next_amount: null,
      }),
    ])
    expect(await database.getTotalIncome()).toBe(250000)
  })
})
