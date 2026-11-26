import React, { useContext } from "react"
import { View, ScrollView, Text } from "react-native"
import TrendGraph from "./components/TrendGraph"
import { Transaction } from "./components/TrendGraph"
import CategoryBreakdown from "./components/CategoryBreakdown"
import { TransactionsContext } from "./context/TransactionsContext"
import { useBudget } from "./context/BudgetContext"

export default function StatsScreen() {
  const context = useContext(TransactionsContext) || { transactions: [] }
  const { categoryTotals } = useBudget()

  if (!context) {
    return <Text>Loading...</Text>
  }

  const { transactions } = context

  // Ensure transactions is an array and filter out invalid entries
  const validTransactions: Transaction[] = Array.isArray(transactions)
    ? transactions.filter(
        (t) =>
          t &&
          typeof t.amount === "number" &&
          !isNaN(t.amount) &&
          typeof t.date === "string" &&
          !isNaN(new Date(t.date).getTime())
      )
    : []

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#f9f9f9", padding: 16 }}>
      {validTransactions.length === 0 ? (
        <View style={{ alignItems: "center", marginTop: 40 }}>
          <Text style={{ color: "#888", fontSize: 16 }}>
            No transactions to display.
          </Text>
        </View>
      ) : (
        <>
          <CategoryBreakdown totals={categoryTotals} />
          <TrendGraph transactions={validTransactions} />
        </>
      )}
    </ScrollView>
  )
}
