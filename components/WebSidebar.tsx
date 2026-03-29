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

            {user && (
                <View style={styles.profileSection}>
                    <Image 
                        source={{ uri: user.avatar || 'https://i.pravatar.cc/150' }} 
                        style={styles.profileAvatar} 
                    />
                    <Text style={[styles.profileName, { color: colors.text }]}>{user.name || 'User'}</Text>
                    <Text style={[styles.profileHandle, { color: colors.textSecondary }]}>{user.handle || '@user'}</Text>
                    
                    <View style={styles.statsRow}>
                        <View style={styles.statItem}>
                            <Text style={[styles.statValue, { color: colors.text }]}>{user.posts?.length || 0}</Text>
                            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Posts</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statItem}>
                            <Text style={[styles.statValue, { color: colors.text }]}>{user.followers?.length || 0}</Text>
                            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Followers</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statItem}>
                            <Text style={[styles.statValue, { color: colors.text }]}>{user.following?.length || 0}</Text>
                            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Following</Text>
                        </View>
                    </View>
                </View>
            )}

            <ScrollView 
                style={styles.menuContainer} 
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 20, paddingTop: 10 }}
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
        width: 280,
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
    },
    profileSection: {
        alignItems: 'center',
        marginBottom: 30,
        paddingBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(150,150,150,0.1)',
    },
    profileAvatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
        marginBottom: 12,
        borderWidth: 2,
        borderColor: '#fff',
        boxShadow: '0px 4px 10px rgba(0,0,0,0.1)',
    },
    profileName: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    profileHandle: {
        fontSize: 14,
        marginBottom: 16,
    },
    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        paddingHorizontal: 10,
    },
    statItem: {
        alignItems: 'center',
        flex: 1,
    },
    statValue: {
        fontSize: 15,
        fontWeight: 'bold',
        marginBottom: 2,
    },
    statLabel: {
        fontSize: 11,
    },
    statDivider: {
        width: 1,
        height: 20,
        backgroundColor: 'rgba(150,150,150,0.2)',
    }
});
