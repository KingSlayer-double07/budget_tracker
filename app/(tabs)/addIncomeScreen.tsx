import React, { useState } from "react"
import { View, Text, Switch, FlatList, Alert, Pressable } from "react-native"
import { useBudget } from "../../context/BudgetContext"
import {
  stopRecurring,
  getNextDueDate,
  clearIncomeTable,
  EditScope,
  toLocalDateString,
} from "../../services/database"
import { NotificationService } from "../../services/NotificationService"
import ConfirmationModal from "../../components/ConfirmationModal"
import TransactionRow from "../../components/TransactionRow"
import DateField from "../../components/DateField"
import EditEntryModal, { EntryValues } from "../../components/EditEntryModal"
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  Field,
  LoadingState,
  SectionTitle,
} from "../../components/ui"
import { formatDate, formatNaira, makeStyles, useTheme } from "../../theme"

interface IncomeEntry {
  id: number
  source: string
  amount: number
  date: string
  is_recurring: boolean
  recurring_date: string | null
  // Set when a repeating entry was edited for future months only
  next_name: string | null
  next_amount: number | null
}

// What a repeating income entry records in later months
const futureValues = (income: IncomeEntry): EntryValues => ({
  name:
    income.next_amount !== null
      ? income.next_name ?? income.source
      : income.source,
  amount: income.next_amount ?? income.amount,
  categoryId: null,
})

// The monthly reminder is keyed by the name later months record
const reminderId = (name: string, day: string | null) =>
  `recurring-income-${name}-${day}`

export default function AddIncomeScreen() {
  const [source, setSource] = useState("")
  const [amount, setAmount] = useState("")
  const [isRecurring, setIsRecurring] = useState(false)
  const [recurringDate, setRecurringDate] = useState("")
  // YYYY-MM-DD when back-dated; null means today, worked out when saving
  const [date, setDate] = useState<string | null>(null)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [selectedIncome, setSelectedIncome] = useState<IncomeEntry | null>(
    null
  )
  // Entry being edited from the history list
  const [editing, setEditing] = useState<IncomeEntry | null>(null)
  const {
    incomeList,
    isLoading,
    error,
    addNewIncome,
    refreshData,
    deleteSelectedIncome,
    editIncome,
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
        recurringDate,
        date ?? undefined
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
            reminderId(source.trim(), recurringDate),
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
        setDate(null)
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
        reminderId(
          futureValues(selectedIncome).name,
          selectedIncome.recurring_date
        )
      )
      setShowCancelModal(false)
      setSelectedIncome(null)
    } catch (error) {
      Alert.alert("Error", "Failed to cancel future occurrences")
    }
  }

  const handleSaveEdit = async (values: EntryValues, scope: EditScope) => {
    if (!editing) return
    const income = editing
    const success = await editIncome(
      income.id,
      values.name,
      values.amount,
      scope,
      values.date
    )
    if (!success) {
      Alert.alert("Error", "Failed to save the changes. Please try again.")
      return
    }
    setEditing(null)

    // Keep the monthly reminder in step with the name later months record
    const oldName = futureValues(income).name
    if (income.is_recurring && income.recurring_date && oldName !== values.name) {
      try {
        await NotificationService.getInstance().renameRecurringReminder(
          reminderId(oldName, income.recurring_date),
          "Recurring Income Due",
          getNextDueDate(parseInt(income.recurring_date)),
          reminderId(values.name, income.recurring_date),
          values.name,
          {
            table: "income",
            name: values.name,
            recurringDay: income.recurring_date,
          }
        )
      } catch (error) {
        console.error("Failed to update the reminder:", error)
      }
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
        <DateField
          label="Date"
          value={date ?? toLocalDateString(new Date())}
          onChange={(value) =>
            setDate(value === toLocalDateString(new Date()) ? null : value)
          }
          maximumDate={new Date()}
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
            hint={
              date && date < toLocalDateString(new Date())
                ? `Every month since ${formatDate(date)} is recorded too`
                : "Days 29-31 fall on the last day of shorter months"
            }
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
          Tap to edit · Hold a repeating entry to stop it · Swipe left to
          delete
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
            nextAmount={item.is_recurring ? item.next_amount : null}
            onPress={() => setEditing(item)}
            onLongPress={() => handleLongPress(item)}
            onDelete={() => handleDelete(item)}
          />
        )}
      />

      <EditEntryModal
        visible={editing !== null}
        title="Edit Income"
        nameLabel="Where is it from?"
        initial={{
          name: editing?.source ?? "",
          amount: editing?.amount ?? 0,
          categoryId: null,
          date: editing?.date,
        }}
        future={
          editing?.is_recurring ? futureValues(editing) : undefined
        }
        onSave={handleSaveEdit}
        onCancel={() => setEditing(null)}
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
