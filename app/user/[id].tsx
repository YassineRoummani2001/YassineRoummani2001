import { SkeletonProfile } from '@/components/Skeletons';
import { Colors } from '@/constants/Colors';
import { API_BASE_URL } from '@/constants/Config';
import { useUser } from '@/context/UserContext';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Ban, ChevronLeft, Clapperboard, Flag, Grid3X3, MonitorPlay, MoreHorizontal, Share2, X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, Image, Modal, Platform, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const { width } = Dimensions.get('window');
const COLUMN_WIDTH = width / 3;

// Helper to normalize URIs
const getValidUri = (uri: string) => {
    if (!uri) return '';
    if (uri.startsWith('http') || uri.startsWith('data:')) return uri;
    return `${API_BASE_URL}${uri.startsWith('/') ? '' : '/'}${uri}`;
};

const GridVideoItem = ({ uri }: { uri: string }) => {
    const player = useVideoPlayer(getValidUri(uri), player => {
        player.muted = true;
    });

    return (
        <View style={styles.gridImage}>
            <VideoView
                player={player}
                style={{ width: '100%', height: '100%' }}
                contentFit="cover"
                nativeControls={false}
            />
        </View>
    );
};

export default function UserProfileScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams();
    const { user: currentUser, followUser } = (useUser() || {}) as any;
    const [activeTab, setActiveTab] = useState(0);
    const [optionsVisible, setOptionsVisible] = useState(false);
    const [isFollowing, setIsFollowing] = useState(false);
    const [followersCount, setFollowersCount] = useState(0);
    const [followingCount, setFollowingCount] = useState(0);
    const [followLoading, setFollowLoading] = useState(false);
    const [userPosts, setUserPosts] = useState<any[]>([]);
    const [postsLoading, setPostsLoading] = useState(true);
    const [userData, setUserData] = useState<any>(null);
    const [userLoading, setUserLoading] = useState(true);

    // Fetch user data
    useEffect(() => {
        if (!id) return;
        fetchUserData();
    }, [id]);

    const user = userData; // Don't use fallback here, handle null in render

    const fetchUserData = async () => {
        setUserLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/user/${id}`);

            if (response.ok) {
                const data = await response.json();
                setUserData({
                    name: data.name,
                    handle: data.handle,
                    avatar: data.avatar || 'https://i.pravatar.cc/150?u=user',
                    coverImage: data.coverImage || 'https://dummyimage.com/800x400/333/fff.png&text=Vibe',
                    bio: data.bio || '',
                    posts: userPosts.length.toString(),
                    followers: data.followersCount?.toString() || '0',
                    following: data.followingCount?.toString() || '0',
                    likes: '0',
                });
                setFollowersCount(data.followersCount || 0);
                setFollowingCount(data.followingCount || 0);
            }
        } catch (error) {
            console.error('Error fetching user data:', error);
        } finally {
            setUserLoading(false);
        }
    };

    // Fetch user posts
    useEffect(() => {
        fetchUserPosts();
    }, [id]);

    const fetchUserPosts = async () => {
        setPostsLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/posts/${id}`);

            if (response.ok) {
                const data = await response.json();
                setUserPosts(data);
            }
        } catch (error) {
            console.error('Error fetching posts:', error);
        } finally {
            setPostsLoading(false);
        }
    };

    // Check if current user is following this profile
    useEffect(() => {
        if (currentUser && currentUser.following) {
            const following = currentUser.following.includes(id);
            setIsFollowing(following);
        }
    }, [currentUser, id]);

    const handleFollow = async () => {
        if (!currentUser || followLoading) return;

        setFollowLoading(true);
        const result = await followUser(id);

        if (result.success) {
            setIsFollowing(result.data.isFollowing);
            setFollowersCount(result.data.followersCount);
        } else {
            alert(result.message || 'Failed to follow/unfollow');
        }

        setFollowLoading(false);
    };

    const renderContent = () => {
        if (postsLoading) {
            return (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={Colors.light.primary} />
                </View>
            );
        }

        if (activeTab === 0) {
            if (userPosts.length === 0) {
                return (
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>No posts yet</Text>
                    </View>
                );
            }
            return (
                <View style={styles.grid}>
                    {userPosts.map((post, index) => {
                        const isVideo = post.type === 'video' || post.type === 'reel' || post.uri?.endsWith('.mp4');
                        return (
                            <TouchableOpacity
                                key={post._id || index}
                                style={styles.gridItem}
                                onPress={() => router.push({
                                    pathname: '/media-view',
                                    params: {
                                        // uri: post.uri,
                                        type: isVideo ? 'video' : 'image',
                                        postId: post._id
                                    }
                                })}
                            >
                                {isVideo ? (
                                    <GridVideoItem uri={post.uri || post.videoUri} />
                                ) : (
                                    <Image source={{ uri: getValidUri(post.uri || post.image) }} style={styles.gridImage} />
                                )}
                            </TouchableOpacity>
                        );
                    })}
                </View>
            );
        } else if (activeTab === 1) {
            const reels = userPosts.filter(p => p.type === 'reel' || p.type === 'video' || p.uri?.endsWith('.mp4'));

            if (reels.length === 0) {
                return (
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>No reels yet</Text>
                    </View>
                );
            }

            return (
                <View style={styles.grid}>
                    {reels.map((post, index) => (
                        <TouchableOpacity
                            key={post._id || index}
                            style={styles.reelItem}
                            onPress={() => router.push({
                                pathname: '/media-view',
                                params: {
                                    // uri: post.uri,
                                    type: 'video',
                                    postId: post._id
                                }
                            })}
                        >
                            <GridVideoItem uri={post.uri} />
                            <View style={styles.reelIconOverlay}>
                                <Clapperboard size={16} color="white" />
                                <Text style={styles.reelViews}>{post.views || 0}</Text>
                            </View>
                        </TouchableOpacity>
                    ))}
                </View>
            );
        }
        return <View style={styles.emptyState}><Text>No content</Text></View>;
    };

    if (userLoading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <ChevronLeft size={28} color={Colors.light.white} />
                    </TouchableOpacity>
                </View>
                <SkeletonProfile />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <ChevronLeft size={28} color={Colors.light.white} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.backButton} onPress={() => setOptionsVisible(true)}>
                    <MoreHorizontal size={24} color={Colors.light.white} />
                </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
                <Image source={{ uri: getValidUri(user.coverImage) }} style={styles.coverImage} resizeMode="cover" />

                <View style={styles.profileHeader}>
                    <View style={styles.avatarBorder}>
                        <Image source={{ uri: getValidUri(user.avatar) }} style={styles.avatar} />
                    </View>

                    <View style={styles.userInfo}>
                        <Text style={styles.name}>{user.name}</Text>
                        <Text style={styles.handle}>{user.handle}</Text>
                    </View>

                    <Text style={styles.bio}>{user.bio}</Text>

                    <View style={styles.actionsRow}>
                        <TouchableOpacity
                            style={[
                                styles.followButton,
                                isFollowing && styles.followingButton,
                                followLoading && { opacity: 0.6 }
                            ]}
                            onPress={handleFollow}
                            disabled={followLoading}
                        >
                            {followLoading ? (
                                <ActivityIndicator size="small" color={isFollowing ? Colors.light.black : Colors.light.white} />
                            ) : (
                                <Text style={[
                                    styles.followButtonText,
                                    isFollowing && styles.followingButtonText
                                ]}>
                                    {isFollowing ? 'Following' : 'Follow'}
                                </Text>
                            )}
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.messageButton} onPress={() => router.push('/chat')}>
                            <Text style={styles.messageButtonText}>Message</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.statsRow}>
                        <View style={styles.statItem}>
                            <Text style={styles.statNumber}>{user.posts}</Text>
                            <Text style={styles.statLabel}>Posts</Text>
                        </View>
                        <TouchableOpacity style={styles.statItem} onPress={() => router.push({ pathname: '/users-list', params: { type: 'followers', title: 'Followers', userId: id } })}>
                            <Text style={styles.statNumber}>{user.followers}</Text>
                            <Text style={styles.statLabel}>Followers</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.statItem} onPress={() => router.push({ pathname: '/users-list', params: { type: 'following', title: 'Following', userId: id } })}>
                            <Text style={styles.statNumber}>{user.following}</Text>
                            <Text style={styles.statLabel}>Following</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Tabs */}
                <View style={styles.tabSection}>
                    <View style={[styles.tabIndicator, { left: (width / 3) * activeTab }]} />
                    <View style={styles.tabHeader}>
                        <TouchableOpacity style={styles.tabIcon} onPress={() => setActiveTab(0)}>
                            <Grid3X3 color={activeTab === 0 ? Colors.light.black : "#999"} size={24} />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.tabIcon} onPress={() => setActiveTab(1)}>
                            <Clapperboard color={activeTab === 1 ? Colors.light.black : "#999"} size={24} />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.tabIcon} onPress={() => setActiveTab(2)}>
                            <MonitorPlay color={activeTab === 2 ? Colors.light.black : "#999"} size={24} />
                        </TouchableOpacity>
                    </View>
                    {renderContent()}
                </View>
            </ScrollView>

            <Modal
                animationType="fade"
                transparent={true}
                visible={optionsVisible}
                onRequestClose={() => setOptionsVisible(false)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setOptionsVisible(false)}
                >
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Options</Text>
                            <TouchableOpacity onPress={() => setOptionsVisible(false)}>
                                <X size={24} color="#000" />
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity style={styles.modalOption} onPress={() => { setOptionsVisible(false); /* Handle Report */ }}>
                            <Flag size={20} color="#000" />
                            <Text style={styles.modalOptionText}>Report User</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.modalOption} onPress={() => { setOptionsVisible(false); /* Handle Block */ }}>
                            <Ban size={20} color="#FF3B30" />
                            <Text style={[styles.modalOptionText, { color: '#FF3B30' }]}>Block User</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.modalOption} onPress={() => { setOptionsVisible(false); /* Handle Share */ }}>
                            <Share2 size={20} color="#000" />
                            <Text style={styles.modalOptionText}>Share Profile</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.light.white },
    header: {
        position: 'absolute',
        top: Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) + 10 : 50,
        left: 0, right: 0,
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        zIndex: 10,
    },
    backButton: {
        width: 40, height: 40,
        backgroundColor: 'rgba(0,0,0,0.3)',
        borderRadius: 20,
        alignItems: 'center', justifyContent: 'center',
    },
    coverImage: { width: '100%', height: 200 },
    profileHeader: { alignItems: 'center', paddingHorizontal: 20, marginTop: -50 },
    avatarBorder: { padding: 4, borderRadius: 60, backgroundColor: Colors.light.white, marginBottom: 12 },
    avatar: { width: 100, height: 100, borderRadius: 50 },
    userInfo: { alignItems: 'center', marginBottom: 8 },
    name: { fontSize: 24, fontWeight: '900', color: '#000' },
    handle: { fontSize: 14, color: '#666', marginTop: 2 },
    bio: { fontSize: 14, color: '#333', textAlign: 'center', marginBottom: 20, lineHeight: 20 },
    actionsRow: { flexDirection: 'row', gap: 12, marginBottom: 24, width: '100%', paddingHorizontal: 20 },
    followButton: { flex: 1, backgroundColor: Colors.light.primary, paddingVertical: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    followingButton: { backgroundColor: Colors.light.white, borderWidth: 1, borderColor: '#ccc' },
    followButtonText: { fontWeight: '700', fontSize: 16, color: Colors.light.white },
    followingButtonText: { color: '#333' },
    messageButton: { flex: 1, backgroundColor: '#F0F0F0', paddingVertical: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    messageButtonText: { fontWeight: '700', fontSize: 16, color: '#000' },
    statsRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', paddingHorizontal: 30, marginBottom: 20 },
    statItem: { alignItems: 'center' },
    statNumber: { fontSize: 18, fontWeight: 'bold' },
    statLabel: { fontSize: 12, color: Colors.light.textSecondary },
    tabSection: { flex: 1 },
    tabHeader: { flexDirection: 'row', justifyContent: 'space-around', paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#eee' },
    tabIcon: { padding: 8 },
    tabIndicator: { position: 'absolute', top: 40, width: width / 3, height: 2, backgroundColor: Colors.light.black, zIndex: 10 },
    grid: { flexDirection: 'row', flexWrap: 'wrap' },
    gridItem: { width: COLUMN_WIDTH, height: COLUMN_WIDTH, padding: 1 },
    gridImage: { width: '100%', height: '100%' },
    reelItem: { width: COLUMN_WIDTH, height: COLUMN_WIDTH * 1.6, padding: 1 },
    reelIconOverlay: { position: 'absolute', bottom: 8, left: 8, flexDirection: 'row', gap: 4, alignItems: 'center' },
    reelViews: { color: 'white', fontSize: 12, fontWeight: '600' },
    emptyState: { padding: 40, alignItems: 'center' },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: Colors.light.white,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 24,
        paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    modalOption: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        gap: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    modalOptionText: {
        fontSize: 16,
        fontWeight: '500',
        color: '#000',
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
    }
});
