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
import { Heart, MessageCircle, Send, MoreHorizontal, Music, Plus, Bookmark } from 'lucide-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    Image,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    useWindowDimensions
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useReels } from '@/context/ReelContext';
import CommentsModal from './CommentsModal';
import ErrorHandler from '@/utils/ErrorHandler';
import Toast from 'react-native-toast-message';
import ReelOptionsModal from './ReelOptionsModal';
import ShareToUsersModal from './ShareToUsersModal';
import VideoProgressBar from './VideoProgressBar';
import LikersModal from './LikersModal';

// Helper to construct valid URIs
const getValidUri = (uri?: string) => {
    if (!uri) return '';
    if (uri.startsWith('data:') || uri.startsWith('file:')) return uri;
    
    // Auto-fix our backend URLs if they have the wrong IP/localhost
    if (uri.startsWith('http') && uri.includes('/uploads/')) {
        const parts = uri.split('/uploads/');
        return `${API_BASE_URL}/uploads/${parts[1]}`;
    }
    
    // External URLs
    if (uri.startsWith('http')) return uri;

    // Handle relative uploads
    if (uri.startsWith('/uploads/')) return `${API_BASE_URL}${uri}`;
    if (uri.includes('/uploads/')) {
        const parts = uri.split('/uploads/');
        return `${API_BASE_URL}/uploads/${parts[1]}`;
    }

    // Default fallback
    return `${API_BASE_URL}${uri.startsWith('/') ? '' : '/'}${uri}`;
};

interface ReelItemProps {
    item: any;
    active: boolean;
    isMuted: boolean;
    width: number;
    height: number;
}

export default function ReelItem({ item, active, isMuted, width, height }: ReelItemProps) {
    const insets = useSafeAreaInsets();
    const { width: windowWidth } = useWindowDimensions();
    const isDesktop = Platform.OS === 'web' && windowWidth > 900;
    const router = useRouter();
    const { user, followUser } = (useUser() || {}) as any;
    const [followLoading, setFollowLoading] = useState(false);
    const [isFollowing, setIsFollowing] = useState(false);
    const [isRequested, setIsRequested] = useState(false);

    const videoUri = getValidUri(item.videoUri || item.uri);
    const author = item.user || {};
    const avatarUri = getValidUri(author.avatar);

    const [webVideoUrl, setWebVideoUrl] = useState<string | null>(null);

    const [paused, setPaused] = useState(false);
    const [isLoaded, setIsLoaded] = useState(false);
    const [isBuffering, setIsBuffering] = useState(true);
    const [hasError, setHasError] = useState(false);
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
        player.muted = isMuted;
    });

    // Use ReelContext for global sound control
    const { isMuted: globalMute } = useReels();

    const videoRef = useRef<any>(null);

    // Handle Active/Paused State
    useEffect(() => {
        if (active && !paused) {
            player.play();
        } else {
            player.pause();
        }
    }, [active, paused, player]);

    // Handle Mute State (Global)
    useEffect(() => {
        if (player) {
           player.muted = globalMute;
           player.volume = globalMute ? 0 : 1;
           // console.log(`[ReelItem] player.muted set to ${globalMute}, volume to ${player.volume}`);
        }
    }, [globalMute, player]);

    // Handle Events (Buffering, Loading, TimeUpdates)
    useEffect(() => {
        const subscription = player.addListener('statusChange', (status) => {
            setIsLoaded(status.status === 'readyToPlay');

            if (status.status === 'error') {
                // Suppress "Cannot Open" noise unless critical, or handle gracefully
                if (status.error?.message?.includes('Cannot Open')) {
                    ErrorHandler.log('⚠️ Video playback failed (Cannot Open):', videoUri);
                } else {
                    // Show a clean toast instead of console.error to avoid red development banner
                    ErrorHandler.show(status.error);
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
            if (typeof player.currentTime === 'number' && player.duration) {
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

    useEffect(() => {
        if (user) {
            const targetId = author._id || author.id;
            
            // Check following
            const following = user.following?.some((f: any) =>
                (typeof f === 'string' ? f : f._id) === targetId
            );
            setIsFollowing(!!following);

            // Check requested
            const requested = user.sentRequests?.some((r: any) =>
                (typeof r === 'string' ? r : r._id) === targetId
            );
            setIsRequested(!!requested);
        }
    }, [user, author._id, author.id]);

    const [showComments, setShowComments] = useState(false);
    const [showOptions, setShowOptions] = useState(false);
    const [showShare, setShowShare] = useState(false);
    const [showLikers, setShowLikers] = useState(false);

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
        const targetId = author._id || author.id;
        if (!user || user._id === targetId || followLoading) return;

        const performFollow = async () => {
            setFollowLoading(true);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

            try {
                const result = await followUser(targetId);
                if (result.success) {
                    if (result.data.status === 'followed') {
                        setIsFollowing(true);
                        setIsRequested(false);
                        Toast.show({ type: 'success', text1: 'Following' });
                    } else if (result.data.status === 'unfollowed' || result.data.status === 'cancelled') {
                        setIsFollowing(false);
                        setIsRequested(false);
                    } else if (result.data.status === 'requested') {
                        setIsRequested(true);
                        setIsFollowing(false);
                        Toast.show({ type: 'info', text1: 'Request sent' });
                    }
                }
            } catch (error) {
                console.error('Follow request failed:', error);
            } finally {
                setFollowLoading(false);
            }
        };

        if (isFollowing || isRequested) {
            const title = isFollowing ? "Unfollow" : "Cancel Request";
            const message = isFollowing ? `Unfollow @${author.name}?` : "Cancel your follow request?";
            
            if (Platform.OS === 'web') {
                if (confirm(message)) performFollow();
            } else {
                Alert.alert(title, message, [
                    { text: "Cancel", style: "cancel" },
                    { text: "Confirm", onPress: performFollow }
                ]);
            }
        } else {
            performFollow();
        }
    }, [user, author._id, author.id, followUser, followLoading, isFollowing, isRequested, author.name]);

    const handleSeek = useCallback((position: number) => {
        if (Platform.OS === 'web') {
            if (videoRef.current) {
                videoRef.current.currentTime = position / 1000;
            }
        } else {
            if (player) {
                player.currentTime = position / 1000; // expo-video uses seconds
            }
        }
        setCurrentTime(position);
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
    };    return (
        <View style={[styles.container, { width, height }]}>
            {/* VIDEO PLAYER + PLAY/PAUSE OVERLAY */}
            <View style={StyleSheet.absoluteFill}>
                {Platform.OS === 'web' ? (
                    webVideoUrl && (
                        <video
                            ref={(ref: any) => {
                                videoRef.current = ref;
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
                            muted={isMuted}
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
                            <Ionicons name="play" size={48} color="white" />
                        </View>
                    )}
                    
                    {/* Big Heart Overlay */}
                    <Animated.View style={[styles.bigHeartContainer, { opacity: bigHeartAnim, transform: [{ scale: bigHeartAnim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1.5] }) }] }]}>
                        <Heart size={100} color="#ff2d55" fill="#ff2d55" />
                    </Animated.View>
                </TouchableOpacity>
            </View>

            {/* EVERYTHING BELOW HIDDEN ON DESKTOP REELS PAGE */}
            {!isDesktop && (
                <>
                    {/* GRADIENT OVERLAYS */}
                    <LinearGradient 
                        colors={['rgba(0,0,0,0.6)', 'transparent']} 
                        style={styles.topGradient} 
                    />
                    <LinearGradient 
                        colors={['transparent', 'rgba(0,0,0,0.1)', 'rgba(0,0,0,0.85)']} 
                        style={styles.gradient} 
                    />

                    {/* LOADING INDICATOR */}
                    {(isBuffering || !isLoaded) && active && !hasError && (
                        <View style={styles.center}>
                            <ActivityIndicator size="large" color="white" />
                        </View>
                    )}

                    {/* RIGHT ACTIONS */}
                    <View style={styles.rightActions}>

                        <TouchableOpacity onPress={toggleLike} style={styles.actionButton} activeOpacity={0.7}>
                            <View style={styles.iconCircle}>
                                <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
                                    <Heart size={28} color={liked ? '#ff2d55' : 'white'} fill={liked ? '#ff2d55' : 'transparent'} strokeWidth={2.5} />
                                </Animated.View>
                            </View>
                            <Text style={styles.actionText}>{likesCount > 1000 ? `${(likesCount / 1000).toFixed(1)}k` : likesCount}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity onPress={() => setShowComments(true)} style={styles.actionButton} activeOpacity={0.7}>
                            <View style={styles.iconCircle}>
                                <MessageCircle size={28} color="white" strokeWidth={2.5} />
                            </View>
                            <Text style={styles.actionText}>{commentsCount > 1000 ? `${(commentsCount / 1000).toFixed(1)}k` : commentsCount}</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity onPress={() => setShowShare(true)} style={styles.actionButton} activeOpacity={0.7}>
                            <View style={styles.iconCircle}>
                                <Send size={26} color="white" strokeWidth={2.5} />
                            </View>
                            <Text style={styles.actionText}>{Math.floor(likesCount / 4.5) > 1000 ? `${((likesCount / 4.5) / 1000).toFixed(1)}k` : Math.floor(likesCount / 4.5)}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity onPress={handleSaveReel} style={styles.actionButton} activeOpacity={0.7}>
                            <View style={styles.iconCircle}>
                                <Animated.View style={{ transform: [{ scale: saveScaleAnim }] }}>
                                    <Bookmark size={28} color={isSaved ? '#FACD00' : 'white'} fill={isSaved ? '#FACD00' : 'transparent'} strokeWidth={isSaved ? 0 : 2.5} />
                                </Animated.View>
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity onPress={() => setShowOptions(true)} style={styles.actionButton} activeOpacity={0.7}>
                            <View style={styles.iconCircle}>
                                <MoreHorizontal size={26} color="white" strokeWidth={2.5} />
                            </View>
                        </TouchableOpacity>
                    </View>

                    {/* BOTTOM INFO & USER PROFILE */}
                    <View style={[styles.bottomInfo, { bottom: insets.bottom + 115 }]}>
                        <View style={styles.userInfoRow}>
                            <TouchableOpacity onPress={() => router.push(`/user/${author._id || author.id}`)} activeOpacity={0.8} style={styles.avatarWrapper}>
                                <Image source={{ uri: avatarUri || 'https://via.placeholder.com/150' }} style={styles.profileAvatar} />
                            </TouchableOpacity>

                            <TouchableOpacity onPress={() => router.push(`/user/${author._id || author.id}`)}>
                                <Text style={styles.authorName}>{author.name || 'User'}</Text>
                            </TouchableOpacity>

                            {user?._id !== (author._id || author.id) && !isFollowing && !isRequested && (
                                <TouchableOpacity 
                                    style={styles.followButtonInactive} 
                                    onPress={toggleFollow} 
                                    activeOpacity={0.8}
                                >
                                    <Text style={styles.followButtonTextInactive}>
                                        Follow
                                    </Text>
                                </TouchableOpacity>
                            )}

                            {isRequested && (
                                <TouchableOpacity 
                                    style={[styles.followButtonInactive, { opacity: 0.8 }]} 
                                    onPress={toggleFollow} 
                                    activeOpacity={0.8}
                                >
                                    <Text style={styles.followButtonTextInactive}>
                                        Requested
                                    </Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        <Text style={styles.caption} numberOfLines={2}>{item.caption || 'No caption provided'}</Text>

                        {/* Social Proof Section */}
                        {likesCount > 0 && (
                            <TouchableOpacity 
                                style={styles.socialProof}
                                activeOpacity={0.8}
                                onPress={() => setShowLikers(true)}
                            >
                                <View style={styles.stackedAvatars}>
                                    {(item.latestLikers && item.latestLikers.length > 0) ? (
                                        item.latestLikers.map((liker: any, idx: number) => (
                                            <Image 
                                                key={liker._id} 
                                                source={{ uri: getValidUri(liker.avatar) || `https://ui-avatars.com/api/?name=${encodeURIComponent(liker.name || 'U')}&background=random` }} 
                                                style={[styles.stackedAvatar, { left: idx === 0 ? 0 : -8, zIndex: 10 - idx }]} 
                                            />
                                        ))
                                    ) : (
                                        <Image source={{ uri: 'https://ui-avatars.com/api/?name=User&background=random' }} style={[styles.stackedAvatar, { zIndex: 3 }]} />
                                    )}
                                </View>
                                <Text style={styles.socialProofText}>
                                    Liked by <Text style={{ fontWeight: '700', color: '#fff' }}>{likesCount} {likesCount === 1 ? 'person' : 'people'}</Text>
                                </Text>
                            </TouchableOpacity>
                        )}

                        {item.music && (
                            <View style={styles.musicRow}>
                                <Music size={14} color="white" />
                                <View style={styles.musicTickerWrapper}>
                                    <Text style={styles.musicLabel} numberOfLines={1}>{item.music} · {author.name || 'Original Audio'}</Text>
                                </View>
                            </View>
                        )}
                    </View>

                    {/* COMMENT INPUT BAR (PREMIUM OVERLAY) */}
                    <TouchableOpacity 
                        style={[styles.commentBarOverlay, { bottom: insets.bottom + 20 }]}
                        activeOpacity={0.9}
                        onPress={() => setShowComments(true)}
                    >
                        <View style={styles.commentBarContent}>
                            <View style={styles.commentBarInput}>
                                <Text style={styles.commentBarPlaceholder}>Add a comment...</Text>
                            </View>
                            <TouchableOpacity onPress={() => {}} style={styles.iconButton}>
                                 <Ionicons name="heart-outline" size={22} color="white" opacity={0.7} />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => {}} style={styles.iconButton}>
                                 <Ionicons name="happy-outline" size={22} color="white" opacity={0.7} />
                            </TouchableOpacity>
                        </View>
                    </TouchableOpacity>
                </>
            )}

            {/* PROGRESS BAR */}
            <VideoProgressBar 
                currentTime={currentTime} 
                duration={duration} 
                onSeek={handleSeek} 
                bottomOffset={insets.bottom + 85}
                showTime={paused}
            />

            {/* MODALS */}
            <CommentsModal visible={showComments} onClose={() => setShowComments(false)} postId={item._id} />
            <ReelOptionsModal visible={showOptions} onClose={() => setShowOptions(false)} postLink={`${API_BASE_URL}/reel/${item._id}`} onSave={handleSaveReel} onReport={() => { }} />
            <ShareToUsersModal visible={showShare} onClose={() => setShowShare(false)} post={item} />
            <LikersModal visible={showLikers} onClose={() => setShowLikers(false)} postId={item._id} token={user?.token} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { 
        backgroundColor: '#000',
    },
    topControls: {
        position: 'absolute',
        left: 68,
        zIndex: 100,
    },
    muteButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.15)',
    },
    center: { 
        ...StyleSheet.absoluteFillObject, 
        justifyContent: 'center', 
        alignItems: 'center', 
        zIndex: 10 
    },
    gradient: { 
        position: 'absolute', 
        bottom: 0, 
        left: 0, 
        right: 0, 
        height: '50%',
        zIndex: 15
    },
    topGradient: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '20%',
        zIndex: 15
    },
    rightActions: { 
        position: 'absolute', 
        right: 12, 
        bottom: 180, 
        alignItems: 'center', 
        gap: 24, 
        zIndex: 30 
    },
    actionButton: { 
        alignItems: 'center', 
        gap: 6 
    },
    iconCircle: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: 'rgba(255, 255, 255, 0.12)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    actionText: { 
        color: 'white', 
        fontSize: 12, 
        fontWeight: '700', 
        textShadowColor: 'rgba(0,0,0,0.5)', 
        textShadowOffset: { width: 1, height: 1 }, 
        textShadowRadius: 3 
    },
    musicDiscWrapper: { 
        width: 50, 
        height: 50, 
        borderRadius: 25, 
        overflow: 'hidden', 
        borderWidth: 2, 
        borderColor: 'rgba(255,255,255,0.4)', 
        marginTop: 10,
        backgroundColor: '#111'
    },
    musicDiscInner: { 
        width: '100%', 
        height: '100%', 
        justifyContent: 'center', 
        alignItems: 'center' 
    },
    musicDiscThumb: { 
        width: '100%', 
        height: '100%', 
        borderRadius: 25 
    },
    bottomInfo: { 
        position: 'absolute', 
        left: 16, 
        right: 80, 
        zIndex: 25 
    },
    userInfoRow: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        marginBottom: 10,
        gap: 12
    },
    avatarWrapper: { 
        position: 'relative' 
    },
    profileAvatar: { 
        width: 44, 
        height: 44, 
        borderRadius: 22, 
        borderWidth: 1.5, 
        borderColor: '#fff' 
    },
    plusIcon: {
        position: 'absolute',
        bottom: -2,
        right: -2,
        backgroundColor: '#0095f6',
        borderRadius: 9,
        width: 18,
        height: 18,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#000',
    },
    authorName: { 
        color: 'white', 
        fontSize: 16, 
        fontWeight: '700',
        letterSpacing: 0.3
    },
    followButtonActive: { 
        paddingHorizontal: 14, 
        paddingVertical: 5, 
        borderRadius: 8, 
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)',
    },
    followButtonInactive: { 
        paddingHorizontal: 14, 
        paddingVertical: 5, 
        borderRadius: 8, 
        backgroundColor: '#fff',
    },
    followButtonTextActive: { 
        color: 'white', 
        fontSize: 13, 
        fontWeight: '700' 
    },
    followButtonTextInactive: { 
        color: 'black', 
        fontSize: 13, 
        fontWeight: '700' 
    },
    caption: { 
        color: 'white', 
        fontSize: 14, 
        lineHeight: 19, 
        fontWeight: '400', 
        marginBottom: 12,
        opacity: 0.95
    },
    socialProof: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        marginBottom: 12, 
        gap: 8,
        backgroundColor: 'rgba(255,255,255,0.1)',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 12,
        alignSelf: 'flex-start'
    },
    stackedAvatars: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        width: 32 
    },
    stackedAvatar: { 
        width: 20, 
        height: 20, 
        borderRadius: 10, 
        borderWidth: 1.5, 
        borderColor: '#000' 
    },
    socialProofText: { 
        color: 'rgba(255,255,255,0.9)', 
        fontSize: 12 
    },
    musicRow: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        gap: 8,
        backgroundColor: 'rgba(0,0,0,0.3)',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 15,
        alignSelf: 'flex-start'
    },
    musicTickerWrapper: { 
        maxWidth: 200,
        overflow: 'hidden' 
    },
    musicLabel: { 
        color: 'white', 
        fontSize: 12, 
        fontWeight: '500' 
    },
    commentBarOverlay: {
        position: 'absolute',
        left: 0,
        right: 0,
        paddingHorizontal: 16,
        zIndex: 40,
    },
    commentBarContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 24,
        paddingHorizontal: 4,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.15)',
    },
    commentBarInput: {
        flex: 1,
        height: 48,
        justifyContent: 'center',
        paddingHorizontal: 16,
    },
    commentBarPlaceholder: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 14,
        fontWeight: '500'
    },
    iconButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorText: { fontSize: 48, marginBottom: 12 },
    errorMessage: { color: 'white', fontSize: 16, fontWeight: '600', textAlign: 'center' },
    errorHint: { color: 'rgba(255,255,255,0.5)', fontSize: 13, marginTop: 4 },
    bigHeartContainer: {
        position: 'absolute',
        alignSelf: 'center',
        top: '40%',
        zIndex: 100,
    },
    playPauseOverlay: { 
        ...StyleSheet.absoluteFillObject, 
        justifyContent: 'center', 
        alignItems: 'center', 
        zIndex: 20 
    },
    pauseIconContainer: { 
        backgroundColor: 'rgba(0,0,0,0.35)', 
        borderRadius: 40, 
        width: 80, 
        height: 80, 
        justifyContent: 'center', 
        alignItems: 'center' 
    },
});
