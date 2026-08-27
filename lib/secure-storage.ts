// Secure storage wrapper using expo-secure-store
// Falls back to localStorage on web platform
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const TOKEN_KEY = 'auth_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const USER_KEY = 'user_data';

// Check if SecureStore is available (not on web)
const isSecureStoreAvailable = Platform.OS !== 'web';

// Web fallback using localStorage
const webStorage = {
    setItem: (key: string, value: string) => {
        if (typeof window !== 'undefined' && window.localStorage) {
            window.localStorage.setItem(key, value);
        }
    },
    getItem: (key: string): string | null => {
        if (typeof window !== 'undefined' && window.localStorage) {
            return window.localStorage.getItem(key);
        }
        return null;
    },
    deleteItem: (key: string) => {
        if (typeof window !== 'undefined' && window.localStorage) {
            window.localStorage.removeItem(key);
        }
    },
};

export const secureStorage = {
    // Token management
    setToken: async (token: string): Promise<void> => {
        try {
            if (isSecureStoreAvailable) {
                await SecureStore.setItemAsync(TOKEN_KEY, token);
            } else {
                webStorage.setItem(TOKEN_KEY, token);
            }
        } catch (error) {
            console.error('Error saving token:', error);
            // Fallback to web storage
            webStorage.setItem(TOKEN_KEY, token);
        }
    },

    getToken: async (): Promise<string | null> => {
        try {
            if (isSecureStoreAvailable) {
                return await SecureStore.getItemAsync(TOKEN_KEY);
            } else {
                return webStorage.getItem(TOKEN_KEY);
            }
        } catch (error) {
            console.error('Error getting token:', error);
            return webStorage.getItem(TOKEN_KEY);
        }
    },

    deleteToken: async (): Promise<void> => {
        try {
            if (isSecureStoreAvailable) {
                await SecureStore.deleteItemAsync(TOKEN_KEY);
            } else {
                webStorage.deleteItem(TOKEN_KEY);
            }
        } catch (error) {
            console.error('Error deleting token:', error);
            webStorage.deleteItem(TOKEN_KEY);
        }
    },

    // Refresh token management
    setRefreshToken: async (token: string): Promise<void> => {
        try {
            if (isSecureStoreAvailable) {
                await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token);
            } else {
                webStorage.setItem(REFRESH_TOKEN_KEY, token);
            }
        } catch (error) {
            console.error('Error saving refresh token:', error);
            webStorage.setItem(REFRESH_TOKEN_KEY, token);
        }
    },

    getRefreshToken: async (): Promise<string | null> => {
        try {
            if (isSecureStoreAvailable) {
                return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
            } else {
                return webStorage.getItem(REFRESH_TOKEN_KEY);
            }
        } catch (error) {
            console.error('Error getting refresh token:', error);
            return webStorage.getItem(REFRESH_TOKEN_KEY);
        }
    },

    deleteRefreshToken: async (): Promise<void> => {
        try {
            if (isSecureStoreAvailable) {
                await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
            } else {
                webStorage.deleteItem(REFRESH_TOKEN_KEY);
            }
        } catch (error) {
            console.error('Error deleting refresh token:', error);
            webStorage.deleteItem(REFRESH_TOKEN_KEY);
        }
    },

    // User data (non-sensitive, but convenient to store securely)
    setUser: async (user: any): Promise<void> => {
        try {
            const userData = JSON.stringify(user);
            if (isSecureStoreAvailable) {
                await SecureStore.setItemAsync(USER_KEY, userData);
            } else {
                webStorage.setItem(USER_KEY, userData);
            }
        } catch (error) {
            console.error('Error saving user data:', error);
            webStorage.setItem(USER_KEY, JSON.stringify(user));
        }
    },

    getUser: async (): Promise<any | null> => {
        try {
            let userData: string | null;
            if (isSecureStoreAvailable) {
                userData = await SecureStore.getItemAsync(USER_KEY);
            } else {
                userData = webStorage.getItem(USER_KEY);
            }
            return userData ? JSON.parse(userData) : null;
        } catch (error) {
            console.error('Error getting user data:', error);
            const userData = webStorage.getItem(USER_KEY);
            return userData ? JSON.parse(userData) : null;
        }
    },

    deleteUser: async (): Promise<void> => {
        try {
            if (isSecureStoreAvailable) {
                await SecureStore.deleteItemAsync(USER_KEY);
            } else {
                webStorage.deleteItem(USER_KEY);
            }
        } catch (error) {
            console.error('Error deleting user data:', error);
            webStorage.deleteItem(USER_KEY);
        }
    },

    // Generic key-value storage (works on web via localStorage fallback)
    getItem: async (key: string): Promise<string | null> => {
        try {
            if (isSecureStoreAvailable) {
                return await SecureStore.getItemAsync(key);
            } else {
                return webStorage.getItem(key);
            }
        } catch (error) {
            console.error(`Error getting item "${key}":`, error);
            return webStorage.getItem(key);
        }
    },

    setItem: async (key: string, value: string): Promise<void> => {
        try {
            if (isSecureStoreAvailable) {
                await SecureStore.setItemAsync(key, value);
            } else {
                webStorage.setItem(key, value);
            }
        } catch (error) {
            console.error(`Error setting item "${key}":`, error);
            webStorage.setItem(key, value);
        }
    },

    // Clear all auth data
    clearAll: async (): Promise<void> => {
        await Promise.all([
            secureStorage.deleteToken(),
            secureStorage.deleteRefreshToken(),
            secureStorage.deleteUser(),
        ]);
    },
};
