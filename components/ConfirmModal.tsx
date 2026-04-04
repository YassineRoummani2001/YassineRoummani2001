import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useThemeContext } from '@/context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

interface ConfirmModalProps {
    visible: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    isDestructive?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

export default function ConfirmModal({
    visible,
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    isDestructive = true,
    onConfirm,
    onCancel
}: ConfirmModalProps) {
    const { colors, isDark } = useThemeContext();

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={onCancel}
        >
            <View style={styles.overlay}>
                <View style={[styles.container, { backgroundColor: isDark ? '#1F1F1F' : '#FFFFFF' }]}>
                    <View style={styles.content}>
                        <View style={[styles.iconContainer, { backgroundColor: isDestructive ? 'rgba(255, 75, 75, 0.1)' : 'rgba(139, 92, 246, 0.1)' }]}>
                            <Ionicons 
                                name={isDestructive ? "warning-outline" : "information-circle-outline"} 
                                size={28} 
                                color={isDestructive ? '#FF4B4B' : colors.primary} 
                            />
                        </View>
                        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
                        <Text style={[styles.message, { color: colors.textSecondary }]}>{message}</Text>
                    </View>
                    
                    <View style={[styles.buttonContainer, { borderTopColor: isDark ? '#333' : '#EEE' }]}>
                        <TouchableOpacity style={[styles.button, styles.cancelButton, { borderRightColor: isDark ? '#333' : '#EEE' }]} onPress={onCancel}>
                            <Text style={[styles.buttonText, { color: colors.textSecondary }]}>{cancelText}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.button, styles.confirmButton]} onPress={onConfirm}>
                            <Text style={[styles.buttonText, { color: isDestructive ? '#FF4B4B' : colors.primary, fontWeight: '700' }]}>
                                {confirmText}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
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
    container: {
        width: '85%',
        maxWidth: 400,
        borderRadius: 20,
        overflow: 'hidden',
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
    },
    content: {
        padding: 24,
        alignItems: 'center',
    },
    iconContainer: {
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 8,
        textAlign: 'center',
    },
    message: {
        fontSize: 15,
        textAlign: 'center',
        lineHeight: 22,
    },
    buttonContainer: {
        flexDirection: 'row',
        borderTopWidth: 1,
        height: 54,
    },
    button: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cancelButton: {
        borderRightWidth: 1,
    },
    confirmButton: {
    },
    buttonText: {
        fontSize: 16,
        fontWeight: '600',
    }
});
