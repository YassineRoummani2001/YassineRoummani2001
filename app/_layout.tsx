// Root Layout
import { CustomThemeProvider, useThemeContext } from '@/context/ThemeContext';
import '@/i18n';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import Head from 'expo-router/head';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';
import { AudioModule } from 'expo-audio';

// Patch AudioPlayer constructor for version compatibility
if (AudioModule && AudioModule.AudioPlayer) {
  const NativeAudioPlayer = AudioModule.AudioPlayer;
  // @ts-ignore
  AudioModule.AudioPlayer = function (...args) {
    if (args.length === 4) {
      try {
        // @ts-ignore
        return new NativeAudioPlayer(...args);
      } catch (err) {
        // Fallback for older native modules that expect 3 args
        console.log('[AudioPatch] constructor failed with 4 args, trying 3');
        // @ts-ignore
        return new NativeAudioPlayer(args[0], args[1], args[2]);
      }
    }
    // @ts-ignore
    return new NativeAudioPlayer(...args);
  };
  // Ensure the prototype is preserved so instance checks and methods work
  AudioModule.AudioPlayer.prototype = NativeAudioPlayer.prototype;
}


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
  '"shadow*" style props are deprecated. Use "boxShadow".',
  '"textShadow*" style props are deprecated. Use "textShadow".',
  '[expo-notifications] Listening to push token changes is not yet fully supported on web. Adding a listener will have no effect.',
]);

// Root Layout Configuration
export const unstable_settings = {
  anchor: '(tabs)',
};

function RootLayoutNav() {
  const userContext = useUser();
  const { user, loading } = (userContext || {}) as any;
  const segments = useSegments();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (loading || !mounted) return;

    const inAuthGroup = segments[0] === 'auth';

    if (!user && !inAuthGroup) {
      router.replace('/auth/login');
    } else if (user && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [user, loading, segments, mounted]);

  return (
    <>
      <Head>
        <title>Vibe</title>
      </Head>
      <Stack screenOptions={{ title: 'Vibe' }}>
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
        <Stack.Screen name="message/group-info/[id]" options={{ headerShown: false }} />
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
    </>
  );
}

function InnerLayout() {
  const { isDark } = useThemeContext();

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

const renderPremiumToast = (props: any, type: 'success' | 'error' | 'info') => {
  const icons = {
    success: { name: 'checkmark-circle' as const, color: '#10B981', bg: 'rgba(16, 185, 129, 0.1)' },
    error: { name: 'close-circle' as const, color: '#EF4444', bg: 'rgba(239, 68, 68, 0.1)' },
    info: { name: 'information-circle' as const, color: '#3B82F6', bg: 'rgba(59, 130, 246, 0.1)' }
  };
  const config = icons[type];

  return (
    <View style={toastStyles.wrapper}>
      <View style={toastStyles.premiumContainer}>
        <View style={[toastStyles.iconCircle, { backgroundColor: config.bg }]}>
          <Ionicons name={config.name} size={20} color={config.color} />
        </View>
        <View style={toastStyles.content}>
          <Text style={toastStyles.title} numberOfLines={1}>{props.text1}</Text>
          {props.text2 && <Text style={toastStyles.message} numberOfLines={2}>{props.text2}</Text>}
        </View>
        <View style={toastStyles.dismissIcon}>
          <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.3)" />
        </View>
      </View>
    </View>
  );
};

export default function RootLayout() {
  const isWeb = Platform.OS === 'web';

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <CustomThemeProvider>
        <ErrorBoundary>
          <InnerLayout />
        </ErrorBoundary>
      </CustomThemeProvider>
      <Toast 
        config={{
          success: (props) => renderPremiumToast(props, 'success'),
          error: (props) => renderPremiumToast(props, 'error'),
          info: (props) => renderPremiumToast(props, 'info'),
        }}
        position={isWeb ? 'bottom' : 'top'}
        topOffset={!isWeb ? (Platform.OS === 'ios' ? 64 : 45) : undefined}
        bottomOffset={isWeb ? 40 : undefined}
        visibilityTime={3000}
      />
    </GestureHandlerRootView>
  );
}

const toastStyles = StyleSheet.create({
  wrapper: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  premiumContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(20, 20, 25, 0.94)',
    borderRadius: 24,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 20,
    width: 'auto',
    maxWidth: 340,
    minHeight: 50,
    alignSelf: 'center',
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    marginLeft: 10,
    flex: 1,
    marginRight: 6,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  message: {
    color: 'rgba(255, 255, 255, 0.65)',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 0,
    lineHeight: 15,
  },
  dismissIcon: {
    paddingLeft: 4,
  },
});
