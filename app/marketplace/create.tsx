import { API_BASE_URL } from '@/constants/Config';
import { useUser } from '@/context/AuthContext';
import { useThemeContext } from '@/context/ThemeContext';
import * as ImagePicker from 'expo-image-picker';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Camera, MapPin, Search, X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Alert, FlatList, Image, KeyboardAvoidingView, Modal, Platform, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const CATEGORIES = ['Electronics', 'Vehicles', 'Clothing', 'Home', 'Sports', 'Other'];
const CONDITIONS = ['New', 'Like New', 'Good', 'Fair', 'Poor'];

const MOROCCAN_CITIES = [
    'Casablanca', 'Rabat', 'Fès', 'Tanger', 'Marrakech', 'Salé', 'Agadir', 'Meknès', 'Oujda',
    'Kenitra', 'Tétouan', 'Safi', 'Mohammédia', 'Béni Mellal', 'El Jadida', 'Taza', 'Nador',
    'Settat', 'Larache', 'Ksar El Kebir', 'Khémisset', 'Guelmim', 'Berrechid', 'Fquih Ben Salah',
    'Taourirt', 'Berkane', 'Sidi Slimane', 'Sidi Kacem', 'Khenifra', 'Taroudant', 'Essaouira',
    'Tiznit', 'Ouarzazate', 'Al Hoceima', 'Tan-Tan', 'Errachidia', 'Guercif', 'Oulad Teima',
    'Dakhla', 'El Kelaa des Sraghna', 'Ben Guerir', 'Khouribga', 'Ifrane', 'Azrou', 'Midelt'
].sort();

const CURRENCIES = ['DH', 'USD', 'EUR', 'GBP'];

export default function CreateMarketItemScreen() {
    const router = useRouter();
    const { colors, isDark } = useThemeContext();
    const { user } = (useUser() || {}) as any;
    const insets = useSafeAreaInsets();

    const params = useLocalSearchParams();
    const { id } = params;
    const isEditing = !!id;

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [price, setPrice] = useState('');
    const [currency, setCurrency] = useState('DH');
    const [category, setCategory] = useState('Electronics');
    const [condition, setCondition] = useState('Good');
    const [city, setCity] = useState('');
    const [images, setImages] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [showCityModal, setShowCityModal] = useState(false);
    const [showCurrencyModal, setShowCurrencyModal] = useState(false);
    const [citySearch, setCitySearch] = useState('');

    useEffect(() => {
        if (isEditing) {
            fetchItemDetails();
        }
    }, [id]);

    const fetchItemDetails = async () => {
        try {
            setLoading(true);
            const res = await fetch(`${API_BASE_URL}/api/marketplace/${id}`);
            if (res.ok) {
                const item = await res.json();
                setTitle(item.title);
                setDescription(item.description);
                setPrice(item.price.toString());
                setCurrency(item.currency || 'DH');
                setCategory(item.category);
                setCondition(item.condition);
                setCity(item.location?.city || '');
                setImages(item.images || []);
            }
        } catch (error) {
            console.error('Error fetching item details:', error);
            Alert.alert('Error', 'Failed to fetch item details');
        } finally {
            setLoading(false);
        }
    };

    const pickImage = async () => {
        const remaining = 8 - images.length;
        if (remaining <= 0) {
            Alert.alert('Limit reached', 'You can only add up to 8 images');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsMultipleSelection: true,
            selectionLimit: remaining,
            quality: 0.7,
        });

        if (!result.canceled && result.assets) {
            const newImages = result.assets.map(asset => asset.uri);
            setImages([...images, ...newImages]);
        }
    };

    const removeImage = (index: number) => {
        setImages(images.filter((_, i) => i !== index));
    };

    const handleSubmit = async () => {
        if (!title || !description || !price) {
            Alert.alert('Error', 'Please fill in all required fields');
            return;
        }

        if (images.length === 0) {
            Alert.alert('Error', 'Please add at least one image');
            return;
        }

        try {
            setLoading(true);

            // 1. Upload images first
            const uploadedUrls: string[] = [];
            for (const uri of images) {
                const formData = new FormData();
                const filename = uri.split('/').pop() || 'upload.jpg';
                const match = /\.(\w+)$/.exec(filename);
                const type = match ? `image/${match[1]}` : `image/jpeg`;

                if (Platform.OS === 'web') {
                    // For Web: Convert URI to Blob
                    const response = await fetch(uri);
                    const blob = await response.blob();
                    formData.append('image', blob, filename);
                } else {
                    // For Mobile: Use uri object
                    formData.append('image', {
                        uri: uri,
                        name: filename,
                        type: type,
                    } as any);
                }

                // console.log(`Uploading ${filename} to ${API_BASE_URL}/api/upload`);

                const uploadRes = await fetch(`${API_BASE_URL}/api/upload`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${user?.token}`,
                        'Accept': 'application/json',
                    },
                    body: formData
                });

                if (uploadRes.ok) {
                    const uploadData = await uploadRes.json();
                    uploadedUrls.push(uploadData.url);
                    // console.log(`Successfully uploaded: ${uploadData.url}`);
                } else {
                    const errorText = await uploadRes.text();
                    console.error('Upload failed response:', errorText);
                    throw new Error(`Failed to upload ${filename}: ${uploadRes.status}`);
                }
            }

            // 2. Create or Update marketplace item with uploaded URLs
            const itemData = {
                title,
                description,
                price: parseFloat(price),
                currency,
                category,
                condition,
                images: uploadedUrls,
                location: {
                    city: city || 'Not specified'
                }
            };

            const url = isEditing ? `${API_BASE_URL}/api/marketplace/${id}` : `${API_BASE_URL}/api/marketplace`;
            const method = isEditing ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${user?.token}`
                },
                body: JSON.stringify(itemData)
            });

            if (res.ok) {
                Alert.alert('Success', isEditing ? 'Your item has been updated!' : 'Your item has been listed!', [
                    { text: 'OK', onPress: () => router.replace('/marketplace/selling') }
                ]);
            } else {
                const error = await res.json();
                Alert.alert('Error', error.message || 'Failed to create listing');
            }
        } catch (error) {
            console.error('Error creating item:', error);
            Alert.alert('Error', 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
            <Stack.Screen options={{ headerShown: false }} />
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                {/* Header */}
                <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border, paddingTop: insets.top + 10 }]}>
                    <TouchableOpacity
                        style={[styles.backButton, { backgroundColor: isDark ? '#2C2C2E' : '#F3F4F6' }]}
                        onPress={() => router.back()}
                    >
                        <ArrowLeft size={22} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: colors.text }]}>{isEditing ? 'Edit Product' : 'Add Product'}</Text>
                    <TouchableOpacity
                        style={[styles.postButton, { backgroundColor: loading ? colors.border : colors.primary }]}
                        onPress={handleSubmit}
                        disabled={loading}
                    >
                        <Text style={styles.postButtonText}>{loading ? (isEditing ? 'Updating...' : 'Posting...') : (isEditing ? 'Update' : 'Post')}</Text>
                    </TouchableOpacity>
                </View>

                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={{ flex: 1 }}
                    keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
                >
                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>
                        {/* Images */}
                        <View style={styles.section}>
                            <Text style={[styles.label, { color: colors.text }]}>Photos *</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imagesScroll}>
                                {images.map((uri, index) => (
                                    <View key={index} style={styles.imageContainer}>
                                        <Image source={{ uri }} style={styles.image} />
                                        <TouchableOpacity
                                            style={styles.removeButton}
                                            onPress={() => removeImage(index)}
                                        >
                                            <X size={16} color="#fff" />
                                        </TouchableOpacity>
                                    </View>
                                ))}
                                {images.length < 8 && (
                                    <TouchableOpacity
                                        style={[styles.addImageButton, { backgroundColor: isDark ? '#2C2C2E' : '#F3F4F6', borderColor: colors.border }]}
                                        onPress={pickImage}
                                    >
                                        <Camera size={32} color={colors.textSecondary} />
                                        <Text style={[styles.addImageText, { color: colors.textSecondary }]}>
                                            Add Photo
                                        </Text>
                                    </TouchableOpacity>
                                )}
                            </ScrollView>
                        </View>

                        {/* Title */}
                        <View style={styles.section}>
                            <Text style={[styles.label, { color: colors.text }]}>Title *</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: isDark ? '#2C2C2E' : '#F3F4F6', color: colors.text, borderColor: colors.border, borderWidth: 1 }]}
                                placeholder="e.g. iPhone 16 Pro Max 256GB"
                                placeholderTextColor={colors.textSecondary}
                                value={title}
                                onChangeText={setTitle}
                            />
                        </View>

                        {/* Price */}
                        <View style={styles.section}>
                            <Text style={[styles.label, { color: colors.text }]}>Price *</Text>
                            <View style={{ flexDirection: 'row', gap: 12 }}>
                                <TextInput
                                    style={[styles.input, { flex: 1, backgroundColor: isDark ? '#2C2C2E' : '#F3F4F6', color: colors.text, borderColor: colors.border, borderWidth: 1 }]}
                                    placeholder="0"
                                    placeholderTextColor={colors.textSecondary}
                                    value={price}
                                    onChangeText={setPrice}
                                    keyboardType="numeric"
                                />
                                <TouchableOpacity
                                    style={{
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: 6,
                                        backgroundColor: isDark ? '#2C2C2E' : '#F3F4F6',
                                        borderRadius: 12,
                                        paddingHorizontal: 16,
                                        minWidth: 90,
                                        borderWidth: 1,
                                        borderColor: colors.border
                                    }}
                                    onPress={() => setShowCurrencyModal(true)}
                                >
                                    <Text style={{
                                        fontWeight: '600',
                                        fontSize: 16,
                                        color: colors.text
                                    }}>{currency}</Text>
                                    <ArrowLeft size={16} color={colors.textSecondary} style={{ transform: [{ rotate: '-90deg' }] }} />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Category */}
                        <View style={styles.section}>
                            <Text style={[styles.label, { color: colors.text }]}>Category</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.optionsScroll}>
                                {CATEGORIES.map((cat) => (
                                    <TouchableOpacity
                                        key={cat}
                                        style={[
                                            styles.optionButton,
                                            { backgroundColor: isDark ? '#2C2C2E' : '#F3F4F6' },
                                            category === cat && { backgroundColor: colors.primary }
                                        ]}
                                        onPress={() => setCategory(cat)}
                                    >
                                        <Text style={[
                                            styles.optionText,
                                            { color: category === cat ? '#fff' : colors.text }
                                        ]}>
                                            {cat}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>

                        {/* Condition */}
                        <View style={styles.section}>
                            <Text style={[styles.label, { color: colors.text }]}>Condition</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.optionsScroll}>
                                {CONDITIONS.map((cond) => (
                                    <TouchableOpacity
                                        key={cond}
                                        style={[
                                            styles.optionButton,
                                            { backgroundColor: isDark ? '#2C2C2E' : '#F3F4F6' },
                                            condition === cond && { backgroundColor: colors.primary }
                                        ]}
                                        onPress={() => setCondition(cond)}
                                    >
                                        <Text style={[
                                            styles.optionText,
                                            { color: condition === cond ? '#fff' : colors.text }
                                        ]}>
                                            {cond}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>

                        {/* Description */}
                        <View style={styles.section}>
                            <Text style={[styles.label, { color: colors.text }]}>Description *</Text>
                            <TextInput
                                style={[styles.textArea, { backgroundColor: isDark ? '#2C2C2E' : '#F3F4F6', color: colors.text, borderColor: colors.border, borderWidth: 1 }]}
                                placeholder="Describe your item..."
                                placeholderTextColor={colors.textSecondary}
                                value={description}
                                onChangeText={setDescription}
                                multiline
                                numberOfLines={5}
                                textAlignVertical="top"
                            />
                        </View>

                        {/* Location */}
                        <View style={styles.section}>
                            <Text style={[styles.label, { color: colors.text }]}>City *</Text>
                            <TouchableOpacity
                                style={[styles.input, { backgroundColor: isDark ? '#2C2C2E' : '#F3F4F6', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderColor: colors.border, borderWidth: 1 }]}
                                onPress={() => setShowCityModal(true)}
                            >
                                <Text style={{ color: city ? colors.text : colors.textSecondary, fontSize: 16 }}>
                                    {city || 'Select a city'}
                                </Text>
                                <ArrowLeft size={20} color={colors.textSecondary} style={{ transform: [{ rotate: '-90deg' }] }} />
                            </TouchableOpacity>
                        </View>

                        <View style={{ height: 40 }} />
                    </ScrollView>
                </KeyboardAvoidingView>

                {/* City Selection Modal */}
                <Modal
                    visible={showCityModal}
                    animationType="slide"
                    transparent={true}
                    onRequestClose={() => setShowCityModal(false)}
                >
                    <View style={styles.modalOverlay}>
                        <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
                            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
                                <TouchableOpacity onPress={() => setShowCityModal(false)}>
                                    <X size={24} color={colors.text} />
                                </TouchableOpacity>
                                <Text style={[styles.modalTitle, { color: colors.text }]}>Select City</Text>
                                <View style={{ width: 24 }} />
                            </View>

                            <View style={styles.modalSearchContainer}>
                                <View style={[styles.modalSearchBar, { backgroundColor: isDark ? '#2C2C2E' : '#F3F4F6' }]}>
                                    <Search size={20} color={colors.textSecondary} />
                                    <TextInput
                                        style={[styles.modalSearchInput, { color: colors.text }]}
                                        placeholder="Search city..."
                                        placeholderTextColor={colors.textSecondary}
                                        value={citySearch}
                                        onChangeText={setCitySearch}
                                    />
                                </View>
                            </View>

                            <FlatList
                                data={MOROCCAN_CITIES.filter(c => c.toLowerCase().includes(citySearch.toLowerCase()))}
                                keyExtractor={(item) => item}
                                renderItem={({ item }) => (
                                    <TouchableOpacity
                                        style={[styles.cityOption, { borderBottomColor: colors.border }]}
                                        onPress={() => {
                                            setCity(item);
                                            setShowCityModal(false);
                                            setCitySearch('');
                                        }}
                                    >
                                        <MapPin size={20} color={colors.textSecondary} />
                                        <Text style={[styles.cityText, { color: colors.text }]}>{item}</Text>
                                        {city === item && (
                                            <View style={[styles.checkmark, { backgroundColor: colors.primary }]}>
                                                <Text style={{ color: '#fff', fontSize: 12 }}>✓</Text>
                                            </View>
                                        )}
                                    </TouchableOpacity>
                                )}
                                contentContainerStyle={{ paddingHorizontal: 20 }}
                            />
                        </View>
                    </View>
                </Modal>

                {/* Currency Selection Modal */}
                <Modal
                    visible={showCurrencyModal}
                    animationType="fade"
                    transparent={true}
                    onRequestClose={() => setShowCurrencyModal(false)}
                >
                    <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
                        <View style={{ backgroundColor: colors.background, borderRadius: 20, width: '100%', maxWidth: 300, overflow: 'hidden' }}>
                            <View style={{ padding: 20, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                                <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text, textAlign: 'center' }}>Select Currency</Text>
                            </View>
                            {CURRENCIES.map((curr) => (
                                <TouchableOpacity
                                    key={curr}
                                    style={{
                                        paddingVertical: 16,
                                        paddingHorizontal: 24,
                                        flexDirection: 'row',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        borderBottomWidth: 1,
                                        borderBottomColor: colors.border
                                    }}
                                    onPress={() => {
                                        setCurrency(curr);
                                        setShowCurrencyModal(false);
                                    }}
                                >
                                    <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>{curr}</Text>
                                    {currency === curr && (
                                        <View style={[styles.checkmark, { backgroundColor: colors.primary }]}>
                                            <Text style={{ color: '#fff', fontSize: 12 }}>✓</Text>
                                        </View>
                                    )}
                                </TouchableOpacity>
                            ))}
                            <TouchableOpacity
                                style={{ padding: 16, alignItems: 'center', backgroundColor: isDark ? '#2C2C2E' : '#F3F4F6' }}
                                onPress={() => setShowCurrencyModal(false)}
                            >
                                <Text style={{ color: colors.textSecondary, fontWeight: '600' }}>Cancel</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>
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
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingBottom: 12,
        borderBottomWidth: 1,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        flex: 1,
        textAlign: 'center',
        marginHorizontal: 16,
    },
    postButton: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 20,
    },
    postButtonText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '600',
    },
    section: {
        paddingHorizontal: 16,
        paddingTop: 20,
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 12,
    },
    input: {
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderRadius: 12,
        fontSize: 16,
    },
    textArea: {
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderRadius: 12,
        fontSize: 16,
        minHeight: 120,
    },
    imagesScroll: {
        flexDirection: 'row',
    },
    imageContainer: {
        position: 'relative',
        marginRight: 12,
    },
    image: {
        width: 120,
        height: 120,
        borderRadius: 12,
    },
    removeButton: {
        position: 'absolute',
        top: 8,
        right: 8,
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: 'rgba(0,0,0,0.6)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    addImageButton: {
        width: 120,
        height: 120,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: 'rgba(128,128,128,0.3)',
        borderStyle: 'dashed',
    },
    addImageText: {
        fontSize: 12,
        marginTop: 8,
    },
    optionsScroll: {
        flexDirection: 'row',
    },
    optionButton: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 20,
        marginRight: 10,
    },
    optionText: {
        fontSize: 14,
        fontWeight: '600',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        height: '80%',
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 20,
        borderBottomWidth: 1,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '700',
    },
    modalSearchContainer: {
        padding: 20,
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
        width: 22,
        height: 22,
        borderRadius: 11,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
