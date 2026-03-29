import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { useThemeContext } from '@/context/ThemeContext';
import { useUser } from '@/context/AuthContext';
import { API_BASE_URL } from '@/constants/Config';
import { useRouter } from 'expo-router';

export default function DesktopRightSidebar() {
    if (Platform.OS !== 'web') return null;

    const { colors, isDark } = useThemeContext();
    const { user } = (useUser() || {}) as any;
    const router = useRouter();
    const [suggestedUsers, setSuggestedUsers] = useState<any[]>([]);
    const [trendingHashtags, setTrendingHashtags] = useState<any[]>([
        { tag: '#design', count: 124 },
        { tag: '#development', count: 98 },
        { tag: '#music', count: 85 }
    ]);

    useEffect(() => {
        // Fetch users from database
        const fetchSuggestions = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/api/users/all`);
                if (res.ok) {
                    const data = await res.json();
                    if (data && data.length > 0) {
                        // Filter out current user
                        const filtered = data.filter((u: any) => u._id !== user?._id).slice(0, 5);
                        setSuggestedUsers(filtered);
                    }
                }
            } catch (err) {
                console.log('Error fetching suggestions', err);
            }
        };

        // Fetch hashtags from database
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

        if (user) {
            fetchSuggestions();
            fetchHashtags();
        }
    }, [user]);

    const getValidUri = (uri: string) => {
        if (!uri) return 'https://i.pravatar.cc/150';
        if (uri.startsWith('http')) return uri;
        return `${API_BASE_URL}${uri.startsWith('/') ? '' : '/'}${uri}`;
    };

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            {/* Suggested Users */}
            <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Suggested for you</Text>
                
                {suggestedUsers.map((u) => (
                    <View key={u._id} style={styles.userRow}>
                        <TouchableOpacity style={styles.userInfo} onPress={() => router.push(`/user/${u._id}` as any)}>
                            <Image source={{ uri: getValidUri(u.avatar) }} style={[styles.avatar, { borderColor: isDark ? '#333' : '#eee', borderWidth: 1 }]} />
                            <View>
                                <Text style={[styles.userName, { color: colors.text }]} numberOfLines={1}>{u.name || u.handle}</Text>
                                <Text style={[styles.userHandle, { color: colors.textSecondary }]} numberOfLines={1}>{(u.followers?.length || 0)} followers</Text>
                            </View>
                        </TouchableOpacity>
                        <TouchableOpacity>
                            <Text style={[styles.followText, { color: colors.primary }]}>Follow</Text>
                        </TouchableOpacity>
                    </View>
                ))}
            </View>

            {/* Trending Hashtags */}
            <View style={[styles.section, { marginTop: 30 }]}>
                <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Trending Hashtags</Text>
                
                {trendingHashtags.map((item, index) => (
                    <TouchableOpacity key={index} style={styles.hashtagRow}>
                        <View style={styles.hashtagIcon}>
                            <Text style={{ fontSize: 18, color: colors.primary, fontWeight: '700' }}>#</Text>
                        </View>
                        <View style={styles.hashtagInfo}>
                            <Text style={[styles.hashtagName, { color: colors.text }]}>{item.tag.replace('#', '')}</Text>
                            <Text style={[styles.hashtagPosts, { color: colors.textSecondary }]}>{item.count} posts</Text>
                        </View>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Footer Links */}
            <View style={styles.footer}>
                <Text style={[styles.footerText, { color: colors.textSecondary }]}>
                    About • Help • Press • API • Jobs • Privacy • Terms
                </Text>
                <Text style={[styles.footerText, { color: colors.textSecondary, marginTop: 15 }]}>
                    © 2026 Vibe Platform by OtakuZone Project
                </Text>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    section: {
        marginBottom: 10,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '700',
        marginBottom: 16,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    userRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        marginRight: 10,
    },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        marginRight: 12,
    },
    userName: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 2,
    },
    userHandle: {
        fontSize: 12,
    },
    followText: {
        fontSize: 13,
        fontWeight: '700',
    },
    hashtagRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    hashtagIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(150,150,150,0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    hashtagInfo: {
        flex: 1,
    },
    hashtagName: {
        fontSize: 15,
        fontWeight: '600',
        marginBottom: 2,
    },
    hashtagPosts: {
        fontSize: 12,
    },
    footer: {
        marginTop: 40,
        paddingTop: 20,
        borderTopWidth: 1,
        borderTopColor: 'rgba(150,150,150,0.1)',
    },
    footerText: {
        fontSize: 12,
        lineHeight: 18,
    }
});
