
import { useUser } from '@/context/UserContext';
import { ApiClient } from '@/utils/api'; // Fix import resolution
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Mic, MicOff, PhoneOff, RotateCcw, Video, VideoOff, Volume2 } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Image, SafeAreaView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// Mock API / helper to get safe avatar
const getCorrectUrl = (url: string) => {
    if (!url) return 'https://i.pravatar.cc/300';
    if (url.startsWith('http')) return url;
    return url; // Adjust based on your real logic
};

export default function CallScreen() {
    const { id, type, name, avatar } = useLocalSearchParams(); // type = 'audio' | 'video'
    const router = useRouter();
    const { user } = useUser() as any;

    const [isMuted, setIsMuted] = useState(false);
    const [isCameraOn, setIsCameraOn] = useState(type === 'video');
    const [isSpeakerOn, setIsSpeakerOn] = useState(false);
    const [callStatus, setCallStatus] = useState('Connecting...');
    const [duration, setDuration] = useState(0);

    const [recipient, setRecipient] = useState<any>(null);

    useEffect(() => {
        const fetchRecipient = async () => {
            if (!id) return;
            try {
                const res = await ApiClient.get(`/api/auth/user/${id}`, {
                    'Authorization': `Bearer ${user?.token}`
                });
                if (res.success && res.data) {
                    setRecipient(res.data);
                }
            } catch (e) {
                console.log("Error fetching user for call", e);
            }
        };
        fetchRecipient();
    }, [id]);

    // ... existing timer logic ...
    useEffect(() => {
        const connectTimer = setTimeout(() => {
            setCallStatus('Connected');
        }, 2000);

        const durationInterval = setInterval(() => {
            if (callStatus === 'Connected') {
                setDuration(prev => prev + 1);
            }
        }, 1000);

        return () => {
            clearTimeout(connectTimer);
            clearInterval(durationInterval);
        };
    }, [callStatus]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    const handleEndCall = () => {
        setCallStatus('Ending...');
        setTimeout(() => {
            router.back();
        }, 500);
    };

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

            {/* Background Content */}
            <Image
                source={{ uri: getCorrectUrl(avatar as string) }}
                style={[styles.fill, { opacity: type === 'video' && isCameraOn ? 0 : 1 }]}
                blurRadius={type === 'video' && isCameraOn ? 0 : 80}
            />
            {type === 'video' && isCameraOn && (
                <View style={styles.remoteVideoPlaceholder}>
                    <Image
                        source={{ uri: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=800&q=80' }}
                        style={styles.fill}
                        resizeMode="cover"
                    />
                    <View style={styles.videoOverlay}>
                        <Text style={styles.simulationText}>Simulated Video Stream</Text>
                    </View>
                </View>
            )}

            {/* Dark Overlay for better text readability */}
            <View style={[styles.fill, { backgroundColor: 'rgba(0,0,0,0.4)' }]} />


            {/* Main Content Layer */}
            <SafeAreaView style={styles.contentContainer}>

                {/* Header Info */}
                <View style={[styles.header, { opacity: type === 'video' && isCameraOn ? 0 : 1 }]}>
                    <View style={styles.avatarContainer}>
                        <Image
                            source={{ uri: getCorrectUrl(avatar as string) }}
                            style={styles.avatar}
                        />
                    </View>
                    <Text style={styles.name}>{name || 'Unknown User'}</Text>
                    <Text style={styles.status}>
                        {callStatus === 'Connected' ? formatTime(duration) : callStatus}
                    </Text>
                </View>

                {/* Video Header (Minimal) */}
                {type === 'video' && isCameraOn && (
                    <View style={styles.videoHeader}>
                        <Text style={styles.videoName}>{name || 'Unknown User'}</Text>
                        <Text style={styles.videoStatus}>{formatTime(duration)}</Text>
                    </View>
                )}

                {/* Local User Mini View (if Video) */}
                {type === 'video' && isCameraOn && (
                    <View style={styles.localVideoContainer}>
                        <View style={styles.localVideo}>
                            <Text style={{ color: 'white', fontSize: 10, fontWeight: 'bold' }}>You</Text>
                        </View>
                    </View>
                )}

                {/* Controls */}
                <View style={styles.bottomSheet}>
                    <View style={styles.controlsRow}>

                        <TouchableOpacity
                            style={[styles.controlBtn, isSpeakerOn && styles.activeBtn]}
                            onPress={() => setIsSpeakerOn(!isSpeakerOn)}
                        >
                            {isSpeakerOn ? <Volume2 color="#1F2937" size={26} /> : <Volume2 color="white" size={26} />}
                        </TouchableOpacity>

                        {type === 'video' && (
                            <TouchableOpacity
                                style={[styles.controlBtn, !isCameraOn && styles.activeBtn]}
                                onPress={() => setIsCameraOn(!isCameraOn)}
                            >
                                {isCameraOn ? <Video color="white" size={26} /> : <VideoOff color="#1F2937" size={26} />}
                            </TouchableOpacity>
                        )}

                        <TouchableOpacity
                            style={[styles.controlBtn, isMuted && styles.activeBtn]}
                            onPress={() => setIsMuted(!isMuted)}
                        >
                            {isMuted ? <MicOff color="#1F2937" size={26} /> : <Mic color="white" size={26} />}
                        </TouchableOpacity>

                        {type === 'video' && (
                            <TouchableOpacity style={styles.controlBtn}>
                                <RotateCcw color="white" size={26} />
                            </TouchableOpacity>
                        )}

                    </View>

                    <TouchableOpacity
                        style={styles.endCallBtn}
                        onPress={handleEndCall}
                    >
                        <PhoneOff color="white" size={36} />
                    </TouchableOpacity>
                </View>

            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#111',
    },
    fill: {
        ...StyleSheet.absoluteFillObject,
    },
    remoteVideoPlaceholder: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#000',
    },
    videoOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.3)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    simulationText: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 18,
        fontWeight: '600',
    },
    contentContainer: {
        flex: 1,
        justifyContent: 'space-between',
    },
    header: {
        alignItems: 'center',
        marginTop: 80,
    },
    videoHeader: {
        position: 'absolute',
        top: 60,
        left: 0,
        right: 0,
        alignItems: 'center',
        zIndex: 10,
    },
    videoName: {
        color: 'white',
        fontSize: 20,
        fontWeight: 'bold',
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 4,
    },
    videoStatus: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 14,
        marginTop: 4,
        fontWeight: '500',
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 4,
    },
    avatarContainer: {
        marginBottom: 24,
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 8,
        },
        shadowOpacity: 0.44,
        shadowRadius: 10.32,
        elevation: 16,
    },
    avatar: {
        width: 120,
        height: 120,
        borderRadius: 60,
        borderWidth: 4,
        borderColor: 'rgba(255,255,255,0.15)'
    },
    name: {
        fontSize: 32,
        fontWeight: '800', // Extra Bold
        color: 'white',
        marginBottom: 8,
        textAlign: 'center',
    },
    status: {
        fontSize: 18,
        color: 'rgba(255,255,255,0.7)',
        fontWeight: '500',
        letterSpacing: 0.5,
    },
    localVideoContainer: {
        position: 'absolute',
        right: 16,
        top: 140, // Below header
        width: 110,
        height: 160,
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.3)',
        zIndex: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 8,
    },
    localVideo: {
        flex: 1,
        backgroundColor: '#334155',
        justifyContent: 'center',
        alignItems: 'center',
    },
    bottomSheet: {
        alignItems: 'center',
        paddingBottom: 50, // More bottom padding
        gap: 50,
        width: '100%',
    },
    controlsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 20,
        width: '100%',
        paddingHorizontal: 20,
    },
    controlBtn: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: 'rgba(255,255,255,0.15)', // Glass effect
        justifyContent: 'center',
        alignItems: 'center',
    },
    activeBtn: {
        backgroundColor: 'white',
    },
    endCallBtn: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#EF4444',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: "#EF4444",
        shadowOffset: {
            width: 0,
            height: 8,
        },
        shadowOpacity: 0.5,
        shadowRadius: 12,
        elevation: 10,
    }
});
