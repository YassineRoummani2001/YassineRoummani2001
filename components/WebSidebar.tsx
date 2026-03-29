import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Pressable, Image, ScrollView } from 'react-native';
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
        { name: 'Reels', icon: 'videocam', outline: 'videocam-outline', path: '/(tabs)/reels' },
        { name: 'Messages', icon: 'chatbubble', outline: 'chatbubble-outline', path: '/chat' },
        { name: 'Notifications', icon: 'notifications', outline: 'notifications-outline', path: '/notifications' },
        { name: 'Create', icon: 'add-circle', outline: 'add-circle-outline', path: '/(tabs)/create' },
        { name: 'Profile', icon: 'person', outline: 'person-outline', path: '/(tabs)/profile' },
    ];

    return (
        <View style={[styles.sidebar, { backgroundColor: colors.background, borderRightColor: isDark ? '#333' : '#eee' }]}>
            <View style={styles.logoContainer}>
                 <Image 
                    source={require('@/assets/images/vibe-logo.png')} 
                    style={{ width: 44, height: 44, borderRadius: 12 }} 
                />
                <Text style={[styles.logoText, { color: colors.primary }]}>Vibe</Text>
            </View>

            <ScrollView 
                style={styles.menuContainer} 
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 20 }}
            >
                {menuItems.map((item) => {
                    const isActive = pathname === item.path || (item.path === '/(tabs)' && pathname === '/');
                    const isHovered = hoveredItem === item.name;
                    
                    return (
                        <Pressable
                            key={item.name}
                            onPress={() => router.push(item.path as any)}
                            onHoverIn={() => setHoveredItem(item.name)}
                            onHoverOut={() => setHoveredItem(null)}
                            style={[
                                styles.menuItem,
                                isHovered && { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' },
                                isActive && styles.activeMenuItem
                            ]}
                        >
                            <Ionicons
                                name={(isActive ? item.icon : item.outline) as any}
                                size={26}
                                color={isActive ? colors.primary : colors.text}
                            />
                            <Text style={[
                                styles.menuText,
                                { color: isActive ? colors.primary : colors.text },
                                isActive && styles.activeMenuText
                            ]}>
                                {item.name}
                            </Text>
                        </Pressable>
                    );
                })}
            </ScrollView>

            <View style={styles.footer}>
                <Pressable 
                    onHoverIn={() => setHoveredItem('settings')}
                    onHoverOut={() => setHoveredItem(null)}
                    style={[
                        styles.moreButton,
                        hoveredItem === 'settings' && { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }
                    ]}
                >
                    <Ionicons name="settings-outline" size={26} color={colors.text} />
                    <Text style={[styles.menuText, { color: colors.text }]}>Settings</Text>
                </Pressable>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    sidebar: {
        width: 240,
        height: '100%',
        paddingHorizontal: 20,
        paddingVertical: 30,
        position: 'fixed' as any,
        left: 0,
        top: 0,
        borderRightWidth: 1,
        zIndex: 100,
    },
    logoContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 40,
        paddingLeft: 10,
        gap: 12,
    },
    logoIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
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
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 12,
        borderRadius: 12,
        marginBottom: 4,
        gap: 16,
    },
    activeMenuItem: {
        // backgroundColor: 'rgba(10, 132, 255, 0.1)',
    },
    menuText: {
        fontSize: 16,
        fontWeight: '500',
    },
    activeMenuText: {
        fontWeight: '700',
    },
    footer: {
        marginTop: 'auto',
    },
    moreButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 12,
        borderRadius: 12,
        gap: 16,
    }
});
