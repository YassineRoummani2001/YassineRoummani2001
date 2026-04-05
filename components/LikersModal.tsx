import React, { useEffect, useState } from 'react';
import { 
    Modal, 
    View, 
    Text, 
    StyleSheet, 
    TouchableOpacity, 
    FlatList, 
    Image, 
    ActivityIndicator,
    TouchableWithoutFeedback,
    Platform,
    Dimensions
} from 'react-native';
import { BlurView } from 'expo-blur';
import { X } from 'lucide-react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeContext } from '@/context/ThemeContext';
import { API_BASE_URL } from '@/constants/Config';
import { useRouter } from 'expo-router';

// Helper to construct valid URIs
const getValidUri = (uri?: string) => {
    if (!uri) return '';
    if (uri.startsWith('data:') || uri.startsWith('file:')) return uri;
    if (uri.startsWith('http') && uri.includes('/uploads/')) {
        const parts = uri.split('/uploads/');
        return `${API_BASE_URL}/uploads/${parts[1]}`;
    }
    if (uri.startsWith('http')) return uri;
    if (uri.startsWith('/uploads/')) return `${API_BASE_URL}${uri}`;
    return `${API_BASE_URL}${uri.startsWith('/') ? '' : '/'}${uri}`;
};

interface LikersModalProps {
    visible: boolean;
    onClose: () => void;
    postId: string;
    token?: string;
}

export default function LikersModal({ visible, onClose, postId, token }: LikersModalProps) {
    const { colors, isDark } = useThemeContext();
    const router = useRouter();
    const [likers, setLikers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const { width: windowWidth } = Dimensions.get('window');
    const isDesktop = Platform.OS === 'web' && windowWidth > 900;

    useEffect(() => {
        if (visible && postId) {
            fetchLikers();
        }
    }, [visible, postId]);

    const fetchLikers = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(`${API_BASE_URL}/api/posts/${postId}/likers`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            });
            if (!response.ok) throw new Error('Failed to fetch likers');
            const data = await response.json();
            setLikers(data);
        } catch (err: any) {
            setError(err.message || 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    const renderLiker = ({ item }: { item: any }) => (
        <TouchableOpacity 
            style={styles.likerRow}
            onPress={() => {
                onClose();
                router.push(`/user/${item._id || item.id}`);
            }}
        >
            <Image 
                source={{ uri: getValidUri(item.avatar) || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.name || 'U')}&background=random` }} 
                style={styles.avatar} 
            />
            <View style={styles.likerInfo}>
                <Text style={[styles.name, { color: colors.text }]}>{item.name || item.username}</Text>
                {item.handle && <Text style={[styles.handle, { color: colors.textSecondary }]}>@{item.handle}</Text>}
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
        </TouchableOpacity>
    );

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <TouchableWithoutFeedback onPress={onClose}>
                <View style={[styles.overlay, isDesktop && styles.overlayDesktop]}>
                    <TouchableWithoutFeedback>
                        <View style={[
                            styles.content, 
                            { backgroundColor: isDark ? '#1a1a1a' : '#fff' },
                            isDesktop && styles.contentDesktop
                        ]}>
                            {/* Header */}
                            <View style={[styles.header, { borderBottomColor: isDark ? '#333' : '#eee' }]}>
                                <Text style={[styles.headerTitle, { color: colors.text }]}>Likes</Text>
                                <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                                    <X size={24} color={colors.text} />
                                </TouchableOpacity>
                            </View>

                            {/* List */}
                            {loading ? (
                                <View style={styles.center}>
                                    <ActivityIndicator size="small" color={colors.primary} />
                                </View>
                            ) : error ? (
                                <View style={styles.center}>
                                    <Text style={{ color: '#ff3b30' }}>{error}</Text>
                                    <TouchableOpacity onPress={fetchLikers} style={styles.retryBtn}>
                                        <Text style={{ color: colors.primary }}>Retry</Text>
                                    </TouchableOpacity>
                                </View>
                            ) : likers.length === 0 ? (
                                <View style={styles.center}>
                                    <Text style={{ color: colors.textSecondary }}>No likes yet</Text>
                                </View>
                            ) : (
                                <FlatList
                                    data={likers}
                                    keyExtractor={(item, index) => item._id || index.toString()}
                                    renderItem={renderLiker}
                                    contentContainerStyle={styles.listContent}
                                    showsVerticalScrollIndicator={false}
                                />
                            )}
                        </View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    overlayDesktop: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        width: '100%',
        height: '60%',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingBottom: 20,
    },
    contentDesktop: {
        width: 400,
        height: 500,
        borderRadius: 20,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderBottomWidth: 1,
        position: 'relative',
    },
    headerTitle: {
        fontSize: 17,
        fontWeight: '700',
    },
    closeBtn: {
        position: 'absolute',
        right: 16,
        padding: 4,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    listContent: {
        paddingVertical: 8,
    },
    likerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#eee',
    },
    likerInfo: {
        flex: 1,
        marginLeft: 12,
    },
    name: {
        fontSize: 15,
        fontWeight: '600',
    },
    handle: {
        fontSize: 13,
        marginTop: 1,
    },
    retryBtn: {
        marginTop: 12,
        padding: 8,
    }
});
