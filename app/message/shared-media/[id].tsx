import { API_BASE_URL } from '@/constants/Config';
import { useThemeContext } from '@/context/ThemeContext';
import { useUser } from '@/context/UserContext';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronRight, Play } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    FlatList,
    Image,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');
const COLUMN_COUNT = 3;
const SPACING = 2; // Spacing between items
const ITEM_SIZE = (width - (COLUMN_COUNT - 1) * SPACING) / COLUMN_COUNT;

const getCorrectUrl = (url: string) => {
    if (!url) return '';
    try {
        if (url.startsWith('/uploads/')) {
            const encodedPath = url.split('/').map(part => encodeURIComponent(part)).join('/');
            // The split/join above might double encode slashes if not careful.
            // Better to assume the backend might serve unencoded paths.
            // But encodeURI is safer for full URLs/paths.
            // However, React Native Images often dislike encoded slashes.
            // Let's just fix the full URL construction + encodeURI if it has spaces.
            return encodeURI(`${API_BASE_URL}${url}`);
        }
        if (url.includes('/uploads/')) {
            const parts = url.split('/uploads/');
            const path = `/uploads/${parts[1]}`;
            return encodeURI(`${API_BASE_URL}${path}`);
        }
        return url.startsWith('http') ? encodeURI(url) : url;
    } catch (e) {
        return url;
    }
};

export default function SharedMediaScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const { user } = useUser();
    const { colors, isDark } = useThemeContext();
    const insets = useSafeAreaInsets();

    const [media, setMedia] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchMedia = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/api/chats/${id}/media`, {
                    headers: { 'Authorization': `Bearer ${user?.token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setMedia(data);
                }
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };

        if (id && user?.token) fetchMedia();
    }, [id, user]);

    const handlePressMedia = (item: any) => {
        let uri = '';
        let type = item.type;
        let postId = item.postId?._id || item.postId; // Post ID if available

        if (item.type === 'image') {
            uri = getCorrectUrl(item.content);
        } else if (item.type === 'video') {
            uri = getCorrectUrl(item.content);
        } else if ((item.type === 'reel' || item.type === 'post') && item.postId) {
            uri = getCorrectUrl(item.postId.videoUri || item.postId.uri);
            // If it's a reel, type is 'video' for the viewer typically, or 'reel' if supported
            type = item.postId.videoUri ? 'video' : 'image';
        }

        if (uri) {
            // Encode the URI to ensure it's safely passed as a query param
            router.push({
                pathname: '/media-view',
                params: {
                    uri: encodeURIComponent(uri),
                    type: type,
                    postId: postId ? (typeof postId === 'object' ? postId._id : postId) : undefined
                }
            });
        }
    };

    const renderItem = ({ item }: { item: any }) => {
        let thumbnailUri = '';
        const isVideo = item.type === 'video' || item.type === 'reel' || (item.postId && item.postId.videoUri);

        if (item.type === 'image') {
            thumbnailUri = getCorrectUrl(item.content);
        } else if (item.type === 'video') {
            thumbnailUri = getCorrectUrl(item.content); // Use video itself or thumbnail if you had one.
            // Ideally backend should geneate thumbnails for videos
        } else if ((item.type === 'reel' || item.type === 'post') && item.postId) {
            thumbnailUri = getCorrectUrl(item.postId.thumbnail || item.postId.uri);
        }

        if (!thumbnailUri) return null;

        return (
            <TouchableOpacity
                style={styles.gridItem}
                onPress={() => handlePressMedia(item)}
                activeOpacity={0.8}
            >
                <Image
                    source={{ uri: thumbnailUri }}
                    style={styles.image}
                    resizeMode="cover"
                />
                {isVideo && (
                    <View style={styles.videoIcon}>
                        <Play size={16} color="#fff" fill="#fff" />
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <Stack.Screen options={{ headerShown: false }} />
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.background} />

            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <ChevronRight size={28} color={colors.text} style={{ transform: [{ rotate: '180deg' }] }} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Shared Media</Text>
                <View style={{ width: 40 }} />
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : media.length === 0 ? (
                <View style={styles.center}>
                    <Text style={{ color: colors.textSecondary, fontSize: 16 }}>No media shared yet</Text>
                </View>
            ) : (
                <FlatList
                    data={media}
                    renderItem={renderItem}
                    keyExtractor={(item) => item._id}
                    numColumns={COLUMN_COUNT}
                    contentContainerStyle={styles.list}
                    columnWrapperStyle={{ gap: SPACING }}
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
        paddingHorizontal: 16,
        paddingBottom: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)',
    },
    backButton: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    list: {
        padding: 0,
    },
    gridItem: {
        width: ITEM_SIZE,
        height: ITEM_SIZE,
        marginBottom: SPACING,
        backgroundColor: '#f0f0f0',
    },
    image: {
        width: '100%',
        height: '100%',
    },
    videoIcon: {
        position: 'absolute',
        top: 6,
        right: 6,
        backgroundColor: 'rgba(0,0,0,0.4)',
        borderRadius: 12,
        width: 24,
        height: 24,
        alignItems: 'center',
        justifyContent: 'center',
    }
});
