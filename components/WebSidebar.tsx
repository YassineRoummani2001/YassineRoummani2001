import React from 'react';
import { View, Text, StyleSheet, Platform, Pressable, Image, ScrollView } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeContext } from '@/context/ThemeContext';
import { useUser } from '@/context/AuthContext';
import { useState } from 'react';

export default function WebSidebar() {
    if (Platform.OS !== 'web') return null;

    const [hoveredItem, setHoveredItem] = useState<string | null>(null);

    const router = useRouter();
    const pathname = usePathname();
    const { colors, isDark } = useThemeContext();
    const { user } = (useUser() || {}) as any;

    const menuItems = [
        { name: 'Home', icon: 'home', outline: 'home-outline', path: '/(tabs)' },
        { name: 'Search', icon: 'search', outline: 'search-outline', path: '/(tabs)/search' },
        { name: 'Marketplace', icon: 'bag-handle', outline: 'bag-handle-outline', path: '/marketplace' },
        { name: 'Reels', icon: 'play-circle', outline: 'play-circle-outline', path: '/(tabs)/reels' },
        { name: 'Messages', icon: 'chatbubble', outline: 'chatbubble-outline', path: '/chat' },
        { name: 'Notifications', icon: 'heart', outline: 'heart-outline', path: '/notifications' },
        { name: 'Create', icon: 'add-circle', outline: 'add-circle-outline', path: '/(tabs)/create' },
    ];

    const isActive = (path: string) => {
        if (path === '/(tabs)' && (pathname === '/' || pathname === '/(tabs)')) return true;
        return pathname === path || pathname.startsWith(path);
    };

    return (
        <View style={[
            styles.sidebar,
            {
                backgroundColor: isDark ? '#000' : '#fff',
                borderRightColor: isDark ? '#222' : '#eee',
            }
        ]}>
            {/* Logo */}
            <Pressable
                onPress={() => router.push('/(tabs)' as any)}
                style={styles.logoContainer}
            >
                <View style={[styles.logoIconBg, { backgroundColor: colors.primary }]}>
                     <Ionicons name="flash" size={20} color="white" />
                </View>
                <Text style={[styles.logoText, { color: colors.text }]}>Vibe</Text>
            </Pressable>

            {/* Navigation Menu */}
            <ScrollView
                style={styles.menuContainer}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.menuContent}
            >
                {menuItems.map((item) => {
                    const active = isActive(item.path);
                    const isHovered = hoveredItem === item.name;

                    return (
                        <Pressable
                            key={item.name}
                            onPress={() => router.push(item.path as any)}
                            onHoverIn={() => setHoveredItem(item.name)}
                            onHoverOut={() => setHoveredItem(null)}
                            style={[
                                styles.menuItem,
                                isHovered && { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' },
                                active && { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)' }
                            ]}
                        >
                            <View style={styles.menuIconWrap}>
                                <Ionicons
                                    name={(active ? item.icon : item.outline) as any}
                                    size={24}
                                    color={active ? colors.primary : isDark ? '#bbb' : '#555'}
                                />
                            </View>
                            <Text style={[
                                styles.menuText,
                                { color: active ? colors.primary : colors.text },
                                active && { fontWeight: '800' },
                            ]}>
                                {item.name}
                            </Text>
                        </Pressable>
                    );
                })}
            </ScrollView>

            {/* User Card (Bottom) */}
            {user && (
                <Pressable
                    onPress={() => router.push('/(tabs)/profile' as any)}
                    onHoverIn={() => setHoveredItem('user-card')}
                    onHoverOut={() => setHoveredItem(null)}
                    style={[
                        styles.userCard,
                        hoveredItem === 'user-card' && {
                            backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)',
                        },
                    ]}
                >
                    <Image
                        source={{ uri: user.avatar || 'https://i.pravatar.cc/150' }}
                        style={styles.userAvatar}
                    />
                    <View style={styles.userInfo}>
                        <Text style={[styles.userName, { color: colors.text }]} numberOfLines={1}>
                            {user.name || 'User'}
                        </Text>
                        <Text style={[styles.userHandle, { color: colors.textSecondary }]} numberOfLines={1}>
                            @{user.handle || 'user'}
                        </Text>
                    </View>
                    <Ionicons name="ellipsis-horizontal" size={18} color={colors.textSecondary} />
                </Pressable>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    sidebar: {
        width: 280,
        height: '100vh' as any,
        paddingHorizontal: 20,
        paddingTop: 40,
        paddingBottom: 24,
        position: 'fixed' as any,
        left: 0,
        top: 0,
        borderRightWidth: 1,
        zIndex: 100,
        display: 'flex' as any,
        flexDirection: 'column',
    },
    logoContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 40,
        gap: 12,
        paddingHorizontal: 10,
    },
    logoIconBg: {
        width: 36,
        height: 36,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    logoText: {
        fontSize: 26,
        fontWeight: '900',
        letterSpacing: -1,
    },
    menuContainer: {
        flex: 1,
    },
    menuContent: {
        gap: 8,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 30, // Pill shaped active state
        marginVertical: 2,
    },
    menuIconWrap: {
        width: 30,
        marginRight: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    menuText: {
        fontSize: 18,
        fontWeight: '600',
    },
    userCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 20,
        marginTop: 20,
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.05)',
    },
    userAvatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        marginRight: 12,
    },
    userInfo: {
        flex: 1,
    },
    userName: {
        fontSize: 15,
        fontWeight: '700',
    },
    userHandle: {
        fontSize: 13,
        opacity: 0.6,
    }
});
