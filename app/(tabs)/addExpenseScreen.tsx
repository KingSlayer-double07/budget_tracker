import React, { useState } from "react"
import { View, Text, Switch, FlatList, Alert, Pressable } from "react-native"
import { useBudget } from "../../context/BudgetContext"
import {
  stopRecurring,
  getNextDueDate,
  clearExpensesTable,
  UNCATEGORIZED,
} from "../../services/database"
import { NotificationService } from "../../services/NotificationService"
import ConfirmationModal from "../../components/ConfirmationModal"
import {
  CategoryChips,
  CategoryPickerModal,
} from "../../components/CategoryPicker"
import TransactionRow from "../../components/TransactionRow"
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  Field,
  LoadingState,
  SectionTitle,
} from "../../components/ui"
import { formatNaira, makeStyles, useTheme } from "../../theme"

interface ExpenseEntry {
  id: number
  item: string
  amount: number
  date: string
  is_recurring: boolean
  recurring_date: string | null
  category_id: number | null
  category_name: string | null
}

export default function AddExpenseScreen() {
  const [description, setDescription] = useState("")
  const [amount, setAmount] = useState("")
  const [isRecurring, setIsRecurring] = useState(false)
  const [recurringDate, setRecurringDate] = useState("")
  const [categoryId, setCategoryId] = useState<number | null>(null)
  // Expense whose category is being changed from the history list
  const [recategorizing, setRecategorizing] = useState<ExpenseEntry | null>(
    null
  )
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [selectedExpense, setSelectedExpense] = useState<ExpenseEntry | null>(
    null
  )
  const {
    expenseList,
    isLoading,
    error,
    addNewExpense,
    refreshData,
    deleteSelectedExpense,
    categories,
    changeExpenseCategory,
  } = useBudget()
  const styles = useStyles()
  const { colors } = useTheme()

  const handleSaveExpense = async () => {
    if (!description.trim() || !amount.trim()) {
      Alert.alert("Error", "Please fill in all fields")
      return
    }

    const numAmount = parseFloat(amount)
    if (isNaN(numAmount) || numAmount <= 0) {
      Alert.alert("Error", "Please enter a valid amount")
      return
    }

    try {
      const success = await addNewExpense(
        description,
        numAmount,
        isRecurring,
        recurringDate,
        categoryId
      )
      if (success) {
        // Schedule notification for recurring expense if date is provided
        if (isRecurring && recurringDate) {
          const notificationService = NotificationService.getInstance()
          const day = parseInt(recurringDate)

          // Next occurrence at 7:00, on the month's last day for days 29-31
          const nextDate = getNextDueDate(day)

          await notificationService.scheduleRecurringTransaction(
            "Recurring Expense Due",
            `Your recurring expense of ${formatNaira(numAmount)} for ${description} is due next on ${nextDate.toLocaleDateString()}`,
            nextDate,
            `recurring-expense-${description}-${recurringDate}`,
            description,
            {
              table: "expenses",
              name: description.trim(),
              recurringDay: recurringDate,
            }
          )
        }

        // The new entry appearing at the top of the history is the feedback
        setDescription("")
        setAmount("")
        setIsRecurring(false)
        setRecurringDate("")
        setCategoryId(null)
      } else {
        Alert.alert("Error", "Failed to add expense. Please try again.")
      }
    } catch (error) {
      Alert.alert("Error", "An unexpected error occurred. Please try again.")
    }
  }

  const handleLongPress = (expense: ExpenseEntry) => {
    if (expense.is_recurring) {
      setSelectedExpense(expense)
      setShowCancelModal(true)
    }
  }

  const handleDelete = (expense: ExpenseEntry) => {
    Alert.alert("Delete Expense", `Delete "${expense.item}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          const success = await deleteSelectedExpense(expense.id)
          if (!success) {
            Alert.alert("Error", "Failed to delete expense. Please try again.")
          }
        },
      },
    ])
  }

  const handleClearAll = () => {
    Alert.alert(
      "Clear All Expenses",
      "Are you sure you want to delete all expenses? This action is irreversible.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear All",
          style: "destructive",
          onPress: async () => {
            // Failures are already reported by the database layer
            const success = await clearExpensesTable()
            if (success) {
              await refreshData()
            }
          },
        },
      ]
    )
  }

  const handleCancelFutureOccurrences = async () => {
    if (!selectedExpense) return

    try {
      // Clear the recurring flag so no further occurrences are recorded
      const stopped = await stopRecurring("expenses", selectedExpense.id)
      if (!stopped) throw new Error("Failed to stop recurring expenses")
      await refreshData()

      const notificationService = NotificationService.getInstance()
      await notificationService.cancelFutureOccurrences(
        selectedExpense.item,
        `recurring-expense-${selectedExpense.item}-${selectedExpense.recurring_date}`
      )
      setShowCancelModal(false)
      setSelectedExpense(null)
    } catch (error) {
      Alert.alert("Error", "Failed to cancel future occurrences")
    }
  }

  const handleChangeCategory = async (newCategoryId: number | null) => {
    if (!recategorizing) return
    const expense = recategorizing
    setRecategorizing(null)
    if (newCategoryId === expense.category_id) return
    const success = await changeExpenseCategory(expense.id, newCategoryId)
    if (!success) {
      Alert.alert("Error", "Failed to change the category")
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

  // Rendered as the list header so the whole screen scrolls together
  const form = (
    <View>
      <Card style={styles.formCard}>
        <Field
          label="What did you spend on?"
          placeholder="e.g. Groceries"
          value={description}
          onChangeText={setDescription}
        />
        <Field
          label="Amount (₦)"
          placeholder="0"
          value={amount}
          onChangeText={setAmount}
          keyboardType="numeric"
        />
        <Text style={styles.label}>Category</Text>
        <View style={styles.categoryPicker}>
          <CategoryChips
            categories={categories}
            selectedId={categoryId}
            onSelect={setCategoryId}
          />
        </View>
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Repeats monthly</Text>
          <Switch
            value={isRecurring}
            onValueChange={setIsRecurring}
            trackColor={{ false: colors.border, true: colors.primarySoft }}
            thumbColor={isRecurring ? colors.primary : colors.surfaceMuted}
          />
        </View>
        {isRecurring && (
          <Field
            label="Day of the month"
            placeholder="1-31"
            value={recurringDate}
            onChangeText={setRecurringDate}
            keyboardType="numeric"
            maxLength={2}
            hint="Days 29-31 fall on the last day of shorter months"
          />
        )}
        <Button
          title="Add Expense"
          onPress={handleSaveExpense}
        />
      </Card>

      <SectionTitle
        title="History"
        action={
          <Pressable
            onPress={handleClearAll}
            disabled={expenseList.length === 0}
            hitSlop={8}>
            <Text
              style={[
                styles.clearText,
                expenseList.length === 0 && styles.clearTextDisabled,
              ]}>
              Clear all
            </Text>
          </Pressable>
        }
      />
      {expenseList.length > 0 && (
        <Text style={styles.hint}>
          Tap to change category · Hold a repeating expense to stop it · Swipe
          left to delete
        </Text>
      )}
    </View>
  )

  return (
    <View style={styles.container}>
      <FlatList
        data={expenseList as ExpenseEntry[]}
        keyExtractor={(item) => item.id.toString()}
        ListHeaderComponent={form}
        ListEmptyComponent={<EmptyState message="No expenses yet." />}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => (
          <TransactionRow
            title={item.item}
            amount={item.amount}
            kind="expense"
            date={item.date}
            recurringDay={item.is_recurring ? item.recurring_date : null}
            tag={{
              label: item.category_name ?? UNCATEGORIZED,
              muted: !item.category_name,
            }}
            onPress={() => setRecategorizing(item)}
            onLongPress={() => handleLongPress(item)}
            onDelete={() => handleDelete(item)}
          />
        )}
      />

      <CategoryPickerModal
        visible={recategorizing !== null}
        title={`Category for "${recategorizing?.item ?? ""}"`}
        categories={categories}
        selectedId={recategorizing?.category_id ?? null}
        onSelect={handleChangeCategory}
        onCancel={() => setRecategorizing(null)}
      />

      <ConfirmationModal
        visible={showCancelModal}
        title="Stop Repeating"
        message={`Stop recording "${selectedExpense?.item}" every month? Entries already recorded are kept.`}
        onConfirm={handleCancelFutureOccurrences}
        onCancel={() => {
          setShowCancelModal(false)
          setSelectedExpense(null)
        }}
      />
    </View>
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
  formCard: {
    marginBottom: spacing.xl,
  },
  label: {
    fontSize: font.label,
    fontWeight: "500",
    color: colors.textMuted,
    marginBottom: 6,
  },
  categoryPicker: {
    marginBottom: spacing.md,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  switchLabel: {
    fontSize: font.body,
    color: colors.text,
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
}))
