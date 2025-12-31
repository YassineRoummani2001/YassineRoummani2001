# Instagram-Style Voice Recording UI

## Complete Implementation Guide

### 1. Update Input Bar UI

Find the input bar section (around line 650) and replace with this:

```tsx
{/* Input Bar */}
<View style={styles.inputContainer}>
    {recording ? (
        // Recording UI - Instagram Style
        <View style={styles.recordingBar}>
            {/* Delete Button */}
            <TouchableOpacity 
                style={styles.deleteRecordingBtn}
                onPress={() => {
                    if (recording) {
                        recording.stopAndUnloadAsync().catch(e => console.log(e));
                        setRecording(null);
                        isRecordingRef.current = false;
                        if (recordingTimerRef.current) {
                            clearInterval(recordingTimerRef.current);
                        }
                        setRecordingDuration(0);
                    }
                }}
            >
                <Trash2 size={24} color="#FF3B30" />
            </TouchableOpacity>

            {/* Waveform Animation */}
            <View style={styles.waveformContainer}>
                {[...Array(20)].map((_, i) => (
                    <Animated.View
                        key={i}
                        style={[
                            styles.waveBar,
                            {
                                height: recordingOpacity.interpolate({
                                    inputRange: [0.6, 1],
                                    outputRange: [
                                        8 + (i % 4) * 6,
                                        20 + (i % 4) * 8
                                    ],
                                }),
                            },
                        ]}
                    />
                ))}
            </View>

            {/* Timer */}
            <Text style={styles.recordingTimerText}>
                {Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, '0')}
            </Text>

            {/* Send Button */}
            <TouchableOpacity 
                style={styles.sendRecordingBtn}
                onPress={stopRecording}
            >
                <Send size={22} color="#8E2DE2" />
            </TouchableOpacity>
        </View>
    ) : (
        // Normal Input Bar
        <>
            <TextInput
                style={styles.input}
                placeholder="Message..."
                placeholderTextColor="#888"
                value={inputText}
                onChangeText={setInputText}
                multiline
            />

            {inputText.trim() ? (
                <TouchableOpacity onPress={handleSendText} style={styles.sendBtn}>
                    <Send size={20} color="white" />
                </TouchableOpacity>
            ) : (
                <>
                    {/* Mic Button - Instagram Style */}
                    <TouchableOpacity 
                        onPressIn={startRecording}
                        style={styles.micBtnContainer}
                        activeOpacity={0.8}
                    >
                        <LinearGradient
                            colors={['#8E2DE2', '#4A00E0']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.micGradientBtn}
                        >
                            <Mic size={24} color="white" />
                        </LinearGradient>
                    </TouchableOpacity>

                    {/* Other buttons */}
                    <TouchableOpacity onPress={pickImage} style={styles.iconBtn}>
                        <Image size={24} color="#888" />
                    </TouchableOpacity>
                    
                    <TouchableOpacity style={styles.iconBtn}>
                        <Smile size={24} color="#888" />
                    </TouchableOpacity>
                    
                    <TouchableOpacity style={styles.iconBtn}>
                        <Plus size={24} color="#888" />
                    </TouchableOpacity>
                </>
            )}
        </>
    )}
</View>
```

### 2. Add Styles

Add these styles to your StyleSheet:

```tsx
const styles = StyleSheet.create({
    // ... existing styles ...
    
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        backgroundColor: '#1A1A1A',
        borderTopWidth: 1,
        borderTopColor: '#333',
        gap: 8,
    },
    
    // Recording Bar (Instagram Style)
    recordingBar: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#8E2DE2',
        borderRadius: 30,
        paddingHorizontal: 12,
        paddingVertical: 10,
        gap: 10,
    },
    
    deleteRecordingBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'white',
        justifyContent: 'center',
        alignItems: 'center',
    },
    
    waveformContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-evenly',
        height: 40,
        paddingHorizontal: 8,
    },
    
    waveBar: {
        width: 3,
        backgroundColor: 'white',
        borderRadius: 2,
        opacity: 0.9,
    },
    
    recordingTimerText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
        minWidth: 50,
        textAlign: 'center',
    },
    
    sendRecordingBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'white',
        justifyContent: 'center',
        alignItems: 'center',
    },
    
    // Normal Input
    input: {
        flex: 1,
        backgroundColor: '#2A2A2A',
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 10,
        color: 'white',
        fontSize: 16,
        maxHeight: 100,
    },
    
    // Mic Button (Instagram Style)
    micBtnContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        overflow: 'hidden',
    },
    
    micGradientBtn: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    
    iconBtn: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    
    sendBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#8E2DE2',
        justifyContent: 'center',
        alignItems: 'center',
    },
});
```

### 3. Import Required Icons

Make sure you have these imports at the top:

```tsx
import { Mic, Send, Image, Smile, Plus, Trash2 } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Animated } from 'react-native';
```

### 4. Update Message Bubble for Voice

Update the voice message display to show duration:

```tsx
{item.type === 'voice' ? (
    <TouchableOpacity 
        onPress={() => playAudio(item.content)} 
        style={styles.voiceMessageContainer}
    >
        <View style={styles.voicePlayBtn}>
            <Play size={18} color={isMe ? '#fff' : '#8E2DE2'} />
        </View>
        
        {/* Waveform visual */}
        <View style={styles.voiceWaveform}>
            {[...Array(15)].map((_, i) => (
                <View 
                    key={i}
                    style={[
                        styles.voiceWaveBar,
                        { 
                            height: 8 + (i % 3) * 6,
                            backgroundColor: isMe ? '#fff' : '#8E2DE2'
                        }
                    ]}
                />
            ))}
        </View>
        
        {/* Duration */}
        <Text style={[styles.voiceDuration, { color: isMe ? '#fff' : '#666' }]}>
            {item.duration ? `0:${item.duration.toString().padStart(2, '0')}` : '0:00'}
        </Text>
    </TouchableOpacity>
) : ...}
```

### 5. Voice Message Styles

```tsx
voiceMessageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
},

voicePlayBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
},

voiceWaveform: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    height: 24,
},

voiceWaveBar: {
    width: 2,
    borderRadius: 1,
},

voiceDuration: {
    fontSize: 12,
    fontWeight: '500',
},
```

## Result

### Before Recording

- 🎤 Blue gradient mic button
- 📷 Image button
- 😊 Emoji button
- ➕ Plus button

### While Recording

- 🗑️ Delete button (white circle, red icon)
- 📊 Animated waveform (white bars)
- ⏱️ Timer (0:02, 0:03...)
- ✈️ Send button (white circle, purple icon)

### Voice Message Display

- ▶️ Play button
- 📊 Waveform visualization
- ⏱️ Duration (0:05)

This matches the Instagram design exactly! 🎨✨
