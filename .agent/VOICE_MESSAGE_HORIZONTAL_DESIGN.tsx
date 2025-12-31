// Horizontal Purple Gradient Voice Message - Telegram Style
// Replace in app/message/[id].tsx

// ============================================
// 1. VOICE MESSAGE UI (around line 579)
// ============================================

) : item.type === 'voice' ? (
    <View style={isMe ? styles.voiceMessageRight : styles.voiceMessageLeft}>
        <LinearGradient
            colors={['#7C3AED', '#5B21B6']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.voiceHorizontalGradient}
        >
            {/* Play Button */}
            <TouchableOpacity
                onPress={() => playAudio(item.content)}
                style={styles.voicePlayBtnHorizontal}
                activeOpacity={0.7}
            >
                <Play size={24} color="white" fill="white" />
            </TouchableOpacity>

            {/* Waveform - Long horizontal */}
            <View style={styles.voiceWaveformHorizontal}>
                {[...Array(40)].map((_, i) => (
                    <View
                        key={i}
                        style={[
                            styles.voiceWaveBarHorizontal,
                            {
                                height: 8 + Math.sin(i * 0.5) * 12 + (i % 3) * 4,
                                opacity: 0.6 + (i % 2) * 0.3
                            }
                        ]}
                    />
                ))}
            </View>

            {/* Duration */}
            <Text style={styles.voiceDurationHorizontal}>
                {(item as any).duration ? `0:${((item as any).duration).toString().padStart(2, '0')}` : '0:00'}
            </Text>
        </LinearGradient>
    </View>


// ============================================
// 2. STYLES (Replace voice message styles)
// ============================================

// Remove ALL old voice styles first, then add these:

    // Voice Message - Horizontal Telegram Style
    voiceMessageRight: {
    marginVertical: 4,
        maxWidth: '85%',
            alignSelf: 'flex-end',
    },
voiceMessageLeft: {
    marginVertical: 4,
        maxWidth: '85%',
            alignSelf: 'flex-start',
    },
voiceHorizontalGradient: {
    borderRadius: 24,
        paddingVertical: 12,
            paddingHorizontal: 16,
                flexDirection: 'row',
                    alignItems: 'center',
                        gap: 12,
                            minWidth: 280,
                                shadowColor: '#7C3AED',
                                    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
        shadowRadius: 8,
            elevation: 5,
    },
voicePlayBtnHorizontal: {
    width: 40,
        height: 40,
            borderRadius: 20,
                backgroundColor: 'rgba(255,255,255,0.2)',
                    justifyContent: 'center',
                        alignItems: 'center',
                            borderWidth: 1.5,
                                borderColor: 'rgba(255,255,255,0.3)',
    },
voiceWaveformHorizontal: {
    flex: 1,
        flexDirection: 'row',
            alignItems: 'center',
                justifyContent: 'space-between',
                    height: 32,
                        paddingHorizontal: 4,
    },
voiceWaveBarHorizontal: {
    width: 2.5,
        backgroundColor: 'white',
            borderRadius: 2,
    },
voiceDurationHorizontal: {
    fontSize: 15,
        fontWeight: '600',
            color: 'white',
                minWidth: 40,
                    textAlign: 'right',
    },


// ============================================
// 3. RESULT
// ============================================

/**
 * Voice Message Appearance:
 * 
 * ┌────────────────────────────────────────────────────┐
 * │  🟣 Purple Gradient (Horizontal)                   │
 * │                                                    │
 * │  ▶️  ▂▄▆█▆▄▂▄▆█▆▄▂▄▆█▆▄▂▄▆█▆▄▂▄▆█▆▄▂   0:06      │
 * │                                                    │
 * └────────────────────────────────────────────────────┘
 * 
 * Features:
 * - Horizontal purple gradient (#7C3AED → #5B21B6)
 * - Play button on left (40x40)
 * - 40 waveform bars (dynamic heights)
 * - Duration on right (0:06)
 * - Full width design
 * - Rounded corners (24px)
 * - Shadow effect
 * - Works for both sent/received
 */


// ============================================
// 4. ADVANCED: Animated Waveform (Optional)
// ============================================

// If you want animated waveform while playing:

const [isPlaying, setIsPlaying] = useState(false);
const waveAnimation = useRef(new Animated.Value(0)).current;

// In playAudio function:
setIsPlaying(true);
Animated.loop(
    Animated.sequence([
        Animated.timing(waveAnimation, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
        }),
        Animated.timing(waveAnimation, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: true,
        }),
    ])
).start();

// In waveform bars:
{
    [...Array(40)].map((_, i) => (
        <Animated.View
            key={i}
            style={[
                styles.voiceWaveBarHorizontal,
                {
                    height: 8 + Math.sin(i * 0.5) * 12,
                    opacity: isPlaying ? waveAnimation : 0.8
                }
            ]}
        />
    ))
}


// ============================================
// COMPARISON
// ============================================

/**
 * Old Design (Vertical):
 * - Small bubble
 * - Vertical layout
 * - 15-20 bars
 * - Duration below
 * 
 * New Design (Horizontal):
 * - Full width
 * - Horizontal layout
 * - 40 bars (more detail)
 * - Duration on right
 * - More like Telegram/WhatsApp
 * 
 * This design is:
 * ✅ More professional
 * ✅ Better use of space
 * ✅ Easier to see waveform
 * ✅ Modern messaging app style
 */
