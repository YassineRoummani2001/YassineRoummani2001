import React from 'react';
import { View, StyleSheet, Platform, useWindowDimensions } from 'react-native';
import WebSidebar from './WebSidebar';
import { useThemeContext } from '@/context/ThemeContext';
import { usePathname } from 'expo-router';
import DesktopRightSidebar from './DesktopRightSidebar';

export function WebLayout({ children }: { children: React.ReactNode }) {
    if (Platform.OS !== 'web') return <>{children}</>;

    const { width } = useWindowDimensions();
    const { colors, isDark } = useThemeContext();
    const pathname = usePathname();
    const isLargeScreen = width > 768;

    const isAuthPage = pathname.includes('/auth/');
    if (isAuthPage) return <>{children}</>;

    const isProfile = pathname.includes('/profile') || pathname.includes('/user/');
    const isMarketplace = pathname.includes('/marketplace');
    const isHome = pathname === '/' || pathname === '/(tabs)';

    const showRightSidebar = isLargeScreen && width > 1100 && !isProfile && !isMarketplace;
    const sidebarWidth = 260;

    // Calculate the available width after sidebar
    const availableWidth = isLargeScreen ? width - sidebarWidth : width;
    
    // Main content width: feed is 630px max, right sidebar is 320px + 40px gap
    const feedMaxWidth = 630;
    const rightSidebarWidth = showRightSidebar ? 340 : 0;
    const totalContentWidth = feedMaxWidth + rightSidebarWidth;

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {isLargeScreen && <WebSidebar />}

            <View style={[
                styles.content,
                isLargeScreen && { marginLeft: sidebarWidth },
                !isLargeScreen && { paddingBottom: 60 },
            ]}>
                {/* Center the content horizontally within the available space */}
                <View style={[
                    styles.centerWrapper,
                    {
                        maxWidth: totalContentWidth,
                        paddingHorizontal: 20,
                    },
                ]}>
                    <View style={[styles.main, { maxWidth: feedMaxWidth }]}>
                        {children}
                    </View>

                    {showRightSidebar && (
                        <View style={styles.rightSidebar}>
                            <DesktopRightSidebar />
                        </View>
                    )}
                </View>
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
        alignItems: 'center',
    },
    centerWrapper: {
        flexDirection: 'row',
        width: '100%',
        justifyContent: 'center',
    },
    main: {
        flex: 1,
        width: '100%',
    },
    rightSidebar: {
        width: 320,
        marginLeft: 24,
        marginTop: 16,
        flexShrink: 0,
    },
});
