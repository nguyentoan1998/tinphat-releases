import { create } from 'zustand';

export type ThemeMode = 'light';

interface ThemeStore {
    mode: ThemeMode;
    isDark: boolean;
    setMode: (mode: ThemeMode) => void;
    toggle: () => void;
}

export const useThemeStore = create<ThemeStore>()((set) => ({
    mode: 'light',
    isDark: false,
    setMode: () => set({ mode: 'light', isDark: false }),
    toggle: () => set({ mode: 'light', isDark: false }),
}));
