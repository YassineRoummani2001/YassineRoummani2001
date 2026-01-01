import { API_BASE_URL } from '@/constants/Config';
import { useThemeContext } from '@/context/ThemeContext';
import { useUser } from '@/context/UserContext';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation, useRouter } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Camera, Image as ImageIcon, Video, X } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Image, Keyboard, KeyboardAvoidingView, Platform, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import CreateStoryView from '@/components/CreateStoryView';

export default function CreateScreen() {
    const context = useUser();
    const user = (context as any)?.user;
    const router = useRouter();
    const navigation = useNavigation();
    const { colors, isDark } = useThemeContext();
    const insets = useSafeAreaInsets();
    const styles = useMemo(() => createStyles(colors, isDark, insets), [colors, isDark, insets]);

    // Hide the main tab bar when this screen is active
    React.useLayoutEffect(() => {
        navigation.setOptions({
            tabBarStyle: { display: 'none' },
        });
        return () => {
            // Reset to default style when leaving
            navigation.setOptions({
                tabBarStyle: undefined,
            });
        };
    }, [navigation]);

    const [activeTab, setActiveTab] = useState<'post' | 'reel' | 'story'>('post');
    const [caption, setCaption] = useState('');
    const [music, setMusic] = useState('');
    const [selectedMedia, setSelectedMedia] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const [keyboardVisible, setKeyboardVisible] = useState(false);

    // Video Player hooks for Reel Preview
    const videoPlayer = useVideoPlayer(selectedMedia, player => {
        player.loop = true;
        // Auto-play if it's a video and we are in reel mode
        if (activeTab === 'reel' && selectedMedia) {
            player.play();
        }
    });

    // Listen to keyboard events to hide the tab bar in Story mode
    React.useEffect(() => {
        const showSubscription = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
        const hideSubscription = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
        return () => {
            showSubscription.remove();
            hideSubscription.remove();
        };
    }, []);

    // If activeTab === 'story', render the full-screen Story Creator component
    if (activeTab === 'story') {
        return (
            <View style={{ flex: 1, backgroundColor: 'black' }}>
                <CreateStoryView onClose={() => setActiveTab('post')} />

                {/* Floating Tab Bar for Story Mode - ONLY visible if keyboard is NOT visible */}
                {!keyboardVisible && (
                    <View style={[styles.tabBar, { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'transparent', borderTopWidth: 0 }]}>
                        <TouchableOpacity
                            style={[styles.tabItem]}
                            onPress={() => setActiveTab('post')}
                        >
                            <Text style={[styles.tabText, { color: 'rgba(255,255,255,0.6)' }]}>POST</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.tabItem]}
                            onPress={() => setActiveTab('reel')}
                        >
                            <Text style={[styles.tabText, { color: 'rgba(255,255,255,0.6)' }]}>REEL</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.tabItem]}
                            onPress={() => setActiveTab('story')}
                        >
                            <Text style={[styles.tabText, { color: '#fff', fontWeight: '900', textShadowColor: 'black', textShadowRadius: 2 }]}>STORY</Text>
                            <View style={[styles.activeIndicator, { backgroundColor: '#fff' }]} />
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        );
    }

    const pickMedia = async () => {
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: activeTab === 'post'
                ? ImagePicker.MediaTypeOptions.Images
                : ImagePicker.MediaTypeOptions.Videos,
            allowsEditing: true,
            aspect: activeTab === 'post' ? [4, 5] : [9, 16],
            quality: activeTab === 'post' ? 0.5 : 1,
            videoMaxDuration: 60,
            base64: activeTab === 'post', // Only need base64 for posts (JSON upload)
        });

        if (!result.canceled) {
            if (activeTab === 'post' && result.assets[0].base64) {
                const uri = `data:${result.assets[0].mimeType || 'image/jpeg'};base64,${result.assets[0].base64}`;
                setSelectedMedia(uri);
            } else {
                setSelectedMedia(result.assets[0].uri);
            }
        }
    };

    const fileUriToBase64 = async (uri: string): Promise<string> => {
        if (Platform.OS === 'web') {
            try {
                const response = await fetch(uri);
                const blob = await response.blob();

                return new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result as string);
                    reader.onerror = reject;
                    reader.readAsDataURL(blob);
                });
            } catch (error) {
                console.error("Base64 conversion error:", error);
                throw error;
            }
        } else {
            try {
                const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
                // Simple guess based on common image types since we only use this for Post images
                return `data:image/jpeg;base64,${base64}`;
            } catch (error) {
                console.error("Native Base64 conversion error:", error);
                throw error;
            }
        }
    };

    const handleShare = async () => {
        if (!selectedMedia || !user?.token) {
            alert('Please select media and make sure you are logged in');
            return;
        }

        setLoading(true);
        try {
            if (activeTab === 'reel') {
                // --- REEL UPLOAD (FormData) ---
                const formData = new FormData();
                const filename = selectedMedia.split('/').pop() || 'video.mp4';
                const match = /\.(\w+)$/.exec(filename);
                const type = match ? `video/${match[1]}` : 'video/mp4';

                // @ts-ignore
                formData.append('video', {
                    uri: selectedMedia,
                    name: filename,
                    type,
                });
                formData.append('caption', caption);
                formData.append('type', 'reel');
                if (music) {
                    formData.append('music', music);
                }

                console.log('📤 Uploading Reel...');
                const response = await fetch(`${API_BASE_URL}/api/posts/upload-reel`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${user.token}`,
                        // 'Content-Type': 'multipart/form-data', // Usually handled automatically by fetch with FormData
                    },
                    body: formData,
                });

                if (response.ok) {
                    router.replace('/(tabs)/' as any);
                    setTimeout(() => alert('Reel created successfully! 🎉'), 300);
                } else {
                    const errorText = await response.text();
                    try {
                        const errJson = JSON.parse(errorText);
                        alert(`❌ Upload Failed: ${errJson.message}`);
                    } catch (e) {
                        alert(`❌ Upload Failed\n\n${errorText}`);
                    }
                }

            } else {
                // --- POST UPLOAD (JSON) ---
                const endpoint = `${API_BASE_URL}/api/posts`;
                let mediaToUpload = selectedMedia;

                console.log('📤 Uploading Post...');
                if (!mediaToUpload.startsWith('http') && !mediaToUpload.startsWith('data:')) {
                    // Fallback if needed, though we try to get base64 from picker
                    console.log("🔄 Converting to Base64...");
                    mediaToUpload = await fileUriToBase64(selectedMedia);
                }

                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${user.token}`
                    },
                    body: JSON.stringify({
                        uri: mediaToUpload,
                        caption: caption,
                        type: 'image'
                    })
                });

                if (response.ok) {
                    router.replace('/(tabs)/' as any);
                    setTimeout(() => alert('Post created successfully! 🎉'), 300);
                } else {
                    const errorText = await response.text();
                    alert(`❌ Upload Failed\n\n${errorText}`);
                }
            }
        } catch (e: any) {
            console.error('❌ Upload error:', e);
            alert(`❌ Error\n\n${e.message}`);
        } finally {
            setLoading(false);
        }
    };


    return (
        <View style={styles.container}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
                    <X size={24} color={colors.text} />
                </TouchableOpacity>

                <View style={styles.headerCenter}>
                    <Text style={styles.headerTitle}>New {activeTab === 'post' ? 'Post' : 'Reel'}</Text>
                </View>

                <TouchableOpacity
                    style={[styles.nextButton, (!selectedMedia || loading) && { opacity: 0.5 }]}
                    onPress={handleShare}
                    disabled={!selectedMedia || loading}
                >
                    {loading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.nextText}>Share</Text>}
                </TouchableOpacity>
            </View>

            {/* Content Area */}
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
            >
                <ScrollView contentContainerStyle={styles.content}>

                    {/* Media Placeholder */}
                    <TouchableOpacity onPress={pickMedia} activeOpacity={0.9}>
                        <View style={styles.mediaPlaceholder}>
                            {selectedMedia ? (
                                activeTab === 'reel' ? (
                                    <View style={{ width: '100%', height: '100%' }}>
                                        <VideoView
                                            player={videoPlayer}
                                            style={{ width: '100%', height: '100%' }}
                                            contentFit="cover"
                                            nativeControls={false}
                                        />
                                        {/* Overlay Play Icon to indicate interaction? No, auto-play ideally. */}
                                    </View>
                                ) : (
                                    <Image source={{ uri: selectedMedia }} style={styles.selectedImage} resizeMode="cover" />
                                )
                            ) : (
                                <>
                                    <View style={styles.mediaIcons}>
                                        <View style={styles.iconCircle}>
                                            {activeTab === 'post' ? (
                                                <ImageIcon size={32} color={colors.textSecondary} />
                                            ) : (
                                                <Video size={32} color={colors.textSecondary} />
                                            )}
                                        </View>
                                        <Text style={styles.placeholderText}>
                                            Tap to select {activeTab === 'post' ? 'photos' : 'videos'}
                                        </Text>
                                    </View>
                                    <View style={styles.cameraFab}>
                                        <Camera size={24} color="#fff" />
                                    </View>
                                </>
                            )}
                        </View>
                    </TouchableOpacity>

                    {/* Caption Input */}
                    <View style={styles.inputContainer}>
                        <TextInput
                            style={styles.input}
                            placeholder="Write a caption..."
                            placeholderTextColor={colors.textSecondary}
                            multiline
                            value={caption}
                            onChangeText={setCaption}
                        />
                    </View>

                    {/* Music Input (Reels Only) */}
                    {activeTab === 'reel' && (
                        <View style={[styles.inputContainer, { paddingTop: 0 }]}>
                            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Music (Optional)</Text>
                            <TextInput
                                style={styles.singleInput}
                                placeholder="Add song name..."
                                placeholderTextColor={colors.textSecondary}
                                value={music}
                                onChangeText={setMusic}
                            />
                        </View>
                    )}

                </ScrollView>
            </KeyboardAvoidingView>

            {/* Tab Switcher (Bottom) */}
            <View style={styles.tabBar}>
                <TouchableOpacity
                    style={styles.tabItem}
                    onPress={() => { setActiveTab('post'); setSelectedMedia(null); setCaption(''); }}
                >
                    <Text style={[styles.tabText, activeTab === 'post' && styles.activeTabText]}>POST</Text>
                    {activeTab === 'post' && <View style={styles.activeIndicator} />}
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.tabItem}
                    onPress={() => { setActiveTab('reel'); setSelectedMedia(null); setCaption(''); }}
                >
                    <Text style={[styles.tabText, activeTab === 'reel' && styles.activeTabText]}>REEL</Text>
                    {activeTab === 'reel' && <View style={styles.activeIndicator} />}
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.tabItem}
                    onPress={() => setActiveTab('story')}
                >
                    <Text style={[styles.tabText]}>STORY</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const createStyles = (colors: any, isDark: boolean, insets: any) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
        paddingTop: insets.top,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        height: 56,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        position: 'relative',
    },
    closeButton: {
        padding: 4,
        zIndex: 10,
    },
    headerCenter: {
        position: 'absolute',
        left: 0,
        right: 0,
        alignItems: 'center',
        justifyContent: 'center',
        bottom: 12, // Align with vertical padding
        height: 32, // Height of the text area
    },
    headerTitle: {
        color: colors.text,
        fontSize: 17,
        fontWeight: 'bold',
    },
    nextButton: {
        backgroundColor: colors.primary,
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 20,
        marginLeft: 'auto',
        zIndex: 10,
    },
    nextText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 14,
    },
    content: {
        flex: 1,
        paddingBottom: 140, // Extra padding for safe scrolling on all devices
    },
    mediaPlaceholder: {
        height: 400,
        backgroundColor: isDark ? '#1C1C1E' : colors.gray,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
    },
    mediaIcons: {
        alignItems: 'center',
        gap: 12,
    },
    iconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: isDark ? '#2C2C2E' : '#e0e0e0',
        alignItems: 'center',
        justifyContent: 'center',
    },
    placeholderText: {
        color: colors.textSecondary,
        fontSize: 15,
        fontWeight: '500',
    },
    selectedImage: {
        width: '100%',
        height: '100%',
        backgroundColor: colors.gray,
    },
    cameraFab: {
        position: 'absolute',
        bottom: 20,
        right: 20,
        width: 54,
        height: 54,
        borderRadius: 27,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 5,
    },
    inputContainer: {
        padding: 20,
        marginBottom: 20,
    },
    input: {
        color: colors.text,
        fontSize: 16,
        minHeight: 120,
        textAlignVertical: 'top',
        lineHeight: 22,
    },
    singleInput: {
        color: colors.text,
        fontSize: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    inputLabel: {
        marginBottom: 8,
        fontSize: 13,
        fontWeight: '600',
    },
    tabBar: {
        flexDirection: 'row',
        paddingBottom: insets.bottom > 0 ? insets.bottom : 20,
        paddingTop: 16,
        backgroundColor: colors.background,
    },
    tabItem: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
    },
    tabText: {
        color: colors.textSecondary,
        fontWeight: 'bold',
        fontSize: 13,
        letterSpacing: 1,
        textTransform: 'uppercase',
        marginBottom: 4,
    },
    activeTabText: {
        color: colors.text,
    },
    activeIndicator: {
        height: 2,
        backgroundColor: colors.text,
        width: 40,
        marginTop: 4,
        borderRadius: 1,
    }
});
