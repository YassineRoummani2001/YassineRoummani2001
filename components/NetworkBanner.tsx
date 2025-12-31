import { useNetwork } from '@/context/NetworkContext';
import { AlertTriangle, WifiOff } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Animated, Platform, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const NetworkBanner = () => {
    const { isConnected, isInternetReachable, isWeakConnection } = useNetwork();
    const insets = useSafeAreaInsets();
    const [visible, setVisible] = useState(false);
    const [animation] = useState(new Animated.Value(-100)); // Start off-screen

    // Determine message and color
    const isOffline = isConnected === false || isInternetReachable === false;
    const showWeak = isWeakConnection && !isOffline;

    useEffect(() => {
        if (isOffline || showWeak) {
            setVisible(true);
            Animated.spring(animation, {
                toValue: 0,
                useNativeDriver: true,
                tension: 20,
                friction: 7,
            }).start();
        } else {
            // Hide with delay when restored
            setTimeout(() => {
                Animated.timing(animation, {
                    toValue: -100,
                    duration: 300,
                    useNativeDriver: true,
                }).start(() => setVisible(false));
            }, 2000); // Keep "Back online" for 2 seconds if wanted, or just hide
        }
    }, [isOffline, showWeak]);

    if (!visible && isConnected && isInternetReachable) return null;

    const getBannerContent = () => {
        if (isOffline) {
            return {
                text: 'No Internet Connection',
                color: '#FF3B30',
                icon: <WifiOff size={16} color="white" />,
            };
        }
        if (showWeak) {
            return {
                text: 'Connection unstable. Reconnecting...',
                color: '#FFCC00',
                icon: <AlertTriangle size={16} color="black" />,
            };
        }
        return {
            text: 'Back Online',
            color: '#4CD964',
            icon: null,
        };
    };

    const content = getBannerContent();

    return (
        <Animated.View
            style={[
                styles.container,
                {
                    backgroundColor: content.color,
                    paddingTop: Platform.OS === 'ios' ? insets.top : 10,
                    transform: [{ translateY: animation }]
                }
            ]}
        >
            <View style={styles.content}>
                {content.icon}
                <Text style={[styles.text, { color: content.color === '#FFCC00' ? 'black' : 'white' }]}>
                    {content.text}
                </Text>
            </View>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        paddingBottom: 8,
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0px 2px 4px rgba(0,0,0,0.1)',
        elevation: 5,
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    text: {
        fontSize: 13,
        fontWeight: '600',
    },
});
