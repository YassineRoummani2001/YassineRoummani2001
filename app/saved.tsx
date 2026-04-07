import { API_BASE_URL } from '@/constants/Config';
import { useUser } from '@/context/UserContext';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Clapperboard, Grid3X3, Layers, Plus, Search, X } from 'lucide-react-native';
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
import { getCorrectUrl } from '@/utils/api';

export default function SavedScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const insets = useSafeAreaInsets();
    const { user } = (useUser() || {}) as any;
    const { width: windowWidth } = useWindowDimensions();
    const isDesktop = Platform.OS === 'web' && windowWidth > 768;
    // Central content area width matches WebLayout.tsx logic, accounting for its padding (40px on both sides)
    const contentWidth = isDesktop ? Math.min(windowWidth - 320, 650) - 80 : windowWidth;
    const { colors, isDark } = useThemeContext();

    // 0: All, 1: Posts, 2: Reels, or Collection object
    const [activeTab, setActiveTab] = useState<number | any>(params.tab === 'reels' ? 2 : 0);
    const [savedPosts, setSavedPosts] = useState<any[]>([]);
    const [collections, setCollections] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const onRefresh = async () => {
        setRefreshing(true);
        await Promise.all([fetchSavedPosts(), fetchCollections()]);
        setRefreshing(false);
    };

    useEffect(() => {
        if (user?._id) {
            fetchSavedPosts();
            fetchCollections();
        }
    }, [user?._id]);

    const fetchCollections = async () => {
        if (!user?.token) return;
        try {
            const res = await fetch(`${API_BASE_URL}/api/auth/collections`, {
                headers: { 'Authorization': `Bearer ${user.token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setCollections(data);
                
                // If collections are empty, we could create defaults or just leave empty
                // For now, let's just use what we have
            }
        } catch (error) {
            console.error('Error fetching collections:', error);
        }
    };

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
        
        if (typeof activeTab === 'number') {
            if (activeTab === 1) {
                filtered = savedPosts.filter(p => p.type !== 'reel' && p.type !== 'video');
            } else if (activeTab === 2) {
                filtered = savedPosts.filter(p => p.type === 'reel' || p.type === 'video');
            }
        } else if (activeTab && activeTab._id) {
            // It's a collection object
            const colPostIds = (activeTab.posts || []).map((p: any) => (p?._id || p));
            filtered = savedPosts.filter(p => p && colPostIds.includes(p._id));
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
        const columns = 4;
        const itemSize = (contentWidth / columns) - (gap * 2);

        return (
            <Animated.View 
                entering={FadeInUp.delay(index * 50).springify().damping(12)}
                layout={Layout.springify()}
            >
                <TouchableOpacity
                    style={{ 
                        width: itemSize, 
                        height: itemSize, 
                        margin: gap 
                    }}
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
                        source={{ uri: getCorrectUrl(item.image || item.uri) }}
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

    const CollectionCard = ({ name, posts, image, count, isActive, onPress }: any) => {
        const previewPosts = posts?.slice(0, 4) || [];
        
        return (
            <TouchableOpacity 
                style={[styles.collectionCard, { opacity: count === 0 && !isActive ? 0.6 : 1 }]} 
                onPress={onPress}
                activeOpacity={0.7}
            >
                <View style={[
                    styles.collectionPreview, 
                    { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' },
                    isActive && { borderColor: colors.primary, borderWidth: 2 }
                ]}>
                    {image ? (
                        <Image source={{ uri: image }} style={styles.fullPreview} />
                    ) : count > 0 ? (
                        <View style={styles.gridPreview}>
                            {previewPosts.map((p: any, i: number) => (
                                <Image 
                                    key={i} 
                                    source={{ uri: getCorrectUrl(p.image || p.uri) }} 
                                    style={[styles.gridThumb, { width: '48%', height: '48%' }]} 
                                />
                            ))}
                        </View>
                    ) : (
                        <Layers size={24} color={colors.textSecondary} />
                    )}
                </View>
                <Text style={[
                    styles.collName, 
                    { color: isActive ? colors.primary : colors.text }
                ]} numberOfLines={1}>{name}</Text>
                <Text style={[styles.collCount, { color: colors.textSecondary }]}>{count} items</Text>
            </TouchableOpacity>
        );
    };

    const ListHeader = () => (
        <View style={{ marginTop: 10 }}>
            {/* My Collections Section */}
            <View style={styles.collectionsHeader}>
                <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Collections</Text>
                <TouchableOpacity style={styles.newColBtn}>
                   <Plus size={14} color={colors.primary} />
                   <Text style={[styles.newColText, { color: colors.primary }]}>New</Text>
                </TouchableOpacity>
            </View>
            
            <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false} 
                contentContainerStyle={styles.collectionsScroll}
            >
                {/* Default collection: All Items */}
                <CollectionCard 
                    name="All Items"
                    posts={savedPosts}
                    count={savedPosts.length}
                    isActive={activeTab === 0}
                    onPress={() => setActiveTab(0)}
                />
                
                {/* Real collections */}
                {collections.map((col) => (
                    <CollectionCard 
                        key={col._id}
                        name={col.name}
                        posts={col.posts}
                        image={col.image}
                        count={col.posts.length}
                        isActive={activeTab?._id === col._id}
                        onPress={() => setActiveTab(col)}
                    />
                ))}

                {/* Placeholders if empty to guide user */}
                {collections.length < 3 && ['Design', 'Music'].map((name, i) => (
                    !collections.some(c => c.name === name) && (
                        <CollectionCard 
                            key={`placeholder-${i}`}
                            name={name}
                            count={0}
                            onPress={() => {}} // Could open create modal
                        />
                    )
                ))}
            </ScrollView>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            {/* Tab Navigation (Only show if not in a specific collection) */}
            {typeof activeTab === 'number' && (
                <View style={styles.tabContainer}>
                    <View style={styles.tabPillContainer}>
                        <TouchableOpacity 
                            style={[styles.tabPill, activeTab === 0 && { backgroundColor: isDark ? '#fff' : '#000' }]}
                            onPress={() => setActiveTab(0)}
                        >
                            <Layers size={18} color={activeTab === 0 ? (isDark ? '#000' : '#fff') : colors.textSecondary} />
                            <Text style={[styles.tabPillText, { color: activeTab === 0 ? (isDark ? '#000' : '#fff') : colors.textSecondary }]}>All</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={[styles.tabPill, activeTab === 1 && { backgroundColor: isDark ? '#fff' : '#000' }]}
                            onPress={() => setActiveTab(1)}
                        >
                            <Grid3X3 size={18} color={activeTab === 1 ? (isDark ? '#000' : '#fff') : colors.textSecondary} />
                            <Text style={[styles.tabPillText, { color: activeTab === 1 ? (isDark ? '#000' : '#fff') : colors.textSecondary }]}>Posts</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={[styles.tabPill, activeTab === 2 && { backgroundColor: isDark ? '#fff' : '#000' }]}
                            onPress={() => setActiveTab(2)}
                        >
                            <Clapperboard size={18} color={activeTab === 2 ? (isDark ? '#000' : '#fff') : colors.textSecondary} />
                            <Text style={[styles.tabPillText, { color: activeTab === 2 ? (isDark ? '#000' : '#fff') : colors.textSecondary }]}>Reels</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}
            
            {/* Show search result count or Breadcrumb if in collection */}
            {typeof activeTab !== 'number' && (
                <View style={[styles.tabContainer, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <TouchableOpacity onPress={() => setActiveTab(0)}>
                            <Text style={{ color: colors.textSecondary, fontSize: 13 }}>Saved Content</Text>
                        </TouchableOpacity>
                        <Text style={{ color: colors.textSecondary }}>/</Text>
                        <Text style={{ color: colors.text, fontWeight: '800' }}>{activeTab.name}</Text>
                    </View>
                    <TouchableOpacity onPress={() => setActiveTab(0)} style={{ padding: 4 }}>
                         <X size={16} color={colors.textSecondary} />
                    </TouchableOpacity>
                </View>
            )}
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
                    <View style={{ width: 40 }} />
                </View>
            </BlurView>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : (
                <FlatList
                    key={`grid-4`}
                    data={getFilteredPosts}
                    keyExtractor={(item, index) => item._id || index.toString()}
                    renderItem={renderGridItem}
                    numColumns={4}
                    ListHeaderComponent={ListHeader}
                    ListEmptyComponent={
                        <Animated.View entering={FadeInDown} style={styles.emptyState}>
                            <View style={[styles.emptyIconContainer, { backgroundColor: colors.gray + '20' }]}>
                                {activeTab === 2 ? <Clapperboard size={40} color={colors.primary} /> : <Grid3X3 size={40} color={colors.primary} />}
                            </View>
                            <Text style={[styles.emptyStateTitle, { color: colors.text }]}>
                                No {activeTab === 2 ? 'reels' : activeTab === 1 ? 'posts' : 'content'} yet
                            </Text>
                            <Text style={[styles.emptyStateSub, { color: colors.textSecondary }]}>
                                {activeTab === 2 ? 'Browse reels and save the ones you love.' : 'Save your favorite content to see it here!'}
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
        width: 64,
    },
    collectionPreview: {
        width: 64,
        height: 64,
        borderRadius: 18,
        marginBottom: 6,
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
    fullPreview: {
        width: '100%',
        height: '100%',
    },
    gridPreview: {
        width: '100%',
        height: '100%',
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 2,
        padding: 2,
        justifyContent: 'center',
        alignItems: 'center',
    },
    gridThumb: {
        borderRadius: 4,
        backgroundColor: '#222',
    },
    collName: {
        fontSize: 11,
        fontWeight: '700',
        marginBottom: 1,
        textAlign: 'center',
    },
    collCount: {
        fontSize: 10,
        fontWeight: '500',
        opacity: 0.6,
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
        backgroundColor: '#111',
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
