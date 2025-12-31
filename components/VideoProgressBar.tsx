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
}

export default function VideoProgressBar({
    currentTime,
    duration,
    onSeek,
}: VideoProgressBarProps) {
    const { width: screenWidth } = useWindowDimensions();
    const [isScrubbing, setIsScrubbing] = useState(false);
    const [displayProgress, setDisplayProgress] = useState(0);

    // Animation for bar expansion
    const heightAnim = useRef(new Animated.Value(2)).current;
    const internalProgress = useRef(0);

    // Update progress when not scrubbing
    useEffect(() => {
        if (!isScrubbing && duration > 0) {
            const progress = currentTime / duration;
            setDisplayProgress(progress);
            internalProgress.current = progress;
        }
    }, [currentTime, duration, isScrubbing]);

    // Pan responder for seeking
    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onPanResponderGrant: (evt) => {
                setIsScrubbing(true);

                // Expand bar
                Animated.spring(heightAnim, {
                    toValue: 4,
                    useNativeDriver: false,
                }).start();

                // Calculate initial position
                const locationX = evt.nativeEvent.pageX;
                updateProgress(locationX);
            },
            onPanResponderMove: (evt) => {
                const locationX = evt.nativeEvent.pageX;
                updateProgress(locationX);
            },
            onPanResponderRelease: (evt) => {
                setIsScrubbing(false);

                // Shrink bar
                Animated.spring(heightAnim, {
                    toValue: 2,
                    useNativeDriver: false,
                }).start();

                // Perform seek
                const progress = Math.min(Math.max(0, evt.nativeEvent.pageX / screenWidth), 1);
                const seekTime = progress * duration;
                onSeek(seekTime);
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
        <View style={styles.container}>
            {/* Time Tooltip (visible when scrubbing) */}
            {isScrubbing && (
                <View style={styles.timeTooltip}>
                    <Text style={styles.timeText}>
                        {formatTime(internalProgress.current * duration)} / {formatTime(duration)}
                    </Text>
                </View>
            )}

            {/* Progress Bar */}
            <View style={styles.touchArea} {...panResponder.panHandlers}>
                {/* Background Track */}
                <View style={styles.trackBackground} />

                {/* Filled Track */}
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
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 5,
    },
    touchArea: {
        height: 20,
        justifyContent: 'flex-end',
        width: '100%',
    },
    trackBackground: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 2,
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
    },
    trackFill: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        backgroundColor: 'white',
    },
    timeTooltip: {
        position: 'absolute',
        bottom: 30,
        alignSelf: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 6,
    },
    timeText: {
        color: 'white',
        fontSize: 12,
        fontWeight: '600',
    },
});
