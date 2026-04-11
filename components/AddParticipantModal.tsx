import { API_BASE_URL } from '@/constants/Config';
import { useThemeContext } from '@/context/ThemeContext';
import { useUser } from '@/context/UserContext';
import { Search, UserPlus, X, Check } from 'lucide-react-native';
import React, { useEffect, useState, useMemo } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    Modal,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    Platform,
    useWindowDimensions,
    Pressable,
    ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

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
    existingParticipants: string[];
    onSuccess: (updatedChat: any) => void;
}

export default function AddParticipantModal({ visible, onClose, chatId, existingParticipants, onSuccess }: AddParticipantModalProps) {
    const { user } = (useUser() || { user: null }) as any;
    const { colors, isDark } = useThemeContext();
    const { width, height: screenHeight } = useWindowDimensions();
    const isDesktop = Platform.OS === 'web' && width > 768;

    const [users, setUsers] = useState<User[]>([]);
    const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [adding, setAdding] = useState(false);

    useEffect(() => {
        if (visible && user) {
            fetchUsers();
            setSelectedUsers([]);
            setSearchQuery('');
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
                const filteredUsers = data.filter((u: User) => !existingParticipants.includes(u._id));
                setUsers(filteredUsers);
            }
        } catch (error) {
            console.error('Error fetching users:', error);
        } finally {
            setLoading(false);
        }
    };

    const toggleUserSelection = (targetUser: User) => {
        const isSelected = selectedUsers.some(u => u._id === targetUser._id);
        if (isSelected) {
            setSelectedUsers(prev => prev.filter(u => u._id !== targetUser._id));
        } else {
            setSelectedUsers(prev => [...prev, targetUser]);
        }
    };

    const handleAdd = async () => {
        if (selectedUsers.length === 0) return;
        setAdding(true);
        try {
            const userIds = selectedUsers.map(u => u._id);
            const response = await fetch(`${API_BASE_URL}/api/chats/${chatId}/participants`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${user?.token}`
                },
                body: JSON.stringify({ userIds })
            });

            if (response.ok) {
                const updatedChat = await response.json();
                onSuccess(updatedChat);
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

    const filteredUsersList = useMemo(() => {
        return users.filter(u =>
            u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (u.handle && u.handle.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (u.username && u.username.toLowerCase().includes(searchQuery.toLowerCase()))
        );
    }, [users, searchQuery]);

    const styles = useMemo(() => createStyles(colors, isDark, isDesktop, width, screenHeight), [colors, isDark, isDesktop, width, screenHeight]);

    return (
        <Modal visible={visible} animationType="slide" transparent={true} statusBarTranslucent>
            <View style={styles.overlay}>
                <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
                <View style={styles.container}>
                    {/* Header Handle for mobile */}
                    {!isDesktop && <View style={styles.grabber} />}

                    {/* Header */}
                    <View style={styles.header}>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <X size={24} color={colors.textSecondary} />
                        </TouchableOpacity>
                        <Text style={styles.title}>Add Participants</Text>
                        <TouchableOpacity
                            onPress={handleAdd}
                            disabled={selectedUsers.length === 0 || adding}
                            style={[
                                styles.doneBtn,
                                selectedUsers.length > 0 && { backgroundColor: colors.primary }
                            ]}
                        >
                            {adding ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <Text style={[styles.doneText, selectedUsers.length > 0 && { color: '#fff' }]}>
                                    Add{selectedUsers.length > 0 ? ` (${selectedUsers.length})` : ''}
                                </Text>
                            )}
                        </TouchableOpacity>
                    </View>

                    {/* Search Bar */}
                    <View style={styles.searchContainer}>
                        <View style={[styles.searchBar, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
                            <Search size={18} color={colors.textSecondary} />
                            <TextInput
                                style={[styles.searchInput, { color: colors.text }]}
                                placeholder="Search friends..."
                                placeholderTextColor={colors.textSecondary}
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                                autoFocus={isDesktop}
                            />
                            {searchQuery.length > 0 && (
                                <TouchableOpacity onPress={() => setSearchQuery('')}>
                                    <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>

                    {/* Selected Users Bar */}
                    {selectedUsers.length > 0 && (
                        <View style={styles.selectedContainer}>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.selectedScroll}>
                                {selectedUsers.map(u => (
                                    <TouchableOpacity 
                                        key={u._id} 
                                        style={styles.selectedChip}
                                        onPress={() => toggleUserSelection(u)}
                                    >
                                        <Image 
                                            source={{ uri: getCorrectUrl(u.avatar) || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&background=random` }} 
                                            style={styles.selectedAvatar} 
                                        />
                                        <Text style={styles.selectedName} numberOfLines={1}>{u.name.split(' ')[0]}</Text>
                                        <View style={styles.removeIcon}>
                                            <X size={10} color="#fff" />
                                        </View>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>
                    )}

                    {/* User List */}
                    {loading ? (
                        <View style={styles.center}>
                            <ActivityIndicator size="large" color={colors.primary} />
                        </View>
                    ) : (
                        <FlatList
                            data={filteredUsersList}
                            keyExtractor={(item) => item._id}
                            contentContainerStyle={styles.listContent}
                            renderItem={({ item }) => {
                                const isSelected = selectedUsers.some(u => u._id === item._id);
                                return (
                                    <TouchableOpacity 
                                        style={styles.userRow} 
                                        onPress={() => toggleUserSelection(item)}
                                        activeOpacity={0.7}
                                    >
                                        <View style={styles.userInfo}>
                                            <Image 
                                                source={{ uri: getCorrectUrl(item.avatar) || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.name)}&background=random` }} 
                                                style={styles.avatar} 
                                            />
                                            <View style={styles.userMeta}>
                                                <Text style={[styles.userName, { color: colors.text }]}>{item.name}</Text>
                                                <Text style={[styles.userHandle, { color: colors.textSecondary }]}>
                                                    @{ (item.handle || item.username || '').replace(/^@+/, '') }
                                                </Text>
                                            </View>
                                        </View>
                                        <View style={[
                                            styles.checkbox, 
                                            { borderColor: isSelected ? colors.primary : colors.textSecondary + '40' },
                                            isSelected && { backgroundColor: colors.primary }
                                        ]}>
                                            {isSelected && <Check size={14} color="#fff" strokeWidth={3} />}
                                        </View>
                                    </TouchableOpacity>
                                );
                            }}
                            ListEmptyComponent={
                                <View style={styles.empty}>
                                    <Text style={{ color: colors.textSecondary, fontSize: 16 }}>No friends found</Text>
                                </View>
                            }
                        />
                    )}
                </View>
            </View>
        </Modal>
    );
}

const createStyles = (colors: any, isDark: boolean, isDesktop: boolean, width: number, height: number) => StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: isDesktop ? 'center' : 'flex-end',
        alignItems: 'center',
    },
    container: {
        width: isDesktop ? 480 : '100%',
        height: isDesktop ? 600 : height * 0.85,
        backgroundColor: colors.background,
        borderTopLeftRadius: isDesktop ? 24 : 32,
        borderTopRightRadius: isDesktop ? 24 : 32,
        borderRadius: isDesktop ? 24 : 0,
        overflow: 'hidden',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: -4 },
                shadowOpacity: 0.1,
                shadowRadius: 10,
            },
            android: {
                elevation: 20,
            },
            web: {
                boxShadow: '0 -10px 40px rgba(0,0,0,0.2)',
            }
        })
    },
    grabber: {
        width: 40,
        height: 5,
        borderRadius: 3,
        backgroundColor: colors.textSecondary + '30',
        alignSelf: 'center',
        marginTop: 12,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 12,
    },
    closeBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
    },
    title: {
        fontSize: 18,
        fontWeight: '900',
        color: colors.text,
        letterSpacing: -0.5,
    },
    doneBtn: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
    },
    doneText: {
        fontSize: 14,
        fontWeight: '800',
        color: colors.textSecondary,
    },
    searchContainer: {
        paddingHorizontal: 20,
        paddingVertical: 8,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        height: 50,
        borderRadius: 16,
        gap: 10,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        fontWeight: '500',
        padding: 0,
        ...Platform.select({
            web: { outlineStyle: 'none' } as any
        })
    },
    selectedContainer: {
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.border + '50',
    },
    selectedScroll: {
        paddingHorizontal: 20,
        gap: 12,
    },
    selectedChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.primary + '15',
        paddingVertical: 6,
        paddingLeft: 6,
        paddingRight: 10,
        borderRadius: 25,
        gap: 8,
        borderWidth: 1,
        borderColor: colors.primary + '30',
    },
    selectedAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: colors.gray,
    },
    selectedName: {
        fontSize: 13,
        fontWeight: '700',
        color: colors.primary,
    },
    removeIcon: {
        backgroundColor: colors.primary,
        width: 16,
        height: 16,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    listContent: {
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 40,
    },
    userRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
    },
    avatar: {
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: colors.gray,
    },
    userMeta: {
        justifyContent: 'center',
    },
    userName: {
        fontSize: 16,
        fontWeight: '700',
    },
    userHandle: {
        fontSize: 14,
        marginTop: 2,
    },
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    center: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    empty: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 60,
    }
});
