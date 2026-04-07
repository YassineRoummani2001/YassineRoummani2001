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
    const isMarketplace = pathname.includes('/marketplace') || pathname.includes('/(tabs)/marketplace');
    const isChat = pathname.includes('/chat') || pathname.includes('/message/');
    const isSearch = pathname.includes('/search');
    const isNotifications = pathname.includes('/notifications');
    const isReels = pathname.includes('/reels');
    const isCreate = pathname.includes('/create');
    const isMarketplaceDetail = pathname.startsWith('/marketplace/') && pathname !== '/marketplace';
    const isHome = (pathname === '/' || pathname === '/(tabs)' || pathname === '/index') && !isCreate;
    const isStoryView = pathname.includes('/story-view');

    const showRightSidebar = isLargeScreen && width > 1200 && !isReels && !isMarketplaceDetail;
    const sidebarWidth = 280;
    const rightSidebarWidth = 350;

    // Calculate dynamic widths for web
    let feedMaxWidth: any = 650;
    if (isReels || isStoryView) feedMaxWidth = '100%'; 
    else if (isChat) feedMaxWidth = 850;
    else if (isMarketplaceDetail) feedMaxWidth = 1100;
    else if (isMarketplace) feedMaxWidth = 850;
    else if (isProfile) feedMaxWidth = 800; // So Profile fits with the Right Sidebar

    const totalContentWidth = typeof feedMaxWidth === 'number' 
        ? feedMaxWidth + (showRightSidebar ? rightSidebarWidth + 40 : 0)
        : '100%';

    return (
        <View style={[styles.container as any, { backgroundColor: colors.background }]}>
            {isLargeScreen && (
                <View style={[styles.sidebarArea as any, { width: sidebarWidth, backgroundColor: colors.background }]}>
                    <WebSidebar />
                </View>
            )}

            <View style={[
                styles.content as any,
                isLargeScreen && { marginLeft: sidebarWidth },
                !isLargeScreen && { paddingBottom: 60 },
            ]}>
                {/* Center the content horizontally within the available space */}
                <View style={[
                    styles.centerWrapper as any,
                    {
                        maxWidth: totalContentWidth,
                        paddingHorizontal: isLargeScreen ? 40 : 0,
                    },
                ]}>
                    <View style={[styles.main as any, { maxWidth: feedMaxWidth }]}>
                        {children}
                    </View>

                    {showRightSidebar && (
                        <View style={[styles.rightSidebar as any, { width: rightSidebarWidth, backgroundColor: colors.background }]}>
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
        height: Platform.OS === 'web' ? '100vh' as any : '100%',
        overflow: 'hidden',
        flexDirection: 'row',
    },
    sidebarArea: {
        position: 'fixed' as any,
        left: 0,
        top: 0,
        bottom: 0,
        zIndex: 100,
        borderRightWidth: 1,
        borderRightColor: '#eee',
    },
    content: {
        flex: 1,
        alignItems: 'center',
        paddingTop: 0,
        height: Platform.OS === 'web' ? '100vh' as any : '100%',
        overflowX: 'hidden' as any,
        overflowY: 'auto' as any,
    },
    centerWrapper: {
        flexDirection: 'row',
        width: '100%',
        justifyContent: 'center',
        height: 'auto',
        minHeight: '100%',
    },
    main: {
        flex: 1,
        width: '100%',
        backgroundColor: 'transparent',
        height: 'auto',
        minHeight: '100%',
    },
    rightSidebar: {
        marginLeft: 40,
        paddingTop: 20,
        flexShrink: 0,
        height: '100vh' as any,
        position: 'sticky' as any,
        top: 0,
        overflowY: 'auto' as any,
        overflowX: 'hidden' as any,
    },
});
