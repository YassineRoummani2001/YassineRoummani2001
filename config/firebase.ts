import Constants from 'expo-constants';
import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, isSupported, onMessage } from 'firebase/messaging';
import { Platform } from 'react-native';

// Get Firebase config from app.json
const firebaseConfig = Constants.expoConfig?.web?.config?.firebase;

// Initialize Firebase (only on web)
let app;
let messaging;

if (Platform.OS === 'web' && firebaseConfig) {
    try {
        app = initializeApp(firebaseConfig);

        // Check if messaging is supported
        isSupported().then((supported) => {
            if (supported && typeof window !== 'undefined') {
                messaging = getMessaging(app);
            }
        });
    } catch (error) {
        console.error('Firebase initialization error:', error);
    }
}

/**
 * Request notification permission and get FCM token for web
 */
export const getWebPushToken = async (vapidKey: string): Promise<string | undefined> => {
    if (!messaging) {
        // console.log('Firebase messaging not initialized');
        return undefined;
    }

    try {
        // Request permission
        const permission = await Notification.requestPermission();

        if (permission !== 'granted') {
            // console.log('Notification permission denied');
            return undefined;
        }

        // Get FCM token
        const token = await getToken(messaging, {
            vapidKey: vapidKey,
        });

        // console.log('✅ Web Push Token (FCM):', token);
        return token;
    } catch (error) {
        console.error('Error getting web push token:', error);
        return undefined;
    }
};

/**
 * Listen for foreground messages
 */
export const onMessageListener = () =>
    new Promise((resolve) => {
        if (!messaging) {
            return;
        }

        onMessage(messaging, (payload) => {
            // console.log('Foreground message received:', payload);
            resolve(payload);
        });
    });

export { app, messaging };
