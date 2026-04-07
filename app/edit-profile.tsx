import { API_BASE_URL } from '@/constants/Config';
import { COUNTRY_CODES } from '@/constants/CountryCodes';
import { PROFILE } from '@/constants/MockData';
import { useThemeContext } from '@/context/ThemeContext';
import { useUser } from '@/context/UserContext';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { Camera, Check, ChevronDown, Pencil, Search, X } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Image, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ConfirmationModal from '../components/ConfirmationModal';
import ProcessingModal from '../components/ProcessingModal';
import ImageConfirmModal from '../components/ImageConfirmModal';
import { uploadFile } from '@/utils/uploadHelper';
import * as FileSystem from 'expo-file-system/legacy';
import { LinearGradient } from 'expo-linear-gradient';

// Helper to normalize URIs (Copied from ProfileScreen for consistency)
const getCorrectUrl = (url: string | null | undefined) => {
    if (!url || typeof url !== 'string' || url.trim() === '') return undefined;
    const clean = url.trim();
    if (clean.length === 0) return undefined;
    
    // 1. Direct pass-through for local or data URIs
    if (clean.startsWith('blob:') || clean.startsWith('file:') || clean.startsWith('data:')) return clean;

    // 2. Handle absolute URLs
    if (clean.startsWith('http')) {
        // If it's our own backend but as localhost (from web view/cached), strip it to re-base with current API_BASE_URL
        if (clean.includes('/uploads/')) {
            const parts = clean.split('/uploads/');
            return `${API_BASE_URL}/uploads/${parts[1]}`;
        }
        return clean;
    }

    // 3. For relative paths or stripped filenames, ensure we have the correct base
    const filename = clean.replace(/^.*\/uploads\//, '').replace(/^uploads\//, '').replace(/^\//, '');
    
    return `${API_BASE_URL}/uploads/${filename}`;
};

export default function EditProfileScreen() {
    const router = useRouter();
    const { user, updateProfile } = (useUser() || {}) as any;
    const { colors, isDark } = useThemeContext();
    const insets = useSafeAreaInsets();
    const { width } = useWindowDimensions();
    const isDesktop = Platform.OS === 'web' && width > 768;
    const [saving, setSaving] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadMessage, setUploadMessage] = useState("Downloading image...");

    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

    const [isConfirmModalVisible, setIsConfirmModalVisible] = useState(false);
    const [pendingImage, setPendingImage] = useState<{ uri: string, type: string } | null>(null);

    // Initialize with user data or defaults
    const [name, setName] = useState(user?.name || '');
    const [handle, setHandle] = useState(user?.handle || '');
    const [bio, setBio] = useState(user?.bio || '');
    const [avatar, setAvatar] = useState(user?.avatar || '');
    const [coverImage, setCoverImage] = useState(user?.coverImage || PROFILE.user.coverImage);
    const [pronouns, setPronouns] = useState(user?.pronouns || '');
    const [gender, setGender] = useState(user?.gender || '');
    const [website, setWebsite] = useState(user?.links && user.links.length > 0 ? (typeof user.links[0] === 'object' ? user.links[0].url : user.links[0]) : '');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [successModalVisible, setSuccessModalVisible] = useState(false);
    const [errorModalVisible, setErrorModalVisible] = useState(false);
    const [modalMessage, setModalMessage] = useState({ title: '', message: '' });

    const [phone, setPhone] = useState(user?.phone || '');
    const defaultCountry = COUNTRY_CODES.find(c => c.code === '+212') || COUNTRY_CODES[0];
    const [selectedCountry, setSelectedCountry] = useState(defaultCountry);
    const [isCountryPickerVisible, setIsCountryPickerVisible] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if (user?.phone) {
            const match = COUNTRY_CODES.find(c => user.phone.startsWith(c.code));
            if (match) {
                setSelectedCountry(match);
                setPhone(user.phone.replace(match.code, '').trim());
            } else {
                setPhone(user.phone);
            }
        }
    }, [user]);

    // Fallback if no user loaded
    if (!user) return <View style={[styles.container, { backgroundColor: colors.background }]}><Text style={{ color: colors.text }}>Loading...</Text></View>;

    const pickImage = async (type: string) => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: type === 'avatar' ? [1, 1] : [16, 9],
            quality: 0.8,
        });

        if (!result.canceled) {
            const asset = result.assets[0];
            const uri = asset.uri;
            
            // Check file size
            let fileSize = asset.fileSize;
            
            // If native and fileSize is missing, try FileSystem
            if (!fileSize && Platform.OS !== 'web' && uri.startsWith('file:')) {
                try {
                    const fileInfo = await FileSystem.getInfoAsync(uri);
                    if (fileInfo.exists) fileSize = fileInfo.size;
                } catch (e) {
                    console.warn("Failed to get file info:", e);
                }
            } else if (!fileSize && Platform.OS === 'web' && uri.startsWith('blob:')) {
                try {
                    const response = await fetch(uri);
                    const blob = await response.blob();
                    fileSize = blob.size;
                } catch (e) {
                    console.warn("Failed to get blob size:", e);
                }
            }

            if (fileSize && fileSize > MAX_FILE_SIZE) {
                setModalMessage({
                    title: 'Image Too Large',
                    message: `The selected image is too big (${(fileSize / (1024 * 1024)).toFixed(1)}MB). Maximum size is 10MB.`
                });
                setErrorModalVisible(true);
                return;
            }

            setPendingImage({ uri, type });
            setIsConfirmModalVisible(true);
        }
    };

    const confirmUpload = () => {
        if (!pendingImage) return;
        
        if (pendingImage.type === 'avatar') {
            setAvatar(pendingImage.uri);
        } else {
            setCoverImage(pendingImage.uri);
        }
        
        setIsConfirmModalVisible(false);
        setPendingImage(null);
    };

    const handleSave = async () => {
        setSaving(true);
        // Prepare data
        // Only prepend code if phone is not empty
        let fullPhone = phone;
        if (phone) {
            fullPhone = selectedCountry.code + phone.replace(/^0+/, '');
        }

        setIsUploading(true);
        setUploadMessage("Downloading image...");

        let finalAvatar = avatar;
        let finalCover = coverImage;

        try {
            // Helper: convert data: URI to blob: URI for web upload
            const toUploadableUri = async (uri: string): Promise<string> => {
                if (uri.startsWith('data:') && typeof document !== 'undefined') {
                    // Convert base64 data URI to a Blob URL for uploading on web
                    const res = await fetch(uri);
                    const blob = await res.blob();
                    return URL.createObjectURL(blob);
                }
                return uri;
            };

            const needsUpload = (uri: string) =>
                uri && (uri.startsWith('file:') || uri.startsWith('blob:') || uri.startsWith('ph:') || uri.startsWith('data:'));

            if (needsUpload(avatar)) {
                const uploadUri = await toUploadableUri(avatar);
                finalAvatar = await uploadFile(uploadUri, user.token, 'image');
            }
            if (needsUpload(coverImage)) {
                const uploadUri = await toUploadableUri(coverImage);
                finalCover = await uploadFile(uploadUri, user.token, 'image');
            }
        } catch (error) {
            console.error('❌ Image upload failed:', error);
            setModalMessage({
                title: 'Upload Failed',
                message: 'Failed to upload your new profile images. Please try again.'
            });
            setErrorModalVisible(true);
            setIsUploading(false);
            setSaving(false);
            return;
        }

        setIsUploading(false);

        const updatedUser: any = {
            name,
            handle,
            bio,
            pronouns,
            gender,
            phone: fullPhone,
            links: website ? [{ title: 'Website', url: website }] : [],
            avatar: finalAvatar,
            coverImage: finalCover
        };

        if (newPassword) {
            if (newPassword !== confirmPassword) {
                setModalMessage({
                    title: 'Password Mismatch',
                    message: 'Passwords do not match!'
                });
                setErrorModalVisible(true);
                setSaving(false);
                return;
            }
            if (newPassword.length < 6) {
                setModalMessage({
                    title: 'Password Too Short',
                    message: 'Password must be at least 6 characters'
                });
                setErrorModalVisible(true);
                setSaving(false);
                return;
            }
            updatedUser.password = newPassword;
        }

        const result = await updateProfile(updatedUser);
        setSaving(false);

        if (result?.success) {
            setModalMessage({
                title: 'Profile Updated',
                message: 'Your profile has been saved successfully!'
            });
            setSuccessModalVisible(true);
            setTimeout(() => router.back(), 1500);
        } else {
            setModalMessage({
                title: 'Update Failed',
                message: result?.message || 'Failed to update profile'
            });
            setErrorModalVisible(true);
        }
    };

    const filteredCountries = COUNTRY_CODES.filter(c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.country.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.code.includes(searchQuery)
    );

    const renderCountryPicker = () => (
        <Modal
            visible={isCountryPickerVisible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={() => setIsCountryPickerVisible(false)}
        >
            <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
                <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
                    <Text style={[styles.modalTitle, { color: colors.text }]}>Select Country</Text>
                    <TouchableOpacity onPress={() => setIsCountryPickerVisible(false)}>
                        <X size={24} color={colors.text} />
                    </TouchableOpacity>
                </View>

                <View style={[styles.searchContainer, { backgroundColor: isDark ? '#1F1F1F' : '#F2F2F7' }]}>
                    <Search size={20} color={colors.textSecondary} />
                    <TextInput
                        style={[styles.searchInput, { color: colors.text }]}
                        placeholder="Search country..."
                        placeholderTextColor={colors.textSecondary}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>

                <FlatList
                    data={filteredCountries}
                    keyExtractor={(item) => item.country}
                    keyboardShouldPersistTaps="handled"
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            style={[styles.countryItem, { borderBottomColor: colors.border }]}
                            onPress={() => {
                                setSelectedCountry(item);
                                setIsCountryPickerVisible(false);
                            }}
                        >
                            <Image
                                source={{ uri: `https://flagcdn.com/w80/${item.country.toLowerCase()}.png` }}
                                style={styles.flagIcon}
                            />
                            <Text style={[styles.countryName, { color: colors.text }]}>{item.name}</Text>
                            <Text style={[styles.countryCode, { color: colors.textSecondary }]}>{item.code}</Text>
                        </TouchableOpacity>
                    )}
                />
            </View>
        </Modal>
    );

    return (
        <View style={[styles.container, { backgroundColor: colors.background, paddingBottom: insets.bottom, alignItems: isDesktop ? 'center' : 'stretch' }]}>
            {/* Header */}
            <View style={[styles.header, {
                borderBottomColor: colors.border,
                backgroundColor: colors.background,
                paddingTop: Platform.OS === 'web' ? 20 : (insets.top || 20),
                width: isDesktop ? 600 : '100%',
                maxWidth: 600,
            }]}>
                {!isDesktop && (
                    <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
                        <X size={24} color={colors.text} />
                    </TouchableOpacity>
                )}
                <Text style={[styles.headerTitle, { color: colors.text, marginLeft: isDesktop ? 0 : 8 }]}>Edit Profile</Text>
                <TouchableOpacity onPress={handleSave} style={styles.headerBtn} disabled={saving}>
                    {saving ? <ActivityIndicator size="small" color={colors.primary} /> : <Check size={24} color={colors.primary} />}
                </TouchableOpacity>
            </View>

            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, width: isDesktop ? 600 : '100%', maxWidth: 600 }}>
                <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
                    {/* Visual & Avatar Section */}
                    <View style={styles.visualSection}>
                        <View style={[styles.coverWrapper, isDesktop && { height: 200, borderRadius: 12, overflow: 'hidden' }]}>
                            {getCorrectUrl(coverImage) ? (
                                <Image
                                    source={{ uri: getCorrectUrl(coverImage) }}
                                    style={styles.coverImage}
                                    resizeMode="cover"
                                />
                            ) : (
                                <LinearGradient
                                    colors={['#667eea', '#764ba2', '#f093fb']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                    style={styles.coverImage}
                                />
                            )}
                            <TouchableOpacity style={styles.changeCoverBtn} onPress={() => pickImage('cover')}>
                                <Camera size={18} color="white" />
                                <Text style={styles.changeCoverText}>Edit Cover</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={[styles.avatarSection, isDesktop && { marginTop: -50, marginLeft: 20, alignItems: 'flex-start' }]} pointerEvents="box-none">
                            <View style={[styles.avatarWrapper, { backgroundColor: colors.background }]}>
                                <Image source={{ uri: getCorrectUrl(avatar) || `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'User')}&background=random` }} style={[styles.avatar, isDesktop && { width: 100, height: 100, borderRadius: 50 }]} />
                                <TouchableOpacity
                                    style={[styles.cameraIcon, { backgroundColor: colors.primary, borderColor: colors.background }]}
                                    onPress={() => pickImage('avatar')}
                                >
                                    <Pencil size={16} color="white" />
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>

                    <View style={styles.content}>
                        {/* Section: Public Info */}
                        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Public Info</Text>

                        <View style={[styles.inputGroup, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF', borderColor: colors.border, borderRadius: 16 }]}>
                            <View style={[styles.inputContainer, { borderBottomColor: colors.border }]}>
                                <Text style={[styles.label, { color: colors.textSecondary }]}>Name</Text>
                                <TextInput
                                    style={[styles.input, { color: colors.text }]}
                                    value={name}
                                    onChangeText={setName}
                                    placeholder="Your Name"
                                    placeholderTextColor={colors.textSecondary}
                                />
                            </View>

                            <View style={[styles.inputContainer, { borderBottomColor: colors.border }]}>
                                <Text style={[styles.label, { color: colors.textSecondary }]}>Username</Text>
                                <TextInput
                                    style={[styles.input, { color: colors.text }]}
                                    value={handle}
                                    onChangeText={setHandle}
                                    placeholder="@username"
                                    placeholderTextColor={colors.textSecondary}
                                    autoCapitalize="none"
                                />
                            </View>

                            <View style={[styles.inputContainer, { borderBottomWidth: 0 }]}>
                                <Text style={[styles.label, { color: colors.textSecondary }]}>Bio</Text>
                                <TextInput
                                    style={[styles.input, styles.textArea, { color: colors.text }]}
                                    value={bio}
                                    onChangeText={setBio}
                                    placeholder="Write a short bio..."
                                    placeholderTextColor={colors.textSecondary}
                                    multiline
                                />
                            </View>
                        </View>

                        {/* Section: Details */}
                        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Details</Text>

                        <View style={[styles.inputGroup, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF', borderColor: colors.border }]}>
                            <View style={[styles.inputContainer, { borderBottomColor: colors.border }]}>
                                <Text style={[styles.label, { color: colors.textSecondary }]}>Pronouns</Text>
                                <TextInput
                                    style={[styles.input, { color: colors.text }]}
                                    value={pronouns}
                                    onChangeText={setPronouns}
                                    placeholder="he/him, she/her"
                                    placeholderTextColor={colors.textSecondary}
                                />
                            </View>

                            <View style={[styles.inputContainer, { borderBottomColor: colors.border }]}>
                                <Text style={[styles.label, { color: colors.textSecondary }]}>Website</Text>
                                <TextInput
                                    style={[styles.input, { color: colors.text }]}
                                    value={website}
                                    onChangeText={setWebsite}
                                    placeholder="https://your-site.com"
                                    placeholderTextColor={colors.textSecondary}
                                    autoCapitalize="none"
                                />
                            </View>

                            <View style={[styles.inputContainer, { borderBottomColor: colors.border }]}>
                                <Text style={[styles.label, { color: colors.textSecondary }]}>Gender</Text>
                                <View style={styles.genderRow}>
                                    {['Male', 'Female', 'Other'].map((option) => (
                                        <TouchableOpacity
                                            key={option}
                                            style={[
                                                styles.genderChip,
                                                gender === option ? { backgroundColor: colors.primary } : { backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7' }
                                            ]}
                                            onPress={() => setGender(option)}
                                        >
                                            <Text style={[
                                                styles.genderText,
                                                gender === option ? { color: 'white' } : { color: colors.text }
                                            ]}>
                                                {option}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>

                            <View style={[styles.inputContainer, { borderBottomWidth: 0 }]}>
                                <Text style={[styles.label, { color: colors.textSecondary }]}>Phone</Text>
                                <View style={styles.phoneRow}>
                                    <TouchableOpacity
                                        style={[styles.countrySelector, { borderRightColor: colors.border }]}
                                        onPress={() => setIsCountryPickerVisible(true)}
                                    >
                                        <Image
                                            source={{ uri: `https://flagcdn.com/w80/${selectedCountry.country.toLowerCase()}.png` }}
                                            style={styles.flagIconSmall}
                                        />
                                        <Text style={{ color: colors.text, fontSize: 16, fontWeight: '500', marginHorizontal: 6 }}>{selectedCountry.code}</Text>
                                        <ChevronDown size={14} color={colors.textSecondary} />
                                    </TouchableOpacity>
                                    <TextInput
                                        style={[styles.input, { flex: 1, paddingVertical: 0, height: '100%' }]}
                                        value={phone}
                                        onChangeText={setPhone}
                                        placeholder="Mobile Number"
                                        placeholderTextColor={colors.textSecondary}
                                        keyboardType="phone-pad"
                                        maxLength={15}
                                    />
                                </View>
                            </View>
                        </View>
                        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Security</Text>

                        <View style={[styles.inputGroup, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF', borderColor: colors.border }]}>
                            <View style={[styles.inputContainer, { borderBottomColor: colors.border }]}>
                                <Text style={[styles.label, { color: colors.textSecondary }]}>New Password</Text>
                                <TextInput
                                    style={[styles.input, { color: colors.text }]}
                                    value={newPassword}
                                    onChangeText={setNewPassword}
                                    placeholder="Enter new password"
                                    placeholderTextColor={colors.textSecondary}
                                    secureTextEntry
                                />
                            </View>
                            <View style={[styles.inputContainer, { borderBottomWidth: 0 }]}>
                                <Text style={[styles.label, { color: colors.textSecondary }]}>Confirm Password</Text>
                                <TextInput
                                    style={[styles.input, { color: colors.text }]}
                                    value={confirmPassword}
                                    onChangeText={setConfirmPassword}
                                    placeholder="Re-enter new password"
                                    placeholderTextColor={colors.textSecondary}
                                    secureTextEntry
                                />
                            </View>
                        </View>

                        <TouchableOpacity style={{ alignSelf: 'center', marginTop: 10 }} onPress={() => alert('Reset link sent!')}>
                            <Text style={{ color: colors.primary, fontSize: 14, fontWeight: '600' }}>Forgot Password?</Text>
                        </TouchableOpacity>

                    </View>
                </ScrollView>
            </KeyboardAvoidingView>

            {/* Country Picker Modal */}
            {renderCountryPicker()}

            {/* Success Modal */}
            <ConfirmationModal
                visible={successModalVisible}
                onClose={() => setSuccessModalVisible(false)}
                title={modalMessage.title}
                message={modalMessage.message}
                type="success"
            />

            {/* Error Modal */}
            <ConfirmationModal
                visible={errorModalVisible}
                onClose={() => setErrorModalVisible(false)}
                title={modalMessage.title}
                message={modalMessage.message}
                type="error"
            />

            <ProcessingModal 
                visible={isUploading} 
                message={uploadMessage} 
            />

            <ImageConfirmModal
                visible={isConfirmModalVisible}
                imageUri={pendingImage?.uri || null}
                title={`Confirm ${pendingImage?.type === 'avatar' ? 'Profile Picture' : 'Cover Image'}`}
                onConfirm={confirmUpload}
                onCancel={() => {
                    setIsConfirmModalVisible(false);
                    setPendingImage(null);
                }}
            />
        </View >
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
        paddingTop: Platform.OS === 'android' ? 40 : 20,
        paddingBottom: 16,
        borderBottomWidth: 1,
    },
    headerBtn: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 17,
        fontWeight: '600',
    },
    visualSection: {
        marginBottom: 10,
    },
    coverWrapper: {
        height: 160,
        width: '100%',
        position: 'relative',
    },
    coverImage: {
        width: '100%',
        height: '100%',
    },
    changeCoverBtn: {
        position: 'absolute',
        bottom: 12,
        right: 12,
        zIndex: 10,
        backgroundColor: 'rgba(0,0,0,0.5)',
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 20,
    },
    changeCoverText: {
        color: 'white',
        fontSize: 12,
        fontWeight: '600',
        marginLeft: 6,
    },
    avatarSection: {
        alignItems: 'center',
        marginTop: -50,
    },
    avatarWrapper: {
        position: 'relative',
        padding: 4,
        borderRadius: 60,
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
    },
    cameraIcon: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
    },
    content: {
        paddingHorizontal: 16,
        paddingTop: 10,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '900',
        textTransform: 'uppercase',
        marginLeft: 16,
        marginBottom: 12,
        marginTop: 24,
        letterSpacing: 1,
        opacity: 0.6,
    },
    inputGroup: {
        borderRadius: 24,
        overflow: 'hidden',
        borderWidth: 1,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 16,
        borderBottomWidth: 1,
    },
    label: {
        width: 90,
        fontSize: 14,
        fontWeight: '700',
    },
    input: {
        flex: 1,
        fontSize: 16,
        paddingVertical: 0,
        fontWeight: '500',
    },
    textArea: {
        minHeight: 60,
        textAlignVertical: 'center',
        paddingTop: 0,
    },
    genderRow: {
        flex: 1,
        flexDirection: 'row',
        gap: 8,
    },
    genderChip: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
    },
    genderText: {
        fontSize: 14,
        fontWeight: '500',
    },
    phoneRow: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        height: 24, // Match text height approx
    },
    countrySelector: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingRight: 10,
        marginRight: 10,
        borderRightWidth: 1,
        height: '100%',
    },
    flagIconSmall: {
        width: 21,
        height: 14,
        borderRadius: 2,
    },

    // Modal Styles
    modalContainer: {
        flex: 1,
        paddingTop: 10,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 0.5,
    },
    modalTitle: {
        fontSize: 17,
        fontWeight: '600',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        margin: 16,
        paddingHorizontal: 12,
        borderRadius: 10,
        height: 36,
    },
    searchInput: {
        flex: 1,
        marginLeft: 8,
        fontSize: 16,
    },
    countryItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderBottomWidth: 0.5,
    },
    flagIcon: {
        width: 30,
        height: 20,
        marginRight: 12,
        borderRadius: 3,
    },
    countryName: {
        flex: 1,
        fontSize: 16,
    },
    countryCode: {
        fontSize: 16,
        fontWeight: '400',
    },
});
