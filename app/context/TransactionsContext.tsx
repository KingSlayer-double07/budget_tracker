import React, { createContext, useState, useEffect } from 'react';
import { getExpenses } from '../database';


interface Transaction {
    amount: number;
    date: string;
}

interface TransactionsContextType {
    transactions: Transaction[];
}

export const TransactionsContext = createContext<TransactionsContextType | undefined>(undefined);

export const TransactionsProvider:React.FC<{children: React.ReactNode}> = ({ children }) => {
    const [transactions, setTransactions] = useState<Transaction[]>([]);

    useEffect(() => {
        // Fetch or load transactions from storage here
        const fetchTransactions = async () => {
            const expenses = await getExpenses();
            console.log('Fetched expenses:', expenses);
            setTransactions(expenses as Transaction[]);
            console.log('Set Transactions', transactions);
        };
        fetchTransactions();
    }, []);

    return (
        <TransactionsContext.Provider value={{ transactions }}>
            {children}
        </TransactionsContext.Provider>
    );
};
