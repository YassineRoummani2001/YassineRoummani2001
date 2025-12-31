import { API_BASE_URL } from '@/constants/Config';
import { useThemeContext } from '@/context/ThemeContext';
import { useUser } from '@/context/UserContext';
import { Stack, useRouter } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { ArrowLeft, Clock, Play } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    FlatList,
    Image,
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

const { width } = Dimensions.get('window');
const COLUMN_COUNT = 3;
const ITEM_SIZE = width / COLUMN_COUNT;

const StoryVideoItem = ({ uri, colors, mediaStyle, overlayStyle }: { uri: string, colors: any, mediaStyle: any, overlayStyle: any }) => {
    const player = useVideoPlayer(uri, player => {
        player.muted = true;
    });

    return (
        <View style={[mediaStyle, { backgroundColor: colors.gray }]}>
            <VideoView
                player={player}
                style={mediaStyle}
                contentFit="cover"
                nativeControls={false}
            />
            <View style={overlayStyle}>
                <Play size={20} color="white" fill="white" />
            </View>
        </View>
    );
};

export default function MyStoriesScreen() {
    const router = useRouter();
    const { user } = (useUser() || { user: null }) as any;
    const { colors, isDark } = useThemeContext();
    const [stories, setStories] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStories();
    }, [user]);

    const fetchStories = async () => {
        if (!user?.token) return;
        try {
            const res = await fetch(`${API_BASE_URL}/api/stories/mine`, {
                headers: { 'Authorization': `Bearer ${user.token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setStories(data);
            }
        } catch (error) {
            console.error('Failed to fetch archive', error);
        } finally {
            setLoading(false);
        }
    };

    const handlePressStory = (index: number) => {
        // Construct a temporary user object with ALL stories to pass to the viewer
        // This hacks the viewer to think these are the "active" stories
        // We add an 'archive' flag to tell viewer not to filter them
        const userWithArchive = {
            ...user,
            stories: stories
        };

        router.push({
            pathname: '/story-view',
            params: {
                userId: user?._id || user?.id,
                userStr: JSON.stringify([userWithArchive]),
                initialIndex: index,
                mode: 'archive'
            }
        });
    };

    const renderItem = ({ item, index }: { item: any, index: number }) => {
        return (
            <TouchableOpacity
                style={[styles.itemContainer, { borderColor: colors.background }]}
                onPress={() => handlePressStory(index)}
                activeOpacity={0.8}
            >
                {item.type === 'video' ? (
                    <StoryVideoItem
                        uri={item.uri}
                        colors={colors}
                        mediaStyle={styles.media}
                        overlayStyle={styles.iconOverlay}
                    />
                ) : item.type === 'image' ? (
                    <Image source={{ uri: item.uri }} style={[styles.media, { backgroundColor: colors.gray }]} resizeMode="cover" />
                ) : (
                    <View style={[styles.media, { backgroundColor: item.color || '#000', justifyContent: 'center', alignItems: 'center' }]}>
                        <Text style={styles.textStory} numberOfLines={3}>{item.content}</Text>
                    </View>
                )}

                <View style={styles.dateOverlay}>
                    <Text style={styles.dateText}>
                        {new Date(item.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                    </Text>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <Stack.Screen options={{ headerShown: false }} />
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <ArrowLeft size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.title, { color: colors.text }]}>My Stories Archive</Text>
                <View style={{ width: 40 }} />
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : (
                <FlatList
                    data={stories}
                    keyExtractor={(item) => item._id}
                    renderItem={renderItem}
                    numColumns={COLUMN_COUNT}
                    contentContainerStyle={styles.list}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <View style={[styles.emptyIconContainer, { backgroundColor: colors.gray }]}>
                                <Clock size={48} color={colors.textSecondary} />
                            </View>
                            <Text style={[styles.emptyTitle, { color: colors.text }]}>No archived stories</Text>
                            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                                Stories you post disappear after 24 hours and will appear here.
                            </Text>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'white',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    backButton: {
        padding: 4,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: 200,
    },
    list: {
        paddingBottom: 20,
    },
    itemContainer: {
        width: ITEM_SIZE,
        height: ITEM_SIZE * 1.5,
        borderWidth: 1,
        borderColor: 'white',
    },
    media: {
        width: '100%',
        height: '100%',
        backgroundColor: '#f0f0f0',
    },
    iconOverlay: {
        position: 'absolute',
        top: 8,
        right: 8,
        opacity: 0.8,
    },
    textStory: {
        color: 'white',
        fontWeight: 'bold',
        padding: 8,
        fontSize: 12,
        textAlign: 'center',
    },
    dateOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        padding: 4,
    },
    dateText: {
        color: 'white',
        fontSize: 10,
        textAlign: 'center',
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
        minHeight: 300,
        gap: 16,
    },
    emptyIconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    emptySubtitle: {
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
    }
});
