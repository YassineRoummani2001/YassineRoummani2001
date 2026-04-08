import { Colors } from '@/constants/Colors';
import { API_BASE_URL } from '@/constants/Config';
import { useThemeContext } from '@/context/ThemeContext';
import { useUser } from '@/context/UserContext';
import { Search, UserPlus, X } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
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
    useWindowDimensions,
} from 'react-native';

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

interface User {
    _id: string;
    name: string;
    username?: string;
    handle?: string;
    avatar?: string;
}

interface AddParticipantModalProps {
    visible: boolean;
    onClose: () => void;
    chatId: string;
    existingParticipants: string[]; // Pass IDs of users already in group
    onSuccess: (updatedChat: any) => void;
}

export default function AddParticipantModal({ visible, onClose, chatId, existingParticipants, onSuccess }: AddParticipantModalProps) {
    const { user } = (useUser() || { user: null }) as any;
    const { colors: activeColors, isDark } = useThemeContext();
    const { width } = useWindowDimensions();
    const isDesktop = Platform.OS === 'web' && width > 768;

    const [users, setUsers] = useState<User[]>([]);
    const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [adding, setAdding] = useState(false);

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
                headers: { 'Authorization': `Bearer ${user.token}` }
            });

            if (response.ok) {
                const data = await response.json();
                // Exclude users who are already in the group
                const filteredUsers = data.filter((u: User) => !existingParticipants.includes(u._id));
                setUsers(filteredUsers);
            }
        } catch (error) {
            console.error('Error fetching users:', error);
        } finally {
            setLoading(false);
        }
    };

    const toggleUserSelection = (userId: string) => {
        setSelectedUsers(prev => prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]);
    };

    const handleAdd = async () => {
        if (selectedUsers.length === 0) return;
        setAdding(true);
        try {
            const response = await fetch(`${API_BASE_URL}/api/chats/${chatId}/participants`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${user?.token}`
                },
                body: JSON.stringify({ userIds: selectedUsers })
            });

            if (response.ok) {
                const updatedChat = await response.json();
                Alert.alert('Success', `${selectedUsers.length} user(s) added!`);
                onSuccess(updatedChat);
                setSelectedUsers([]);
                setSearchQuery('');
                onClose();
            } else {
                throw new Error('Failed to add users');
            }
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to add participants');
        } finally {
            setAdding(false);
        }
    };

    const filteredUsers = users.filter(u =>
        u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (u.handle && u.handle.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (u.username && u.username.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    return (
        <Modal visible={visible} animationType="fade" transparent={true} onRequestClose={onClose}>
            <View style={styles.modalOverlay}>
                <View style={[
                    styles.modalContainer, 
                    { backgroundColor: activeColors.background },
                    isDesktop && styles.modalContainerDesktop
                ]}>
                    <View style={[styles.header, { borderBottomColor: activeColors.border }]}>
                        <TouchableOpacity onPress={onClose} style={styles.iconButton}>
                            <X size={26} color={activeColors.text} />
                        </TouchableOpacity>
                        <Text style={[styles.title, { color: activeColors.text }]}>Add Participants</Text>
                        <TouchableOpacity
                            onPress={handleAdd}
                            disabled={selectedUsers.length === 0 || adding}
                            style={[styles.addButton, { opacity: selectedUsers.length === 0 ? 0.5 : 1 }]}
                        >
                            {adding ? <ActivityIndicator size="small" color="white" /> : <UserPlus size={20} color="white" />}
                        </TouchableOpacity>
                    </View>

                    <View style={[styles.searchContainer, { backgroundColor: isDark ? '#1A1A1A' : '#F0F0F0' }]}>
                        <Search size={20} color={activeColors.textSecondary} />
                        <TextInput
                            style={[styles.searchInput, { color: activeColors.text }]}
                            placeholder="Search users to add..."
                            placeholderTextColor={activeColors.textSecondary}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                    </View>

                    {loading ? (
                        <View style={styles.centerContainer}><ActivityIndicator size="large" color={activeColors.primary} /></View>
                    ) : (
                        <FlatList
                            data={filteredUsers}
                            keyExtractor={(item) => item._id}
                            renderItem={({ item }) => {
                                const isSelected = selectedUsers.includes(item._id);
                                return (
                                    <TouchableOpacity style={[styles.userItem, { borderBottomColor: activeColors.border }]} onPress={() => toggleUserSelection(item._id)}>
                                        <View style={styles.userInfo}>
                                            <Image 
                                                source={{ uri: getCorrectUrl(item.avatar) || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.name)}&background=random` }} 
                                                style={styles.avatar} 
                                            />
                                            <View>
                                                <Text style={[{ fontSize: 16, fontWeight: '600', color: activeColors.text }]}>{item.name}</Text>
                                                <Text style={[{ fontSize: 14, color: activeColors.textSecondary }]}>@{ (item.handle || item.username || '').replace(/^@+/, '') }</Text>
                                            </View>
                                        </View>
                                        <View style={[styles.checkbox, { borderColor: isSelected ? activeColors.primary : activeColors.textSecondary }, isSelected && { backgroundColor: activeColors.primary }]}>
                                            {isSelected && <View style={styles.checkmark} />}
                                        </View>
                                    </TouchableOpacity>
                                );
                            }}
                            ListEmptyComponent={<View style={styles.centerContainer}><Text style={{ color: activeColors.textSecondary }}>No new users to add</Text></View>}
                        />
                    )}
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    modalContainer: { width: '100%', height: '100%', overflow: 'hidden' },
    modalContainerDesktop: { width: 500, height: '80%', maxHeight: 800, borderRadius: 16 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: 1 },
    title: { fontSize: 18, fontWeight: 'bold' },
    iconButton: { padding: 4 },
    addButton: { backgroundColor: '#8b5cf6', width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    searchContainer: { flexDirection: 'row', alignItems: 'center', margin: 16, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, gap: 12 },
    searchInput: { flex: 1, fontSize: 16, outlineStyle: 'none' } as any,
    userItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
    userInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#eee' },
    checkbox: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
    checkmark: { width: 10, height: 10, borderRadius: 5, backgroundColor: 'white' },
    centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 50 },
});
