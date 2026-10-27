import React, { createContext } from "react"
import { useBudget } from "./BudgetContext"

interface Transaction {
  amount: number
  date: string
}

interface TransactionsContextType {
  transactions: Transaction[]
}

export const TransactionsContext = createContext<
  TransactionsContextType | undefined
>(undefined)

export const TransactionsProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  // Derive from BudgetContext so stats stay in sync whenever expenses change
  const { expenseList } = useBudget()
  const transactions = expenseList as Transaction[]

  return (
    <TransactionsContext.Provider value={{ transactions }}>
      {children}
    </TransactionsContext.Provider>
  )
}
