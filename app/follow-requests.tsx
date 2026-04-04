import { API_BASE_URL } from '@/constants/Config';
import { useThemeContext } from '@/context/ThemeContext';
import { useUser } from '@/context/UserContext';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
    FlatList,
    Image,
    RefreshControl,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/* ================= TYPES ================= */
type UserItem = {
    _id: string;
    name: string;
    handle: string;
    avatar: string;
    followersCount: number;
};

export default function FollowRequestsScreen() {
    const router = useRouter();
    const { user, followUser, refreshUser } = (useUser() || {}) as any;
    const { colors, isDark } = useThemeContext();
    const insets = useSafeAreaInsets();

    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [suggestions, setSuggestions] = useState<UserItem[]>([]);
    const [requests, setRequests] = useState<any[]>([]);

    const fetchData = async () => {
        if (!user) return;
        try {
            // 1. Fetch real requests
            const reqRes = await fetch(`${API_BASE_URL}/api/auth/requests`, {
                headers: { 'Authorization': `Bearer ${user.token}` }
            });
            if (reqRes.ok) {
                const reqData = await reqRes.json();
                setRequests(reqData);
            }

            // 2. Fetch suggestions
            const res = await fetch(`${API_BASE_URL}/api/auth/users`);
            if (res.ok) {
                const allUsers = await res.json();
                const notFollowing = allUsers.filter((u: any) =>
                    u._id !== user._id &&
                    !(user.following || []).some((f: any) => (typeof f === 'string' ? f : f._id) === u._id) &&
                    (!user.sentRequests || !user.sentRequests.includes(u._id)) && // Don't suggest if I already requested
                    !requests.some(r => r._id === u._id) // Don't suggest people who requested to follow me
                );
                setSuggestions(notFollowing.slice(0, 20));
            }
        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [user]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchData();
    };

    const handleConfirmRequest = async (id: string) => {
        setRequests(prev => prev.filter(r => r._id !== id));
        try {
            await fetch(`${API_BASE_URL}/api/auth/confirm-request/${id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${user.token}`,
                    'Content-Type': 'application/json'
                }
            });
            // Automatically follow them back as requested
            if (followUser) await followUser(id);
            if (refreshUser) await refreshUser();
        } catch (error) {
            console.error("Error confirming request:", error);
        }
    };

    const handleDeleteRequest = async (id: string) => {
        setRequests(prev => prev.filter(r => r._id !== id));
        try {
            await fetch(`${API_BASE_URL}/api/auth/delete-request/${id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${user.token}`,
                    'Content-Type': 'application/json'
                }
            });
        } catch (error) {
            console.error("Error deleting request:", error);
        }
    };

    // Track follow status locally for suggestions
    const [followedState, setFollowedState] = useState<{ [key: string]: 'none' | 'followed' | 'requested' }>({});

    const handleFollowClick = async (userId: string) => {
        const result = await followUser(userId);
        if (result.success) {
            setFollowedState(prev => ({
                ...prev,
                [userId]: result.data.status === 'followed' ? 'followed' : 'requested'
            }));
        }
    };

    const renderRequestItem = ({ item }: { item: any }) => (
        <View style={styles.requestItem}>
            <TouchableOpacity onPress={() => router.push(`/user/${item._id}`)}>
                <Image source={{ uri: item.avatar || 'https://i.pravatar.cc/150' }} style={styles.avatarLarge} />
            </TouchableOpacity>
            <View style={styles.requestInfo}>
                <Text style={[styles.name, { color: colors.text }]}>{item.name}</Text>
                <Text style={[styles.handle, { color: colors.textSecondary }]}>{item.handle}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={{ fontSize: 12, color: colors.textSecondary }}>Requested to follow you</Text>
                </View>
            </View>
            <View style={styles.requestActions}>
                <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: colors.primary }]}
                    onPress={() => handleConfirmRequest(item._id)}
                >
                    <Text style={styles.actionBtnText}>Confirm</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: isDark ? '#333' : '#ddd', marginLeft: 8 }]}
                    onPress={() => handleDeleteRequest(item._id)}
                >
                    <Text style={[styles.actionBtnText, { color: colors.text }]}>Delete</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    const renderSuggestionItem = ({ item }: { item: any }) => {
        const status = followedState[item._id] || 'none';
        const isFollowing = status === 'followed';
        const isRequested = status === 'requested';

        return (
            <View style={styles.suggestionItem}>
                <TouchableOpacity onPress={() => router.push(`/user/${item._id}`)} style={styles.suggestionLeft}>
                    <Image source={{ uri: item.avatar || 'https://i.pravatar.cc/150' }} style={styles.avatar} />
                    <View style={styles.suggestionInfo}>
                        <Text style={[styles.name, { color: colors.text }]}>{item.name}</Text>
                        <Text style={[styles.handle, { color: colors.textSecondary }]}>{item.handle}</Text>
                        <Text style={styles.suggestionSub} numberOfLines={1}>Suggested for you</Text>
                    </View>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[
                        styles.smallFollowBtn,
                        { backgroundColor: (isFollowing || isRequested) ? 'transparent' : colors.primary },
                        (isFollowing || isRequested) && { borderWidth: 1, borderColor: colors.border }
                    ]}
                    onPress={() => handleFollowClick(item._id)}
                    disabled={isFollowing || isRequested}
                >
                    <Text style={[
                        styles.smallFollowText,
                        (isFollowing || isRequested) && { color: colors.text }
                    ]}>
                        {isFollowing ? 'Following' : isRequested ? 'Requested' : 'Follow'}
                    </Text>
                </TouchableOpacity>
            </View>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

            {/* Header */}
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <ArrowLeft size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Follow requests</Text>
                <View style={{ width: 40 }} />
            </View>

            <FlatList
                data={suggestions}
                keyExtractor={(item) => item._id}
                renderItem={renderSuggestionItem}
                ListHeaderComponent={
                    <View>
                        {requests.length > 0 && (
                            <View style={styles.requestsSection}>
                                {requests.map(req => (
                                    <View key={req._id}>
                                        {renderRequestItem({ item: req })}
                                    </View>
                                ))}
                            </View>
                        )}
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>Suggested for you</Text>
                    </View>
                }
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={colors.primary}
                        colors={[colors.primary]}
                    />
                }
                ListEmptyComponent={
                    !isLoading ? (
                        <View style={styles.emptyState}>
                            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No suggestions available.</Text>
                        </View>
                    ) : null
                }
            />
        </View>
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
        paddingVertical: 14,
        borderBottomWidth: 1,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    backBtn: {
        padding: 5,
    },
    listContent: {
        paddingBottom: 20,
    },
    requestsSection: {
        marginBottom: 20,
    },
    requestItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        justifyContent: 'space-between'
    },
    requestInfo: {
        flex: 1,
        marginLeft: 12,
    },
    requestActions: {
        flexDirection: 'row',
    },
    actionBtn: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 8,
    },
    actionBtnText: {
        color: 'white',
        fontWeight: '600',
        fontSize: 13,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        paddingHorizontal: 16,
        marginBottom: 10,
        marginTop: 10,
    },
    suggestionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    suggestionLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#eee',
    },
    avatarLarge: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#eee',
    },
    suggestionInfo: {
        marginLeft: 12,
        justifyContent: 'center',
    },
    name: {
        fontWeight: 'bold',
        fontSize: 14,
    },
    handle: {
        fontSize: 13,
    },
    suggestionSub: {
        fontSize: 12,
        color: '#888',
        marginTop: 2,
    },
    smallFollowBtn: {
        paddingVertical: 6,
        paddingHorizontal: 18,
        borderRadius: 8,
    },
    smallFollowText: {
        color: 'white',
        fontWeight: '600',
        fontSize: 13,
    },
    emptyState: {
        padding: 20,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 14,
    }
});
