
import CommentsModal from '@/components/CommentsModal';
import ReelOptionsModal from '@/components/ReelOptionsModal';
import { API_BASE_URL } from '@/constants/Config';
import { useUser } from '@/context/UserContext';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { VideoView, useVideoPlayer } from 'expo-video';
import { Download, Heart, MessageCircle, MoreHorizontal, Play, Send, Volume2, VolumeX, X } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, Image, Platform, Share, StyleSheet, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

const { width, height } = Dimensions.get('window');

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
            console.log(error);
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

    return (
        <View style={styles.container}>
            {isVideo && activeUri ? (
                <TouchableWithoutFeedback onPress={togglePlay}>
                    <View style={styles.videoWrapper}>
                        <VideoView
                            player={player}
                            style={styles.media}
                            contentFit="contain"
                            nativeControls={false}
                        />
                        {!isPlaying && (
                            <View style={styles.centerPlayIcon}>
                                <Play size={64} color="rgba(255,255,255,0.7)" fill="rgba(255,255,255,0.7)" />
                            </View>
                        )}
                    </View>
                </TouchableWithoutFeedback>
            ) : activeUri ? (
                <Image
                    source={{ uri: activeUri }}
                    style={styles.media}
                    resizeMode="contain"
                />
            ) : null}

            <View style={[styles.overlay, { paddingTop: insets.top, paddingBottom: insets.bottom }]} pointerEvents="box-none">
                <View style={styles.topControls}>
                    <TouchableOpacity
                        style={styles.closeButton}
                        onPress={() => {
                            if (router.canGoBack()) {
                                router.back();
                            } else {
                                router.replace('/(tabs)');
                            }
                        }}
                        hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
                    >
                        <X size={28} color="white" />
                    </TouchableOpacity>

                    {type === 'video' && (
                        <TouchableOpacity style={styles.muteButton} onPress={toggleMute}>
                            {muted ? (
                                <VolumeX size={24} color="white" />
                            ) : (
                                <Volume2 size={24} color="white" />
                            )}
                        </TouchableOpacity>
                    )}
                </View>

                {loading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="white" />
                    </View>
                ) : (
                    <View style={styles.contentOverlay}>
                        <View style={styles.bottomInfo}>
                            <View style={styles.userInfo}>
                                <Image
                                    source={{ uri: post?.user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(post?.user?.name || 'User')}&background=random` }}
                                    style={styles.avatar}
                                />
                                <Text style={styles.username}>
                                    {post?.user?.name || 'Unknown'}
                                </Text>
                            </View>
                            {isEditing ? (
                                <View style={{ width: '100%', marginBottom: 10 }}>
                                    <TextInput
                                        value={editedCaption}
                                        onChangeText={setEditedCaption}
                                        style={{ backgroundColor: 'rgba(255,255,255,0.2)', color: 'white', borderRadius: 8, padding: 8, marginBottom: 8 }}
                                        multiline
                                        autoFocus
                                    />
                                    <View style={{ flexDirection: 'row', gap: 10 }}>
                                        <TouchableOpacity onPress={handleUpdate} style={{ backgroundColor: 'white', padding: 6, borderRadius: 4 }}>
                                            <Text style={{ fontWeight: 'bold' }}>Save</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity onPress={() => setIsEditing(false)} style={{ backgroundColor: 'rgba(0,0,0,0.5)', padding: 6, borderRadius: 4 }}>
                                            <Text style={{ color: 'white' }}>Cancel</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ) : (
                                post?.caption && (
                                    <Text style={styles.caption}>
                                        {!showFullCaption && post.caption.length > 50 ? `${post.caption.substring(0, 50)}... ` : post.caption}
                                        {post.caption.length > 50 && (
                                            <Text onPress={() => setShowFullCaption(!showFullCaption)} style={{ fontWeight: 'bold' }}>
                                                {showFullCaption ? ' See Less' : ' See More'}
                                            </Text>
                                        )}
                                    </Text>
                                )
                            )}
                        </View>

                        <View style={styles.actionsColumn}>
                            <TouchableOpacity style={styles.actionItem} onPress={handleLike}>
                                <Heart size={30} color={isLiked ? "#FF3B30" : "white"} fill={isLiked ? "#FF3B30" : "transparent"} />
                                <Text style={styles.actionText}>
                                    {likesCount}
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.actionItem} onPress={handleComment}>
                                <MessageCircle size={30} color="white" />
                                <Text style={styles.actionText}>
                                    {post?.comments?.length || 0}
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.actionItem} onPress={handleShare}>
                                <Send size={30} color="white" />
                                <Text style={styles.actionText}>Share</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.actionItem} onPress={handleDownload}>
                                <Download size={30} color="white" />
                                <Text style={styles.actionText}>Save</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.actionItem} onPress={handleMore}>
                                <MoreHorizontal size={30} color="white" />
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
        backgroundColor: 'black',
        justifyContent: 'center',
        alignItems: 'center',
    },
    media: {
        width: width,
        height: height,
        position: 'absolute',
    },
    overlay: {
        flex: 1,
        width: '100%',
        justifyContent: 'space-between',
    },
    topControls: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        paddingRight: 20,
    },
    closeButton: {
        marginLeft: 20,
        marginTop: 10,
        padding: 8,
        backgroundColor: 'rgba(0,0,0,0.3)',
        borderRadius: 20,
    },
    muteButton: {
        marginTop: 10,
        padding: 8,
        backgroundColor: 'rgba(0,0,0,0.3)',
        borderRadius: 20,
    },
    videoWrapper: {
        width: width,
        height: height,
        position: 'absolute',
        justifyContent: 'center',
        alignItems: 'center',
    },
    centerPlayIcon: {
        position: 'absolute',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.3)',
        borderRadius: 50,
        padding: 20,
    },
    contentOverlay: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        padding: 20,
        paddingBottom: 40,
        width: '100%',
    },
    bottomInfo: {
        flex: 1,
        marginRight: 20,
        justifyContent: 'flex-end',
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
        gap: 10,
    },
    avatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'white',
    },
    username: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
    },
    caption: {
        color: 'white',
        fontSize: 14,
        lineHeight: 20,
    },
    actionsColumn: {
        alignItems: 'center',
        gap: 20,
        marginBottom: 20,
    },
    actionItem: {
        alignItems: 'center',
        gap: 5,
    },
    actionText: {
        color: 'white',
        fontSize: 12,
        fontWeight: '600',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    }
});
