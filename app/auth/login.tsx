import { Colors } from '@/constants/Colors';
import { useUser } from '@/context/AuthContext';
import { useThemeContext } from '@/context/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ArrowRight, Eye, EyeOff, Lock, Mail } from 'lucide-react-native';
import { useState } from 'react';
import { Dimensions, Image, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

import { ApiClient } from '@/utils/api'; // Import ApiClient
import ErrorHandler from '@/utils/ErrorHandler'; // Import ErrorHandler

const { width } = Dimensions.get('window');

export default function LoginScreen() {
    const router = useRouter();
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
                text1: 'Missing Fields',
                text2: 'Please fill in all fields',
            });
            return;
        }

        setLoading(true);
        try {
            const response = await ApiClient.post<any>('/api/auth/login', { email, password });

            if (response.success) {
                // Success! User authentication verified
                console.log('Login success:', response.data);

                // Save user to context
                await login(response.data);

                Toast.show({
                    type: 'success',
                    text1: 'Welcome back!',
                    text2: 'Login successful',
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

    return (
        <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
            <StatusBar style={isDark ? "light" : "dark"} />
            <LinearGradient
                colors={isDark ? ['#6200EE', '#3700B3', '#000000'] : ['#E3F2FD', '#E1BEE7', '#FFFFFF']}
                style={styles.background}
            />

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardView}
            >
                <View style={styles.contentContainer}>
                    <View style={styles.headerContainer}>
                        <View style={[styles.logoContainer, { boxShadow: isDark ? `0px 8px 20px ${colors.primary}60` : `0px 8px 20px ${colors.primary}30` }]}>
                            <Image
                                source={require('@/assets/images/vibe-logo.png')}
                                style={styles.logoImage}
                            />
                        </View>
                        <Text style={[styles.appName, { color: isDark ? '#fff' : '#333' }]}>Vibe</Text>
                        <Text style={[styles.tagline, { color: isDark ? '#ccc' : '#666' }]}>Welcome back! You've been missed.</Text>
                    </View>

                    <View style={styles.formContainer}>
                        <View style={[styles.inputContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]}>
                            <Mail size={20} color={isDark ? "#ccc" : "#666"} style={styles.inputIcon} />
                            <TextInput
                                style={[styles.input, { color: isDark ? '#fff' : '#333' }]}
                                placeholder="Email"
                                placeholderTextColor={isDark ? "#aaa" : "#888"}
                                value={email}
                                onChangeText={setEmail}
                                keyboardType="email-address"
                                autoCapitalize="none"
                            />
                        </View>

                        <View style={[styles.inputContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]}>
                            <Lock size={20} color={isDark ? "#ccc" : "#666"} style={styles.inputIcon} />
                            <TextInput
                                style={[styles.input, { color: isDark ? '#fff' : '#333' }]}
                                placeholder="Password"
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
                            <Text style={[styles.forgotPasswordText, { color: isDark ? '#ccc' : '#666' }]}>Forgot Password?</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.loginButton} onPress={handleLogin} disabled={loading}>
                            {loading ? (
                                <Text style={styles.loginButtonText}>Logging in...</Text>
                            ) : (
                                <View style={styles.loginContent}>
                                    <Text style={styles.loginButtonText}>Sign In</Text>
                                    <ArrowRight size={20} color="white" />
                                </View>
                            )}
                        </TouchableOpacity>

                        <View style={styles.dividerContainer}>
                            <View style={[styles.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)' }]} />
                            <Text style={[styles.dividerText, { color: isDark ? '#aaa' : '#888' }]}>OR</Text>
                            <View style={[styles.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)' }]} />
                        </View>

                        <View style={styles.socialRow}>
                            <TouchableOpacity style={[styles.socialButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]}>
                                <Image source={{ uri: 'https://cdn-icons-png.flaticon.com/512/300/300221.png' }} style={styles.socialIconBase} tintColor={isDark ? "#fff" : "#333"} />
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.socialButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]}>
                                <Image source={{ uri: 'https://cdn-icons-png.flaticon.com/512/0/747.png' }} style={styles.socialIconBase} tintColor={isDark ? "#fff" : "#333"} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={styles.footer}>
                        <Text style={[styles.footerText, { color: isDark ? '#ccc' : '#666' }]}>Don't have an account? </Text>
                        <TouchableOpacity onPress={() => router.push('/auth/signup')}>
                            <Text style={styles.signupText}>Sign Up</Text>
                        </TouchableOpacity>
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
        borderRadius: 16,
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
        borderRadius: 16,
        paddingVertical: 16,
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: `0px 4px 8px ${Colors.light.primary}4D`,
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
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 40,
    },
    footerText: {
        fontSize: 15,
    },
    signupText: {
        color: Colors.light.primary,
        fontSize: 15,
        fontWeight: 'bold',
    },
});
