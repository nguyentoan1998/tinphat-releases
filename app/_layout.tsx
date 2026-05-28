// Root layout: Setup providers and auth checking
import { Slot, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore, useNotificationStore } from '@/store';
import { useChatStore } from '@/store/chat-store';
import { secureStorage } from '@/lib/secure-storage';
import * as SecureStore from 'expo-secure-store';
const NOTIF_PREF_KEY = 'notif_enabled';
import AppUpdateManager from '@/components/ui/AppUpdateManager';
import NotificationToast from '@/components/ui/NotificationToast';
import IncomingCallOverlay from '@/components/call/IncomingCallOverlay';
import ActiveCallScreen from '@/components/call/ActiveCallScreen';
import { setupNotificationHandler, setupAndroidChannel, addNotificationTapListener, checkInitialNotificationTap } from '@/lib/notification-setup';

// Create QueryClient instance
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: 2,
            staleTime: 5 * 60 * 1000, // 5 minutes
        },
    },
});

function RootLayoutNav() {
    const router = useRouter();
    const segments = useSegments();
    const { isAuthenticated, isLoading } = useAuthStore();

    // Setup notification handler and Android channel
    useEffect(() => {
        setupNotificationHandler();
        setupAndroidChannel();

        const sub = addNotificationTapListener(() => {
            router.push('/notifications' as any);
        });

        checkInitialNotificationTap(() => {
            router.push('/notifications' as any);
        });

        return () => sub.remove();
    }, []);

    // Navigation based on auth state
    useEffect(() => {
        if (isLoading) return;

        const inAuthGroup = segments[0] === '(tabs)';
        const isPublicRoute = segments[0] === 'login' || segments[0] === 'register' || segments[0] === 'onboarding' || segments[0] === 'splash' || segments[0] === 'verify-email' || segments[0] === 'forgot-password' || segments[0] === 'reset-password';

        if (!isAuthenticated && !isPublicRoute) {
            router.replace('/login');
        } else if (isAuthenticated && isPublicRoute) {
            router.replace('/(tabs)');
        }
    }, [isAuthenticated, isLoading, segments]);

    // Initialize notification socket globally
    useEffect(() => {
        if (!isAuthenticated || isLoading) return;
        let cancelled = false;
        (async () => {
            const token = await secureStorage.getToken();
            if (token && !cancelled) {
                // Load notification preference
                const notifPref = await SecureStore.getItemAsync(NOTIF_PREF_KEY);
                if (notifPref === 'false') {
                    useNotificationStore.getState().disableNotifications();
                }
                useNotificationStore.getState().initSocket(token);
                useChatStore.getState().initSocket();
            }
        })();
        return () => { cancelled = true; };
    }, [isAuthenticated, isLoading]);

    return (
        <>
            <Slot />
            {/* In-app auto update — chạy sau khi auth check xong (Requirement 1.1, 1.3) */}
            {!isLoading && (
                <AppUpdateManager />
            )}
            <NotificationToast />
            <IncomingCallOverlay />
            <ActiveCallScreen />
        </>
    );
}

export default function RootLayout() {
    return (
        <QueryClientProvider client={queryClient}>
            <RootLayoutNav />
        </QueryClientProvider>
    );
}
