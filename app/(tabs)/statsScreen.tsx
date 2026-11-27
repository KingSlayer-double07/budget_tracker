import React, { useContext } from "react"
import { ScrollView } from "react-native"
import TrendGraph from "../components/TrendGraph"
import { Transaction } from "../components/TrendGraph"
import CategoryBreakdown from "../components/CategoryBreakdown"
import { EmptyState } from "../components/ui"
import { TransactionsContext } from "../context/TransactionsContext"
import { useBudget } from "../context/BudgetContext"
import { makeStyles } from "../../theme"

export default function StatsScreen() {
  const { transactions } = useContext(TransactionsContext) || {
    transactions: [],
  }
  const { categoryTotals } = useBudget()
  const styles = useStyles()

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
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}>
      {validTransactions.length === 0 ? (
        <EmptyState message="No expenses to show yet." />
      ) : (
        <>
          <CategoryBreakdown totals={categoryTotals} />
          <TrendGraph transactions={validTransactions} />
        </>
      )}
    </ScrollView>
  )
}

const useStyles = makeStyles(({ colors, spacing }) => ({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xl * 2,
  },
}))
