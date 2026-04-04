
import { Colors } from '@/constants/Colors';
import { API_BASE_URL } from '@/constants/Config';
import { useThemeContext } from '@/context/ThemeContext';
import { useUser } from '@/context/UserContext';
import { Send, X } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Image, KeyboardAvoidingView, Modal, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

interface Comment {
    _id: string;
    text: string;
    user: {
        _id: string;
        name: string;
        avatar: string;
        handle?: string;
    };
    createdAt: string;
}

interface CommentsModalProps {
    visible: boolean;
    onClose: () => void;
    postId: string;
    initialComments?: Comment[]; // Optional if we want to show immediately
    onCommentAdded?: (newCount: number) => void;
}

const formatTime = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    return `${Math.floor(diff / 86400)}d`;
};

export default function CommentsModal({ visible, onClose, postId, initialComments = [], onCommentAdded }: CommentsModalProps) {
    const { user } = (useUser() || {}) as any;
    const { colors, isDark } = useThemeContext();
    const [comments, setComments] = useState<Comment[]>(initialComments);
    const [loading, setLoading] = useState(false);
    const [inputText, setInputText] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (visible && postId) {
            fetchComments();
        }
    }, [visible, postId]);

    const fetchComments = async () => {
        setLoading(true);
        try {
            // We can re-fetch the post to get fresh comments
            const res = await fetch(`${API_BASE_URL}/api/posts/${postId}`);
            if (res.ok) {
                const data = await res.json();
                const rawComments = data.comments || [];
                const sorted = [...rawComments].sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                setComments(sorted);
            }
        } catch (error) {
            console.error("Error fetching comments", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSend = async () => {
        if (!inputText.trim() || submitting || !user) return;

        setSubmitting(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/posts/${postId}/comment`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${user.token}`
                },
                body: JSON.stringify({ text: inputText.trim() })
            });

            if (res.ok) {
                const updatedComments = await res.json();
                const sorted = [...updatedComments].sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                setComments(sorted);
                setInputText('');
                if (onCommentAdded) {
                    onCommentAdded(updatedComments.length);
                }
            }
        } catch (error) {
            console.error("Error posting comment", error);
        } finally {
            setSubmitting(false);
        }
    };

    const renderItem = ({ item }: { item: Comment }) => (
        <View style={styles.commentItem}>
            <Image source={{ uri: item.user.avatar || 'https://i.pravatar.cc/100?u=' + item.user._id }} style={styles.avatar} />
            <View style={styles.commentContent}>
                <View style={styles.commentHeader}>
                    <Text style={[styles.username, { color: colors.text }]}>{item.user.name}</Text>
                    <Text style={[styles.time, { color: colors.textSecondary }]}>{formatTime(item.createdAt)}</Text>
                </View>
                <Text style={[styles.commentText, { color: colors.text }]}>{item.text}</Text>
            </View>
        </View>
    );

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent
            onRequestClose={onClose}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.container}
            >
                <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />

                <View style={[styles.sheet, { backgroundColor: colors.background }]}>
                    <View style={[styles.header, { borderBottomColor: colors.border }]}>
                        <Text style={[styles.title, { color: colors.text }]}>Comments</Text>
                        <TouchableOpacity onPress={onClose}>
                            <X size={24} color={colors.text} />
                        </TouchableOpacity>
                    </View>
                    {loading ? (
                        <View style={styles.center}>
                            <ActivityIndicator color={colors.primary} />
                        </View>
                    ) : (
                        <FlatList
                            data={comments}
                            keyExtractor={(item) => item._id || Math.random().toString()}
                            renderItem={renderItem}
                            style={{ flex: 1 }}
                            contentContainerStyle={[styles.listContent, { paddingBottom: 80 }]}
                            ListEmptyComponent={
                                <View style={styles.center}>
                                    <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No comments yet.</Text>
                                    <Text style={[styles.emptySubText, { color: colors.textSecondary }]}>Be the first to comment!</Text>
                                </View>
                            }
                        />
                    )}

                    <View style={[styles.inputContainer, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
                        <Image source={{ uri: user?.avatar || 'https://i.pravatar.cc/100?u=current_user' }} style={styles.inputAvatar} />
                        <TextInput
                            style={[
                                styles.input,
                                {
                                    backgroundColor: isDark ? '#1F1F1F' : '#F5F5F5',
                                    color: colors.text
                                }
                            ]}
                            placeholder="Add a comment..."
                            placeholderTextColor={colors.textSecondary}
                            value={inputText}
                            onChangeText={setInputText}
                            multiline
                            maxLength={500}
                        />
                        <TouchableOpacity
                            onPress={handleSend}
                            disabled={!inputText.trim() || submitting}
                            style={[styles.sendButton, { backgroundColor: colors.primary }, (!inputText.trim() || submitting) && styles.sendButtonDisabled]}
                        >
                            {submitting ? <ActivityIndicator size="small" color="#fff" /> : <Send size={20} color="#fff" />}
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    sheet: {
        backgroundColor: 'white',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        height: '70%', // Take up 70% of screen
        display: 'flex',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    title: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1A1A1A',
    },
    listContent: {
        padding: 16,
    },
    center: {
        padding: 40,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 16,
        color: '#666',
        marginBottom: 8,
    },
    emptySubText: {
        fontSize: 14,
        color: '#999',
    },
    commentItem: {
        flexDirection: 'row',
        marginBottom: 16,
    },
    avatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        marginRight: 12,
        backgroundColor: '#eee',
    },
    commentContent: {
        flex: 1,
    },
    commentHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    username: {
        fontWeight: 'bold',
        fontSize: 13,
        color: '#1A1A1A',
        marginRight: 8,
    },
    time: {
        fontSize: 12,
        color: '#999',
    },
    commentText: {
        fontSize: 14,
        color: '#333',
        lineHeight: 20,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderTopWidth: 1,
        borderTopColor: '#F0F0F0',
        backgroundColor: 'white',
        paddingBottom: Platform.OS === 'ios' ? 30 : 12, // Safe area for iOS
    },
    inputAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        marginRight: 10,
        backgroundColor: '#eee',
    },
    input: {
        flex: 1,
        backgroundColor: '#F5F5F5',
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 10, // Increased for better touch
        fontSize: 14,
        color: '#333',
        maxHeight: 100, // Limit height
    },
    sendButton: {
        marginLeft: 10,
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: Colors.light.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sendButtonDisabled: {
        backgroundColor: '#ccc',
    }
});
