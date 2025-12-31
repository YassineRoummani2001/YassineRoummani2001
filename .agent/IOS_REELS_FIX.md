# 🎬 iOS Reels Fix - Complete Guide

## ❌ المشكل

Reels ما كيخدموش على iOS:

- "Video failed to load" ⚠️
- Black screen
- Loading forever
- Android كيخدم مزيان ✅

---

## 🔍 الأسباب المحتملة

### **1. Video URL Issues**

```tsx
// ❌ WRONG - HTTP (iOS blocks)
videoUri: 'http://localhost:5000/uploads/video.mp4'

// ❌ WRONG - Base64 (too large)
videoUri: 'data:video/mp4;base64,...'

// ✅ CORRECT - HTTPS
videoUri: 'https://yourdomain.com/uploads/video.mp4'
```

### **2. expo-video vs expo-av**

```
expo-video (useVideoPlayer) - Newer, but can have issues
expo-av (Video component) - Older, more stable
```

### **3. Video Format**

```
✅ .mp4 (H.264) - Best for iOS
✅ .m4v
✅ .mov
❌ .webm - Not supported
❌ .avi - Not supported
```

### **4. Missing Error Handling**

```tsx
// ❌ No error info
const player = useVideoPlayer(videoUri);

// ✅ With error handling
player.addListener('statusChange', (status) => {
    if (status.status === 'error') {
        console.error('Video error:', status.error);
    }
});
```

---

## ✅ Solution 1: Better Error Handling (Applied)

### **What We Added:**

```tsx
// 1. Logging video initialization
const player = useVideoPlayer(videoUri, player => {
    player.loop = true;
    player.muted = muted;
    console.log('🎥 Initializing video player for:', videoUri);
});

// 2. Logging play/pause
useEffect(() => {
    if (active && !paused) {
        console.log('▶️ Playing video');
        player.play();
    } else {
        console.log('⏸️ Pausing video');
        player.pause();
    }
}, [active, paused, player]);

// 3. Better status change handling
player.addListener('statusChange', (status) => {
    console.log('📊 Video status:', status.status);
    
    if (status.status === 'error') {
        console.error('❌ Video error:', status.error);
        setHasError(true);
        setIsBuffering(false);
    }
    
    if (status.status === 'readyToPlay') {
        console.log('✅ Video ready to play');
        setIsBuffering(false);
        setHasError(false);
    }
});
```

---

## ✅ Solution 2: Switch to expo-av (If expo-video fails)

### **Replace expo-video with expo-av:**

```tsx
// OLD (expo-video)
import { useVideoPlayer, VideoView } from 'expo-video';

const player = useVideoPlayer(videoUri);

<VideoView
    player={player}
    style={StyleSheet.absoluteFill}
    contentFit="cover"
/>

// NEW (expo-av) - More stable!
import { Video, ResizeMode } from 'expo-av';

const videoRef = useRef<Video>(null);

<Video
    ref={videoRef}
    source={{ uri: videoUri }}
    style={StyleSheet.absoluteFill}
    resizeMode={ResizeMode.COVER}
    shouldPlay={active && !paused}
    isLooping
    isMuted={muted}
    onLoad={() => {
        console.log('✅ Video loaded');
        setIsLoaded(true);
        setIsBuffering(false);
    }}
    onError={(err) => {
        console.error('❌ Video error:', err);
        setHasError(true);
        setIsBuffering(false);
    }}
    onPlaybackStatusUpdate={(status) => {
        if (status.isLoaded) {
            setCurrentTime(status.positionMillis);
            setDuration(status.durationMillis || 1);
        }
    }}
/>
```

---

## ✅ Solution 3: Fix Video URLs

### **Check Video URL Format:**

```tsx
// In ReelItem.tsx, check console:
console.log('🎥 Video URI:', videoUri);

// Should be:
// ✅ https://... (HTTPS)
// ✅ .mp4 extension
// ✅ Valid URL

// Should NOT be:
// ❌ http://... (HTTP)
// ❌ data:video/... (Base64)
// ❌ file://... (Local file)
// ❌ localhost (on device)
```

### **Fix Backend URLs:**

```tsx
// If using localhost:
// ❌ WRONG on device
const videoUrl = 'http://localhost:5000/uploads/video.mp4';

// ✅ CORRECT - Use your computer's IP
const videoUrl = 'http://192.168.1.100:5000/uploads/video.mp4';

// ✅ BEST - Use HTTPS domain
const videoUrl = 'https://yourdomain.com/uploads/video.mp4';
```

---

## 🐛 Debugging Steps

### **1. Check Console Logs:**

After our fix, you'll see:

```
🎥 Initializing video player for: https://...
📊 Video status: loading
📊 Video status: readyToPlay
✅ Video ready to play
▶️ Playing video
```

If you see error:

```
❌ Video error: [error details]
```

### **2. Test with Known Working Video:**

```tsx
// Replace videoUri temporarily with test URL
const testUri = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';

const player = useVideoPlayer(testUri, ...);
```

If test video works → Your video URLs are the problem  
If test video fails → expo-video issue, switch to expo-av

### **3. Check Video Format:**

```bash
# On your video file:
ffmpeg -i video.mp4

# Should show:
# Video: h264 (High) ✅
# NOT: vp8, vp9, av1 ❌
```

---

## 📊 Common Scenarios

### **Scenario 1: Videos from Backend**

```tsx
// ❌ WRONG - localhost doesn't work on device
const videoUri = 'http://localhost:5000/uploads/video.mp4';

// ✅ CORRECT - Use computer IP
const videoUri = 'http://192.168.1.100:5000/uploads/video.mp4';

// ✅ BEST - Deploy backend and use HTTPS
const videoUri = 'https://api.yourdomain.com/uploads/video.mp4';
```

### **Scenario 2: Videos from Cloudinary**

```tsx
// ✅ CORRECT - Cloudinary works great
const videoUri = 'https://res.cloudinary.com/.../video.mp4';
```

### **Scenario 3: Base64 Videos**

```tsx
// ❌ WRONG - Too large, slow, crashes
const videoUri = 'data:video/mp4;base64,...';

// ✅ CORRECT - Upload to server first
const uploadedUrl = await uploadFile(videoFile, token, 'video');
const videoUri = uploadedUrl;
```

---

## ✅ Recommended Solutions (In Order)

### **1. Fix Video URLs (Try First)**

- Use HTTPS (not HTTP)
- Use .mp4 (H.264 codec)
- Use server URL (not localhost on device)
- Check console logs

### **2. Better Error Handling (Already Applied)**

- Added console logs
- Better status change handling
- Clear error messages

### **3. Switch to expo-av (If expo-video fails)**

- More stable on iOS
- Better error handling
- Proven to work

---

## 🎯 Quick Fix Checklist

- [ ] Check console logs (after our fix)
- [ ] Verify video URL is HTTPS
- [ ] Verify video is .mp4 (H.264)
- [ ] Test with known working video URL
- [ ] Check if using localhost (won't work on device)
- [ ] Try expo-av if expo-video fails
- [ ] Check video file size (<50MB recommended)

---

## 📝 Implementation

### **What We Changed:**

1. ✅ Added console logs for debugging
2. ✅ Better error status handling
3. ✅ Clear error messages in console
4. ✅ Reset hasError when video loads

### **What to Check:**

1. **Open Metro Bundler console**
2. **Look for logs:**
   - 🎥 Initializing video player
   - 📊 Video status
   - ✅ Video ready to play
   - ❌ Video error (if any)

3. **If you see error:**
   - Check video URL
   - Check video format
   - Try test URL
   - Consider switching to expo-av

---

## 🚀 Alternative: Use expo-av

If expo-video continues to fail, here's the complete replacement:

```bash
# expo-av is already installed with Expo
# No need to install anything
```

```tsx
// Replace in ReelItem.tsx:

// 1. Change imports
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';

// 2. Replace player with ref
const videoRef = useRef<Video>(null);

// 3. Replace VideoView with Video
<Video
    ref={videoRef}
    source={{ uri: videoUri }}
    style={StyleSheet.absoluteFill}
    resizeMode={ResizeMode.COVER}
    shouldPlay={active && !paused}
    isLooping
    isMuted={muted}
    onLoad={() => {
        setIsLoaded(true);
        setIsBuffering(false);
    }}
    onError={(err) => {
        console.error('Video error:', err);
        setHasError(true);
        setIsBuffering(false);
    }}
    onPlaybackStatusUpdate={(status: AVPlaybackStatus) => {
        if (status.isLoaded) {
            setCurrentTime(status.positionMillis);
            setDuration(status.durationMillis || 1);
        }
    }}
/>
```

---

## 💡 Pro Tips

1. **Always use HTTPS** for videos on iOS
2. **Use .mp4 (H.264)** - most compatible
3. **Keep videos under 50MB** - faster loading
4. **Test on real device** - simulator can be buggy
5. **Check console logs** - they tell you everything
6. **expo-av is more stable** than expo-video for now

---

## ✅ Status

- ✅ Added better error handling
- ✅ Added console logs for debugging
- ✅ Clear error messages
- ⏳ Waiting for console logs to identify issue
- 🔄 Can switch to expo-av if needed

---

**Check console logs now to see what's happening with your videos!** 📊

**If still failing, we can switch to expo-av (more stable)!** 🎯
