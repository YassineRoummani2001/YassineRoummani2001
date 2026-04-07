import { SkeletonMarketItem } from '@/components/Skeletons';
import { API_BASE_URL } from '@/constants/Config';
import { useUser } from '@/context/AuthContext';
import { useThemeContext } from '@/context/ThemeContext';
import { Stack, useRouter } from 'expo-router';
import { ArrowLeft, MapPin, Plus, Search, Settings, X } from 'lucide-react-native';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, useWindowDimensions, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const CATEGORIES = ['All', 'Electronics', 'Vehicles', 'Clothing', 'Furniture', 'Beauty', 'Home', 'Sports', 'Toys & Games', 'Books', 'Real Estate', 'Pets', 'Other'];

const MOROCCAN_CITIES = [
    'Casablanca', 'Rabat', 'Fès', 'Tanger', 'Marrakech', 'Salé', 'Agadir', 'Meknès', 'Oujda',
    'Kenitra', 'Tétouan', 'Safi', 'Mohammédia', 'Béni Mellal', 'El Jadida', 'Taza', 'Nador',
    'Settat', 'Larache', 'Ksar El Kebir', 'Khémisset', 'Guelmim', 'Berrechid', 'Fquih Ben Salah',
    'Taourirt', 'Berkane', 'Sidi Slimane', 'Sidi Kacem', 'Khenifra', 'Taroudant', 'Essaouira',
    'Tiznit', 'Ouarzazate', 'Al Hoceima', 'Tan-Tan', 'Errachidia', 'Guercif', 'Oulad Teima',
    'Dakhla', 'El Kelaa des Sraghna', 'Ben Guerir', 'Khouribga', 'Ifrane', 'Azrou', 'Midelt'
].sort();

export default function MarketplaceScreen() {
    const router = useRouter();
    const { colors, isDark } = useThemeContext();
    const { user } = (useUser() || {}) as any;
    const insets = useSafeAreaInsets();
    const { width } = useWindowDimensions();
    const isDesktop = Platform.OS === 'web' && width > 768;
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showLocationModal, setShowLocationModal] = useState(false);
    const [selectedLocation, setSelectedLocation] = useState('Nearby');
    const [locationSearch, setLocationSearch] = useState('');
    const [sortOrder, setSortOrder] = useState('new'); // 'new' | 'old'

    const getCorrectUrl = (uri: string) => {
        if (!uri || typeof uri !== 'string') return 'https://via.placeholder.com/300';
        if (uri.startsWith('blob:') || uri.startsWith('data:') || uri.startsWith('file:')) return uri;

        if (uri.startsWith('http') && uri.includes('/uploads/')) {
            const parts = uri.split('/uploads/');
            return `${API_BASE_URL}/uploads/${parts[1]}`;
        }
        
        if (uri.startsWith('http')) return uri;
        if (uri.startsWith('/uploads/')) return `${API_BASE_URL}${uri}`;
        if (uri.includes('/uploads/')) {
            const parts = uri.split('/uploads/');
            return `${API_BASE_URL}/uploads/${parts[1]}`;
        }

        return `${API_BASE_URL}/uploads/${uri}`;
    };

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            fetchItems();
        }, 500);
        return () => clearTimeout(timeoutId);
    }, [selectedCategory, selectedLocation, searchQuery]);

    const fetchItems = async () => {
        try {
            setLoading(true);
            const category = selectedCategory === 'All' ? '' : selectedCategory;
            const location = selectedLocation === 'Nearby' ? '' : selectedLocation;

            let url = `${API_BASE_URL}/api/marketplace?category=${category}`;
            if (location) url += `&location=${location}`;
            if (searchQuery) url += `&search=${searchQuery}`;

            const res = await fetch(url);
            if (res.ok) {
                const data = await res.json();
                setItems(data);
            }
        } catch (error) {
            console.error('Error fetching marketplace items:', error);
        } finally {
            setLoading(false);
        }
    };

    const renderItem = ({ item }: { item: any }) => (
        <TouchableOpacity
            style={[styles.itemCard, { backgroundColor: isDark ? '#111' : '#fff', borderColor: colors.border }]}
            activeOpacity={0.9}
            onPress={() => router.push(`/marketplace/${item._id}` as any)}
        >
            <View style={styles.imageContainer}>
                <Image 
                    source={{ uri: getCorrectUrl(item.images?.[0] || item.image) }} 
                    style={styles.itemImage}
                    resizeMode="cover"
                />
                <View style={[styles.priceBadge, { backgroundColor: colors.primary }]}>
                    <Text style={styles.priceText}>{item.price} Dh</Text>
                </View>
            </View>
            <View style={styles.itemInfo}>
                <Text style={[styles.itemTitle, { color: colors.text }]} numberOfLines={1}>
                    {item.title}
                </Text>
                <View style={styles.locationRow}>
                    <MapPin size={12} color={colors.textSecondary} />
                    <Text style={[styles.itemLocation, { color: colors.textSecondary }]} numberOfLines={1}>
                        {item.location?.city || 'Location'}
                    </Text>
                </View>
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <Stack.Screen options={{ headerShown: false }} />
            
            <View style={[styles.header, { 
                paddingTop: Platform.OS === 'web' ? 20 : (insets.top || 10),
                borderBottomColor: colors.border,
                backgroundColor: colors.background,
            }]}>
                <View style={styles.topRow}>
                    <Text style={[styles.headerTitle, { color: colors.text }]}>Marketplace</Text>
                    <View style={styles.headerActions}>
                        <TouchableOpacity 
                            style={[styles.actionBtn, { backgroundColor: isDark ? '#222' : '#f0f0f0' }]}
                            onPress={() => router.push('/marketplace/selling' as any)}
                        >
                            <Settings size={20} color={colors.text} />
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={[styles.actionBtn, { backgroundColor: colors.primary }]}
                            onPress={() => router.push('/marketplace/create' as any)}
                        >
                            <Plus size={24} color="white" />
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.searchRow}>
                    <View style={[styles.searchBar, { backgroundColor: isDark ? '#1A1A1A' : '#F2F2F7', flex: 1 }]}>
                        <Search size={18} color={colors.textSecondary} />
                        <TextInput
                            style={[styles.searchInput, { color: colors.text }]}
                            placeholder="Search items, brands..."
                            placeholderTextColor={colors.textSecondary}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                        {searchQuery.length > 0 && (
                            <TouchableOpacity onPress={() => setSearchQuery('')}>
                                <X size={18} color={colors.textSecondary} />
                            </TouchableOpacity>
                        )}
                    </View>

                    <TouchableOpacity 
                        style={[styles.locationBtn, { backgroundColor: isDark ? '#1A1A1A' : '#F2F2F7', width: 110 }]}
                        onPress={() => setShowLocationModal(true)}
                    >
                        <MapPin size={18} color={selectedLocation !== 'Nearby' ? colors.primary : colors.textSecondary} />
                        <Text style={[styles.locationText, { color: selectedLocation !== 'Nearby' ? colors.primary : colors.textSecondary }]} numberOfLines={1}>
                            {selectedLocation === 'Nearby' ? 'City' : selectedLocation}
                        </Text>
                    </TouchableOpacity>
                </View>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesContent}>
                    {CATEGORIES.map((cat) => (
                        <TouchableOpacity
                            key={cat}
                            onPress={() => setSelectedCategory(cat)}
                            style={[
                                styles.categoryChip,
                                selectedCategory === cat 
                                    ? { backgroundColor: colors.primary } 
                                    : { backgroundColor: isDark ? '#1A1A1A' : '#F2F2F7' }
                            ]}
                        >
                            <Text style={[styles.categoryText, selectedCategory === cat ? { color: 'white' } : { color: colors.text }]}>{cat}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {loading ? (
                <FlatList
                    data={[1, 2, 3, 4]}
                    renderItem={() => <SkeletonMarketItem />}
                    keyExtractor={(i) => i.toString()}
                    numColumns={isDesktop ? 4 : 2}
                    columnWrapperStyle={styles.grid}
                />
            ) : (
                <FlatList
                    data={[...items].sort((a, b) => {
                        const d1 = new Date(a.createdAt || 0).getTime();
                        const d2 = new Date(b.createdAt || 0).getTime();
                        return sortOrder === 'new' ? d2 - d1 : d1 - d2;
                    })}
                    renderItem={renderItem}
                    keyExtractor={(item) => item._id}
                    numColumns={isDesktop ? 4 : 2}
                    columnWrapperStyle={styles.grid}
                    showsVerticalScrollIndicator={isDesktop}
                    contentContainerStyle={{ paddingBottom: 100 }}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Text style={{ fontSize: 40 }}>🛍️</Text>
                            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No items found</Text>
                        </View>
                    }
                />
            )}

            {showLocationModal && (
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: colors.text }]}>Select Location</Text>
                            <TouchableOpacity onPress={() => setShowLocationModal(false)}>
                                <X size={24} color={colors.text} />
                            </TouchableOpacity>
                        </View>
                        <View style={[styles.locationSearch, { backgroundColor: isDark ? '#1A1A1A' : '#F2F2F7' }]}>
                            <Search size={20} color={colors.textSecondary} />
                            <TextInput
                                style={[styles.searchInput, { color: colors.text }]}
                                placeholder="Search city..."
                                placeholderTextColor={colors.textSecondary}
                                value={locationSearch}
                                onChangeText={setLocationSearch}
                            />
                        </View>
                        <ScrollView>
                            {['Nearby', ...MOROCCAN_CITIES].filter(c => c.toLowerCase().includes(locationSearch.toLowerCase())).map(city => (
                                <TouchableOpacity key={city} style={styles.cityItem} onPress={() => { setSelectedLocation(city); setShowLocationModal(false); }}>
                                    <MapPin size={20} color={selectedLocation === city ? colors.primary : colors.textSecondary} />
                                    <Text style={[styles.cityName, { color: colors.text }]}>{city}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                </View>
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
        borderBottomWidth: 1,
    },
    topRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: '900',
        letterSpacing: -1,
    },
    headerActions: {
        flexDirection: 'row',
        gap: 10,
    },
    actionBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    searchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 16,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        height: 48,
        borderRadius: 24,
    },
    locationBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        height: 48,
        borderRadius: 24,
        gap: 6,
        maxWidth: 120,
    },
    locationText: {
        fontSize: 14,
        fontWeight: '600',
    },
    searchInput: {
        flex: 1,
        height: '100%',
        marginLeft: 10,
        fontSize: 15,
    },
    categoriesContent: {
        gap: 8,
    },
    categoryChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        marginRight: 8,
    },
    categoryText: {
        fontSize: 14,
        fontWeight: '600',
    },
    grid: {
        padding: 10,
    },
    itemCard: {
        flex: 1,
        margin: 6,
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
    },
    imageContainer: {
        width: '100%',
        aspectRatio: 1,
        position: 'relative',
    },
    itemImage: {
        width: '100%',
        height: '100%',
    },
    priceBadge: {
        position: 'absolute',
        bottom: 8,
        left: 8,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    priceText: {
        color: 'white',
        fontWeight: '800',
        fontSize: 14,
    },
    itemInfo: {
        padding: 12,
        gap: 4,
    },
    itemTitle: {
        fontSize: 15,
        fontWeight: '700',
    },
    locationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    itemLocation: {
        fontSize: 12,
        opacity: 0.7,
    },
    modalOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
        zIndex: 1000,
    },
    modalContent: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        height: '70%',
        paddingTop: 20,
        width: '100%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 16,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '800',
    },
    locationSearch: {
        marginHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        height: 44,
        borderRadius: 12,
        marginBottom: 16,
    },
    cityItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 20,
        borderBottomWidth: 0.5,
        borderBottomColor: 'rgba(0,0,0,0.05)',
    },
    cityName: {
        fontSize: 16,
        marginLeft: 12,
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        height: 400,
    },
    emptyText: {
        fontSize: 16,
        marginTop: 12,
    }
});
