import { API_BASE_URL } from '@/constants/Config';
import { useUser } from '@/context/AuthContext';
import { useThemeContext } from '@/context/ThemeContext';
import { Stack, useRouter } from 'expo-router';
import {
    AlertTriangle,
    ArrowLeft,
    ArrowRight,
    ArrowUpCircle,
    BarChart2,
    Bell,
    Edit2,
    Info,
    MessageCircle,
    Plus,
    RefreshCw,
    Share2,
    Star,
    Tag,
    Trash2,
    Zap
} from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, RefreshControl, ScrollView, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function SellingDashboard() {
    const router = useRouter();
    const { colors, isDark } = useThemeContext();
    const { user } = (useUser() || {}) as any;
    const insets = useSafeAreaInsets();

    const [activeTab, setActiveTab] = useState('inbox');
    const [userItems, setUserItems] = useState<any[]>([]);
    const [itemsLoading, setItemsLoading] = useState(false);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [stats, setStats] = useState<any>({
        chatsToAnswer: 0,
        activeListings: 0,
        listingsToRenew: 0,
        deleteAndRelist: 0,
        totalViews: 0,
        sellerRating: 0,
        newFollowers: 0
    });
    const [announcements, setAnnouncements] = useState<any[]>([]);
    const [announcementsLoading, setAnnouncementsLoading] = useState(false);


    const fetchStats = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/marketplace/stats`, {
                headers: {
                    'Authorization': `Bearer ${user?.token}`
                }
            });
            if (res.ok) {
                const data = await res.json();
                setStats(data);
            }
        } catch (error) {
            console.error('Error fetching stats:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const fetchUserItems = async () => {
        if (!user?._id) return;
        setItemsLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/marketplace?userId=${user._id}&status=all`, {
                headers: {
                    'Authorization': `Bearer ${user?.token}`
                }
            });
            if (res.ok) {
                const data = await res.json();
                setUserItems(data);
            }
        } catch (error) {
            console.error('Error fetching user items:', error);
        } finally {
            setItemsLoading(false);
        }
    };

    const fetchAnnouncements = async () => {
        setAnnouncementsLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/announcements?target=sellers`);
            if (res.ok) {
                const data = await res.json();
                setAnnouncements(data);
            }
        } catch (error) {
            console.error('Error fetching announcements:', error);
        } finally {
            setAnnouncementsLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchStats();
    }, []);

    useEffect(() => {
        if (activeTab === 'your_listings') {
            fetchUserItems();
        } else if (activeTab === 'announcements') {
            fetchAnnouncements();
        }
    }, [activeTab]);

    const handleDelete = async (itemId: string) => {
        Alert.alert(
            "Delete Listing",
            "Are you sure you want to delete this item? This action cannot be undone.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            const res = await fetch(`${API_BASE_URL}/api/marketplace/${itemId}`, {
                                method: 'DELETE',
                                headers: {
                                    'Authorization': `Bearer ${user?.token}`
                                }
                            });
                            if (res.ok) {
                                setUserItems(prev => prev.filter(i => i._id !== itemId));
                            } else {
                                Alert.alert("Error", "Failed to delete item");
                            }
                        } catch (error) {
                            console.error('Error deleting item:', error);
                        }
                    }
                }
            ]
        );
    };

    const handleShare = async (item: any) => {
        try {
            const url = `${API_BASE_URL}/marketplace/${item._id}`;
            await Share.share({
                message: `Check out this ${item.title} on Vibe! Only ${item.price} ${item.currency || 'DH'}\n${url}`,
                url: url,
                title: item.title
            });
        } catch (error) {
            console.error('Error sharing item:', error);
        }
    };

    const toggleStatus = async (item: any) => {
        try {
            const newStatus = item.status === 'available' ? 'sold' : 'available';
            const res = await fetch(`${API_BASE_URL}/api/marketplace/${item._id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${user?.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ status: newStatus })
            });
            if (res.ok) {
                setUserItems(prev => prev.map(i => i._id === item._id ? { ...i, status: newStatus } : i));
            }
        } catch (error) {
            console.error('Error toggling status:', error);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        if (activeTab === 'inbox') {
            fetchStats();
        } else if (activeTab === 'your_listings') {
            fetchUserItems();
        } else if (activeTab === 'announcements') {
            fetchAnnouncements();
        } else {
            setRefreshing(false);
        }

    };

    const getCorrectUrl = (url: string) => {
        if (!url || typeof url !== 'string') return 'https://ui-avatars.com/api/?name=User&background=random';
        if (url.startsWith('blob:')) return 'https://ui-avatars.com/api/?name=User&background=random';
        if (url.includes('/uploads/')) {
            const uploadIndex = url.indexOf('/uploads/');
            return `${API_BASE_URL}${url.substring(uploadIndex)}`;
        }
        if (url.startsWith('data:')) return url;
        if (url.startsWith('http')) return url;
        return `${API_BASE_URL}/uploads/${url}`;
    };

    const StatCard = ({ label, value, subtext, icon: Icon, onPress, highlight }: any) => (
        <TouchableOpacity
            style={[
                styles.statCard,
                {
                    backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
                    borderColor: highlight ? (isDark ? '#312e81' : '#e0e7ff') : colors.border,
                    borderWidth: highlight ? 2 : 1,
                }
            ]}
            onPress={onPress}
            disabled={!onPress}
            activeOpacity={0.7}
        >
            <View style={styles.statHeader}>
                <Text style={[styles.statValue, { color: highlight ? colors.primary : colors.text }]}>{value}</Text>
                {Icon && (
                    <View style={[styles.statIconBadge, highlight && { backgroundColor: isDark ? 'rgba(99,102,241,0.2)' : '#e0e7ff' }]}>
                        <Icon size={18} color={highlight ? colors.primary : colors.textSecondary} />
                    </View>
                )}
            </View>
            <Text style={[styles.statLabel, { color: colors.text }]} numberOfLines={2}>{label}</Text>
            {subtext && <Text style={[styles.statSubtext, { color: colors.textSecondary }]}>{subtext}</Text>}
        </TouchableOpacity>
    );

    const renderInbox = () => (
        <>
            {/* Overview Section */}
            <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Overview</Text>
                <View style={styles.statsGrid}>
                    <StatCard
                        value={stats.chatsToAnswer || 0}
                        label="Chats to answer"
                        icon={MessageCircle}
                        highlight
                    />
                    <StatCard
                        value={stats.activeListings || 0}
                        label="Active listings"
                        icon={Tag}
                        onPress={() => setActiveTab('your_listings')}
                    />
                    <StatCard
                        value={stats.listingsToRenew || 0}
                        label="Listings to renew"
                        icon={ArrowUpCircle}
                    />
                    <StatCard
                        value={stats.deleteAndRelist || 0}
                        label="Listings to delete & relist"
                        icon={RefreshCw}
                    />
                </View>
            </View>

            {/* Performance Section */}
            <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Performance</Text>
                <View style={styles.statsGrid}>
                    <StatCard
                        value={stats.totalViews || 0}
                        label="Clicks on listings"
                        subtext="Last 7 days"
                        icon={BarChart2}
                    />
                    <StatCard
                        value={stats.sellerRating || 0}
                        label="Seller rating"
                        subtext="0 ratings"
                        icon={Star}
                    />
                    <StatCard
                        value={stats.newFollowers || 0}
                        label="New followers"
                        subtext="Last 7 days"
                    />
                </View>
            </View>

            {/* Recent Messages Section */}
            <View style={styles.section}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <Text style={[styles.sectionTitle, { marginBottom: 0, color: colors.text }]}>Recent Messages</Text>
                    <TouchableOpacity
                        onPress={() => router.push('/chat')}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                    >
                        <Text style={{ color: colors.primary, fontWeight: '600' }}>View All</Text>
                        <ArrowRight size={16} color={colors.primary} />
                    </TouchableOpacity>
                </View>

                {!stats.recentChats || stats.recentChats.length === 0 ? (
                    <View style={[styles.emptyState, { paddingVertical: 20 }]}>
                        <MessageCircle size={32} color={colors.textSecondary} style={{ opacity: 0.5 }} />
                        <Text style={[styles.emptyStateText, { color: colors.textSecondary, marginTop: 8 }]}>No recent messages</Text>
                    </View>
                ) : (
                    <View style={{ gap: 12 }}>
                        {stats.recentChats.map((chat: any) => (
                            <TouchableOpacity
                                key={chat._id}
                                style={[styles.messageCard, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF', borderColor: colors.border }]}
                                onPress={() => router.push(`/message/${chat._id}`)} // Fixed route
                            >
                                <Image
                                    source={{ uri: getCorrectUrl(chat.participant?.avatar) }}
                                    style={styles.messageAvatar}
                                />
                                <View style={{ flex: 1, gap: 4 }}>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                        <Text style={[styles.messageName, { color: colors.text }]}>{chat.participant?.name || 'User'}</Text>
                                        <Text style={styles.messageTime}>
                                            {new Date(chat.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                        </Text>
                                    </View>
                                    <Text style={[styles.messagePreview, { color: colors.textSecondary }]} numberOfLines={1}>
                                        {chat.lastMessage || 'Sent a message'}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}
            </View>
        </>
    );

    const renderYourListings = () => (
        <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Your Listings ({userItems.length})</Text>
            {itemsLoading ? (
                <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 20 }} />
            ) : userItems.length === 0 ? (
                <View style={styles.emptyState}>
                    <Tag size={48} color={colors.textSecondary} style={{ opacity: 0.5 }} />
                    <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>You haven't listed anything yet.</Text>
                    <TouchableOpacity
                        style={[styles.createBtnInline, { backgroundColor: colors.primary }]}
                        onPress={() => router.push('/marketplace/create')}
                    >
                        <Text style={styles.createBtnText}>Create first listing</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <View style={styles.itemsGrid}>
                    {userItems.map((item) => (
                        <View key={item._id} style={[styles.itemCard, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF', borderColor: colors.border }]}>
                            <TouchableOpacity onPress={() => router.push(`/marketplace/${item._id}`)}>
                                <Image
                                    source={{ uri: getCorrectUrl(item.images?.[0]) }}
                                    style={styles.itemImage}
                                />
                            </TouchableOpacity>

                            {/* Status Badge */}
                            <TouchableOpacity
                                style={[
                                    styles.itemStatusBadge,
                                    { backgroundColor: item.status === 'available' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)' }
                                ]}
                                onPress={() => toggleStatus(item)}
                            >
                                <View style={[
                                    styles.statusDot,
                                    { backgroundColor: item.status === 'available' ? '#10B981' : '#EF4444' }
                                ]} />
                                <Text style={[
                                    styles.itemStatusText,
                                    { color: item.status === 'available' ? '#10B981' : '#EF4444' }
                                ]}>
                                    {item.status === 'available' ? 'Active' : 'Sold'}
                                </Text>
                            </TouchableOpacity>

                            <View style={styles.itemInfo}>
                                <TouchableOpacity onPress={() => router.push(`/marketplace/${item._id}`)}>
                                    <Text style={[styles.itemPrice, { color: colors.text }]}>{item.price} {item.currency || 'DH'}</Text>
                                    <Text style={[styles.itemTitle, { color: colors.textSecondary }]} numberOfLines={1}>{item.title}</Text>
                                </TouchableOpacity>

                                <View style={[styles.itemDivider, { backgroundColor: isDark ? '#2C2C2E' : '#f3f4f6' }]} />

                                <View style={styles.itemActionsRow}>
                                    <TouchableOpacity
                                        style={[styles.actionIconButton, { backgroundColor: isDark ? '#2C2C2E' : '#f9fafb' }]}
                                        onPress={() => handleShare(item)}
                                        activeOpacity={0.7}
                                    >
                                        <Share2 size={18} color="#6366F1" />
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={[styles.actionIconButton, { backgroundColor: isDark ? '#2C2C2E' : '#f9fafb' }]}
                                        onPress={() => router.push({ pathname: '/marketplace/create', params: { id: item._id } } as any)}
                                        activeOpacity={0.7}
                                    >
                                        <Edit2 size={18} color="#6366F1" />
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={[styles.actionIconButton, { backgroundColor: isDark ? '#2C2C2E' : '#f9fafb' }]}
                                        onPress={() => toggleStatus(item)}
                                        activeOpacity={0.7}
                                    >
                                        <Star
                                            size={18}
                                            color={item.status === 'available' ? "#9CA3AF" : "#FBBF24"}
                                            fill={item.status === 'available' ? "transparent" : "#FBBF24"}
                                        />
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={[styles.actionIconButton, { backgroundColor: isDark ? '#2C2C2E' : '#f9fafb' }]}
                                        onPress={() => handleDelete(item._id)}
                                        activeOpacity={0.7}
                                    >
                                        <Trash2 size={18} color="#EF4444" />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    ))}
                </View>
            )}
        </View>
    );

    const renderAnnouncements = () => {
        const getAnnouncementStyle = (type: string) => {
            switch (type) {
                case 'warning': return { icon: AlertTriangle, color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.1)' };
                case 'tip': return { icon: Zap, color: '#8B5CF6', bg: 'rgba(139, 92, 246, 0.1)' };
                case 'update': return { icon: RefreshCw, color: '#10B981', bg: 'rgba(16, 185, 129, 0.1)' };
                default: return { icon: Info, color: '#3B82F6', bg: 'rgba(59, 130, 246, 0.1)' };
            }
        };

        return (
            <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Announcements</Text>
                {announcementsLoading ? (
                    <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 20 }} />
                ) : announcements.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Bell size={48} color={colors.textSecondary} style={{ opacity: 0.5 }} />
                        <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>No new announcements available.</Text>
                    </View>
                ) : (
                    <View style={{ gap: 16 }}>
                        {announcements.map((ann) => {
                            const style = getAnnouncementStyle(ann.type);
                            const Icon = style.icon;
                            return (
                                <View
                                    key={ann._id}
                                    style={[
                                        styles.announcementCard,
                                        {
                                            backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
                                            borderColor: colors.border,
                                            borderLeftColor: style.color,
                                            borderLeftWidth: 4,
                                        }
                                    ]}
                                >
                                    <View style={styles.announcementHeader}>
                                        <View style={[styles.announcementIconParams, { backgroundColor: style.bg }]}>
                                            <Icon size={18} color={style.color} />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={[styles.announcementTitle, { color: colors.text }]}>{ann.title}</Text>
                                            <Text style={styles.announcementDate}>
                                                {new Date(ann.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                            </Text>
                                        </View>
                                    </View>
                                    <View style={styles.announcementContentBox}>
                                        <Text style={[styles.announcementContent, { color: colors.textSecondary }]}>
                                            {ann.content}
                                        </Text>
                                    </View>
                                </View>
                            );
                        })}
                    </View>
                )}
            </View>
        );
    };


    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top }]}>
                <View style={styles.headerTop}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <ArrowLeft size={24} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: colors.text }]}>Selling</Text>
                    <View style={styles.headerIcons}>
                    </View>
                </View>

                {/* Horizontal Tabs */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.tabsScroll}
                >
                    <TouchableOpacity
                        style={[styles.tab, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }, activeTab === 'inbox' && (isDark ? styles.activeTabDark : styles.activeTabLight)]}
                        onPress={() => setActiveTab('inbox')}
                    >
                        <Text style={[
                            styles.tabText,
                            activeTab === 'inbox'
                                ? { color: isDark ? '#000' : '#FFF' }
                                : { color: colors.text }
                        ]}>Inbox</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tab, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }, activeTab === 'your_listings' && (isDark ? styles.activeTabDark : styles.activeTabLight)]}
                        onPress={() => setActiveTab('your_listings')}
                    >
                        <Text style={[
                            styles.tabText,
                            activeTab === 'your_listings'
                                ? { color: isDark ? '#000' : '#FFF' }
                                : { color: colors.text }
                        ]}>Your listings</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tab, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }, activeTab === 'announcements' && (isDark ? styles.activeTabDark : styles.activeTabLight)]}
                        onPress={() => setActiveTab('announcements')}
                    >
                        <Text style={[
                            styles.tabText,
                            activeTab === 'announcements'
                                ? { color: isDark ? '#000' : '#FFF' }
                                : { color: colors.text }
                        ]}>Announcements</Text>
                    </TouchableOpacity>
                </ScrollView>
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.content}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
                }
            >
                {/* Create Listing Bar */}
                <View style={[styles.createListingBar, { backgroundColor: isDark ? '#1C1C1E' : '#F9F9F9' }]}>
                    <Image
                        source={{ uri: getCorrectUrl(user?.avatar) }}
                        style={styles.userAvatar}
                    />
                    <TouchableOpacity
                        style={[styles.createBtn, { backgroundColor: colors.primary }]}
                        onPress={() => router.push('/marketplace/create')}
                    >
                        <Plus size={20} color="white" />
                        <Text style={styles.createBtnText}>Create listing</Text>
                    </TouchableOpacity>
                </View>

                {loading && !refreshing ? (
                    <View style={{ paddingVertical: 40 }}>
                        <ActivityIndicator size="large" color={colors.primary} />
                    </View>
                ) : (
                    <>
                        {activeTab === 'inbox' && renderInbox()}
                        {activeTab === 'your_listings' && renderYourListings()}
                        {activeTab === 'announcements' && renderAnnouncements()}
                    </>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)',
    },
    headerTop: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        justifyContent: 'space-between',
    },
    backButton: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    headerIcons: {
        flexDirection: 'row',
        gap: 16,
    },
    iconBtn: {
        padding: 4,
    },
    tabsScroll: {
        paddingHorizontal: 16,
        paddingBottom: 12,
        gap: 8,
    },
    tab: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: 'rgba(0,0,0,0.05)',
    },
    activeTab: {
        backgroundColor: '#2D2D2D',
    },
    tabText: {
        fontSize: 14,
        fontWeight: '600',
    },
    content: {
        padding: 16,
        paddingBottom: 40,
    },
    createListingBar: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 12,
        gap: 12,
        marginBottom: 24,
    },
    userAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
    },
    createBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 44,
        borderRadius: 22,
        gap: 8,
    },
    createBtnText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    section: {
        marginBottom: 32,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 16,
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    statCard: {
        width: '48%',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        minHeight: 110,
    },
    statHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 8,
    },
    statValue: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    statLabel: {
        fontSize: 14,
        fontWeight: '500',
        lineHeight: 18,
    },
    statSubtext: {
        fontSize: 11,
        marginTop: 4,
    },
    activeTabDark: {
        backgroundColor: '#FFFFFF',
    },
    activeTabLight: {
        backgroundColor: '#2D2D2D',
    },
    itemsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    itemCard: {
        width: '48%',
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        marginBottom: 16,
        boxShadow: '0 4 12 rgba(0,0,0,0.05)',
        elevation: 2,
    },
    itemImage: {
        width: '100%',
        height: 140,
    },
    itemStatusBadge: {
        position: 'absolute',
        top: 8,
        left: 8,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        gap: 4,
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    itemStatusText: {
        fontSize: 10,
        fontWeight: 'bold',
        textTransform: 'uppercase',
    },
    itemInfo: {
        padding: 12,
    },
    itemPrice: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    itemTitle: {
        fontSize: 13,
        marginTop: 2,
    },
    itemDivider: {
        height: 1,
        backgroundColor: '#f3f4f6',
        marginVertical: 12,
    },
    itemActionsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    actionIconButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#f9fafb',
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 40,
        gap: 12,
    },
    emptyStateText: {
        fontSize: 14,
        textAlign: 'center',
    },
    createBtnInline: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 20,
        marginTop: 8,
    },
    announcementCard: {
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 12,
    },
    announcementHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    announcementTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        flex: 1,
    },
    announcementContent: {
        fontSize: 14,
        lineHeight: 20,
    },
    announcementDate: {
        fontSize: 12,
        color: '#888',
        marginTop: 2, // Adjusted margin
    },
    announcementIconParams: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    announcementContentBox: {
        paddingLeft: 44,
        marginTop: 4,
    },
    // New Styles
    statIconBadge: {
        padding: 4,
        borderRadius: 8,
    },
    messageCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        gap: 12,
    },
    messageAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#eee',
    },
    messageName: {
        fontWeight: 'bold',
        fontSize: 14,
    },
    messageTime: {
        fontSize: 12,
        color: '#888',
    },
    messagePreview: {
        fontSize: 13,
    },
});
