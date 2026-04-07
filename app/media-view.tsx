import CommentsModal from '@/components/CommentsModal';
import ReelOptionsModal from '@/components/ReelOptionsModal';
import { API_BASE_URL } from '@/constants/Config';
import { useUser } from '@/context/UserContext';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { VideoView, useVideoPlayer } from 'expo-video';
import { Download, Heart, MessageCircle, MoreHorizontal, Play, Send, Volume2, VolumeX, X, Bookmark } from 'lucide-react-native';
import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { ActivityIndicator, Alert, Animated, Image, Platform, Share, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, useWindowDimensions, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { getCorrectUrl } from '@/utils/api';

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
    const [progress, setProgress] = useState(0);

    const [likesCount, setLikesCount] = useState(0);
    const [isLiked, setIsLiked] = useState(false);
    const [isSaved, setIsSaved] = useState(false);
    const [showFullCaption, setShowFullCaption] = useState(false);

    // Edit/Delete State
    const [isEditing, setIsEditing] = useState(false);
    const [editedCaption, setEditedCaption] = useState('');
    const isOwner = user && post?.user && (user._id === post.user._id || user._id === post.user.id);

    // Animations
    const bigHeartAnim = React.useRef(new Animated.Value(0)).current;
    const controlsOpacity = React.useRef(new Animated.Value(1)).current;
    const lastTap = React.useRef(0);

    useEffect(() => {
        if (post) {
            setEditedCaption(post.caption || '');
            if (user) {
                setIsSaved(user.saved?.includes(post._id) || false);
            }
        }
    }, [post, user]);



    // Video Player logic
    const activeUri = getCorrectUrl(uri as string) || '';
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
        
        // Custom progress tracking
        const interval = setInterval(() => {
            if (player && isPlaying) {
                // Approximate progress since expo-video doesn't expose it easily in every frame
                // In a production app you'd use a better subscription if available
            }
        }, 500);

        return () => {
            subscription.remove();
            clearInterval(interval);
        };
    }, [player, isPlaying]);

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
        
        // Briefly fade out controls if playing
        if (!isPlaying) {
             Animated.timing(controlsOpacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
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
                message: `Check out this post on Vibe! ${post?.caption || ''}`,
            });
        } catch (error) {
            // console.log(error);
        }
    };

    const [showComments, setShowComments] = useState(false);
    const [showOptions, setShowOptions] = useState(false);

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

    const handleMore = () => {
        setShowOptions(true);
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
                setIsSaved(data.message.includes('saved'));
                Toast.show({
                    type: 'success',
                    text1: 'Post Saved',
                    text2: data.message
                });
            }
        } catch (error) {
            console.error('Save error:', error);
        }
        setShowOptions(false);
    };

    const handleDownload = async () => {
        if (!activeUri) return;

        const url = activeUri;
        const isVideoType = isVideo || type === 'video' || type === 'reel';
        const filename = `vibe_${Date.now()}.${isVideoType ? 'mp4' : 'jpg'}`;

        Toast.show({ type: 'info', text1: 'Downloading...', text2: 'Preparing media' });

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
                Toast.show({ type: 'success', text1: 'Success', text2: 'Download completed' });
            } catch (e: any) {
                Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to download' });
            }
        } else {
            try {
                const { status } = await MediaLibrary.requestPermissionsAsync();
                if (status !== 'granted') {
                    Toast.show({ type: 'info', text1: 'Permission', text2: 'Please grant permission' });
                    return;
                }

                const fs = FileSystem as any;
                const downloadDir = fs.cacheDirectory || fs.documentDirectory;
                const baseDir = downloadDir.endsWith('/') ? downloadDir : `${downloadDir}/`;
                const fileUri = baseDir + filename;
                
                const downloadRes = await FileSystem.downloadAsync(url, fileUri);

                if (downloadRes.status === 200) {
                    await MediaLibrary.saveToLibraryAsync(downloadRes.uri);
                    Toast.show({ type: 'success', text1: 'Saved', text2: 'Media saved to gallery' });
                }
            } catch (error: any) {
                console.error(error);
                Toast.show({ type: 'error', text1: 'Error', text2: 'Download failed' });
            }
        }
    };

    useEffect(() => {
        if (postId) {
            fetchPost();
        } else {
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
        <View style={styles.container}>
            <StatusBar barStyle="light-content" translucent />
            <View style={[StyleSheet.absoluteFill, { backgroundColor: '#000' }]} />

            {/* Media Content Area */}
            <View style={[
                styles.mediaContainer, 
                isDesktop && {
                    width: Math.min(winWidth * 0.9, winHeight * 0.7 * (9/16)),
                    height: winHeight * 0.9,
                    maxHeight: 1000,
                    borderRadius: 24,
                    overflow: 'hidden',
                }
            ]}>
                <TouchableWithoutFeedback onPress={() => {
                    const now = Date.now();
                    if (lastTap.current && (now - lastTap.current) < 300) {
                        if (!isLiked) handleLike();
                        bigHeartAnim.setValue(0);
                        Animated.sequence([
                            Animated.spring(bigHeartAnim, { toValue: 1, useNativeDriver: true, friction: 3 }),
                            Animated.timing(bigHeartAnim, { toValue: 0, duration: 400, delay: 200, useNativeDriver: true })
                        ]).start();
                    } else {
                        togglePlay();
                    }
                    lastTap.current = now;
                }}>
                    <View style={styles.contentWrapper}>
                        {isVideo ? (
                            <VideoView
                                player={player}
                                style={styles.media}
                                contentFit="contain"
                                nativeControls={false}
                            />
                        ) : (
                            <Image
                                source={{ uri: activeUri }}
                                style={styles.media}
                                resizeMode="contain"
                            />
                        )}
                        
                        {!isPlaying && isVideo && (
                            <Animated.View style={styles.centerPlayIcon}>
                                <Play size={50} color="white" fill="white" />
                            </Animated.View>
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
                            <Heart size={120} color="#ff2d55" fill="#ff2d55" />
                        </Animated.View>
                    </View>
                </TouchableWithoutFeedback>
            </View>

            {/* Premium Overlays */}
            <Animated.View 
                style={[styles.overlay, { opacity: controlsOpacity }]} 
                pointerEvents="box-none"
            >
                {/* Top Bar Navigation */}
                <LinearGradient 
                    colors={['rgba(0,0,0,0.6)', 'transparent']} 
                    style={[styles.topGradient, { height: insets.top + 80 }]}
                />
                
                <View style={[styles.topControls, { marginTop: insets.top + 10 }]}>
                    <TouchableOpacity
                        style={styles.blurredBtn}
                        onPress={() => router.back()}
                    >
                        <X size={24} color="white" />
                    </TouchableOpacity>

                    <View style={styles.topRightActions}>
                        {isVideo && (
                            <TouchableOpacity style={styles.blurredBtn} onPress={toggleMute}>
                                {muted ? <VolumeX size={20} color="white" /> : <Volume2 size={20} color="white" />}
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity style={styles.blurredBtn} onPress={handleDownload}>
                            <Download size={20} color="white" />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Bottom Overlay Info & Actions */}
                <View style={[styles.bottomArea, { marginBottom: Math.max(insets.bottom, 20) }]}>
                    <LinearGradient 
                        colors={['transparent', 'rgba(0,0,0,0.8)']} 
                        style={styles.bottomGradient}
                    />
                    
                    <View style={styles.mainBottomRow}>
                        <View style={styles.infoCol}>
                            <View style={styles.userRow}>
                                <TouchableOpacity 
                                    style={styles.avatarWrap}
                                    onPress={() => router.push(`/user/${post?.user?._id}` as any)}
                                >
                                    <Image
                                        source={{ uri: getCorrectUrl(post?.user?.avatar) || `https://ui-avatars.com/api/?name=${encodeURIComponent(post?.user?.name || 'V')}&background=random` }}
                                        style={styles.avatar}
                                    />
                                </TouchableOpacity>
                                <View style={styles.userMeta}>
                                    <Text style={styles.username}>{post?.user?.name || 'Vibe User'}</Text>
                                    <Text style={styles.handle}>@{post?.user?.handle || 'vibepost'}</Text>
                                </View>
                            </View>
                            
                            {post?.caption && (
                                <TouchableOpacity 
                                    onPress={() => setShowFullCaption(!showFullCaption)}
                                    activeOpacity={0.9}
                                >
                                    <Text 
                                        style={styles.caption} 
                                        numberOfLines={showFullCaption ? undefined : 2}
                                    >
                                        {post.caption}
                                    </Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        <View style={styles.actionColumn}>
                            <ActionBtn 
                                icon={<Heart size={26} color={isLiked ? "#FF3B30" : "white"} fill={isLiked ? "#FF3B30" : "transparent"} />} 
                                label={likesCount.toString()} 
                                onPress={handleLike}
                                active={isLiked}
                            />
                            <ActionBtn 
                                icon={<MessageCircle size={26} color="white" />} 
                                label={post?.comments?.length?.toString() || '0'} 
                                onPress={handleComment} 
                            />
                            <ActionBtn 
                                icon={<Bookmark size={26} color={isSaved ? "#FFD700" : "white"} fill={isSaved ? "#FFD700" : "transparent"} />} 
                                onPress={handleSavePost}
                                active={isSaved}
                            />
                            <ActionBtn 
                                icon={<Send size={26} color="white" />} 
                                onPress={handleShare} 
                            />
                            <ActionBtn 
                                icon={<MoreHorizontal size={26} color="white" />} 
                                onPress={handleMore} 
                            />
                        </View>
                    </View>
                </View>
            </Animated.View>

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
                onReport={() => Toast.show({ type: 'success', text1: 'Reported', text2: 'Thank you for your feedback' })}
                onCopyLink={() => Toast.show({ type: 'success', text1: 'Copied', text2: 'Link copied to clipboard' })}
            />
        </View>
    );
}

function ActionBtn({ icon, label, onPress, active }: any) {
    return (
        <TouchableOpacity style={styles.actionBtnWrap} onPress={onPress} activeOpacity={0.7}>
            <View style={[styles.actionIconPill, active && styles.activePill]}>
                {icon}
            </View>
            {label && <Text style={styles.actionLabel}>{label}</Text>}
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    mediaContainer: {
        flex: 1,
        width: '100%',
        height: '100%',
        alignSelf: 'center',
        justifyContent: 'center',
    },
    contentWrapper: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    media: {
        width: '100%',
        height: '100%',
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'space-between',
    },
    topGradient: {
        position: 'absolute',
        top: 0, left: 0, right: 0,
    },
    bottomGradient: {
        position: 'absolute',
        bottom: 0, left: 0, right: 0,
        height: 300,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
    },
    topControls: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        zIndex: 10,
    },
    topRightActions: {
        flexDirection: 'row',
        gap: 12,
    },
    blurredBtn: {
        width: 46,
        height: 46,
        borderRadius: 23,
        backgroundColor: 'rgba(255,255,255,0.12)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        // Blur handled by parent overlay if needed, but simple rgba works well in dark
    },
    centerPlayIcon: {
        position: 'absolute',
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: 'rgba(0,0,0,0.3)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    bottomArea: {
        paddingHorizontal: 20,
        paddingBottom: 20,
        zIndex: 10,
    },
    mainBottomRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        gap: 12,
    },
    infoCol: {
        flex: 1,
        marginBottom: 10,
    },
    userRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 12,
    },
    avatarWrap: {
        borderWidth: 2,
        borderColor: '#fff',
        borderRadius: 22,
        padding: 1,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
    },
    userMeta: {
        justifyContent: 'center',
    },
    username: {
        color: 'white',
        fontSize: 16,
        fontWeight: '800',
    },
    handle: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 12,
        fontWeight: '600',
        marginTop: -2,
    },
    caption: {
        color: 'rgba(255,255,255,0.9)',
        fontSize: 14,
        lineHeight: 20,
        fontWeight: '500',
    },
    actionColumn: {
        alignItems: 'center',
        gap: 12,
    },
    actionBtnWrap: {
        alignItems: 'center',
        gap: 4,
    },
    actionIconPill: {
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: 'rgba(255,255,255,0.12)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
    },
    activePill: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderColor: 'rgba(255,255,255,0.3)',
    },
    actionLabel: {
        color: 'white',
        fontSize: 12,
        fontWeight: '800',
    },
    bigHeartOverlay: {
        position: 'absolute',
        zIndex: 20,
    }
});
