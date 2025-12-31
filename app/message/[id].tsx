import { API_BASE_URL } from '@/constants/Config';
import { useMessages } from '@/context/MessagesContext';
import { useUser } from '@/context/UserContext';
import { ApiClient } from '@/utils/api';
import { Audio as ExpoAudio } from 'expo-av';
import * as Clipboard from 'expo-clipboard';
import * as FileSystem from 'expo-file-system/legacy';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Archive, ArrowLeft, BellOff, Check, CheckCheck, ChevronDown, Copy, CornerUpRight, Download, Forward, Image as ImageIcon, Mic, MoreHorizontal, Pause, Phone, Play, Reply, Send, Trash2, Video, X } from 'lucide-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    FlatList,
    Image,
    KeyboardAvoidingView,
    Linking,
    Modal,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';


import { ApiClient } from '@/utils/api';
import ErrorHandler from '@/utils/ErrorHandler';

interface Message {
    _id: string;
    content: string;
    sender: { _id: string; avatar: string; name: string } | string;
    createdAt: string;
    type: string;
    postId?: { _id: string; uri: string; videoUri: string; image?: string };
    readBy?: string[];
    duration?: number;
    reactions?: { [key: string]: string[] }; // emoji -> Array of userIds
    replyTo?: Message;
    expireAt?: string; // Added expireAt
}

// Helper function to format last seen time
function formatLastSeen(lastSeen?: Date | string): string {
    if (!lastSeen) return 'recently';

    const now = new Date();
    const lastSeenDate = new Date(lastSeen);
    const diffMs = now.getTime() - lastSeenDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return lastSeenDate.toLocaleDateString();
}

const getCorrectUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('/uploads/')) return `${API_BASE_URL}${url}`;
    if (url.includes('/uploads/')) {
        const parts = url.split('/uploads/');
        return `${API_BASE_URL}/uploads/${parts[1]}`;
    }
    return url;
};

function MessageScreen() {
    const params = useLocalSearchParams(); // This is the user ID of the person we are chatting with
    const { id } = params;
    const router = useRouter();
    const context = useUser();
    const user = (context as any)?.user;
    const { markChatAsRead, socket } = useMessages();
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isUploading, setIsUploading] = useState(false);

    // Search Mode State
    const [isSearchMode, setIsSearchMode] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');


    useEffect(() => {
        if (params.search) { // Check if we navigated here with search intent (e.g. from UserInfo)
            setIsSearchMode(true);
        }
    }, [params]);

    // Derived messages



    const [chatId, setChatId] = useState<string | null>(null);
    const [recipient, setRecipient] = useState<any>(null);
    const [isTyping, setIsTyping] = useState(false);
    const [recipientTyping, setRecipientTyping] = useState(false);
    const [isRecipientOnline, setIsRecipientOnline] = useState(false);
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const [showMenu, setShowMenu] = useState(false);
    const [showColorPicker, setShowColorPicker] = useState(false);
    const [backgroundColor, setBackgroundColor] = useState('#ffffff');
    const [recording, setRecording] = useState<ExpoAudio.Recording | null>(null);
    const [sound, setSound] = useState<ExpoAudio.Sound | null>(null);
    const flatListRef = useRef<FlatList>(null);
    const pollingIntervalRef = useRef<any>(null);

    // Recording animation
    const recordingScale = useRef(new Animated.Value(1)).current;
    const recordingOpacity = useRef(new Animated.Value(1)).current;
    const isRecordingRef = useRef(false); // Flag to prevent multiple recordings

    // Recording timer
    // Recording timer
    const [recordingDuration, setRecordingDuration] = useState(0);
    const recordingTimerRef = useRef<NodeJS.Timeout | number | null>(null);
    const recordingStartTimeRef = useRef<number>(0);

    // Message options state
    const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
    const [messageOptionsVisible, setMessageOptionsVisible] = useState(false);

    // Playing State
    const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
    const [playbackStatus, setPlaybackStatus] = useState<any>(null); // Track absolute playback status
    const [replyingTo, setReplyingTo] = useState<Message | null>(null);

    // Safe Area Insets
    const insets = useSafeAreaInsets();

    // Scroll state
    const [showScrollBottom, setShowScrollBottom] = useState(false);

    // Forwarding State
    const [forwardModalVisible, setForwardModalVisible] = useState(false);
    const [followingList, setFollowingList] = useState<any[]>([]);
    const [loadingFollowing, setLoadingFollowing] = useState(false);
    const fetchFollowingList = async () => {
        if (!user?._id) return;
        setLoadingFollowing(true);
        try {
            const res = await ApiClient.get<any[]>(`/api/auth/following/${user._id}`, {
                'Authorization': `Bearer ${user.token}`
            });

            if (res.success && res.data) {
                setFollowingList(res.data);
            } else {
                ErrorHandler.show(res.message, 'toast');
            }
        } catch (error) {
            ErrorHandler.log("Fetch Following Error", error);
        } finally {
            setLoadingFollowing(false);
        }
    };

    const handleForwardMessage = async (recipientId: string) => {
        if (!selectedMessage || !user?.token || !recipientId) return;

        setForwardModalVisible(false);

        try {
            // Initiate/Find chat with recipient
            const chatRes = await ApiClient.post<any>('/api/chats',
                { userId: recipientId },
                { 'Authorization': `Bearer ${user.token}` }
            );

            if (!chatRes.success || !chatRes.data) {
                ErrorHandler.show("Could not find chat to forward to.", 'alert');
                return;
            }

            const targetChatId = chatRes.data._id;

            // Send message to that chat
            const messageData = {
                content: selectedMessage.content,
                type: selectedMessage.type || 'text',

            };

            const sendRes = await ApiClient.post(`/api/chats/${targetChatId}/messages`,
                messageData,
                { 'Authorization': `Bearer ${user.token}` }
            );

            if (sendRes.success) {
                Alert.alert('Success', 'Message forwarded successfully');
            } else {
                ErrorHandler.show(sendRes.message, 'alert');
            }

        } catch (error) {
            ErrorHandler.log("Forward Message Error", error);
            Alert.alert('Error', 'Failed to forward message');
        }
    };

    // Filtered following list
    const filteredFollowing = followingList.filter(user =>
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.handle?.toLowerCase().includes(searchQuery.toLowerCase())
    );



    // Cleanup sound on unmount
    useEffect(() => {
        return () => {
            if (sound) {
                sound.unloadAsync();
            }
        };
    }, [sound]);

    // Initial load: Get or Create Chat, then fetch messages
    useEffect(() => {
        const initChat = async () => {
            if (!user?._id || !id) return;

            try {
                console.log('🔄 Initializing chat with user:', id);
                console.log('📡 API Base URL:', API_BASE_URL);

                // 1. Fetch recipient details
                const userRes = await ApiClient.get<any>(`/api/auth/user/${id}`, {
                    'Authorization': `Bearer ${user.token}`
                });

                if (userRes.success) {
                    setRecipient(userRes.data);
                    setIsRecipientOnline(userRes.data.isOnline);
                }

                // 2. Get or Create Chat
                const chatRes = await ApiClient.post<any>('/api/chats', { userId: id }, {
                    'Authorization': `Bearer ${user.token}`
                });

                if (chatRes.success && chatRes.data) {
                    const chatData = chatRes.data;
                    setChatId(chatData._id);
                    if (chatData.theme) setBackgroundColor(chatData.theme);

                    // Fallback: If recipient fetch failed but we have chat data, use participant info
                    if (!recipient && chatData.participants) {
                        const other = chatData.participants.find((p: any) => p._id !== user._id);
                        if (other) {
                            setRecipient(other);
                            setIsRecipientOnline(other.isOnline);
                        }
                    }

                    fetchMessages(chatData._id);
                } else {
                    ErrorHandler.show(chatRes.message || 'Failed to initialize chat', 'alert');
                    router.back();
                }

            } catch (error: any) {
                ErrorHandler.log("Chat Init Error", error);
                Alert.alert(
                    'Connection Error',
                    'Failed to initialize chat. Please check your connection.',
                    [{ text: 'Retry', onPress: initChat }, { text: 'Back', onPress: router.back }]
                );
            } finally {
                setIsLoading(false);
            }
        };

        if (user && id) {
            initChat();
        }
    }, [user, id]);

    // Socket events for real-time
    useEffect(() => {
        if (!socket || !chatId) return;

        console.log('🔗 Joining chat room:', chatId);
        socket.emit('chat:join', chatId);

        const handleNewMessage = (message: any) => {
            if (!message || !message._id) {
                console.warn('Received invalid message:', message);
                return;
            }
            console.log('📩 New message received via socket');
            setMessages(prev => {
                if (prev.find(m => m?._id === message._id)) return prev;
                return [message, ...prev];
            });

            markChatAsRead(chatId);
        };

        const handleTyping = (data: any) => {
            if (data.isTyping) {
                setRecipientTyping(true);
            } else {
                setRecipientTyping(false);
            }
        };

        const handleUserStatus = (data: any) => {
            if (data.userId === id) {
                setIsRecipientOnline(data.isOnline);
            }
        };

        const handleReaction = (data: any) => {
            const { messageId, emoji, userId } = data;
            setMessages(prev => prev.map(m => {
                if (m._id === messageId) {
                    const reactions = { ...(m.reactions || {}) };
                    const userList = reactions[emoji] || [];
                    if (userList.includes(userId)) {
                        reactions[emoji] = userList.filter(id => id !== userId);
                        if (reactions[emoji].length === 0) delete reactions[emoji];
                    } else {
                        reactions[emoji] = [...userList, userId];
                    }
                    return { ...m, reactions };
                }
                return m;
            }));
        };

        socket.on('message:new', handleNewMessage);
        socket.on('typing:user', handleTyping);
        socket.on('user:status', handleUserStatus);
        socket.on('message:react', handleReaction);

        return () => {
            socket.off('message:new', handleNewMessage);
            socket.off('typing:user', handleTyping);
            socket.off('user:status', handleUserStatus);
            socket.off('message:react', handleReaction);
        };
    }, [socket, chatId, id]);

    // Typing emission logic
    useEffect(() => {
        if (!socket || !chatId) return;

        if (inputText.length > 0) {
            socket.emit('typing:start', { chatId, userName: user?.name });

            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

            typingTimeoutRef.current = setTimeout(() => {
                socket.emit('typing:stop', { chatId });
            }, 3000) as any;
        } else {
            socket.emit('typing:stop', { chatId });
        }
    }, [inputText, socket, chatId]);

    const fetchMessages = async (currentChatId: string) => {
        if (!user?.token) return;
        try {
            const res = await ApiClient.get<Message[]>(`/api/chats/${currentChatId}/messages`, {
                'Authorization': `Bearer ${user.token}`
            });

            if (res.success && res.data) {
                // Reverse for FlatList inverted
                setMessages([...res.data].reverse());
                await markChatAsRead(currentChatId);
            }
        } catch (error) {
            ErrorHandler.log("Fetch Messages Error", error);
        }
    };

    const handleImagePick = async () => {
        // Request permissions
        const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (permissionResult.granted === false) {
            Alert.alert("Permission required", "You need to grant permission to access your photos to send images.");
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true, // Optional: allow editing before sending
            aspect: [4, 3],
            quality: 0.8,
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
            uploadImage(result.assets[0].uri);
        }
    };

    const uploadImage = async (uri: string) => {
        if (!chatId || !user?.token) return;

        // Create form data
        const formData = new FormData();

        // Robust filename and type handling
        let filename = uri.split('/').pop() || `image_${Date.now()}.jpg`;
        const match = /\.(\w+)$/.exec(filename);
        let type = match ? `image/${match[1].toLowerCase()}` : 'image/jpeg';

        // Correct common mime types
        if (type === 'image/jpg') type = 'image/jpeg';
        if (!match) {
            filename += '.jpg';
        }

        console.log('📤 Uploading image:', { uri, filename, type });

        if (Platform.OS === 'web') {
            const response = await fetch(uri);
            const blob = await response.blob();
            formData.append('image', blob, filename);
        } else {
            formData.append('image', {
                uri: uri,
                name: filename,
                type,
            } as any);
        }

        try {
            // 2. Upload image - uses standard fetch inside ApiClient? No, upload logic is usually special due to FormData. 
            // We can keep the FormData logic but wrap the error handling or extend ApiClient.
            // For now, let's keep the upload fetch tailored but clean it up.

            const uploadRes = await fetch(`${API_BASE_URL}/api/upload`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${user.token}`,
                },
                body: formData
            });

            if (!uploadRes.ok) throw new Error('Failed to upload image');

            const uploadData = await uploadRes.json();
            const imageUrl = uploadData.url;

            sendMessage(imageUrl, 'image');

        } catch (error) {
            ErrorHandler.show(error, 'alert');
        }
    };


    // Force cleanup of any existing recordings
    const forceCleanupRecording = async () => {
        try {
            console.log('🧹 Force cleanup - resetting audio mode...');
            // Reset audio mode to clear any stuck recordings
            await ExpoAudio.setAudioModeAsync({
                allowsRecordingIOS: false,
                playsInSilentModeIOS: false,
            });

            // Small delay
            await new Promise(resolve => setTimeout(resolve, 100));

            console.log('✅ Audio mode reset complete');
        } catch (error) {
            console.warn('⚠️ Cleanup error:', error);
        }
    };

    async function startRecording() {
        try {
            // Prevent multiple recordings at once
            if (isRecordingRef.current) {
                console.log('⚠️ Already recording, ignoring');
                return;
            }

            // FORCE cleanup first - reset audio mode to clear stuck recordings
            await forceCleanupRecording();

            // Ensure any previous recording is completely unloaded
            if (recording) {
                try {
                    await recording.stopAndUnloadAsync();
                } catch (unloadError) {
                    console.log('Previous recording already unloaded or error:', unloadError);
                }
                setRecording(null);
                // Longer delay to ensure cleanup is complete
                await new Promise(resolve => setTimeout(resolve, 200));
            }

            const permission = await ExpoAudio.requestPermissionsAsync();
            if (permission.status === 'granted') {
                // Set audio mode with more complete configuration
                try {
                    await ExpoAudio.setAudioModeAsync({
                        allowsRecordingIOS: true,
                        playsInSilentModeIOS: true,
                        staysActiveInBackground: false,
                        shouldDuckAndroid: true,
                        playThroughEarpieceAndroid: false,
                    });

                    // Give audio mode time to settle
                    await new Promise(resolve => setTimeout(resolve, 100));
                } catch (audioModeError) {
                    console.warn('Audio mode setup warning:', audioModeError);
                    // Continue anyway
                }

                const { recording: newRecording } = await ExpoAudio.Recording.createAsync(
                    ExpoAudio.RecordingOptionsPresets.HIGH_QUALITY
                );
                setRecording(newRecording);
                isRecordingRef.current = true; // Mark as recording

                // Start timer
                recordingStartTimeRef.current = Date.now();
                setRecordingDuration(0);
                recordingTimerRef.current = setInterval(() => {
                    const elapsed = Math.floor((Date.now() - recordingStartTimeRef.current) / 1000);
                    setRecordingDuration(elapsed);
                }, 1000);

                // Start pulsing animation
                Animated.loop(
                    Animated.sequence([
                        Animated.parallel([
                            Animated.timing(recordingScale, {
                                toValue: 1.3,
                                duration: 800,
                                useNativeDriver: true,
                            }),
                            Animated.timing(recordingOpacity, {
                                toValue: 0.6,
                                duration: 800,
                                useNativeDriver: true,
                            }),
                        ]),
                        Animated.parallel([
                            Animated.timing(recordingScale, {
                                toValue: 1,
                                duration: 800,
                                useNativeDriver: true,
                            }),
                            Animated.timing(recordingOpacity, {
                                toValue: 1,
                                duration: 800,
                                useNativeDriver: true,
                            }),
                        ]),
                    ])
                ).start();
            } else {
                Alert.alert('Permission required', 'Permission to access microphone is required!');
            }
        } catch (err: any) {
            console.error('Failed to start recording', err);
            Alert.alert('Recording Error', err.message || 'Failed to start recording');
            setRecording(null);
        }
    }

    async function stopRecording() {
        console.log('🛑 stopRecording called, recording exists:', !!recording);
        if (!recording || !isRecordingRef.current) return;

        isRecordingRef.current = false; // Clear flag immediately

        // Stop timer
        if (recordingTimerRef.current) {
            clearInterval(recordingTimerRef.current);
            recordingTimerRef.current = null;
        }

        // Calculate final duration from elapsed time (more accurate)
        const elapsed = Math.floor((Date.now() - recordingStartTimeRef.current) / 1000);
        const finalDuration = Math.max(1, elapsed); // Minimum 1 second
        console.log('⏱️ Elapsed:', elapsed, 'Final duration:', finalDuration, 'seconds');

        // Stop animation
        recordingScale.stopAnimation();
        recordingOpacity.stopAnimation();
        Animated.parallel([
            Animated.timing(recordingScale, {
                toValue: 1,
                duration: 200,
                useNativeDriver: true,
            }),
            Animated.timing(recordingOpacity, {
                toValue: 1,
                duration: 200,
                useNativeDriver: true,
            }),
        ]).start();

        try {
            const currentRecording = recording;

            // Get URI BEFORE stopping/unloading to prevent "Recorder does not exist" error
            const uri = currentRecording.getURI();
            console.log('🎤 Recording URI:', uri);

            // Now clear state
            setRecording(null);

            try {
                await currentRecording.stopAndUnloadAsync();
                console.log('✅ Recording stopped and unloaded');
            } catch (unloadError: any) {
                // If it's already unloaded, just ignore
                if (unloadError.message && unloadError.message.includes('already been unloaded')) {
                    console.log('Recording already unloaded, skipping.');
                } else {
                    console.warn('⚠️ Unload error:', unloadError);
                    // Continue anyway, we have the URI
                }
            }

            if (uri) {
                console.log('📤 Starting voice message upload...');
                // Upload Audio Logic inline
                const formData = new FormData();

                if (Platform.OS === 'web') {
                    const response = await fetch(uri);
                    const blob = await response.blob();
                    formData.append('image', blob, 'audio.m4a');
                } else {
                    formData.append('image', { uri: uri, name: 'audio.m4a', type: 'audio/m4a' } as any);
                }

                console.log('📡 Uploading to:', `${API_BASE_URL}/api/upload`);
                const uploadRes = await fetch(`${API_BASE_URL}/api/upload`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${user.token}`,
                        'Accept': 'application/json',
                    },
                    body: formData
                });

                console.log('📥 Upload response status:', uploadRes.status);

                if (uploadRes.ok) {
                    const data = await uploadRes.json();
                    console.log('✅ Upload successful, URL:', data.url);
                    sendMessage(data.url, 'audio', finalDuration); // Send with duration
                    console.log('✅ Audio message sent with duration:', finalDuration, 'seconds');
                } else {
                    // Read response as text first to avoid "Already read" error
                    const responseText = await uploadRes.text();
                    console.error('❌ Upload failed:', uploadRes.status, responseText);

                    // Try to parse as JSON
                    try {
                        const errorData = JSON.parse(responseText);
                        Alert.alert('Upload Failed', errorData.message || 'Server error');
                    } catch (parseError) {
                        // If not JSON, show the text response
                        Alert.alert('Upload Failed', `Server returned ${uploadRes.status}: ${responseText.substring(0, 100)}`);
                    }
                }
            } else {
                console.error('❌ No URI from recording!');
                Alert.alert('Error', 'Failed to get recording URI');
            }
        } catch (e) {
            console.error('❌ Error stopping or uploading recording:', e);
            Alert.alert('Error', 'Failed to send voice message');
        }
    }

    const playAudio = useCallback(async (uri: string, messageId: string) => {
        try {
            // Check if tapping the same message that is playing
            if (playingMessageId === messageId && sound) {
                console.log('⏸️ Pausing/Stopping current sound...');
                await sound.stopAsync();
                await sound.unloadAsync();
                setSound(null);
                setPlayingMessageId(null);
                return;
            }

            console.log('🔊 playAudio called with URI:', uri);

            // Validate URI
            if (!uri || uri.trim() === '') {
                console.error('❌ Invalid URI: empty or null');
                Alert.alert('Error', 'Invalid audio file URL');
                return;
            }

            // Convert relative URL to absolute URL
            let fullUri = uri;
            if (uri.startsWith('/uploads/')) {
                fullUri = `${API_BASE_URL}${uri}`;
                console.log('🔄 Converted relative URL to:', fullUri);
            }

            // Clean up previous sound if playing a different one
            if (sound) {
                console.log('🧹 Cleaning up previous sound...');
                await sound.unloadAsync();
                setSound(null);
            }

            // Set audio mode for playback
            console.log('🎵 Setting audio mode for playback...');
            await ExpoAudio.setAudioModeAsync({
                allowsRecordingIOS: false,
                staysActiveInBackground: false,
                playsInSilentModeIOS: true,
                shouldDuckAndroid: true,
                playThroughEarpieceAndroid: false,
            });

            console.log('📥 Creating sound object from URI:', fullUri);
            const { sound: newSound } = await ExpoAudio.Sound.createAsync(
                { uri: fullUri },
                { shouldPlay: true }
            );

            setSound(newSound);
            setPlayingMessageId(messageId); // Set currently playing ID
            console.log('✅ Audio playing successfully!');

            // Reset sound when finished
            newSound.setOnPlaybackStatusUpdate((status) => {
                if (status.isLoaded) {
                    setPlaybackStatus(status);
                    if (status.didJustFinish) {
                        newSound.unloadAsync();
                        setSound(null);
                        setPlayingMessageId(null);
                        setPlaybackStatus(null);
                    }
                }
            });
        } catch (error: any) {
            console.error('❌ Error playing audio:', error);
            setPlayingMessageId(null);
            setPlaybackStatus(null);
            Alert.alert('Playback Error', 'Could not play audio.');
        }
    }, [sound, playingMessageId]);

    const sendMessage = useCallback(async (content: string, type: string = 'text', duration?: number) => {
        if (!chatId || !user) return;
        try {
            const messageData: any = { content, type };
            if (duration !== undefined) {
                messageData.duration = duration; // Add duration for audio messages
            }
            if (replyingTo) {
                messageData.replyTo = replyingTo._id;
            }

            const res = await ApiClient.post(`/api/chats/${chatId}/messages`,
                messageData,
                { 'Authorization': `Bearer ${user.token}` }
            );

            if (res.success) {
                if (socket) {
                    socket.emit('message:send', res.data);
                }
                setMessages(prev => [res.data, ...prev]);
                setInputText('');
                setReplyingTo(null);
            } else {
                ErrorHandler.show(res.message, 'toast');
            }
        } catch (error) {
            ErrorHandler.log("Send Message Error", error);
            Alert.alert("Error", "Message could not be sent.");
        }
    }, [chatId, user, socket, replyingTo]);


    const handleSendText = () => {
        if (!inputText.trim()) return;
        sendMessage(inputText.trim(), 'text');
        setInputText('');
        setReplyingTo(null);
    };

    const handleMessageAction = async (action: string) => {
        if (!selectedMessage) return;
        setMessageOptionsVisible(false);

        switch (action) {
            case 'copy':
                await Clipboard.setStringAsync(selectedMessage.content);
                Alert.alert('Copied', 'Message copied to clipboard');
                break;
            case 'delete':
                if ((typeof selectedMessage.sender === 'string' ? selectedMessage.sender : selectedMessage.sender._id) !== user?._id) {
                    Alert.alert('Error', 'You can only delete your own messages');
                    return;
                }
                Alert.alert(
                    'Delete Message',
                    'Are you sure you want to delete this message?',
                    [
                        {
                            text: 'Cancel',
                            style: 'cancel'
                        },
                        {
                            text: 'Delete',
                            style: 'destructive',
                            onPress: async () => {
                                // Optimistic update
                                setMessages(prev => prev.filter(m => m._id !== selectedMessage._id));

                                try {
                                    const res = await ApiClient.delete(`/api/chats/${chatId}/messages/${selectedMessage._id}`, {
                                        'Authorization': `Bearer ${user?.token}`
                                    });

                                    if (!res.success) {
                                        ErrorHandler.show(res.message, 'alert');
                                        // Could revert optimistic update here if needed by refetching
                                    }
                                } catch (error) {
                                    console.error('Delete error:', error);
                                    ErrorHandler.log('Delete Message Error', error);
                                    Alert.alert('Error', 'Could not delete message');
                                }
                            }
                        }
                    ]
                );
                break;
            case 'reply':
                setReplyingTo(selectedMessage);
                break;
            case 'forward':
                setForwardModalVisible(true);
                fetchFollowingList();
                return;
            case 'download':
                if (selectedMessage) {
                    let downloadUrl = '';
                    let type = selectedMessage.type;

                    if (selectedMessage.postId) {
                        // Shared post content
                        downloadUrl = selectedMessage.postId.videoUri || selectedMessage.postId.image || selectedMessage.postId.uri;
                        if (selectedMessage.postId.videoUri) type = 'video';
                        else if (selectedMessage.postId.image || selectedMessage.postId.uri) type = 'image';
                    } else if (['image', 'video', 'reel'].includes(selectedMessage.type)) {
                        // Direct media message
                        downloadUrl = selectedMessage.content;
                    }

                    if (!downloadUrl) {
                        Toast.show({
                            type: 'error',
                            text1: 'Error',
                            text2: 'No downloadable content found'
                        });
                        break;
                    }

                    const url = getCorrectUrl(downloadUrl);
                    const isVideo = type === 'video' || type === 'reel' || url.endsWith('.mp4');
                    const ext = isVideo ? '.mp4' : '.jpg';
                    const filename = `vibe_${Date.now()}${ext}`;

                    console.log('⬇️ Attempting download:', url);

                    if (Platform.OS === 'web') {
                        try {
                            const response = await fetch(url, { mode: 'cors' });
                            const blob = await response.blob();
                            const blobUrl = window.URL.createObjectURL(blob);

                            const link = document.createElement('a');
                            link.href = blobUrl;
                            link.download = filename;
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                            window.URL.revokeObjectURL(blobUrl);

                            Toast.show({
                                type: 'success',
                                text1: 'Download Started',
                                text2: 'File is being saved'
                            });
                        } catch (e: any) {
                            console.error('Web download error:', e);
                            Alert.alert('Download Error', 'Failed to download file on web.');
                        }
                    } else {
                        // NATIVE (iOS / Android) Logic
                        try {
                            // 1. Request Permissions
                            const { status } = await MediaLibrary.requestPermissionsAsync();

                            if (status !== 'granted') {
                                Alert.alert(
                                    'Permission Required',
                                    'Vibe needs access to your photos to save media.',
                                    [
                                        { text: 'Cancel', style: 'cancel' },
                                        { text: 'Open Settings', onPress: () => Linking.openSettings() }
                                    ]
                                );
                                break;
                            }

                            Toast.show({
                                type: 'info',
                                text1: 'Downloading...',
                                visibilityTime: 2000
                            });

                            // 2. Define Download Path (Cache is safe)
                            const fileUri = `${(FileSystem as any).cacheDirectory}${filename}`;

                            // 3. Download File
                            const downloadRes = await (FileSystem as any).downloadAsync(url, fileUri);

                            if (downloadRes.status !== 200) {
                                throw new Error(`Download failed with status ${downloadRes.status}`);
                            }

                            // 4. Save to Media Library (Gallery)
                            const asset = await MediaLibrary.createAssetAsync(downloadRes.uri);

                            // 5. Organize into Album (Optional but nice)
                            try {
                                const albumName = 'Vibe';
                                const album = await MediaLibrary.getAlbumAsync(albumName);
                                if (album) {
                                    await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
                                } else {
                                    await MediaLibrary.createAlbumAsync(albumName, asset, false);
                                }
                            } catch (albumError) {
                                console.warn('Album creation skipped:', albumError);
                                // Fallback: Asset is already created/saved in "Recents" by createAssetAsync
                            }

                            Toast.show({
                                type: 'success',
                                text1: 'Saved to Gallery',
                                text2: 'Check your Vibe album!'
                            });

                        } catch (error: any) {
                            console.error('Native download error:', error);
                            Alert.alert('Save Error', 'Failed to save media to gallery.');
                        }
                    }
                }
                break;
        }
        setSelectedMessage(null);
    };

    // Duplicate functions removed.

    // Duplicate functions removed.

    const handleMessageReaction = async (messageId: string, emoji: string) => {
        if (!chatId || !user?._id) return;

        // Optimistic Update
        setMessages(prev => prev.map(m => {
            if (m._id === messageId) {
                const reactions = { ...(m.reactions || {}) };
                const userList = reactions[emoji] || [];

                if (userList.includes(user._id)) {
                    // Remove reaction
                    reactions[emoji] = userList.filter(id => id !== user._id);
                    if (reactions[emoji].length === 0) delete reactions[emoji];
                } else {
                    // Add reaction
                    reactions[emoji] = [...userList, user._id];
                }
                return { ...m, reactions };
            }
            return m;
        }));

        // Emit over socket for real-time
        socket?.emit('message:react', { chatId, messageId, emoji, userId: user._id });

        // Save to database
        try {
            await fetch(`${API_BASE_URL}/api/chats/${chatId}/messages/${messageId}/react`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${user.token}`
                },
                body: JSON.stringify({ emoji })
            });
        } catch (error) {
            console.error('Reaction error:', error);
        }
    };

    // Helper to format duration
    const formatDuration = (millis: number) => {
        const totalSeconds = Math.floor(millis / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    // Memoized render item
    const renderMessage = useCallback(({ item }: { item: Message }) => {
        return (
            <MessageItem
                item={item}
                userId={user?._id}
                playAudio={playAudio}
                router={router}
                onOpenOptions={(msg: Message) => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    setSelectedMessage(msg);
                    setMessageOptionsVisible(true);
                }}
                isPlaying={playingMessageId === item._id}
                playbackStatus={playingMessageId === item._id ? playbackStatus : null}
            />
        );
    }, [user?._id, playAudio, router, playingMessageId, playbackStatus]);

    // Filter messages for search
    const displayMessages = React.useMemo(() => {
        let filtered = messages;
        if (searchQuery.trim()) {
            filtered = messages.filter(m =>
                m.content && m.content.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }
        // Backend returns [Oldest, ..., Newest]
        // Inverted FlatList renders data[0] at the BOTTOM.
        // To show Newest at Bottom, data[0] must be Newest.
        // So we reverse the array.
        return [...filtered].reverse();
    }, [messages, searchQuery]);




    return (
        <View style={[styles.container, { backgroundColor }]}>
            <StatusBar barStyle="dark-content" backgroundColor="#fff" />

            {/* HEADER */}
            <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
                {isSearchMode ? (
                    <View style={styles.searchHeaderContainer}>
                        <TouchableOpacity
                            style={{ padding: 4 }}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            onPress={() => {
                                setIsSearchMode(false);
                                setSearchQuery('');
                                router.back();
                            }}>
                            <ArrowLeft size={24} color="#1F2937" />
                        </TouchableOpacity>
                        <TextInput
                            style={styles.headerSearchInput}
                            placeholder="Search messages..."
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            autoFocus
                        />
                    </View>
                ) : (
                    <View style={styles.headerContentContainer}>
                        <View style={styles.headerLeft}>
                            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                                <ArrowLeft size={24} color="#1F2937" />
                            </TouchableOpacity>

                            {recipient ? (
                                <TouchableOpacity style={styles.userInfoBtn} onPress={() => router.push(`/message/user-info/${recipient._id}` as any)}>
                                    <View style={styles.avatarContainer}>
                                        <Image source={{ uri: getCorrectUrl(recipient.avatar || 'https://i.pravatar.cc/100?u=' + recipient._id) }} style={styles.headerAvatar} />
                                        {(isRecipientOnline || recipient.isOnline) && <View style={styles.onlineBadge} />}
                                    </View>
                                    <View style={styles.headerTextContainer}>
                                        <Text style={styles.headerName} numberOfLines={1}>{recipient.name}</Text>
                                        <Text style={styles.headerStatus} numberOfLines={1}>
                                            {recipientTyping ? 'Typing...' : (isRecipientOnline || recipient.isOnline ? 'Online' : formatLastSeen(recipient.lastSeen))}
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            ) : (
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                    <View style={[styles.headerAvatar, { backgroundColor: '#f0f0f0' }]} />
                                    <View>
                                        <View style={{ width: 100, height: 16, backgroundColor: '#f0f0f0', borderRadius: 4, marginBottom: 4 }} />
                                        <View style={{ width: 60, height: 12, backgroundColor: '#f0f0f0', borderRadius: 4 }} />
                                    </View>
                                </View>
                            )}
                        </View>

                        {recipient && (
                            <View style={styles.headerActions}>
                                <TouchableOpacity style={styles.headerIconBtn} onPress={() => {
                                    console.log('📞 Audio Call Initiated', recipient._id);
                                    router.push(`/call/${recipient._id}?type=audio&name=${encodeURIComponent(recipient.name || 'User')}&avatar=${encodeURIComponent(recipient.avatar || '')}` as any);
                                }}>
                                    <Phone size={22} color="#4B5563" />
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.headerIconBtn} onPress={() => {
                                    console.log('🎥 Video Call Initiated', recipient._id);
                                    router.push(`/call/${recipient._id}?type=video&name=${encodeURIComponent(recipient.name || 'User')}&avatar=${encodeURIComponent(recipient.avatar || '')}` as any);
                                }}>
                                    <Video size={24} color="#4B5563" />
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                )}
            </View>

            <FlatList
                ref={flatListRef}
                data={displayMessages}
                inverted
                keyExtractor={item => item._id}
                renderItem={renderMessage}
                contentContainerStyle={[styles.listContent, { backgroundColor }]}
                style={{ backgroundColor }}
                onScroll={(event) => {
                    const { contentOffset } = event.nativeEvent;
                    // In inverted list, offset 0 is the bottom
                    const isCloseToBottom = contentOffset.y <= 100;
                    setShowScrollBottom(!isCloseToBottom);
                }}
                ListHeaderComponent={isLoading ? <ActivityIndicator style={{ marginVertical: 20 }} /> : null}
                extraData={playingMessageId}
            />

            {/* Scroll to Bottom Button */}
            {showScrollBottom && (
                <TouchableOpacity
                    style={styles.scrollToBottomBtn}
                    onPress={() => flatListRef.current?.scrollToOffset({ offset: 0, animated: true })}
                >
                    <ChevronDown size={24} color="white" />
                </TouchableOpacity>
            )}

            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}>
                {replyingTo && (
                    <View style={styles.replyPreview}>
                        <View style={{ marginRight: 12 }}>
                            <CornerUpRight size={18} color="#6366F1" />
                        </View>
                        <View style={styles.replyPreviewContent}>
                            <Text style={styles.replyPreviewName}>
                                {typeof replyingTo.sender === 'string' ? 'User' : replyingTo.sender.name}
                            </Text>
                            <Text style={styles.replyPreviewText} numberOfLines={1}>
                                {replyingTo.type === 'audio' ? '🎤 Voice Message' :
                                    replyingTo.type === 'image' ? '📷 Image' :
                                        replyingTo.type === 'video' ? '🎥 Video' :
                                            replyingTo.type === 'reel' ? '🎬 Reel' :
                                                replyingTo.content}
                            </Text>
                        </View>
                        <TouchableOpacity
                            onPress={() => setReplyingTo(null)}
                            style={styles.replyCloseBtn}
                        >
                            <X size={20} color="#9CA3AF" />
                        </TouchableOpacity>
                    </View>
                )}

                <View style={[
                    styles.inputBar,
                    { paddingBottom: Platform.OS === 'ios' ? insets.bottom + 10 : 10 }
                ]}>
                    <TouchableOpacity style={styles.attachBtn} onPress={handleImagePick}>
                        <ImageIcon size={24} color="#8B5CF6" />
                    </TouchableOpacity>

                    <View style={styles.textInputWrapper}>
                        <TextInput
                            style={styles.textInput}
                            placeholder="Type a message..."
                            placeholderTextColor="#9CA3AF"
                            value={inputText}
                            onChangeText={setInputText}
                            multiline
                            maxHeight={100}
                        />
                    </View>

                    {inputText.trim() ? (
                        <TouchableOpacity onPress={handleSendText} style={styles.sendBtn}>
                            <Send size={20} color="white" />
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity
                            onPressIn={startRecording}
                            onPressOut={stopRecording}
                            style={styles.micBtn}
                            activeOpacity={0.7}
                        >
                            <Animated.View
                                style={[
                                    styles.micIconInner,
                                    {
                                        transform: [{ scale: recording ? recordingScale : 1 }],
                                        backgroundColor: recording ? '#EF4444' : 'transparent',
                                    }
                                ]}
                            >
                                <Mic size={24} color={recording ? "white" : "#8B5CF6"} />
                            </Animated.View>
                        </TouchableOpacity>
                    )}
                </View>
            </KeyboardAvoidingView>

            {/* Context Menu Modal */}
            <Modal
                visible={showMenu}
                transparent
                animationType="fade"
                onRequestClose={() => setShowMenu(false)}
            >
                <TouchableOpacity
                    style={styles.menuModalOverlay}
                    activeOpacity={1}
                    onPress={() => setShowMenu(false)}
                >
                    <View style={styles.contextMenu}>
                        <TouchableOpacity
                            style={styles.menuItem}
                            onPress={() => {
                                setShowMenu(false);
                                if (!chatId || !user?.token) return;
                                try {
                                    fetch(`${API_BASE_URL}/api/chats/${chatId}/mute`, {
                                        method: 'POST',
                                        headers: {
                                            'Authorization': `Bearer ${user.token}`,
                                            'Content-Type': 'application/json'
                                        },
                                        body: JSON.stringify({ muted: true })
                                    })
                                        .then(res => {
                                            if (res.ok) Alert.alert('Success', 'Notifications muted');
                                            else Alert.alert('Error', 'Failed to mute chat');
                                        })
                                        .catch(err => console.error(err));
                                } catch (error) {
                                    console.error(error);
                                }
                            }}
                        >
                            <BellOff size={20} color="#666" />
                            <Text style={styles.menuText}>Mute notifications</Text>
                        </TouchableOpacity>

                        <View style={styles.menuDivider} />

                        <View style={[styles.menuItem, { paddingBottom: 8 }]}>
                            <ImageIcon size={20} color="#666" />
                            <Text style={styles.menuText}>Color background</Text>
                        </View>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 12, gap: 8 }}
                        >
                            {['#ffffff', '#f3f4f6', '#fef2f2', '#eff6ff', '#ecfdf5', '#fffbeb', '#f3e8ff', '#fce7f3', '#fff7ed', '#f0fdfa', '#e0e7ff', '#ffe4e6'].map(color => (
                                <TouchableOpacity
                                    key={color}
                                    onPress={() => {
                                        setBackgroundColor(color);
                                        // Save theme to backend
                                        if (chatId && user?.token) {
                                            fetch(`${API_BASE_URL}/api/chats/${chatId}/theme`, {
                                                method: 'PUT',
                                                headers: {
                                                    'Authorization': `Bearer ${user.token}`,
                                                    'Content-Type': 'application/json'
                                                },
                                                body: JSON.stringify({ theme: color })
                                            }).catch(err => console.error('Failed to save theme:', err));
                                        }
                                    }}
                                    style={{
                                        width: 28,
                                        height: 28,
                                        borderRadius: 14,
                                        backgroundColor: color,
                                        borderWidth: 1,
                                        borderColor: backgroundColor === color ? '#6366F1' : '#e5e7eb',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}
                                >
                                    {backgroundColor === color && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#6366F1' }} />}
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        <View style={styles.menuDivider} />

                        <TouchableOpacity
                            style={styles.menuItem}
                            onPress={() => {
                                setShowMenu(false);
                                Alert.alert(
                                    'Delete Messages',
                                    'Are you sure you want to delete all messages?',
                                    [
                                        { text: 'Cancel', style: 'cancel' },
                                        {
                                            text: 'Delete',
                                            style: 'destructive',
                                            onPress: async () => {
                                                if (!chatId || !user?.token) return;
                                                try {
                                                    const res = await ApiClient.delete(`/api/chats/${chatId}/messages`, {
                                                        'Authorization': `Bearer ${user.token}`
                                                    });

                                                    if (res.success) {
                                                        setMessages([]);
                                                        Toast.show({ type: 'success', text1: 'All messages deleted' });
                                                    } else {
                                                        ErrorHandler.show(res.message, 'alert');
                                                    }
                                                } catch (error) {
                                                    ErrorHandler.log("Delete All Messages Error", error);
                                                }
                                            }
                                        }
                                    ]
                                );
                            }}
                        >
                            <Trash2 size={20} color="#FF3B30" />
                            <Text style={[styles.menuText, { color: '#FF3B30' }]}>Delete messages</Text>
                        </TouchableOpacity>

                        <View style={styles.menuDivider} />

                        <TouchableOpacity
                            style={styles.menuItem}
                            onPress={() => {
                                Alert.alert(
                                    'Block User',
                                    `Are you sure you want to block ${recipient?.name}?`,
                                    [
                                        { text: 'Cancel', style: 'cancel' },
                                        {
                                            text: 'Block',
                                            style: 'destructive',
                                            onPress: async () => {
                                                if (!recipient?._id || !user?.token) return;
                                                try {
                                                    const res = await fetch(`${API_BASE_URL}/api/auth/block/${recipient._id}`, {
                                                        method: 'PUT',
                                                        headers: {
                                                            'Authorization': `Bearer ${user.token}`
                                                        }
                                                    });

                                                    if (res.ok) {
                                                        Alert.alert('Blocked', 'User blocked successfully');
                                                        router.back();
                                                    } else {
                                                        Alert.alert('Error', 'Failed to block user');
                                                    }
                                                } catch (e) {
                                                    console.error(e);
                                                    Alert.alert('Error', 'Network error');
                                                }
                                            }
                                        }
                                    ]
                                );
                            }}
                        >
                            <Archive size={20} color="#FF3B30" />
                            <Text style={[styles.menuText, { color: '#FF3B30' }]}>Block user</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>
            {/* Forward Modal */}
            <Modal
                visible={forwardModalVisible}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => {
                    setForwardModalVisible(false);
                }}
            >
                <View style={[styles.container, { paddingTop: insets.top }]}>
                    <View style={styles.header}>
                        <TouchableOpacity onPress={() => setForwardModalVisible(false)} style={styles.backBtn}>
                            <ArrowLeft size={24} color="#333" />
                        </TouchableOpacity>
                        <Text style={{ fontSize: 18, fontWeight: 'bold', marginLeft: 16 }}>Forward to...</Text>
                    </View>

                    {loadingFollowing ? (
                        <ActivityIndicator style={{ marginTop: 20 }} size="large" color="#6366F1" />
                    ) : (
                        <FlatList
                            data={followingList}
                            keyExtractor={(item) => item._id}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' }}
                                    onPress={() => handleForwardMessage(item._id)}
                                >
                                    <Image
                                        source={{ uri: item.avatar || `https://ui-avatars.com/api/?name=${item.name}&background=random` }}
                                        style={{ width: 40, height: 40, borderRadius: 20, marginRight: 12 }}
                                    />
                                    <Text style={{ fontSize: 16, fontWeight: '500', flex: 1 }}>{item.name}</Text>
                                    <Send size={20} color="#6366F1" />
                                </TouchableOpacity>
                            )}
                            ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 20, color: '#666' }}>You are not following anyone yet.</Text>}
                        />
                    )}
                </View>
            </Modal>

            {/* Message Options Modal */}
            <Modal
                visible={messageOptionsVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setMessageOptionsVisible(false)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setMessageOptionsVisible(false)}
                >
                    <View style={styles.optionsContainer}>
                        {/* Quick Reactions Bar */}
                        <View style={styles.reactionRow}>
                            {['❤️', '😂', '😮', '😢', '😡', '👍'].map((emoji) => (
                                <TouchableOpacity
                                    key={emoji}
                                    style={styles.reactionBtn}
                                    onPress={() => {
                                        if (selectedMessage) handleMessageReaction(selectedMessage._id, emoji);
                                        setMessageOptionsVisible(false);
                                    }}
                                >
                                    <Text style={{ fontSize: 24 }}>{emoji}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                        <View style={styles.optionDivider} />

                        <TouchableOpacity style={styles.optionItem} onPress={() => handleMessageAction('reply')}>
                            <Reply size={20} color="#4B5563" />
                            <Text style={styles.optionText}>Reply</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.optionItem} onPress={() => handleMessageAction('copy')}>
                            <Copy size={20} color="#4B5563" />
                            <Text style={styles.optionText}>Copy</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.optionItem} onPress={() => handleMessageAction('forward')}>
                            <Forward size={20} color="#4B5563" />
                            <Text style={styles.optionText}>Forward</Text>
                        </TouchableOpacity>

                        {selectedMessage && (['image', 'video', 'reel'].includes(selectedMessage.type) || (selectedMessage.postId)) && (
                            <TouchableOpacity style={styles.optionItem} onPress={() => handleMessageAction('download')}>
                                <Download size={20} color="#4B5563" />
                                <Text style={styles.optionText}>Save to Gallery</Text>
                            </TouchableOpacity>
                        )}

                        {selectedMessage && (typeof selectedMessage.sender === 'string' ? selectedMessage.sender : selectedMessage.sender._id) === user?._id && (
                            <>
                                <View style={styles.optionDivider} />
                                <TouchableOpacity style={styles.optionItem} onPress={() => handleMessageAction('delete')}>
                                    <Trash2 size={20} color="#EF4444" />
                                    <Text style={[styles.optionText, { color: '#EF4444' }]}>Delete</Text>
                                </TouchableOpacity>
                            </>
                        )}
                    </View>
                </TouchableOpacity>
            </Modal>
        </View>
    );
}


// ==========================================
// OPTIMIZED SUB-COMPONENTS (DEFINED OUTSIDE)
// ==========================================


const styles = StyleSheet.create({
    // Layout
    container: { flex: 1, backgroundColor: '#f2f2f2' }, // Slightly darker bg to make elements pop

    // Header Styles
    header: {
        backgroundColor: '#fff',
        paddingHorizontal: 16,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
        zIndex: 50,
    },
    headerContentContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    headerLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    searchHeaderContainer: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    headerSearchInput: { flex: 1, height: 40, backgroundColor: '#F3F4F6', borderRadius: 20, paddingHorizontal: 16, fontSize: 15 },

    // Header Components
    backBtn: { padding: 6, marginRight: 8, marginLeft: -6 },
    userInfoBtn: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    avatarContainer: { position: 'relative', marginRight: 12 },
    headerAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#E5E7EB' },
    onlineBadge: {
        width: 12, height: 12, borderRadius: 6, backgroundColor: '#10B981',
        position: 'absolute', bottom: 0, right: 0, borderWidth: 2, borderColor: '#fff'
    },
    headerTextContainer: { justifyContent: 'center', flex: 1 },
    headerName: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 2 },
    headerStatus: { fontSize: 12, color: '#6B7280' },
    headerActions: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingLeft: 16 },
    headerIconBtn: { padding: 6 },

    // Footer / Input Styles
    listContent: { paddingHorizontal: 16, paddingVertical: 20, paddingBottom: 100 },
    messageRow: { flexDirection: 'row', marginBottom: 20, alignItems: 'flex-end' },
    messageRowRight: { justifyContent: 'flex-end' },
    messageRowLeft: { justifyContent: 'flex-start' },

    // Modern Bubbles
    bubble: {
        maxWidth: '75%',
        padding: 14,
        borderRadius: 24,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    bubbleLeft: {
        backgroundColor: '#ffffff',
        borderBottomLeftRadius: 4,
        borderTopLeftRadius: 24,
    },
    bubbleRight: {
        backgroundColor: '#8B5CF6',
        borderBottomRightRadius: 4,
        borderTopRightRadius: 24,
    },
    msgText: { fontSize: 16, color: '#333', lineHeight: 22 },
    msgTextRight: { color: 'white' },
    timestamp: { fontSize: 10, color: '#999', marginTop: 6 },
    timestampRight: { textAlign: 'right', color: 'rgba(255,255,255,0.8)' },
    timestampLeft: { textAlign: 'left' },
    avatarSmall: { width: 28, height: 28, borderRadius: 14, marginRight: 8, marginBottom: 4 },
    senderName: { fontSize: 10, color: '#999', marginBottom: 4, marginLeft: 44 },

    inputBar: {
        flexDirection: 'row',
        alignItems: 'flex-end', // Align to bottom for multiline
        paddingHorizontal: 16,
        paddingTop: 12,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
    },
    attachBtn: { padding: 10, marginBottom: 4, marginLeft: -8 },
    textInputWrapper: { flex: 1, marginHorizontal: 8 },
    textInput: {
        backgroundColor: '#F3F4F6',
        borderRadius: 24,
        paddingHorizontal: 16,
        paddingTop: 10,
        paddingBottom: 10,
        fontSize: 16,
        color: '#1F2937',
        minHeight: 40,
    },
    sendBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#8B5CF6',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 2,
        shadowColor: "#8B5CF6",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 3,
    },
    micBtn: {
        width: 44,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 2,
    },
    recordingIndicator: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FEE2E2', borderWidth: 1, borderColor: '#EF4444' },
    recordingDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#EF4444' },
    menuModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-start', alignItems: 'flex-end', paddingTop: 60, paddingRight: 16 },
    contextMenu: { backgroundColor: 'white', borderRadius: 12, padding: 8, width: 200, boxShadow: '0 2 10 rgba(0,0,0,0.1)', elevation: 5 },
    menuItem: { flexDirection: 'row', alignItems: 'center', padding: 12 },
    menuText: { marginLeft: 12, fontSize: 16, color: '#333' },
    menuDivider: { height: 1, backgroundColor: '#eee', marginVertical: 4 },
    optionsDotBtn: { padding: 4 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    optionsContainer: { backgroundColor: 'white', width: '80%', borderRadius: 16, padding: 8 },
    optionItem: { flexDirection: 'row', alignItems: 'center', padding: 16 },
    optionText: { marginLeft: 16, fontSize: 16, color: '#333' },
    optionDivider: { height: 1, backgroundColor: '#eee' },
    msgImage: { width: 200, height: 150, borderRadius: 12 },
    voicePremiumGradient: { flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 16, gap: 8 },
    voicePremiumPlayBtn: { padding: 8 },
    voicePremiumWaveform: { flexDirection: 'row', alignItems: 'center', gap: 2, height: 20 },
    voicePremiumBar: { width: 3, backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: 2 },
    voicePremiumDuration: { fontSize: 12, color: 'white' },
    voicePremiumTimestamp: { fontSize: 10, color: 'rgba(255,255,255,0.7)', marginLeft: 'auto' },
    reelPreview: { position: 'relative' },
    reelThumb: { width: 200, height: 300, borderRadius: 12 },
    reelOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.2)' },
    scrollToBottomBtn: { position: 'absolute', bottom: 100, right: 20, backgroundColor: '#6366F1', width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', boxShadow: '0 2 8 rgba(0,0,0,0.3)', elevation: 5, zIndex: 10 },
    headerTitle: { fontSize: 18, fontWeight: 'bold', marginLeft: 16 },
    micIconContainer: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    micIconInner: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    micBtnActive: { width: 130, borderRadius: 25, flexDirection: 'row', paddingLeft: 4, backgroundColor: '#FEE2E2', alignItems: 'center', boxShadow: '0 1 5 rgba(0,0,0,0.1)', elevation: 2, paddingRight: 12 },
    recordingTimerContainer: { flexDirection: 'row', alignItems: 'center', marginLeft: 10, flex: 1, justifyContent: 'center' },
    recordingLiveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444', marginRight: 6 },
    recordingTimerText: { color: '#EF4444', fontWeight: 'bold', fontSize: 14 },
    voiceContainer: { flexDirection: 'row', alignItems: 'center', padding: 8, borderRadius: 16, minWidth: 150 },
    voicePlayBtn: { padding: 4, marginRight: 8 },
    voiceWaveform: { flexDirection: 'row', alignItems: 'center', gap: 2, height: 20, marginBottom: 2 },
    voiceBar: { width: 2, borderRadius: 1 },
    voiceDuration: { fontSize: 10 },
    voiceTimestamp: { fontSize: 9 },

    // Reply Styles
    replyPreview: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', borderTopWidth: 1, borderTopColor: '#f0f0f0', borderLeftWidth: 4, borderLeftColor: '#6366F1', padding: 8, paddingHorizontal: 16 },
    replyPreviewContent: { flex: 1, marginRight: 8 },
    replyPreviewName: { fontSize: 13, fontWeight: '700', color: '#6366F1', marginBottom: 2 },
    replyPreviewText: { fontSize: 13, color: '#666' },
    replyCloseBtn: { padding: 4 },

    replyContainer: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 8, padding: 8, marginBottom: 6, borderLeftWidth: 3, borderLeftColor: 'rgba(255,255,255,0.5)' },
    replyContainerLeft: { backgroundColor: 'rgba(0,0,0,0.05)', borderLeftColor: '#6366F1' },
    replyName: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.9)', marginBottom: 2 },
    replyNameLeft: { color: '#6366F1' },
    replyText: { fontSize: 12, color: 'rgba(255,255,255,0.7)' },
    replyTextLeft: { color: '#666' },

    // Forward Modal Styles
    forwardContainer: { flex: 1, backgroundColor: '#fff' },
    forwardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#f0f0f0', position: 'relative' },
    forwardTitle: { fontSize: 18, fontWeight: '700', color: '#111' },
    closeButton: { position: 'absolute', right: 16, top: 14 },
    closeButtonCircle: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
    closeButtonText: { fontSize: 14, color: '#666', fontWeight: 'bold' },
    searchContainer: { padding: 16 },
    searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', borderRadius: 12, paddingHorizontal: 12, height: 44 },
    searchInput: { flex: 1, fontSize: 16, color: '#333', height: '100%' },
    forwardUserItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
    forwardUserAvatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#eee' },
    forwardUserInfo: { flex: 1, marginLeft: 12 },
    forwardUserName: { fontSize: 16, fontWeight: '600', color: '#111' },
    forwardUserHandle: { fontSize: 14, color: '#666', marginTop: 2 },
    forwardSendBtn: { backgroundColor: '#6366F1', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
    forwardSendBtnText: { color: 'white', fontWeight: '600', fontSize: 14 },

    // Reaction Styles
    reactionRow: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 12, paddingHorizontal: 8 },
    reactionBtn: { padding: 4 },
    appliedReactions: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 4, gap: 4 },
    reactionBadge: { backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 12, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1, borderColor: '#eee', flexDirection: 'row', alignItems: 'center' },
    reactionBadgeLeft: { alignSelf: 'flex-start' },
    reactionBadgeRight: { alignSelf: 'flex-end', backgroundColor: 'rgba(255,255,255,0.25)', borderColor: 'rgba(255,255,255,0.4)' },
    reactionCount: { fontSize: 11, marginLeft: 2, color: '#4B5563', fontWeight: '500' },
    reactionCountRight: { color: 'white' },
});

// 1. Message Item Component
const MessageItem = React.memo(({ item, userId, playAudio, router, onOpenOptions, isPlaying, playbackStatus }: any) => {
    // playingMessageId passed from parent via renderMessage wrapper in real usage, 
    // but here in the list we need to pass strict props.
    // Actually, renderMessage needs to pass playingMessageId down.
    // Let's rely on props passed from renderMessage

    // We update renderMessage below to pass isPlaying

    const isMe = (typeof item.sender === 'string' ? item.sender : item.sender._id) === userId;

    // Memoize the avatar URL to prevent flicker
    const avatarUrl = !isMe && typeof item.sender !== 'string'
        ? getCorrectUrl(item.sender.avatar || 'https://i.pravatar.cc/100?u=' + item.sender._id)
        : null;

    return (
        <View style={[styles.messageRow, isMe ? styles.messageRowRight : styles.messageRowLeft]}>
            {/* If it's ME: Show dots first (left of bubble) */}
            {isMe && (
                <TouchableOpacity
                    style={[styles.optionsDotBtn, { marginRight: 8 }]}
                    onPress={() => onOpenOptions(item)}
                >
                    <MoreHorizontal size={16} color="#9CA3AF" />
                </TouchableOpacity>
            )}

            {!isMe && avatarUrl && (
                <Image source={{ uri: avatarUrl }} style={styles.avatarSmall} />
            )}

            {isMe ? (
                <View style={[styles.bubble, styles.bubbleRight]}>
                    <MessageContent
                        item={item}
                        isMe={isMe}
                        playAudio={playAudio}
                        router={router}
                        isPlaying={isPlaying}
                        playbackStatus={playbackStatus}
                    />
                </View>
            ) : (
                <View style={[styles.bubble, styles.bubbleLeft]}>
                    <MessageContent
                        item={item}
                        isMe={isMe}
                        playAudio={playAudio}
                        router={router}
                        isPlaying={isPlaying}
                        playbackStatus={playbackStatus}
                    />
                </View>
            )}

            {/* If it's NOT ME: Show dots last (right of bubble) */}
            {!isMe && (
                <TouchableOpacity
                    style={[styles.optionsDotBtn, { marginLeft: 8 }]}
                    onPress={() => onOpenOptions(item)}
                >
                    <MoreHorizontal size={16} color="#9CA3AF" />
                </TouchableOpacity>
            )}
        </View>
    );
});

// 2. Message Content Component
const MessageContent = React.memo(({ item, isMe, playAudio, router, isPlaying, playbackStatus }: {
    item: Message,
    isMe: boolean,
    playAudio: (uri: string, id: string) => Promise<void>,
    router: any,
    isPlaying: boolean,
    playbackStatus?: any
}) => {
    // Helper function to convert relative URLs to absolute
    const getFullUrl = (url: string) => {
        if (url.startsWith('/uploads/')) {
            return `${API_BASE_URL}${url}`;
        }
        return url;
    };

    // Waveform Animation logic
    const waveAnims = useRef([...Array(25)].map(() => new Animated.Value(0))).current;

    useEffect(() => {
        if (isPlaying) {
            // Start Animation
            const animations = waveAnims.map((anim, i) => {
                return Animated.loop(
                    Animated.sequence([
                        Animated.timing(anim, {
                            toValue: 1,
                            duration: 400 + Math.random() * 400, // Random duration for natural effect
                            useNativeDriver: true,
                        }),
                        Animated.timing(anim, {
                            toValue: 0,
                            duration: 400 + Math.random() * 400,
                            useNativeDriver: true,
                        })
                    ])
                );
            });
            Animated.parallel(animations).start();
        } else {
            // Stop/Reset Animation
            waveAnims.forEach(anim => {
                anim.stopAnimation();
                anim.setValue(0);
            });
        }
    }, [isPlaying]);

    return (
        <View>
            {item.replyTo && (
                <View style={[styles.replyContainer, !isMe && styles.replyContainerLeft]}>
                    <Text style={[styles.replyName, !isMe && styles.replyNameLeft]} numberOfLines={1}>
                        {typeof item.replyTo.sender === 'string' ? 'User' : (item.replyTo.sender as any).name}
                    </Text>
                    <Text style={[styles.replyText, !isMe && styles.replyTextLeft]} numberOfLines={1}>
                        {item.replyTo.type === 'audio' ? '🎤 Voice Message' :
                            item.replyTo.type === 'image' ? '📷 Image' :
                                item.replyTo.type === 'video' ? '🎥 Video' :
                                    item.replyTo.type === 'reel' ? '🎬 Reel' :
                                        item.replyTo.content}
                    </Text>
                </View>
            )}
            {item.type === 'image' && !item.postId ? (
                <Image
                    source={{ uri: getCorrectUrl(item.content) }}
                    style={styles.msgImage}
                    resizeMode="cover"
                />
            ) : item.type === 'audio' || item.type === 'voice' ? (
                <View style={[styles.voiceContainer, { backgroundColor: isMe ? 'transparent' : '#F3F4F6' }]}>
                    <TouchableOpacity
                        onPress={() => playAudio(item.content, item._id)}
                        style={styles.voicePlayBtn}
                    >
                        {isPlaying ? (
                            <Pause size={20} color={isMe ? "white" : "#6366F1"} fill={isMe ? "white" : "#6366F1"} />
                        ) : (
                            <Play size={20} color={isMe ? "white" : "#6366F1"} fill={isMe ? "white" : "#6366F1"} />
                        )}
                    </TouchableOpacity>

                    <View style={{ flex: 1, gap: 4 }}>
                        <View style={styles.voiceWaveform}>
                            {waveAnims.map((anim, i) => (
                                <Animated.View
                                    key={i}
                                    style={[
                                        styles.voiceBar,
                                        {
                                            backgroundColor: isMe ? 'rgba(255,255,255,0.6)' : 'rgba(99, 102, 241, 0.4)',
                                            height: 8 + Math.abs(Math.sin(i * 0.5)) * 8,
                                            transform: [{
                                                scaleY: anim.interpolate({
                                                    inputRange: [0, 1],
                                                    outputRange: [0.8, 1.6]
                                                })
                                            }],
                                        }
                                    ]}
                                />
                            ))}
                        </View>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Text style={[styles.voiceDuration, { color: isMe ? 'white' : '#666', fontWeight: 'bold' }]}>
                                {isPlaying && playbackStatus?.positionMillis ? (
                                    `${Math.floor(playbackStatus.positionMillis / 1000 / 60)}:${Math.floor((playbackStatus.positionMillis / 1000) % 60).toString().padStart(2, '0')} / ${item.duration ? `${Math.floor(item.duration / 60)}:${(item.duration % 60).toString().padStart(2, '0')}` : '... '}`
                                ) : (
                                    item.duration ? `${Math.floor(item.duration / 60)}:${(item.duration % 60).toString().padStart(2, '0')}` : 'Voice'
                                )}
                            </Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                <Text style={[styles.voiceTimestamp, { color: isMe ? 'rgba(255,255,255,0.7)' : '#999' }]}>
                                    {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </Text>
                                {isMe && (
                                    item.readBy && item.readBy.length > 0 ? (
                                        <CheckCheck size={12} color="#10B981" />
                                    ) : (
                                        <Check size={12} color="rgba(255,255,255,0.6)" />
                                    )
                                )}
                            </View>
                        </View>
                    </View>
                </View>
            ) : (item.type === 'reel' || item.type === 'video' || item.type === 'image') && item.postId ? (
                // Shared post (image, video, or reel)
                <TouchableOpacity style={styles.reelPreview} onPress={() => {
                    const postType = item.type === 'reel' ? 'reel' : (item.type === 'video' ? 'video' : 'image');
                    router.push({
                        pathname: '/media-view',
                        params: {
                            postId: item.postId?._id,
                            type: postType,
                            uri: item.postId?.videoUri || item.postId?.image || item.postId?.uri
                        }
                    });
                }}>
                    <Image
                        source={{
                            uri: (() => {
                                const url = item.postId.videoUri || item.postId.image || item.postId.uri;
                                return getCorrectUrl(url);
                            })()
                        }}
                        style={styles.reelThumb}
                    />
                    {(item.type === 'reel' || item.type === 'video') && (
                        <View style={styles.reelOverlay}><Play size={24} color="white" /></View>
                    )}
                </TouchableOpacity>
            ) : (
                <Text style={[styles.msgText, isMe && styles.msgTextRight]}>{item.content}</Text>
            )}

            {/* Only show the bottom status row if NOT an audio/voice message */}
            {!['audio', 'voice'].includes(item.type?.toLowerCase()) && (
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: isMe ? 'flex-end' : 'flex-start', marginTop: 4, gap: 4 }}>
                    <Text style={[styles.timestamp, isMe ? { marginTop: 0, color: 'rgba(255,255,255,0.7)' } : styles.timestampLeft]}>
                        {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                    {isMe && (
                        item.readBy && item.readBy.length > 0 ? (
                            <CheckCheck size={12} color="#10B981" />
                        ) : (
                            <Check size={12} color="rgba(255,255,255,0.6)" />
                        )
                    )}
                </View>
            )}

            {/* Reactions Display */}
            {item.reactions && Object.keys(item.reactions).length > 0 && (
                <View style={[styles.appliedReactions, isMe ? { justifyContent: 'flex-end' } : { justifyContent: 'flex-start' }]}>
                    {Object.entries(item.reactions).map(([emoji, users]: [string, any]) => (
                        <View key={emoji} style={[styles.reactionBadge, isMe ? styles.reactionBadgeRight : styles.reactionBadgeLeft]}>
                            <Text style={{ fontSize: 12 }}>{emoji}</Text>
                            <Text style={[styles.reactionCount, isMe ? styles.reactionCountRight : null]}>{users.length}</Text>
                        </View>
                    ))}
                </View>
            )}
        </View>
    );
});

export default MessageScreen;
