import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Platform, Pressable, Image, useWindowDimensions } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeContext } from '@/context/ThemeContext';
import { useUser } from '@/context/AuthContext';
import Animated, { 
    useAnimatedStyle, 
    useSharedValue, 
    withSpring, 
    interpolate,
    Extrapolate
} from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function WebSidebar() {
    const { width: windowWidth } = useWindowDimensions();
    
    if (Platform.OS !== 'web' || windowWidth < 768) return null;

    const [hoveredItem, setHoveredItem] = useState<string | null>(null);
    const router = useRouter();
    const pathname = usePathname();
    const { colors, isDark } = useThemeContext();
    const { user } = (useUser() || {}) as any;

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
                <Text style={[styles.logoText, { color: isDark ? '#fff' : '#111' }]}>
                    Vibe
                </Text>
            </Pressable>

            {/* Navigation Menu */}
            <View style={styles.menuContainer}>
                {menuItems.map((item) => {
                    const active = isActive(item.path);
                    const isHovered = hoveredItem === item.name;

                    return (
                        <MenuItem 
                            key={item.name}
                            item={item}
                            active={active}
                            isHovered={isHovered}
                            onHoverIn={() => setHoveredItem(item.name)}
                            onHoverOut={() => setHoveredItem(null)}
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
                    <AnimatedPressable
                        onPress={() => router.push('/(tabs)/profile' as any)}
                        onHoverIn={() => setHoveredItem('user-card')}
                        onHoverOut={() => setHoveredItem(null)}
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
                    </AnimatedPressable>
                </View>
            )}
        </View>
    );
}

function MenuItem({ item, active, isHovered, onHoverIn, onHoverOut, onPress, colors, isDark }: any) {
    const scale = useSharedValue(1);
    
    useEffect(() => {
        scale.value = withSpring(isHovered ? 1.04 : 1, { damping: 12 });
    }, [isHovered]);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    return (
        <AnimatedPressable
            onPress={onPress}
            onHoverIn={onHoverIn}
            onHoverOut={onHoverOut}
            style={[
                styles.menuItem,
                animatedStyle,
                active && { 
                    backgroundColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.85)',
                    shadowColor: colors.primary,
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.2,
                    shadowRadius: 15,
                    elevation: 10,
                    borderWidth: 1.5,
                    borderColor: colors.primary,
                },
                isHovered && !active && { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.3)' },
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
            ]}>
                {item.name}
            </Text>
        </AnimatedPressable>
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
        borderRadius: 14,
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
    }
});
