import { useThemeContext } from '@/context/ThemeContext';
import { BlurView } from 'expo-blur';
import { Check, X, AlertCircle, HelpCircle } from 'lucide-react-native';
import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View, Platform, Pressable, Animated } from 'react-native';

interface VibeConfirmModalProps {
    visible: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    isDestructive?: boolean;
    icon?: React.ReactNode;
}

export default function VibeConfirmModal({
    visible,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = "Confirm",
    cancelText = "Cancel",
    isDestructive = false,
    icon
}: VibeConfirmModalProps) {
    const { colors, isDark } = useThemeContext();

    if (!visible) return null;

    return (
        <Modal
            transparent={true}
            visible={visible}
            animationType="fade"
            onRequestClose={onClose}
        >
            <Pressable 
                style={styles.overlay} 
                onPress={onClose}
            >
                {Platform.OS !== 'web' ? (
                    <BlurView intensity={20} style={StyleSheet.absoluteFill} tint="dark" />
                ) : (
                    <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.6)' }]} />
                )}
                
                <Pressable 
                    style={[
                        styles.modalContent, 
                        { 
                            backgroundColor: isDark ? '#121212' : '#FFFFFF',
                            borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'
                        }
                    ]}
                >
                    <View style={styles.header}>
                        <View style={[
                            styles.iconWrapper, 
                            { backgroundColor: isDestructive ? 'rgba(255,59,48,0.1)' : `${colors.primary}10` }
                        ]}>
                            {icon || (isDestructive ? (
                                <AlertCircle size={28} color="#FF3B30" />
                            ) : (
                                <HelpCircle size={28} color={colors.primary} />
                            ))}
                        </View>
                    </View>

                    <View style={styles.body}>
                        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
                        <Text style={[styles.message, { color: colors.textSecondary }]}>{message}</Text>
                    </View>

                    <View style={styles.footer}>
                        <TouchableOpacity
                            style={[styles.button, styles.cancelButton, { backgroundColor: isDark ? '#222' : '#F2F2F7' }]}
                            onPress={onClose}
                            activeOpacity={0.8}
                        >
                            <Text style={[styles.buttonText, { color: colors.text }]}>{cancelText}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                styles.button, 
                                styles.confirmButton, 
                                { backgroundColor: isDestructive ? '#FF3B30' : colors.primary }
                            ]}
                            onPress={() => {
                                onConfirm();
                                onClose();
                            }}
                            activeOpacity={0.8}
                        >
                            <Text style={[styles.buttonText, { color: '#FFFFFF' }]}>{confirmText}</Text>
                        </TouchableOpacity>
                    </View>
                </Pressable>
            </Pressable>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    modalContent: {
        width: '100%',
        maxWidth: 360,
        borderRadius: 32,
        padding: 32,
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 15 },
        shadowOpacity: 0.4,
        shadowRadius: 25,
        elevation: 20,
    },
    header: {
        alignItems: 'center',
        marginBottom: 20,
    },
    iconWrapper: {
        width: 64,
        height: 64,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    body: {
        alignItems: 'center',
        marginBottom: 32,
    },
    title: {
        fontSize: 22,
        fontWeight: '800',
        marginBottom: 10,
        textAlign: 'center',
        letterSpacing: -0.5,
    },
    message: {
        fontSize: 15,
        textAlign: 'center',
        lineHeight: 22,
    },
    footer: {
        flexDirection: 'row',
        gap: 12,
    },
    button: {
        flex: 1,
        height: 54,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cancelButton: {
    },
    confirmButton: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
    },
    buttonText: {
        fontSize: 16,
        fontWeight: '700',
    }
});
