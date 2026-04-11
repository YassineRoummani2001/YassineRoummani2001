import { API_BASE_URL } from '@/constants/Config';
import { useThemeContext } from '@/context/ThemeContext';
import { useUser } from '@/context/UserContext';
import { Send, X, MessageCircle } from 'lucide-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Image, KeyboardAvoidingView, Modal, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { getCorrectUrl } from '@/utils/api';

// Dynamic style injection will be handled inside the component to access theme colors

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
    likes?: string[];
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
    const [replyingTo, setReplyingTo] = useState<{ id: string, name: string } | null>(null);
    const inputRef = useRef<TextInput>(null);

    // Mention state
    const [mentionQuery, setMentionQuery] = useState<string | null>(null);
    const [mentionSuggestions, setMentionSuggestions] = useState<any[]>([]);
    const [mentionedUserIds, setMentionedUserIds] = useState<string[]>([]);
    const [followingUsers, setFollowingUsers] = useState<any[]>([]);

    const quickEmojis = ['🔥', '❤️', '🙌', '💀', '💯', '🤩', '🫡', '🥺', '😂', '🤞'];

    useEffect(() => {
        if (Platform.OS === 'web' && typeof document !== 'undefined') {
            const styleId = 'comments-modal-web-scrollbar';
            let style = document.getElementById(styleId) as HTMLStyleElement;
            if (!style) {
                style = document.createElement('style');
                style.id = styleId;
                document.head.appendChild(style);
            }
            style.textContent = `
                .comments-list-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .comments-list-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .comments-list-scrollbar::-webkit-scrollbar-thumb {
                    background-color: ${colors.primary}66;
                    border-radius: 10px;
                }
                .comments-list-scrollbar::-webkit-scrollbar-thumb:hover {
                    background-color: ${colors.primary};
                }
            `;
        }
    }, [colors.primary]);

    useEffect(() => {
        if (visible && postId) {
            fetchComments();
            if (user) {
                fetchFollowingUsers();
            }
        }
        if (!visible) {
            setMentionQuery(null);
            setMentionSuggestions([]);
            setMentionedUserIds([]);
        }
    }, [visible, postId, user]);

    const fetchFollowingUsers = async () => {
        if (!user || followingUsers.length > 0) return;
        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/following/${user._id || user.id}`, {
                headers: { 'Authorization': `Bearer ${user.token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setFollowingUsers(data);
            }
        } catch (error) {
            console.error('Error fetching following users:', error);
        }
    };

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

    const handleTextChange = useCallback((text: string) => {
        setInputText(text);

        // Detect @mention: find the last @ followed by non-space chars
        const atMatch = text.match(/@(\w*)$/);
        if (atMatch) {
            const query = atMatch[1].toLowerCase();
            setMentionQuery(query);
            // Filter from populated following list
            const filtered = followingUsers.filter((u: any) => {
                const name = (u.name || '').toLowerCase();
                const handle = (u.handle || '').toLowerCase();
                return name.includes(query) || handle.includes(query);
            });
            setMentionSuggestions(filtered.slice(0, 6));
        } else {
            setMentionQuery(null);
            setMentionSuggestions([]);
        }
    }, [followingUsers]);

    const insertMention = useCallback((mentionUser: any) => {
        // Replace the @query at the end with the selected user's handle/name
        const displayName = mentionUser.handle
            ? `@${mentionUser.handle}`
            : `@${mentionUser.name.replace(/\s+/g, '')}` ;
        const newText = inputText.replace(/@(\w*)$/, displayName + ' ');
        setInputText(newText);
        setMentionedUserIds(prev => [...prev.filter(id => id !== mentionUser._id), mentionUser._id]);
        setMentionQuery(null);
        setMentionSuggestions([]);
        inputRef.current?.focus();
    }, [inputText]);

    const handleLikeComment = async (commentId: string) => {
        if (!user) return;
        
        // Optimistic update
        setComments(current => current.map(c => {
            if (c._id === commentId) {
                const currentLikes = c.likes || [];
                const isLiked = currentLikes.includes(user._id);
                return {
                    ...c,
                    likes: isLiked 
                        ? currentLikes.filter(id => id !== user._id)
                        : [...currentLikes, user._id]
                };
            }
            return c;
        }));

        try {
            await fetch(`${API_BASE_URL}/api/posts/${postId}/comments/${commentId}/like`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${user.token}` }
            });
        } catch (error) {
            console.error("Error liking comment", error);
            // Optional: revert on failure
        }
    };

    const handleReply = (comment: Comment) => {
        setReplyingTo({ id: comment.user._id, name: comment.user.name });
        setInputText(`@${comment.user.name.replace(/\s+/g, '')} `);
        inputRef.current?.focus();
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
                body: JSON.stringify({ 
                    text: inputText.trim(),
                    replyTo: replyingTo?.id,
                    mentionedUsers: mentionedUserIds // Send mention IDs for notifications
                })
            });

            if (res.ok) {
                const updatedComments = await res.json();
                const sorted = [...updatedComments].sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                setComments(sorted);
                setInputText('');
                setReplyingTo(null);
                setMentionedUserIds([]);
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
                <Image 
                    source={{ uri: getCorrectUrl(item.user.avatar) || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.user.name || 'U')}&background=random` }} 
                    style={styles.avatar} 
                />
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
                    <TouchableOpacity onPress={() => handleLikeComment(item._id)}>
                        <Text style={[
                            styles.actionText, 
                            item.likes?.includes(user?._id) && { color: colors.primary, fontWeight: '800' }
                        ]}>
                            {item.likes?.includes(user?._id) ? 'Liked' : 'Like'}
                            {item.likes && item.likes.length > 0 ? ` (${item.likes.length})` : ''}
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleReply(item)}>
                        <Text style={styles.actionText}>Reply</Text>
                    </TouchableOpacity>
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
                                style={[
                                    styles.flatList,
                                    Platform.OS === 'web' && { scrollbarColor: `${colors.primary}66 transparent` } as any
                                ]}
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

                    {/* @ Mention Suggestions */}
                    {mentionQuery !== null && mentionSuggestions.length > 0 && (
                        <View style={[styles.mentionDropdown, { backgroundColor: isDark ? '#1C1C1E' : '#F9F9F9', borderTopColor: isDark ? '#333' : '#E5E5EA' }]}>
                            {mentionSuggestions.map((mu) => (
                                <TouchableOpacity
                                    key={mu._id}
                                    style={[styles.mentionItem, { borderBottomColor: isDark ? '#2C2C2C' : '#EFEFEF' }]}
                                    onPress={() => insertMention(mu)}
                                    activeOpacity={0.7}
                                >
                                    <Image
                                        source={{ uri: mu.avatar || `https://i.pravatar.cc/100?u=${mu._id}` }}
                                        style={styles.mentionAvatar}
                                    />
                                    <View style={styles.mentionInfo}>
                                        <Text style={[styles.mentionName, { color: colors.text }]}>{mu.name}</Text>
                                        {mu.handle && <Text style={[styles.mentionHandle, { color: colors.textSecondary }]}>@{mu.handle}</Text>}
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}

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
                                source={{ uri: getCorrectUrl(user?.avatar) || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'U')}&background=random` }} 
                                style={styles.inputAvatar} 
                            />
                            <TextInput
                                ref={inputRef}
                                style={[styles.input, { color: colors.text }]}
                                placeholder={replyingTo ? `Reply to ${replyingTo.name}...` : "Write a comment..."}
                                placeholderTextColor={colors.textSecondary}
                                value={inputText}
                                onChangeText={handleTextChange}
                                multiline
                                maxLength={500}
                                selectionColor={colors.primary}
                                onFocus={() => {
                                    if (inputText === '' && replyingTo) {
                                        const mention = `@${replyingTo.name.replace(/\s+/g, '')} `;
                                        setInputText(mention);
                                    }
                                }}
                            />
                            <TouchableOpacity
                                onPress={() => {
                                    handleSend();
                                    setReplyingTo(null);
                                }}
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
            scrollbarWidth: 'thin' as any,
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
        boxShadow: '0px 4px 5px rgba(0,0,0,0.2)',
        elevation: 5,
    },
    mentionDropdown: {
        borderTopWidth: 1,
        maxHeight: 200,
        overflow: 'hidden',
    },
    mentionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderBottomWidth: 1,
        gap: 10,
    },
    mentionAvatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
    },
    mentionInfo: {
        flex: 1,
    },
    mentionName: {
        fontSize: 14,
        fontWeight: '700',
    },
    mentionHandle: {
        fontSize: 12,
        fontWeight: '500',
        marginTop: 1,
    }
});
