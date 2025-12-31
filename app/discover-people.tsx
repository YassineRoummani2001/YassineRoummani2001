import { Colors } from '@/constants/Colors';
import { API_BASE_URL } from '@/constants/Config';
import { USERS } from '@/constants/MockData';
import { useUser } from '@/context/UserContext';
import { useRouter } from 'expo-router';
import { ArrowLeft, Search } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Platform, RefreshControl, SafeAreaView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

// Mock more users for discovery
const DISCOVER_USERS = [
    ...USERS.filter(u => !u.isMe),
    ...USERS.filter(u => !u.isMe).map(u => ({ ...u, id: `d-${u.id}`, name: u.name + ' 2' })),
    ...USERS.filter(u => !u.isMe).map(u => ({ ...u, id: `d2-${u.id}`, name: u.name + ' 3' })),
];

export default function DiscoverPeopleScreen() {
    const router = useRouter();
    const { user: currentUser, followUser } = (useUser() || {}) as any;
    const [searchQuery, setSearchQuery] = useState('');
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const themeColors = Colors.light; // fallback

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
            setUsers(users.map(u => {
                if (u.id === userId || u._id === userId) {
                    return { ...u, isFollowing: result.data.isFollowing };
                }
                return u;
            }));
        }
    };

    const filteredUsers = users.filter(user =>
        user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.handle?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const renderItem = ({ item }: any) => {
        const isFollowing = item.isFollowing;

        return (
            <View style={styles.userRow}>
                <Image source={{ uri: item.avatar }} style={styles.avatar} />
                <TouchableOpacity
                    style={styles.userInfo}
                    onPress={() => router.push({ pathname: '/user/[id]', params: { id: item.id || item._id } })}
                >
                    <Text style={styles.username}>{item.name}</Text>
                    <Text style={styles.subtext}>{item.handle}</Text>
                    {item.bio && <Text style={styles.bio} numberOfLines={1}>{item.bio}</Text>}
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.followButton, isFollowing && styles.followingButton]}
                    onPress={() => toggleFollow(item.id || item._id)}
                >
                    <Text style={[styles.followButtonText, isFollowing && styles.followingButtonText]}>
                        {isFollowing ? 'Following' : 'Follow'}
                    </Text>
                </TouchableOpacity>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <ArrowLeft size={24} color="black" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Discover People</Text>
                <View style={{ width: 24 }} />
            </View>

            <View style={styles.searchContainer}>
                <View style={styles.searchBar}>
                    <Search size={20} color="#999" />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search"
                        placeholderTextColor="#999"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>
            </View>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={themeColors.primary} />
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
                            colors={[themeColors.primary]}
                            tintColor={themeColors.primary}
                        />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyText}>No users found</Text>
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
        backgroundColor: 'white',
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    backButton: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: 'black',
    },
    searchContainer: {
        padding: 16,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f5f5f5',
        borderRadius: 12,
        paddingHorizontal: 12,
        height: 44,
        gap: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        color: 'black',
    },
    listContent: {
        paddingHorizontal: 16,
        paddingBottom: 20,
    },
    userRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        marginRight: 12,
        backgroundColor: '#eee',
    },
    userInfo: {
        flex: 1,
    },
    username: {
        fontSize: 16,
        fontWeight: '600',
        color: 'black',
    },
    subtext: {
        fontSize: 13,
        color: '#666',
        marginTop: 2,
    },
    bio: {
        fontSize: 12,
        color: '#999',
        marginTop: 4,
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
        color: '#999',
    },
    followButton: {
        backgroundColor: Colors.light.primary,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        minWidth: 80,
        alignItems: 'center',
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
        borderColor: '#ddd',
    },
    followingButtonText: {
        color: '#666',
    }
});
