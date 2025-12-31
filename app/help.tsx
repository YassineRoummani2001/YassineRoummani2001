import { useThemeContext } from '@/context/ThemeContext';
import { useRouter } from 'expo-router';
import { AlertCircle, ArrowLeft, Book, ChevronRight, MessageCircle } from 'lucide-react-native';
import React, { useMemo } from 'react';
import { Linking, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function HelpScreen() {
    const router = useRouter();
    const { colors } = useThemeContext();
    const insets = useSafeAreaInsets();
    const styles = useMemo(() => createStyles(colors), [colors]);

    const HelpItem = ({ icon: Icon, title, description, onPress }: any) => (
        <TouchableOpacity style={styles.itemContainer} onPress={onPress} activeOpacity={0.7}>
            <View style={styles.iconBox}>
                <Icon size={24} color={colors.primary} />
            </View>
            <View style={styles.textContainer}>
                <Text style={styles.itemTitle}>{title}</Text>
                <Text style={styles.itemDescription}>{description}</Text>
            </View>
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
                <Text style={styles.headerTitle}>Help Center</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>

                <View style={styles.banner}>
                    <Text style={[styles.bannerText, { color: colors.text }]}>How can we help you?</Text>
                    <Text style={styles.bannerSubText}>Choose a category below to find the help you need.</Text>
                </View>

                <View style={styles.listContainer}>
                    <HelpItem
                        icon={Book}
                        title="FAQ"
                        description="Find answers to common questions"
                        onPress={() => Linking.openURL('https://example.com/faq')}
                    />

                    <HelpItem
                        icon={MessageCircle}
                        title="Contact Support"
                        description="Chat with our support team"
                        onPress={() => Linking.openURL('mailto:support@example.com')}
                    />

                    <HelpItem
                        icon={AlertCircle}
                        title="Report a Problem"
                        description="Found a bug? Let us know."
                        onPress={() => Linking.openURL('mailto:bugs@example.com')}
                    />
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
    },
    banner: {
        marginBottom: 32,
        alignItems: 'center',
        marginTop: 10,
    },
    bannerText: {
        fontSize: 24,
        fontWeight: '800',
        marginBottom: 8,
        textAlign: 'center',
    },
    bannerSubText: {
        fontSize: 16,
        color: colors.textSecondary,
        textAlign: 'center',
        maxWidth: '80%',
    },
    listContainer: {
        gap: 16,
    },
    itemContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.gray,
        padding: 16,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: colors.border,
    },
    iconBox: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: colors.background,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    textContainer: {
        flex: 1,
    },
    itemTitle: {
        fontSize: 17,
        fontWeight: '700',
        color: colors.text,
        marginBottom: 4,
    },
    itemDescription: {
        fontSize: 14,
        color: colors.textSecondary,
    }
});
