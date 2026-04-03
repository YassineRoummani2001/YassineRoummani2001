import { SkeletonGridItem, SkeletonRow } from '@/components/Skeletons';
import { API_BASE_URL } from '@/constants/Config';
import { useTheme } from '@/hooks/useTheme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { Search as SearchIcon, TrendingUp, X, Clock, User as UserIcon, Hash } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, Platform, useWindowDimensions } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const RECENT_SEARCHES_KEY = 'vibe_recent_searches';
const TRENDING_TOPICS = [
    'Photography', 'Travel 2024', 'Minimal Design', 'React Native',
    'Cinematic Reels', 'Architecture', 'Nature', 'Tech News'
];

export default function SearchScreen() {
    const [searchQuery, setSearchQuery] = useState('');
    const [results, setResults] = useState<{ users: any[], posts: any[] }>({ users: [], posts: [] });
    const [recentSearches, setRecentSearches] = useState<string[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    
    const colors = useTheme();
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { width } = useWindowDimensions();
    const isDesktop = Platform.OS === 'web' && width > 768;
    const styles = useMemo(() => createStyles(colors, insets, isDesktop), [colors, insets, isDesktop]);

    // Load recent searches
    useEffect(() => {
        loadRecentSearches();
    }, []);

    const loadRecentSearches = async () => {
        try {
            const stored = await AsyncStorage.getItem(RECENT_SEARCHES_KEY);
            if (stored) setRecentSearches(JSON.parse(stored));
        } catch (e) {
            console.error('Failed to load recent searches', e);
        }
    };

    const saveRecentSearch = async (query: string) => {
        if (!query.trim()) return;
        const updated = [query, ...recentSearches.filter(s => s !== query)].slice(0, 10);
        setRecentSearches(updated);
        try {
            await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
        } catch (e) {
            console.error('Failed to save search', e);
        }
    };

    const removeRecentSearch = async (query: string) => {
        const updated = recentSearches.filter(s => s !== query);
        setRecentSearches(updated);
        try {
            await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
        } catch (e) {
            console.error('Failed to remove search', e);
        }
    };

    const clearAllRecent = async () => {
        setRecentSearches([]);
        try {
            await AsyncStorage.removeItem(RECENT_SEARCHES_KEY);
        } catch (e) {
            console.error('Failed to clear searches', e);
        }
    };

    // Debounced search
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            if (searchQuery.trim().length > 1) {
                performSearch(searchQuery);
            } else {
                setResults({ users: [], posts: [] });
            }
        }, 500);
        return () => clearTimeout(timeoutId);
    }, [searchQuery]);

    const performSearch = async (query: string) => {
        setIsSearching(true);
        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/search?q=${encodeURIComponent(query)}`);
            if (response.ok) {
                const data = await response.json();
                setResults(data);
            }
        } catch (error) {
            console.error('Search failed:', error);
        } finally {
            setIsSearching(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        if (searchQuery) performSearch(searchQuery);
        setTimeout(() => setRefreshing(false), 1000);
    };

    const handleResultPress = (type: 'user' | 'hashtag', value: any) => {
        saveRecentSearch(searchQuery);
        if (type === 'user') {
            router.push(`/user/${value._id}`);
        } else {
            setSearchQuery(value);
        }
    };

    const getAvatarUri = (avatar?: string) => {
        if (!avatar) return null;
        if (avatar.startsWith('http')) return avatar;
        return `${API_BASE_URL}${avatar.startsWith('/') ? '' : '/'}${avatar}`;
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            {!isDesktop && (
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Search</Text>
                </View>
            )}

            {/* Search Bar */}
            <View style={[styles.searchBarWrapper, isDesktop && { paddingTop: 24, paddingBottom: 16 }]}>
                <View style={[styles.searchBar, { backgroundColor: colors.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
                    <SearchIcon size={20} color={colors.textSecondary} />
                    <TextInput
                        placeholder="Search users or posts..."
                        placeholderTextColor={colors.textSecondary}
                        style={[styles.searchInput, { color: colors.text }]}
                        value={searchQuery}
                        onChangeText={(txt) => {
                            setSearchQuery(txt);
                            if (txt.length > 0) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        }}
                        autoFocus={isDesktop}
                        autoCapitalize="none"
                        autoCorrect={false}
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => {
                            setSearchQuery('');
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        }}>
                            <X size={20} color={colors.textSecondary} />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            <ScrollView
                contentContainerStyle={styles.content}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={[colors.primary]}
                        tintColor={colors.primary}
                    />
                }
            >
                {searchQuery.length === 0 ? (
                    <>
                        {/* Recent Searches */}
                        {recentSearches.length > 0 && (
                            <View style={styles.section}>
                                <View style={styles.sectionTitleContainer}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                        <Clock size={20} color={colors.textSecondary} />
                                        <Text style={styles.sectionTitle}>Recent</Text>
                                    </View>
                                    <TouchableOpacity onPress={clearAllRecent}>
                                        <Text style={{ color: colors.primary, fontWeight: '600' }}>Clear All</Text>
                                    </TouchableOpacity>
                                </View>
                                <View style={styles.recentList}>
                                    {recentSearches.map((item, index) => (
                                        <View key={index} style={styles.recentItem}>
                                            <TouchableOpacity 
                                                style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 }}
                                                onPress={() => setSearchQuery(item)}
                                            >
                                                <Clock size={16} color={colors.textSecondary} opacity={0.5} />
                                                <Text style={styles.recentText}>{item}</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity onPress={() => removeRecentSearch(item)}>
                                                <X size={16} color={colors.textSecondary} />
                                            </TouchableOpacity>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        )}

                        {/* Trending Topics */}
                        <View style={styles.section}>
                            <View style={styles.sectionTitleContainer}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                    <TrendingUp size={20} color={colors.textSecondary} />
                                    <Text style={styles.sectionTitle}>Trending</Text>
                                </View>
                            </View>
                            <View style={styles.tagsContainer}>
                                {TRENDING_TOPICS.map((topic, index) => (
                                    <TouchableOpacity 
                                        key={index} 
                                        style={styles.tag}
                                        onPress={() => {
                                            setSearchQuery(`#${topic}`);
                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                        }}
                                    >
                                        <Text style={styles.tagText}>#{topic}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    </>
                ) : (
                    <View style={styles.resultsContainer}>
                        {isSearching ? (
                            <View style={{ gap: 12 }}>
                                {[1, 2, 3, 4].map(i => <SkeletonRow key={i} />)}
                            </View>
                        ) : (
                            <>
                                {results.users.length > 0 && (
                                    <View style={styles.section}>
                                        <Text style={styles.resultHeader}>Users</Text>
                                        {results.users.map((user) => (
                                            <TouchableOpacity 
                                                key={user._id} 
                                                style={styles.userResult}
                                                onPress={() => handleResultPress('user', user)}
                                            >
                                                <View style={styles.avatar}>
                                                    {user.avatar ? (
                                                        <Image source={{ uri: getAvatarUri(user.avatar) || '' }} style={styles.avatarImg} />
                                                    ) : (
                                                        <UserIcon color="white" size={20} />
                                                    )}
                                                </View>
                                                <View style={{ flex: 1 }}>
                                                    <Text style={styles.userName}>{user.name}</Text>
                                                    <Text style={styles.userHandle}>{user.handle}</Text>
                                                </View>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                )}

                                {results.posts.length > 0 && (
                                    <View style={[styles.section, { marginTop: 24 }]}>
                                        <Text style={styles.resultHeader}>Posts</Text>
                                        <View style={styles.postsGrid}>
                                            {results.posts.map((post) => (
                                                <TouchableOpacity 
                                                    key={post._id} 
                                                    style={styles.postResult}
                                                    onPress={() => router.push(`/post/${post._id}`)}
                                                >
                                                    <Image 
                                                        source={{ uri: getAvatarUri(post.uri || post.thumbnail) || '' }} 
                                                        style={styles.postImg} 
                                                    />
                                                    {post.type === 'reel' && (
                                                        <View style={styles.reelBadge}>
                                                            <Hash size={12} color="white" />
                                                        </View>
                                                    )}
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    </View>
                                )}

                                {results.users.length === 0 && results.posts.length === 0 && !isSearching && (
                                    <View style={styles.noResults}>
                                        <Text style={styles.noResultsText}>No results found for "{searchQuery}"</Text>
                                    </View>
                                )}
                            </>
                        )}
                    </View>
                )}
            </ScrollView>
        </View>
    );
}

const createStyles = (colors: any, insets: any, isDesktop: boolean) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
        paddingTop: Platform.OS === 'web' ? 0 : insets.top,
    },
    header: {
        paddingHorizontal: 20,
        paddingBottom: 20,
        backgroundColor: colors.background,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: '900',
        color: colors.text,
        letterSpacing: -0.5,
    },
    searchBarWrapper: {
        paddingHorizontal: 16,
        marginBottom: 8,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        height: 52,
        borderRadius: 30,
        marginTop: 20,
        borderWidth: 1,
        borderColor: colors.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
    },
    searchInput: {
        flex: 1,
        height: '100%',
        marginLeft: 12,
        fontSize: 16,
        color: colors.text,
        fontWeight: '500',
    },
    content: {
        flex: 1,
        paddingHorizontal: 20,
    },
    section: {
        marginBottom: 32,
    },
    sectionTitleContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '900',
        color: colors.text,
        letterSpacing: -0.5,
    },
    recentList: {
        gap: 4,
    },
    recentItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
    },
    recentText: {
        fontSize: 16,
        color: colors.text,
    },
    tagsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    tag: {
        paddingHorizontal: 18,
        paddingVertical: 10,
        backgroundColor: colors.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: colors.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
    },
    tagText: {
        fontSize: 13,
        fontWeight: '700',
        color: colors.textSecondary,
        letterSpacing: 0.2,
    },
    resultsContainer: {
        flex: 1,
    },
    resultHeader: {
        fontSize: 18,
        fontWeight: '800',
        color: colors.text,
        marginBottom: 8,
    },
    userResult: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        gap: 12,
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    avatarImg: {
        width: '100%',
        height: '100%',
    },
    userName: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.text,
    },
    userHandle: {
        fontSize: 14,
        color: colors.textSecondary,
    },
    postsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        justifyContent: 'flex-start',
    },
    postResult: {
        width: isDesktop ? '18%' : '30.5%',
        aspectRatio: 1,
        borderRadius: 16,
        backgroundColor: colors.gray,
        overflow: 'hidden',
    },
    postImg: {
        width: '100%',
        height: '100%',
    },
    reelBadge: {
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: 'rgba(0,0,0,0.5)',
        padding: 4,
        borderRadius: 4,
    },
    noResults: {
        alignItems: 'center',
        marginTop: 60,
    },
    noResultsText: {
        color: colors.textSecondary,
        fontSize: 16,
    }
});
