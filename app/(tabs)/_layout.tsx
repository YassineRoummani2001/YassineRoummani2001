import { useUser } from '@/context/UserContext';
import { useTheme } from '@/hooks/useTheme';
import { Tabs } from 'expo-router';
import { Clapperboard, Home, PlusSquare, Search, User } from 'lucide-react-native';
import { Image, Platform, StyleSheet, View } from 'react-native';

export default function TabLayout() {
  const { user } = (useUser() || {}) as any;
  const colors = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
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
            <Home size={28} color={color} strokeWidth={focused ? 3 : 2} />
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <Search size={28} color={color} strokeWidth={focused ? 3 : 2} />
          ),
        }}
      />
      <Tabs.Screen
        name="create"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <PlusSquare size={28} color={color} strokeWidth={focused ? 3 : 2} />
          ),
        }}
      />
      <Tabs.Screen
        name="reels"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <Clapperboard size={28} color={color} strokeWidth={focused ? 3 : 2} />
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
              <User size={28} color={color} strokeWidth={focused ? 3 : 2} />
            )
          ),
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
