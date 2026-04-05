import { Colors } from '@/constants/Colors';
import { API_BASE_URL } from '@/constants/Config';
import { useThemeContext } from '@/context/ThemeContext';
import { useUser } from '@/context/UserContext';
import { Send, X, MessageCircle } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Image, KeyboardAvoidingView, Modal, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

// Web standard custom scrollbar styles
if (Platform.OS === 'web' && typeof document !== 'undefined') {
    const style = document.createElement('style');
    style.id = 'comments-modal-web-scrollbar';
    style.textContent = `
        .comments-list-scrollbar::-webkit-scrollbar {
            width: 8px;
            height: 8px;
        }
        .comments-list-scrollbar::-webkit-scrollbar-track {
            background: transparent;
        }
        .comments-list-scrollbar::-webkit-scrollbar-thumb {
            background-color: rgba(155, 155, 155, 0.35);
            border-radius: 20px;
            border: 2px solid transparent;
            background-clip: content-box;
        }
        .comments-list-scrollbar::-webkit-scrollbar-thumb:hover {
            background-color: rgba(155, 155, 155, 0.6);
        }
    `;
    if (!document.getElementById(style.id)) {
        document.head.appendChild(style);
    }
}

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
    initialComments?: Comment[];
    onCommentAdded?: (newCount: number) => void;
}

const formatTime = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diff < 60) return 'now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    return `${Math.floor(diff / 86400)}d`;
};

export default function CommentsModal({ visible, onClose, postId, initialComments = [], onCommentAdded }: CommentsModalProps) {
    const { width: windowWidth, height: windowHeight } = useWindowDimensions();
    const isDesktop = Platform.OS === 'web' && windowWidth > 768;
    
    const { user } = (useUser() || {}) as any;
    const { colors, isDark } = useThemeContext();
    const [comments, setComments] = useState<Comment[]>(initialComments);
    const [loading, setLoading] = useState(false);
    const [inputText, setInputText] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const quickEmojis = ['🔥', '❤️', '🙌', '💀', '💯', '🤩', '🫡', '🥺', '😂', '🤞'];

    useEffect(() => {
        if (visible && postId) {
            fetchComments();
        }
    }, [visible, postId]);

    const fetchComments = async () => {
        setLoading(true);
        try {
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
            <TouchableOpacity activeOpacity={0.7}>
                <Image source={{ uri: item.user.avatar || 'https://i.pravatar.cc/100?u=' + item.user._id }} style={styles.avatar} />
            </TouchableOpacity>
            <View style={styles.commentContent}>
                <View style={[styles.commentBubble, { backgroundColor: isDark ? '#1C1C1E' : '#F2F2F7' }]}>
                    <View style={styles.commentHeader}>
                        <Text style={[styles.username, { color: colors.text }]}>{item.user.name}</Text>
                        <Text style={[styles.time, { color: colors.textSecondary }]}>{formatTime(item.createdAt)}</Text>
                    </View>
                    <Text style={[styles.commentText, { color: colors.text }]}>{item.text}</Text>
                </View>
                <View style={styles.commentActions}>
                    <TouchableOpacity><Text style={styles.actionText}>Like</Text></TouchableOpacity>
                    <TouchableOpacity><Text style={styles.actionText}>Reply</Text></TouchableOpacity>
                </View>
            </View>
        </View>
    );

    return (
        <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
            <View style={styles.container}>
                <TouchableOpacity 
                    style={[styles.backdrop]} 
                    activeOpacity={1} 
                    onPress={onClose} 
                >
                    <BlurView intensity={30} style={StyleSheet.absoluteFill} />
                </TouchableOpacity>

                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={[
                        styles.sheet, 
                        isDesktop && styles.webSheet,
                        { backgroundColor: isDark ? '#0A0A0A' : '#FFF' }
                    ]}
                >
                    <View style={styles.topControl}>
                        <View style={[styles.pullHandle, { backgroundColor: isDark ? '#333' : '#E5E7EB' }]} />
                    </View>

                    <View style={[styles.header, { borderBottomColor: isDark ? '#1C1C1E' : '#F2F2F7' }]}>
                       <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                            <MessageCircle size={22} color={colors.primary} />
                            <View>
                                <Text style={[styles.title, { color: colors.text }]}>Comments</Text>
                                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{comments.length} thoughts</Text>
                            </View>
                       </View>
                        <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { backgroundColor: isDark ? '#1C1C1E' : '#F2F2F7' }]}>
                            <X size={18} color={colors.text} />
                        </TouchableOpacity>
                    </View>
                    
                    <View style={[{ flex: 1 }, isDesktop && { paddingHorizontal: 12 }]}>
                        {loading ? (
                            <View style={styles.center}>
                                <ActivityIndicator color={colors.primary} size="large" />
                            </View>
                        ) : (
                            <FlatList
                                data={comments}
                                keyExtractor={(item) => item._id || Math.random().toString()}
                                renderItem={renderItem}
                                showsVerticalScrollIndicator={true}
                                persistentScrollbar={true}
                                keyboardDismissMode="on-drag"
                                style={styles.flatList}
                                // @ts-ignore
                                dataSet={{ class: 'comments-list-scrollbar' }}
                                contentContainerStyle={styles.listContent}
                                ListEmptyComponent={
                                    <View style={styles.center}>
                                        <View style={[styles.emptyIcon, { backgroundColor: colors.primary + '15' }]}>
                                            <Ionicons name="chatbubbles-outline" size={40} color={colors.primary} />
                                        </View>
                                        <Text style={[styles.emptyText, { color: colors.text }]}>Start the conversation</Text>
                                        <Text style={[styles.emptySubText, { color: colors.textSecondary }]}>Be the first to share what you think!</Text>
                                    </View>
                                }
                            />
                        )}
                    </View>

                    {/* Quick Emojis Bar */}
                    <View style={[styles.emojiBar, { backgroundColor: isDark ? '#0A0A0A' : '#FFF', borderTopColor: isDark ? '#1C1C1E' : '#F2F2F7' }]}>
                        <FlatList
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            data={quickEmojis}
                            keyExtractor={(item) => item}
                            renderItem={({ item }) => (
                                <TouchableOpacity 
                                    style={styles.emojiItem}
                                    onPress={() => setInputText(prev => prev + item)}
                                >
                                    <Text style={styles.emojiText}>{item}</Text>
                                </TouchableOpacity>
                            )}
                            contentContainerStyle={{ paddingHorizontal: 16 }}
                        />
                    </View>

                    <View style={[
                        styles.inputWrapper, 
                        { 
                            backgroundColor: isDark ? '#0A0A0A' : '#FFF', 
                            borderTopColor: isDark ? '#1C1C1E' : '#F2F2F7' 
                        }
                    ]}>
                        <View style={[
                            styles.inputContainer, 
                            { backgroundColor: isDark ? '#1C1C1E' : '#F2F2F7' }
                        ]}>
                            <Image 
                                source={{ uri: user?.avatar || 'https://i.pravatar.cc/100?u=current_user' }} 
                                style={styles.inputAvatar} 
                            />
                            <TextInput
                                style={[styles.input, { color: colors.text }]}
                                placeholder="Write a comment..."
                                placeholderTextColor={colors.textSecondary}
                                value={inputText}
                                onChangeText={setInputText}
                                multiline
                                maxLength={500}
                                selectionColor={colors.primary}
                            />
                            <TouchableOpacity
                                onPress={handleSend}
                                disabled={!inputText.trim() || submitting}
                                activeOpacity={0.8}
                            >
                                <LinearGradient
                                    colors={!inputText.trim() || submitting ? ['#ccc', '#bbb'] : [colors.primary, '#8E59FF']}
                                    style={styles.sendButton}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                >
                                    {submitting ? (
                                        <ActivityIndicator size="small" color="#fff" />
                                    ) : (
                                        <Send size={16} color="#fff" strokeWidth={2.5} />
                                    )}
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </View>
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
        backgroundColor: 'rgba(0,0,0,0.6)',
    },
    sheet: {
        borderTopLeftRadius: 40,
        borderTopRightRadius: 40,
        height: '85%',
        width: '100%',
        display: 'flex',
        overflow: 'hidden',
        // Shadow for top edge
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -10 },
        shadowOpacity: 0.2,
        shadowRadius: 20,
        elevation: 20,
    },
    webSheet: {
        maxWidth: 600,
        alignSelf: 'center',
        // boxShadow: '0 -20px 60px rgba(0,0,0,0.5)',
    } as any,
    topControl: {
        height: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    pullHandle: {
        width: 36,
        height: 5,
        borderRadius: 2.5,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 24,
        paddingBottom: 20,
        paddingTop: 4,
        borderBottomWidth: 1,
    },
    closeBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: {
        fontSize: 20,
        fontWeight: '900',
        letterSpacing: -0.6,
    },
    subtitle: {
        fontSize: 12,
        fontWeight: '600',
        marginTop: -1,
        opacity: 0.8,
    },
    flatList: {
        flex: 1,
        minHeight: 0, // Force flex container to respect parent
        // Web-specific scrollbar styling
        ...(Platform.OS === 'web' ? {
            overflowY: 'auto' as any,
            scrollbarWidth: 'auto' as any,
            scrollbarColor: 'rgba(150, 150, 150, 0.6) transparent',
        } : {})
    },
    listContent: {
        padding: 20,
        paddingBottom: 150,
    },
    center: {
        flex: 1,
        padding: 50,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 350,
    },
    emptyIcon: {
        width: 80,
        height: 80,
        borderRadius: 40,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: '900',
        letterSpacing: -0.5,
        marginBottom: 8,
    },
    emptySubText: {
        fontSize: 14,
        textAlign: 'center',
        opacity: 0.7,
        lineHeight: 20,
        maxWidth: 240,
    },
    commentItem: {
        flexDirection: 'row',
        marginBottom: 20,
        gap: 12,
        alignItems: 'flex-start',
    },
    avatar: {
        width: 38,
        height: 38,
        borderRadius: 19,
    },
    commentContent: {
        flex: 1,
    },
    commentBubble: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 20,
        borderTopLeftRadius: 4,
    },
    commentHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    username: {
        fontWeight: '800',
        fontSize: 14,
        letterSpacing: -0.3,
    },
    time: {
        fontSize: 11,
        fontWeight: '500',
        opacity: 0.6,
    },
    commentText: {
        fontSize: 14.5,
        lineHeight: 21,
        fontWeight: '500',
    },
    commentActions: {
        flexDirection: 'row',
        gap: 20,
        marginTop: 6,
        marginLeft: 8,
    },
    actionText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#8E8E93',
    },
    emojiBar: {
        height: 44,
        justifyContent: 'center',
        borderTopWidth: 1,
    },
    emojiItem: {
        paddingHorizontal: 12,
        justifyContent: 'center',
    },
    emojiText: {
        fontSize: 22,
    },
    inputWrapper: {
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: Platform.OS === 'ios' ? 34 : 20,
        borderTopWidth: 1,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 28,
        paddingHorizontal: 12,
        paddingVertical: 6,
        gap: 10,
    },
    inputAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
    },
    input: {
        flex: 1,
        fontSize: 15,
        minHeight: 40,
        maxHeight: 120,
        fontWeight: '500',
    },
    sendButton: {
        width: 38,
        height: 38,
        borderRadius: 19,
        alignItems: 'center',
        justifyContent: 'center',
        // Shadow for premium feel
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 5,
        elevation: 5,
    }
});
