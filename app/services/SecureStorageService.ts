import * as SecureStore from 'expo-secure-store';

export class SecureStorageService {
  private static instance: SecureStorageService;
  private readonly STORAGE_KEYS = {
    USER_PREFERENCES: 'user_preferences',
    LAST_BACKUP: 'last_backup',
    ENCRYPTION_KEY: 'encryption_key',
  };

  private constructor() {}

  public static getInstance(): SecureStorageService {
    if (!SecureStorageService.instance) {
      SecureStorageService.instance = new SecureStorageService();
    }
    return SecureStorageService.instance;
  }

  public async saveSecureItem(key: string, value: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch (error) {
      console.error('Error saving secure item:', error);
      throw new Error('Failed to save secure item');
    }
  }

  public async getSecureItem(key: string): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(key);
    } catch (error) {
      console.error('Error getting secure item:', error);
      return null;
    }
  }

  public async deleteSecureItem(key: string): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch (error) {
      console.error('Error deleting secure item:', error);
      throw new Error('Failed to delete secure item');
    }
  }

  public async saveUserPreferences(preferences: Record<string, any>): Promise<void> {
    try {
      await this.saveSecureItem(
        this.STORAGE_KEYS.USER_PREFERENCES,
        JSON.stringify(preferences)
      );
    } catch (error) {
      console.error('Error saving user preferences:', error);
      throw new Error('Failed to save user preferences');
    }
  }

  public async getUserPreferences(): Promise<Record<string, any> | null> {
    try {
      const preferences = await this.getSecureItem(this.STORAGE_KEYS.USER_PREFERENCES);
      return preferences ? JSON.parse(preferences) : null;
    } catch (error) {
      console.error('Error getting user preferences:', error);
      return null;
    }
  }

  public async saveLastBackupDate(date: string): Promise<void> {
    try {
      await this.saveSecureItem(this.STORAGE_KEYS.LAST_BACKUP, date);
    } catch (error) {
      console.error('Error saving last backup date:', error);
      throw new Error('Failed to save last backup date');
    }
  }

  public async getLastBackupDate(): Promise<string | null> {
    return await this.getSecureItem(this.STORAGE_KEYS.LAST_BACKUP);
  }

  public async generateAndSaveEncryptionKey(): Promise<string> {
    try {
      // Generate a random encryption key
      const key = Math.random().toString(36).substring(2) + 
                 Date.now().toString(36) + 
                 Math.random().toString(36).substring(2);
      
      await this.saveSecureItem(this.STORAGE_KEYS.ENCRYPTION_KEY, key);
      return key;
    } catch (error) {
      console.error('Error generating encryption key:', error);
      throw new Error('Failed to generate encryption key');
    }
  }

  public async getEncryptionKey(): Promise<string | null> {
    return await this.getSecureItem(this.STORAGE_KEYS.ENCRYPTION_KEY);
  }
} 