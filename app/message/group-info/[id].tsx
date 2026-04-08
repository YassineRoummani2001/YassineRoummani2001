import { API_BASE_URL } from '@/constants/Config';
import { useThemeContext } from '@/context/ThemeContext';
import { useUser } from '@/context/UserContext';
import { ApiClient } from '@/utils/api';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    Platform,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    useWindowDimensions,
    View,
    TextInput,
    Share,
    Dimensions
} from 'react-native';
import Toast from 'react-native-toast-message';
import { SkeletonProfile } from '@/components/Skeletons';
import AddParticipantModal from '@/components/AddParticipantModal';
import ConfirmModal from '@/components/ConfirmModal';
import ProcessingModal from '@/components/ProcessingModal';
import ImageConfirmModal from '@/components/ImageConfirmModal';
import { uploadFile } from '@/utils/uploadHelper';
import * as FileSystem from 'expo-file-system/legacy';

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

export default function GroupInfoScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const { user: currentUser } = useUser() as any;
    const { colors, isDark } = useThemeContext();
    const { width } = useWindowDimensions();
    const isDesktop = Platform.OS === 'web' && width > 768;

    const [groupData, setGroupData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState<string | null>(null);
    const [isMuted, setIsMuted] = useState(false);
    const [isPinned, setIsPinned] = useState(false);
    const [isFavorite, setIsFavorite] = useState(false);
    const [isEditingName, setIsEditingName] = useState(false);
    const [isEditingDesc, setIsEditingDesc] = useState(false);
    const [tempGroupName, setTempGroupName] = useState('');
    const [tempGroupDesc, setTempGroupDesc] = useState('');
    const [isAddModalVisible, setIsAddModalVisible] = useState(false);
    const [isLeaveModalVisible, setIsLeaveModalVisible] = useState(false);
    const [isClearModalVisible, setIsClearModalVisible] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadMessage, setUploadMessage] = useState("Downloading image...");

    const [isConfirmModalVisible, setIsConfirmModalVisible] = useState(false);
    const [pendingImage, setPendingImage] = useState<{ uri: string, type: 'avatar' | 'cover' } | null>(null);
    const [userToRemove, setUserToRemove] = useState<any>(null);
    const [isRemoveModalVisible, setIsRemoveModalVisible] = useState(false);
    const [userToPromote, setUserToPromote] = useState<any>(null);
    const [isPromoteModalVisible, setIsPromoteModalVisible] = useState(false);

    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

    useEffect(() => {
        if (groupData?.mutedBy) {
            setIsMuted(groupData.mutedBy.includes(currentUser._id));
        }
        setIsPinned(!!groupData?.isPinned);
        setIsFavorite(!!groupData?.isFavorite);
    }, [groupData]);

    useEffect(() => {
        if (id && currentUser?.token) fetchGroupData();
    }, [id, currentUser]);

    const fetchGroupData = async () => {
        setLoading(true);
        try {
            const res = await ApiClient.get<any>(`/api/chats/${id}`, { 'Authorization': `Bearer ${currentUser.token}` });
            if (res.success) {
                setGroupData(res.data);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const isAdmin = (participantId: string) => {
        // Support new array of admins
        if (groupData?.admins && groupData.admins.length > 0) {
            const inAdminsArray = groupData.admins.some((admin: any) => 
                String(admin._id || admin) === String(participantId)
            );
            if (inAdminsArray) return true;
        }

        if (!groupData?.admin) return false;
        // Support original single admin field
        const adminId = typeof groupData.admin === 'object' ? groupData.admin._id : groupData.admin;
        return String(participantId) === String(adminId);
    };

    const handleShareGroup = async () => {
        try {
            const domain = API_BASE_URL.replace('api', ''); // remove /api if present or format appropriately, or just use host
            const url = `https://vibe-app.com/chat/${id}`; // Simplified universal link
            await Share.share({
                message: `Join our group "${groupData?.groupName || 'Chat'}" on Vibe! 🚀`,
                url, // url is for iOS
                title: 'Share Group'
            });
        } catch (error) {
            console.error(error);
        }
    };

    const pickImage = async (type: 'avatar' | 'cover') => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: type === 'avatar' ? [1, 1] : [16, 9],
            quality: 0.7,
        });

        if (!result.canceled) {
            const asset = result.assets[0];
            const uri = asset.uri;
            
            // Check file size
            let fileSize = asset.fileSize;
            
            if (!fileSize && Platform.OS !== 'web' && uri.startsWith('file:')) {
                try {
                    const fileInfo = await FileSystem.getInfoAsync(uri);
                    if (fileInfo.exists) fileSize = fileInfo.size;
                } catch (e) {
                    console.warn("Failed to get file info:", e);
                }
            } else if (!fileSize && Platform.OS === 'web' && uri.startsWith('blob:')) {
                try {
                    const response = await fetch(uri);
                    const blob = await response.blob();
                    fileSize = blob.size;
                } catch (e) {
                    console.warn("Failed to get blob size:", e);
                }
            }

            if (fileSize && fileSize > MAX_FILE_SIZE) {
                Alert.alert("Image Too Large", `The selected image is too big (${(fileSize / (1024 * 1024)).toFixed(1)}MB). Maximum size is 10MB.`);
                return;
            }

            setPendingImage({ uri, type });
            setIsConfirmModalVisible(true);
        }
    };

    const confirmGroupImageUpload = () => {
        if (!pendingImage) return;
        uploadImage(pendingImage.uri, pendingImage.type);
        setIsConfirmModalVisible(false);
        setPendingImage(null);
    };

    const uploadImage = async (uri: string, type: 'avatar' | 'cover') => {
        setUpdating(type);
        setIsUploading(true);
        setUploadMessage("Downloading image...");

        try {
            // Use the cross-platform uploadFile helper
            const uploadedUrl = await uploadFile(uri, currentUser.token, 'image');

            if (uploadedUrl) {
                // Update the chat document with the new image URL
                const fieldName = type === 'avatar' ? 'groupAvatar' : 'groupCoverImage';
                const updateRes = await ApiClient.put<any>(`/api/chats/${id}`, 
                    { [fieldName]: uploadedUrl }, 
                    { 'Authorization': `Bearer ${currentUser.token}` }
                );

                if (updateRes.success) {
                    setGroupData(updateRes.data);
                } else {
                    Alert.alert("Error", "Failed to update group data in database");
                }
            }
        } catch (error) {
            console.error("Upload error:", error);
            Alert.alert("Error", "Failed to upload or update image. Please try again.");
        } finally {
            setUpdating(null);
            setIsUploading(false);
        }
    };

    const saveGroupName = async () => {
        if (!tempGroupName.trim() || tempGroupName === groupData.groupName) {
            setIsEditingName(false);
            return;
        }
        try {
            const res = await ApiClient.put<any>(`/api/chats/${id}`, 
                { groupName: tempGroupName.trim() }, 
                { 'Authorization': `Bearer ${currentUser.token}` }
            );
            if (res.success) {
                setGroupData(res.data);
                setIsEditingName(false);
            }
        } catch (e) {
            console.error(e);
            Alert.alert("Error", "Failed to update group name");
        }
    };

    const saveGroupDesc = async () => {
        try {
            const res = await ApiClient.put<any>(`/api/chats/${id}`, 
                { groupDescription: tempGroupDesc.trim() }, 
                { 'Authorization': `Bearer ${currentUser.token}` }
            );
            if (res.success) {
                setGroupData(res.data);
                setIsEditingDesc(false);
            }
        } catch (e) {
            console.error(e);
            Alert.alert("Error", "Failed to update description");
        }
    };

    const toggleDisappearingMessages = async () => {
        const newValue = groupData.disappearingMessages ? 0 : 24 * 60 * 60 * 1000; // 24h or off
        try {
            const res = await ApiClient.put<any>(`/api/chats/${id}`, 
                { disappearingMessages: newValue }, 
                { 'Authorization': `Bearer ${currentUser.token}` }
            );
            if (res.success) {
                setGroupData(res.data);
            }
        } catch (e) {
            console.error(e);
            Alert.alert("Error", "Failed to toggle disappearing messages");
        }
    };

    const onLeaveGroupConfirm = async () => {
        try {
            const res = await ApiClient.post<any>(`/api/chats/${id}/leave`, {}, { 'Authorization': `Bearer ${currentUser.token}` });
            if (res.success) {
                router.replace('/chat');
            }
        } catch (e) {
            console.error(e);
            Alert.alert("Error", "Failed to leave group");
        } finally {
            setIsLeaveModalVisible(false);
        }
    };

    const onClearChatConfirm = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/chats/${id}/messages`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${currentUser.token}` }
            });
            if (res.ok) {
                Alert.alert("Success", "Chat cleared successfully");
            } else {
                Alert.alert("Error", "Failed to clear chat");
            }
        } catch (e) {
            console.error(e);
            Alert.alert("Error", "An error occurred");
        } finally {
            setIsClearModalVisible(false);
        }
    };

    const handleLeaveGroup = () => setIsLeaveModalVisible(true);
    const handleClearChat = () => setIsClearModalVisible(true);

    const checkRemoveUser = (user: any) => {
        setUserToRemove(user);
        setIsRemoveModalVisible(true);
    };

    const confirmRemoveUser = async () => {
        if (!userToRemove) return;
        try {
            const res = await ApiClient.delete<any>(`/api/chats/${id}/participants/${userToRemove._id}`, 
                { 'Authorization': `Bearer ${currentUser.token}` }
            );
            if (res.success) {
                setGroupData(res.data);
                Toast.show({ type: 'success', text1: 'User removed' });
            } else {
                Alert.alert("Error", res.message || "Failed to remove user");
            }
        } catch (e) {
            console.error(e);
            Alert.alert("Error", "An error occurred");
        } finally {
            setIsRemoveModalVisible(false);
            setUserToRemove(null);
        }
    };

    const checkPromoteUser = (user: any) => {
        setUserToPromote(user);
        setIsPromoteModalVisible(true);
    };

    const confirmPromoteUser = async () => {
        if (!userToPromote) return;
        try {
            const res = await ApiClient.post<any>(`/api/chats/${id}/admins/${userToPromote._id}`, 
                {},
                { 'Authorization': `Bearer ${currentUser.token}` }
            );
            if (res.success) {
                setGroupData(res.data);
                Toast.show({ type: 'success', text1: 'User promoted to Admin' });
            } else {
                Alert.alert("Error", res.message || "Failed to promote user");
            }
        } catch (e) {
            console.error(e);
            Alert.alert("Error", "An error occurred");
        } finally {
            setIsPromoteModalVisible(false);
            setUserToPromote(null);
        }
    };

    const handleMuteToggle = async () => {
        const newMutedState = !isMuted;
        setIsMuted(newMutedState);
        try {
            await fetch(`${API_BASE_URL}/api/chats/${id}/mute`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${currentUser.token}` },
                body: JSON.stringify({ muted: newMutedState })
            });
        } catch (e) {
            console.error(e);
            setIsMuted(!newMutedState); // revert on failure
        }
    };

    const handlePinToggle = async () => {
        const newState = !isPinned;
        setIsPinned(newState);
        const res = await ApiClient.post<any>(`/api/chats/${id}/pin`, {}, { 'Authorization': `Bearer ${currentUser.token}` });
        if (res.success) {
            Toast.show({ type: 'success', text1: newState ? 'Pinned' : 'Unpinned' });
        } else {
            setIsPinned(!newState);
        }
    };

    const handleFavoriteToggle = async () => {
        const newState = !isFavorite;
        setIsFavorite(newState);
        const res = await ApiClient.post<any>(`/api/chats/${id}/favorite`, {}, { 'Authorization': `Bearer ${currentUser.token}` });
        if (res.success) {
            Toast.show({ type: 'success', text1: newState ? 'Added to favorites' : 'Removed from favorites' });
        } else {
            setIsFavorite(!newState);
        }
    };

    if (loading) {
        return <SkeletonProfile />;
    }

    if (!groupData) {
        return (
            <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
                <Text style={{ color: colors.text }}>Group not found</Text>
            </View>
        );
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <Stack.Screen options={{ headerShown: false }} />
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
            
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: isDark ? '#262626' : '#F2F2F2' }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Group Info</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView 
                contentContainerStyle={{ paddingBottom: 40, alignSelf: 'center', width: '100%', maxWidth: 600 }}
                showsVerticalScrollIndicator={false}
            >
                {/* Hero Section */}
                <View style={styles.hero}>
                    <View style={styles.coverWrapper}>
                        {groupData.groupCoverImage ? (
                            <Image source={{ uri: getCorrectUrl(groupData.groupCoverImage) }} style={styles.coverGradient} />
                        ) : (
                            <Image 
                                source={{ uri: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=800&fit=crop&q=80' }} 
                                style={styles.coverGradient} 
                            />
                        )}
                            <TouchableOpacity 
                                style={styles.editCoverBtn} 
                                onPress={() => pickImage('cover')}
                                disabled={updating === 'cover'}
                            >
                                {updating === 'cover' ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="camera" size={20} color="white" />}
                            </TouchableOpacity>
                    </View>

                    <View style={styles.profileInfo}>
                        <View style={[styles.avatarContainer, { borderColor: colors.background }]}>
                            <Image 
                                source={{ uri: getCorrectUrl(groupData.groupAvatar) || `https://ui-avatars.com/api/?name=${encodeURIComponent(groupData.groupName || 'Group')}&background=random` }} 
                                style={styles.avatar} 
                            />
                            <TouchableOpacity 
                                style={styles.editAvatarBtn} 
                                onPress={() => pickImage('avatar')}
                                disabled={updating === 'avatar'}
                            >
                                {updating === 'avatar' ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="camera" size={16} color="white" />}
                            </TouchableOpacity>
                        </View>
                        {isEditingName ? (
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12, borderBottomWidth: 1, borderBottomColor: colors.primary }}>
                                <TextInput 
                                    style={[styles.groupName, { color: colors.text, marginTop: 0, padding: 0, minWidth: 100 }]}
                                    value={tempGroupName}
                                    onChangeText={setTempGroupName}
                                    autoFocus
                                    onSubmitEditing={saveGroupName}
                                />
                                <TouchableOpacity onPress={saveGroupName} style={{ paddingHorizontal: 8 }}>
                                    <Ionicons name="checkmark" size={22} color={colors.primary} />
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => setIsEditingName(false)}>
                                    <Ionicons name="close" size={22} color={colors.textSecondary} />
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12 }}>
                                <Text style={[styles.groupName, { color: colors.text, marginTop: 0 }]}>{groupData.groupName}</Text>
                                <TouchableOpacity onPress={() => { setTempGroupName(groupData.groupName); setIsEditingName(true); }} style={{ paddingLeft: 8 }}>
                                    <Ionicons name="pencil" size={16} color={colors.textSecondary} />
                                </TouchableOpacity>
                            </View>
                        )}
                        <Text style={[styles.memberCount, { color: colors.textSecondary }]}>
                            {groupData.participants?.length || 0} members
                        </Text>

                        {/* Group Description */}
                        {isEditingDesc ? (
                            <View style={{ marginTop: 12, width: '100%', alignItems: 'center' }}>
                                <TextInput
                                    style={[styles.groupDescInput, { color: colors.text, borderColor: colors.primary }]}
                                    value={tempGroupDesc}
                                    onChangeText={setTempGroupDesc}
                                    placeholder="Add group description..."
                                    placeholderTextColor={colors.textSecondary}
                                    multiline
                                    autoFocus
                                />
                                <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
                                    <TouchableOpacity onPress={saveGroupDesc} style={[styles.miniBtn, { backgroundColor: colors.primary }]}>
                                        <Text style={{ color: '#fff', fontWeight: '700' }}>Save</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={() => setIsEditingDesc(false)} style={[styles.miniBtn, { backgroundColor: isDark ? '#333' : '#EEE' }]}>
                                        <Text style={{ color: colors.text }}>Cancel</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ) : (
                            <TouchableOpacity 
                                style={{ marginTop: 10, paddingHorizontal: 40 }}
                                onPress={() => { setTempGroupDesc(groupData.groupDescription || ''); setIsEditingDesc(true); }}
                            >
                                <Text style={[styles.groupDesc, { color: colors.textSecondary }]}>
                                    {groupData.groupDescription || "Add group description..."}
                                </Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                {/* Participants Section */}
                <View style={styles.section}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                        <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0 }]}>Members</Text>
                        {isAdmin(currentUser._id) && (
                            <TouchableOpacity onPress={() => setIsAddModalVisible(true)} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                <Ionicons name="person-add" size={16} color={colors.primary} />
                                <Text style={{ color: colors.primary, fontWeight: '600', fontSize: 14 }}>Add</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                    <View style={[styles.listContainer, { backgroundColor: isDark ? '#1a1a1a' : '#f9f9f9' }]}>
                        {groupData.participants?.map((participant: any, index: number) => {
                            const isMe = participant._id === currentUser._id;
                            const isGroupAdmin = isAdmin(participant._id);
                            const isCurrentUserAdmin = isAdmin(currentUser._id);

                            return (
                                <TouchableOpacity
                                    key={participant._id}
                                    style={[
                                        styles.participantItem,
                                        index !== groupData.participants.length - 1 && { borderBottomWidth: 1, borderBottomColor: isDark ? '#333' : '#eee' }
                                    ]}
                                    onPress={() => router.push(`/user/${participant._id}`)}
                                >
                                    <View>
                                        <Image
                                            source={{ uri: getCorrectUrl(participant.avatar) || `https://ui-avatars.com/api/?name=${encodeURIComponent(participant.name || 'User')}&background=random` }}
                                            style={styles.participantAvatar}
                                        />
                                        {isGroupAdmin && (
                                            <View style={styles.crownIcon}>
                                                <Ionicons name="ribbon" size={12} color="#FFD700" />
                                            </View>
                                        )}
                                    </View>
                                    <View style={styles.participantText}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                            <Text style={[styles.participantName, { color: colors.text }]}>
                                                {participant.name} {isMe && <Text style={{ fontSize: 13, fontWeight: '400', color: colors.textSecondary }}>(You)</Text>}
                                            </Text>
                                            {isGroupAdmin && (
                                                <View style={styles.adminBadge}>
                                                    <Text style={styles.adminText}>Admin</Text>
                                                </View>
                                            )}
                                        </View>
                                        <Text style={[styles.participantHandle, { color: colors.textSecondary }]}>
                                            @{ (participant.username || participant.handle || '').replace(/^@+/, '') }
                                        </Text>
                                    </View>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                        {isGroupAdmin && !isMe && (
                                            <Ionicons name="shield-checkmark" size={18} color={colors.primary} style={{ opacity: 0.6 }} />
                                        )}
                                        {isCurrentUserAdmin && !isMe && !isGroupAdmin && (
                                            <>
                                                <TouchableOpacity 
                                                    onPress={(e) => { e.stopPropagation(); checkPromoteUser(participant); }}
                                                    style={{ paddingHorizontal: 8, paddingVertical: 4, backgroundColor: colors.primary + '20', borderRadius: 8 }}
                                                >
                                                    <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '600' }}>Make Admin</Text>
                                                </TouchableOpacity>
                                                <TouchableOpacity 
                                                    onPress={(e) => { e.stopPropagation(); checkRemoveUser(participant); }}
                                                    style={{ paddingHorizontal: 8, paddingVertical: 4, backgroundColor: '#EF444420', borderRadius: 8 }}
                                                >
                                                    <Text style={{ color: '#EF4444', fontSize: 12, fontWeight: '600' }}>Remove</Text>
                                                </TouchableOpacity>
                                            </>
                                        )}
                                        <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>

                {/* Group Actions */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Settings & Actions</Text>
                    <View style={[styles.settingsGroup, { backgroundColor: isDark ? '#1a1a1a' : '#fff', borderColor: isDark ? '#333' : '#eee' }]}>
                        <TouchableOpacity 
                            style={[styles.actionRow, { borderBottomWidth: 1, borderBottomColor: isDark ? '#303030' : '#f0f0f0' }]}
                            onPress={handleShareGroup}
                        >
                            <View style={[styles.iconBox, { backgroundColor: colors.primary + '20' }]}>
                                <Ionicons name="share-social-outline" size={20} color={colors.primary} />
                            </View>
                            <Text style={[styles.actionText, { color: colors.text }]}>Share Group</Text>
                            <View style={{ flex: 1 }} />
                            <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
                        </TouchableOpacity>

                        <TouchableOpacity 
                            style={[styles.actionRow, { borderBottomWidth: 1, borderBottomColor: isDark ? '#303030' : '#f0f0f0' }]}
                            onPress={handleMuteToggle}
                        >
                            <View style={[styles.iconBox, { backgroundColor: isMuted ? '#EF4444' + '20' : colors.primary + '20' }]}>
                                <Ionicons name={isMuted ? "notifications-off-outline" : "notifications-outline"} size={20} color={isMuted ? "#EF4444" : colors.primary} />
                            </View>
                            <Text style={[styles.actionText, { color: colors.text }]}>{isMuted ? "Unmute Notifications" : "Mute Notifications"}</Text>
                            <View style={{ flex: 1 }} />
                            <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
                        </TouchableOpacity>

                        <TouchableOpacity 
                            style={[styles.actionRow, { borderBottomWidth: 1, borderBottomColor: isDark ? '#303030' : '#f0f0f0' }]}
                            onPress={handlePinToggle}
                        >
                            <View style={[styles.iconBox, { backgroundColor: isPinned ? colors.primary + '20' : '#8882' }]}>
                                <Ionicons name={isPinned ? "pin" : "pin-outline"} size={20} color={isPinned ? colors.primary : colors.textSecondary} />
                            </View>
                            <Text style={[styles.actionText, { color: isPinned ? colors.primary : colors.text }]}>{isPinned ? "Unpin Chat" : "Pin Chat"}</Text>
                            <View style={{ flex: 1 }} />
                            <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
                        </TouchableOpacity>

                        <TouchableOpacity 
                            style={[styles.actionRow, { borderBottomWidth: 1, borderBottomColor: isDark ? '#303030' : '#f0f0f0' }]}
                            onPress={handleFavoriteToggle}
                        >
                            <View style={[styles.iconBox, { backgroundColor: isFavorite ? "#EAB308" + '20' : '#8882' }]}>
                                <Ionicons name={isFavorite ? "star" : "star-outline"} size={20} color={isFavorite ? "#EAB308" : colors.textSecondary} />
                            </View>
                            <Text style={[styles.actionText, { color: isFavorite ? "#EAB308" : colors.text }]}>{isFavorite ? "Remove from Favorites" : "Add to Favorites"}</Text>
                            <View style={{ flex: 1 }} />
                            <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
                        </TouchableOpacity>

                        <TouchableOpacity 
                            style={[styles.actionRow, { borderBottomWidth: 1, borderBottomColor: isDark ? '#303030' : '#f0f0f0' }]}
                            onPress={() => router.push(`/message/shared-media/${id}`)}
                        >
                            <View style={[styles.iconBox, { backgroundColor: colors.primary + '20' }]}>
                                <Ionicons name="images-outline" size={20} color={colors.primary} />
                            </View>
                            <Text style={[styles.actionText, { color: colors.text }]}>Shared Media</Text>
                            <View style={{ flex: 1 }} />
                            <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
                        </TouchableOpacity>

                        <TouchableOpacity 
                            style={[styles.actionRow, { borderBottomWidth: 1, borderBottomColor: isDark ? '#303030' : '#f0f0f0' }]}
                            onPress={toggleDisappearingMessages}
                        >
                            <View style={[styles.iconBox, { backgroundColor: groupData.disappearingMessages ? "#10B981" + '20' : '#8882' }]}>
                                <Ionicons name="timer-outline" size={20} color={groupData.disappearingMessages ? "#10B981" : colors.textSecondary} />
                            </View>
                            <View style={{ flex: 1, marginLeft: 12 }}>
                                <Text style={[styles.actionText, { color: colors.text, marginLeft: 0 }]}>Disappearing Messages</Text>
                                <Text style={{ fontSize: 11, color: colors.textSecondary }}>{groupData.disappearingMessages ? 'On (24 hours)' : 'Off'}</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
                        </TouchableOpacity>

                        <TouchableOpacity 
                            style={[styles.actionRow, { borderBottomWidth: 1, borderBottomColor: isDark ? '#303030' : '#f0f0f0' }]}
                            onPress={handleClearChat}
                        >
                            <View style={[styles.iconBox, { backgroundColor: '#FF4B4B' + '10' }]}>
                                <Ionicons name="trash-outline" size={20} color="#FF4B4B" />
                            </View>
                            <Text style={[styles.actionText, { color: '#FF4B4B' }]}>Clear Chat</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.actionRow} onPress={handleLeaveGroup}>
                            <View style={[styles.iconBox, { backgroundColor: '#FF4B4B' + '10' }]}>
                                <Ionicons name="exit-outline" size={20} color="#FF4B4B" />
                            </View>
                            <Text style={[styles.actionText, { color: '#FF4B4B' }]}>Leave Group</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>

            <AddParticipantModal 
                visible={isAddModalVisible} 
                onClose={() => setIsAddModalVisible(false)} 
                chatId={id as string} 
                existingParticipants={groupData.participants?.map((p: any) => p._id) || []} 
                onSuccess={(updatedChat) => {
                    setGroupData(updatedChat);
                }} 
            />

            <ConfirmModal
                visible={isLeaveModalVisible}
                title="Leave Group"
                message="Are you sure you want to leave this group? You will no longer receive messages from this conversation."
                confirmText="Leave"
                onConfirm={onLeaveGroupConfirm}
                onCancel={() => setIsLeaveModalVisible(false)}
            />

            <ConfirmModal
                visible={isRemoveModalVisible}
                title="Remove User"
                message={`Are you sure you want to remove ${userToRemove?.name}?`}
                confirmText="Remove"
                onConfirm={confirmRemoveUser}
                onCancel={() => setIsRemoveModalVisible(false)}
            />

            <ConfirmModal
                visible={isPromoteModalVisible}
                title="Make Admin"
                message={`Are you sure you want to make ${userToPromote?.name} an admin? They will be able to add/remove users and edit group info.`}
                confirmText="Promote"
                onConfirm={confirmPromoteUser}
                onCancel={() => setIsPromoteModalVisible(false)}
            />

            <ConfirmModal
                visible={isClearModalVisible}
                title="Clear Chat"
                message="Are you sure you want to delete all messages in this chat? This action cannot be undone."
                confirmText="Clear"
                onConfirm={onClearChatConfirm}
                onCancel={() => setIsClearModalVisible(false)}
            />

            <ProcessingModal 
                visible={isUploading} 
                message={uploadMessage} 
            />

            <ImageConfirmModal
                visible={isConfirmModalVisible}
                imageUri={pendingImage?.uri || null}
                title={`Confirm Group ${pendingImage?.type === 'avatar' ? 'Avatar' : 'Cover Image'}`}
                onConfirm={confirmGroupImageUpload}
                onCancel={() => {
                    setIsConfirmModalVisible(false);
                    setPendingImage(null);
                }}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        height: 60,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        borderBottomWidth: 1,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
    },
    backBtn: {
        padding: 4,
    },
    hero: {
        alignItems: 'center',
        paddingBottom: 24,
    },
    coverWrapper: {
        width: '100%',
        height: 120,
        position: 'relative',
    },
    coverGradient: {
        width: '100%',
        height: '100%',
    },
    editCoverBtn: {
        position: 'absolute',
        top: 10,
        right: 10,
        backgroundColor: 'rgba(0,0,0,0.5)',
        padding: 8,
        borderRadius: 20,
    },
    profileInfo: {
        alignItems: 'center',
        marginTop: -50,
    },
    avatarContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        borderWidth: 4,
        overflow: 'hidden',
        backgroundColor: '#eee',
        position: 'relative',
    },
    avatar: {
        width: '100%',
        height: '100%',
    },
    avatarPlaceholder: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#FFF',
    },
    editAvatarBtn: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        left: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        alignItems: 'center',
        paddingVertical: 4,
    },
    groupName: {
        fontSize: 24,
        fontWeight: '800',
        marginTop: 12,
    },
    memberCount: {
        fontSize: 14,
        fontWeight: '500',
        marginTop: 4,
    },
    section: {
        paddingHorizontal: 20,
        marginTop: 32,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 12,
        marginLeft: 4,
        opacity: 0.7,
    },
    listContainer: {
        borderRadius: 16,
        overflow: 'hidden',
    },
    participantItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
    },
    participantAvatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
    },
    participantText: {
        flex: 1,
        marginLeft: 12,
    },
    participantName: {
        fontSize: 16,
        fontWeight: '700',
    },
    participantHandle: {
        fontSize: 13,
    },
    adminBadge: {
        backgroundColor: 'rgba(139, 92, 246, 0.1)',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: 'rgba(139, 92, 246, 0.2)',
    },
    adminText: {
        color: '#8b5cf6',
        fontSize: 9,
        fontWeight: '900',
        textTransform: 'uppercase',
    },
    crownIcon: {
        position: 'absolute',
        bottom: -2,
        right: -2,
        backgroundColor: '#000',
        borderRadius: 10,
        width: 20,
        height: 20,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: '#FFD700',
    },
    actionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
    },
    actionText: {
        fontSize: 15,
        fontWeight: '600',
        marginLeft: 12,
    },
    settingsGroup: {
        borderRadius: 16,
        borderWidth: 1,
        overflow: 'hidden',
        marginTop: 8,
    },
    iconBox: {
        width: 36,
        height: 36,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    groupDesc: {
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
    },
    groupDescInput: {
        width: '100%',
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        fontSize: 14,
        textAlign: 'center',
        minHeight: 60,
    },
    miniBtn: {
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 10,
    }
});
