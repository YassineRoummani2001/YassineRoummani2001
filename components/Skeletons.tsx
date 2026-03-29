import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, StyleSheet, View } from 'react-native';

const { width } = Dimensions.get('window');
const GRID_ITEM_SIZE = width / 3 - 2;

const AnimatedView = ({ style }: { style: any }) => {
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

    return <Animated.View style={[style, { opacity, backgroundColor: '#E1E9EE' }]} />;
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
    return (
        <View style={styles.rowContainer}>
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
        backgroundColor: '#fff',
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
        backgroundColor: '#fff',
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
        borderRadius: 12,
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
        marginBottom: 20,
        backgroundColor: '#fff',
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
});

export function SkeletonProfile() {
    return (
        <View style={styles.profileContainer}>
            <AnimatedView style={styles.profileCover} />
            <View style={styles.profileHeader}>
                <View style={styles.profileAvatarBorder}>
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
    return (
        <View style={styles.postContainer}>
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
