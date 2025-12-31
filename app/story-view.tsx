import { API_BASE_URL } from '@/constants/Config';
import { useUser } from '@/context/UserContext';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Eye, Heart, Plus, Send, X } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Animated, Dimensions, FlatList, Image, KeyboardAvoidingView, Modal, Platform, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

const { width, height } = Dimensions.get('window');

export default function StoryViewScreen() {
    const router = useRouter();
    const { userId, userStr, initialIndex, mode } = useLocalSearchParams();
    const [progress] = useState(new Animated.Value(0));
    const [isPaused, setIsPaused] = useState(false);
    const [isLiked, setIsLiked] = useState(false);
    const [currentStoryIndex, setCurrentStoryIndex] = useState(initialIndex ? parseInt(initialIndex as string) : 0);

    const [showViewers, setShowViewers] = useState(false);
    const [viewersList, setViewersList] = useState<any[]>([]);
    const [loadingViewers, setLoadingViewers] = useState(false);
    const [fetchedUser, setFetchedUser] = useState<any>(null);
    const [isLoadingUser, setIsLoadingUser] = useState(false);

    // Find user or default
    const { user: currentUser } = (useUser() || {}) as any;

    // Logic: Try to parse userStr (passed from list), else check current user, else mock
    let passedUser = null;
    if (userStr) {
        try {
            passedUser = JSON.parse(Array.isArray(userStr) ? userStr[0] : userStr);
        } catch (e) {
            console.error("Failed to parse userStr", e);
        }
    }

    const isCurrentUser = currentUser && (currentUser._id === userId || currentUser.id === userId);
    const user = passedUser || (isCurrentUser ? currentUser : null) || fetchedUser;

    useEffect(() => {
        const fetchUserData = async () => {
            if (user || !userId) return;

            setIsLoadingUser(true);
            try {
                // Try fetching user details including stories
                // Note: The specific endpoint might vary based on your backend. 
                // Assuming /api/auth/user/:id returns public info with stories or we might need /api/stories/user/:id
                // Based on UserContext, /api/auth/user/:id returns user data. Let's try that.
                const res = await fetch(`${API_BASE_URL}/api/auth/user/${userId}`, {
                    headers: {
                        'Authorization': `Bearer ${currentUser?.token}`
                    }
                });

                if (res.ok) {
                    const data = await res.json();
                    setFetchedUser(data);
                } else {
                    console.error("Failed to fetch user data for story view");
                }
            } catch (e) {
                console.error("Error fetching user for story", e);
            } finally {
                setIsLoadingUser(false);
            }
        };

        fetchUserData();
    }, [userId, user, currentUser?.token]);

    if (isLoadingUser) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color="white" />
            </View>
        );
    }

    if (!user) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <Text style={{ color: 'white' }}>User not found</Text>
                <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 20 }}>
                    <X color="white" size={32} />
                </TouchableOpacity>
            </View>
        );
    }

    // Get stories
    // If mode is archive, take ALL stories. Else filter by 24h.
    const stories = (user.stories || []).filter((s: any) => {
        if (mode === 'archive') return true;

        if (!s.createdAt) return false;
        const storyTime = new Date(s.createdAt).getTime();
        return (Date.now() - storyTime) < 24 * 60 * 60 * 1000;
    });

    const activeStory = stories[currentStoryIndex];

    if (!activeStory || stories.length === 0) {
        // No active stories, navigate back
        return null;
    }

    // Mark as viewed
    useEffect(() => {
        if (!isCurrentUser && activeStory && currentUser?.token) {
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
    }, [activeStory?._id, isCurrentUser]);

    // Handle fetching viewers
    const handleShowViewers = async () => {
        if (!activeStory?._id) return;

        setShowViewers(true);
        setIsPaused(true);
        setLoadingViewers(true);

        try {
            const res = await fetch(`${API_BASE_URL}/api/stories/my-story/${activeStory._id}/viewers`, {
                headers: {
                    'Authorization': `Bearer ${currentUser.token}`
                }
            });
            if (res.ok) {
                const data = await res.json();
                setViewersList(data);
            } else {
                console.error("Failed to fetch viewers");
            }
        } catch (error) {
            console.error("Error fetching viewers", error);
        } finally {
            setLoadingViewers(false);
        }
    };

    const handleCloseViewers = () => {
        setShowViewers(false);
        setIsPaused(false);
    };

    const storyType = activeStory.type || 'image';
    const storyUri = activeStory.image || activeStory.uri;
    const storyContent = activeStory.content;
    const storyColor = activeStory.color || '#000';

    const player = useVideoPlayer(storyType === 'video' ? storyUri : null, player => {
        player.loop = true;
        player.play();
    });

    // Handle Pause/Resume
    useEffect(() => {
        if (storyType !== 'video') return;

        if (isPaused) {
            player.pause();
        } else {
            player.play();
        }
    }, [isPaused, storyType, player]);

    const handleNextStory = () => {
        if (currentStoryIndex < stories.length - 1) {
            setCurrentStoryIndex(currentStoryIndex + 1);
            progress.setValue(0);
        } else {
            router.back();
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

    const timeAgo = getTimeAgo(activeStory.createdAt);

    useEffect(() => {
        if (isPaused) return;

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
    }, [isPaused, currentStoryIndex]);

    return (
        <View style={styles.container}>
            <StatusBar hidden />

            {/* Media Content */}
            {storyType === 'video' ? (
                <VideoView
                    player={player}
                    style={styles.image}
                    contentFit="contain"
                    nativeControls={false}
                />
            ) : storyType === 'text' ? (
                <View style={[styles.image, { backgroundColor: storyColor, justifyContent: 'center', alignItems: 'center', padding: 40 }]}>
                    <Text style={{ color: 'white', fontSize: 24, fontWeight: 'bold', textAlign: 'center' }}>
                        {storyContent}
                    </Text>
                </View>
            ) : (
                <View style={[styles.image, { justifyContent: 'center', alignItems: 'center' }]}>
                    <Image
                        source={{ uri: storyUri }}
                        style={StyleSheet.absoluteFill}
                        resizeMode="contain"
                        onError={(e) => console.log('Story image load error:', e.nativeEvent.error)}
                    />
                    {storyContent ? (
                        <Text style={{
                            color: 'white',
                            fontSize: 24,
                            fontWeight: 'bold',
                            textAlign: 'center',
                            textShadowColor: 'rgba(0,0,0,0.75)',
                            textShadowOffset: { width: 0, height: 1 },
                            textShadowRadius: 5,
                            padding: 20
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

            {/* Gradient Overlay */}
            <LinearGradient
                colors={['rgba(0,0,0,0.6)', 'transparent', 'rgba(0,0,0,0.3)']}
                style={styles.gradient}
            >

                {/* Progress Bar */}
                <View style={styles.progressContainer}>
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
                        <Image source={{ uri: user.avatar || 'https://cdn-icons-png.flaticon.com/512/149/149071.png' }} style={styles.avatar} />
                        <Text style={styles.userName}>{user.name}</Text>
                        <Text style={styles.timeAgo}>{timeAgo}</Text>
                    </View>

                    <View style={styles.headerActions}>
                        {isCurrentUser && (
                            <TouchableOpacity
                                onPress={() => router.push('/story-create')}
                                style={styles.addStoryButton}
                            >
                                <Plus color="white" size={24} />
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity onPress={() => router.back()}>
                            <X color="white" size={28} />
                        </TouchableOpacity>
                    </View>
                </View>

            </LinearGradient>

            {/* Viewers Modal */}
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
                            <Text style={styles.modalTitle}>Viewers</Text>
                            <TouchableOpacity onPress={handleCloseViewers}>
                                <X size={24} color="#000" />
                            </TouchableOpacity>
                        </View>

                        {loadingViewers ? (
                            <ActivityIndicator size="large" color="#6C5CE7" style={{ marginTop: 20 }} />
                        ) : (
                            <FlatList
                                data={viewersList}
                                keyExtractor={(item) => item._id}
                                ListEmptyComponent={
                                    <Text style={styles.emptyText}>No views yet.</Text>
                                }
                                renderItem={({ item }) => (
                                    <View style={styles.viewerItem}>
                                        <Image
                                            source={{ uri: item.avatar || 'https://cdn-icons-png.flaticon.com/512/149/149071.png' }}
                                            style={styles.viewerAvatar}
                                        />
                                        <View>
                                            <Text style={styles.viewerName}>{item.name}</Text>
                                            <Text style={styles.viewerHandle}>@{item.handle}</Text>
                                        </View>
                                    </View>
                                )}
                            />
                        )}
                    </View>
                </View>
            </Modal>

            {/* Footer Input - Positioned at Bottom */}
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 20 : 0}
                style={styles.footerContainer}
            >
                {isCurrentUser ? (
                    <View style={styles.footer}>
                        <TouchableOpacity onPress={handleShowViewers} style={styles.viewCountBadge}>
                            <Eye size={20} color="white" />
                            <Text style={styles.viewCountText}>
                                {activeStory.views?.length || 0}
                            </Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={styles.footer}>
                        <TextInput
                            style={styles.input}
                            placeholder="Send message"
                            placeholderTextColor="rgba(255,255,255,0.7)"
                            onFocus={() => setIsPaused(true)}
                            onBlur={() => setIsPaused(false)}
                        />
                        <TouchableOpacity onPress={() => setIsLiked(!isLiked)}>
                            <Heart
                                size={30}
                                color={isLiked ? "red" : "white"}
                                fill={isLiked ? "red" : "transparent"}
                                strokeWidth={1.5}
                            />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => alert('Sent!')}>
                            <Send size={28} color="white" strokeWidth={1.5} style={{ marginLeft: 16 }} />
                        </TouchableOpacity>
                    </View>
                )}
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'black',
    },
    image: {
        width: width,
        height: height,
        position: 'absolute',
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
        paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 10 : 50,
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
        gap: 8,
    },
    avatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'white',
    },
    userName: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 14,
    },
    timeAgo: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 12,
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
    tapOverlay: {
        flexDirection: 'row',
        flex: 1,
        // zIndex: -1  // Let buttons on top work
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
    input: {
        flex: 1,
        height: 48,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.5)',
        borderRadius: 24,
        paddingHorizontal: 20,
        color: 'white',
        fontSize: 16,
        marginRight: 16,
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
