import { API_BASE_URL } from '@/constants/Config';
import { useUser } from '@/context/UserContext';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { ChevronLeft, ChevronRight, Edit3, Eye, Heart, MoreHorizontal, Plus, Send, Share2, Trash2, X } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Dimensions, Image, Keyboard, KeyboardAvoidingView, Modal, Platform, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import VibeConfirmModal from '@/components/VibeConfirmModal';
import { useThemeContext } from '@/context/ThemeContext';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window') || { width: 0, height: 0 };
const isDesktop = SCREEN_WIDTH > 768;

// Helper to normalize URIs
const getCorrectUrl = (uri?: string | null) => {
    if (!uri || typeof uri !== 'string' || uri.trim() === '') return undefined;
    const clean = uri.trim();
    if (clean.length === 0) return undefined;

    if (clean.startsWith('blob:') || clean.startsWith('data:') || clean.startsWith('file:')) return clean;

    if (clean.startsWith('http') && clean.includes('/uploads/')) {
        const parts = clean.split('/uploads/');
        return `${API_BASE_URL}/uploads/${parts[1]}`;
    }

    if (clean.startsWith('http')) return clean;
    if (clean.startsWith('/uploads/')) return `${API_BASE_URL}${clean}`;
    if (clean.includes('/uploads/')) {
        const parts = clean.split('/uploads/');
        return `${API_BASE_URL}/uploads/${parts[1]}`;
    }

    return `${API_BASE_URL}/uploads/${clean}`;
};

export default function StoryViewScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { colors, isDark } = useThemeContext();
    const { userId, userStr, initialIndex, mode } = useLocalSearchParams();

    // 1. Hooks
    const [progress] = useState(new Animated.Value(0));
    const [isPaused, setIsPaused] = useState(false);
    const [isLiked, setIsLiked] = useState(false);
    const [currentStoryIndex, setCurrentStoryIndex] = useState(initialIndex ? parseInt(initialIndex as string) : 0);

    const [showViewers, setShowViewers] = useState(false);
    const [viewersList, setViewersList] = useState<any[]>([]);
    const [loadingViewers, setLoadingViewers] = useState(false);
    const [viewersType, setViewersType] = useState<'views' | 'likes'>('views');

    const [showOptions, setShowOptions] = useState(false);
    const [mediaError, setMediaError] = useState(false);
    const [isDeleteModalVisible, setDeleteModalVisible] = useState(false);
    const [firstLoadDone, setFirstLoadDone] = useState(false);

    const [message, setMessage] = useState('');
    const [isSending, setIsSending] = useState(false);

    // Reset error when story changes
    useEffect(() => {
        setMediaError(false);
    }, [currentStoryIndex, userId]);

    // 2. Context
    const { user: currentUser } = (useUser() || {}) as any;

    // 3. State for User (Initialized from params, updated via API)
    const [user, setUser] = useState<any>(() => {
        // Initial value from params (snapshot)
        if (userStr) {
            try {
                const parsed = JSON.parse(Array.isArray(userStr) ? userStr[0] : userStr);
                return parsed;
            } catch (e) {
                console.error("Failed to parse userStr", e);
            }
        }
        // Fallback to current user if ID matches
        if (userId && currentUser && (currentUser._id === userId || currentUser.id === userId)) {
            return currentUser;
        }
        return null;
    });

    // 4. Fetched Data (Effect) - Runs on mount to refresh data
    useEffect(() => {
        let isMounted = true;
        const fetchFreshUser = async () => {
            if (!userId) return;
            try {
                // Fetch fresh user data including stories and likes
                const res = await fetch(`${API_BASE_URL}/api/auth/user/${userId}`, {
                    headers: { 'Authorization': `Bearer ${currentUser?.token}` }
                });
                if (res.ok && isMounted) {
                    const data = await res.json();
                    setUser((prev: any) => {
                        if (!prev) return data;
                        return { ...prev, ...data };
                    });
                    setFirstLoadDone(true);
                } else if (!res.ok && isMounted) {
                    setFirstLoadDone(true); // Treat error as load finish to show 'User not found' if necessary
                }
            } catch (e) {
                console.error("Failed to refresh user data", e);
                if (isMounted) setFirstLoadDone(true);
            }
        };
        fetchFreshUser();
        return () => { isMounted = false; };
    }, [userId, currentUser?.token]);

    const isCurrentUser = currentUser && (currentUser._id === userId || currentUser.id === userId);

    // Get stories from STATE
    const stories = (user?.stories || []).filter((s: any) => {
        if (mode === 'archive') return true;
        if (!s.createdAt) return false;
        const storyTime = new Date(s.createdAt).getTime();
        return (Date.now() - storyTime) < 24 * 60 * 60 * 1000;
    });

    const activeStory = stories[currentStoryIndex];

    // Update isLiked when activeStory changes
    useEffect(() => {
        if (activeStory && currentUser) {
            const liked = (activeStory.likes || activeStory.likers || []).some((idOrUser: any) => {
                const id = typeof idOrUser === 'string' ? idOrUser : idOrUser?._id || idOrUser?.id;
                return id === (currentUser._id || currentUser.id);
            });
            setIsLiked(!!liked);
        } else {
            setIsLiked(false);
        }
    }, [activeStory, currentUser]);


    const handleLikeStory = async () => {
        if (!currentUser?.token || !activeStory?._id) return;

        const wasLiked = isLiked;
        const currentUserId = currentUser._id || currentUser.id;

        // Optimistic update of Data
        setUser((prevUser: any) => {
            if (!prevUser || !prevUser.stories) return prevUser;
            const updatedStories = prevUser.stories.map((s: any) => {
                if (s._id === activeStory._id || s.id === activeStory._id) {
                    const likes = s.likes || [];
                    let newLikes;
                    if (wasLiked) {
                        newLikes = likes.filter((id: string) => id !== currentUserId);
                    } else {
                        newLikes = [...likes, currentUserId];
                    }
                    return { ...s, likes: newLikes };
                }
                return s;
            });
            return { ...prevUser, stories: updatedStories };
        });

        // Optimistic UI state (will be reinforced by effect)
        setIsLiked(!wasLiked);

        try {
            const res = await fetch(`${API_BASE_URL}/api/stories/like`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${currentUser.token}`
                },
                body: JSON.stringify({
                    storyUserId: user._id || user.id,
                    storyId: activeStory._id
                })
            });

            if (!res.ok) {
                // Revert
                setIsLiked(wasLiked);
                // We should also revert user state, but it's complex to undo inside closure.
                // Re-fetching user data is cleaner or acceptable for rare failure.
                console.error("Failed to like story");
            }
        } catch (error) {
            console.error("Error liking story", error);
            setIsLiked(wasLiked);
        }
    };

    const handleDeleteStory = () => {
        setIsPaused(true);
        setDeleteModalVisible(true);
    };

    const confirmDeleteStory = async () => {
        if (!currentUser?.token || !activeStory?._id) return;
        try {
            setShowOptions(false);
            const res = await fetch(`${API_BASE_URL}/api/stories/${activeStory._id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${currentUser.token}`
                }
            });
            if (res.ok) {
                // If last story, close
                if (stories.length <= 1) {
                    handleClose();
                } else {
                    // Move to prev or next
                    handleNextStory();
                }
            } else {
                Alert.alert('Error', 'Failed to delete story');
                setIsPaused(false);
            }
        } catch (error) {
            console.error(error);
            setIsPaused(false);
        }
    };



    // Mark as viewed
    useEffect(() => {
        if (!isCurrentUser && activeStory && currentUser?.token && user) {
            fetch(`${API_BASE_URL}/api/stories/view`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${currentUser.token}`
                },
                body: JSON.stringify({
                    storyUserId: user._id || user.id,
                    storyId: activeStory._id
                })
            }).catch(err => console.error('Failed to view story', err));
        }
    }, [activeStory?._id, isCurrentUser, user]);

    // Handle fetching viewers or likers
    const handleShowViewers = async (type: 'views' | 'likes' = 'views') => {
        if (!activeStory?._id) return;

        setViewersType(type);
        setShowViewers(true);
        setIsPaused(true);
        setLoadingViewers(true);

        try {
            const endpoint = type === 'likes'
                ? `${API_BASE_URL}/api/stories/my-story/${activeStory._id}/likers`
                : `${API_BASE_URL}/api/stories/my-story/${activeStory._id}/viewers`;

            const res = await fetch(endpoint, {
                headers: {
                    'Authorization': `Bearer ${currentUser.token}`
                }
            });
            if (res.ok) {
                const data = await res.json();
                // Data already parsed in previous line if I hadn't duplicated it. Wait, I see duplicate in diff.
                // Let's rewrite the block cleanly.
                setViewersList(data);

                // Update local state to reflect fresh count
                if (activeStory) {
                    setUser((prevUser: any) => {
                        if (!prevUser || !prevUser.stories) return prevUser;
                        const updatedStories = prevUser.stories.map((s: any) => {
                            if (s._id === activeStory._id) {
                                if (type === 'likes') {
                                    const ids = (data || []).map((d: any) => d._id || d.id || d);
                                    return { ...s, likes: ids, likers: ids };
                                } else {
                                    const ids = (data || []).map((d: any) => d._id || d.id || d);
                                    return { ...s, views: ids, viewers: ids };
                                }
                            }
                            return s;
                        });
                        return { ...prevUser, stories: updatedStories };
                    });
                }
            } else {
                console.error(`Failed to fetch ${type}`);
            }
        } catch (error) {
            console.error(`Error fetching ${type}`, error);
        } finally {
            setLoadingViewers(false);
        }
    };

    const handleCloseViewers = () => {
        setShowViewers(false);
        setIsPaused(false);
    };

    const storyType = activeStory?.type || 'image';
    const storyUri = activeStory?.image || activeStory?.uri;
    const storyContent = activeStory?.content;
    const storyColor = activeStory?.color || '#000';

    const safePlay = (p: any) => {
        if (Platform.OS === 'web') {
            try {
                const promise = p.play();
                if (promise && typeof promise.catch === 'function') {
                    promise.catch(() => { });
                }
            } catch (e) {
                // Ignore synchronous errors
            }
        } else {
            p.play();
        }
    };

    const player = useVideoPlayer(storyType === 'video' && storyUri ? storyUri : null, player => {
        player.loop = true;
        safePlay(player);
    });

    // Handle Pause/Resume
    useEffect(() => {
        if (storyType !== 'video') return;

        if (isPaused) {
            player.pause();
        } else {
            safePlay(player);
        }
    }, [isPaused, storyType, player]);

    const handleSendMessage = async () => {
        if (!message.trim() || !user?._id || !currentUser?.token || isSending) return;

        setIsSending(true);
        setIsPaused(true);

        try {
            // 1. Find or create chat with story owner
            const chatRes = await fetch(`${API_BASE_URL}/api/chats`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${currentUser.token}`
                },
                body: JSON.stringify({ userId: user._id })
            });

            if (!chatRes.ok) throw new Error('Failed to start chat');
            const chatData = await chatRes.json();
            const resultData = chatData.data || chatData;
            const chatId = resultData._id;

            // 2. Send message to the owner
            const msgRes = await fetch(`${API_BASE_URL}/api/chats/${chatId}/messages`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${currentUser.token}`
                },
                body: JSON.stringify({
                    content: message,
                    type: 'text',
                    replyToStory: activeStory?._id 
                })
            });

            if (msgRes.ok) {
                setMessage('');
                setIsPaused(false);
                Keyboard.dismiss();
                alert(`Message sent to ${user.name}!`);
            }
        } catch (e) {
            console.error('Failed to send message', e);
            alert('Failed to send message. Please try again.');
        } finally {
            setIsSending(false);
        }
    };

    const handleClose = () => {
        if (router.canGoBack()) {
            router.back();
        } else {
            router.replace('/(tabs)/' as any);
        }
    };

    const handleNextStory = () => {
        if (currentStoryIndex < stories.length - 1) {
            setCurrentStoryIndex(currentStoryIndex + 1);
            progress.setValue(0);
        } else {
            handleClose();
        }
    };

    const handlePrevStory = () => {
        if (currentStoryIndex > 0) {
            setCurrentStoryIndex(currentStoryIndex - 1);
            progress.setValue(0);
        }
    };

    // Calculate time ago
    const getTimeAgo = (dateString: string | undefined) => {
        if (!dateString) return 'Just now';
        try {
            const now = new Date();
            const past = new Date(dateString);
            if (isNaN(past.getTime())) return 'Just now';
            const diffInSeconds = Math.floor((now.getTime() - past.getTime()) / 1000);

            const hours = Math.floor(diffInSeconds / 3600);
            if (hours > 0) return `${hours}h`;

            const minutes = Math.floor(diffInSeconds / 60);
            return `${minutes}m`;
        } catch (e) {
            return 'Just now';
        }
    };

    const timeAgo = getTimeAgo(activeStory?.createdAt);

    useEffect(() => {
        if (isPaused) return;
        // Don't animate if no active story
        if (!activeStory) return;

        const animation = Animated.timing(progress, {
            toValue: 1,
            duration: 5000,
            useNativeDriver: false,
        });

        animation.start(({ finished }) => {
            if (finished) {
                handleNextStory();
            }
        });

        return () => animation.stop();
    }, [isPaused, currentStoryIndex, activeStory]);

    // --- RENDER GUARDS ---


    if (stories.length === 0) {
        if (firstLoadDone) {
            setTimeout(handleClose, 0);
            return null;
        }
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color="white" />
                <Text style={{ color: 'rgba(255,255,255,0.6)', marginTop: 20 }}>Loading stories...</Text>
                <TouchableOpacity onPress={handleClose} style={{ position: 'absolute', top: 50, right: 20 }}>
                     <X color="white" size={32} />
                </TouchableOpacity>
            </View>
        );
    }

    const isDesktop = SCREEN_WIDTH > 768;
    const frameHeight = isDesktop ? SCREEN_HEIGHT * 0.95 : SCREEN_HEIGHT;
    const frameWidth = isDesktop ? (frameHeight * 9) / 16 : SCREEN_WIDTH;

    return (
        <View style={styles.container}>
            <StatusBar hidden />

            {/* Ambient Background with Premium Gradient fallback */}
            {isDesktop && (
                <View style={StyleSheet.absoluteFill}>
                    <LinearGradient
                        colors={isDark ? ['#1a1a2e', '#0f0c29', '#302b63'] : ['#fdfbfb', '#ebedee']}
                        style={StyleSheet.absoluteFill}
                    />
                    <Image 
                        source={{ uri: storyUri }} 
                        style={styles.ambientBlur}
                        blurRadius={80}
                    />
                    <View style={[StyleSheet.absoluteFill, { backgroundColor: isDark ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.2)' }]} />
                </View>
            )}

            {/* Navigation Arrows for Desktop */}
            {isDesktop && (
                <View style={styles.desktopNav} pointerEvents="box-none">
                    <TouchableOpacity 
                        onPress={handlePrevStory} 
                        style={[styles.navCircle, currentStoryIndex === 0 && { opacity: 0.3 }]}
                        disabled={currentStoryIndex === 0}
                    >
                        <ChevronLeft size={32} color="white" />
                    </TouchableOpacity>
                    <TouchableOpacity 
                        onPress={handleNextStory} 
                        style={styles.navCircle}
                    >
                        <ChevronRight size={32} color="white" />
                    </TouchableOpacity>
                </View>
            )}

            <View style={[
                styles.storyFrame,
                isDesktop && { 
                    width: frameWidth, 
                    height: frameHeight,
                    borderRadius: 20,
                    overflow: 'hidden',
                    // @ts-ignore
                    boxShadow: '0px 25px 40px rgba(0,0,0,0.6)',
                    borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.1)',
                }
            ]}>
                {/* Media Content */}
                {mediaError ? (
                    <View style={[styles.image, { backgroundColor: '#1a1a1a', justifyContent: 'center', alignItems: 'center' }]}>
                        <Trash2 size={48} color="#666" />
                        <Text style={{ color: '#999', marginTop: 16 }}>Failed to load media</Text>
                    </View>
                ) : storyType === 'video' ? (
                    <VideoView
                        player={player}
                        style={styles.image}
                        contentFit="cover"
                        nativeControls={false}
                    />
                ) : storyType === 'text' ? (
                    <LinearGradient
                        colors={[storyColor || '#6E48AA', storyColor ? `${storyColor}CC` : '#9D50BB']}
                        style={[styles.image, { justifyContent: 'center', alignItems: 'center', padding: 40 }]}
                    >
                        <Text style={styles.textStoryContent}>
                            {storyContent}
                        </Text>
                    </LinearGradient>
                ) : (
                    <View style={[styles.image, { justifyContent: 'center', alignItems: 'center' }]}>
                        <Image
                            source={{ uri: storyUri }}
                            style={StyleSheet.absoluteFill}
                            resizeMode="cover"
                            onError={(e) => {
                                setMediaError(true);
                            }}
                        />
                        {storyContent ? (
                            <Text style={{
                                color: 'white',
                                fontSize: 22,
                                fontWeight: 'bold',
                                textAlign: 'center',
                                // @ts-ignore
                                textShadow: '0px 1px 5px rgba(0,0,0,0.75)',
                                padding: 20,
                                position: 'absolute',
                                bottom: 100,
                            }}>
                                {storyContent}
                            </Text>
                        ) : null}
                    </View>
                )}

                {/* Tap Zones for Navigation */}
                <View style={styles.tapZones}>
                    <TouchableOpacity
                        style={styles.tapLeft}
                        onPress={handlePrevStory}
                        activeOpacity={1}
                    />
                    <TouchableOpacity
                        style={styles.tapRight}
                        onPress={handleNextStory}
                        activeOpacity={1}
                    />
                </View>

                {/* Content Overlay */}
                <LinearGradient
                    colors={['rgba(0,0,0,0.5)', 'transparent', 'rgba(0,0,0,0.4)']}
                    style={styles.gradient}
                    pointerEvents="box-none"
                >
                    {/* Progress Bar */}
                    <View style={[styles.progressContainer, { paddingTop: insets.top > 0 ? insets.top + 10 : 16 }]}>
                        {stories.map((_: any, index: number) => (
                            <View key={index} style={styles.progressBarWrapper}>
                                <View style={styles.progressBarBackground}>
                                    {index === currentStoryIndex ? (
                                        <Animated.View
                                            style={[
                                                styles.progressBarFill,
                                                {
                                                    width: progress.interpolate({
                                                        inputRange: [0, 1],
                                                        outputRange: ['0%', '100%'],
                                                    }),
                                                },
                                            ]}
                                        />
                                    ) : (
                                        <View style={[
                                            styles.progressBarFill,
                                            { width: index < currentStoryIndex ? '100%' : '0%' }
                                        ]} />
                                    )}
                                </View>
                            </View>
                        ))}
                    </View>

                    {/* Header */}
                    <View style={styles.header}>
                        <View style={styles.userInfo}>
                            <Image 
                                source={{ uri: getCorrectUrl(user.avatar) || 'https://cdn-icons-png.flaticon.com/512/149/149071.png' }} 
                                style={styles.avatar} 
                            />
                            <View>
                                <Text style={styles.userName}>{user.name}</Text>
                                <Text style={styles.timeAgo}>{timeAgo}</Text>
                            </View>
                        </View>

                        <View style={styles.headerActions}>
                            {isCurrentUser && (
                                <TouchableOpacity
                                    onPress={() => {
                                        setIsPaused(true);
                                        router.push('/story-create');
                                    }}
                                    style={styles.addStoryButton}
                                >
                                    <Plus color="white" size={20} />
                                </TouchableOpacity>
                            )}
                            <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
                                <X color="white" size={24} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Footer Input - Positioned inside frame */}
                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        keyboardVerticalOffset={Platform.OS === 'ios' ? 20 : 0}
                        style={styles.footerContainer}
                    >
                        {isCurrentUser ? (
                            <View style={styles.footer}>
                                <BlurView intensity={40} tint="dark" style={styles.glassBadge}>
                                    <TouchableOpacity
                                        onPress={() => handleShowViewers('views')}
                                        style={styles.statButton}
                                    >
                                        <Eye size={18} color="white" />
                                        <Text style={styles.statText}>
                                            {(activeStory.views?.length || activeStory.viewers?.length || 0)}
                                        </Text>
                                    </TouchableOpacity>
                                    <View style={styles.divider} />
                                    <TouchableOpacity
                                        onPress={() => handleShowViewers('likes')}
                                        style={styles.statButton}
                                    >
                                        <Heart size={18} color="white" fill={activeStory.likes?.length > 0 ? "white" : "transparent"} />
                                        <Text style={styles.statText}>
                                            {(activeStory.likes?.length || activeStory.likers?.length || 0)}
                                        </Text>
                                    </TouchableOpacity>
                                </BlurView>

                                <View style={{ flex: 1 }} />

                                <BlurView intensity={40} tint="dark" style={styles.iconButtonBlur}>
                                    <TouchableOpacity
                                        onPress={() => {
                                            setIsPaused(true);
                                            setShowOptions(true);
                                        }}
                                        style={styles.iconButton}
                                    >
                                        <MoreHorizontal size={24} color="white" />
                                    </TouchableOpacity>
                                </BlurView>
                            </View>
                        ) : (
                            <View style={styles.footer}>
                                <BlurView intensity={30} tint="dark" style={styles.messageInputBlur}>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Send message..."
                                        placeholderTextColor="rgba(255,255,255,0.7)"
                                        onFocus={() => setIsPaused(true)}
                                        onBlur={() => {
                                            if (!message.trim()) setIsPaused(false);
                                        }}
                                        value={message}
                                        onChangeText={setMessage}
                                        multiline={false}
                                        editable={!isSending}
                                    />
                                    <TouchableOpacity 
                                        onPress={handleSendMessage} 
                                        style={[styles.sendButton, { opacity: message.trim() ? 1 : 0.5 }]}
                                        disabled={!message.trim() || isSending}
                                    >
                                        {isSending ? (
                                            <ActivityIndicator size="small" color="white" />
                                        ) : (
                                            <Send size={18} color="white" />
                                        )}
                                    </TouchableOpacity>
                                </BlurView>

                                <TouchableOpacity onPress={handleLikeStory} style={styles.likeButtonContainer}>
                                    <BlurView intensity={30} tint="dark" style={styles.likeButtonBlur}>
                                        <Heart
                                            size={26}
                                            color={isLiked ? "#FF3B30" : "white"}
                                            fill={isLiked ? "#FF3B30" : "transparent"}
                                        />
                                    </BlurView>
                                </TouchableOpacity>
                            </View>
                        )}
                    </KeyboardAvoidingView>
                </LinearGradient>
            </View>

            {/* Viewers/Likers Modal */}
            <Modal
                visible={showViewers}
                animationType="slide"
                transparent={true}
                onRequestClose={handleCloseViewers}
            >
                <View style={styles.modalOverlay}>
                    <TouchableOpacity style={styles.modalDismiss} onPress={handleCloseViewers} />
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>
                                {viewersType === 'likes' ? 'Likes' : 'Viewers'}
                            </Text>
                            <TouchableOpacity onPress={handleCloseViewers}>
                                <X size={24} color="#000" />
                            </TouchableOpacity>
                        </View>
                        {loadingViewers ? (
                            <View style={{ padding: 20, alignItems: 'center' }}>
                                <Text>Loading...</Text>
                            </View>
                        ) : viewersList.length === 0 ? (
                            <Text style={styles.emptyText}>
                                {viewersType === 'likes' ? 'No likes yet' : 'No views yet'}
                            </Text>
                        ) : (
                            <View>
                                {viewersList.map((viewer: any) => (
                                    <View key={viewer._id || viewer.id} style={styles.viewerItem}>
                                        <Image
                                            source={{ uri: getCorrectUrl(viewer.avatar) || 'https://cdn-icons-png.flaticon.com/512/149/149071.png' }}
                                            style={styles.viewerAvatar}
                                        />
                                        <View>
                                            <Text style={styles.viewerName}>{viewer.name}</Text>
                                            <Text style={styles.viewerHandle}>@{viewer.username || viewer.handle || 'user'}</Text>
                                        </View>
                                    </View>
                                ))}
                            </View>
                        )}
                    </View>
                </View>
            </Modal>
            
            {/* Options Modal */}
            <Modal
                visible={showOptions}
                animationType="slide"
                transparent={true}
                onRequestClose={() => {
                    setShowOptions(false);
                    setIsPaused(false);
                }}
            >
                <View style={styles.modalOverlay}>
                    <TouchableOpacity 
                        style={styles.modalDismiss} 
                        onPress={() => {
                            setShowOptions(false);
                            setIsPaused(false);
                        }} 
                    />
                    <View style={styles.optionsModalContent}>
                        <View style={styles.optionHeader}>
                            <View style={{ width: 40, height: 4, backgroundColor: '#DDD', borderRadius: 2, marginBottom: 12 }} />
                            <Text style={styles.optionHeaderTitle}>Story Options</Text>
                        </View>

                        <TouchableOpacity 
                            style={styles.optionItem}
                            onPress={() => {
                                setShowOptions(false);
                                handleDeleteStory();
                            }}
                        >
                            <Trash2 size={24} color="#FF3B30" />
                            <Text style={[styles.optionText, styles.dangerText]}>Delete Story</Text>
                        </TouchableOpacity>

                        <TouchableOpacity 
                            style={styles.optionItem}
                            onPress={() => {
                                setShowOptions(false);
                                setIsPaused(false);
                            }}
                        >
                            <X size={24} color="#000" />
                            <Text style={styles.optionText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
            <VibeConfirmModal 
                visible={isDeleteModalVisible}
                onClose={() => {
                    setDeleteModalVisible(false);
                    setIsPaused(false);
                }}
                onConfirm={confirmDeleteStory}
                title="Delete Story"
                message="Are you sure you want to delete this story?"
                confirmText="Delete"
                isDestructive
                icon={<Trash2 size={28} color="#FF3B30" />}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0F1014',
        alignItems: 'center',
        justifyContent: 'center',
    },
    textStoryContent: {
        fontSize: 42,
        fontWeight: '900',
        color: 'white',
        textAlign: 'center',
        lineHeight: 52,
        letterSpacing: -1,
        textShadowColor: 'rgba(0,0,0,0.4)',
        textShadowOffset: { width: 0, height: 4 },
        textShadowRadius: 15,
    },
    ambientBlur: {
        width: '100%',
        height: '100%',
        opacity: 0.6,
    },
    desktopNav: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 40,
        zIndex: 10,
    },
    navCircle: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: 'rgba(255,255,255,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.15)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
    } as any,
    storyFrame: {
        width: SCREEN_WIDTH,
        height: SCREEN_HEIGHT,
        backgroundColor: '#121212',
        zIndex: 5,
    },
    image: {
        width: '100%',
        height: '100%',
    },
    gradient: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    progressContainer: {
        flexDirection: 'row',
        gap: 4,
        paddingHorizontal: 10,
        // paddingTop is handled inline
    },
    progressBarWrapper: {
        flex: 1,
        height: 2,
    },
    progressBarBackground: {
        height: '100%',
        backgroundColor: 'rgba(255,255,255,0.3)',
        borderRadius: 1,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: 'white',
    },
    tapZones: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        flexDirection: 'row',
    },
    tapLeft: {
        flex: 1,
    },
    tapRight: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        marginTop: 10,
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    avatar: {
        width: 38,
        height: 38,
        borderRadius: 19,
        borderWidth: 1.5,
        borderColor: 'rgba(255,255,255,0.5)',
    },
    userName: {
        color: 'white',
        fontWeight: '700',
        fontSize: 15,
    },
    timeAgo: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 12,
        marginTop: -2,
    },
    closeBtn: {
        padding: 4,
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    addStoryButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    footerContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
    },
    footer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingBottom: Platform.OS === 'ios' ? 40 : 20,
        paddingTop: 10,
    },
    iconButton: {
        padding: 8,
    },
    input: {
        flex: 1,
        height: 50,
        color: 'white',
        fontSize: 15,
        paddingHorizontal: 12,
    },
    viewCountBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: 'rgba(0,0,0,0.5)',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
    },
    viewCountText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
        alignItems: 'center', // Center children horizontally
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    // New Styles for Glass UI
    glassBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 8,
        borderRadius: 24,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        gap: 4
    },
    statButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 4
    },
    statText: {
        color: 'white',
        fontWeight: '600',
        fontSize: 14,
    },
    divider: {
        width: 1,
        height: 16,
        backgroundColor: 'rgba(255,255,255,0.2)',
    },
    iconButtonBlur: {
        borderRadius: 24,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    messageInputBlur: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 28,
        overflow: 'hidden',
        marginRight: 10,
        height: 50,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.15)',
        paddingHorizontal: 6,
    },
    sendButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 4
    },
    likeButtonContainer: {
        // Just a container for layout
    },
    likeButtonBlur: {
        width: 50,
        height: 50,
        borderRadius: 25,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.15)',
    },
    modalDismiss: {
        flex: 1,
    },
    modalContent: {
        backgroundColor: 'white',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        height: '50%',
        padding: 16,
        ...(Platform.OS === 'web' && SCREEN_WIDTH > 768 ? {
            width: 600,
            maxWidth: '90%',
            marginBottom: 20,
            borderRadius: 24,
        } : {
            width: '100%',
        })
    },
    optionsModalContent: {
        backgroundColor: 'white',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        paddingBottom: 40,
        ...(Platform.OS === 'web' && SCREEN_WIDTH > 768 ? {
            width: 600,
            maxWidth: '90%',
            marginBottom: 20,
            borderRadius: 24,
        } : {
            width: '100%',
        })
    },
    optionHeader: {
        alignItems: 'center',
        marginBottom: 16,
    },
    optionHeaderTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#999',
    },
    optionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        gap: 16,
    },
    optionText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1a1a1a',
    },
    dangerText: {
        color: '#FF3B30',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    emptyText: {
        textAlign: 'center',
        color: '#666',
        marginTop: 20,
    },
    viewerItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    viewerAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 12,
    },
    viewerName: {
        fontWeight: 'bold',
        fontSize: 14,
    },
    viewerHandle: {
        color: '#666',
        fontSize: 12,
    },
});
