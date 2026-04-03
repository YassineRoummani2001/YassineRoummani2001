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
        { name: 'Explore', icon: 'compass', outline: 'compass-outline', path: '/(tabs)/explore' },
        { name: 'Reels', icon: 'play-circle', outline: 'play-circle-outline', path: '/(tabs)/reels' },
        { name: 'Messages', icon: 'chatbubble', outline: 'chatbubble-outline', path: '/chat' },
        { name: 'Notifications', icon: 'heart', outline: 'heart-outline', path: '/notifications' },
        { name: 'Create', icon: 'add-circle', outline: 'add-circle-outline', path: '/(tabs)/create' },
        { name: 'Profile', icon: 'person', outline: 'person-outline', path: '/(tabs)/profile' },
    ];

    const bottomItems = [
        { name: 'Settings', icon: 'settings-outline', path: '/settings' },
    ];

    const isActive = (path: string) => {
        if (path === '/(tabs)' && (pathname === '/' || pathname === '/(tabs)')) return true;
        return pathname === path || pathname.startsWith(path);
    };

    return (
        <View style={[
            styles.sidebar,
            {
                backgroundColor: isDark ? 'rgba(10,10,10,0.97)' : 'rgba(255,255,255,0.98)',
                borderRightColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
            }
        ]}>
            {/* Logo */}
            <Pressable
                onPress={() => router.push('/(tabs)' as any)}
                style={styles.logoContainer}
            >
                <Image
                    source={require('@/assets/images/vibe-logo.png')}
                    style={styles.logoImage}
                />
                <Text style={[styles.logoText, { color: colors.primary }]}>Vibe</Text>
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
                                isHovered && {
                                    backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                                    transform: [{ scale: 1.01 }] as any,
                                },
                                active && {
                                    backgroundColor: isDark
                                        ? `${colors.primary}18`
                                        : `${colors.primary}10`,
                                },
                            ]}
                        >
                            {/* Active indicator bar */}
                            {active && (
                                <View style={[styles.activeBar, { backgroundColor: colors.primary }]} />
                            )}
                            <View style={[
                                styles.menuIconWrap,
                                active && { backgroundColor: `${colors.primary}20` },
                            ]}>
                                <Ionicons
                                    name={(active ? item.icon : item.outline) as any}
                                    size={22}
                                    color={active ? colors.primary : isDark ? '#bbb' : '#555'}
                                />
                            </View>
                            <Text style={[
                                styles.menuText,
                                { color: active ? colors.primary : colors.text },
                                active && styles.activeMenuText,
                            ]}>
                                {item.name}
                            </Text>
                        </Pressable>
                    );
                })}
            </ScrollView>

            {/* Divider */}
            <View style={[styles.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]} />

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
                        style={[styles.userAvatar, { borderColor: colors.primary + '40' }]}
                    />
                    <View style={styles.userInfo}>
                        <Text style={[styles.userName, { color: colors.text }]} numberOfLines={1}>
                            {user.name || 'User'}
                        </Text>
                        <Text style={[styles.userHandle, { color: colors.textSecondary }]} numberOfLines={1}>
                            {user.handle || '@user'}
                        </Text>
                    </View>
                    <Ionicons name="ellipsis-horizontal" size={18} color={colors.textSecondary} />
                </Pressable>
            )}

            {/* Settings at very bottom */}
            {bottomItems.map((item) => (
                <Pressable
                    key={item.name}
                    onPress={() => router.push(item.path as any)}
                    onHoverIn={() => setHoveredItem(item.name)}
                    onHoverOut={() => setHoveredItem(null)}
                    style={[
                        styles.menuItem,
                        { marginBottom: 0 },
                        hoveredItem === item.name && {
                            backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                        },
                    ]}
                >
                    <View style={styles.menuIconWrap}>
                        <Ionicons
                            name={item.icon as any}
                            size={22}
                            color={isDark ? '#bbb' : '#555'}
                        />
                    </View>
                    <Text style={[styles.menuText, { color: colors.text }]}>
                        {item.name}
                    </Text>
                </Pressable>
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    sidebar: {
        width: 260,
        height: '100vh' as any,
        paddingHorizontal: 12,
        paddingTop: 20,
        paddingBottom: 16,
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
        paddingHorizontal: 12,
        paddingVertical: 4,
        marginBottom: 8,
        gap: 10,
        flexShrink: 0,
    },
    logoImage: {
        width: 34,
        height: 34,
        borderRadius: 10,
    },
    logoText: {
        fontSize: 22,
        fontWeight: '800',
        letterSpacing: -0.8,
    },
    menuContainer: {
        flex: 1,
        minHeight: 0,
    },
    menuContent: {
        paddingVertical: 4,
        gap: 2,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 14,
        marginBottom: 2,
        gap: 12,
        position: 'relative' as any,
    },
    activeBar: {
        position: 'absolute' as any,
        left: 0,
        top: '20%' as any,
        bottom: '20%' as any,
        width: 3,
        borderRadius: 2,
    },
    menuIconWrap: {
        width: 36,
        height: 36,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    menuText: {
        fontSize: 15,
        fontWeight: '500',
        letterSpacing: -0.2,
    },
    activeMenuText: {
        fontWeight: '700',
    },
    divider: {
        height: 1,
        marginHorizontal: 16,
        marginVertical: 8,
        flexShrink: 0,
    },
    userCard: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 14,
        marginBottom: 4,
        gap: 10,
        flexShrink: 0,
    },
    userAvatar: {
        width: 38,
        height: 38,
        borderRadius: 12,
        borderWidth: 2,
    },
    userInfo: {
        flex: 1,
        minWidth: 0,
    },
    userName: {
        fontSize: 14,
        fontWeight: '600',
        letterSpacing: -0.2,
    },
    userHandle: {
        fontSize: 12,
        marginTop: 1,
    },
});
