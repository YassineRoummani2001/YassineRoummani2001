import { useSettings } from '@/context/SettingsContext';
import { THEME_COLORS, useThemeContext } from '@/context/ThemeContext';
import { useUser } from '@/context/UserContext';
import { changeLanguage } from '@/i18n';
import { useRouter } from 'expo-router';
import {
    ArrowLeft,
    Bell,
    Bookmark,
    Check,
    ChevronRight,
    Clock,
    Eye,
    Globe,
    HelpCircle,
    Lock,
    LogOut,
    Moon,
    Palette,
    Scan,
    Shield,
    Sun,
    User,
    Volume2,
    X
} from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Alert,
    I18nManager,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
// Actually I18nManager + Updates.reloadAsync() is the expo way. But user said no backend logic change and expo managed.
// We will rely on purely JS reload if possible or just the context switch.

export default function SettingsScreen() {
    const router = useRouter();
    const { t, i18n } = useTranslation();
    const { user, logout, deleteAccount } = (useUser() || {}) as any;
    const { isDark, toggleTheme, colors, primaryColor, setPrimaryColor } = useThemeContext();
    const { settings, updateSetting } = useSettings();
    const insets = useSafeAreaInsets();

    // UI States
    const [isColorModalVisible, setColorModalVisible] = useState(false);
    const [isLanguageModalVisible, setLanguageModalVisible] = useState(false);

    // Use Memoized styles
    const styles = useMemo(() => createStyles(colors, insets), [colors, insets]);

    const handleLogout = async () => {
        if (Platform.OS === 'web') {
            const confirmed = window.confirm(t('settings.logout') + "?");
            if (confirmed) {
                if (logout) {
                    await logout();
                    router.replace('/auth/login');
                }
            }
        } else {
            Alert.alert(
                t('settings.logout'),
                t('settings.logout') + "?",
                [
                    { text: t('common.cancel'), style: "cancel" },
                    {
                        text: t('settings.logout'),
                        style: "destructive",
                        onPress: async () => {
                            if (logout) {
                                await logout();
                                router.replace('/auth/login');
                            }
                        }
                    }
                ]
            );
        }
    };

    const handleDeleteAccount = () => {
        if (Platform.OS === 'web') {
            if (window.confirm("Are you sure you want to delete your account? This action cannot be undone.")) {
                deleteAccount?.().then((res: any) => {
                    if (!res.success) alert(res.message || "Failed to delete account");
                    else router.replace('/auth/login');
                });
            }
        } else {
            Alert.alert(
                (t('common.delete') || "Delete") + " Account",
                "Are you sure you want to delete your account? This action cannot be undone.",
                [
                    { text: t('common.cancel'), style: 'cancel' },
                    {
                        text: (t('common.delete') || "Delete"),
                        style: 'destructive',
                        onPress: async () => {
                            const res = await deleteAccount?.();
                            if (!res?.success) {
                                Alert.alert("Error", res?.message || "Failed to delete account");
                            } else {
                                router.replace('/auth/login');
                            }
                        }
                    }
                ]
            );
        }
    };

    const SettingItem = ({
        icon: Icon,
        title,
        subtitle,
        onPress,
        showArrow = true,
        rightComponent,
        isDestructive = false
    }: any) => (
        <TouchableOpacity
            style={styles.settingItem}
            onPress={onPress}
            activeOpacity={0.7}
            disabled={!onPress && !rightComponent && !showArrow}
        >
            <View style={styles.settingLeft}>
                <View style={[styles.iconContainer, isDestructive && { backgroundColor: '#FF3B3015' }]}>
                    <Icon size={22} color={isDestructive ? '#FF3B30' : colors.primary} />
                </View>
                <View style={styles.settingText}>
                    <Text style={[styles.settingTitle, isDestructive && { color: '#FF3B30' }]}>{title}</Text>
                    {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
                </View>
            </View>
            {rightComponent || (showArrow && <ChevronRight size={20} color={colors.textSecondary} />)}
        </TouchableOpacity>
    );

    const renderColorModal = () => (
        <Modal
            visible={isColorModalVisible}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setColorModalVisible(false)}
        >
            <TouchableWithoutFeedback onPress={() => setColorModalVisible(false)}>
                <View style={styles.modalOverlay}>
                    <TouchableWithoutFeedback>
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>{t('settings.theme')}</Text>
                                <TouchableOpacity onPress={() => setColorModalVisible(false)}>
                                    <X size={24} color={colors.text} />
                                </TouchableOpacity>
                            </View>
                            <View style={styles.colorGrid}>
                                {THEME_COLORS.map((color) => (
                                    <TouchableOpacity
                                        key={color}
                                        style={[
                                            styles.colorOption,
                                            { backgroundColor: color },
                                            primaryColor === color && styles.colorOptionSelected
                                        ]}
                                        onPress={() => {
                                            setPrimaryColor(color);
                                            setColorModalVisible(false);
                                        }}
                                    >
                                        {primaryColor === color && <Check color="white" size={20} strokeWidth={3} />}
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );

    const LANGUAGES = [
        { code: 'en', label: 'English' },
        { code: 'fr', label: 'Français' },
        { code: 'ar', label: 'العربية' },
    ];

    const renderLanguageModal = () => (
        <Modal
            visible={isLanguageModalVisible}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setLanguageModalVisible(false)}
        >
            <TouchableWithoutFeedback onPress={() => setLanguageModalVisible(false)}>
                <View style={styles.modalOverlay}>
                    <TouchableWithoutFeedback>
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>{t('settings.language')}</Text>
                                <TouchableOpacity onPress={() => setLanguageModalVisible(false)}>
                                    <X size={24} color={colors.text} />
                                </TouchableOpacity>
                            </View>
                            {LANGUAGES.map((lang) => (
                                <TouchableOpacity
                                    key={lang.code}
                                    style={styles.languageOption}
                                    onPress={() => {
                                        changeLanguage(lang.code as any);
                                        setLanguageModalVisible(false);
                                    }}
                                >
                                    <Text style={[styles.languageText, { color: colors.text }]}>{lang.label}</Text>
                                    {i18n.language === lang.code && <Check size={20} color={colors.primary} />}
                                </TouchableOpacity>
                            ))}
                        </View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );

    const SettingSection = ({ title, children }: any) => (
        <View style={styles.section}>
            <Text style={[styles.sectionTitle, { textAlign: 'left' }]}>{title}</Text>
            <View style={styles.sectionContent}>
                {children}
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <ArrowLeft size={24} color={colors.text} style={{ transform: [{ scaleX: I18nManager.isRTL ? -1 : 1 }] }} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t('settings.title')}</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Account Section */}
                <SettingSection title={t('settings.account')}>
                    <SettingItem
                        icon={User}
                        title={t('common.edit') + " " + t('navigation.profile')}
                        subtitle="Update your personal information"
                        onPress={() => router.push('/edit-profile')}
                    />
                    <SettingItem
                        icon={Lock}
                        title={t('settings.privacy')}
                        subtitle="Manage your privacy settings"
                        onPress={() => router.push('/privacy')}
                    />
                    <SettingItem
                        icon={Shield}
                        title={t('settings.security')}
                        subtitle="Password, 2FA, and more"
                        onPress={() => router.push('/security')}
                    />
                    <SettingItem
                        icon={Clock}
                        title="My Stories"
                        subtitle="View your story archive"
                        onPress={() => router.push('/my-stories')}
                    />
                    <SettingItem
                        icon={Scan}
                        title="QR Code"
                        subtitle="Share and scan profiles"
                        onPress={() => router.push('/qr-code')}
                    />
                    <SettingItem
                        icon={X}
                        title="Blocked Users"
                        subtitle="Manage blocked accounts"
                        onPress={() => router.push('/blocked-users')}
                    />
                    <SettingItem
                        icon={Bookmark}
                        title="Saved Posts"
                        subtitle="View saved posts"
                        onPress={() => router.push('/saved')}
                    />

                </SettingSection>

                {/* Appearance Section */}
                <SettingSection title={t('settings.appearance')}>
                    <SettingItem
                        icon={isDark ? Moon : Sun}
                        title={t('settings.dark_mode')}
                        subtitle={isDark ? 'Dark theme enabled' : 'Light theme enabled'}
                        showArrow={false}
                        rightComponent={
                            <Switch
                                value={isDark}
                                onValueChange={(val) => {
                                    if (val !== isDark) {
                                        toggleTheme();
                                    }
                                }}
                                trackColor={{ false: '#E0E0E0', true: colors.primary }}
                                thumbColor={isDark ? '#fff' : '#f4f3f4'}
                            />
                        }
                    />
                    <SettingItem
                        icon={Palette}
                        title={t('settings.theme')}
                        subtitle="Customize your accent color"
                        onPress={() => setColorModalVisible(true)}
                        rightComponent={
                            <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: primaryColor, borderWidth: 1, borderColor: colors.border }} />
                        }
                    />
                </SettingSection>

                {/* Notifications Section */}
                <SettingSection title={t('settings.notifications')}>
                    <SettingItem
                        icon={Bell}
                        title="Push Notifications"
                        subtitle={settings.notifications ? t('common.success') : 'Disabled'}
                        showArrow={false}
                        rightComponent={
                            <Switch
                                value={settings.notifications}
                                onValueChange={(val) => updateSetting('notifications', val)}
                                trackColor={{ false: '#E0E0E0', true: colors.primary }}
                                thumbColor={settings.notifications ? '#fff' : '#f4f3f4'}
                            />
                        }
                    />
                    <SettingItem
                        icon={Volume2}
                        title="Sound"
                        subtitle={settings.sound ? 'Enabled' : 'Disabled'}
                        showArrow={false}
                        rightComponent={
                            <Switch
                                value={settings.sound}
                                onValueChange={(val) => updateSetting('sound', val)}
                                trackColor={{ false: '#E0E0E0', true: colors.primary }}
                                thumbColor={settings.sound ? '#fff' : '#f4f3f4'}
                            />
                        }
                    />
                </SettingSection>

                {/* Content Preferences */}
                <SettingSection title="Content">
                    <SettingItem
                        icon={Eye}
                        title="Auto-play Videos"
                        subtitle={settings.autoPlay ? 'Videos play automatically' : 'Tap to play'}
                        showArrow={false}
                        rightComponent={
                            <Switch
                                value={settings.autoPlay}
                                onValueChange={(val) => updateSetting('autoPlay', val)}
                                trackColor={{ false: '#E0E0E0', true: colors.primary }}
                                thumbColor={settings.autoPlay ? '#fff' : '#f4f3f4'}
                            />
                        }
                    />
                    <SettingItem
                        icon={Globe}
                        title={t('settings.language')}
                        subtitle={LANGUAGES.find(l => l.code === i18n.language)?.label || 'English'}
                        onPress={() => setLanguageModalVisible(true)}
                    />
                </SettingSection>

                {/* Support Section */}
                <SettingSection title={t('settings.help')}>
                    <SettingItem
                        icon={HelpCircle}
                        title={t('settings.help')}
                        subtitle="Get help and support"
                        onPress={() => router.push('/help')}
                    />
                    <SettingItem
                        icon={Shield}
                        title={t('settings.about')}
                        subtitle="Version 1.0.0"
                        onPress={() => router.push('/about')}
                    />
                </SettingSection>

                {/* Danger Zone */}
                <SettingSection title="Danger Zone">
                    <SettingItem
                        icon={X}
                        title="Delete Account"
                        subtitle="Permanently delete your account and data"
                        onPress={handleDeleteAccount}
                        isDestructive
                    />
                </SettingSection>

                {/* Login Section */}
                <View style={styles.section}>
                    <View style={styles.sectionContent}>
                        <SettingItem
                            icon={LogOut}
                            title={t('settings.logout')}
                            showArrow={false}
                            onPress={handleLogout}
                            isDestructive
                        />
                    </View>
                </View>

                {/* App Info */}
                <View style={styles.footer}>
                    <Text style={styles.footerText}>Vibe v1.0.0</Text>
                    <Text style={styles.footerSubtext}>Made with ❤️</Text>
                </View>
            </ScrollView>

            {renderColorModal()}
            {renderLanguageModal()}
        </View>
    );
}

const createStyles = (colors: any, insets: any) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background, // Dynamic
        paddingTop: insets.top, // ✅ Safe area for iOS
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 16,
        backgroundColor: colors.background, // Dynamic
        borderBottomWidth: 1,
        borderBottomColor: colors.border, // Dynamic
    },
    backButton: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: colors.text, // Dynamic
    },
    section: {
        marginTop: 24,
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.textSecondary, // Dynamic
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        paddingHorizontal: 16,
        marginBottom: 8,
    },
    sectionContent: {
        backgroundColor: colors.gray, // Dynamic Card color
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: colors.border, // Dynamic
    },
    settingItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.border, // Dynamic
    },
    settingLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: `${colors.primary}15`,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    settingText: {
        flex: 1,
    },
    settingTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text, // Dynamic
        marginBottom: 2,
    },
    settingSubtitle: {
        fontSize: 13,
        color: colors.textSecondary, // Dynamic
    },
    footer: {
        alignItems: 'center',
        paddingVertical: 40,
        paddingBottom: 100,
    },
    footerText: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.textSecondary, // Dynamic
        marginBottom: 4,
    },
    footerSubtext: {
        fontSize: 12,
        color: colors.textSecondary, // Dynamic (faint)
        opacity: 0.7
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        width: '85%',
        backgroundColor: colors.background,
        borderRadius: 20,
        padding: 24,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
        borderWidth: 1,
        borderColor: colors.border,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: colors.text,
    },
    colorGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 16,
        justifyContent: 'center',
    },
    colorOption: {
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'transparent',
    },
    colorOptionSelected: {
        borderColor: colors.text,
        transform: [{ scale: 1.1 }],
    },
    languageOption: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    languageText: {
        fontSize: 16,
        fontWeight: '500',
    }
});
