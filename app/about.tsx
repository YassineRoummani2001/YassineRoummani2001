import { useThemeContext } from '@/context/ThemeContext';
import { useRouter } from 'expo-router';
import { ArrowLeft, ChevronRight } from 'lucide-react-native';
import React, { useMemo } from 'react';
import { Linking, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function AboutScreen() {
    const router = useRouter();
    const { colors } = useThemeContext();
    const insets = useSafeAreaInsets();
    const styles = useMemo(() => createStyles(colors), [colors]);

    const AboutLink = ({ title, onPress }: any) => (
        <TouchableOpacity style={styles.linkItem} onPress={onPress}>
            <Text style={styles.linkText}>{title}</Text>
            <ChevronRight size={20} color={colors.textSecondary} />
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
                <Text style={styles.headerTitle}>About Vibe</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.logoSection}>
                    <View style={styles.logoBox}>
                        <Text style={styles.logoText}>V</Text>
                    </View>
                    <Text style={styles.appName}>Vibe</Text>
                    <Text style={styles.version}>Version 1.0.0 (Build 42)</Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionHeader}>Legal</Text>
                    <View style={styles.linkGroup}>
                        <AboutLink title="Terms of Service" onPress={() => Linking.openURL('https://example.com/terms')} />
                        <View style={styles.separator} />
                        <AboutLink title="Privacy Policy" onPress={() => Linking.openURL('https://example.com/privacy')} />
                        <View style={styles.separator} />
                        <AboutLink title="Open Source Licenses" onPress={() => Linking.openURL('https://github.com')} />
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionHeader}>Community</Text>
                    <View style={styles.linkGroup}>
                        <AboutLink title="Join Discord Server" onPress={() => Linking.openURL('https://discord.com')} />
                        <View style={styles.separator} />
                        <AboutLink title="Follow us on Twitter" onPress={() => Linking.openURL('https://twitter.com')} />
                    </View>
                </View>

                <View style={styles.footer}>
                    <Text style={styles.footerText}>© 2024 Vibe Inc.</Text>
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
    logoSection: {
        alignItems: 'center',
        marginBottom: 40,
        marginTop: 20,
    },
    logoBox: {
        width: 80,
        height: 80,
        borderRadius: 20,
        backgroundColor: colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    logoText: {
        fontSize: 40,
        fontWeight: '900',
        color: 'white',
    },
    appName: {
        fontSize: 28,
        fontWeight: '800',
        color: colors.text,
        marginBottom: 4,
        letterSpacing: -0.5,
    },
    version: {
        fontSize: 14,
        color: colors.textSecondary,
    },
    section: {
        marginBottom: 32,
    },
    sectionHeader: {
        fontSize: 13,
        fontWeight: '700',
        color: colors.textSecondary,
        marginBottom: 12,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginLeft: 4,
    },
    linkGroup: {
        backgroundColor: colors.gray,
        borderRadius: 16,
        overflow: 'hidden',
    },
    linkItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 16,
        paddingHorizontal: 16,
    },
    linkText: {
        fontSize: 16,
        fontWeight: '500',
        color: colors.text,
    },
    separator: {
        height: 1,
        backgroundColor: colors.border,
        marginLeft: 16,
    },
    footer: {
        alignItems: 'center',
        marginTop: 10,
    },
    footerText: {
        color: colors.textSecondary,
        fontSize: 13,
    }
});
