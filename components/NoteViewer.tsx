import { Music, Send, X, Heart } from 'lucide-react-native';
import React, { useState } from 'react';
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
    Keyboard
} from 'react-native';
import { useThemeContext } from '@/context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

interface NoteViewerProps {
    visible: boolean;
    note: any;
    onClose: () => void;
    onReply: (text: string) => void;
}

export default function NoteViewer({ visible, note, onClose, onReply }: NoteViewerProps) {
    const { colors, isDark } = useThemeContext();
    const [replyText, setReplyText] = useState('');
    const emojisPool = ['✨', '😈', '😭', '🔥', '❤️', '🙌', '💀', '💯', '🤩', '🫡', '🙏', '🥺', '😂', '🫠', '💅', '👀'];
    const [quickEmojis] = useState(() => [...emojisPool].sort(() => 0.5 - Math.random()).slice(0, 3));

    if (!note) return null;

    const user = typeof note.user === 'object' ? note.user : { name: 'User', username: 'user', avatar: '' };
    const music = note.music;

    const handleSend = () => {
        if (replyText.trim()) {
            onReply(replyText);
            setReplyText('');
        }
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
                <View style={styles.overlay}>
                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        style={styles.keyboardView}
                    >
                        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                            <View style={[styles.content, { backgroundColor: isDark ? '#1a1a1a' : '#FFF' }]}>
                                {/* Pull Handle */}
                                <View style={[styles.pullHandle, { backgroundColor: isDark ? '#333' : '#E5E7EB' }]} />

                                {/* Header with avatar and name */}
                                <View style={styles.header}>
                                    <View style={styles.userInfoRow}>
                                        <Text style={[styles.name, { color: colors.text }]}>{user.name}</Text>
                                        <Text style={[styles.timeLabel, { color: colors.textSecondary }]}>• 1h</Text>
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

                                {/* Input Bar */}
                                <View style={styles.inputSection}>
                                    <View style={[styles.inputContainer, { backgroundColor: isDark ? '#262626' : '#F9FAFB' }]}>
                                        <TextInput
                                            style={[styles.input, { color: colors.text }]}
                                            placeholder={`Reply to ${user.username || 'user'}`}
                                            placeholderTextColor={colors.textSecondary}
                                            value={replyText}
                                            onChangeText={setReplyText}
                                            autoFocus={false}
                                        />
                                        <View style={styles.emojiList}>
                                            {quickEmojis.slice(0, 3).map(emoji => (
                                                <TouchableOpacity key={emoji} onPress={() => setReplyText(p => p + emoji)}>
                                                    <Text style={styles.emoji}>{emoji}</Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    </View>
                                    <TouchableOpacity style={styles.heartButton}>
                                        <Heart size={24} color={colors.text} strokeWidth={2} />
                                    </TouchableOpacity>
                                </View>

                                {/* Action Footer */}
                                {replyText.length > 0 && (
                                    <TouchableOpacity style={[styles.sendButton, { backgroundColor: colors.primary }]} onPress={handleSend}>
                                        <Text style={styles.sendButtonText}>Send Reply</Text>
                                        <Send size={18} color="#FFF" />
                                    </TouchableOpacity>
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
    keyboardView: {
        width: '100%',
    },
    content: {
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: Platform.OS === 'ios' ? 40 : 24,
        width: '100%',
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
