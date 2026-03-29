import { API_BASE_URL } from '@/constants/Config';
import { useUser } from '@/context/UserContext';
import { useRouter } from 'expo-router';
import {
    ArrowLeft,
    Calendar,
    Clock,
    Eye,
    Heart,
    MessageCircle,
    TrendingUp,
    UserPlus,
    Video
} from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { useEffect, useState } from 'react';
import {
    Platform,
    RefreshControl,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

export default function ActivityScreen() {
    const router = useRouter();
    const { user } = (useUser() || {}) as any;
    const colors = useTheme();
    const styles = createStyles(colors);
    const [refreshing, setRefreshing] = useState(false);

    // Activity Stats
    const [stats, setStats] = useState({
        totalPosts: 0,
        totalLikes: 0,
        totalComments: 0,
        totalViews: 0,
        newFollowers: 0,
        reelsViews: 0,
    });

    useEffect(() => {
        if (user?._id) {
            fetchActivityStats();
        }
    }, [user]);

    const fetchActivityStats = async () => {
        try {
            if (!user?._id) return;

            // console.log('📊 Fetching activity stats for user:', user._id);

            // Fetch user's posts
            const postsResponse = await fetch(`${API_BASE_URL}/api/posts`);
            const allPosts = await postsResponse.json();
            const userPosts = allPosts.filter((p: any) => p.user?._id === user._id);

            // Calculate stats
            const totalPosts = userPosts.length;
            const totalLikes = userPosts.reduce((sum: number, post: any) => sum + (post.likes?.length || 0), 0);
            const totalComments = userPosts.reduce((sum: number, post: any) => sum + (post.comments?.length || 0), 0);
            const reelsCount = userPosts.filter((p: any) => p.type === 'reel' || p.type === 'video').length;


            // Fetch accurate followers count from API
            let followersCount = 0;
            try {
                const userResponse = await fetch(`${API_BASE_URL}/api/auth/user/${user._id}`);
                if (userResponse.ok) {
                    const userData = await userResponse.json();
                    followersCount = userData.followersCount || userData.followers?.length || 0;
                }
            } catch (err) {
                // console.log('Could not fetch followers, using context data');
                followersCount = user.followers?.length || 0;
            }

            setStats({
                totalPosts,
                totalLikes,
                totalComments,
                totalViews: totalLikes * 3, // Estimate: 3 views per like
                newFollowers: followersCount,
                reelsViews: reelsCount * 50, // Estimate: 50 views per reel
            });

            // console.log('✅ Activity stats loaded:', {
            //     totalPosts,
            //     totalLikes,
            //     totalComments,
            //     followersCount
            // });
        } catch (error) {
            console.error('❌ Error fetching activity stats:', error);
            // Fallback to default values
            setStats({
                totalPosts: 0,
                totalLikes: 0,
                totalComments: 0,
                totalViews: 0,
                newFollowers: 0,
                reelsViews: 0,
            });
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchActivityStats();
        setTimeout(() => setRefreshing(false), 1000);
    };

    const StatCard = ({ icon: Icon, title, value, color, subtitle }: any) => (
        <View style={styles.statCard}>
            <View style={[styles.statIconContainer, { backgroundColor: `${color}15` }]}>
                <Icon size={24} color={color} />
            </View>
            <View style={styles.statContent}>
                <Text style={styles.statValue}>{value.toLocaleString()}</Text>
                <Text style={styles.statTitle}>{title}</Text>
                {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
            </View>
        </View>
    );

    const ActivityItem = ({ icon: Icon, title, description, time, color }: any) => (
        <View style={styles.activityItem}>
            <View style={[styles.activityIcon, { backgroundColor: `${color}15` }]}>
                <Icon size={20} color={color} />
            </View>
            <View style={styles.activityContent}>
                <Text style={styles.activityTitle}>{title}</Text>
                <Text style={styles.activityDescription}>{description}</Text>
                <Text style={styles.activityTime}>{time}</Text>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <ArrowLeft size={24} color="#1A1A1A" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Activity</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={colors.primary}
                        colors={[colors.primary]}
                    />
                }
            >
                {/* Stats Overview */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>This Week</Text>
                    <View style={styles.statsGrid}>
                        <StatCard
                            icon={Heart}
                            title="Likes"
                            value={stats.totalLikes}
                            color="#FF3B30"
                            subtitle="+12% from last week"
                        />
                        <StatCard
                            icon={MessageCircle}
                            title="Comments"
                            value={stats.totalComments}
                            color="#007AFF"
                            subtitle="+8% from last week"
                        />
                        <StatCard
                            icon={Eye}
                            title="Views"
                            value={stats.totalViews}
                            color="#5856D6"
                            subtitle="+25% from last week"
                        />
                        <StatCard
                            icon={UserPlus}
                            title="Followers"
                            value={stats.newFollowers}
                            color={colors.primary}
                            subtitle="New this week"
                        />
                    </View>
                </View>

                {/* Content Performance */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <TrendingUp size={20} color={colors.primary} />
                        <Text style={styles.sectionTitle}>Content Performance</Text>
                    </View>
                    <View style={styles.performanceCard}>
                        <View style={styles.performanceRow}>
                            <Video size={20} color="#FF9500" />
                            <Text style={styles.performanceText}>Reels</Text>
                            <Text style={styles.performanceValue}>{stats.reelsViews} views</Text>
                        </View>
                        <View style={styles.performanceRow}>
                            <TrendingUp size={20} color="#34C759" />
                            <Text style={styles.performanceText}>Posts</Text>
                            <Text style={styles.performanceValue}>{stats.totalPosts} published</Text>
                        </View>
                        <View style={styles.performanceRow}>
                            <Clock size={20} color="#5856D6" />
                            <Text style={styles.performanceText}>Avg. Engagement</Text>
                            <Text style={styles.performanceValue}>4.2%</Text>
                        </View>
                    </View>
                </View>

                {/* Recent Activity */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Calendar size={20} color={colors.primary} />
                        <Text style={styles.sectionTitle}>Recent Activity</Text>
                    </View>
                    <View style={styles.activityList}>
                        <ActivityItem
                            icon={Heart}
                            title="New Likes"
                            description="Your reel got 45 new likes"
                            time="2 hours ago"
                            color="#FF3B30"
                        />
                        <ActivityItem
                            icon={MessageCircle}
                            title="New Comments"
                            description="3 people commented on your post"
                            time="5 hours ago"
                            color="#007AFF"
                        />
                        <ActivityItem
                            icon={UserPlus}
                            title="New Followers"
                            description="5 people started following you"
                            time="1 day ago"
                            color={colors.primary}
                        />
                        <ActivityItem
                            icon={Eye}
                            title="Milestone Reached"
                            description="Your reel reached 1K views!"
                            time="2 days ago"
                            color="#5856D6"
                        />
                    </View>
                </View>

                {/* Footer Spacing */}
                <View style={{ height: 100 }} />
            </ScrollView>
        </View>
    );
}

const createStyles = (colors: any) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8F9FA',
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 16,
        backgroundColor: colors.background,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    backButton: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1A1A1A',
    },
    section: {
        marginTop: 24,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 16,
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1A1A1A',
        paddingHorizontal: 16,
        marginBottom: 12,
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: 12,
        gap: 12,
    },
    statCard: {
        flex: 1,
        minWidth: '45%',
        backgroundColor: colors.background,
        borderRadius: 16,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    statIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    statContent: {
        flex: 1,
    },
    statValue: {
        fontSize: 24,
        fontWeight: '800',
        color: colors.text,
        marginBottom: 2,
    },
    statTitle: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.textSecondary,
        marginBottom: 2,
    },
    statSubtitle: {
        fontSize: 11,
        color: '#999',
    },
    performanceCard: {
        backgroundColor: colors.background,
        marginHorizontal: 16,
        borderRadius: 16,
        padding: 16,
        gap: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    performanceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    performanceText: {
        flex: 1,
        fontSize: 15,
        fontWeight: '600',
        color: '#1A1A1A',
    },
    performanceValue: {
        fontSize: 14,
        fontWeight: '700',
        color: '#666',
    },
    activityList: {
        backgroundColor: colors.background,
        marginHorizontal: 16,
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    activityItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        padding: 16,
        gap: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F5F5F5',
    },
    activityIcon: {
        width: 40,
        height: 40,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    activityContent: {
        flex: 1,
    },
    activityTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#1A1A1A',
        marginBottom: 4,
    },
    activityDescription: {
        fontSize: 14,
        color: '#666',
        marginBottom: 4,
    },
    activityTime: {
        fontSize: 12,
        color: '#999',
    },
});
