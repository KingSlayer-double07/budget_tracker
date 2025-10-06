import React, { useState } from "react"
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Switch,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Pressable,
  ScrollView,
} from "react-native"
import { useRouter } from "expo-router"
import { useBudget } from "./context/BudgetContext"
import { NotificationService } from "./services/NotificationService"
import { clearIncomeTable } from "./database"
import ConfirmationModal from "./components/ConfirmationModal"
import { Swipeable } from "react-native-gesture-handler"
import { Ionicons } from "@expo/vector-icons"

export default function AddIncomeScreen() {
  const [source, setSource] = useState("")
  const [amount, setAmount] = useState("")
  const [isRecurring, setIsRecurring] = useState(false)
  const [recurringDate, setRecurringDate] = useState("")
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [selectedIncome, setSelectedIncome] = useState<{
    id: number
    source: string
    amount: number
    is_recurring: boolean
    recurring_date: string | null
  } | null>(null)
  const router = useRouter()
  const {
    incomeList,
    isLoading,
    error,
    addNewIncome,
    refreshData,
    deleteSelectedIncome,
  } = useBudget()

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

          // Create a date for the next occurrence
          const nextDate = new Date()
          nextDate.setDate(day)
          nextDate.setHours(7, 0, 0, 0) // Set to 7:00 AM

          // If the day has already passed this month, schedule for next month
          if (nextDate < new Date()) {
            nextDate.setMonth(nextDate.getMonth() + 1)
          }

          await notificationService.scheduleRecurringTransaction(
            "Recurring Income Due",
            `Your recurring income of NGN${numAmount.toLocaleString()} from ${source} is due next on ${nextDate.toLocaleDateString()}`,
            nextDate,
            `recurring-income-${source}-${recurringDate}`,
            source
          )
        }

        Alert.alert("Success", "Income added successfully!")
        setSource("")
        setAmount("")
        setRecurringDate("")
      } else {
        Alert.alert("Error", "Failed to add income. Please try again.")
      }
    } catch (error) {
      Alert.alert("Error", "An unexpected error occurred. Please try again.")
    }
  }

  const handleLongPress = (income: {
    id: number
    source: string
    amount: number
    is_recurring: boolean
    recurring_date: string | null
  }) => {
    if (income.is_recurring) {
      setSelectedIncome(income)
      setShowCancelModal(true)
    }
  }

  const handleDelete = async (id: number) => {
    Alert.alert(
      "Delete Income",
      "Are you sure you want to delete this income?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const success = await deleteSelectedIncome(id)
            if (success) {
              Alert.alert("Success", "Income deleted successfully!")
            } else {
              Alert.alert("Error", "Failed to delete income. Please try again.")
            }
          },
        },
      ]
    )
  }

  const renderRightActions = (item: any) => {
    return (
      <TouchableOpacity
        style={styles.leftAction}
        onPress={() => handleDelete(item.id)}>
        <Text style={styles.actionText}>Delete</Text>
      </TouchableOpacity>
    )
  }

  const handleCancelFutureOccurrences = async () => {
    if (!selectedIncome) return

    try {
      const notificationService = NotificationService.getInstance()
      await notificationService.cancelFutureOccurrences(
        selectedIncome.source,
        `recurring-income-${selectedIncome.source}-${selectedIncome.recurring_date}`
      )
      Alert.alert("Success", "Future occurrences cancelled successfully")
      setShowCancelModal(false)
      setSelectedIncome(null)
    } catch (error) {
      Alert.alert("Error", "Failed to cancel future occurrences")
    }
  }

  const renderIncomeItem = ({
    item,
  }: {
    item: {
      id: number
      source: string
      amount: number
      is_recurring: boolean
      recurring_date: string | null
    }
  }) => (
    <Swipeable
      renderRightActions={() => renderRightActions(item)}
      rightThreshold={40}
      overshootRight={true}>
      <Pressable
        style={styles.incomeItem}
        onLongPress={() => handleLongPress(item)}
        delayLongPress={500}>
        <View style={styles.incomeContent}>
          <Text style={styles.incomeSource}>{item.source}</Text>
          <Text style={styles.incomeAmount}>
            NGN{item.amount.toLocaleString()}
          </Text>
          {item.is_recurring && item.recurring_date && (
            <Text style={styles.recurringText}>
              Recurring on day {item.recurring_date}
            </Text>
          )}
        </View>
      </Pressable>
    </Swipeable>
  )

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator
          size="large"
          color="#ffc107"
        />
      </View>
    )
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={refreshData}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Income Source"
          value={source}
          onChangeText={setSource}
        />
        <TextInput
          style={styles.input}
          placeholder="Amount"
          value={amount}
          onChangeText={setAmount}
          keyboardType="numeric"
        />
        <View style={styles.switchContainer}>
          <Text style={styles.switchLabel}>Recurring Income</Text>
          <Switch
            value={isRecurring}
            onValueChange={setIsRecurring}
            trackColor={{ false: "#767577", true: "#81b0ff" }}
            thumbColor={isRecurring ? "#043927" : "#f4f3f4"}
          />
        </View>
        {isRecurring && (
          <TextInput
            style={styles.input}
            placeholder="Day of month (1-31)"
            value={recurringDate}
            onChangeText={setRecurringDate}
            keyboardType="numeric"
            maxLength={2}
          />
        )}
        <TouchableOpacity
          style={styles.button}
          onPress={handleSaveIncome}>
          <Text style={styles.buttonText}>Add Income</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.historyContainer}>
        <View style={styles.historyHeader}>
          <Text style={styles.historyTitle}>Income History</Text>
          <TouchableOpacity
            style={styles.clearButton}
            onPress={() => clearIncomeTable()}
            disabled={incomeList.length === 0}>
            <Text
              style={[
                styles.clearButtonText,
                incomeList.length === 0 && styles.clearButtonDisabled,
              ]}>
              Clear All
            </Text>
          </TouchableOpacity>
        </View>
        <FlatList
          data={incomeList}
          renderItem={renderIncomeItem}
          keyExtractor={(item) => item.id.toString()}
          style={styles.list}
          showsVerticalScrollIndicator={false}
        />
      </View>

      <ConfirmationModal
        visible={showCancelModal}
        title="Cancel Future Occurrences"
        message={`Are you sure you want to cancel future occurrences of the recurring income "${selectedIncome?.source}"?`}
        onConfirm={handleCancelFutureOccurrences}
        onCancel={() => {
          setShowCancelModal(false)
          setSelectedIncome(null)
        }}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#f5f5f5",
  },
  inputContainer: {
    backgroundColor: "white",
    padding: 20,
    borderRadius: 10,
    marginBottom: 20,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 10,
    borderRadius: 5,
    marginBottom: 10,
    fontSize: 16,
  },
  switchContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  switchLabel: {
    fontSize: 16,
    color: "#333",
  },
  button: {
    backgroundColor: "#043927",
    padding: 15,
    borderRadius: 5,
    alignItems: "center",
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  historyContainer: {
    flex: 1,
    backgroundColor: "white",
    borderRadius: 10,
    padding: 20,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  historyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  historyTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#043927",
  },
  clearButton: {
    padding: 8,
  },
  clearButtonText: {
    color: "#ff4444",
    fontSize: 16,
  },
  clearButtonDisabled: {
    color: "#ccc",
  },
  list: {
    flex: 1,
  },
  incomeItem: {
    backgroundColor: "#f8f9fa",
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#e9ecef",
  },
  incomeContent: {
    flexDirection: "column",
  },
  incomeSource: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#043927",
    marginBottom: 5,
  },
  incomeAmount: {
    fontSize: 16,
    color: "#28a745",
    marginBottom: 5,
  },
  recurringText: {
    fontSize: 14,
    color: "#6c757d",
    fontStyle: "italic",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    color: "#dc3545",
    fontSize: 16,
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: "#043927",
    padding: 10,
    borderRadius: 5,
  },
  retryButtonText: {
    color: "white",
    fontSize: 16,
  },
  leftAction: {
    backgroundColor: "#dc3545",
    justifyContent: "center",
    alignItems: "center",
    width: 100,
    height: "100%",
    borderRadius: 8,
    marginBottom: 10,
  },
  actionText: {
    color: "white",
    fontSize: 14,
    fontWeight: "bold",
  },
})
