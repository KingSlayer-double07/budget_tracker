import * as Notifications from "expo-notifications"
import Constants, { ExecutionEnvironment } from "expo-constants"
import { Platform } from "react-native"

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
})

export const RECURRING_CATEGORY = "RECURRING_TRANSACTION"
export const CANCEL_FUTURE_ACTION = "CANCEL_FUTURE"

// Which recurring entry a reminder belongs to, so its actions can find it
export interface RecurringTarget {
  table: "income" | "expenses"
  name: string
  recurringDay: string
}

export class NotificationService {
  private static instance: NotificationService
  private isInitialized: boolean = false

  private constructor() {}

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService()
    }
    return NotificationService.instance
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) return

    // Request permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync()
    let finalStatus = existingStatus

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync()
      finalStatus = status
    }

    if (finalStatus !== "granted") {
      throw new Error("Permission not granted for notifications")
    }

    // Set up notification categories. A failure here shouldn't stop the
    // rest of initialization: Android falls back to a default channel.
    try {
      await this.setupNotificationCategories()
    } catch (error) {
      console.error("Error setting up notification channels:", error)
    }

    this.isInitialized = true
  }

  private async setupNotificationCategories(): Promise<void> {
    // Action buttons shown on recurring transaction reminders
    try {
      await Notifications.setNotificationCategoryAsync(
        RECURRING_CATEGORY,
        [
          {
            identifier: CANCEL_FUTURE_ACTION,
            buttonTitle: "Stop recurring",
            options: { opensAppToForeground: true },
          },
        ]
      )
    } catch (error) {
      console.error("Error setting up notification categories:", error)
    }

    // Set up notification channels for Android. Expo Go doesn't register the
    // native channel provider, so every channel call rejects there with a
    // NullPointerException; notifications use the default channel instead.
    const isExpoGo =
      Constants.executionEnvironment === ExecutionEnvironment.StoreClient
    if (Platform.OS === "android" && !isExpoGo) {
      await Notifications.setNotificationChannelAsync(
        "recurring-transactions",
        {
          name: "Recurring Transactions",
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: "#FF231F7C",
          lockscreenVisibility:
            Notifications.AndroidNotificationVisibility.PUBLIC,
          showBadge: true,
          enableVibrate: true,
          enableLights: true,
        }
      )

      await Notifications.setNotificationChannelAsync("purchase-reminders", {
        name: "Purchase Reminders",
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#FF231F7C",
        lockscreenVisibility:
          Notifications.AndroidNotificationVisibility.PUBLIC,
        showBadge: true,
        enableVibrate: true,
        enableLights: true,
      })
    }
  }

  // Schedule a recurring transaction notification
  public async scheduleRecurringTransaction(
    title: string,
    body: string,
    recurringDate: Date,
    identifier: string,
    description: string,
    target: RecurringTarget
  ): Promise<void> {
    try {
      // Cancel any existing notification with this identifier
      await this.cancelNotification(identifier)

      // Send immediate notification
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "Recurring Transaction Added",
          body,
          sound: true,
          data: {
            type: "RECURRING_TRANSACTION_ADDED",
            identifier,
          },
        },
        trigger: null,
        identifier: `${identifier}-added`,
      })

      await this.scheduleMonthlyReminder(
        title,
        recurringDate,
        identifier,
        description,
        target
      )
    } catch (error) {
      console.error("Error in scheduleRecurringTransaction:", error)
      throw error
    }
  }

  // Move a recurring entry's monthly reminder after its name changes, so the
  // reminder text and its Stop recurring action match what's recorded
  public async renameRecurringReminder(
    oldIdentifier: string,
    title: string,
    recurringDate: Date,
    identifier: string,
    description: string,
    target: RecurringTarget
  ): Promise<void> {
    await this.cancelNotification(`${oldIdentifier}-recurring`)
    await this.scheduleMonthlyReminder(
      title,
      recurringDate,
      identifier,
      description,
      target
    )
  }

  // Schedule the monthly "due today" reminder for a recurring entry
  private async scheduleMonthlyReminder(
    title: string,
    recurringDate: Date,
    identifier: string,
    description: string,
    target: RecurringTarget
  ): Promise<void> {
    // Get the day of the month from the recurring date. The monthly trigger
    // rejects days past the end of the current month, so days 29-31 are
    // capped to this month's last day.
    const now = new Date()
    const daysInMonth = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0
    ).getDate()
    const dayOfMonth = Math.min(recurringDate.getDate(), daysInMonth)

    // Schedule the recurring notification for 9:00 AM on that day every month
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body: `Your recurring transaction "${description}" is due today`,
        sound: true,
        data: {
          type: "RECURRING_TRANSACTION",
          identifier,
          ...target,
        },
        categoryIdentifier: RECURRING_CATEGORY,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.MONTHLY,
        day: dayOfMonth,
        hour: 9,
        minute: 0,
        channelId: "recurring-transactions",
      },
      identifier: `${identifier}-recurring`,
    })
  }

  // Cancel future occurrences of a recurring transaction
  public async cancelFutureOccurrences(
    selected: string,
    identifier: string
  ): Promise<void> {
    try {
      // Cancel the recurring notification
      await this.cancelNotification(`${identifier}-recurring`)

      // Send a confirmation notification
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "Recurring Transaction Cancelled",
          body: `Future occurrences of this recurring transaction "${selected}" have been cancelled.`,
          sound: true,
          data: { type: "RECURRING_TRANSACTION_CANCELLED", identifier },
        },
        trigger: null,
        identifier: `${identifier}-cancelled`,
      })
    } catch (error) {
      console.error("Error cancelling future occurrences:", error)
      throw error
    }
  }

  // Show a budget limit alert immediately
  public async sendBudgetAlert(title: string, body: string): Promise<void> {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
        data: { type: "BUDGET_ALERT" },
      },
      trigger: null,
      identifier: `budget-alert-${Date.now()}`,
    })
  }

  // Schedule a purchase due date reminder
  public async schedulePurchaseReminder(
    title: string,
    body: string,
    dueDate: Date,
    identifier: string,
    item: string
  ): Promise<void> {
    // Send immediate notification
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Purchase Added",
        body: `Your planned purchase "${item}" has been added to your list. Due date: ${dueDate.toLocaleDateString()}`,
        sound: true,
        data: { type: "PURCHASE_ADDED", identifier },
      },
      trigger: null,
      identifier: `${identifier}-added`,
    })

    // Schedule reminder for 1 day before
    const reminderDate = new Date(dueDate)
    reminderDate.setDate(reminderDate.getDate() - 1)

    // Ensure the reminder date is in the future
    if (reminderDate > new Date()) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: true,
          data: { type: "PURCHASE_REMINDER", identifier },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: reminderDate,
          channelId: "purchase-reminders",
        },
        identifier: `${identifier}-reminder`,
      })
    }
  }

  // Cancel a specific notification
  public async cancelNotification(identifier: string): Promise<void> {
    await Notifications.cancelScheduledNotificationAsync(identifier)
  }

  public async testNotification(): Promise<void> {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Test Notification",
        body: "This is a test notification sent from a debugging button",
        sound: true,
        data: { type: "PURCHASE_REMINDER" },
      },
      trigger: null,
    })
  }

  // Cancel all notifications
  public async cancelAllNotifications(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync()
  }

  // Get all pending notifications
  public async getPendingNotifications(): Promise<
    Notifications.NotificationRequest[]
  > {
    return await Notifications.getAllScheduledNotificationsAsync()
  }

  // Add notification listener
  public addNotificationListener(
    callback: (notification: Notifications.Notification) => void
  ): Notifications.Subscription {
    return Notifications.addNotificationReceivedListener(callback)
  }

  // Add notification response listener (for handling notification interactions)
  public addNotificationResponseListener(
    callback: (response: Notifications.NotificationResponse) => void
  ): Notifications.Subscription {
    return Notifications.addNotificationResponseReceivedListener(callback)
  }

  // Remove notification listener
  public removeNotificationListener(
    subscription: Notifications.Subscription
  ): void {
    subscription.remove()
  }
}
