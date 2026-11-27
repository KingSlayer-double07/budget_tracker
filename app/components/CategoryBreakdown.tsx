import React from "react"
import { Text, View } from "react-native"
import { CategoryTotal } from "../database"
import { Card } from "./ui"
import { formatNaira, makeStyles } from "../../theme"

interface CategoryBreakdownProps {
  totals: CategoryTotal[]
  month?: Date
  // Show only the largest few categories (e.g. on the dashboard)
  limit?: number
  title?: string
}

// This month's spending per category, with each category's share of the total
export default function CategoryBreakdown({
  totals,
  month = new Date(),
  limit,
  title = "Spending by category",
}: CategoryBreakdownProps) {
  const styles = useStyles()
  const monthTotal = totals.reduce((sum, row) => sum + row.total, 0)
  const monthLabel = month.toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  })
  const rows = limit ? totals.slice(0, limit) : totals

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>
        {monthLabel} · {formatNaira(monthTotal)}
      </Text>

      {rows.length === 0 ? (
        <Text style={styles.empty}>No expenses recorded this month.</Text>
      ) : (
        rows.map((row) => {
          const share = monthTotal > 0 ? row.total / monthTotal : 0
          const uncategorized = row.categoryId === null
          return (
            <View
              key={row.categoryId ?? "none"}
              style={styles.row}>
              <View style={styles.rowHeader}>
                <Text
                  style={[styles.name, uncategorized && styles.nameMuted]}
                  numberOfLines={1}>
                  {row.name}
                </Text>
                <Text style={styles.amount}>{formatNaira(row.total)}</Text>
                <Text style={styles.percent}>{Math.round(share * 100)}%</Text>
              </View>
              <View style={styles.track}>
                <View
                  style={[
                    styles.bar,
                    uncategorized && styles.barMuted,
                    { width: `${share * 100}%` },
                  ]}
                />
              </View>
            </View>
          )
        })
      )}
      {limit !== undefined && totals.length > limit && (
        <Text style={styles.more}>
          +{totals.length - limit} more in Stats
        </Text>
      )}
    </Card>
  )
}

const useStyles = makeStyles(({ colors, spacing, radius, font }) => ({
  card: {
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: font.heading,
    fontWeight: "700",
    color: colors.text,
  },
  subtitle: {
    fontSize: font.label,
    color: colors.textMuted,
    marginTop: 2,
    marginBottom: spacing.lg,
  },
  empty: {
    color: colors.textSubtle,
    fontSize: font.body,
    textAlign: "center",
    paddingVertical: spacing.md,
  },
  row: {
    marginBottom: spacing.md + 2,
  },
  rowHeader: {
    flexDirection: "row",
    alignItems: "baseline",
    marginBottom: 6,
    gap: spacing.sm,
  },
  name: {
    flex: 1,
    fontSize: font.body - 1,
    color: colors.text,
  },
  nameMuted: {
    color: colors.textMuted,
    fontStyle: "italic",
  },
  amount: {
    fontSize: font.body - 1,
    fontWeight: "600",
    color: colors.text,
    fontVariant: ["tabular-nums"],
  },
  percent: {
    width: 40,
    textAlign: "right",
    fontSize: font.caption + 1,
    color: colors.textMuted,
    fontVariant: ["tabular-nums"],
  },
  track: {
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
    overflow: "hidden",
  },
  bar: {
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },
  barMuted: {
    backgroundColor: colors.textSubtle,
  },
  more: {
    fontSize: font.caption + 1,
    color: colors.textMuted,
    marginTop: -spacing.xs,
  },
}))
