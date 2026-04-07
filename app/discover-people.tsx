import { Colors } from '@/constants/Colors';
import { API_BASE_URL } from '@/constants/Config';
import { useUser } from '@/context/UserContext';
import { useThemeContext } from '@/context/ThemeContext';
import { useRouter } from 'expo-router';
import { ArrowLeft, Search, UserPlus2, UserCheck2 } from 'lucide-react-native';
import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { SkeletonRow } from '@/components/Skeletons';
import { ActivityIndicator, FlatList, Image, Platform, RefreshControl, SafeAreaView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming, withSequence } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';

export default function DiscoverPeopleScreen() {
    const router = useRouter();
    const { user: currentUser, followUser } = (useUser() || {}) as any;
    const { colors, isDark } = useThemeContext();
    
    // Helper to normalize URIs
    const getCorrectUrl = (uri?: string) => {
        if (!uri || typeof uri !== 'string' || uri.trim() === '') return undefined;
        const clean = uri.trim();
        if (clean.length === 0) return undefined;

        if (clean.startsWith('blob:') || clean.startsWith('data:') || clean.startsWith('file:')) return clean;

        if (clean.startsWith('http') && clean.includes('/uploads/')) {
            const parts = clean.split('/uploads/');
            return `${API_BASE_URL}/uploads/${parts[1]}`;
        }

        if (clean.startsWith('http')) return clean;
        if (clean.startsWith('/uploads/')) return `${API_BASE_URL}${clean}`;
        if (clean.includes('/uploads/')) {
            const parts = clean.split('/uploads/');
            return `${API_BASE_URL}/uploads/${parts[1]}`;
        }

        return `${API_BASE_URL}/uploads/${clean}`;
    };
    const [searchQuery, setSearchQuery] = useState('');
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    
    // Animation for refresh icon
    const refreshRotation = useSharedValue(0);
    const refreshAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ rotate: `${refreshRotation.value}deg` }],
        opacity: withTiming(refreshing ? 1 : 0, { duration: 200 })
    }));

    useEffect(() => {
        if (refreshing) {
            refreshRotation.value = withRepeat(
                withTiming(360, { duration: 1000 }),
                -1,
                false
            );
        } else {
            refreshRotation.value = 0;
        }
    }, [refreshing]);

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchUsers();
        setRefreshing(false);
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/users`);

            if (response.ok) {
                const data = await response.json();
                // Filter out current user and add follow status
                const usersWithFollowStatus = data
                    .filter((u: any) => u._id !== currentUser?._id)
                    .map((u: any) => ({
                        ...u,
                        id: u._id,
                        isFollowing: currentUser?.following?.includes(u._id) || false
                    }));
                setUsers(usersWithFollowStatus);
            }
        } catch (error) {
            console.error('Error fetching users:', error);
        } finally {
            setLoading(false);
        }
    };

    const toggleFollow = async (userId: string) => {
        if (!followUser) return;

        const result = await followUser(userId);
        if (result.success) {
            // Update local state
            setUsers(prev => prev.map(u => {
                if (u.id === userId || u._id === userId) {
                    return { ...u, isFollowing: result.data.status === 'followed' || result.data.isFollowing };
                }
                return u;
            }));
        }
    };

    const filteredUsers = useMemo(() => 
        users.filter(user =>
            user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.handle?.toLowerCase().includes(searchQuery.toLowerCase())
        ),
        [users, searchQuery]
    );

    const renderItem = ({ item }: { item: any }) => {
        const isFollowing = item.isFollowing;

        return (
            <TouchableOpacity 
                style={[styles.userRow, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.01)' }]}
                onPress={() => router.push({ pathname: '/user/[id]', params: { id: item.id || item._id } })}
                activeOpacity={0.7}
            >
                <View style={styles.avatarContainer}>
                    <Image 
                        source={{ uri: getCorrectUrl(item.avatar) || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.name || 'User')}&background=random` }} 
                        style={styles.avatar} 
                    />
                    {item.isOnline && <View style={[styles.onlineBadge, { borderColor: colors.background }]} />}
                </View>

                <View style={styles.userInfo}>
                    <Text style={[styles.username, { color: colors.text }]}>{item.name}</Text>
                    <Text style={[styles.handle, { color: colors.textSecondary }]}>{item.handle}</Text>
                    {item.bio && <Text style={[styles.bio, { color: colors.textSecondary }]} numberOfLines={1}>{item.bio}</Text>}
                </View>

                <TouchableOpacity
                    style={[
                        styles.followButton, 
                        isFollowing ? styles.followingButton : { backgroundColor: colors.primary },
                        isFollowing && { borderColor: isDark ? '#333' : '#E0E0E0' }
                    ]}
                    onPress={() => {
                        toggleFollow(item.id || item._id);
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    }}
                    activeOpacity={0.8}
                >
                    {isFollowing ? (
                        <UserCheck2 size={18} color={isDark ? '#AAA' : '#666'} />
                    ) : (
                        <UserPlus2 size={18} color="white" />
                    )}
                    <Text style={[
                        styles.followButtonText, 
                        isFollowing && { color: isDark ? '#AAA' : '#666' }
                    ]}>
                        {isFollowing ? 'Following' : 'Follow'}
                    </Text>
                </TouchableOpacity>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
            
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
                <TouchableOpacity onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    router.back();
                }} style={[styles.iconButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
                    <ArrowLeft size={22} color={colors.text} />
                </TouchableOpacity>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={[styles.headerTitle, { color: colors.text }]}>Discover All People</Text>
                    {refreshing && (
                        <Animated.View style={refreshAnimatedStyle}>
                            <RefreshControl style={{ display: 'none' }} refreshing={refreshing} />
                            <Search size={16} color={colors.primary} />
                        </Animated.View>
                    )}
                </View>

                <View style={{ width: 40 }} />
            </View>

            {/* Search */}
            <View style={styles.searchContainer}>
                <BlurView intensity={isDark ? 20 : 40} tint={isDark ? "dark" : "light"} style={styles.searchBar}>
                    <Search size={20} color={isDark ? "#888" : "#999"} />
                    <TextInput
                        style={[styles.searchInput, { color: colors.text }]}
                        placeholder="Search for people..."
                        placeholderTextColor={isDark ? "#666" : "#999"}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        autoCapitalize="none"
                    />
                </BlurView>
            </View>

            {loading ? (
                <View style={{ padding: 16 }}>
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <View key={i} style={{ backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF', marginBottom: 12, borderRadius: 16 }}>
                            <SkeletonRow />
                        </View>
                    ))}
                </View>
            ) : (
                <FlatList
                    data={filteredUsers}
                    keyExtractor={(item) => item.id || item._id}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            colors={[colors.primary]}
                            tintColor={colors.primary}
                        />
                    }
                    ListHeaderComponent={
                        filteredUsers.length > 0 ? (
                            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                                ALL USERS IN VIBE ({filteredUsers.length})
                            </Text>
                        ) : null
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <View style={[styles.emptyIconContainer, { backgroundColor: isDark ? '#1A1A1A' : '#F5F5F5' }]}>
                                <Search size={40} color={isDark ? '#333' : '#DDD'} />
                            </View>
                            <Text style={[styles.emptyText, { color: colors.text }]}>No users found</Text>
                            <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
                                Try searching for a different name or handle
                            </Text>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    iconButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '800',
        letterSpacing: -0.5,
    },
    searchContainer: {
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 16,
        paddingHorizontal: 14,
        height: 48,
        gap: 10,
        overflow: 'hidden',
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    searchInput: {
        flex: 1,
        fontSize: 15,
        fontWeight: '500',
    },
    listContent: {
        paddingHorizontal: 16,
        paddingBottom: 40,
    },
    sectionTitle: {
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 1.2,
        marginTop: 8,
        marginBottom: 16,
    },
    userRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 20,
        marginBottom: 12,
    },
    avatarContainer: {
        position: 'relative',
        marginRight: 14,
    },
    avatar: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#2C2C2E',
    },
    onlineBadge: {
        position: 'absolute',
        bottom: 2,
        right: 2,
        width: 14,
        height: 14,
        borderRadius: 7,
        backgroundColor: '#4CD964',
        borderWidth: 2,
    },
    userInfo: {
        flex: 1,
    },
    username: {
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: -0.3,
    },
    handle: {
        fontSize: 13,
        fontWeight: '500',
        marginTop: 1,
    },
    bio: {
        fontSize: 12,
        marginTop: 4,
        opacity: 0.8,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 12,
        fontSize: 14,
        fontWeight: '500',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: 80,
    },
    emptyIconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: '700',
    },
    emptySubtext: {
        fontSize: 14,
        marginTop: 8,
        textAlign: 'center',
        maxWidth: 240,
    },
    followButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 18,
        minWidth: 100,
        justifyContent: 'center',
    },
    followButtonText: {
        color: 'white',
        fontWeight: '700',
        fontSize: 13,
    },
    followingButton: {
        backgroundColor: 'transparent',
        borderWidth: 1,
    }
});
