import { BlurTint } from 'expo-blur';
import { StatusBarStyle } from 'expo-status-bar';

// Explicit interface so both dark and light are assignable to the same type
export interface AppTheme {
    screenBg: string;
    gradientColors: readonly [string, string, string];
    cardBg: string;
    cardBorder: string;
    inputBg: string;
    textPrimary: string;
    textSecondary: string;
    textMuted: string;
    textAccent: string;
    divider: string;
    iconBg: (color: string) => string;
    chevronColor: string;
    statusBar: StatusBarStyle;
    blurTint: BlurTint;
    orbColor: string;
}

const defaultLightTheme: AppTheme = {
    screenBg: '#FFFFFF',
    gradientColors: ['#F0F8FF', '#F9F9F9', '#FFFFFF'],
    cardBg: '#FFFFFF',
    cardBorder: 'rgba(1, 86, 167, 0.45)', // VietinBank Blue (more visible than #E5E7EB)
    inputBg: '#F9F9F9',
    textPrimary: '#212529',
    textSecondary: '#59677B',
    textMuted: '#9CA3AF',
    textAccent: '#0156A7',
    divider: '#E5E7EB',
    iconBg: (color: string) => `${color}18`,
    chevronColor: '#59677B',
    statusBar: 'dark',
    blurTint: 'light',
    orbColor: 'rgba(1, 86, 167, 0.05)',
};

export const ThemeColors: { dark: AppTheme; light: AppTheme } = {
    dark: defaultLightTheme,
    light: defaultLightTheme,
};
