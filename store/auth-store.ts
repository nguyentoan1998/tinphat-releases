// Authentication State with Zustand
import { create } from 'zustand';
import { apiClient, getErrorMessage, type User, type LoginRequest } from '@/lib/api-client';
import { secureStorage } from '@/lib/secure-storage';
import { useNotificationStore } from './notification-store';
import { registerForPushNotifications } from '@/lib/notification-setup';

interface AuthState {
    // State
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;

    // Actions
    login: (credentials: LoginRequest) => Promise<void>;
    register: (data: { email: string; password: string; name?: string }) => Promise<{ message: string } | void>;
    logout: () => Promise<void>;
    checkAuth: () => Promise<void>;
    clearError: () => void;
    setUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
    // Initial state
    user: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,

    // Login action
    login: async (credentials) => {
        try {
            // Note: We intentionally don't set isLoading: true here
            // because isLoading is used by _layout.tsx to show/hide loading screen
            // The login form has its own localLoading state
            set({ error: null });

            // If the device has an old/invalid token stored, some backends may reject even /auth/login
            // when an Authorization header is present. Ensure a clean auth state before login.
            await secureStorage.clearAll();

            const response = await apiClient.login(credentials);

            // Save token and user data securely
            await secureStorage.setToken(response.access_token);
            await secureStorage.setUser(response.user);

            set({
                user: response.user,
                isAuthenticated: true,
                isLoading: false,
                error: null,
            });

            useNotificationStore.getState().initSocket(response.access_token);
            useNotificationStore.getState().fetchUnreadCount();
            registerForPushNotifications();
        } catch (error: any) {
            console.error('[Auth] Login error:', error.message, error.code, error.response?.status);
            const errorMessage = getErrorMessage(error, 'Đăng nhập thất bại');
            set({
                user: null,
                isAuthenticated: false,
                isLoading: false,
                error: errorMessage,
            });
            throw error;
        }
    },

    // Register action (no auto-login — server requires email verification first)
    register: async (data) => {
        try {
            set({ error: null });
            const result = await apiClient.register(data);
            return result;
        } catch (error: any) {
            console.error('[Auth] Register error:', error.message, error.code, error.response?.status);
            const errorMessage = getErrorMessage(error, 'Đăng ký thất bại');
            set({
                error: errorMessage,
            });
            throw error;
        }
    },

    // Logout action
    logout: async () => {
        try {
            useNotificationStore.getState().destroySocket();
            useNotificationStore.getState().reset();

            // Clear all secure storage
            await secureStorage.clearAll();

            set({
                user: null,
                isAuthenticated: false,
                isLoading: false,
                error: null,
            });
        } catch (error) {
            console.error('Logout error:', error);
        }
    },

    // Check authentication status (on app start)
    checkAuth: async () => {
        try {
            set({ isLoading: true });

            const token = await secureStorage.getToken();

            if (!token) {
                set({ isLoading: false, isAuthenticated: false });
                return;
            }

            // Verify token by fetching user data
            const user = await apiClient.getMe();

            set({
                user: user,
                isAuthenticated: true,
                isLoading: false,
                error: null,
            });

            useNotificationStore.getState().initSocket(token);
            useNotificationStore.getState().fetchUnreadCount();
            registerForPushNotifications();
        } catch (error) {
            // Token invalid or expired
            await secureStorage.clearAll();
            set({
                user: null,
                isAuthenticated: false,
                isLoading: false,
                error: null,
            });
        }
    },

    // Clear error
    clearError: () => {
        set({ error: null });
    },

    // Set user data
    setUser: (user: User) => {
        set({ user: user });
    },
}));
