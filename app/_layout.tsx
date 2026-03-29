// Root Layout
import { CustomThemeProvider, useThemeContext } from '@/context/ThemeContext';
import '@/i18n';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';


import ErrorBoundary from '@/components/ErrorBoundary';
import { NetworkBanner } from '@/components/NetworkBanner';
import { WebLayout } from '@/components/WebLayout';
import { UserProvider, useUser } from '@/context/AuthContext';
import { MessagesProvider } from '@/context/MessagesContext';
import { NetworkProvider } from '@/context/NetworkContext';
import { NotificationProvider } from '@/context/NotificationContext';
import { ReelProvider } from '@/context/ReelContext';
import { SettingsProvider } from '@/context/SettingsContext';
import ErrorHandler from '@/utils/ErrorHandler';
import { LogBox } from 'react-native';
import Toast from 'react-native-toast-message';

// Initialize Global Error Handling immediately
ErrorHandler.init();

// Ignore specific warnings
LogBox.ignoreLogs([
  'Video component from `expo-av` is deprecated',
]);

// Root Layout Configuration
export const unstable_settings = {
  anchor: '(tabs)',
};

function RootLayoutNav() {
  // console.log('📱 RootLayoutNav functions called');
  const userContext = useUser();
  // console.log('👤 useUser in RootLayoutNav returned:', !!userContext);
  const { user, loading } = (userContext || {}) as any;
  const segments = useSegments();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  // Track when component is mounted
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (loading || !mounted) return;

    const inAuthGroup = segments[0] === 'auth';

    if (!user && !inAuthGroup) {
      // Redirect to the sign-in page if the user is not signed in
      router.replace('/auth/login');
    } else if (user && inAuthGroup) {
      // Redirect away from the sign-in page if the user is signed in
      router.replace('/(tabs)');
    }
  }, [user, loading, segments, mounted]);

  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      <Stack.Screen name="create" options={{ presentation: 'fullScreenModal', headerShown: false }} />
      <Stack.Screen name="create-reel" options={{ presentation: 'fullScreenModal', headerShown: false }} />
      <Stack.Screen name="chat" options={{ headerShown: false }} />
      <Stack.Screen name="story-create" options={{ presentation: 'fullScreenModal', headerShown: false }} />
      <Stack.Screen name="story-view" options={{ presentation: 'fullScreenModal', headerShown: false }} />
      <Stack.Screen name="media-view" options={{ presentation: 'transparentModal', animation: 'fade', headerShown: false }} />
      <Stack.Screen name="edit-profile" options={{ presentation: 'modal', headerShown: false }} />
      <Stack.Screen name="discover-people" options={{ headerShown: false }} />
      <Stack.Screen name="notifications" options={{ headerShown: false }} />
      <Stack.Screen name="follow-requests" options={{ headerShown: false }} />
      <Stack.Screen name="message/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="message/user-info/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="message/shared-media/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="user/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="users-list" options={{ headerShown: false }} />
      <Stack.Screen name="qr-code" options={{ headerShown: false }} />
      <Stack.Screen name="settings" options={{ headerShown: false }} />
      <Stack.Screen name="privacy" options={{ headerShown: false }} />
      <Stack.Screen name="security" options={{ headerShown: false }} />
      <Stack.Screen name="help" options={{ headerShown: false }} />
      <Stack.Screen name="about" options={{ headerShown: false }} />
      <Stack.Screen name="saved" options={{ headerShown: false }} />
      <Stack.Screen name="activity" options={{ headerShown: false }} />
      <Stack.Screen name="blocked-users" options={{ headerShown: false }} />
      <Stack.Screen name="my-stories" options={{ headerShown: false }} />
      <Stack.Screen name="auth/login" options={{ headerShown: false, gestureEnabled: false }} />
      <Stack.Screen name="auth/signup" options={{ headerShown: false }} />
      <Stack.Screen name="auth/forgot-password" options={{ headerShown: false }} />
      <Stack.Screen name="post/[id]" options={{ headerShown: false }} />
    </Stack>
  );
}

function InnerLayout() {
  const { isDark } = useThemeContext();
  // console.log('🏠 InnerLayout rendering. Wrapping UserProvider.');

  return (
    <ThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
      <UserProvider>
        <NetworkProvider>
          <SettingsProvider>
            <NotificationProvider>
              <MessagesProvider>
                <ReelProvider>
                  <NetworkBanner />
                  <WebLayout>
                    <RootLayoutNav />
                  </WebLayout>
                  <StatusBar style={isDark ? "light" : "dark"} />
                  <Toast />
                </ReelProvider>
              </MessagesProvider>
            </NotificationProvider>
          </SettingsProvider>
        </NetworkProvider>
      </UserProvider>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  // console.log('🌳 RootLayout rendering');
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <CustomThemeProvider>
        <ErrorBoundary>
          <InnerLayout />
        </ErrorBoundary>
      </CustomThemeProvider>
    </GestureHandlerRootView>
  );
}
