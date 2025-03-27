import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { getTotalIncome, getTotalExpenses } from '../database';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export class NotificationService {
  private static instance: NotificationService;
  private isInitialized: boolean = false;

  private constructor() {}

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    // Request permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      throw new Error('Permission not granted for notifications');
    }

    // Set up notification categories
    await this.setupNotificationCategories();

    this.isInitialized = true;
  }

  private async setupNotificationCategories(): Promise<void> {
    // Set up notification categories for iOS
    if (Platform.OS === 'ios') {
      await Notifications.setNotificationCategoryAsync('RECURRING_TRANSACTION', [
        {
          identifier: 'MARK_AS_PAID',
          buttonTitle: 'Mark as Paid',
        },
        {
          identifier: 'POSTPONE',
          buttonTitle: 'Postpone',
        },
      ]);
    }

    // Set up notification channels for Android
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('recurring-transactions', {
        name: 'Recurring Transactions',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        showBadge: true,
        enableVibrate: true,
        enableLights: true,
      });

      await Notifications.setNotificationChannelAsync('purchase-reminders', {
        name: 'Purchase Reminders',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        showBadge: true,
        enableVibrate: true,
        enableLights: true,
      });
    }
  }

  // Schedule a recurring transaction notification
  public async scheduleRecurringTransaction(
    title: string,
    body: string,
    recurringDate: Date,
    identifier: string,
    description: string
  ): Promise<void> {
    try {
      // Cancel any existing notification with this identifier
      await this.cancelNotification(identifier);

      // Send immediate notification
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Recurring Transaction Added',
          body,
          sound: true,
          data: { 
            type: 'RECURRING_TRANSACTION_ADDED',
            identifier,
          },
        },
        trigger: null,
        identifier: `${identifier}-added`,
      });

      // Get the day of the month from the recurring date
      const dayOfMonth = recurringDate.getDate();

      // Create a new date for the next occurrence
      const nextDate = new Date();
      nextDate.setDate(dayOfMonth);
      nextDate.setHours(9, 0, 0, 0); // Set to 9:00 AM
      
      // If the day has already passed this month, schedule for next month
      if (nextDate < new Date()) {
        nextDate.setMonth(nextDate.getMonth() + 1);
      }

      // Schedule the recurring notification
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body: `Your recurring transaction "${description}" is due today`,
          sound: true,
          data: { 
            type: 'RECURRING_TRANSACTION',
            identifier,
            actions: ['MARK_AS_PAID', 'POSTPONE', 'CANCEL_FUTURE']
          },
        },
        trigger: {
          date: nextDate,
          repeats: true,
          channelId: 'recurring-transactions'
        },
        identifier: `${identifier}-recurring`,
      });

    } catch (error) {
      console.error('Error in scheduleRecurringTransaction:', error);
      throw error;
    }
  }

  // Cancel future occurrences of a recurring transaction
  public async cancelFutureOccurrences(identifier: string): Promise<void> {
    try {
      // Cancel the recurring notification
      await this.cancelNotification(`${identifier}-recurring`);
      
      // Send a confirmation notification
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Recurring Transaction Cancelled',
          body: 'Future occurrences of this recurring transaction have been cancelled.',
          sound: true,
          data: { type: 'RECURRING_TRANSACTION_CANCELLED', identifier },
        },
        trigger: null,
        identifier: `${identifier}-cancelled`,
      });
    } catch (error) {
      console.error('Error cancelling future occurrences:', error);
      throw error;
    }
  }

  // Schedule a budget limit alert
  public async scheduleBudgetAlert(
    title: string,
    body: string,
    threshold: number
  ): Promise<void> {
    const checkBudget = async () => {
      const totalExpenses = await getTotalExpenses();
      if (totalExpenses >= threshold) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title,
            body,
            sound: true,
            data: { type: 'BUDGET_ALERT' },
          },
          trigger: null,
          identifier: `budget-alert-${Date.now()}`,
        });
      }
    };
    checkBudget();
  }

  // Schedule a purchase due date reminder
  public async schedulePurchaseReminder(
    title: string,
    body: string,
    dueDate: Date,
    identifier: string
  ): Promise<void> {
    // Send immediate notification
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Purchase Added',
        body: `Your planned purchase "${title}" has been added to your list. Due date: ${dueDate.toLocaleDateString()}`,
        sound: true,
        data: { type: 'PURCHASE_ADDED', identifier },
      },
      trigger: null,
      identifier: `${identifier}-added`,
    });

    // Schedule reminder for 1 day before
    const reminderDate = new Date(dueDate);
    reminderDate.setDate(reminderDate.getDate() - 1);

    // Ensure the reminder date is in the future
    if (reminderDate > new Date()) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Upcoming Purchase',
          body: `Your planned purchase "${title}" is due tomorrow`,
          sound: true,
          data: { type: 'PURCHASE_REMINDER', identifier },
        },
        trigger: {
          date: reminderDate,
          channelId: 'purchase-reminders'
        },
        identifier: `${identifier}-reminder`,
      });
    }
  }

  // Cancel a specific notification
  public async cancelNotification(identifier: string): Promise<void> {
    await Notifications.cancelScheduledNotificationAsync(identifier);
  }

  // Cancel all notifications
  public async cancelAllNotifications(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }

  // Get all pending notifications
  public async getPendingNotifications(): Promise<Notifications.NotificationRequest[]> {
    return await Notifications.getAllScheduledNotificationsAsync();
  }

  // Add notification listener
  public addNotificationListener(
    callback: (notification: Notifications.Notification) => void
  ): Notifications.Subscription {
    return Notifications.addNotificationReceivedListener(callback);
  }

  // Add notification response listener (for handling notification interactions)
  public addNotificationResponseListener(
    callback: (response: Notifications.NotificationResponse) => void
  ): Notifications.Subscription {
    return Notifications.addNotificationResponseReceivedListener(callback);
  }

  // Remove notification listener
  public removeNotificationListener(
    subscription: Notifications.Subscription
  ): void {
    subscription.remove();
  }
} 