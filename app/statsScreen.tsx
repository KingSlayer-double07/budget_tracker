import React, { useContext } from 'react';
import { View, ScrollView } from 'react-native';
import TrendGraph from './components/TrendGraph';
import { Transaction } from './components/TrendGraph';
import { TransactionsContext } from './context/TransactionsContext';

export default function StatsScreen() {
    const { transactions } = useContext(TransactionsContext) || { transactions: [] };

    return (
        <ScrollView style={{ flex: 1, backgroundColor: '#f9f9f9', padding: 16 }}>
            <TrendGraph transactions={transactions} />
        </ScrollView>
    );
};
