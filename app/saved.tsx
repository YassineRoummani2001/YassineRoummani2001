import { API_BASE_URL } from '@/constants/Config';
import { useUser } from '@/context/UserContext';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { ArrowLeft, Clapperboard, Grid3X3, Layers } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Image,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    useWindowDimensions,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useThemeContext } from '@/context/ThemeContext';

export default function SavedScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const { user } = (useUser() || {}) as any;
    const { width } = useWindowDimensions();
    const { colors } = useThemeContext();

    // 0: All (Posts), 1: Reels
    const [activeTab, setActiveTab] = useState(params.tab === 'reels' ? 1 : 0);
    const [savedPosts, setSavedPosts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

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

    const getFilteredPosts = useCallback(() => {
        if (activeTab === 0) return savedPosts;
        return savedPosts.filter(p => p.type === 'reel' || p.type === 'video');
    }, [activeTab, savedPosts]);

    const renderGridItem = useCallback(({ item }: { item: any }) => {
        const isVideo = item.type === 'reel' || item.type === 'video' || item.uri?.endsWith('.mp4');
        const itemSize = width / 3;

        return (
            <TouchableOpacity
                style={[styles.gridItem, { width: itemSize, height: itemSize * 1.3, backgroundColor: colors.background }]}
                activeOpacity={0.8}
                onPress={() => router.push({
                    pathname: '/media-view',
                    params: {
                        type: isVideo ? 'video' : 'image',
                        postId: item._id
                    }
                })}
            >
                {isVideo ? (
                    <View style={{ flex: 1, backgroundColor: 'black' }}>
                        {/* Simple image thumbnail for video to improve grid performance instead of heavy player */}
                        <Image
                            source={{ uri: item.image || item.uri }} /* Fallback to uri if image not present */
                            style={styles.gridImage}
                            resizeMode="cover"
                        />
                        <View style={styles.reelIconOverlay}>
                            <Clapperboard size={16} color="white" />
                        </View>
                    </View>
                ) : (
                    <Image source={{ uri: item.uri || item.image }} style={styles.gridImage} resizeMode="cover" />
                )}
            </TouchableOpacity>
        );
    }, [width, router, colors]);

    const ListHeader = () => (
        <View style={{ backgroundColor: colors.background }}>
            {/* Header Title Section */}
            <View style={styles.titleSection}>
                <Text style={[styles.pageTitle, { color: colors.text }]}>Saved</Text>
                <Text style={[styles.pageSubtitle, { color: colors.textSecondary }]}>
                    {savedPosts.length} {savedPosts.length === 1 ? 'post' : 'posts'} saved
                </Text>
            </View>

            {/* Custom Tabs */}
            <View style={[styles.tabContainer, { backgroundColor: colors.background }]}>
                <View style={[styles.tabRow, { borderBottomColor: colors.border }]}>
                    <TouchableOpacity
                        style={[styles.tabButton, activeTab === 0 && styles.tabButtonActive]}
                        onPress={() => setActiveTab(0)}
                    >
                        <Grid3X3 color={activeTab === 0 ? colors.text : colors.textSecondary} size={22} />
                        <Text style={[styles.tabText, { color: activeTab === 0 ? colors.text : colors.textSecondary }]}>All Posts</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.tabButton, activeTab === 1 && styles.tabButtonActive]}
                        onPress={() => setActiveTab(1)}
                    >
                        <Clapperboard color={activeTab === 1 ? colors.text : colors.textSecondary} size={22} />
                        <Text style={[styles.tabText, { color: activeTab === 1 ? colors.text : colors.textSecondary }]}>Reels</Text>
                    </TouchableOpacity>
                </View>
                {/* Animated Indicator Line */}
                <View style={styles.indicatorTrack}>
                    <View style={[
                        styles.indicatorLine,
                        {
                            width: '50%',
                            backgroundColor: colors.text,
                            transform: [{ translateX: activeTab === 0 ? 0 : width / 2 }] // Simple translation
                        }
                    ]} />
                </View>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            {/* Navigation Header */}
            <View style={[styles.navHeader, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <ArrowLeft size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.navHeaderTitle, { color: colors.text }]}>Collections</Text>
                <TouchableOpacity style={styles.backButton}>
                    {/* Placeholder for future "New Collection" or similar */}
                    <Layers size={24} color="transparent" />
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : (
                <FlatList
                    data={getFilteredPosts()}
                    keyExtractor={(item, index) => item._id || index.toString()}
                    renderItem={renderGridItem}
                    numColumns={3}
                    ListHeaderComponent={ListHeader}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <View style={[styles.emptyIconContainer, { backgroundColor: colors.gray }]}>
                                {activeTab === 0 ? <Grid3X3 size={32} color={colors.textSecondary} /> : <Clapperboard size={32} color={colors.textSecondary} />}
                            </View>
                            <Text style={[styles.emptyStateText, { color: colors.text }]}>
                                {activeTab === 0 ? 'No saved posts yet' : 'No saved reels yet'}
                            </Text>
                            <Text style={[styles.emptySubText, { color: colors.textSecondary }]}>
                                {activeTab === 0 ? 'When you save posts, they will appear here.' : 'Videos and Reels you save will appear here.'}
                            </Text>
                        </View>
                    }
                    contentContainerStyle={{ flexGrow: 1, paddingBottom: 20 }}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            colors={[colors.primary]}
                            tintColor={colors.primary}
                        />
                    }
                    showsVerticalScrollIndicator={false}
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    navHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    backButton: {
        padding: 4,
    },
    navHeaderTitle: {
        fontSize: 16,
        fontWeight: '600',
    },
    titleSection: {
        paddingHorizontal: 20,
        paddingTop: 24,
        paddingBottom: 20,
    },
    pageTitle: {
        fontSize: 30,
        fontWeight: '800',
        marginBottom: 4,
        letterSpacing: -0.5,
    },
    pageSubtitle: {
        fontSize: 14,
        fontWeight: '500',
    },
    tabContainer: {
        // bg comes from theme
    },
    tabRow: {
        flexDirection: 'row',
        borderBottomWidth: 1,
    },
    tabButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        gap: 8,
    },
    tabButtonActive: {
        // bg color optional
    },
    tabText: {
        fontSize: 14,
        fontWeight: '600',
    },
    tabTextActive: {
        // color comes from theme
    },
    indicatorTrack: {
        width: '100%',
        height: 2,
        backgroundColor: 'transparent',
        position: 'absolute',
        bottom: 0,
    },
    indicatorLine: {
        height: 2,
    },
    gridItem: {
        padding: 1,
    },
    gridImage: {
        width: '100%',
        height: '100%',
    },
    reelIconOverlay: {
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: 'rgba(0,0,0,0.5)',
        padding: 4,
        borderRadius: 4,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyState: {
        paddingTop: 80,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 40,
    },
    emptyIconContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    emptyStateText: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 8,
    },
    emptySubText: {
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
    },
});
