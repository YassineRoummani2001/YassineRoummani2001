import { useUser } from '@/context/UserContext';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import {
    Image as ImageIcon,
    PaintBucket,
    Send,
    Type,
    Video as VideoIcon,
    X
} from 'lucide-react-native';
import React, { useState } from 'react';
import {
    Image,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

type Mode = 'select' | 'image' | 'video' | 'text';

const COLORS = ['#111827', '#7c3aed', '#dc2626', '#059669', '#2563eb', '#f97316', '#eab308', '#d946ef'];
const FONTS = ['System', 'Cochin', 'Helvetica', 'Georgia', 'Courier', 'Verdana'];

export default function CreateStoryView({ onClose }: { onClose: () => void }) {
    const router = useRouter();
    const { addStory } = useUser() || {};
    const [mode, setMode] = useState<Mode>('select');
    const [media, setMedia] = useState<any>(null);
    const [text, setText] = useState('');
    const [overlayText, setOverlayText] = useState('');
    const [bgColor, setBgColor] = useState(COLORS[0]);
    const [textColor, setTextColor] = useState('white');
    const [fontFamily, setFontFamily] = useState('System');
    const insets = useSafeAreaInsets();

    const player = useVideoPlayer(mode === 'video' && media ? media.uri : null, player => {
        player.loop = true;
        player.play();
    });

    /* ================= PICK MEDIA ================= */
    const pickMedia = async (type: 'image' | 'video') => {
        try {
            const res = await ImagePicker.launchImageLibraryAsync({
                mediaTypes:
                    type === 'image'
                        ? ImagePicker.MediaTypeOptions.Images
                        : ImagePicker.MediaTypeOptions.Videos,
                quality: 0.8,
            });

            if (!res.canceled) {
                const asset = res.assets[0];
                setMedia(asset);
                setMode(type);
            }
        } catch (error) {
            console.error('Error picking media:', error);
            Toast.show({ type: 'error', text1: 'Failed to pick media' });
        }
    };

    /* ================= POST ================= */
    const handlePost = async () => {
        if (!addStory) return;
        if (mode === 'text' && !text.trim()) return;
        if ((mode === 'image' || mode === 'video') && !media) return;

        try {
            let mediaUri = media?.uri;

            // Handle Web Video/Image conversion to Base64 for upload compatibility
            if (Platform.OS === 'web' && (mode === 'video' || mode === 'image')) {
                try {
                    const response = await fetch(mediaUri);
                    const blob = await response.blob();
                    const reader = new FileReader();
                    mediaUri = await new Promise((resolve, reject) => {
                        reader.onload = () => resolve(reader.result as string);
                        reader.onerror = reject;
                        reader.readAsDataURL(blob);
                    });
                } catch (e) {
                    console.error("Failed to convert media to base64", e);
                }
            }

            if (mode === 'text') {
                await addStory({
                    type: 'text',
                    content: text,
                    color: bgColor,
                    textColor,
                    fontFamily,
                });
            } else {
                await addStory({
                    type: mode,
                    uri: mediaUri,
                    content: overlayText.trim(),
                });
            }

            Toast.show({
                type: 'success',
                text1: 'Story added!',
            });

            setTimeout(() => {
                // Return to feed or close
                if (onClose) {
                    onClose();
                } else {
                    router.push('/');
                }
            }, 500);
        } catch (error) {
            console.error('Failed to post story', error);
            Toast.show({
                type: 'error',
                text1: 'Failed to add story',
            });
        }
    };

    /* ================= SELECT MODE ================= */
    if (mode === 'select') {
        return (
            <LinearGradient
                colors={['#1a1a1a', '#000000']}
                style={styles.selectWrap}
            >
                <StatusBar barStyle="light-content" />

                {/* Header Area */}
                <View style={{ paddingTop: insets.top, paddingHorizontal: 20 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
                        {/* Close Button */}
                        {onClose && (
                            <TouchableOpacity style={styles.iconButtonBlur} onPress={onClose}>
                                <X color="white" size={24} />
                            </TouchableOpacity>
                        )}
                        <View style={{ width: 40 }} />
                    </View>

                    <View style={[styles.headerContainer, { marginTop: 40 }]}>
                        <Text style={styles.title}>Create Story</Text>
                        <Text style={styles.subtitle}>Share your moment</Text>
                    </View>
                </View>

                {/* Main Action Area - Bottom Center */}
                <View style={[styles.actionContainer, { paddingBottom: insets.bottom + 120 }]}>

                    {/* Text Mode */}
                    <TouchableOpacity
                        style={styles.actionItem}
                        onPress={() => setMode('text')}
                        activeOpacity={0.7}
                    >
                        <View style={[styles.actionIcon, { backgroundColor: '#8B5CF6' }]}>
                            <Type color="white" size={28} />
                        </View>
                        <Text style={styles.actionLabel}>Text</Text>
                    </TouchableOpacity>

                    {/* Image Mode */}
                    <TouchableOpacity
                        style={styles.actionItem}
                        onPress={() => pickMedia('image')}
                        activeOpacity={0.7}
                    >
                        <View style={[styles.actionIcon, { backgroundColor: '#3B82F6' }]}>
                            <ImageIcon color="white" size={28} />
                        </View>
                        <Text style={styles.actionLabel}>Photo</Text>
                    </TouchableOpacity>

                    {/* Video Mode */}
                    <TouchableOpacity
                        style={styles.actionItem}
                        onPress={() => pickMedia('video')}
                        activeOpacity={0.7}
                    >
                        <View style={[styles.actionIcon, { backgroundColor: '#EC4899' }]}>
                            <VideoIcon color="white" size={28} />
                        </View>
                        <Text style={styles.actionLabel}>Video</Text>
                    </TouchableOpacity>

                </View>
            </LinearGradient>
        );
    }

    /* ================= TEXT STORY ================= */
    if (mode === 'text') {
        return (
            <View style={{ flex: 1, backgroundColor: bgColor }}>
                <StatusBar hidden />
                {/* Header Actions */}
                <View style={[styles.textHeader, { paddingTop: insets.top + 10 }]}>
                    <TouchableOpacity onPress={() => setMode('select')} style={styles.iconButton}>
                        <X color="white" size={28} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handlePost} style={styles.postButton}>
                        <Text style={styles.postButtonText}>Post</Text>
                        <Send size={16} color="black" />
                    </TouchableOpacity>
                </View>

                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={{ flex: 1 }}
                >
                    <View style={styles.textCanvas}>
                        <TextInput
                            placeholder="Type something..."
                            placeholderTextColor="rgba(255,255,255,0.5)"
                            value={text}
                            onChangeText={setText}
                            multiline
                            style={[styles.textInput, { color: textColor, fontFamily }]}
                            autoFocus
                            textAlignVertical="center"
                        />
                    </View>

                    {/* Toolbar - Pushed up by Keyboard */}
                    <View style={styles.toolbarContainer}>
                        {/* Font Picker */}
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.fontRow} contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}>
                            {FONTS.map(f => (
                                <TouchableOpacity
                                    key={f}
                                    style={[styles.fontBtn, fontFamily === f && styles.fontBtnActive]}
                                    onPress={() => setFontFamily(f)}
                                >
                                    <Text style={[
                                        styles.fontBtnText,
                                        { fontFamily: f },
                                        fontFamily === f && { color: 'black' }
                                    ]}>{f}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        {/* Color Pickers */}
                        <View style={{ gap: 12, marginTop: 12 }}>
                            {/* Text Color */}
                            <View style={styles.pickerRow}>
                                <View style={styles.iconBadge}>
                                    <Type size={14} color="white" />
                                </View>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 10, gap: 12 }}>
                                    {COLORS.map(c => (
                                        <TouchableOpacity
                                            key={c}
                                            style={[styles.colorDot, { backgroundColor: c }, textColor === c && styles.colorDotActive]}
                                            onPress={() => setTextColor(c)}
                                        />
                                    ))}
                                </ScrollView>
                            </View>

                            {/* Background Color */}
                            <View style={styles.pickerRow}>
                                <View style={styles.iconBadge}>
                                    <PaintBucket size={14} color="white" />
                                </View>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 10, gap: 12 }}>
                                    {COLORS.map(c => (
                                        <TouchableOpacity
                                            key={c}
                                            style={[styles.colorDot, { backgroundColor: c }, bgColor === c && styles.colorDotActive]}
                                            onPress={() => setBgColor(c)}
                                        />
                                    ))}
                                </ScrollView>
                            </View>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </View>
        );
    }

    /* ================= MEDIA PREVIEW ================= */
    return (
        <KeyboardAvoidingView
            style={{ flex: 1, backgroundColor: 'black' }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <StatusBar hidden />
            <View style={{ position: 'absolute', top: insets.top + 10, left: 20, zIndex: 100 }}>
                <TouchableOpacity style={styles.iconButtonBlur} onPress={() => setMode('select')}>
                    <X color="white" size={24} />
                </TouchableOpacity>
            </View>

            <View style={styles.mediaContainer}>
                {mode === 'image' && media && (
                    <Image source={{ uri: media.uri }} style={styles.media} resizeMode="cover" />
                )}
                {mode === 'video' && media && (
                    <VideoView
                        player={player}
                        style={styles.media}
                        contentFit="cover"
                        nativeControls={false}
                    />
                )}

                {/* Overlay Interface */}
                <View style={styles.previewOverlay}>
                    <TextInput
                        value={overlayText}
                        onChangeText={setOverlayText}
                        placeholder="Add a caption..."
                        placeholderTextColor="rgba(255,255,255,0.8)"
                        style={styles.captionInput}
                        multiline
                        textAlignVertical="center"
                    />
                </View>
            </View>

            {/* Bottom Bar - Rides up with keyboard */}
            <View style={[styles.bottomBarStatic, { paddingBottom: insets.bottom + 20 }]}>
                <TouchableOpacity style={styles.storyBtn} onPress={handlePost}>
                    <Text style={styles.storyText}>Your Story</Text>
                    <Send size={16} color="black" style={{ marginLeft: 8 }} />
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}

/* ================= STYLES ================= */
const styles = StyleSheet.create({
    selectWrap: {
        flex: 1,
    },
    headerContainer: {
        paddingHorizontal: 10,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: 'white',
        letterSpacing: 0.5
    },
    subtitle: {
        fontSize: 16,
        color: 'rgba(255,255,255,0.6)',
        marginTop: 8
    },
    actionContainer: {
        flexDirection: 'row',
        justifyContent: 'space-evenly',
        alignItems: 'center',
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: 20
    },
    actionItem: {
        alignItems: 'center',
        gap: 12
    },
    actionIcon: {
        width: 70,
        height: 70,
        borderRadius: 25,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 8,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)'
    },
    actionLabel: {
        color: 'white',
        fontWeight: '600',
        fontSize: 14,
        letterSpacing: 0.5
    },
    iconButtonBlur: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.1)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    textHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingBottom: 20,
        zIndex: 10
    },
    textCanvas: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    textInput: {
        width: '90%',
        fontSize: 38,
        fontWeight: 'bold',
        textAlign: 'center',
        textShadowColor: 'rgba(0,0,0,0.3)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
        padding: 20
    },
    toolbarContainer: {
        paddingVertical: 20,
        paddingBottom: Platform.OS === 'ios' ? 40 : 20,
        backgroundColor: 'rgba(0,0,0,0.2)'
    },
    iconButton: {
        width: 44,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 22,
        backgroundColor: 'rgba(0,0,0,0.2)'
    },
    postButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        gap: 6
    },
    postButtonText: {
        fontWeight: 'bold',
        color: 'black',
        fontSize: 14
    },
    fontRow: { maxHeight: 50 },
    fontBtn: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)',
        marginRight: 8
    },
    fontBtnActive: {
        backgroundColor: 'white',
        borderColor: 'white'
    },
    fontBtnText: {
        color: 'white',
        fontWeight: '600',
        fontSize: 12
    },
    colorDot: {
        width: 32,
        height: 32,
        borderRadius: 16,
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.5)',
        marginRight: 8
    },
    colorDotActive: {
        borderColor: 'white',
        transform: [{ scale: 1.2 }]
    },
    pickerRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconBadge: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 20
    },
    previewWrap: { flex: 1, backgroundColor: 'black' },
    mediaContainer: {
        flex: 1,
        position: 'relative',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden'
    },
    previewOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.2)'
    },
    captionInput: {
        width: '90%',
        color: 'white',
        fontSize: 24,
        fontWeight: 'bold',
        textAlign: 'center',
        textShadowColor: 'black',
        textShadowRadius: 10,
        textShadowOffset: { width: 0, height: 2 },
        padding: 20
    },
    bottomBarStatic: {
        width: '100%',
        padding: 20,
        alignItems: 'flex-end',
        justifyContent: 'center',
        backgroundColor: 'black'
    },
    storyBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        paddingHorizontal: 24,
        paddingVertical: 14,
        borderRadius: 30,
        elevation: 5
    },
    storyText: { fontWeight: 'bold', color: 'black', fontSize: 15 },
    media: { width: '100%', height: '100%' },
});
