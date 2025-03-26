import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
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
  deletePurchase,
  handleRecurringUpdates
} from '../database';

interface BudgetContextType {
  totalIncome: number;
  totalExpenses: number;
  balance: number;
  incomeList: any[];
  expenseList: any[];
  plannedPurchases: any[];
  isLoading: boolean;
  error: string | null;
  refreshData: () => Promise<void>;
  addNewIncome: (source: string, amount: number, isRecurring: boolean, recurringDate: string) => Promise<boolean>;
  addNewExpense: (item: string, amount: number, isRecurring: boolean, recurringDate: string) => Promise<boolean>;
  addNewPlannedPurchase: (item: string, amount: number) => Promise<boolean>;
  markAsBought: (id: number, amount: number, item: string) => Promise<boolean>;
  deletePlannedPurchase: (id: number) => Promise<boolean>;
}

const BudgetContext = createContext<BudgetContextType | undefined>(undefined);

export const BudgetProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [balance, setBalance] = useState(0);
  const [incomeList, setIncomeList] = useState<any[]>([]);
  const [expenseList, setExpenseList] = useState<any[]>([]);
  const [plannedPurchases, setPlannedPurchases] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch all data in parallel
      const [
        income,
        expenses,
        planned,
        incomeTotal,
        expensesTotal,
        currentBalance
      ] = await Promise.all([
        getIncome(),
        getExpenses(),
        getPlannedPurchases(),
        getTotalIncome(),
        getTotalExpenses(),
        getBalance()
      ]);

      setIncomeList(income);
      setExpenseList(expenses);
      setPlannedPurchases(planned);
      setTotalIncome(incomeTotal);
      setTotalExpenses(expensesTotal);
      setBalance(currentBalance);
    } catch (err) {
      setError('Failed to fetch data. Please try again.');
      console.error('Error fetching data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial data fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Set up recurring updates check
  useEffect(() => {
    const checkRecurringUpdates = async () => {
      await handleRecurringUpdates();
      await fetchData();
    };

    // Check for recurring updates every hour
    const interval = setInterval(checkRecurringUpdates, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const addNewIncome = async (
    source: string,
    amount: number,
    isRecurring: boolean,
    recurringDate: string
  ): Promise<boolean> => {
    const success = await addIncome(source, amount, isRecurring, recurringDate);
    if (success) {
      await fetchData();
    }
    return success;
  };

  const addNewExpense = async (
    item: string,
    amount: number,
    isRecurring: boolean,
    recurringDate: string
  ): Promise<boolean> => {
    const success = await addExpense(item, amount, isRecurring, recurringDate);
    if (success) {
      await fetchData();
    }
    return success;
  };

  const addNewPlannedPurchase = async (item: string, amount: number): Promise<boolean> => {
    const success = await addPlannedPurchase(item, amount);
    if (success) {
      await fetchData();
    }
    return success;
  };

  const markAsBought = async (id: number, amount: number, item: string): Promise<boolean> => {
    const success = await markPurchaseAsBought(id, amount, item);
    if (success) {
      await fetchData();
    }
    return success;
  };

  const deletePlannedPurchase = async (id: number): Promise<boolean> => {
    const success = await deletePurchase(id);
    if (success) {
      await fetchData();
    }
    return success;
  };

  return (
    <BudgetContext.Provider
      value={{
        totalIncome,
        totalExpenses,
        balance,
        incomeList,
        expenseList,
        plannedPurchases,
        isLoading,
        error,
        refreshData: fetchData,
        addNewIncome,
        addNewExpense,
        addNewPlannedPurchase,
        markAsBought,
        deletePlannedPurchase
      }}
    >
      {children}
    </BudgetContext.Provider>
  );
};

export const useBudget = () => {
  const context = useContext(BudgetContext);
  if (context === undefined) {
    throw new Error('useBudget must be used within a BudgetProvider');
  }
  return context;
}; 