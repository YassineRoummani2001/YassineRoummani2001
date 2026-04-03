import { API_BASE_URL } from '@/constants/Config';
import { useUser } from '@/context/AuthContext';
import { useThemeContext } from '@/context/ThemeContext';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Image, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View, Pressable } from 'react-native';

export default function DesktopRightSidebar() {
    if (Platform.OS !== 'web') return null;

    const { colors, isDark } = useThemeContext();
    const { user } = (useUser() || {}) as any;
    const router = useRouter();
    const [suggestedUsers, setSuggestedUsers] = useState<any[]>([]);
    const [hoveredUser, setHoveredUser] = useState<string | null>(null);
    const [hoveredTag, setHoveredTag] = useState<number | null>(null);
    const [trendingHashtags, setTrendingHashtags] = useState<any[]>([
        { tag: '#design', count: 124 },
        { tag: '#development', count: 98 },
        { tag: '#music', count: 85 }
    ]);

    useEffect(() => {
        const fetchSuggestions = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/api/users/all`);
                if (res.ok) {
                    const data = await res.json();
                    if (data && data.length > 0) {
                        const filtered = data.filter((u: any) => u._id !== user?._id).slice(0, 5);
                        setSuggestedUsers(filtered);
                    }
                }
            } catch (err) {
                console.log('Error fetching suggestions', err);
            }
        };

        const fetchHashtags = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/api/posts/trending-hashtags`);
                if (res.ok) {
                    const data = await res.json();
                    if (data && data.length > 0) {
                        setTrendingHashtags(data);
                    }
                }
            } catch (err) {
                console.log('Error fetching trending hashtags', err);
            }
        };

        fetchSuggestions();
        fetchHashtags();
    }, [user?._id]);

    const getValidUri = (uri: string) => {
        if (!uri) return 'https://i.pravatar.cc/150';
        if (uri.startsWith('http')) return uri;
        return `${API_BASE_URL}${uri.startsWith('/') ? '' : '/'}${uri}`;
    };

    const cardBg = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)';
    const cardBorder = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)';

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            {/* Suggested Users Card */}
            <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                <View style={styles.cardHeader}>
                    <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                        Suggested for you
                    </Text>
                    <TouchableOpacity onPress={() => router.push('/discover-people' as any)}>
                        <Text style={[styles.seeAllText, { color: colors.primary }]}>See all</Text>
                    </TouchableOpacity>
                </View>

                {suggestedUsers.map((u) => (
                    <Pressable
                        key={u._id}
                        onHoverIn={() => setHoveredUser(u._id)}
                        onHoverOut={() => setHoveredUser(null)}
                        onPress={() => router.push(`/user/${u._id}` as any)}
                        style={[
                            styles.userRow,
                            hoveredUser === u._id && {
                                backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
                            },
                        ]}
                    >
                        <Image
                            source={{ uri: getValidUri(u.avatar) }}
                            style={[styles.avatar, { borderColor: colors.primary + '30' }]}
                        />
                        <View style={styles.userMeta}>
                            <Text style={[styles.userName, { color: colors.text }]} numberOfLines={1}>
                                {u.name || u.handle}
                            </Text>
                            <Text style={[styles.userSub, { color: colors.textSecondary }]} numberOfLines={1}>
                                {(u.followers?.length || 0)} followers
                            </Text>
                        </View>
                        <TouchableOpacity
                            style={[styles.followBtn, { backgroundColor: colors.primary }]}
                        >
                            <Text style={styles.followBtnText}>Follow</Text>
                        </TouchableOpacity>
                    </Pressable>
                ))}
            </View>

            {/* Trending Hashtags Card */}
            <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                <View style={styles.cardHeader}>
                    <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                        Trending
                    </Text>
                    <Ionicons name="trending-up" size={18} color={colors.primary} />
                </View>

                {trendingHashtags.map((item, index) => (
                    <Pressable
                        key={index}
                        onHoverIn={() => setHoveredTag(index)}
                        onHoverOut={() => setHoveredTag(null)}
                        style={[
                            styles.hashtagRow,
                            hoveredTag === index && {
                                backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
                            },
                        ]}
                    >
                        <View style={[styles.hashtagIcon, { backgroundColor: `${colors.primary}15` }]}>
                            <Text style={{ fontSize: 16, color: colors.primary, fontWeight: '800' }}>#</Text>
                        </View>
                        <View style={styles.hashtagInfo}>
                            <Text style={[styles.hashtagName, { color: colors.text }]}>
                                {item.tag.replace('#', '')}
                            </Text>
                            <Text style={[styles.hashtagPosts, { color: colors.textSecondary }]}>
                                {item.count} posts
                            </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
                    </Pressable>
                ))}
            </View>

            {/* Footer */}
            <View style={styles.footer}>
                <Text style={[styles.footerText, { color: isDark ? '#555' : '#bbb' }]}>
                    About · Help · Press · API · Jobs · Privacy · Terms
                </Text>
                <Text style={[styles.footerCopyright, { color: isDark ? '#444' : '#ccc' }]}>
                    © 2026 Vibe Platform
                </Text>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingTop: 8,
    },
    card: {
        borderRadius: 16,
        borderWidth: 1,
        padding: 16,
        marginBottom: 16,
        overflow: 'hidden' as any,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 14,
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.8,
    },
    seeAllText: {
        fontSize: 13,
        fontWeight: '600',
    },
    userRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 4,
        borderRadius: 10,
        marginBottom: 2,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 12,
        marginRight: 10,
        borderWidth: 2,
    },
    userMeta: {
        flex: 1,
        marginRight: 8,
        minWidth: 0,
    },
    userName: {
        fontSize: 13,
        fontWeight: '600',
        letterSpacing: -0.2,
    },
    userSub: {
        fontSize: 11,
        marginTop: 1,
    },
    followBtn: {
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 8,
    },
    followBtnText: {
        color: 'white',
        fontSize: 12,
        fontWeight: '700',
    },
    hashtagRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 4,
        borderRadius: 10,
        marginBottom: 2,
    },
    hashtagIcon: {
        width: 36,
        height: 36,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
    },
    hashtagInfo: {
        flex: 1,
    },
    hashtagName: {
        fontSize: 14,
        fontWeight: '600',
        letterSpacing: -0.2,
    },
    hashtagPosts: {
        fontSize: 11,
        marginTop: 1,
    },
    footer: {
        paddingTop: 16,
        paddingHorizontal: 8,
        paddingBottom: 30,
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
