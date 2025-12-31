import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';

interface SettingsContextType {
    settings: {
        notifications: boolean;
        sound: boolean;
        autoPlay: boolean;
        language: string;
        privateAccount: boolean;
        activityStatus: boolean;
        readReceipts: boolean;
        twoFactor: boolean;
        faceId: boolean;
    };
    updateSetting: (key: string, value: any) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

const SETTINGS_KEY = 'vibe_app_settings';

export function SettingsProvider({ children }: { children: React.ReactNode }) {
    const [settings, setSettings] = useState({
        notifications: true,
        sound: true,
        autoPlay: true,
        language: 'English',
        // Privacy
        privateAccount: false,
        activityStatus: true,
        readReceipts: true,
        // Security
        twoFactor: false,
        faceId: true,
    });

    // Load from storage on mount
    useEffect(() => {
        const loadSettings = async () => {
            try {
                const stored = await AsyncStorage.getItem(SETTINGS_KEY);
                if (stored) {
                    setSettings(JSON.parse(stored));
                }
            } catch (e) {
                console.error('Failed to load settings', e);
            }
        };
        loadSettings();
    }, []);

    // Save to storage on change
    useEffect(() => {
        AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    }, [settings]);

    const updateSetting = (key: string, value: any) => {
        setSettings(prev => ({
            ...prev,
            [key]: value
        }));
    };

    return (
        <SettingsContext.Provider value={{ settings, updateSetting }}>
            {children}
        </SettingsContext.Provider>
    );
}

export function useSettings() {
    const context = useContext(SettingsContext);
    if (context === undefined) {
        throw new Error('useSettings must be used within a SettingsProvider');
    }
    return context;
}
