import { API_BASE_URL } from '@/constants/Config';
import { useMessages } from '@/context/MessagesContext';
import { useThemeContext } from '@/context/ThemeContext';
import { useUser } from '@/context/UserContext';
import { ApiClient } from '@/utils/api';
import { Image as ExpoImage } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Image as ImageIcon, Mic, Phone, Send, Video } from 'lucide-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    Alert,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/* -------------------------------------------------------------------------- */
/*                                   Helpers                                  */
/* -------------------------------------------------------------------------- */

const getCorrectUrl = (url: string | undefined | null) => {
    if (!url || typeof url !== 'string') return null;
    let clean = url.trim();
    if (clean.startsWith('data:') || clean.startsWith('file:') || clean.startsWith('http')) return clean;
    return `${API_BASE_URL}/uploads/${clean.replace(/\\/g, '/')}`;
};

const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const AvatarImage = ({ uri, name, size = 32 }: { uri?: string, name?: string, size?: number }) => {
    const validUri = getCorrectUrl(uri);
    const initials = name?.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() || '?';

    return (
        <View style={{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden', backgroundColor: '#E0E0E0', justifyContent: 'center', alignItems: 'center' }}>
            {validUri ? (
                <ExpoImage
                    source={{ uri: validUri }}
                    style={{ width: '100%', height: '100%' }}
                    contentFit="cover"
                    transition={200}
                />
            ) : (
                <Text style={{ fontSize: size * 0.4, fontWeight: '700', color: '#666' }}>{initials}</Text>
            )}
        </View>
    );
};

/* -------------------------------------------------------------------------- */
/*                                Message Screen                              */
/* -------------------------------------------------------------------------- */

export default function MessageScreen() {
    const { id, name: paramName, avatar: paramAvatar } = useLocalSearchParams();
    const router = useRouter();
    const { user } = useUser() as any;
    const { colors, isDark } = useThemeContext();
    const { markChatAsRead, socket } = useMessages();
    const insets = useSafeAreaInsets();

    // State
    const [messages, setMessages] = useState<any[]>([]);
    const [inputText, setInputText] = useState('');
    const [recipient, setRecipient] = useState<any>(
        paramName ? { name: paramName, avatar: paramAvatar, _id: id } : null
    );
    const [chatId, setChatId] = useState<string | null>(null);
    const [isTyping, setIsTyping] = useState(false);

    // Refs
    const flatListRef = useRef<FlatList>(null);
    const typingTimeout = useRef<any>(null);

    // 1. Fetch Chat Info & Recipient
    useFocusEffect(
        useCallback(() => {
            if (!user?._id || !id) return;

            const init = async () => {
                try {
                    // Get Recipient Profile (Refresh)
                    const uRes = await ApiClient.get<any>(`/api/auth/user/${id}`, { 'Authorization': `Bearer ${user.token}` });
                    if (uRes.success) setRecipient(uRes.data);

                    // Get or Create Chat
                    const cRes = await ApiClient.post<any>('/api/chats', { userId: id }, { 'Authorization': `Bearer ${user.token}` });
                    if (cRes.success && cRes.data) {
                        setChatId(cRes.data._id);
                        // Load History
                        const mRes = await ApiClient.get<any[]>(`/api/chats/${cRes.data._id}/messages`, { 'Authorization': `Bearer ${user.token}` });
                        if (mRes.success) setMessages(mRes.data);
                    }
                } catch (e) {
                    console.error("Chat Init Error:", e);
                }
            };
            init();
        }, [user, id])
    );

    // 2. Socket Listeners
    useEffect(() => {
        if (!socket || !chatId) return;

        socket.emit('chat:join', chatId);

        const onMsg = (newMsg: any) => {
            if (newMsg.chatId === chatId || newMsg.chat === chatId) {
                setMessages(prev => {
                    if (prev.find(m => m._id === newMsg._id)) return prev;
                    return [...prev, newMsg];
                });
                markChatAsRead(chatId);
            }
        };

        const onTyping = (data: any) => setIsTyping(data.isTyping);

        socket.on('message:new', onMsg);
        socket.on('typing:user', onTyping);

        return () => {
            socket.off('message:new', onMsg);
            socket.off('typing:user', onTyping);
        };
    }, [socket, chatId]);

    // 3. Typing Indicator
    useEffect(() => {
        if (!socket || !chatId) return;
        if (inputText.length > 0) {
            socket.emit('typing:start', { chatId, userName: user?.username });
            clearTimeout(typingTimeout.current);
            typingTimeout.current = setTimeout(() => socket.emit('typing:stop', { chatId }), 2000);
        } else {
            socket.emit('typing:stop', { chatId });
        }
    }, [inputText]);

    // 4. Send Message
    const handleSend = async (content = inputText, type = 'text') => {
        if (!content.trim() && type === 'text') return;
        if (type === 'text') setInputText('');

        try {
            const res = await ApiClient.post(`/api/chats/${chatId}/messages`, { content, type }, { 'Authorization': `Bearer ${user.token}` });
            if (res.success) {
                const msg = res.data;
                setMessages(p => [...p, msg]);
                socket?.emit('message:send', { chatId, message: msg });
            }
        } catch (e) {
            Alert.alert("Error", "Could not send message");
        }
    };

    const pickImage = async () => {
        const res = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.5,
            base64: true
        });
        if (!res.canceled && res.assets[0].base64) {
            // Send as base64 data URI
            handleSend(`data:image/jpeg;base64,${res.assets[0].base64}`, 'image');
        }
    };

    // Render Items
    const renderMessageItem = ({ item }: { item: any }) => {
        const isMe = item.sender === user?._id || (typeof item.sender === 'object' && item.sender._id === user?._id);

        // --- Shared Post / Product / Marketplace Item ---
        // Adjust this check based on your actual data structure (e.g., marketitemId or post object)
        const isSharedContent = item.marketitemId || item.postId;

        if (isSharedContent) {
            return (
                <View style={{ alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '75%', marginVertical: 6 }}>
                    <View style={{
                        backgroundColor: isDark ? '#262626' : '#F2F2F2',
                        borderRadius: 16,
                        overflow: 'hidden',
                        borderWidth: 1,
                        borderColor: isDark ? '#333' : '#EEE'
                    }}>
                        {/* If there's an image associated with the product/post */}
                        {(item.image || item.productImage) && (
                            <ExpoImage
                                source={{ uri: getCorrectUrl(item.image || item.productImage) }}
                                style={{ width: 220, height: 220 }}
                                contentFit="cover"
                            />
                        )}
                        <View style={{ padding: 12 }}>
                            <Text numberOfLines={2} style={{ fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 4 }}>
                                {item.title || item.productName || 'Shared Post'}
                            </Text>
                            <Text numberOfLines={1} style={{ fontSize: 12, color: colors.textSecondary }}>
                                {item.description || 'Check this out'}
                            </Text>

                            {/* View Button */}
                            <TouchableOpacity style={{ marginTop: 10, backgroundColor: isDark ? '#000' : '#FFF', paddingVertical: 6, borderRadius: 8, alignItems: 'center' }}>
                                <Text style={{ fontSize: 12, fontWeight: '600', color: colors.primary }}>View Details</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                    <Text style={{ fontSize: 10, marginTop: 4, marginHorizontal: 4, color: colors.textSecondary, alignSelf: 'flex-end' }}>
                        {formatTime(item.createdAt)}
                    </Text>
                </View>
            );
        }

        // --- Standard Image Message ---
        if (item.type === 'image') {
            return (
                <View style={{ alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '75%', marginVertical: 2 }}>
                    <View style={{
                        borderRadius: 18,
                        overflow: 'hidden',
                        backgroundColor: isDark ? '#262626' : '#F2F2F2', // No gradient storage for images
                    }}>
                        <ExpoImage
                            source={{ uri: getCorrectUrl(item.content) }}
                            style={{ width: 220, height: 280, borderRadius: 18 }}
                            contentFit="cover"
                        />
                    </View>
                    <Text style={{ fontSize: 10, marginTop: 4, marginHorizontal: 4, color: colors.textSecondary, alignSelf: 'flex-end' }}>
                        {formatTime(item.createdAt)}
                    </Text>
                </View>
            );
        }

        // --- Standard Text Message ---
        return (
            <View style={{ alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '75%', marginVertical: 2 }}>
                <View style={{
                    borderRadius: 20,
                    overflow: 'hidden',
                    borderBottomRightRadius: isMe ? 4 : 20,
                    borderBottomLeftRadius: isMe ? 20 : 4,
                    backgroundColor: isMe ? '#8c52ff' : (isDark ? '#262626' : '#F2F2F2'),
                }}>
                    {isMe ? (
                        <LinearGradient
                            colors={['#8c52ff', '#00BF63']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={{ padding: 12 }}
                        >
                            <Text style={{ fontSize: 16, color: '#FFF' }}>{item.content}</Text>
                        </LinearGradient>
                    ) : (
                        <View style={{ padding: 12 }}>
                            <Text style={{ fontSize: 16, color: colors.text }}>{item.content}</Text>
                        </View>
                    )}
                </View>
                <Text style={{ fontSize: 10, marginTop: 4, marginHorizontal: 4, color: colors.textSecondary, alignSelf: 'flex-end' }}>
                    {formatTime(item.createdAt)}
                </Text>
            </View>
        );
    };

    const reversedMessages = [...messages].reverse();

    return (
        <View style={{ flex: 1, backgroundColor: isDark ? '#000' : '#FFF' }}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top, backgroundColor: isDark ? '#000' : '#FFF', borderBottomColor: isDark ? '#262626' : '#F2F2F2' }]}>
                <TouchableOpacity onPress={() => router.back()} style={{ padding: 8 }}>
                    <ArrowLeft size={24} color={colors.text} />
                </TouchableOpacity>

                {recipient ? (
                    <TouchableOpacity style={{ flex: 1, flexDirection: 'row', alignItems: 'center', marginLeft: 4 }} onPress={() => router.push(`/message/user-info/${id}`)}>
                        <AvatarImage uri={recipient.avatar} name={recipient.name} size={38} />
                        <View style={{ marginLeft: 12 }}>
                            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>
                                {recipient.name}
                            </Text>
                            <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                                {isTyping ? 'Typing...' : (recipient.username || 'View profile')}
                            </Text>
                        </View>
                    </TouchableOpacity>
                ) : (
                    // Stable Skeleton
                    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', marginLeft: 4 }}>
                        <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: isDark ? '#262626' : '#EEE' }} />
                        <View style={{ marginLeft: 12, gap: 6 }}>
                            <View style={{ width: 100, height: 16, borderRadius: 4, backgroundColor: isDark ? '#262626' : '#EEE' }} />
                            <View style={{ width: 60, height: 12, borderRadius: 4, backgroundColor: isDark ? '#262626' : '#EEE' }} />
                        </View>
                    </View>
                )}

                <View style={{ flexDirection: 'row', gap: 20, paddingRight: 12 }}>
                    <TouchableOpacity><Phone size={24} color={colors.text} /></TouchableOpacity>
                    <TouchableOpacity><Video size={26} color={colors.text} /></TouchableOpacity>
                </View>
            </View>

            {/* List */}
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
                <FlatList
                    ref={flatListRef}
                    data={reversedMessages}
                    inverted
                    keyExtractor={item => item._id}
                    contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 10 }}
                    renderItem={renderMessageItem}
                    ListEmptyComponent={
                        recipient && (
                            <View style={{ alignItems: 'center', paddingTop: 60, transform: [{ scaleY: -1 }] }}>
                                <AvatarImage uri={recipient.avatar} name={recipient.name} size={96} />
                                <Text style={{ fontSize: 20, fontWeight: '700', marginTop: 16, color: colors.text }}>{recipient.name}</Text>
                                <Text style={{ fontSize: 14, color: colors.textSecondary, marginTop: 4 }}>{recipient.username || 'Vibe User'}</Text>
                                <View style={{ marginTop: 24, paddingVertical: 8, paddingHorizontal: 16, backgroundColor: isDark ? '#262626' : '#F2F2F2', borderRadius: 20 }}>
                                    <Text style={{ fontSize: 14, color: colors.text }}>No messages yet</Text>
                                </View>
                            </View>
                        )
                    }
                />

                {/* Input */}
                <View style={[styles.inputContainer, {
                    paddingBottom: insets.bottom + 10,
                    backgroundColor: isDark ? '#000' : '#FFF',
                    borderTopColor: isDark ? '#262626' : '#F2F2F2',
                    borderTopWidth: 1
                }]}>
                    <TouchableOpacity onPress={pickImage} style={[styles.iconWrapper, { backgroundColor: isDark ? '#262626' : '#F3F4F6' }]}>
                        <ImageIcon size={20} color={colors.primary} />
                    </TouchableOpacity>

                    <View style={[styles.inputField, { backgroundColor: isDark ? '#262626' : '#F3F4F6' }]}>
                        <TextInput
                            value={inputText}
                            onChangeText={setInputText}
                            placeholder="Message..."
                            placeholderTextColor={isDark ? '#888' : '#9CA3AF'}
                            style={{ flex: 1, fontSize: 16, color: colors.text, maxHeight: 100 }}
                            multiline
                        />
                    </View>

                    {inputText.trim() ? (
                        <TouchableOpacity onPress={() => handleSend()} style={[styles.iconWrapper, { backgroundColor: colors.primary }]}>
                            <Send size={20} color="#FFF" />
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity style={[styles.iconWrapper, { backgroundColor: isDark ? '#262626' : '#F3F4F6' }]}>
                            <Mic size={20} color={colors.text} />
                        </TouchableOpacity>
                    )}
                </View>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row', alignItems: 'center', height: 60, paddingHorizontal: 10, borderBottomWidth: 1
    },
    inputContainer: {
        flexDirection: 'row', alignItems: 'flex-end', padding: 10,
    },
    inputField: {
        flex: 1, borderRadius: 24, paddingHorizontal: 16, paddingVertical: 10, marginHorizontal: 8, minHeight: 44, justifyContent: 'center'
    },
    iconWrapper: {
        width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 0
    }
});
