import { Colors } from '@/constants/Colors';
import { API_BASE_URL } from '@/constants/Config';
import { useUser } from '@/context/UserContext';
import { Audio } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import { Heart, MessageCircle, Share2, MoreHorizontal, Music, Plus, Bookmark } from 'lucide-react-native';
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
                        <Ionicons name="musical-notes" size={48} color="white" />
                        <Text style={{ color: 'white' }}>Audio content</Text>
                    </View>
                )}
                <View style={styles.rightActions}>
                    {/* Render limited actions for non-video fallback */}
                </View>
                {/* Still show bottom info */}
                <View style={[styles.bottomInfo, { bottom: insets.bottom + 100 }]}>
                    <Text style={styles.authorName}>@{author.name || 'Unknown'}</Text>
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
    const saveScaleAnim = useRef(new Animated.Value(1)).current;
    const bigHeartAnim = useRef(new Animated.Value(0)).current;
    const rotateAnim = useRef(new Animated.Value(0)).current;
    const lastTap = useRef(0);

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

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        Animated.sequence([
            Animated.timing(scaleAnim, { toValue: 1.5, duration: 100, useNativeDriver: true }),
            Animated.spring(scaleAnim, { toValue: 1, friction: 3, tension: 40, useNativeDriver: true }),
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
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

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


    const [isSaved, setIsSaved] = useState(() => {
        if (!user || !user.savedPosts || !item) return false;
        return user.savedPosts.some((p: any) => (typeof p === 'string' ? p : p._id) === (item._id || item.id));
    });

    useEffect(() => {
        if (!user || !user.savedPosts || !item) return;
        const saved = user.savedPosts.some((p: any) => (typeof p === 'string' ? p : p._id) === (item._id || item.id));
        setIsSaved(saved);
    }, [user, item._id, item.id]);

    const handleSaveReel = async () => {
        if (!user) return;
        
        const newState = !isSaved;
        setIsSaved(newState);
        
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        
        Animated.sequence([
            Animated.timing(saveScaleAnim, { toValue: 1.5, duration: 100, useNativeDriver: true }),
            Animated.spring(saveScaleAnim, { toValue: 1, friction: 3, tension: 40, useNativeDriver: true }),
        ]).start();

        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/save/${item._id || item.id}`, {
                method: 'PUT',
                headers: { 
                    Authorization: `Bearer ${user.token}`,
                    'Content-Type': 'application/json'
                },
            });

            if (!response.ok) {
                setIsSaved(!newState);
            }
        } catch (error) {
            console.error('Failed to save reel', error);
            setIsSaved(!newState);
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

                {/* PLAY/PAUSE BUTTON + DOUBLE TAP TO LIKE */}
                <TouchableOpacity
                    activeOpacity={1}
                    onPress={() => {
                        const now = Date.now();
                        const DOUBLE_TAP_DELAY = 300;
                        if (lastTap.current && (now - lastTap.current) < DOUBLE_TAP_DELAY) {
                            // Double tap detected
                            if (!liked) toggleLike();
                            
                            // Animate big heart
                            bigHeartAnim.setValue(0);
                            Animated.sequence([
                                Animated.spring(bigHeartAnim, { toValue: 1, useNativeDriver: true, friction: 3 }),
                                Animated.timing(bigHeartAnim, { toValue: 0, duration: 500, delay: 200, useNativeDriver: true })
                            ]).start();
                        } else {
                            setPaused(!paused);
                        }
                        lastTap.current = now;
                    }}
                    style={styles.playPauseOverlay}
                >
                    {paused && (
                        <View style={styles.pauseIconContainer}>
                            <Ionicons name="play" size={64} color="white" />
                        </View>
                    )}
                    
                    {/* Big Heart Overlay */}
                    <Animated.View style={[styles.bigHeartContainer, { opacity: bigHeartAnim, transform: [{ scale: bigHeartAnim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1.5] }) }] }]}>
                        <Heart size={100} color="#ff2d55" fill="#ff2d55" />
                    </Animated.View>
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
                    style={[styles.headerButton, { top: insets.top + (Platform.OS === 'ios' ? 80 : 90), right: 16 }]}
                    onPress={() => setMuted(!muted)}
                    activeOpacity={0.7}
                >
                    <BlurView intensity={30} tint="dark" style={styles.headerButtonBlur}>
                        <Ionicons 
                            name={muted ? "volume-mute" : "volume-high"} 
                            size={22} 
                            color="white" 
                        />
                    </BlurView>
                </TouchableOpacity>
            )}

            {/* BOTTOM GRADIENT */}
            <LinearGradient colors={['transparent', 'rgba(0,0,0,0.8)']} style={styles.gradient} />

            {/* RIGHT ACTIONS */}
            <View style={styles.rightActions}>
                <TouchableOpacity onPress={toggleLike} style={styles.actionButton} activeOpacity={0.7}>
                    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
                        <Heart size={32} color={liked ? '#ff2d55' : 'white'} fill={liked ? '#ff2d55' : 'transparent'} strokeWidth={2.5} />
                    </Animated.View>
                    <Text style={styles.actionText}>{likesCount > 1000 ? `${(likesCount / 1000).toFixed(1)}k` : likesCount}</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => setShowComments(true)} style={styles.actionButton} activeOpacity={0.7}>
                    <MessageCircle size={32} color="white" strokeWidth={2.5} />
                    <Text style={styles.actionText}>{commentsCount > 1000 ? `${(commentsCount / 1000).toFixed(1)}k` : commentsCount}</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={handleSaveReel} style={styles.actionButton} activeOpacity={0.7}>
                    <Animated.View style={{ transform: [{ scale: saveScaleAnim }] }}>
                        <Bookmark size={32} color={isSaved ? '#FACD00' : 'white'} fill={isSaved ? '#FACD00' : 'transparent'} strokeWidth={isSaved ? 0 : 2.5} />
                    </Animated.View>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => setShowShare(true)} style={styles.actionButton} activeOpacity={0.7}>
                    <Share2 size={30} color="white" strokeWidth={2.5} />
                </TouchableOpacity>

                <TouchableOpacity onPress={() => setShowOptions(true)} style={styles.actionButton} activeOpacity={0.7}>
                    <MoreHorizontal size={30} color="white" strokeWidth={2.5} />
                </TouchableOpacity>

                <Animated.View style={[styles.musicDiscWrapper, { transform: [{ rotate: spin }] }]}>
                    <View style={styles.musicDiscInner}>
                        {avatarUri ? (
                            <Image source={{ uri: avatarUri }} style={styles.musicDiscThumb} />
                        ) : (
                            <Music size={14} color="white" />
                        )}
                    </View>
                </Animated.View>
            </View>

            {/* BOTTOM INFO & USER PROFILE */}
            <View style={[styles.bottomInfo, { bottom: insets.bottom + (Platform.OS === 'ios' ? 70 : 80) }]}>
                <View style={styles.userInfoRow}>
                    <TouchableOpacity onPress={() => router.push(`/user/${author._id || author.id}`)} activeOpacity={0.8}>
                        <Image source={{ uri: avatarUri || 'https://via.placeholder.com/150' }} style={styles.profileAvatar} />
                    </TouchableOpacity>

                    <View style={{ marginLeft: 12, flex: 1 }}>
                        <View style={styles.nameRow}>
                            <TouchableOpacity onPress={() => router.push(`/user/${author._id || author.id}`)}>
                                <Text style={styles.authorName}>{author.name || 'User'}</Text>
                            </TouchableOpacity>
                            {!isFollowing && user?._id !== (author._id || author.id) && (
                                <TouchableOpacity style={styles.followButtonInline} onPress={toggleFollow} activeOpacity={0.7}>
                                    <Text style={styles.followButtonText}>Follow</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                        <Text style={styles.timeAgo}>Active now</Text>
                    </View>
                </View>

                <Text style={styles.caption} numberOfLines={2}>{item.caption || ''}</Text>

                {item.music && (
                    <View style={styles.musicRow}>
                        <Music size={14} color="white" />
                        <Text style={styles.musicLabel} numberOfLines={1}>{item.music}</Text>
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
    gradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '45%' },
    rightActions: { position: 'absolute', right: 12, bottom: 120, alignItems: 'center', gap: 24, zIndex: 20 },
    actionButton: { alignItems: 'center', gap: 4 },
    actionText: { color: 'white', fontSize: 13, fontWeight: '700', marginTop: 2, textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 3 },
    musicDiscWrapper: { width: 48, height: 48, borderRadius: 24, overflow: 'hidden', borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)', marginTop: 8 },
    musicDiscInner: { width: '100%', height: '100%', backgroundColor: '#111', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
    musicDiscThumb: { width: '100%', height: '100%', opacity: 0.8 },
    bottomInfo: { position: 'absolute', left: 16, right: 80, zIndex: 20 },
    userInfoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    profileAvatar: { width: 40, height: 40, borderRadius: 20, borderWidth: 1.5, borderColor: '#fff' },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    authorName: { color: 'white', fontSize: 16, fontWeight: '700', textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 3 },
    timeAgo: { color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 1 },
    followButtonInline: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: '#fff', backgroundColor: 'transparent' },
    followButtonText: { color: 'white', fontSize: 13, fontWeight: '700' },
    caption: { color: 'white', fontSize: 14, lineHeight: 18, fontWeight: '400', marginBottom: 12, textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 3 },
    musicRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    musicLabel: { color: 'white', fontSize: 13, fontWeight: '400' },
    errorText: { fontSize: 48, marginBottom: 12 },
    errorMessage: { color: 'white', fontSize: 18, fontWeight: '600', marginBottom: 8, textAlign: 'center' },
    errorHint: { color: 'rgba(255,255,255,0.7)', fontSize: 14, textAlign: 'center' },
    headerButton: {
        position: 'absolute',
        borderRadius: 22,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.15)',
        zIndex: 100,
    },
    headerButtonBlur: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.1)',
    },
    bigHeartContainer: {
        position: 'absolute',
        alignSelf: 'center',
        top: '40%',
        zIndex: 100,
        textShadowColor: 'rgba(0,0,0,0.3)',
        textShadowOffset: { width: 0, height: 10 },
        textShadowRadius: 20,
    },
    playPauseOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', zIndex: 10 },
    pauseIconContainer: { backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 50, padding: 24 },
});
