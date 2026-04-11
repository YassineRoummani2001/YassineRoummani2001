import { SkeletonProfile } from '@/components/Skeletons';
import { API_BASE_URL } from '@/constants/Config';
import { useThemeContext } from '@/context/ThemeContext';
import { useUser } from '@/context/UserContext';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Ban, Flag, Share2, X } from 'lucide-react-native';
import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    Image,
    Modal,
    Platform,
    Pressable,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    useWindowDimensions,
    View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import VibeConfirmModal from '@/components/VibeConfirmModal';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const getCorrectUrl = (url: string | null | undefined) => {
    if (!url || typeof url !== 'string' || url.trim() === '') return undefined;
    const clean = url.trim();

    if (clean.startsWith('blob:') || clean.startsWith('file:') || clean.startsWith('data:')) return clean;

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

const formatCount = (n: number) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 10_000) return `${(n / 1_000).toFixed(0)}K`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return n.toString();
};

// ─── Grid Video Item ──────────────────────────────────────────────────────────
function GridVideoItem({ uri, style }: { uri: string; style: any }) {
    const player = useVideoPlayer(getCorrectUrl(uri) || '', (player) => {
        player.loop = true;
        player.muted = true;
    });
    return (
        <View pointerEvents="none" style={[style, { overflow: 'hidden', backgroundColor: '#000' }]}>
            <VideoView
                player={player}
                style={{ width: '100%', height: '100%' }}
                contentFit="cover"
                nativeControls={false}
            />
        </View>
    );
}

// ─── Hoverable Grid Card (web hover effects) ─────────────────────────────────
function HoverableGridCard({
    post,
    isVideo,
    isReel,
    style,
    imageStyle,
    onPress,
    isDark,
    colors,
}: any) {
    const [hovered, setHovered] = useState(false);
    const scaleAnim = useRef(new Animated.Value(1)).current;

    const onHoverIn = () => {
        setHovered(true);
        Animated.spring(scaleAnim, {
            toValue: 1.03,
            friction: 20,
            tension: 200,
            useNativeDriver: true,
        }).start();
    };

    const onHoverOut = () => {
        setHovered(false);
        Animated.spring(scaleAnim, {
            toValue: 1,
            friction: 20,
            tension: 200,
            useNativeDriver: true,
        }).start();
    };

    return (
        <Animated.View
            style={[
                style,
                { transform: [{ scale: scaleAnim }] },
            ]}
        >
            <Pressable
                onPress={onPress}
                // @ts-ignore web
                onHoverIn={onHoverIn}
                onHoverOut={onHoverOut}
                style={{ width: '100%', height: '100%', borderRadius: 14, overflow: 'hidden' }}
            >
                {isVideo || isReel ? (
                    <GridVideoItem uri={post.uri || post.videoUri} style={imageStyle} />
                ) : (
                    <Image
                        source={{ uri: getCorrectUrl(post.uri || post.image) }}
                        style={imageStyle}
                        resizeMode="cover"
                    />
                )}

                {/* Play icon for video/reel */}
                {(isVideo || isReel) && (
                    <View style={gridOverlayStyles.playBadge}>
                        <Ionicons name="play" size={isReel ? 12 : 14} color="white" />
                    </View>
                )}

                {/* Hover overlay with likes/views */}
                {hovered && (
                    <View style={gridOverlayStyles.hoverOverlay}>
                        <View style={gridOverlayStyles.hoverStats}>
                            {isReel || isVideo ? (
                                <View style={gridOverlayStyles.hoverStatItem}>
                                    <View style={gridOverlayStyles.shadowIcon}>
                                        <Ionicons name="play" size={20} color="white" />
                                    </View>
                                    <Text style={gridOverlayStyles.hoverStatText}>
                                        {formatCount(post.views || 0)}
                                    </Text>
                                </View>
                            ) : null}
                            <View style={gridOverlayStyles.hoverStatItem}>
                                <View style={gridOverlayStyles.shadowIcon}>
                                    <Ionicons name="heart" size={20} color="white" />
                                </View>
                                <Text style={gridOverlayStyles.hoverStatText}>
                                    {formatCount(post.likes?.length || 0)}
                                </Text>
                            </View>
                            <View style={gridOverlayStyles.hoverStatItem}>
                                <View style={gridOverlayStyles.shadowIcon}>
                                    <Ionicons name="chatbubble" size={18} color="white" />
                                </View>
                                <Text style={gridOverlayStyles.hoverStatText}>
                                    {formatCount(post.comments?.length || 0)}
                                </Text>
                            </View>
                        </View>
                    </View>
                )}
            </Pressable>
        </Animated.View>
    );
}

const gridOverlayStyles = StyleSheet.create({
    playBadge: {
        position: 'absolute',
        top: 10,
        right: 10,
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderRadius: 6,
        padding: 5,
        backdropFilter: 'blur(4px)' as any,
    },
    hoverOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.55)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
    },
    hoverStats: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        width: '100%',
    },
    hoverStatItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    hoverStatText: {
        color: 'white',
        fontSize: 17,
        fontWeight: '900',
        textShadowColor: 'rgba(0, 0, 0, 0.4)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
    },
    shadowIcon: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.4,
        shadowRadius: 4,
    },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function UserProfileScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams();
    const { user: currentUser, followUser } = (useUser() || {}) as any;
    const [activeTab, setActiveTab] = useState(0);
    const [optionsVisible, setOptionsVisible] = useState(false);
    const [isFollowModalVisible, setFollowModalVisible] = useState(false);
    const [followModalMsg, setFollowModalMsg] = useState('');
    const [isFollowing, setIsFollowing] = useState(false);
    const [followersCount, setFollowersCount] = useState(0);
    const [followingCount, setFollowingCount] = useState(0);
    const [followLoading, setFollowLoading] = useState(false);
    const [userPosts, setUserPosts] = useState<any[]>([]);
    const [postsLoading, setPostsLoading] = useState(true);
    const [userData, setUserData] = useState<any>(null);
    const [isRequested, setIsRequested] = useState(false);
    const [isBlockingMe, setIsBlockingMe] = useState(false);
    const [userLoading, setUserLoading] = useState(true);

    const { colors, isDark } = useThemeContext();
    const { width, height: screenHeight } = useWindowDimensions();
    const isDesktop = Platform.OS === 'web' && width > 768;

    // Grid sizing: 3 columns with gaps
    const GRID_GAP = isDesktop ? 6 : 2;
    const GRID_PADDING = isDesktop ? 32 : 0;
    const GRID_MAX_WIDTH = isDesktop ? 900 : width;
    const CONTENT_WIDTH = Math.min(GRID_MAX_WIDTH - GRID_PADDING * 2, width);
    const NUM_COLS = 3;
    const COLUMN_WIDTH = Math.floor((CONTENT_WIDTH - GRID_GAP * (NUM_COLS - 1)) / NUM_COLS);

    const styles = useMemo(
        () => createStyles(colors, isDark, width, COLUMN_WIDTH, GRID_GAP, isDesktop),
        [colors, isDark, width, COLUMN_WIDTH, GRID_GAP, isDesktop]
    );

    const isBlockedByMe = useMemo(() => {
        if (!currentUser || !id) return false;
        const uid = id.toString();
        return currentUser.blockedUsers?.some((bid: any) => 
            (typeof bid === 'string' ? bid : bid._id) === uid
        );
    }, [currentUser?.blockedUsers, id]);

    // ─── Tab underline animation ─────────────────────────────────────────────
    const tabUnderlineX = useRef(new Animated.Value(0)).current;
    const tabCount = 3;

    useEffect(() => {
        Animated.spring(tabUnderlineX, {
            toValue: activeTab,
            friction: 20,
            tension: 200,
            useNativeDriver: true,
        }).start();
    }, [activeTab]);

    // ─── Data fetching ───────────────────────────────────────────────────────
    useEffect(() => { if (id) fetchUserData(); }, [id]);
    useEffect(() => { fetchUserPosts(); }, [id]);
    useEffect(() => {
        if (currentUser && id) {
            const uid = id.toString();
            const isMatch = (item: any, targetId: string) => {
                if (!item) return false;
                if (typeof item === 'string') return item === targetId;
                return item._id === targetId || item.id === targetId;
            };

            setIsFollowing(!!currentUser.following?.some((f: any) => isMatch(f, uid)));
            setIsRequested(!!currentUser.sentRequests?.some((r: any) => isMatch(r, uid)));
        }
    }, [currentUser, id]);

    const fetchUserData = async () => {
        setUserLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/auth/user/${id}`, {
                headers: { 'Authorization': `Bearer ${currentUser?.token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setUserData(data);
                setFollowersCount(data.followersCount || 0);
                setFollowingCount(data.followingCount || 0);
                setIsBlockingMe(!!data.isBlockingMe);
            }
        } catch (e) { console.error(e); }
        finally { setUserLoading(false); }
    };

    const fetchUserPosts = async () => {
        setPostsLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/auth/posts/${id}`, {
                headers: { 'Authorization': `Bearer ${currentUser?.token}` }
            });
            if (res.ok) setUserPosts(await res.json());
        } catch (e) { console.error(e); }
        finally { setPostsLoading(false); }
    };

    const handleFollow = () => {
        if (!currentUser || !id || followLoading) return;
        
        if (isFollowing || isRequested) {
            setFollowModalMsg(isFollowing ? `Unfollow ${userData?.name}?` : `Cancel request to ${userData?.name}?`);
            setFollowModalVisible(true);
        } else {
            performFollow();
        }
    };

    const performFollow = async () => {
        setFollowLoading(true);
        try {
            const result = await followUser(id);
            if (result.success) {
                const s = result.data.status;
                if (s === 'accepted' || s === 'followed') {
                    setIsFollowing(true);
                    setIsRequested(false);
                    setFollowersCount((prev: number) => prev + 1);
                } else if (s === 'unfollowed') {
                    setIsFollowing(false);
                    setIsRequested(false);
                    setFollowersCount((prev: number) => Math.max(0, prev - 1));
                } else if (s === 'cancelled') {
                    setIsFollowing(false);
                    setIsRequested(false);
                } else if (s === 'pending' || s === 'requested') {
                    setIsFollowing(false);
                    setIsRequested(true);
                }
            }
        } catch (e) { console.error(e); }
        finally { setFollowLoading(false); }
    };

    const handleBlockUser = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/auth/block/${id}`, {
                method: 'PUT',
                headers: { Authorization: `Bearer ${currentUser?.token}` },
            });
            if (res.ok) { 
                const data = await res.json();
                // Refresh currentUser to update blockedUsers list
                // You might have a refreshUser in your context
                // For now, let's just show an alert and reload
                Alert.alert('Success', isBlockedByMe ? 'User unblocked' : 'User blocked');
                // router.replace('/');
                // Ideally we refresh the context here
            }
        } catch (e) { console.error(e); }
    };

    const isOwnProfile = currentUser?._id === id;
    const canSeeContent = useMemo(() => {
        if (!userData || isBlockedByMe || isBlockingMe) return false;
        if (isOwnProfile) return true;
        if (isFollowing) return true;
        return !userData.isPrivate;
    }, [userData, isFollowing, isOwnProfile, isBlockedByMe, isBlockingMe]);

    // ─── Content renderer ────────────────────────────────────────────────────
    const reelsOnly = useMemo(
        () => userPosts.filter((p) => p.type === 'reel'),
        [userPosts]
    );

    const videos = useMemo(
        () => userPosts.filter((p) => p.type === 'video' || p.uri?.endsWith('.mp4') || p.videoUri),
        [userPosts]
    );

    const renderContent = () => {
        if (isBlockedByMe) {
            return (
                <View style={styles.privateState}>
                    <View style={[styles.privateIconWrap, { backgroundColor: colors.danger + '20' }]}>
                        <Ionicons name="ban" size={40} color={colors.danger} />
                    </View>
                    <Text style={[styles.emptyTitle, { color: colors.danger }]}>User Blocked</Text>
                    <Text style={styles.emptySub}>You have blocked this user. Unblock them to see their content.</Text>
                    <TouchableOpacity 
                        style={[styles.followBtn, { marginTop: 20, backgroundColor: colors.danger }]}
                        onPress={handleBlockUser}
                    >
                        <Text style={styles.followBtnText}>Unblock User</Text>
                    </TouchableOpacity>
                </View>
            );
        }

        if (isBlockingMe) {
            return (
                <View style={styles.privateState}>
                    <View style={styles.privateIconWrap}>
                        <Ionicons name="alert-circle-outline" size={40} color={colors.textSecondary} />
                    </View>
                    <Text style={styles.emptyTitle}>User unavailable</Text>
                    <Text style={styles.emptySub}>This account is not available to you.</Text>
                </View>
            );
        }

        if (!canSeeContent) {
            return (
                <View style={styles.privateState}>
                    <View style={styles.privateIconWrap}>
                        <Ionicons name="lock-closed" size={40} color={colors.textSecondary} />
                    </View>
                    <Text style={styles.emptyTitle}>This Account is Private</Text>
                    <Text style={styles.emptySub}>Follow this account to see their posts and reels.</Text>
                </View>
            );
        }

        if (postsLoading) {
            return (
                <View style={styles.emptyState}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            );
        }


        if (!canSeeContent) {
            return (
                <View style={styles.emptyState}>
                    <View style={styles.emptyIconWrap}>
                        <Ionicons name="lock-closed" size={36} color={colors.textSecondary} />
                    </View>
                    <Text style={styles.emptyTitle}>This Account is Private</Text>
                    <Text style={styles.emptySub}>Follow this account to see their photos and videos.</Text>
                </View>
            );
        }

        // — Posts tab
        if (activeTab === 0) {
            if (userPosts.length === 0) {
                return (
                    <View style={styles.emptyState}>
                        <View style={styles.emptyIconWrap}>
                            <Ionicons name="camera-outline" size={40} color={colors.textSecondary} />
                        </View>
                        <Text style={styles.emptyTitle}>No Posts Yet</Text>
                        <Text style={styles.emptySub}>When they share photos, they'll appear here.</Text>
                    </View>
                );
            }
            return (
                <View style={styles.grid}>
                    {userPosts.map((post, i) => {
                        const isVideo = post.type === 'video' || post.type === 'reel' || post.uri?.endsWith('.mp4');
                        return (
                            <HoverableGridCard
                                key={post._id || i}
                                post={post}
                                isVideo={isVideo}
                                isReel={false}
                                style={styles.gridItem}
                                imageStyle={styles.gridImage}
                                isDark={isDark}
                                colors={colors}
                                onPress={() =>
                                    router.push({
                                        pathname: '/media-view',
                                        params: { type: isVideo ? 'video' : 'image', postId: post._id },
                                    })
                                }
                            />
                        );
                    })}
                </View>
            );
        }

        // — Reels tab
        if (activeTab === 1) {
            if (reelsOnly.length === 0) {
                return (
                    <View style={styles.emptyState}>
                        <View style={styles.emptyIconWrap}>
                            <Ionicons name="film-outline" size={40} color={colors.textSecondary} />
                        </View>
                        <Text style={styles.emptyTitle}>No Reels Yet</Text>
                        <Text style={styles.emptySub}>When they share reels, they'll show up here.</Text>
                    </View>
                );
            }
            return (
                <View style={styles.reelsGrid}>
                    {reelsOnly.map((post, i) => (
                        <HoverableGridCard
                            key={post._id || i}
                            post={post}
                            isVideo={true}
                            isReel={true}
                            style={styles.reelItem}
                            imageStyle={styles.gridImage}
                            isDark={isDark}
                            colors={colors}
                            onPress={() =>
                                router.push({
                                    pathname: '/media-view',
                                    params: { type: 'video', postId: post._id },
                                })
                            }
                        />
                    ))}
                </View>
            );
        }

        // — Videos tab
        if (activeTab === 2) {
            if (videos.length === 0) {
                return (
                    <View style={styles.emptyState}>
                        <View style={styles.emptyIconWrap}>
                            <Ionicons name="play-outline" size={40} color={colors.textSecondary} />
                        </View>
                        <Text style={styles.emptyTitle}>No Videos Yet</Text>
                        <Text style={styles.emptySub}>When they share videos, they'll show up here.</Text>
                    </View>
                );
            }
            return (
                <View style={styles.grid}>
                    {videos.map((post, i) => (
                        <HoverableGridCard
                            key={post._id || i}
                            post={post}
                            isVideo={true}
                            isReel={false}
                            style={styles.gridItem}
                            imageStyle={styles.gridImage}
                            isDark={isDark}
                            colors={colors}
                            onPress={() =>
                                router.push({
                                    pathname: '/media-view',
                                    params: { type: 'video', postId: post._id },
                                })
                            }
                        />
                    ))}
                </View>
            );
        }
    };

    // ─── Buttons ─────────────────────────────────────────────────────────────
    const FollowBtn = ({ compact }: { compact?: boolean }) => (
        <TouchableOpacity
            style={[
                styles.followBtn,
                (isFollowing || isRequested) && styles.followBtnOutline,
                followLoading && { opacity: 0.6 },
                compact && { height: 38, paddingVertical: 0 },
            ]}
            onPress={handleFollow}
            disabled={followLoading}
            activeOpacity={0.8}
        >
            {followLoading ? (
                <ActivityIndicator size="small" color={(isFollowing || isRequested) ? colors.text : '#fff'} />
            ) : (
                <Text style={[styles.followBtnText, (isFollowing || isRequested) && { color: colors.text }]}>
                    {isFollowing ? 'Following' : isRequested ? 'Requested' : 'Follow'}
                </Text>
            )}
        </TouchableOpacity>
    );

    const MsgBtn = ({ compact }: { compact?: boolean }) => (
        <TouchableOpacity
            style={[styles.msgBtn, compact && { height: 38, paddingVertical: 0 }]}
            onPress={() => router.push('/chat')}
            activeOpacity={0.8}
        >
            <Text style={[styles.msgBtnText, { color: colors.text }]}>Message</Text>
        </TouchableOpacity>
    );

    // ─── Loading state ───────────────────────────────────────────────────────
    if (userLoading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <Ionicons name="chevron-back" size={24} color="white" />
                    </TouchableOpacity>
                </View>
                <SkeletonProfile />
            </SafeAreaView>
        );
    }

    // ─── Tab configuration ───────────────────────────────────────────────────
    const tabs = [
        { label: 'Posts', icon: 'grid-outline', activeIcon: 'grid' },
        { label: 'Reels', icon: 'film-outline', activeIcon: 'film' },
        { label: 'Videos', icon: 'play-outline', activeIcon: 'play' },
    ];

    // Calculate underline position
    const tabContainerWidth = isDesktop ? 400 : width;
    const tabWidth = tabContainerWidth / tabCount;

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

            {/* Floating header */}
            {!isDesktop && (
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.8}>
                        <Ionicons name="chevron-back" size={22} color="white" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.backBtn} onPress={() => setOptionsVisible(true)} activeOpacity={0.8}>
                        <Ionicons name="ellipsis-horizontal" size={20} color="white" />
                    </TouchableOpacity>
                </View>
            )}

            <ScrollView
                showsVerticalScrollIndicator={isDesktop}
                contentContainerStyle={{ paddingBottom: isDesktop ? 80 : 120 }}
            >
                {/* ── Cover ── */}
                <View style={styles.coverContainer}>
                    <Image
                        source={{
                            uri:
                                getCorrectUrl(userData?.coverImage) ||
                                'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=1400&q=80',
                        }}
                        style={[StyleSheet.absoluteFill, { backgroundColor: colors.gray }]}
                        resizeMode="cover"
                    />
                    <LinearGradient
                        colors={['transparent', 'transparent', isDark ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.6)']}
                        style={StyleSheet.absoluteFill}
                    />
                </View>

                <View style={isDesktop ? styles.desktopWrapper : undefined}>
                    {/* ── Profile Header ── */}
                    {isDesktop ? (
                        <View style={styles.desktopHeaderRow}>
                            {/* Avatar */}
                            <View style={styles.avatarSection}>
                                <LinearGradient
                                    colors={[colors.primary, '#8b5cf6', '#ec4899']}
                                    style={styles.avatarRing}
                                >
                                    <View style={[styles.avatarInner, { backgroundColor: colors.background }]}>
                                        <Image
                                            source={{ uri: getCorrectUrl(userData?.avatar) || `https://ui-avatars.com/api/?name=${encodeURIComponent(userData?.name || 'User')}&background=random` }}
                                            style={styles.avatarImage}
                                        />
                                    </View>
                                </LinearGradient>
                            </View>

                            {/* Right side: stacked layout — name → buttons → stats → bio */}
                            <View style={styles.desktopHeaderRight}>

                                {/* Row 1: name + handle (full width, no buttons here) */}
                                <View style={styles.desktopNameBlock}>
                                    <Text style={styles.name} numberOfLines={1}>{userData?.name}</Text>
                                    <Text style={styles.handle} numberOfLines={1}>
                                        @{userData?.handle?.replace(/^@+/, '')}
                                        {userData?.pronouns ? `  ·  ${userData.pronouns.replace(/\//g, ' / ')}` : ''}
                                    </Text>
                                </View>

                                {/* Row 2: action buttons */}
                                {!isOwnProfile && (
                                    <View style={styles.desktopActionGroup}>
                                        <FollowBtn compact />
                                        {canSeeContent && (
                                            <>
                                                <MsgBtn compact />
                                                <TouchableOpacity
                                                    style={styles.btnIcon}
                                                    onPress={() => setOptionsVisible(true)}
                                                    activeOpacity={0.8}
                                                >
                                                    <Ionicons name="ellipsis-horizontal" size={18} color={colors.text} />
                                                </TouchableOpacity>
                                            </>
                                        )}
                                    </View>
                                )}

                                {/* Row 3: stats */}
                                <View style={styles.desktopStatsRow}>
                                    <View style={styles.statPill}>
                                        <Text style={styles.statNumber}>{formatCount(userPosts.length)}</Text>
                                        <Text style={styles.statLabel}>posts</Text>
                                    </View>
                                    <TouchableOpacity
                                        style={styles.statPill}
                                        onPress={() => router.push({ pathname: '/users-list', params: { type: 'followers', title: 'Followers', userId: id } })}
                                        activeOpacity={canSeeContent ? 0.7 : 1}
                                        disabled={!canSeeContent}
                                    >
                                        <Text style={styles.statNumber}>{formatCount(followersCount)}</Text>
                                        <Text style={styles.statLabel}>followers</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={styles.statPill}
                                        onPress={() => router.push({ pathname: '/users-list', params: { type: 'following', title: 'Following', userId: id } })}
                                        activeOpacity={canSeeContent ? 0.7 : 1}
                                        disabled={!canSeeContent}
                                    >
                                        <Text style={styles.statNumber}>{formatCount(followingCount)}</Text>
                                        <Text style={styles.statLabel}>following</Text>
                                    </TouchableOpacity>
                                </View>

                                {/* Row 4: Bio */}
                                {userData?.bio ? (
                                    <View style={styles.bioSection}>
                                        {userData.bio.split('\n').map((line: string, i: number) => (
                                            <Text key={i} style={styles.bio}>{line}</Text>
                                        ))}
                                    </View>
                                ) : null}

                                {/* Row 5: Links */}
                                {userData?.links && userData.links.length > 0 && (
                                    <View style={styles.linksRow}>
                                        {userData.links.map((link: any, i: number) => {
                                            const url = typeof link === 'object' ? link.url : link;
                                            const title = typeof link === 'object' ? (link.title || link.url) : link;
                                            return (
                                                <TouchableOpacity
                                                    key={i}
                                                    onPress={() => Platform.OS === 'web' ? window.open(url, '_blank') : null}
                                                    style={styles.linkChip}
                                                    activeOpacity={0.7}
                                                >
                                                    <Ionicons name="link-outline" size={13} color={colors.primary} />
                                                    <Text style={styles.linkText} numberOfLines={1}>{title}</Text>
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </View>
                                )}
                            </View>
                        </View>
                    ) : (
                        /* ── Mobile header ── */
                        <>
                            <View style={styles.mobileHeaderSection}>
                                <LinearGradient
                                    colors={[colors.primary, '#8b5cf6', '#ec4899']}
                                    style={styles.mobileAvatarRing}
                                >
                                    <View style={[styles.mobileAvatarInner, { backgroundColor: colors.background }]}>
                                        <Image
                                            source={{ uri: getCorrectUrl(userData?.avatar) || `https://ui-avatars.com/api/?name=${encodeURIComponent(userData?.name || 'User')}&background=random` }}
                                            style={styles.mobileAvatarImage}
                                        />
                                    </View>
                                </LinearGradient>
                                <View style={styles.mobileStatsGroup}>
                                    <View style={styles.mobileStatItem}>
                                        <Text style={styles.statNumber}>{formatCount(userPosts.length)}</Text>
                                        <Text style={styles.statLabel}>posts</Text>
                                    </View>
                                    <TouchableOpacity
                                        style={styles.mobileStatItem}
                                        onPress={() => router.push({ pathname: '/users-list', params: { type: 'followers', title: 'Followers', userId: id } })}
                                        disabled={!canSeeContent}
                                        activeOpacity={canSeeContent ? 0.7 : 1}
                                    >
                                        <Text style={styles.statNumber}>{formatCount(followersCount)}</Text>
                                        <Text style={styles.statLabel}>followers</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={styles.mobileStatItem}
                                        onPress={() => router.push({ pathname: '/users-list', params: { type: 'following', title: 'Following', userId: id } })}
                                        disabled={!canSeeContent}
                                        activeOpacity={canSeeContent ? 0.7 : 1}
                                    >
                                        <Text style={styles.statNumber}>{formatCount(followingCount)}</Text>
                                        <Text style={styles.statLabel}>following</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <View style={styles.mobileMeta}>
                                <Text style={styles.name}>{userData?.name}</Text>
                                <Text style={styles.handle}>
                                    @{userData?.handle?.replace(/^@+/, '')}
                                    {userData?.pronouns ? `  ·  ${userData.pronouns.replace(/\//g, ' / ')}` : ''}
                                </Text>
                                {userData?.bio
                                    ? userData.bio.split('\n').map((line: string, i: number) => (
                                          <Text key={i} style={styles.bio}>{line}</Text>
                                      ))
                                    : null}
                                {userData?.links && userData.links.length > 0 && (
                                    <View style={styles.linksRow}>
                                        {userData.links.map((link: any, i: number) => {
                                            const url = typeof link === 'object' ? link.url : link;
                                            const title = typeof link === 'object' ? (link.title || link.url) : link;
                                            return (
                                                <TouchableOpacity
                                                    key={i}
                                                    onPress={() => Platform.OS === 'web' ? window.open(url, '_blank') : null}
                                                    style={styles.linkChip}
                                                    activeOpacity={0.7}
                                                >
                                                    <Ionicons name="link-outline" size={13} color={colors.primary} />
                                                    <Text style={styles.linkText} numberOfLines={1}>{title}</Text>
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </View>
                                )}

                                {!isOwnProfile && (
                                    <View style={styles.mobileActionsRow}>
                                        <FollowBtn />
                                        {canSeeContent && (
                                            <>
                                                <MsgBtn />
                                                <TouchableOpacity
                                                    style={styles.btnShareMobile}
                                                    onPress={() => setOptionsVisible(true)}
                                                    activeOpacity={0.8}
                                                >
                                                    <Ionicons name="ellipsis-horizontal" size={18} color={colors.text} />
                                                </TouchableOpacity>
                                            </>
                                        )}
                                    </View>
                                )}
                            </View>
                        </>
                    )}

                    {/* ── Tabs ── */}
                    <View style={styles.tabSection}>
                        <View style={styles.tabHeaderContainer}>
                            <View style={styles.tabHeader}>
                                {tabs.map((tab, i) => (
                                    <TouchableOpacity
                                        key={i}
                                        style={styles.tabBtn}
                                        onPress={() => setActiveTab(i)}
                                        activeOpacity={0.7}
                                    >
                                        <Ionicons
                                            name={(activeTab === i ? tab.activeIcon : tab.icon) as any}
                                            size={isDesktop ? 16 : 22}
                                            color={activeTab === i ? colors.text : colors.textSecondary}
                                        />
                                        {isDesktop && (
                                            <Text
                                                style={[
                                                    styles.tabLabelText,
                                                    {
                                                        color: activeTab === i ? colors.text : colors.textSecondary,
                                                        fontWeight: activeTab === i ? '700' : '500',
                                                    },
                                                ]}
                                            >
                                                {tab.label.toUpperCase()}
                                            </Text>
                                        )}
                                    </TouchableOpacity>
                                ))}

                                {/* Animated underline */}
                                <Animated.View
                                    style={[
                                        styles.tabUnderline,
                                        {
                                            width: tabWidth,
                                            transform: [
                                                {
                                                    translateX: tabUnderlineX.interpolate({
                                                        inputRange: [0, 1, 2],
                                                        outputRange: [0, tabWidth, tabWidth * 2],
                                                    }),
                                                },
                                            ],
                                        },
                                    ]}
                                />
                            </View>
                        </View>
                        {renderContent()}
                    </View>
                </View>
            </ScrollView>

            {/* Options Modal */}
            <Modal
                animationType="fade"
                transparent
                visible={optionsVisible}
                onRequestClose={() => setOptionsVisible(false)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setOptionsVisible(false)}
                >
                    <View
                        style={[styles.modalContent, { backgroundColor: isDark ? '#1C1C1E' : '#fff' }]}
                        // @ts-ignore
                        onStartShouldSetResponder={() => true}
                    >
                        <View style={styles.modalHandle} />
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: colors.text }]}>Options</Text>
                            <TouchableOpacity onPress={() => setOptionsVisible(false)} activeOpacity={0.7}>
                                <X size={22} color={colors.text} />
                            </TouchableOpacity>
                        </View>
                        <TouchableOpacity
                            style={[styles.modalOption, { borderBottomColor: isDark ? '#333' : '#f0f0f0' }]}
                            onPress={() => setOptionsVisible(false)}
                            activeOpacity={0.7}
                        >
                            <View style={[styles.modalOptionIcon, { backgroundColor: isDark ? '#2a2a2a' : '#f5f5f5' }]}>
                                <Flag size={18} color={colors.text} />
                            </View>
                            <Text style={[styles.modalOptionText, { color: colors.text }]}>Report User</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.modalOption, { borderBottomColor: isDark ? '#333' : '#f0f0f0' }]}
                            onPress={() => { setOptionsVisible(false); handleBlockUser(); }}
                            activeOpacity={0.7}
                        >
                            <View style={[styles.modalOptionIcon, { backgroundColor: 'rgba(255,59,48,0.1)' }]}>
                                <Ban size={18} color="#FF3B30" />
                            </View>
                            <Text style={[styles.modalOptionText, { color: '#FF3B30' }]}>Block User</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.modalOption}
                            onPress={() => { setOptionsVisible(false); }}
                            activeOpacity={0.7}
                        >
                            <View style={[styles.modalOptionIcon, { backgroundColor: isDark ? '#2a2a2a' : '#f5f5f5' }]}>
                                <Share2 size={18} color={colors.text} />
                            </View>
                            <Text style={[styles.modalOptionText, { color: colors.text }]}>Share Profile</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>

            <VibeConfirmModal 
                visible={isFollowModalVisible}
                onClose={() => setFollowModalVisible(false)}
                onConfirm={performFollow}
                title={isFollowing ? 'Unfollow?' : 'Cancel?'}
                message={followModalMsg}
                confirmText="Yes"
                cancelText="No"
            />
        </SafeAreaView>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const createStyles = (
    colors: any,
    isDark: boolean,
    width: number,
    COLUMN_WIDTH: number,
    GRID_GAP: number,
    isDesktop: boolean
) =>
    StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: colors.background,
        },

        // ── Header ──
        header: {
            position: 'absolute',
            top: Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) + 8 : 50,
            left: 0,
            right: 0,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingHorizontal: 16,
            zIndex: 100,
        },
        backBtn: {
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: 'rgba(0,0,0,0.45)',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(10px)' as any,
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.1)',
        },
        headerUsername: {
            color: 'white',
            fontSize: 15,
            fontWeight: '700',
            textShadowColor: 'rgba(0,0,0,0.5)',
            textShadowOffset: { width: 0, height: 1 },
            textShadowRadius: 4,
            maxWidth: 200,
        },

        // ── Cover ──
        coverContainer: {
            width: '100%' as any,
            height: isDesktop ? 320 : 200,
        },

        // ── Desktop Wrapper ──
        desktopWrapper: {
            maxWidth: 900,
            alignSelf: 'center' as any,
            width: '100%' as any,
        },

        // ── Desktop Header ──
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
        avatarRing: {
            padding: 3,
            borderRadius: 68,
        },
        avatarInner: {
            padding: 4,
            borderRadius: 65,
        },
        avatarImage: {
            width: 122,
            height: 122,
            borderRadius: 61,
            backgroundColor: colors.gray,
        },
        desktopHeaderRight: {
            flex: 1,
            minWidth: 0,
            paddingTop: 0,
            gap: 12,
        },
        desktopNameBlock: {
            // Full-width stacked block — name then handle, NO buttons here
            gap: 2,
        },
        desktopActionGroup: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            flexWrap: 'wrap' as any,
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

        // ── Mobile Header ──
        mobileHeaderSection: {
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 16,
            marginTop: -36,
            marginBottom: 12,
            gap: 20,
        },
        mobileAvatarRing: {
            padding: 3,
            borderRadius: 50,
        },
        mobileAvatarInner: {
            padding: 3,
            borderRadius: 47,
        },
        mobileAvatarImage: {
            width: 84,
            height: 84,
            borderRadius: 42,
            backgroundColor: colors.gray,
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
        mobileMeta: {
            paddingHorizontal: 16,
            paddingTop: 4,
            paddingBottom: 8,
        },
        mobileActionsRow: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            marginTop: 16,
        },

        // ── Typography ──
        name: {
            fontSize: isDesktop ? 26 : 22,
            fontWeight: '800',
            color: colors.text,
            letterSpacing: -0.5,
            marginBottom: 2,
        },
        handle: {
            fontSize: 14,
            fontWeight: '500',
            color: colors.textSecondary,
            marginBottom: 8,
        },
        bio: {
            fontSize: 15,
            color: colors.text,
            lineHeight: 22,
            marginBottom: 2,
        },
        statNumber: {
            fontSize: isDesktop ? 18 : 20,
            fontWeight: '800',
            color: colors.text,
            letterSpacing: -0.3,
        },
        statLabel: {
            fontSize: isDesktop ? 14 : 11,
            fontWeight: '500',
            color: colors.textSecondary,
        },

        // ── Links ──
        linksRow: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 10,
            marginTop: 6,
        },
        linkChip: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            paddingHorizontal: 10,
            paddingVertical: 5,
            borderRadius: 8,
            backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
        },
        linkText: {
            fontSize: 13,
            color: colors.primary,
            fontWeight: '600',
            maxWidth: 180,
        },

        // ── Action Buttons ──
        followBtn: {
            flex: isDesktop ? undefined : 1,
            minWidth: isDesktop ? 110 : undefined,
            paddingVertical: 10,
            paddingHorizontal: isDesktop ? 24 : 0,
            borderRadius: 12,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.primary,
        },
        followBtnOutline: {
            backgroundColor: 'transparent',
            borderWidth: 1.5,
            borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)',
        },
        followBtnText: {
            color: '#fff',
            fontWeight: '700',
            fontSize: 14,
        },
        msgBtn: {
            flex: isDesktop ? undefined : 1,
            minWidth: isDesktop ? 100 : undefined,
            paddingVertical: 10,
            paddingHorizontal: isDesktop ? 20 : 0,
            borderRadius: 12,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1.5,
            borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)',
            backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
        },
        msgBtnText: {
            fontWeight: '700',
            fontSize: 14,
        },
        btnIcon: {
            width: 38,
            height: 38,
            borderRadius: 12,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1.5,
            borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)',
            backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
        },
        btnShareMobile: {
            width: 44,
            height: 44,
            borderRadius: 12,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1.5,
            borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)',
            backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
        },

        // ── Tabs ──
        tabSection: {
            flex: 1,
            marginTop: isDesktop ? 60 : 4,
        },
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
            position: 'relative' as any,
        },
        tabBtn: {
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            paddingVertical: 18,
        },
        tabLabelText: {
            fontSize: 12,
            letterSpacing: 1.2,
        },
        tabUnderline: {
            position: 'absolute' as any,
            top: isDesktop ? -1 : undefined,
            bottom: isDesktop ? undefined : 0,
            left: 0,
            height: isDesktop ? 1 : 2,
            backgroundColor: colors.text,
            borderRadius: isDesktop ? 0 : 1,
        },

        // ── Grid ──
        grid: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            paddingHorizontal: isDesktop ? 32 : 0,
            paddingTop: isDesktop ? 16 : 2,
            gap: GRID_GAP,
        },
        gridItem: {
            width: isDesktop ? '32.1%' : COLUMN_WIDTH,
            aspectRatio: 1,
            height: isDesktop ? undefined : COLUMN_WIDTH,
            borderRadius: isDesktop ? 14 : 0,
            overflow: 'hidden' as any,
        },
        gridImage: {
            width: '100%' as any,
            height: '100%' as any,
            backgroundColor: isDark ? '#111' : '#f0f0f0',
        },

        // ── Reels Grid (9:16 aspect ratio) ──
        reelsGrid: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            paddingHorizontal: isDesktop ? 32 : 0,
            paddingTop: isDesktop ? 16 : 2,
            gap: GRID_GAP,
        },
        reelItem: {
            width: isDesktop ? '32.1%' : COLUMN_WIDTH,
            aspectRatio: 9 / 16,
            height: isDesktop ? undefined : COLUMN_WIDTH * (16 / 9),
            borderRadius: isDesktop ? 14 : 0,
            overflow: 'hidden' as any,
        },

        // ── Empty State ──
        emptyState: {
            paddingVertical: 80,
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
        },
        emptyIconWrap: {
            width: 80,
            height: 80,
            borderRadius: 40,
            backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
            borderWidth: 2,
            borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 8,
        },
        emptyTitle: {
            color: colors.text,
            fontSize: 18,
            fontWeight: '700',
            letterSpacing: -0.2,
        },
        emptySub: {
            color: colors.textSecondary,
            fontSize: 14,
            maxWidth: 260,
            textAlign: 'center' as any,
            lineHeight: 20,
        },
        emptyStateText: {
            color: colors.textSecondary,
            fontSize: 16,
        },

        // ── Modal ──
        modalOverlay: {
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.55)',
            justifyContent: 'flex-end' as any,
        },
        modalContent: {
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            padding: 24,
            paddingBottom: Platform.OS === 'ios' ? 44 : 28,
            maxWidth: isDesktop ? 440 : undefined,
            alignSelf: isDesktop ? 'center' as any : undefined,
            width: isDesktop ? 440 : '100%' as any,
        },
        modalHandle: {
            width: 40,
            height: 4,
            borderRadius: 2,
            backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)',
            alignSelf: 'center' as any,
            marginBottom: 16,
        },
        modalHeader: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 20,
        },
        modalTitle: {
            fontSize: 18,
            fontWeight: '800',
            letterSpacing: -0.3,
        },
        modalOption: {
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: 14,
            gap: 14,
            borderBottomWidth: 1,
        },
        privateState: {
            paddingVertical: 100,
            alignItems: 'center',
            justifyContent: 'center',
            gap: 14,
            backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)',
            marginHorizontal: isDesktop ? 32 : 16,
            borderRadius: 24,
            marginTop: 20,
            borderWidth: 1,
            borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
        },
        privateIconWrap: {
            width: 86,
            height: 86,
            borderRadius: 43,
            backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 2.5,
            borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
            marginBottom: 10,
        },
        modalOptionIcon: {
            width: 40,
            height: 40,
            borderRadius: 12,
            alignItems: 'center',
            justifyContent: 'center',
        },
        modalOptionText: {
            fontSize: 16,
            fontWeight: '600',
        },
    });
