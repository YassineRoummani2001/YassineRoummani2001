import { Colors } from '@/constants/Colors';
import { API_BASE_URL } from '@/constants/Config';
import { useUser } from '@/context/UserContext';
import { Audio } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import {
    Heart,
    MessageCircle,
    MoreHorizontal,
    Music,
    Play,
    Plus,
    Share2,
    Volume2,
    VolumeX
} from 'lucide-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    Image,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import CommentsModal from './CommentsModal';
import ReelOptionsModal from './ReelOptionsModal';
import ShareToUsersModal from './ShareToUsersModal';
import VideoProgressBar from './VideoProgressBar';

// Helper to construct valid URIs
const getValidUri = (uri?: string) => {
    if (!uri) return '';

    // If it's an HTTP URL, check if it points to our backend (localhost or local IP) and needs updating
    if (uri.startsWith('http')) {
        if (uri.includes('localhost:5000') || (uri.includes('192.168.') && uri.includes(':5000'))) {
            // Replace the origin with current API_BASE_URL to handle IP changes
            const pathPart = uri.split(':5000')[1];
            return `${API_BASE_URL}${pathPart}`;
        }
        return uri;
    }

    if (uri.startsWith('data:') || uri.startsWith('file:')) return uri;

    // Handle relative paths
    return `${API_BASE_URL}${uri.startsWith('/') ? '' : '/'}${uri}`;
};

interface ReelItemProps {
    item: any;
    active: boolean;
    width: number;
    height: number;
}

export default function ReelItem({ item, active, width, height }: ReelItemProps) {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { user } = (useUser() || {}) as any;

    const videoUri = getValidUri(item.videoUri || item.uri);
    const author = item.user || {};
    const avatarUri = getValidUri(author.avatar);

    const [webVideoUrl, setWebVideoUrl] = useState<string | null>(null);

    const [paused, setPaused] = useState(false);
    const [isLoaded, setIsLoaded] = useState(false);
    const [isBuffering, setIsBuffering] = useState(true);
    const [hasError, setHasError] = useState(false);
    const [muted, setMuted] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(1);

    // Validate video URI
    if (!videoUri || videoUri.trim() === '') {
        return (
            <View style={styles.container}>
                <Text style={{ color: '#fff', textAlign: 'center' }}>Video unavailable</Text>
            </View>
        );
    }

    // Check if it's an image or audio mistakenly passed as video
    const isImage = videoUri.match(/\.(jpeg|jpg|png|gif|webp)$/i);
    const isAudio = videoUri.match(/\.(mp3|m4a|wav|aac)$/i);

    if (isImage || isAudio) {
        // Fallback for non-video content if somehow passed to ReelItem
        return (
            <View style={[styles.container, { width, height, justifyContent: 'center', alignItems: 'center' }]}>
                {isImage ? (
                    <Image source={{ uri: videoUri }} style={{ width, height, resizeMode: 'cover' }} />
                ) : (
                    <View style={{ alignItems: 'center', gap: 10 }}>
                        <Music size={48} color="white" />
                        <Text style={{ color: 'white' }}>Audio content</Text>
                    </View>
                )}
                <View style={styles.rightActions}>
                    {/* Render limited actions for non-video fallback */}
                </View>
                {/* Still show bottom info */}
                <View style={[styles.bottomInfo, { bottom: insets.bottom + 100 }]}>
                    <Text style={styles.username}>@{author.name || 'Unknown'}</Text>
                    <Text style={styles.caption} numberOfLines={2}>{item.caption || ''}</Text>
                </View>
            </View>
        );
    }

    // Initialize Video Player (expo-video)
    const player = useVideoPlayer(videoUri, player => {
        player.loop = true;
        player.muted = muted;
    });

    // Handle Active/Paused State
    useEffect(() => {
        if (active && !paused) {
            player.play();
        } else {
            player.pause();
        }
    }, [active, paused, player]);

    // Handle Mute State
    useEffect(() => {
        player.muted = muted;
    }, [muted, player]);

    // Handle Events (Buffering, Loading, TimeUpdates)
    useEffect(() => {
        const subscription = player.addListener('statusChange', (status) => {
            setIsLoaded(status.status === 'readyToPlay');

            if (status.status === 'error') {
                // Suppress "Cannot Open" noise unless critical, or handle gracefully
                if (status.error?.message?.includes('Cannot Open')) {
                    console.warn('⚠️ Video playback failed (Cannot Open):', videoUri);
                } else {
                    console.error('❌ Video error:', status.error);
                }
                setHasError(true);
                setIsBuffering(false);
            }

            if (status.status === 'readyToPlay') {
                setIsBuffering(false);
                setHasError(false);
            }
        });

        // Create interval for progress bar updates
        const interval = setInterval(() => {
            if (player.currentTime && player.duration) {
                setCurrentTime(player.currentTime * 1000);
                setDuration(player.duration * 1000);
            }
        }, 500);

        return () => {
            subscription.remove();
            clearInterval(interval);
        }
    }, [player, videoUri]);


    // Convert base64 to Blob URL for Web
    useEffect(() => {
        if (Platform.OS !== 'web' || !videoUri) return;

        if (videoUri.includes('base64') || videoUri.startsWith('data:')) {
            try {
                const base64Data = videoUri.split(',')[1] || videoUri;
                const mimeMatch = videoUri.match(/data:([^;]+);/);
                const mimeType = mimeMatch ? mimeMatch[1] : 'video/mp4';

                const binaryString = atob(base64Data);
                const bytes = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                }

                const blob = new Blob([bytes], { type: mimeType });
                const blobUrl = URL.createObjectURL(blob);
                setWebVideoUrl(blobUrl);
            } catch (error) {
                console.error('Failed to convert base64 to Blob:', error);
                setHasError(true);
                setIsBuffering(false);
            }
        } else if (videoUri.startsWith('http://') || videoUri.startsWith('https://')) {
            setWebVideoUrl(videoUri);
        } else {
            console.error('Invalid video URI format:', videoUri);
            setHasError(true);
            setIsBuffering(false);
        }

        return () => {
            if (webVideoUrl && webVideoUrl.startsWith('blob:')) {
                URL.revokeObjectURL(webVideoUrl);
            }
        };
    }, [videoUri]);

    const [liked, setLiked] = useState<boolean>(() => {
        if (Array.isArray(item.likes) && user?._id) return item.likes.includes(user._id);
        return false;
    });
    const [likesCount, setLikesCount] = useState<number>(() => {
        if (Array.isArray(item.likes)) return item.likes.length;
        return item.likes || 0;
    });

    const [commentsCount, setCommentsCount] = useState<number>(() => {
        if (Array.isArray(item.comments)) return item.comments.length;
        return item.comments || 0;
    });

    const [isFollowing, setIsFollowing] = useState<boolean>(() => {
        if (!user || !user.following || !author || !author._id) return false;
        return user.following.some((f: any) => (typeof f === 'string' ? f : f._id) === author._id);
    });

    const [showComments, setShowComments] = useState(false);
    const [showOptions, setShowOptions] = useState(false);
    const [showShare, setShowShare] = useState(false);

    const scaleAnim = useRef(new Animated.Value(1)).current;
    const rotateAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Audio.setAudioModeAsync({
            playsInSilentModeIOS: true,
            staysActiveInBackground: false,
            shouldDuckAndroid: true,
        });
    }, []);

    useEffect(() => {
        if (active && !paused && isLoaded) {
            Animated.loop(
                Animated.timing(rotateAnim, {
                    toValue: 1,
                    duration: 3000,
                    useNativeDriver: true,
                })
            ).start();
        } else {
            rotateAnim.stopAnimation();
        }
    }, [active, paused, isLoaded]);

    const spin = rotateAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });

    const toggleLike = useCallback(async () => {
        if (!user) return;

        const newState = !liked;
        setLiked(newState);
        setLikesCount((prev) => (newState ? prev + 1 : prev - 1));

        Animated.sequence([
            Animated.timing(scaleAnim, { toValue: 1.3, duration: 100, useNativeDriver: true }),
            Animated.timing(scaleAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
        ]).start();

        try {
            await fetch(`${API_BASE_URL}/api/posts/${item._id || item.id}/like`, {
                method: 'PUT',
                headers: { Authorization: `Bearer ${user.token}` },
            });
        } catch (error) {
            setLiked(!newState);
            setLikesCount((prev) => (newState ? prev - 1 : prev + 1));
        }
    }, [user, liked, item._id, item.id]);

    const toggleFollow = useCallback(async () => {
        if (!user || user._id === author._id) return;

        setIsFollowing((prev) => !prev);

        try {
            await fetch(`${API_BASE_URL}/api/users/${author._id}/follow`, {
                method: 'PUT',
                headers: { Authorization: `Bearer ${user.token}` },
            });
        } catch (error) {
            setIsFollowing((prev) => !prev);
            console.error('Follow request failed:', error);
        }
    }, [user, author._id]);

    const handleSeek = useCallback((position: number) => {
        if (player) {
            player.currentTime = position / 1000; // expo-video uses seconds
        }
    }, [player]);


    const handleSaveReel = async () => {
        if (!user) return;
        try {
            const response = await fetch(`${API_BASE_URL}/api/posts/${item._id || item.id}/save`, {
                method: 'PUT',
                headers: { Authorization: `Bearer ${user.token}` },
            });

            if (response.ok) {
                const data = await response.json();
                // We could use Toast here if available, but alert is fine for now
                alert(data.isSaved ? 'Reel saved to collection!' : 'Reel removed from collection.');
            } else {
                alert('Failed to save reel.');
            }
            setShowOptions(false);
        } catch (error) {
            console.error('Failed to save reel', error);
            alert('Error saving reel');
            setShowOptions(false);
        }
    };

    return (
        <View style={[styles.container, { width, height }]}>
            {/* ... (rest of the view structure remains same, just updating the Modal below) ... */}

            {/* VIDEO PLAYER + PLAY/PAUSE OVERLAY */}
            <View style={StyleSheet.absoluteFill}>
                {Platform.OS === 'web' ? (
                    webVideoUrl && (
                        <video
                            ref={(ref: any) => {
                                if (ref) {
                                    if (active && !paused && isLoaded) {
                                        ref.play().catch(() => { });
                                    } else {
                                        ref.pause();
                                    }
                                }
                            }}
                            src={webVideoUrl}
                            style={{ width: '100%', height: '100%', objectFit: 'cover', backgroundColor: '#000' }}
                            loop
                            playsInline
                            muted={muted}
                            onPlay={() => setPaused(false)}
                            onPause={() => setPaused(true)}
                            onLoadedData={() => {
                                setIsLoaded(true);
                                setIsBuffering(false);
                            }}
                            onError={() => {
                                setHasError(true);
                                setIsBuffering(false);
                            }}
                        />
                    )
                ) : (
                    <VideoView
                        player={player}
                        style={StyleSheet.absoluteFill}
                        contentFit="cover"
                        nativeControls={false}
                    />
                )}

                {/* PLAY/PAUSE BUTTON */}
                <TouchableOpacity
                    activeOpacity={1}
                    onPress={() => setPaused(!paused)}
                    style={styles.playPauseOverlay}
                >
                    {paused && (
                        <View style={styles.pauseIconContainer}>
                            <Play size={64} color="white" fill="white" strokeWidth={1.5} />
                        </View>
                    )}
                </TouchableOpacity>
            </View>

            {/* LOADING INDICATOR */}
            {(isBuffering || !isLoaded) && active && !hasError && (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="white" />
                </View>
            )}

            {/* ERROR */}
            {hasError && active && (
                <View style={styles.center}>
                    <Text style={styles.errorText}>⚠️</Text>
                    <Text style={styles.errorMessage}>Video failed to load</Text>
                    <Text style={styles.errorHint}>Swipe to next reel</Text>
                </View>
            )}

            {/* MUTE BUTTON */}
            {active && isLoaded && !hasError && (
                <TouchableOpacity
                    style={styles.muteButton}
                    onPress={() => setMuted(!muted)}
                    activeOpacity={0.7}
                >
                    {muted ? <VolumeX size={20} color="white" strokeWidth={2.5} /> : <Volume2 size={20} color="white" strokeWidth={2.5} />}
                </TouchableOpacity>
            )}

            {/* BOTTOM GRADIENT */}
            <LinearGradient colors={['transparent', 'rgba(0,0,0,0.8)']} style={styles.gradient} />

            {/* RIGHT ACTIONS */}
            <View style={styles.rightActions}>
                <View style={{ marginBottom: 8, alignItems: 'center' }}>
                    <TouchableOpacity onPress={() => router.push(`/user/${author._id}`)}>
                        <View style={styles.avatar}>
                            {avatarUri ? (
                                Platform.OS === 'web' ? (
                                    <img
                                        src={avatarUri}
                                        alt={author.name}
                                        style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                                    />
                                ) : (
                                    <Image
                                        source={{ uri: avatarUri }}
                                        style={styles.avatarImage}
                                    />
                                )
                            ) : (
                                <Text style={styles.avatarText}>{author.name?.charAt(0)?.toUpperCase() || '?'}</Text>
                            )}
                        </View>
                    </TouchableOpacity>
                    {!isFollowing && user?._id !== author._id && (
                        <TouchableOpacity style={styles.followBadge} onPress={toggleFollow} activeOpacity={0.8}>
                            <Plus size={14} color="white" strokeWidth={3} />
                        </TouchableOpacity>
                    )}
                </View>

                <TouchableOpacity onPress={toggleLike} style={styles.actionButton}>
                    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
                        <Heart size={32} color={liked ? '#ff2d55' : 'white'} fill={liked ? '#ff2d55' : 'transparent'} strokeWidth={2} />
                    </Animated.View>
                    <Text style={styles.actionText}>{likesCount}</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => setShowComments(true)} style={styles.actionButton}>
                    <MessageCircle size={32} color="white" strokeWidth={2} />
                    <Text style={styles.actionText}>{commentsCount}</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => setShowShare(true)} style={styles.actionButton}>
                    <Share2 size={32} color="white" strokeWidth={2} />
                </TouchableOpacity>

                <TouchableOpacity onPress={() => setShowOptions(true)} style={styles.actionButton}>
                    <MoreHorizontal size={32} color="white" strokeWidth={2} />
                </TouchableOpacity>

                <Animated.View style={[styles.musicDisc, { transform: [{ rotate: spin }] }]}>
                    <View style={styles.musicDiscInner}>
                        <Music size={14} color="white" />
                    </View>
                </Animated.View>
            </View>

            {/* BOTTOM INFO */}
            <View style={[styles.bottomInfo, { bottom: insets.bottom + 100 }]}>
                <Text style={styles.username}>@{author.name || 'Unknown'}</Text>
                <Text style={styles.caption} numberOfLines={2}>{item.caption || ''}</Text>
                {item.music && (
                    <View style={styles.musicInfo}>
                        <Music size={12} color="white" />
                        <Text style={styles.musicText} numberOfLines={1}>{item.music}</Text>
                    </View>
                )}
            </View>

            {/* PROGRESS BAR */}
            <VideoProgressBar currentTime={currentTime} duration={duration} onSeek={handleSeek} />

            {/* MODALS */}
            <CommentsModal visible={showComments} onClose={() => setShowComments(false)} postId={item._id} />
            <ReelOptionsModal visible={showOptions} onClose={() => setShowOptions(false)} postLink={`${API_BASE_URL}/reel/${item._id}`} onSave={handleSaveReel} onReport={() => { }} />
            <ShareToUsersModal visible={showShare} onClose={() => setShowShare(false)} post={item} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { backgroundColor: '#000' },
    center: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', zIndex: 10 },
    gradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '50%' },
    rightActions: { position: 'absolute', right: 12, bottom: 180, alignItems: 'center', gap: 24, zIndex: 20 },
    avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#333', borderWidth: 2, borderColor: 'white', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
    followBadge: { position: 'absolute', bottom: -8, width: 24, height: 24, borderRadius: 12, backgroundColor: Colors.light.primary, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'white' },
    avatarImage: { width: '100%', height: '100%', borderRadius: 24 },
    avatarText: { color: 'white', fontSize: 20, fontWeight: 'bold' },
    actionButton: { alignItems: 'center', gap: 4 },
    actionText: { color: 'white', fontSize: 12, fontWeight: '600', textShadow: '1 1 3 rgba(0, 0, 0, 0.5)' },
    musicDisc: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#1a1a1a', borderWidth: 2, borderColor: 'white', justifyContent: 'center', alignItems: 'center', marginTop: 8 },
    musicDiscInner: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#333', justifyContent: 'center', alignItems: 'center' },
    bottomInfo: { position: 'absolute', left: 16, right: 80, zIndex: 20 },
    username: { color: 'white', fontSize: 16, fontWeight: '700', marginBottom: 4, textShadow: '1 1 3 rgba(0, 0, 0, 0.5)' },
    caption: { color: 'white', fontSize: 14, lineHeight: 18, textShadow: '1 1 3 rgba(0, 0, 0, 0.5)' },
    musicInfo: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
    musicText: { color: 'white', fontSize: 12, fontStyle: 'italic', flex: 1 },
    errorText: { fontSize: 48, marginBottom: 12 },
    errorMessage: { color: 'white', fontSize: 18, fontWeight: '600', marginBottom: 8, textAlign: 'center' },
    errorHint: { color: 'rgba(255,255,255,0.7)', fontSize: 14, textAlign: 'center' },
    muteButton: { position: 'absolute', bottom: 140, right: 16, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', zIndex: 10 },
    playPauseOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', zIndex: 10 },
    pauseIconContainer: { backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 50, padding: 20 },
});
