import { Platform, ViewStyle, TextStyle } from 'react-native';
import { Colors } from './Colors';

// Spacing scale (8pt grid system)
export const Spacing = {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
    xxxl: 48,
};

// Touch targets (mobile-first, following HIG & Material guidelines)
export const TouchTargets = {
    min: 48,           // Minimum touch target for both iOS (44pt) and Android (48dp)
    comfortable: 56,   // Comfortable target for primary actions
    large: 64,         // Large target for critical/destructive actions
};

// Border radius (updated for modern rounded design)
export const BorderRadius = {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,       // Increased for rounder cards
    xxl: 28,      // Very rounded for buttons
    full: 9999,
};

// Font sizes
export const FontSizes = {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    xxxl: 32,
    huge: 40,     // For large value displays
};

// Font weights
export const FontWeights = {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    extrabold: '800' as const,
};

// Platform-specific fonts
export const Fonts = {
    regular: Platform.select({
        ios: 'SF Pro Text',
        android: 'Roboto',
        default: 'System',
    }),
    medium: Platform.select({
        ios: 'SF Pro Text',
        android: 'Roboto',
        default: 'System',
    }),
    semibold: Platform.select({
        ios: 'SF Pro Text',
        android: 'Roboto',
        default: 'System',
    }),
    bold: Platform.select({
        ios: 'SF Pro Display',
        android: 'Roboto',
        default: 'System',
    }),
};

// Shadow/Elevation (platform-specific)
export const Shadows = {
    none: Platform.select({
        ios: {},
        android: { elevation: 0 },
        default: {},
    }),
    small: Platform.select({
        ios: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.06,
            shadowRadius: 3,
        },
        android: {
            elevation: 2,
        },
        default: {},
    }),
    medium: Platform.select({
        ios: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.08,
            shadowRadius: 6,
        },
        android: {
            elevation: 4,
        },
        default: {},
    }),
    large: Platform.select({
        ios: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.12,
            shadowRadius: 12,
        },
        android: {
            elevation: 8,
        },
        default: {},
    }),
};

// === NEW: Reusable Component Styles ===

// Button variants (based on reference images)
export const ButtonStyles = {
    // Primary filled button
    primaryFilled: {
        backgroundColor: Colors.primary[500],
        borderRadius: BorderRadius.xxl,
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.xl,
        alignItems: 'center' as const,
        justifyContent: 'center' as const,
        ...Shadows.small,
    } as ViewStyle,

    // Primary outlined button  
    primaryOutlined: {
        backgroundColor: 'transparent',
        borderRadius: BorderRadius.xxl,
        borderWidth: 1.5,
        borderColor: Colors.primary[500],
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.xl,
        alignItems: 'center' as const,
        justifyContent: 'center' as const,
    } as ViewStyle,

    // Text styles for buttons
    primaryFilledText: {
        color: Colors.neutral.white,
        fontSize: FontSizes.base,
        fontWeight: FontWeights.semibold,
    } as TextStyle,

    primaryOutlinedText: {
        color: Colors.primary[500],
        fontSize: FontSizes.base,
        fontWeight: FontWeights.semibold,
    } as TextStyle,
};

// Card styles
export const CardStyles = {
    default: {
        backgroundColor: Colors.neutral.white,
        borderRadius: BorderRadius.xl,
        padding: Spacing.lg,
        ...Shadows.small,
    } as ViewStyle,

    elevated: {
        backgroundColor: Colors.neutral.white,
        borderRadius: BorderRadius.xl,
        padding: Spacing.lg,
        ...Shadows.medium,
    } as ViewStyle,
};

// Filter pill/chip styles
export const FilterStyles = {
    pill: {
        flexDirection: 'row' as const,
        alignItems: 'center' as const,
        backgroundColor: Colors.neutral.white,
        borderRadius: BorderRadius.full,
        borderWidth: 1,
        borderColor: Colors.neutral.gray200,
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.md,
    } as ViewStyle,

    pillActive: {
        flexDirection: 'row' as const,
        alignItems: 'center' as const,
        backgroundColor: Colors.primary[50],
        borderRadius: BorderRadius.full,
        borderWidth: 1,
        borderColor: Colors.primary[500],
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.md,
    } as ViewStyle,

    pillText: {
        fontSize: FontSizes.sm,
        color: Colors.neutral.gray700,
        fontWeight: FontWeights.medium,
    } as TextStyle,

    pillTextActive: {
        fontSize: FontSizes.sm,
        color: Colors.primary[500],
        fontWeight: FontWeights.medium,
    } as TextStyle,
};

// Value display styles (for numbers with labels)
export const ValueStyles = {
    container: {
        alignItems: 'flex-start' as const,
    } as ViewStyle,

    largeValue: {
        fontSize: FontSizes.huge,
        fontWeight: FontWeights.bold,
        color: Colors.neutral.gray900,
    } as TextStyle,

    mediumValue: {
        fontSize: FontSizes.xxl,
        fontWeight: FontWeights.bold,
        color: Colors.neutral.gray900,
    } as TextStyle,

    smallLabel: {
        fontSize: FontSizes.xs,
        color: Colors.neutral.gray500,
        marginTop: Spacing.xs,
    } as TextStyle,

    // Colored values
    positiveValue: {
        color: Colors.semantic.success,
    } as TextStyle,

    negativeValue: {
        color: Colors.semantic.error,
    } as TextStyle,
};

export default {
    Spacing,
    TouchTargets,
    BorderRadius,
    FontSizes,
    FontWeights,
    Fonts,
    Shadows,
    ButtonStyles,
    CardStyles,
    FilterStyles,
    ValueStyles,
};
