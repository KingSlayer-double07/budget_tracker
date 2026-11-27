import React, { useState } from "react"
import { ScrollView, Alert } from "react-native"
import { useRouter } from "expo-router"
import { useBudget } from "../context/BudgetContext"
import { NotificationService } from "../services/NotificationService"
import { Button, Card, ErrorState, Field, LoadingState } from "../components/ui"
import { formatNaira, makeStyles } from "../theme"

export default function AddPurchaseScreen() {
  const [item, setItem] = useState("")
  const [amount, setAmount] = useState("")
  const [dueDate, setDueDate] = useState("")
  const router = useRouter()
  const { isLoading, error, addNewPlannedPurchase, refreshData } = useBudget()
  const styles = useStyles()

  const handleAddPurchase = async () => {
    if (!item || !amount) {
      Alert.alert("Error", "Please enter an item and amount.")
      return
    }

    const numericAmount = parseFloat(amount)
    if (isNaN(numericAmount) || numericAmount <= 0) {
      Alert.alert("Error", "Please enter a valid amount.")
      return
    }

    try {
      const success = await addNewPlannedPurchase(
        item.trim(),
        numericAmount,
        dueDate.trim() || undefined
      )

      if (success) {
        // Schedule notification for planned purchase if due date is provided
        if (dueDate) {
          const notificationService = NotificationService.getInstance()
          const [year, month, day] = dueDate.split("-")
          const notificationDate = new Date(
            parseInt(year),
            parseInt(month) - 1,
            parseInt(day)
          )

          await notificationService.schedulePurchaseReminder(
            "Planned Purchase Due",
            `Your planned purchase of ${item} for ${formatNaira(numericAmount)} is due on ${notificationDate.toLocaleDateString()}`,
            notificationDate,
            `planned-purchase-${item}-${dueDate}`,
            item
          )
        }

        // Back to the list, where the new purchase now appears
        router.back()
      } else {
        Alert.alert("Error", "Failed to add planned purchase. Please try again.")
      }
    } catch (error) {
      Alert.alert("Error", "An unexpected error occurred. Please try again.")
    }
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

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled">
      <Card>
        <Field
          label="What do you plan to buy?"
          value={item}
          onChangeText={setItem}
          placeholder="e.g. New phone"
        />
        <Field
          label="Amount (₦)"
          value={amount}
          onChangeText={setAmount}
          placeholder="0"
          keyboardType="numeric"
        />
        <Field
          label="Due date (optional)"
          value={dueDate}
          onChangeText={setDueDate}
          placeholder="YYYY-MM-DD"
          hint="You'll get a reminder the day before"
          maxLength={10}
        />
        <Button
          title="Add Planned Purchase"
          onPress={handleAddPurchase}
        />
      </Card>
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
  },
}))
