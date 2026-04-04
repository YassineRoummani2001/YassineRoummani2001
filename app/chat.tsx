import ChatItem from '@/components/ChatItem';
import CreateGroupModal from '@/components/CreateGroupModal';
import NewChatModal from '@/components/NewChatModal';
import NoteViewer from '@/components/NoteViewer';
import { SkeletonChat } from '@/components/Skeletons';
import { API_BASE_URL } from '@/constants/Config';
import { useMessages } from '@/context/MessagesContext';
import { useThemeContext } from '@/context/ThemeContext';
import { useUser } from '@/context/UserContext';
import { ApiClient } from '@/utils/api';
import { formatDistanceToNow } from 'date-fns';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import {
    FlatList,
    Image,
    Platform,
    RefreshControl,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    useWindowDimensions,
    View,
} from 'react-native';

const UserNoteBubble = ({ note, isDark }: { note: any, isDark: boolean }) => {
    if (!note) return null;
    return (
        <View style={{
            position: 'absolute',
            bottom: 60,
            alignSelf: 'center',
            backgroundColor: isDark ? '#262626' : '#FFFFFF',
            borderRadius: 20,
            paddingHorizontal: 12,
            paddingVertical: 8,
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: 60,
            maxWidth: 100,
            zIndex: 100,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.15,
            shadowRadius: 4,
            elevation: 5,
            borderWidth: 1,
            borderColor: isDark ? '#333' : '#EEE',
        }}>
            {note.music ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Ionicons name="musical-notes" size={12} color={isDark ? '#FFF' : '#000'} />
                    <Text numberOfLines={1} style={{ fontSize: 11, color: isDark ? '#FFF' : '#000', fontWeight: '600' }}>
                        {note.music.track}
                    </Text>
                </View>
            ) : (
                <Text numberOfLines={2} style={{ fontSize: 11, color: isDark ? '#FFF' : '#000', textAlign: 'center', fontWeight: '500' }}>
                    {note.content}
                </Text>
            )}

            <View style={{
                position: 'absolute',
                bottom: -5,
                width: 10,
                height: 10,
                backgroundColor: isDark ? '#262626' : '#FFFFFF',
                transform: [{ rotate: '45deg' }],
                zIndex: -1,
                borderRightWidth: 1,
                borderBottomWidth: 1,
                borderColor: isDark ? '#333' : '#EEE',
            }} />
        </View>
    );
};

export default function ChatScreen() {
    const router = useRouter();
    const userContext = useUser();
    const { user } = (userContext || {}) as any;
    const { socket } = useMessages();
    const { colors, isDark } = useThemeContext();

    // Layout
    const { width } = useWindowDimensions();
    const isDesktop = Platform.OS === 'web' && width > 768;

    // State
    const [chats, setChats] = useState<any[]>([]);
    const [followingUsers, setFollowingUsers] = useState<any[]>([]);
    const [notes, setNotes] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [showNewChat, setShowNewChat] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedNote, setSelectedNote] = useState<any>(null);
    const [activeFilter, setActiveFilter] = useState<'all' | 'unread' | 'groups' | 'marketplace'>('all');
    const [showGroupModal, setShowGroupModal] = useState(false);

    // Fetch Data
    const fetchData = useCallback(async () => {
        if (!user?._id) return;
        try {
            const [chatRes, followRes, notesRes] = await Promise.all([
                fetch(`${API_BASE_URL}/api/chats`, { headers: { 'Authorization': `Bearer ${user.token}` } }),
                fetch(`${API_BASE_URL}/api/auth/following/${user._id}`),
                ApiClient.get<any>('/api/notes', { 'Authorization': `Bearer ${user.token}` })
            ]);

            if (chatRes.ok) {
                const data = await chatRes.json();
                setChats(data);
            }
            if (followRes.ok) setFollowingUsers(await followRes.json());

            if (notesRes.success && notesRes.data) {
                setNotes(notesRes.data);
            }
        } catch (error) {
            console.error('🔴 Error fetching data:', error);
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    }, [user?._id, user?.token]);

    useFocusEffect(
        useCallback(() => {
            fetchData();
        }, [fetchData])
    );

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

    // Filter Logic
    const filteredChats = chats.filter(c => {
        // Name Search
        let matchesSearch = true;
        if (searchQuery) {
            const other = c.participants.find((p: any) => p._id !== user._id) || c.participants[0];
            const nameToSearch = c.isGroup ? c.groupName : other?.name;
            matchesSearch = nameToSearch?.toLowerCase().includes(searchQuery.toLowerCase());
        }
        if (!matchesSearch) return false;

        // Custom Filters
        if (activeFilter === 'unread') return c.unreadCount > 0;
        if (activeFilter === 'groups') return c.isGroup;
        if (activeFilter === 'marketplace') return c.isMarketplace;
        
        return true;
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

    const filters = [
        { id: 'all', label: 'All' },
        { id: 'unread', label: 'Unread' },
        { id: 'groups', label: 'Groups' },
        { id: 'marketplace', label: 'Marketplace' }
    ];

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

            {/* Custom Header */}
            <View style={[styles.header, { borderBottomColor: colors.border, height: isDesktop ? 60 : 56, paddingTop: isDesktop ? 0 : 0 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, justifyContent: isDesktop ? 'center' : 'flex-start' }}>
                    {!isDesktop && router.canGoBack() && (
                        <TouchableOpacity onPress={() => router.back()} style={{ padding: 8 }}>
                            <Ionicons name="arrow-back" size={24} color={colors.text} />
                        </TouchableOpacity>
                    )}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginLeft: (!isDesktop && router.canGoBack()) ? 0 : 16 }}>
                        <Text style={[styles.headerTitle, { color: colors.text }]}>{user?.username || 'Messages'}</Text>
                        <Ionicons name="chevron-down" size={16} color={colors.text} />
                    </View>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                    <TouchableOpacity onPress={() => setShowGroupModal(true)}>
                        <Ionicons name="people-outline" size={24} color={colors.text} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setShowNewChat(true)}>
                        <Ionicons name="add" size={28} color={colors.text} />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Search */}
            <View style={styles.searchContainer}>
                <View style={[styles.searchBar, { backgroundColor: isDark ? '#262626' : '#F3F4F6' }]}>
                    <Ionicons name="search" size={18} color={colors.textSecondary} style={{ marginRight: 8 }} />
                    <TextInput
                        placeholder="Search messages..."
                        placeholderTextColor={colors.textSecondary}
                        style={[styles.searchInput, { color: colors.text }]}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>
            </View>

            {/* Filter Bar */}
            <View style={styles.filterBar}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}>
                    {filters.map((f) => (
                        <TouchableOpacity 
                            key={f.id}
                            onPress={() => setActiveFilter(f.id as any)}
                            style={[
                                styles.filterPill, 
                                { 
                                    backgroundColor: activeFilter === f.id ? (isDark ? '#FFF' : '#000') : (isDark ? '#262626' : '#F3F4F6'),
                                }
                            ]}
                        >
                            <Text style={[
                                styles.filterText, 
                                { color: activeFilter === f.id ? (isDark ? '#000' : '#FFF') : colors.textSecondary }
                            ]}>
                                {f.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {/* List */}
            {isLoading ? (
                <View style={{ flex: 1 }}>
                    <SkeletonChat />
                </View>
            ) : (
                <FlatList
                    data={filteredChats}
                    keyExtractor={item => item._id}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} />}
                    ListHeaderComponent={
                        (!searchQuery && activeFilter === 'all') ? (
                            <View style={{ marginBottom: 16, paddingTop: 10, overflow: 'visible', zIndex: 10, elevation: 10 }}>
                                <FlatList
                                    horizontal
                                    data={[{ _id: 'me', name: 'Your Note', avatar: user?.avatar }, ...followingUsers]}
                                    contentContainerStyle={{ paddingHorizontal: 16, gap: 16, paddingTop: 30, paddingBottom: 10 }}
                                    showsHorizontalScrollIndicator={false}
                                    style={{ overflow: 'visible' }}
                                    removeClippedSubviews={false}
                                    renderItem={({ item }) => {
                                        const isMe = item._id === 'me';
                                        const note = notes.find(n => {
                                            const nUserId = typeof n.user === 'object' ? n.user._id : n.user;
                                            return isMe ? (nUserId === user?._id) : (nUserId === item._id);
                                        });

                                        return (
                                            <TouchableOpacity
                                                onPress={() => {
                                                    if (isMe) router.push('/notes/create');
                                                    else if (note) setSelectedNote(note);
                                                    else router.push(`/message/${item._id}`);
                                                }}
                                                style={{ alignItems: 'center', width: 72 }}
                                                activeOpacity={0.85}
                                            >
                                                <View style={{ position: 'relative', marginBottom: 6 }}>
                                                    <UserNoteBubble note={note} isDark={isDark} />
                                                    <Image
                                                        source={{
                                                            uri: item.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.name || 'User')}&background=random`,
                                                        }}
                                                        style={{
                                                            width: 72, height: 72, borderRadius: 36,
                                                            borderWidth: note ? 2.5 : 0,
                                                            borderColor: note ? (isDark ? '#444' : '#555') : 'transparent',
                                                        }}
                                                    />
                                                    {isMe ? (
                                                        <View style={styles.plusBadge}><View style={styles.plusInner}><Ionicons name="add" size={14} color={colors.text} /></View></View>
                                                    ) : (
                                                        item.isOnline && <View style={[styles.onlineBadge, { borderColor: colors.background }]} />
                                                    )}
                                                </View>
                                                <Text numberOfLines={1} style={{ fontSize: 11, marginTop: 4, color: isDark ? '#fff' : '#444', fontWeight: '500' }}>
                                                    {isMe ? 'Your note' : item.name?.split(' ')[0] || 'User'}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    }}
                                />
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, marginTop: 24, marginBottom: 8 }}>
                                    <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>Messages</Text>
                                </View>
                            </View>
                        ) : null
                    }
                    ListEmptyComponent={
                        <View style={{ alignItems: 'center', marginTop: 50, padding: 20 }}>
                            <Ionicons name="chatbubbles-outline" size={40} color={colors.text} style={{ opacity: 0.5, marginBottom: 10 }} />
                            <Text style={{ color: colors.textSecondary, fontSize: 16 }}>No chats found.</Text>
                        </View>
                    }
                    renderItem={({ item }) => {
                        const other = item.participants.find((p: any) => p._id !== user._id) || item.participants[0];
                        
                        const chatName = item.isGroup ? item.groupName : (other?.name || 'Vibe User');
                        const chatAvatar = item.isGroup ? item.groupAvatar : other?.avatar;

                        return (
                            <ChatItem
                                avatar={chatAvatar}
                                name={chatName}
                                lastMessage={
                                    item.lastMessageType === 'audio'
                                        ? (item.lastMessageSender === user._id ? 'You: Sent a voice message' : 'Sent a voice message')
                                        : (item.lastMessageSender === user._id ? `You: ${item.lastMessage}` : (item.lastMessage || 'Sent an attachment'))
                                }
                                time={formatTime(item.updatedAt)}
                                unread={item.unreadCount || 0}
                                online={!item.isGroup && other?.isOnline}
                                onPress={() => {
                                    if (item.isGroup) {
                                        router.push({ pathname: `/message/${item._id}`, params: { isGroup: 'true' } } as any);
                                    } else {
                                        router.push(`/message/${other?._id}`);
                                    }
                                }}
                                isDark={isDark}
                            />
                        );
                    }}
                />
            )}

            <NewChatModal visible={showNewChat} onClose={() => setShowNewChat(false)} />
            
            <CreateGroupModal 
                visible={showGroupModal} 
                onClose={() => setShowGroupModal(false)}
                onSuccess={(newChat: any) => {
                    setChats(prev => [newChat, ...prev]);
                    router.push({ pathname: `/message/${newChat._id}`, params: { isGroup: 'true' } } as any);
                }}
            />

            <NoteViewer
                visible={!!selectedNote}
                note={selectedNote}
                onClose={() => setSelectedNote(null)}
                onReply={(text) => {
                    if (selectedNote) {
                        const userId = typeof selectedNote.user === 'object' ? selectedNote.user._id : selectedNote.user;
                        setSelectedNote(null);
                        // Redirect to chat with the pre-filled message (passing as param for now, the message screen should handle it)
                        router.push({
                            pathname: `/message/${userId}`,
                            params: { initialMessage: text }
                        } as any);
                    }
                }}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 12,
        marginBottom: 8,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: '900',
        letterSpacing: -1,
    },
    searchContainer: {
        paddingHorizontal: 20,
        marginBottom: 16,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 48,
        borderRadius: 24,
        paddingHorizontal: 16,
        gap: 12,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
    },
    searchInput: {
        flex: 1,
        fontSize: 15,
        height: '100%',
        fontWeight: '500',
    },
    filterBar: {
        marginBottom: 16,
    },
    filterPill: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        marginVertical: 4,
    },
    filterText: {
        fontSize: 14,
        fontWeight: '700',
    },
    plusBadge: {
        position: 'absolute', bottom: 0, right: 0, width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', borderWidth: 3,
    },
    plusInner: {
        width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
    },
    onlineBadge: {
        position: 'absolute', bottom: 2, right: 2, width: 14, height: 14, borderRadius: 7, backgroundColor: '#10B981', borderWidth: 2,
    }
});

