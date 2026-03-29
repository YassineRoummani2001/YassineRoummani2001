import { API_BASE_URL } from '@/constants/Config';
import { useMessages } from '@/context/MessagesContext';
import { useNotifications } from '@/context/NotificationContext';
import { useThemeContext } from '@/context/ThemeContext';
import { lazyLoad, MinimalLoader } from '@/utils/lazyLoad';
import { useFocusEffect, useRouter } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import { Bell, MessageCircle, ShoppingBag, Zap } from 'lucide-react-native';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Lazy load heavy components
const FeedPost = lazyLoad(() => import('@/components/FeedPost'), <MinimalLoader />);
const StoryList = lazyLoad(() => import('@/components/StoryList'), <MinimalLoader />);

// Viewability config
const viewabilityConfig = {
  itemVisiblePercentThreshold: 60, // Slightly more lenient
  minimumViewTime: 200, // Debounce viewability
};

export default function HomeScreen() {
  const router = useRouter();
  const { unreadCount } = useNotifications();
  const { unreadCount: unreadMessagesCount } = useMessages();
  const isFocused = useIsFocused();

  // State
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true); // Initial load
  const [isFetchingMore, setIsFetchingMore] = useState(false); // Pagination load
  const [refreshing, setRefreshing] = useState(false); // Pull to refresh
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [viewableItems, setViewableItems] = useState<string[]>([]);

  // Guard ref for race conditions
  const isFetchingRef = useRef(false);

  const fetchPosts = async (pageNum: number, shouldRefresh = false) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    try {
      if (shouldRefresh) setRefreshing(true);
      else if (pageNum === 1) setLoading(true);
      else setIsFetchingMore(true);

      const res = await fetch(`${API_BASE_URL}/api/posts?page=${pageNum}&limit=10`);

      if (res.ok) {
        const data = await res.json();
        const incomingPosts = Array.isArray(data) ? data : data.posts || [];

        if (incomingPosts.length < 10) {
          setHasMore(false);
        } else {
          setHasMore(true);
        }

        setPosts(prevPosts => {
          if (shouldRefresh) return incomingPosts;

          // DEDUPLICATION LOGIC:
          // Create a Map from existing posts for O(1) lookup
          const existingIds = new Set(prevPosts.map(p => p._id));
          const uniqueNewPosts = incomingPosts.filter((p: any) => !existingIds.has(p._id));

          return [...prevPosts, ...uniqueNewPosts];
        });
      } else {
        console.error('Failed to fetch posts:', res.status);
      }
    } catch (error) {
      console.error('❌ Error fetching posts:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setIsFetchingMore(false);
      isFetchingRef.current = false;
    }
  };

  // Initial Fetch
  useFocusEffect(
    useCallback(() => {
      // Only fetch if empty to persist state during simple navs
      setPosts(current => {
        if (current.length === 0) {
          fetchPosts(1);
        }
        return current;
      });
    }, [])
  );

  const onRefresh = () => {
    setPage(1);
    setHasMore(true);
    fetchPosts(1, true);
  };

  const loadMore = () => {
    if (!loading && !isFetchingMore && !refreshing && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchPosts(nextPage);
    }
  };

  const onViewableItemsChanged = useRef(({ viewableItems: vItems }: any) => {
    // Optimization: Only update if strictly needed, map to IDs immediately
    const ids = vItems.map((v: any) => v.key || v.item._id);
    setViewableItems(ids);
  }).current;

  const handlePostDelete = useCallback((postId: string) => {
    setPosts(prev => prev.filter(p => p._id !== postId));
  }, []);

  const renderItem = useCallback(({ item }: { item: any }) => {
    const isVideo = item.type === 'reel' || item.type === 'video' || (item.uri && /\.(mp4|mov|m4v|webm)$/i.test(item.uri));
    return (
      <FeedPost
        onDelete={handlePostDelete}
        active={isFocused && viewableItems.includes(item._id)}
        post={{
          ...item,
          id: item._id, // Ensure ID consistency
          isVideo: !!isVideo,
          videoUri: isVideo ? item.uri : undefined,
          image: !isVideo ? item.uri : item.coverImage,
          likes: item.likes || [],
          comments: item.comments || [],
        }}
      />
    );
  }, [viewableItems, handlePostDelete]);

  // Theme
  const { colors, isDark } = useThemeContext();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', borderBottomWidth: 1 }]}>
        <View style={styles.logoContainer}>
          <View style={[styles.logoIcon, { backgroundColor: colors.primary }]}>
            <Zap size={20} color="white" fill="white" />
          </View>
          <Text style={[styles.logoText, { color: colors.primary }]}>Vibe</Text>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.iconButton, { backgroundColor: isDark ? '#2C2C2E' : '#F3F4F6' }]}
            onPress={() => router.push('/marketplace')}
          >
            <ShoppingBag size={22} color={colors.text} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.iconButton, { backgroundColor: isDark ? '#2C2C2E' : '#F3F4F6' }]}
            onPress={() => router.push('/notifications')}
          >
            <Bell size={22} color={colors.text} />
            {unreadCount > 0 && (
              <View style={[styles.badge, { borderColor: colors.background }]}>
                <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.iconButton, { backgroundColor: isDark ? '#2C2C2E' : '#F3F4F6' }]}
            onPress={() => router.push('/chat')}
          >
            <MessageCircle size={22} color={colors.text} />
            {unreadMessagesCount > 0 && (
              <View style={[styles.badge, { borderColor: colors.background }]}>
                <Text style={styles.badgeText}>{unreadMessagesCount > 9 ? '9+' : unreadMessagesCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={posts}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        ListHeaderComponent={<StoryList />}
        ListEmptyComponent={
          loading ? (
            <View style={{ padding: 40, alignItems: 'center' }}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={{ color: colors.textSecondary, marginTop: 16 }}>Loading posts...</Text>
            </View>
          ) : (
            <View style={{ padding: 40, alignItems: 'center' }}>
              <Text style={{ fontSize: 48, marginBottom: 16 }}>📭</Text>
              <Text style={{ fontSize: 18, fontWeight: '600', color: colors.text, marginBottom: 8 }}>No posts yet</Text>
              <Text style={{ fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginBottom: 20 }}>
                Pull down to refresh or check your connection
              </Text>
              <TouchableOpacity
                style={{
                  backgroundColor: colors.primary,
                  paddingHorizontal: 24,
                  paddingVertical: 12,
                  borderRadius: 8
                }}
                onPress={onRefresh}
              >
                <Text style={{ color: 'white', fontWeight: '600' }}>Retry</Text>
              </TouchableOpacity>
            </View>
          )
        }
        ListFooterComponent={isFetchingMore ? <ActivityIndicator size="small" color={colors.primary} style={{ margin: 20 }} /> : <View style={{ height: 40 }} />}
        onRefresh={onRefresh}
        refreshing={refreshing}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        initialNumToRender={4}
        maxToRenderPerBatch={4}
        windowSize={5}
        removeClippedSubviews={Platform.OS === 'android'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontFamily: Platform.select({ ios: 'Avenir Next', android: 'sans-serif-black' }),
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FF3B30',
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: 'white',
    fontSize: 9,
    fontWeight: '800',
  },
  scrollContent: {
    paddingBottom: 100,
  },
});
