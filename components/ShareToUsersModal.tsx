import { Colors } from '@/constants/Colors';
import { API_BASE_URL } from '@/constants/Config';
import { useThemeContext } from '@/context/ThemeContext';
import { useUser } from '@/context/UserContext';
import { getCorrectUrl } from '@/utils/api';
import { Search, Send, X } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    Modal,
    SafeAreaView,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

interface User {
    _id: string;
    name: string;
    username?: string;
    avatar?: string;
}

interface ShareToUsersModalProps {
    visible: boolean;
    onClose: () => void;
    post: any;
}

export default function ShareToUsersModal({ visible, onClose, post }: ShareToUsersModalProps) {
    const { user } = (useUser() || {}) as any;
    const { theme, colors: activeColors, isDark } = useThemeContext();
    const colorScheme = theme; // Backward compatibility alias if needed, or just use theme


    const [users, setUsers] = useState<User[]>([]);
    const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [sending, setSending] = useState(false);

    useEffect(() => {
        if (visible && user) {
            fetchUsers();
        }
    }, [visible, user]);

    const fetchUsers = async () => {
        if (!user?.token) return;

        setLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/following/${user._id || user.id}`, {
                headers: {
                    'Authorization': `Bearer ${user.token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                const filteredUsers = data.filter((u: User) => u._id !== user._id);
                setUsers(filteredUsers);
            } else {
                console.error('Failed to fetch users:', response.status);
            }
        } catch (error) {
            console.error('Error fetching users:', error);
        } finally {
            setLoading(false);
        }
    };

    const toggleUserSelection = (userId: string) => {
        setSelectedUsers(prev =>
            prev.includes(userId)
                ? prev.filter(id => id !== userId)
                : [...prev, userId]
        );
    };

    const handleSend = async () => {
        if (selectedUsers.length === 0) return;

        setSending(true);

        try {
            // 1. Increment share count
            await fetch(`${API_BASE_URL}/api/posts/${post._id || post.id}/share`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${user?.token}` }
            });

            // 2. Send message to each selected user
            // Determine the correct post type
            const postType = post.type || (post.videoUri || post.isVideo ? 'video' : 'image');
            const postLink = `${API_BASE_URL}/${postType === 'reel' ? 'reel' : 'post'}/${post._id || post.id}`;
            const messageContent = `Check out this ${postType}: ${postLink}`;

            await Promise.all(selectedUsers.map(async (userId) => {
                try {
                    // a. Get or create chat
                    const chatRes = await fetch(`${API_BASE_URL}/api/chats`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${user?.token}`
                        },
                        body: JSON.stringify({ userId })
                    });

                    if (!chatRes.ok) throw new Error('Failed to get chat');
                    const chat = await chatRes.json();

                    // b. Send message
                    await fetch(`${API_BASE_URL}/api/chats/${chat._id}/messages`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${user?.token}`
                        },
                        body: JSON.stringify({
                            content: messageContent,
                            type: postType, // Use actual post type
                            postId: post._id || post.id
                        })
                    });
                } catch (err) {
                    console.error(`Failed to send to user ${userId}`, err);
                }
            }));

            Alert.alert(
                'Sent',
                `Post shared with ${selectedUsers.length} user${selectedUsers.length > 1 ? 's' : ''}!`
            );

            setSelectedUsers([]);
            setSending(false);
            onClose();
        } catch (error) {
            console.error('Error sharing:', error);
            Alert.alert('Error', 'Failed to share post');
            setSending(false);
        }
    };

    const filteredUsers = users.filter(u =>
        u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (u.username && u.username.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    return (
        <Modal
            visible={visible}
            animationType="fade"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
                <SafeAreaView style={[
                    styles.safeArea, 
                    { 
                        backgroundColor: activeColors.background,
                        width: Platform.OS === 'web' ? 400 : '100%',
                        maxHeight: Platform.OS === 'web' ? '80%' : '100%',
                        borderRadius: Platform.OS === 'web' ? 16 : 0,
                        overflow: 'hidden'
                    }
                ]}>
                {/* Header */}
                <View style={[styles.header, { borderBottomColor: activeColors.border }]}>
                    <TouchableOpacity onPress={onClose} style={styles.iconButton}>
                        <X size={26} color={activeColors.text} />
                    </TouchableOpacity>
                    <Text style={[styles.title, { color: activeColors.text }]}>Share to...</Text>
                    <TouchableOpacity
                        onPress={handleSend}
                        disabled={selectedUsers.length === 0 || sending}
                        style={[styles.sendButton, { opacity: selectedUsers.length === 0 ? 0.5 : 1 }]}
                    >
                        {sending ? (
                            <ActivityIndicator size="small" color="white" />
                        ) : (
                            <Send size={20} color="white" />
                        )}
                    </TouchableOpacity>
                </View>

                {/* Search Bar */}
                <View style={[styles.searchContainer, { backgroundColor: colorScheme === 'dark' ? '#1A1A1A' : '#F0F0F0' }]}>
                    <Search size={20} color={activeColors.textSecondary} />
                    <TextInput
                        style={[styles.searchInput, { color: activeColors.text }]}
                        placeholder="Search users..."
                        placeholderTextColor={activeColors.textSecondary}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>

                {/* Users List */}
                {loading ? (
                    <View style={styles.centerContainer}>
                        <ActivityIndicator size="large" color={activeColors.tint} />
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
                                    style={[styles.userItem, { borderBottomColor: activeColors.border }]}
                                    onPress={() => toggleUserSelection(item._id)}
                                >
                                    <View style={styles.userInfo}>
                                        <Image
                                            source={{
                                                uri: getCorrectUrl(item.avatar) || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.name)}&background=random`
                                            }}
                                            style={styles.avatar}
                                        />
                                        <View>
                                            <Text style={[styles.userName, { color: activeColors.text }]}>{item.name}</Text>
                                            {item.username && (
                                                <Text style={[styles.username, { color: activeColors.textSecondary }]}>@{item.username}</Text>
                                            )}
                                        </View>
                                    </View>
                                    <View style={[
                                        styles.checkbox,
                                        { borderColor: isSelected ? activeColors.tint : activeColors.textSecondary },
                                        isSelected && { backgroundColor: activeColors.tint }
                                    ]}>
                                        {isSelected && (
                                            <View style={styles.checkmark} />
                                        )}
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

                {/* Floating Bottom Bar (Optional if needed, but header button is enough) */}
                </SafeAreaView>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 16,
        borderBottomWidth: 1,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    iconButton: {
        padding: 4,
    },
    sendButton: {
        backgroundColor: Colors.light.primary, // Using primary color directly or we could use activeColors.tint
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        margin: 16,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 12,
        gap: 12,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
    },
    userItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#eee',
    },
    userName: {
        fontSize: 16,
        fontWeight: '600',
    },
    username: {
        fontSize: 14,
    },
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkmark: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: 'white',
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 50,
    },
});
