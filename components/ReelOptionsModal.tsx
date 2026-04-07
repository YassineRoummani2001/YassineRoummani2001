
import { BlurView } from 'expo-blur';
import * as Clipboard from 'expo-clipboard';
import { Bookmark, Copy, Edit, Flag, Trash2, EyeOff, Share2, Music } from 'lucide-react-native';
import { Share, Platform } from 'react-native';
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
    isSaved?: boolean;
    isOwner?: boolean;
    onEdit?: () => void;
    onDelete?: () => void;
    onCopyLink?: () => void;
    onNotInterested?: () => void;
    onShare?: () => void;
}

export default function ReelOptionsModal({
    visible,
    onClose,
    onSave,
    onReport,
    postLink,
    isSaved,
    isOwner,
    onEdit,
    onDelete,
    onCopyLink,
    onNotInterested,
    onShare
}: ReelOptionsModalProps) {

    const handleShare = async () => {
        if (onShare) {
            onShare();
        } else if (postLink) {
            try {
                await Share.share({
                    message: `Check out this Reel on Vibe! ${postLink}`,
                    url: Platform.OS === 'ios' ? postLink : undefined,
                });
            } catch (error) {
                console.error('Error sharing:', error);
            }
        }
        onClose();
    };

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
                                    <Bookmark size={24} color={isSaved ? '#FACD00' : 'white'} fill={isSaved ? '#FACD00' : 'transparent'} />
                                </View>
                                <Text style={[styles.optionText, isSaved && { color: '#FACD00' }]}>
                                    {isSaved ? 'Saved' : 'Save Reel'}
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.option} onPress={handleCopyLink}>
                                <View style={styles.iconContainer}>
                                    <Copy size={24} color="white" />
                                </View>
                                <Text style={styles.optionText}>Copy Link</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.option} onPress={handleShare}>
                                <View style={styles.iconContainer}>
                                    <Share2 size={24} color="white" />
                                </View>
                                <Text style={styles.optionText}>Share to...</Text>
                            </TouchableOpacity>

                            <View style={{ height: 1, backgroundColor: '#333', marginVertical: 4 }} />

                            <TouchableOpacity style={styles.option} onPress={() => { onClose(); if (onNotInterested) onNotInterested(); }}>
                                <View style={styles.iconContainer}>
                                    <EyeOff size={24} color="white" />
                                </View>
                                <Text style={styles.optionText}>Not Interested</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.option} onPress={() => { onClose(); }}>
                                <View style={styles.iconContainer}>
                                    <Music size={24} color="white" />
                                </View>
                                <Text style={styles.optionText}>Remix this Reel</Text>
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
        backgroundColor: '#151515',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 20,
        paddingBottom: 40,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.08)',
    },
    handle: {
        width: 36,
        height: 5,
        backgroundColor: '#333',
        borderRadius: 3,
        alignSelf: 'center',
        marginBottom: 24,
    },
    optionsContainer: {
        gap: 12,
    },
    option: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        borderRadius: 16,
        backgroundColor: '#222',
        paddingHorizontal: 16,
    },
    iconContainer: {
        marginRight: 16,
        width: 24,
        alignItems: 'center',
    },
    optionText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '700',
    },
    cancelButton: {
        marginTop: 20,
        alignItems: 'center',
        paddingVertical: 14,
        borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.05)',
    },
    cancelText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '800',
    }
});
