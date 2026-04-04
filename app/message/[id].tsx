import { API_BASE_URL } from '@/constants/Config';
import { useMessages } from '@/context/MessagesContext';
import { useThemeContext } from '@/context/ThemeContext';
import { useUser } from '@/context/UserContext';
import { ApiClient } from '@/utils/api';
import { Audio } from 'expo-av';
import * as Clipboard from 'expo-clipboard';
import * as FileSystem from 'expo-file-system/legacy';
import { Image as ExpoImage } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    Dimensions,
    FlatList,
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

/* -------------------------------------------------------------------------- */
/*                                   Helpers                                  */
/* -------------------------------------------------------------------------- */

const getCorrectUrl = (url: string | undefined | null) => {
    if (!url || typeof url !== 'string') return undefined;
    const clean = url.trim();
    if (clean.length === 0) return undefined;

    // Check for full URLs or data URIs
    if (/^(https?|file|data):/i.test(clean)) return clean;

    // Handle relative paths - ensure encoding for filenames with spaces
    // We strictly assume API_BASE_URL is defined. If not, this still returns a valid-ish string structure.
    const cleanPath = clean.replace(/\\/g, '/');
    // Encode the path parts to handle spaces in filenames
    const encodedPath = cleanPath.split('/').map(part => encodeURIComponent(part)).join('/');

    return `${API_BASE_URL}/uploads/${encodedPath}`;
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
/*                                Voice Component                             */
/* -------------------------------------------------------------------------- */

const WAVEFORM_BARS = [4, 6, 8, 14, 12, 8, 10, 16, 20, 14, 10, 8, 12, 18, 16, 10, 8, 6, 4, 10, 12, 16, 20, 18, 12, 10, 8, 6, 4];

const VoiceMessage = ({ uri, itemsDuration, isMe, colors }: { uri: string, itemsDuration?: number, isMe: boolean, colors: any }) => {
    const [sound, setSound] = useState<Audio.Sound | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [duration, setDuration] = useState(itemsDuration ? itemsDuration * 1000 : 0);
    const [position, setPosition] = useState(0);
    const progress = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        return () => {
            if (sound) sound.unloadAsync();
        };
    }, [sound]);

    const loadAndPlay = async () => {
        try {
            if (sound) {
                const status = await sound.getStatusAsync();
                if (status.isLoaded) {
                    if (isPlaying) {
                        await sound.pauseAsync();
                        setIsPlaying(false);
                    } else {
                        await sound.playAsync();
                        setIsPlaying(true);
                    }
                    return;
                } else {
                    // Sound object exists but is not loaded (likely was unloaded)
                    await sound.unloadAsync().catch(() => {});
                    setSound(null);
                }
            }

            const { sound: newSound, status } = await Audio.Sound.createAsync(
                { uri: getCorrectUrl(uri) || '' },
                { shouldPlay: true },
                onPlaybackStatusUpdate
            );
            setSound(newSound);
            setIsPlaying(true);
            // @ts-ignore
            if (status.durationMillis) setDuration(status.durationMillis);
        } catch (error) {
            console.error("Audio Play Error:", error);
        }
    };

    const onPlaybackStatusUpdate = (status: any) => {
        if (status.isLoaded) {
            setDuration(status.durationMillis || 0);
            setPosition(status.positionMillis);
            setIsPlaying(status.isPlaying);

            if (status.durationMillis > 0) {
                const percent = status.positionMillis / status.durationMillis;
                Animated.timing(progress, {
                    toValue: percent,
                    duration: 100,
                    useNativeDriver: false
                }).start();
            }

            if (status.didJustFinish) {
                setIsPlaying(false);
                setPosition(0);
                progress.setValue(0);
                // Reset animation
            }
        }
    };

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
                {isPlaying ?
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
                    {formatDuration(position > 0 ? position : duration)}
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
    const { id, product, isGroup, name: paramName, avatar: paramAvatar } = params;
    const router = useRouter();
    const { user } = useUser() as any;
    const { colors, isDark } = useThemeContext();
    const { markChatAsRead, socket } = useMessages();
    const insets = useSafeAreaInsets();
    const width = Dimensions.get('window').width;
    const isDesktop = Platform.OS === 'web' && width > 768;

    // State
    const [messages, setMessages] = useState<any[]>([]);
    const [inputText, setInputText] = useState('');

    // Safely handle id param which can be string or array
    const userId = Array.isArray(id) ? id[0] : id;

    const [recipient, setRecipient] = useState<any>(
        paramName ? { name: paramName, avatar: paramAvatar, _id: userId } : null
    );
    const [chatId, setChatId] = useState<string | null>(null);
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
    const [recording, setRecording] = useState<Audio.Recording | undefined>(undefined);
    const [permissionResponse, requestPermission] = Audio.usePermissions();
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
                try {
                    if (isGroup === 'true') {
                        const chatRes = await ApiClient.get<any>(`/api/chats/${userId}`, { 'Authorization': `Bearer ${user.token}` });
                        if (chatRes.success && chatRes.data) {
                            setChatId(chatRes.data._id);
                            setChat(chatRes.data);
                            const mRes = await ApiClient.get<any[]>(`/api/chats/${chatRes.data._id}/messages?limit=50`, { 'Authorization': `Bearer ${user.token}` });
                            if (mRes.success && mRes.data) {
                                setMessages(mRes.data);
                                if (mRes.data.length < 50) setHasMore(false);
                            }
                        }
                    } else {
                        // Parallel Fetch: User Info & Find/Create Chat
                    const [uRes, cRes] = await Promise.all([
                        ApiClient.get<any>(`/api/auth/user/${userId}`, { 'Authorization': `Bearer ${user.token}` }),
                        ApiClient.post<any>('/api/chats', { userId: userId, isMarketplace: !!product }, { 'Authorization': `Bearer ${user.token}` })
                    ]);

                    if (uRes.success) setRecipient(uRes.data);

                    if (cRes.success && cRes.data) {
                        setChatId(cRes.data._id);
                        setChat(cRes.data);
                        // Initial fetch (limit 50)
                        const mRes = await ApiClient.get<any[]>(`/api/chats/${cRes.data._id}/messages?limit=50`, { 'Authorization': `Bearer ${user.token}` });
                        if (mRes.success && mRes.data) {
                            setMessages(mRes.data);
                            if (mRes.data.length < 50) setHasMore(false);
                        }

                        // Handle Product sharing
                        if (product && !productSentRef.current) {
                            try {
                                const productData = JSON.parse(decodeURIComponent(product as string));
                                // Deduplicate check
                                const lastMsg = mRes.data?.[0]; // Newest is at 0
                                if (lastMsg?.marketitemId?._id === productData.id || lastMsg?.marketitemId === productData.id) {
                                    productSentRef.current = true;
                                    return;
                                }

                                const body = {
                                    content: "Check out this product",
                                    type: 'text',
                                    marketitemId: productData.id
                                };
                                const pRes = await ApiClient.post(`/api/chats/${cRes.data._id}/messages`, body, { 'Authorization': `Bearer ${user.token}` });
                                if (pRes.success) {
                                    setMessages(prev => [pRes.data, ...prev]);
                                    socket?.emit('message:send', { chatId: cRes.data._id, message: pRes.data });
                                }
                                productSentRef.current = true;
                            } catch (e) { console.error("Error sending product:", e); }
                        }
                        }
                    }
                } catch (e) {
                    console.error("Chat Init Error:", e);
                }
            };
            init();
        }, [user, userId, product])
    );

    // 2. Socket Listeners
    useEffect(() => {
        if (!socket || !chatId) return;

        socket.emit('chat:join', chatId);

        const onMsg = (newMsg: any) => {
            if (newMsg.chatId === chatId || newMsg.chat === chatId) {
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
            if (permissionResponse?.status !== 'granted') {
                const resp = await requestPermission();
                if (resp.status !== 'granted') {
                    Alert.alert("Permission Required", "Please allow microphone access to record voice messages.");
                    return;
                }
            }
            await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
            const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
            setRecording(recording);
            setRecordingDuration(0);
            durationInterval.current = setInterval(() => setRecordingDuration(d => d + 1), 1000);
        } catch (err) {
            console.error('Failed to start recording', err);
        }
    };

    const stopRecording = async () => {
        setRecording(undefined);
        clearInterval(durationInterval.current);
        if (!recording) return;

        await recording.stopAndUnloadAsync();
        const uri = recording.getURI();
        if (uri) {
            uploadAudio(uri);
        }
    };

    const cancelRecording = async () => {
        setRecording(undefined);
        clearInterval(durationInterval.current);
        if (recording) {
            await recording.stopAndUnloadAsync();
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
    const renderMessageItem = ({ item }: { item: any }) => {
        if (!item || !user) return null;

        const isMe = item.sender?._id === user._id || item.sender === user._id;
        const reactions = item.reactions || {};
        const reactionKeys = Object.keys(reactions);
        const hasReactions = reactionKeys.length > 0;

        // Reply Block Component
        const ReplyBlock = () => {
            if (!item.replyTo) return null;
            const rMsg = item.replyTo;
            const rSender = rMsg.sender?.name || 'User';
            const rContent = rMsg.type === 'text' ? rMsg.content : (rMsg.type === 'audio' ? 'Voice Message' : 'Media');

            return (
                <View style={{
                    backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                    borderLeftWidth: 3,
                    borderLeftColor: colors.primary,
                    padding: 6,
                    marginBottom: 6,
                    borderRadius: 4
                }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: colors.primary, marginBottom: 2 }}>{rSender}</Text>
                    <Text numberOfLines={1} style={{ fontSize: 11, color: colors.textSecondary }}>{rContent}</Text>
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
                    // ... (existing market item render)
                    // Just wrap existing return in <> to include ReplyBlock?
                    // Actually, shared posts usually don't have replies attached nicely inside the bubble in standard UI,
                    // but we can put it above the card.
                    const isMarket = !!item.marketitemId;
                    const sharedItem = item.marketitemId || item.postId;

                    // Safely extract image URL
                    const rawImageUrl = isMarket
                        ? (sharedItem.images?.[0] || sharedItem.image)
                        : (sharedItem.uri || sharedItem.videoUri);

                    const imageUrl = getCorrectUrl(rawImageUrl);
                    const title = isMarket ? sharedItem.title : (sharedItem.caption || 'Shared Post');
                    const owner = sharedItem.user;

                    return (
                        <View>
                            <ReplyBlock />
                            <TouchableOpacity
                                activeOpacity={0.9}
                                onLongPress={() => setSelectedMessage(item)}
                                onPress={() => {
                                    if (isMarket) {
                                        router.push(`/marketplace/${sharedItem._id}`);
                                    } else {
                                        // Navigate to Media View
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
                                {/* Post Header (Owner) */}
                                {owner && (
                                    <View style={{ flexDirection: 'row', alignItems: 'center', padding: 8, gap: 8 }}>
                                        <AvatarImage uri={owner.avatar} name={owner.name} size={24} />
                                        <Text numberOfLines={1} style={{ fontSize: 12, fontWeight: '600', color: colors.text, flex: 1 }}>{owner.name || owner.username}</Text>
                                    </View>
                                )}

                                {/* Image */}
                                {imageUrl ? (
                                    <ExpoImage source={{ uri: imageUrl }} style={{ width: '100%', height: 220 }} contentFit="cover" />
                                ) : (
                                    <View style={{ width: '100%', height: 220, backgroundColor: isDark ? '#333' : '#E0E0E0', alignItems: 'center', justifyContent: 'center' }}>
                                        <Ionicons name="image-outline" size={40} color={colors.textSecondary} />
                                    </View>
                                )}

                                {/* Footer */}
                                <View style={{ padding: 12 }}>
                                    <Text numberOfLines={2} style={{ fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: 8 }}>
                                        {title}
                                    </Text>
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
                        <VoiceMessage
                            uri={item.content}
                            itemsDuration={item.duration}
                            isMe={isMe}
                            colors={colors}
                        />
                    </View>
                ) : item.type === 'image' ? (
                    <View>
                        <ReplyBlock />
                        <View style={{ borderRadius: 18, overflow: 'hidden', backgroundColor: isDark ? '#262626' : '#F2F2F2' }}>
                            {(() => {
                                const validUri = getCorrectUrl(item.content);
                                if (validUri) {
                                    return <ExpoImage source={{ uri: validUri }} style={{ width: 220, height: 280, borderRadius: 18 }} contentFit="cover" />;
                                }
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
                        minWidth: 100 // Ensure space for reply
                    }}>
                        {/* Reply Block Inside Bubble if Text */}
                        {item.replyTo && (
                            <View style={{
                                backgroundColor: isMe ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)',
                                borderLeftWidth: 3,
                                borderLeftColor: isMe ? 'rgba(255,255,255,0.5)' : colors.primary,
                                padding: 6,
                                margin: 4,
                                marginBottom: 2,
                                borderRadius: 4
                            }}>
                                <Text style={{ fontSize: 11, fontWeight: '700', color: isMe ? 'white' : colors.primary, marginBottom: 2 }}>
                                    {item.replyTo.sender?.name || 'User'}
                                </Text>
                                <Text numberOfLines={1} style={{ fontSize: 11, color: isMe ? 'rgba(255,255,255,0.8)' : colors.textSecondary }}>
                                    {item.replyTo.type === 'text' ? item.replyTo.content : (item.replyTo.type === 'audio' ? 'Voice Message' : 'Media')}
                                </Text>
                            </View>
                        )}

                        {isMe ? (
                            <View style={{ padding: 12, paddingTop: item.replyTo ? 4 : 12, backgroundColor: colors.primary }}>
                                <Text style={{ fontSize: 16, color: '#FFF' }}>{item.content}</Text>
                            </View>
                        ) : (
                            <View style={{ padding: 12, paddingTop: item.replyTo ? 4 : 12 }}>
                                <Text style={{ fontSize: 16, color: colors.text }}>{item.content}</Text>
                            </View>
                        )}
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

        return content;
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
                        <TouchableOpacity 
                            style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }} 
                            onPress={() => router.push(`/message/user-info/${userId}`)}
                        >
                            <AvatarImage uri={recipient.avatar} name={recipient.name} size={isDesktop ? 40 : 36} />
                            <View style={{ marginLeft: 12, flex: 1 }}>
                                <Text numberOfLines={1} style={{ fontSize: isDesktop ? 18 : 16, fontWeight: '700', color: colors.text }}>{recipient.name}</Text>
                                <Text numberOfLines={1} style={{ fontSize: 12, color: colors.textSecondary }}>{isTyping ? 'Typing...' : (recipient.username || 'View profile')}</Text>
                            </View>
                        </TouchableOpacity>
                    ) : (
                        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                            <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: isDark ? '#262626' : '#EEE' }} />
                        </View>
                    )}
                </View>

                <View style={{ flexDirection: 'row', gap: isDesktop ? 28 : 24, alignItems: 'center', paddingRight: isDesktop ? 20 : 8 }}>
                    <TouchableOpacity><Ionicons name="call-outline" size={24} color={colors.text} /></TouchableOpacity>
                    <TouchableOpacity><Ionicons name="videocam-outline" size={26} color={colors.text} /></TouchableOpacity>
                </View>
            </View>

            {/* List */}
            <KeyboardAvoidingView
                style={{ flex: 1, backgroundColor: chat?.theme || colors.background }}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 0}
            >
                <View style={{ flex: 1 }}>
                    <FlatList
                        ref={flatListRef}
                        data={messages}
                        inverted
                        keyExtractor={item => item._id}
                        onEndReached={loadMoreMessages}
                        onEndReachedThreshold={0.5}
                        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 10 }}
                        renderItem={renderMessageItem}
                        ListFooterComponent={loadingMore ? <ActivityIndicator color={colors.primary} /> : null}
                        onScroll={(event) => {
                            const offsetY = event.nativeEvent.contentOffset.y;
                            setShowScrollBottom(offsetY > 200);
                        }}
                        scrollEventThrottle={16}
                    />
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
                    paddingBottom: insets.bottom + 10,
                }}>
                    {/* Replying To Banner */}
                    {replyingTo && (
                        <View style={{
                            flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                            paddingHorizontal: 16, paddingVertical: 8,
                            backgroundColor: isDark ? '#1a1a1a' : '#f0f0f0',
                            borderLeftWidth: 4, borderLeftColor: colors.primary
                        }}>
                            <View>
                                <Text style={{ fontWeight: '700', color: colors.text }}>Replying to {replyingTo.sender === user?._id ? 'Yourself' : 'User'}</Text>
                                <Text numberOfLines={1} style={{ color: colors.textSecondary, fontSize: 12 }}>
                                    {replyingTo.type === 'text' ? replyingTo.content : `[${replyingTo.type}]`}
                                </Text>
                            </View>
                            <TouchableOpacity onPress={() => setReplyingTo(null)}>
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
                        {recording ? (
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
                    <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
                        <TouchableWithoutFeedback>
                            <View style={{
                                width: '80%', backgroundColor: isDark ? '#1a1a1a' : '#FFF',
                                borderRadius: 16, padding: 20, gap: 16,
                                shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84, elevation: 5
                            }}>
                                {/* Reactions */}
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
                                    {['❤️', '😂', '😮', '😢', '👍'].map(emoji => (
                                        <TouchableOpacity key={emoji} onPress={() => handleAction('react', emoji)} style={{ padding: 8 }}>
                                            <Text style={{ fontSize: 24 }}>{emoji}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>

                                <View style={{ height: 1, backgroundColor: isDark ? '#333' : '#EEE' }} />

                                {/* Actions */}
                                <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 }} onPress={() => handleAction('reply')}>
                                    <Ionicons name="arrow-undo-outline" size={20} color={colors.text} />
                                    <Text style={{ fontSize: 16, color: colors.text, fontWeight: '500' }}>Reply</Text>
                                </TouchableOpacity>

                                <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 }} onPress={() => handleAction('copy')}>
                                    <Ionicons name="copy-outline" size={20} color={colors.text} />
                                    <Text style={{ fontSize: 16, color: colors.text, fontWeight: '500' }}>Copy</Text>
                                </TouchableOpacity>

                                {selectedMessage?.type === 'image' && (
                                    <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 }} onPress={() => handleAction('download')}>
                                        <Ionicons name="cloud-download-outline" size={20} color={colors.text} />
                                        <Text style={{ fontSize: 16, color: colors.text, fontWeight: '500' }}>Save Image</Text>
                                    </TouchableOpacity>
                                )}

                                <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 }} onPress={() => handleAction('forward')}>
                                    <Ionicons name="arrow-redo-outline" size={20} color={colors.text} />
                                    <Text style={{ fontSize: 16, color: colors.text, fontWeight: '500' }}>Forward</Text>
                                </TouchableOpacity>

                                {(selectedMessage?.sender?._id === user?._id || selectedMessage?.sender === user?._id) && selectedMessage?.type === 'text' && (
                                    <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 }} onPress={() => handleAction('edit')}>
                                        <Ionicons name="pencil-outline" size={20} color={colors.text} />
                                        <Text style={{ fontSize: 16, color: colors.text, fontWeight: '500' }}>Edit</Text>
                                    </TouchableOpacity>
                                )}

                                {(selectedMessage?.sender?._id === user?._id || selectedMessage?.sender === user?._id) && (
                                    <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 }} onPress={() => handleAction('delete')}>
                                        <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                                        <Text style={{ fontSize: 16, color: '#FF3B30', fontWeight: '500' }}>Delete Message</Text>
                                    </TouchableOpacity>
                                )}
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
    }
});
