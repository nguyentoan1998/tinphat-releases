// Glassmorphism Design Tokens
import { BlurTint } from 'expo-blur';

export const GlassTokens = {
    light: {
        card: {
            background: 'rgba(255, 255, 255, 0.85)',
            backgroundSolid: 'rgba(255, 255, 255, 0.95)',
            border: 'rgba(1, 86, 167, 0.6)', // VietinBank Blue border (increased from 0.3)
            blur: 40 as number,
            tint: 'light' as BlurTint,
        },
        input: {
            background: 'rgba(255, 255, 255, 0.9)',
            border: 'rgba(1, 86, 167, 0.8)', // VietinBank Blue border (increased from 0.5)
            placeholder: 'rgba(89, 103, 123, 0.6)', // Secondary text color
            text: '#212529', // Primary text color
        },
        overlay: {
            background: 'rgba(0, 0, 0, 0.4)',
            blur: 20,
        },
        text: {
            primary: '#212529', // Primary text color
            secondary: '#59677B', // Secondary text color
            muted: 'rgba(89, 103, 123, 0.5)', // Muted text color
        },
    },
    dark: {
        card: {
            background: 'rgba(255, 255, 255, 0.95)', // Override dark theme with light theme
            backgroundSolid: 'rgba(255, 255, 255, 0.98)',
            border: 'rgba(1, 86, 167, 0.6)', // VietinBank Blue border (increased from 0.3)
            blur: 40 as number,
            tint: 'light' as BlurTint,
        },
        input: {
            background: 'rgba(255, 255, 255, 0.9)',
            border: 'rgba(1, 86, 167, 0.8)', // VietinBank Blue border (increased from 0.5)
            placeholder: 'rgba(89, 103, 123, 0.6)', // Secondary text color
            text: '#59677B',
        },
        overlay: {
            background: 'rgba(0, 0, 0, 0.4)',
            blur: 20,
        },
        text: {
            primary: '#212529', // Primary text color
            secondary: '#59677B', // Secondary text color
            muted: 'rgba(89, 103, 123, 0.5)', // Muted text color
        },
    },
};

// Gradient presets
export const Gradients = {
    primary: ['#4338CA', '#6366F1', '#818CF8'] as const,
    secondary: ['#0D9488', '#14B8A6', '#5EEAD4'] as const,
    sunset: ['#F97316', '#EF4444', '#EC4899'] as const,
    aurora: ['#1E1B4B', '#312E81', '#4338CA'] as const,
    ocean: ['#0C4A6E', '#0284C7', '#38BDF8'] as const,
    mesh: ['#0F172A', '#1E1B4B', '#312E81'] as const,
    authBg: ['#0F0C29', '#302B63', '#24243E'] as const,
    cardGlow: ['rgba(99, 102, 241, 0.3)', 'rgba(99, 102, 241, 0)'] as const,
};

// Animation spring configs
export const Springs = {
    gentle: { damping: 20, stiffness: 150, mass: 0.5 },
    bouncy: { damping: 12, stiffness: 200, mass: 0.4 },
    snappy: { damping: 15, stiffness: 400, mass: 0.3 },
    slow: { damping: 20, stiffness: 80, mass: 0.8 },
};

// Animation timing configs
export const Timings = {
    fast: 200,
    normal: 350,
    slow: 600,
    entrance: 500,
};
