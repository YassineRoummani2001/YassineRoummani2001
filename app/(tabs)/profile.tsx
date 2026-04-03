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
                        /* ── DESKTOP HEADER ROW: avatar left, buttons right ── */
                        <View style={styles.desktopHeaderRow}>
                            <LinearGradient colors={[colors.primary, '#8b5cf6', '#ec4899']} style={[styles.avatarGradientBorder, styles.avatarGradientBorderDesktop]}>
                                <View style={[styles.avatarBorder, styles.avatarBorderDesktop]}>
                                    <Image
                                        source={{ uri: getCorrectUrl(user.avatar) || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'User')}&background=random` }}
                                        style={[styles.avatar, styles.avatarDesktop]}
                                    />
                                </View>
                            </LinearGradient>
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
                        </View>
                    ) : (
                        /* ── MOBILE HEADER: avatar left, stats right (Instagram style) ── */
                        <View style={styles.mobileHeaderSection}>
                            {/* Avatar - fixed size, not stretching */}
                            <LinearGradient colors={[colors.primary, '#8b5cf6', '#ec4899']} style={styles.avatarGradientBorder}>
                                <View style={styles.avatarBorder}>
                                    <Image
                                        source={{ uri: getCorrectUrl(user.avatar) || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'User')}&background=random` }}
                                        style={styles.avatar}
                                    />
                                </View>
                            </LinearGradient>

                            {/* Stats to the right of avatar */}
                            <View style={styles.mobileStatsGroup}>
                                <View style={styles.mobileStatItem}>
                                    <Text style={styles.statNumber}>{userPosts.length}</Text>
                                    <Text style={styles.statLabel}>Posts</Text>
                                </View>
                                <TouchableOpacity style={styles.mobileStatItem} onPress={() => router.push({ pathname: '/users-list', params: { type: 'followers', title: 'Followers', userId: user._id } })}>
                                    <Text style={styles.statNumber}>{followersCount}</Text>
                                    <Text style={styles.statLabel}>Followers</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.mobileStatItem} onPress={() => router.push({ pathname: '/users-list', params: { type: 'following', title: 'Following', userId: user._id } })}>
                                    <Text style={styles.statNumber}>{followingCount}</Text>
                                    <Text style={styles.statLabel}>Following</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}

                    {/* ── META: name / handle / bio / links / actions ── */}
                    <View style={isDesktop ? styles.desktopMeta : styles.mobileMeta}>
                        <Text style={styles.name}>{user.name}</Text>
                        <Text style={styles.handle}>@{user.handle}{user.pronouns ? `  ·  ${user.pronouns.replace(/\//g, ' / ')}` : ''}</Text>

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

                        {/* Desktop stats row (mobile uses mobileStatsGroup above) */}
                        {isDesktop && (
                            <View style={styles.statsRow}>
                                <View style={styles.statItem}>
                                    <Text style={styles.statNumber}>{userPosts.length}</Text>
                                    <Text style={styles.statLabel}>Posts</Text>
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
                        )}

                        {/* Action buttons */}
                        {!isDesktop && (
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
                        )}
                    </View>

                    {/* Tabs */}
                    <View style={styles.tabSection}>
                        <View style={styles.tabHeader}>
                            {[{ label: 'Posts', icon: 'grid-outline', activeIcon: 'grid' }, { label: 'Reels', icon: 'film-outline', activeIcon: 'film' }, { label: 'Videos', icon: 'play-outline', activeIcon: 'play' }].map((tab, i) => (
                                <TouchableOpacity key={i} style={styles.tabBtn} onPress={() => setActiveTab(i)}>
                                    <Ionicons name={(activeTab === i ? tab.activeIcon : tab.icon) as any} size={20} color={activeTab === i ? colors.text : colors.textSecondary} />
                                    {isDesktop && <Text style={[styles.tabLabel, { color: activeTab === i ? colors.text : colors.textSecondary }]}>{tab.label}</Text>}
                                    {activeTab === i && <View style={styles.tabIndicator} />}
                                </TouchableOpacity>
                            ))}
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

    // ── AVATAR OVERLAP ROW (web) ───────────────────────────
    desktopHeaderRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        paddingHorizontal: 32,
        marginTop: -56,
        marginBottom: 12,
        zIndex: 10,
    },
    // Mobile: avatar on left, stats on right (Instagram style)
    mobileHeaderSection: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        marginTop: -36,
        marginBottom: 12,
        gap: 20,
    },
    // Stats group shown to the right of avatar on mobile
    mobileStatsGroup: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        paddingTop: 36, // offset to align with bottom of avatar
    },
    mobileStatItem: {
        alignItems: 'center',
        gap: 2,
    },

    // ── AVATAR ─────────────────────────────────────────────
    // alignSelf: 'flex-start' prevents gradient from stretching full width
    avatarGradientBorder: { padding: 3, borderRadius: 68, alignSelf: 'flex-start' },
    avatarGradientBorderDesktop: { borderRadius: 96, alignSelf: 'auto' },
    avatarBorder: {
        padding: 4, borderRadius: 65, backgroundColor: colors.background,
        shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25, shadowRadius: 12,
    },
    avatarBorderDesktop: { borderRadius: 93 },
    avatar: { width: 110, height: 110, borderRadius: 55, backgroundColor: colors.gray },
    avatarDesktop: { width: 170, height: 170, borderRadius: 85 },

    // ── DESKTOP ACTION BUTTONS ─────────────────────────────
    desktopActionGroup: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingBottom: 8 },
    btnEdit: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        paddingHorizontal: 18, paddingVertical: 9,
        borderRadius: 24, borderWidth: 1.5,
        borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)',
        backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
    },
    btnEditText: { fontSize: 14, fontWeight: '700' },
    btnIcon: {
        width: 40, height: 40, borderRadius: 20,
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 1.5,
        borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)',
        backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
    },

    // ── MOBILE ACTION BUTTONS ──────────────────────────────
    mobileActionsRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 16 },
    btnEditMobile: {
        flex: 1, paddingVertical: 10, borderRadius: 24, alignItems: 'center',
        borderWidth: 1.5,
        borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)',
        backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
    },
    btnShareMobile: {
        width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center',
        borderWidth: 1.5,
        borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)',
        backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
    },

    // ── META SECTION ───────────────────────────────────────
    desktopMeta: { paddingHorizontal: 32, paddingBottom: 8 },
    mobileMeta: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 8 },
    name: {
        fontSize: isDesktop ? 28 : 22, fontWeight: '900',
        color: colors.text, letterSpacing: -0.5, marginBottom: 2,
    },
    handle: { fontSize: 14, fontWeight: '500', color: colors.textSecondary, marginBottom: 10 },
    bio: { fontSize: 15, color: colors.text, lineHeight: 22, marginBottom: 2 },
    linkChip: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    link: { fontSize: 14, color: colors.primary, textDecorationLine: 'underline' },
    pronouns: { fontSize: 14, color: colors.textSecondary },

    // ── STATS ──────────────────────────────────────────────
    statsRow: {
        flexDirection: 'row', alignItems: 'center',
        gap: 0, marginTop: 20, marginBottom: 8,
    },
    statItem: { flex: 1, alignItems: 'center' },
    statNumber: {
        fontSize: 20, fontWeight: '900', color: colors.text,
        letterSpacing: -0.5, marginBottom: 2,
    },
    statLabel: {
        fontSize: 11, fontWeight: '600', color: colors.textSecondary,
        textTransform: 'uppercase', letterSpacing: 0.5, opacity: 0.7,
    },
    vertDivider: { width: 1, height: 30, backgroundColor: colors.border },

    // ── LEGACY MOBILE STYLES (kept for fallback) ───────────
    profileHeader: { paddingHorizontal: 20, paddingBottom: 20, backgroundColor: 'transparent' },
    profileHeaderDesktop: {
        flexDirection: 'row', paddingHorizontal: 40,
        marginTop: -60, alignItems: 'flex-end',
        gap: 30, backgroundColor: 'transparent', zIndex: 10,
    },
    avatarWrap: { marginTop: isDesktop ? -90 : -60, marginBottom: 10 },
    profileInfo: { marginTop: 4 },
    profileInfoDesktop: { flex: 1, marginTop: 65, paddingBottom: 10 },
    nameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
    nameRowDesktop: { justifyContent: 'flex-start', gap: 20, marginBottom: 20 },
    desktopStatItem: { flexDirection: 'row', alignItems: 'center' },
    desktopActions: { flexDirection: 'row', alignItems: 'center', gap: 12, marginLeft: 'auto' },
    desktopStatsRow: { flexDirection: 'row', alignItems: 'center', gap: 24, marginBottom: 16 },
    handleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, paddingHorizontal: isDesktop ? 0 : 8, backgroundColor: 'transparent', paddingVertical: 0, borderRadius: 20 },
    bioContainer: { alignItems: 'center', marginVertical: 12, gap: 6 },
    bioContainerDesktop: { alignItems: 'flex-start', marginTop: 0 },
    actionsRow: { flexDirection: 'row', alignItems: 'center', gap: 12, width: '100%', marginTop: 20, justifyContent: 'center' },
    actionIconButton: { padding: 12, borderRadius: 20, backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' },
    actionButtonPrimary: { flex: 1, paddingVertical: 14, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, borderWidth: 0, maxWidth: isDesktop ? 400 : '100%' },
    actionButtonText: { fontWeight: '800', fontSize: 14, color: 'white' },
    followButton: { backgroundColor: colors.primary, paddingVertical: 12, paddingHorizontal: 32, borderRadius: 16, flex: 1, maxWidth: 200, alignItems: 'center' },
    followButtonText: { fontWeight: '800', fontSize: 16, color: colors.white },
    iconButton: { padding: 10, borderRadius: 30, backgroundColor: colors.gray },
    userInfo: { alignItems: 'center', marginBottom: 8 },
    linksContainer: { marginTop: 8, gap: 4 },
    separator: { fontSize: 14, color: '#999' },

    // ── TABS ───────────────────────────────────────────────
    tabSection: { flex: 1 },
    tabHeader: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        paddingHorizontal: isDesktop ? 32 : 0,
    },
    tabBtn: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 8, paddingVertical: 14, position: 'relative',
    },
    tabLabel: { fontSize: 14, fontWeight: '700' },
    tabIndicator: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        height: 2.5, backgroundColor: colors.text, borderRadius: 2,
    },
    tabIcon: { padding: 8 },

    // ── POST GRID ──────────────────────────────────────────
    grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: isDesktop ? 32 : 0, paddingTop: isDesktop ? 16 : 0, gap: isDesktop ? 8 : 0 },
    gridItem: { width: isDesktop ? COLUMN_WIDTH - 6 : COLUMN_WIDTH, height: (isDesktop ? COLUMN_WIDTH - 6 : COLUMN_WIDTH) * 1.25, padding: isDesktop ? 0 : 1, position: 'relative' },
    gridImage: { width: '100%', height: '100%', borderRadius: isDesktop ? 16 : 0, backgroundColor: isDark ? '#111' : '#f0f0f0' },
    videoIconOverlay: { position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 4, padding: 4 },
    reelItem: { width: isDesktop ? COLUMN_WIDTH - 6 : COLUMN_WIDTH, height: (isDesktop ? COLUMN_WIDTH - 6 : COLUMN_WIDTH) * 1.6, padding: isDesktop ? 0 : 1, position: 'relative' },
    reelIconOverlay: { position: 'absolute', bottom: 8, left: 8, flexDirection: 'row', alignItems: 'center', gap: 4 },
    reelViews: { color: 'white', fontSize: 12, fontWeight: '600' },
    viewsOverlay: { position: 'absolute', bottom: 8, left: 8, flexDirection: 'row', alignItems: 'center' },
    viewsText: { color: 'white', fontSize: 12, fontWeight: '600' },

    // ── EMPTY / LOADING ────────────────────────────────────
    emptyState: { padding: 60, alignItems: 'center', justifyContent: 'center', gap: 12 },
    emptyStateText: { color: colors.textSecondary, fontSize: 16 },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 100 },
});