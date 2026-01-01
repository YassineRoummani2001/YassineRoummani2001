import { API_BASE_URL } from '@/constants/Config';
import { useUser } from '@/context/AuthContext';
import { useThemeContext } from '@/context/ThemeContext';
import { Stack, useRouter } from 'expo-router';
import { ArrowLeft, MapPin, Plus, Search, Settings, X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const CATEGORIES = ['All', 'Electronics', 'Vehicles', 'Clothing', 'Home', 'Sports', 'Other'];

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
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showLocationModal, setShowLocationModal] = useState(false);
    const [selectedLocation, setSelectedLocation] = useState('Nearby');
    const [locationSearch, setLocationSearch] = useState('');

    const getCorrectUrl = (url: string) => {
        if (!url || typeof url !== 'string') return 'https://via.placeholder.com/300';
        if (url.startsWith('blob:')) return 'https://via.placeholder.com/300';

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
        const timeoutId = setTimeout(() => {
            fetchItems();
        }, 500); // Debounce search by 500ms
        return () => clearTimeout(timeoutId);
    }, [selectedCategory, selectedLocation, searchQuery]);

    const fetchItems = async () => {
        try {
            setLoading(true);
            const category = selectedCategory === 'All' ? '' : selectedCategory;
            const location = selectedLocation === 'Nearby' ? '' : selectedLocation;

            let url = `${API_BASE_URL}/api/marketplace?category=${category}`;
            if (location) {
                url += `&location=${location}`;
            }
            if (searchQuery) {
                url += `&search=${searchQuery}`;
            }

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
            style={[styles.itemCard, { backgroundColor: isDark ? '#1C1C1E' : '#F9FAFB', borderColor: isDark ? '#2C2C2E' : 'transparent', borderWidth: isDark ? 1 : 0 }]}
            activeOpacity={0.8}
            onPress={() => router.push(`/marketplace/${item._id}` as any)}
        >
            <Image
                source={{ uri: getCorrectUrl(item.images?.[0]) }}
                style={styles.itemImage}
            />
            <View style={styles.itemInfo}>
                <Text style={[styles.itemTitle, { color: colors.text }]} numberOfLines={1}>
                    {item.title}
                </Text>
                <Text style={[styles.itemPrice, { color: colors.text }]}>
                    {item.price} {item.currency}
                </Text>
                <View style={styles.locationRow}>
                    <MapPin size={12} color={colors.textSecondary} />
                    <Text style={[styles.locationText, { color: colors.textSecondary }]}>
                        {item.location?.city || 'Location'} · {item.views || 0} views
                    </Text>
                </View>
            </View>
        </TouchableOpacity>
    );

    return (
        <>
            <Stack.Screen options={{ headerShown: false }} />
            <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
                {/* Header */}
                <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
                    <View style={styles.headerLeft}>
                        <TouchableOpacity
                            style={[styles.backButton, { backgroundColor: isDark ? '#2C2C2E' : '#F3F4F6' }]}
                            onPress={() => router.back()}
                        >
                            <ArrowLeft size={22} color={colors.text} />
                        </TouchableOpacity>
                        <Text style={[styles.headerTitle, { color: colors.text }]}>Marketplace</Text>
                    </View>
                    <View style={styles.headerActions}>
                        <TouchableOpacity
                            style={[styles.iconButton, { backgroundColor: isDark ? '#2C2C2E' : '#F3F4F6' }]}
                            onPress={() => router.push('/marketplace/selling')}
                        >
                            <Settings size={22} color={colors.text} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Search Bar */}
                <View style={[styles.searchContainer, { backgroundColor: colors.background }]}>
                    <View style={[styles.searchBar, { backgroundColor: isDark ? '#2C2C2E' : '#F3F4F6' }]}>
                        <Search size={20} color={colors.textSecondary} />
                        <TextInput
                            style={[styles.searchInput, { color: colors.text }]}
                            placeholder="Search Marketplace"
                            placeholderTextColor={colors.textSecondary}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                    </View>
                    <TouchableOpacity
                        style={[styles.addButton, { backgroundColor: colors.primary }]}
                        onPress={() => router.push('/marketplace/create' as any)}
                    >
                        <Plus size={24} color="#fff" />
                    </TouchableOpacity>
                </View>

                {/* Categories */}
                <View style={{ backgroundColor: colors.background }}>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={styles.categoriesContainer}
                        contentContainerStyle={styles.categoriesContent}
                    >
                        {CATEGORIES.map((category) => (
                            <TouchableOpacity
                                key={category}
                                style={[
                                    styles.categoryButton,
                                    { backgroundColor: isDark ? '#2C2C2E' : '#F3F4F6' },
                                    selectedCategory === category && styles.categoryButtonActive,
                                    selectedCategory === category && { backgroundColor: colors.primary }
                                ]}
                                onPress={() => setSelectedCategory(category)}
                            >
                                <Text
                                    style={[
                                        styles.categoryText,
                                        { color: selectedCategory === category ? '#fff' : colors.text }
                                    ]}
                                >
                                    {category}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                {/* Section Header */}
                <View style={[styles.sectionHeader, { backgroundColor: colors.background }]}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>
                        {items.length > 0 ? `${items.length} items` : 'No items'}
                    </Text>
                    <TouchableOpacity
                        style={styles.locationBadge}
                        onPress={() => setShowLocationModal(true)}
                    >
                        <MapPin size={14} color={colors.primary} />
                        <Text style={[styles.locationBadgeText, { color: colors.primary }]}>{selectedLocation}</Text>
                    </TouchableOpacity>
                </View>

                {/* Items Grid */}
                {loading ? (
                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                        <ActivityIndicator size="large" color={colors.primary} />
                    </View>
                ) : (
                    <FlatList
                        data={items}
                        renderItem={renderItem}
                        keyExtractor={(item) => item._id}
                        numColumns={2}
                        contentContainerStyle={styles.gridContent}
                        showsVerticalScrollIndicator={false}
                        ListEmptyComponent={
                            <View style={{ padding: 40, alignItems: 'center' }}>
                                <Text style={{ fontSize: 48, marginBottom: 16 }}>🛍️</Text>
                                <Text style={{ fontSize: 18, fontWeight: '600', color: colors.text, marginBottom: 8 }}>No items yet</Text>
                                <Text style={{ fontSize: 14, color: colors.textSecondary, textAlign: 'center' }}>
                                    Be the first to list an item!
                                </Text>
                            </View>
                        }
                    />
                )}

                {/* Location Modal */}
                {showLocationModal && (
                    <View style={styles.modalOverlay}>
                        <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
                            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
                                <TouchableOpacity onPress={() => setShowLocationModal(false)}>
                                    <X size={24} color={colors.text} />
                                </TouchableOpacity>
                                <Text style={[styles.modalTitle, { color: colors.text }]}>Choose a location</Text>
                                <View style={{ width: 24 }} />
                            </View>



                            <View style={styles.modalSearchContainer}>
                                <View style={[styles.modalSearchBar, { backgroundColor: isDark ? '#2C2C2E' : '#F3F4F6' }]}>
                                    <Search size={20} color={colors.textSecondary} />
                                    <TextInput
                                        style={[styles.modalSearchInput, { color: colors.text }]}
                                        placeholder="Search city..."
                                        placeholderTextColor={colors.textSecondary}
                                        value={locationSearch}
                                        onChangeText={setLocationSearch}
                                    />
                                </View>
                            </View>

                            <ScrollView style={styles.modalBody}>
                                <Text style={[styles.modalSectionTitle, { color: colors.text }]}>Cities</Text>

                                {['Nearby', ...MOROCCAN_CITIES].filter(city =>
                                    city.toLowerCase().includes(locationSearch.toLowerCase())
                                ).map((city) => (
                                    <TouchableOpacity
                                        key={city}
                                        style={[styles.cityOption, { borderBottomColor: colors.border }]}
                                        onPress={() => {
                                            setSelectedLocation(city);
                                            setShowLocationModal(false);
                                            setLocationSearch('');
                                        }}
                                    >
                                        <MapPin size={20} color={colors.textSecondary} />
                                        <Text style={[styles.cityText, { color: colors.text }]}>{city}</Text>
                                        {selectedLocation === city && (
                                            <View style={[styles.checkmark, { backgroundColor: colors.primary }]}>
                                                <Text style={{ color: '#fff', fontSize: 12 }}>✓</Text>
                                            </View>
                                        )}
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>
                    </View>
                )}
            </View>
        </>
    );
}


const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
    },
    headerActions: {
        flexDirection: 'row',
        gap: 8,
    },
    iconButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    searchContainer: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingVertical: 12,
        gap: 8,
    },
    searchBar: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 12,
        gap: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
    },
    addButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    categoriesContainer: {
        paddingVertical: 12,
    },
    categoriesContent: {
        paddingHorizontal: 16,
        gap: 8,
    },
    categoryButton: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 20,
        marginRight: 8,
    },
    categoryButtonActive: {
        // backgroundColor will be set dynamically
    },
    categoryText: {
        fontSize: 14,
        fontWeight: '600',
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
    },
    locationBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
    },
    locationBadgeText: {
        fontSize: 13,
        fontWeight: '600',
    },
    gridContent: {
        paddingHorizontal: 8,
        paddingBottom: 16,
    },
    itemCard: {
        flex: 1,
        margin: 8,
        borderRadius: 12,
        overflow: 'hidden',
    },
    itemImage: {
        width: '100%',
        height: 180,
        backgroundColor: '#E5E7EB',
    },
    itemInfo: {
        padding: 12,
    },
    itemTitle: {
        fontSize: 15,
        fontWeight: '600',
        marginBottom: 4,
    },
    itemPrice: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 8,
    },
    locationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    locationText: {
        fontSize: 12,
    },
    modalOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: '80%',
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '700',
    },
    modalBody: {
        paddingHorizontal: 20,
    },
    modalSearchContainer: {
        padding: 20,
        paddingBottom: 0,
    },
    modalSearchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 12,
        gap: 12,
    },
    modalSearchInput: {
        flex: 1,
        fontSize: 16,
    },
    modalSectionTitle: {
        fontSize: 14,
        fontWeight: '600',
        marginTop: 16,
        marginBottom: 12,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    cityOption: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        borderBottomWidth: 1,
        gap: 12,
    },
    cityText: {
        flex: 1,
        fontSize: 16,
    },
    checkmark: {
        width: 20,
        height: 20,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
