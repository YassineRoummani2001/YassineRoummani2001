// components/OfflineNotice.tsx
import NetInfo from '@react-native-community/netinfo';
import { WifiOff } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function OfflineNotice() {
    const [isConnected, setIsConnected] = useState(true);
    const insets = useSafeAreaInsets();
    const slideAnim = useRef(new Animated.Value(-100)).current;

    useEffect(() => {
        const unsubscribe = NetInfo.addEventListener((state) => {
            // Only consider offline if isConnected is false AND reachable is false/null to avoid false positives
            const online = state.isConnected !== false;
            setIsConnected(online);
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        Animated.timing(slideAnim, {
            toValue: isConnected ? -100 : 0,
            duration: 300,
            useNativeDriver: true,
        }).start();
    }, [isConnected]);

    if (isConnected) return null;

    return (
        <Animated.View style={[styles.container, { paddingTop: insets.top, transform: [{ translateY: slideAnim }] }]}>
            <View style={styles.content}>
                <WifiOff size={16} color="#fff" />
                <Text style={styles.text}>No internet connection</Text>
            </View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        backgroundColor: '#EF4444',
        zIndex: 9999,
        elevation: 10,
        paddingBottom: 8,
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingHorizontal: 16,
    },
    text: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 14,
    },
});
