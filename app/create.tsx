import { API_BASE_URL } from '@/constants/Config';
import { useThemeContext } from '@/context/ThemeContext';
import { useUser } from '@/context/UserContext';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { Camera, Image as ImageIcon, Video, X } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Image, Keyboard, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

import CreateStoryView from '@/components/CreateStoryView';

export default function CreateScreen() {
    const { user } = useUser() || {};
    const router = useRouter();
    const { colors, isDark } = useThemeContext();
    const insets = useSafeAreaInsets();
    const styles = useMemo(() => createStyles(colors, isDark, insets), [colors, isDark, insets]);

    const [activeTab, setActiveTab] = useState<'post' | 'reel' | 'story'>('post');
    const [caption, setCaption] = useState('');
    const [selectedMedia, setSelectedMedia] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const [keyboardVisible, setKeyboardVisible] = useState(false);

    // Listen to keyboard events to hide the tab bar in Story mode
    React.useEffect(() => {
        const showSubscription = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
        const hideSubscription = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
        return () => {
            showSubscription.remove();
            hideSubscription.remove();
        };
    }, []);

    // If active tab is Story, render the full-screen Story Creator
    if (activeTab === 'story') {
        return (
            <View style={{ flex: 1 }}>
                <View style={{ flex: 1 }}>
                    <CreateStoryView onClose={() => setActiveTab('post')} />
                </View>

                {/* Floating Tab Bar for Story Mode - Hide when keyboard is open */}
                {!keyboardVisible && (
                    <View style={[styles.tabBar, { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'transparent', borderTopWidth: 0 }]}>
                        <TouchableOpacity
                            style={[styles.tabItem, activeTab === 'post' && styles.activeTab]}
                            onPress={() => setActiveTab('post')}
                        >
                            <Text style={[styles.tabText, { color: 'rgba(255,255,255,0.6)' }, activeTab === 'post' && styles.activeTabText]}>POST</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.tabItem, activeTab === 'reel' && styles.activeTab]}
                            onPress={() => setActiveTab('reel')}
                        >
                            <Text style={[styles.tabText, { color: 'rgba(255,255,255,0.6)' }, activeTab === 'reel' && styles.activeTabText]}>REEL</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.tabItem, activeTab === 'story' && styles.activeTab, { borderBottomColor: '#fff' }]}
                            onPress={() => setActiveTab('story')}
                        >
                            <Text style={[styles.tabText, { color: '#fff', fontWeight: '900' }]}>STORY</Text>
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
            aspect: [9, 16],
            quality: 0.5,
            base64: activeTab === 'post',
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
    };

    const handleShare = async () => {
        if (!selectedMedia || !user?.token) {
            alert('Please select media and make sure you are logged in');
            return;
        }

        setLoading(true);
        try {
            const endpoint = `${API_BASE_URL}/api/posts`;
            let mediaToUpload = selectedMedia;

            // console.log('📤 Starting upload...');
            // console.log('📍 Endpoint:', endpoint);
            // console.log('🎬 Media type:', activeTab);
            // console.log('📝 Caption:', caption);

            if (!mediaToUpload.startsWith('http') && !mediaToUpload.startsWith('data:')) {
                // console.log("🔄 Converting video to Base64...");
                mediaToUpload = await fileUriToBase64(selectedMedia);
                // console.log("✅ Base64 conversion complete");
            }

            // console.log("📡 Sending request to backend...");

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${user.token}`
                },
                body: JSON.stringify({
                    uri: mediaToUpload,
                    caption: caption,
                    type: activeTab === 'post' ? 'image' : 'reel'
                })
            });

            // console.log("📥 Response status:", response.status);

            if (response.ok) {
                // console.log("✅ Upload successful!");

                // Navigate to home feed (index page)
                router.replace('/(tabs)/');

                // Show success after navigation
                setTimeout(() => {
                    alert('Post created successfully! 🎉');
                }, 300);
            } else {
                const errorText = await response.text();
                console.error("❌ Upload failed:", response.status, errorText);

                let errorMessage = 'Upload failed';
                try {
                    const err = JSON.parse(errorText);
                    errorMessage = err.message || err.error || errorMessage;
                } catch {
                    errorMessage = errorText || `Error ${response.status}`;
                }

                alert(`❌ Upload Failed\n\n${errorMessage}\n\nPlease check:\n- Backend server is running\n- You are logged in\n- Media file is valid`);
            }
        } catch (e: any) {
            console.error('❌ Upload error:', e);

            let errorMsg = e.message || 'Unknown error';
            if (errorMsg.includes('Network request failed')) {
                errorMsg = 'Cannot connect to server.\n\nPlease check:\n1. Backend is running (npm run dev)\n2. Server is on port 5000\n3. Your internet connection';
            }

            alert(`❌ Error\n\n${errorMsg}`);
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
                <Text style={styles.headerTitle}>New {activeTab === 'post' ? 'Post' : 'Reel'}</Text>
                <TouchableOpacity
                    style={[styles.nextButton, (!selectedMedia || loading) && { opacity: 0.5 }]}
                    onPress={handleShare}
                    disabled={!selectedMedia || loading}
                >
                    {loading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.nextText}>Share</Text>}
                </TouchableOpacity>
            </View>

            {/* Content Area */}
            <ScrollView contentContainerStyle={styles.content}>

                {/* Media Placeholder */}
                <TouchableOpacity onPress={pickMedia} activeOpacity={0.9}>
                    <View style={styles.mediaPlaceholder}>
                        {selectedMedia ? (
                            <Image source={{ uri: selectedMedia }} style={styles.selectedImage} resizeMode="cover" />
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

            </ScrollView>

            {/* Tab Switcher (Bottom) */}
            <View style={styles.tabBar}>
                <TouchableOpacity
                    style={[styles.tabItem, activeTab === 'post' && styles.activeTab]}
                    onPress={() => { setActiveTab('post'); setSelectedMedia(null); }}
                >
                    <Text style={[styles.tabText, activeTab === 'post' && styles.activeTabText]}>POST</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tabItem, activeTab === 'reel' && styles.activeTab]}
                    onPress={() => { setActiveTab('reel'); setSelectedMedia(null); }}
                >
                    <Text style={[styles.tabText, activeTab === 'reel' && styles.activeTabText]}>REEL</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tabItem, activeTab === 'story' && styles.activeTab]}
                    onPress={() => setActiveTab('story')}
                >
                    <Text style={[styles.tabText, activeTab === 'story' && styles.activeTabText]}>STORY</Text>
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
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    closeButton: {
        padding: 4,
    },
    headerTitle: {
        color: colors.text,
        fontSize: 16,
        fontWeight: 'bold',
    },
    nextButton: {
        backgroundColor: colors.primary,
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 20,
    },
    nextText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 14,
    },
    content: {
        flex: 1,
    },
    mediaPlaceholder: {
        height: 400,
        backgroundColor: isDark ? '#111' : colors.gray,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    mediaIcons: {
        alignItems: 'center',
        gap: 12,
    },
    iconCircle: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: isDark ? '#222' : '#e0e0e0',
        alignItems: 'center',
        justifyContent: 'center',
    },
    placeholderText: {
        color: colors.textSecondary,
        fontSize: 14,
    },
    selectedImage: {
        width: '100%',
        height: '100%',
        backgroundColor: colors.gray,
    },
    cameraFab: {
        position: 'absolute',
        bottom: 16,
        right: 16,
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    inputContainer: {
        padding: 16,
    },
    input: {
        color: colors.text,
        fontSize: 16,
        minHeight: 100,
        textAlignVertical: 'top',
    },
    tabBar: {
        flexDirection: 'row',
        paddingBottom: insets.bottom || 16,
        paddingTop: 16,
        backgroundColor: colors.background,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    tabItem: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 8,
    },
    activeTab: {
        borderBottomWidth: 2,
        borderBottomColor: colors.text,
    },
    tabText: {
        color: colors.textSecondary,
        fontWeight: 'bold',
        fontSize: 14,
        letterSpacing: 1,
    },
    activeTabText: {
        color: colors.text,
    }
});
