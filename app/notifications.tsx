import { SkeletonRow } from '@/components/Skeletons';
import { API_BASE_URL } from '@/constants/Config';
import { useNotifications } from '@/context/NotificationContext';
import { useThemeContext } from '@/context/ThemeContext';
import { useUser } from '@/context/UserContext';
import { formatDistanceToNow } from 'date-fns';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
    Image,
    RefreshControl,
    SectionList,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    useWindowDimensions,
    Platform,
    View
} from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/* ================= UTILS ================= */
const getCorrectUrl = (url: string | undefined | null) => {
    if (!url || typeof url !== 'string' || url.trim() === '') return undefined;
    const clean = url.trim();
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

const formatTime = (dateString: string) => {
    try {
        return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch (e) {
        return 'recently';
    }
};

const AnimatedNotificationIcon = ({ type, color, borderColor }: any) => {
    const scale = useSharedValue(0);

    useEffect(() => {
        scale.value = withSpring(1, { damping: 12, stiffness: 100 });
    }, []);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }]
    }));

    return (
        <Animated.View style={animatedStyle}>
            {(() => {
                switch (type) {
                    case 'like':
                        return <View style={[styles.iconBadge, { backgroundColor: '#FF3040', borderColor }]}><Ionicons name="heart" size={10} color="white" /></View>;
                    case 'comment':
                        return <View style={[styles.iconBadge, { backgroundColor: '#3B82F6', borderColor }]}><Ionicons name="chatbubble" size={10} color="white" /></View>;
                    case 'follow':
                        return <View style={[styles.iconBadge, { backgroundColor: '#8B5CF6', borderColor }]}><Ionicons name="person-add" size={10} color="white" /></View>;
                    case 'reel':
                        return <View style={[styles.iconBadge, { backgroundColor: '#EC4899', borderColor }]}><Ionicons name="videocam" size={10} color="white" /></View>;
                    default:
                        return <View style={[styles.iconBadge, { backgroundColor: color, borderColor }]}><Ionicons name="notifications" size={10} color="white" /></View>;
                }
            })()}
        </Animated.View>
    );
};

const NotificationIcon = AnimatedNotificationIcon;

const AnimatedNotificationItem = ({ children, index }: any) => {
    const opacity = useSharedValue(0);
    const translateY = useSharedValue(20);

    useEffect(() => {
        opacity.value = withDelay(index * 50, withTiming(1, { duration: 400 }));
        translateY.value = withDelay(index * 50, withSpring(0, { damping: 15, stiffness: 100 }));
    }, []);

    const style = useAnimatedStyle(() => ({
        opacity: opacity.value,
        transform: [{ translateY: translateY.value }]
    }));

    return <Animated.View style={style}>{children}</Animated.View>;
};

/* ================= COMPONENT ================= */
export default function NotificationsScreen() {
    const router = useRouter();
    const { user, followUser } = (useUser() || {}) as any;
    const { colors, isDark } = useThemeContext();
    const insets = useSafeAreaInsets();
    const { markAsRead } = useNotifications();

    const { width } = useWindowDimensions();
    const isDesktop = Platform.OS === 'web' && width > 768;

    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [notifications, setNotifications] = useState<any[]>([]);
    const [sections, setSections] = useState<any[]>([]);
    const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
    const [pendingRequests, setPendingRequests] = useState<any[]>([]);

    const groupNotifications = (data: any[]) => {
        const groups: { [key: string]: any[] } = {
            'Today': [],
            'Yesterday': [],
            'Last 7 Days': [],
            'Earlier': []
        };

        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const yesterday = new Date(today - 86400000).getTime();
        const lastWeek = new Date(today - 6 * 86400000).getTime();

        data.forEach(item => {
            const date = new Date(item.createdAt).getTime();
            if (date >= today) {
                groups['Today'].push(item);
            } else if (date >= yesterday) {
                groups['Yesterday'].push(item);
            } else if (date >= lastWeek) {
                groups['Last 7 Days'].push(item);
            } else {
                groups['Earlier'].push(item);
            }
        });

        return Object.keys(groups)
            .filter(key => groups[key].length > 0)
            .map(key => ({ title: key, data: groups[key] }));
    };

    const fetchNotifications = async () => {
        if (!user?.token) {
            setIsLoading(false);
            return;
        }
        try {
            const [notifResponse, reqResponse] = await Promise.all([
                fetch(`${API_BASE_URL}/api/notifications`, {
                    headers: { 'Authorization': `Bearer ${user.token}` }
                }),
                fetch(`${API_BASE_URL}/api/auth/requests`, {
                    headers: { 'Authorization': `Bearer ${user.token}` }
                })
            ]);

            if (notifResponse.ok) {
                const data = await notifResponse.json();
                setNotifications(data);
                setSections(groupNotifications(data));
            } else {
                console.error('Fetch notifications failed:', notifResponse.status, notifResponse.statusText);
            }

            if (reqResponse.ok) {
                const reqData = await reqResponse.json();
                setPendingRequestsCount(reqData.length);
                setPendingRequests(reqData);
            }
        } catch (error) {
            console.error('Fetch notifications error:', error);
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(
        React.useCallback(() => {
            if (user?.token) {
                setIsLoading(true);
                fetchNotifications();
                markAsRead();
            }
        }, [user?.token])
    );

    const onRefresh = () => {
        setRefreshing(true);
        fetchNotifications();
    };

    const handlePress = (item: any) => {
        if (item.type === 'follow') {
            router.push(`/user/${item.sender?._id}`);
        } else if (item.post) {
            router.push(`/post/${item.post._id || item.post}`);
        }
    };

    const handleFollow = async (userId: string) => {
        if (!userId || !followUser) return;
        await followUser(userId);
        fetchNotifications(); // Refresh to update follow buttons
    };

    const renderItem = ({ item, index }: any) => {
        const isFollowNotification = item.type === 'follow' || (item.text && item.text.includes('following'));
        let type = item.type;
        if (!type && item.text) {
            if (item.text.includes('liked')) type = 'like';
            else if (item.text.includes('commented')) type = 'comment';
            else if (item.text.includes('following')) type = 'follow';
        }

        const isFollowing = user?.following?.includes(item.sender?._id);

        return (
            <AnimatedNotificationItem index={index}>
                <TouchableOpacity
                    style={[
                        styles.notificationItem,
                        !item.isRead && styles.unreadItem
                    ]}
                    onPress={() => handlePress(item)}
                    activeOpacity={0.7}
                >
                    <View style={styles.avatarWrapper}>
                        <Image
                            source={{ uri: getCorrectUrl(item.sender?.avatar) || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.sender?.name || 'User')}&background=random` }}
                            style={styles.avatar}
                        />
                        <AnimatedNotificationIcon type={type} color={colors.primary} borderColor={colors.background} />
                    </View>

                    <View style={styles.textContainer}>
                        <Text style={[styles.mainText, { color: colors.text }]}>
                            <Text style={styles.username}>{item.sender?.name || 'User'} </Text>
                            {item.text || (
                                type === 'like' ? 'liked your post.' :
                                type === 'comment' ? 'commented on your post.' :
                                type === 'follow' ? 'started following you.' :
                                type === 'follow_request' ? 'requested to follow you.' :
                                type === 'request_accepted' ? 'accepted your follow request.' :
                                'interacted with your post.'
                            )}
                            <Text style={[styles.timeText, { color: colors.textSecondary }]}> {formatTime(item.createdAt)}</Text>
                        </Text>
                        {item.subText && <Text style={[styles.subText, { color: colors.textSecondary }]}>{item.subText}</Text>}
                    </View>

                    {item.post && (item.post.image || item.post.thumbnail || item.post.uri) && (
                        <Image
                            source={{ uri: getCorrectUrl(item.post.image || item.post.thumbnail || item.post.uri) }}
                            style={styles.postThumbnail}
                        />
                    )}

                    {isFollowNotification && (
                        <TouchableOpacity
                            style={[
                                styles.followBtn,
                                { backgroundColor: isFollowing ? (isDark ? '#333' : '#f0f0f0') : colors.primary },
                                isFollowing && { borderWidth: 1, borderColor: colors.border }
                            ]}
                            onPress={() => handleFollow(item.sender?._id)}
                        >
                            <Text style={[styles.followBtnText, { color: isFollowing ? colors.text : 'white' }]}>
                                {isFollowing ? 'Following' : 'Follow'}
                            </Text>
                        </TouchableOpacity>
                    )}
                </TouchableOpacity>
            </AnimatedNotificationItem>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={[styles.header, { borderBottomColor: colors.border, paddingTop: Platform.OS === 'web' ? 20 : insets.top + 10 }]}>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Notifications</Text>
            </View>

            <SectionList
                sections={sections}
                keyExtractor={(item) => item._id}
                renderItem={renderItem}
                renderSectionHeader={({ section: { title } }) => (
                    <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>{title}</Text>
                )}
                ListHeaderComponent={
                    <TouchableOpacity
                        style={[
                            styles.requestsBanner,
                            { backgroundColor: colors.background, borderBottomColor: colors.border }
                        ]}
                        onPress={() => router.push('/follow-requests')}
                    >
                        <View style={styles.requestsBannerContent}>
                            <View style={styles.avatarStack}>
                                {pendingRequestsCount > 0 ? (
                                    <>
                                        {pendingRequests[1] && (
                                            <Image 
                                                source={{ uri: getCorrectUrl(pendingRequests[1].avatar || pendingRequests[1].sender?.avatar) || `https://ui-avatars.com/api/?name=${encodeURIComponent(pendingRequests[1].name || pendingRequests[1].sender?.name || 'User')}&background=random` }} 
                                                style={[styles.avatarCircle, styles.avatarBack, { borderColor: colors.background }]} 
                                            />
                                        )}
                                        {pendingRequests[0] && (
                                            <Image 
                                                source={{ uri: getCorrectUrl(pendingRequests[0].avatar || pendingRequests[0].sender?.avatar) || `https://ui-avatars.com/api/?name=${encodeURIComponent(pendingRequests[0].name || pendingRequests[0].sender?.name || 'User')}&background=random` }} 
                                                style={[styles.avatarCircle, styles.avatarFront, { borderColor: colors.background }]} 
                                            />
                                        )}
                                    </>
                                ) : (
                                    <>
                                        <View style={[styles.avatarCircle, styles.avatarBack, { backgroundColor: isDark ? '#444' : '#e0e0e0', borderColor: colors.background }]} />
                                        <View style={[styles.avatarCircle, styles.avatarFront, { backgroundColor: isDark ? '#333' : '#d0d0d0', borderColor: colors.background }]} />
                                    </>
                                )}
                            </View>
                            <View style={styles.requestsBannerTextContainer}>
                                <Text style={[styles.requestsBannerTitle, { color: colors.text }]}>Follow requests</Text>
                                <Text style={[styles.requestsBannerSubtitle, { color: colors.textSecondary }]}>
                                    Approve or ignore requests
                                </Text>
                            </View>
                            {pendingRequestsCount > 0 && <View style={styles.blueDot} />}
                        </View>
                    </TouchableOpacity>
                }
                contentContainerStyle={[styles.listContent, isDesktop && { maxWidth: 800, alignSelf: 'center', width: '100%' }]}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
                }
                ListEmptyComponent={
                    !isLoading ? (
                        <View style={styles.emptyState}>
                            <View style={[styles.emptyIconCircle, { backgroundColor: isDark ? '#1A1A1A' : '#F2F2F7' }]}>
                                <Ionicons name="notifications-outline" size={40} color={colors.textSecondary} />
                            </View>
                            <Text style={[styles.emptyTitle, { color: colors.text }]}>No notifications yet</Text>
                            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>When someone likes or comments on your posts, you'll see it here.</Text>
                        </View>
                    ) : (
                        <View style={{ padding: 20 }}>
                            {[1, 2, 3, 4, 5, 6].map(i => <SkeletonRow key={i} />)}
                        </View>
                    )
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 0.5,
    },
    headerTitle: { fontSize: 24, fontWeight: '900', letterSpacing: -0.5 },
    listContent: { paddingBottom: 20 },
    requestsBanner: {
        paddingVertical: 14,
        paddingHorizontal: 20,
        borderBottomWidth: 0.5,
    },
    requestsBannerContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatarStack: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 12,
        width: 60, // Fixed width to accommodate overlapping
        height: 40,
    },
    avatarCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        borderWidth: 2,
        position: 'absolute',
    },
    avatarBack: {
        left: 20,
        zIndex: 1,
    },
    avatarFront: {
        left: 0,
        zIndex: 2,
    },
    requestsBannerTextContainer: {
        flex: 1,
    },
    requestsBannerTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 2,
    },
    requestsBannerSubtitle: {
        fontSize: 14,
    },
    blueDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#007AFF', // iOS blue
        marginLeft: 10,
    },
    notificationItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 20,
        marginHorizontal: 10,
        marginBottom: 4,
    },
    unreadItem: {
        backgroundColor: 'rgba(59, 130, 246, 0.05)',
    },
    avatarWrapper: {
        position: 'relative',
        marginRight: 14,
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
    },
    iconBadge: {
        position: 'absolute',
        bottom: -2,
        right: -2,
        width: 20,
        height: 20,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
    },
    textContainer: {
        flex: 1,
        justifyContent: 'center',
        marginRight: 8,
    },
    mainText: {
        fontSize: 14,
        lineHeight: 20,
    },
    username: {
        fontWeight: 'bold',
    },
    timeText: {
        fontSize: 13,
    },
    subText: {
        fontSize: 13,
        marginTop: 2,
    },
    postThumbnail: {
        width: 44,
        height: 44,
        borderRadius: 8,
        backgroundColor: '#eee',
    },
    followBtn: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
    },
    followBtnText: {
        fontSize: 12,
        fontWeight: '700',
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 100,
        paddingHorizontal: 40,
    },
    emptyIconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    emptySubtitle: {
        fontSize: 15,
        textAlign: 'center',
        lineHeight: 22,
    },
    sectionHeader: {
        fontSize: 14,
        fontWeight: '900',
        paddingHorizontal: 20,
        paddingVertical: 16,
        marginTop: 10,
        textTransform: 'uppercase',
        letterSpacing: 1,
        opacity: 0.6,
    }
});
