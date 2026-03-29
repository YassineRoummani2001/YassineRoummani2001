import ReelItem from '@/components/ReelItem';
import { SkeletonFullscreen } from '@/components/Skeletons';
import { useReels } from '@/context/ReelContext';
import { useTheme } from '@/hooks/useTheme';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Camera, ChevronLeft, Search } from 'lucide-react-native';
import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import {
    FlatList,
    Platform,
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

// 🎯 Memoized ReelItem to prevent unnecessary re-renders
const MemoizedReelItem = memo(
    ReelItem,
    (prevProps, nextProps) => {
        return (
            prevProps.active === nextProps.active &&
            prevProps.item._id === nextProps.item._id
        );
    }
);

export default function ReelsScreen() {
    const { height: screenHeight, width: screenWidth } = useWindowDimensions();
    const reelHeight = screenHeight; // Use full screen height to avoid black bar gap
    const colors = useTheme();
    const router = useRouter();
    const isFocused = useIsFocused();
    const insets = useSafeAreaInsets();

    // Use ReelContext
    const { reels, loading, error, fetchReels } = useReels();

    // State
    const [activeIndex, setActiveIndex] = useState(0);
    const [refreshing, setRefreshing] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);

    // Refs
    const flatListRef = useRef<FlatList>(null);
    const isMounted = useRef(true);

    // 🔄 Load More Reels
    const loadMore = useCallback(() => {
        if (!loading && !refreshing && hasMore) {
            const nextPage = page + 1;
            setPage(nextPage);
            fetchReels(nextPage);
        }
    }, [loading, refreshing, hasMore, page, fetchReels]);

    // 🔄 Refresh Reels
    const handleRefresh = useCallback(async () => {
        setRefreshing(true);
        setPage(1);
        setHasMore(true);
        await fetchReels(1, true);
        setRefreshing(false);
    }, [fetchReels]);

    // 🎬 Initial Load
    useEffect(() => {
        fetchReels(1);
        return () => {
            isMounted.current = false;
        };
    }, [fetchReels]);

    // 👁️ Track Viewable Items (which reel is visible)
    const onViewableItemsChanged = useRef(
        ({ viewableItems }: { viewableItems: ViewToken[] }) => {
            if (viewableItems && viewableItems.length > 0) {
                const visibleItem = viewableItems[0];
                if (visibleItem.index !== null && visibleItem.index !== undefined) {
                    setActiveIndex(visibleItem.index);
                }
            }
        }
    ).current;

    // ⚙️ Viewability Configuration (optimized for video)
    const viewabilityConfig = useRef({
        itemVisiblePercentThreshold: 80, // 80% of item must be visible
        minimumViewTime: 100, // Must be visible for 100ms
    }).current;

    // 🔑 Key Extractor
    const keyExtractor = useCallback((item: any, index: number) => {
        return item._id?.toString() || `reel-${index}`;
    }, []);

    // 🎨 Render Item
    const renderItem = useCallback(
        ({ item, index }: { item: any; index: number }) => (
            <MemoizedReelItem
                item={item}
                active={isFocused && activeIndex === index}
                width={screenWidth}
                height={reelHeight}
            />
        ),
        [activeIndex, screenWidth, reelHeight, isFocused]
    );

    // 📐 Get Item Layout (for performance)
    const getItemLayout = useCallback(
        (_: any, index: number) => ({
            length: reelHeight,
            offset: reelHeight * index,
            index,
        }),
        [reelHeight]
    );

    const isDesktop = Platform.OS === 'web' && screenWidth > 768;

    // 🎨 Render
    return (
        <View style={[styles.container, isDesktop && { width: 450, alignSelf: 'center', backgroundColor: '#000' }]}>
            <StatusBar
                barStyle="light-content"
                translucent
                backgroundColor="transparent"
            />

            {/* 📝 Header Actions */}
            <View style={[styles.header, { top: Math.max(insets.top, 20) }]}>
                <TouchableOpacity
                    style={styles.headerButton}
                    onPress={() => router.back()}
                    activeOpacity={0.8}
                >
                    <BlurView intensity={20} tint="light" style={styles.headerButtonBlur}>
                        <ChevronLeft size={24} color="#fff" strokeWidth={2.5} />
                    </BlurView>
                </TouchableOpacity>
                
                <TouchableOpacity
                    style={styles.headerButton}
                    onPress={() => router.push('/search')}
                    activeOpacity={0.8}
                >
                    <BlurView intensity={20} tint="light" style={styles.headerButtonBlur}>
                        <Search size={22} color="#fff" strokeWidth={2.5} />
                    </BlurView>
                </TouchableOpacity>
            </View>

            {/* ❌ Error / Empty State */}
            {!loading && (error || reels.length === 0) && (
                <View style={styles.emptyState}>
                    <Text style={styles.emptyText}>
                        {error || 'No reels available'}
                    </Text>
                    <TouchableOpacity onPress={handleRefresh} style={styles.retryButton}>
                        <Text style={styles.retryText}>Retry</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* 🔄 Loading State */}
            {loading && reels.length === 0 && <SkeletonFullscreen />}

            {/* 📜 Reels List */}
            {reels.length > 0 && (
                <FlatList
                    ref={flatListRef}
                    data={reels}
                    keyExtractor={keyExtractor}
                    renderItem={renderItem}
                    // 📱 Paging Configuration
                    snapToInterval={reelHeight}
                    snapToAlignment="start"
                    decelerationRate="fast"
                    disableIntervalMomentum
                    // 🚀 Performance Optimizations
                    getItemLayout={getItemLayout}
                    initialNumToRender={1}
                    maxToRenderPerBatch={2}
                    windowSize={3} // Render 1 above + current + 1 below
                    removeClippedSubviews={Platform.OS === 'android'} // Android optimization
                    // 👁️ Viewability
                    onViewableItemsChanged={onViewableItemsChanged}
                    viewabilityConfig={viewabilityConfig}
                    // 🔄 Infinite Scroll
                    onEndReached={loadMore}
                    onEndReachedThreshold={0.5}
                    // 🎨 Styling
                    showsVerticalScrollIndicator={false}
                    style={styles.list}
                    contentContainerStyle={styles.listContent}
                    // 🔄 Pull to Refresh
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={handleRefresh}
                            tintColor="white"
                            colors={['#fff']}
                            progressBackgroundColor="#000"
                        />
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    list: {
        flex: 1,
    },
    listContent: {
        backgroundColor: '#000',
    },
    header: {
        position: 'absolute',
        left: 20,
        right: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 100,
    },
    title: {
        color: 'white',
        fontSize: 28,
        fontWeight: '900',
        letterSpacing: -0.5,
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 8,
    },
    headerButton: {
        borderRadius: 22,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.15)',
    },
    headerButtonBlur: {
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
    retryButton: {
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
