import React, { useEffect, useState } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    FlatList, 
    Image, 
    TouchableOpacity, 
    ActivityIndicator,
    Platform,
    Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeContext } from '@/context/ThemeContext';
import { API_BASE_URL } from '@/constants/Config';
import { useRouter } from 'expo-router';

// Helper to construct valid URIs
const getValidUri = (uri?: string) => {
    if (!uri) return '';
    if (uri.startsWith('http')) return uri;
    return `${API_BASE_URL}${uri.startsWith('/') ? '' : '/'}${uri}`;
};

export default function DiscoverPeople() {
    const { colors, isDark } = useThemeContext();
    const router = useRouter();
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDiscoverUsers();
    }, []);

    const fetchDiscoverUsers = async () => {
        try {
            // Using existing discover-people endpoint or suggestions
            const res = await fetch(`${API_BASE_URL}/api/users/discover?limit=10`);
            if (res.ok) {
                const data = await res.json();
                setUsers(data);
            }
        } catch (error) {
            console.error('Discover fetch error:', error);
        } finally {
            setLoading(false);
        }
    };

    const renderUserCard = ({ item }: { item: any }) => {
        const handle = item.handle || item.username || 'user';
        const displayHandle = handle.startsWith('@') ? handle : `@${handle}`;
        
        return (
            <View style={[styles.card, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF', borderColor: isDark ? '#333' : '#F0F0F0' }]}>
                <TouchableOpacity onPress={() => router.push(`/user/${item._id || item.id}`)}>
                    <Image 
                        source={{ uri: getValidUri(item.avatar) || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.name || 'U')}&background=random` }} 
                        style={styles.avatar} 
                    />
                </TouchableOpacity>
                
                <View style={styles.infoContainer}>
                    <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
                        {item.name || 'Vibe User'}
                    </Text>
                    <Text style={[styles.handle, { color: colors.textSecondary }]} numberOfLines={1}>
                        {displayHandle}
                    </Text>
                </View>
                
                <TouchableOpacity 
                    style={[styles.viewBtn, { backgroundColor: colors.primary }]}
                    onPress={() => router.push(`/user/${item._id || item.id}`)}
                    activeOpacity={0.8}
                >
                    <Text style={styles.viewBtnText}>View</Text>
                </TouchableOpacity>
            </View>
        );
    };

    if (loading && users.length === 0) {
        return (
            <View style={styles.loaderContainer}>
                <ActivityIndicator size="small" color={colors.primary} />
            </View>
        );
    }

    if (users.length === 0) return null;

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Ionicons name="person-outline" size={24} color={colors.text} />
                <Text style={[styles.title, { color: colors.text }]}>Discover People</Text>
            </View>

            <FlatList
                data={users}
                horizontal
                keyExtractor={(item) => item._id || item.id}
                renderItem={renderUserCard}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.listContent}
                snapToInterval={200 + 16} // card width + margin
                decelerationRate="fast"
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingVertical: 24,
        marginVertical: 8,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 20,
        gap: 12,
    },
    title: {
        fontSize: 22,
        fontWeight: '900',
        letterSpacing: -0.5,
    },
    loaderContainer: {
        height: 300,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContent: {
        paddingHorizontal: 16,
        paddingBottom: 8,
    },
    card: {
        width: 200,
        borderRadius: 32,
        borderWidth: 1,
        marginHorizontal: 8,
        padding: 20,
        alignItems: 'center',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.08,
                shadowRadius: 12,
            },
            android: {
                elevation: 3,
            },
            web: {
                boxShadow: '0 8px 24px rgba(0,0,0,0.06)',
            }
        }),
    },
    avatar: {
        width: 110,
        height: 110,
        borderRadius: 55,
        marginBottom: 16,
        backgroundColor: '#f0f0f0',
    },
    infoContainer: {
        alignItems: 'center',
        marginBottom: 20,
        width: '100%',
    },
    name: {
        fontSize: 17,
        fontWeight: '800',
        marginBottom: 4,
        textAlign: 'center',
    },
    handle: {
        fontSize: 14,
        opacity: 0.6,
        textAlign: 'center',
    },
    viewBtn: {
        width: '100%',
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 2,
    },
    viewBtnText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '700',
    }
});
