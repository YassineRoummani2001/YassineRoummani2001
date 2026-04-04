import { SkeletonGridItem, SkeletonProfile } from '@/components/Skeletons';
import { API_BASE_URL } from '@/constants/Config';
import { useNotifications } from '@/context/NotificationContext';
import { useThemeContext } from '@/context/ThemeContext';
import { useUser } from '@/context/UserContext';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Dimensions, Image, Platform, RefreshControl, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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

const formatCount = (n: number): string => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return String(n);
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
    // console.log('👤 ProfileScreen Mounting...');
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
    const { width } = useWindowDimensions();
    const isDesktop = Platform.OS === 'web' && width > 768;
    const COLUMN_WIDTH = isDesktop ? Math.floor((900 - 64 - 16) / 3) : width / 3;
    const styles = useMemo(() => createStyles(colors, isDark, insets, width, COLUMN_WIDTH, isDesktop), [colors, isDark, insets, width, COLUMN_WIDTH, isDesktop]);

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
                
                // If viewing own profile, use fresh data to update avatar & coverImage
                if (!userId) {
                    setProfileUser(data);
                }
            } else if (response.status === 404) {
                // console.log('User not found');
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
            <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
                <SkeletonProfile />
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
                        <Ionicons name="grid-outline" size={48} color={colors.textSecondary} />
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
                                        <Ionicons name="play" size={16} color="white" />
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
                        <Ionicons name="film-outline" size={48} color={colors.textSecondary} />
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
                                <Ionicons name="play" size={16} color="white" />
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
                    <Ionicons name="play-outline" size={48} color={colors.textSecondary} />
                    <Text style={styles.emptyStateText}>No videos yet</Text>
                </View>
            );
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Floating header icons - only on mobile */}
            {!isDesktop && (
                <View style={styles.header}>
                    <View style={{ width: 40 }} />
                    <View style={{ flexDirection: 'row', gap: 12 }}>
                        <TouchableOpacity style={styles.headerIcon} onPress={() => router.push('/notifications')}>
                            <Ionicons name="notifications-outline" size={24} color="white" />
                            {unreadCount > 0 && (
                                <View style={styles.notificationBadge}>
                                    <Text style={styles.badgeText}>{unreadCount}</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.headerIcon} onPress={() => router.push('/settings')}>
                            <Ionicons name="menu-outline" size={24} color="white" />
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            <ScrollView
                showsVerticalScrollIndicator={isDesktop}
                contentContainerStyle={[styles.scrollContent, isDesktop && { paddingBottom: 60 }]}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />
                }
            >
                {/* ── COVER ── */}
                <View style={{ width: '100%', height: isDesktop ? 320 : 180 }}>
                    <Image
                        source={{ uri: getCorrectUrl(user.coverImage) || 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=1400&q=80' }}
                        style={[StyleSheet.absoluteFill, { backgroundColor: colors.gray }]}
                        resizeMode="cover"
                    />
                    <LinearGradient colors={['transparent', 'transparent', 'rgba(0,0,0,0.7)']} style={StyleSheet.absoluteFill} />
                </View>

                {/* ── PROFILE INFO CARD ── */}
                <View style={isDesktop ? styles.desktopWrapper : undefined}>

                    {isDesktop ? (
                        <View style={styles.desktopHeaderRow}>
                            {/* Avatar */}
                            <View style={styles.avatarSection}>
                                <LinearGradient colors={[colors.primary, '#8b5cf6', '#ec4899']} style={styles.avatarRing}>
                                    <View style={[styles.avatarInner, { backgroundColor: colors.background }]}>
                                        <Image
                                            source={{ uri: getCorrectUrl(user.avatar) || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'User')}&background=random` }}
                                            style={styles.avatarImage}
                                        />
                                    </View>
                                </LinearGradient>
                            </View>

                            {/* Right side: stacked layout */}
                            <View style={styles.desktopHeaderRight}>
                                {/* Row 1: name + handle */}
                                <View style={styles.desktopNameBlock}>
                                    <Text style={styles.name} numberOfLines={1}>{user.name}</Text>
                                    <Text style={styles.handle} numberOfLines={1}>
                                        @{user.handle?.replace(/^@+/, '')}
                                        {user.pronouns ? `  ·  ${user.pronouns.replace(/\//g, ' / ')}` : ''}
                                    </Text>
                                </View>

                                {/* Row 2: action buttons */}
                                <View style={styles.desktopActionGroup}>
                                    <TouchableOpacity style={styles.btnEdit} onPress={() => router.push('/edit-profile')}>
                                        <Ionicons name="pencil" size={14} color={colors.text} />
                                        <Text style={[styles.btnEditText, { color: colors.text }]}>Edit Profile</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.btnIcon} onPress={() => router.push('/qr-code')}>
                                        <Ionicons name="share-social-outline" size={18} color={colors.text} />
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.btnIcon} onPress={() => router.push('/settings')}>
                                        <Ionicons name="settings-outline" size={18} color={colors.text} />
                                    </TouchableOpacity>
                                </View>

                                {/* Row 3: stats */}
                                <View style={styles.desktopStatsRow}>
                                    <View style={styles.statPill}>
                                        <Text style={styles.statNumber}>{formatCount(userPosts.length)}</Text>
                                        <Text style={styles.statLabel}>posts</Text>
                                    </View>
                                    <TouchableOpacity style={styles.statPill} onPress={() => router.push({ pathname: '/users-list', params: { type: 'followers', title: 'Followers', userId: user._id } })} activeOpacity={0.7}>
                                        <Text style={styles.statNumber}>{formatCount(followersCount)}</Text>
                                        <Text style={styles.statLabel}>followers</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.statPill} onPress={() => router.push({ pathname: '/users-list', params: { type: 'following', title: 'Following', userId: user._id } })} activeOpacity={0.7}>
                                        <Text style={styles.statNumber}>{formatCount(followingCount)}</Text>
                                        <Text style={styles.statLabel}>following</Text>
                                    </TouchableOpacity>
                                </View>

                                {/* Row 4: Bio */}
                                {user.bio ? (
                                    <View style={styles.bioSection}>
                                        {user.bio.split('\n').map((line: any, i: any) => <Text key={i} style={styles.bio}>{line}</Text>)}
                                    </View>
                                ) : null}

                                {/* Row 5: Links */}
                                {user.links && user.links.length > 0 && (
                                    <View style={styles.linksRow}>
                                        {user.links.map((link: any, i: any) => {
                                            const url = typeof link === 'object' ? link.url : link;
                                            const title = typeof link === 'object' ? (link.title || link.url) : link;
                                            return (
                                                <TouchableOpacity key={i} onPress={() => Platform.OS === 'web' ? window.open(url, '_blank') : null} style={styles.linkChip} activeOpacity={0.7}>
                                                    <Ionicons name="link-outline" size={13} color={colors.primary} />
                                                    <Text style={styles.link}>{title}</Text>
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </View>
                                )}
                            </View>
                        </View>
                    ) : (
                        <>
                            {/* ── MOBILE HEADER: avatar left, stats right (Instagram style) ── */}
                            <View style={styles.mobileHeaderSection}>
                                {/* Avatar - fixed size, not stretching */}
                                <LinearGradient colors={[colors.primary, '#8b5cf6', '#ec4899']} style={styles.avatarRing}>
                                    <View style={styles.avatarInner}>
                                        <Image
                                            source={{ uri: getCorrectUrl(user.avatar) || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'User')}&background=random` }}
                                            style={styles.avatarImage}
                                        />
                                    </View>
                                </LinearGradient>

                                {/* Stats to the right of avatar */}
                                <View style={styles.mobileStatsGroup}>
                                    <View style={styles.mobileStatItem}>
                                        <Text style={styles.statNumber}>{formatCount(userPosts.length)}</Text>
                                        <Text style={styles.statLabel}>Posts</Text>
                                    </View>
                                    <TouchableOpacity style={styles.mobileStatItem} onPress={() => router.push({ pathname: '/users-list', params: { type: 'followers', title: 'Followers', userId: user._id } })}>
                                        <Text style={styles.statNumber}>{formatCount(followersCount)}</Text>
                                        <Text style={styles.statLabel}>Followers</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.mobileStatItem} onPress={() => router.push({ pathname: '/users-list', params: { type: 'following', title: 'Following', userId: user._id } })}>
                                        <Text style={styles.statNumber}>{formatCount(followingCount)}</Text>
                                        <Text style={styles.statLabel}>Following</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {/* ── META: name / handle / bio / links / actions ── */}
                            <View style={styles.mobileMeta}>
                                <Text style={styles.name}>{user.name}</Text>
                                <Text style={styles.handle}>@{user.handle?.replace(/^@+/, '')}{user.pronouns ? `  ·  ${user.pronouns.replace(/\//g, ' / ')}` : ''}</Text>

                                {user.bio ? (
                                    user.bio.split('\n').map((line: any, i: any) => <Text key={i} style={styles.bio}>{line}</Text>)
                                ) : null}

                                {user.links && user.links.length > 0 && (
                                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
                                        {user.links.map((link: any, i: any) => {
                                            const url = typeof link === 'object' ? link.url : link;
                                            const title = typeof link === 'object' ? (link.title || link.url) : link;
                                            return (
                                                <TouchableOpacity key={i} onPress={() => Platform.OS === 'web' ? window.open(url, '_blank') : null} style={styles.linkChip}>
                                                    <Ionicons name="link-outline" size={13} color={colors.primary} />
                                                    <Text style={styles.link}>{title}</Text>
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </View>
                                )}

                                {/* Action buttons */}
                                <View style={styles.mobileActionsRow}>
                                    <TouchableOpacity style={styles.btnEditMobile} onPress={() => router.push('/edit-profile')}>
                                        <Text style={[styles.btnEditText, { color: colors.text }]}>Edit Profile</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.btnShareMobile} onPress={() => router.push('/qr-code')}>
                                        <Ionicons name="share-social-outline" size={18} color={colors.text} />
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.btnShareMobile} onPress={() => router.push('/discover-people')}>
                                        <Ionicons name="person-add-outline" size={18} color={colors.text} />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </>
                    )}

                    {/* Tabs */}
                    <View style={styles.tabSection}>
                        <View style={styles.tabHeaderContainer}>
                            <View style={styles.tabHeader}>
                                {[{ label: 'Posts', icon: 'grid-outline', activeIcon: 'grid' }, { label: 'Reels', icon: 'film-outline', activeIcon: 'film' }, { label: 'Videos', icon: 'play-outline', activeIcon: 'play' }].map((tab, i) => (
                                    <TouchableOpacity key={i} style={styles.tabBtn} onPress={() => setActiveTab(i)} activeOpacity={0.7}>
                                        <Ionicons name={(activeTab === i ? tab.activeIcon : tab.icon) as any} size={isDesktop ? 16 : 22} color={activeTab === i ? colors.text : colors.textSecondary} />
                                        {isDesktop && <Text style={[styles.tabLabel, { color: activeTab === i ? colors.text : colors.textSecondary }]}>{tab.label.toUpperCase()}</Text>}
                                        {activeTab === i && <View style={styles.tabIndicator} />}
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                        {renderContent()}
                    </View>

                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const createStyles = (colors: any, isDark: boolean, insets: any, width: number, COLUMN_WIDTH: number, isDesktop: boolean) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },

    // ── HEADER (mobile only) ──────────────────────────────
    header: {
        position: 'absolute', top: insets.top, left: 0, right: 0,
        height: 56, flexDirection: 'row', alignItems: 'center',
        justifyContent: 'space-between', paddingHorizontal: 16,
        zIndex: 10, backgroundColor: 'transparent',
    },
    headerIcon: { padding: 8, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20 },
    notificationBadge: {
        position: 'absolute', top: 4, right: 4, backgroundColor: colors.primary,
        borderRadius: 10, minWidth: 18, height: 18,
        alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4,
    },
    badgeText: { color: 'white', fontSize: 10, fontWeight: '700' },
    scrollContent: { paddingBottom: 100 },

    // ── WEB WRAPPER ────────────────────────────────────────
    desktopWrapper: {
        maxWidth: 900,
        alignSelf: 'center',
        width: '100%',
        paddingHorizontal: 0,
    },

    // ── DESKTOP HEADER ROW ──────────────────────────────
    desktopHeaderRow: {
        flexDirection: 'row',
        paddingHorizontal: 32,
        marginTop: 16,
        marginBottom: 24,
        gap: 32,
        zIndex: 10,
        alignItems: 'flex-start',
    },
    avatarSection: {
        marginTop: -80,
        alignSelf: 'flex-start' as any,
        flexShrink: 0,
    },
    desktopHeaderRight: {
        flex: 1,
        minWidth: 0,
        paddingTop: 0,
        gap: 12,
    },
    desktopNameBlock: {
        gap: 2,
    },
    desktopStatsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 24,
    },
    statPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    bioSection: {
        gap: 2,
    },
    linksRow: {
        flexDirection: 'row',
        flexWrap: 'wrap' as any,
        gap: 8,
        marginTop: 4,
    },
    linkChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingVertical: 6,
        paddingHorizontal: 12,
        backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
        borderRadius: 12,
    },
    link: {
        fontSize: 13,
        color: colors.primary,
        fontWeight: '600',
    },

    // ── MOBILE HEADER (Instagram style) ─────────────────
    mobileHeaderSection: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        marginTop: -36,
        marginBottom: 12,
        gap: 20,
    },
    mobileStatsGroup: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        paddingTop: 36,
    },
    mobileStatItem: {
        alignItems: 'center',
        gap: 2,
    },

    // ── AVATAR SIZES ─────────────────────────────────────
    avatarRing: {
        padding: 3,
        borderRadius: 68,
    },
    avatarInner: {
        padding: 4,
        borderRadius: 65,
        backgroundColor: colors.background,
    },
    avatarImage: {
        width: 122,
        height: 122,
        borderRadius: 61,
        backgroundColor: colors.gray,
    },

    // ── DESKTOP ACTION BUTTONS ─────────────────────────────
    desktopActionGroup: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        gap: 10,
        flexWrap: 'wrap' as any,
    },
    btnEdit: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        paddingHorizontal: 18, paddingVertical: 10,
        borderRadius: 12, borderWidth: 1.5,
        borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)',
        backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
    },
    btnEditText: { fontSize: 14, fontWeight: '700' },
    btnIcon: {
        width: 38, height: 38, borderRadius: 12,
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 1.5,
        borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)',
        backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
    },

    // ── MOBILE ACTION BUTTONS ──────────────────────────────
    mobileActionsRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 16 },
    btnEditMobile: {
        flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center',
        borderWidth: 1.5,
        borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)',
        backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
    },
    btnShareMobile: {
        width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
        borderWidth: 1.5,
        borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)',
        backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
    },

    // ── META SECTION ───────────────────────────────────────
    mobileMeta: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 8 },
    name: {
        fontSize: isDesktop ? 22 : 22, fontWeight: '900',
        color: colors.text, marginBottom: 2,
    },
    handle: { fontSize: 14, fontWeight: '500', color: colors.textSecondary },
    bio: { fontSize: 15, color: colors.text, lineHeight: 22 },
    pronouns: { fontSize: 14, color: colors.textSecondary },

    // ── STATS (Mobile & internal) ──────────────────────────
    statNumber: {
        fontSize: 16, fontWeight: '900', color: colors.text,
    },
    statLabel: {
        fontSize: 12, fontWeight: '500', color: colors.textSecondary, opacity: 0.8,
    },

    // ── TABS ───────────────────────────────────────────────
    tabSection: { flex: 1, marginTop: isDesktop ? 60 : 4 },
    tabHeaderContainer: {
        alignItems: isDesktop ? 'center' : 'stretch',
        borderTopWidth: isDesktop ? 1 : 0,
        borderBottomWidth: isDesktop ? 0 : 1,
        borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
        width: '100%',
    },
    tabHeader: {
        flexDirection: 'row',
        width: isDesktop ? 400 : '100%',
        position: 'relative',
    },
    tabBtn: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 8, paddingVertical: 18, position: 'relative',
    },
    tabLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 1.2 },
    tabIndicator: {
        position: 'absolute', 
        top: isDesktop ? -1 : undefined,
        bottom: isDesktop ? undefined : 0,
        left: 0, right: 0,
        height: isDesktop ? 1 : 2.5, 
        backgroundColor: colors.text, 
        borderRadius: isDesktop ? 0 : 2,
    },
    tabIcon: { padding: 8 },

    // ── POST GRID ──────────────────────────────────────────
    grid: { 
        flexDirection: 'row', 
        flexWrap: 'wrap', 
        paddingHorizontal: isDesktop ? 32 : 0, 
        paddingTop: isDesktop ? 16 : 2, 
        gap: isDesktop ? 6 : 2,
    },
    gridItem: { 
        width: isDesktop ? '32.1%' : (width / 3) - 1.5, 
        aspectRatio: 1,
        borderRadius: isDesktop ? 14 : 0, 
        overflow: 'hidden' as any,
        position: 'relative',
    },
    gridImage: { 
        width: '100%', 
        height: '100%', 
        backgroundColor: isDark ? '#111' : '#f0f0f0' 
    },
    videoIconOverlay: { 
        position: 'absolute', 
        top: 8, right: 8, 
        backgroundColor: 'rgba(0,0,0,0.3)', 
        borderRadius: 4, 
        padding: 4 
    },
    reelItem: { 
        width: isDesktop ? '32.1%' : (width / 3) - 1.5, 
        aspectRatio: 9/16,
        borderRadius: isDesktop ? 14 : 0, 
        overflow: 'hidden' as any,
        position: 'relative',
    },
    reelIconOverlay: { position: 'absolute', bottom: 8, left: 8, flexDirection: 'row', alignItems: 'center', gap: 4 },
    reelViews: { color: 'white', fontSize: 12, fontWeight: '600' },
    viewsOverlay: { position: 'absolute', bottom: 8, left: 8, flexDirection: 'row', alignItems: 'center' },
    viewsText: { color: 'white', fontSize: 12, fontWeight: '600' },

    // ── EMPTY / LOADING ────────────────────────────────────
    emptyState: { padding: 60, alignItems: 'center', justifyContent: 'center', gap: 12 },
    emptyStateText: { color: colors.textSecondary, fontSize: 16 },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 100 },
});