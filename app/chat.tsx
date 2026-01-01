import ChatItem from '@/components/ChatItem';
import NewChatModal from '@/components/NewChatModal';
import { SkeletonRow } from '@/components/Skeletons';
import { API_BASE_URL } from '@/constants/Config';
import { useMessages } from '@/context/MessagesContext';
import { useThemeContext } from '@/context/ThemeContext';
import { useUser } from '@/context/UserContext';
import { formatDistanceToNow } from 'date-fns';
import { useRouter } from 'expo-router';
import { ArrowLeft, ChevronDown, PenBox, Plus, Search, SquarePen } from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import {
    FlatList,
    Image,
    RefreshControl,
    SafeAreaView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

export default function ChatScreen() {
    const router = useRouter();
    const userContext = useUser();
    const { user } = (userContext || {}) as any;
    const { socket } = useMessages();
    const { colors, isDark } = useThemeContext();

    // State
    const [chats, setChats] = useState<any[]>([]);
    const [followingUsers, setFollowingUsers] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [showNewChat, setShowNewChat] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Fetch Data
    const fetchData = useCallback(async () => {
        if (!user?._id) return;
        try {
            const [chatRes, followRes] = await Promise.all([
                fetch(`${API_BASE_URL}/api/chats`, { headers: { 'Authorization': `Bearer ${user.token}` } }),
                fetch(`${API_BASE_URL}/api/auth/following/${user._id}`)
            ]);

            if (chatRes.ok) setChats(await chatRes.json());
            if (followRes.ok) setFollowingUsers(await followRes.json());
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    }, [user?._id, user?.token]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Socket Setup
    useEffect(() => {
        if (!socket) return;
        const handleStatus = ({ userId, isOnline }: any) => {
            setFollowingUsers(p => p.map(u => u._id === userId ? { ...u, isOnline } : u));
            setChats(initialChats => initialChats.map(c => ({
                ...c,
                participants: c.participants.map((p: any) => p._id === userId ? { ...p, isOnline } : p)
            })));
        };
        const handleNewMessage = () => fetchData();

        socket.on('user:status', handleStatus);
        socket.on('message:new', handleNewMessage);
        return () => {
            socket.off('user:status', handleStatus);
            socket.off('message:new', handleNewMessage);
        };
    }, [socket, fetchData]);

    // Filter
    const filteredChats = chats.filter(c => {
        const other = c.participants.find((p: any) => p._id !== user._id) || c.participants[0];
        return other?.name?.toLowerCase().includes(searchQuery.toLowerCase());
    });

    // Formatting Time
    const formatTime = (dateStr?: string) => {
        if (!dateStr) return '';
        return formatDistanceToNow(new Date(dateStr), { addSuffix: false })
            .replace('about ', '')
            .replace(' minutes', 'm')
            .replace(' minute', 'm')
            .replace(' hours', 'h')
            .replace(' hour', 'h')
            .replace(' days', 'd')
            .replace(' day', 'd')
            .replace(' less than a minute', 'now');
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

            {/* Custom Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={{ width: 40 }}>
                    <ArrowLeft size={24} color={colors.text} />
                </TouchableOpacity>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text }}>
                        {user?.username || user?.name || 'Messages'}
                    </Text>
                    <ChevronDown size={14} color={colors.text} />
                </View>

                <TouchableOpacity onPress={() => setShowNewChat(true)} style={{ width: 40, alignItems: 'flex-end' }}>
                    <SquarePen size={26} color={colors.text} />
                </TouchableOpacity>
            </View>

            {/* Search */}
            <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
                <View style={[styles.searchBar, { backgroundColor: isDark ? '#262626' : '#F3F4F6' }]}>
                    <Search size={18} color={isDark ? '#A0A0A0' : '#9CA3AF'} />
                    <TextInput
                        placeholder="Search"
                        placeholderTextColor={isDark ? '#A0A0A0' : '#9CA3AF'}
                        style={[styles.input, { color: colors.text }]}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>
            </View>

            {/* List */}
            {isLoading ? (
                <View style={{ padding: 16 }}>
                    {[1, 2, 3, 4, 5].map(i => <SkeletonRow key={i} />)}
                </View>
            ) : (
                <FlatList
                    data={filteredChats}
                    keyExtractor={item => item._id}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} />}
                    ListHeaderComponent={
                        !searchQuery ? (
                            <View style={{ marginBottom: 16 }}>
                                <FlatList
                                    horizontal
                                    data={[{ _id: 'me', name: 'Your Note', avatar: user?.avatar }, ...followingUsers]}
                                    contentContainerStyle={{ paddingHorizontal: 16, gap: 16 }}
                                    showsHorizontalScrollIndicator={false}
                                    renderItem={({ item }) => {
                                        const isMe = item._id === 'me';
                                        return (
                                            <TouchableOpacity onPress={() => !isMe && router.push(`/message/${item._id}`)} style={{ alignItems: 'center', width: 72 }}>
                                                <View>
                                                    <Image
                                                        source={{ uri: item.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.name)}&background=random` }}
                                                        style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: '#DDD' }}
                                                    />
                                                    {isMe ? (
                                                        <View style={[styles.plusBadge, { backgroundColor: colors.background }]}>
                                                            <View style={styles.plusInner}>
                                                                <Plus size={14} color={colors.text} />
                                                            </View>
                                                        </View>
                                                    ) : (
                                                        item.isOnline && <View style={[styles.onlineBadge, { borderColor: colors.background }]} />
                                                    )}
                                                </View>
                                                <Text numberOfLines={1} style={{ fontSize: 12, marginTop: 4, color: isDark ? '#FFF' : '#000', opacity: 0.8 }}>
                                                    {isMe ? 'Your Note' : item.name.split(' ')[0]}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    }}
                                />
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, marginTop: 20 }}>
                                    <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>Messages</Text>
                                    <Text style={{ fontSize: 16, color: '#0095F6' }}>Requests</Text>
                                </View>
                            </View>
                        ) : null
                    }
                    ListEmptyComponent={
                        <View style={{ alignItems: 'center', marginTop: 50, padding: 20 }}>
                            <PenBox size={40} color={colors.text} style={{ opacity: 0.5, marginBottom: 10 }} />
                            <Text style={{ color: colors.textSecondary, fontSize: 16 }}>No chats found.</Text>
                        </View>
                    }
                    renderItem={({ item }) => {
                        const other = item.participants.find((p: any) => p._id !== user._id) || item.participants[0];
                        if (!other) return null;
                        return (
                            <ChatItem
                                avatar={other.avatar}
                                name={other.name}
                                lastMessage={item.lastMessageSender === user._id ? `You: ${item.lastMessage}` : (item.lastMessage || 'Sent an attachment')}
                                time={formatTime(item.updatedAt)}
                                unread={item.unreadCount || 0}
                                online={other.isOnline}
                                onPress={() => router.push(`/message/${other._id}`)}
                                isDark={isDark}
                            />
                        );
                    }}
                />
            )}

            <NewChatModal visible={showNewChat} onClose={() => setShowNewChat(false)} />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, height: 50, marginBottom: 8
    },
    searchBar: {
        flexDirection: 'row', alignItems: 'center', height: 40,
        borderRadius: 12, paddingHorizontal: 12, gap: 8
    },
    input: { flex: 1, fontSize: 16, height: '100%' },
    plusBadge: {
        position: 'absolute', bottom: 0, right: 0, padding: 2, borderRadius: 20
    },
    plusInner: {
        width: 20, height: 20, borderRadius: 10,
        backgroundColor: '#E5E5E5', alignItems: 'center', justifyContent: 'center'
    },
    onlineBadge: {
        position: 'absolute', bottom: 2, right: 2,
        width: 16, height: 16, borderRadius: 8,
        backgroundColor: '#2ECC71', borderWidth: 2.5
    }
});
