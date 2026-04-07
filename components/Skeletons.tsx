import { useThemeContext } from '@/context/ThemeContext';
import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, StyleSheet, View, Platform, ScrollView } from 'react-native';

const { width } = Dimensions.get('window') || { width: 0 };
const GRID_ITEM_SIZE = width / 3 - 2;

const AnimatedView = ({ style }: { style: any }) => {
    const { isDark } = useThemeContext();
    const opacity = useRef(new Animated.Value(0.3)).current;

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(opacity, {
                    toValue: 0.7,
                    duration: 800,
                    useNativeDriver: true,
                }),
                Animated.timing(opacity, {
                    toValue: 0.3,
                    duration: 800,
                    useNativeDriver: true,
                }),
            ])
        ).start();
    }, []);

    const backgroundColor = isDark ? '#2C2C2E' : '#E1E9EE';

    return <Animated.View style={[style, { opacity, backgroundColor }]} />;
};

export function SkeletonStory() {
    return (
        <View style={styles.storyContainer}>
            <AnimatedView style={styles.storyAvatar} />
            <AnimatedView style={styles.storyName} />
        </View>
    );
}

export function SkeletonGridItem({ style }: { style?: any }) {
    return <AnimatedView style={[styles.gridItem, style]} />;
}

export function SkeletonRow() {
    const { isDark } = useThemeContext();
    return (
        <View style={[styles.rowContainer, { backgroundColor: isDark ? 'transparent' : '#fff' }]}>
            <AnimatedView style={styles.rowAvatar} />
            <View style={styles.rowTextContainer}>
                <AnimatedView style={styles.rowLineLong} />
                <AnimatedView style={styles.rowLineShort} />
            </View>
        </View>
    );
}

export function SkeletonFullscreen({ style }: { style?: any }) {
    return <AnimatedView style={[styles.fullscreen, style]} />;
}

export function SkeletonProfile() {
    const { isDark } = useThemeContext();
    const bgColor = isDark ? '#121212' : '#fff';
    return (
        <View style={[styles.profileContainer, { backgroundColor: bgColor }]}>
            <AnimatedView style={styles.profileCover} />
            <View style={styles.profileHeader}>
                <View style={[styles.profileAvatarBorder, { backgroundColor: bgColor }]}>
                    <AnimatedView style={styles.profileAvatar} />
                </View>
                <AnimatedView style={styles.profileName} />
                <AnimatedView style={styles.profileHandle} />
                <AnimatedView style={styles.profileBio} />

                <View style={styles.profileActions}>
                    <AnimatedView style={styles.profileButton} />
                    <AnimatedView style={styles.profileButton} />
                </View>

                <View style={styles.profileStats}>
                    <AnimatedView style={styles.profileStat} />
                    <AnimatedView style={styles.profileStat} />
                    <AnimatedView style={styles.profileStat} />
                </View>
            </View>
        </View>
    );
}

export function SkeletonPost() {
    const { isDark } = useThemeContext();
    const bgColor = isDark ? '#000000' : '#fff';
    return (
        <View style={[styles.postContainer, { backgroundColor: bgColor }]}>
            <View style={styles.postHeader}>
                <AnimatedView style={styles.postAvatar} />
                <View style={styles.postHeaderText}>
                    <AnimatedView style={styles.postTitle} />
                    <AnimatedView style={styles.postSubtitle} />
                </View>
            </View>
            <AnimatedView style={styles.postMedia} />
            <View style={styles.postFooter}>
                <View style={styles.postActionsSkeleton}>
                    <AnimatedView style={styles.postActionIcon} />
                    <AnimatedView style={styles.postActionIcon} />
                    <AnimatedView style={styles.postActionIcon} />
                </View>
                <AnimatedView style={styles.postCaptionLine} />
                <AnimatedView style={[styles.postCaptionLine, { width: '40%' }]} />
            </View>
        </View>
    );
}

export function SkeletonMarketItem() {
    const { isDark } = useThemeContext();
    const bgColor = isDark ? '#1C1C1E' : '#F9FAFB';
    return (
        <View style={[styles.itemCardSkeleton, { backgroundColor: bgColor }]}>
            <AnimatedView style={styles.itemImageSkeleton} />
            <View style={{ padding: 12, gap: 8 }}>
                <AnimatedView style={{ width: '80%', height: 16, borderRadius: 4 }} />
                <AnimatedView style={{ width: '40%', height: 18, borderRadius: 4 }} />
                <AnimatedView style={{ width: '60%', height: 12, borderRadius: 4 }} />
            </View>
        </View>
    );
}

export function SkeletonFilters() {
    return (
        <View style={styles.filtersContainer}>
            <AnimatedView style={styles.filterPillSkeleton} />
            <AnimatedView style={styles.filterPillSkeleton} />
            <AnimatedView style={[styles.filterPillSkeleton, { width: 80 }]} />
            <AnimatedView style={styles.filterPillSkeleton} />
        </View>
    );
}

export function SkeletonNotes() {
    const { colors } = useThemeContext();
    return (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.notesContainer}>
            {[1, 2, 3, 4, 5, 6].map(i => (
                <View key={i} style={styles.noteItemSkeleton}>
                    <View style={styles.noteAvatarWrapper}>
                        <AnimatedView style={styles.noteAvatar} />
                        <AnimatedView style={[styles.noteBubble, { borderColor: colors.background }]} />
                    </View>
                    <AnimatedView style={styles.noteName} />
                </View>
            ))}
        </ScrollView>
    );
}

export function SkeletonChat() {
    return (
        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
            <SkeletonNotes />
            <View style={{ marginTop: 16 }}>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(i => <SkeletonRow key={i} />)}
            </View>
        </ScrollView>
    );
}

export function SkeletonMessages() {
    const { isDark } = useThemeContext();
    return (
        <View style={{ flex: 1, padding: 16, gap: 16 }}>
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                <View key={i} style={{
                    alignSelf: i % 3 === 0 ? 'flex-end' : 'flex-start',
                    width: i % 2 === 0 ? '65%' : '45%',
                    height: i % 4 === 0 ? 100 : 45,
                    borderRadius: 20,
                    borderBottomRightRadius: i % 3 === 0 ? 4 : 20,
                    borderBottomLeftRadius: i % 3 === 0 ? 20 : 4,
                    overflow: 'hidden'
                }}>
                    <AnimatedView style={{ flex: 1 }} />
                </View>
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    // Story
    storyContainer: {
        alignItems: 'center',
        width: 68,
        marginRight: 16,
    },
    storyAvatar: {
        width: 60,
        height: 60,
        borderRadius: 30,
    },
    storyName: {
        width: 50,
        height: 10,
        borderRadius: 4,
        marginTop: 6,
    },
    // Grid
    gridItem: {
        width: GRID_ITEM_SIZE,
        height: GRID_ITEM_SIZE,
        marginBottom: 2,
        marginRight: 2,
    },
    // Row (Chat/Notification)
    rowContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
    },
    rowAvatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
    },
    rowTextContainer: {
        marginLeft: 12,
        flex: 1,
        gap: 6,
    },
    rowLineLong: {
        width: '60%',
        height: 14,
        borderRadius: 4,
    },
    rowLineShort: {
        width: '40%',
        height: 12,
        borderRadius: 4,
    },
    // Fullscreen
    fullscreen: {
        flex: 1,
        width: '100%',
        height: '100%',
    },
    // Profile Skeleton
    profileContainer: {
        flex: 1,
    },
    profileCover: {
        width: '100%',
        height: 200,
    },
    profileHeader: {
        alignItems: 'center',
        paddingHorizontal: 20,
        marginTop: -50,
    },
    profileAvatarBorder: {
        padding: 4,
        borderRadius: 60,
        marginBottom: 12,
    },
    profileAvatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
    },
    profileName: {
        width: 150,
        height: 24,
        borderRadius: 12,
        marginBottom: 8,
    },
    profileHandle: {
        width: 100,
        height: 14,
        borderRadius: 7,
        marginBottom: 20,
    },
    profileBio: {
        width: '80%',
        height: 40,
        borderRadius: 8,
        marginBottom: 24,
    },
    profileActions: {
        flexDirection: 'row',
        width: '100%',
        marginBottom: 24,
        gap: 12,
    },
    profileButton: {
        flex: 1,
        height: 45,
        borderRadius: 24,
    },
    profileStats: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        paddingHorizontal: 30,
    },
    profileStat: {
        width: 60,
        height: 40,
        borderRadius: 8,
    },
    // Post Skeleton
    postContainer: {
        marginBottom: 32,
        marginHorizontal: Platform.OS === 'web' ? 0 : 16,
        borderRadius: 28,
        padding: 16,
    },
    postHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
    },
    postAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
    },
    postHeaderText: {
        marginLeft: 12,
        flex: 1,
        gap: 6,
    },
    postTitle: {
        width: '40%',
        height: 14,
        borderRadius: 4,
    },
    postSubtitle: {
        width: '20%',
        height: 10,
        borderRadius: 4,
    },
    postMedia: {
        width: '100%',
        height: width,
    },
    postFooter: {
        padding: 12,
    },
    postActionsSkeleton: {
        flexDirection: 'row',
        gap: 16,
        marginBottom: 12,
    },
    postActionIcon: {
        width: 24,
        height: 24,
        borderRadius: 12,
    },
    postCaptionLine: {
        width: '80%',
        height: 12,
        borderRadius: 4,
        marginBottom: 6,
    },
    // Marketplace Skeleton
    itemCardSkeleton: {
        flex: 1,
        margin: 8,
        borderRadius: 20,
        overflow: 'hidden',
    },
    itemImageSkeleton: {
        width: '100%',
        height: 180,
    },
    // Filters
    filtersContainer: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        gap: 8,
        marginTop: 12,
        marginBottom: 16,
    },
    filterPillSkeleton: {
        width: 60,
        height: 36,
        borderRadius: 18,
    },
    // Notes
    notesContainer: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        gap: 16,
        paddingTop: 30,
        paddingBottom: 10,
    },
    noteItemSkeleton: {
        alignItems: 'center',
        width: 72,
    },
    noteAvatarWrapper: {
        width: 72,
        height: 72,
        alignItems: 'center',
        justifyContent: 'center',
    },
    noteAvatar: {
        width: 72,
        height: 72,
        borderRadius: 36,
    },
    noteBubble: {
        position: 'absolute',
        top: -20,
        width: 45,
        height: 28,
        borderRadius: 14,
        borderWidth: 2.5,
    },
    noteName: {
        width: 50,
        height: 10,
        borderRadius: 5,
        marginTop: 10,
    }
});
