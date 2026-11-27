import React, { useMemo } from "react"
import { View, Text, ScrollView, RefreshControl, Pressable } from "react-native"
import { useRouter } from "expo-router"
import { Ionicons } from "@expo/vector-icons"
import { useBudget } from "../../context/BudgetContext"
import { UNCATEGORIZED } from "../../services/database"
import CategoryBreakdown from "../../components/CategoryBreakdown"
import TransactionRow from "../../components/TransactionRow"
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  LoadingState,
  SectionTitle,
} from "../../components/ui"
import { formatNaira, makeStyles, useTheme } from "../../theme"

const RECENT_COUNT = 5
// Bright amber reads on the green hero card in both themes
const HERO_WARNING = "#F2C14E"

interface RecentEntry {
  key: string
  title: string
  amount: number
  date: string
  kind: "income" | "expense"
  category?: string | null
}

export default function Index() {
  const router = useRouter()
  const {
    balance,
    incomeList,
    expenseList,
    categoryTotals,
    monthlyIncome,
    monthlyExpenses,
    monthlyBudget,
    isLoading,
    error,
    refreshData,
  } = useBudget()
  const styles = useStyles()
  const { colors } = useTheme()
  const [refreshing, setRefreshing] = React.useState(false)

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true)
    await refreshData()
    setRefreshing(false)
  }, [refreshData])

  // Latest income and expenses together, newest first
  const recent = useMemo<RecentEntry[]>(() => {
    const entries: (RecentEntry & { id: number })[] = [
      ...incomeList.map((i: any) => ({
        key: `income-${i.id}`,
        id: i.id,
        title: i.source,
        amount: i.amount,
        date: i.date,
        kind: "income" as const,
      })),
      ...expenseList.map((e: any) => ({
        key: `expense-${e.id}`,
        id: e.id,
        title: e.item,
        amount: e.amount,
        date: e.date,
        kind: "expense" as const,
        category: e.category_name,
      })),
    ]
    return entries
      .sort((a, b) =>
        a.date === b.date ? b.id - a.id : b.date.localeCompare(a.date)
      )
      .slice(0, RECENT_COUNT)
  }, [incomeList, expenseList])

  if (isLoading) {
    return <LoadingState />
  }

  if (error) {
    return (
      <ErrorState
        message={error}
        onRetry={refreshData}
      />
    )
  }

  const monthLabel = new Date().toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  })
  const monthBalance = monthlyIncome - monthlyExpenses

  // Budget progress: green, amber from 80%, red once it's exceeded
  const budgetShare = monthlyBudget ? monthlyExpenses / monthlyBudget : 0
  const overBudget = monthlyBudget !== null && monthlyExpenses > monthlyBudget
  const barColor = overBudget
    ? colors.dangerSolid
    : budgetShare >= 0.8
      ? HERO_WARNING
      : colors.onPrimary

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={[colors.primary]}
          tintColor={colors.primary}
        />
      }>
      {/* This month's spending against the budget */}
      <View style={styles.hero}>
        <Text style={styles.heroLabel}>Spent in {monthLabel}</Text>
        <Text style={styles.heroValue}>{formatNaira(monthlyExpenses)}</Text>
        {monthlyBudget !== null ? (
          <>
            <View style={styles.heroTrack}>
              <View
                style={[
                  styles.heroBar,
                  {
                    width: `${Math.min(budgetShare, 1) * 100}%`,
                    backgroundColor: barColor,
                  },
                ]}
              />
            </View>
            <Text style={styles.heroMeta}>
              {overBudget
                ? `${formatNaira(monthlyExpenses - monthlyBudget)} over your ${formatNaira(monthlyBudget)} budget`
                : `${formatNaira(monthlyBudget - monthlyExpenses)} left of ${formatNaira(monthlyBudget)}`}
            </Text>
          </>
        ) : (
          <Pressable
            onPress={() => router.push("/settingsScreen")}
            hitSlop={8}
            style={styles.setBudget}>
            <Text style={styles.heroMeta}>Set a monthly budget</Text>
            <Ionicons
              name="chevron-forward"
              size={16}
              color={colors.onPrimary}
            />
          </Pressable>
        )}
      </View>

      <View style={styles.statsRow}>
        <Card style={styles.statCard}>
          <Text style={styles.statLabel}>Income this month</Text>
          <Text style={[styles.statValue, { color: colors.income }]}>
            {formatNaira(monthlyIncome)}
          </Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={styles.statLabel}>Left this month</Text>
          <Text
            style={[
              styles.statValue,
              { color: monthBalance >= 0 ? colors.text : colors.danger },
            ]}>
            {formatNaira(monthBalance)}
          </Text>
        </Card>
      </View>
      <Text style={styles.allTime}>
        All-time balance:{" "}
        <Text
          style={[
            styles.allTimeValue,
            { color: balance >= 0 ? colors.text : colors.danger },
          ]}>
          {formatNaira(balance)}
        </Text>
      </Text>

      <View style={styles.actions}>
        <Button
          title="Add Expense"
          onPress={() => router.push("/addExpenseScreen")}
          style={styles.action}
        />
        <Button
          title="Add Income"
          variant="secondary"
          onPress={() => router.push("/addIncomeScreen")}
          style={styles.action}
        />
      </View>

      {categoryTotals.length > 0 && (
        <CategoryBreakdown
          totals={categoryTotals}
          limit={3}
          title="Top categories"
        />
      )}

      <SectionTitle title="Recent activity" />
      {recent.length === 0 ? (
        <EmptyState message="Nothing recorded yet. Add your first expense or income." />
      ) : (
        recent.map((entry) => (
          <TransactionRow
            key={entry.key}
            title={entry.title}
            amount={entry.amount}
            kind={entry.kind}
            date={entry.date}
            tag={
              entry.kind === "expense"
                ? {
                    label: entry.category ?? UNCATEGORIZED,
                    muted: !entry.category,
                  }
                : undefined
            }
            onPress={() =>
              router.push(
                entry.kind === "income" ? "/addIncomeScreen" : "/addExpenseScreen"
              )
            }
          />
        ))
      )}
    </ScrollView>
  )
}

const useStyles = makeStyles(({ colors, spacing, radius, font }) => ({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xl * 2,
  },
  hero: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    padding: spacing.xl,
    marginBottom: spacing.md,
  },
  heroLabel: {
    fontSize: font.label,
    fontWeight: "500",
    color: colors.onPrimary,
    opacity: 0.85,
  },
  heroValue: {
    fontSize: 34,
    fontWeight: "800",
    color: colors.onPrimary,
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
    fontVariant: ["tabular-nums"],
  },
  heroTrack: {
    height: 8,
    borderRadius: radius.pill,
    // Translucent track works on both the light and dark green
    backgroundColor: "rgba(127, 127, 127, 0.35)",
    overflow: "hidden",
    marginBottom: spacing.sm,
  },
  heroBar: {
    height: 8,
    borderRadius: radius.pill,
  },
  heroMeta: {
    fontSize: font.label,
    fontWeight: "500",
    color: colors.onPrimary,
  },
  setBudget: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    alignSelf: "flex-start",
  },
  statsRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  statCard: {
    flex: 1,
    gap: spacing.xs,
  },
  statLabel: {
    fontSize: font.caption + 1,
    color: colors.textMuted,
  },
  statValue: {
    fontSize: font.heading + 1,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  allTime: {
    fontSize: font.label,
    color: colors.textMuted,
    marginTop: spacing.md,
    marginLeft: spacing.xs,
  },
  allTimeValue: {
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  actions: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
  },
  action: {
    flex: 1,
  },
}))
