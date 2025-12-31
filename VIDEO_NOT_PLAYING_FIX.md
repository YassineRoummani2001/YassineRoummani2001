# 🔧 Video Not Playing - Troubleshooting Guide

## ⚠️ IMPORTANT: Are you testing on Web?

**The #1 reason videos don't play is testing on Expo Web!**

### Check Your Platform

Look at your browser URL:

- `http://localhost:8081` or `http://localhost:19006` = **WEB** ❌
- Expo Go app on phone = **MOBILE** ✅
- iOS Simulator = **MOBILE** ✅
- Android Emulator = **MOBILE** ✅

### Why Web Doesn't Work

- `expo-av` Video component has **very limited web support**
- External video URLs often fail on web
- Google's test videos may be blocked by CORS on web

### ✅ SOLUTION: Test on Mobile

```bash
# Option 1: Physical Device (RECOMMENDED)
npm start
# Then scan the QR code with Expo Go app

# Option 2: iOS Simulator
npm run ios

# Option 3: Android Emulator
npm run android
```

---

## 🐛 Debug Steps

### Step 1: Check Console Logs

With the debug logging I just added, you should see:

```
🎬 ReelItem State: {
  itemId: "...",
  active: true,
  paused: false,
  isLoaded: false,  // <-- Check this
  isBuffering: true,
  videoUri: "https://...",
  shouldPlay: false  // <-- This should become true
}
```

**What to look for:**

1. Is `videoUri` a valid URL?
2. Does `isLoaded` ever become `true`?
3. Does `shouldPlay` become `true`?

### Step 2: Check for Errors

Look for these console messages:

- `❌ Video Error:` - Video failed to load
- `✅ Video loaded successfully:` - Video loaded OK
- `📺 Video ready for display` - Video is ready

### Step 3: Check Network

Open browser DevTools (F12) → Network tab:

- Do you see the video URL being requested?
- What's the response status? (200 = OK, 404 = Not Found, etc.)
- Is the video file actually downloading?

---

## 🔍 Common Issues & Fixes

### Issue 1: "Videos not playing on Web"

**Cause:** Testing on Expo Web where `expo-av` doesn't work well
**Fix:** Test on mobile device or simulator

### Issue 2: "Stuck on loading spinner"

**Cause:** Video never loads (`isLoaded` stays `false`)
**Possible reasons:**

- Invalid video URL
- Network issue
- CORS blocking (on web)
- Video format not supported

**Fix:**

1. Check console for video URL
2. Try opening the URL directly in browser
3. Test on mobile (not web)

### Issue 3: "No error, but video doesn't play"

**Cause:** `shouldPlay` is `false`
**Check:**

- Is `active` true? (Only visible reel should be active)
- Is `paused` false?
- Is `isLoaded` true?

**Fix:** Check the debug logs to see which condition is failing

### Issue 4: "Black screen, no loading spinner"

**Cause:** Component not rendering
**Fix:** Check if reels array has data:

```tsx
console.log('Reels count:', reels.length);
console.log('First reel:', reels[0]);
```

---

## 📋 Quick Checklist

Run through this checklist:

- [ ] **Platform:** Are you testing on mobile (not web)?
- [ ] **Backend:** Is backend running on `http://localhost:5000`?
- [ ] **Data:** Do reels exist in database? (Run `node test-reels-data.js`)
- [ ] **Network:** Can you access `http://localhost:5000/api/posts/reels`?
- [ ] **Console:** Any errors in console?
- [ ] **Logs:** Do you see the debug logs I added?

---

## 🧪 Test Video URL Directly

Try this in your browser:

```
https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4
```

**If this doesn't play in your browser:**

- Your network may be blocking it
- Try a different network (mobile hotspot?)

**If it plays in browser but not in app:**

- You're likely on Expo Web (test on mobile!)

---

## 📱 How to Test on Mobile

### Option 1: Physical Device (Easiest)

1. Install **Expo Go** app on your phone
   - iOS: App Store
   - Android: Play Store

2. Make sure phone and computer are on **same WiFi**

3. Run in terminal:

   ```bash
   npm start
   ```

4. Scan the QR code with:
   - iOS: Camera app
   - Android: Expo Go app

### Option 2: iOS Simulator (Mac only)

```bash
npm run ios
```

### Option 3: Android Emulator

1. Install Android Studio
2. Create an emulator (AVD)
3. Start the emulator
4. Run:

   ```bash
   npm run android
   ```

---

## 🔬 Advanced Debugging

### Check Video Component Props

Add this before the return statement in ReelItem:

```tsx
console.log('Video props:', {
  uri: videoUri,
  shouldPlay: active && !paused && isLoaded,
  active,
  paused,
  isLoaded,
});
```

### Check FlatList Rendering

In ReelsScreen, add:

```tsx
console.log('Rendering reel:', index, 'Active:', activeIndex === index);
```

### Monitor Playback Status

The `onPlaybackStatusUpdate` callback logs the video state:

```tsx
const onPlaybackStatusUpdate = (status: AVPlaybackStatus) => {
  console.log('Playback status:', status);
  // ...
};
```

---

## 💡 Most Likely Solutions

### 90% of cases: Testing on Web

**Solution:** Test on mobile device!

### 5% of cases: Backend not running

**Solution:**

```bash
cd backend
npm run dev
```

### 5% of cases: No reels in database

**Solution:**

```bash
cd backend
node create-sample-reels.js
```

---

## 🆘 Still Not Working?

Share these details:

1. **Platform:** Web / iOS / Android?
2. **Console logs:** Copy the debug output
3. **Network tab:** Any failed requests?
4. **Error messages:** Exact error text
5. **Video URL:** What URL is being used?

---

## ✅ Expected Behavior

When working correctly, you should see:

1. **Console logs:**

   ```
   ✅ Fetched 8 reels
   🎬 ReelItem State: { active: true, isLoaded: true, shouldPlay: true }
   ✅ Video loaded successfully: https://...
   📺 Video ready for display
   ```

2. **On screen:**
   - Video playing automatically
   - Can tap to pause/play
   - Can swipe to next reel
   - Loading spinner while buffering

---

**Remember: 99% of "videos not playing" issues are from testing on Expo Web. Test on a real device! 📱**
