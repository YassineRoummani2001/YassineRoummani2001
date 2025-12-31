import { Colors } from '@/constants/Colors';
import { API_BASE_URL } from '@/constants/Config';
import { useThemeContext } from '@/context/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ArrowRight, Lock, Mail, User } from 'lucide-react-native';
import { useState } from 'react';
import { Dimensions, Image, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

const { width } = Dimensions.get('window');

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SignupScreen() {
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
            const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: name.trim(),
                    email: email.toLowerCase().trim(),
                    password
                }),
            });

            const data = await response.json();

            if (response.ok) {
                // Success! In a real app, save token to AsyncStorage here
                console.log('User registered:', data);
                Toast.show({
                    type: 'success',
                    text1: 'Account Created! 🎉',
                    text2: 'Welcome to Vibe! Please login.',
                });
                router.replace('/auth/login');
            } else {
                // Handle specific error cases
                if (response.status === 409) {
                    // Duplicate email (Conflict)
                    if (data.field === 'email') {
                        setEmailError('This email is already in use');
                        Toast.show({
                            type: 'error',
                            text1: 'Email Already Registered',
                            text2: 'This email is already in use. Try logging in instead.',
                        });
                    }
                } else if (response.status === 400) {
                    // Validation error
                    if (data.field === 'email') {
                        setEmailError(data.message);
                    } else if (data.field === 'password') {
                        setPasswordError(data.message);
                    } else if (data.field === 'name') {
                        setNameError(data.message);
                    }

                    Toast.show({
                        type: 'error',
                        text1: 'Validation Error',
                        text2: data.message || 'Please check your input',
                    });
                } else {
                    // Generic error
                    Toast.show({
                        type: 'error',
                        text1: 'Signup Failed',
                        text2: data.message || 'Could not create account',
                    });
                }
            }
        } catch (error) {
            console.error('Signup error:', error);
            Toast.show({
                type: 'error',
                text1: 'Network Error',
                text2: 'Please check your connection and try again.',
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
            <StatusBar style={isDark ? "light" : "dark"} />
            <LinearGradient
                colors={isDark ? ['#000000', '#1A1A1A', '#3700B3'] : ['#E3F2FD', '#E1BEE7', '#FFFFFF']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.background}
            />

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardView}
            >
                <View style={styles.contentContainer}>
                    <View style={styles.headerContainer}>
                        <View style={[styles.logoContainer, { boxShadow: isDark ? `0px 8px 20px ${Colors.light.primary}60` : `0px 8px 20px ${Colors.light.primary}30` }]}>
                            <Image
                                source={require('@/assets/images/vibe-logo.png')}
                                style={styles.logoImage}
                            />
                        </View>
                        <Text style={[styles.title, { color: isDark ? '#fff' : '#333' }]}>Create Account</Text>
                        <Text style={[styles.subtitle, { color: isDark ? '#ccc' : '#666' }]}>Join Vibe and start sharing your moments.</Text>
                    </View>

                    <View style={styles.formContainer}>
                        {/* Name Input */}
                        <View>
                            <View style={[
                                styles.inputContainer,
                                {
                                    backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                                    borderColor: nameError
                                        ? '#FF3B30'
                                        : isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                                    borderWidth: nameError ? 2 : 1
                                }
                            ]}>
                                <User size={20} color={nameError ? '#FF3B30' : isDark ? "#ccc" : "#666"} style={styles.inputIcon} />
                                <TextInput
                                    style={[styles.input, { color: isDark ? '#fff' : '#333' }]}
                                    placeholder="Full Name"
                                    placeholderTextColor={isDark ? "#aaa" : "#888"}
                                    value={name}
                                    onChangeText={handleNameChange}
                                    editable={!loading}
                                />
                            </View>
                            {nameError ? (
                                <Text style={styles.errorText}>{nameError}</Text>
                            ) : null}
                        </View>

                        {/* Email Input */}
                        <View>
                            <View style={[
                                styles.inputContainer,
                                {
                                    backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                                    borderColor: emailError
                                        ? '#FF3B30'
                                        : isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                                    borderWidth: emailError ? 2 : 1
                                }
                            ]}>
                                <Mail size={20} color={emailError ? '#FF3B30' : isDark ? "#ccc" : "#666"} style={styles.inputIcon} />
                                <TextInput
                                    style={[styles.input, { color: isDark ? '#fff' : '#333' }]}
                                    placeholder="Email"
                                    placeholderTextColor={isDark ? "#aaa" : "#888"}
                                    value={email}
                                    onChangeText={handleEmailChange}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    editable={!loading}
                                />
                            </View>
                            {emailError ? (
                                <Text style={styles.errorText}>{emailError}</Text>
                            ) : null}
                        </View>

                        {/* Password Input */}
                        <View>
                            <View style={[
                                styles.inputContainer,
                                {
                                    backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                                    borderColor: passwordError
                                        ? '#FF3B30'
                                        : isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                                    borderWidth: passwordError ? 2 : 1
                                }
                            ]}>
                                <Lock size={20} color={passwordError ? '#FF3B30' : isDark ? "#ccc" : "#666"} style={styles.inputIcon} />
                                <TextInput
                                    style={[styles.input, { color: isDark ? '#fff' : '#333' }]}
                                    placeholder="Password"
                                    placeholderTextColor={isDark ? "#aaa" : "#888"}
                                    value={password}
                                    onChangeText={handlePasswordChange}
                                    secureTextEntry
                                    editable={!loading}
                                />
                            </View>
                            {passwordError ? (
                                <Text style={styles.errorText}>{passwordError}</Text>
                            ) : null}
                        </View>

                        <TouchableOpacity
                            style={[
                                styles.signupButton,
                                loading && styles.signupButtonDisabled
                            ]}
                            onPress={handleSignup}
                            disabled={loading}
                            activeOpacity={loading ? 1 : 0.7}
                        >
                            {loading ? (
                                <Text style={styles.signupButtonText}>Creating account...</Text>
                            ) : (
                                <View style={styles.signupContent}>
                                    <Text style={styles.signupButtonText}>Sign Up</Text>
                                    <ArrowRight size={20} color="white" />
                                </View>
                            )}
                        </TouchableOpacity>
                    </View>

                    <View style={styles.footer}>
                        <Text style={[styles.footerText, { color: isDark ? '#ccc' : '#666' }]}>Already have an account? </Text>
                        <TouchableOpacity onPress={() => router.push('/auth/login')}>
                            <Text style={styles.loginText}>Sign In</Text>
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
        borderRadius: 16,
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
        borderRadius: 16,
        paddingVertical: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 10,
        boxShadow: `0px 4px 8px ${Colors.light.primary}4D`,
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
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 40,
    },
    footerText: {
        fontSize: 15,
    },
    loginText: {
        color: Colors.light.primary,
        fontSize: 15,
        fontWeight: 'bold',
    },
});
