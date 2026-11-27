import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react"
import {
  getTotalIncome,
  getTotalExpenses,
  getBalance,
  getIncome,
  getExpenses,
  getPlannedPurchases,
  addIncome,
  addExpense,
  addPlannedPurchase,
  markPurchaseAsBought,
  changePurchaseAmount,
  deletePurchase,
  deleteIncome,
  deleteExpense,
  handleRecurringUpdates,
  checkBudgetThreshold,
  getCategories,
  getMonthlyExpensesByCategory,
  addCategory,
  renameCategory,
  deleteCategory,
  // setExpenseCategory, (see changeExpenseCategory below)
  updateIncome,
  updateExpense,
  EditScope,
  Category,
  CategoryTotal,
  getMonthlyIncome,
  getMonthlyExpenses,
  BUDGET_THRESHOLD_KEY,
} from "../services/database"
import { SecureStorageService } from "../services/SecureStorageService"

interface BudgetContextType {
  totalIncome: number
  totalExpenses: number
  balance: number
  incomeList: any[]
  expenseList: any[]
  plannedPurchases: any[]
  categories: Category[]
  // This month's spending per category, largest first
  categoryTotals: CategoryTotal[]
  // Current month's totals and the monthly budget (null when not set)
  monthlyIncome: number
  monthlyExpenses: number
  monthlyBudget: number | null
  isLoading: boolean
  error: string | null
  refreshData: () => Promise<void>
  addNewIncome: (
    source: string,
    amount: number,
    isRecurring: boolean,
    recurringDate: string
  ) => Promise<boolean>
  addNewExpense: (
    item: string,
    amount: number,
    isRecurring: boolean,
    recurringDate: string,
    categoryId?: number | null
  ) => Promise<boolean>
  addNewPlannedPurchase: (
    item: string,
    amount: number,
    dueDate?: string
  ) => Promise<boolean>
  markAsBought: (id: number, amount: number, item: string) => Promise<boolean>
  editPlannedPurchaseAmount: (id: number, amount: number, newAmount: number, item: string) => Promise<boolean>
  deletePlannedPurchase: (id: number) => Promise<boolean>
  deleteSelectedIncome: (id: number) => Promise<boolean>
  deleteSelectedExpense: (id: number) => Promise<boolean>
  addNewCategory: (name: string) => Promise<boolean>
  renameExistingCategory: (id: number, name: string) => Promise<boolean>
  removeCategory: (id: number) => Promise<boolean>
  // Unused since expenses are edited with editExpense, which also sets the
  // category
  // changeExpenseCategory: (
  //   expenseId: number,
  //   categoryId: number | null
  // ) => Promise<boolean>
  editIncome: (
    id: number,
    source: string,
    amount: number,
    scope?: EditScope
  ) => Promise<boolean>
  editExpense: (
    id: number,
    item: string,
    amount: number,
    categoryId: number | null,
    scope?: EditScope
  ) => Promise<boolean>
}

const BudgetContext = createContext<BudgetContextType | undefined>(undefined)

export const BudgetProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [totalIncome, setTotalIncome] = useState(0)
  const [totalExpenses, setTotalExpenses] = useState(0)
  const [balance, setBalance] = useState(0)
  const [incomeList, setIncomeList] = useState<any[]>([])
  const [expenseList, setExpenseList] = useState<any[]>([])
  const [plannedPurchases, setPlannedPurchases] = useState<any[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [categoryTotals, setCategoryTotals] = useState<CategoryTotal[]>([])
  const [monthlyIncome, setMonthlyIncome] = useState(0)
  const [monthlyExpenses, setMonthlyExpenses] = useState(0)
  const [monthlyBudget, setMonthlyBudget] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      // isLoading starts true and only covers the first load; later refreshes
      // keep the current screen visible instead of replacing it with a spinner
      setError(null)

      // Fetch all data in parallel
      const [
        income,
        expenses,
        planned,
        incomeTotal,
        expensesTotal,
        currentBalance,
        categoryList,
        monthlyCategoryTotals,
        incomeThisMonth,
        expensesThisMonth,
        budgetSetting,
      ] = await Promise.all([
        getIncome(),
        getExpenses(),
        getPlannedPurchases(),
        getTotalIncome(),
        getTotalExpenses(),
        getBalance(),
        getCategories(),
        getMonthlyExpensesByCategory(),
        getMonthlyIncome(),
        getMonthlyExpenses(),
        SecureStorageService.getInstance().getSecureItem(BUDGET_THRESHOLD_KEY),
      ])

      setIncomeList(income)
      setExpenseList(expenses)
      setPlannedPurchases(planned)
      setTotalIncome(incomeTotal)
      setTotalExpenses(expensesTotal)
      setBalance(currentBalance)
      setCategories(categoryList)
      setCategoryTotals(monthlyCategoryTotals)
      setMonthlyIncome(incomeThisMonth)
      setMonthlyExpenses(expensesThisMonth)
      const budget = parseFloat(budgetSetting ?? "")
      setMonthlyBudget(!isNaN(budget) && budget > 0 ? budget : null)

      // Runs after every data change, so it covers manual, bought and recurring expenses
      await checkBudgetThreshold()
    } catch (err) {
      setError("Failed to fetch data. Please try again.")
      console.error("Error fetching data:", err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Initial data fetch
  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Set up recurring updates check
  useEffect(() => {
    const checkRecurringUpdates = async () => {
      await handleRecurringUpdates()
      await fetchData()
    }

    // Check once on mount, then every hour
    checkRecurringUpdates()
    const interval = setInterval(checkRecurringUpdates, 60 * 60 * 1000)
    return () => clearInterval(interval)
  }, [fetchData])

  const addNewIncome = async (
    source: string,
    amount: number,
    isRecurring: boolean,
    recurringDate: string
  ): Promise<boolean> => {
    const success = await addIncome(source, amount, isRecurring, recurringDate)
    if (success) {
      await fetchData()
    }
    return success
  }

  const addNewExpense = async (
    item: string,
    amount: number,
    isRecurring: boolean,
    recurringDate: string,
    categoryId: number | null = null
  ): Promise<boolean> => {
    const success = await addExpense(
      item,
      amount,
      isRecurring,
      recurringDate,
      categoryId
    )
    if (success) {
      await fetchData()
    }
    return success
  }

  const addNewPlannedPurchase = async (
    item: string,
    amount: number,
    dueDate?: string
  ): Promise<boolean> => {
    const success = await addPlannedPurchase(item, amount, dueDate)
    if (success) {
      await fetchData()
    }
    return success
  }

  const markAsBought = async (
    id: number,
    amount: number,
    item: string
  ): Promise<boolean> => {
    const success = await markPurchaseAsBought(id, amount, item)
    if (success) {
      await fetchData()
    }
    return success
  }

  const editPlannedPurchaseAmount = async (
    id: number,
    amount: number,
    newAmount: number,
    item: string
  ): Promise<boolean> => {
    const success = await changePurchaseAmount(id, amount, newAmount, item)
    if (success) {
      await fetchData()
    }
    return success
  }

  const deletePlannedPurchase = async (id: number): Promise<boolean> => {
    const success = await deletePurchase(id)
    if (success) {
      await fetchData()
    } else {
      setError("Failed to delete planned purchase")
    }
    return success
  }

  const deleteSelectedIncome = async (id: number): Promise<boolean> => {
    const success = await deleteIncome(id)
    if (success) {
      await fetchData()
    } else {
      setError("Failed to delete income")
    }
    return success
  }

  const deleteSelectedExpense = async (id: number): Promise<boolean> => {
    const success = await deleteExpense(id)
    if (success) {
      await fetchData()
    } else {
      setError("Failed to delete expense")
    }
    return success
  }

  // Run a database change and refresh everything if it succeeded
  const refreshAfter = async (change: Promise<boolean>) => {
    const success = await change
    if (success) {
      await fetchData()
    }
    return success
  }

  const addNewCategory = (name: string) => refreshAfter(addCategory(name))
  const renameExistingCategory = (id: number, name: string) =>
    refreshAfter(renameCategory(id, name))
  const removeCategory = (id: number) => refreshAfter(deleteCategory(id))
  // Unused since expenses are edited with editExpense
  // const changeExpenseCategory = (expenseId: number, categoryId: number | null) =>
  //   refreshAfter(setExpenseCategory(expenseId, categoryId))
  const editIncome = (
    id: number,
    source: string,
    amount: number,
    scope?: EditScope
  ) => refreshAfter(updateIncome(id, source, amount, scope))
  const editExpense = (
    id: number,
    item: string,
    amount: number,
    categoryId: number | null,
    scope?: EditScope
  ) => refreshAfter(updateExpense(id, item, amount, categoryId, scope))

  return (
    <BudgetContext.Provider
      value={{
        totalIncome,
        totalExpenses,
        balance,
        incomeList,
        expenseList,
        plannedPurchases,
        categories,
        categoryTotals,
        monthlyIncome,
        monthlyExpenses,
        monthlyBudget,
        isLoading,
        error,
        refreshData: fetchData,
        addNewIncome,
        addNewExpense,
        addNewPlannedPurchase,
        markAsBought,
        editPlannedPurchaseAmount,
        deletePlannedPurchase,
        deleteSelectedIncome,
        deleteSelectedExpense,
        addNewCategory,
        renameExistingCategory,
        removeCategory,
        // changeExpenseCategory,
        editIncome,
        editExpense,
      }}>
      {children}
    </BudgetContext.Provider>
  )
}

export const useBudget = () => {
  const context = useContext(BudgetContext)
  if (context === undefined) {
    throw new Error("useBudget must be used within a BudgetProvider")
  }
  return context
}
