import { Colors } from '@/constants/Colors';
import React, { createContext, useContext, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';

type ThemeType = 'light' | 'dark';

interface ThemeContextType {
    theme: ThemeType;
    toggleTheme: () => void;
    setTheme: (theme: ThemeType) => void;
    primaryColor: string;
    setPrimaryColor: (color: string) => void;
    colors: typeof Colors.light;
    isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const THEME_COLORS = [
    '#6C5CE7', // Default Purple
    '#0984e3', // Blue
    '#00cec9', // Teal
    '#00b894', // Green
    '#fdcb6e', // Yellow/Orange
    '#e17055', // Orange
    '#d63031', // Red
    '#e84393', // Pink
];

export function CustomThemeProvider({ children }: { children: React.ReactNode }) {
    const systemScheme = useColorScheme();
    const [theme, setThemeState] = useState<ThemeType>('light');
    const [primaryColor, setPrimaryColor] = useState('#6C5CE7');

    const toggleTheme = () => {
        setThemeState(prev => (prev === 'light' ? 'dark' : 'light'));
    };

    const setTheme = (newTheme: ThemeType) => {
        setThemeState(newTheme);
    };

    const isDark = theme === 'dark';

    // Memoize colors to prevent unnecessary re-renders
    const colors = useMemo(() => {
        const baseColors = isDark ? Colors.dark : Colors.light;
        return {
            ...baseColors,
            primary: primaryColor,
            tint: isDark ? '#FFFFFF' : primaryColor, // tint logic from Colors.ts
            // Update other derived colors if necessary
            tabIconSelected: isDark ? '#FFFFFF' : primaryColor,
        };
    }, [isDark, primaryColor]);

    return (
        <ThemeContext.Provider value={{
            theme,
            toggleTheme,
            setTheme,
            primaryColor,
            setPrimaryColor,
            colors,
            isDark
        }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useThemeContext() {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        // Force light mode fallback
        return {
            theme: 'light',
            toggleTheme: () => { },
            setTheme: () => { },
            primaryColor: '#6C5CE7',
            setPrimaryColor: () => { },
            colors: Colors.light,
            isDark: false
        } as ThemeContextType;
    }
    return context;
}
