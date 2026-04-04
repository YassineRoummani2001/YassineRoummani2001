import ReelItem from '@/components/ReelItem';
import ReelInfoPanel from '@/components/ReelInfoPanel';
import { SkeletonFullscreen } from '@/components/Skeletons';
import { useReels } from '@/context/ReelContext';
import { useUser } from '@/context/UserContext';
import { useThemeContext } from '@/context/ThemeContext';
import { API_BASE_URL } from '@/constants/Config';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Search } from 'lucide-react-native';
import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import * as Haptics from 'expo-haptics';
import Toast from 'react-native-toast-message';
import {
    FlatList,
    Image,
    Platform,
    Pressable,
    RefreshControl,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    ViewToken,
    useWindowDimensions,
} from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ─── Memoized ReelItem ────────────────────────────────────────────────────────
const MemoizedReelItem = memo(
    ReelItem,
    (prev, next) =>
        prev.active === next.active &&
        prev.item._id === next.item._id &&
        prev.isMuted === next.isMuted
);

// ─── Helper ───────────────────────────────────────────────────────────────────
const getValidUri = (uri?: string) => {
    if (!uri) return '';
    if (uri.startsWith('data:') || uri.startsWith('file:')) return uri;
    if (uri.startsWith('http') && uri.includes('/uploads/')) {
        const parts = uri.split('/uploads/');
        return `${API_BASE_URL}/uploads/${parts[1]}`;
    }
    if (uri.startsWith('http')) return uri;
    if (uri.startsWith('/uploads/')) return `${API_BASE_URL}${uri}`;
    return `${API_BASE_URL}${uri.startsWith('/') ? '' : '/'}${uri}`;
};

// ─── NavArrow for desktop ─────────────────────────────────────────────────────
function NavArrow({ direction, onPress }: { direction: 'up' | 'down'; onPress: () => void }) {
    const [hovered, setHovered] = useState(false);
    return (
        <Pressable
            onPress={onPress}
            // @ts-ignore web
            onHoverIn={() => setHovered(true)}
            onHoverOut={() => setHovered(false)}
            style={[styles.navArrow, hovered && styles.navArrowHovered]}
        >
            <Ionicons
                name={direction === 'up' ? 'chevron-up' : 'chevron-down'}
                size={22}
                color="white"
            />
        </Pressable>
    );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function ReelsScreen() {
    const { height: screenHeight, width: screenWidth } = useWindowDimensions();
    const { colors, isDark } = useThemeContext();
    const router = useRouter();
    const isFocused = useIsFocused();
    const insets = useSafeAreaInsets();
    const { user, followUser } = (useUser() || {}) as any;

    const { reels, loading, error, fetchReels, isMuted, setIsMuted } = useReels();

    const [activeIndex, setActiveIndex] = useState(0);
    const [refreshing, setRefreshing] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);

    // per-reel state
    const [likeMap, setLikeMap] = useState<Record<string, boolean>>({});
    const [likesMap, setLikesMap] = useState<Record<string, number>>({});
    const [savedMap, setSavedMap] = useState<Record<string, boolean>>({});
    const [followMap, setFollowMap] = useState<Record<string, boolean>>({});
    const [reqMap, setReqMap] = useState<Record<string, boolean>>({});

    const flatListRef = useRef<FlatList>(null);
    const isMounted = useRef(true);

    const isDesktop = Platform.OS === 'web' && screenWidth > 900;
    const isTablet = Platform.OS === 'web' && screenWidth > 600 && screenWidth <= 900;

    // ─── Video dimensions ────────────────────────────────────────────────────
    // WebLayout already subtracts the 280px sidebar, so screenWidth here is the
    // usable area. We need to fit: arrows (56px left) + video + gap (24px) + panel.
    const SIDEBAR_WIDTH = isDesktop ? 280 : 0; // already excluded by WebLayout but used for calculation
    const PANEL_WIDTH = isDesktop ? 400 : 0;
    const ARROWS_WIDTH = isDesktop ? 80 : 0;  // 40px left dots + 40px right arrows + gaps
    const AVAILABLE_WIDTH = isDesktop
        ? screenWidth - SIDEBAR_WIDTH - PANEL_WIDTH - ARROWS_WIDTH - 40 // 40px for padding
        : isTablet
        ? screenWidth * 0.55
        : screenWidth;
    const VIDEO_WIDTH = isDesktop
        ? Math.max(260, Math.min(AVAILABLE_WIDTH, Math.floor((screenHeight - 80) * 0.5625)))
        : isTablet
        ? Math.min(AVAILABLE_WIDTH, 420)
        : screenWidth;
    const VIDEO_HEIGHT = isDesktop
        ? screenHeight - 40
        : isTablet
        ? Math.min(screenHeight, Math.floor(VIDEO_WIDTH * (16 / 9)))
        : screenHeight;

    // ─── Load / Refresh ──────────────────────────────────────────────────────
    const loadMore = useCallback(() => {
        if (!loading && !refreshing && hasMore) {
            const next = page + 1;
            setPage(next);
            fetchReels(next);
        }
    }, [loading, refreshing, hasMore, page, fetchReels]);

    const handleRefresh = useCallback(async () => {
        setRefreshing(true);
        setPage(1);
        setHasMore(true);
        await fetchReels(1, true);
        setRefreshing(false);
    }, [fetchReels]);

    useEffect(() => {
        fetchReels(1);
        return () => { isMounted.current = false; };
    }, [fetchReels]);

    // ─── Sync local state from reels data ────────────────────────────────────
    useEffect(() => {
        if (!user || reels.length === 0) return;
        const lm: Record<string, boolean> = {};
        const lc: Record<string, number> = {};
        const sm: Record<string, boolean> = {};
        const fm: Record<string, boolean> = {};
        const rm: Record<string, boolean> = {};
        reels.forEach((r: any) => {
            lm[r._id] = r.likes?.includes(user._id);
            lc[r._id] = r.likes?.length ?? 0;
            sm[r._id] = user.saved?.includes(r._id) ?? false;
            const authorId = r.user?._id || r.user?.id;
            fm[r._id] = user.following?.includes(authorId) ?? false;
            rm[r._id] = user.followRequests?.includes(authorId) ?? false;
        });
        setLikeMap(lm);
        setLikesMap(lc);
        setSavedMap(sm);
        setFollowMap(fm);
        setReqMap(rm);
    }, [reels, user]);

    // ─── Actions ────────────────────────────────────────────────────────────
    const handleToggleLike = useCallback(async (reel: any) => {
        const id = reel._id;
        const wasLiked = likeMap[id];
        setLikeMap(p => ({ ...p, [id]: !wasLiked }));
        setLikesMap(p => ({ ...p, [id]: (p[id] ?? 0) + (wasLiked ? -1 : 1) }));
        try {
            const res = await fetch(`${API_BASE_URL}/api/posts/${id}/like`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${user?.token}` },
            });
            if (!res.ok) {
                // Revert on error
                setLikeMap(p => ({ ...p, [id]: wasLiked }));
                setLikesMap(p => ({ ...p, [id]: (p[id] ?? 0) + (wasLiked ? 1 : -1) }));
            }
        } catch {
            setLikeMap(p => ({ ...p, [id]: wasLiked }));
            setLikesMap(p => ({ ...p, [id]: (p[id] ?? 0) + (wasLiked ? 1 : -1) }));
        }
    }, [likeMap, user]);

    const handleToggleSave = useCallback(async (reel: any) => {
        const id = reel._id;
        setSavedMap(p => ({ ...p, [id]: !p[id] }));
        try {
            const res = await fetch(`${API_BASE_URL}/api/posts/${id}/save`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${user?.token}` },
            });
            if (!res.ok) setSavedMap(p => ({ ...p, [id]: !p[id] }));
        } catch { 
            setSavedMap(p => ({ ...p, [id]: !p[id] }));
        }
    }, [user]);

    const handleToggleFollow = useCallback(async (reel: any) => {
        const authorId = reel.user?._id || reel.user?.id;
        if (!authorId) return;
        await followUser?.(authorId);
        setFollowMap(p => ({ ...p, [reel._id]: !p[reel._id] }));
    }, [followUser]);

    const handleShare = useCallback(() => {
        Toast.show({ type: 'info', text1: 'Share link copied!', visibilityTime: 1500 });
    }, []);

    // ─── Navigation between reels ────────────────────────────────────────────
    const goNext = useCallback(() => {
        const next = Math.min(activeIndex + 1, reels.length - 1);
        flatListRef.current?.scrollToIndex({ index: next, animated: true });
        setActiveIndex(next);
    }, [activeIndex, reels.length]);

    const goPrev = useCallback(() => {
        const prev = Math.max(activeIndex - 1, 0);
        flatListRef.current?.scrollToIndex({ index: prev, animated: true });
        setActiveIndex(prev);
    }, [activeIndex]);

    // keyboard navigation (web)
    useEffect(() => {
        if (Platform.OS !== 'web') return;
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'ArrowDown') goNext();
            if (e.key === 'ArrowUp') goPrev();
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [goNext, goPrev]);

    // ─── Viewability ────────────────────────────────────────────────────────
    const onViewableItemsChanged = useRef(
        ({ viewableItems }: { viewableItems: ViewToken[] }) => {
            if (viewableItems.length > 0 && viewableItems[0].index != null) {
                setActiveIndex(viewableItems[0].index);
            }
        }
    ).current;

    const viewabilityConfig = useRef({
        itemVisiblePercentThreshold: 80,
        minimumViewTime: 100,
    }).current;

    const keyExtractor = useCallback((item: any, idx: number) => item._id?.toString() || `reel-${idx}`, []);

    const getItemLayout = useCallback(
        (_: any, index: number) => ({ length: VIDEO_HEIGHT, offset: VIDEO_HEIGHT * index, index }),
        [VIDEO_HEIGHT]
    );

    const renderItem = useCallback(
        ({ item, index }: { item: any; index: number }) => (
            <MemoizedReelItem
                item={item}
                active={isFocused && activeIndex === index}
                isMuted={isMuted}
                width={VIDEO_WIDTH}
                height={VIDEO_HEIGHT}
            />
        ),
        [activeIndex, VIDEO_WIDTH, VIDEO_HEIGHT, isFocused, isMuted]
    );

    const activeReel = reels[activeIndex];

    // ─── DESKTOP LAYOUT ──────────────────────────────────────────────────────
    if (isDesktop) {
        return (
            <View style={[styles.desktopRoot, { backgroundColor: colors.background }]}>
                <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

                {/* ── Ambient blurred background ── */}
                {activeReel?.user?.avatar && (
                    <Image
                        source={{ uri: getValidUri(activeReel.user.avatar) }}
                        style={styles.ambientBg}
                        blurRadius={Platform.OS === 'web' ? 0 : 40}
                    />
                )}
                {/* dark overlay */}
                <View style={[styles.ambientOverlay, { backgroundColor: isDark ? 'rgba(0,0,0,0.85)' : 'rgba(255,255,255,0.85)' }]} />

                {/* ── Main area: Video + Nav Arrows + Info Panel ── */}
                <View style={styles.desktopMain}>

                    {/* Left: Video column */}
                    <View style={[styles.videoColumn, { width: VIDEO_WIDTH }]}>
                        {/* Side actions (Mute + Search) */}
                        <View style={styles.sideActions}>
                            <TouchableOpacity
                                style={[styles.topBarBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}
                                onPress={() => {
                                    const n = !isMuted;
                                    setIsMuted(n);
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                }}
                            >
                                <Ionicons name={isMuted ? 'volume-mute' : 'volume-high'} size={20} color={isDark ? '#fff' : '#000'} />
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={[styles.topBarBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]} 
                                onPress={() => router.push('/search')}
                            >
                                <Search size={20} color={isDark ? '#fff' : '#000'} />
                            </TouchableOpacity>
                        </View>

                        {/* Navigation arrows */}
                        <View style={styles.navArrows}>
                            <NavArrow direction="up" onPress={goPrev} />
                            <View style={{ height: 12 }} />
                            <NavArrow direction="down" onPress={goNext} />
                        </View>

                        {/* Dot indicators */}
                        <View style={styles.dotIndicators}>
                            {reels.slice(Math.max(0, activeIndex - 3), activeIndex + 4).map((r: any, i: number) => {
                                const absI = Math.max(0, activeIndex - 3) + i;
                                return (
                                    <View
                                        key={r._id}
                                        style={[
                                            styles.dot,
                                            absI === activeIndex && styles.dotActive,
                                        ]}
                                    />
                                );
                            })}
                        </View>

                        {/* The video list */}
                        <View style={[styles.videoWrapper, { width: VIDEO_WIDTH, height: VIDEO_HEIGHT }]}>
                            {loading && reels.length === 0 && <SkeletonFullscreen />}
                            {!loading && (error || reels.length === 0) && (
                                <View style={styles.emptyState}>
                                    <Text style={styles.emptyText}>{error || 'No reels yet'}</Text>
                                    <TouchableOpacity onPress={handleRefresh} style={styles.retryBtn}>
                                        <Text style={styles.retryText}>Retry</Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                            {reels.length > 0 && (
                                <FlatList
                                    ref={flatListRef}
                                    data={reels}
                                    keyExtractor={keyExtractor}
                                    renderItem={renderItem}
                                    pagingEnabled
                                    snapToInterval={VIDEO_HEIGHT}
                                    snapToAlignment="start"
                                    decelerationRate="fast"
                                    disableIntervalMomentum
                                    getItemLayout={getItemLayout}
                                    initialNumToRender={1}
                                    maxToRenderPerBatch={2}
                                    windowSize={3}
                                    onViewableItemsChanged={onViewableItemsChanged}
                                    viewabilityConfig={viewabilityConfig}
                                    onEndReached={loadMore}
                                    onEndReachedThreshold={0.5}
                                    showsVerticalScrollIndicator={false}
                                    refreshControl={
                                        <RefreshControl
                                            refreshing={refreshing}
                                            onRefresh={handleRefresh}
                                            tintColor="white"
                                        />
                                    }
                                    style={{ width: VIDEO_WIDTH, height: VIDEO_HEIGHT, borderRadius: 20, overflow: 'hidden' }}
                                />
                            )}
                        </View>
                    </View>

                    {/* Right: Info panel */}
                    {activeReel && (
                        <View style={[styles.infoPanelWrapper, { width: PANEL_WIDTH, height: VIDEO_HEIGHT }]}>
                            <ReelInfoPanel
                                key={activeReel._id}
                                item={activeReel}
                                liked={likeMap[activeReel._id] ?? false}
                                likesCount={likesMap[activeReel._id] ?? 0}
                                isSaved={savedMap[activeReel._id] ?? false}
                                commentsCount={activeReel.comments?.length ?? 0}
                                isFollowing={followMap[activeReel._id] ?? false}
                                isRequested={reqMap[activeReel._id] ?? false}
                                onToggleLike={() => handleToggleLike(activeReel)}
                                onToggleSave={() => handleToggleSave(activeReel)}
                                onToggleFollow={() => handleToggleFollow(activeReel)}
                                onShare={handleShare}
                            />
                        </View>
                    )}
                </View>
            </View>
        );
    }

    // ─── MOBILE LAYOUT (unchanged classic fullscreen) ─────────────────────────
    return (
        <View style={styles.mobileContainer}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

            {/* Header */}
            <View style={[styles.mobileHeader, { top: Math.max(insets.top, 20) }]}>
                <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()} activeOpacity={0.8}>
                    <BlurView intensity={20} tint="light" style={styles.headerBtnBlur}>
                        <Ionicons name="chevron-back" size={24} color="#fff" />
                    </BlurView>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.headerBtn}
                    onPress={() => {
                        setIsMuted(!isMuted);
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                    activeOpacity={0.8}
                >
                    <BlurView intensity={20} tint="light" style={styles.headerBtnBlur}>
                        <Ionicons name={isMuted ? 'volume-mute' : 'volume-high'} size={20} color="#fff" />
                    </BlurView>
                </TouchableOpacity>

                <TouchableOpacity style={styles.headerBtn} onPress={() => router.push('/search')} activeOpacity={0.8}>
                    <BlurView intensity={20} tint="light" style={styles.headerBtnBlur}>
                        <Search size={22} color="#fff" />
                    </BlurView>
                </TouchableOpacity>
            </View>

            {!loading && (error || reels.length === 0) && (
                <View style={styles.emptyState}>
                    <Text style={styles.emptyText}>{error || 'No reels available'}</Text>
                    <TouchableOpacity onPress={handleRefresh} style={styles.retryBtn}>
                        <Text style={styles.retryText}>Retry</Text>
                    </TouchableOpacity>
                </View>
            )}

            {loading && reels.length === 0 && <SkeletonFullscreen />}

            {reels.length > 0 && (
                <FlatList
                    ref={flatListRef}
                    data={reels}
                    keyExtractor={keyExtractor}
                    renderItem={renderItem}
                    pagingEnabled
                    snapToInterval={screenHeight}
                    snapToAlignment="start"
                    decelerationRate="fast"
                    disableIntervalMomentum
                    getItemLayout={(_, index) => ({ length: screenHeight, offset: screenHeight * index, index })}
                    initialNumToRender={1}
                    maxToRenderPerBatch={2}
                    windowSize={3}
                    removeClippedSubviews={Platform.OS === 'android'}
                    onViewableItemsChanged={onViewableItemsChanged}
                    viewabilityConfig={viewabilityConfig}
                    onEndReached={loadMore}
                    onEndReachedThreshold={0.5}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={handleRefresh}
                            tintColor="white"
                            colors={['#fff']}
                        />
                    }
                />
            )}
        </View>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    // ── Desktop ──────────────────────────────────────────────────────────────
    desktopRoot: {
        flex: 1,
        backgroundColor: '#060608',
        overflow: 'hidden' as any,
        height: Platform.OS === 'web' ? ('100vh' as any) : '100%',
    },
    ambientBg: {
        position: 'absolute' as any,
        top: 0, left: 0, right: 0, bottom: 0,
        width: '100%' as any,
        height: '100%' as any,
        opacity: 0.22,
        filter: 'blur(80px)' as any,
        transform: [{ scale: 1.3 }],
    },
    ambientOverlay: {
        position: 'absolute' as any,
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(6,6,8,0.82)',
    },
    sideActions: {
        position: 'absolute' as any,
        left: -56,
        top: 10,
        gap: 12,
        alignItems: 'center',
        zIndex: 20,
    },
    desktopTopBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        paddingHorizontal: 24,
        paddingBottom: 8,
        zIndex: 10,
    },
    desktopTopActions: {
        flexDirection: 'row',
        gap: 10,
        alignItems: 'center',
    },
    topBarBtn: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: 'rgba(255,255,255,0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        backdropFilter: 'blur(10px)' as any,
    },
    desktopMain: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 20,
        paddingHorizontal: 24,
        paddingBottom: 16,
    },
    videoColumn: {
        alignItems: 'center',
        position: 'relative' as any,
        flexDirection: 'row' as any,
    },
    videoWrapper: {
        borderRadius: 20,
        overflow: 'hidden' as any,
        backgroundColor: '#111',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 20 },
        shadowOpacity: 0.6,
        shadowRadius: 40,
        elevation: 30,
    },
    navArrows: {
        position: 'absolute' as any,
        left: -56,
        top: '50%' as any,
        transform: [{ translateY: -40 }],
        alignItems: 'center',
        zIndex: 20,
    },
    navArrow: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(128,128,128,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(128,128,128,0.2)',
        cursor: 'pointer' as any,
    },
    navArrowHovered: {
        backgroundColor: 'rgba(128,128,128,0.4)',
    },
    dotIndicators: {
        position: 'absolute' as any,
        right: -28,
        top: '50%' as any,
        transform: [{ translateY: -40 }],
        alignItems: 'center',
        gap: 6,
        zIndex: 20,
    },
    dot: {
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: 'rgba(128,128,128,0.3)',
    },
    dotActive: {
        width: 4,
        height: 18,
        borderRadius: 2,
        backgroundColor: 'rgba(128,128,128,0.8)',
    },
    infoPanelWrapper: {
        borderRadius: 20,
        overflow: 'hidden' as any,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 24,
        elevation: 12,
    },
    // ── Mobile ────────────────────────────────────────────────────────────────
    mobileContainer: {
        flex: 1,
        backgroundColor: '#000',
    },
    mobileHeader: {
        position: 'absolute' as any,
        left: 20,
        right: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 100,
    },
    headerBtn: {
        borderRadius: 22,
        overflow: 'hidden' as any,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.15)',
    },
    headerBtnBlur: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.1)',
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#000',
        paddingHorizontal: 32,
    },
    emptyText: {
        color: 'white',
        fontSize: 18,
        fontWeight: '600',
        textAlign: 'center',
        marginBottom: 20,
    },
    retryBtn: {
        backgroundColor: 'white',
        paddingHorizontal: 32,
        paddingVertical: 12,
        borderRadius: 24,
    },
    retryText: {
        color: '#000',
        fontSize: 16,
        fontWeight: '700',
    },
});