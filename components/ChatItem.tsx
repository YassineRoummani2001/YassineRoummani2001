import { Image } from 'expo-image';
import React, { memo, useMemo } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

interface ChatItemProps {
    avatar?: string | null;
    name: string;
    lastMessage: string;
    time: string;
    unread?: number;
    online?: boolean;
    hasStory?: boolean;
    storyViewed?: boolean;
    onPress: () => void;
    onLongPress?: () => void;
    onStoryPress?: () => void;
    isDark: boolean;
    lastMessageSender?: string;
    isPinned?: boolean;
}

import { Ionicons, AntDesign } from '@expo/vector-icons';

const ChatItem = memo(({
    avatar,
    name,
    lastMessage,
    time,
    unread = 0,
    online = false,
    hasStory = false,
    storyViewed = false,
    onPress,
    onLongPress,
    onStoryPress,
    isDark,
    lastMessageSender,
    isPinned = false
}: ChatItemProps) => {

    // Fallback initials
    const initials = useMemo(() => {
        return name
            ?.split(' ')
            .map((n) => n[0])
            .slice(0, 2)
            .join('')
            .toUpperCase() || '?';
    }, [name]);

    const textColor = isDark ? '#FFF' : '#000';
    const subTextColor = isDark ? '#A0A0A0' : '#666';
    const bgColor = isDark ? '#000' : '#FFF';
    const pressedColor = isDark ? '#1C1C1E' : '#F2F2F2';

    return (
        <View style={styles.container}>
            {/* 1. Clickable Avatar (Story) */}
            <Pressable 
                onPress={onStoryPress || onPress}
                style={({ pressed }) => [
                    styles.avatarPressable,
                    { opacity: pressed ? 0.7 : 1 }
                ]}
            >
                <View style={styles.avatarContainer}>
                    <View style={hasStory ? {
                        padding: 2,
                        borderRadius: 32,
                        borderWidth: 2,
                        borderColor: storyViewed ? '#A0A0A0' : '#E1306C',
                    } : {}}>
                        {avatar ? (
                            <Image
                                source={{ uri: avatar }}
                                style={styles.avatar}
                                contentFit="cover"
                                transition={200}
                            />
                        ) : (
                            <View style={[
                                styles.avatarFallback,
                                { backgroundColor: isDark ? '#333' : '#E0E0E0' }
                            ]}>
                                <Text style={[styles.initials, { color: isDark ? '#FFF' : '#555' }]}>{initials}</Text>
                            </View>
                        )}
                    </View>
                    {online && <View style={[styles.onlineDot, { borderColor: bgColor }]} />}
                    {hasStory && onStoryPress && (
                        <View
                            style={[styles.storyPlayIcon, { 
                                backgroundColor: storyViewed ? '#A0A0A0' : '#E1306C',
                                borderColor: bgColor 
                            }]}
                        >
                            <Ionicons name="play" size={8} color="#FFF" style={{ marginLeft: 1 }} />
                        </View>
                    )}
                </View>
            </Pressable>

            {/* 2. Clickable Info (Chat) */}
            <Pressable
                onPress={onPress}
                onLongPress={onLongPress}
                android_ripple={{ color: isDark ? '#333' : '#EEE' }}
                style={({ pressed }) => [
                    styles.contentPressable,
                    { backgroundColor: pressed && Platform.OS === 'ios' ? pressedColor : 'transparent' }
                ]}
            >
                <View style={styles.content}>
                    <View style={[styles.row, { gap: 4 }]}>
                        <Text numberOfLines={1} style={[styles.name, { color: textColor, flex: 1 }]}>{name}</Text>
                        <Text style={[styles.time, { color: subTextColor }]}>{time}</Text>
                    </View>

                    <View style={styles.row}>
                        <Text
                            numberOfLines={1}
                            style={[
                                styles.message,
                                {
                                    color: unread > 0 ? (isDark ? '#FFF' : '#000') : subTextColor,
                                    fontWeight: unread > 0 ? '700' : '400'
                                }
                            ]}
                        >
                            {lastMessage}
                        </Text>

                        {isPinned && (
                            <View style={[styles.pinnedCircle, { backgroundColor: isDark ? '#333' : '#F0F0F0' }]}>
                                <AntDesign 
                                    name="pushpin" 
                                    size={12} 
                                    color={isDark ? '#AAA' : '#666'} 
                                />
                            </View>
                        )}

                        {unread > 0 && (
                            <View style={styles.unreadDot} />
                        )}
                    </View>
                </View>
            </Pressable>
        </View>
    );
});

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'stretch',
    },
    avatarPressable: {
        paddingLeft: 16,
        paddingVertical: 12,
        justifyContent: 'center',
    },
    contentPressable: {
        flex: 1,
        paddingVertical: 12,
        paddingRight: 16,
        paddingLeft: 12,
        justifyContent: 'center',
    },
    avatarContainer: {
        position: 'relative',
    },
    noteBubble: {
        position: 'absolute',
        top: -50,
        left: -10,
        minWidth: 80,
        maxWidth: 150,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 16,
        zIndex: 10,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
    },
    noteText: {
        fontSize: 12,
        fontWeight: '500',
        lineHeight: 16,
        textAlign: 'center',
    },
    noteTail: {
        position: 'absolute',
        bottom: -4,
        left: 20,
        width: 8,
        height: 8,
        transform: [{ rotate: '45deg' }],
    },
    avatar: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#CCC',
    },
    avatarFallback: {
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
    },
    initials: {
        fontSize: 18,
        fontWeight: '600',
    },
    onlineDot: {
        position: 'absolute',
        bottom: 2,
        right: 2,
        width: 14,
        height: 14,
        borderRadius: 7,
        backgroundColor: '#2ECC71',
        borderWidth: 2,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 2,
    },
    name: {
        fontSize: 16,
        fontWeight: '600',
        flex: 1,
    },
    time: {
        fontSize: 13,
        marginLeft: 8,
    },
    message: {
        fontSize: 14,
        flex: 1,
        marginRight: 12,
    },
    unreadDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#0095F6',
        marginLeft: 8,
    },
    pinnedCircle: {
        width: 22,
        height: 22,
        borderRadius: 11,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 8,
    },
    storyPlayIcon: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 20,
        height: 20,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
    },
});

export default ChatItem;
