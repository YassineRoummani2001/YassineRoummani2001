import { API_BASE_URL } from '@/constants/Config';
import { useUser } from '@/context/AuthContext';
import { useThemeContext } from '@/context/ThemeContext';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Edit2, Heart, MapPin, Share2, Trash2, User as UserIcon, CheckCircle2 } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Dimensions, FlatList, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import VibeConfirmModal from '@/components/VibeConfirmModal';
import { useWindowDimensions } from 'react-native';

export default function MarketItemDetailScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams();
    const { colors, isDark } = useThemeContext();
    const { user } = (useUser() || {}) as any;
    const insets = useSafeAreaInsets();
    const { width, height } = useWindowDimensions();
    const isDesktop = Platform.OS === 'web' && width > 768;
    const styles = useMemo(() => createStyles(colors, insets, isDark, width, height, isDesktop), [colors, insets, isDark, width, height, isDesktop]);

    const [item, setItem] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isSaved, setIsSaved] = useState(false);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [isDeleteModalVisible, setDeleteModalVisible] = useState(false);
    const [galleryWidth, setGalleryWidth] = useState(0);

    const getCorrectUrl = (uri: string) => {
        if (!uri || typeof uri !== 'string') return 'https://via.placeholder.com/600';
        
        // Handle common data URI/File formats
        if (uri.startsWith('blob:') || uri.startsWith('data:') || uri.startsWith('file:')) return uri;
        
        // Normalize the uri: strip leading/trailing slashes
        let cleanUri = uri.trim();
        
        // If it's already an absolute URL but to a wrong port/domain, we fix it
        if (cleanUri.startsWith('http')) {
            // If it's already pointing to an uploads folder on some other host (e.g. android emulator IP), translate it
            if (cleanUri.includes('/uploads/')) {
                const parts = cleanUri.split('/uploads/');
                return `${API_BASE_URL}/uploads/${parts[1]}`;
            }
            return cleanUri;
        }

        // Ensure it starts with /uploads/ or handled internally
        if (cleanUri.includes('uploads/')) {
            const parts = cleanUri.split('uploads/');
            return `${API_BASE_URL}/uploads/${parts[1]}`;
        }
        
        // Default: append to base URL
        return `${API_BASE_URL}/${cleanUri.startsWith('/') ? cleanUri.slice(1) : cleanUri}`;
    };

    useEffect(() => {
        if (id) fetchItemDetails();
    }, [id]);

    const fetchItemDetails = async () => {
        try {
            setLoading(true);
            const res = await fetch(`${API_BASE_URL}/api/marketplace/${id}`);
            if (res.ok) {
                const data = await res.json();
                setItem(data);
                setIsSaved(data.savedBy?.includes(user?._id));
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
                headers: { 'Authorization': `Bearer ${user.token}` }
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
        if (item?.user?._id) {
            const productInfo = encodeURIComponent(JSON.stringify({
                id: item._id, title: item.title, price: item.price, currency: item.currency,
                image: getCorrectUrl(item.images?.[0] || item.image), type: 'marketplace'
            }));
            router.push(`/message/${item.user._id}?product=${productInfo}` as any);
        }
    };

    const handleDelete = () => {
        setDeleteModalVisible(true);
    };

    const confirmDelete = async () => {
        try {
            setLoading(true);
            await fetch(`${API_BASE_URL}/api/marketplace/${item._id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${user?.token}` }
            });
            router.back();
        } catch (error) {
            console.error('Error deleting item:', error);
        } finally {
            setLoading(false);
        }
    };

    const isOwner = user?._id === item?.user?._id;

    if (loading) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    if (!item) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <Text style={{ color: colors.text }}>Item not found</Text>
            </View>
        );
    }

    const galleryItems = item.images && item.images.length > 0 ? item.images : (item.image ? [item.image] : []);

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />
            
            {isDesktop ? (
                <View style={styles.desktopWrapper}>
                    {/* Premium Swiper Gallery */}
                    <View style={styles.galleryColumn} onLayout={(e) => setGalleryWidth(e.nativeEvent.layout.width)}>
                        <FlatList
                            data={galleryItems}
                            horizontal
                            pagingEnabled
                            showsHorizontalScrollIndicator={false}
                            keyExtractor={(_, index) => index.toString()}
                            onScroll={(e) => {
                                if (galleryWidth > 0) {
                                    setCurrentImageIndex(Math.round(e.nativeEvent.contentOffset.x / galleryWidth));
                                }
                            }}
                            scrollEventThrottle={16}
                            renderItem={({ item: img }) => (
                                <View style={{ width: galleryWidth, height: height, backgroundColor: isDark ? '#080808' : '#f5f5f5', justifyContent: 'center', alignItems: 'center' }}>
                                    <Image
                                        source={{ uri: getCorrectUrl(img) }}
                                        style={{ width: '100%', height: '100%' }}
                                        resizeMode="contain"
                                    />
                                </View>
                            )}
                        />
                        {/* Indicators overlay */}
                        <View style={styles.galleryIndicators}>
                            {galleryItems.length > 1 && galleryItems.map((_: any, i: number) => (
                                <View key={i} style={[styles.dot, i === currentImageIndex && styles.activeDot]} />
                            ))}
                        </View>
                        {/* Floating Navigation Controls */}
                        <TouchableOpacity style={styles.desktopBackBtn} onPress={() => router.push('/(tabs)/marketplace' as any)}>
                            <ArrowLeft size={24} color="#fff" />
                        </TouchableOpacity>
                    </View>

                    {/* Sophisticated Right Sidebar */}
                    <View style={styles.detailsColumn}>
                        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                            <View style={styles.priceRow}>
                                <Text style={[styles.priceTag, { color: colors.primary }]}>{item.price} {item.currency}</Text>
                                <TouchableOpacity onPress={handleSave} style={styles.saveBtn}>
                                    <Heart size={24} color={isSaved ? "#FF3B30" : colors.text} fill={isSaved ? "#FF3B30" : "transparent"} />
                                </TouchableOpacity>
                            </View>

                            <Text style={[styles.itemTitle, { color: colors.text }]}>{item.title}</Text>
                            
                            <View style={styles.metaRow}>
                                <View style={[styles.metaBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#f0f0f0' }]}>
                                    <Text style={[styles.metaText, { color: colors.textSecondary }]}>{item.condition}</Text>
                                </View>
                                <View style={[styles.metaBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#f0f0f0' }]}>
                                    <Text style={[styles.metaText, { color: colors.textSecondary }]}>{item.category}</Text>
                                </View>
                            </View>

                            <View style={styles.locationBox}>
                                <MapPin size={18} color={colors.primary} />
                                <Text style={[styles.locationLabel, { color: colors.textSecondary }]}>{item.location?.city || 'Worldwide'}</Text>
                            </View>

                            <View style={[styles.divider, { backgroundColor: colors.border }]} />

                            <View style={styles.sectionHeader}>
                                <Text style={[styles.sectionTitle, { color: colors.text }]}>About this item</Text>
                            </View>
                            <Text style={[styles.descriptionText, { color: colors.textSecondary }]}>{item.description}</Text>

                            <View style={[styles.divider, { backgroundColor: colors.border }]} />

                            <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 16 }]}>Certified Seller</Text>
                            <TouchableOpacity 
                                style={[styles.sellerCard, { borderColor: colors.border }]} 
                                onPress={() => router.push(`/user/${item.user?._id}` as any)}
                            >
                                <Image source={{ uri: getCorrectUrl(item.user?.avatar || '') }} style={styles.sellerAvatar} />
                                <View style={{ flex: 1 }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                        <Text style={[styles.sellerName, { color: colors.text }]}>{item.user?.name}</Text>
                                        <CheckCircle2 size={14} color={colors.primary} />
                                    </View>
                                    <Text style={[styles.sellerHandle, { color: colors.textSecondary }]}>@{item.user?.handle}</Text>
                                </View>
                                <ArrowLeft size={18} color={colors.textSecondary} style={{ transform: [{ rotate: '180deg' }] }} />
                            </TouchableOpacity>

                            <View style={{ marginTop: 40 }}>
                                {isOwner ? (
                                    <View style={styles.ownerActions}>
                                        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#EF4444' }]} onPress={handleDelete}>
                                            <Trash2 size={20} color="white" />
                                            <Text style={styles.btnText}>Remove Listing</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.primary }]} onPress={() => router.push({ pathname: '/marketplace/create', params: { id: item._id } } as any)}>
                                            <Edit2 size={20} color="white" />
                                            <Text style={styles.btnText}>Edit Listing</Text>
                                        </TouchableOpacity>
                                    </View>
                                ) : (
                                    <TouchableOpacity style={[styles.mainCta, { backgroundColor: colors.primary }]} onPress={handleContactSeller}>
                                        <Text style={styles.mainCtaText}>Message Seller</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        </ScrollView>
                    </View>
                </View>
            ) : (
                <ScrollView showsVerticalScrollIndicator={false}>
                    {/* Mobile Design */}
                    <View style={styles.mobileGallery}>
                        <FlatList
                            data={galleryItems}
                            horizontal
                            pagingEnabled
                            showsHorizontalScrollIndicator={false}
                            keyExtractor={(_, index) => index.toString()}
                            onScroll={(e) => setCurrentImageIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
                            renderItem={({ item: img }) => (
                                <Image source={{ uri: getCorrectUrl(img) }} style={{ width, height: width * 1.25 }} resizeMode="cover" />
                            )}
                        />
                        <View style={styles.mobileHeader}>
                            <TouchableOpacity style={styles.glassBtn} onPress={() => router.push('/(tabs)/marketplace' as any)}><ArrowLeft size={24} color="#fff" /></TouchableOpacity>
                            <View style={{ flexDirection: 'row', gap: 12 }}>
                                <TouchableOpacity style={styles.glassBtn}><Share2 size={20} color="#fff" /></TouchableOpacity>
                                <TouchableOpacity style={styles.glassBtn} onPress={handleSave}><Heart size={20} color={isSaved ? "#FF3B30" : "#fff"} fill={isSaved ? "#FF3B30" : "transparent"} /></TouchableOpacity>
                            </View>
                        </View>
                    </View>
                    <View style={styles.mobileContent}>
                        <Text style={[styles.priceTag, { color: colors.primary }]}>{item.price} {item.currency}</Text>
                        <Text style={[styles.itemTitle, { color: colors.text }]}>{item.title}</Text>
                        <View style={styles.metaRow}>
                            <View style={[styles.metaBadge, { backgroundColor: isDark ? '#222' : '#f0f0f0' }]}><Text style={styles.metaText}>{item.condition}</Text></View>
                            <View style={[styles.metaBadge, { backgroundColor: isDark ? '#222' : '#f0f0f0' }]}><Text style={styles.metaText}>{item.category}</Text></View>
                        </View>
                        <View style={[styles.divider, { backgroundColor: colors.border }]} />
                        
                        <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 16 }]}>Certified Seller</Text>
                        <TouchableOpacity 
                                style={[styles.sellerCard, { borderColor: colors.border }]} 
                                onPress={() => router.push(`/user/${item.user?._id}` as any)}
                        >
                                <Image source={{ uri: getCorrectUrl(item.user?.avatar || '') }} style={styles.sellerAvatar} />
                                <View style={{ flex: 1 }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                        <Text style={[styles.sellerName, { color: colors.text }]}>{item.user?.name}</Text>
                                        <CheckCircle2 size={14} color={colors.primary} />
                                    </View>
                                    <Text style={[styles.sellerHandle, { color: colors.textSecondary }]}>@{item.user?.handle}</Text>
                                </View>
                                <ArrowLeft size={18} color={colors.textSecondary} style={{ transform: [{ rotate: '180deg' }] }} />
                        </TouchableOpacity>

                        <View style={[styles.divider, { backgroundColor: colors.border }]} />

                        <View style={styles.locationBox}>
                            <MapPin size={18} color={colors.primary} />
                            <Text style={[styles.locationLabel, { color: colors.textSecondary }]}>{item.location?.city || 'Worldwide'}</Text>
                        </View>

                        <View style={[styles.divider, { backgroundColor: colors.border }]} />

                        <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 12 }]}>About this item</Text>
                        <Text style={[styles.descriptionText, { color: colors.textSecondary }]}>{item.description}</Text>

                        <View style={{ height: 120 }} />
                    </View>
                    {!isOwner && (
                        <View style={[styles.mobileFooter, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
                             <TouchableOpacity style={[styles.mainCta, { backgroundColor: colors.primary }]} onPress={handleContactSeller}>
                                <Text style={styles.mainCtaText}>Contact Seller</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </ScrollView>
            )}

            <VibeConfirmModal
                visible={isDeleteModalVisible}
                onClose={() => setDeleteModalVisible(false)}
                onConfirm={confirmDelete}
                title="Delete Listing"
                message="Are you sure you want to delete this listing? This action cannot be undone."
                confirmText="Delete"
                isDestructive
                icon={<Trash2 size={28} color="#FF3B30" />}
            />
        </View>
    );
}

function createStyles(colors: any, insets: any, isDark: boolean, width: number, height: number, isDesktop: boolean) {
    return StyleSheet.create({
        container: { flex: 1, backgroundColor: colors.background },
        desktopWrapper: { flexDirection: 'row', width: '100%', height: '100%' },
        galleryColumn: { 
            flex: 1, 
            height: '100%', 
            position: 'relative',
            backgroundColor: isDark ? '#080808' : '#f5f5f5',
        },
        detailsColumn: { 
            width: 450, 
            height: '100%', 
            borderLeftWidth: 1, 
            borderColor: colors.border 
        },
        scrollContent: { padding: 32 },
        fullImage: { width: '100%', height: '100%' },
        galleryIndicators: { position: 'absolute', bottom: 40, width: '100%', flexDirection: 'row', justifyContent: 'center', gap: 10 },
        dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.3)' },
        activeDot: { backgroundColor: '#fff', width: 24 },
        desktopBackBtn: { position: 'absolute', top: 32, left: 32, width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
        priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
        priceTag: { fontSize: 36, fontWeight: '900', letterSpacing: -1 },
        saveBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', alignItems: 'center', justifyContent: 'center' },
        itemTitle: { fontSize: 24, fontWeight: '800', lineHeight: 32, marginBottom: 16 },
        metaRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
        metaBadge: { 
            paddingHorizontal: 12, 
            paddingVertical: 6, 
            borderRadius: 8,
            backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
        },
        metaText: { 
            fontSize: 13, 
            fontWeight: '700', 
            textTransform: 'uppercase',
            color: colors.textSecondary,
        },
        locationBox: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 32 },
        locationLabel: { fontSize: 15, fontWeight: '500' },
        divider: { height: 1, marginVertical: 32 },
        sectionHeader: { marginBottom: 16 },
        sectionTitle: { fontSize: 18, fontWeight: '900', letterSpacing: 0.5, textTransform: 'uppercase' },
        descriptionText: { fontSize: 16, lineHeight: 26, opacity: 0.8 },
        sellerCard: { 
            flexDirection: 'row', 
            alignItems: 'center', 
            gap: 16, 
            padding: 16, 
            borderRadius: 20, 
            borderWidth: 1,
            backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
        },
        sellerAvatar: { width: 56, height: 56, borderRadius: 28 },
        sellerName: { fontSize: 17, fontWeight: '800' },
        sellerHandle: { fontSize: 14, opacity: 0.6 },
        ownerActions: { flexDirection: 'row', gap: 12 },
        actionBtn: { flex: 1, height: 56, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
        btnText: { color: 'white', fontWeight: '800', fontSize: 15 },
        mainCta: { height: 60, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
        mainCtaText: { color: 'white', fontWeight: '900', fontSize: 17 },
        // Mobile styles
        mobileGallery: { position: 'relative' },
        mobileHeader: { position: 'absolute', top: 50, left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between' },
        glassBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
        mobileContent: { padding: 20 },
        mobileFooter: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, borderTopWidth: 1 }
    });
}
