import { useThemeContext } from '@/context/ThemeContext';
import { useUser } from '@/context/UserContext';
import { ApiClient } from '@/utils/api';
import { Stack, useRouter } from 'expo-router';
import { Music } from 'lucide-react-native';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Image, Modal, SafeAreaView, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function CreateNoteScreen() {
    const router = useRouter();
    const { user: currentUser } = useUser();
    const { isDark, colors } = useThemeContext();

    const [text, setText] = useState('');
    const [loading, setLoading] = useState(false);
    const [music, setMusic] = useState<any>(null);
    const [showMusicModal, setShowMusicModal] = useState(false);
    const [musicSearch, setMusicSearch] = useState('');

    // Popular songs (in production, you'd fetch from Spotify/Apple Music API)
    const popularSongs = [
        { track: 'Blinding Lights', artist: 'The Weeknd', cover: 'https://i.scdn.co/image/ab67616d0000b273' },
        { track: 'Shape of You', artist: 'Ed Sheeran', cover: 'https://i.scdn.co/image/ab67616d0000b273' },
        { track: 'Dance Monkey', artist: 'Tones and I', cover: 'https://i.scdn.co/image/ab67616d0000b273' },
        { track: 'Someone Like You', artist: 'Adele', cover: 'https://i.scdn.co/image/ab67616d0000b273' },
        { track: 'Levitating', artist: 'Dua Lipa', cover: 'https://i.scdn.co/image/ab67616d0000b273' },
        { track: 'Watermelon Sugar', artist: 'Harry Styles', cover: 'https://i.scdn.co/image/ab67616d0000b273' },
        { track: 'Bad Guy', artist: 'Billie Eilish', cover: 'https://i.scdn.co/image/ab67616d0000b273' },
        { track: 'Starboy', artist: 'The Weeknd', cover: 'https://i.scdn.co/image/ab67616d0000b273' },
        { track: 'Anti-Hero', artist: 'Taylor Swift', cover: 'https://i.scdn.co/image/ab67616d0000b273' },
        { track: 'As It Was', artist: 'Harry Styles', cover: 'https://i.scdn.co/image/ab67616d0000b273' },
        { track: 'Heat Waves', artist: 'Glass Animals', cover: 'https://i.scdn.co/image/ab67616d0000b273' },
        { track: 'Peaches', artist: 'Justin Bieber', cover: 'https://i.scdn.co/image/ab67616d0000b273' },
        { track: 'Stay', artist: 'The Kid LAROI & Justin Bieber', cover: 'https://i.scdn.co/image/ab67616d0000b273' },
        { track: 'Good 4 U', artist: 'Olivia Rodrigo', cover: 'https://i.scdn.co/image/ab67616d0000b273' },
        { track: 'Flowers', artist: 'Miley Cyrus', cover: 'https://i.scdn.co/image/ab67616d0000b273' },
        { track: 'Calm Down', artist: 'Rema & Selena Gomez', cover: 'https://i.scdn.co/image/ab67616d0000b273' },
        { track: 'Unholy', artist: 'Sam Smith & Kim Petras', cover: 'https://i.scdn.co/image/ab67616d0000b273' },
        { track: 'Vampire', artist: 'Olivia Rodrigo', cover: 'https://i.scdn.co/image/ab67616d0000b273' },
        { track: 'Cruel Summer', artist: 'Taylor Swift', cover: 'https://i.scdn.co/image/ab67616d0000b273' },
        { track: 'Seven', artist: 'Jungkook', cover: 'https://i.scdn.co/image/ab67616d0000b273' },
    ];

    const handleShare = async () => {
        if (!text.trim()) return;
        setLoading(true);
        try {
            await ApiClient.post('/api/notes', {
                content: text,
                music: music
            }, { Authorization: `Bearer ${currentUser?.token}` });
            router.back();
        } catch (e: any) {
            console.error(e);
            Alert.alert("Error", "Failed to share note");
        } finally {
            setLoading(false);
        }
    };

    if (!currentUser) return <View style={{ flex: 1, backgroundColor: isDark ? '#000' : '#FFF' }} />;

    return (
        <>
            <Stack.Screen options={{ headerShown: false }} />
            <SafeAreaView style={{ flex: 1, backgroundColor: isDark ? '#000' : '#FFF' }}>
                {/* Header */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 }}>
                    <TouchableOpacity onPress={() => router.back()}>
                        <Text style={{ fontSize: 16, color: colors.text }}>Cancel</Text>
                    </TouchableOpacity>
                    <View style={{ flex: 1 }} />
                    <TouchableOpacity onPress={handleShare} disabled={loading || !text.trim()}>
                        {loading ? (
                            <ActivityIndicator size="small" color={colors.primary} />
                        ) : (
                            <Text style={{ fontSize: 16, fontWeight: '600', color: text.trim() ? colors.primary : colors.textSecondary }}>Share</Text>
                        )}
                    </TouchableOpacity>
                </View>

                {/* Content */}
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 150 }}>

                    {/* Bubble Logic to mimic thought bubble */}
                    <View style={{ marginBottom: 20, alignItems: 'center' }}>
                        <View style={{
                            backgroundColor: isDark ? '#262626' : '#F0F0F0',
                            borderRadius: 24,
                            padding: 16,
                            minWidth: 120,
                            maxWidth: 250,
                            minHeight: 80,
                            justifyContent: 'center',
                            alignItems: 'center',
                            marginBottom: 8
                        }}>
                            <TextInput
                                value={text}
                                onChangeText={setText}
                                placeholder="Share a thought..."
                                placeholderTextColor={colors.textSecondary}
                                multiline
                                maxLength={60}
                                style={{
                                    fontSize: 18,
                                    fontWeight: '500',
                                    color: colors.text,
                                    textAlign: 'center',
                                    width: '100%'
                                }}
                                autoFocus
                            />
                        </View>

                        {/* Small Circles for Thought Bubble Effect */}
                        <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: isDark ? '#262626' : '#F0F0F0', marginBottom: 6, opacity: 0.9 }} />
                        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: isDark ? '#262626' : '#F0F0F0', marginBottom: 2, opacity: 0.8 }} />
                    </View>

                    {/* Avatar */}
                    <Image
                        source={{ uri: currentUser.avatar }}
                        style={{ width: 90, height: 90, borderRadius: 45, borderWidth: 4, borderColor: isDark ? '#000' : '#FFF' }}
                    />

                    {/* Music Button */}
                    <TouchableOpacity
                        onPress={() => setShowMusicModal(true)}
                        style={{
                            marginTop: 20,
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 8,
                            backgroundColor: music ? colors.primary : (isDark ? '#262626' : '#F0F0F0'),
                            paddingHorizontal: 16,
                            paddingVertical: 10,
                            borderRadius: 20
                        }}
                    >
                        <Music size={18} color={music ? '#FFF' : colors.text} />
                        <Text style={{ fontSize: 14, fontWeight: '600', color: music ? '#FFF' : colors.text }}>
                            {music ? `${music.track} • ${music.artist}` : 'Add Music'}
                        </Text>
                    </TouchableOpacity>

                    <Text style={{ marginTop: 24, paddingHorizontal: 40, textAlign: 'center', color: colors.textSecondary, fontSize: 14 }}>
                        Your note will be visible to your followers for 24 hours.
                    </Text>
                </View>

                {/* Music Selection Modal */}
                <Modal visible={showMusicModal} animationType="slide" presentationStyle="pageSheet">
                    <SafeAreaView style={{ flex: 1, backgroundColor: isDark ? '#000' : '#FFF' }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: isDark ? '#333' : '#EEE' }}>
                            <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>Add Music</Text>
                            <TouchableOpacity onPress={() => setShowMusicModal(false)}>
                                <Text style={{ fontSize: 16, color: colors.primary }}>Done</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={{ padding: 16 }}>
                            <TextInput
                                value={musicSearch}
                                onChangeText={setMusicSearch}
                                placeholder="Search songs..."
                                placeholderTextColor={colors.textSecondary}
                                style={{
                                    backgroundColor: isDark ? '#262626' : '#F0F0F0',
                                    borderRadius: 12,
                                    paddingHorizontal: 16,
                                    paddingVertical: 12,
                                    fontSize: 16,
                                    color: colors.text
                                }}
                            />
                        </View>

                        <ScrollView>
                            {popularSongs.map((song, index) => (
                                <TouchableOpacity
                                    key={index}
                                    onPress={() => {
                                        setMusic(song);
                                        setShowMusicModal(false);
                                    }}
                                    style={{
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        padding: 16,
                                        borderBottomWidth: 1,
                                        borderBottomColor: isDark ? '#262626' : '#F0F0F0'
                                    }}
                                >
                                    <View style={{ width: 50, height: 50, borderRadius: 8, backgroundColor: colors.primary, marginRight: 12 }} />
                                    <View style={{ flex: 1 }}>
                                        <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>{song.track}</Text>
                                        <Text style={{ fontSize: 14, color: colors.textSecondary, marginTop: 2 }}>{song.artist}</Text>
                                    </View>
                                    {music?.track === song.track && (
                                        <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: colors.primary }} />
                                    )}
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </SafeAreaView>
                </Modal>
            </SafeAreaView>
        </>
    );
}
