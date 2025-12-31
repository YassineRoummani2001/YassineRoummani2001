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
    const { user: currentUser, followUser } = useUser();
    const { colors, isDark } = useThemeContext();

    const [users, setUsers] = useState([]);
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
                    .filter(u => u && u._id) // Filter nulls
                    .map(u => ({
                        ...u,
                        id: u._id,
                        isFollowing: currentUser?.following?.includes(u._id) || false,
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

    const toggleFollow = async (userId) => {
        if (!followUser) return;

        const result = await followUser(userId);
        if (result.success) {
            // Update local state
            setUsers(users.map(u => {
                if (u.id === userId || u._id === userId) {
                    return { ...u, isFollowing: result.data.isFollowing };
                }
                return u;
            }));
        }
    };

    const renderItem = ({ item }) => (
        <TouchableOpacity
            style={[styles.userItem, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' }]}
            onPress={() => router.push({ pathname: '/user/[id]', params: { id: item.id } })}
            activeOpacity={0.7}
        >
            <View style={styles.avatarContainer}>
                <Image source={{ uri: item.avatar }} style={styles.avatar} />
                <OnlineIndicator isOnline={true} size={12} style={styles.onlineIndicator} />
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
            {!item.isMe && (
                <TouchableOpacity
                    style={[
                        styles.followButton,
                        item.isFollowing && styles.followingButton,
                        {
                            backgroundColor: item.isFollowing ? (isDark ? '#2C2C2E' : '#F2F2F7') : colors.tint,
                            borderColor: item.isFollowing ? (isDark ? '#3A3A3C' : '#E5E5EA') : colors.tint
                        }
                    ]}
                    onPress={() => toggleFollow(item.id || item._id)}
                >
                    <Text style={[
                        styles.followButtonText,
                        { color: item.isFollowing ? colors.text : '#FFFFFF' }
                    ]}>
                        {item.isFollowing ? 'Following' : 'Follow'}
                    </Text>
                </TouchableOpacity>
            )}
        </TouchableOpacity>
    );

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
                    <ActivityIndicator size="large" color={colors.tint} />
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
    followButton: {
        paddingHorizontal: 24,
        paddingVertical: 10,
        borderRadius: 12,
        borderWidth: 1,
    },
    followingButton: {
        borderWidth: 1,
    },
    followButtonText: {
        fontWeight: '600',
        fontSize: 14,
    },
});

