import { Colors, Layout } from '@/constants/Colors';
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

const SkeletonItem = ({ style }: { style: any }) => {
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

export default function SkeletonPost() {
    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={styles.userInfo}>
                    <SkeletonItem style={styles.avatar} />
                    <View style={styles.textContainer}>
                        <SkeletonItem style={styles.username} />
                        <SkeletonItem style={styles.time} />
                    </View>
                </View>
                <SkeletonItem style={styles.moreIcon} />
            </View>

            <SkeletonItem style={styles.media} />

            <View style={styles.actions}>
                <View style={styles.leftActions}>
                    <SkeletonItem style={styles.actionButton} />
                    <SkeletonItem style={styles.actionButton} />
                </View>
                <SkeletonItem style={styles.actionButton} />
            </View>

            <View style={styles.textLines}>
                <SkeletonItem style={styles.textLineLong} />
                <SkeletonItem style={styles.textLineShort} />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: Colors.white,
        marginHorizontal: 16,
        marginBottom: 24,
        borderRadius: Layout.borderRadius,
        padding: 16,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 10,
        elevation: 3,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
    },
    textContainer: {
        gap: 6,
    },
    username: {
        width: 120,
        height: 14,
        borderRadius: 4,
    },
    time: {
        width: 60,
        height: 10,
        borderRadius: 4,
    },
    moreIcon: {
        width: 20,
        height: 20,
        borderRadius: 10,
    },
    media: {
        width: '100%',
        height: 300,
        borderRadius: 12,
        marginBottom: 12,
    },
    actions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    leftActions: {
        flexDirection: 'row',
        gap: 16,
    },
    actionButton: {
        width: 24,
        height: 24,
        borderRadius: 12,
    },
    textLines: {
        gap: 8,
    },
    textLineLong: {
        width: '90%',
        height: 12,
        borderRadius: 4,
    },
    textLineShort: {
        width: '60%',
        height: 12,
        borderRadius: 4,
    },
});
