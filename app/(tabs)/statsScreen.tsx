import React, { useContext, useEffect, useState } from "react"
import { ScrollView, Text, View } from "react-native"
import TrendGraph from "../../components/TrendGraph"
import { Transaction } from "../../components/TrendGraph"
import CategoryBreakdown from "../../components/CategoryBreakdown"
import MonthSwitcher, {
  monthKey,
  shiftMonth,
} from "../../components/MonthSwitcher"
import { Card, EmptyState } from "../../components/ui"
import { TransactionsContext } from "../../context/TransactionsContext"
import { useBudget } from "../../context/BudgetContext"
import {
  CategoryTotal,
  getMonthlyExpenses,
  getMonthlyExpensesByCategory,
  getMonthlyIncome,
} from "../../services/database"
import { formatNaira, makeStyles, useTheme } from "../../theme"

interface MonthSummary {
  income: number
  spent: number
  categories: CategoryTotal[]
}

export default function StatsScreen() {
  const { transactions } = useContext(TransactionsContext) || {
    transactions: [],
  }
  const { expenseList, incomeList, monthlyBudget } = useBudget()
  const styles = useStyles()
  const { colors } = useTheme()
  const [month, setMonth] = useState(() => shiftMonth(new Date(), 0))
  const [summary, setSummary] = useState<MonthSummary | null>(null)

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

  // Months can be browsed from the first recorded entry up to now
  const currentMonth = monthKey(new Date())
  const earliestMonth = [...expenseList, ...incomeList].reduce(
    (earliest: string, entry: { date?: string }) => {
      const key = typeof entry.date === "string" ? entry.date.slice(0, 7) : ""
      return key && key < earliest ? key : earliest
    },
    currentMonth
  )

  // Reload when the month changes or any entry is added, edited or removed
  useEffect(() => {
    let cancelled = false
    Promise.all([
      getMonthlyIncome(month),
      getMonthlyExpenses(month),
      getMonthlyExpensesByCategory(month),
    ]).then(([income, spent, categories]) => {
      // Ignore a slower response for a month that's no longer shown
      if (!cancelled) setSummary({ income, spent, categories })
    })
    return () => {
      cancelled = true
    }
  }, [month, expenseList, incomeList])

  if (expenseList.length === 0 && incomeList.length === 0) {
    return (
      <View style={styles.container}>
        <EmptyState message="Nothing to show yet. Add some income or expenses first." />
      </View>
    )
  }

  const net = summary ? summary.income - summary.spent : 0
  const isCurrentMonth = monthKey(month) === currentMonth

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}>
      <MonthSwitcher
        month={month}
        onChange={setMonth}
        earliest={earliestMonth}
        latest={currentMonth}
      />

      <Card style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Income</Text>
            <Text style={[styles.summaryValue, { color: colors.income }]}>
              {formatNaira(summary?.income ?? 0)}
            </Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Spent</Text>
            <Text style={[styles.summaryValue, { color: colors.expense }]}>
              {formatNaira(summary?.spent ?? 0)}
            </Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>
              {isCurrentMonth ? "Left" : net < 0 ? "Overspent" : "Saved"}
            </Text>
            <Text
              style={[
                styles.summaryValue,
                { color: net < 0 ? colors.danger : colors.text },
              ]}>
              {formatNaira(isCurrentMonth ? net : Math.abs(net))}
            </Text>
          </View>
        </View>
        {monthlyBudget !== null && summary && (
          <Text style={styles.budgetNote}>
            {summary.spent > monthlyBudget
              ? `${formatNaira(summary.spent - monthlyBudget)} over`
              : `${formatNaira(monthlyBudget - summary.spent)} under`}{" "}
            your {formatNaira(monthlyBudget)} monthly budget
          </Text>
        )}
      </Card>

      <CategoryBreakdown
        totals={summary?.categories ?? []}
        month={month}
      />

      {validTransactions.length > 0 && (
        <TrendGraph transactions={validTransactions} />
      )}
    </ScrollView>
  )
}

const useStyles = makeStyles(({ colors, spacing, font }) => ({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xl * 2,
  },
  summaryCard: {
    marginBottom: spacing.xl,
  },
  summaryRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  summaryItem: {
    flex: 1,
    gap: 4,
  },
  summaryLabel: {
    fontSize: font.caption + 1,
    color: colors.textMuted,
  },
  summaryValue: {
    fontSize: font.body,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  budgetNote: {
    fontSize: font.caption + 1,
    color: colors.textMuted,
    marginTop: spacing.md,
  },
}))
