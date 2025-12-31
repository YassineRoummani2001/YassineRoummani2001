import { Colors } from '@/constants/Colors';
import React, { ComponentType, lazy, Suspense } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

/**
 * Loading fallback component for lazy-loaded components
 */
export const LoadingFallback = ({ size = 'large' }: { size?: 'small' | 'large' }) => (
    <View style={styles.loadingContainer}>
        <ActivityIndicator size={size} color={Colors.primary} />
    </View>
);

/**
 * Wrapper for lazy loading components with Suspense
 * @param importFunc - Dynamic import function
 * @param fallback - Optional custom fallback component
 */
export function lazyLoad<T extends ComponentType<any>>(
    importFunc: () => Promise<{ default: T }>,
    fallback?: React.ReactNode
) {
    const LazyComponent = lazy(importFunc);

    return (props: React.ComponentProps<T>) => (
        <Suspense fallback={fallback || <LoadingFallback />}>
            <LazyComponent {...props} />
        </Suspense>
    );
}

/**
 * Minimal loading fallback for inline components
 */
export const MinimalLoader = () => (
    <View style={styles.minimalLoader}>
        <ActivityIndicator size="small" color={Colors.primary} />
    </View>
);

/**
 * Full screen loading fallback for screens
 */
export const ScreenLoader = () => (
    <View style={styles.screenLoader}>
        <ActivityIndicator size="large" color={Colors.primary} />
    </View>
);

const styles = StyleSheet.create({
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: 100,
    },
    minimalLoader: {
        padding: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    screenLoader: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: Colors.white,
    },
});
