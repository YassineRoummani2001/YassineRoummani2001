import ChatItem from '@/components/ChatItem';
import CreateGroupModal from '@/components/CreateGroupModal';
import NewChatModal from '@/components/NewChatModal';
import ConfirmModal from '@/components/ConfirmModal';
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
    Modal,
    Platform,
    Pressable,
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

// Helper to normalize URIs
const getCorrectUrl = (uri?: string | null) => {
    if (!uri || typeof uri !== 'string' || uri.trim() === '') return undefined;
    const clean = uri.trim();
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

const UserNoteBubble = ({ note, isDark }: { note: any, isDark: boolean }) => {
    if (!note) return null;
    return (
        <View style={{
            position: 'absolute',
            bottom: 65,
            alignSelf: 'center',
            zIndex: 100,
            alignItems: 'center',
        }}>
            {/* Main Bubble */}
            <View style={{
                backgroundColor: isDark ? '#262626' : '#FFFFFF',
                borderRadius: 20,
                paddingHorizontal: 16,
                paddingVertical: 10,
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: 80,
                maxWidth: 120,
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
                        <Text numberOfLines={1} style={{ fontSize: 12, color: isDark ? '#FFF' : '#000', fontWeight: '600' }}>
                            {note.music.track}
                        </Text>
                    </View>
                ) : (
                    <Text numberOfLines={2} style={{ fontSize: 13, color: isDark ? '#FFF' : '#000', textAlign: 'center', fontWeight: '600' }}>
                        {note.content}
                    </Text>
                )}
            </View>

            {/* Thought Bubble Dots - positioned to the left side like original Instagram notes */}
            <View style={{
                position: 'absolute',
                bottom: -8,
                left: 18,
                width: 14,
                height: 14,
                borderRadius: 7,
                backgroundColor: isDark ? '#262626' : '#FFFFFF',
                borderWidth: 1,
                borderColor: isDark ? '#333' : '#EEE',
                zIndex: -1,
            }} />
            <View style={{
                position: 'absolute',
                bottom: -16,
                left: 14,
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: isDark ? '#262626' : '#FFFFFF',
                borderWidth: 1,
                borderColor: isDark ? '#333' : '#EEE',
                zIndex: -2,
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
    const [activeFilter, setActiveFilter] = useState<'all' | 'unread' | 'groups' | 'marketplace' | 'favorites'>('all');
    const [counts, setCounts] = useState<any>({ all: 0, unread: 0, groups: 0, marketplace: 0, favorites: 0 });
    const [showGroupModal, setShowGroupModal] = useState(false);
    const [selectedChatForDelete, setSelectedChatForDelete] = useState<any>(null);
    const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
    const [isAccountsSheetVisible, setIsAccountsSheetVisible] = useState(false);

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
                const sortedChats = (data.chats || []).sort((a: any, b: any) => {
                    if (a.isPinned && !b.isPinned) return -1;
                    if (!a.isPinned && b.isPinned) return 1;
                    const dateA = a.lastMessage?.createdAt ? new Date(a.lastMessage.createdAt).getTime() : 0;
                    const dateB = b.lastMessage?.createdAt ? new Date(b.lastMessage.createdAt).getTime() : 0;
                    return dateB - dateA;
                });
                setChats(sortedChats);
                setCounts(data.counts || { all: 0, unread: 0, groups: 0, marketplace: 0, favorites: 0 });
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
        const handleNoteUpdate = (updatedNote: any) => {
            setNotes(prev => prev.map(n => n._id === updatedNote._id ? updatedNote : n));
            if (selectedNote?._id === updatedNote._id) setSelectedNote(updatedNote);
        };

        socket.on('user:status', handleStatus);
        socket.on('message:new', handleNewMessage);
        socket.on('note:update', handleNoteUpdate);
        return () => {
            socket.off('user:status', handleStatus);
            socket.off('message:new', handleNewMessage);
            socket.off('note:update', handleNoteUpdate);
        };
    }, [socket, fetchData, selectedNote?._id]);

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
        if (activeFilter === 'favorites') return c.favoritedBy && c.favoritedBy.includes(user?._id);
        
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

    const handleDeleteChat = async () => {
        if (!selectedChatForDelete || !user?.token || !user?._id) return;
        
        const chatIdToRemove = selectedChatForDelete._id;
        const previousChats = [...chats];

        // 1. Optimistic Update (Immediate disappearance)
        setChats(prev => prev.filter(c => c._id !== chatIdToRemove));
        setIsDeleteModalVisible(false);
        setSelectedChatForDelete(null);

        try {
            const res = await ApiClient.delete(`/api/chats/${chatIdToRemove}`, {
                'Authorization': `Bearer ${user.token}`
            });
            
            if (!res.success) {
                // Restore if failed
                setChats(previousChats);
            }
        } catch (error) {
            console.error('Delete chat error:', error);
            // Restore on error
            setChats(previousChats);
        }
    };

    const filters = [
        { id: 'all', label: 'All', count: counts.all },
        { id: 'unread', label: 'Unread', count: counts.unread },
        { id: 'favorites', label: 'Favorites', count: counts.favorites },
        { id: 'groups', label: 'Groups', count: counts.groups },
        { id: 'marketplace', label: 'Marketplace', count: counts.marketplace }
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
                    <TouchableOpacity 
                        onPress={() => setIsAccountsSheetVisible(true)}
                        activeOpacity={0.7}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginLeft: (!isDesktop && router.canGoBack()) ? 0 : 16 }}
                    >
                        {user?.isPrivate && (
                            <Ionicons name="lock-closed" size={18} color={colors.text} style={{ marginTop: 2 }} />
                        )}
                        <Text style={[styles.headerTitle, { color: colors.text }]}>
                            {user?.name || 'Messages'}
                        </Text>
                        <Ionicons name="chevron-down" size={16} color={colors.text} style={{ marginTop: 4 }} />
                    </TouchableOpacity>
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
                                {f.label} {f.id !== 'all' && f.count > 0 && <Text style={{ fontSize: 10, opacity: 0.7 }}>({f.count})</Text>}
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
                                            <View style={{ alignItems: 'center', width: 72 }}>
                                                <TouchableOpacity
                                                    onPress={() => {
                                                        if (note) setSelectedNote(note);
                                                        else if (!isMe) router.push(`/message/${item._id}`);
                                                    }}
                                                    activeOpacity={0.85}
                                                    style={{ position: 'relative', marginBottom: 6 }}
                                                >
                                                    <UserNoteBubble note={note} isDark={isDark} />
                                                    <Image
                                                        source={{
                                                            uri: getCorrectUrl(item.avatar) || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.name || 'User')}&background=random`,
                                                        }}
                                                        style={{
                                                            width: 72, height: 72, borderRadius: 36,
                                                            borderWidth: note ? 2.5 : 0,
                                                            borderColor: note ? (isDark ? '#444' : '#555') : 'transparent',
                                                        }}
                                                    />
                                                    {isMe && !note && (
                                                        <TouchableOpacity 
                                                            onPress={(e) => {
                                                                e.stopPropagation();
                                                                router.push('/notes/create');
                                                            }}
                                                            style={styles.plusBadge}
                                                        >
                                                            <View style={styles.plusInner}>
                                                                <Ionicons name="add" size={14} color={colors.text} />
                                                            </View>
                                                        </TouchableOpacity>
                                                    )}
                                                    {isMe && note && (
                                                        <TouchableOpacity 
                                                            onPress={(e) => {
                                                                e.stopPropagation();
                                                                router.push('/notes/create');
                                                            }}
                                                            style={styles.plusBadge}
                                                        >
                                                            <View style={styles.plusInner}>
                                                                <Ionicons name="add" size={14} color={colors.text} />
                                                            </View>
                                                        </TouchableOpacity>
                                                    )}
                                                    {!isMe && item.isOnline && <View style={[styles.onlineBadge, { borderColor: colors.background }]} />}
                                                </TouchableOpacity>
                                                <Text numberOfLines={1} style={{ fontSize: 11, marginTop: 4, color: isDark ? '#fff' : '#444', fontWeight: '500' }}>
                                                    {isMe ? 'Your note' : item.name?.split(' ')[0] || 'User'}
                                                </Text>
                                            </View>
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
                        const other = item.participants.find((p: any) => p._id.toString() !== user?._id?.toString()) || item.participants[0];
                        
                        const chatName = item.isGroup ? item.groupName : (other?.name || 'Vibe User');
                        const chatAvatar = getCorrectUrl(item.isGroup ? item.groupAvatar : other?.avatar);

                        return (
                            <ChatItem
                                avatar={chatAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(chatName)}&background=random`}
                                name={chatName}
                                lastMessage={
                                    item.lastMessageType === 'audio'
                                        ? (item.lastMessageSender === user._id ? 'You: Sent a voice message' : 'Sent a voice message')
                                        : (item.lastMessageSender === user._id ? `You: ${item.lastMessage}` : (item.lastMessage || 'Sent an attachment'))
                                }
                                time={formatTime(item.updatedAt)}
                                unread={item.unreadCount || 0}
                                online={!item.isGroup && other?.isOnline}
                                hasStory={item.hasStory}
                                storyViewed={item.storyViewed}
                                onPress={() => {
                                    if (item.isGroup) {
                                        router.push({ pathname: `/message/${item._id}`, params: { isGroup: 'true' } } as any);
                                    } else {
                                        router.push({ 
                                            pathname: `/message/${other?._id}`, 
                                            params: { chatId: item._id } 
                                        } as any);
                                    }
                                }}
                                onLongPress={() => {
                                    setSelectedChatForDelete(item);
                                    setIsDeleteModalVisible(true);
                                }}
                                onStoryPress={item.hasStory && !item.isGroup && other ? () => {
                                    router.push({
                                        pathname: '/story-view',
                                        params: { 
                                            userId: other._id,
                                            userStr: JSON.stringify({ _id: other._id, name: other.name, avatar: other.avatar })
                                        }
                                    } as any);
                                } : undefined}
                                isPinned={item.isPinned}
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
                currentUser={user}
                onClose={() => setSelectedNote(null)}
                onReply={async (text) => {
                    if (selectedNote) {
                        const targetUser = typeof selectedNote.user === 'object' ? selectedNote.user : { _id: selectedNote.user };
                        const userId = targetUser._id;
                        
                        try {
                            // 1. Create or get chat
                            const chatRes = await fetch(`${API_BASE_URL}/api/chats`, {
                                method: 'POST',
                                headers: { 
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${user.token}` 
                                },
                                body: JSON.stringify({ userId })
                            });
                            
                            if (chatRes.ok) {
                                const chatData = await chatRes.json();
                                // 2. Send message
                                const formData = new FormData();
                                formData.append('content', text);
                                formData.append('type', 'text');
                                
                                // Include note details
                                const noteInfo: any = {};
                                if (selectedNote.content) noteInfo.content = selectedNote.content;
                                if (selectedNote.music) noteInfo.music = selectedNote.music;
                                
                                if (Object.keys(noteInfo).length > 0) {
                                    formData.append('noteRepliedTo', JSON.stringify(noteInfo));
                                }

                                await fetch(`${API_BASE_URL}/api/chats/${chatData._id}/messages`, {
                                    method: 'POST',
                                    headers: { 'Authorization': `Bearer ${user.token}` },
                                    body: formData
                                });

                                setSelectedNote(null);
                                router.push(`/message/${userId}`);
                            }
                        } catch (error) {
                            console.error('Error replying to note:', error);
                        }
                    }
                }}
                onLike={async () => {
                    if (selectedNote) {
                        try {
                            const res = await ApiClient.post<any>(`/api/notes/${selectedNote._id}/like`, {}, {
                                'Authorization': `Bearer ${user.token}`
                            });
                            if (res.success) {
                                // Fetch all notes and update the selected one
                                const notesRes = await ApiClient.get<any>('/api/notes', { 'Authorization': `Bearer ${user.token}` });
                                if (notesRes.success && notesRes.data) {
                                    setNotes(notesRes.data);
                                    const updated = notesRes.data.find((n: any) => n._id === selectedNote._id);
                                    if (updated) setSelectedNote(updated);
                                }
                            }
                        } catch (error) {
                            console.error('Error liking note:', error);
                        }
                    }
                }}
            />

            <ConfirmModal
                visible={isDeleteModalVisible}
                title="Delete Chat?"
                message={`Are you sure you want to delete this chat? This action cannot be undone.`}
                confirmText="Delete"
                isDestructive={true}
                onConfirm={handleDeleteChat}
                onCancel={() => {
                    setIsDeleteModalVisible(false);
                    setSelectedChatForDelete(null);
                }}
            />

            {/* Accounts Bottom Sheet */}
            <Modal
                visible={isAccountsSheetVisible}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setIsAccountsSheetVisible(false)}
            >
                <Pressable 
                    style={sheetStyles.overlay} 
                    onPress={() => setIsAccountsSheetVisible(false)}
                >
                    <View style={[sheetStyles.sheet, { backgroundColor: isDark ? '#262626' : '#FFF' }]}>
                        <View style={[sheetStyles.handle, { backgroundColor: isDark ? '#444' : '#DDD' }]} />
                        
                        <ScrollView bounces={false}>
                            {/* Current Account */}
                            <TouchableOpacity style={sheetStyles.accountItem} activeOpacity={0.7}>
                                <View style={sheetStyles.avatarContainer}>
                                    <Image 
                                        source={{ uri: getCorrectUrl(user?.avatar) || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || user?.username || 'U')}&background=random` }} 
                                        style={sheetStyles.avatar} 
                                    />
                                </View>
                                <Text style={[sheetStyles.accountName, { color: colors.text }]}>
                                    {user?.handle || user?.username}
                                </Text>
                                <View style={[sheetStyles.checkContainer, { backgroundColor: '#0095F6' }]}>
                                    <Ionicons name="checkmark" size={14} color="#FFF" />
                                </View>
                            </TouchableOpacity>

                            {/* signup Account */}
                            <TouchableOpacity 
                                style={sheetStyles.accountItem} 
                                activeOpacity={0.7} 
                                onPress={() => {
                                    setIsAccountsSheetVisible(false);
                                    // Slight delay to ensure modal close animation finishes before navigation
                                    setTimeout(() => {
                                        router.push('/auth/signup' as any);
                                    }, 100);
                                }}
                            >
                                <View style={[sheetStyles.avatarContainer, sheetStyles.addIconContainer, { borderColor: isDark ? '#444' : '#DDD' }]}>
                                    <Ionicons name="person-add-outline" size={24} color={colors.text} />
                                </View>
                                <Text style={[sheetStyles.accountName, { color: colors.text }]}>
                                    Sign up
                                </Text>
                            </TouchableOpacity>

                            {/* Logout Account */}
                            <TouchableOpacity 
                                style={sheetStyles.accountItem} 
                                activeOpacity={0.7} 
                                onPress={() => {
                                    setIsAccountsSheetVisible(false);
                                    // Handle logout (assuming AuthContext has logout)
                                    // router.replace('/auth/login');
                                }}
                            >
                                <View style={[sheetStyles.avatarContainer, sheetStyles.logoutIconContainer, { borderColor: isDark ? '#444' : '#DDD' }]}>
                                    <Ionicons name="log-out-outline" size={24} color="#FF3B30" />
                                </View>
                                <Text style={[sheetStyles.accountName, { color: '#FF3B30' }]}>
                                    Log out
                                </Text>
                            </TouchableOpacity>

                            <View style={[sheetStyles.divider, { backgroundColor: isDark ? '#333' : '#EEE', marginVertical: 8 }]} />

                            {/* Accounts Center Button */}
                            <TouchableOpacity style={[sheetStyles.footerButton, { borderColor: isDark ? '#444' : '#E0E0E0' }]}>
                                <Text style={[sheetStyles.footerButtonText, { color: colors.text }]}>
                                    Go to Accounts Center
                                </Text>
                            </TouchableOpacity>

                            <View style={sheetStyles.metaFooter}>
                                <View style={[sheetStyles.logoCircle, { backgroundColor: '#0095F6' }]}>
                                    <Ionicons name="flash" size={12} color="#FFF" />
                                </View>
                                <Text style={[sheetStyles.metaText, { color: colors.text }]}>Vibe</Text>
                            </View>
                        </ScrollView>
                    </View>
                </Pressable>
            </Modal>
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
        fontSize: 20,
        fontWeight: '700',
        letterSpacing: -0.5,
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
        position: 'absolute', 
        bottom: 0, 
        right: 0, 
        width: 28, 
        height: 28, 
        borderRadius: 14, 
        alignItems: 'center', 
        justifyContent: 'center', 
        borderWidth: 3,
        zIndex: 10,
    },
    plusInner: {
        width: 22, 
        height: 22, 
        borderRadius: 11, 
        alignItems: 'center', 
        justifyContent: 'center',
        backgroundColor: '#007AFF', // Standard Blue for "Add"
    },
    onlineBadge: {
        position: 'absolute', bottom: 2, right: 2, width: 14, height: 14, borderRadius: 7, backgroundColor: '#10B981', borderWidth: 2,
    }
});

const sheetStyles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
        alignItems: 'center',
    },
    sheet: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingBottom: 40,
        maxHeight: '70%',
        width: '100%',
        ...(Platform.OS === 'web' && {
            width: 500,
            maxWidth: '100%',
        })
    },
    handle: {
        width: 40,
        height: 4,
        borderRadius: 2,
        alignSelf: 'center',
        marginTop: 12,
        marginBottom: 20,
    },
    accountItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 12,
        gap: 16,
    },
    avatarContainer: {
        position: 'relative',
    },
    avatar: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#CCC',
    },
    addIconContainer: {
        width: 56,
        height: 56,
        borderRadius: 28,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    logoutIconContainer: {
        width: 56,
        height: 56,
        borderRadius: 28,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255, 59, 48, 0.05)',
    },
    accountName: {
        fontSize: 16,
        fontWeight: '600',
        flex: 1,
    },
    checkContainer: {
        width: 24,
        height: 24,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    divider: {
        height: 1,
        marginVertical: 16,
    },
    sectionHeader: {
        paddingHorizontal: 20,
        marginBottom: 8,
    },
    sectionHeaderText: {
        fontSize: 14,
        fontWeight: '600',
    },
    fbBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: '#1877F2',
        width: 20,
        height: 20,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: '#FFF',
    },
    notificationDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#FF3B30',
    },
    footerButton: {
        marginHorizontal: 20,
        marginTop: 24,
        height: 48,
        borderRadius: 8,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    footerButtonText: {
        fontSize: 15,
        fontWeight: '700',
    },
    metaFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 24,
        gap: 6,
        opacity: 0.8,
    },
    logoCircle: {
        width: 20,
        height: 20,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    metaText: {
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: 0.5,
    }
});

