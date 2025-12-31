import { SkeletonStory } from '@/components/Skeletons';
import { API_BASE_URL } from '@/constants/Config';

import { useUser } from '@/context/AuthContext';
import { useThemeContext } from '@/context/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function StoryList() {
    const router = useRouter();
    const { colors: themeColors, isDark } = useThemeContext();
    const { user, refreshUser } = (useUser() || {}) as any;
    const [fetchedUsers, setFetchedUsers] = useState([]);
    const [hasRefreshed, setHasRefreshed] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Force refresh
        // Force refresh - version 2
        console.log('StoryList mounted v2');
        const fetchStories = async () => {
            try {
                // Use centralized URL
                const url = `${API_BASE_URL}/api/stories`;

                const res = await fetch(url, {
                    headers: {
                        'Authorization': `Bearer ${user.token}`
                    }
                });

                if (res.ok) {
                    const data = await res.json();
                    const filtered = data.filter((u: any) => String(u._id) !== String(user?._id));
                    setFetchedUsers(filtered);
                }
            } catch (error) {
                console.log('Error fetching stories:', error);
            } finally {
                setIsLoading(false);
            }
        };

        if (user) {
            fetchStories();
        } else {
            setIsLoading(false);
        }
    }, [user?._id, user?.following, user?.token]);

    const styles = useMemo(() => createStyles(themeColors), [themeColors]);

    return (
        <View>
            <FlatList
                data={isLoading ? [] : fetchedUsers}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.contentContainer}
                style={styles.container}
                keyExtractor={(item: any) => item._id || item.id}
                ListHeaderComponent={() => (
                    <View style={{ flexDirection: 'row', gap: 16 }}>
                        {/* Current User Story */}
                        {user && (() => {
                            const hasActiveStory = user.stories?.length > 0 && user.stories.some((s: any) => {
                                if (!s.createdAt) return false;
                                return (Date.now() - new Date(s.createdAt).getTime()) < 24 * 60 * 60 * 1000;
                            });

                            return (
                                <View style={styles.storyContainer}>
                                    <TouchableOpacity onPress={() => {
                                        if (hasActiveStory) {
                                            router.push({ pathname: '/story-view', params: { userId: user._id || user.id } });
                                        } else {
                                            router.push('/story-create');
                                        }
                                    }}>
                                        <View style={styles.avatarWrapper}>
                                            {hasActiveStory ? (
                                                <LinearGradient
                                                    colors={[themeColors.primary, '#AACC00']}
                                                    style={styles.gradientBorder}
                                                >
                                                    <View style={[styles.whiteBorder, { backgroundColor: themeColors.background }]}>
                                                        <Image source={{ uri: user.avatar }} style={styles.avatar} />
                                                    </View>
                                                </LinearGradient>
                                            ) : (
                                                <View style={[styles.avatarBorder, { borderColor: 'transparent', backgroundColor: themeColors.gray }]}>
                                                    <Image source={{ uri: user.avatar }} style={styles.avatar} />
                                                    <View style={[styles.addStoryBadge, { borderColor: themeColors.background, backgroundColor: themeColors.primary }]}>
                                                        <Plus size={14} color="#FFF" strokeWidth={3} />
                                                    </View>
                                                </View>
                                            )}
                                        </View>
                                    </TouchableOpacity>
                                    <Text style={[styles.name, { color: themeColors.text }]} numberOfLines={1}>My Story</Text>
                                </View>
                            );
                        })()}

                        {isLoading && Array.from({ length: 5 }).map((_, i) => (
                            <SkeletonStory key={`skeleton-${i}`} />
                        ))}
                    </View>
                )}
                renderItem={({ item }: { item: any }) => (
                    <View style={styles.storyContainer}>
                        <TouchableOpacity onPress={() => router.push({
                            pathname: '/story-view',
                            params: {
                                userId: item._id || item.id,
                            }
                        })}>
                            <View style={styles.avatarWrapper}>
                                <LinearGradient
                                    colors={item.isLive ? ['#FF0000', '#FF4D4D'] : [themeColors.primary, '#AACC00']}
                                    style={styles.gradientBorder}
                                >
                                    <View style={[styles.whiteBorder, { backgroundColor: themeColors.background }]}>
                                        <Image source={{ uri: item.avatar }} style={styles.avatar} />
                                    </View>
                                </LinearGradient>
                            </View>
                        </TouchableOpacity>
                        <Text style={[styles.name, { color: themeColors.text }]} numberOfLines={1}>{item.name}</Text>
                        {item.isLive && (
                            <View style={styles.liveBadge}>
                                <Text style={styles.liveText}>Live</Text>
                            </View>
                        )}
                    </View>
                )}
            />
        </View>
    );
}

const createStyles = (colors: any) => StyleSheet.create({
    container: {
        paddingVertical: 16,
    },
    contentContainer: {
        paddingHorizontal: 16,
        gap: 16,
    },
    storyContainer: {
        alignItems: 'center',
        width: 68,
    },
    avatarWrapper: {
        position: 'relative',
    },
    gradientBorder: {
        width: 68,
        height: 68,
        borderRadius: 34,
        alignItems: 'center',
        justifyContent: 'center',
    },
    whiteBorder: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: colors.background,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarBorder: {
        width: 68,
        height: 68,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 34,
    },
    avatar: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: colors.gray,
    },
    addStoryBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: colors.primary,
        width: 20,
        height: 20,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: colors.background,
    },
    name: {
        marginTop: 4,
        fontSize: 12,
        color: colors.text,
        textAlign: 'center',
    },
    liveBadge: {
        position: 'absolute',
        bottom: 20,
        backgroundColor: colors.danger || '#FF0000',
        paddingHorizontal: 6,
        paddingVertical: 1,
        borderRadius: 4,
        borderWidth: 1.5,
        borderColor: colors.white || '#FFF',
    },
    liveText: {
        color: 'white',
        fontSize: 9,
        fontWeight: 'bold',
    }
});
