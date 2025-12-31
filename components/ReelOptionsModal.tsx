
import { BlurView } from 'expo-blur';
import * as Clipboard from 'expo-clipboard';
import { Bookmark, Copy, Edit, Flag, Trash2 } from 'lucide-react-native';
import React from 'react';
import { Dimensions, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Toast from 'react-native-toast-message';

const { width } = Dimensions.get('window');

interface ReelOptionsModalProps {
    visible: boolean;
    onClose: () => void;
    onSave: () => void;
    onReport: () => void;
    postLink?: string;
    isOwner?: boolean;
    onEdit?: () => void;
    onDelete?: () => void;
    onCopyLink?: () => void;
}

export default function ReelOptionsModal({
    visible,
    onClose,
    onSave,
    onReport,
    postLink,
    isOwner,
    onEdit,
    onDelete,
    onCopyLink
}: ReelOptionsModalProps) {

    const handleCopyLink = async () => {
        if (onCopyLink) {
            onCopyLink();
        } else if (postLink) {
            await Clipboard.setStringAsync(postLink);
            Toast.show({
                type: 'success',
                text1: 'Link copied',
                position: 'bottom',
                visibilityTime: 2000,
            });
        }
        onClose();
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
                <BlurView intensity={20} style={styles.blur} tint="dark">
                    <View style={styles.sheet}>
                        <View style={styles.handle} />

                        <View style={styles.optionsContainer}>
                            {isOwner && (
                                <>
                                    <TouchableOpacity style={styles.option} onPress={() => { onClose(); if (onEdit) onEdit(); }}>
                                        <View style={styles.iconContainer}>
                                            <Edit size={24} color="white" />
                                        </View>
                                        <Text style={styles.optionText}>Edit Caption</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity style={styles.option} onPress={() => { onClose(); if (onDelete) onDelete(); }}>
                                        <View style={styles.iconContainer}>
                                            <Trash2 size={24} color="#FF453A" />
                                        </View>
                                        <Text style={[styles.optionText, { color: '#FF453A' }]}>Delete Post</Text>
                                    </TouchableOpacity>
                                    <View style={{ height: 1, backgroundColor: '#333', marginVertical: 4 }} />
                                </>
                            )}

                            <TouchableOpacity style={styles.option} onPress={onSave}>
                                <View style={styles.iconContainer}>
                                    <Bookmark size={24} color="white" />
                                </View>
                                <Text style={styles.optionText}>Save Reel</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.option} onPress={handleCopyLink}>
                                <View style={styles.iconContainer}>
                                    <Copy size={24} color="white" />
                                </View>
                                <Text style={styles.optionText}>Copy Link</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.option} onPress={onReport}>
                                <View style={styles.iconContainer}>
                                    <Flag size={24} color="#FF453A" />
                                </View>
                                <Text style={[styles.optionText, { color: '#FF453A' }]}>Report</Text>
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
                            <Text style={styles.cancelText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </BlurView>
            </TouchableOpacity>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    blur: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    sheet: {
        backgroundColor: '#1A1A1A',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        paddingBottom: 40,
    },
    handle: {
        width: 40,
        height: 4,
        backgroundColor: '#333',
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: 20,
    },
    optionsContainer: {
        gap: 16,
    },
    option: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderRadius: 12,
        backgroundColor: '#2A2A2A',
        paddingHorizontal: 16,
    },
    iconContainer: {
        marginRight: 16,
    },
    optionText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
    cancelButton: {
        marginTop: 20,
        alignItems: 'center',
        paddingVertical: 12,
        borderTopWidth: 1,
        borderTopColor: '#333',
    },
    cancelText: {
        color: '#999',
        fontSize: 16,
        fontWeight: '500',
    }
});
