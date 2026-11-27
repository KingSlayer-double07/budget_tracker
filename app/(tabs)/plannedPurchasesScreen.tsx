import React, { useState } from "react"
import { View, Text, FlatList, Alert, Pressable } from "react-native"
import Swipeable from "react-native-gesture-handler/ReanimatedSwipeable"
import { Ionicons } from "@expo/vector-icons"
import { useRouter } from "expo-router"
import { useBudget } from "../context/BudgetContext"
import { clearPlannedPurchasesTable } from "../database"
import InputModal from "../components/InputModal"
import {
  Button,
  ErrorState,
  LoadingState,
  SectionTitle,
} from "../components/ui"
import { formatDate, formatNaira, makeStyles, useTheme } from "../../theme"

interface PlannedPurchase {
  id: number
  item: string
  amount: number
  purchased: number
  due_date: string | null
}

export default function PlannedPurchasesScreen() {
  const [selectedPurchase, setSelectedPurchase] =
    useState<PlannedPurchase | null>(null)
  const [showInputModal, setShowInputModal] = useState(false)
  const {
    plannedPurchases,
    isLoading,
    error,
    markAsBought,
    editPlannedPurchaseAmount,
    deletePlannedPurchase,
    refreshData,
  } = useBudget()
  const router = useRouter()
  const styles = useStyles()
  const { colors } = useTheme()

  const purchases = plannedPurchases as PlannedPurchase[]
  const pending = purchases.filter((p) => !p.purchased)
  const pendingTotal = pending.reduce((sum, p) => sum + p.amount, 0)

  const handleMarkAsBought = async (purchase: PlannedPurchase) => {
    const success = await markAsBought(
      purchase.id,
      purchase.amount,
      purchase.item
    )
    if (!success) {
      Alert.alert("Error", "Failed to mark purchase as bought. Please try again.")
    }
  }

  const handleDelete = (purchase: PlannedPurchase) => {
    Alert.alert("Delete Purchase", `Delete "${purchase.item}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          const success = await deletePlannedPurchase(purchase.id)
          if (!success) {
            Alert.alert("Error", "Failed to delete purchase. Please try again.")
          }
        },
      },
    ])
  }

  const handleClearPurchases = () => {
    Alert.alert(
      "Clear Planned Purchases",
      "Clear all purchases you haven't bought yet? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: async () => {
            try {
              const success = await clearPlannedPurchasesTable()
              if (success) {
                await refreshData()
              } else {
                Alert.alert("Error", "Failed to clear planned purchases")
              }
            } catch (error) {
              console.error("Error clearing planned purchases:", error)
              Alert.alert("Error", "Failed to clear planned purchases")
            }
          },
        },
      ]
    )
  }

  const handleEditPurchaseAmount = async (
    purchase: PlannedPurchase,
    newAmount: number
  ) => {
    if (!newAmount || isNaN(newAmount) || newAmount <= 0) {
      Alert.alert("Error", "Please enter a valid amount.")
      return
    }

    try {
      const success = await editPlannedPurchaseAmount(
        purchase.id,
        purchase.amount,
        newAmount,
        purchase.item
      )
      if (success) {
        setShowInputModal(false)
      } else {
        Alert.alert("Error", "Failed to edit purchase amount. Please try again.")
      }
    } catch (error) {
      Alert.alert("Error", "An unexpected error occurred. Please try again")
    }
  }

  const handlePress = (purchase: PlannedPurchase) => {
    if (purchase.purchased) {
      Alert.alert(
        "Already Bought",
        "This purchase has been bought, so its amount can no longer be edited."
      )
      return
    }
    setSelectedPurchase(purchase)
    setShowInputModal(true)
  }

  const renderItem = ({ item }: { item: PlannedPurchase }) => {
    const bought = !!item.purchased
    return (
      <Swipeable
        renderLeftActions={
          bought
            ? undefined
            : () => (
                <Pressable
                  style={[styles.action, styles.buyAction]}
                  onPress={() => handleMarkAsBought(item)}
                  accessibilityRole="button"
                  accessibilityLabel={`Mark ${item.item} as bought`}>
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={20}
                    color={colors.onPrimary}
                  />
                  <Text style={[styles.actionText, styles.buyActionText]}>
                    Bought
                  </Text>
                </Pressable>
              )
        }
        renderRightActions={() => (
          <Pressable
            style={[styles.action, styles.deleteAction]}
            onPress={() => handleDelete(item)}
            accessibilityRole="button"
            accessibilityLabel={`Delete ${item.item}`}>
            <Ionicons
              name="trash-outline"
              size={20}
              color="#FFFFFF"
            />
            <Text style={styles.actionText}>Delete</Text>
          </Pressable>
        )}
        leftThreshold={40}
        rightThreshold={40}
        overshootLeft={false}
        overshootRight={false}>
        <Pressable
          onPress={() => handlePress(item)}
          style={({ pressed }) => [
            styles.row,
            bought && styles.rowBought,
            pressed && styles.rowPressed,
          ]}>
          <Ionicons
            name={bought ? "checkmark-circle" : "ellipse-outline"}
            size={22}
            color={bought ? colors.primary : colors.textSubtle}
          />
          <View style={styles.main}>
            <Text
              style={[styles.title, bought && styles.titleBought]}
              numberOfLines={1}>
              {item.item}
            </Text>
            <Text style={styles.meta}>
              {bought
                ? "Bought"
                : item.due_date
                  ? `Due ${formatDate(item.due_date)}`
                  : "No due date"}
            </Text>
          </View>
          <Text style={[styles.amount, bought && styles.amountBought]}>
            {formatNaira(item.amount)}
          </Text>
        </Pressable>
      </Swipeable>
    )
  }

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

  const header = (
    <View>
      <View style={styles.summary}>
        <Text style={styles.summaryLabel}>Still to buy</Text>
        <Text style={styles.summaryValue}>{formatNaira(pendingTotal)}</Text>
        <Text style={styles.summaryMeta}>
          {pending.length} {pending.length === 1 ? "item" : "items"}
        </Text>
      </View>
      <SectionTitle
        title="Purchases"
        action={
          <Pressable
            onPress={handleClearPurchases}
            disabled={pending.length === 0}
            hitSlop={8}>
            <Text
              style={[
                styles.clearText,
                pending.length === 0 && styles.clearTextDisabled,
              ]}>
              Clear all
            </Text>
          </Pressable>
        }
      />
      {purchases.length > 0 && (
        <Text style={styles.hint}>
          Tap to change the amount · Swipe right when bought · Swipe left to
          delete
        </Text>
      )}
    </View>
  )

  return (
    <View style={styles.container}>
      <FlatList
        data={purchases}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        ListHeaderComponent={header}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No planned purchases yet.</Text>
            <Button
              title="Plan a purchase"
              variant="secondary"
              onPress={() => router.push("/addPurchaseScreen")}
            />
          </View>
        }
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      />

      <InputModal
        visible={showInputModal}
        title="Change Amount"
        message={`New amount for "${selectedPurchase?.item ?? ""}"`}
        amount={selectedPurchase?.amount}
        onConfirm={(newAmount: number) => {
          if (!selectedPurchase) return
          handleEditPurchaseAmount(selectedPurchase, newAmount)
        }}
        onCancel={() => setShowInputModal(false)}
      />
    </View>
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
  summary: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  summaryLabel: {
    fontSize: font.label,
    color: colors.textMuted,
  },
  summaryValue: {
    fontSize: font.title + 4,
    fontWeight: "700",
    color: colors.text,
    marginVertical: 2,
    fontVariant: ["tabular-nums"],
  },
  summaryMeta: {
    fontSize: font.caption + 1,
    color: colors.textSubtle,
  },
  clearText: {
    fontSize: font.label,
    fontWeight: "600",
    color: colors.danger,
  },
  clearTextDisabled: {
    color: colors.textSubtle,
  },
  hint: {
    fontSize: font.caption,
    color: colors.textSubtle,
    marginTop: -spacing.sm,
    marginBottom: spacing.md,
  },
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
  rowBought: {
    backgroundColor: colors.surfaceMuted,
  },
  rowPressed: {
    opacity: 0.8,
  },
  main: {
    flex: 1,
    gap: 3,
  },
  title: {
    fontSize: font.body,
    fontWeight: "600",
    color: colors.text,
  },
  titleBought: {
    color: colors.textMuted,
    textDecorationLine: "line-through",
  },
  meta: {
    fontSize: font.caption + 1,
    color: colors.textMuted,
  },
  amount: {
    fontSize: font.body,
    fontWeight: "700",
    color: colors.text,
    fontVariant: ["tabular-nums"],
  },
  amountBought: {
    color: colors.textMuted,
  },
  action: {
    justifyContent: "center",
    alignItems: "center",
    width: 88,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
    gap: 2,
  },
  buyAction: {
    backgroundColor: colors.primary,
    marginRight: spacing.sm,
  },
  deleteAction: {
    backgroundColor: colors.dangerSolid,
    marginLeft: spacing.sm,
  },
  actionText: {
    color: "#FFFFFF",
    fontSize: font.caption,
    fontWeight: "700",
  },
  buyActionText: {
    color: colors.onPrimary,
  },
  empty: {
    alignItems: "center",
    gap: spacing.lg,
    paddingVertical: spacing.xl,
  },
  emptyText: {
    color: colors.textSubtle,
    fontSize: font.body,
  },
}))
