# 🎥 iOS Video Playback Issues - Complete Fix Guide

## ❌ المشكل

Videos ما كيلعبوش على iOS:

- ✅ Play button كيبان
- ❌ Video ما كيلعبش
- ❌ Black screen أو gray placeholder
- ✅ Android كيخدم مزيان

---

## 🔍 الأسباب الشائعة

### **1. Video Source Format**

```tsx
// ❌ WRONG - iOS doesn't like this
<Video source={{ uri: 'http://...' }} />

// ✅ CORRECT - Use proper video URL
<Video source={{ uri: 'https://...' }} />  // HTTPS!
```

### **2. Video Codec**

```
❌ iOS doesn't support all codecs
✅ iOS supports: H.264, HEVC (H.265)
❌ iOS may not support: VP8, VP9, AV1
```

### **3. useNativeControls**

```tsx
// ❌ WRONG - May not work on iOS
<Video />

// ✅ CORRECT - Use native controls
<Video useNativeControls />
```

### **4. resizeMode**

```tsx
// ❌ WRONG - May cause issues
<Video resizeMode="stretch" />

// ✅ CORRECT
<Video resizeMode="contain" />
```

### **5. shouldPlay**

```tsx
// ❌ WRONG - Autoplay may fail
<Video shouldPlay />

// ✅ CORRECT - User-initiated
<Video shouldPlay={false} />
```

---

## ✅ Solution 1: Fix Video Component

### **Complete Working Example:**

```tsx
import { Video, ResizeMode } from 'expo-av';
import React, { useState, useRef } from 'react';
import { View, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';

interface VideoPlayerProps {
    uri: string;
    style?: any;
}

export default function VideoPlayer({ uri, style }: VideoPlayerProps) {
    const videoRef = useRef<Video>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(false);

    const handlePlayPause = async () => {
        if (!videoRef.current) return;

        try {
            if (isPlaying) {
                await videoRef.current.pauseAsync();
                setIsPlaying(false);
            } else {
                await videoRef.current.playAsync();
                setIsPlaying(true);
            }
        } catch (err) {
            console.error('Video playback error:', err);
            setError(true);
        }
    };

    return (
        <View style={[styles.container, style]}>
            <Video
                ref={videoRef}
                source={{ uri }}
                style={StyleSheet.absoluteFill}
                resizeMode={ResizeMode.CONTAIN}
                useNativeControls={false}  // We'll use custom controls
                isLooping={false}
                shouldPlay={false}  // Don't autoplay
                onLoad={() => {
                    console.log('✅ Video loaded');
                    setIsLoading(false);
                }}
                onError={(err) => {
                    console.error('❌ Video error:', err);
                    setError(true);
                    setIsLoading(false);
                }}
                onPlaybackStatusUpdate={(status) => {
                    if (status.isLoaded) {
                        setIsPlaying(status.isPlaying);
                    }
                }}
            />

            {/* Loading indicator */}
            {isLoading && (
                <View style={styles.overlay}>
                    <ActivityIndicator size="large" color="#fff" />
                </View>
            )}

            {/* Play/Pause button */}
            {!isLoading && !error && (
                <TouchableOpacity
                    style={styles.playButton}
                    onPress={handlePlayPause}
                    activeOpacity={0.8}
                >
                    <View style={styles.playIcon}>
                        {isPlaying ? (
                            <Text style={styles.iconText}>⏸</Text>
                        ) : (
                            <Text style={styles.iconText}>▶</Text>
                        )}
                    </View>
                </TouchableOpacity>
            )}

            {/* Error state */}
            {error && (
                <View style={styles.overlay}>
                    <Text style={styles.errorText}>
                        Failed to load video
                    </Text>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: '100%',
        aspectRatio: 16 / 9,
        backgroundColor: '#000',
        position: 'relative',
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    playButton: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
    },
    playIcon: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: 'rgba(255,255,255,0.9)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    iconText: {
        fontSize: 24,
        color: '#000',
    },
    errorText: {
        color: '#fff',
        fontSize: 14,
    },
});
```

---

## ✅ Solution 2: Use Native Controls (Simpler)

```tsx
import { Video, ResizeMode } from 'expo-av';

export default function SimpleVideoPlayer({ uri }) {
    return (
        <Video
            source={{ uri }}
            style={{ width: '100%', aspectRatio: 16/9 }}
            resizeMode={ResizeMode.CONTAIN}
            useNativeControls  // ✅ Let iOS handle controls
            shouldPlay={false}
            isLooping={false}
        />
    );
}
```

---

## ✅ Solution 3: Fix Video URLs

### **Common Issues:**

```tsx
// ❌ WRONG - HTTP (not HTTPS)
const videoUrl = 'http://example.com/video.mp4';

// ❌ WRONG - Wrong format
const videoUrl = 'file:///path/to/video.webm';

// ❌ WRONG - Base64 (too large)
const videoUrl = 'data:video/mp4;base64,...';

// ✅ CORRECT - HTTPS URL
const videoUrl = 'https://example.com/video.mp4';

// ✅ CORRECT - Local asset
const videoUrl = require('./video.mp4');
```

### **iOS Video Requirements:**

1. **HTTPS only** (not HTTP)
2. **Supported formats:**
   - `.mp4` (H.264) ✅ Best
   - `.m4v` ✅
   - `.mov` ✅
   - `.webm` ❌ Not supported
   - `.avi` ❌ Not supported

3. **Supported codecs:**
   - H.264 ✅ Recommended
   - HEVC (H.265) ✅
   - VP8/VP9 ❌ Not supported

---

## 🔧 Fix for FeedPost Videos

### **Update FeedPost.tsx:**

```tsx
// Find your video rendering code and update:

{post.type === 'video' && (
    <Video
        source={{ uri: post.uri }}
        style={styles.video}
        resizeMode={ResizeMode.CONTAIN}
        useNativeControls  // ✅ Add this
        shouldPlay={false}  // ✅ Don't autoplay
        isLooping={false}
        onError={(err) => {
            console.error('❌ Video error:', err);
        }}
        onLoad={() => {
            console.log('✅ Video loaded');
        }}
    />
)}
```

---

## 🔧 Fix for Reels

### **Update ReelItem.tsx:**

```tsx
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';

export default function ReelItem({ reel, isActive }) {
    const videoRef = useRef<Video>(null);

    useEffect(() => {
        if (isActive && videoRef.current) {
            videoRef.current.playAsync();
        } else if (videoRef.current) {
            videoRef.current.pauseAsync();
        }
    }, [isActive]);

    return (
        <Video
            ref={videoRef}
            source={{ uri: reel.videoUrl }}
            style={StyleSheet.absoluteFill}
            resizeMode={ResizeMode.COVER}
            shouldPlay={isActive}
            isLooping
            useNativeControls={false}
            onError={(err) => {
                console.error('❌ Reel video error:', err);
            }}
        />
    );
}
```

---

## 🐛 Debugging Steps

### **1. Check Video URL:**

```tsx
console.log('Video URL:', post.uri);
// Should be HTTPS, not HTTP
// Should be .mp4, not .webm
```

### **2. Test with Known Working Video:**

```tsx
// Use this test URL
const testUrl = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';

<Video source={{ uri: testUrl }} />
```

### **3. Check Console Errors:**

```tsx
<Video
    onError={(err) => {
        console.error('Video error:', err);
    }}
    onLoad={() => {
        console.log('Video loaded successfully');
    }}
/>
```

### **4. Check Video Format:**

```bash
# On your video file:
ffmpeg -i video.mp4
# Should show: H.264 codec
```

---

## ✅ Quick Fixes Checklist

- [ ] Use **HTTPS** URLs (not HTTP)
- [ ] Use **.mp4** format (H.264 codec)
- [ ] Add **useNativeControls**
- [ ] Set **shouldPlay={false}**
- [ ] Set **resizeMode={ResizeMode.CONTAIN}**
- [ ] Add **onError** handler
- [ ] Add **onLoad** handler
- [ ] Test with known working video URL

---

## 📊 Common Scenarios

### **Scenario 1: Video from Backend**

```tsx
// ❌ WRONG
const videoUrl = `http://localhost:5000/uploads/video.mp4`;

// ✅ CORRECT
const videoUrl = `https://yourdomain.com/uploads/video.mp4`;
```

### **Scenario 2: Video from Cloudinary**

```tsx
// ✅ CORRECT - Cloudinary URLs work great
const videoUrl = 'https://res.cloudinary.com/.../video.mp4';
```

### **Scenario 3: Local Video**

```tsx
// ✅ CORRECT
const videoUrl = require('./assets/video.mp4');
```

---

## 🎯 Recommended Solution

### **For Posts (FeedPost):**

```tsx
<Video
    source={{ uri: post.uri }}
    style={styles.video}
    resizeMode={ResizeMode.CONTAIN}
    useNativeControls  // ✅ Simple & works
    shouldPlay={false}
/>
```

### **For Reels:**

```tsx
<Video
    source={{ uri: reel.videoUrl }}
    style={StyleSheet.absoluteFill}
    resizeMode={ResizeMode.COVER}
    shouldPlay={isActive}
    isLooping
    useNativeControls={false}  // Custom controls
/>
```

---

## 🚨 Important Notes

1. **iOS Simulator vs Device:**
   - Simulator may have issues
   - Test on real device

2. **Video Size:**
   - Large videos may timeout
   - Compress videos before upload

3. **Network:**
   - Slow network = loading issues
   - Use loading indicators

4. **Permissions:**
   - iOS may need permissions for local videos
   - HTTPS videos don't need permissions

---

## ✅ Final Checklist

- [ ] Videos use HTTPS URLs
- [ ] Videos are .mp4 (H.264)
- [ ] Added useNativeControls
- [ ] Added error handling
- [ ] Tested on real iOS device
- [ ] Check console for errors

---

**Most common fix: Add `useNativeControls` and use HTTPS URLs!** 🎯
