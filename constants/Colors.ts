// Design tokens - Colors (Updated based on new UI Design Plan)
export const Colors = {
    // Primary brand colors - VietinBank Blue
    primary: {
        50: '#F0F8FF', // Light Blue Gradient Start
        100: '#DCEBFA',
        200: '#B8D7F5',
        300: '#8FBDF0',
        400: '#5C9BE8',
        500: '#0156A7',  // VietinBank Blue - Main brand color
        600: '#014A94',
        700: '#013B78',
        800: '#012B5C',
        900: '#001D40',
    },

    // Secondary accent
    secondary: {
        50: '#F8FAFC',
        100: '#F1F5F9',
        500: '#59677B',  // Secondary Text
        600: '#475569',
        700: '#334155',
    },

    // Neutral grays
    neutral: {
        white: '#FFFFFF',
        gray50: '#F9F9F9', // Sub Background
        gray100: '#F3F4F6',
        gray200: '#E5E7EB',
        gray300: '#D1D5DB',
        gray400: '#9CA3AF',
        gray500: '#59677B', // Secondary Text
        gray600: '#4B5563',
        gray700: '#374151',
        gray800: '#212529', // Primary Text
        gray900: '#111827',
        black: '#000000',
    },

    // Semantic colors
    semantic: {
        success: '#0ACF83', // Status Green
        successLight: '#DCFCE7',
        error: '#D0202F', // Notification Red
        errorLight: '#FEE2E2',
        warning: '#F9C74F', // Crown Gold
        warningLight: '#FEF3C7',
        info: '#0156A7', // Info mapped to primary
        infoLight: '#F0F8FF',
    },
};

// Background colors
export const Backgrounds = {
    primary: Colors.neutral.white, // #FFFFFF
    secondary: Colors.neutral.gray50, // #F9F9F9
    dark: Colors.neutral.gray900,
};

// Text colors  
export const TextColors = {
    primary: Colors.neutral.gray800, // #212529
    secondary: Colors.neutral.gray500, // #59677B
    tertiary: Colors.neutral.gray400,
    inverse: Colors.neutral.white, // Text on Blue #FFFFFF
    brand: Colors.primary[500],
};

export default Colors;
