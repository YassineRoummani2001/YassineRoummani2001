import { useSettings } from '@/context/SettingsContext';
import { useThemeContext } from '@/context/ThemeContext';
import { useRouter } from 'expo-router';
import { ArrowLeft, ChevronRight, Key, Lock, Shield, Smartphone } from 'lucide-react-native';
import React, { useMemo } from 'react';
import { Alert, Platform, ScrollView, StatusBar, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function SecurityScreen() {
    const router = useRouter();
    const { colors, isDark } = useThemeContext();
    const insets = useSafeAreaInsets();
    const styles = useMemo(() => createStyles(colors), [colors]);

    const { settings, updateSetting } = useSettings();

    const SecurityToggle = ({ icon: Icon, title, description, value, onValueChange, isLast }: any) => (
        <View style={[styles.itemRow, isLast && { borderBottomWidth: 0 }]}>
            <View style={styles.iconContainer}>
                <Icon size={20} color={colors.primary} />
            </View>
            <View style={styles.textContainer}>
                <Text style={styles.itemTitle}>{title}</Text>
                {description && <Text style={styles.itemDescription}>{description}</Text>}
            </View>
            <Switch
                value={value}
                onValueChange={onValueChange}
                trackColor={{ false: '#E0E0E0', true: colors.primary }}
                thumbColor={Platform.OS === 'ios' ? '#fff' : (value ? '#fff' : '#f4f3f4')}
                style={{ transform: [{ scaleX: 0.9 }, { scaleY: 0.9 }] }}
            />
        </View>
    );

    const SecurityLink = ({ icon: Icon, title, description, onPress, isLast, rightText }: any) => (
        <TouchableOpacity style={[styles.itemRow, isLast && { borderBottomWidth: 0 }]} onPress={onPress}>
            <View style={styles.iconContainer}>
                <Icon size={20} color={colors.primary} />
            </View>
            <View style={styles.textContainer}>
                <Text style={styles.itemTitle}>{title}</Text>
                {description && <Text style={styles.itemDescription}>{description}</Text>}
            </View>
            {rightText ? (
                <Text style={styles.rightText}>{rightText}</Text>
            ) : (
                <ChevronRight size={20} color={colors.textSecondary} />
            )}
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle={colors.text === '#FFFFFF' ? 'light-content' : 'dark-content'} />

            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <ArrowLeft size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Security</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>

                <View style={styles.section}>
                    <Text style={styles.sectionHeader}>Login Security</Text>
                    <View style={styles.groupContainer}>
                        <SecurityLink
                            icon={Key}
                            title="Password"
                            description="Last changed 3 months ago"
                            onPress={() => Alert.alert('Change Password', 'Flow to change password')}
                            rightText="Update"
                        />
                        <SecurityToggle
                            icon={Smartphone}
                            title="Two-Factor Auth"
                            description="Add an extra layer of security"
                            value={settings.twoFactor}
                            onValueChange={(val: boolean) => updateSetting('twoFactor', val)}
                        />
                        <SecurityToggle
                            icon={Shield}
                            title="Face ID / Touch ID"
                            description="Use biometrics to unlock app"
                            value={settings.faceId}
                            onValueChange={(val: boolean) => updateSetting('faceId', val)}
                            isLast={true}
                        />
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionHeader}>Data & History</Text>
                    <View style={styles.groupContainer}>
                        <SecurityLink
                            icon={Lock}
                            title="Login Activity"
                            description="Where you're logged in"
                            onPress={() => Alert.alert('Login Activity', 'List of devices')}
                        />
                        <SecurityLink
                            icon={Shield}
                            title="Data Checkup"
                            description="Review your security settings"
                            onPress={() => Alert.alert('Security Checkup', 'Starting checkup...')}
                            isLast={true}
                        />
                    </View>
                </View>

            </ScrollView>
        </View>
    );
}

const createStyles = (colors: any) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingBottom: 16,
        backgroundColor: colors.background,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        zIndex: 10,
    },
    backButton: {
        padding: 8,
        marginLeft: -8,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.text,
    },
    content: {
        padding: 24,
        paddingBottom: 40,
    },
    section: {
        marginBottom: 24,
    },
    sectionHeader: {
        fontSize: 13,
        fontWeight: '700',
        color: colors.textSecondary,
        marginBottom: 8,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginLeft: 12,
    },
    groupContainer: {
        backgroundColor: colors.gray,
        borderRadius: 16,
        overflow: 'hidden',
    },
    itemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    iconContainer: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: colors.background,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    textContainer: {
        flex: 1,
        marginRight: 12,
    },
    itemTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 2,
    },
    itemDescription: {
        fontSize: 12,
        color: colors.textSecondary,
        lineHeight: 16,
        marginTop: 2,
    },
    rightText: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.primary,
    }
});
