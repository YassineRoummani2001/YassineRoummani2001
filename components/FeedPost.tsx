import { API_BASE_URL } from '@/constants/Config';
import { useUser } from '@/context/AuthContext';
import { useThemeContext } from '@/context/ThemeContext'; // Import ThemeContext
import { useRouter } from 'expo-router';

import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Dimensions, Image, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { State, TapGestureHandler } from 'react-native-gesture-handler';
import CommentsModal from './CommentsModal';
import ConfirmationModal from './ConfirmationModal';
import DeleteConfirmModal from './DeleteConfirmModal';
import PostOptionsMenu from './PostOptionsMenu';
import ShareToUsersModal from './ShareToUsersModal';

const { width } = Dimensions.get('window');

// Helper to normalize URIs
const getValidUri = (uri: string) => {
    if (!uri) return '';
    if (uri.startsWith('/uploads/')) return `${API_BASE_URL}${uri}`;
    if (uri.includes('/uploads/')) {
        const parts = uri.split('/uploads/');
        return `${API_BASE_URL}/uploads/${parts[1]}`;
    }
    if (uri.startsWith('http') || uri.startsWith('data:')) return uri;
    return `${API_BASE_URL}${uri.startsWith('/') ? '' : '/'}${uri}`;
};

// --- STABLE FEED VIDEO COMPONENT (expo-video) ---
import { useVideoPlayer, VideoView } from 'expo-video';

const FeedVideo = ({ videoSource, posterSource, isMuted, setIsMuted, active, styles, doubleTapRef }: { videoSource: string, posterSource?: string, isMuted: boolean, setIsMuted: (muted: boolean) => void, active: boolean, styles: any, doubleTapRef: any }) => {
    const validUri = getValidUri(videoSource);

    // Don't initialize player if no valid video source
    if (!validUri || validUri.trim() === '') {
        return (
            <View style={styles.media}>
                <Text style={{ color: '#666', textAlign: 'center' }}>Video unavailable</Text>
            </View>
        );
    }

    // Initialize Player
    const player = useVideoPlayer(validUri, player => {
        player.loop = true;
        player.muted = isMuted;
    });

    // Web Autoplay Fix & Active State Management
    useEffect(() => {
        if (active) {
            // Small delay to prevent scroll jank
            const timeout = setTimeout(() => {
                if (Platform.OS === 'web') {
                    // Start playback and catch any abort errors (common when scrolling quickly)
                    const playPromise = player.play() as any;
                    if (playPromise && typeof playPromise.catch === 'function') {
                        playPromise.catch(() => { /* mute abort errors */ });
                    }
                } else {
                    player.play();
                }
            }, 50);
            return () => clearTimeout(timeout);
        } else {
            player.pause();
        }
    }, [active, player]);

    // Sync external mute state
    useEffect(() => {
        player.muted = isMuted;
    }, [isMuted, player]);

    // Playback Status tracking for UI (Play button overlay)
    const [isPlaying, setIsPlaying] = useState(false);

    useEffect(() => {
        const subscription = player.addListener('playingChange', ({ isPlaying }) => {
            setIsPlaying(isPlaying);
        });
        return () => subscription.remove();
    }, [player]);

    const togglePlay = () => {
        if (isPlaying) {
            player.pause();
        } else {
            player.play();
        }
    };

    return (
        <View style={styles.media}>
            <TapGestureHandler
                waitFor={doubleTapRef}
                onHandlerStateChange={({ nativeEvent }) => {
                    if (nativeEvent.state === State.ACTIVE) togglePlay();
                }}
            >
                <Animated.View style={styles.media}>
                    <VideoView
                        player={player}
                        style={styles.media}
                        contentFit="cover"
                        nativeControls={false}
                    />

                    {!isPlaying && (
                        <View style={styles.playOverlay}>
                            <View style={styles.playButton}>
                                <Ionicons name="play" size={32} color="white" />
                            </View>
                        </View>
                    )}
                </Animated.View>
            </TapGestureHandler>

            <TouchableOpacity
                style={styles.soundButton}
                onPress={() => {
                    const newMuted = !isMuted;
                    setIsMuted(newMuted); // Propagate up
                }}
            >
                {isMuted ? (
                    <Ionicons name="volume-mute" size={16} color="white" />
                ) : (
                    <Ionicons name="volume-high" size={16} color="white" />
                )}
            </TouchableOpacity>
        </View>
    );
};

// --- STYLES ---
const createStyles = (colors: any, isDark: boolean) => StyleSheet.create({
    container: {
        backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
        marginHorizontal: 16,
        marginBottom: 24,
        borderRadius: 24,
        padding: 12,
        // High-end modern shadow
        shadowColor: isDark ? '#000' : 'rgba(0,0,0,1)',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: isDark ? 0.3 : 0.08,
        shadowRadius: 16,
        elevation: 6,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
        paddingHorizontal: 4,
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        flex: 1,
    },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: isDark ? '#2C2C2E' : '#F3F4F6',
        borderWidth: 2,
        borderColor: colors.primary + '20', // Subtle primary tint
    },
    usernameContainer: {
        justifyContent: 'center',
    },
    username: {
        fontWeight: '700',
        fontSize: 15,
        color: colors.text,
        letterSpacing: -0.3,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 1,
    },
    time: {
        fontSize: 11,
        fontWeight: '500',
        color: colors.textSecondary,
    },
    dot: {
        fontSize: 8,
        color: colors.textSecondary,
        opacity: 0.5,
    },
    globeIconBase: {
        width: 10,
        height: 10,
        opacity: 0.6,
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    followBtn: {
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderRadius: 18,
        backgroundColor: colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    followingBtn: {
        backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
        borderWidth: 0,
    },
    followBtnText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '700',
    },
    followingBtnText: {
        color: colors.textSecondary,
    },
    menuButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
    },
    captionContainer: {
        marginBottom: 10,
        paddingHorizontal: 4,
    },
    caption: {
        fontSize: 15,
        color: colors.text,
        lineHeight: 21,
        letterSpacing: -0.1,
    },
    seeMore: {
        fontWeight: '700',
        color: colors.primary,
        marginTop: 4,
    },
    mediaContainer: {
        width: '100%',
        aspectRatio: 4 / 5, // Modern aspect ratio
        borderRadius: 20,
        overflow: 'hidden',
        backgroundColor: isDark ? '#000' : '#F9FAFB',
        position: 'relative',
    },
    media: {
        width: '100%',
        height: '100%',
    },
    playOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.15)',
    },
    playButton: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)',
    },
    soundButton: {
        position: 'absolute',
        bottom: 12,
        right: 12,
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    footer: {
        marginTop: 12,
        paddingHorizontal: 4,
    },
    actions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    actionGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F3F4F6',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
    },
    actionText: {
        fontSize: 13,
        fontWeight: '700',
        color: colors.text,
    },
    viewsInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    viewsText: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.textSecondary,
    },
    editContainer: {
        padding: 4,
        marginBottom: 12,
    },
    editInput: {
        backgroundColor: isDark ? '#2C2C2E' : '#F9FAFB',
        borderRadius: 16,
        padding: 16,
        color: colors.text,
        fontSize: 15,
        minHeight: 100,
        textAlignVertical: 'top',
        borderWidth: 1,
        borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
    },
    editActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 8,
        marginTop: 12,
    },
    cancelEditBtn: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
    },
    cancelEditText: {
        color: colors.textSecondary,
        fontWeight: '600',
        fontSize: 14,
    },
    saveEditBtn: {
        backgroundColor: colors.primary,
        paddingHorizontal: 20,
        paddingVertical: 8,
        borderRadius: 20,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    saveEditText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 14,
    },
});

export default function FeedPost({ post, onDelete, active }: { post: any, onDelete?: (id: string) => void, active: boolean }) {
    const router = useRouter();
    const { colors, isDark } = useThemeContext(); // Access colors
    const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]); // Memoize styles

    const [isMuted, setIsMuted] = useState(false);
    const [showFullCaption, setShowFullCaption] = useState(false);
    const { user, followUser } = (useUser() || {}) as any;

    const [isEditing, setIsEditing] = useState(false);
    const [editedCaption, setEditedCaption] = useState(post.caption || '');

    // Double Tap Animation State
    const likeScale = React.useRef(new Animated.Value(0)).current;
    const doubleTapRef = React.useRef(null);

    const onDoubleTap = (event: any) => {
        if (event.nativeEvent.state === State.ACTIVE) {
            if (!isLiked) {
                handleLike();
            }
            likeScale.setValue(0);
            Animated.sequence([
                Animated.spring(likeScale, {
                    toValue: 1,
                    friction: 4,
                    useNativeDriver: true,
                }),
                Animated.delay(200),
                Animated.timing(likeScale, {
                    toValue: 0,
                    duration: 150,
                    useNativeDriver: true,
                }),
            ]).start();
        }
    };

    // Precise video detection
    const isVideoType = post.type === 'video' || post.type === 'reel';
    const hasVideoExtension = post.uri && /\.(mp4|mov|m4v|webm)$/i.test(post.uri);
    const hasVideo = post.isVideo || isVideoType || (hasVideoExtension && !post.type); // only check extension if type is unknown
    const videoSource = post.videoUri || post.uri;

    // Stats state
    const [likesCount, setLikesCount] = useState(Array.isArray(post.likes) ? post.likes.length : (post.likes || 0));
    const [isLiked, setIsLiked] = useState(
        (Array.isArray(post.likes) && user?._id && post.likes.includes(user._id)) || post.isLiked || false
    );

    // Comments State
    const [commentsCount, setCommentsCount] = useState(post.comments?.length || (Array.isArray(post.comments) ? post.comments.length : 0));
    const [comments, setComments] = useState(Array.isArray(post.comments) ? post.comments : []);
    const [showCommentsModal, setShowCommentsModal] = useState(false);


    const [showShareModal, setShowShareModal] = useState(false);
    const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
    const [deleteSuccessVisible, setDeleteSuccessVisible] = useState(false);
    const [deleteErrorVisible, setDeleteErrorVisible] = useState(false);

    const [viewsCount, setViewsCount] = useState(post.views || 0);

    // Save state
    const [isSaved, setIsSaved] = useState(post.isSaved || (user?.saved?.includes(post.id || post._id)) || false);
    const saveScale = React.useRef(new Animated.Value(1)).current;

    // Follow state
    const [userIsFollowing, setUserIsFollowing] = useState(false);
    const [userIsRequested, setUserIsRequested] = useState(false);
    const [followLoading, setFollowLoading] = useState(false);

    // Check if current user owns the post
    const isOwner = user && post.user && (user._id === post.user._id || user._id === post.user.id);

    // Check if current user is following or requested the post author
    useEffect(() => {
        if (user && post.user) {
            const postUserId = post.user._id || post.user.id;
            // Check following
            if (user.following) {
                setUserIsFollowing(user.following.includes(postUserId));
            }
            // Check requested
            if (user.sentRequests) {
                setUserIsRequested(user.sentRequests.includes(postUserId));
            }
        }
    }, [user, post.user]);

    const handleFollowUser = async () => {
        if (!user?.token || followLoading || !followUser) return;

        const postUserId = post.user?._id || post.user?.id;
        if (!postUserId) return;

        setFollowLoading(true);
        const result = await followUser(postUserId);

        // console.log('Follow result:', result);

        if (result.success) {
            // Update local state based on what happened
            if (result.data.status === 'followed') {
                setUserIsFollowing(true);
                setUserIsRequested(false);
            } else if (result.data.status === 'unfollowed') {
                setUserIsFollowing(false);
                setUserIsRequested(false);
            } else if (result.data.status === 'requested') {
                setUserIsFollowing(false);
                setUserIsRequested(true);
            } else if (result.data.status === 'cancelled') {
                setUserIsFollowing(false);
                setUserIsRequested(false);
            } else {
                // Fallback
                setUserIsFollowing(result.data.isFollowing);
                setUserIsRequested(false);
            }
        } else {
            Alert.alert('Error', result.message || 'Failed to follow/unfollow');
        }

        setFollowLoading(false);
    };


    const handleLike = async () => {
        if (!user?.token) return;

        // Prevent double requests
        const wasLiked = isLiked;
        const newIsLiked = !wasLiked;

        // Optimistic update
        setIsLiked(newIsLiked);
        setLikesCount((prev: number) => newIsLiked ? prev + 1 : prev - 1);

        try {
            const res = await fetch(`${API_BASE_URL}/api/posts/${post.id || post._id}/like`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${user.token}`
                }
            });
            if (!res.ok) throw new Error('Failed to sync like');
        } catch (error) {
            console.warn('🔄 Network Failure: Reverting Like');
            // Revert on error
            setIsLiked(wasLiked);
            setLikesCount((prev: number) => wasLiked ? prev + 1 : prev - 1);
        }
    };

    const handleDelete = () => {
        if (!user?.token) {
            Alert.alert('Error', 'You must be logged in to delete posts');
            return;
        }
        setMenuVisible(false);
        setDeleteConfirmVisible(true);
    };

    const confirmDelete = async () => {
        setDeleteConfirmVisible(false);

        const postId = post.id || post._id;
        // console.log('🗑️ Attempting to delete post:', postId);

        try {
            const url = `${API_BASE_URL}/api/posts/${postId}`;
            // console.log('📡 DELETE request to:', url);

            const response = await fetch(url, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${user.token}`,
                    'Content-Type': 'application/json'
                }
            });

            // console.log('📥 Delete response status:', response.status);

            if (response.ok) {
                // console.log('✅ Post deleted successfully');
                setDeleteSuccessVisible(true);
                if (onDelete) onDelete(postId);
            } else {
                const errorText = await response.text();
                console.error('❌ Delete failed:', response.status, errorText);

                let errorMessage = 'Failed to delete post';
                try {
                    const err = JSON.parse(errorText);
                    errorMessage = err.message || err.error || errorMessage;
                } catch {
                    errorMessage = errorText || `Error ${response.status}`;
                }

                Alert.alert(
                    'Delete Failed',
                    `${errorMessage}\n\nPlease check:\n- Backend server is running\n- You own this post\n- You are logged in`,
                    [{ text: 'OK' }]
                );
                setDeleteErrorVisible(true);
            }
        } catch (error: any) {
            console.error('❌ Delete error:', error);

            let errorMsg = error.message || 'Unknown error';
            if (errorMsg.includes('Network request failed')) {
                errorMsg = 'Cannot connect to server.\n\nPlease check:\n1. Backend is running\n2. Server is on port 5000\n3. Your internet connection';
            }

            Alert.alert('Error', errorMsg, [{ text: 'OK' }]);
            setDeleteErrorVisible(true);
        }
    };

    const handleShare = () => {
        // Open share to users modal
        setShowShareModal(true);
    };

    const handleUpdate = async () => {
        if (!user?.token) return;
        try {
            const response = await fetch(`${API_BASE_URL}/api/posts/${post.id || post._id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${user.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ caption: editedCaption })
            });

            if (response.ok) {
                const updatedPost = await response.json();
                post.caption = updatedPost.caption; // Optimistic logic for local prop
                setIsEditing(false);
                Alert.alert('Success', 'Post updated');
            } else {
                Alert.alert('Error', 'Failed to update post');
            }
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Network error');
        }
    };


    const [menuVisible, setMenuVisible] = useState(false);
    const [menuAnchor, setMenuAnchor] = useState({ x: 0, y: 0, height: 0 });
    const menuAnchorRef = React.useRef<View>(null);

    const handleOpenMenu = () => {
        if (menuAnchorRef.current) {
            menuAnchorRef.current.measure((x, y, width, height, pageX, pageY) => {
                // Fallback if measure returns 0 (can happen on iOS)
                if (pageX === 0 && pageY === 0) {
                    // // console.log('⚠️ Measure returned 0, using fallback');
                    setMenuAnchor({ x: 300, y: 100, height: 40 });
                } else {
                    setMenuAnchor({ x: pageX, y: pageY, height });
                }

                setMenuVisible(true);
                // // console.log('✅ Menu should be visible now');
            });
        } else {
            // // console.log('⚠️ menuAnchorRef is null, using fallback');
            // Fallback if ref is not available
            setMenuAnchor({ x: 300, y: 100, height: 40 });
            setMenuVisible(true);
        }
    };

    const handleCopyLink = async () => {
        try {
            const postId = post.id || post._id;
            const link = `vibe://post/${postId}`;

            // console.log('📋 Copying link:', link);

            // For now, just show alert
            // TODO: Implement actual clipboard copy when Clipboard API is available
            Alert.alert(
                'Link Copied',
                `Post link copied!\n\n${link}`,
                [{ text: 'OK' }]
            );
        } catch (error) {
            console.error('❌ Copy link error:', error);
            Alert.alert('Error', 'Failed to copy link');
        }
    };

    const handleSavePost = async () => {
        if (!user?.token) {
            Alert.alert('Error', 'You must be logged in to save posts');
            return;
        }

        const postId = post.id || post._id;
        // console.log('💾 Saving post:', postId);

        const wasSaved = isSaved;
        const newIsSaved = !wasSaved;
        setIsSaved(newIsSaved);

        // Animate
        Animated.sequence([
            Animated.timing(saveScale, { toValue: 1.3, duration: 100, useNativeDriver: true }),
            Animated.spring(saveScale, { toValue: 1, friction: 3, useNativeDriver: true }),
        ]).start();

        try {
            const url = `${API_BASE_URL}/api/auth/save/${postId}`;
            // console.log('📡 Save request to:', url);

            const response = await fetch(url, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${user.token}`,
                    'Content-Type': 'application/json'
                }
            });

            // console.log('📥 Save response status:', response.status);

            if (response.ok) {
                // console.log('✅ Post save/unsave toggled successfully');
                // State already updated optimistically
            } else {
                const errorText = await response.text();
                setIsSaved(wasSaved); // Revert
                console.error('❌ Save failed:', response.status, errorText);

                let errorMessage = 'Failed to save post';
                try {
                    const err = JSON.parse(errorText);
                    errorMessage = err.message || err.error || errorMessage;
                } catch {
                    errorMessage = errorText || `Error ${response.status}`;
                }

                Alert.alert(
                    'Save Failed',
                    `${errorMessage}\n\nPlease check:\n- Backend server is running\n- You are logged in`,
                    [{ text: 'OK' }]
                );
            }
        } catch (error: any) {
            console.error('❌ Save error:', error);

            let errorMsg = error.message || 'Unknown error';
            if (errorMsg.includes('Network request failed')) {
                errorMsg = 'Cannot connect to server.\n\nPlease check:\n1. Backend is running\n2. Server is on port 5000\n3. Your internet connection';
            }

            Alert.alert('Error', errorMsg, [{ text: 'OK' }]);
            setIsSaved(wasSaved);
        }
    };

    const handleReportPost = async () => {
        const postId = post.id || post._id;
        // console.log('🚩 Reporting post:', postId);

        Alert.alert(
            'Report Post',
            'Why are you reporting this post?',
            [
                {
                    text: 'Spam',
                    onPress: () => submitReport('spam')
                },
                {
                    text: 'Inappropriate Content',
                    onPress: () => submitReport('inappropriate')
                },
                {
                    text: 'Harassment',
                    onPress: () => submitReport('harassment')
                },
                {
                    text: 'Cancel',
                    style: 'cancel'
                }
            ]
        );
    };

    const submitReport = async (reason: string) => {
        if (!user?.token) {
            Alert.alert('Error', 'You must be logged in to report posts');
            return;
        }

        const postId = post.id || post._id;
        // console.log('📡 Submitting report:', reason);

        try {
            const url = `${API_BASE_URL}/api/posts/${postId}/report`;
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${user.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ reason })
            });

            if (response.ok) {
                // console.log('✅ Report submitted');
                Alert.alert(
                    'Thank You',
                    'Your report has been submitted. We\'ll review it shortly.',
                    [{ text: 'OK' }]
                );
            } else {
                console.error('❌ Report failed:', response.status);
                Alert.alert(
                    'Report Failed',
                    'Failed to submit report. Please try again later.',
                    [{ text: 'OK' }]
                );
            }
        } catch (error: any) {
            console.error('❌ Report error:', error);

            // For now, show success even if backend fails
            // This is better UX than showing error
            Alert.alert(
                'Thank You',
                'Your report has been recorded.',
                [{ text: 'OK' }]
            );
        }
    };

    const formatDate = (dateString: string) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const caption = post.caption || '';
    const isLongCaption = caption.length > 100;
    const paddingTime = post.createdAt ? formatDate(post.createdAt) : post.timeAgo;

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                {/* ... (user info part) ... */}
                <TouchableOpacity
                    style={styles.userInfo}
                    onPress={() => {
                        const postUserId = post.user?.id || post.user?._id;
                        const currentUserId = user?._id || user?.id;
                        if (postUserId && currentUserId && postUserId.toString() === currentUserId.toString()) {
                            router.push('/profile');
                        } else {
                            router.push({ pathname: '/user/[id]', params: { id: postUserId || '1' } });
                        }
                    }}
                >
                    <Image source={{ uri: getValidUri(post.user?.avatar) || 'https://i.pravatar.cc/100?u=user_fallback' }} style={styles.avatar} />
                    <View style={styles.usernameContainer}>
                        <Text style={styles.username}>{post.user?.name || 'Unknown'}</Text>
                        <View style={styles.metaRow}>
                            <Text style={styles.time}>{paddingTime}</Text>
                            <Text style={styles.dot}>•</Text>
                            <Image source={{ uri: 'https://cdn-icons-png.flaticon.com/512/44/44386.png' }} style={styles.globeIconBase} tintColor={colors.textSecondary} />
                        </View>
                    </View>
                </TouchableOpacity>
                <View style={styles.headerActions}>
                    {!isOwner && (
                        <TouchableOpacity
                            onPress={handleFollowUser}
                            disabled={followLoading}
                            style={[
                                styles.followBtn,
                                (userIsFollowing || userIsRequested) && styles.followingBtn
                            ]}
                        >
                            {followLoading ? (
                                <ActivityIndicator size="small" color={(userIsFollowing || userIsRequested) ? colors.text : '#FFFFFF'} />
                            ) : (
                                <Text style={[
                                    styles.followBtnText,
                                    (userIsFollowing || userIsRequested) && styles.followingBtnText
                                ]}>
                                    {userIsFollowing ? 'Following' : userIsRequested ? 'Requested' : 'Follow'}
                                </Text>
                            )}
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity onPress={handleOpenMenu} style={styles.menuButton}>
                        <Ionicons name="ellipsis-horizontal" size={20} color={colors.textSecondary} />
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.captionContainer}>
                {isEditing ? (
                    <View style={styles.editContainer}>
                        <TextInput
                            style={styles.editInput}
                            value={editedCaption}
                            onChangeText={setEditedCaption}
                            multiline
                        />
                        <View style={styles.editActions}>
                            <TouchableOpacity onPress={() => setIsEditing(false)} style={styles.cancelEditBtn}>
                                <Text style={styles.cancelEditText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={handleUpdate} style={styles.saveEditBtn}>
                                <Text style={styles.saveEditText}>Save</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                ) : (
                    <Text style={styles.caption}>
                        {showFullCaption || !isLongCaption ? (post.caption || editedCaption) : `${(post.caption || editedCaption).substring(0, 100)}... `}
                        {isLongCaption && !showFullCaption && (
                            <Text onPress={() => setShowFullCaption(true)} style={styles.seeMore}>
                                See More
                            </Text>
                        )}
                        {isLongCaption && showFullCaption && (
                            <Text onPress={() => setShowFullCaption(false)} style={styles.seeMore}>
                                {` See Less`}
                            </Text>
                        )}
                    </Text>
                )}
            </View>

            <TapGestureHandler
                ref={doubleTapRef}
                numberOfTaps={2}
                onHandlerStateChange={onDoubleTap}
            >
                <View style={styles.mediaContainer}>
                    {hasVideo ? (
                        <FeedVideo
                            videoSource={videoSource}
                            posterSource={post.image}
                            isMuted={isMuted}
                            setIsMuted={setIsMuted}
                            active={active}
                            styles={styles}
                            doubleTapRef={doubleTapRef}
                        />
                    ) : (
                        <Image
                            source={{ uri: getValidUri(post.image || post.uri) }}
                            style={styles.media}
                            resizeMode="cover"
                            onError={(e) => {
                                if (__DEV__) {
                                    // console.log('❌ Image Load Error:', e.nativeEvent.error, 'URI:', getValidUri(post.image || post.uri));
                                }
                                // In Prod: Fail silently (Image component might show blank or grey, which is better than crash or alert)
                            }}
                        />
                    )}

                    {/* Animated Heart Overlay */}
                    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
                        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                            <Animated.View style={{ transform: [{ scale: likeScale }], shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { height: 5, width: 0 }, shadowColor: '#000' }}>
                                <Ionicons name="heart" size={100} color="white" />
                            </Animated.View>
                        </View>
                    </View>
                </View>
            </TapGestureHandler>

            <View style={styles.footer}>
                <View style={styles.actions}>
                    <View style={styles.actionGroup}>
                        <TouchableOpacity style={styles.actionButton} onPress={handleLike} activeOpacity={0.7}>
                            <Ionicons name={isLiked ? "heart" : "heart-outline"} size={22} color={isLiked ? "#FF3B30" : colors.text} />
                            <Text style={styles.actionText}>{likesCount}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.actionButton} onPress={() => setShowCommentsModal(true)}>
                            <Ionicons name="chatbubble-outline" size={22} color={colors.text} />
                            {commentsCount > 0 && <Text style={styles.actionText}>{commentsCount}</Text>}
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
                            <Ionicons name="paper-plane-outline" size={22} color={colors.text} style={{ transform: [{ rotate: '5deg' }] }} />
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity style={styles.actionButton} onPress={handleSavePost}>
                        <Animated.View style={{ transform: [{ scale: saveScale }] }}>
                            <Ionicons 
                                name={isSaved ? "bookmark" : "bookmark-outline"} 
                                size={21} 
                                color={isSaved ? "#FACD00" : colors.text} 
                            />
                        </Animated.View>
                    </TouchableOpacity>
                </View>
            </View>

            <CommentsModal
                visible={showCommentsModal}
                onClose={() => setShowCommentsModal(false)}
                postId={post.id || post._id}
                initialComments={comments}
                onCommentAdded={(newCount) => setCommentsCount(newCount)}
            />

            <ShareToUsersModal
                visible={showShareModal}
                onClose={() => setShowShareModal(false)}
                post={post}
            />

            <PostOptionsMenu
                visible={menuVisible}
                onClose={() => setMenuVisible(false)}
                anchor={menuAnchor}
                isOwner={!!isOwner}
                onEdit={() => setIsEditing(true)}
                onDelete={handleDelete}
                onReport={handleReportPost}
                onShare={handleShare}
                onCopyLink={handleCopyLink}
                onSave={handleSavePost}
            />

            {/* Delete Confirmation Modal */}
            <DeleteConfirmModal
                visible={deleteConfirmVisible}
                onClose={() => setDeleteConfirmVisible(false)}
                onConfirm={confirmDelete}
                title="Delete Post?"
                message="Are you sure you want to delete this post? This action cannot be undone."
            />

            {/* Delete Success Modal */}
            <ConfirmationModal
                visible={deleteSuccessVisible}
                onClose={() => setDeleteSuccessVisible(false)}
                title="Post Deleted"
                message="Your post has been deleted successfully"
                type="success"
            />

            {/* Delete Error Modal */}
            <ConfirmationModal
                visible={deleteErrorVisible}
                onClose={() => setDeleteErrorVisible(false)}
                title="Delete Failed"
                message="Failed to delete post. Please try again."
                type="error"
            />
        </View>
    );
}


