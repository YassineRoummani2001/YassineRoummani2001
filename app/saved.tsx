import { API_BASE_URL } from '@/constants/Config';
import { useUser } from '@/context/UserContext';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Clapperboard, Grid3X3, Layers, Plus, Search } from 'lucide-react-native';
import { useCallback, useEffect, useState, useMemo } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Image,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    useWindowDimensions,
    View,
    Platform,
    StatusBar,
    ScrollView
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import Animated, { FadeInUp, FadeInDown, Layout } from 'react-native-reanimated';

import { useThemeContext } from '@/context/ThemeContext';

export default function SavedScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const insets = useSafeAreaInsets();
    const { user } = (useUser() || {}) as any;
    const { width: windowWidth } = useWindowDimensions();
    const isDesktop = Platform.OS === 'web' && windowWidth > 768;
    // Central content area width matches WebLayout.tsx logic
    const contentWidth = isDesktop ? Math.min(windowWidth - 320, 650) : windowWidth;
    const { colors, isDark } = useThemeContext();

    // 0: All (Posts), 1: Reels
    const [activeTab, setActiveTab] = useState(params.tab === 'reels' ? 1 : 0);
    const [savedPosts, setSavedPosts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchSavedPosts();
        setRefreshing(false);
    };

    useEffect(() => {
        if (user?._id) {
            fetchSavedPosts();
        }
    }, [user]);

    const fetchSavedPosts = async () => {
        if (!user?.token) return;

        setLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/saved`, {
                headers: {
                    'Authorization': `Bearer ${user.token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                setSavedPosts(data);
            }
        } catch (error) {
            console.error('Error fetching saved posts:', error);
        } finally {
            setLoading(false);
        }
    };

    const getFilteredPosts = useMemo(() => {
        let filtered = savedPosts;
        if (activeTab === 1) {
            filtered = savedPosts.filter(p => p.type === 'reel' || p.type === 'video');
        }
        
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            filtered = filtered.filter(p => p.caption?.toLowerCase().includes(q));
        }
        
        return filtered;
    }, [activeTab, savedPosts, searchQuery]);

    const renderGridItem = useCallback(({ item, index }: { item: any, index: number }) => {
        const isVideo = item.type === 'reel' || item.type === 'video' || item.uri?.endsWith('.mp4');
        const gap = 1;
        const columns = activeTab === 0 ? 4 : 3;
        const itemSize = (contentWidth / columns) - (gap * 2);

        return (
            <Animated.View 
                entering={FadeInUp.delay(index * 50).springify().damping(12)}
                layout={Layout.springify()}
            >
                <TouchableOpacity
                    style={[
                        styles.gridItem, 
                        { 
                            width: itemSize, 
                            height: activeTab === 0 ? itemSize : itemSize * 1.4, 
                            margin: gap 
                        }
                    ]}
                    activeOpacity={0.9}
                    onPress={() => router.push({
                        pathname: '/media-view',
                        params: {
                            type: isVideo ? 'video' : 'image',
                            postId: item._id,
                            uri: item.uri || item.image
                        }
                    })}
                >
                    <Image
                        source={{ uri: item.image || item.uri }}
                        style={styles.gridImage}
                        resizeMode="cover"
                    />
                    {isVideo && (
                        <View style={styles.reelIconOverlay}>
                            <Clapperboard size={14} color="white" fill="rgba(255,255,255,0.2)" />
                        </View>
                    )}
                    <View style={styles.itemOverlay}>
                         <View style={styles.itemShadow} />
                    </View>
                </TouchableOpacity>
            </Animated.View>
        );
    }, [contentWidth, activeTab, router, colors]);

    const ListHeader = () => (
        <View style={{ marginTop: 10 }}>
            {/* My Collections Section preview */}
            <View style={styles.collectionsHeader}>
                <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Collections</Text>
                <TouchableOpacity style={styles.newColBtn}>
                   <Plus size={16} color={colors.primary} />
                   <Text style={[styles.newColText, { color: colors.primary }]}>New</Text>
                </TouchableOpacity>
            </View>
            
            <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false} 
                contentContainerStyle={styles.collectionsScroll}
            >
                {/* Default collection */}
                <TouchableOpacity style={styles.collectionCard}>
                    <View style={[styles.collectionPreview, { backgroundColor: isDark ? '#222' : '#f0f0f0' }]}>
                        {savedPosts.slice(0, 4).map((p, i) => (
                            <Image 
                                key={i}
                                source={{ uri: p.image || p.uri }} 
                                style={[styles.previewThumb, { width: 34, height: 34 }]} 
                            />
                        ))}
                        {savedPosts.length === 0 && <Layers size={24} color={colors.textSecondary} />}
                    </View>
                    <Text style={[styles.collName, { color: colors.text }]}>All Items</Text>
                    <Text style={[styles.collCount, { color: colors.textSecondary }]}>{savedPosts.length} items</Text>
                </TouchableOpacity>
                
                {/* Visual placeholder for more collections */}
                {['Design', 'Music', 'Ideas'].map((name, i) => (
                    <TouchableOpacity key={i} style={styles.collectionCard} disabled>
                        <View style={[styles.collectionPreview, { backgroundColor: isDark ? '#1a1a1a' : '#f8f8f8', opacity: 0.5 }]}>
                             <Layers size={20} color={colors.textSecondary} />
                        </View>
                        <Text style={[styles.collName, { color: colors.textSecondary }]}>{name}</Text>
                        <Text style={[styles.collCount, { color: colors.textSecondary }]}>0 items</Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            {/* Tab Navigation */}
            <View style={styles.tabContainer}>
                <View style={styles.tabPillContainer}>
                    <TouchableOpacity 
                        style={[styles.tabPill, activeTab === 0 && { backgroundColor: isDark ? '#fff' : '#000' }]}
                        onPress={() => setActiveTab(0)}
                    >
                        <Grid3X3 size={18} color={activeTab === 0 ? (isDark ? '#000' : '#fff') : colors.textSecondary} />
                        <Text style={[styles.tabPillText, { color: activeTab === 0 ? (isDark ? '#000' : '#fff') : colors.textSecondary }]}>Posts</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={[styles.tabPill, activeTab === 1 && { backgroundColor: isDark ? '#fff' : '#000' }]}
                        onPress={() => setActiveTab(1)}
                    >
                        <Clapperboard size={18} color={activeTab === 1 ? (isDark ? '#000' : '#fff') : colors.textSecondary} />
                        <Text style={[styles.tabPillText, { color: activeTab === 1 ? (isDark ? '#000' : '#fff') : colors.textSecondary }]}>Reels</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
            
            {/* Premium Sticky Header */}
            <BlurView intensity={80} tint={isDark ? 'dark' : 'light'} style={[styles.stickyHeader, { paddingTop: insets.top }]}>
                <View style={styles.headerContent}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
                        <ArrowLeft size={24} color={colors.text} />
                    </TouchableOpacity>
                    <View style={styles.headerTitleWrap}>
                        <Text style={[styles.navHeaderTitle, { color: colors.text }]}>Saved Content</Text>
                        <Text style={[styles.navHeaderSub, { color: colors.textSecondary }]}>{getFilteredPosts.length} matches</Text>
                    </View>
                    <TouchableOpacity style={styles.iconBtn}>
                        <Search size={22} color={colors.text} />
                    </TouchableOpacity>
                </View>
            </BlurView>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : (
                <FlatList
                    key={`grid-${activeTab === 0 ? 4 : 3}`}
                    data={getFilteredPosts}
                    keyExtractor={(item, index) => item._id || index.toString()}
                    renderItem={renderGridItem}
                    numColumns={activeTab === 0 ? 4 : 3}
                    ListHeaderComponent={ListHeader}
                    ListEmptyComponent={
                        <Animated.View entering={FadeInDown} style={styles.emptyState}>
                            <View style={[styles.emptyIconContainer, { backgroundColor: colors.gray + '20' }]}>
                                {activeTab === 0 ? <Grid3X3 size={40} color={colors.primary} /> : <Clapperboard size={40} color={colors.primary} />}
                            </View>
                            <Text style={[styles.emptyStateTitle, { color: colors.text }]}>
                                No {activeTab === 0 ? 'posts' : 'reels'} yet
                            </Text>
                            <Text style={[styles.emptyStateSub, { color: colors.textSecondary }]}>
                                {activeTab === 0 ? 'Save your favorite posts to see them here!' : 'Browse reels and save the ones you love.'}
                            </Text>
                            <TouchableOpacity 
                                style={[styles.exploreBtn, { backgroundColor: colors.primary }]}
                                onPress={() => router.push('/reels')}
                            >
                                <Text style={styles.exploreText}>Explore Content</Text>
                            </TouchableOpacity>
                        </Animated.View>
                    }
                    contentContainerStyle={{ paddingBottom: 100, paddingTop: insets.top + 80 }}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            colors={[colors.primary]}
                            tintColor={colors.primary}
                            progressViewOffset={insets.top + 80}
                        />
                    }
                    showsVerticalScrollIndicator={false}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    stickyHeader: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: 'rgba(128,128,128,0.2)',
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 12,
        paddingBottom: 12,
        paddingTop: 8,
    },
    headerTitleWrap: {
        alignItems: 'center',
    },
    navHeaderTitle: {
        fontSize: 17,
        fontWeight: '800',
        letterSpacing: -0.3,
    },
    navHeaderSub: {
        fontSize: 11,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 1,
        opacity: 0.7,
        marginTop: 1,
    },
    iconBtn: {
        padding: 8,
        borderRadius: 20,
    },
    collectionsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        paddingHorizontal: 20,
        marginBottom: 12,
    },
    sectionLabel: {
        fontSize: 13,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    newColBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    newColText: {
        fontSize: 13,
        fontWeight: '700',
    },
    collectionsScroll: {
        paddingHorizontal: 16,
        paddingBottom: 24,
        gap: 16,
    },
    collectionCard: {
        alignItems: 'center',
        width: 80,
    },
    collectionPreview: {
        width: 80,
        height: 80,
        borderRadius: 24,
        marginBottom: 8,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        flexDirection: 'row',
        flexWrap: 'wrap',
        borderWidth: 1,
        borderColor: 'rgba(128,128,128,0.1)',
    },
    previewThumb: {
        margin: 1,
        borderRadius: 4,
    },
    collName: {
        fontSize: 13,
        fontWeight: '700',
        marginBottom: 1,
    },
    collCount: {
        fontSize: 11,
        fontWeight: '500',
    },
    divider: {
        height: 1,
        marginHorizontal: 20,
        marginBottom: 20,
        opacity: 0.3,
    },
    tabContainer: {
        paddingHorizontal: 20,
        marginBottom: 12,
    },
    tabPillContainer: {
        flexDirection: 'row',
        backgroundColor: 'rgba(128,128,128,0.1)',
        padding: 4,
        borderRadius: 16,
        gap: 4,
    },
    tabPill: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        borderRadius: 12,
        gap: 8,
    },
    tabPillText: {
        fontSize: 14,
        fontWeight: '700',
    },
    gridItem: {
        borderRadius: 4,
        overflow: 'hidden',
        position: 'relative',
    },
    gridImage: {
        width: '100%',
        height: '100%',
        backgroundColor: '#111',
    },
    reelIconOverlay: {
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: 'rgba(0,0,0,0.6)',
        padding: 5,
        borderRadius: 8,
        zIndex: 5,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.15)',
    },
    itemOverlay: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 2,
    },
    itemShadow: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.03)',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyState: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 40,
        paddingTop: 60,
    },
    emptyIconContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
    },
    emptyStateTitle: {
        fontSize: 22,
        fontWeight: '800',
        marginBottom: 8,
        textAlign: 'center',
    },
    emptyStateSub: {
        fontSize: 15,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 32,
    },
    exploreBtn: {
        paddingHorizontal: 32,
        paddingVertical: 14,
        borderRadius: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 5,
    },
    exploreText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '700',
    },
});
