import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Polyline, Line, Circle, Svg } from 'react-native-svg';

export interface Transaction {
    amount: number;
    date: string;
}

interface SpendingTrendsChartProps {
    transactions: Transaction[];
}

interface GroupedData {
    name: string;
    total: number;
}

const TrendGraph: React.FC<SpendingTrendsChartProps> = ({ transactions }) => {
    const [timeframe, setTimeframe] = useState('weekly');
    const [chartData, setChartData] = useState<GroupedData[]>([]);

    useEffect(() => {
        const groupedData = groupDataByTimeframe(transactions, timeframe);
        setChartData(groupedData);
    }, [transactions, timeframe]);


    const groupDataByTimeframe = (transactions: Transaction[], timeframe: string): GroupedData[] => {
        const dataMap: Record<string, number> = {};
        transactions.forEach(({ amount, date }: Transaction) => {
            const transactionDate = new Date(date);
            let key: string;
            if (timeframe === 'weekly') {
                key = `Week ${Math.ceil(transactionDate.getDate() / 7)} - ${transactionDate.getMonth() + 1}`;
            } else if (timeframe === 'monthly') {
                key = `${transactionDate.getMonth() + 1}/${transactionDate.getFullYear()}`;
            } else {
                key = transactionDate.getFullYear().toString();
            }
            dataMap[key] = (dataMap[key] || 0) + amount;
        });
        return Object.entries(dataMap).map(([name, total]) => ({ name, total }));
    };

    const LineGraph: React.FC<{ chartData: GroupedData[] }> = ({ chartData }) => {
        const points: string = chartData.map((data: GroupedData, index: number): string => {
            const x: number = (index / (chartData.length - 1)) * 100;
            const y: number = 100 - (data.total / Math.max(...chartData.map((d: GroupedData) => d.total))) * 100;
            return `${x},${y}`;
        }).join(' ');

        return (
            <Svg width="100%" height="100%">
                <Polyline points={points} fill="none" stroke="#4f46e5" strokeWidth="2" />
                {chartData.map((data: GroupedData, index: number) => {
                    const x = (index / (chartData.length - 1)) * 100;
                    const y = 100 - (data.total / Math.max(...chartData.map((d: GroupedData) => d.total))) * 100;
                    return <Circle key={index} cx={x} cy={y} r={4} fill="#4f46e5" />;
                })}
            </Svg>
        );
    };

    return (
        <View style={{ padding: 16, borderRadius: 16, backgroundColor: '#ffffff', marginBottom: 24, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, elevation: 5 }}>
            <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 16, color: '#333' }}>Spending Trends</Text>
            <View style={{ flexDirection: 'row', marginBottom: 16 }}>
                {['weekly', 'monthly', 'all-time'].map((option) => (
                    <TouchableOpacity
                        key={option}
                        onPress={() => setTimeframe(option)}
                        style={{
                            paddingVertical: 8,
                            paddingHorizontal: 16,
                            marginRight: 8,
                            borderRadius: 8,
                            backgroundColor: timeframe === option ? '#4f46e5' : '#f0f0f0',
                        }}
                    >
                        <Text style={{ color: timeframe === option ? '#ffffff' : '#555', fontWeight: '600' }}>
                            {option.charAt(0).toUpperCase() + option.slice(1)}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
            <View style={{ width: '100%', height: 300 }}>
                <LineGraph chartData={chartData} />
            </View>
        </View>
    );
};

export default TrendGraph;
