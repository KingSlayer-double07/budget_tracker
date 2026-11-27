import React from "react"
import { Pressable, Text, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { makeStyles, useTheme } from "../theme"

// First day of the month `offset` months from `date`
export const shiftMonth = (date: Date, offset: number) =>
  new Date(date.getFullYear(), date.getMonth() + offset, 1)

// Sortable YYYY-MM for comparing months
export const monthKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`

interface MonthSwitcherProps {
  month: Date
  onChange: (month: Date) => void
  // Earliest and latest months that can be shown (YYYY-MM)
  earliest: string
  latest: string
}

// "‹ October 2026 ›" control for stepping between months
export default function MonthSwitcher({
  month,
  onChange,
  earliest,
  latest,
}: MonthSwitcherProps) {
  const styles = useStyles()
  const { colors } = useTheme()
  const key = monthKey(month)
  const canGoBack = key > earliest
  const canGoForward = key < latest
  const label = month.toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  })

  const arrow = (
    direction: -1 | 1,
    enabled: boolean,
    icon: "chevron-back" | "chevron-forward"
  ) => (
    <Pressable
      onPress={() => onChange(shiftMonth(month, direction))}
      disabled={!enabled}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={direction < 0 ? "Previous month" : "Next month"}
      accessibilityState={{ disabled: !enabled }}
      style={({ pressed }) => [styles.arrow, pressed && styles.arrowPressed]}>
      <Ionicons
        name={icon}
        size={22}
        color={enabled ? colors.text : colors.border}
      />
    </Pressable>
  )

  return (
    <View style={styles.row}>
      {arrow(-1, canGoBack, "chevron-back")}
      <Pressable
        onPress={() => onChange(shiftMonth(new Date(), 0))}
        disabled={key === latest}
        accessibilityHint="Goes back to the current month">
        <Text style={styles.label}>{label}</Text>
        {key !== latest && <Text style={styles.reset}>Back to this month</Text>}
      </Pressable>
      {arrow(1, canGoForward, "chevron-forward")}
    </View>
  )
}

const useStyles = makeStyles(({ colors, spacing, radius, font }) => ({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.lg,
  },
  arrow: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  arrowPressed: {
    backgroundColor: colors.surfaceMuted,
  },
  label: {
    fontSize: font.heading,
    fontWeight: "700",
    color: colors.text,
    textAlign: "center",
  },
  reset: {
    fontSize: font.caption,
    fontWeight: "600",
    color: colors.primary,
    textAlign: "center",
    marginTop: 2,
  },
}))
