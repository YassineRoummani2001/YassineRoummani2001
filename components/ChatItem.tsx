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
    onPress: () => void;
    onLongPress?: () => void;
    isDark: boolean;
    lastMessageSender?: string;
}

const ChatItem = memo(({
    avatar,
    name,
    lastMessage,
    time,
    unread = 0,
    online = false,
    onPress,
    onLongPress,
    isDark,
    lastMessageSender
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
        <Pressable
            onPress={onPress}
            onLongPress={onLongPress}
            android_ripple={{ color: isDark ? '#333' : '#EEE' }}
            style={({ pressed }) => [
                styles.container,
                { backgroundColor: pressed && Platform.OS === 'ios' ? pressedColor : bgColor }
            ]}
        >
            {/* Avatar */}
            <View style={styles.avatarContainer}>
                {/* Note Bubble Removed */}

                {avatar ? (
                    <Image
                        source={{ uri: avatar }}
                        style={styles.avatar}
                        contentFit="cover"
                        transition={200}
                    />
                ) : (
                    <View style={[styles.avatarFallback, { backgroundColor: isDark ? '#333' : '#E0E0E0' }]}>
                        <Text style={[styles.initials, { color: isDark ? '#FFF' : '#555' }]}>{initials}</Text>
                    </View>
                )}
                {online && <View style={[styles.onlineDot, { borderColor: bgColor }]} />}
            </View>

            {/* Info */}
            <View style={styles.content}>
                <View style={styles.row}>
                    <Text numberOfLines={1} style={[styles.name, { color: textColor }]}>{name}</Text>
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

                    {unread > 0 && (
                        <View style={styles.unreadDot} />
                    )}
                </View>
            </View>
        </Pressable>
    );
});

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingVertical: 12,
        alignItems: 'center',
    },
    avatarContainer: {
        marginRight: 14,
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
    },
});

export default ChatItem;
