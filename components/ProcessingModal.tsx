import React from 'react';
import { View, Text, Modal, ActivityIndicator, StyleSheet, useWindowDimensions, Platform } from 'react-native';
import { useThemeContext } from '@/context/ThemeContext';
import { BlurView } from 'expo-blur';

interface ProcessingModalProps {
    visible: boolean;
    message?: string;
}

export default function ProcessingModal({ visible, message = "Processing..." }: ProcessingModalProps) {
    const { colors, isDark } = useThemeContext();
    const { width, height } = useWindowDimensions();

    return (
        <Modal
            transparent
            visible={visible}
            animationType="fade"
            statusBarTranslucent
        >
            <View style={styles.overlay}>
                {Platform.OS !== 'web' ? (
                    <BlurView intensity={isDark ? 30 : 50} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
                ) : (
                    <View style={[StyleSheet.absoluteFill, { backgroundColor: isDark ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.7)' }]} />
                )}
                
                <View style={[styles.container, { backgroundColor: colors.background, borderColor: isDark ? '#333' : '#eee' }]}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={[styles.message, { color: colors.text }]}>{message}</Text>
                    <Text style={[styles.subMessage, { color: colors.textSecondary }]}>This may take a few moments</Text>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    container: {
        padding: 30,
        borderRadius: 24,
        alignItems: 'center',
        borderWidth: 1,
        width: 250,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 10 },
                shadowOpacity: 0.1,
                shadowRadius: 20,
            },
            android: {
                elevation: 10,
            },
            web: {
                boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
            }
        })
    },
    message: {
        fontSize: 18,
        fontWeight: '700',
        marginTop: 20,
    },
    subMessage: {
        fontSize: 13,
        marginTop: 8,
        textAlign: 'center',
    }
});
