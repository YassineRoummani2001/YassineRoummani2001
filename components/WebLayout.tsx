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

    // Different screens need different widths on Web
    const isProfile = pathname.includes('/profile') || pathname.includes('/user/');
    const isMarketplace = pathname.includes('/marketplace');
    const isHome = pathname === '/' || pathname === '/(tabs)';
    
    // IG Standard Width: 935px total (with sidebar it can be wider). Feed width is usually wider if it has grid.
    const contentMaxWidth = isMarketplace ? 1200 : (isProfile || isHome) ? 935 : 600;

    const showRightSidebar = isLargeScreen && width > 1100 && !isProfile && !isMarketplace;

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {isLargeScreen && <WebSidebar />}
            
            <View style={[
                styles.content, 
                isLargeScreen && { paddingLeft: 280 }, // Account for thicker WebSidebar
                showRightSidebar && { paddingRight: 350 }, // Prevent overlap with Right Sidebar
                !isLargeScreen && { paddingBottom: 60 } 
            ]}>
                <View style={[
                    styles.main,
                    isLargeScreen && { 
                        width: '100%', 
                        maxWidth: contentMaxWidth, 
                        marginHorizontal: 'auto', 
                        paddingHorizontal: isMarketplace ? 20 : 0
                    }
                ]}>
                    {children}
                </View>

                {/* Optional Right Sidebar (Desktop only) */}
                {showRightSidebar && (
                    <View style={[styles.rightSidebar, { borderLeftColor: isDark ? '#333' : '#eee' }]}>
                        <DesktopRightSidebar />
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
        justifyContent: 'center', // Helps centering main when row
    },
    main: {
        flex: 1,
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
