import { API_BASE_URL } from '@/constants/Config';
import { useUser } from '@/context/AuthContext';
import { useReels } from '@/context/ReelContext';
import { useThemeContext } from '@/context/ThemeContext';
import * as ImagePicker from 'expo-image-picker';
import { MediaTypeOptions } from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { ArrowLeft, Camera, Image as ImageIcon, Music, Trash2, Video } from 'lucide-react-native';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

const { width } = Dimensions.get('window');

export default function CreateReelScreen() {
    const router = useRouter();
    const { user } = (useUser() || {}) as any;
    const { addNewReel } = useReels();
    const { colors, isDark } = useThemeContext();
    const insets = useSafeAreaInsets();

    const [videoUri, setVideoUri] = useState<string | null>(null);
    const [caption, setCaption] = useState('');
    const [music, setMusic] = useState('');
    const [uploading, setUploading] = useState(false);

    // Expo Video Player
    const player = useVideoPlayer(videoUri, player => {
        player.loop = true;
        player.play();
        player.muted = false;
    });

    // Request permissions
    const requestPermissions = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert(
                'Permission Required',
                'Please grant camera roll permissions to upload videos.'
            );
            return false;
        }
        return true;
    };

    // Pick video from library
    const pickVideo = async () => {
        const hasPermission = await requestPermissions();
        if (!hasPermission) return;

        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: MediaTypeOptions.Videos,
                allowsEditing: true,
                quality: 1,
                videoMaxDuration: 60,
            });

            if (!result.canceled && result.assets[0]) {
                setVideoUri(result.assets[0].uri);
            }
        } catch (error) {
            console.error('Error picking video:', error);
            Alert.alert('Error', 'Failed to pick video');
        }
    };

    // Record video with camera
    const recordVideo = async () => {
        const hasPermission = await requestPermissions();
        if (!hasPermission) return;

        try {
            const result = await ImagePicker.launchCameraAsync({
                mediaTypes: MediaTypeOptions.Videos,
                allowsEditing: true,
                quality: 1,
                videoMaxDuration: 60,
            });

            if (!result.canceled && result.assets[0]) {
                setVideoUri(result.assets[0].uri);
            }
        } catch (error) {
            console.error('Error recording video:', error);
            Alert.alert('Error', 'Failed to record video');
        }
    };

    // Upload video and create reel
    const createReel = async () => {
        if (!videoUri) {
            Alert.alert('Error', 'Please select a video');
            return;
        }

        if (!user) {
            Alert.alert('Error', 'You must be logged in to create a reel');
            return;
        }

        setUploading(true);

        try {
            // Create FormData for file upload
            const formData = new FormData();

            // Add video file
            const filename = videoUri.split('/').pop() || 'video.mp4';
            const match = /\.(\w+)$/.exec(filename);
            const type = match ? `video/${match[1]}` : 'video/mp4';

            formData.append('video', {
                uri: videoUri,
                name: filename,
                type,
            } as any);

            formData.append('caption', caption);
            formData.append('type', 'reel');
            if (music) {
                formData.append('music', music);
            }

            // Upload to backend
            const response = await fetch(`${API_BASE_URL}/api/posts/upload-reel`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${user.token}`,
                },
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
                throw new Error(errorData.message || `Upload failed with status ${response.status}`);
            }

            const newReel = await response.json();

            // Add to context
            addNewReel(newReel);

            Toast.show({
                type: 'success',
                text1: 'Reel created successfully!',
                position: 'bottom'
            });

            // Navigate immediately to Reels tab
            router.dismiss(); // Close the modal
            router.push('/(tabs)/reels');

            setVideoUri(null);
            setCaption('');
            setMusic('');
        } catch (error: any) {
            console.error('Error creating reel:', error);
            Alert.alert('Error', error.message || 'Failed to create reel. Please try again.');
        } finally {
            setUploading(false);
        }
    };

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                {/* Header */}
                <View style={[styles.header, { paddingTop: insets.top + 10, backgroundColor: isDark ? 'rgba(0,0,0,0.8)' : '#fff' }]}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <ArrowLeft size={24} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: colors.text }]}>New Reel</Text>
                    <View style={{ width: 40 }} />
                </View>

                <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}>
                    {/* Media Selection Area */}
                    {!videoUri ? (
                        <View style={styles.selectionContainer}>
                            <LinearGradient
                                colors={isDark ? ['#2A2A2A', '#1A1A1A'] : ['#F8F9FA', '#E9ECEF']}
                                style={styles.mediaPlaceholder}
                            >
                                <View style={styles.placeholderContent}>
                                    <Video size={48} color={isDark ? '#555' : '#CCC'} />
                                    <Text style={[styles.placeholderText, { color: isDark ? '#888' : '#999' }]}>
                                        Share your vibe with the world
                                    </Text>
                                </View>

                                <View style={styles.actionButtonsRow}>
                                    <TouchableOpacity style={[styles.actionButton, { backgroundColor: isDark ? '#333' : '#fff' }]} onPress={pickVideo}>
                                        <ImageIcon size={24} color={colors.primary} />
                                        <Text style={[styles.actionButtonText, { color: colors.text }]}>Gallery</Text>
                                    </TouchableOpacity>

                                    <View style={{ width: 16 }} />

                                    <TouchableOpacity style={[styles.actionButton, { backgroundColor: isDark ? '#333' : '#fff' }]} onPress={recordVideo}>
                                        <Camera size={24} color="#FF4757" />
                                        <Text style={[styles.actionButtonText, { color: colors.text }]}>Camera</Text>
                                    </TouchableOpacity>
                                </View>
                            </LinearGradient>
                        </View>
                    ) : (
                        <View style={styles.previewContainer}>
                            <View style={styles.videoWrapper}>
                                <VideoView
                                    player={player}
                                    style={styles.video}
                                    contentFit="cover"
                                    nativeControls={false}
                                />
                                <TouchableOpacity
                                    style={styles.removeButton}
                                    onPress={() => setVideoUri(null)}
                                >
                                    <Trash2 size={20} color="#fff" />
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}

                    {/* Form Fields */}
                    <View style={styles.formSection}>
                        <View style={[styles.inputGroup, { backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF', borderColor: isDark ? '#333' : '#EEE' }]}>
                            <Text style={[styles.inputLabel, { color: colors.text }]}>Caption</Text>
                            <TextInput
                                style={[styles.textInput, { color: colors.text, minHeight: 80 }]}
                                placeholder="Write a captivating caption..."
                                placeholderTextColor={isDark ? '#666' : '#999'}
                                value={caption}
                                onChangeText={setCaption}
                                multiline
                                maxLength={500}
                                textAlignVertical="top"
                            />
                            <Text style={styles.charCount}>{caption.length}/500</Text>
                        </View>

                        <View style={[styles.inputGroup, { backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF', borderColor: isDark ? '#333' : '#EEE' }]}>
                            <View style={styles.labelRow}>
                                <Music size={16} color={colors.primary} />
                                <Text style={[styles.inputLabel, { color: colors.text, marginLeft: 8 }]}>Add Music</Text>
                                <Text style={styles.optionalBadge}>(Optional)</Text>
                            </View>
                            <TextInput
                                style={[styles.textInput, { color: colors.text }]}
                                placeholder="Song name or artist..."
                                placeholderTextColor={isDark ? '#666' : '#999'}
                                value={music}
                                onChangeText={setMusic}
                                maxLength={100}
                            />
                        </View>
                    </View>
                </ScrollView>

                {/* Bottom Action Bar */}
                <View style={[styles.bottomBar, {
                    paddingBottom: insets.bottom + 10,
                    backgroundColor: isDark ? '#121212' : '#fff',
                    borderTopColor: isDark ? '#222' : '#eee'
                }]}>
                    <TouchableOpacity
                        style={[
                            styles.publishButton,
                            { backgroundColor: !videoUri || uploading ? (isDark ? '#333' : '#EEE') : colors.primary },
                        ]}
                        onPress={createReel}
                        disabled={!videoUri || uploading}
                    >
                        {uploading ? (
                            <ActivityIndicator color={!videoUri || uploading ? '#999' : '#fff'} />
                        ) : (
                            <Text style={[
                                styles.publishButtonText,
                                { color: !videoUri || uploading ? '#999' : '#fff' }
                            ]}>
                                Share Reel
                            </Text>
                        )}
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingBottom: 15,
        zIndex: 10,
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'flex-start',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingTop: 20,
    },
    selectionContainer: {
        marginBottom: 24,
        borderRadius: 24,
        overflow: 'hidden',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 5,
    },
    mediaPlaceholder: {
        height: 320,
        width: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    placeholderContent: {
        alignItems: 'center',
        marginBottom: 40,
    },
    placeholderText: {
        marginTop: 12,
        fontSize: 14,
        fontWeight: '500',
    },
    actionButtonsRow: {
        flexDirection: 'row',
        width: '100%',
        paddingHorizontal: 10,
    },
    actionButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 16,
        gap: 8,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    actionButtonText: {
        fontSize: 16,
        fontWeight: '600',
    },
    previewContainer: {
        height: 450,
        borderRadius: 24,
        overflow: 'hidden',
        marginBottom: 24,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 16,
        elevation: 8,
    },
    videoWrapper: {
        flex: 1,
        position: 'relative',
    },
    video: {
        width: '100%',
        height: '100%',
        backgroundColor: '#000',
    },
    removeButton: {
        position: 'absolute',
        top: 15,
        right: 15,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    formSection: {
        gap: 16,
    },
    inputGroup: {
        borderRadius: 16,
        borderWidth: 1,
        padding: 16,
    },
    labelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
    },
    optionalBadge: {
        fontSize: 12,
        color: '#999',
        marginLeft: 4,
    },
    textInput: {
        fontSize: 16,
        padding: 0,
    },
    charCount: {
        fontSize: 12,
        color: '#999',
        textAlign: 'right',
        marginTop: 8,
    },
    bottomBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: 20,
        paddingTop: 16,
        borderTopWidth: 1,
    },
    publishButton: {
        borderRadius: 16,
        paddingVertical: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    publishButtonText: {
        fontSize: 18,
        fontWeight: 'bold',
    },
});
