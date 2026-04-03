import ChatItem from '@/components/ChatItem';
import NewChatModal from '@/components/NewChatModal';
import NoteViewer from '@/components/NoteViewer';
import { SkeletonRow } from '@/components/Skeletons';
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
            bottom: 85,
            alignSelf: 'center',
            backgroundColor: isDark ? 'rgba(50,50,50,0.98)' : 'rgba(40,40,40,0.95)',
            borderRadius: 18,
            paddingHorizontal: 14,
            paddingVertical: 10,
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: 85,
            maxWidth: 110,
            zIndex: 999,
            elevation: 999,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 3 },
            shadowOpacity: 0.3,
            shadowRadius: 5
        }}>
            <Text numberOfLines={2} style={{ fontSize: 12, color: '#FFFFFF', textAlign: 'center', lineHeight: 16, fontWeight: '500' }}>
                {note.content}
            </Text>

            {note.music && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.2)' }}>
                    <Ionicons name="musical-notes" size={10} color="#FFF" />
                    <Text numberOfLines={1} style={{ fontSize: 9, color: '#FFF', opacity: 0.8 }}>
                        {note.music.track}
                    </Text>
                </View>
            )}

            <View style={{
                position: 'absolute',
                bottom: -6,
                width: 12,
                height: 12,
                backgroundColor: isDark ? 'rgba(50,50,50,0.98)' : 'rgba(40,40,40,0.95)',
                transform: [{ rotate: '45deg' }],
                zIndex: -1,
                borderRadius: 2
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

    // Fetch Data
    const fetchData = useCallback(async () => {
        if (!user?._id) return;
        try {
            const [chatRes, followRes, notesRes] = await Promise.all([
                fetch(`${API_BASE_URL}/api/chats`, { headers: { 'Authorization': `Bearer ${user.token}` } }),
                fetch(`${API_BASE_URL}/api/auth/following/${user._id}`),
                ApiClient.get<any>('/api/notes', { 'Authorization': `Bearer ${user.token}` })
            ]);

            if (chatRes.ok) setChats(await chatRes.json());
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

                {!isDesktop && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                        <TouchableOpacity>
                            <Ionicons name="create-outline" size={24} color={colors.text} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setShowNewChat(true)}>
                            <Ionicons name="add" size={28} color={colors.text} />
                        </TouchableOpacity>
                    </View>
                )}
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
                            <View style={{ marginBottom: 16, paddingTop: 40, overflow: 'visible', zIndex: 10, elevation: 10 }}>
                                <FlatList
                                    horizontal
                                    data={[{ _id: 'me', name: 'Your Note', avatar: user?.avatar }, ...followingUsers]}
                                    contentContainerStyle={{ paddingHorizontal: 16, gap: 16, paddingTop: 30, paddingBottom: 10 }} // Added padding for bubbles
                                    showsHorizontalScrollIndicator={false}
                                    style={{ overflow: 'visible' }} // Allow bubbles to overflow
                                    removeClippedSubviews={false} // Prevent clipping on Android
                                    renderItem={({ item }) => {
                                        const isMe = item._id === 'me';

                                        // Match note to user
                                        const note = notes.find(n => {
                                            const nUserId = typeof n.user === 'object' ? n.user._id : n.user;
                                            return isMe ? (nUserId === user?._id) : (nUserId === item._id);
                                        });

                                        return (
                                            <TouchableOpacity
                                                onPress={() => {
                                                    if (isMe) {
                                                        router.push('/notes/create');
                                                    } else if (note) {
                                                        setSelectedNote(note);
                                                    } else {
                                                        router.push(`/message/${item._id}`);
                                                    }
                                                }}
                                                style={{ alignItems: 'center', width: 72 }}
                                                activeOpacity={0.85}
                                            >
                                                <View style={{ position: 'relative', marginBottom: 6 }}>
                                                    {/* NOTE */}
                                                    <UserNoteBubble note={note} isDark={isDark} />

                                                    {/* AVATAR */}
                                                    <Image
                                                        source={{
                                                            uri: item.avatar ||
                                                                `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                                                    item.name || 'User'
                                                                )}&background=random`,
                                                        }}
                                                        style={{
                                                            width: 72,
                                                            height: 72,
                                                            borderRadius: 36,
                                                            borderWidth: note ? 2.5 : 0,
                                                            borderColor: note ? (isDark ? '#444' : '#555') : 'transparent',
                                                        }}
                                                    />

                                                    {/* PLUS / ONLINE */}
                                                    {isMe ? (
                                                        <View style={styles.plusBadge}>
                                                            <View style={styles.plusInner}>
                                                                <Ionicons name="add" size={14} color={colors.text} />
                                                            </View>
                                                        </View>
                                                    ) : (
                                                        item.isOnline && (
                                                            <View
                                                                style={[
                                                                    styles.onlineBadge,
                                                                    { borderColor: colors.background },
                                                                ]}
                                                            />
                                                        )
                                                    )}
                                                </View>

                                                <Text
                                                    numberOfLines={1}
                                                    style={{
                                                        fontSize: 12,
                                                        marginTop: 4,
                                                        color: isDark ? '#fff' : '#000',
                                                        opacity: 0.75,
                                                    }}
                                                >
                                                    {isMe ? 'Your Note' : item.name?.split(' ')[0] || 'User'}
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
                            <Ionicons name="create-outline" size={40} color={colors.text} style={{ opacity: 0.5, marginBottom: 10 }} />
                            <Text style={{ color: colors.textSecondary, fontSize: 16 }}>No chats found.</Text>
                        </View>
                    }
                    renderItem={({ item }) => {
                        const other = item.participants.find((p: any) => p._id !== user._id) || item.participants[0];
                        if (!other) return null;

                        // Find note for this user
                        const userNote = notes.find(n => {
                            const nUserId = typeof n.user === 'object' ? n.user._id : n.user;
                            return nUserId === other._id;
                        });

                        // Calculate expiry (24 hours from creation)
                        const noteData = userNote ? {
                            text: userNote.content,
                            expiresAt: new Date(new Date(userNote.createdAt).getTime() + 24 * 60 * 60 * 1000).toISOString()
                        } : null;

                        if (noteData) {
                            // console.log(`💬 Note for ${other.name}:`, noteData);
                        }

                        return (
                            <ChatItem
                                avatar={other.avatar}
                                name={other.name}
                                lastMessage={
                                    item.lastMessageType === 'audio'
                                        ? (item.lastMessageSender === user._id ? 'You: Sent a voice message' : 'Sent a voice message')
                                        : (item.lastMessageSender === user._id ? `You: ${item.lastMessage}` : (item.lastMessage || 'Sent an attachment'))
                                }
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

            <NoteViewer
                visible={!!selectedNote}
                note={selectedNote}
                onClose={() => setSelectedNote(null)}
                onReply={() => {
                    if (selectedNote) {
                        const userId = typeof selectedNote.user === 'object' ? selectedNote.user._id : selectedNote.user;
                        setSelectedNote(null);
                        router.push(`/message/${userId}`);
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
        marginBottom: 20,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 52,
        borderRadius: 30,
        paddingHorizontal: 16,
        gap: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.04,
        shadowRadius: 12,
        elevation: 3,
        borderWidth: 1,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        height: '100%',
        fontWeight: '600',
    },
    plusBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 26,
        height: 26,
        borderRadius: 13,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 3,
    },
    plusInner: {
        width: 20,
        height: 20,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    onlineBadge: {
        position: 'absolute',
        bottom: 2,
        right: 2,
        width: 14,
        height: 14,
        borderRadius: 7,
        backgroundColor: '#10B981',
        borderWidth: 2,
    }
});

