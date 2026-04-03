import React, { useEffect, useRef, useState } from 'react';
import {
    Animated,
    PanResponder,
    StyleSheet,
    Text,
    View,
    useWindowDimensions,
} from 'react-native';

interface VideoProgressBarProps {
    currentTime: number;
    duration: number;
    onSeek: (time: number) => void;
    bottomOffset?: number;
    showTime?: boolean;
}

export default function VideoProgressBar({
    currentTime,
    duration,
    onSeek,
    bottomOffset = 0,
    showTime = false,
}: VideoProgressBarProps) {
    const { width: screenWidth } = useWindowDimensions();
    const [isScrubbing, setIsScrubbing] = useState(false);
    const [displayProgress, setDisplayProgress] = useState(0);

    const heightAnim = useRef(new Animated.Value(2)).current;
    const internalProgress = useRef(0);

    useEffect(() => {
        if (!isScrubbing && duration > 0) {
            const progress = currentTime / duration;
            setDisplayProgress(progress);
            internalProgress.current = progress;
        }
    }, [currentTime, duration, isScrubbing]);

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onPanResponderGrant: (evt) => {
                setIsScrubbing(true);
                Animated.spring(heightAnim, {
                    toValue: 4,
                    useNativeDriver: false,
                }).start();
                updateProgress(evt.nativeEvent.pageX);
            },
            onPanResponderMove: (evt) => {
                updateProgress(evt.nativeEvent.pageX);
            },
            onPanResponderRelease: (evt) => {
                setIsScrubbing(false);
                Animated.spring(heightAnim, {
                    toValue: 2,
                    useNativeDriver: false,
                }).start();
                const progress = Math.min(Math.max(0, evt.nativeEvent.pageX / screenWidth), 1);
                onSeek(progress * duration);
            },
        })
    ).current;

    const updateProgress = (pageX: number) => {
        const progress = Math.min(Math.max(0, pageX / screenWidth), 1);
        setDisplayProgress(progress);
        internalProgress.current = progress;
    };

    const formatTime = (millis: number) => {
        const totalSeconds = Math.floor(millis / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    };

    return (
        <View style={[styles.container, { bottom: bottomOffset }]}>
            {/* Conditional Time Display (Pill style) */}
            {showTime && (
                <View style={styles.timeWrapper}>
                    <View style={styles.timePill}>
                        <Text style={styles.timeText}>
                            {formatTime(isScrubbing ? internalProgress.current * duration : currentTime)} 
                            <Text style={{ opacity: 0.5, fontWeight: '400' }}> / {formatTime(duration)}</Text>
                        </Text>
                    </View>
                </View>
            )}

            {/* Progress Bar */}
            <View style={styles.touchArea} {...panResponder.panHandlers}>
                <View style={styles.trackBackground} />
                <Animated.View
                    style={[
                        styles.trackFill,
                        {
                            width: `${displayProgress * 100}%`,
                            height: heightAnim,
                        },
                    ]}
                />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        left: 0,
        right: 0,
        zIndex: 50,
        paddingHorizontal: 20,
    },
    timeWrapper: {
        alignItems: 'center',
        marginBottom: 8,
    },
    timePill: {
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.15)',
    },
    timeText: {
        color: 'white',
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 0.5,
        textAlign: 'center',
    },
    touchArea: {
        height: 16,
        justifyContent: 'center',
        width: '100%',
    },
    trackBackground: {
        position: 'absolute',
        left: 0,
        right: 0,
        height: 1.5,
        backgroundColor: 'rgba(255, 255, 255, 0.25)',
        borderRadius: 1,
    },
    trackFill: {
        position: 'absolute',
        left: 0,
        backgroundColor: '#fff',
        borderRadius: 2,
        shadowColor: '#fff',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 4,
        elevation: 2,
    },
});
