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
    CheckCircle2,
    Edit2,
    Heart,
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
import VibeConfirmModal from '@/components/VibeConfirmModal';
import { ActivityIndicator, Alert, Image, RefreshControl, ScrollView, Share, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BarChart, PieChart, LineChart } from 'react-native-gifted-charts';
import { LinearGradient } from 'expo-linear-gradient';
import Toast from 'react-native-toast-message';
import { TrendingUp, TrendingDown, ArrowUpRight, Filter } from 'lucide-react-native';

export default function SellingDashboard() {
    const router = useRouter();
    const { colors, isDark } = useThemeContext();
    const { user } = (useUser() || {}) as any;
    const insets = useSafeAreaInsets();
    const { width } = useWindowDimensions();
    const isDesktop = Platform.OS === 'web' && width > 768;

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
        sellerRating: 4.8,
        newFollowers: 0,
        totalInteractions: 0
    });
    const [announcements, setAnnouncements] = useState<any[]>([]);
    const [announcementsLoading, setAnnouncementsLoading] = useState(false);
    const [timeRange, setTimeRange] = useState(7);


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
            } else {
                // Keep default if failed
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
        if (activeTab === 'your_listings' || activeTab === 'performance') {
            fetchUserItems();
        } else if (activeTab === 'announcements') {
            fetchAnnouncements();
        }
        fetchStats();
    }, [activeTab]);

    const [isDeleteModalVisible, setDeleteModalVisible] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<string | null>(null);

    const handleDelete = async (itemId: string) => {
        setItemToDelete(itemId);
        setDeleteModalVisible(true);
    };

    const confirmDelete = async () => {
        if (!itemToDelete) return;
        try {
            const res = await fetch(`${API_BASE_URL}/api/marketplace/${itemToDelete}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${user?.token}`
                }
            });
            if (res.ok) {
                setUserItems(prev => prev.filter(i => i._id !== itemToDelete));
            } else {
                Alert.alert("Error", "Failed to delete item");
            }
        } catch (error) {
            console.error('Error deleting item:', error);
        } finally {
            setItemToDelete(null);
            setDeleteModalVisible(false);
        }
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

    const getCorrectUrl = (uri: string) => {
        if (!uri || typeof uri !== 'string') return 'https://via.placeholder.com/400';
        if (uri.startsWith('blob:') || uri.startsWith('data:') || uri.startsWith('file:')) return uri;

        if (uri.startsWith('http') && uri.includes('/uploads/')) {
            const parts = uri.split('/uploads/');
            return `${API_BASE_URL}/uploads/${parts[1]}`;
        }
        
        if (uri.startsWith('http')) return uri;
        if (uri.startsWith('/uploads/')) return `${API_BASE_URL}${uri}`;
        if (uri.includes('/uploads/')) {
            const parts = uri.split('/uploads/');
            return `${API_BASE_URL}/uploads/${parts[1]}`;
        }

        return `${API_BASE_URL}/uploads/${uri}`;
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
                <Text 
                    style={[styles.statValue, { color: highlight ? colors.primary : colors.text }]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.65}
                >
                    {value}
                </Text>
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

    const renderPerformance = () => {
        const totalItems = (stats.activeListings || 0) + (stats.soldCount || 0);
        const soldPercentage = totalItems > 0 ? Math.round(((stats.soldCount || 0) / totalItems) * 100) : 0;

        // Dynamic chart data parsed DIRECTLY from Database Time-Series
        const dailyViewsMap = stats.dailyViewsMap || {};
        
        const generateDBChartData = () => {
            const finalData = [];
            const dayNames = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
            const bucketSize = timeRange === 7 ? 1 : (timeRange === 30 ? 4 : 12);
            
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            for (let b = 6; b >= 0; b--) {
                let bucketSum = 0;
                
                // End date of the current bucket
                const endDate = new Date(today);
                endDate.setDate(endDate.getDate() - (b * bucketSize));
                
                // Start date of the current bucket
                const startDate = new Date(endDate);
                startDate.setDate(startDate.getDate() - bucketSize + 1);
                
                // Calculate total views from the Database map inside this bucket
                for(let d = 0; d < bucketSize; d++) {
                    const walkDate = new Date(startDate);
                    walkDate.setDate(walkDate.getDate() + d);
                    // Use exact ISO format YYYY-MM-DD
                    const isoDate = walkDate.toISOString().split('T')[0];
                    bucketSum += (dailyViewsMap[isoDate] || 0);
                }
                
                finalData.push({
                    value: bucketSum,
                    label: timeRange === 7 ? dayNames[endDate.getDay()] : `${endDate.getDate()}/${endDate.getMonth()+1}`,
                    lineLabel: String(endDate.getDate()).padStart(2, '0'),
                    frontColor: '#00F0FF'
                });
            }
            return finalData;
        };

        const dbChartData = generateDBChartData();

        // Feed exact database metrics
        const barData = dbChartData;
        const lineData = dbChartData.map(d => ({ value: d.value, label: d.lineLabel }));

        const ChartCard = ({ title, subtitle, children, trend, percentage, icon: CardIcon }: any) => (
            <View style={[styles.chartContainer, { width: isDesktop ? '49%' : '100%', backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF', borderColor: colors.border }]}>
                <View style={styles.chartHeaderRow}>
                    <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                             {CardIcon && <CardIcon size={16} color={colors.primary} />}
                             <Text style={[styles.chartTitle, { color: colors.text }]}>{title}</Text>
                        </View>
                        <Text style={{ fontSize: 12, color: colors.textSecondary }}>{subtitle}</Text>
                    </View>
                    {percentage && (
                        <View style={[styles.trendBadge, { backgroundColor: trend === 'up' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)' }]}>
                            {trend === 'up' ? <TrendingUp size={12} color="#10B981" /> : <TrendingDown size={12} color="#EF4444" />}
                            <Text style={[styles.trendText, { color: trend === 'up' ? '#10B981' : '#EF4444' }]}>{percentage}</Text>
                        </View>
                    )}
                </View>
                {children}
            </View>
        );

        const pieData = [
            { value: stats.soldCount || 0, color: '#6366F1', text: 'Sold' },
            { value: stats.activeListings || 0, color: '#00F0FF', text: 'Active' },
            { value: stats.totalSaves || 0, color: '#8B5CF6', text: 'Saves' },
        ];

        // Ensure chart shows something even if all zero
        const hasData = pieData.some(d => d.value > 0);
        const displayPieData = hasData ? pieData : [
            { value: 1, color: isDark ? '#333' : '#EEE', text: 'No Data' }
        ];

        return (
            <View style={styles.section}>
                <View style={styles.performanceHeader}>
                    <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0 }]}>Analytics Hub</Text>
                    <View style={[styles.timeFilter, { backgroundColor: isDark ? '#1C1C1E' : '#F3F4F6' }]}>
                        {[7, 30, 90].map((d) => (
                            <TouchableOpacity
                                key={d}
                                onPress={() => setTimeRange(d)}
                                style={[styles.filterBtn, timeRange === d && { backgroundColor: colors.primary }]}
                            >
                                <Text style={[styles.filterBtnText, { color: timeRange === d ? '#FFF' : colors.textSecondary }]}>{d}d</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Visual Analytics Row 1 - Combined View */}
                <View style={[styles.chartsRow, { flexDirection: isDesktop ? 'row' : 'column', justifyContent: 'space-between' }]}>
                    <ChartCard 
                        title="Engagement" 
                        subtitle="Detailed clicks trend" 
                        trend="up" 
                        percentage="12.4%" 
                        icon={ArrowUpRight}
                    >
                        <View style={{ marginTop: 20 }}>
                            <LineChart
                                data={lineData}
                                width={isDesktop ? (width - 350) * 0.42 : width - 80}
                                height={140}
                                color={isDark ? '#FFF' : colors.primary}
                                thickness={3}
                                hideRules
                                hideYAxisText
                                yAxisThickness={0}
                                xAxisThickness={0}
                                curved
                                areaChart
                                startFillColor="rgba(99,102,241,0.2)"
                                endFillColor="transparent"
                                isAnimated
                            />
                        </View>
                    </ChartCard>

                    <ChartCard 
                        title="Weekly Views" 
                        subtitle="Visitor distribution" 
                        trend="up" 
                        percentage="8.2%" 
                        icon={BarChart2}
                    >
                        <View style={{ marginTop: 20 }}>
                            <BarChart
                                data={barData}
                                width={isDesktop ? (width - 350) * 0.42 : width - 80}
                                height={140}
                                barWidth={isDesktop ? 20 : 28}
                                spacing={isDesktop ? 22 : 12}
                                hideRules
                                hideYAxisText
                                yAxisThickness={0}
                                xAxisThickness={0}
                                xAxisLabelTextStyle={{ color: colors.textSecondary, fontSize: 10 }}
                                isAnimated
                            />
                        </View>
                    </ChartCard>
                </View>

                {/* Visual Analytics Row 2 - Deep Insights */}
                <View style={[styles.chartsRow, { flexDirection: isDesktop ? 'row' : 'column', marginTop: 16, justifyContent: 'space-between' }]}>
                   <ChartCard title="Success Rate" subtitle="Sales conversion" icon={CheckCircle2}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 24, marginTop: 16 }}>
                            <PieChart
                                donut
                                data={displayPieData}
                                radius={55}
                                innerRadius={42}
                                innerCircleColor={isDark ? '#1C1C1E' : '#FFFFFF'}
                                centerLabelComponent={() => (
                                    <View style={{ justifyContent: 'center', alignItems: 'center' }}>
                                        <Text style={{ fontSize: 18, color: hasData ? colors.text : colors.textSecondary, fontWeight: '900' }}>{hasData ? `${soldPercentage}%` : '—'}</Text>
                                        <Text style={{ fontSize: 8, color: colors.textSecondary, fontWeight: '700', textTransform: 'uppercase' }}>{hasData ? 'Sold' : 'Empty'}</Text>
                                    </View>
                                )}
                            />
                            <View style={{ flex: 1, gap: 12 }}>
                                {pieData.map((d, i) => (
                                    <View key={i} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                            <View style={[styles.legendDot, { backgroundColor: d.color, width: 10, height: 10, borderRadius: 5 }]} />
                                            <Text style={[styles.legendText, { fontSize: 13, fontWeight: '600', color: colors.textSecondary }]}>{d.text}</Text>
                                        </View>
                                        <Text style={{ fontSize: 14, fontWeight: '800', color: colors.text }}>{d.value}</Text>
                                    </View>
                                ))}
                            </View>
                        </View>
                   </ChartCard>

                   {/* Interactive Account Status - Premium Card */}
                   <LinearGradient
                        colors={isDark ? ['#1C1C1E', '#262626'] : ['#F8FAFC', '#F1F5F9']}
                        style={[styles.chartContainer, { width: isDesktop ? '49%' : '100%', borderColor: colors.border, padding: 24 }]}
                   >
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: isDark ? 'rgba(99,102,241,0.2)' : 'rgba(99,102,241,0.1)', alignItems: 'center', justifyContent: 'center' }}>
                                    <Zap size={20} color={colors.primary} />
                                </View>
                                <Text style={{ fontSize: 14, fontWeight: '800', color: colors.text, textTransform: 'uppercase', letterSpacing: 1 }}>Account Status</Text>
                            </View>
                            <View style={{ backgroundColor: stats.profileStrength >= 90 ? '#10B98120' : '#6366F120', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 }}>
                                <Text style={{ color: stats.profileStrength >= 90 ? '#10B981' : colors.primary, fontSize: 11, fontWeight: '800', textTransform: 'uppercase' }}>
                                    {stats.profileStrength >= 90 ? 'Verified' : 'Active'}
                                </Text>
                            </View>
                        </View>

                        <View style={{ gap: 14 }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                                <View>
                                    <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '600' }}>Profile Strength</Text>
                                    <Text style={{ color: colors.text, fontSize: 24, fontWeight: '900', marginTop: 2 }}>
                                        {stats.profileStrength >= 90 ? 'Elite' : stats.profileStrength >= 70 ? 'Strong' : 'Rising'}
                                    </Text>
                                </View>
                                <Text style={{ color: colors.primary, fontSize: 14, fontWeight: '800' }}>{stats.profileStrength || 0}%</Text>
                            </View>

                            <View style={{ height: 10, backgroundColor: isDark ? '#333' : '#E2E8F0', borderRadius: 5, overflow: 'hidden' }}>
                                <LinearGradient
                                    colors={[colors.primary, '#8B5CF6']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={{ width: `${stats.profileStrength || 60}%`, height: '100%', borderRadius: 5 }}
                                />
                            </View>

                            <Text style={{ fontSize: 13, color: colors.textSecondary, lineHeight: 20 }}>
                                {stats.profileStrength >= 80 
                                    ? `Outstanding! You're in the top ${100 - stats.profileStrength}% of sellers. Your visibility is boosted.`
                                    : `Complete your missing profile details to reach up to 40% more potential buyers in your area.`}
                            </Text>

                            <TouchableOpacity 
                                style={{ 
                                    marginTop: 10, 
                                    backgroundColor: colors.primary, 
                                    borderRadius: 14, 
                                    paddingVertical: 14,
                                    alignItems: 'center',
                                    flexDirection: 'row',
                                    justifyContent: 'center',
                                    gap: 10,
                                    shadowColor: colors.primary,
                                    shadowOffset: { width: 0, height: 4 },
                                    shadowOpacity: 0.3,
                                    shadowRadius: 8,
                                    elevation: 6
                                }}
                                onPress={() => router.push('/edit-profile' as any)}
                                activeOpacity={0.8}
                            >
                                <Text style={{ color: '#FFF', fontWeight: '800', fontSize: 14, letterSpacing: 0.3 }}>Complete Profile</Text>
                                <ArrowUpRight size={18} color="#FFF" strokeWidth={2.5} />
                            </TouchableOpacity>
                        </View>
                   </LinearGradient>
                </View>

                <View style={[styles.statsGrid, { marginTop: 20 }]}>
                    <StatCard
                        value={`${stats.inventoryValue?.toLocaleString() || 0} DH`}
                        label="Inventory Value"
                        subtext="Database summary"
                        icon={Tag}
                        highlight
                    />
                    <StatCard
                        value={stats.totalViews || 0}
                        label="Total views"
                        icon={BarChart2}
                    />
                    <StatCard
                        value={stats.totalSaves || 0}
                        label="Total saves"
                        icon={Heart}
                    />
                    <StatCard
                        value={stats.soldCount || 0}
                        label="Items sold"
                        icon={CheckCircle2}
                    />
                </View>

            <View style={{ marginTop: 32 }}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Top Performing Items</Text>
                {userItems.length === 0 ? (
                    <Text style={{ color: colors.textSecondary, textAlign: 'center', marginTop: 20 }}>No items to analyze yet</Text>
                ) : (
                    <View style={{ gap: 12 }}>
                        {userItems
                            .sort((a, b) => {
                                const scoreA = (a.views || 0) + (a.savedBy?.length || 0) * 5;
                                const scoreB = (b.views || 0) + (b.savedBy?.length || 0) * 5;
                                return scoreB - scoreA;
                            })
                            .slice(0, 5)
                            .map((item) => (
                                <View 
                                    key={item._id} 
                                    style={[styles.performanceRow, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF', borderColor: colors.border }]}
                                >
                                    <Image source={{ uri: getCorrectUrl(item.images?.[0]) }} style={styles.performanceRowImage} />
                                    <View style={{ flex: 1 }}>
                                        <Text numberOfLines={1} style={[styles.performanceRowTitle, { color: colors.text }]}>{item.title}</Text>
                                        <Text style={{ fontSize: 12, color: colors.textSecondary }}>{item.views || 0} views • {item.savedBy?.length || 0} saves</Text>
                                    </View>
                                    <View style={[styles.performanceProgress, { backgroundColor: isDark ? '#2C2C2E' : '#F3F4F6' }]}>
                                        <View 
                                            style={[
                                                styles.performanceProgressBar, 
                                                { 
                                                    backgroundColor: colors.primary, 
                                                    width: `${Math.min(100, (((item.views || 0) + (item.savedBy?.length || 0) * 5) / (Math.max(1, (stats.totalViews || 1) + (stats.totalSaves || 0) * 5))) * 100)}%` 
                                                }
                                            ]} 
                                        />
                                    </View>
                                </View>
                            ))}
                    </View>
                )}
            </View>
        </View>
    );
};

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
                        style={[styles.tab, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }, activeTab === 'performance' && (isDark ? styles.activeTabDark : styles.activeTabLight)]}
                        onPress={() => setActiveTab('performance')}
                    >
                        <Text style={[
                            styles.tabText,
                            activeTab === 'performance'
                                ? { color: isDark ? '#000' : '#FFF' }
                                : { color: colors.text }
                        ]}>Performance</Text>
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
                        {activeTab === 'performance' && renderPerformance()}
                        {activeTab === 'announcements' && renderAnnouncements()}
                    </>
                )}
            </ScrollView>

            <VibeConfirmModal
                visible={isDeleteModalVisible}
                onClose={() => setDeleteModalVisible(false)}
                onConfirm={confirmDelete}
                title="Delete Listing"
                message="Are you sure you want to delete this item? This action cannot be undone."
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
        paddingBottom: 20,
        borderRadius: 12,
        borderWidth: 1,
        minHeight: 125,
    },
    statHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 8,
    },
    statValue: {
        fontSize: 22,
        fontWeight: 'bold',
        maxWidth: '80%',
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
    performanceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        gap: 12,
        marginBottom: 8,
    },
    performanceRowImage: {
        width: 44,
        height: 44,
        borderRadius: 8,
    },
    performanceRowTitle: {
        fontSize: 14,
        fontWeight: 'bold',
    },
    performanceProgress: {
        flex: 1,
        height: 6,
        borderRadius: 3,
        marginLeft: 12,
        overflow: 'hidden',
    },
    performanceProgressBar: {
        height: '100%',
    },
    chartContainer: {
        padding: 20,
        borderRadius: 24,
        borderWidth: 1,
        marginTop: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 5,
    },
    chartTitle: {
        fontSize: 15,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    performanceHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    timeFilter: {
        flexDirection: 'row',
        padding: 4,
        borderRadius: 12,
        gap: 4,
    },
    filterBtn: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
    filterBtnText: {
        fontSize: 12,
        fontWeight: 'bold',
    },
    chartHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    trendBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        gap: 4,
    },
    trendText: {
        fontSize: 11,
        fontWeight: 'bold',
    },
    chartsRow: {
        flexDirection: 'row',
        gap: 16,
        marginTop: 12,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    legendDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    legendText: {
        fontSize: 10,
        color: '#888',
    },
});
