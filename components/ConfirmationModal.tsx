import { useThemeContext } from '@/context/ThemeContext';
import { AlertCircle, Check, X } from 'lucide-react-native';
import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface ConfirmationModalProps {
    visible: boolean;
    onClose: () => void;
    title: string;
    message: string;
    type?: 'success' | 'error' | 'info';
}

export default function ConfirmationModal({
    visible,
    onClose,
    title,
    message,
    type = 'success'
}: ConfirmationModalProps) {
    const { colors, isDark } = useThemeContext();

    const getIcon = () => {
        switch (type) {
            case 'success':
                return <Check size={48} color="#4CAF50" strokeWidth={3} />;
            case 'error':
                return <X size={48} color="#FF3B30" strokeWidth={3} />;
            case 'info':
                return <AlertCircle size={48} color={colors.tint} strokeWidth={3} />;
            default:
                return <Check size={48} color="#4CAF50" strokeWidth={3} />;
        }
    };

    return (
        <Modal
            transparent={true}
            visible={visible}
            animationType="fade"
            onRequestClose={onClose}
        >
            <TouchableOpacity
                style={styles.overlay}
                activeOpacity={1}
                onPress={onClose}
            >
                <View style={[styles.modalContent, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' }]}>
                    <View style={styles.iconContainer}>
                        {getIcon()}
                    </View>

                    <Text style={[styles.title, { color: colors.text }]}>
                        {title}
                    </Text>

                    <Text style={[styles.message, { color: colors.textSecondary }]}>
                        {message}
                    </Text>

                    <TouchableOpacity
                        style={[styles.button, { backgroundColor: colors.tint }]}
                        onPress={onClose}
                    >
                        <Text style={styles.buttonText}>OK</Text>
                    </TouchableOpacity>
                </View>
            </TouchableOpacity>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        width: '100%',
        maxWidth: 320,
        borderRadius: 24,
        padding: 32,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 10,
    },
    iconContainer: {
        marginBottom: 20,
    },
    title: {
        fontSize: 22,
        fontWeight: '700',
        marginBottom: 12,
        textAlign: 'center',
    },
    message: {
        fontSize: 15,
        textAlign: 'center',
        marginBottom: 28,
        lineHeight: 22,
    },
    button: {
        width: '100%',
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    }
});
