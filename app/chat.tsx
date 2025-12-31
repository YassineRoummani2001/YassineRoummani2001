import ConfirmationModal from '@/components/ConfirmationModal';
import NewChatModal from '@/components/NewChatModal';
import OnlineIndicator from '@/components/OnlineIndicator';
import { SkeletonRow } from '@/components/Skeletons';
import { API_BASE_URL } from '@/constants/Config';
import { useThemeContext } from '@/context/ThemeContext';
import { useUser } from '@/context/UserContext';
import { useRouter } from 'expo-router';
import { ArrowLeft, Ban, MoreVertical, Search, SquarePen, Trash2, User } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
    FlatList,
    Image,
    Modal,
    Platform,
    SafeAreaView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

export default function ChatScreen() {
    const router = useRouter();
    const userContext = useUser();
    const { user } = (userContext || {}) as any;
    const { theme, colors: activeColors, isDark } = useThemeContext();
    const [isLoading, setIsLoading] = useState(true);
    const [followingUsers, setFollowingUsers] = useState([]);
    const [showNewChat, setShowNewChat] = useState(false);
    const [optionsModalVisible, setOptionsModalVisible] = useState(false);
    const [selectedChatUser, setSelectedChatUser] = useState<any>(null);
    const [successModalVisible, setSuccessModalVisible] = useState(false);
    const [modalMessage, setModalMessage] = useState({ title: '', message: '' });
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        const fetchFollowing = async () => {
            if (!user?._id) return;
            try {
                const response = await fetch(`${API_BASE_URL}/api/auth/following/${user._id}`);
                const data = await response.json();
                if (response.ok) {
                    setFollowingUsers(data);
                }
            } catch (error) {
                console.error('Error fetching following:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchFollowing();
    }, [user?._id]);

    const handleChatOptions = (selectedUser: any) => {
        setSelectedChatUser(selectedUser);
        setOptionsModalVisible(true);
    };

    const deleteChat = (id: string) => {
        setFollowingUsers((prev) => prev.filter((u: any) => u._id !== id));
    };

    const blockUser = async (id: string) => {
        deleteChat(id);
        if (!user?.token) return;
        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/block/${id}`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${user.token}` }
            });

            if (response.ok) {
                // Show success message
                setModalMessage({
                    title: 'User Blocked',
                    message: 'User has been blocked successfully'
                });
                setSuccessModalVisible(true);
            }
        } catch (error) {
            console.error('Error blocking user:', error);
        }
    };

    const renderItem = ({ item }: { item: any }) => (
        <TouchableOpacity
            style={styles.chatItem}
            onPress={() => router.push(`/message/${item._id}`)}
            onLongPress={() => handleChatOptions(item)}
            delayLongPress={500}
        >
            <View style={styles.avatarContainer}>
                <Image source={{ uri: item.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.name)}&background=random` }} style={styles.avatar} />
                <OnlineIndicator isOnline={item.isOnline} size={14} style={styles.onlineIndicator} />
            </View>
            <View style={styles.chatInfo}>
                <View style={styles.row}>
                    <Text style={[styles.name, { color: activeColors.text }]}>{item.name}</Text>
                    {/* Placeholder time for now since these are just users */}
                    <Text style={[styles.time, { color: activeColors.textSecondary }]}></Text>
                </View>
                <Text style={[styles.lastMessage, { color: activeColors.textSecondary }]} numberOfLines={1}>
                    @{item.handle || item.username}
                </Text>
            </View>
            <TouchableOpacity
                style={styles.optionsButton}
                onPress={(e) => {
                    e.stopPropagation();
                    handleChatOptions(item);
                }}
            >
                <MoreVertical size={20} color={activeColors.textSecondary} />
            </TouchableOpacity>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: activeColors.background }]}>
            <View style={[styles.header, { borderBottomColor: activeColors.border }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
                    <ArrowLeft size={24} color={activeColors.text} />
                </TouchableOpacity>
                <Text style={[styles.title, { color: activeColors.text }]}>Chats</Text>
                <TouchableOpacity style={styles.iconButton} onPress={() => setShowNewChat(true)}>
                    <SquarePen size={24} color={activeColors.text} />
                </TouchableOpacity>
            </View>

            <View style={styles.searchContainer}>
                <View style={[styles.searchBar, { backgroundColor: isDark ? '#1A1A1A' : '#F5F5F5' }]}>
                    <Search size={20} color={activeColors.textSecondary} />
                    <TextInput
                        placeholder="Search"
                        placeholderTextColor={activeColors.textSecondary}
                        style={[styles.input, { color: activeColors.text }]}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>
            </View>

            {isLoading ? (
                <View style={styles.listContent}>
                    {Array.from({ length: 8 }).map((_, i) => (
                        <SkeletonRow key={i} />
                    ))}
                </View>
            ) : (
                <FlatList
                    data={followingUsers.filter((u: any) =>
                        u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        (u.handle || u.username || '').toLowerCase().includes(searchQuery.toLowerCase())
                    )}
                    keyExtractor={(item) => item._id}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <View style={{ padding: 20, alignItems: 'center' }}>
                            <Text style={{ color: activeColors.textSecondary }}>Follow people to see them here!</Text>
                        </View>
                    }
                />
            )}

            {/* Chat Options Modal */}
            <Modal
                transparent={true}
                visible={optionsModalVisible}
                animationType="fade"
                onRequestClose={() => setOptionsModalVisible(false)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setOptionsModalVisible(false)}
                >
                    <View style={[styles.modalContent, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: activeColors.text }]}>
                                {selectedChatUser?.name}
                            </Text>
                            <Text style={[styles.modalSubtitle, { color: activeColors.textSecondary }]}>
                                @{selectedChatUser?.handle || selectedChatUser?.username}
                            </Text>
                        </View>

                        <View style={styles.modalOptionsContainer}>
                            <TouchableOpacity
                                style={[styles.modalOption, { borderBottomColor: activeColors.border }]}
                                onPress={() => {
                                    setOptionsModalVisible(false);
                                    router.push(`/user/${selectedChatUser?._id}`);
                                }}
                            >
                                <User size={20} color={activeColors.text} style={styles.optionIcon} />
                                <Text style={[styles.modalOptionText, { color: activeColors.text }]}>View Profile</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.modalOption, { borderBottomColor: activeColors.border }]}
                                onPress={() => {
                                    setOptionsModalVisible(false);
                                    deleteChat(selectedChatUser?._id);
                                }}
                            >
                                <Trash2 size={20} color="#FF3B30" style={styles.optionIcon} />
                                <Text style={[styles.modalOptionText, { color: '#FF3B30' }]}>Delete Chat</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.modalOption, { borderBottomWidth: 0 }]}
                                onPress={() => {
                                    setOptionsModalVisible(false);
                                    blockUser(selectedChatUser?._id);
                                }}
                            >
                                <Ban size={20} color="#FF3B30" style={styles.optionIcon} />
                                <Text style={[styles.modalOptionText, { color: '#FF3B30' }]}>Block User</Text>
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity
                            style={[styles.cancelButton, { backgroundColor: isDark ? '#333' : '#f0f0f0' }]}
                            onPress={() => setOptionsModalVisible(false)}
                        >
                            <Text style={[styles.cancelButtonText, { color: activeColors.text }]}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>


            <NewChatModal visible={showNewChat} onClose={() => setShowNewChat(false)} />

            {/* Success Modal */}
            <ConfirmationModal
                visible={successModalVisible}
                onClose={() => setSuccessModalVisible(false)}
                title={modalMessage.title}
                message={modalMessage.message}
                type="success"
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 0,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    iconButton: {
        padding: 8,
    },
    searchContainer: {
        paddingHorizontal: 16,
        marginBottom: 16,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 12,
        paddingHorizontal: 12,
        height: 44,
        gap: 10,
    },
    input: {
        flex: 1,
        fontSize: 16,
    },
    listContent: {
        paddingBottom: 20,
    },
    chatItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        gap: 12,
    },
    avatarContainer: {
        position: 'relative',
    },
    avatar: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#eee',
    },
    onlineIndicator: {
        position: 'absolute',
        bottom: 2,
        right: 2,
    },
    chatInfo: {
        flex: 1,
        gap: 4,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    name: {
        fontSize: 16,
        fontWeight: '700',
    },
    time: {
        fontSize: 12,
    },
    lastMessage: {
        fontSize: 14,
    },
    optionsButton: {
        padding: 8,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        width: '100%',
        maxWidth: 320,
        borderRadius: 24,
        padding: 24,
        alignItems: 'center',
        boxShadow: '0 4 8 rgba(0,0,0,0.3)',
        elevation: 10,
    },
    modalHeader: {
        alignItems: 'center',
        marginBottom: 24,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
        marginBottom: 4,
        textAlign: 'center',
    },
    modalSubtitle: {
        fontSize: 14,
        textAlign: 'center',
    },
    modalOptionsContainer: {
        width: '100%',
        marginBottom: 20,
    },
    modalOption: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '100%',
        paddingVertical: 16,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    optionIcon: {
        marginRight: 16,
    },
    modalOptionText: {
        fontSize: 16,
        fontWeight: '500',
    },
    cancelButton: {
        width: '100%',
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cancelButtonText: {
        fontSize: 16,
        fontWeight: '600',
    }
});
