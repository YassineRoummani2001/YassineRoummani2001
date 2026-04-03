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
import { LogBox, View, Text, StyleSheet, Platform, Dimensions } from 'react-native';
import Toast from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';

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
      <Toast 
        config={{
          success: (props) => (
            <View pointerEvents="box-none" style={Platform.OS === 'web' ? { width: Dimensions.get('window').width, alignItems: 'flex-end', paddingRight: 40 } : { width: '100%', alignItems: 'center' }}>
              <View style={[toastStyles.successContainer, Platform.OS === 'web' && { width: 350 }]}>
                 <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                 <View style={toastStyles.content}>
                   <Text style={toastStyles.title}>{props.text1}</Text>
                   {props.text2 && <Text style={toastStyles.message}>{props.text2}</Text>}
                 </View>
              </View>
            </View>
          ),
          error: (props) => (
            <View pointerEvents="box-none" style={Platform.OS === 'web' ? { width: Dimensions.get('window').width, alignItems: 'flex-end', paddingRight: 40 } : { width: '100%', alignItems: 'center' }}>
              <View style={[toastStyles.errorContainer, Platform.OS === 'web' && { width: 350 }]}>
                 <Ionicons name="close-circle" size={24} color="#EF4444" />
                 <View style={toastStyles.content}>
                   <Text style={toastStyles.title}>{props.text1}</Text>
                   {props.text2 && <Text style={toastStyles.message}>{props.text2}</Text>}
                 </View>
              </View>
            </View>
          ),
          info: (props) => (
            <View pointerEvents="box-none" style={Platform.OS === 'web' ? { width: Dimensions.get('window').width, alignItems: 'flex-end', paddingRight: 40 } : { width: '100%', alignItems: 'center' }}>
              <View style={[toastStyles.infoContainer, Platform.OS === 'web' && { width: 350 }]}>
                 <Ionicons name="information-circle" size={24} color="#3B82F6" />
                 <View style={toastStyles.content}>
                   <Text style={toastStyles.title}>{props.text1}</Text>
                   {props.text2 && <Text style={toastStyles.message}>{props.text2}</Text>}
                 </View>
              </View>
            </View>
          )
        }}
        topOffset={Platform.OS === 'ios' ? 60 : 40}
      />
    </GestureHandlerRootView>
  );
}

const toastStyles = StyleSheet.create({
  successContainer: {
    height: 'auto',
    minHeight: 60,
    width: '90%',
    backgroundColor: '#064E3B',
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  errorContainer: {
    height: 'auto',
    minHeight: 60,
    width: '90%',
    backgroundColor: '#450A0A',
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  infoContainer: {
    height: 'auto',
    minHeight: 60,
    width: '90%',
    backgroundColor: '#1E1B4B',
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  content: {
    marginLeft: 12,
    flex: 1,
  },
  title: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  message: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 13,
    marginTop: 2,
    lineHeight: 18,
  },
});
