import { Colors } from '@/constants/Colors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useMemo, useState } from 'react';
import { useColorScheme, Platform } from 'react-native';

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
    const [primaryColor, setPrimaryColorState] = useState('#6C5CE7');
    const [isLoaded, setIsLoaded] = useState(false);

    // Load persisted theme on mount
    React.useEffect(() => {
        const loadTheme = async () => {
            try {
                const storedTheme = await AsyncStorage.getItem('vibe_theme');
                const storedColor = await AsyncStorage.getItem('vibe_primary_color');

                if (storedTheme) {
                    setThemeState(storedTheme as ThemeType);
                } else if (systemScheme) {
                    // Optional: Default to system if nothing stored
                    // setThemeState(systemScheme);
                }

                if (storedColor) {
                    setPrimaryColorState(storedColor);
                }
            } catch (e) {
                console.error("Failed to load theme", e);
            } finally {
                setIsLoaded(true);
            }
        };
        loadTheme();
    }, []);

    const toggleTheme = () => {
        setThemeState(prev => {
            const newTheme = prev === 'light' ? 'dark' : 'light';
            AsyncStorage.setItem('vibe_theme', newTheme);
            return newTheme;
        });
    };

    const setTheme = (newTheme: ThemeType) => {
        setThemeState(newTheme);
        AsyncStorage.setItem('vibe_theme', newTheme);
    };

    const setPrimaryColor = (color: string) => {
        setPrimaryColorState(color);
        AsyncStorage.setItem('vibe_primary_color', color);
    };

    const isDark = theme === 'dark';

    // Injection of matching scrollbar color for web
    React.useEffect(() => {
        if (Platform.OS === 'web') {
            const styleId = 'custom-scrollbar-style';
            let styleTag = document.getElementById(styleId);
            if (!styleTag) {
                styleTag = document.createElement('style');
                styleTag.id = styleId;
                document.head.appendChild(styleTag);
            }

            const trackColor = isDark ? '#1a1a1a' : '#f0f0f0';
            const thumbHoverColor = primaryColor + 'cc'; // Slight transparency on hover

            styleTag.innerHTML = `
                ::-webkit-scrollbar {
                    width: 8px;
                    height: 8px;
                }
                ::-webkit-scrollbar-track {
                    background: ${trackColor};
                }
                ::-webkit-scrollbar-thumb {
                    background: ${primaryColor}99;
                    border-radius: 10px;
                }
                ::-webkit-scrollbar-thumb:hover {
                    background: ${primaryColor};
                }
                * {
                  scrollbar-width: thin;
                  scrollbar-color: ${primaryColor}99 ${trackColor};
                }
            `;
        }
    }, [isDark, primaryColor]);

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

    if (!isLoaded) {
        return null;
    }

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
