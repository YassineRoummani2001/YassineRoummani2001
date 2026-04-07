import { SkeletonGridItem, SkeletonRow } from '@/components/Skeletons';
import { API_BASE_URL } from '@/constants/Config';
import { useThemeContext } from '@/context/ThemeContext';
import { useTheme } from '@/hooks/useTheme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Search as SearchIcon, TrendingUp, X, Clock, User as UserIcon, Hash } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Dimensions, Image, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const RECENT_SEARCHES_KEY = 'vibe_recent_searches';
const TRENDING_TOPICS = [
    'Photography', 'Travel 2024', 'Minimal Design', 'React Native',
    'Cinematic Reels', 'Architecture', 'Nature', 'Tech News'
];

export default function SearchScreen() {
    const { q } = useLocalSearchParams();
    const [searchQuery, setSearchQuery] = useState((q as string) || '');
    
    useEffect(() => {
        if (typeof q === 'string') {
            setSearchQuery(q);
        }
    }, [q]);

    const [results, setResults] = useState<{ users: any[], posts: any[] }>({ users: [], posts: [] });
    const [refreshing, setRefreshing] = useState(false);
    const [suggestedUsers, setSuggestedUsers] = useState<any[]>([]);
    const [recentSearches, setRecentSearches] = useState<string[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [trendingTopics, setTrendingTopics] = useState<string[]>(TRENDING_TOPICS);

    const { colors, isDark } = useThemeContext();
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { user } = (useTheme() as any) || {};
    const width = Dimensions.get('window').width;
    const isDesktop = Platform.OS === 'web' && width > 768;
    const styles = useMemo(() => createStyles(colors, insets, isDesktop, isDark), [colors, insets, isDesktop, isDark]);

    // Load recent searches
    useEffect(() => {
        loadRecentSearches();
        fetchSuggestedUsers();
        fetchTrendingTopics();
    }, []);

    const fetchSuggestedUsers = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/users/all`);
            if (res.ok) {
                const data = await res.json();
                // Filter out the current user if possible
                setSuggestedUsers(data.filter((u: any) => u._id !== user?._id).slice(0, 10));
            }
        } catch (error) {
            console.error('Error fetching suggested users:', error);
        }
    };

    const fetchTrendingTopics = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/posts/all-hashtags`);
            if (res.ok) {
                const data = await res.json();
                if (data && data.length > 0) {
                    setTrendingTopics(data.slice(0, 8).map((t: any) => t.tag.replace('#', '')));
                }
            }
        } catch (error) {
            console.error('Error fetching trending topics:', error);
        }
    };

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

    const getCorrectUrl = (uri: string | null | undefined) => {
        if (!uri || typeof uri !== 'string' || uri.trim() === '') return undefined;
        const clean = uri.trim();
        if (clean.length === 0) return undefined;

        if (clean.startsWith('blob:') || clean.startsWith('data:') || clean.startsWith('file:')) return clean;

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

    const GridVideoItem = ({ uri, style }: { uri: string, style: any }) => {
        const player = useVideoPlayer(getCorrectUrl(uri) || '', player => {
            player.loop = true;
            player.muted = true;
        });

        return (
            <View style={[style, { overflow: 'hidden', backgroundColor: 'black' }]}>
                <VideoView
                    player={player}
                    style={{ width: '100%', height: '100%' }}
                    contentFit="cover"
                    nativeControls={false}
                />
            </View>
        );
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
                <View style={[styles.searchBar, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
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
                        onSubmitEditing={() => saveRecentSearch(searchQuery)}
                        returnKeyType="search"
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
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
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
                                <View style={styles.historyContainer}>
                                    {recentSearches.map((item, index) => (
                                        <TouchableOpacity 
                                            key={index} 
                                            style={styles.historyChip}
                                            onPress={() => setSearchQuery(item)}
                                        >
                                            <Clock size={14} color={colors.textSecondary} />
                                            <Text style={styles.historyText}>{item}</Text>
                                            <TouchableOpacity 
                                                onPress={(e) => {
                                                    e.stopPropagation();
                                                    removeRecentSearch(item);
                                                }}
                                                style={styles.removeHistory}
                                            >
                                                <X size={12} color={colors.textSecondary} />
                                            </TouchableOpacity>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>
                        )}

                        {/* Suggested Users */}
                        {suggestedUsers.length > 0 && (
                            <View style={styles.section}>
                                <View style={styles.sectionTitleContainer}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                        <UserIcon size={20} color={colors.textSecondary} />
                                        <Text style={styles.sectionTitle}>Discover People</Text>
                                    </View>
                                    <TouchableOpacity onPress={() => router.push('/users-list')}>
                                        <Text style={{ color: colors.primary, fontWeight: '600' }}>Show more</Text>
                                    </TouchableOpacity>
                                </View>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 16 }}>
                                    {suggestedUsers.map((u) => (
                                        <TouchableOpacity 
                                            key={u._id} 
                                            style={[styles.suggestedCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#fff', borderColor: colors.border }]}
                                            onPress={() => router.push(`/user/${u._id}` as any)}
                                        >
                                            <View style={styles.suggestedAvatar}>
                                                <Image 
                                                    source={{ uri: getCorrectUrl(u.avatar) || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name || 'User')}&background=random` }} 
                                                    style={styles.avatarFull} 
                                                />
                                            </View>
                                            <Text style={[styles.suggestedName, { color: colors.text }]} numberOfLines={1}>{u.name}</Text>
                                            <Text style={[styles.suggestedHandle, { color: colors.textSecondary }]} numberOfLines={1}>@{u.handle}</Text>
                                            <TouchableOpacity 
                                                style={[styles.followBtnMini, { backgroundColor: colors.primary }]}
                                                onPress={(e) => {
                                                    e.stopPropagation();
                                                    // Follow logic or just navigate
                                                    router.push(`/user/${u._id}` as any);
                                                }}
                                            >
                                                <Text style={styles.followBtnText}>View</Text>
                                            </TouchableOpacity>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
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
                                {trendingTopics.map((topic, index) => (
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
                                                    <Image 
                                                        source={{ uri: getCorrectUrl(user.avatar) || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'User')}&background=random` }} 
                                                        style={styles.avatarImg} 
                                                    />
                                                </View>
                                                <View style={{ flex: 1 }}>
                                                    <Text style={[styles.userName, { color: colors.text }]}>{user.name}</Text>
                                                    <Text style={[styles.userHandle, { color: colors.textSecondary }]}>@{user.handle}</Text>
                                                </View>
                                                <TouchableOpacity 
                                                    style={[styles.followBtnSmall, { backgroundColor: colors.primary }]}
                                                    onPress={(e) => {
                                                        e.stopPropagation();
                                                        router.push(`/user/${user._id}` as any);
                                                    }}
                                                >
                                                    <Text style={styles.followBtnText}>Profile</Text>
                                                </TouchableOpacity>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                )}

                                {results.posts.length > 0 && (
                                    <View style={[styles.section, { marginTop: 24 }]}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                            <Text style={styles.resultHeader}>Posts</Text>
                                            <View style={{ backgroundColor: colors.primary, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 }}>
                                                <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>{results.posts.length}</Text>
                                            </View>
                                        </View>
                                        <View style={styles.postsGrid}>
                                            {results.posts.map((post) => (
                                                <TouchableOpacity 
                                                    key={post._id} 
                                                    style={styles.postResult}
                                                    onPress={() => router.push(`/post/${post._id}`)}
                                                >
                                                    {post.type === 'image' ? (
                                                        <Image 
                                                            source={{ uri: getCorrectUrl(post.uri || post.thumbnail || post.imageUrl || post.image) }} 
                                                            style={styles.postImg} 
                                                        />
                                                    ) : (
                                                        <GridVideoItem uri={post.uri || post.videoUri} style={styles.postImg} />
                                                    )}
                                                    {(post.type === 'reel' || post.type === 'video') && (
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

const createStyles = (colors: any, insets: any, isDesktop: boolean, isDark: boolean) => StyleSheet.create({
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
        borderColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
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
        paddingHorizontal: 20,
        paddingBottom: 120, // Space for tab bar
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
        backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
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
    },
    historyContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    historyChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        gap: 8,
        borderWidth: 1,
        borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
    },
    historyText: {
        fontSize: 14,
        color: colors.text,
        fontWeight: '500',
    },
    removeHistory: {
        marginLeft: 4,
        padding: 2,
    },
    suggestedCard: {
        width: 150,
        padding: 16,
        borderRadius: 20,
        alignItems: 'center',
        borderWidth: 1,
    },
    suggestedAvatar: {
        width: 64,
        height: 64,
        borderRadius: 32,
        marginBottom: 12,
        overflow: 'hidden',
    },
    avatarFull: {
        width: '100%',
        height: '100%',
    },
    avatarPlaceholder: {
        width: '100%',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    suggestedName: {
        fontSize: 14,
        fontWeight: '800',
        marginBottom: 2,
        textAlign: 'center',
    },
    suggestedHandle: {
        fontSize: 12,
        marginBottom: 12,
        textAlign: 'center',
    },
    followBtnMini: {
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 12,
        width: '100%',
        alignItems: 'center',
    },
    followBtnSmall: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 12,
    },
    followBtnText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '800',
    },
});
