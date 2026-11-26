import React from "react"
import { StyleSheet, Text, View } from "react-native"
import { CategoryTotal } from "../database"

interface CategoryBreakdownProps {
  totals: CategoryTotal[]
  month?: Date
}

// This month's spending per category, with each category's share of the total
export default function CategoryBreakdown({
  totals,
  month = new Date(),
}: CategoryBreakdownProps) {
  const monthTotal = totals.reduce((sum, row) => sum + row.total, 0)
  const monthLabel = month.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  })

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Spending by category</Text>
      <Text style={styles.subtitle}>
        {monthLabel} · NGN{monthTotal.toLocaleString()}
      </Text>

      {totals.length === 0 ? (
        <Text style={styles.empty}>No expenses recorded this month.</Text>
      ) : (
        totals.map((row) => {
          const share = monthTotal > 0 ? row.total / monthTotal : 0
          return (
            <View
              key={row.categoryId ?? "none"}
              style={styles.row}>
              <View style={styles.rowHeader}>
                <Text
                  style={[
                    styles.name,
                    row.categoryId === null && styles.nameMuted,
                  ]}
                  numberOfLines={1}>
                  {row.name}
                </Text>
                <Text style={styles.amount}>
                  NGN{row.total.toLocaleString()}
                </Text>
                <Text style={styles.percent}>{Math.round(share * 100)}%</Text>
              </View>
              <View style={styles.track}>
                <View
                  style={[
                    styles.bar,
                    row.categoryId === null && styles.barMuted,
                    { width: `${share * 100}%` },
                  ]}
                />
              </View>
            </View>
          )
        })
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#ffffff",
    marginBottom: 24,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  subtitle: {
    fontSize: 14,
    color: "#6c757d",
    marginTop: 2,
    marginBottom: 16,
  },
  empty: {
    color: "#888",
    fontSize: 15,
    textAlign: "center",
    paddingVertical: 12,
  },
  row: {
    marginBottom: 14,
  },
  rowHeader: {
    flexDirection: "row",
    alignItems: "baseline",
    marginBottom: 6,
    gap: 8,
  },
  name: {
    flex: 1,
    fontSize: 15,
    color: "#333",
  },
  nameMuted: {
    color: "#6c757d",
    fontStyle: "italic",
  },
  amount: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
    fontVariant: ["tabular-nums"],
  },
  percent: {
    width: 40,
    textAlign: "right",
    fontSize: 13,
    color: "#6c757d",
    fontVariant: ["tabular-nums"],
  },
  track: {
    height: 8,
    borderRadius: 4,
    backgroundColor: "#eef1ef",
    overflow: "hidden",
  },
  bar: {
    height: 8,
    borderRadius: 4,
    backgroundColor: "#043927",
  },
  barMuted: {
    backgroundColor: "#9aa5a0",
  },
})
