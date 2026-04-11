import { SkeletonGridItem, SkeletonProfile } from '@/components/Skeletons';
import { API_BASE_URL } from '@/constants/Config';
import { useNotifications } from '@/context/NotificationContext';
import { useThemeContext } from '@/context/ThemeContext';
import { useUser } from '@/context/UserContext';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useMemo, useState } from 'react';
import { Image, Platform, RefreshControl, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';

// ─── Helpers ────────────────────────────────────────────────────────────────
const getCorrectUrl = (url: string | null | undefined) => {
    if (!url || typeof url !== 'string' || url.trim() === '') return undefined;
    let clean = url.trim();
    if (clean.startsWith('blob:') || clean.startsWith('file:') || clean.startsWith('data:')) return clean;
    if (clean.startsWith('http')) {
        if (clean.includes('/uploads/')) {
            const parts = clean.split('/uploads/');
            return `${API_BASE_URL}/uploads/${parts[1]}`;
        }
        return clean;
    }
    const filename = clean.replace(/^.*\/uploads\//, '').replace(/^uploads\//, '').replace(/^\//, '');
    return `${API_BASE_URL}/uploads/${filename}`;
};

const fmt = (n: number): string => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return String(n);
};

// ─── Grid Video component ───────────────────────────────────────────────────
function GridVideoItem({ uri, style }: { uri: string; style: any }) {
    const player = useVideoPlayer(getCorrectUrl(uri) || '', p => {
        p.loop = true;
        p.muted = true;
    });
    return (
        <View style={[style, { overflow: 'hidden', backgroundColor: '#000' }]}>
            <VideoView player={player} style={{ width: '100%', height: '100%' }} contentFit="cover" nativeControls={false} />
        </View>
    );
}

// ─── Main Component ─────────────────────────────────────────────────────────
export default function ProfileScreen() {
    const router = useRouter();
    const { userId } = useLocalSearchParams();
    const { user: currentUser, logout, loading } = (useUser() || {}) as any;

    const [profileUser, setProfileUser] = useState<any>(null);
    const [loadingProfile, setLoadingProfile] = useState(!!userId);
    const [activeTab, setActiveTab] = useState(0);
    const [userPosts, setUserPosts] = useState<any[]>([]);
    const [postsLoading, setPostsLoading] = useState(true);
    const [followersCount, setFollowersCount] = useState(0);
    const [followingCount, setFollowingCount] = useState(0);
    const [refreshing, setRefreshing] = useState(false);
    const [followState, setFollowState] = useState(false);

    const { unreadCount } = useNotifications();
    const insets = useSafeAreaInsets();
    const { colors, isDark } = useThemeContext();
    const { width } = useWindowDimensions();
    const isDesktop = Platform.OS === 'web' && width > 768;
    const styles = useMemo(() => createStyles(colors, isDark, insets, width, isDesktop), [colors, isDark, insets, width, isDesktop]);

    const user = profileUser || currentUser;
    const isOwnProfile = !userId || userId === currentUser?._id;

    useEffect(() => { if (userId) fetchProfileUser(); }, [userId]);
    useEffect(() => { if (user?._id) { fetchUserPosts(); fetchUserStats(); } }, [user?._id]);

    const isFollowing = profileUser?.followers?.includes(currentUser?._id);
    useEffect(() => { setFollowState(isFollowing); }, [isFollowing]);

    async function fetchProfileUser() {
        try {
            setLoadingProfile(true);
            const r = await fetch(`${API_BASE_URL}/api/auth/user/${userId}`);
            if (r.ok) setProfileUser(await r.json());
            else router.back();
        } catch (e) { console.error(e); }
        finally { setLoadingProfile(false); }
    }

    async function fetchUserStats() {
        if (!user?._id) return;
        try {
            const r = await fetch(`${API_BASE_URL}/api/auth/user/${user._id}`);
            if (r.ok) {
                const d = await r.json();
                setFollowersCount(d.followersCount || 0);
                setFollowingCount(d.followingCount || 0);
                if (!userId) setProfileUser(d);
            } else if (r.status === 404 && isOwnProfile) {
                logout(); router.replace('/auth/login');
            }
        } catch (e) { console.error(e); }
    }

    async function fetchUserPosts() {
        if (!user?._id) return;
        try {
            const r = await fetch(`${API_BASE_URL}/api/auth/posts/${user._id}`);
            if (r.ok) setUserPosts(await r.json());
        } catch (e) { console.error(e); }
        finally { setPostsLoading(false); }
    }

    async function handleFollow() {
        if (!user || isOwnProfile) return;
        setFollowState(f => !f);
        setFollowersCount(c => followState ? c - 1 : c + 1);
        try {
            await fetch(`${API_BASE_URL}/api/auth/follow/${user._id}`, {
                method: 'POST', headers: { Authorization: `Bearer ${currentUser.token}` }
            });
        } catch (e) { console.error(e); }
    }

    const onRefresh = async () => {
        setRefreshing(true);
        await Promise.all([fetchUserPosts(), fetchUserStats()]);
        setRefreshing(false);
    };

    // ── Guards ───────────────────────────────────────────────────────────────
    if (loading || loadingProfile) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
                <SkeletonProfile />
            </SafeAreaView>
        );
    }
    if (!user) return <Redirect href="/auth/login" />;

    // ── Grid content ─────────────────────────────────────────────────────────
    const renderContent = () => {
        if (postsLoading) {
            return (
                <View style={styles.grid}>
                    {Array.from({ length: 9 }).map((_, i) => (
                        <View key={`sk-${i}`} style={styles.gridItem}><SkeletonGridItem /></View>
                    ))}
                </View>
            );
        }
        const reels = userPosts.filter(p => p.type === 'reel' || p.type === 'video' || p.uri?.endsWith('.mp4'));

        if (activeTab === 0) {
            if (!userPosts.length) return (
                <View style={styles.emptyState}>
                    <Ionicons name="images-outline" size={52} color={colors.textSecondary} />
                    <Text style={styles.emptyTitle}>No posts yet</Text>
                    <Text style={styles.emptySubtitle}>Share your first moment</Text>
                </View>
            );
            return (
                <View style={styles.grid}>
                    {userPosts.map((post: any, i: number) => {
                        const isVid = post.type === 'reel' || post.type === 'video' || post.uri?.endsWith('.mp4');
                        return (
                            <TouchableOpacity key={post._id || i} style={styles.gridItem} activeOpacity={0.85}
                                onPress={() => router.push({ pathname: '/media-view', params: { type: isVid ? 'video' : 'image', postId: post._id } })}>
                                {isVid
                                    ? <GridVideoItem uri={post.uri || post.image} style={styles.gridImage} />
                                    : <Image source={{ uri: post.uri || post.image }} style={styles.gridImage} resizeMode="cover" />
                                }
                                {isVid && (
                                    <View style={styles.videoChip}>
                                        <Ionicons name="play" size={10} color="white" />
                                    </View>
                                )}
                                {/* like count overlay */}
                                {post.likes?.length > 0 && (
                                    <View style={styles.likeChip}>
                                        <Ionicons name="heart" size={10} color="white" />
                                        <Text style={styles.chipText}>{fmt(post.likes.length)}</Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        );
                    })}
                </View>
            );
        }

        if (activeTab === 1) {
            if (!reels.length) return (
                <View style={styles.emptyState}>
                    <Ionicons name="film-outline" size={52} color={colors.textSecondary} />
                    <Text style={styles.emptyTitle}>No reels yet</Text>
                    <Text style={styles.emptySubtitle}>Create your first short video</Text>
                </View>
            );
            return (
                <View style={styles.grid}>
                    {reels.map((post: any, i: number) => (
                        <TouchableOpacity key={post._id || `r-${i}`} style={styles.reelItem} activeOpacity={0.85}
                            onPress={() => router.push({ pathname: '/media-view', params: { type: 'video', postId: post._id } })}>
                            <GridVideoItem uri={post.uri || post.image} style={styles.gridImage} />
                            <View style={styles.reelOverlay}>
                                <Ionicons name="play" size={12} color="white" />
                                <Text style={styles.chipText}>{fmt(post.views || 0)}</Text>
                            </View>
                        </TouchableOpacity>
                    ))}
                </View>
            );
        }

        return (
            <View style={styles.emptyState}>
                <Ionicons name="bookmark-outline" size={52} color={colors.textSecondary} />
                <Text style={styles.emptyTitle}>No tagged posts</Text>
                <Text style={styles.emptySubtitle}>Posts you're tagged in appear here</Text>
            </View>
        );
    };

    // ── Avatar shared ─────────────────────────────────────────────────────────
    const avatarUri = getCorrectUrl(user.avatar) || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'U')}&background=random&size=200`;
    const AVATAR_SIZE = isDesktop ? 140 : 96;
    const RING_PAD = 3;

    const renderAvatar = () => (
        <LinearGradient colors={[colors.primary, '#8b5cf6', '#ec4899']}
            style={{ borderRadius: (AVATAR_SIZE + RING_PAD * 2 + 4) / 2, padding: RING_PAD }}>
            <View style={{ borderRadius: (AVATAR_SIZE + 4) / 2, padding: 3, backgroundColor: colors.background }}>
                <Image source={{ uri: avatarUri }} style={{ width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: AVATAR_SIZE / 2, backgroundColor: colors.gray }} />
            </View>
        </LinearGradient>
    );

    // ── Action buttons ────────────────────────────────────────────────────────
    const renderActions = () => {
        if (isOwnProfile) return (
            <View style={styles.actionsRow}>
                <TouchableOpacity style={[styles.btnPrimary, { flex: 1, backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.07)' }]}
                    onPress={() => router.push('/edit-profile')} activeOpacity={0.8}>
                    <Text style={[styles.btnPrimaryText, { color: colors.text }]}>Edit Profile</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.btnSquare} onPress={() => router.push('/qr-code')} activeOpacity={0.8}>
                    <Ionicons name="qr-code-outline" size={19} color={colors.text} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.btnSquare} onPress={() => router.push('/discover-people')} activeOpacity={0.8}>
                    <Ionicons name="person-add-outline" size={19} color={colors.text} />
                </TouchableOpacity>
            </View>
        );
        return (
            <View style={styles.actionsRow}>
                <TouchableOpacity style={[styles.btnPrimary, { flex: 1, backgroundColor: followState ? (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.07)') : colors.primary }]}
                    onPress={handleFollow} activeOpacity={0.8}>
                    <Text style={[styles.btnPrimaryText, { color: followState ? colors.text : '#fff' }]}>
                        {followState ? 'Following' : 'Follow'}
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.btnPrimary, { flex: 1, backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.07)' }]}
                    onPress={() => router.push(`/message/${user._id}`)} activeOpacity={0.8}>
                    <Text style={[styles.btnPrimaryText, { color: colors.text }]}>Message</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.btnSquare} onPress={() => {}} activeOpacity={0.8}>
                    <Ionicons name="ellipsis-horizontal" size={19} color={colors.text} />
                </TouchableOpacity>
            </View>
        );
    };

    // ── Stats row ─────────────────────────────────────────────────────────────
    const renderStats = (horizontal = false) => (
        <View style={[styles.statsCard, horizontal && { flex: 1 }]}>
            <View style={styles.statItem}>
                <Text style={styles.statNum}>{fmt(userPosts.length)}</Text>
                <Text style={styles.statLbl}>Posts</Text>
            </View>
            <View style={styles.statDivider} />
            <TouchableOpacity style={styles.statItem}
                onPress={() => router.push({ pathname: '/users-list', params: { type: 'followers', title: 'Followers', userId: user._id } })}>
                <Text style={styles.statNum}>{fmt(followersCount)}</Text>
                <Text style={styles.statLbl}>Followers</Text>
            </TouchableOpacity>
            <View style={styles.statDivider} />
            <TouchableOpacity style={styles.statItem}
                onPress={() => router.push({ pathname: '/users-list', params: { type: 'following', title: 'Following', userId: user._id } })}>
                <Text style={styles.statNum}>{fmt(followingCount)}</Text>
                <Text style={styles.statLbl}>Following</Text>
            </TouchableOpacity>
        </View>
    );

    // ── Bio + links ───────────────────────────────────────────────────────────
    const renderMeta = () => (
        <View style={styles.metaBlock}>
            <View style={styles.nameRow}>
                <Text style={styles.name}>{user.name}</Text>
                {user.isVerified && <Ionicons name="checkmark-circle" size={18} color={colors.primary} />}
            </View>
            {user.handle && (
                <Text style={styles.handle}>@{user.handle.replace(/^@+/, '')}{user.pronouns ? `  ·  ${user.pronouns}` : ''}</Text>
            )}
            {user.bio ? <Text style={styles.bio}>{user.bio}</Text> : null}
            {user.links?.length > 0 && (
                <View style={styles.linksRow}>
                    {user.links.map((link: any, i: number) => {
                        const url = typeof link === 'object' ? link.url : link;
                        const title = typeof link === 'object' ? (link.title || link.url) : link;
                        return (
                            <TouchableOpacity key={i} style={styles.linkChip} activeOpacity={0.7}
                                onPress={() => Platform.OS === 'web' ? (window as any).open(url, '_blank') : null}>
                                <Ionicons name="link-outline" size={12} color={colors.primary} />
                                <Text style={styles.linkText}>{title}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            )}
        </View>
    );

    // ── Tabs ─────────────────────────────────────────────────────────────────
    const TABS = [
        { label: 'Posts', icon: 'grid-outline', activeIcon: 'grid' },
        { label: 'Reels', icon: 'film-outline', activeIcon: 'film' },
        { label: 'Tagged', icon: 'pricetag-outline', activeIcon: 'pricetag' },
    ];

    const renderTabBar = () => (
        <View style={styles.tabBar}>
            {TABS.map((tab, i) => {
                const active = activeTab === i;
                return (
                    <TouchableOpacity key={i} style={styles.tabItem} onPress={() => setActiveTab(i)} activeOpacity={0.7}>
                        <Ionicons name={(active ? tab.activeIcon : tab.icon) as any}
                            size={22} color={active ? colors.text : colors.textSecondary} />
                        {active && <View style={[styles.tabIndicator, { backgroundColor: colors.text }]} />}
                    </TouchableOpacity>
                );
            })}
        </View>
    );

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <SafeAreaView style={styles.container}>
            {/* Floating mobile header */}
            {!isDesktop && (
                <View style={[styles.mobileHeader, { top: insets.top }]}>
                    {userId
                        ? <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()}>
                            <Ionicons name="chevron-back" size={22} color="white" />
                        </TouchableOpacity>
                        : <View style={{ width: 40 }} />
                    }
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                        <TouchableOpacity style={styles.headerBtn} onPress={() => router.push('/settings')}>
                            <Ionicons name="menu-outline" size={22} color="white" />
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            <ScrollView
                showsVerticalScrollIndicator={isDesktop}
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
            >
                {/* ── Cover Photo ── */}
                <View style={styles.cover}>
                    <Image
                        source={{ uri: getCorrectUrl(user.coverImage) || 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=1400&q=80' }}
                        style={StyleSheet.absoluteFill} resizeMode="cover"
                    />
                    <LinearGradient
                        colors={['transparent', isDark ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.2)', colors.background]}
                        style={StyleSheet.absoluteFill}
                    />
                </View>

                {/* ── Profile Info ── */}
                <View style={isDesktop ? styles.desktopCard : undefined}>

                    {isDesktop ? (
                        /* ═══════════ DESKTOP LAYOUT ═══════════ */
                        <View style={styles.desktopInner}>
                            {/* Left: avatar */}
                            <View style={styles.desktopAvatarCol}>
                                {renderAvatar()}
                            </View>

                            {/* Right: everything else */}
                            <View style={styles.desktopInfoCol}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                                    <Text style={styles.name}>{user.name}</Text>
                                    {user.isVerified && <Ionicons name="checkmark-circle" size={20} color={colors.primary} />}
                                </View>
                                {user.handle && (
                                    <Text style={styles.handle}>@{user.handle.replace(/^@+/, '')}{user.pronouns ? `  ·  ${user.pronouns}` : ''}</Text>
                                )}

                                {renderActions()}

                                {/* Stats inline */}
                                <View style={[styles.statsCard, { width: '100%', marginHorizontal: 0, marginTop: 4 }]}>
                                    <View style={styles.statItem}>
                                        <Text style={styles.statNum}>{fmt(userPosts.length)}</Text>
                                        <Text style={styles.statLbl}>posts</Text>
                                    </View>
                                    <View style={styles.statDivider} />
                                    <TouchableOpacity style={styles.statItem}
                                        onPress={() => router.push({ pathname: '/users-list', params: { type: 'followers', title: 'Followers', userId: user._id } })}>
                                        <Text style={styles.statNum}>{fmt(followersCount)}</Text>
                                        <Text style={styles.statLbl}>followers</Text>
                                    </TouchableOpacity>
                                    <View style={styles.statDivider} />
                                    <TouchableOpacity style={styles.statItem}
                                        onPress={() => router.push({ pathname: '/users-list', params: { type: 'following', title: 'Following', userId: user._id } })}>
                                        <Text style={styles.statNum}>{fmt(followingCount)}</Text>
                                        <Text style={styles.statLbl}>following</Text>
                                    </TouchableOpacity>
                                </View>

                                {user.bio ? <Text style={styles.bio}>{user.bio}</Text> : null}

                                {user.links?.length > 0 && (
                                    <View style={styles.linksRow}>
                                        {user.links.map((link: any, i: number) => {
                                            const url = typeof link === 'object' ? link.url : link;
                                            const title = typeof link === 'object' ? (link.title || link.url) : link;
                                            return (
                                                <TouchableOpacity key={i} style={styles.linkChip} activeOpacity={0.7}
                                                    onPress={() => Platform.OS === 'web' ? (window as any).open(url, '_blank') : null}>
                                                    <Ionicons name="link-outline" size={12} color={colors.primary} />
                                                    <Text style={styles.linkText}>{title}</Text>
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </View>
                                )}
                            </View>
                        </View>
                    ) : (
                        /* ═══════════ MOBILE LAYOUT ═══════════ */
                        <>
                            {/* Row 1: avatar + stats */}
                            <View style={styles.mobileTopRow}>
                                <View style={styles.mobileAvatarWrap}>
                                    {renderAvatar()}
                                </View>
                                {renderStats(true)}
                            </View>

                            {/* Row 2: name / handle / bio / links */}
                            <View style={styles.mobilePad}>
                                {renderMeta()}
                                {renderActions()}
                            </View>
                        </>
                    )}

                    {/* ── Tabs ── */}
                    <View style={[styles.tabsWrapper, isDesktop && { marginTop: 32 }]}>
                        <View style={[styles.tabSeparator, { borderTopColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }]} />
                        {renderTabBar()}
                        {renderContent()}
                    </View>

                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const createStyles = (colors: any, isDark: boolean, insets: any, width: number, isDesktop: boolean) =>
    StyleSheet.create({
        container: { flex: 1, backgroundColor: colors.background },
        scrollContent: { paddingBottom: 80 },

        // Cover
        cover: {
            width: '100%',
            height: isDesktop ? 340 : 190,
            backgroundColor: isDark ? '#1a1a2e' : '#c9d6ff',
        },

        // Mobile header
        mobileHeader: {
            position: 'absolute', left: 0, right: 0, zIndex: 20,
            height: 52, flexDirection: 'row', alignItems: 'center',
            justifyContent: 'space-between', paddingHorizontal: 14,
        },
        headerBtn: {
            width: 38, height: 38, borderRadius: 19,
            backgroundColor: 'rgba(0,0,0,0.45)',
            alignItems: 'center', justifyContent: 'center',
        },
        badge: {
            position: 'absolute', top: 2, right: 2,
            minWidth: 16, height: 16, borderRadius: 8,
            justifyContent: 'center', alignItems: 'center', paddingHorizontal: 3,
        },
        badgeTxt: { color: 'white', fontSize: 9, fontWeight: '800' },

        // ── DESKTOP ──────────────────────────────────────────────────────────
        desktopCard: {
            maxWidth: 935,
            alignSelf: 'center',
            width: '100%',
            paddingHorizontal: 0,
        },
        desktopInner: {
            flexDirection: 'row',
            alignItems: 'flex-start',
            gap: 40,
            paddingHorizontal: 32,
            marginTop: -60,
            marginBottom: 20,
        },
        desktopAvatarCol: {
            marginTop: 0,
            flexShrink: 0,
        },
        desktopInfoCol: {
            flex: 1,
            paddingTop: 16,
            gap: 10,
        },

        // ── MOBILE ───────────────────────────────────────────────────────────
        mobileTopRow: {
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 14,
            marginTop: -44,
            marginBottom: 12,
        },
        mobileAvatarWrap: { marginRight: 20, flexShrink: 0 },
        mobilePad: { paddingHorizontal: 14, paddingBottom: 6 },

        // ── IDENTITY ─────────────────────────────────────────────────────────
        metaBlock: { gap: 4, marginBottom: 8 },
        nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
        name: {
            fontSize: isDesktop ? 26 : 18,
            fontWeight: '900',
            color: colors.text,
            letterSpacing: -0.3,
        },
        handle: {
            fontSize: 14,
            color: colors.textSecondary,
            fontWeight: '500',
        },
        bio: {
            fontSize: 14,
            color: colors.text,
            lineHeight: 20,
            marginTop: 4,
        },
        linksRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
        linkChip: {
            flexDirection: 'row', alignItems: 'center', gap: 4,
            paddingHorizontal: 10, paddingVertical: 5,
            borderRadius: 20,
            backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)',
        },
        linkText: { fontSize: 12, color: colors.primary, fontWeight: '600' },

        // ── STATS ────────────────────────────────────────────────────────────
        statsCard: {
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)',
            borderRadius: 16,
            paddingVertical: 10,
            marginHorizontal: 4,
            overflow: 'hidden',
        },
        statItem: { alignItems: 'center', gap: 2, flex: 1, paddingVertical: 4 },
        statDivider: {
            width: 1,
            height: 32,
            backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)',
        },
        statNum: { fontSize: isDesktop ? 18 : 16, fontWeight: '900', color: colors.text },
        statLbl: { fontSize: 12, color: colors.textSecondary, fontWeight: '500' },

        // ── ACTIONS ──────────────────────────────────────────────────────────
        actionsRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: isDesktop ? 0 : 12 },
        btnPrimary: {
            paddingVertical: 9,
            borderRadius: 10,
            alignItems: 'center',
            justifyContent: 'center',
        },
        btnPrimaryText: { fontSize: 14, fontWeight: '700' },
        btnSquare: {
            width: 40, height: 40, borderRadius: 10,
            alignItems: 'center', justifyContent: 'center',
            backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.07)',
        },

        // ── TABS ─────────────────────────────────────────────────────────────
        tabsWrapper: { marginTop: 4 },
        tabSeparator: { height: 1, borderTopWidth: StyleSheet.hairlineWidth },
        tabBar: {
            flexDirection: 'row',
            justifyContent: 'space-around',
        },
        tabItem: {
            flex: 1, alignItems: 'center', justifyContent: 'center',
            paddingVertical: 14, position: 'relative',
        },
        tabIndicator: {
            position: 'absolute', bottom: 0, left: 0, right: 0,
            height: 1.5, borderRadius: 2,
        },

        // ── GRID ─────────────────────────────────────────────────────────────
        grid: {
            flexDirection: 'row', flexWrap: 'wrap',
            gap: isDesktop ? 4 : 2,
            paddingHorizontal: isDesktop ? 0 : 0,
            paddingTop: isDesktop ? 12 : 2,
        },
        gridItem: {
            width: isDesktop ? 'calc(33.33% - 3px)' as any : (width / 3) - 1.5,
            aspectRatio: 1,
            overflow: 'hidden',
            borderRadius: isDesktop ? 12 : 0,
            backgroundColor: isDark ? '#111' : '#f0f0f0',
        },
        reelItem: {
            width: isDesktop ? 'calc(33.33% - 3px)' as any : (width / 3) - 1.5,
            aspectRatio: 9 / 16,
            overflow: 'hidden',
            borderRadius: isDesktop ? 12 : 0,
            backgroundColor: isDark ? '#111' : '#f0f0f0',
        },
        gridImage: { width: '100%', height: '100%' },

        // chips on grid items
        videoChip: {
            position: 'absolute', top: 6, right: 6,
            backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 4,
            padding: 3, flexDirection: 'row', alignItems: 'center',
        },
        likeChip: {
            position: 'absolute', bottom: 6, left: 6,
            backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 4,
            paddingHorizontal: 5, paddingVertical: 3,
            flexDirection: 'row', alignItems: 'center', gap: 3,
        },
        reelOverlay: {
            position: 'absolute', bottom: 8, left: 8,
            flexDirection: 'row', alignItems: 'center', gap: 4,
        },
        chipText: { color: 'white', fontSize: 10, fontWeight: '700' },

        // ── EMPTY ─────────────────────────────────────────────────────────────
        emptyState: {
            paddingVertical: 70, alignItems: 'center', justifyContent: 'center', gap: 10,
        },
        emptyTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
        emptySubtitle: { fontSize: 14, color: colors.textSecondary },
    });