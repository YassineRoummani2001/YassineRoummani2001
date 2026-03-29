import React from 'react';
import { View, StyleSheet, Platform, useWindowDimensions } from 'react-native';
import WebSidebar from './WebSidebar';
import { useThemeContext } from '@/context/ThemeContext';
import { usePathname } from 'expo-router';

export function WebLayout({ children }: { children: React.ReactNode }) {
    if (Platform.OS !== 'web') return <>{children}</>;

    const { width } = useWindowDimensions();
    const { colors, isDark } = useThemeContext();
    const pathname = usePathname();
    const isLargeScreen = width > 768;

    // Different screens need different widths on Web
    const isProfile = pathname.includes('/profile') || pathname.includes('/user/');
    const isMarketplace = pathname.includes('/marketplace');
    const contentMaxWidth = isProfile ? 935 : isMarketplace ? 1200 : 600;

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {isLargeScreen && <WebSidebar />}
            
            <View style={[
                styles.content, 
                isLargeScreen && { paddingLeft: 240 },
                !isLargeScreen && { paddingBottom: 60 } // For bottom tabs on mobile web
            ]}>
                <View style={[
                    styles.main,
                    isLargeScreen && { width: contentMaxWidth, alignSelf: 'center', maxWidth: '100%' }
                ]}>
                    {children}
                </View>

                {/* Optional Right Sidebar (Desktop only) */}
                {isLargeScreen && width > 1100 && !isProfile && !isMarketplace && (
                    <View style={[styles.rightSidebar, { borderLeftColor: isDark ? '#333' : '#eee' }]}>
                        {/* Suggestions, Trending, Fetch from components etc. */}
                    </View>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        minHeight: '100vh' as any,
    },
    content: {
        flex: 1,
        flexDirection: 'row',
    },
    main: {
        flex: 1,
        // minWidth: 600,
    },
    rightSidebar: {
        width: 350,
        height: '100%',
        position: 'fixed' as any,
        right: 0,
        top: 0,
        borderLeftWidth: 1,
        paddingHorizontal: 30,
        paddingVertical: 30,
        zIndex: 50,
    }
});
