import { API_BASE_URL } from '@/constants/Config';
import { useUser } from '@/context/AuthContext';
import { useThemeContext } from '@/context/ThemeContext';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Edit2, Heart, MapPin, Share2, Trash2, User as UserIcon } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, FlatList, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

export default function MarketItemDetailScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams();
    const { colors, isDark } = useThemeContext();
    const { user } = (useUser() || {}) as any;
    const insets = useSafeAreaInsets();

    const [item, setItem] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isSaved, setIsSaved] = useState(false);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);

    const getCorrectUrl = (url: string) => {
        if (!url || typeof url !== 'string') return 'https://via.placeholder.com/400';
        if (url.startsWith('blob:')) return 'https://via.placeholder.com/400';

        // Force use of current API_BASE_URL for any internal uploads
        if (url.includes('/uploads/')) {
            const uploadIndex = url.indexOf('/uploads/');
            return `${API_BASE_URL}${url.substring(uploadIndex)}`;
        }

        if (url.startsWith('data:')) return url;
        if (url.startsWith('http')) return url;
        return `${API_BASE_URL}/uploads/${url}`;
    };

    useEffect(() => {
        fetchItemDetails();
    }, [id]);

    const fetchItemDetails = async () => {
        try {
            setLoading(true);
            // console.log('Fetching item details for ID:', id);
            const res = await fetch(`${API_BASE_URL}/api/marketplace/${id}`);

            // console.log('Response status:', res.status);

            if (res.ok) {
                const data = await res.json();
                // console.log('Item data:', data);
                setItem(data);
                setIsSaved(data.savedBy?.includes(user?._id));
            } else {
                console.error('Failed to fetch item:', res.status);
                const errorData = await res.text();
                console.error('Error response:', errorData);
            }
        } catch (error) {
            console.error('Error fetching item details:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!user) return;

        try {
            const res = await fetch(`${API_BASE_URL}/api/marketplace/${id}/save`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${user.token}`
                }
            });

            if (res.ok) {
                const data = await res.json();
                setIsSaved(data.saved);
            }
        } catch (error) {
            console.error('Error saving item:', error);
        }
    };

    const handleContactSeller = () => {
        // Navigate to chat with seller and pass product info
        if (item?.user?._id) {
            const productInfo = encodeURIComponent(JSON.stringify({
                id: item._id,
                title: item.title,
                price: item.price,
                currency: item.currency,
                image: getCorrectUrl(item.images?.[0]),
                type: 'marketplace'
            }));
            router.push(`/message/${item.user._id}?product=${productInfo}` as any);
        }
    };

    const handleDelete = async () => {
        Alert.alert(
            "Delete Listing",
            "Are you sure you want to delete this listing? This action cannot be undone.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            setLoading(true);
                            await fetch(`${API_BASE_URL}/api/marketplace/${item._id}`, {
                                method: 'DELETE',
                                headers: {
                                    'Authorization': `Bearer ${user?.token}`
                                }
                            });
                            // Go back or to selling dashboard
                            if (router.canGoBack()) {
                                router.back();
                            } else {
                                router.replace('/marketplace/selling');
                            }
                        } catch (error) {
                            console.error('Error deleting item:', error);
                        } finally {
                            setLoading(false);
                        }
                    }
                }
            ]
        );
    };

    const isOwner = user?._id === item?.user?._id;

    if (loading) {
        return (
            <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    if (!item) {
        return (
            <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
                <Text style={{ color: colors.text }}>Item not found</Text>
            </View>
        );
    }

    return (
        <>
            <Stack.Screen options={{ headerShown: false }} />
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                <ScrollView showsVerticalScrollIndicator={false}>
                    {/* Image Gallery */}
                    <View style={styles.imageContainer}>
                        <FlatList
                            data={item.images}
                            horizontal
                            pagingEnabled
                            showsHorizontalScrollIndicator={false}
                            keyExtractor={(_, index) => index.toString()}
                            onScroll={(e) => {
                                const x = e.nativeEvent.contentOffset.x;
                                setCurrentImageIndex(Math.round(x / width));
                            }}
                            scrollEventThrottle={16}
                            renderItem={({ item: img }) => (
                                <View style={{ width: width, height: '100%' }}>
                                    <Image
                                        source={{ uri: getCorrectUrl(img) }}
                                        style={styles.mainImage}
                                        resizeMode="cover"
                                    />
                                </View>
                            )}
                        />

                        {/* Header Overlay */}
                        <View style={[styles.headerOverlay, { paddingTop: insets.top + 10 }]}>
                            <TouchableOpacity
                                style={styles.backButton}
                                onPress={() => router.back()}
                            >
                                <ArrowLeft size={24} color="#fff" />
                            </TouchableOpacity>

                            <View style={styles.headerActions}>
                                <TouchableOpacity style={styles.iconButton}>
                                    <Share2 size={22} color="#fff" />
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.iconButton} onPress={handleSave}>
                                    <Heart
                                        size={22}
                                        color={isSaved ? "#FF3B30" : "#fff"}
                                        fill={isSaved ? "#FF3B30" : "transparent"}
                                    />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Image Indicators */}
                        {item.images?.length > 1 && (
                            <View style={styles.imageIndicators}>
                                {item.images.map((_: any, index: number) => (
                                    <View
                                        key={index}
                                        style={[
                                            styles.indicator,
                                            index === currentImageIndex && styles.activeIndicator
                                        ]}
                                    />
                                ))}
                            </View>
                        )}
                    </View>

                    {/* Content */}
                    <View style={[styles.content, { backgroundColor: colors.background }]}>
                        {/* Price */}
                        <Text style={[styles.price, { color: colors.primary }]}>
                            {item.price} {item.currency}
                        </Text>

                        {/* Title */}
                        <Text style={[styles.title, { color: colors.text }]}>
                            {item.title}
                        </Text>

                        {/* Category & Condition */}
                        <View style={styles.badges}>
                            <View style={[styles.badge, { backgroundColor: isDark ? '#2C2C2E' : '#F3F4F6' }]}>
                                <Text style={[styles.badgeText, { color: colors.text }]}>{item.category}</Text>
                            </View>
                            <View style={[styles.badge, { backgroundColor: isDark ? '#2C2C2E' : '#F3F4F6' }]}>
                                <Text style={[styles.badgeText, { color: colors.text }]}>{item.condition}</Text>
                            </View>
                        </View>

                        {/* Location */}
                        <View style={styles.locationContainer}>
                            <MapPin size={16} color={colors.textSecondary} />
                            <Text style={[styles.locationText, { color: colors.textSecondary }]}>
                                {item.location?.city || 'Location not specified'}
                            </Text>
                            <Text style={[styles.viewsText, { color: colors.textSecondary }]}>
                                · {item.views || 0} views
                            </Text>
                        </View>

                        {/* Divider */}
                        <View style={[styles.divider, { backgroundColor: colors.border }]} />

                        {/* Description */}
                        <View style={styles.section}>
                            <Text style={[styles.sectionTitle, { color: colors.text }]}>Description</Text>
                            <Text style={[styles.description, { color: colors.textSecondary }]}>
                                {item.description}
                            </Text>
                        </View>

                        {/* Divider */}
                        <View style={[styles.divider, { backgroundColor: colors.border }]} />

                        {/* Seller Info */}
                        <View style={styles.section}>
                            <Text style={[styles.sectionTitle, { color: colors.text }]}>Seller</Text>
                            <TouchableOpacity
                                style={styles.sellerInfo}
                                onPress={() => router.push(`/user/${item.user?._id}` as any)}
                            >
                                <Image
                                    source={{ uri: getCorrectUrl(item.user?.avatar || 'https://cdn-icons-png.flaticon.com/512/149/149071.png') }}
                                    style={styles.sellerAvatar}
                                />
                                <View style={styles.sellerDetails}>
                                    <Text style={[styles.sellerName, { color: colors.text }]}>
                                        {item.user?.name || 'Unknown'}
                                    </Text>
                                    <Text style={[styles.sellerHandle, { color: colors.textSecondary }]}>
                                        @{item.user?.handle || 'user'}
                                    </Text>
                                </View>
                                <View style={[styles.viewProfileButton, { borderColor: colors.primary }]}>
                                    <UserIcon size={16} color={colors.primary} />
                                </View>
                            </TouchableOpacity>
                        </View>

                        {/* Bottom Spacing */}
                        <View style={{ height: 100 }} />
                    </View>
                </ScrollView>

                {/* Bottom Action Bar */}
                <View style={[styles.bottomBar, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
                    {isOwner ? (
                        <View style={{ flexDirection: 'row', gap: 12 }}>
                            <TouchableOpacity
                                style={[styles.contactButton, { backgroundColor: '#EF4444', flex: 1, flexDirection: 'row', gap: 8 }]}
                                onPress={handleDelete}
                            >
                                <Trash2 size={20} color="white" />
                                <Text style={styles.contactButtonText}>Delete</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.contactButton, { backgroundColor: colors.primary, flex: 1, flexDirection: 'row', gap: 8 }]}
                                onPress={() => router.push({ pathname: '/marketplace/create', params: { id: item._id } } as any)}
                            >
                                <Edit2 size={20} color="white" />
                                <Text style={styles.contactButtonText}>Edit</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <TouchableOpacity
                            style={[styles.contactButton, { backgroundColor: colors.primary }]}
                            onPress={handleContactSeller}
                        >
                            <Text style={styles.contactButtonText}>Contact Seller</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    imageContainer: {
        width: width,
        height: width * 1.2,
        position: 'relative',
    },
    mainImage: {
        width: '100%',
        height: '100%',
    },
    headerOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(0,0,0,0.5)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerActions: {
        flexDirection: 'row',
        gap: 12,
    },
    iconButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(0,0,0,0.5)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    imageIndicators: {
        position: 'absolute',
        bottom: 16,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 6,
    },
    indicator: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: 'rgba(255,255,255,0.5)',
    },
    activeIndicator: {
        backgroundColor: '#fff',
        width: 20,
    },
    content: {
        padding: 20,
    },
    price: {
        fontSize: 28,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    title: {
        fontSize: 22,
        fontWeight: '600',
        marginBottom: 12,
    },
    badges: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 12,
    },
    badge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
    badgeText: {
        fontSize: 13,
        fontWeight: '600',
    },
    locationContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 20,
    },
    locationText: {
        fontSize: 14,
    },
    viewsText: {
        fontSize: 14,
    },
    divider: {
        height: 1,
        marginVertical: 20,
    },
    section: {
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 12,
    },
    description: {
        fontSize: 15,
        lineHeight: 22,
    },
    sellerInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    sellerAvatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
    },
    sellerDetails: {
        flex: 1,
    },
    sellerName: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 2,
    },
    sellerHandle: {
        fontSize: 14,
    },
    viewProfileButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        borderWidth: 1.5,
        alignItems: 'center',
        justifyContent: 'center',
    },
    bottomBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 16,
        borderTopWidth: 1,
    },
    contactButton: {
        height: 50,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    contactButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
