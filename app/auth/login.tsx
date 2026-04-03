import { Colors } from '@/constants/Colors';
import { useUser } from '@/context/AuthContext';
import { useThemeContext } from '@/context/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ArrowRight, Eye, EyeOff, Lock, Mail } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Dimensions, I18nManager, Image, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

import { ApiClient } from '@/utils/api'; // Import ApiClient
import ErrorHandler from '@/utils/ErrorHandler'; // Import ErrorHandler

const { width } = Dimensions.get('window');

export default function LoginScreen() {
    const router = useRouter();
    const { t } = useTranslation();
    const userContext = useUser();

    // Safety check for context
    if (!userContext) {
        console.warn('⚠️ UserContext is missing in LoginScreen! Ensure UserProvider wraps this screen.');
    }

    const { login } = (userContext || {}) as any;
    const { colors, isDark } = useThemeContext();
    const insets = useSafeAreaInsets();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleLogin = async () => {
        if (!email || !password) {
            Toast.show({
                type: 'error',
                text1: t('common.error'),
                text2: t('common.error'), // Or add specific missing fields key
            });
            return;
        }

        setLoading(true);
        try {
            const response = await ApiClient.post<any>('/api/auth/login', { email, password });

            if (response.success) {
                // Success! User authentication verified
                // console.log('Login success:', response.data);

                // Save user to context
                await login(response.data);

                Toast.show({
                    type: 'success',
                    text1: t('auth.login_title'),
                    text2: t('common.success'),
                });
                // Navigate to home
                router.replace('/(tabs)');
            } else {
                // Error handled by ApiClient? Yes, likely generic.
                // We can show specific error if returned
                ErrorHandler.show(response.message, 'toast');
            }
        } catch (error) {
            ErrorHandler.log("Login Error", error);
        } finally {
            setLoading(false);
        }
    };

    const { width } = useWindowDimensions();
    const isDesktop = Platform.OS === 'web' && width > 768;

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar style={isDark ? "light" : "dark"} />
            {!isDesktop && (
                <LinearGradient
                    colors={isDark ? ['#6200EE', '#3700B3', '#000000'] : ['#E3F2FD', '#E1BEE7', '#FFFFFF']}
                    style={styles.background}
                />
            )}

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardView}
            >
                <View style={[
                    styles.contentContainer, 
                    isDesktop && styles.desktopContent,
                    isDesktop && { backgroundColor: isDark ? '#1A1A1A' : '#fff' }
                ]}>
                    {isDesktop && (
                        <View style={styles.brandingSection}>
                             <LinearGradient
                                colors={isDark ? ['#6200EE', '#3700B3'] : ['#E3F2FD', '#E1BEE7']}
                                style={StyleSheet.absoluteFill}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                            />
                            <View style={styles.brandingContent}>
                                <Image
                                    source={require('@/assets/images/vibe-logo.png')}
                                    style={{ width: 120, height: 120, borderRadius: 30 }}
                                />
                                <Text style={styles.brandingTitle}>Vibe</Text>
                                <Text style={styles.brandingSubtitle}>The next generation of social interaction.</Text>
                            </View>
                        </View>
                    )}

                    <View style={[styles.formWrapper, isDesktop && { flex: 1, paddingHorizontal: 60 }]}>
                        <View style={styles.headerContainer}>
                            {!isDesktop && (
                                <View style={[styles.logoContainer, { boxShadow: isDark ? `0px 8px 20px ${colors.primary}60` : `0px 8px 20px ${colors.primary}30` }]}>
                                    <Image
                                        source={require('@/assets/images/vibe-logo.png')}
                                        style={styles.logoImage}
                                    />
                                </View>
                            )}
                            <Text style={[styles.appName, { color: isDark ? '#fff' : '#333' }]}>{isDesktop ? 'Welcome back' : 'Vibe'}</Text>
                            <Text style={[styles.tagline, { color: isDark ? '#ccc' : '#666' }]}>{t('auth.login_subtitle')}</Text>
                        </View>

                        <View style={styles.formContainer}>
                            <View style={[styles.inputContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]}>
                                <Mail size={20} color={isDark ? "#ccc" : "#666"} style={styles.inputIcon} />
                                <TextInput
                                    style={[styles.input, { color: isDark ? '#fff' : '#333' }]}
                                    placeholder={t('auth.email_placeholder')}
                                    placeholderTextColor={isDark ? "#aaa" : "#888"}
                                    value={email}
                                    onChangeText={setEmail}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                />
                            </View>

                            <View style={[styles.inputContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]}>
                                <Lock size={20} color={isDark ? "#ccc" : "#666"} style={styles.inputIcon} />
                                <TextInput
                                    style={[styles.input, { color: isDark ? '#fff' : '#333' }]}
                                    placeholder={t('auth.password_placeholder')}
                                    placeholderTextColor={isDark ? "#aaa" : "#888"}
                                    value={password}
                                    onChangeText={setPassword}
                                    secureTextEntry={!showPassword}
                                />
                                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                                    {showPassword ? <EyeOff size={20} color={isDark ? "#ccc" : "#666"} /> : <Eye size={20} color={isDark ? "#ccc" : "#666"} />}
                                </TouchableOpacity>
                            </View>

                            <TouchableOpacity style={styles.forgotPassword} onPress={() => router.push('/auth/forgot-password')}>
                                <Text style={[styles.forgotPasswordText, { color: isDark ? '#ccc' : '#666' }]}>{t('auth.forgot_password')}</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={[styles.loginButton, { backgroundColor: colors.primary }]} onPress={handleLogin} disabled={loading}>
                                {loading ? (
                                    <ActivityIndicator color="white" />
                                ) : (
                                    <View style={styles.loginContent}>
                                        <Text style={styles.loginButtonText}>{t('auth.login_button')}</Text>
                                        <ArrowRight size={20} color="white" />
                                    </View>
                                )}
                            </TouchableOpacity>

                            <View style={styles.dividerContainer}>
                                <View style={[styles.divider, { backgroundColor: colors.border }]} />
                                <Text style={[styles.dividerText, { color: colors.textSecondary }]}>OR</Text>
                                <View style={[styles.divider, { backgroundColor: colors.border }]} />
                            </View>

                            <View style={styles.socialRow}>
                                <TouchableOpacity style={[styles.socialButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', borderColor: colors.border }]}>
                                    <Image source={{ uri: 'https://cdn-icons-png.flaticon.com/512/300/300221.png' }} style={styles.socialIconBase} />
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.socialButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', borderColor: colors.border }]}>
                                    <Image source={{ uri: 'https://cdn-icons-png.flaticon.com/512/0/747.png' }} style={styles.socialIconBase} tintColor={isDark ? "#fff" : "#333"} />
                                </TouchableOpacity>
                            </View>
                        </View>

                        <View style={styles.footer}>
                            <Text style={[styles.footerText, { color: colors.textSecondary }]}>{t('auth.no_account')} </Text>
                            <TouchableOpacity onPress={() => router.push('/auth/signup')}>
                                <Text style={[styles.signupText, { color: colors.primary }]}>{t('auth.signup_button')}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    background: {
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        height: '100%',
    },
    keyboardView: {
        flex: 1,
    },
    contentContainer: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: 30,
    },
    headerContainer: {
        alignItems: 'center',
        marginBottom: 40,
    },
    logoContainer: {
        marginBottom: 20,
        borderRadius: 30,
        overflow: 'hidden',
    },
    logoImage: {
        width: 120,
        height: 120,
        borderRadius: 30,
    },
    appName: {
        fontSize: 32,
        fontWeight: 'bold',
        letterSpacing: 1,
    },
    tagline: {
        fontSize: 16,
        marginTop: 8,
    },
    formContainer: {
        width: '100%',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 24,
        paddingHorizontal: 16,
        paddingVertical: 14,
        marginBottom: 16,
        borderWidth: 1,
    },
    inputIcon: {
        marginRight: 12,
    },
    input: {
        flex: 1,
        fontSize: 16,
        outlineStyle: 'none' as any,
    },
    eyeIcon: {
        padding: 4,
    },
    forgotPassword: {
        alignSelf: 'flex-end',
        marginBottom: 30,
    },
    forgotPasswordText: {
        fontSize: 14,
    },
    loginButton: {
        backgroundColor: Colors.light.primary,
        borderRadius: 30,
        paddingVertical: 16,
        alignItems: 'center',
        justifyContent: 'center',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
        elevation: 8,
    },
    loginContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    loginButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    dividerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 30,
    },
    divider: {
        flex: 1,
        height: 1,
    },
    dividerText: {
        paddingHorizontal: 16,
        fontSize: 14,
    },
    socialRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 20,
    },
    socialButton: {
        width: 60,
        height: 60,
        borderRadius: 30,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
    },
    socialIconBase: {
        width: 24,
        height: 24,
        resizeMode: 'contain',
    },
    desktopContent: {
        flexDirection: 'row',
        paddingHorizontal: 0,
        maxWidth: 1000,
        height: 600,
        alignSelf: 'center',
        borderRadius: 24,
        overflow: 'hidden',
        shadowOffset: { width: 0, height: 20 },
        shadowOpacity: 0.1,
        shadowRadius: 40,
        elevation: 10,
    },
    brandingSection: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: Colors.light.primary,
    },
    brandingContent: {
        alignItems: 'center',
        padding: 40,
    },
    brandingTitle: {
        fontSize: 48,
        fontWeight: '900',
        color: 'white',
        marginTop: 20,
        letterSpacing: -1,
    },
    brandingSubtitle: {
        fontSize: 18,
        color: 'rgba(255,255,255,0.8)',
        textAlign: 'center',
        marginTop: 10,
        lineHeight: 26,
    },
    formWrapper: {
        justifyContent: 'center',
        paddingVertical: 40,
    },
    signupText: {
        fontSize: 15,
        fontWeight: 'bold',
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 40,
    },
    footerText: {
        fontSize: 15,
    },
});
