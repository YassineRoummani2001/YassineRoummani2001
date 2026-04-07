import OnlineIndicator from '@/components/OnlineIndicator';
import { API_BASE_URL } from '@/constants/Config';
import { useThemeContext } from '@/context/ThemeContext';
import { useUser } from '@/context/UserContext';
import { getCorrectUrl } from '@/utils/api';
import { useRouter } from 'expo-router';
import { Search, X } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
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
    isOnline?: boolean;
}

interface NewChatModalProps {
    visible: boolean;
    onClose: () => void;
}

export default function NewChatModal({ visible, onClose }: NewChatModalProps) {
    const router = useRouter();
    const { user } = (useUser() || {}) as any;
    const { theme, colors: activeColors, isDark } = useThemeContext();
    const colorScheme = theme;

    const [users, setUsers] = useState<User[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(false);

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
                headers: {
                    'Authorization': `Bearer ${user.token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                setUsers(data);
            } else {
                console.error('Failed to fetch users:', response.status);
            }
        } catch (error) {
            console.error('Error fetching users:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectUser = (userId: string) => {
        onClose();
        router.push(`/message/${userId}`);
    };

    const filteredUsers = users.filter((u: User) =>
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
                    <Text style={[styles.title, { color: activeColors.text }]}>New Message</Text>
                    <View style={{ width: 40 }} />
                </View>

                {/* Search Bar */}
                <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
                    <View style={[styles.searchContainer, { backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7', margin: 0 }]}>
                        <Search size={18} color={activeColors.textSecondary} />
                        <TextInput
                            style={[styles.searchInput, { color: activeColors.text }]}
                            placeholder="To: "
                            placeholderTextColor={activeColors.textSecondary}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                    </View>
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
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={[styles.userItem, { borderBottomColor: activeColors.border }]}
                                onPress={() => handleSelectUser(item._id)}
                            >
                                <View style={styles.userInfo}>
                                    <View style={{ position: 'relative' }}>
                                        <Image
                                            source={{
                                                uri: getCorrectUrl(item.avatar) || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.name)}&background=random`
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
                            </TouchableOpacity>
                        )}
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
            </View>
        </Modal >
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
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 24, // Pill shape
        gap: 8,
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
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 50,
    },
});
