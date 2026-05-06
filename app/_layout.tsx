// Root layout: Setup providers and auth checking
import { Slot, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '@/store';
import AppUpdateManager from '@/components/ui/AppUpdateManager';

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

    // Navigation based on auth state
    useEffect(() => {
        if (isLoading) return;

        const inAuthGroup = segments[0] === '(tabs)';
        const isPublicRoute = segments[0] === 'login' || segments[0] === 'register' || segments[0] === 'onboarding' || segments[0] === 'splash' || segments[0] === 'verify-email' || segments[0] === 'forgot-password' || segments[0] === 'reset-password';

        if (!isAuthenticated && !isPublicRoute) {
            // Redirect to login if not authenticated and not on public route
            router.replace('/login');
        } else if (isAuthenticated && isPublicRoute) {
            // Redirect to tabs if authenticated and on public route
            router.replace('/(tabs)');
        }
    }, [isAuthenticated, isLoading, segments]);

    return (
        <>
            <Slot />
            {/* In-app auto update — chạy sau khi auth check xong (Requirement 1.1, 1.3) */}
            {!isLoading && (
                <AppUpdateManager />
            )}
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
