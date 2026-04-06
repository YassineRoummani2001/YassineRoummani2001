import { API_BASE_URL } from '@/constants/Config';
import { useUser } from '@/context/AuthContext';
import { useThemeContext } from '@/context/ThemeContext';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Image, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View, Pressable, TextInput } from 'react-native';

export default function DesktopRightSidebar() {
    if (Platform.OS !== 'web') return null;

    const { colors, isDark } = useThemeContext();
    const { user, followUser } = (useUser() || {}) as any;
    const router = useRouter();
    const [suggestedUsers, setSuggestedUsers] = useState<any[]>([]);
    const [hoveredUser, setHoveredUser] = useState<string | null>(null);
    const [hoveredTag, setHoveredTag] = useState<number | null>(null);
    const [trendingHashtags, setTrendingHashtags] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState<'All' | 'New' | 'Old' | 'Follow' | 'Following'>('All');
    const [allUsers, setAllUsers] = useState<any[]>([]);

    const handleSearch = () => {
        if (!searchQuery.trim()) return;
        // In a real app we would navigate to /search?q=${searchQuery}&tab=${searchFilter}
        router.push(`/(tabs)/search?q=${encodeURIComponent(searchQuery)}` as any);
    };

    useEffect(() => {
        const fetchSuggestions = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/api/users/all`);
                if (res.ok) {
                    const data = await res.json();
                    if (data && data.length > 0) {
                        setAllUsers(data);
                    }
                }
            } catch (err) {
                console.log('Error fetching users', err);
            }
        };

        const fetchHashtags = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/api/posts/all-hashtags`);
                if (res.ok) {
                    const data = await res.json();
                    if (data && data.length > 0) {
                        setTrendingHashtags(data.slice(0, 8));
                    }
                }
            } catch (err) {
                console.log('Error fetching hashtags', err);
            }
        };

        fetchSuggestions();
        fetchHashtags();
    }, [user?._id]);

    const filteredUsers = React.useMemo(() => {
        let result = allUsers.filter(u => u._id !== user?._id);

        // Search query filter
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            result = result.filter(u => 
                (u.name && u.name.toLowerCase().includes(q)) || 
                (u.handle && u.handle.toLowerCase().includes(q))
            );
        }

        // Active filter logic
        switch (activeFilter) {
            case 'New':
                result = [...result].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
                break;
            case 'Old':
                result = [...result].sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());
                break;
            case 'Follow':
                result = result.filter(u => !user?.following?.some((f: any) => f === u._id || f._id === u._id));
                break;
            case 'Following':
                result = result.filter(u => user?.following?.some((f: any) => f === u._id || f._id === u._id));
                break;
        }

        return result.slice(0, 10); // Show top 10
    }, [allUsers, user, searchQuery, activeFilter]);

    const getCorrectUrl = (uri: string) => {
        if (!uri || typeof uri !== 'string') return 'https://via.placeholder.com/150';
        if (uri.startsWith('blob:') || uri.startsWith('data:') || uri.startsWith('file:')) return uri;

        if (uri.startsWith('http') && uri.includes('/uploads/')) {
            const parts = uri.split('/uploads/');
            return `${API_BASE_URL}/uploads/${parts[1]}`;
        }
        
        if (uri.startsWith('http')) return uri;
        if (uri.startsWith('/uploads/')) return `${API_BASE_URL}${uri}`;
        if (uri.includes('/uploads/')) {
            const parts = uri.split('/uploads/');
            return `${API_BASE_URL}/uploads/${parts[1]}`;
        }

        return `${API_BASE_URL}${uri.startsWith('/') ? '' : '/'}${uri}`;
    };

    const cardBg = isDark ? '#111' : '#f9f9f9';
    const cardBorder = isDark ? '#222' : '#eee';

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            {/* Search Bar integration */}
            <View style={{ marginBottom: 20 }}>
                <View style={[styles.searchSection, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)', borderColor: cardBorder }]}>
                    <Ionicons name="search-outline" size={20} color={colors.textSecondary} />
                    <TextInput 
                        style={[styles.searchText, { color: colors.text, flex: 1, outlineStyle: 'none' as any }]} 
                        placeholder="Search users..."
                        placeholderTextColor={colors.textSecondary}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>

                {/* Filter Chips */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterBar}>
                    {['All', 'New', 'Old', 'Follow', 'Following'].map((f) => (
                        <TouchableOpacity
                            key={f}
                            onPress={() => setActiveFilter(f as any)}
                            style={[
                                styles.filterChip,
                                { borderColor: cardBorder },
                                activeFilter === f && { backgroundColor: colors.primary, borderColor: colors.primary }
                            ]}
                        >
                            <Text style={[styles.filterChipText, { color: activeFilter === f ? '#fff' : colors.textSecondary }]}>
                                {f}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {/* Suggested Users Card */}
            <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                <View style={styles.cardHeader}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>You might like</Text>
                    <TouchableOpacity onPress={() => router.push('/discover-people' as any)}>
                        <Text style={[styles.seeAllText, { color: colors.primary }]}>Show more</Text>
                    </TouchableOpacity>
                </View>

                {filteredUsers.map((u) => (
                    <Pressable
                        key={u._id}
                        onHoverIn={() => setHoveredUser(u._id)}
                        onHoverOut={() => setHoveredUser(null)}
                        onPress={() => router.push(`/user/${u._id}` as any)}
                        style={[
                            styles.userRow,
                            hoveredUser === u._id && {
                                backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                            },
                        ]}
                    >
                        <Image
                            source={{ uri: getCorrectUrl(u.avatar) }}
                            style={[styles.avatar, { borderColor: colors.primary + '30' }]}
                        />
                        <View style={styles.userMeta}>
                            <Text style={[styles.userName, { color: colors.text }]} numberOfLines={1}>
                                {u.name || u.handle}
                            </Text>
                            <Text style={[styles.userHandle, { color: colors.textSecondary }]} numberOfLines={1}>
                                @{u.handle}
                            </Text>
                        </View>
                        {(() => {
                            const isFollowing = user?.following?.some((f: any) => f === u._id || f._id === u._id);
                            const isRequested = user?.sentRequests?.includes(u._id);
                            return (
                                <TouchableOpacity
                                    style={[
                                        styles.followBtn, 
                                        isFollowing || isRequested
                                            ? { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.border }
                                            : { backgroundColor: colors.primary }
                                    ]}
                                    onPress={(e) => {
                                        e.stopPropagation(); // prevent navigation
                                        if (followUser) followUser(u._id);
                                    }}
                                >
                                    <Text style={[
                                        styles.followBtnText, 
                                        isFollowing || isRequested
                                            ? { color: colors.text }
                                            : { color: 'white' }
                                    ]}>{isFollowing ? 'Following' : isRequested ? 'Requested' : 'Follow'}</Text>
                                </TouchableOpacity>
                            )
                        })()}
                    </Pressable>
                ))}
            </View>

            {/* Trending Hashtags Card with sub-scroll */}
            <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 16 }]}>Trending</Text>
                <View style={{ height: 400 }}>
                    <ScrollView 
                        showsVerticalScrollIndicator={true} 
                        nestedScrollEnabled={true}
                        contentContainerStyle={{ paddingRight: 12, paddingBottom: 20 }}
                    >
                        {trendingHashtags.map((item, index) => (
                            <Pressable 
                                key={`${item.tag}-${index}`} 
                                style={[
                                    styles.tagRow,
                                    hoveredTag === index && { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)' }
                                ]}
                                onHoverIn={() => setHoveredTag(index)}
                                onHoverOut={() => setHoveredTag(null)}
                                onPress={() => {
                                    const tag = item.tag.startsWith('#') ? item.tag : `#${item.tag}`;
                                    router.push({ pathname: '/search', params: { q: tag } } as any);
                                }}
                            >
                                <Text style={[styles.tagText, { color: colors.text }]}>#{item.tag.replace('#', '')}</Text>
                                <Text style={[styles.tagCount, { color: colors.textSecondary }]}>{item.count} posts</Text>
                            </Pressable>
                        ))}
                    </ScrollView>
                </View>
            </View>

            {/* Footer */}
            <View style={styles.footer}>
                <Text style={[styles.footerText, { color: colors.textSecondary }]}>
                    About · Help · Press · API · Jobs · Privacy · Terms
                </Text>
                <Text style={[styles.footerCopyright, { color: colors.textSecondary }]}>
                    © 2026 Vibe Platform
                </Text>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        width: 350,
        height: '100%',
        paddingVertical: 12,
        paddingHorizontal: 20,
    },
    filterBar: {
        flexDirection: 'row',
        marginTop: 8,
    },
    filterChip: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 14,
        borderWidth: 1,
        marginRight: 8,
    },
    filterChipText: {
        fontSize: 12,
        fontWeight: '700',
    },
    searchSection: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 24,
        marginBottom: 24,
        borderWidth: 1,
        gap: 12,
    },
    searchText: {
        fontSize: 15,
    },
    filterBtn: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
    },
    card: {
        borderRadius: 24,
        padding: 20,
        marginBottom: 20,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 2,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '800',
    },
    seeAllText: {
        fontSize: 13,
        fontWeight: '600',
    },
    userRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 16,
        marginBottom: 4,
    },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        marginRight: 12,
        borderWidth: 2,
    },
    userMeta: {
        flex: 1,
    },
    userName: {
        fontSize: 15,
        fontWeight: '700',
    },
    userHandle: {
        fontSize: 13,
        opacity: 0.6,
    },
    followBtn: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
    },
    followBtnText: {
        fontSize: 13,
        fontWeight: '700',
    },
    tagRow: {
        paddingVertical: 12,
        paddingHorizontal: 12,
        borderRadius: 16,
        marginBottom: 4,
    },
    tagText: {
        fontSize: 15,
        fontWeight: '700',
        marginBottom: 2,
    },
    tagCount: {
        fontSize: 12,
    },
    footer: {
        paddingTop: 16,
        paddingHorizontal: 8,
        paddingBottom: 40,
    },
    footerText: {
        fontSize: 11,
        lineHeight: 18,
    },
    footerCopyright: {
        fontSize: 11,
        marginTop: 6,
    },
});
