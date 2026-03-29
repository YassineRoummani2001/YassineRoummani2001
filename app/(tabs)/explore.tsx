import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Dimensions, Platform, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useThemeContext } from '@/context/ThemeContext';
import { API_BASE_URL } from '@/constants/Config';
import { SkeletonGridItem } from '@/components/Skeletons';
import { Ionicons } from '@expo/vector-icons';

export default function ExploreScreen() {
    const router = useRouter();
    const { colors, isDark } = useThemeContext();
    const { width } = useWindowDimensions();
    const [posts, setPosts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeCategory, setActiveCategory] = useState('All');

    const isDesktop = Platform.OS === 'web' && width > 768;
    const NUM_COLUMNS = isDesktop ? 3 : 3;
    const SPACING = 2;
    const ITEM_WIDTH = (isDesktop ? (Math.min(width - 240, 935) / NUM_COLUMNS) : width / NUM_COLUMNS) - (SPACING * 1.5);

    const categories = ['All', 'Travel', 'Art', 'Tech', 'Music', 'Fashion', 'Photography', 'Food'];

    useEffect(() => {
        fetchExploreData();
    }, []);

    const fetchExploreData = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${API_BASE_URL}/api/posts?limit=30`);
            if (response.ok) {
                const data = await response.json();
                setPosts(data);
            }
        } catch (error) {
            console.error('Explore fetch failed:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const renderItem = ({ item, index }: { item: any; index: number }) => {
        const isReel = item.type === 'reel' || item.type === 'video';
        
        return (
            <TouchableOpacity 
                activeOpacity={0.9}
                onPress={() => router.push(`/post/${item._id}`)}
                style={[
                    styles.gridItem, 
                    { width: ITEM_WIDTH, height: ITEM_WIDTH },
                    index % NUM_COLUMNS !== 2 && { marginRight: SPACING }
                ]}
            >
                <Image
                    source={{ uri: item.uri }}
                    style={StyleSheet.absoluteFill}
                    contentFit="cover"
                    transition={200}
                />
                {isReel && (
                    <View style={styles.reelBadge}>
                        <Ionicons name="play" size={14} color="white" />
                    </View>
                )}
                {index === 1 && (
                    <View style={styles.statBadge}>
                        <Ionicons name="trending-up" size={12} color="white" style={{ marginRight: 4 }} />
                        <Text style={styles.statText}>Trending</Text>
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Categories */}
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
                 <FlatList
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    data={categories}
                    keyExtractor={(it) => it}
                    contentContainerStyle={styles.categoryContent}
                    renderItem={({ item }) => (
                        <TouchableOpacity 
                            onPress={() => setActiveCategory(item)}
                            style={[
                                styles.categoryChip, 
                                { backgroundColor: activeCategory === item ? colors.primary : (isDark ? '#222' : '#f0f0f0') }
                            ]}
                        >
                            <Text style={[
                                styles.categoryText, 
                                { color: activeCategory === item ? 'white' : colors.text }
                            ]}>
                                {item}
                            </Text>
                        </TouchableOpacity>
                    )}
                />
            </View>

            {loading && !refreshing ? (
                <View style={styles.loadingGrid}>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
                        <View key={i} style={{ width: ITEM_WIDTH, height: ITEM_WIDTH, marginRight: SPACING, marginBottom: SPACING }}>
                            <SkeletonGridItem />
                        </View>
                    ))}
                </View>
            ) : (
                <FlatList
                    data={posts}
                    renderItem={renderItem}
                    keyExtractor={(item) => item._id}
                    numColumns={NUM_COLUMNS}
                    contentContainerStyle={styles.gridContainer}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchExploreData(); }} />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="search-outline" size={48} color={colors.textSecondary} />
                            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Nothing to explore yet</Text>
                        </View>
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        paddingVertical: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    categoryContent: {
        paddingHorizontal: 16,
        gap: 8,
    },
    categoryChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
    },
    categoryText: {
        fontSize: 14,
        fontWeight: '600',
    },
    gridContainer: {
        paddingTop: 1,
    },
    gridItem: {
        marginBottom: 2,
        backgroundColor: '#eee',
        position: 'relative',
    },
    loadingGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        padding: 1,
    },
    reelBadge: {
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: 'rgba(0,0,0,0.3)',
        padding: 4,
        borderRadius: 4,
    },
    statBadge: {
        position: 'absolute',
        bottom: 8,
        left: 8,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    statText: {
        color: 'white',
        fontSize: 10,
        fontWeight: 'bold',
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 100,
    },
    emptyText: {
        marginTop: 16,
        fontSize: 16,
    }
});
