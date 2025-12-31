import { useTheme } from '@/hooks/useTheme';
import { Search as SearchIcon, TrendingUp } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const TRENDING_TOPICS = [
    'Photography', 'Travel 2024', 'Minimal Design', 'React Native',
    'Cinematic Reels', 'Architecture', 'Nature', 'Tech News'
];

export default function SearchScreen() {
    const [refreshing, setRefreshing] = useState(false);
    const colors = useTheme();
    const insets = useSafeAreaInsets();
    const styles = useMemo(() => createStyles(colors, insets), [colors, insets]);

    const onRefresh = () => {
        setRefreshing(true);
        // Simulate refresh
        setTimeout(() => setRefreshing(false), 1000);
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Search</Text>
            </View>

            <View style={styles.searchContainer}>
                <View style={styles.searchBar}>
                    <SearchIcon size={20} color={colors.textSecondary} />
                    <TextInput
                        placeholder="Search for ideas..."
                        placeholderTextColor={colors.textSecondary}
                        style={styles.input}
                    />
                </View>
            </View>

            <ScrollView
                contentContainerStyle={styles.content}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={[colors.primary]}
                        tintColor={colors.primary}
                    />
                }
            >
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <TrendingUp size={20} color={colors.primary} />
                        <Text style={styles.sectionTitle}>Trending Now</Text>
                    </View>
                    <View style={styles.tagsContainer}>
                        {TRENDING_TOPICS.map((topic, index) => (
                            <TouchableOpacity key={index} style={styles.tag}>
                                <Text style={styles.tagText}>#{topic}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Placeholder for results */}
                <View style={[styles.section, { marginTop: 24 }]}>
                    <Text style={styles.sectionTitle}>Recent Searches</Text>
                    <Text style={{ color: '#999', marginTop: 8 }}>No recent searches</Text>
                </View>
            </ScrollView>
        </View>
    );
}

const createStyles = (colors: any, insets: any) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
        paddingTop: insets.top,
    },
    header: {
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: '900',
        color: colors.text,
        letterSpacing: -0.5,
    },
    searchContainer: {
        paddingHorizontal: 16,
        marginBottom: 8,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.gray,
        borderRadius: 16,
        paddingHorizontal: 16,
        height: 50,
        gap: 12,
        borderWidth: 1,
        borderColor: colors.border,
    },
    input: {
        flex: 1,
        fontSize: 16,
        color: colors.text,
        height: '100%',
    },
    content: {
        padding: 16,
    },
    section: {
        gap: 12,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.text,
    },
    tagsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    tag: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        backgroundColor: colors.gray,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
    },
    tagText: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.textSecondary,
    }
});
