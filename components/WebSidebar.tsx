import { useUser } from '@/context/AuthContext';
import { useMessages } from '@/context/MessagesContext';
import { useNotifications } from '@/context/NotificationContext';
import { useThemeContext } from '@/context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { usePathname, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Image, Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, {
    interpolate,
    useAnimatedStyle,
    useSharedValue,
    withSpring
} from 'react-native-reanimated';



export default function WebSidebar() {
    const { width: windowWidth } = useWindowDimensions();

    if (Platform.OS !== 'web' || windowWidth < 768) return null;

    const [hoveredItem, setHoveredItem] = useState<string | null>(null);
    const router = useRouter();
    const pathname = usePathname();
    const { colors, isDark } = useThemeContext();
    const { user } = (useUser() || {}) as any;
    const { unreadCount: unreadMessages } = useMessages();
    const { unreadCount: unreadNotifications } = useNotifications();

    const SIDEBAR_WIDTH = 280;

    const menuItems = [
        { name: 'Home', icon: 'home', outline: 'home-outline', path: '/(tabs)' },
        { name: 'Search', icon: 'search', outline: 'search-outline', path: '/search' },
        { name: 'Marketplace', icon: 'bag-handle', outline: 'bag-handle-outline', path: '/marketplace' },
        { name: 'Reels', icon: 'play-circle', outline: 'play-circle-outline', path: '/reels' },
        { name: 'Messages', icon: 'chatbubble-ellipses', outline: 'chatbubble-ellipses-outline', path: '/chat' },
        { name: 'Notifications', icon: 'notifications', outline: 'notifications-outline', path: '/notifications' },
        { name: 'Create', icon: 'add-circle', outline: 'add-circle-outline', path: '/create' },
    ];

    const isActive = (path: string) => {
        if (path === '/(tabs)' && (pathname === '/' || pathname === '/(tabs)')) return true;
        return pathname === path || pathname.startsWith(path);
    };

    return (
        <View
            style={[
                styles.sidebar,
                {
                    width: SIDEBAR_WIDTH,
                    backgroundColor: isDark ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.65)',
                    borderRightColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                }
            ]}
        >
            <View style={styles.glassOverlay} pointerEvents="none" />

            {/* Logo */}
            <Pressable
                onPress={() => router.push('/(tabs)' as any)}
                style={styles.logoContainer}
            >
                <View style={[styles.logoIconBg, { backgroundColor: colors.primary, shadowColor: colors.primary }]}>
                    <Ionicons name="flash" size={24} color="white" />
                </View>
                <Text style={[styles.logoText, { color: colors.primary, marginLeft: 8 }]}>
                    Vibe
                </Text>
            </Pressable>

            {/* Navigation Menu */}
            <View style={styles.menuContainer}>
                {menuItems.map((item) => {
                    const active = isActive(item.path);
                    let badgeCount = 0;
                    if (item.name === 'Messages') badgeCount = unreadMessages;
                    if (item.name === 'Notifications') badgeCount = unreadNotifications;

                    return (
                        <MenuItem
                            key={item.name}
                            item={item}
                            active={active}
                            badgeCount={badgeCount}
                            onPress={() => router.push(item.path as any)}
                            colors={colors}
                            isDark={isDark}
                        />
                    );
                })}
            </View>

            <View style={{ flex: 1 }} />

            {/* User Card (Bottom) */}
            {user && (
                <View style={styles.bottomSection}>
                    <View style={[styles.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]} />
                    <Pressable
                        onPress={() => router.push('/(tabs)/profile' as any)}
                        style={[
                            styles.userCard,
                            {
                                backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.4)',
                                borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                            }
                        ]}
                    >
                        <Image
                            source={{ uri: user.avatar || 'https://i.pravatar.cc/150' }}
                            style={styles.userAvatar}
                        />
                        <View style={styles.userInfoWrapper}>
                            <View style={styles.userInfo}>
                                <Text style={[styles.userName, { color: isDark ? '#fff' : '#111' }]} numberOfLines={1}>
                                    {user.name || 'User'}
                                </Text>
                                <Text style={[styles.userHandle, { color: isDark ? '#999' : '#666' }]} numberOfLines={1}>
                                    @{user.handle || 'user'}
                                </Text>
                            </View>
                            <Ionicons name="ellipsis-horizontal" size={18} color={isDark ? '#999' : '#666'} />
                        </View>
                    </Pressable>
                </View>
            )}
        </View>
    );
}

function MenuItem({ item, active, onPress, colors, isDark, badgeCount }: any) {
    return (
        <Pressable
            onPress={onPress}
            style={[
                styles.menuItem,
                active && {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.85)',
                    shadowColor: colors.primary,
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.2,
                    shadowRadius: 15,
                    elevation: 10,
                    borderWidth: 1.5,
                    borderColor: colors.primary,
                }
            ]}
        >
            <View style={styles.menuIconWrap}>
                <Ionicons
                    name={(active ? item.icon : item.outline) as any}
                    size={active ? 28 : 24}
                    color={active ? colors.primary : isDark ? '#FFF' : '#333'}
                />
            </View>
            <Text style={[
                styles.menuText,
                { color: active ? colors.primary : isDark ? '#EEE' : '#111', marginLeft: 16 },
                active && { fontWeight: '800' },
                { flex: 1 }
            ]}>
                {item.name}
            </Text>
            
            {badgeCount > 0 && (
                <View style={[styles.badge, { backgroundColor: colors.primary }]}>
                    <Text style={styles.badgeText}>{badgeCount > 99 ? '99+' : badgeCount}</Text>
                </View>
            )}
        </Pressable>
    );
}

function AnimatedText({ children, isSidebarExpanded, style }: any) {
    const textStyle = useAnimatedStyle(() => ({
        opacity: isSidebarExpanded.value,
        transform: [
            { translateX: interpolate(isSidebarExpanded.value, [0, 1], [-10, 0]) }
        ],
    }));

    return (
        <Animated.View style={[textStyle, { overflow: 'hidden' }]}>
            <Text style={[style, { marginLeft: 16 }]} numberOfLines={1}>
                {children}
            </Text>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    sidebar: {
        height: '100vh' as any,
        paddingHorizontal: 12,
        paddingTop: 32,
        paddingBottom: 24,
        position: 'fixed' as any,
        left: 0,
        top: 0,
        borderRightWidth: 1,
        zIndex: 1000,
        display: 'flex' as any,
        flexDirection: 'column',
        // Glassmorphism
        backdropFilter: 'blur(24px) saturate(180%)',
        WebkitBackdropFilter: 'blur(24px) saturate(180%)',
    } as any,
    glassOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(255,255,255,0.02)',
    },
    logoContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 40,
        paddingHorizontal: 8,
        height: 48,
    },
    logoIconBg: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    logoText: {
        fontSize: 28,
        fontWeight: '900',
        letterSpacing: -1,
    },
    menuContainer: {
        gap: 4,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 50,
        paddingHorizontal: 16,
        borderRadius: 16,
        marginVertical: 1,
    },
    menuIconWrap: {
        width: 28,
        alignItems: 'center',
        justifyContent: 'center',
    },
    menuText: {
        fontSize: 16,
        fontWeight: '600',
        letterSpacing: -0.3,
    },
    bottomSection: {
        marginTop: 'auto',
    },
    divider: {
        height: 1,
        width: '100%',
        marginBottom: 12,
    },
    userCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        borderRadius: 20,
        borderWidth: 1,
        height: 60,
    },
    userAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
    },
    userInfoWrapper: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: 12,
        overflow: 'hidden',
    },
    userInfo: {
        flex: 1,
    },
    userName: {
        fontSize: 14,
        fontWeight: '700',
    },
    userHandle: {
        fontSize: 12,
    },
    badge: {
        minWidth: 22,
        height: 22,
        borderRadius: 11,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 6,
        marginLeft: 8,
    },
    badgeText: {
        color: 'white',
        fontSize: 11,
        fontWeight: 'bold',
    }
});
