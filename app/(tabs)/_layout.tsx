import { useUser } from '@/context/AuthContext';
import { useTheme } from '@/hooks/useTheme';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Image, Platform, StyleSheet, View, useWindowDimensions } from 'react-native';

export default function TabLayout() {
  const { user } = (useUser() || {}) as any;
  const colors = useTheme();
  const strokeWidth = 1.8;
  const activeSize = 26;

    const { width } = useWindowDimensions();
    const isDesktop = Platform.OS === 'web' && width > 768;

    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarStyle: isDesktop ? { display: 'none' } : {
                    backgroundColor: colors.background, // Dynamic background
                    borderTopWidth: 0,
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    elevation: 0,
                    height: Platform.OS === 'ios' ? 85 : 70,
                    paddingBottom: Platform.OS === 'ios' ? 30 : 15,
                    paddingTop: 10,
                },
                tabBarShowLabel: false,
                tabBarActiveTintColor: colors.tint,
                tabBarInactiveTintColor: colors.tabIconDefault || '#999',
            }}
        >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={activeSize} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'search' : 'search-outline'} size={activeSize} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="create"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'add-circle' : 'add-circle-outline'} size={activeSize + 4} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="reels"
        options={{
          tabBarStyle: { display: 'none' },
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'videocam' : 'videocam-outline'} size={activeSize} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ color, focused }) => (
            user?.avatar ? (
              <View style={[styles.avatarContainer, focused && { borderColor: colors.text, borderWidth: 1.5 }]}>
                <Image
                  source={{ uri: user.avatar }}
                  style={styles.avatar}
                />
              </View>
            ) : (
              <Ionicons name={focused ? 'person-circle' : 'person-circle-outline'} size={activeSize} color={color} />
            )
          ),
        }}
      />
      <Tabs.Screen
        name="marketplace"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  avatarContainer: {
    padding: 2,
    borderRadius: 15,
  },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
});
