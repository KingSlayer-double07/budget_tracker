import React, { useState } from "react"
import { View, Text, Switch, FlatList, Alert, Pressable } from "react-native"
import { useBudget } from "../context/BudgetContext"
import { stopRecurring, getNextDueDate, clearIncomeTable } from "../database"
import { NotificationService } from "../services/NotificationService"
import ConfirmationModal from "../components/ConfirmationModal"
import TransactionRow from "../components/TransactionRow"
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  Field,
  LoadingState,
  SectionTitle,
} from "../components/ui"
import { formatNaira, makeStyles, useTheme } from "../../theme"

interface IncomeEntry {
  id: number
  source: string
  amount: number
  date: string
  is_recurring: boolean
  recurring_date: string | null
}

export default function AddIncomeScreen() {
  const [source, setSource] = useState("")
  const [amount, setAmount] = useState("")
  const [isRecurring, setIsRecurring] = useState(false)
  const [recurringDate, setRecurringDate] = useState("")
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [selectedIncome, setSelectedIncome] = useState<IncomeEntry | null>(
    null
  )
  const {
    incomeList,
    isLoading,
    error,
    addNewIncome,
    refreshData,
    deleteSelectedIncome,
  } = useBudget()
  const styles = useStyles()
  const { colors } = useTheme()

  const handleSaveIncome = async () => {
    if (!source.trim() || !amount.trim()) {
      Alert.alert("Error", "Please fill in all fields")
      return
    }

    const numAmount = parseFloat(amount)
    if (isNaN(numAmount) || numAmount <= 0) {
      Alert.alert("Error", "Please enter a valid amount")
      return
    }

    try {
      const success = await addNewIncome(
        source,
        numAmount,
        isRecurring,
        recurringDate
      )
      if (success) {
        // Schedule notification for recurring income if date is provided
        if (isRecurring && recurringDate) {
          const notificationService = NotificationService.getInstance()
          const day = parseInt(recurringDate)

          // Next occurrence at 7:00, on the month's last day for days 29-31
          const nextDate = getNextDueDate(day)

          await notificationService.scheduleRecurringTransaction(
            "Recurring Income Due",
            `Your recurring income of ${formatNaira(numAmount)} from ${source} is due next on ${nextDate.toLocaleDateString()}`,
            nextDate,
            `recurring-income-${source}-${recurringDate}`,
            source,
            {
              table: "income",
              name: source.trim(),
              recurringDay: recurringDate,
            }
          )
        }

        // The new entry appearing at the top of the history is the feedback
        setSource("")
        setAmount("")
        setIsRecurring(false)
        setRecurringDate("")
      } else {
        Alert.alert("Error", "Failed to add income. Please try again.")
      }
    } catch (error) {
      Alert.alert("Error", "An unexpected error occurred. Please try again.")
    }
  }

  const handleLongPress = (income: IncomeEntry) => {
    if (income.is_recurring) {
      setSelectedIncome(income)
      setShowCancelModal(true)
    }
  }

  const handleDelete = (income: IncomeEntry) => {
    Alert.alert("Delete Income", `Delete "${income.source}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          const success = await deleteSelectedIncome(income.id)
          if (!success) {
            Alert.alert("Error", "Failed to delete income. Please try again.")
          }
        },
      },
    ])
  }

  const handleClearAll = () => {
    Alert.alert(
      "Clear All Income",
      "Are you sure you want to delete all income? This action is irreversible.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear All",
          style: "destructive",
          onPress: async () => {
            // Failures are already reported by the database layer
            const success = await clearIncomeTable()
            if (success) {
              await refreshData()
            }
          },
        },
      ]
    )
  }

  const handleCancelFutureOccurrences = async () => {
    if (!selectedIncome) return

    try {
      // Clear the recurring flag so no further occurrences are recorded
      const stopped = await stopRecurring("income", selectedIncome.id)
      if (!stopped) throw new Error("Failed to stop recurring income")
      await refreshData()

      const notificationService = NotificationService.getInstance()
      await notificationService.cancelFutureOccurrences(
        selectedIncome.source,
        `recurring-income-${selectedIncome.source}-${selectedIncome.recurring_date}`
      )
      setShowCancelModal(false)
      setSelectedIncome(null)
    } catch (error) {
      Alert.alert("Error", "Failed to cancel future occurrences")
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
          label="Where is it from?"
          placeholder="e.g. Salary"
          value={source}
          onChangeText={setSource}
        />
        <Field
          label="Amount (₦)"
          placeholder="0"
          value={amount}
          onChangeText={setAmount}
          keyboardType="numeric"
        />
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
          title="Add Income"
          onPress={handleSaveIncome}
        />
      </Card>

      <SectionTitle
        title="History"
        action={
          <Pressable
            onPress={handleClearAll}
            disabled={incomeList.length === 0}
            hitSlop={8}>
            <Text
              style={[
                styles.clearText,
                incomeList.length === 0 && styles.clearTextDisabled,
              ]}>
              Clear all
            </Text>
          </Pressable>
        }
      />
      {incomeList.length > 0 && (
        <Text style={styles.hint}>
          Hold a repeating entry to stop it · Swipe left to delete
        </Text>
      )}
    </View>
  )

  return (
    <View style={styles.container}>
      <FlatList
        data={incomeList as IncomeEntry[]}
        keyExtractor={(item) => item.id.toString()}
        ListHeaderComponent={form}
        ListEmptyComponent={<EmptyState message="No income yet." />}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => (
          <TransactionRow
            title={item.source}
            amount={item.amount}
            kind="income"
            date={item.date}
            recurringDay={item.is_recurring ? item.recurring_date : null}
            onLongPress={() => handleLongPress(item)}
            onDelete={() => handleDelete(item)}
          />
        )}
      />

      <ConfirmationModal
        visible={showCancelModal}
        title="Stop Repeating"
        message={`Stop recording "${selectedIncome?.source}" every month? Entries already recorded are kept.`}
        onConfirm={handleCancelFutureOccurrences}
        onCancel={() => {
          setShowCancelModal(false)
          setSelectedIncome(null)
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
