import { API_BASE_URL } from '@/constants/Config';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import React, { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, AppStateStatus, Platform } from 'react-native';
import { useUser } from './UserContext';

Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});

interface NotificationContextType {
    unreadCount: number;
    expoPushToken: string | undefined;
    refreshCount: () => Promise<void>;
    markAsRead: (notificationId: string) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
    const userContext = useUser();
    const { user } = (userContext || {}) as any;
    const [unreadCount, setUnreadCount] = useState(0);
    const [expoPushToken, setExpoPushToken] = useState<string | undefined>('');
    const notificationListener = useRef<Notifications.Subscription | undefined>(undefined);
    const responseListener = useRef<Notifications.Subscription | undefined>(undefined);

    const fetchUnreadCount = useCallback(async () => {
        if (!user?.token) return;

        try {
            const res = await fetch(`${API_BASE_URL}/api/notifications/unread-count`, {
                headers: { 'Authorization': `Bearer ${user.token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setUnreadCount(data.count);
            }
        } catch (error) {
            console.error("Error fetching unread count", error);
        }
    }, [user?.token]);

    const registerForPushNotificationsAsync = async () => {
        let token;

        // ============================================
        // WEB PLATFORM - Push Notifications (DISABLED)
        // ============================================
        // Web push is disabled to prevent page reloads and UX breaks
        // To enable: Set up Firebase and configure properly
        if (Platform.OS === 'web') {
            // console.log('ℹ️ Web push notifications are disabled (prevents page reloads)');
            // console.log('💡 To enable web push:');
            // console.log('   1. Set up Firebase Cloud Messaging');
            // console.log('   2. Configure VAPID key');
            // console.log('   3. Update this section in NotificationContext.tsx');
            // console.log('');
            // console.log('✅ App works normally without web push');
            return undefined;
        }

        // ============================================
        // MOBILE PLATFORM - Expo Push Notifications
        // ============================================

        // Check if running on a physical device (required for push notifications)
        if (!Device.isDevice) {
            // console.log('❌ Must use physical device for Push Notifications');
            // console.log('Simulators/Emulators do not support push notifications');
            return undefined;
        }

        try {
            // Step 1: Check existing permissions
            const { status: existingStatus } = await Notifications.getPermissionsAsync();
            let finalStatus = existingStatus;

            // Step 2: Request permissions if not granted
            if (existingStatus !== 'granted') {
                const { status } = await Notifications.requestPermissionsAsync();
                finalStatus = status;
            }

            // Step 3: Check if permission was granted
            if (finalStatus !== 'granted') {
                // console.log('❌ Permission not granted for push notifications');
                return undefined;
            }

            // Step 4: Get the Expo push token
            // For Expo Go (development): Don't use projectId
            // For Production builds: Use projectId from app.json

            try {
                // Check if running in Expo Go (development)
                const isExpoGo = Constants.appOwnership === 'expo';

                let pushTokenData;

                if (isExpoGo || __DEV__) {
                    // Development mode - Expo Go
                    // console.log('📱 Getting push token for Expo Go (development)...');
                    pushTokenData = await Notifications.getExpoPushTokenAsync();
                } else {
                    // Production build - use projectId
                    const projectId = '11e72fe5-37c3-46a4-b923-49b9ba5fd3b3'; // From app.json
                    // console.log('📱 Getting push token for production build...');
                    pushTokenData = await Notifications.getExpoPushTokenAsync({
                        projectId: projectId,
                    });
                }

                token = pushTokenData.data;
                // console.log('✅ Expo Push Token:', token);
            } catch (tokenError: any) {
                console.error('❌ Error getting push token:', tokenError);

                // Common error messages and solutions
                if (tokenError.message?.includes('EXPERIENCE_NOT_FOUND')) {
                    // console.log('');
                    // console.log('🔧 EXPERIENCE_NOT_FOUND Error - Solutions:');
                    // console.log('');
                    // console.log('For Development (Expo Go):');
                    // console.log('  ✅ This error should not occur in Expo Go');
                    // console.log('  ✅ Make sure you\'re using the latest Expo Go app');
                    // console.log('');
                    // console.log('For Production Build:');
                    // console.log('  1. Run: npx eas init');
                    // console.log('  2. This will create a new project and update app.json');
                    // console.log('  3. Then run: npx eas build:configure');
                    // console.log('');
                } else if (tokenError.message?.includes('credentials')) {
                    // console.log('');
                    // console.log('🔧 Credentials Error - Solutions:');
                    // console.log('1. For iOS: Configure push notification credentials in Apple Developer');
                    // console.log('2. For Android: Ensure FCM is configured');
                    // console.log('3. Run: npx eas credentials');
                }

                return undefined;
            }

            // Step 5: Configure Android notification channel (required for Android 8.0+)
            if (Platform.OS === 'android') {
                await Notifications.setNotificationChannelAsync('default', {
                    name: 'Default',
                    importance: Notifications.AndroidImportance.MAX,
                    vibrationPattern: [0, 250, 250, 250],
                    lightColor: '#FF231F7C',
                    sound: 'default',
                    enableVibrate: true,
                    showBadge: true,
                });
                // console.log('✅ Android notification channel configured');
            }

            return token;
        } catch (error: any) {
            console.error('❌ Unexpected error in registerForPushNotificationsAsync:', error);
            return undefined;
        }
    };

    const sendPushTokenToBackend = async (token: string) => {
        if (!user?.token) return;
        try {
            await fetch(`${API_BASE_URL}/api/auth/push-token`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${user.token}`
                },
                body: JSON.stringify({
                    token,
                    platform: Platform.OS // Send platform info to backend
                })
            });
            // console.log('✅ Push token sent to backend');
        } catch (error) {
            console.error("Error sending push token to backend:", error);
        }
    };

    useEffect(() => {
        if (user) {
            fetchUnreadCount();

            registerForPushNotificationsAsync().then(token => {
                setExpoPushToken(token);
                if (token) sendPushTokenToBackend(token);
            });
        } else {
            setUnreadCount(0);
            setExpoPushToken(undefined);
        }
    }, [user]);

    // Notification Listeners (Mobile only)
    useEffect(() => {
        if (Platform.OS === 'web') return; // Skip for web (handled by Firebase)

        notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
            // When app is foregrounded and notification comes
            fetchUnreadCount();
        });

        responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
            // When user taps notification
            // console.log('Notification tapped:', response);
            // Navigate to screen based on response.notification.request.content.data
        });

        return () => {
            notificationListener.current?.remove();
            responseListener.current?.remove();
        };
    }, []);

    // Refetch on app foreground
    useEffect(() => {
        const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
            if (nextAppState === 'active' && user) {
                fetchUnreadCount();
            }
        });

        return () => {
            subscription.remove();
        };
    }, [user]);

    const markAsRead = useCallback(async (notificationId: string) => {
        // Optimistic update
        setUnreadCount(prev => Math.max(0, prev - 1));

        if (!user?.token) return;

        try {
            await fetch(`${API_BASE_URL}/api/notifications/${notificationId}/read`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${user.token}` }
            });
        } catch (error) {
            console.error("Error marking notification read", error);
        }
    }, [user?.token]);

    const contextValue = useMemo(() => ({
        unreadCount,
        expoPushToken,
        refreshCount: fetchUnreadCount,
        markAsRead
    }), [unreadCount, expoPushToken, fetchUnreadCount, markAsRead]);

    return (
        <NotificationContext.Provider value={contextValue}>
            {children}
        </NotificationContext.Provider>
    );
};

export const useNotifications = () => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotifications must be used within a NotificationProvider');
    }
    return context;
};
