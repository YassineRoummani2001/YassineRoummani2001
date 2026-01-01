import { Music, Send, X } from 'lucide-react-native';
import React from 'react';
import { Dimensions, Image, KeyboardAvoidingView, Modal, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const { width } = Dimensions.get('window');

interface NoteViewerProps {
    visible: boolean;
    note: any;
    onClose: () => void;
    onReply: () => void;
}

export default function NoteViewer({ visible, note, onClose, onReply }: NoteViewerProps) {
    if (!note) return null;

    return (
        <Modal
            animationType="slide"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />

                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.modalContainer}
                >
                    <View style={styles.content}>
                        {/* Header */}
                        <View style={styles.header}>
                            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                                <X size={24} color="#000" />
                            </TouchableOpacity>
                        </View>

                        {/* User Info */}
                        <View style={styles.userInfo}>
                            <Image
                                source={{ uri: note.user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(note.user?.name || '')}` }}
                                style={styles.avatar}
                            />
                            <Text style={styles.name}>{note.user?.name}</Text>
                            <Text style={styles.handle}>@{note.user?.username || note.user?.name?.toLowerCase().replace(/\s/g, '')}</Text>
                        </View>

                        {/* Note Content */}
                        <View style={styles.noteCard}>
                            <Text style={styles.noteText}>{note.content}</Text>

                            {note.music && (
                                <View style={styles.musicBadge}>
                                    <Music size={14} color="#FFF" />
                                    <Text style={styles.musicText}>{note.music.track} • {note.music.artist}</Text>
                                </View>
                            )}
                        </View>

                        {/* Action */}
                        <TouchableOpacity style={styles.replyButton} onPress={onReply}>
                            <Text style={styles.replyText}>Reply to {note.user?.name}</Text>
                            <Send size={18} color="#FFF" />
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
    },
    modalContainer: {
        backgroundColor: 'transparent',
        justifyContent: 'flex-end',
    },
    content: {
        backgroundColor: '#FFF',
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        padding: 24,
        paddingBottom: 40,
        alignItems: 'center',
        minHeight: 400,
    },
    header: {
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginBottom: 10,
    },
    closeButton: {
        padding: 8,
        backgroundColor: '#F3F4F6',
        borderRadius: 20,
    },
    userInfo: {
        alignItems: 'center',
        marginBottom: 24,
    },
    avatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
        marginBottom: 12,
        borderWidth: 3,
        borderColor: '#000',
    },
    name: {
        fontSize: 20,
        fontWeight: '700',
        color: '#000',
    },
    handle: {
        fontSize: 14,
        color: '#666',
        marginTop: 2,
    },
    noteCard: {
        backgroundColor: '#F3F4F6',
        borderRadius: 24,
        padding: 24,
        width: '100%',
        alignItems: 'center',
        marginBottom: 24,
    },
    noteText: {
        fontSize: 22,
        fontWeight: '600',
        color: '#000',
        textAlign: 'center',
        marginBottom: 16,
        lineHeight: 30,
    },
    musicBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#000',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        gap: 6,
    },
    musicText: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: '500',
    },
    replyButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#000',
        width: '100%',
        paddingVertical: 16,
        borderRadius: 16,
        justifyContent: 'center',
        gap: 8,
    },
    replyText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '600',
    }
});
