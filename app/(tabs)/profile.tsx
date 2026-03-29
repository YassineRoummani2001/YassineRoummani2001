import { SkeletonGridItem } from '@/components/Skeletons';
import { API_BASE_URL } from '@/constants/Config';
import { useNotifications } from '@/context/NotificationContext';
import { useThemeContext } from '@/context/ThemeContext';
import { useUser } from '@/context/UserContext';
import { useVideoPlayer, VideoView } from 'expo-video';
import { AlignRight, Bell, Clapperboard, Grid3X3, MonitorPlay, UserPlus } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Dimensions, Image, Platform, RefreshControl, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');
const COLUMN_WIDTH = width / 3;

import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';

// Helper to normalize URIs
const getCorrectUrl = (url: string) => {
    if (!url || typeof url !== 'string') return '';
    if (url.startsWith('blob:')) return '';

    // Force use of current API_BASE_URL for any internal uploads
    if (url.includes('/uploads/')) {
        const uploadIndex = url.indexOf('/uploads/');
        return `${API_BASE_URL}${url.substring(uploadIndex)}`;
    }

    if (url.startsWith('data:')) return url;
    if (url.startsWith('http')) return url;
    return `${API_BASE_URL}/uploads/${url}`;
};

function GridVideoItem({ uri, style }: { uri: string, style: any }) {
    const player = useVideoPlayer(getCorrectUrl(uri), player => {
        player.loop = true;
        player.muted = true;
    });

    return (
        <View style={[style, { overflow: 'hidden', backgroundColor: 'black' }]}>
            <VideoView
                player={player}
                style={{ width: '100%', height: '100%' }}
                contentFit="cover"
                nativeControls={false}
            />
        </View>
    );
}

export default function ProfileScreen() {
    console.log('👤 ProfileScreen Mounting...');
    const router = useRouter();
    const { userId } = useLocalSearchParams();
    const { user: currentUser, logout, loading } = (useUser() || {}) as any;

    // If userId is provided, fetch that user's profile, otherwise use current user
    const [profileUser, setProfileUser] = useState<any>(null);
    const [loadingProfile, setLoadingProfile] = useState(!!userId);

    const [activeTab, setActiveTab] = useState(0);
    const [userPosts, setUserPosts] = useState<any[]>([]);
    const [postsLoading, setPostsLoading] = useState(true);
    const [followersCount, setFollowersCount] = useState(0);
    const [followingCount, setFollowingCount] = useState(0);
    const [likesCount, setLikesCount] = useState(0);
    const [refreshing, setRefreshing] = useState(false);
    const { unreadCount } = useNotifications();
    const insets = useSafeAreaInsets();

    const { colors, isDark } = useThemeContext();
    const styles = useMemo(() => createStyles(colors, isDark, insets), [colors, isDark, insets]);

    // Fetch profile user if userId is provided
    useEffect(() => {
        if (userId) {
            fetchProfileUser();
        }
    }, [userId]);

    const fetchProfileUser = async () => {
        try {
            setLoadingProfile(true);
            const response = await fetch(`${API_BASE_URL}/api/auth/user/${userId}`);
            if (response.ok) {
                const data = await response.json();
                setProfileUser(data);
            } else {
                console.error('Profile user not found');
                // Don't logout here, just show an error or redirect back
                router.back();
            }
        } catch (error) {
            console.error('Error fetching profile user:', error);
        } finally {
            setLoadingProfile(false);
        }
    };

    // Use profileUser if viewing someone else's profile, otherwise use currentUser
    const user = profileUser || currentUser;
    const isOwnProfile = !userId || userId === currentUser?._id;

    // Fetch user posts
    useEffect(() => {
        if (user?._id) {
            fetchUserPosts();
            fetchUserStats();
        }
    }, [user]);

    const fetchUserStats = async () => {
        if (!user?._id) return;

        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/user/${user._id}`);

            if (response.ok) {
                const data = await response.json();
                setFollowersCount(data.followersCount || 0);
                setFollowingCount(data.followingCount || 0);
            } else if (response.status === 404) {
                console.log('User not found');
                if (isOwnProfile) {
                    logout();
                    router.replace('/auth/login');
                }
            }
        } catch (error) {
            console.error('Error fetching user stats:', error);
        }
    };

    const fetchUserPosts = async () => {
        if (!user?._id) return;

        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/posts/${user._id}`);

            if (response.ok) {
                const data = await response.json();
                setUserPosts(data);

                // Calculate total likes from all posts
                const totalLikes = data.reduce((sum: number, post: any) => sum + (post.likes?.length || 0), 0);
                setLikesCount(totalLikes);
            }
        } catch (error) {
            console.error('Error fetching posts:', error);
        } finally {
            setPostsLoading(false);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await Promise.all([fetchUserPosts(), fetchUserStats()]);
        setRefreshing(false);
    };

    // Handle loading state
    if (loading || loadingProfile) {
        return (
            <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={{ marginTop: 12, color: colors.textSecondary }}>Loading Profile...</Text>
            </SafeAreaView>
        );
    }

    // Redirect if not authenticated
    if (!user) {
        return <Redirect href="/auth/login" />;
    }

    const renderContent = () => {
        if (postsLoading) {
            return (
                <View style={styles.grid}>
                    {Array.from({ length: 9 }).map((_, i) => (
                        <View key={`skel-grid-${i}`} style={styles.gridItem}>
                            <SkeletonGridItem />
                        </View>
                    ))}
                </View>
            );
        }

        // Filter for reels/videos
        const reels = userPosts.filter(p => p.type === 'reel' || p.type === 'video' || p.uri?.endsWith('.mp4'));

        if (activeTab === 0) {
            // Posts Grid
            if (userPosts.length === 0) {
                return (
                    <View style={styles.emptyState}>
                        <Grid3X3 size={48} color={colors.textSecondary} />
                        <Text style={styles.emptyStateText}>No posts yet</Text>
                    </View>
                );
            }
            return (
                <View style={styles.grid}>
                    {userPosts.map((post: any, index: number) => {
                        const isVideo = post.type === 'reel' || post.type === 'video' || post.uri?.endsWith('.mp4');
                        return (
                            <TouchableOpacity
                                key={post._id || index}
                                style={styles.gridItem}
                                onPress={() => router.push({
                                    pathname: '/media-view',
                                    params: {
                                        // uri: post.uri, // Avoid passing large URIs
                                        type: isVideo ? 'video' : 'image',
                                        postId: post._id
                                    }
                                })}
                            >
                                {isVideo ? (
                                    <GridVideoItem uri={post.uri || post.image} style={styles.gridImage} />
                                ) : (
                                    <Image source={{ uri: post.uri || post.image }} style={styles.gridImage} resizeMode="cover" />
                                )}
                                {isVideo && (
                                    <View style={styles.videoIconOverlay}>
                                        <MonitorPlay size={20} color="white" />
                                    </View>
                                )}
                            </TouchableOpacity>
                        );
                    })}
                </View>
            );
        } else if (activeTab === 1) {
            // Reels Grid
            if (reels.length === 0) {
                return (
                    <View style={styles.emptyState}>
                        <Clapperboard size={48} color={colors.textSecondary} />
                        <Text style={styles.emptyStateText}>No reels yet</Text>
                    </View>
                );
            }
            return (
                <View style={styles.grid}>
                    {reels.map((post: any, index: number) => (
                        <TouchableOpacity
                            key={post._id || `reel-${index}`}
                            style={styles.reelItem}
                            onPress={() => router.push({
                                pathname: '/media-view',
                                params: {
                                    // uri: post.uri,
                                    type: 'video', // explicit for reels tab
                                    postId: post._id
                                }
                            })}
                        >
                            <GridVideoItem uri={post.uri || post.image} style={styles.gridImage} />
                            <View style={styles.reelIconOverlay}>
                                <Clapperboard size={16} color="white" />
                                <Text style={styles.reelViews}>{post.views || 0}</Text>
                            </View>
                        </TouchableOpacity>
                    ))}
                </View>
            );
        } else {
            // Tagged / Videos (Placeholder for now)
            return (
                <View style={styles.emptyState}>
                    <MonitorPlay size={48} color={colors.textSecondary} />
                    <Text style={styles.emptyStateText}>No videos yet</Text>
                </View>
            );
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <View style={{ width: 40 }} />
                <View style={{ flexDirection: 'row', gap: 12 }}>

                    <TouchableOpacity
                        style={styles.headerIcon}
                        onPress={() => router.push('/notifications')}
                    >
                        <Bell size={24} color="white" />
                        {unreadCount > 0 && (
                            <View style={styles.notificationBadge}>
                                <Text style={styles.badgeText}>{unreadCount}</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.headerIcon} onPress={() => router.push('/settings')}>
                        <AlignRight size={24} color="white" />
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={colors.primary}
                        colors={[colors.primary]}
                    />
                }
            >
                {/* Cover Image */}
                <Image source={{ uri: getCorrectUrl(user.coverImage) || 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=800&q=80' }} style={styles.coverImage} resizeMode="cover" />

                <View style={styles.profileHeader}>
                    <View style={styles.avatarBorder}>
                        <Image source={{ uri: getCorrectUrl(user.avatar) || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'User')}&background=random` }} style={styles.avatar} />
                    </View>

                    <View style={styles.userInfo}>
                        <Text style={styles.name}>{user.name}</Text>
                        <View style={styles.handleRow}>
                            <Text style={styles.handle}>{user.handle}</Text>
                            {user.pronouns ? (
                                <>
                                    <Text style={[styles.handle, { marginHorizontal: 4 }]}>•</Text>
                                    <Text style={styles.pronouns}>{user.pronouns.replace(/\//g, ' / ')}</Text>
                                </>
                            ) : null}
                        </View>
                    </View>

                    {/* Stats Row */}
                    <View style={styles.statsRow}>
                        <View style={styles.statItem}>
                            <Text style={styles.statNumber}>{userPosts.length}</Text>
                            <Text style={styles.statLabel}>Post</Text>
                        </View>
                        <View style={styles.vertDivider} />
                        <TouchableOpacity style={styles.statItem} onPress={() => router.push({ pathname: '/users-list', params: { type: 'followers', title: 'Followers', userId: user._id } })}>
                            <Text style={styles.statNumber}>{followersCount}</Text>
                            <Text style={styles.statLabel}>Followers</Text>
                        </TouchableOpacity>
                        <View style={styles.vertDivider} />
                        <TouchableOpacity style={styles.statItem} onPress={() => router.push({ pathname: '/users-list', params: { type: 'following', title: 'Following', userId: user._id } })}>
                            <Text style={styles.statNumber}>{followingCount}</Text>
                            <Text style={styles.statLabel}>Following</Text>
                        </TouchableOpacity>
                        <View style={styles.vertDivider} />
                        <View style={styles.statItem}>
                            <Text style={styles.statNumber}>{likesCount}</Text>
                            <Text style={styles.statLabel}>Likes</Text>
                        </View>
                    </View>

                    {user.bio && (
                        <View style={styles.bioContainer}>
                            {user.bio.split('\n').map((line: any, index: any) => (
                                <Text key={index} style={styles.bio}>{line}</Text>
                            ))}
                        </View>
                    )}

                    {user.links && user.links.length > 0 && (
                        <View style={styles.linksContainer}>
                            {user.links.map((link: any, index: any) => {
                                const url = typeof link === 'object' ? link.url : link;
                                const title = typeof link === 'object' ? (link.title || link.url) : link;
                                return (
                                    <TouchableOpacity 
                                        key={index} 
                                        onPress={() => {
                                            if (Platform.OS === 'web') {
                                                window.open(url, '_blank');
                                            } else {
                                                // Handle native link opening if needed
                                                console.log('Opening link:', url);
                                            }
                                        }}
                                    >
                                        <Text style={styles.link}>{title}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    )}

                    {/* Modern Action Buttons */}
                    <View style={styles.actionsRow}>
                        <TouchableOpacity style={[styles.actionButtonPrimary, { backgroundColor: isDark ? '#2C2C2E' : colors.gray }]} onPress={() => router.push('/edit-profile')}>
                            <Text style={[styles.actionButtonText, { color: colors.text }]}>Edit Profile</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={[styles.actionButtonPrimary, { backgroundColor: isDark ? '#2C2C2E' : colors.gray }]} onPress={() => router.push('/qr-code')}>
                            <Text style={[styles.actionButtonText, { color: colors.text }]}>Share Profile</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={[styles.actionIconButton, { width: 48, backgroundColor: isDark ? '#2C2C2E' : colors.gray }]} onPress={() => router.push('/discover-people')}>
                            <UserPlus size={20} color={colors.text} />
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.tabSection}>
                    <View style={styles.tabHeader}>
                        <TouchableOpacity style={styles.tabIcon} onPress={() => setActiveTab(0)}>
                            <Grid3X3 color={activeTab === 0 ? colors.text : colors.textSecondary} size={24} />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.tabIcon} onPress={() => setActiveTab(1)}>
                            <Clapperboard color={activeTab === 1 ? colors.text : colors.textSecondary} size={24} />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.tabIcon} onPress={() => setActiveTab(2)}>
                            <MonitorPlay color={activeTab === 2 ? colors.text : colors.textSecondary} size={24} />
                        </TouchableOpacity>

                        {/* Animated indicator position based on activeTab */}
                        <View style={[styles.tabIndicator, { left: (width / 3) * activeTab }]} />
                    </View>

                    {renderContent()}
                </View>
            </ScrollView>
        </SafeAreaView >
    );
}

const createStyles = (colors: any, isDark: boolean, insets: any) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        position: 'absolute',
        top: insets.top,
        left: 0,
        right: 0,
        height: 56,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        zIndex: 10,
        backgroundColor: 'transparent',
    },
    headerIcon: {
        padding: 8,
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderRadius: 20,
    },
    notificationBadge: {
        position: 'absolute',
        top: 4,
        right: 4,
        backgroundColor: colors.primary,
        borderRadius: 10,
        minWidth: 18,
        height: 18,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 4,
    },
    badgeText: {
        color: 'white',
        fontSize: 10,
        fontWeight: '700',
    },
    scrollContent: {
        paddingBottom: 100,
    },
    coverImage: {
        width: '100%',
        height: 180,
    },
    profileHeader: {
        alignItems: 'center',
        paddingHorizontal: 20,
        marginTop: -50, // Overlap cover
    },
    avatarBorder: {
        padding: 4,
        borderRadius: 60,
        backgroundColor: colors.background,
        marginBottom: 12,
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
    },
    userInfo: {
        alignItems: 'center',
        marginBottom: 8,
    },
    name: {
        fontSize: 24, // Larger name
        fontWeight: '900', // Matches Header
        marginBottom: 2,
        letterSpacing: -0.5,
        color: colors.text,
    },
    handleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: isDark ? '#2C2C2E' : colors.gray,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        marginTop: 4,
    },
    handle: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.textSecondary,
    },
    bioContainer: {
        alignItems: 'flex-start',
        marginVertical: 12,
        gap: 6,
    },
    bio: {
        fontSize: 15,
        color: colors.text,
        lineHeight: 22,
    },
    actionsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        width: '100%',
        marginTop: 12,
        justifyContent: 'center',
    },
    actionIconButton: {
        padding: 12,
        borderRadius: 12,
        backgroundColor: isDark ? '#2C2C2E' : colors.gray,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: colors.border,
    },
    actionButtonPrimary: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: isDark ? '#2C2C2E' : colors.gray,
    },
    actionButtonText: {
        fontWeight: '600',
        fontSize: 14,
    },
    vertDivider: {
        width: 1,
        height: 24,
        backgroundColor: colors.border,
    },
    followButton: {
        backgroundColor: colors.primary,
        paddingVertical: 12,
        paddingHorizontal: 32,
        borderRadius: 16,
        flex: 1,
        maxWidth: 200,
        alignItems: 'center',
        ...Platform.select({
            ios: {
                shadowColor: colors.primary,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.5,
                shadowRadius: 8,
            },
            android: {
                elevation: 4,
                shadowColor: colors.primary,
            },
            web: {
                boxShadow: `0px 4px 8px ${colors.primary}80`,
            }
        })
    },
    followButtonText: {
        fontWeight: '800',
        fontSize: 16,
        color: colors.white,
    },
    iconButton: {
        padding: 10,
        borderRadius: 30,
        backgroundColor: colors.gray,
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        paddingHorizontal: 16, // More breathing room
        marginTop: 24,
        marginBottom: 24,
    },
    statItem: {
        alignItems: 'center',
    },
    statNumber: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 4,
        color: colors.text,
    },
    statLabel: {
        fontSize: 12,
        color: colors.textSecondary,
    },
    tabSection: {
        flex: 1,
    },
    tabHeader: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        marginBottom: 1, // gap
        position: 'relative',
    },
    tabIcon: {
        padding: 8,
    },
    tabIndicator: {
        position: 'absolute',
        bottom: 0,
        height: 2,
        width: width / 3,
        backgroundColor: colors.text,
        zIndex: 10,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    gridItem: {
        width: COLUMN_WIDTH,
        height: COLUMN_WIDTH * 1.3, // Rectangular usually
        padding: 1, // Gap
        position: 'relative'
    },
    gridImage: {
        width: '100%',
        height: '100%',
        borderRadius: 4, // slight round
        backgroundColor: colors.gray,
    },
    viewsOverlay: {
        position: 'absolute',
        bottom: 8,
        left: 8,
        flexDirection: 'row',
        alignItems: 'center',
    },
    viewsText: {
        color: 'white',
        fontSize: 12,
        fontWeight: '600',
        // @ts-ignore
        textShadow: '0px 1px 2px rgba(0,0,0,0.5)',
    },
    videoIconOverlay: {
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: 'rgba(0,0,0,0.3)',
        borderRadius: 4,
        padding: 4,
    },
    reelItem: {
        width: COLUMN_WIDTH,
        height: COLUMN_WIDTH * 1.6, // Taller for reels
        padding: 1,
        position: 'relative',
    },
    reelIconOverlay: {
        position: 'absolute',
        bottom: 8,
        left: 8,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    reelViews: {
        color: 'white',
        fontSize: 12,
        fontWeight: '600',
    },
    emptyState: {
        padding: 40,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
    },
    emptyStateText: {
        color: colors.textSecondary,
        fontSize: 16,
    },
    separator: {
        fontSize: 14,
        color: '#999',
    },
    pronouns: {
        fontSize: 14,
        color: colors.textSecondary,
    },
    linksContainer: {
        marginTop: 8,
        gap: 4,
    },
    link: {
        fontSize: 14,
        color: colors.primary,
        textDecorationLine: 'underline',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: 100,
    }
});
