// Purple Gradient Voice Message UI - Complete Code
// Replace in app/message/[id].tsx

// ============================================
// 1. VOICE MESSAGE UI (around line 579)
// ============================================

) : item.type === 'voice' ? (
    <View style={styles.voiceMessageBubble}>
        <LinearGradient
            colors={['#8E2DE2', '#4A00E0']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.voiceGradient}
        >
            {/* Large Play Button */}
            <TouchableOpacity
                onPress={() => playAudio(item.content)}
                style={styles.voiceLargePlayBtn}
                activeOpacity={0.7}
            >
                <Play size={32} color="white" fill="white" />
            </TouchableOpacity>

            {/* Waveform */}
            <View style={styles.voiceWaveformLarge}>
                {[...Array(20)].map((_, i) => (
                    <View
                        key={i}
                        style={[
                            styles.voiceWaveBarLarge,
                            { height: 12 + (i % 5) * 8 }
                        ]}
                    />
                ))}
            </View>

            {/* Duration & Time */}
            <View style={styles.voiceTimeContainer}>
                <Text style={styles.voiceDurationLarge}>
                    {(item as any).duration ? `0:${((item as any).duration).toString().padStart(2, '0')}` : '0:00'}
                </Text>
                <Text style={styles.voiceTimestamp}>
                    {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
            </View>
        </LinearGradient>
    </View>


// ============================================
// 2. STYLES (Add to StyleSheet around line 1075)
// ============================================

// Remove old voice styles first:
// - voiceMessageContainer
// - voicePlayBtn  
// - voiceWaveform
// - voiceWaveBar
// - voiceDuration

// Add these NEW styles:

    // Voice Message - Purple Gradient Design
    voiceMessageBubble: {
    marginVertical: 4,
        maxWidth: '80%',
            alignSelf: 'flex-end', // Always on right side
    },
voiceGradient: {
    borderRadius: 20,
        padding: 16,
            flexDirection: 'column',
                gap: 12,
                    minWidth: 200,
                        shadowColor: '#8E2DE2',
                            shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
        shadowRadius: 8,
            elevation: 5,
    },
voiceLargePlayBtn: {
    width: 56,
        height: 56,
            borderRadius: 28,
                backgroundColor: 'rgba(255,255,255,0.25)',
                    justifyContent: 'center',
                        alignItems: 'center',
                            alignSelf: 'center',
                                borderWidth: 2,
                                    borderColor: 'rgba(255,255,255,0.3)',
    },
voiceWaveformLarge: {
    flexDirection: 'row',
        alignItems: 'center',
            justifyContent: 'space-between',
                height: 40,
                    paddingHorizontal: 8,
    },
voiceWaveBarLarge: {
    width: 3,
        backgroundColor: 'white',
            borderRadius: 2,
                opacity: 0.9,
    },
voiceTimeContainer: {
    flexDirection: 'column',
        alignItems: 'center',
            gap: 4,
    },
voiceDurationLarge: {
    fontSize: 18,
        fontWeight: '700',
            color: 'white',
                letterSpacing: 0.5,
    },
voiceTimestamp: {
    fontSize: 13,
        fontWeight: '500',
            color: 'rgba(255,255,255,0.7)',
    },


// ============================================
// 3. MAKE SURE YOU HAVE THESE IMPORTS
// ============================================

import { LinearGradient } from 'expo-linear-gradient';
import { Play } from 'lucide-react-native';


// ============================================
// RESULT:
// ============================================

/**
 * Voice Message Appearance:
 * 
 * ┌─────────────────────────┐
 * │   🟣 Purple Gradient    │
 * │                         │
 * │         ▶️              │
 * │    (Large Play Btn)     │
 * │                         │
 * │   ▂▄▆█▆▄▂▄▆█▆▄▂        │
 * │   (Waveform - 20 bars)  │
 * │                         │
 * │        0:05             │
 * │       16:20             │
 * └─────────────────────────┘
 * 
 * Features:
 * - Purple gradient (#8E2DE2 → #4A00E0)
 * - Large play button (56x56)
 * - 20 waveform bars (white)
 * - Duration (0:05) - large, bold
 * - Timestamp (16:20) - smaller
 * - Shadow effect
 * - Always on right side
 */
