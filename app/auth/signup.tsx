import { Colors } from '@/constants/Colors';
import { useThemeContext } from '@/context/ThemeContext';
import { ApiClient } from '@/utils/api';
import ErrorHandler from '@/utils/ErrorHandler';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ArrowRight, Lock, Mail, User } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Dimensions, Image, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

import { useUser } from '@/context/UserContext';

const { width } = Dimensions.get('window');

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SignupScreen() {
    const { login } = (useUser() || {}) as any;
    const router = useRouter();
    const { colors, isDark } = useThemeContext();
    const insets = useSafeAreaInsets();

    // Form state
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    // Error states
    const [nameError, setNameError] = useState('');
    const [emailError, setEmailError] = useState('');
    const [passwordError, setPasswordError] = useState('');

    // Validation helpers
    const validateEmail = (email: string) => {
        if (!email) return '';
        if (!EMAIL_REGEX.test(email)) {
            return 'Please enter a valid email address';
        }
        return '';
    };

    const validatePassword = (password: string) => {
        if (!password) return '';
        if (password.length < 6) {
            return 'Password must be at least 6 characters';
        }
        return '';
    };

    const validateName = (name: string) => {
        if (!name) return '';
        if (name.trim().length < 2) {
            return 'Name must be at least 2 characters';
        }
        if (name.trim().length > 50) {
            return 'Name must be less than 50 characters';
        }
        return '';
    };

    // Handle email change with validation
    const handleEmailChange = (text: string) => {
        setEmail(text);
        // Clear error when user starts typing
        if (emailError) {
            setEmailError('');
        }
    };

    // Handle name change with validation
    const handleNameChange = (text: string) => {
        setName(text);
        if (nameError) {
            setNameError('');
        }
    };

    // Handle password change with validation
    const handlePasswordChange = (text: string) => {
        setPassword(text);
        if (passwordError) {
            setPasswordError('');
        }
    };

    const handleSignup = async () => {
        // Clear previous errors
        setNameError('');
        setEmailError('');
        setPasswordError('');

        // Validate all fields
        const nameValidation = validateName(name);
        const emailValidation = validateEmail(email);
        const passwordValidation = validatePassword(password);

        // Check for validation errors
        if (nameValidation || emailValidation || passwordValidation) {
            if (nameValidation) setNameError(nameValidation);
            if (emailValidation) setEmailError(emailValidation);
            if (passwordValidation) setPasswordError(passwordValidation);

            Toast.show({
                type: 'error',
                text1: 'Invalid Input',
                text2: 'Please check the highlighted fields',
            });
            return;
        }

        setLoading(true);
        try {
            const response = await ApiClient.post('/api/auth/register', {
                name: name.trim(),
                email: email.toLowerCase().trim(),
                password
            });

            if (response.success) {
                // console.log('User registered:', response.data);
                Toast.show({
                    type: 'success',
                    text1: 'Account Created! 🎉',
                    text2: 'Welcome to Vibe!',
                });
                
                // Login immediately
                if ((response.data as any)?.token) {
                    await login(response.data);
                    router.replace('/(tabs)');
                } else {
                    router.replace('/auth/login');
                }
            } else {
                // Specific field mapping for errors
                const msg = response.message || '';
                if (msg.toLowerCase().includes('email')) {
                    setEmailError(msg);
                } else if (msg.toLowerCase().includes('password')) {
                    setPasswordError(msg);
                } else if (msg.toLowerCase().includes('name')) {
                    setNameError(msg);
                }

                Toast.show({
                    type: 'error',
                    text1: 'Signup Failed',
                    text2: msg || 'Could not create account',
                });
            }
        } catch (error) {
            console.error('Signup error:', error);
            ErrorHandler.show('Please check your connection and try again.', 'toast');
        } finally {
            setLoading(false);
        }
    };

    const handleSocialLogin = (provider: string) => {
        Toast.show({
            type: 'info',
            text1: `${provider} Login`,
            text2: `${provider} authentication is coming soon! ✨`,
        });
    };

    const { width } = useWindowDimensions();
    const isDesktop = Platform.OS === 'web' && width > 768;

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar style={isDark ? "light" : "dark"} />
            {!isDesktop && (
                <LinearGradient
                    colors={isDark ? ['#000000', '#1A1A1A', '#3700B3'] : ['#E3F2FD', '#E1BEE7', '#FFFFFF']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
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
                                colors={isDark ? ['#3700B3', '#000000'] : ['#E1BEE7', '#E3F2FD']}
                                style={StyleSheet.absoluteFill}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                            />
                            <View style={styles.brandingContent}>
                                <Image
                                    source={require('@/assets/images/vibe-logo.png')}
                                    style={{ width: 120, height: 120, borderRadius: 30 }}
                                />
                                <Text style={styles.brandingTitle}>Join Vibe</Text>
                                <Text style={styles.brandingSubtitle}>Create an account to start sharing your world with others.</Text>
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
                            <Text style={[styles.title, { color: colors.text }]}>Create Account</Text>
                            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Join Vibe and start sharing your moments.</Text>
                        </View>

                        <View style={styles.formContainer}>
                            {/* Name Input */}
                            <View>
                                <View style={[
                                    styles.inputContainer,
                                    {
                                        backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                                        borderColor: nameError ? '#FF3B30' : colors.border,
                                        borderWidth: nameError ? 2 : 1
                                    }
                                ]}>
                                    <User size={20} color={nameError ? '#FF3B30' : colors.textSecondary} style={styles.inputIcon} />
                                    <TextInput
                                        style={[styles.input, { color: colors.text }]}
                                        placeholder="Full Name"
                                        placeholderTextColor={colors.textSecondary}
                                        value={name}
                                        onChangeText={handleNameChange}
                                        editable={!loading}
                                    />
                                </View>
                                {nameError ? <Text style={styles.errorText}>{nameError}</Text> : null}
                            </View>

                            {/* Email Input */}
                            <View>
                                <View style={[
                                    styles.inputContainer,
                                    {
                                        backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                                        borderColor: emailError ? '#FF3B30' : colors.border,
                                        borderWidth: emailError ? 2 : 1
                                    }
                                ]}>
                                    <Mail size={20} color={emailError ? '#FF3B30' : colors.textSecondary} style={styles.inputIcon} />
                                    <TextInput
                                        style={[styles.input, { color: colors.text }]}
                                        placeholder="Email"
                                        placeholderTextColor={colors.textSecondary}
                                        value={email}
                                        onChangeText={handleEmailChange}
                                        keyboardType="email-address"
                                        autoCapitalize="none"
                                        editable={!loading}
                                    />
                                </View>
                                {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}
                            </View>

                            {/* Password Input */}
                            <View>
                                <View style={[
                                    styles.inputContainer,
                                    {
                                        backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                                        borderColor: passwordError ? '#FF3B30' : colors.border,
                                        borderWidth: passwordError ? 2 : 1
                                    }
                                ]}>
                                    <Lock size={20} color={passwordError ? '#FF3B30' : colors.textSecondary} style={styles.inputIcon} />
                                    <TextInput
                                        style={[styles.input, { color: colors.text }]}
                                        placeholder="Password"
                                        placeholderTextColor={colors.textSecondary}
                                        value={password}
                                        onChangeText={handlePasswordChange}
                                        secureTextEntry
                                        editable={!loading}
                                    />
                                </View>
                                {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}
                            </View>

                            <TouchableOpacity
                                style={[
                                    styles.signupButton,
                                    { backgroundColor: colors.primary },
                                    loading && styles.signupButtonDisabled
                                ]}
                                onPress={handleSignup}
                                disabled={loading}
                            >
                                {loading ? (
                                    <ActivityIndicator color="white" />
                                ) : (
                                    <View style={styles.signupContent}>
                                        <Text style={styles.signupButtonText}>Sign Up</Text>
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
                                <TouchableOpacity 
                                    style={[styles.socialButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', borderColor: colors.border }]}
                                    onPress={() => handleSocialLogin('Google')}
                                    activeOpacity={0.7}
                                >
                                    <Image source={{ uri: 'https://cdn-icons-png.flaticon.com/512/300/300221.png' }} style={styles.socialIconBase} />
                                </TouchableOpacity>
                                <TouchableOpacity 
                                    style={[styles.socialButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', borderColor: colors.border }]}
                                    onPress={() => handleSocialLogin('Apple')}
                                    activeOpacity={0.7}
                                >
                                    <Image source={{ uri: 'https://cdn-icons-png.flaticon.com/512/0/747.png' }} style={styles.socialIconBase} tintColor={isDark ? (isDesktop ? "#333" : "#fff") : "#333"} />
                                </TouchableOpacity>
                            </View>
                        </View>

                        <View style={styles.footer}>
                            <Text style={[styles.footerText, { color: colors.textSecondary }]}>Already have an account? </Text>
                            <TouchableOpacity onPress={() => router.push('/auth/login')}>
                                <Text style={[styles.loginText, { color: colors.primary }]}>Sign In</Text>
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
        borderRadius: 25,
        overflow: 'hidden',
    },
    logoImage: {
        width: 100,
        height: 100,
        borderRadius: 25,
    },
    title: {
        fontSize: 34,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    subtitle: {
        fontSize: 16,
        lineHeight: 24,
    },
    formContainer: {
        width: '100%',
        gap: 16,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 24,
        paddingHorizontal: 16,
        paddingVertical: 14,
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
    errorText: {
        color: '#FF3B30',
        fontSize: 13,
        marginTop: 6,
        marginLeft: 16,
        fontWeight: '500',
    },
    signupButton: {
        backgroundColor: Colors.light.primary,
        borderRadius: 30,
        paddingVertical: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 10,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
        elevation: 8,
    },
    signupButtonDisabled: {
        opacity: 0.6,
    },
    signupContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    signupButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    desktopContent: {
        flexDirection: 'row',
        paddingHorizontal: 0,
        maxWidth: 1000,
        height: 650,
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
    loginText: {
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
});
