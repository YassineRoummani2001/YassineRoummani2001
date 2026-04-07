import { API_BASE_URL } from '@/constants/Config';
import { useThemeContext } from '@/context/ThemeContext';
import { useUser } from '@/context/UserContext';
import { ApiClient } from '@/utils/api'; // Import ApiClient
import ErrorHandler from '@/utils/ErrorHandler'; // Import Standard ErrorHandler
import * as Clipboard from 'expo-clipboard'; // Import Clipboard
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import {
    AlertTriangle,
    ArrowLeft,
    Bell,
    ChevronRight,
    HistoryIcon,
    ImageIcon,
    MessageSquare,
    Search,
    Shield,
    Star,
    UserCircle
} from 'lucide-react-native';
import { AntDesign } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    Modal,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    Dimensions,
    Platform
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

const getCorrectUrl = (url: string) => {
    if (!url) return '';
    try {
        if (url.startsWith('/uploads/')) return encodeURI(`${API_BASE_URL}${url}`);
        if (url.includes('/uploads/')) {
            const parts = url.split('/uploads/');
            return encodeURI(`${API_BASE_URL}/uploads/${parts[1]}`);
        }
        return url.startsWith('http') ? encodeURI(url) : url;
    } catch (e) {
        return url;
    }
};

// Helper component for horizontal dots
const MoreHorizontalDots = ({ color }: { color: string }) => (
    <View style={{ flexDirection: 'row', gap: 3 }}>
        <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: color }} />
        <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: color }} />
        <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: color }} />
    </View>
);

export default function UserInfoScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const context = useUser();
    const user = (context as any)?.user;
    const { colors, isDark } = useThemeContext();
    const insets = useSafeAreaInsets();

    // Create styles with theme awareness
    const styles = useMemo(() => createStyles(colors, isDark, insets), [colors, isDark, insets]);

    const [recipient, setRecipient] = useState<any>(null);
    const [chat, setChat] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    // States for toggles/settings
    const [isMuted, setIsMuted] = useState(false);
    const [isPinned, setIsPinned] = useState(false);
    const [isFavorite, setIsFavorite] = useState(false);
    const [themeColor, setThemeColor] = useState('#ffffff');
    const [showThemePicker, setShowThemePicker] = useState(false);

    // Nickname State
    const [showNicknameModal, setShowNicknameModal] = useState(false);
    const [nicknameText, setNicknameText] = useState('');

    // Disappearing Messages
    const [disappearingDuration, setDisappearingDuration] = useState(0); // 0 = off

    const handleDisappearingSelect = async (duration: number) => {
        if (!chat?._id) return;
        setDisappearingDuration(duration); // Optimistic

        const response = await ApiClient.put(`/api/chats/${chat._id}/disappearing`,
            { duration },
            { 'Authorization': `Bearer ${user?.token}` }
        );

        if (response.success) {
            Toast.show({ type: 'success', text1: 'Settings updated' });
        } else {
            // Revert on failure (optional, but good practice)
            // setDisappearingDuration(prev => ...); 
            ErrorHandler.show(response.message, 'toast');
        }
    };

    const showDisappearingOptions = () => {
        Alert.alert(
            'Disappearing Messages',
            'Select message expiration time',
            [
                { text: 'Off', onPress: () => handleDisappearingSelect(0) },
                { text: '24 Hours', onPress: () => handleDisappearingSelect(24 * 60 * 60 * 1000) },
                { text: '7 Days', onPress: () => handleDisappearingSelect(7 * 24 * 60 * 60 * 1000) },
                { text: '90 Days', onPress: () => handleDisappearingSelect(90 * 24 * 60 * 60 * 1000) },
                { text: 'Cancel', style: 'cancel' }
            ]
        );
    };

    // Initial Data Fetch
    useEffect(() => {
        const fetchData = async () => {
            try {
                if (!id || !user?.token) return;

                // 1. Fetch User Data
                const userRes = await ApiClient.get(`/api/auth/user/${id}`, {
                    'Authorization': `Bearer ${user?.token}`
                });

                if (userRes.success) {
                    setRecipient(userRes.data);
                } else {
                    // Error handled by ApiClient if set to silent/toast? 
                    // Or manually show specific error
                    ErrorHandler.show(userRes.message, 'toast');
                }

                // 2. Fetch Chat Data (to get settings like theme, mute)
                const chatRes = await ApiClient.post<{ 
                    theme: string, 
                    disappearingMessages: number, 
                    mutedBy: string[],
                    isPinned: boolean,
                    isFavorite: boolean,
                    _id: string,
                    nicknames?: Record<string, string>
                }>(
                    '/api/chats',
                    { userId: id },
                    { 'Authorization': `Bearer ${user?.token}` }
                );

                if (chatRes.success && chatRes.data) {
                    const chatData = chatRes.data;
                    setChat(chatData);

                    // Initialize settings from chat data
                    setThemeColor(chatData.theme || '#ffffff');
                    setDisappearingDuration(chatData.disappearingMessages || 0);

                    if (chatData.mutedBy && user?._id) {
                        setIsMuted(chatData.mutedBy.includes(user._id));
                    }
                    setIsPinned(!!chatData.isPinned);
                    setIsFavorite(!!chatData.isFavorite);
                }

            } catch (error) {
                // Mostly caught inside ApiClient, but for React errors:
                ErrorHandler.log("Fetch Data Error", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [id, user]);

    // Derived State
    const currentNickname = useMemo(() => {
        if (!chat?.nicknames || !recipient?._id) return null;
        return chat.nicknames[recipient._id];
    }, [chat, recipient]);

    // Handlers
    const handleUpdateNickname = async () => {
        setShowNicknameModal(false);
        if (!chat?._id || !recipient?._id) return;

        // Optimistic Update
        const updatedChat = { ...chat };
        if (!updatedChat.nicknames) updatedChat.nicknames = {};
        if (nicknameText.trim()) {
            updatedChat.nicknames[recipient._id] = nicknameText.trim();
        } else {
            delete updatedChat.nicknames[recipient._id];
        }
        setChat(updatedChat);

        const response = await ApiClient.put(`/api/chats/${chat._id}/nickname`,
            { userId: recipient._id, nickname: nicknameText.trim() },
            { 'Authorization': `Bearer ${user?.token}` }
        );

        if (response.success) {
            Toast.show({ type: 'success', text1: 'Nickname updated' });
        } else {
            // Revert on failure (complex to revert fully here without refetch, but acceptable for now)
            ErrorHandler.show(response.message, 'toast');
        }
    };

    const handlePinToggle = async () => {
        if (!chat?._id) return;
        const newState = !isPinned;
        setIsPinned(newState);
        const res = await ApiClient.post<any>(`/api/chats/${chat._id}/pin`, {}, { 'Authorization': `Bearer ${user?.token}` });
        if (res.success) {
            Toast.show({ type: 'success', text1: newState ? 'Pinned' : 'Unpinned' });
        } else {
            setIsPinned(!newState);
            ErrorHandler.show(res.message, 'toast');
        }
    };

    const handleFavoriteToggle = async () => {
        if (!chat?._id) return;
        const newState = !isFavorite;
        setIsFavorite(newState);
        const res = await ApiClient.post<any>(`/api/chats/${chat._id}/favorite`, {}, { 'Authorization': `Bearer ${user?.token}` });
        if (res.success) {
            Toast.show({ type: 'success', text1: newState ? 'Added to favorites' : 'Removed from favorites' });
        } else {
            setIsFavorite(!newState);
            ErrorHandler.show(res.message, 'toast');
        }
    };

    const handleMuteToggle = async () => {
        if (!chat?._id) return;

        const newMutedState = !isMuted;
        setIsMuted(newMutedState); // Optimistic

        const response = await ApiClient.post(`/api/chats/${chat._id}/mute`,
            { muted: newMutedState },
            { 'Authorization': `Bearer ${user?.token}` }
        );

        if (response.success) {
            Toast.show({
                type: 'success',
                text1: newMutedState ? 'Muted' : 'Unmuted',
                visibilityTime: 2000
            });
        } else {
            setIsMuted(!newMutedState); // Revert
            ErrorHandler.show(response.message, 'toast');
        }
    };

    const handleBlockUser = async () => {
        Alert.alert(
            'Block User',
            `Are you sure you want to block ${recipient?.name}? They won't be able to message you.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Block',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const res = await fetch(`${API_BASE_URL}/api/auth/block/${id}`, {
                                method: 'PUT',
                                headers: { 'Authorization': `Bearer ${user?.token}` }
                            });

                            if (res.ok) {
                                router.replace('/chat'); // Go back to chat list
                                Toast.show({ type: 'success', text1: 'User Blocked' });
                            } else {
                                ErrorHandler.show('Failed to block user', 'toast');
                            }
                        } catch (e) {
                            ErrorHandler.show('Network error', 'toast');
                        }
                    }
                }
            ]
        );
    };

    const handleUpdateTheme = async (color: string) => {
        setThemeColor(color);
        setShowThemePicker(false);

        if (!chat?._id) return;

        try {
            const res = await fetch(`${API_BASE_URL}/api/chats/${chat._id}/theme`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${user?.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ theme: color })
            });
            if (!res.ok) throw new Error('Theme update failed');
        } catch (e) {
            console.error(e);
        }
    };


    if (loading) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    if (!recipient) {
        return (
            <View style={styles.container}>
                <Text style={{ color: colors.text, textAlign: 'center', marginTop: 50 }}>User not found</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.background} />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <ArrowLeft size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Details</Text>
                <TouchableOpacity style={styles.backButton} onPress={() => router.push(`/user/${recipient._id}` as any)}>
                    <UserCircle size={24} color={colors.text} />
                </TouchableOpacity>
            </View>

            <ScrollView 
                contentContainerStyle={[styles.content, { alignSelf: 'center', width: '100%', maxWidth: 600 }]} 
                showsVerticalScrollIndicator={false}
            >
                {/* Profile Section */}
                <View style={styles.profileSection}>
                    <Image
                        source={{ uri: getCorrectUrl(recipient.coverImage || 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=800&fit=crop&q=80') }}
                        style={styles.coverBg}
                    />
                    <LinearGradient
                        colors={['rgba(0,0,0,0.4)', 'rgba(0,0,0,0.1)', colors.background]}
                        style={styles.coverBg}
                    />
                    
                    <TouchableOpacity 
                        activeOpacity={0.9}
                        onPress={() => router.push(`/user/${recipient._id}` as any)}
                        style={styles.avatarWrapper}
                    >
                        <Image
                            source={{ uri: getCorrectUrl(recipient.avatar || 'https://i.pravatar.cc/150') }}
                            style={styles.avatar}
                        />
                    </TouchableOpacity>
                    
                    <View style={{ alignItems: 'center', marginTop: 10 }}>
                        <Text style={styles.name}>{currentNickname || recipient.name}</Text>
                        <Text style={styles.username}>{recipient.handle || `@${recipient.name.replace(/\s/g, '').toLowerCase()}`}</Text>
                        
                        {recipient.bio && (
                            <Text style={styles.bioText} numberOfLines={2}>{recipient.bio}</Text>
                        )}
                    </View>

                    {/* Action Grid */}
                    <ScrollView 
                        horizontal 
                        showsHorizontalScrollIndicator={false} 
                        contentContainerStyle={styles.actionGrid}
                        style={{ width: '100%', marginTop: 24 }}
                    >
                        <TouchableOpacity style={styles.actionItem} onPress={handleMuteToggle}>
                            <View style={[styles.actionIconCircle, isMuted && { backgroundColor: '#EF4444', borderColor: '#EF4444' }]}>
                                <Bell size={22} color={isMuted ? "#FFF" : colors.text} />
                            </View>
                            <Text style={styles.actionText}>{isMuted ? 'Unmute' : 'Mute'}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.actionItem} onPress={handlePinToggle}>
                            <View style={[styles.actionIconCircle, isPinned && { backgroundColor: colors.primary, borderColor: colors.primary }]}>
                                <AntDesign name="pushpin" size={22} color={isPinned ? "#FFF" : colors.text} />
                            </View>
                            <Text style={styles.actionText}>{isPinned ? 'Unpin' : 'Pin'}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.actionItem} onPress={handleFavoriteToggle}>
                            <View style={[styles.actionIconCircle, isFavorite && { backgroundColor: '#EAB308', borderColor: '#EAB308' }]}>
                                <Star size={22} color={isFavorite ? "#FFF" : colors.text} fill={isFavorite ? "#FFF" : "transparent"} />
                            </View>
                            <Text style={styles.actionText}>{isFavorite ? 'Unfavorite' : 'Favorite'}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.actionItem} onPress={() => {
                            if (!chat?._id) return;
                            Alert.alert('Options', undefined, [
                                {
                                    text: 'Clear Chat', style: 'destructive', onPress: () => {
                                        Alert.alert('Clear Chat', 'Are you sure you want to delete all messages? This cannot be undone.', [
                                            { text: 'Cancel', style: 'cancel' },
                                            {
                                                text: 'Clear', style: 'destructive', onPress: async () => {
                                                    const res = await ApiClient.delete(`/api/chats/${chat._id}/messages`, {
                                                        'Authorization': `Bearer ${user?.token}`
                                                    });
                                                    if (res.success) {
                                                        Toast.show({ type: 'success', text1: 'Chat cleared' });
                                                    } else {
                                                        ErrorHandler.show(res.message, 'toast');
                                                    }
                                                }
                                            }
                                        ]);
                                    }
                                },
                                {
                                    text: 'Export Chat', onPress: async () => {
                                        Toast.show({ type: 'info', text1: 'Exporting...', visibilityTime: 1000 });
                                        const res = await ApiClient.get<any[]>(`/api/chats/${chat._id}/messages`, {
                                            'Authorization': `Bearer ${user?.token}`
                                        });

                                        if (res.success && res.data) {
                                            const exportText = res.data.map((m: any) =>
                                                `[${new Date(m.createdAt).toLocaleString()}] ${m.sender?.name || 'Unknown'}: ${m.content} ${m.type !== 'text' ? `[${m.type}]` : ''}`
                                            ).join('\n');

                                            await Clipboard.setStringAsync(exportText);
                                            Toast.show({ type: 'success', text1: 'Chat history copied to clipboard' });
                                        } else {
                                            ErrorHandler.show('Failed to export chat', 'toast');
                                        }
                                    }
                                },
                                {
                                    text: 'Report', style: 'destructive', onPress: () => {
                                        setTimeout(() => {
                                            Alert.alert('Reported', `User ${recipient.name} has been reported. We will review this shortly.`);
                                        }, 500);
                                    }
                                },
                                { text: 'Cancel', style: 'cancel' }
                            ]);
                        }}>
                            <View style={styles.actionIconCircle}>
                                <MoreHorizontalDots color={colors.text} />
                            </View>
                            <Text style={styles.actionText}>Options</Text>
                        </TouchableOpacity>
                    </ScrollView>
                </View>

                {/* Settings Section */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionHeaderText}>Chat Settings</Text>
                </View>

                <View style={styles.settingsGroup}>
                    <TouchableOpacity style={styles.settingItem} onPress={() => setShowThemePicker(true)}>
                        <View style={styles.settingLeft}>
                            <View style={[styles.iconBox, { backgroundColor: themeColor !== '#ffffff' ? themeColor : colors.primary + '20' }]}>
                                <ImageIcon size={20} color={themeColor !== '#ffffff' ? '#fff' : colors.primary} />
                            </View>
                            <View>
                                <Text style={styles.settingTitle}>Theme</Text>
                                <Text style={styles.settingSubtitle}>
                                    {themeColor === '#ffffff' ? 'Default' : 'Custom Color'}
                                </Text>
                            </View>
                        </View>
                        <ChevronRight size={20} color={colors.textSecondary} />
                    </TouchableOpacity>

                    <View style={styles.separator} />

                    <TouchableOpacity style={styles.settingItem} onPress={() => {
                        setNicknameText(currentNickname || '');
                        setShowNicknameModal(true);
                    }}>
                        <View style={styles.settingLeft}>
                            <View style={[styles.iconBox, { backgroundColor: colors.primary + '20' }]}>
                                <Text style={{ fontSize: 16, fontWeight: 'bold', color: colors.primary }}>A</Text>
                            </View>
                            <View>
                                <Text style={styles.settingTitle}>Nicknames</Text>
                                <Text style={styles.settingSubtitle}>{currentNickname ? currentNickname : 'None'}</Text>
                            </View>
                        </View>
                        <ChevronRight size={20} color={colors.textSecondary} />
                    </TouchableOpacity>

                    <View style={styles.separator} />

                    <TouchableOpacity style={styles.settingItem} onPress={showDisappearingOptions}>
                        <View style={styles.settingLeft}>
                            <View style={[styles.iconBox, { backgroundColor: colors.primary + '20' }]}>
                                <HistoryIcon size={20} color={colors.primary} />
                            </View>
                            <View>
                                <Text style={styles.settingTitle}>Disappearing Messages</Text>
                                <Text style={styles.settingSubtitle}>
                                    {disappearingDuration === 0 ? 'Off' :
                                        disappearingDuration === 86400000 ? '24 Hours' :
                                            disappearingDuration === 604800000 ? '7 Days' :
                                                disappearingDuration === 7776000000 ? '90 Days' : 'On'}
                                </Text>
                            </View>
                        </View>
                        <ChevronRight size={20} color={colors.textSecondary} />
                    </TouchableOpacity>
                </View>

                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionHeaderText}>Media & Support</Text>
                </View>

                <View style={styles.settingsGroup}>
                    <TouchableOpacity style={styles.settingItem} onPress={() => {
                        if (chat?._id) {
                            router.push(`/message/shared-media/${chat._id}` as any);
                        } else {
                            Toast.show({ type: 'info', text1: 'No chat exists yet' });
                        }
                    }}>
                        <View style={styles.settingLeft}>
                            <View style={[styles.iconBox, { backgroundColor: colors.primary + '20' }]}>
                                <MessageSquare size={20} color={colors.primary} />
                            </View>
                            <Text style={styles.settingTitle}>Shared Media</Text>
                        </View>
                        <ChevronRight size={20} color={colors.textSecondary} />
                    </TouchableOpacity>

                    <View style={styles.separator} />

                    <TouchableOpacity style={styles.settingItem} onPress={handleBlockUser}>
                        <View style={styles.settingLeft}>
                            <View style={[styles.iconBox, { backgroundColor: '#FEE2E2' }]}>
                                <Shield size={20} color="#DC2626" />
                            </View>
                            <Text style={[styles.settingTitle, { color: '#DC2626' }]}>Block User</Text>
                        </View>
                    </TouchableOpacity>

                    <View style={styles.separator} />

                    <TouchableOpacity style={styles.settingItem}>
                        <View style={styles.settingLeft}>
                            <View style={[styles.iconBox, { backgroundColor: '#FEE2E2' }]}>
                                <AlertTriangle size={20} color="#DC2626" />
                            </View>
                            <Text style={[styles.settingTitle, { color: '#DC2626' }]}>Report User</Text>
                        </View>
                    </TouchableOpacity>
                </View>

            </ScrollView>

            {/* Theme Picker Modal */}
            <Modal
                visible={showThemePicker}
                transparent
                animationType="fade"
                onRequestClose={() => setShowThemePicker(false)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setShowThemePicker(false)}
                >
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Choose a Theme</Text>
                        <View style={styles.colorGrid}>
                            {['#ffffff', '#f3f4f6', '#fef2f2', '#eff6ff', '#ecfdf5', '#fffbeb', '#f3e8ff', '#fce7f3', '#fff7ed', '#f0fdfa', '#e0e7ff', '#ffe4e6'].map(color => (
                                <TouchableOpacity
                                    key={color}
                                    onPress={() => handleUpdateTheme(color)}
                                    style={[
                                        styles.colorCircle,
                                        { backgroundColor: color, borderColor: themeColor === color ? colors.primary : colors.border }
                                    ]}
                                >
                                    {themeColor === color && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary }} />}
                                </TouchableOpacity>
                            ))}
                        </View>
                        <TouchableOpacity style={styles.closeBtn} onPress={() => setShowThemePicker(false)}>
                            <Text style={styles.closeBtnText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* Nickname Modal */}
            <Modal
                visible={showNicknameModal}
                transparent
                animationType="fade"
                onRequestClose={() => setShowNicknameModal(false)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setShowNicknameModal(false)}
                >
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Set Nickname</Text>
                        <TextInput
                            style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                            placeholder="Enter nickname"
                            placeholderTextColor={colors.textSecondary}
                            value={nicknameText}
                            onChangeText={setNicknameText}
                            autoFocus
                        />
                        <View style={styles.modalActions}>
                            <TouchableOpacity style={styles.modalActionBtn} onPress={() => setShowNicknameModal(false)}>
                                <Text style={{ color: colors.textSecondary }}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.modalActionBtn} onPress={handleUpdateNickname}>
                                <Text style={{ color: colors.primary, fontWeight: 'bold' }}>Save</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </TouchableOpacity>
            </Modal>
        </View>
    );
}

const createStyles = (colors: any, isDark: boolean, insets: any) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background, // iOS-style group background
        paddingTop: insets.top,
    },
    header: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between', // Centered title
        backgroundColor: colors.background,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.text,
    },
    backButton: {
        padding: 8,
        marginLeft: -8,
    },
    content: {
        paddingBottom: 40,
    },
    profileSection: {
        alignItems: 'center',
        paddingBottom: 24,
        backgroundColor: colors.background,
        marginBottom: 10,
    },
    coverBg: {
        width: '100%',
        height: 120,
        position: 'absolute',
        top: 0,
    },
    avatarWrapper: {
        marginTop: 40,
        padding: 4,
        backgroundColor: colors.background,
        borderRadius: 55,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 6,
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        borderWidth: 2,
        borderColor: colors.background
    },
    name: {
        fontSize: 22,
        fontWeight: '800',
        color: colors.text,
        marginBottom: 2,
    },
    username: {
        fontSize: 14,
        color: colors.textSecondary,
        fontWeight: '500',
        marginBottom: 8,
    },
    bioText: {
        fontSize: 13,
        color: colors.textSecondary,
        textAlign: 'center',
        paddingHorizontal: 40,
        lineHeight: 18,
    },
    actionGrid: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        gap: 16, 
        alignItems: 'center',
        justifyContent: 'center',
        flexGrow: 1,
        paddingBottom: 4,
    },
    actionItem: {
        alignItems: 'center',
        gap: 6,
        minWidth: 70,
    },
    actionIconCircle: {
        width: 54,
        height: 54,
        borderRadius: 27,
        backgroundColor: isDark ? '#262626' : '#F2F2F2',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: isDark ? '#333' : '#EEE',
    },
    actionText: {
        color: colors.text,
        fontSize: 11,
        fontWeight: '600',
    },
    sectionHeader: {
        paddingHorizontal: 20,
        paddingBottom: 8,
        marginTop: 12,
    },
    sectionHeaderText: {
        fontSize: 13,
        color: colors.textSecondary,
        fontWeight: '600',
        textTransform: 'uppercase',
    },
    settingsGroup: {
        backgroundColor: isDark ? '#1A1A1A' : '#FFFFFF',
        marginHorizontal: 16,
        borderRadius: 16,
        paddingVertical: 4,
        marginBottom: 24,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: colors.border,
    },
    settingItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 14,
        paddingHorizontal: 16,
    },
    separator: {
        height: 1,
        backgroundColor: colors.border,
        marginLeft: 60, // Indent separator
    },
    settingLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    iconBox: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: colors.primary + '20',
        alignItems: 'center',
        justifyContent: 'center',
    },
    settingTitle: {
        fontSize: 16,
        fontWeight: '500',
        color: colors.text,
    },
    settingSubtitle: {
        fontSize: 13,
        color: colors.textSecondary,
        marginTop: 2,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        width: '85%',
        backgroundColor: colors.background,
        borderRadius: 20,
        padding: 24,
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.text,
        marginBottom: 20,
    },
    colorGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        justifyContent: 'center',
        marginBottom: 20,
    },
    colorCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    closeBtn: {
        paddingVertical: 10,
        paddingHorizontal: 20,
    },
    closeBtnText: {
        color: colors.primary,
        fontSize: 16,
        fontWeight: '600',
    },
    input: {
        width: '100%',
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 20,
        fontSize: 16,
    },
    modalActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        width: '100%',
        gap: 20,
    },
    modalActionBtn: {
        paddingVertical: 8,
        paddingHorizontal: 16,
    }
});
