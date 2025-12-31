import React from 'react';
import { StyleSheet, View } from 'react-native';

interface OnlineIndicatorProps {
    isOnline?: boolean;
    size?: number;
    style?: any;
}

export default function OnlineIndicator({ isOnline = false, size = 12, style }: OnlineIndicatorProps) {
    return (
        <View
            style={[
                styles.indicator,
                {
                    width: size,
                    height: size,
                    borderRadius: size / 2,
                    backgroundColor: isOnline ? '#10B981' : '#9CA3AF'
                },
                style
            ]}
        />
    );
}

const styles = StyleSheet.create({
    indicator: {
        borderWidth: 2,
        borderColor: '#FFFFFF',
    }
});
