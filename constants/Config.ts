import Constants from 'expo-constants';
import { Platform } from 'react-native';

const getBaseUrl = () => {
    // 1. Check if we're on Web
    if (Platform.OS === 'web') {
        // If we're on localhost in the browser, connect to localhost backend
        if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
            return 'http://localhost:5000';
        }
        // Otherwise use the hardcoded IP (fallback for accessing via local network)
        return 'http://192.168.0.114:5000';
    }

    // 2. Check for Expo's hostUri (best source for LAN IP)
    const hostUri = Constants.expoConfig?.hostUri;
    if (hostUri) {
        const ip = hostUri.split(':')[0];
        return `http://${ip}:5000`;
    }

    // 3. Platform-specific fallbacks
    if (Platform.OS === 'android') {
        // 10.0.2.2 is the standard loopback to host machine in Android Emulator
        return 'http://10.0.2.2:5000';
    }

    if (Platform.OS === 'ios') {
        // Simulator can use localhost
        return 'http://localhost:5000';
    }

    // Last resort fallback
    return 'http://192.168.0.114:5000';
};

export const API_BASE_URL = getBaseUrl();
