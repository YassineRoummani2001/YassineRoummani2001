// Premium Voice Message UI - Enhanced Design
// Replace in app/message/[id].tsx

// ============================================
// 1. VOICE MESSAGE UI (around line 620)
// ============================================

) : item.type === 'voice' ? (
    <LinearGradient
        colors={['#9333EA', '#7C3AED', '#6B21A8']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.voicePremiumGradient}
    >
        {/* Play Button - Large with border */}
        <TouchableOpacity
            onPress={() => playAudio(item.content)}
            style={styles.voicePremiumPlayBtn}
            activeOpacity={0.7}
        >
            <View style={styles.playBtnInner}>
                <Play size={28} color="white" fill="white" />
            </View>
        </TouchableOpacity>

        {/* Waveform - Center */}
        <View style={styles.voicePremiumWaveform}>
            {[...Array(35)].map((_, i) => (
                <View
                    key={i}
                    style={[
                        styles.voicePremiumBar,
                        {
                            height: 10 + Math.abs(Math.sin(i * 0.4)) * 18 + (i % 4) * 3,
                            opacity: 0.7 + (i % 2) * 0.3
                        }
                    ]}
                />
            ))}
        </View>

        {/* Duration & Timestamp - Right side */}
        <View style={styles.voiceTimeColumn}>
            <Text style={styles.voicePremiumDuration}>
                {(item as any).duration ? `0:${((item as any).duration).toString().padStart(2, '0')}` : '0:00'}
            </Text>
            <Text style={styles.voicePremiumTimestamp}>
                {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
        </View>
    </LinearGradient>


// ============================================
// 2. STYLES (Replace voice message styles)
// ============================================

    // Voice Message - Premium Design
    voicePremiumGradient: {
    borderRadius: 28,
        paddingVertical: 16,
            paddingHorizontal: 20,
                flexDirection: 'row',
                    alignItems: 'center',
                        gap: 14,
                            minWidth: 300,
                                maxWidth: '88%',
                                    shadowColor: '#9333EA',
                                        shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
        shadowRadius: 12,
            elevation: 8,
    },
voicePremiumPlayBtn: {
    width: 56,
        height: 56,
            borderRadius: 28,
                backgroundColor: 'rgba(255,255,255,0.15)',
                    justifyContent: 'center',
                        alignItems: 'center',
                            borderWidth: 2,
                                borderColor: 'rgba(255,255,255,0.4)',
    },
playBtnInner: {
    width: 48,
        height: 48,
            borderRadius: 24,
                backgroundColor: 'rgba(255,255,255,0.1)',
                    justifyContent: 'center',
                        alignItems: 'center',
    },
voicePremiumWaveform: {
    flex: 1,
        flexDirection: 'row',
            alignItems: 'center',
                justifyContent: 'space-between',
                    height: 36,
                        paddingHorizontal: 6,
    },
voicePremiumBar: {
    width: 3,
        backgroundColor: 'white',
            borderRadius: 2,
    },
voiceTimeColumn: {
    flexDirection: 'column',
        alignItems: 'flex-end',
            gap: 4,
    },
voicePremiumDuration: {
    fontSize: 16,
        fontWeight: '700',
            color: 'white',
                letterSpacing: 0.5,
    },
voicePremiumTimestamp: {
    fontSize: 12,
        fontWeight: '500',
            color: 'rgba(255,255,255,0.75)',
    },


// ============================================
// 3. ENHANCED FEATURES (Optional)
// ============================================

// Add playing state for animation
const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);

// In playAudio function:
const playAudio = async (uri: string, messageId: string) => {
    try {
        // ... existing code ...

        setPlayingMessageId(messageId);

        // Listen for playback finish
        newSound.setOnPlaybackStatusUpdate((status) => {
            if (status.isLoaded && status.didJustFinish) {
                setPlayingMessageId(null);
            }
        });

        // ... rest of code ...
    } catch (error) {
        setPlayingMessageId(null);
        // ... error handling ...
    }
};

// Update play button to show pause icon when playing:
<TouchableOpacity
    onPress={() => playAudio(item.content, item._id)}
    style={styles.voicePremiumPlayBtn}
    activeOpacity={0.7}
>
    <View style={styles.playBtnInner}>
        {playingMessageId === item._id ? (
            <Pause size={28} color="white" fill="white" />
        ) : (
            <Play size={28} color="white" fill="white" />
        )}
    </View>
</TouchableOpacity>

// Animated waveform while playing:
{
    [...Array(35)].map((_, i) => (
        <Animated.View
            key={i}
            style={[
                styles.voicePremiumBar,
                {
                    height: playingMessageId === item._id
                        ? 10 + Math.abs(Math.sin(i * 0.4 + Date.now() / 100)) * 18
                        : 10 + Math.abs(Math.sin(i * 0.4)) * 18,
                    opacity: playingMessageId === item._id ? 1 : 0.7 + (i % 2) * 0.3
                }
            ]}
        />
    ))
}


// ============================================
// 4. COMPARISON
// ============================================

/**
 * Old Design:
 * - Simple gradient
 * - Small play button (40x40)
 * - 40 bars
 * - Basic styling
 *
 * New Premium Design:
 * - Vibrant 3-color gradient
 * - Large play button (56x56) with double border
 * - 35 bars with smooth sine wave
 * - Duration + Timestamp stacked
 * - Larger shadows
 * - More padding
 * - Better spacing
 *
 * Result:
 * ✨ More premium look
 * ✨ Better visual hierarchy
 * ✨ Clearer information
 * ✨ Professional appearance
 * ✨ Matches modern messaging apps
 */


// ============================================
// RESULT PREVIEW
// ============================================

/**
 * ┌────────────────────────────────────────────────────┐
 * │  🟣 Vibrant Purple Gradient                        │
 * │                                                    │
 * │  ⭕  ▂▄▆█▆▄▂▄▆█▆▄▂▄▆█▆▄▂▄▆█▆▄▂   0:00             │
 * │  ▶️                                   16:20        │
 * │                                                    │
 * └────────────────────────────────────────────────────┘
 * 
 * Features:
 * - 3-color gradient (#9333EA → #7C3AED → #6B21A8)
 * - Large play button (56x56) with inner circle
 * - 35 smooth waveform bars
 * - Duration (0:00) - large, bold
 * - Timestamp (16:20) - below, lighter
 * - Enhanced shadows
 * - Rounded corners (28px)
 * - Premium spacing
 */
