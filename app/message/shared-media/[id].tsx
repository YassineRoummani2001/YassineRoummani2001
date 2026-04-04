import { API_BASE_URL } from '@/constants/Config';
import { useThemeContext } from '@/context/ThemeContext';
import { useUser } from '@/context/UserContext';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Play } from 'lucide-react-native';
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
    useWindowDimensions,
    View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const getCorrectUrl = (url: string) => {
    if (!url) return '';
    try {
        if (url.startsWith('/uploads/')) {
            const encodedPath = url.split('/').map(part => encodeURIComponent(part)).join('/');
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
    const { user } = useUser() as any;
    const { colors, isDark } = useThemeContext();
    const insets = useSafeAreaInsets();
    const { width } = useWindowDimensions();

    const isDesktop = width > 768;
    const COLUMN_COUNT = isDesktop ? 5 : 3;
    const SPACING = 2;
    const EFFECTIVE_WIDTH = isDesktop ? Math.min(width - 280 - 350 - 120, 850) : width;
    const ITEM_SIZE = (EFFECTIVE_WIDTH - (COLUMN_COUNT - 1) * SPACING) / COLUMN_COUNT;

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
        let postId = item.postId?._id || item.postId;

        if (item.type === 'image') {
            uri = getCorrectUrl(item.content);
        } else if (item.type === 'video') {
            uri = getCorrectUrl(item.content);
        } else if ((item.type === 'reel' || item.type === 'post') && item.postId) {
            uri = getCorrectUrl(item.postId.videoUri || item.postId.uri);
            type = item.postId.videoUri ? 'video' : 'image';
        }

        if (uri) {
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
            thumbnailUri = getCorrectUrl(item.content);
        } else if ((item.type === 'reel' || item.type === 'post') && item.postId) {
            thumbnailUri = getCorrectUrl(item.postId.thumbnail || item.postId.uri);
        }

        if (!thumbnailUri) return null;

        return (
            <TouchableOpacity
                style={[styles.gridItem, { width: ITEM_SIZE, height: ITEM_SIZE }]}
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
                        <Play size={14} color="#fff" fill="#fff" />
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <Stack.Screen options={{ headerShown: false }} />
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

            {/* Header */}
            <View style={[
                styles.header, 
                { 
                    paddingTop: isDesktop ? 12 : insets.top + 10,
                    backgroundColor: isDark ? '#000' : '#FFF',
                    borderBottomColor: colors.border
                }
            ]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={26} color={colors.text} />
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
                    key={`grid-${COLUMN_COUNT}`} // Force re-render on column change
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
        zIndex: 10,
    },
    backButton: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 17,
        fontWeight: '700',
        letterSpacing: -0.3,
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
        marginBottom: 2,
        backgroundColor: '#1a1a1a',
        overflow: 'hidden',
    },
    image: {
        width: '100%',
        height: '100%',
    },
    videoIcon: {
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderRadius: 12,
        width: 24,
        height: 24,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    }
});
