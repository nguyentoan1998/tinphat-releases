import { Platform } from 'react-native';
import { notificationApi } from './notification-api';

let Notifications: any = null;
let Device: any = null;

try {
    Notifications = require('expo-notifications');
    Device = require('expo-device');
} catch {
    // expo-notifications không hỗ trợ Expo Go SDK 53+
}

export async function registerForPushNotifications() {
    if (!Notifications || !Device) return null;
    if (!Device.isDevice) return null;

    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;

    if (existing !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
    }

    if (finalStatus !== 'granted') return null;

    const tokenData = await Notifications.getExpoPushTokenAsync();
    const platform = Platform.OS === 'ios' ? 'ios' : 'android' as 'ios' | 'android';

    try {
        await notificationApi.registerDevice({ token: tokenData.data, platform });
    } catch { }

    return tokenData.data;
}

export function setupNotificationHandler() {
    if (!Notifications) return;
    Notifications.setNotificationHandler({
        handleNotification: async () => ({
            shouldShowBanner: true,
            shouldShowList: true,
            shouldPlaySound: true,
            shouldSetBadge: true,
        }),
    });
}

export function addNotificationTapListener(onNavigate: () => void) {
    if (!Notifications) return { remove: () => {} };
    const sub = Notifications.addNotificationResponseReceivedListener(() => {
        onNavigate();
    });
    return sub;
}

export async function checkInitialNotificationTap(onNavigate: () => void) {
    if (!Notifications || Platform.OS === 'web') return;
    const response = await Notifications.getLastNotificationResponseAsync();
    if (response) onNavigate();
}

export async function setupAndroidChannel() {
    if (!Notifications || Platform.OS !== 'android') return;
    await Notifications.setNotificationChannelAsync('default', {
        name: 'Thông báo chung',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#0156A7',
    });
}
