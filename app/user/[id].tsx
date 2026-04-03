import { SkeletonProfile } from '@/components/Skeletons';
import { Colors } from '@/constants/Colors';
import { API_BASE_URL } from '@/constants/Config';
import { useThemeContext } from '@/context/ThemeContext';
import { useUser } from '@/context/UserContext';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Ban, Flag, Share2, X } from 'lucide-react-native';
import { useEffect, useState, useMemo } from 'react';
import { ActivityIndicator, Alert, Image, Modal, Platform, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const getCorrectUrl = (url: string) => {
    if (!url || typeof url !== 'string') return '';
    if (url.startsWith('blob:')) return '';
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
            <VideoView player={player} style={{ width: '100%', height: '100%' }} contentFit="cover" nativeControls={false} />
        </View>
    );
}

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
    const [isRequested, setIsRequested] = useState(false);
    const [userLoading, setUserLoading] = useState(true);

    const { colors, isDark } = useThemeContext();
    const { width } = useWindowDimensions();
    const isDesktop = Platform.OS === 'web' && width > 768;
    const COLUMN_WIDTH = isDesktop ? Math.floor((900 - 64 - 16) / 3) : width / 3;
    const styles = useMemo(() => createStyles(colors, isDark, width, COLUMN_WIDTH, isDesktop), [colors, isDark, width, COLUMN_WIDTH, isDesktop]);

    useEffect(() => { if (id) fetchUserData(); }, [id]);
    useEffect(() => { fetchUserPosts(); }, [id]);
    useEffect(() => {
        if (currentUser) {
            const uid = id?.toString();
            setIsFollowing(!!currentUser.following?.some((f: any) => (typeof f === 'string' ? f : f._id) === uid));
            setIsRequested(!!currentUser.sentRequests?.some((r: any) => (typeof r === 'string' ? r : r._id) === uid));
        }
    }, [currentUser, id]);

    const fetchUserData = async () => {
        setUserLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/auth/user/${id}`);
            if (res.ok) {
                const data = await res.json();
                setUserData(data);
                setFollowersCount(data.followersCount || 0);
                setFollowingCount(data.followingCount || 0);
            }
        } catch (e) { console.error(e); }
        finally { setUserLoading(false); }
    };

    const fetchUserPosts = async () => {
        setPostsLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/auth/posts/${id}`);
            if (res.ok) setUserPosts(await res.json());
        } catch (e) { console.error(e); }
        finally { setPostsLoading(false); }
    };

    const handleFollow = async () => {
        if (!currentUser || !id || followLoading) return;
        const performFollow = async () => {
            setFollowLoading(true);
            try {
                const result = await followUser(id);
                if (result.success) {
                    const s = result.data.status;
                    if (s === 'followed') { setIsFollowing(true); setIsRequested(false); }
                    else if (s === 'unfollowed' || s === 'cancelled') { setIsFollowing(false); setIsRequested(false); }
                    else if (s === 'requested') { setIsFollowing(false); setIsRequested(true); }
                    if (result.data.followersCount !== undefined) setFollowersCount(result.data.followersCount);
                    if (result.data.followingCount !== undefined) setFollowingCount(result.data.followingCount);
                }
            } catch (e) { console.error(e); }
            finally { setFollowLoading(false); }
        };

        if (isFollowing || isRequested) {
            const msg = isFollowing ? `Unfollow ${userData?.name}?` : `Cancel request to ${userData?.name}?`;
            if (Platform.OS === 'web') { if (confirm(msg)) performFollow(); }
            else Alert.alert(isFollowing ? 'Unfollow?' : 'Cancel?', msg, [{ text: 'No', style: 'cancel' }, { text: 'Yes', onPress: performFollow }]);
        } else performFollow();
    };

    const handleBlockUser = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/auth/block/${id}`, { method: 'PUT', headers: { 'Authorization': `Bearer ${currentUser?.token}` } });
            if (res.ok) { alert('User blocked'); router.replace('/'); }
        } catch (e) { console.error(e); }
    };

    const isOwnProfile = currentUser?._id === id;
    const canSeeContent = useMemo(() => !userData?.isPrivate || isFollowing || isOwnProfile, [userData?.isPrivate, isFollowing, isOwnProfile]);

    const renderContent = () => {
        if (postsLoading) return <View style={styles.emptyState}><ActivityIndicator size="large" color={colors.primary} /></View>;
        if (!canSeeContent) return (
            <View style={styles.emptyState}>
                <Ionicons name="lock-closed" size={48} color={colors.textSecondary} />
                <Text style={[styles.emptyStateText, { fontWeight: '700', fontSize: 18, marginTop: 12 }]}>This Account is Private</Text>
                <Text style={[styles.emptyStateText, { fontSize: 14 }]}>Follow to see their content</Text>
            </View>
        );
        const reels = userPosts.filter(p => p.type === 'reel' || p.type === 'video' || p.uri?.endsWith('.mp4'));
        if (activeTab === 0) {
            if (userPosts.length === 0) return <View style={styles.emptyState}><Ionicons name="grid-outline" size={48} color={colors.textSecondary} /><Text style={styles.emptyStateText}>No posts yet</Text></View>;
            return (
                <View style={styles.grid}>
                    {userPosts.map((post, i) => {
                        const isVideo = post.type === 'video' || post.type === 'reel' || post.uri?.endsWith('.mp4');
                        return (
                            <TouchableOpacity key={post._id || i} style={styles.gridItem} onPress={() => router.push({ pathname: '/media-view', params: { type: isVideo ? 'video' : 'image', postId: post._id } })}>
                                {isVideo ? <GridVideoItem uri={post.uri || post.videoUri} style={styles.gridImage} /> : <Image source={{ uri: getCorrectUrl(post.uri || post.image) }} style={styles.gridImage} resizeMode="cover" />}
                                {isVideo && <View style={styles.videoIconOverlay}><Ionicons name="play" size={16} color="white" /></View>}
                            </TouchableOpacity>
                        );
                    })}
                </View>
            );
        } else if (activeTab === 1) {
            if (reels.length === 0) return <View style={styles.emptyState}><Ionicons name="film-outline" size={48} color={colors.textSecondary} /><Text style={styles.emptyStateText}>No reels yet</Text></View>;
            return (
                <View style={styles.grid}>
                    {reels.map((post, i) => (
                        <TouchableOpacity key={post._id || i} style={styles.reelItem} onPress={() => router.push({ pathname: '/media-view', params: { type: 'video', postId: post._id } })}>
                            <GridVideoItem uri={post.uri} style={styles.gridImage} />
                            <View style={styles.reelIconOverlay}><Ionicons name="play" size={14} color="white" /><Text style={styles.reelViews}>{post.views || 0}</Text></View>
                        </TouchableOpacity>
                    ))}
                </View>
            );
        }
        return <View style={styles.emptyState}><Ionicons name="play-outline" size={48} color={colors.textSecondary} /><Text style={styles.emptyStateText}>No videos yet</Text></View>;
    };

    // Follow/Message button component
    const FollowBtn = ({ compact }: { compact?: boolean }) => (
        <TouchableOpacity
            style={[styles.followBtn, (isFollowing || isRequested) && styles.followBtnOutline, followLoading && { opacity: 0.6 }, compact && { height: 36, paddingVertical: 0 }]}
            onPress={handleFollow} disabled={followLoading}
        >
            {followLoading ? <ActivityIndicator size="small" color={(isFollowing || isRequested) ? colors.text : '#fff'} /> :
                <Text style={[styles.followBtnText, (isFollowing || isRequested) && { color: colors.text }]}>
                    {isFollowing ? 'Following' : isRequested ? 'Requested' : 'Follow'}
                </Text>}
        </TouchableOpacity>
    );
    const MsgBtn = ({ compact }: { compact?: boolean }) => (
        <TouchableOpacity style={[styles.msgBtn, compact && { height: 36, paddingVertical: 0 }]} onPress={() => router.push('/chat')}>
            <Text style={[styles.msgBtnText, { color: colors.text }]}>Message</Text>
        </TouchableOpacity>
    );

    if (userLoading) return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}><TouchableOpacity onPress={() => router.back()} style={styles.backBtn}><Ionicons name="chevron-back" size={24} color="white" /></TouchableOpacity></View>
            <SkeletonProfile />
        </SafeAreaView>
    );

    return (
        <SafeAreaView style={styles.container}>
            {/* Floating header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="chevron-back" size={24} color="white" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.backBtn} onPress={() => setOptionsVisible(true)}>
                    <Ionicons name="ellipsis-horizontal" size={22} color="white" />
                </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={isDesktop} contentContainerStyle={{ paddingBottom: isDesktop ? 60 : 100 }}>
                {/* ── COVER ── */}
                <View style={{ width: '100%', height: isDesktop ? 320 : 180 }}>
                    <Image source={{ uri: getCorrectUrl(userData?.coverImage) || 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=1400&q=80' }} style={[StyleSheet.absoluteFill, { backgroundColor: colors.gray }]} resizeMode="cover" />
                    <LinearGradient colors={['transparent', 'transparent', 'rgba(0,0,0,0.7)']} style={StyleSheet.absoluteFill} />
                </View>

                <View style={isDesktop ? styles.desktopWrapper : undefined}>

                    {isDesktop ? (
                        /* ── DESKTOP: avatar + buttons row ── */
                        <View style={styles.desktopHeaderRow}>
                            <LinearGradient colors={[colors.primary, '#8b5cf6', '#ec4899']} style={[styles.avatarGradientBorder, styles.avatarGradientBorderDesktop]}>
                                <View style={[styles.avatarBorder, styles.avatarBorderDesktop]}>
                                    <Image source={{ uri: getCorrectUrl(userData?.avatar) || 'https://i.pravatar.cc/150' }} style={[styles.avatar, styles.avatarDesktop]} />
                                </View>
                            </LinearGradient>
                            <View style={styles.desktopActionGroup}>
                                <FollowBtn compact />
                                <MsgBtn compact />
                                <TouchableOpacity style={styles.btnIcon} onPress={() => setOptionsVisible(true)}>
                                    <Ionicons name="ellipsis-horizontal" size={18} color={colors.text} />
                                </TouchableOpacity>
                            </View>
                        </View>
                    ) : (
                        /* ── MOBILE: avatar left, stats right (Instagram style) ── */
                        <View style={styles.mobileHeaderSection}>
                            <LinearGradient colors={[colors.primary, '#8b5cf6', '#ec4899']} style={styles.avatarGradientBorder}>
                                <View style={styles.avatarBorder}>
                                    <Image source={{ uri: getCorrectUrl(userData?.avatar) || 'https://i.pravatar.cc/150' }} style={styles.avatar} />
                                </View>
                            </LinearGradient>
                            <View style={styles.mobileStatsGroup}>
                                <View style={styles.mobileStatItem}>
                                    <Text style={styles.statNumber}>{userPosts.length}</Text>
                                    <Text style={styles.statLabel}>Posts</Text>
                                </View>
                                <TouchableOpacity style={styles.mobileStatItem} onPress={() => router.push({ pathname: '/users-list', params: { type: 'followers', title: 'Followers', userId: id } })}>
                                    <Text style={styles.statNumber}>{followersCount}</Text>
                                    <Text style={styles.statLabel}>Followers</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.mobileStatItem} onPress={() => router.push({ pathname: '/users-list', params: { type: 'following', title: 'Following', userId: id } })}>
                                    <Text style={styles.statNumber}>{followingCount}</Text>
                                    <Text style={styles.statLabel}>Following</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}

                    {/* ── META ── */}
                    <View style={isDesktop ? styles.desktopMeta : styles.mobileMeta}>
                        <Text style={styles.name}>{userData?.name}</Text>
                        <Text style={styles.handle}>@{userData?.handle}{userData?.pronouns ? `  ·  ${userData.pronouns.replace(/\//g, ' / ')}` : ''}</Text>

                        {userData?.bio ? userData.bio.split('\n').map((line: any, i: any) => <Text key={i} style={styles.bio}>{line}</Text>) : null}

                        {userData?.links && userData.links.length > 0 && (
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
                                {userData.links.map((link: any, i: any) => {
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

                        {/* Desktop stats */}
                        {isDesktop && (
                            <View style={styles.statsRow}>
                                <View style={styles.statItem}><Text style={styles.statNumber}>{userPosts.length}</Text><Text style={styles.statLabel}>Posts</Text></View>
                                <View style={styles.vertDivider} />
                                <TouchableOpacity style={styles.statItem} onPress={() => router.push({ pathname: '/users-list', params: { type: 'followers', title: 'Followers', userId: id } })}><Text style={styles.statNumber}>{followersCount}</Text><Text style={styles.statLabel}>Followers</Text></TouchableOpacity>
                                <View style={styles.vertDivider} />
                                <TouchableOpacity style={styles.statItem} onPress={() => router.push({ pathname: '/users-list', params: { type: 'following', title: 'Following', userId: id } })}><Text style={styles.statNumber}>{followingCount}</Text><Text style={styles.statLabel}>Following</Text></TouchableOpacity>
                            </View>
                        )}

                        {/* Mobile actions */}
                        {!isDesktop && (
                            <View style={styles.mobileActionsRow}>
                                <FollowBtn />
                                <MsgBtn />
                                <TouchableOpacity style={styles.btnShareMobile} onPress={() => setOptionsVisible(true)}>
                                    <Ionicons name="ellipsis-horizontal" size={18} color={colors.text} />
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>

                    {/* ── TABS ── */}
                    <View style={styles.tabSection}>
                        <View style={styles.tabHeader}>
                            {[{ label: 'Posts', icon: 'grid-outline', activeIcon: 'grid' }, { label: 'Reels', icon: 'film-outline', activeIcon: 'film' }, { label: 'Videos', icon: 'play-outline', activeIcon: 'play' }].map((tab, i) => (
                                <TouchableOpacity key={i} style={styles.tabBtn} onPress={() => setActiveTab(i)}>
                                    <Ionicons name={(activeTab === i ? tab.activeIcon : tab.icon) as any} size={20} color={activeTab === i ? colors.text : colors.textSecondary} />
                                    {isDesktop && <Text style={[styles.tabLabelText, { color: activeTab === i ? colors.text : colors.textSecondary }]}>{tab.label}</Text>}
                                    {activeTab === i && <View style={styles.tabIndicator} />}
                                </TouchableOpacity>
                            ))}
                        </View>
                        {renderContent()}
                    </View>

                </View>
            </ScrollView>

            {/* Options Modal */}
            <Modal animationType="fade" transparent visible={optionsVisible} onRequestClose={() => setOptionsVisible(false)}>
                <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setOptionsVisible(false)}>
                    <View style={[styles.modalContent, { backgroundColor: isDark ? '#1C1C1E' : '#fff' }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: colors.text }]}>Options</Text>
                            <TouchableOpacity onPress={() => setOptionsVisible(false)}><X size={24} color={colors.text} /></TouchableOpacity>
                        </View>
                        <TouchableOpacity style={[styles.modalOption, { borderBottomColor: colors.border }]} onPress={() => setOptionsVisible(false)}>
                            <Flag size={20} color={colors.text} /><Text style={[styles.modalOptionText, { color: colors.text }]}>Report User</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.modalOption} onPress={() => { setOptionsVisible(false); handleBlockUser(); }}>
                            <Ban size={20} color="#FF3B30" /><Text style={[styles.modalOptionText, { color: '#FF3B30' }]}>Block User</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.modalOption} onPress={() => { setOptionsVisible(false); /* share */ }}>
                            <Share2 size={20} color={colors.text} /><Text style={[styles.modalOptionText, { color: colors.text }]}>Share Profile</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>
        </SafeAreaView>
    );
}

const createStyles = (colors: any, isDark: boolean, width: number, COLUMN_WIDTH: number, isDesktop: boolean) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },

    // ── HEADER ──────────────────────────────────────────
    header: {
        position: 'absolute',
        top: Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) + 10 : 50,
        left: 0, right: 0, flexDirection: 'row',
        justifyContent: 'space-between', paddingHorizontal: 16, zIndex: 10,
    },
    backBtn: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center',
    },

    // ── DESKTOP WRAPPER ────────────────────────────────
    desktopWrapper: { maxWidth: 900, alignSelf: 'center', width: '100%' },

    // ── DESKTOP HEADER ROW ─────────────────────────────
    desktopHeaderRow: {
        flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between',
        paddingHorizontal: 32, marginTop: -56, marginBottom: 12, zIndex: 10,
    },
    desktopActionGroup: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingBottom: 8 },

    // ── MOBILE HEADER ──────────────────────────────────
    mobileHeaderSection: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 16, marginTop: -36, marginBottom: 12, gap: 20,
    },
    mobileStatsGroup: {
        flex: 1, flexDirection: 'row', justifyContent: 'space-around',
        alignItems: 'center', paddingTop: 36,
    },
    mobileStatItem: { alignItems: 'center', gap: 2 },

    // ── AVATAR ─────────────────────────────────────────
    avatarGradientBorder: { padding: 3, borderRadius: 68, alignSelf: 'flex-start' as any },
    avatarGradientBorderDesktop: { borderRadius: 96, alignSelf: 'auto' as any },
    avatarBorder: {
        padding: 4, borderRadius: 65, backgroundColor: colors.background,
        shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 12,
    },
    avatarBorderDesktop: { borderRadius: 93 },
    avatar: { width: 90, height: 90, borderRadius: 45, backgroundColor: colors.gray },
    avatarDesktop: { width: 170, height: 170, borderRadius: 85 },

    // ── ACTION BUTTONS ─────────────────────────────────
    followBtn: {
        flex: 1, paddingVertical: 10, borderRadius: 24, alignItems: 'center', justifyContent: 'center',
        backgroundColor: colors.primary,
    },
    followBtnOutline: {
        backgroundColor: 'transparent', borderWidth: 1.5,
        borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)',
    },
    followBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
    msgBtn: {
        flex: 1, paddingVertical: 10, borderRadius: 24, alignItems: 'center', justifyContent: 'center',
        borderWidth: 1.5, borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)',
        backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
    },
    msgBtnText: { fontWeight: '700', fontSize: 14 },
    btnIcon: {
        width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center',
        borderWidth: 1.5, borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)',
        backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
    },
    btnShareMobile: {
        width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center',
        borderWidth: 1.5, borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)',
        backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
    },
    mobileActionsRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 16 },

    // ── META ───────────────────────────────────────────
    desktopMeta: { paddingHorizontal: 32, paddingBottom: 8 },
    mobileMeta: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 8 },
    name: { fontSize: isDesktop ? 28 : 22, fontWeight: '900', color: colors.text, letterSpacing: -0.5, marginBottom: 2 },
    handle: { fontSize: 14, fontWeight: '500', color: colors.textSecondary, marginBottom: 8 },
    bio: { fontSize: 15, color: colors.text, lineHeight: 22, marginBottom: 2 },
    linkChip: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    link: { fontSize: 14, color: colors.primary, textDecorationLine: 'underline' },

    // ── STATS ──────────────────────────────────────────
    statsRow: { flexDirection: 'row', alignItems: 'center', marginTop: 20, marginBottom: 8 },
    statItem: { flex: 1, alignItems: 'center' },
    statNumber: { fontSize: 20, fontWeight: '900', color: colors.text, letterSpacing: -0.5, marginBottom: 2 },
    statLabel: { fontSize: 11, fontWeight: '600', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, opacity: 0.7 },
    vertDivider: { width: 1, height: 30, backgroundColor: colors.border },

    // ── TABS ───────────────────────────────────────────
    tabSection: { flex: 1 },
    tabHeader: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.border, paddingHorizontal: isDesktop ? 32 : 0 },
    tabBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, position: 'relative' },
    tabLabelText: { fontSize: 14, fontWeight: '700' },
    tabIndicator: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 2.5, backgroundColor: colors.text, borderRadius: 2 },

    // ── GRID ───────────────────────────────────────────
    grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: isDesktop ? 32 : 0, paddingTop: isDesktop ? 16 : 0, gap: isDesktop ? 8 : 0 },
    gridItem: { width: isDesktop ? COLUMN_WIDTH - 6 : COLUMN_WIDTH, height: (isDesktop ? COLUMN_WIDTH - 6 : COLUMN_WIDTH) * 1.25, padding: isDesktop ? 0 : 1, position: 'relative' },
    gridImage: { width: '100%', height: '100%', borderRadius: isDesktop ? 16 : 0, backgroundColor: isDark ? '#111' : '#f0f0f0' },
    videoIconOverlay: { position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 4, padding: 4 },
    reelItem: { width: isDesktop ? COLUMN_WIDTH - 6 : COLUMN_WIDTH, height: (isDesktop ? COLUMN_WIDTH - 6 : COLUMN_WIDTH) * 1.6, padding: isDesktop ? 0 : 1, position: 'relative' },
    reelIconOverlay: { position: 'absolute', bottom: 8, left: 8, flexDirection: 'row', alignItems: 'center', gap: 4 },
    reelViews: { color: 'white', fontSize: 12, fontWeight: '600' },

    // ── EMPTY / LOADING ────────────────────────────────
    emptyState: { padding: 60, alignItems: 'center', justifyContent: 'center', gap: 12 },
    emptyStateText: { color: colors.textSecondary, fontSize: 16 },

    // ── MODAL ──────────────────────────────────────────
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 24 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    modalTitle: { fontSize: 18, fontWeight: 'bold' },
    modalOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, gap: 16, borderBottomWidth: 1, borderBottomColor: isDark ? '#333' : '#f0f0f0' },
    modalOptionText: { fontSize: 16, fontWeight: '500' },
});
