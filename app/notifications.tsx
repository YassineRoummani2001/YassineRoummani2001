import { SkeletonRow } from '@/components/Skeletons';
import { API_BASE_URL } from '@/constants/Config';
import { useNotifications } from '@/context/NotificationContext';
import { useThemeContext } from '@/context/ThemeContext';
import { useUser } from '@/context/UserContext';
import { useRouter } from 'expo-router';
import { ArrowLeft, Bell, Heart, MessageCircle, UserPlus, Video } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
    Image,
    RefreshControl,
    SectionList,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/* ================= UTILS ================= */
const formatTime = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diff < 60) return `${diff}s`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
    return `${Math.floor(diff / 604800)}w`;
};

const NotificationIcon = ({ type, color, borderColor }: { type?: string, color: string, borderColor: string }) => {
    switch (type) {
        case 'like':
            return <View style={[styles.iconBadge, { backgroundColor: '#FF3040', borderColor }]}><Heart size={10} color="white" fill="white" /></View>;
        case 'comment':
            return <View style={[styles.iconBadge, { backgroundColor: '#3B82F6', borderColor }]}><MessageCircle size={10} color="white" fill="white" /></View>;
        case 'follow':
            return <View style={[styles.iconBadge, { backgroundColor: '#8B5CF6', borderColor }]}><UserPlus size={10} color="white" /></View>;
        case 'reel':
            return <View style={[styles.iconBadge, { backgroundColor: '#EC4899', borderColor }]}><Video size={10} color="white" /></View>;
        default:
            return <View style={[styles.iconBadge, { backgroundColor: color, borderColor }]}><Bell size={10} color="white" /></View>;
    }
};

/* ================= COMPONENT ================= */
export default function NotificationsScreen() {
    const router = useRouter();
    const { user, followUser } = (useUser() || {}) as any;
    const { colors, isDark } = useThemeContext();
    const insets = useSafeAreaInsets();
    const { markAsRead } = useNotifications();

    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [notifications, setNotifications] = useState<any[]>([]);
    const [sections, setSections] = useState<any[]>([]);

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

        const result = [];
        if (groups['Today'].length > 0) result.push({ title: 'Today', data: groups['Today'] });
        if (groups['Yesterday'].length > 0) result.push({ title: 'Yesterday', data: groups['Yesterday'] });
        if (groups['Last 7 Days'].length > 0) result.push({ title: 'Last 7 Days', data: groups['Last 7 Days'] });
        if (groups['Earlier'].length > 0) result.push({ title: 'Earlier', data: groups['Earlier'] });

        return result;
    };

    const fetchNotifications = async () => {
        if (!user) return;
        try {
            const res = await fetch(`${API_BASE_URL}/api/notifications`, {
                headers: { 'Authorization': `Bearer ${user.token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setNotifications(data);
                setSections(groupNotifications(data));
            }
        } catch (error) {
            console.error("Error fetching notifications:", error);
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchNotifications();
    }, [user]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchNotifications();
    };

    const handleFollowClick = async (senderId: string) => {
        if (!senderId) return;
        await followUser(senderId);
    };

    const handlePress = async (notification: any) => {
        if (!notification.isRead) {
            // Optimistic update
            const newNotifs = notifications.map(n =>
                n._id === notification._id ? { ...n, isRead: true } : n
            );
            setNotifications(newNotifs);
            setSections(groupNotifications(newNotifs));
            markAsRead(notification._id);
        }

        if (notification.post) {
            router.push({
                pathname: '/media-view',
                params: {
                    postId: notification.post._id,
                    type: notification.post.type || 'image',
                    uri: notification.post.uri
                }
            });
        } else if (notification.type === 'follow' && notification.sender?._id) {
            router.push(`/user/${notification.sender._id}`);
        }
    };

    const renderSectionHeader = ({ section: { title } }: any) => (
        <Text style={[styles.sectionHeader, { color: colors.text, backgroundColor: colors.background }]}>{title}</Text>
    );

    const renderItem = ({ item }: { item: any }) => {
        const isFollowNotification = item.type === 'follow';
        // Determine notification type from text if type field is missing or generic
        let type = item.type;
        if (!type) {
            if (item.text.includes('liked')) type = 'like';
            else if (item.text.includes('commented')) type = 'comment';
            else if (item.text.includes('following')) type = 'follow';
        }

        const isFollowing = user?.following?.includes(item.sender?._id);

        return (
            <TouchableOpacity
                style={[
                    styles.itemContainer,
                    !item.isRead && { backgroundColor: isDark ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.05)' }
                ]}
                onPress={() => handlePress(item)}
                activeOpacity={0.7}
            >
                <View style={styles.avatarWrapper}>
                    <Image
                        source={{ uri: item.sender?.avatar || 'https://i.pravatar.cc/100' }}
                        style={styles.avatar}
                    />
                    <View style={styles.iconOverlay}>
                        <NotificationIcon type={type} color={colors.primary} borderColor={colors.background} />
                    </View>
                </View>

                <View style={styles.textContainer}>
                    <Text style={[styles.mainText, { color: colors.text }]}>
                        <Text style={styles.username}>{item.sender?.name || 'User'} </Text>
                        {item.text.replace('started following you', 'started following you')}
                        <Text style={[styles.timeText, { color: colors.textSecondary }]}> {formatTime(item.createdAt)}</Text>
                    </Text>
                    {item.subText && <Text style={[styles.subText, { color: colors.textSecondary }]}>{item.subText}</Text>}
                </View>

                {item.post && (item.post.image || item.post.thumbnail) && (
                    <Image
                        source={{ uri: item.post.image || item.post.thumbnail || item.post.uri }}
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
                        onPress={() => item.sender?._id && handleFollowClick(item.sender._id)}
                    >
                        <Text style={[
                            styles.followBtnText,
                            { color: isFollowing ? colors.text : 'white' }
                        ]}>
                            {isFollowing ? 'Following' : 'Follow'}
                        </Text>
                    </TouchableOpacity>
                )}
            </TouchableOpacity>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

            {/* Header */}
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <ArrowLeft size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Notifications</Text>
                <View style={{ width: 40 }} />
            </View>

            {isLoading ? (
                <View style={{ padding: 16 }}>
                    {[1, 2, 3, 4, 5, 6].map(i => <SkeletonRow key={i} />)}
                </View>
            ) : (
                <SectionList
                    sections={sections}
                    keyExtractor={item => item._id}
                    renderItem={renderItem}
                    renderSectionHeader={renderSectionHeader}
                    contentContainerStyle={styles.listContent}
                    stickySectionHeadersEnabled={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            tintColor={colors.primary}
                            colors={[colors.primary]}
                        />
                    }
                    ListHeaderComponent={
                        <TouchableOpacity
                            style={styles.followRequestsRow}
                            onPress={() => router.push('/follow-requests')}
                            activeOpacity={0.7}
                        >
                            <View style={styles.followReqLeft}>
                                <View style={styles.reqAvatarContainer}>
                                    <View style={[styles.reqAvatar, { backgroundColor: '#333', zIndex: 2 }]} />
                                    <View style={[styles.reqAvatar, { backgroundColor: '#666', marginLeft: -15, zIndex: 1 }]} />
                                </View>
                                <View>
                                    <Text style={[styles.reqTitle, { color: colors.text }]}>Follow requests</Text>
                                    <Text style={[styles.reqSubtitle, { color: colors.textSecondary }]}>Approve or ignore requests</Text>
                                </View>
                            </View>
                            <View style={styles.unreadBadgeDot} />
                        </TouchableOpacity>
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <View style={[styles.emptyIconCircle, { backgroundColor: isDark ? '#222' : '#f0f0f0' }]}>
                                <Bell size={40} color={colors.textSecondary} />
                            </View>
                            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Notifications</Text>
                            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                                When you get likes, comments or new followers, they'll show up here.
                            </Text>
                        </View>
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: 1,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        letterSpacing: 0.5,
    },
    backBtn: {
        padding: 5,
    },
    listContent: {
        paddingBottom: 20,
    },
    itemContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
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
    iconOverlay: {
        position: 'absolute',
        bottom: -2,
        right: -2,
    },
    iconBadge: {
        width: 20,
        height: 20,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: 'white', // Should adapt to dark mode ideally, but white border works for contrast often
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
        borderRadius: 6,
        backgroundColor: '#eee',
    },
    followBtn: {
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 8,
    },
    followBtnText: {
        color: 'white',
        fontSize: 13,
        fontWeight: '600',
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
        fontSize: 16,
        fontWeight: 'bold',
        paddingHorizontal: 16,
        paddingVertical: 12,
        marginTop: 10,
    },
    followRequestsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 16,
        marginBottom: 10,
    },
    followReqLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    reqAvatarContainer: {
        flexDirection: 'row',
        marginRight: 12,
        width: 44,
    },
    reqAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        borderWidth: 2,
        borderColor: 'black',
    },
    reqTitle: {
        fontSize: 15,
        fontWeight: 'bold',
    },
    reqSubtitle: {
        fontSize: 13,
    },
    unreadBadgeDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#007AFF',
    }
});
