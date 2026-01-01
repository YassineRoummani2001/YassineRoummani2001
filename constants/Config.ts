import Constants from 'expo-constants';
import { Platform } from 'react-native';

const getBaseUrl = () => {
    // For development, use your computer's local IP address
    // This allows physical devices and emulators to connect
    const DEV_IP = '192.168.0.184'; // Your computer's IP on local network

    // If running in Expo Go or Build, hostUri contains the machine IP
    const hostUri = Constants.expoConfig?.hostUri;
    const localhost = hostUri?.split(':')[0] || DEV_IP;

    if (Platform.OS === 'android') {
        // Android Emulator: Use 10.0.2.2 (maps to host's localhost)
        // Physical Device: Use computer's IP
        // Expo Go: Use hostUri if available

        if (hostUri) {
            return `http://${localhost}:5000`;
        }
        // For Android Emulator, 10.0.2.2 maps to the host machine's localhost
        // For physical devices, use the DEV_IP
        return `http://${DEV_IP}:5000`;
    }

    if (Platform.OS === 'ios') {
        if (hostUri) {
            return `http://${localhost}:5000`;
        }
        // iOS Simulator can use localhost
        // Physical iOS device needs the IP
        return `http://${DEV_IP}:5000`;
    }

    // Web - during development, use the same IP so it works on local network
    return `http://${DEV_IP}:5000`;
};

export const API_BASE_URL = getBaseUrl();
