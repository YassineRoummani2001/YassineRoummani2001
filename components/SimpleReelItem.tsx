import { API_BASE_URL } from '@/constants/Config';
import { useUser } from '@/context/UserContext';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Heart, MessageCircle, MoreVertical, Send, Volume2, VolumeX } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { Dimensions, Image, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const getValidUri = (uri: string) => {
    if (!uri) return '';
    if (uri.startsWith('http') || uri.startsWith('data:')) return uri;
    return `${API_BASE_URL}${uri.startsWith('/') ? '' : '/'}${uri}`;
};

interface SimpleReelItemProps {
    item: any;
    active: boolean;
    index: number;
}

export default function SimpleReelItem({ item, active, index }: SimpleReelItemProps) {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { user } = useUser() || {};
    const videoRef = useRef<HTMLVideoElement>(null);

    const [isMuted, setIsMuted] = useState(true);
    const [isLiked, setIsLiked] = useState(false);
    const [likesCount, setLikesCount] = useState(item.likes?.length || 0);

    const videoUri = item.videoUri || item.uri;
    const author = item.user || { name: 'Unknown', avatar: '' };
    const caption = item.caption || '';

    // Auto-play when active
    useEffect(() => {
        if (Platform.OS === 'web' && videoRef.current) {
            if (active) {
                videoRef.current.play().catch(e => console.log('Play error:', e));
            } else {
                videoRef.current.pause();
            }
        }
    }, [active]);

    const toggleMute = () => {
        setIsMuted(!isMuted);
        if (videoRef.current) {
            videoRef.current.muted = !isMuted;
        }
    };

    const handleLike = () => {
        setIsLiked(!isLiked);
        setLikesCount(prev => isLiked ? prev - 1 : prev + 1);
    };

    return (
        <View style={styles.container}>
            {/* Video */}
            {Platform.OS === 'web' ? (
                <video
                    ref={videoRef}
                    src={getValidUri(videoUri)}
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        backgroundColor: 'black'
                    }}
                    loop
                    muted={isMuted}
                    playsInline
                    preload="auto"
                />
            ) : (
                <View style={styles.placeholder}>
                    <Text style={styles.placeholderText}>Video playback on mobile</Text>
                </View>
            )}

            {/* Gradient overlay */}
            <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.4)', 'rgba(0,0,0,0.9)']}
                locations={[0, 0.7, 1]}
                style={styles.gradient}
                pointerEvents="none"
            />

            {/* Mute button */}
            <TouchableOpacity
                onPress={toggleMute}
                style={[styles.muteButton, { top: insets.top + 60 }]}
            >
                {isMuted ? (
                    <VolumeX size={20} color="white" />
                ) : (
                    <Volume2 size={20} color="white" />
                )}
            </TouchableOpacity>

            {/* Right side actions */}
            <View style={[styles.rightActions, { bottom: 100 }]}>
                {/* Like */}
                <TouchableOpacity style={styles.actionButton} onPress={handleLike}>
                    <Heart
                        size={32}
                        color={isLiked ? '#FF3B30' : 'white'}
                        fill={isLiked ? '#FF3B30' : 'transparent'}
                    />
                    <Text style={styles.actionText}>{likesCount}</Text>
                </TouchableOpacity>

                {/* Comment */}
                <TouchableOpacity style={styles.actionButton}>
                    <MessageCircle size={32} color="white" />
                    <Text style={styles.actionText}>{item.comments?.length || 0}</Text>
                </TouchableOpacity>

                {/* Share */}
                <TouchableOpacity style={styles.actionButton}>
                    <Send size={32} color="white" />
                    <Text style={styles.actionText}>{item.shares || 0}</Text>
                </TouchableOpacity>

                {/* More */}
                <TouchableOpacity style={styles.actionButton}>
                    <MoreVertical size={32} color="white" />
                </TouchableOpacity>
            </View>

            {/* Bottom info */}
            <View style={[styles.bottomInfo, { bottom: insets.bottom + 70 }]}>
                <TouchableOpacity
                    style={styles.userInfo}
                    onPress={() => router.push({ pathname: '/user/[id]', params: { id: author._id || '1' } })}
                >
                    <Image
                        source={{ uri: getValidUri(author.avatar) || 'https://i.pravatar.cc/100' }}
                        style={styles.avatar}
                    />
                    <Text style={styles.username}>{author.name}</Text>
                </TouchableOpacity>

                {caption && (
                    <Text style={styles.caption} numberOfLines={2}>
                        {caption}
                    </Text>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: '100%',
        height: SCREEN_HEIGHT,
        backgroundColor: 'black',
        position: 'relative',
    },
    placeholder: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#222',
    },
    placeholderText: {
        color: 'white',
        fontSize: 16,
    },
    gradient: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        height: '50%',
    },
    muteButton: {
        position: 'absolute',
        right: 16,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    rightActions: {
        position: 'absolute',
        right: 12,
        gap: 24,
    },
    actionButton: {
        alignItems: 'center',
        gap: 4,
    },
    actionText: {
        color: 'white',
        fontSize: 12,
        fontWeight: '600',
    },
    bottomInfo: {
        position: 'absolute',
        left: 16,
        right: 80,
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 12,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        borderWidth: 2,
        borderColor: 'white',
    },
    username: {
        color: 'white',
        fontSize: 16,
        fontWeight: '700',
    },
    caption: {
        color: 'white',
        fontSize: 14,
        lineHeight: 20,
    },
});
