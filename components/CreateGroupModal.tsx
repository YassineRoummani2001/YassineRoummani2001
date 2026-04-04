import OnlineIndicator from '@/components/OnlineIndicator';
import { API_BASE_URL } from '@/constants/Config';
import { useThemeContext } from '@/context/ThemeContext';
import { useUser } from '@/context/UserContext';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Search, X, Check, Camera, Users } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Image,
    Modal,
    SafeAreaView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    Platform,
    Alert
} from 'react-native';

interface User {
    _id: string;
    name: string;
    username?: string;
    avatar?: string;
    isOnline?: boolean;
}

interface CreateGroupModalProps {
    visible: boolean;
    onClose: () => void;
    onSuccess: (chat: any) => void;
}

export default function CreateGroupModal({ visible, onClose, onSuccess }: CreateGroupModalProps) {
    const router = useRouter();
    const { user } = (useUser() || {}) as any;
    const { theme, colors: activeColors, isDark } = useThemeContext();

    const [users, setUsers] = useState<User[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
    const [groupName, setGroupName] = useState('');
    const [groupAvatar, setGroupAvatar] = useState('');
    const [loading, setLoading] = useState(false);
    const [creating, setCreating] = useState(false);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.7,
        });

        if (!result.canceled) {
            uploadAvatarUrl(result.assets[0].uri);
        }
    };

    const uploadAvatarUrl = async (uri: string) => {
        if (!user?.token) return;
        setUploadingAvatar(true);
        try {
            const formData = new FormData();
            
            if (Platform.OS === 'web') {
                const response = await fetch(uri);
                const blob = await response.blob();
                formData.append('image', blob, 'upload_avatar.jpg');
            } else {
                const filename = uri.split('/').pop() || 'upload.jpg';
                const match = /\.(\w+)$/.exec(filename);
                const fileType = match ? `image/${match[1]}` : 'image/jpeg';

                formData.append('image', {
                    uri,
                    name: filename,
                    type: fileType,
                } as any);
            }

            const uploadRes = await fetch(`${API_BASE_URL}/api/upload`, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${user.token}`,
                    'Accept': 'application/json'
                },
                body: formData,
            });

            if (uploadRes.ok) {
                const uploadData = await uploadRes.json();
                setGroupAvatar(uploadData.url);
            } else {
                const errData = await uploadRes.json();
                console.error("Upload error response:", errData);
                Alert.alert("Error", errData.message || "Failed to upload image");
            }
        } catch (error) {
            console.error("Upload error:", error);
            Alert.alert("Error", "Failed to upload image");
        } finally {
            setUploadingAvatar(false);
        }
    };

    useEffect(() => {
        if (visible && user) {
            fetchFollowingUsers();
        }
    }, [visible, user]);

    const fetchFollowingUsers = async () => {
        if (!user?.token) return;
        setLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/following/${user._id}`, {
                headers: { 'Authorization': `Bearer ${user.token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setUsers(data);
            }
        } catch (error) {
            console.error('Error fetching users:', error);
        } finally {
            setLoading(false);
        }
    };

    const toggleUser = (userId: string) => {
        setSelectedUsers(prev => 
            prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
        );
    };

    const handleCreateGroup = async () => {
        if (!groupName.trim()) {
            Alert.alert("Required", "Please enter a group name");
            return;
        }
        if (selectedUsers.length === 0) {
            Alert.alert("Required", "Please select at least one person");
            return;
        }

        setCreating(true);
        try {
            const response = await fetch(`${API_BASE_URL}/api/chats/group`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${user.token}`
                },
                body: JSON.stringify({
                    name: groupName,
                    users: selectedUsers,
                    avatar: groupAvatar
                })
            });

            if (response.ok) {
                const newChat = await response.json();
                onSuccess(newChat);
                onClose();
                // Reset state
                setGroupName('');
                setSelectedUsers([]);
                setGroupAvatar('');
            } else {
                const err = await response.json();
                Alert.alert("Error", err.message || "Failed to create group");
            }
        } catch (error) {
            console.error('Error creating group:', error);
            Alert.alert("Error", "Something went wrong");
        } finally {
            setCreating(false);
        }
    };

    const filteredUsers = users.filter((u: User) =>
        u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (u.username && u.username.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={onClose}
        >
            <SafeAreaView style={[styles.safeArea, { backgroundColor: activeColors.background }]}>
                {/* Header */}
                <View style={[styles.header, { borderBottomColor: activeColors.border }]}>
                    <TouchableOpacity onPress={onClose} style={styles.iconButton}>
                        <Text style={{ color: activeColors.text, fontSize: 16 }}>Cancel</Text>
                    </TouchableOpacity>
                    <Text style={[styles.title, { color: activeColors.text }]}>New Group</Text>
                    <TouchableOpacity 
                        onPress={handleCreateGroup} 
                        disabled={creating || !groupName || selectedUsers.length === 0}
                        style={{ opacity: (creating || !groupName || selectedUsers.length === 0) ? 0.5 : 1 }}
                    >
                        {creating ? (
                            <ActivityIndicator size="small" color={activeColors.primary} />
                        ) : (
                            <Text style={{ color: activeColors.primary, fontSize: 16, fontWeight: '700' }}>Create</Text>
                        )}
                    </TouchableOpacity>
                </View>

                {/* Group Info Input */}
                <View style={styles.groupInfoContainer}>
                    <TouchableOpacity 
                        style={[styles.avatarUpload, { backgroundColor: isDark ? '#2C2C2E' : '#E5E5EA', overflow: 'hidden' }]}
                        onPress={pickImage}
                        disabled={uploadingAvatar}
                    >
                        {uploadingAvatar ? (
                            <ActivityIndicator size="small" color={activeColors.primary} />
                        ) : groupAvatar ? (
                            <Image source={{ uri: groupAvatar.startsWith('http') ? groupAvatar : `${API_BASE_URL}/uploads/${groupAvatar}` }} style={{ width: '100%', height: '100%' }} />
                        ) : (
                            <Camera size={24} color={activeColors.textSecondary} />
                        )}
                    </TouchableOpacity>
                    <TextInput
                        style={[styles.groupNameInput, { color: activeColors.text, borderBottomColor: activeColors.border }]}
                        placeholder="Group Name"
                        placeholderTextColor={activeColors.textSecondary}
                        value={groupName}
                        onChangeText={setGroupName}
                    />
                </View>

                {/* Search Bar */}
                <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
                    <View style={[styles.searchContainer, { backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7' }]}>
                        <Search size={18} color={activeColors.textSecondary} />
                        <TextInput
                            style={[styles.searchInput, { color: activeColors.text }]}
                            placeholder="Add People"
                            placeholderTextColor={activeColors.textSecondary}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                    </View>
                </View>

                {/* Selected Users Pill List (Horizontal) */}
                {selectedUsers.length > 0 && (
                    <View style={{ height: 50, marginBottom: 10 }}>
                        <FlatList
                            horizontal
                            data={selectedUsers}
                            keyExtractor={id => id}
                            contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
                            showsHorizontalScrollIndicator={false}
                            renderItem={({ item: userId }) => {
                                const u = users.find(u => u._id === userId);
                                if (!u) return null;
                                return (
                                    <TouchableOpacity 
                                        onPress={() => toggleUser(userId)}
                                        style={[styles.pill, { backgroundColor: activeColors.primary + '20' }]}
                                    >
                                        <Text style={{ color: activeColors.primary, fontSize: 12, fontWeight: '600' }}>{u.name}</Text>
                                        <X size={14} color={activeColors.primary} />
                                    </TouchableOpacity>
                                );
                            }}
                        />
                    </View>
                )}

                {/* Users List */}
                {loading ? (
                    <View style={styles.centerContainer}>
                        <ActivityIndicator size="large" color={activeColors.primary} />
                    </View>
                ) : (
                    <FlatList
                        data={filteredUsers}
                        keyExtractor={(item) => item._id}
                        contentContainerStyle={{ paddingBottom: 20 }}
                        renderItem={({ item }) => {
                            const isSelected = selectedUsers.includes(item._id);
                            return (
                                <TouchableOpacity
                                    style={[styles.userItem]}
                                    onPress={() => toggleUser(item._id)}
                                >
                                    <View style={styles.userInfo}>
                                        <View style={{ position: 'relative' }}>
                                            <Image
                                                source={{
                                                    uri: item.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.name)}&background=random`
                                                }}
                                                style={styles.avatar}
                                            />
                                            <OnlineIndicator isOnline={item.isOnline} size={12} style={{ position: 'absolute', bottom: 0, right: 0 }} />
                                        </View>
                                        <View>
                                            <Text style={[styles.userName, { color: activeColors.text }]}>{item.name}</Text>
                                            {item.username && (
                                                <Text style={[styles.username, { color: activeColors.textSecondary }]}>@{item.username}</Text>
                                            )}
                                        </View>
                                    </View>
                                    <View style={[
                                        styles.checkbox, 
                                        { 
                                            borderColor: isSelected ? activeColors.primary : activeColors.border,
                                            backgroundColor: isSelected ? activeColors.primary : 'transparent'
                                        }
                                    ]}>
                                        {isSelected && <Check size={14} color="#FFF" />}
                                    </View>
                                </TouchableOpacity>
                            );
                        }}
                        ListEmptyComponent={
                            <View style={styles.centerContainer}>
                                <Text style={{ color: activeColors.textSecondary }}>
                                    {searchQuery ? 'No users found' : 'No following users'}
                                </Text>
                            </View>
                        }
                    />
                )}
            </SafeAreaView>
        </Modal >
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 16,
        borderBottomWidth: 1,
    },
    title: { fontSize: 18, fontWeight: '700' },
    iconButton: { padding: 4 },
    groupInfoContainer: {
        flexDirection: 'row',
        padding: 16,
        alignItems: 'center',
        gap: 16,
    },
    avatarUpload: {
        width: 60,
        height: 60,
        borderRadius: 30,
        alignItems: 'center',
        justifyContent: 'center',
    },
    groupNameInput: {
        flex: 1,
        fontSize: 18,
        paddingVertical: 8,
        borderBottomWidth: 1,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
        gap: 8,
    },
    searchInput: { flex: 1, fontSize: 16 },
    userItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    userInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#eee' },
    userName: { fontSize: 16, fontWeight: '600' },
    username: { fontSize: 14 },
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    pill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 50 },
});
