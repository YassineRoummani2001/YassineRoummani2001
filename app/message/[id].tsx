import { API_BASE_URL } from '@/constants/Config';
import { useMessages } from '@/context/MessagesContext';
import { useThemeContext } from '@/context/ThemeContext';
import { useUser } from '@/context/UserContext';
import { ApiClient } from '@/utils/api';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus, useAudioRecorder, RecordingPresets, requestRecordingPermissionsAsync, getRecordingPermissionsAsync } from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';
import { Image as ExpoImage } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    Dimensions,
    FlatList,
    Keyboard,
    KeyboardAvoidingView,
    Modal,
    Platform,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SkeletonMessages } from '@/components/Skeletons';

/* -------------------------------------------------------------------------- */
/*                                   Helpers                                  */
/* -------------------------------------------------------------------------- */

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

const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const formatDividerDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const day = date.toLocaleDateString([], { weekday: 'short' }).toUpperCase();
    const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    return `${day} ${time}`;
};

const AvatarImage = ({ uri, name, size = 32, hasStory, storyViewed }: { uri?: string, name?: string, size?: number, hasStory?: boolean, storyViewed?: boolean }) => {
    const validUri = getCorrectUrl(uri);
    const { colors } = useThemeContext();
    
    return (
        <View style={{ 
            width: size + 4, 
            height: size + 4, 
            borderRadius: (size + 4) / 2, 
            justifyContent: 'center', 
            alignItems: 'center',
            borderWidth: hasStory ? 2 : 0,
            borderColor: storyViewed ? '#888' : colors.primary,
            padding: hasStory ? 2 : 0
        }}>
            <View style={{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden', backgroundColor: '#E0E0E0', justifyContent: 'center', alignItems: 'center' }}>
                <ExpoImage
                    source={{ uri: validUri || `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'User')}&background=random` }}
                    style={{ width: '100%', height: '100%' }}
                    contentFit="cover"
                    transition={200}
                />
            </View>
            {hasStory && !storyViewed && (
                <View style={{
                    position: 'absolute',
                    bottom: -2,
                    right: -2,
                    width: 14,
                    height: 14,
                    borderRadius: 7,
                    backgroundColor: colors.primary,
                    borderWidth: 2,
                    borderColor: 'white',
                    justifyContent: 'center',
                    alignItems: 'center'
                }}>
                    <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: 'white' }} />
                </View>
            )}
        </View>
    );
};

/* -------------------------------------------------------------------------- */
/*                                Voice Component                             */
/* -------------------------------------------------------------------------- */

const WAVEFORM_BARS = [4, 6, 8, 14, 12, 8, 10, 16, 20, 14, 10, 8, 12, 18, 16, 10, 8, 6, 4, 10, 12, 16, 20, 18, 12, 10, 8, 6, 4];

const VoiceMessage = ({ uri, itemsDuration, isMe, colors }: { uri: string, itemsDuration?: number, isMe: boolean, colors: any }) => {
    // Attempt to use the hook, but wrap in a try-catch pattern if it causes constructor errors
    // Since useAudioPlayer is a hook, we can't try-catch it directly.
    // However, the error usually happens during the constructor call inside the hook.
    const player = useAudioPlayer(getCorrectUrl(uri) || '');
    const status = useAudioPlayerStatus(player);
    const progress = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (status.duration > 0) {
            const percent = status.currentTime / status.duration;
            Animated.timing(progress, {
                toValue: percent,
                duration: 500,
                useNativeDriver: false
            }).start();
        }
        
        if (status.didJustFinish) {
            progress.setValue(0);
            player.seekTo(0);
        }
    }, [status.currentTime, status.duration, status.didJustFinish]);

    const loadAndPlay = () => {
        if (status.playing) player.pause();
        else player.play();
    };

// Using the new hook


    const formatDuration = (millis: number) => {
        const totalSeconds = Math.floor(millis / 1000);
        const m = Math.floor(totalSeconds / 60);
        const s = totalSeconds % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    const activeColor = isMe ? '#FFF' : colors.primary;
    const inactiveColor = isMe ? 'rgba(255,255,255,0.4)' : (colors.background === '#000' ? '#444' : '#CCC');

    return (
        <View style={{
            borderRadius: 18,
            padding: 10,
            paddingRight: 16,
            minWidth: 200,
            backgroundColor: isMe ? colors.primary : (colors.background === '#000' ? '#262626' : '#F2F2F2'),
            borderBottomRightRadius: isMe ? 4 : 18,
            borderBottomLeftRadius: isMe ? 18 : 4,
            flexDirection: 'row', alignItems: 'center', gap: 12
        }}>
            <TouchableOpacity onPress={loadAndPlay} style={{
                width: 32, height: 32, borderRadius: 16,
                backgroundColor: isMe ? 'rgba(255,255,255,0.2)' : colors.primary,
                alignItems: 'center', justifyContent: 'center'
            }}>
                {status.playing ?
                    <Ionicons name="pause" size={18} color="#FFF" /> :
                    <Ionicons name="play" size={18} color="#FFF" style={{ marginLeft: 2 }} />
                }
            </TouchableOpacity>

            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                {/* Waveform Visualization */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, flex: 1, height: 24, justifyContent: 'center' }}>
                    {WAVEFORM_BARS.map((height, i) => {
                        const barProgress = i / WAVEFORM_BARS.length;
                        return (
                            <Animated.View
                                key={i}
                                style={{
                                    width: 2.5,
                                    height: height,
                                    borderRadius: 1.5,
                                    backgroundColor: progress.interpolate({
                                        inputRange: [barProgress, barProgress + 0.01],
                                        outputRange: [inactiveColor, activeColor],
                                        extrapolate: 'clamp'
                                    })
                                }}
                            />
                        );
                    })}
                </View>

                {/* Duration */}
                <Text style={{
                    fontSize: 11,
                    color: isMe ? '#FFF' : colors.textSecondary,
                    fontWeight: '600',
                    width: 35,
                    textAlign: 'right'
                }}>
                    {formatDuration((status.currentTime > 0 ? status.currentTime : (status.duration > 0 ? status.duration : (itemsDuration || 0))) * 1000)}
                </Text>
            </View>
        </View>
    );
};

/* -------------------------------------------------------------------------- */
/*                                Message Screen                              */
/* -------------------------------------------------------------------------- */

export default function MessageScreen() {
    const params = useLocalSearchParams();
    const { id, product, isGroup, name: paramName, avatar: paramAvatar, chatId: paramChatId } = params;
    const router = useRouter();
    const { user } = useUser() as any;
    const { colors, isDark } = useThemeContext();
    const { markChatAsRead, socket } = useMessages();
    const insets = useSafeAreaInsets();
    const width = Dimensions.get('window').width;
    const isDesktop = Platform.OS === 'web' && width > 768;

    // State
    const [messages, setMessages] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [inputText, setInputText] = useState('');
    const [keyboardVisible, setKeyboardVisible] = useState(false);
    const [showSearch, setShowSearch] = useState(params.search === 'true');
    const [searchQuery, setSearchQuery] = useState('');

    // Filter messages based on search query
    const filteredMessages = useMemo(() => {
        if (!searchQuery.trim()) return messages;
        const q = searchQuery.toLowerCase();
        return messages.filter((m: any) => {
            if (m.type === 'text' && m.content?.toLowerCase().includes(q)) return true;
            if (m.type === 'system' && m.content?.toLowerCase().includes(q)) return true;
            return false;
        });
    }, [messages, searchQuery]);

    useEffect(() => {
        const showSub = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', () => setKeyboardVisible(true));
        const hideSub = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setKeyboardVisible(false));
        return () => {
            showSub.remove();
            hideSub.remove();
        };
    }, []);

    // Safely handle id param which can be string or array
    const userId = Array.isArray(id) ? id[0] : id;

    const [recipient, setRecipient] = useState<any>(
        paramName ? { name: paramName, avatar: paramAvatar, _id: userId } : null
    );
    const [chatId, setChatId] = useState<string | null>(paramChatId as string || null);
    const [chat, setChat] = useState<any>(null); // Store full chat object
    const [isTyping, setIsTyping] = useState(false);

    // Actions State
    const [selectedMessage, setSelectedMessage] = useState<any>(null);
    const [replyingTo, setReplyingTo] = useState<any>(null);
    const [messageToForward, setMessageToForward] = useState<any>(null);
    const [forwardModalVisible, setForwardModalVisible] = useState(false);
    const [chats, setChats] = useState<any[]>([]);
    const [editingMessage, setEditingMessage] = useState<any>(null);
    const [showScrollBottom, setShowScrollBottom] = useState(false);

    // Pagination State
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);

    // Audio State
    const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
    const [recordingDuration, setRecordingDuration] = useState(0);
    const durationInterval = useRef<any>(null);

    // Refs
    const flatListRef = useRef<FlatList>(null);
    const typingTimeout = useRef<any>(null);
    const productSentRef = useRef(false);

    // Theme Color Strategy
    const bubbleColor = chat?.theme || colors.primary;
    const activeColors = { ...colors, primary: bubbleColor };

    // 1. Fetch Chat Info & Recipient
    useFocusEffect(
        useCallback(() => {
            if (!user?._id || !userId) return;

            const init = async () => {
                setLoading(true);
                try {
                    const authHeader = { 'Authorization': `Bearer ${user.token}` };

                    if (isGroup === 'true') {
                        const chatRes = await fetch(`${API_BASE_URL}/api/chats/${userId}`, { headers: authHeader });
                        if (chatRes.ok) {
                            const chatData = await chatRes.json();
                            setChatId(chatData._id);
                            setChat(chatData);
                            const mRes = await fetch(`${API_BASE_URL}/api/chats/${chatData._id}/messages?limit=50`, { headers: authHeader });
                            if (mRes.ok) {
                                const mData = await mRes.json();
                                const msgs = Array.isArray(mData) ? mData : (mData.messages || mData.data || []);
                                setMessages(msgs);
                                if (msgs.length < 50) setHasMore(false);
                            }
                        }
                    } else {
                        // Fetch user info
                        const uRes = await fetch(`${API_BASE_URL}/api/auth/user/${userId}`, { headers: authHeader });
                        if (uRes.ok) setRecipient(await uRes.json());

                        // Resolve chatId: use passed param first, otherwise find/create
                        const existingChatId = Array.isArray(paramChatId) ? paramChatId[0] : paramChatId as string | undefined;

                        let resolvedChatId: string | null = null;

                        if (existingChatId) {
                            const chatRes = await fetch(`${API_BASE_URL}/api/chats/${existingChatId}`, { headers: authHeader });
                            if (chatRes.ok) {
                                const chatData = await chatRes.json();
                                resolvedChatId = chatData._id;
                                setChatId(chatData._id);
                                setChat(chatData);
                            }
                        }

                        if (!resolvedChatId) {
                            const cRes = await fetch(`${API_BASE_URL}/api/chats`, {
                                method: 'POST',
                                headers: { ...authHeader, 'Content-Type': 'application/json' },
                                body: JSON.stringify({ userId, isMarketplace: !!product })
                            });
                            if (cRes.ok) {
                                const cData = await cRes.json();
                                const chatData = cData.data || cData;
                                resolvedChatId = chatData._id;
                                setChatId(chatData._id);
                                setChat(chatData);
                            }
                        }

                        // Fetch messages
                        if (resolvedChatId) {
                            const mRes = await fetch(`${API_BASE_URL}/api/chats/${resolvedChatId}/messages?limit=50`, { headers: authHeader });
                            if (mRes.ok) {
                                const mData = await mRes.json();
                                const msgs = Array.isArray(mData) ? mData : (mData.messages || mData.data || mData.docs || []);
                                setMessages(msgs);
                                if (msgs.length < 50) setHasMore(false);

                                // Handle Product sharing
                                if (product && !productSentRef.current) {
                                    try {
                                        const productData = JSON.parse(decodeURIComponent(product as string));
                                        const lastMsg = msgs[0];
                                        if (lastMsg?.marketitemId?._id === productData.id || lastMsg?.marketitemId === productData.id) {
                                            productSentRef.current = true;
                                            return;
                                        }
                                        const pRes = await fetch(`${API_BASE_URL}/api/chats/${resolvedChatId}/messages`, {
                                            method: 'POST',
                                            headers: { ...authHeader, 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ content: 'Check out this product', type: 'text', marketitemId: productData.id })
                                        });
                                        if (pRes.ok) {
                                            const pMsg = await pRes.json();
                                            setMessages(prev => [pMsg, ...prev]);
                                            socket?.emit('message:send', { chatId: resolvedChatId, message: pMsg });
                                        }
                                        productSentRef.current = true;
                                    } catch (e) { console.error('Error sending product:', e); }
                                }
                            }
                        }
                    }
                } catch (e) {
                    console.error('Chat Init Error:', e);
                } finally {
                    setLoading(false);
                }
            };
            init();
        }, [user, userId, product, paramChatId])
    );

    // 2. Socket Listeners
    useEffect(() => {
        if (!socket || !chatId) return;

        socket.emit('chat:join', chatId);

        const onMsg = (newMsg: any) => {
            const msgChatId = newMsg.chatId || (typeof newMsg.chat === 'object' ? newMsg.chat?._id : newMsg.chat);
            if (msgChatId === chatId) {
                setMessages(prev => {
                    if (prev.find(m => m._id === newMsg._id)) return prev;
                    return [newMsg, ...prev]; // Prepend newest
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

    // Load More Messages for Pagination
    const loadMoreMessages = async () => {
        if (loadingMore || !hasMore || messages.length === 0 || !chatId) return;
        setLoadingMore(true);
        const lastMsg = messages[messages.length - 1]; // Oldest is at the end of the array
        try {
            const res = await ApiClient.get<any[]>(`/api/chats/${chatId}/messages?limit=50&before=${lastMsg.createdAt}`, { 'Authorization': `Bearer ${user.token}` });
            if (res.success && res.data) {
                const fetchedItems = res.data;
                if (fetchedItems.length < 50) setHasMore(false);
                setMessages(prev => {
                    const existing = new Set(prev.map(m => m._id));
                    const newMsgs = fetchedItems.filter((m: any) => !existing.has(m._id));
                    return [...prev, ...newMsgs];
                });
            } else {
                setHasMore(false);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingMore(false);
        }
    };

    // Fetch chats for forwarding
    const fetchChats = async () => {
        const res = await ApiClient.get<any[]>('/api/chats', { 'Authorization': `Bearer ${user.token}` });
        if (res.success && res.data) setChats(res.data);
    };

    // Actions
    const handleAction = async (action: string, payload?: any) => {
        if (!selectedMessage) return;
        const msg = selectedMessage;

        switch (action) {
            case 'reply':
                setReplyingTo(msg);
                setSelectedMessage(null);
                break;
            case 'forward':
                setMessageToForward(msg);
                setSelectedMessage(null);
                setForwardModalVisible(true);
                fetchChats();
                break;
            case 'edit':
                if (msg.type === 'text') {
                    setEditingMessage(msg);
                    setInputText(msg.content);
                }
                setSelectedMessage(null);
                break;
            case 'download':
                if (msg.type === 'image') {
                    const url = getCorrectUrl(msg.content);
                    // console.log('📥 Attempting to download image from:', url);

                    if (!url) {
                        Alert.alert("Error", "Invalid image URL");
                        return;
                    }

                    if (Platform.OS === 'web') {
                        try {
                            const response = await fetch(url);
                            const blob = await response.blob();
                            const blobUrl = window.URL.createObjectURL(blob);
                            const link = document.createElement('a');
                            link.href = blobUrl;
                            link.download = `image_${Date.now()}.jpg`;
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                            window.URL.revokeObjectURL(blobUrl);
                        } catch (e) {
                            console.error('Web download error:', e);
                            window.open(url, '_blank');
                        }
                    } else {
                        try {
                            const { status } = await MediaLibrary.requestPermissionsAsync();
                            if (status !== 'granted') {
                                Alert.alert("Permission required", "Please allow access to save images to your gallery.");
                                return;
                            }

                            const filename = `image_${Date.now()}.jpg`;
                            const fileUri = `${FileSystem.documentDirectory}${filename}`;
                            let saveUri = fileUri;

                            if (url.startsWith('data:')) {
                                // Handle Base64 Data URI
                                const base64Data = url.split('base64,')[1];
                                await FileSystem.writeAsStringAsync(fileUri, base64Data, {
                                    encoding: FileSystem.EncodingType.Base64
                                });
                            } else if (url.startsWith('http')) {
                                // Handle Remote URL
                                const result = await FileSystem.downloadAsync(url, fileUri);
                                saveUri = result.uri;
                            } else if (url.startsWith('file:')) {
                                // Already local
                                saveUri = url;
                            }

                            const asset = await MediaLibrary.saveToLibraryAsync(saveUri);
                            // console.log('💾 Saved to gallery:', asset);

                            Alert.alert("Success", "Image saved to your gallery!");
                        } catch (e: any) {
                            console.error('❌ Download error:', e);
                            Alert.alert("Error", `Could not save image: ${e.message || 'Unknown error'}`);
                        }
                    }
                }
                setSelectedMessage(null);
                break;
            case 'copy':
                if (msg.type === 'text') {
                    await Clipboard.setStringAsync(msg.content);
                }
                setSelectedMessage(null);
                break;
            case 'delete':
                Alert.alert("Delete Message", "Are you sure?", [
                    { text: "Cancel", style: "cancel" },
                    {
                        text: "Delete", style: "destructive", onPress: async () => {
                            try {
                                await ApiClient.delete(`/api/chats/${chatId}/messages/${msg._id}`, { 'Authorization': `Bearer ${user.token}` });
                                setMessages(prev => prev.filter(m => m._id !== msg._id));
                                setSelectedMessage(null);
                            } catch (e) {
                                Alert.alert("Error", "Could not delete message");
                            }
                        }
                    }
                ]);
                break;
            case 'react':
                // Optimistic Update
                setMessages(prev => prev.map(m => {
                    if (m._id === msg._id) {
                        const newReactions = { ...(m.reactions || {}) };
                        let userRemovedFrom = null;

                        // 1. Remove user from ALL existing reactions
                        Object.keys(newReactions).forEach(key => {
                            const users = newReactions[key] || [];
                            if (users.includes(user._id)) {
                                const updatedUsers = users.filter((u: string) => u !== user._id);
                                if (updatedUsers.length === 0) {
                                    delete newReactions[key];
                                } else {
                                    newReactions[key] = updatedUsers;
                                }
                                userRemovedFrom = key;
                            }
                        });

                        // 2. Add to new reaction IF it wasn't the same one (Toggle logic)
                        if (userRemovedFrom !== payload) {
                            const existing = newReactions[payload] || [];
                            newReactions[payload] = [...existing, user._id];
                        }

                        return { ...m, reactions: newReactions };
                    }
                    return m;
                }));

                try {
                    await ApiClient.post(`/api/chats/${chatId}/messages/${msg._id}/react`, { emoji: payload }, { 'Authorization': `Bearer ${user.token}` });
                    setSelectedMessage(null);
                } catch (e) { console.error(e); }
                break;
        }
    };

    const handleForwardMessage = async (targetChatId: string) => {
        if (!messageToForward) return;
        try {
            await ApiClient.post(`/api/chats/${targetChatId}/messages`, {
                content: messageToForward.content,
                type: messageToForward.type,
                // Attachments? content is usually URI or text
            }, { 'Authorization': `Bearer ${user.token}` });

            setForwardModalVisible(false);
            setMessageToForward(null);
            Alert.alert("Success", "Message forwarded!");
        } catch (e) {
            Alert.alert("Error", "Failed to forward");
        }
    };

    // 4. Send  / Edit Message
    const handleSend = async (content = inputText, type = 'text') => {
        if (!content.trim() && type === 'text') return;

        if (editingMessage) {
            try {
                // Edit Message
                await ApiClient.put(`/api/chats/${chatId}/messages/${editingMessage._id}`, {
                    content: content
                }, { 'Authorization': `Bearer ${user.token}` });

                setMessages(prev => prev.map(m => m._id === editingMessage._id ? { ...m, content: content } : m));
                setEditingMessage(null);
                setInputText('');
            } catch (e) {
                Alert.alert("Error", "Could not edit message");
            }
            return;
        }

        if (type === 'text') setInputText('');

        try {
            const body = {
                content,
                type,
                replyTo: replyingTo?._id
            };
            setReplyingTo(null); // Clear reply state

            const res = await ApiClient.post(`/api/chats/${chatId}/messages`, body, { 'Authorization': `Bearer ${user.token}` });
            if (res.success) {
                const msg = res.data;
                setMessages(p => [msg, ...p]); // Prepend
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
            // For simplicity, directly sending here. If we want edit flow for text only, this is fine.
            handleSend(`data:image/jpeg;base64,${res.assets[0].base64}`, 'image');
        }
    };

    // 5. Audio Recording Logic
    const startRecording = async () => {
        try {
            const permission = await getRecordingPermissionsAsync();
            if (permission.status !== 'granted') {
                const req = await requestRecordingPermissionsAsync();
                if (req.status !== 'granted') {
                    Alert.alert("Permission Required", "Please allow microphone access to record voice messages.");
                    return;
                }
            }
            await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
            await recorder.prepareToRecordAsync();
            recorder.record();
            setRecordingDuration(0);
            durationInterval.current = setInterval(() => setRecordingDuration(d => d + 1), 1000);
        } catch (err) {
            console.error('Failed to start recording', err);
        }
    };

    const stopRecording = async () => {
        clearInterval(durationInterval.current);
        if (!recorder.isRecording) return;

        await recorder.stop();
        const uri = recorder.uri;
        if (uri) {
            uploadAudio(uri);
        }
    };

    const cancelRecording = async () => {
        clearInterval(durationInterval.current);
        if (recorder.isRecording) {
            await recorder.stop();
        }
    };

    const uploadAudio = async (uri: string) => {
        if (!chatId) return;
        const formData = new FormData();
        // @ts-ignore
        formData.append('file', { uri, name: 'voice.m4a', type: 'audio/m4a' });
        // @ts-ignore
        formData.append('type', 'audio');
        // @ts-ignore
        formData.append('duration', recordingDuration.toString()); // Send duration

        try {
            const res = await fetch(`${API_BASE_URL}/api/chats/${chatId}/messages`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${user.token}` },
                body: formData
            });

            const data = await res.json();
            if (res.status === 200 || res.status === 201) {
                setMessages(p => [data, ...p]);
                socket?.emit('message:send', { chatId, message: data });
            }
        } catch (e) {
            console.error("Audio Upload Error:", e);
            Alert.alert("Upload Failed", "Could not send voice message.");
        }
    };

    // Render Items
    const renderMessageItem = ({ item, index }: { item: any, index: number }): React.ReactElement | null => {
        if (!item || !user) return null;

        // Divider logic: compare with the next older message (index + 1 in inverted list)
        let showDivider = false;
        let dividerText = '';

        const nextMsg = messages[index + 1];
        if (nextMsg) {
            const currentDate = new Date(item.createdAt);
            const nextDate = new Date(nextMsg.createdAt);
            const diff = currentDate.getTime() - nextDate.getTime();

            // Show divider if more than 30 minutes gap
            if (diff > 30 * 60 * 1000) {
                showDivider = true;
                dividerText = formatDividerDate(item.createdAt);
            }
        } else if (index === messages.length - 1) {
            // First message of the chat (at the very top)
            showDivider = true;
            dividerText = formatDividerDate(item.createdAt);
        }

        if (item.type === 'system') {
            const isMeAction = item.sender?._id === user._id || item.sender === user._id;
            const systemContent = (
                <View style={{ width: '100%', alignItems: 'center', marginVertical: 14 }}>
                    <View style={{
                        backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                        paddingHorizontal: 20,
                        paddingVertical: 8,
                        borderRadius: 20,
                        maxWidth: '85%',
                        borderWidth: 1,
                        borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'
                    }}>
                        <Text style={{
                            fontSize: 12,
                            color: colors.textSecondary,
                            textAlign: 'center',
                            lineHeight: 18,
                            fontWeight: '500'
                        }}>
                            <Text style={{ fontWeight: '700', color: colors.text }}>
                                {isMeAction ? 'You' : (item.sender?.name || 'Someone')}
                            </Text> {item.content}
                        </Text>
                        {item.content?.includes('created the group') && (
                            <Text style={{ fontSize: 10, color: colors.textSecondary, textAlign: 'center', marginTop: 3, opacity: 0.7, fontWeight: '600' }}>
                                {new Date(item.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                            </Text>
                        )}
                    </View>
                </View>
            );
            return (
                <View>
                    {showDivider && (
                        <View style={{ marginVertical: 20, alignItems: 'center' }}>
                            <Text style={{ fontSize: 11, color: colors.textSecondary, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                {dividerText}
                            </Text>
                        </View>
                    )}
                    {systemContent}
                </View>
            );
        }

        const isMe = item.sender?._id === user._id || item.sender === user._id;
        const reactions = item.reactions || {};
        const reactionKeys = Object.keys(reactions);
        const hasReactions = reactionKeys.length > 0;

        // Reply Block (Message to Message)
        const ReplyBlock = () => {
            if (!item.replyTo) return null;
            const rMsg = item.replyTo;
            const rSender = rMsg.sender?.name || 'User';
            const rContent = rMsg.type === 'text' ? rMsg.content : (rMsg.type === 'audio' ? 'Voice Message' : 'Media');
            const rImageUrl = rMsg.type === 'image' ? getCorrectUrl(rMsg.content) : null;

            return (
                <View style={{
                    backgroundColor: isMe ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)',
                    borderLeftWidth: 3,
                    borderLeftColor: isMe ? 'rgba(255,255,255,0.5)' : colors.primary,
                    padding: 6,
                    margin: 4,
                    marginBottom: 2,
                    borderRadius: 4,
                    flexDirection: 'row',
                    gap: 8,
                    alignItems: 'center',
                    minWidth: 160
                }}>
                    <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: isMe ? 'white' : colors.primary, marginBottom: 2 }}>{rSender}</Text>
                        <Text numberOfLines={1} style={{ fontSize: 11, color: isMe ? 'rgba(255,255,255,0.8)' : colors.textSecondary }}>{rContent}</Text>
                    </View>
                    {rImageUrl && (
                        <ExpoImage
                            source={{ uri: rImageUrl }}
                            style={{ width: 34, height: 34, borderRadius: 4 }}
                            contentFit="cover"
                        />
                    )}
                </View>
            );
        };

        // Note Reply Block
        const NoteReplyBlock = () => {
            if (!item.noteRepliedTo) return null;
            const note = item.noteRepliedTo;
            const noteContent = note.content || (note.music ? `🎵 ${note.music.track}` : 'Note');

            return (
                <View style={{
                    backgroundColor: isMe ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.05)',
                    borderLeftWidth: 3,
                    borderLeftColor: isMe ? '#FFF' : colors.primary,
                    padding: 8,
                    margin: 4,
                    marginBottom: 6,
                    borderRadius: 8,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 10,
                    minWidth: 160, // Fixed min width to avoid wrapping 'Replying to note'
                }}>
                    <View style={{ flex: 1 }}>
                        <Text numberOfLines={1} style={{ fontSize: 10, fontWeight: '700', textTransform: 'uppercase', color: isMe ? 'rgba(255,255,255,0.7)' : colors.primary, marginBottom: 4, letterSpacing: 0.5 }}>
                            Replying to note
                        </Text>
                        <Text numberOfLines={1} style={{ fontSize: 13, color: isMe ? '#FFF' : colors.text, fontWeight: '600' }}>
                            {noteContent}
                        </Text>
                    </View>
                    <Ionicons name="chatbubble-ellipses" size={16} color={isMe ? 'rgba(255,255,255,0.5)' : colors.textSecondary} />
                </View>
            );
        };

        // Story Reply Block
        const StoryReplyBlock = () => {
            if (!item.replyToStory) return null;
            const story = item.replyToStory;
            const storyUri = getCorrectUrl(story.uri);

            return (
                <View style={{
                    margin: 4,
                    marginBottom: 6,
                    borderRadius: 12,
                    overflow: 'hidden',
                    borderWidth: 1,
                    borderColor: isMe ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.08)',
                    minWidth: 180,
                }}>
                    {/* Label */}
                    <View style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        backgroundColor: isMe ? 'rgba(0,0,0,0.15)' : 'rgba(0,0,0,0.04)',
                    }}>
                        <Ionicons name="albums-outline" size={12} color={isMe ? 'rgba(255,255,255,0.7)' : colors.textSecondary} />
                        <Text style={{ fontSize: 11, color: isMe ? 'rgba(255,255,255,0.7)' : colors.textSecondary, fontWeight: '600' }}>
                            Replied to story
                        </Text>
                    </View>

                    {/* Story Preview */}
                    {story.type === 'text' ? (
                        // Text story preview
                        <View style={{
                            backgroundColor: story.color || colors.primary,
                            paddingHorizontal: 14,
                            paddingVertical: 12,
                            minHeight: 60,
                            justifyContent: 'center',
                        }}>
                            <Text numberOfLines={3} style={{ fontSize: 13, color: '#FFF', fontWeight: '600', lineHeight: 18 }}>
                                {story.content}
                            </Text>
                        </View>
                    ) : storyUri ? (
                        // Image/Video story preview
                        <View style={{ width: '100%', height: 100, position: 'relative' }}>
                            <ExpoImage
                                source={{ uri: storyUri }}
                                style={{ width: '100%', height: '100%' }}
                                contentFit="cover"
                            />
                            {story.type === 'video' && (
                                <View style={{
                                    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                                    alignItems: 'center', justifyContent: 'center',
                                    backgroundColor: 'rgba(0,0,0,0.3)'
                                }}>
                                    <Ionicons name="play-circle" size={30} color="#FFF" />
                                </View>
                            )}
                        </View>
                    ) : (
                        <View style={{ height: 60, alignItems: 'center', justifyContent: 'center', backgroundColor: isDark ? '#333' : '#EEE' }}>
                            <Ionicons name="image-outline" size={24} color={colors.textSecondary} />
                        </View>
                    )}
                </View>
            );
        };

        const content = (
            <TouchableOpacity
                activeOpacity={0.8}
                onLongPress={() => setSelectedMessage(item)}
                style={{ alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '75%', marginVertical: 6 }}
            >
                {(item.marketitemId || item.postId) ? (() => {
                    // Shared Item (Post/Market)
                    const isMarket = !!item.marketitemId;
                    const sharedItem = item.marketitemId || item.postId;

                    const rawImageUrl = isMarket
                        ? (sharedItem.images?.[0] || sharedItem.image)
                        : (sharedItem.uri || sharedItem.videoUri);

                    const imageUrl = getCorrectUrl(rawImageUrl);
                    const title = isMarket ? sharedItem.title : (sharedItem.caption || 'Shared Post');
                    const owner = sharedItem.user;

                    return (
                        <View>
                            <ReplyBlock />
                            <NoteReplyBlock />
                            <TouchableOpacity
                                activeOpacity={0.9}
                                onLongPress={() => setSelectedMessage(item)}
                                onPress={() => {
                                    if (isMarket) router.push(`/marketplace/${sharedItem._id}`);
                                    else {
                                        router.push({
                                            pathname: '/media-view',
                                            params: {
                                                uri: sharedItem.videoUri || sharedItem.uri || sharedItem.image,
                                                type: sharedItem.videoUri ? 'video' : 'image',
                                                postId: sharedItem._id
                                            }
                                        });
                                    }
                                }}
                                style={{
                                    backgroundColor: isDark ? '#262626' : '#F2F2F2',
                                    borderRadius: 16,
                                    overflow: 'hidden',
                                    borderWidth: 1,
                                    borderColor: isDark ? '#333' : '#EEE',
                                    marginBottom: 4,
                                    width: 220
                                }}
                            >
                                {owner && (
                                    <View style={{ flexDirection: 'row', alignItems: 'center', padding: 8, gap: 8 }}>
                                        <AvatarImage uri={owner.avatar} name={owner.name} size={24} />
                                        <Text numberOfLines={1} style={{ fontSize: 12, fontWeight: '600', color: colors.text, flex: 1 }}>{owner.name || owner.username}</Text>
                                    </View>
                                )}
                                {imageUrl ? (
                                    <View style={{ width: '100%', height: 220, backgroundColor: isDark ? '#333' : '#E0E0E0' }}>
                                        <ExpoImage
                                            source={{ uri: imageUrl }}
                                            style={{ width: '100%', height: '100%' }}
                                            contentFit="cover"
                                            onLoad={() => console.log('Image loaded successfully')}
                                            onError={() => console.log('Image failed to load URL:', imageUrl)}
                                        />
                                    </View>
                                ) : (
                                    <View style={{ width: '100%', height: 220, backgroundColor: isDark ? '#333' : '#E0E0E0', alignItems: 'center', justifyContent: 'center' }}>
                                        <Ionicons name="image-outline" size={40} color={colors.textSecondary} />
                                    </View>
                                )}
                                <View style={{ padding: 12 }}>
                                    <Text numberOfLines={2} style={{ fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: 8 }}>{title}</Text>
                                    <View style={{ backgroundColor: isDark ? '#000' : '#FFF', paddingVertical: 6, borderRadius: 8, alignItems: 'center' }}>
                                        <Text style={{ fontSize: 12, fontWeight: '600', color: colors.primary }}>View Details</Text>
                                    </View>
                                </View>
                            </TouchableOpacity>
                        </View>
                    );
                })() : item.type === 'audio' ? (
                    <View>
                        <ReplyBlock />
                        <NoteReplyBlock />
                        <VoiceMessage uri={item.content} itemsDuration={item.duration} isMe={isMe} colors={colors} />
                    </View>
                ) : item.type === 'image' ? (
                    <View>
                        <ReplyBlock />
                        <NoteReplyBlock />
                        <View style={{ borderRadius: 18, overflow: 'hidden', backgroundColor: isDark ? '#262626' : '#F2F2F2' }}>
                            {(() => {
                                const validUri = getCorrectUrl(item.content);
                                if (validUri) return <ExpoImage source={{ uri: validUri }} style={{ width: 220, height: 280, borderRadius: 18 }} contentFit="cover" />;
                                return (
                                    <View style={{ width: 220, height: 280, alignItems: 'center', justifyContent: 'center', backgroundColor: isDark ? '#333' : '#DDD' }}>
                                        <Ionicons name="image-outline" size={40} color={colors.textSecondary} />
                                    </View>
                                );
                            })()}
                        </View>
                    </View>
                ) : (
                    // Text Bubble
                    <View style={{
                        borderRadius: 20,
                        overflow: 'hidden',
                        borderBottomRightRadius: isMe ? 4 : 20,
                        borderBottomLeftRadius: isMe ? 20 : 4,
                        backgroundColor: isMe ? colors.primary : (isDark ? '#262626' : '#F2F2F2'),
                        minWidth: 140
                    }}>
                        <ReplyBlock />
                        <NoteReplyBlock />

                        <View style={{ padding: 12, paddingTop: (item.replyTo || item.noteRepliedTo) ? 4 : 12 }}>
                            <Text style={{ fontSize: 16, color: isMe ? '#FFF' : colors.text }}>{item.content}</Text>
                        </View>
                    </View>
                )}

                {/* Reactions Overlay */}
                {hasReactions && (
                    <View style={{
                        position: 'absolute',
                        bottom: 12, // Overlap slightly
                        [isMe ? 'left' : 'right']: -4, // Hang off the side
                        backgroundColor: isDark ? '#333' : '#FFF',
                        borderRadius: 12,
                        paddingVertical: 2,
                        paddingHorizontal: 6,
                        flexDirection: 'row',
                        gap: 2,
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: 0.2,
                        shadowRadius: 1,
                        elevation: 3,
                        borderColor: isDark ? '#444' : '#EEE',
                        borderWidth: 1,
                        zIndex: 10
                    }}>
                        {reactionKeys.slice(0, 3).map((emoji) => (
                            <Text key={emoji} style={{ fontSize: 11, color: colors.text }}>
                                {emoji} {reactions[emoji].length > 1 ? reactions[emoji].length : ''}
                            </Text>
                        ))}
                        {reactionKeys.length > 3 && <Text style={{ fontSize: 10, color: colors.textSecondary }}>+</Text>}
                    </View>
                )}

                <Text style={{ fontSize: 10, marginTop: 6, marginHorizontal: 4, color: colors.textSecondary, alignSelf: 'flex-end' }}>
                    {formatTime(item.createdAt)}
                </Text>
            </TouchableOpacity>
        );

        return (
            <View>
                {showDivider && (
                    <View style={{ marginVertical: 20, alignItems: 'center' }}>
                        <Text style={{ fontSize: 11, color: colors.textSecondary, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                            {dividerText}
                        </Text>
                    </View>
                )}
                {content}
            </View>
        );
    };

    const formatDuration = (sec: number) => {
        const m = Math.floor(sec / 60);
        const s = sec % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    return (
        <View style={{ flex: 1, backgroundColor: isDark ? '#000' : '#FFF' }}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

            {/* Header */}
            <View style={[styles.header, {
                paddingTop: isDesktop ? 0 : insets.top,
                height: isDesktop ? 60 : 70 + insets.top,
                backgroundColor: isDark ? '#000' : '#FFF',
                borderBottomColor: isDark ? '#262626' : '#F2F2F2'
            }]}>
                {showSearch ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, paddingHorizontal: 4 }}>
                        <TouchableOpacity onPress={() => setShowSearch(false)} style={{ padding: 8 }}>
                            <Ionicons name="arrow-back" size={24} color={colors.text} />
                        </TouchableOpacity>
                        <TextInput
                            style={{
                                flex: 1,
                                height: 40,
                                backgroundColor: isDark ? '#262626' : '#F3F4F6',
                                borderRadius: 20,
                                paddingHorizontal: 15,
                                color: colors.text,
                                fontSize: 15
                            }}
                            placeholder="Search messages..."
                            placeholderTextColor={colors.textSecondary}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            autoFocus
                        />
                        {searchQuery.length > 0 && (
                            <TouchableOpacity onPress={() => setSearchQuery('')} style={{ padding: 8 }}>
                                <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
                            </TouchableOpacity>
                        )}
                    </View>
                ) : (
                    <>
                        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 4, paddingLeft: isDesktop ? 10 : 0 }}>
                            <TouchableOpacity onPress={() => router.back()} style={{ padding: 8 }}>
                                <Ionicons name="arrow-back" size={24} color={colors.text} />
                            </TouchableOpacity>

                            {isGroup === 'true' && chat ? (
                                <TouchableOpacity
                                    style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}
                                    onPress={() => router.push({ pathname: `/message/group-info/${chat._id}` } as any)}
                                >
                                    <AvatarImage uri={chat.groupAvatar} name={chat.groupName} size={isDesktop ? 40 : 36} />
                                    <View style={{ marginLeft: 12, flex: 1 }}>
                                        <Text numberOfLines={1} style={{ fontSize: isDesktop ? 18 : 16, fontWeight: '700', color: colors.text }}>{chat.groupName}</Text>
                                        <Text numberOfLines={1} style={{ fontSize: 12, color: colors.textSecondary }}>{chat.participants?.length || 0} members</Text>
                                    </View>
                                </TouchableOpacity>
                            ) : recipient ? (
                                <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                                    {/* 1. Avatar - Stories view */}
                                    <TouchableOpacity
                                        onPress={() => {
                                            const hasActiveStory = recipient.stories && recipient.stories.length > 0;
                                            if (hasActiveStory) {
                                                router.push({
                                                    pathname: '/story-view',
                                                    params: {
                                                        userId: recipient._id,
                                                        userStr: JSON.stringify(recipient)
                                                    }
                                                } as any);
                                            } else {
                                                router.push(`/message/user-info/${userId}`);
                                            }
                                        }}
                                    >
                                        <AvatarImage 
                                            uri={recipient.avatar} 
                                            name={recipient.name} 
                                            size={isDesktop ? 40 : 36} 
                                            hasStory={recipient.stories && recipient.stories.length > 0}
                                            storyViewed={false}
                                        />
                                    </TouchableOpacity>

                                    {/* 2. Info - Profile view */}
                                    <TouchableOpacity
                                        style={{ marginLeft: 12, flex: 1 }}
                                        onPress={() => router.push(`/message/user-info/${userId}`)}
                                    >
                                        <Text numberOfLines={1} style={{ fontSize: isDesktop ? 18 : 16, fontWeight: '700', color: colors.text }}>{recipient.name}</Text>
                                        <Text numberOfLines={1} style={{ fontSize: 12, color: colors.textSecondary }}>{isTyping ? 'Typing...' : (recipient.username || 'View profile')}</Text>
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                                    <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: isDark ? '#262626' : '#EEE' }} />
                                </View>
                            )}
                        </View>

                        <View style={{ flexDirection: 'row', gap: isDesktop ? 20 : 16, alignItems: 'center', paddingRight: isDesktop ? 20 : 12 }}>
                            <TouchableOpacity onPress={() => setShowSearch(true)}>
                                <Ionicons name="search-outline" size={22} color={colors.text} />
                            </TouchableOpacity>
                        </View>
                    </>
                )}
            </View>

            {/* Search Results Count */}
            {showSearch && searchQuery.trim().length > 0 && (
                <View style={{ backgroundColor: isDark ? '#1a1a1a' : '#F3F4F6', paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: isDark ? '#333' : '#E5E7EB' }}>
                    <Text style={{ fontSize: 13, color: colors.textSecondary, fontWeight: '600' }}>
                        {filteredMessages.length} {filteredMessages.length === 1 ? 'result' : 'results'} found
                    </Text>
                </View>
            )}

            {/* List */}
            <KeyboardAvoidingView
                style={{ flex: 1, backgroundColor: chat?.theme || colors.background }}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={0}
            >
                <View style={{ flex: 1 }}>
                    {loading ? (
                        <SkeletonMessages />
                    ) : (
                        <FlatList
                            ref={flatListRef}
                            data={showSearch && searchQuery.trim() ? filteredMessages : messages}
                            inverted
                            keyExtractor={item => item._id}
                            onEndReached={loadMoreMessages}
                            onEndReachedThreshold={0.5}
                            contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 10, ...(showSearch && searchQuery.trim() && filteredMessages.length === 0 ? { flex: 1 } : {}) }}
                            renderItem={renderMessageItem}
                            ListFooterComponent={loadingMore ? <ActivityIndicator color={colors.primary} /> : null}
                            ListEmptyComponent={showSearch && searchQuery.trim() ? (
                                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', transform: [{ scaleY: -1 }] }}>
                                    <Ionicons name="search-outline" size={48} color={colors.textSecondary} style={{ opacity: 0.4, marginBottom: 12 }} />
                                    <Text style={{ fontSize: 16, color: colors.textSecondary, fontWeight: '600' }}>No messages found</Text>
                                    <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 4, opacity: 0.7 }}>Try a different search term</Text>
                                </View>
                            ) : (
                                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', transform: [{ scaleY: -1 }], paddingBottom: 100 }}>
                                    <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: isDark ? '#262626' : '#F3F4F6', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                                        <Ionicons name="chatbubble-ellipses-outline" size={40} color={colors.primary} />
                                    </View>
                                    <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>No messages yet</Text>
                                    <Text style={{ fontSize: 14, color: colors.textSecondary, marginTop: 8, textAlign: 'center', paddingHorizontal: 40 }}>
                                        Send a message to start the conversation with {recipient?.name || 'this user'}.
                                    </Text>
                                </View>
                            )}
                            onScroll={(event) => {
                                const offsetY = event.nativeEvent.contentOffset.y;
                                setShowScrollBottom(offsetY > 200);
                            }}
                            scrollEventThrottle={16}
                        />
                    )}
                    {showScrollBottom && (
                        <TouchableOpacity
                            activeOpacity={0.8}
                            onPress={() => flatListRef.current?.scrollToOffset({ offset: 0, animated: true })}
                            style={{
                                position: 'absolute',
                                bottom: 20,
                                right: 20,
                                width: 40,
                                height: 40,
                                borderRadius: 20,
                                backgroundColor: colors.primary,
                                alignItems: 'center',
                                justifyContent: 'center',
                                shadowColor: "#000",
                                shadowOffset: { width: 0, height: 2 },
                                shadowOpacity: 0.25,
                                shadowRadius: 3.84,
                                elevation: 5,
                                zIndex: 50
                            }}
                        >
                            <Ionicons name="arrow-down" size={20} color="#FFF" />
                        </TouchableOpacity>
                    )}
                </View>
                <View style={{
                    backgroundColor: isDark ? '#000' : '#FFF',
                    borderTopColor: isDark ? '#262626' : '#F2F2F2',
                    borderTopWidth: 1,
                    paddingBottom: Platform.OS === 'ios' ? (keyboardVisible ? 10 : insets.bottom + 10) : 10,
                }}>
                    {/* Replying To Banner */}
                    {replyingTo && (
                        <View style={{
                            flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                            paddingHorizontal: 16, paddingVertical: 8,
                            backgroundColor: isDark ? '#1a1a1a' : '#f0f0f0',
                            borderLeftWidth: 4, borderLeftColor: colors.primary
                        }}>
                            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ fontWeight: '700', color: colors.text }}>Replying to {replyingTo.sender === user?._id ? 'Yourself' : (replyingTo.sender?.name || 'User')}</Text>
                                    <Text numberOfLines={1} style={{ color: colors.textSecondary, fontSize: 12 }}>
                                        {replyingTo.type === 'text' ? replyingTo.content : (replyingTo.type === 'image' ? 'Image' : `[${replyingTo.type}]`)}
                                    </Text>
                                </View>
                                {replyingTo.type === 'image' && (
                                    <ExpoImage
                                        source={{ uri: getCorrectUrl(replyingTo.content) }}
                                        style={{ width: 40, height: 40, borderRadius: 6 }}
                                        contentFit="cover"
                                    />
                                )}
                            </View>
                            <TouchableOpacity onPress={() => setReplyingTo(null)} style={{ padding: 4 }}>
                                <Ionicons name="close" size={20} color={colors.textSecondary} />
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* Editing Banner */}
                    {editingMessage && (
                        <View style={{
                            flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                            paddingHorizontal: 16, paddingVertical: 8,
                            backgroundColor: isDark ? '#1a1a1a' : '#f0f0f0',
                            borderLeftWidth: 4, borderLeftColor: colors.primary
                        }}>
                            <View>
                                <Text style={{ fontWeight: '700', color: colors.text }}>Editing Message</Text>
                            </View>
                            <TouchableOpacity onPress={() => { setEditingMessage(null); setInputText(''); }}>
                                <Ionicons name="close" size={20} color={colors.textSecondary} />
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* Main Input */}
                    <View style={styles.inputContainer}>
                        {recorder.isRecording ? (
                            /* Recording UI */
                            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                    <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#FF3B30', opacity: recordingDuration % 2 === 0 ? 1 : 0.5 }} />
                                    <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>{formatDuration(recordingDuration)}</Text>
                                </View>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                                    <TouchableOpacity onPress={cancelRecording}>
                                        <Text style={{ color: colors.textSecondary, fontWeight: '600' }}>Cancel</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={stopRecording} style={[styles.iconWrapper, { backgroundColor: colors.primary }]}>
                                        <Ionicons name="stop" size={24} color="#FFF" />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ) : (
                            /* Standard Input UI */
                            <>
                                <TouchableOpacity onPress={pickImage} style={[styles.iconWrapper, { backgroundColor: isDark ? '#262626' : '#F3F4F6' }]}>
                                    <Ionicons name="image-outline" size={20} color={colors.primary} />
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

                                {inputText.trim() || editingMessage ? (
                                    <TouchableOpacity onPress={() => handleSend()} style={[styles.iconWrapper, { backgroundColor: colors.primary }]}>
                                        {editingMessage ? <Ionicons name="checkmark" size={20} color="#FFF" /> : <Ionicons name="send" size={20} color="#FFF" />}
                                    </TouchableOpacity>
                                ) : (
                                    <TouchableOpacity onPress={startRecording} style={[styles.iconWrapper, { backgroundColor: isDark ? '#262626' : '#F3F4F6' }]}>
                                        <Ionicons name="mic-outline" size={20} color={colors.text} />
                                    </TouchableOpacity>
                                )}
                            </>
                        )}
                    </View>
                </View>
            </KeyboardAvoidingView>

            {/* Long Press Modal */}
            <Modal visible={!!selectedMessage} transparent animationType="fade" onRequestClose={() => setSelectedMessage(null)}>
                <TouchableWithoutFeedback onPress={() => setSelectedMessage(null)}>
                    <View style={{
                        flex: 1,
                        backgroundColor: 'rgba(0,0,0,0.4)',
                        justifyContent: 'center',
                        alignItems: 'center'
                    }}>
                        <TouchableWithoutFeedback>
                            <View style={{
                                width: isDesktop ? 450 : '85%',
                                backgroundColor: isDark ? '#1a1a1a' : '#FFF',
                                borderRadius: 24,
                                padding: isDesktop ? 24 : 20,
                                gap: 4,
                                shadowColor: "#000",
                                shadowOffset: { width: 0, height: 10 },
                                shadowOpacity: 0.3,
                                shadowRadius: 20,
                                elevation: 8,
                                borderWidth: isDark ? 1 : 0,
                                borderColor: '#333'
                            }}>
                                {/* Reactions */}
                                <View style={{
                                    flexDirection: 'row',
                                    flexWrap: 'wrap',
                                    justifyContent: 'center',
                                    gap: isDesktop ? 12 : 8,
                                    marginBottom: 16
                                }}>
                                    {['❤️', '😂', '😮', '😢', '👍', '🙏', '🔥', '✨', '👏', '😠'].map(emoji => (
                                        <TouchableOpacity
                                            key={emoji}
                                            onPress={() => handleAction('react', emoji)}
                                            style={{
                                                padding: 8,
                                                borderRadius: 12,
                                                backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'
                                            }}
                                        >
                                            <Text style={{ fontSize: isDesktop ? 28 : 24 }}>{emoji}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>

                                <View style={{ height: 1, backgroundColor: isDark ? '#333' : '#F2F2F2', marginVertical: 8, marginHorizontal: -20 }} />

                                {/* Actions Group */}
                                <View style={{ marginTop: 8 }}>
                                    <TouchableOpacity style={styles.actionRow} onPress={() => handleAction('reply')}>
                                        <View style={[styles.actionIcon, { backgroundColor: isDark ? '#262626' : '#F9F9F9' }]}>
                                            <Ionicons name="arrow-undo-outline" size={20} color={colors.text} />
                                        </View>
                                        <Text style={[styles.actionText, { color: colors.text }]}>Reply</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity style={styles.actionRow} onPress={() => handleAction('copy')}>
                                        <View style={[styles.actionIcon, { backgroundColor: isDark ? '#262626' : '#F9F9F9' }]}>
                                            <Ionicons name="copy-outline" size={20} color={colors.text} />
                                        </View>
                                        <Text style={[styles.actionText, { color: colors.text }]}>Copy Text</Text>
                                    </TouchableOpacity>

                                    {selectedMessage?.type === 'image' && (
                                        <TouchableOpacity style={styles.actionRow} onPress={() => handleAction('download')}>
                                            <View style={[styles.actionIcon, { backgroundColor: isDark ? '#262626' : '#F9F9F9' }]}>
                                                <Ionicons name="cloud-download-outline" size={20} color={colors.text} />
                                            </View>
                                            <Text style={[styles.actionText, { color: colors.text }]}>Save Image</Text>
                                        </TouchableOpacity>
                                    )}

                                    <TouchableOpacity style={styles.actionRow} onPress={() => handleAction('forward')}>
                                        <View style={[styles.actionIcon, { backgroundColor: isDark ? '#262626' : '#F9F9F9' }]}>
                                            <Ionicons name="arrow-redo-outline" size={20} color={colors.text} />
                                        </View>
                                        <Text style={[styles.actionText, { color: colors.text }]}>Forward</Text>
                                    </TouchableOpacity>

                                    {(selectedMessage?.sender?._id === user?._id || selectedMessage?.sender === user?._id) && selectedMessage?.type === 'text' && (
                                        <TouchableOpacity style={styles.actionRow} onPress={() => handleAction('edit')}>
                                            <View style={[styles.actionIcon, { backgroundColor: isDark ? '#262626' : '#F9F9F9' }]}>
                                                <Ionicons name="pencil-outline" size={20} color={colors.text} />
                                            </View>
                                            <Text style={[styles.actionText, { color: colors.text }]}>Edit Message</Text>
                                        </TouchableOpacity>
                                    )}

                                    <View style={{ height: 1, backgroundColor: isDark ? '#333' : '#F2F2F2', marginVertical: 8 }} />

                                    {(selectedMessage?.sender?._id === user?._id || selectedMessage?.sender === user?._id) && (
                                        <TouchableOpacity style={styles.actionRow} onPress={() => handleAction('delete')}>
                                            <View style={[styles.actionIcon, { backgroundColor: 'rgba(255, 59, 48, 0.1)' }]}>
                                                <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                                            </View>
                                            <Text style={[styles.actionText, { color: '#FF3B30', fontWeight: '600' }]}>Delete Message</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            </View>
                        </TouchableWithoutFeedback>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>

            {/* Forward Modal */}
            <Modal visible={forwardModalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setForwardModalVisible(false)}>
                <View style={{ flex: 1, backgroundColor: isDark ? '#000' : '#FFF' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderColor: isDark ? '#333' : '#EEE' }}>
                        <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.text, flex: 1 }}>Forward to...</Text>
                        <TouchableOpacity onPress={() => setForwardModalVisible(false)}>
                            <Text style={{ color: colors.primary, fontSize: 16 }}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                    <FlatList
                        data={chats}
                        keyExtractor={(item) => item._id}
                        renderItem={({ item }) => {
                            const other = item.participants.find((p: any) => p._id !== user._id) || item.participants[0];
                            return (
                                <TouchableOpacity onPress={() => handleForwardMessage(item._id)} style={{ flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 }}>
                                    <AvatarImage uri={other.avatar} name={other.name} size={40} />
                                    <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>{other.name}</Text>
                                    <View style={{ flex: 1 }} />
                                    <Ionicons name="arrow-redo" size={20} color={colors.primary} />
                                </TouchableOpacity>
                            );
                        }}
                    />
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, borderBottomWidth: 1, paddingBottom: 12
    },
    inputContainer: {
        flexDirection: 'row', alignItems: 'flex-end', padding: 10,
    },
    inputField: {
        flex: 1, borderRadius: 24, paddingHorizontal: 16, paddingVertical: 10, marginHorizontal: 8, minHeight: 44, justifyContent: 'center'
    },
    iconWrapper: {
        width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 0
    },
    actionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        paddingVertical: 10,
        paddingHorizontal: 8,
        borderRadius: 12,
    },
    actionIcon: {
        width: 36,
        height: 36,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionText: {
        fontSize: 16,
        fontWeight: '500'
    }
});
