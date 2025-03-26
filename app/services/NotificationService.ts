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
    }
  }

  // Schedule a recurring transaction notification
  public async scheduleRecurringTransaction(
    title: string,
    body: string,
    recurringDate: Date,
    identifier: string
  ): Promise<void> {
    try {
      // Cancel any existing notification with this identifier
      await this.cancelNotification(identifier);

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

      // Schedule the notification
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: true,
          data: { 
            type: 'RECURRING_TRANSACTION',
            identifier,
            actions: ['MARK_AS_PAID', 'POSTPONE']
          },
        },
        trigger: {
          date: nextDate,
          repeats: true,
          channelId: 'recurring-transactions',
        },
        identifier,
      });

      console.log(`Scheduled recurring notification for ${nextDate.toISOString()}`);
    } catch (error) {
      console.error('Error scheduling recurring notification:', error);
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
            data: { type: 'BUDGET_ALERT' },
          },
          trigger: null,
        });
      }
    };
    // Initial check
    checkBudget();
  }

  // Schedule a purchase due date reminder
  public async schedulePurchaseReminder(
    title: string,
    body: string,
    dueDate: Date,
    identifier: string
  ): Promise<void> {
    // Schedule reminder for 1 day before
    const reminderDate = new Date(dueDate);
    reminderDate.setDate(reminderDate.getDate() - 1);

    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: { type: 'PURCHASE_REMINDER', identifier },
      },
      trigger: {
        date: reminderDate,
        channelId: 'purchase-reminders',
      },
      identifier: `${identifier}-reminder`,
    });
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

  // Add a test function to verify notifications
  public async testNotification(): Promise<void> {
    try {
      // Schedule a test notification that will trigger in 5 seconds
      const testDate = new Date();
      testDate.setSeconds(testDate.getSeconds() + 5);
      
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "Slayer Rules!!!",
          body: "This is a notification to remind you that you are the KingSlayer!",
          data: { type: 'TEST' },
        },
        trigger: {
          date: testDate,
          channelId: 'test-channel',
          //type: 'date'
        },
        identifier: 'test-notification',
      });
      console.log('Test notification scheduled successfully');
    } catch (error) {
      console.error('Error scheduling test notification:', error);
      throw error;
    }
  }
} 