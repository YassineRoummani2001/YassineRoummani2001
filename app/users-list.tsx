import OnlineIndicator from '@/components/OnlineIndicator';
import { API_BASE_URL } from '@/constants/Config';
import { useThemeContext } from '@/context/ThemeContext';
import { useUser } from '@/context/UserContext';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Platform, RefreshControl, SafeAreaView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function UsersListScreen() {
    const router = useRouter();
    const { type, userId, title } = useLocalSearchParams(); // type: 'followers', 'following', 'likes'
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

    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        fetchUsers();
    }, [type, userId]);

    const fetchUsers = async () => {
        // If refreshing, don't show full page loader
        if (!refreshing) setLoading(true);
        try {
            const targetUserId = userId || currentUser?._id;

            if (!targetUserId) {
                setLoading(false);
                return;
            }

            const endpoint = type === 'followers'
                ? `/api/auth/followers/${targetUserId}`
                : `/api/auth/following/${targetUserId}`;

            const response = await fetch(`${API_BASE_URL}${endpoint}`);

            if (response.ok) {
                const data = await response.json();
                // Add isFollowing status for each user
                const usersWithFollowStatus = data
                    .filter((u: any) => u && u._id) // Filter nulls
                    .map((u: any) => ({
                        ...u,
                        id: u._id,
                        // isFollowing: currentUser follows this user
                        isFollowing: (currentUser?.following || []).some((f: any) => (typeof f === 'string' ? f : f._id) === u._id),
                        // isFollowingBack: used in followers tab — does currentUser follow this person back
                        isFollowingBack: (currentUser?.following || []).some((f: any) => (typeof f === 'string' ? f : f._id) === u._id),
                        // isRequested: has currentUser sent a request to this user
                        isRequested: (currentUser?.sentRequests || []).some((r: any) => (typeof r === 'string' ? r : r._id) === u._id),
                        isMe: currentUser?._id === u._id
                    }));
                setUsers(usersWithFollowStatus);
            }
        } catch (error) {
            console.error('Error fetching users:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchUsers();
    };

    const toggleFollow = async (targetUserId: string) => {
        if (!followUser) return;
        const result = await followUser(targetUserId);
        if (result.success) {
            const s = result.data?.status;
            const nowFollowing = s === 'accepted' || s === 'followed';
            const nowRequested = s === 'pending' || s === 'requested';
            setUsers((prev: any[]) => prev.map((u: any) =>
                (u.id === targetUserId || u._id === targetUserId)
                    ? { ...u, isFollowing: nowFollowing, isFollowingBack: nowFollowing, isRequested: nowRequested }
                    : u
            ));
        }
    };

    // Accept a pending follow request (Follow Back for private accounts)
    const confirmRequest = async (senderId: string) => {
        if (!currentUser?.token) return;
        try {
            const res = await fetch(`${API_BASE_URL}/api/auth/confirm-request/${senderId}`, {
                method: 'PUT',
                headers: { Authorization: `Bearer ${currentUser.token}` },
            });
            if (res.ok) {
                // Mark as following back locally
                setUsers((prev: any[]) => prev.map((u: any) =>
                    (u.id === senderId || u._id === senderId)
                        ? { ...u, isFollowingBack: true }
                        : u
                ));
            }
        } catch (e) {
            console.error('Confirm request error:', e);
        }
    };

    const goToMessage = (item: any) => {
        router.push({
            pathname: '/message/[id]',
            params: { id: item._id || item.id, name: item.name, avatar: item.avatar || '' },
        });
    };

    const renderItem = ({ item }: { item: any }) => {
        const isFollowersTab = type === 'followers';
        const isOwnProfile = !userId || userId === currentUser?._id;

        const renderActionButton = () => {
            if (item.isMe) return null;

            // Scenario 1: I am looking at MY OWN followers
            if (isFollowersTab && isOwnProfile) {
                if (item.isFollowing || item.isFollowingBack) {
                    // Mutual follow -> Message
                    return (
                        <TouchableOpacity
                            style={[styles.actionButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#F2F2F7', borderColor: isDark ? 'rgba(255,255,255,0.15)' : '#E5E5EA' }]}
                            onPress={() => goToMessage(item)}
                        >
                            <Text style={[styles.actionButtonText, { color: colors.text }]}>Message</Text>
                        </TouchableOpacity>
                    );
                } else if (item.isRequested) {
                    // I sent them a request, but they are private
                    return (
                        <TouchableOpacity
                            style={[styles.actionButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#F2F2F7', borderColor: isDark ? 'rgba(255,255,255,0.15)' : '#E5E5EA' }]}
                            onPress={() => toggleFollow(item.id || item._id)}
                        >
                            <Text style={[styles.actionButtonText, { color: colors.text }]}>Requested</Text>
                        </TouchableOpacity>
                    );
                } else {
                    // They follow me, I don't follow them back -> Follow Back
                    return (
                        <TouchableOpacity
                            style={[styles.actionButton, { backgroundColor: colors.primary, borderColor: colors.primary }]}
                            onPress={() => toggleFollow(item.id || item._id)}
                        >
                            <Text style={[styles.actionButtonText, { color: '#FFF' }]}>Follow Back</Text>
                        </TouchableOpacity>
                    );
                }
            }

            // Scenario 2: Normal cases (Following list, or SOMEONE ELSE's followers/following list)
            if (item.isRequested) {
                return (
                    <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#F2F2F7', borderColor: isDark ? 'rgba(255,255,255,0.15)' : '#E5E5EA' }]}
                        onPress={() => toggleFollow(item.id || item._id)}
                    >
                        <Text style={[styles.actionButtonText, { color: colors.text }]}>Requested</Text>
                    </TouchableOpacity>
                );
            }

            return (
                <TouchableOpacity
                    style={[
                        styles.actionButton,
                        item.isFollowing
                            ? { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#F2F2F7', borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#E5E5EA' }
                            : { backgroundColor: colors.primary, borderColor: colors.primary },
                    ]}
                    onPress={() => toggleFollow(item.id || item._id)}
                >
                    <Text style={[styles.actionButtonText, { color: item.isFollowing ? colors.text : '#FFFFFF' }]}>
                        {item.isFollowing ? 'Following' : 'Follow'}
                    </Text>
                </TouchableOpacity>
            );
        };

        return (
            <TouchableOpacity
                style={[
                    styles.userItem,
                    {
                        backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
                        borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'transparent',
                        borderWidth: isDark ? 1 : 0
                    }
                ]}
                onPress={() => router.push({ pathname: '/user/[id]', params: { id: item.id || item._id } })}
                activeOpacity={0.7}
            >
                <View style={styles.avatarContainer}>
                    <Image
                        source={{ uri: getCorrectUrl(item.avatar) || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.name || 'User')}&background=random` }}
                        style={styles.avatar}
                    />
                    <OnlineIndicator isOnline={item.isOnline ?? true} size={12} style={styles.onlineIndicator} />
                </View>
                <View style={styles.userInfo}>
                    <Text style={[styles.name, { color: colors.text }]}>{item.name}</Text>
                    <Text style={[styles.handle, { color: colors.textSecondary }]}>
                        @{item.handle || item.name?.toLowerCase().replace(' ', '_')}
                    </Text>
                    {item.bio && (
                        <Text style={[styles.bio, { color: colors.textSecondary }]} numberOfLines={1}>
                            {item.bio}
                        </Text>
                    )}
                </View>
                {renderActionButton()}
            </TouchableOpacity>
        );
    };


    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={[styles.header, {
                backgroundColor: colors.background,
                borderBottomColor: isDark ? '#2C2C2E' : '#F0F0F0'
            }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <ArrowLeft size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.title, { color: colors.text }]}>{title || 'Users'}</Text>
                <View style={{ width: 40 }} />
            </View>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : (
                <FlatList
                    data={users}
                    keyExtractor={(item) => item.id || item._id}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            tintColor={colors.tint}
                            colors={[colors.tint]}
                        />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                                No users found
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
        paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) + 10 : 10,
        paddingBottom: 16,
        borderBottomWidth: 1,
    },
    backButton: {
        width: 40,
        height: 40,
        alignItems: 'flex-start',
        justifyContent: 'center',
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
    },
    listContent: {
        padding: 16,
        paddingBottom: 100,
    },
    userItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        padding: 12,
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    avatarContainer: {
        position: 'relative',
    },
    avatar: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#eee',
    },
    onlineIndicator: {
        position: 'absolute',
        bottom: 2,
        right: 2,
    },
    userInfo: {
        flex: 1,
        marginLeft: 12,
        justifyContent: 'center',
    },
    name: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 2,
    },
    handle: {
        fontSize: 14,
        marginBottom: 4,
    },
    bio: {
        fontSize: 13,
        marginTop: 2,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: 100,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: 100,
    },
    emptyText: {
        fontSize: 16,
    },
    actionButton: {
        paddingHorizontal: 18,
        paddingVertical: 10,
        borderRadius: 12,
        borderWidth: 1,
    },
    actionButtonText: {
        fontWeight: '600',
        fontSize: 14,
    },
});

