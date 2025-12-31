import { useThemeContext } from '@/context/ThemeContext';
import { Bookmark, Copy, Edit, Flag, Share2, Trash2 } from 'lucide-react-native';
import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';

interface PostOptionsMenuProps {
    visible: boolean;
    onClose: () => void;
    anchor?: { x: number; y: number; height: number }; // Kept for compatibility, though we'll use a specific position or center
    isOwner: boolean;
    onEdit?: () => void;
    onDelete?: () => void;
    onReport?: () => void;
    onShare?: () => void;
    onCopyLink?: () => void;
    onSave?: () => void;
}

export default function PostOptionsMenu({
    visible,
    onClose,
    isOwner,
    onEdit,
    onDelete,
    onReport,
    onShare,
    onCopyLink,
    onSave,
}: PostOptionsMenuProps) {
    const { colors, isDark } = useThemeContext();

    if (!visible) return null;

    return (
        <Modal
            transparent
            visible={visible}
            animationType="fade"
            onRequestClose={onClose}
        >
            <TouchableWithoutFeedback onPress={onClose}>
                <View style={styles.overlay}>
                    <TouchableWithoutFeedback>
                        <View style={[styles.menuContainer, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' }]}>
                            {isOwner ? (
                                <>
                                    <TouchableOpacity style={styles.menuItem} onPress={() => { onClose(); onEdit?.(); }}>
                                        <Edit size={20} color={colors.text} />
                                        <Text style={[styles.menuText, { color: colors.text }]}>Edit Post</Text>
                                    </TouchableOpacity>
                                    <View style={[styles.divider, { backgroundColor: colors.border }]} />
                                    <TouchableOpacity style={styles.menuItem} onPress={() => { onClose(); onDelete?.(); }}>
                                        <Trash2 size={20} color="#FF3B30" />
                                        <Text style={[styles.menuText, { color: "#FF3B30" }]}>Delete Post</Text>
                                    </TouchableOpacity>
                                </>
                            ) : (
                                <>
                                    <TouchableOpacity style={styles.menuItem} onPress={() => { onClose(); onSave?.(); }}>
                                        <Bookmark size={20} color={colors.text} />
                                        <Text style={[styles.menuText, { color: colors.text }]}>Save Post</Text>
                                    </TouchableOpacity>
                                    <View style={[styles.divider, { backgroundColor: colors.border }]} />
                                    <TouchableOpacity style={styles.menuItem} onPress={() => { onClose(); onReport?.(); }}>
                                        <Flag size={20} color="#FF3B30" />
                                        <Text style={[styles.menuText, { color: "#FF3B30" }]}>Report Post</Text>
                                    </TouchableOpacity>
                                </>
                            )}

                            <View style={[styles.divider, { backgroundColor: colors.border }]} />

                            <TouchableOpacity style={styles.menuItem} onPress={() => { onClose(); onShare?.(); }}>
                                <Share2 size={20} color={colors.text} />
                                <Text style={[styles.menuText, { color: colors.text }]}>Share to...</Text>
                            </TouchableOpacity>

                            <View style={[styles.divider, { backgroundColor: colors.border }]} />

                            <TouchableOpacity style={styles.menuItem} onPress={() => { onClose(); onCopyLink?.(); }}>
                                <Copy size={20} color={colors.text} />
                                <Text style={[styles.menuText, { color: colors.text }]}>Copy Link</Text>
                            </TouchableOpacity>
                        </View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    menuContainer: {
        width: 250,
        borderRadius: 14,
        paddingVertical: 8,
        elevation: 5,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        gap: 12,
    },
    menuText: {
        fontSize: 16,
        fontWeight: '500',
    },
    divider: {
        height: 1,
        width: '100%',
    }
});
