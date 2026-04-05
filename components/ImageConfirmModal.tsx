import { View, Text, Modal, Image, StyleSheet, TouchableOpacity, useWindowDimensions, Platform } from 'react-native';
import { useThemeContext } from '@/context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

interface ImageConfirmModalProps {
    visible: boolean;
    imageUri: string | null;
    title?: string;
    onConfirm: () => void;
    onCancel: () => void;
}

export default function ImageConfirmModal({ 
    visible, 
    imageUri, 
    title = "Confirm Upload", 
    onConfirm, 
    onCancel 
}: ImageConfirmModalProps) {
    const { colors, isDark } = useThemeContext();
    const { width, height } = useWindowDimensions();
    const isDesktop = width > 768;

    if (!imageUri) return null;

    return (
        <Modal
            transparent
            visible={visible}
            animationType={isDesktop ? "fade" : "slide"}
            onRequestClose={onCancel}
        >
            <View style={[
                styles.overlay, 
                isDesktop && { justifyContent: 'center', alignItems: 'center' }
            ]}>
                <TouchableOpacity 
                    style={StyleSheet.absoluteFill} 
                    activeOpacity={1} 
                    onPress={onCancel} 
                />
                
                <View style={[
                    styles.container, 
                    { 
                        backgroundColor: colors.background, 
                        borderColor: colors.border,
                        width: isDesktop ? Math.min(width * 0.9, 650) : '100%',
                        borderRadius: isDesktop ? 32 : 28,
                        borderBottomLeftRadius: isDesktop ? 32 : 0,
                        borderBottomRightRadius: isDesktop ? 32 : 0,
                    }
                ]}>
                    <View style={styles.header}>
                        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
                        <TouchableOpacity onPress={onCancel}>
                            <Ionicons name="close" size={24} color={colors.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    <View style={[
                        styles.previewContainer,
                        isDesktop && { height: Math.min(height * 0.5, 350) }
                    ]}>
                        <Image 
                            source={{ uri: imageUri }} 
                            style={styles.previewImage} 
                            resizeMode="contain"
                        />
                    </View>

                    <View style={styles.footer}>
                        <TouchableOpacity 
                            style={[styles.btn, styles.cancelBtn, { backgroundColor: isDark ? '#1A1A1A' : '#F9F9F9' }]} 
                            onPress={onCancel}
                        >
                            <Text style={[styles.btnText, { color: colors.textSecondary }]}>Change</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity 
                            style={[styles.btn, styles.confirmBtn, { backgroundColor: colors.primary }]} 
                            onPress={onConfirm}
                        >
                            <Ionicons name="cloud-upload-outline" size={20} color="white" style={{ marginRight: 8 }} />
                            <Text style={styles.confirmBtnText}>Upload Now</Text>
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
        backgroundColor: 'rgba(0,0,0,0.4)', // Slightly lighter dark overlay
        justifyContent: 'flex-end',
    },
    container: {
        padding: 24,
        paddingBottom: Platform.OS === 'ios' ? 44 : 24,
        borderWidth: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    title: {
        fontSize: 22,
        fontWeight: '800',
    },
    previewContainer: {
        width: '100%',
        height: 280,
        borderRadius: 20,
        overflow: 'hidden',
        backgroundColor: '#000',
        marginBottom: 24,
    },
    previewImage: {
        width: '100%',
        height: '100%',
    },
    footer: {
        flexDirection: 'row',
        gap: 12,
    },
    btn: {
        flex: 1,
        height: 56,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'row',
    },
    cancelBtn: {
        // Subtle background instead of border
    },
    confirmBtn: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 5,
        elevation: 3,
    },
    btnText: {
        fontSize: 16,
        fontWeight: '600',
    },
    confirmBtnText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '700',
    }
});
