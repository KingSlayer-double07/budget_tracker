import React from "react"
import { Pressable, Text, View } from "react-native"
import Swipeable from "react-native-gesture-handler/ReanimatedSwipeable"
import { Ionicons } from "@expo/vector-icons"
import { formatDate, formatNaira, makeStyles, useTheme } from "../../theme"

interface TransactionRowProps {
  title: string
  amount: number
  kind: "income" | "expense"
  date: string
  // Day of month for recurring entries
  recurringDay?: string | null
  // Category label; muted when the expense has none
  tag?: { label: string; muted?: boolean }
  onPress?: () => void
  onLongPress?: () => void
  // Shows a Delete action when the row is swiped left
  onDelete?: () => void
}

// One income or expense entry in a history list
export default function TransactionRow({
  title,
  amount,
  kind,
  date,
  recurringDay,
  tag,
  onPress,
  onLongPress,
  onDelete,
}: TransactionRowProps) {
  const styles = useStyles()
  const { colors } = useTheme()

  const row = (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={450}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}>
      <View style={styles.main}>
        <Text
          style={styles.title}
          numberOfLines={1}>
          {title}
        </Text>
        <View style={styles.meta}>
          <Text style={styles.metaText}>{formatDate(date)}</Text>
          {recurringDay && (
            <View style={styles.recurring}>
              <Ionicons
                name="repeat"
                size={13}
                color={colors.textMuted}
              />
              <Text style={styles.metaText}>Monthly, day {recurringDay}</Text>
            </View>
          )}
        </View>
      </View>
      <View style={styles.side}>
        <Text
          style={[
            styles.amount,
            { color: kind === "income" ? colors.income : colors.expense },
          ]}>
          {kind === "income" ? "+" : "-"}
          {formatNaira(amount)}
        </Text>
        {tag && (
          <Text
            style={[styles.tag, tag.muted && styles.tagMuted]}
            numberOfLines={1}>
            {tag.label}
          </Text>
        )}
      </View>
    </Pressable>
  )

  if (!onDelete) return row

  return (
    <Swipeable
      renderRightActions={() => (
        <Pressable
          style={styles.deleteAction}
          onPress={onDelete}
          accessibilityRole="button"
          accessibilityLabel={`Delete ${title}`}>
          <Ionicons
            name="trash-outline"
            size={20}
            color="#FFFFFF"
          />
          <Text style={styles.deleteText}>Delete</Text>
        </Pressable>
      )}
      rightThreshold={40}
      overshootRight={false}>
      {row}
    </Swipeable>
  )
}

const useStyles = makeStyles(({ colors, spacing, radius, font }) => ({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  rowPressed: {
    backgroundColor: colors.surfaceMuted,
  },
  main: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontSize: font.body,
    fontWeight: "600",
    color: colors.text,
  },
  meta: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    columnGap: spacing.md,
  },
  metaText: {
    fontSize: font.caption + 1,
    color: colors.textMuted,
  },
  recurring: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  side: {
    alignItems: "flex-end",
    gap: 4,
    maxWidth: "45%",
  },
  amount: {
    fontSize: font.body,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  tag: {
    fontSize: font.caption,
    fontWeight: "600",
    color: colors.onPrimarySoft,
    backgroundColor: colors.primarySoft,
    paddingVertical: 2,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
    overflow: "hidden",
  },
  tagMuted: {
    color: colors.textMuted,
    backgroundColor: colors.surfaceMuted,
  },
  deleteAction: {
    backgroundColor: colors.dangerSolid,
    justifyContent: "center",
    alignItems: "center",
    width: 88,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
    marginLeft: spacing.sm,
    gap: 2,
  },
  deleteText: {
    color: "#FFFFFF",
    fontSize: font.caption,
    fontWeight: "700",
  },
}))
