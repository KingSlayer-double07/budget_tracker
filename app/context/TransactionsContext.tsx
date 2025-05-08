import React, { createContext, useState, useEffect } from 'react';

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
        const savedTransactions: Transaction[] = [
            { amount: 500, date: '2025-05-01' },
            { amount: 1500, date: '2025-05-02' },
            { amount: 200, date: '2025-05-03' },
            // Add your actual transactions here
        ];
        setTransactions(savedTransactions);
    }, []);

    return (
        <TransactionsContext.Provider value={{ transactions }}>
            {children}
        </TransactionsContext.Provider>
    );
};
