import ConfirmationModal from '@/components/ConfirmationModal';
import { API_BASE_URL } from '@/constants/Config';
import { useThemeContext } from '@/context/ThemeContext';
import { useUser } from '@/context/UserContext';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Image,
    Modal,
    Platform,
    SafeAreaView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

export default function BlockedUsersScreen() {
    const router = useRouter();
    const { user } = (useUser() || { user: null }) as any;
    const { theme, colors: activeColors, isDark } = useThemeContext();

    const [blockedUsers, setBlockedUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [confirmModalVisible, setConfirmModalVisible] = useState(false);
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [successModalVisible, setSuccessModalVisible] = useState(false);
    const [errorModalVisible, setErrorModalVisible] = useState(false);
    const [modalMessage, setModalMessage] = useState({ title: '', message: '' });

    useEffect(() => {
        if (user?.token) {
            fetchBlockedUsers();
        }
    }, [user?.token]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchBlockedUsers();
    };

    const fetchBlockedUsers = async () => {
        if (!user?.token) return;

        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/blocked`, {
                headers: {
                    'Authorization': `Bearer ${user.token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                setBlockedUsers(data);
            }
        } catch (error) {
            console.error('Error fetching blocked users:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleUnblock = (userId: string, userName: string) => {
        setSelectedUser({ _id: userId, name: userName });
        setConfirmModalVisible(true);
    };

    const confirmUnblock = async () => {
        if (!selectedUser) return;

        setConfirmModalVisible(false);

        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/unblock/${selectedUser._id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${user.token}`
                }
            });

            if (response.ok) {
                // Remove from blocked list after successful unblock
                setBlockedUsers(prev => prev.filter((u: any) => u._id !== selectedUser._id));

                // Show success message
                setModalMessage({
                    title: 'User Unblocked',
                    message: `${selectedUser.name} has been unblocked`
                });
                setSuccessModalVisible(true);
            }
        } catch (error) {
            console.error('Error unblocking user:', error);
            setModalMessage({
                title: 'Error',
                message: 'Failed to unblock user'
            });
            setErrorModalVisible(true);
        }
    };

    const renderItem = ({ item }: { item: any }) => (
        <View style={[styles.userItem, { borderBottomColor: activeColors.border }]}>
            <Image source={{ uri: item.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.name)}&background=random` }} style={styles.avatar} />
            <View style={styles.userInfo}>
                <Text style={[styles.name, { color: activeColors.text }]}>{item.name}</Text>
                <Text style={[styles.handle, { color: activeColors.textSecondary }]}>@{item.handle}</Text>
            </View>
            <TouchableOpacity
                style={styles.unblockButton}
                onPress={() => handleUnblock(item._id, item.name)}
            >
                <Text style={styles.unblockText}>Unblock</Text>
            </TouchableOpacity>
        </View>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: activeColors.background }]}>
            <View style={[styles.header, { borderBottomColor: activeColors.border }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <ArrowLeft size={24} color={activeColors.text} />
                </TouchableOpacity>
                <Text style={[styles.title, { color: activeColors.text }]}>Blocked Users</Text>
                <View style={{ width: 40 }} />
            </View>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={activeColors.tint} />
                </View>
            ) : (
                <FlatList
                    data={blockedUsers}
                    keyExtractor={(item) => item._id}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContent}
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Text style={{ color: activeColors.textSecondary }}>No blocked users</Text>
                        </View>
                    }
                />
            )}

            {/* Confirmation Modal */}
            <Modal
                transparent={true}
                visible={confirmModalVisible}
                animationType="fade"
                onRequestClose={() => setConfirmModalVisible(false)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setConfirmModalVisible(false)}
                >
                    <View style={[styles.modalContent, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' }]}>
                        <Text style={[styles.modalTitle, { color: activeColors.text }]}>
                            Unblock User?
                        </Text>
                        <Text style={[styles.modalMessage, { color: activeColors.textSecondary }]}>
                            Are you sure you want to unblock {selectedUser?.name}?
                        </Text>

                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.cancelButton, { backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7' }]}
                                onPress={() => setConfirmModalVisible(false)}
                            >
                                <Text style={[styles.buttonText, { color: activeColors.text }]}>Cancel</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.modalButton, styles.confirmButton, { backgroundColor: activeColors.tint }]}
                                onPress={confirmUnblock}
                            >
                                <Text style={[styles.buttonText, { color: '#FFFFFF' }]}>Unblock</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* Success Modal */}
            <ConfirmationModal
                visible={successModalVisible}
                onClose={() => setSuccessModalVisible(false)}
                title={modalMessage.title}
                message={modalMessage.message}
                type="success"
            />

            {/* Error Modal */}
            <ConfirmationModal
                visible={errorModalVisible}
                onClose={() => setErrorModalVisible(false)}
                title={modalMessage.title}
                message={modalMessage.message}
                type="error"
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
        borderBottomWidth: 1,
    },
    backButton: {
        padding: 4,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    listContent: {
        padding: 16,
    },
    userItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#eee',
    },
    userInfo: {
        flex: 1,
        marginLeft: 12,
    },
    name: {
        fontSize: 16,
        fontWeight: '600',
    },
    handle: {
        fontSize: 14,
        marginTop: 2,
    },
    unblockButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: '#eee',
        borderRadius: 8,
    },
    unblockText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#000',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: 100,
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
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 10,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
        marginBottom: 12,
        textAlign: 'center',
    },
    modalMessage: {
        fontSize: 15,
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 22,
    },
    modalButtons: {
        flexDirection: 'row',
        gap: 12,
        width: '100%',
    },
    modalButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cancelButton: {
        // backgroundColor set dynamically
    },
    confirmButton: {
        // backgroundColor set dynamically
    },
    buttonText: {
        fontSize: 16,
        fontWeight: '600',
    }
});
