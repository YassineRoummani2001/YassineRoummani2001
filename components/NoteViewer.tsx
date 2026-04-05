import { Music, Send, X, Heart } from 'lucide-react-native';
import React, { useState, useEffect } from 'react';
import { 
    Dimensions, 
    Image, 
    KeyboardAvoidingView, 
    Modal, 
    Platform, 
    StyleSheet, 
    Text, 
    TouchableOpacity, 
    View, 
    TextInput,
    TouchableWithoutFeedback,
    Keyboard,
    ScrollView,
    Animated,
    useWindowDimensions
} from 'react-native';
import { useThemeContext } from '@/context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { formatDistanceToNow } from 'date-fns';
import { useRouter } from 'expo-router';
import { ActivityIndicator } from 'react-native';

const { width, height } = Dimensions.get('window') || { width: 0, height: 0 };

interface NoteViewerProps {
    visible: boolean;
    note: any;
    currentUser: any;
    onClose: () => void;
    onReply: (text: string) => void;
    onLike: () => void;
}

export default function NoteViewer({ visible, note, currentUser, onClose, onReply, onLike }: NoteViewerProps) {
    const router = useRouter();
    const { colors, isDark } = useThemeContext();
    const { width: windowWidth, height: windowHeight } = useWindowDimensions();
    const isDesktop = Platform.OS === 'web' && windowWidth > 768;
    const [replyText, setReplyText] = useState('');
    const emojisPool = [
        '✨', '😈', '😭', '🔥', '❤️', '🙌', '💀', '💯', '🤩', '🫡', '🙏', '🥺', '😂', '🫠', '💅', '👀',
        '💖', '😂', '😘', '😁', '😊', '😍', '😎', '😜', '😝', '😋', '😇', '🤫', '🤔', '🤨', '😏', '🙄',
        '😬', '🤥', '😌', '😴', '🤤', '😪', '🤢', '🤮', '🤧', '🥵', '🥶', '😵', '🤯', '🤠', '🥳', '😎', 
        '🤓', '🧐', '😕', '😟', '🙁', '😮', '😯', '😲', '😳', '🥺', '😦', '😧', '😨', '😰', '😥', '😢', 
        '😭', '😱', '😖', '😣', '😞', '😓', '😩', '😫', '🥱', '😤', '😡', '😠', '🤬', '😈', '👿', '🤡', 
        '💩', '👻', '💀', '👽', '👾', '🤖', '🎃', '😺', '😸', '😹', '😻', '😼', '😽', '🙀', '😿', '😾',
        '🤲', '👐', '🙌', '👏', '🤝', '👍', '👎', '👊', '✊', '🤛', '🤜', '🤞', '🤟', '🤘', '👌', '🤌'
    ].slice(0, 100);
    const [quickEmojis] = useState(() => [...emojisPool].sort(() => 0.5 - Math.random()).slice(0, 3));
    
    const [likeScale] = useState(new Animated.Value(1));
    const [sendScale] = useState(new Animated.Value(1));
    const [sending, setSending] = useState(false);
    const [optimisticLiked, setOptimisticLiked] = useState(false);
    
    // Sync optimistic state with actual data when note changes
    useEffect(() => {
        if (note && currentUser) {
            const isLikedActual = (note.likes || []).some((l: any) => {
                const likerId = l.user?._id || l.user || l;
                return likerId?.toString() === currentUser?._id?.toString();
            });
            setOptimisticLiked(isLikedActual);
        }
    }, [note, currentUser]);

    if (!note) return null;

    const user = (note.user && typeof note.user === 'object') ? note.user : { name: 'User', username: 'user', avatar: '' };
    const music = note.music;
    const isMyNote = (note.user?._id || note.user) === currentUser?._id;
    const likes = note.likes || [];
    const isLiked = likes.some((l: any) => {
        const likerId = l.user?._id || l.user || l;
        return likerId?.toString() === currentUser?._id?.toString();
    });

    const handleLike = () => {
        // Optimistic UI
        setOptimisticLiked(!optimisticLiked);
        
        Animated.sequence([
            Animated.timing(likeScale, { toValue: 1.4, duration: 100, useNativeDriver: true }),
            Animated.timing(likeScale, { toValue: 1, duration: 150, useNativeDriver: true }),
        ]).start();
        onLike();
    };

    const handleSend = () => {
        if (!replyText.trim() || sending) return;

        setSending(true);
        Animated.sequence([
            Animated.timing(sendScale, { toValue: 0.9, duration: 100, useNativeDriver: true }),
            Animated.timing(sendScale, { toValue: 1.1, duration: 150, useNativeDriver: true }),
            Animated.spring(sendScale, { toValue: 1, friction: 3, useNativeDriver: true }),
        ]).start();

        onReply(replyText);
        setReplyText('');
        setTimeout(() => setSending(false), 800);
    };

    return (
        <Modal
            animationType="slide"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
            statusBarTranslucent
        >
            <TouchableWithoutFeedback onPress={onClose}>
                <View style={[styles.overlay, isDesktop && styles.webOverlay]}>
                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        style={[styles.keyboardView, isDesktop && styles.webKeyboardView]}
                    >
                        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                            <View style={[
                                styles.content,
                                { backgroundColor: isDark ? '#1a1a1a' : '#FFF' },
                                isDesktop && styles.webContent
                            ]}>
                                {/* Pull Handle */}
                                <View style={[styles.pullHandle, { backgroundColor: isDark ? '#333' : '#E5E7EB' }]} />

                                {/* Header with avatar and name */}
                                <View style={styles.header}>
                                    <View style={styles.userInfoRow}>
                                        <Text style={[styles.name, { color: colors.text }]}>{user.name}</Text>
                                        <Text style={[styles.timeLabel, { color: colors.textSecondary }]}>
                                            • {note.createdAt ? formatDistanceToNow(new Date(note.createdAt), { addSuffix: false })
                                                .replace('about ', '')
                                                .replace(' minutes', 'm')
                                                .replace(' minute', 'm')
                                                .replace(' hours', 'h')
                                                .replace(' hour', 'h')
                                                .replace(' days', 'd')
                                                .replace(' day', 'd')
                                                .replace(' less than a minute', 'now') 
                                                : 'now'}
                                        </Text>
                                    </View>
                                    <TouchableOpacity onPress={onClose} style={[styles.closeButton, { backgroundColor: isDark ? '#333' : '#F3F4F6' }]}>
                                        <X size={20} color={colors.text} />
                                    </TouchableOpacity>
                                </View>

                                {/* Avatar and Bubble Card */}
                                <View style={styles.mainContent}>
                                    <View style={styles.avatarWrapper}>
                                        <Image
                                            source={{ uri: user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}` }}
                                            style={styles.avatar}
                                        />
                                    </View>

                                    <View style={[styles.noteCard, { backgroundColor: isDark ? '#262626' : '#F3F4F6' }]}>
                                        {/* Music Badge if exists */}
                                        {music && (
                                            <View style={styles.musicRow}>
                                                <View style={styles.musicIconContainer}>
                                                    <View style={styles.musicPulse} />
                                                    <Ionicons name="stop-circle" size={20} color={colors.text} />
                                                </View>
                                                <Text numberOfLines={1} style={[styles.musicText, { color: colors.text }]}>
                                                    {music.track}, {music.artist || 'popme'}
                                                </Text>
                                            </View>
                                        )}
                                        
                                        {!music && <Text style={[styles.noteText, { color: colors.text }]}>{note.content}</Text>}
                                    </View>
                                </View>

                                {/* Input Bar (Only for others) */}
                                {!isMyNote && (
                                    <View style={styles.inputSection}>
                                        <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
                                            <View style={[styles.inputContainer, { backgroundColor: isDark ? '#262626' : '#F9FAFB' }]}>
                                                <TextInput
                                                    style={[styles.input, { color: colors.text }]}
                                                    placeholder={`Reply to ${user.username || 'user'}`}
                                                    placeholderTextColor={colors.textSecondary}
                                                    value={replyText}
                                                    onChangeText={setReplyText}
                                                    onSubmitEditing={handleSend}
                                                    blurOnSubmit={false}
                                                    autoCapitalize="none"
                                                />
                                                <View style={styles.emojiList}>
                                                    {quickEmojis.slice(0, 3).map(emoji => (
                                                        <TouchableOpacity key={emoji} onPress={() => setReplyText(p => p + emoji)}>
                                                            <Text style={styles.emoji}>{emoji}</Text>
                                                        </TouchableOpacity>
                                                    ))}
                                                    {replyText.trim().length > 0 && isMyNote && (
                                                        <TouchableOpacity 
                                                            style={[styles.miniSendBtn, { backgroundColor: colors.primary }]} 
                                                            onPress={handleSend}
                                                            activeOpacity={0.7}
                                                        >
                                                            <Send size={14} color="#FFF" />
                                                        </TouchableOpacity>
                                                    )}
                                                </View>
                                            </View>
                                        </TouchableWithoutFeedback>
                                        
                                        <View style={styles.actionRow}>
                                            <TouchableOpacity 
                                                onPress={handleLike}
                                                activeOpacity={0.6}
                                                style={styles.heartButtonTouch}
                                            >
                                                <Animated.View style={{ transform: [{ scale: likeScale }] }}>
                                                    <Ionicons 
                                                        name={optimisticLiked ? "heart" : "heart-outline"} 
                                                        size={32} 
                                                        color={optimisticLiked ? '#FF3040' : colors.text} 
                                                    />
                                                </Animated.View>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                )}

                                {/*Engagement Section (Owner Only) */}
                                {likes.length > 0 && isMyNote && (
                                    <View style={{ marginTop: 24, paddingHorizontal: 16 }}>
                                        <View style={styles.ownerEngagement}>
                                            <View style={styles.totalLikesRow}>
                                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                                    <Ionicons name="heart" size={20} color="#FF3040" />
                                                    <Text style={[styles.totalLikesText, { color: colors.text }]}>
                                                        {likes.length} {likes.length === 1 ? 'like' : 'likes'}
                                                    </Text>
                                                </View>
                                            </View>
                                            
                                            <ScrollView 
                                                style={{ maxHeight: 200, marginTop: 12 }} 
                                                showsVerticalScrollIndicator={true}
                                                nestedScrollEnabled
                                            >
                                                <View style={styles.likesList}>
                                                    {likes.map((likeItem: any, i: number) => {
                                                        const liker = likeItem.user;
                                                        if (!liker) return null;
                                                        return (
                                                            <TouchableOpacity 
                                                                key={liker._id || i} 
                                                                style={styles.likerRow}
                                                                onPress={() => {
                                                                    onClose();
                                                                    router.push(`/user/${liker._id || liker.id}`);
                                                                }}
                                                            >
                                                                <Image 
                                                                    source={{ uri: liker.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(liker.name || 'U')}` }}
                                                                    style={styles.likerAvatar}
                                                                />
                                                                <View style={styles.likerInfo}>
                                                                    <Text style={[styles.likerName, { color: colors.text }]}>{liker.name}</Text>
                                                                    <Text style={[styles.likerDate, { color: colors.textSecondary }]}>
                                                                        {likeItem.createdAt ? formatDistanceToNow(new Date(likeItem.createdAt), { addSuffix: true }) 
                                                                            .replace('about ', '')
                                                                            .replace('less than a minute', 'now') 
                                                                            : 'now'}
                                                                    </Text>
                                                                </View>
                                                                <Ionicons name="chevron-forward" size={14} color={colors.textSecondary} />
                                                            </TouchableOpacity>
                                                        );
                                                    })}
                                                </View>
                                            </ScrollView>
                                        </View>
                                    </View>
                                )}

                                {/* Action Footer (Non-Owner View) */}
                                {!isMyNote && replyText.trim().length > 0 && (
                                    <Animated.View style={{ transform: [{ scale: sendScale }] }}>
                                        <TouchableOpacity 
                                            style={[styles.sendButton, { backgroundColor: colors.primary }]} 
                                            onPress={handleSend}
                                            activeOpacity={0.8}
                                            disabled={sending}
                                        >
                                            {sending ? (
                                                <ActivityIndicator size="small" color="#FFF" />
                                            ) : (
                                                <>
                                                    <Text style={styles.sendButtonText}>Send Reply</Text>
                                                    <Send size={18} color="#FFF" />
                                                </>
                                            )}
                                        </TouchableOpacity>
                                    </Animated.View>
                                )}
                            </View>
                        </TouchableWithoutFeedback>
                    </KeyboardAvoidingView>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'flex-end',
    },
    webOverlay: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    keyboardView: {
        width: '100%',
    },
    webKeyboardView: {
        width: 'auto',
        maxWidth: 500,
    },
    content: {
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: Platform.OS === 'ios' ? 40 : 24,
        width: '100%',
    },
    webContent: {
        borderRadius: 24,
        paddingBottom: 24,
        // Web shadow
        // @ts-ignore
        boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
        // Native shadow
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 10,
    },
    pullHandle: {
        width: 40,
        height: 5,
        borderRadius: 3,
        alignSelf: 'center',
        marginBottom: 20,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    userInfoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        flex: 1,
        justifyContent: 'center',
        marginLeft: 40, // offset close button
    },
    name: {
        fontSize: 16,
        fontWeight: '700',
    },
    timeLabel: {
        fontSize: 14,
    },
    closeButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    mainContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 24,
    },
    avatarWrapper: {
        width: 64,
        height: 64,
        borderRadius: 32,
        padding: 2,
        borderWidth: 1.5,
        borderColor: '#ddd',
    },
    avatar: {
        width: '100%',
        height: '100%',
        borderRadius: 29,
    },
    noteCard: {
        flex: 1,
        borderRadius: 24,
        paddingHorizontal: 16,
        paddingVertical: 14,
        justifyContent: 'center',
        minHeight: 52,
    },
    musicRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    musicIconContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    musicPulse: {
        position: 'absolute',
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(0,0,0,0.05)',
    },
    musicText: {
        fontSize: 15,
        fontWeight: '700',
        flex: 1,
    },
    noteText: {
        fontSize: 16,
        fontWeight: '500',
    },
    inputSection: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    inputContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        height: 52,
        borderRadius: 26,
        paddingHorizontal: 16,
    },
    input: {
        flex: 1,
        fontSize: 15,
        fontWeight: '500',
    },
    emojiList: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    emoji: {
        fontSize: 22,
    },
    heartButton: {
        padding: 4,
    },
    likedButton: {
        transform: [{ scale: 1.1 }],
    },
    heartButtonTouch: {
        padding: 6,
        marginRight: 4,
    },
    miniSendBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 8,
    },
    actionRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    sendButtonCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 8,
    },
    likedByContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    ownerEngagement: {
        marginTop: 4,
    },
    totalLikesRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
    },
    totalLikesText: {
        fontSize: 16,
        fontWeight: '800',
    },
    likedByAvatars: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 8,
    },
    miniAvatar: {
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 2,
    },
    likedByText: {
        fontSize: 13,
    },
    likesList: {
        gap: 16,
        paddingHorizontal: 4,
    },
    likerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 4,
    },
    likerAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#f0f0f0',
    },
    likerInfo: {
        flex: 1,
        justifyContent: 'center',
    },
    likerName: {
        fontSize: 14,
        fontWeight: '700',
    },
    likerDate: {
        fontSize: 12,
        marginTop: 2,
    },
    sendButton: {
        marginTop: 16,
        height: 52,
        borderRadius: 26,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
    },
    sendButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '700',
    }
});

