
import CommentsModal from '@/components/CommentsModal';
import ReelOptionsModal from '@/components/ReelOptionsModal';
import { API_BASE_URL } from '@/constants/Config';
import { useUser } from '@/context/UserContext';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { VideoView, useVideoPlayer } from 'expo-video';
import { Download, Heart, MessageCircle, MoreHorizontal, Play, Send, Volume2, VolumeX, X } from 'lucide-react-native';
import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { ActivityIndicator, Alert, Animated, Image, Platform, Share, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, useWindowDimensions, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';


export default function MediaViewScreen() {
    const router = useRouter();
    const { user } = (useUser() || {}) as any;
    const { uri, postId, type } = useLocalSearchParams();
    const insets = useSafeAreaInsets();
    const [post, setPost] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [muted, setMuted] = useState(false);
    const [playing, setPlaying] = useState(true);
    const [isPlaying, setIsPlaying] = useState(true);

    const [likesCount, setLikesCount] = useState(0);
    const [isLiked, setIsLiked] = useState(false);
    const [showFullCaption, setShowFullCaption] = useState(false);

    // Edit/Delete State
    const [isEditing, setIsEditing] = useState(false);
    const [editedCaption, setEditedCaption] = useState('');
    const isOwner = user && post?.user && (user._id === post.user._id || user._id === post.user.id);

    // Animations
    const bigHeartAnim = React.useRef(new Animated.Value(0)).current;
    const lastTap = React.useRef(0);

    useEffect(() => {
        if (post) setEditedCaption(post.caption || '');
    }, [post]);

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

    // Video Player logic
    const activeUri = getValidUri(uri as string);
    const isVideo = type === 'video' || type === 'reel';

    const player = useVideoPlayer(activeUri, player => {
        player.loop = true;
        player.muted = muted;
    });

    useEffect(() => {
        const subscription = player.addListener('playingChange', (event) => {
            setIsPlaying(event.isPlaying);
            setPlaying(event.isPlaying);
        });
        return () => subscription.remove();
    }, [player]);

    useEffect(() => {
        if (playing) {
            player.play();
        } else {
            player.pause();
        }
    }, [playing, player]);

    useEffect(() => {
        player.muted = muted;
    }, [muted, player]);

    const togglePlay = () => {
        if (isPlaying) {
            player.pause();
        } else {
            player.play();
        }
    };

    const toggleMute = () => {
        setMuted(!muted);
    };

    const handleLike = async () => {
        if (!user || !user.token) return;

        const newLiked = !isLiked;
        setIsLiked(newLiked);
        setLikesCount(prev => newLiked ? prev + 1 : prev - 1);

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        try {
            await fetch(`${API_BASE_URL}/api/posts/${postId}/like`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${user.token}`
                }
            });
        } catch (error) {
            console.error('Like error:', error);
            setIsLiked(!newLiked);
            setLikesCount(prev => !newLiked ? prev + 1 : prev - 1);
        }
    };

    const handleShare = async () => {
        try {
            await Share.share({
                message: `Check out this post! ${post?.caption || ''}`,
            });
        } catch (error) {
            // console.log(error);
        }
    };

    const [showComments, setShowComments] = useState(false);
    const [showOptions, setShowOptions] = useState(false);
    const [menuAnchor, setMenuAnchor] = useState({ x: 0, y: 0, height: 0 }); // Placeholder if needed, ReelOptions might just be bottom sheet

    const handleComment = () => {
        setShowComments(true);
    };

    const handleDelete = async () => {
        if (!user?.token) return;
        try {
            const response = await fetch(`${API_BASE_URL}/api/posts/${postId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${user.token}` }
            });
            if (response.ok) {
                router.back();
            } else {
                Alert.alert('Error', 'Failed to delete');
            }
        } catch (e) { console.error(e); }
    };

    const handleUpdate = async () => {
        if (!user?.token) return;
        try {
            const response = await fetch(`${API_BASE_URL}/api/posts/${postId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${user.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ caption: editedCaption })
            });
            if (response.ok) {
                const updated = await response.json();
                setPost({ ...post, caption: updated.caption });
                setIsEditing(false);
                Alert.alert('Success', 'Updated!');
            } else {
                Alert.alert('Error', 'Failed to update');
            }
        } catch (e) { console.error(e); }
    };

    const handleMore = () => {
        setShowOptions(true);
    };

    const handleCopyLink = () => {
        Alert.alert('Copied', 'Link copied to clipboard');
    };

    const handleSavePost = async () => {
        if (!user?.token || !postId) return;

        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/save/${postId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${user.token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                Alert.alert('Success', data.message);
            } else {
                Alert.alert('Error', 'Failed to save');
            }
        } catch (error) {
            console.error('Save error:', error);
            Alert.alert('Error', 'Failed to save');
        }
        setShowOptions(false);
    };

    const handleDownload = async () => {
        if (!activeUri) return;

        const url = activeUri;
        const isVideoType = isVideo || type === 'video' || type === 'reel';
        const filename = `vibe_${Date.now()}.${isVideoType ? 'mp4' : 'jpg'}`;

        if (Platform.OS === 'web') {
            try {
                const response = await fetch(url, { mode: 'cors' });
                const blob = await response.blob();
                const blobUrl = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = blobUrl;
                link.download = filename;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                window.URL.revokeObjectURL(blobUrl);
                Toast.show({
                    type: 'success',
                    text1: 'Success',
                    text2: 'Download started'
                });
            } catch (e: any) {
                Toast.show({
                    type: 'error',
                    text1: 'Error',
                    text2: 'Failed to download'
                });
            }
        } else {
            try {
                const { status } = await MediaLibrary.requestPermissionsAsync();
                if (status !== 'granted') {
                    Toast.show({
                        type: 'info',
                        text1: 'Permission',
                        text2: 'Please grant permission to save media'
                    });
                    return;
                }

                // 1. Determine download directory (using cast to avoid lint errors if types mismatch)
                const fs = FileSystem as any;
                const downloadDir = fs.cacheDirectory || fs.documentDirectory;

                if (!downloadDir) {
                    Toast.show({
                        type: 'error',
                        text1: 'Error',
                        text2: 'Storage unavailable'
                    });
                    return;
                }

                // Ensure trailing slash
                const baseDir = downloadDir.endsWith('/') ? downloadDir : `${downloadDir}/`;
                const fileUri = baseDir + filename;
                const downloadRes = await FileSystem.downloadAsync(url, fileUri);

                if (downloadRes.status === 200) {
                    await MediaLibrary.saveToLibraryAsync(downloadRes.uri);
                    Toast.show({
                        type: 'success',
                        text1: 'Saved',
                        text2: 'Media saved to gallery!'
                    });
                } else {
                    Toast.show({
                        type: 'error',
                        text1: 'Error',
                        text2: 'Failed to download'
                    });
                }
            } catch (error: any) {
                console.error(error);
                Toast.show({
                    type: 'error',
                    text1: 'Error',
                    text2: 'Download failed'
                });
            }
        }
    };

    const handleReportPost = () => {
        Alert.alert('Reported', 'Thanks for reporting.');
    };

    useEffect(() => {
        if (postId) {
            fetchPost();
        } else {
            // If no postId, we're just viewing media with URI
            setLoading(false);
        }
    }, [postId]);

    const fetchPost = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/posts/${postId}`);

            if (response.ok) {
                const data = await response.json();
                setPost(data);
                setLikesCount(data.likes?.length || 0);
                if (user) {
                    setIsLiked(data.likes?.includes(user._id) || false);
                }
            } else {
                console.error('Failed to fetch post:', response.status);
            }
        } catch (error) {
            console.error('Error fetching post:', error);
        } finally {
            setLoading(false);
        }
    };

    const { width: winWidth, height: winHeight } = useWindowDimensions();
    const isDesktop = winWidth > 768;

    return (
        <View style={[styles.container, { backgroundColor: '#000' }]}>
            <StatusBar barStyle="light-content" translucent />
            
            {/* Immersive Background Blur (Web/iOS support handled by overlay) */}
            <View style={[StyleSheet.absoluteFill, { backgroundColor: '#000' }]} />

            {/* Media Content */}
            <View style={[
                styles.mediaContainer, 
                isDesktop && {
                    width: Math.min(winWidth * 0.9, winHeight * 0.7 * (9/16)),
                    height: winHeight * 0.85,
                    maxHeight: 900,
                    borderRadius: 20,
                    overflow: 'hidden',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 20 },
                    shadowOpacity: 0.5,
                    shadowRadius: 30,
                    elevation: 10,
                }
            ]}>
                {isVideo && activeUri ? (
                    <TouchableWithoutFeedback onPress={() => {
                        const now = Date.now();
                        const DOUBLE_TAP_DELAY = 300;
                        if (lastTap.current && (now - lastTap.current) < DOUBLE_TAP_DELAY) {
                            if (!isLiked) handleLike();
                            bigHeartAnim.setValue(0);
                            Animated.sequence([
                                Animated.spring(bigHeartAnim, { toValue: 1, useNativeDriver: true, friction: 3 }),
                                Animated.timing(bigHeartAnim, { toValue: 0, duration: 500, delay: 200, useNativeDriver: true })
                            ]).start();
                        } else {
                            togglePlay();
                        }
                        lastTap.current = now;
                    }}>
                        <View style={styles.videoWrapper}>
                            <VideoView
                                player={player}
                                style={styles.media}
                                contentFit="contain"
                                nativeControls={false}
                            />
                            {!isPlaying && (
                                <View style={styles.centerPlayIcon}>
                                    <Play size={48} color="white" fill="white" />
                                </View>
                            )}
                            <Animated.View style={[
                                styles.bigHeartOverlay, 
                                { 
                                    opacity: bigHeartAnim,
                                    transform: [
                                        { scale: bigHeartAnim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1.5] }) }
                                    ]
                                }
                            ]}>
                                <Heart size={100} color="#ff2d55" fill="#ff2d55" />
                            </Animated.View>
                        </View>
                    </TouchableWithoutFeedback>
                ) : activeUri ? (
                    <TouchableWithoutFeedback onPress={() => {
                        const now = Date.now();
                        const DOUBLE_TAP_DELAY = 300;
                        if (lastTap.current && (now - lastTap.current) < DOUBLE_TAP_DELAY) {
                            if (!isLiked) handleLike();
                            bigHeartAnim.setValue(0);
                            Animated.sequence([
                                Animated.spring(bigHeartAnim, { toValue: 1, useNativeDriver: true, friction: 3 }),
                                Animated.timing(bigHeartAnim, { toValue: 0, duration: 500, delay: 200, useNativeDriver: true })
                            ]).start();
                        }
                        lastTap.current = now;
                    }}>
                        <View style={styles.imageWrapper}>
                            <Image
                                source={{ uri: activeUri }}
                                style={styles.media}
                                resizeMode="contain"
                            />
                            <Animated.View style={[
                                styles.bigHeartOverlay, 
                                { 
                                    opacity: bigHeartAnim,
                                    transform: [
                                        { scale: bigHeartAnim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1.5] }) }
                                    ]
                                }
                            ]}>
                                <Heart size={100} color="#ff2d55" fill="#ff2d55" />
                            </Animated.View>
                        </View>
                    </TouchableWithoutFeedback>
                ) : null}
            </View>

            {/* Overlays */}
            <View 
                style={[
                    styles.overlay, 
                    { 
                        paddingTop: insets.top + 10, 
                        paddingBottom: Math.max(insets.bottom, 20),
                    }
                ]} 
                pointerEvents="box-none"
            >
                {/* Header Actions */}
                <View style={styles.topControls}>
                    <TouchableOpacity
                        style={styles.circleButton}
                        onPress={() => router.back()}
                    >
                        <X size={24} color="white" />
                    </TouchableOpacity>

                    <View style={styles.topRightActions}>
                        {isVideo && (
                            <TouchableOpacity style={styles.circleButton} onPress={toggleMute}>
                                {muted ? <VolumeX size={20} color="white" /> : <Volume2 size={20} color="white" />}
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity style={styles.circleButton} onPress={handleDownload}>
                            <Download size={20} color="white" />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Bottom Content Area */}
                {!loading && (
                    <View style={[styles.contentOverlay, isDesktop && styles.desktopContentOverlay]}>
                        <View style={styles.bottomInfo}>
                            <View style={styles.userInfo}>
                                <Image
                                    source={{ uri: post?.user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(post?.user?.name || 'V')}&background=random` }}
                                    style={styles.avatar}
                                />
                                <View>
                                    <Text style={styles.username}>{post?.user?.name || 'Vibe User'}</Text>
                                    {post?.caption && (
                                        <Text style={styles.caption} numberOfLines={showFullCaption ? undefined : 2}>
                                            {post.caption}
                                        </Text>
                                    )}
                                </View>
                            </View>
                        </View>

                        <View style={styles.actionsColumn}>
                            <TouchableOpacity style={styles.actionItem} onPress={handleLike}>
                                <View style={[styles.actionIconBg, isLiked && { backgroundColor: 'rgba(255, 59, 48, 0.2)' }]}>
                                    <Heart size={24} color={isLiked ? "#FF3B30" : "white"} fill={isLiked ? "#FF3B30" : "transparent"} />
                                </View>
                                <Text style={styles.actionText}>{likesCount}</Text>
                            </TouchableOpacity>
                            
                            <TouchableOpacity style={styles.actionItem} onPress={handleComment}>
                                <View style={styles.actionIconBg}>
                                    <MessageCircle size={24} color="white" />
                                </View>
                                <Text style={styles.actionText}>{post?.comments?.length || 0}</Text>
                            </TouchableOpacity>
                            
                            <TouchableOpacity style={styles.actionItem} onPress={handleShare}>
                                <View style={styles.actionIconBg}>
                                    <Send size={24} color="white" />
                                </View>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.actionItem} onPress={handleMore}>
                                <View style={styles.actionIconBg}>
                                    <MoreHorizontal size={24} color="white" />
                                </View>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
            </View>

            <CommentsModal
                visible={showComments}
                onClose={() => setShowComments(false)}
                postId={postId as string}
                initialComments={post?.comments || []}
            />

            <ReelOptionsModal
                visible={showOptions}
                onClose={() => setShowOptions(false)}
                isOwner={!!isOwner}
                onEdit={() => setIsEditing(true)}
                onDelete={handleDelete}
                onSave={handleSavePost}
                onReport={handleReportPost}
                onCopyLink={handleCopyLink}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
        alignItems: 'center',
        justifyContent: 'center',
    },
    mediaContainer: {
        width: '100%',
        height: '100%',
        backgroundColor: '#000',
        justifyContent: 'center',
        alignItems: 'center',
    },
    videoWrapper: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    imageWrapper: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    media: {
        width: '100%',
        height: '100%',
    },
    overlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'space-between',
    },
    topControls: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        zIndex: 100,
    },
    topRightActions: {
        flexDirection: 'row',
        gap: 12,
    },
    circleButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(0,0,0,0.4)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    centerPlayIcon: {
        position: 'absolute',
        backgroundColor: 'rgba(0,0,0,0.3)',
        width: 80,
        height: 80,
        borderRadius: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    contentOverlay: {
        paddingHorizontal: 20,
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        paddingBottom: 20,
        maxWidth: 1200,
        alignSelf: 'center',
        width: '100%',
    },
    desktopContentOverlay: {
        paddingBottom: 40,
    },
    bottomInfo: {
        flex: 1,
        marginRight: 60,
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    username: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 4,
    },
    caption: {
        color: 'rgba(255,255,255,0.9)',
        fontSize: 14,
        marginTop: 4,
        lineHeight: 18,
    },
    actionsColumn: {
        alignItems: 'center',
        gap: 16,
    },
    actionItem: {
        alignItems: 'center',
        gap: 4,
    },
    actionIconBg: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: 'rgba(0,0,0,0.4)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    actionText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '700',
    },
    bigHeartOverlay: {
        position: 'absolute',
        zIndex: 10,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    }
});
