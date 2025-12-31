# 🎬 Instagram-Style Reels Implementation Guide

## 📋 Overview

This is a **production-ready** implementation of Instagram/TikTok-style reels for React Native with Expo. The solution focuses on **optimal performance**, **smooth video playback**, and **preventing common pitfalls**.

---

## 🎯 Key Problems Solved

### ❌ Common Mistakes (What NOT to Do)

1. **Using `playAsync()/pauseAsync()` in useEffect**

   ```tsx
   // ❌ WRONG - Creates race conditions
   useEffect(() => {
     if (active) {
       videoRef.current?.playAsync();
     } else {
       videoRef.current?.pauseAsync();
     }
   }, [active]);
   ```

2. **Not handling `isLoaded` state**

   ```tsx
   // ❌ WRONG - Video tries to play before loaded
   shouldPlay={active && !paused}
   ```

3. **Poor FlatList configuration**

   ```tsx
   // ❌ WRONG - Renders too many items
   windowSize={21}
   initialNumToRender={10}
   ```

### ✅ Correct Implementation

1. **Use `shouldPlay` prop declaratively**

   ```tsx
   // ✅ CORRECT - Let expo-av handle playback
   shouldPlay={active && !paused && isLoaded}
   ```

2. **Properly track loading state**

   ```tsx
   const onPlaybackStatusUpdate = (status: AVPlaybackStatus) => {
     if (!status.isLoaded) {
       setIsLoaded(false);
       setIsBuffering(true);
       return;
     }
     setIsLoaded(true);
     setIsBuffering(status.isBuffering);
   };
   ```

3. **Optimize FlatList for video**

   ```tsx
   windowSize={3}              // Only 3 items in memory
   initialNumToRender={1}      // Start with 1 item
   maxToRenderPerBatch={2}     // Render 2 at a time
   removeClippedSubviews={true} // Remove off-screen views
   ```

---

## 🏗️ Architecture

### Component Hierarchy

```
ReelsScreen (Container)
  └── FlatList (Optimized)
      └── MemoizedReelItem (Prevents re-renders)
          ├── Video (expo-av)
          ├── VideoProgressBar
          ├── CommentsModal
          ├── ReelOptionsModal
          └── ShareToUsersModal
```

### State Management

**ReelsScreen State:**

- `activeIndex` - Which reel is currently visible
- `reels` - Array of reel data
- `loading` - Initial load state
- `refreshing` - Pull-to-refresh state
- `page` - Current page for pagination
- `hasMore` - Whether more reels exist

**ReelItem State:**

- `paused` - User paused the video
- `isLoaded` - Video is ready to play
- `isBuffering` - Video is buffering
- `currentTime` - Current playback position
- `duration` - Total video duration
- `liked` - User liked this reel
- `likesCount` - Total likes

---

## 🚀 Performance Optimizations

### 1. FlatList Configuration

```tsx
// ✅ Optimal settings for video
pagingEnabled              // Snap to items
snapToInterval={height}    // Snap distance
decelerationRate="fast"    // Quick snapping
windowSize={3}             // Minimal memory footprint
initialNumToRender={1}     // Fast initial render
maxToRenderPerBatch={2}    // Controlled rendering
removeClippedSubviews      // Android optimization
```

### 2. Viewability Tracking

```tsx
const viewabilityConfig = {
  itemVisiblePercentThreshold: 80, // 80% visible
  minimumViewTime: 100,            // 100ms delay
};

const onViewableItemsChanged = ({ viewableItems }) => {
  if (viewableItems[0]?.index !== null) {
    setActiveIndex(viewableItems[0].index);
  }
};
```

### 3. Component Memoization

```tsx
const MemoizedReelItem = memo(
  ReelItem,
  (prev, next) => {
    return (
      prev.active === next.active &&
      prev.item._id === next.item._id
    );
  }
);
```

### 4. Callback Optimization

```tsx
// ✅ Use useCallback for functions passed to children
const handleSeek = useCallback((position: number) => {
  videoRef.current?.setPositionAsync(position);
}, []);

const toggleLike = useCallback(async () => {
  // ... like logic
}, [user, liked, item._id]);
```

---

## 📱 Platform-Specific Considerations

### iOS

- ✅ `playsInSilentModeIOS: true` - Videos play even in silent mode
- ✅ `staysActiveInBackground: false` - Pause when app backgrounds
- ✅ Use `removeClippedSubviews` cautiously (can cause issues)

### Android

- ✅ `shouldDuckAndroid: true` - Lower other audio when playing
- ✅ `removeClippedSubviews={true}` - Significant performance boost
- ✅ Test on lower-end devices (4GB RAM)

### Web (Limited Support)

- ⚠️ `expo-av` has limited web support
- ⚠️ Some video formats may not work
- ✅ Consider using HTML5 `<video>` for web builds

---

## 🎨 UI/UX Best Practices

### 1. Loading States

```tsx
// Show spinner while buffering
{(isBuffering || !isLoaded) && active && (
  <ActivityIndicator size="large" color="white" />
)}
```

### 2. Pause Indicator

```tsx
// Clear visual feedback when paused
{paused && active && isLoaded && !isBuffering && (
  <Play size={64} color="white" fill="white" />
)}
```

### 3. Gradient Overlay

```tsx
// Ensure text readability
<LinearGradient
  colors={['transparent', 'rgba(0,0,0,0.8)']}
  style={styles.gradient}
/>
```

### 4. Text Shadows

```tsx
// Improve text visibility over video
username: {
  textShadowColor: 'rgba(0, 0, 0, 0.75)',
  textShadowOffset: { width: 0, height: 1 },
  textShadowRadius: 3,
}
```

---

## 🔧 Video Playback Logic

### The Golden Rule

**Never use imperative playback methods (`playAsync`, `pauseAsync`) when using `shouldPlay`.**

### Correct Flow

```tsx
// 1. Track loaded state
const [isLoaded, setIsLoaded] = useState(false);

// 2. Update on status change
const onPlaybackStatusUpdate = (status: AVPlaybackStatus) => {
  if (!status.isLoaded) {
    setIsLoaded(false);
    return;
  }
  setIsLoaded(true);
  setIsBuffering(status.isBuffering);
};

// 3. Use shouldPlay declaratively
<Video
  shouldPlay={active && !paused && isLoaded}
  onPlaybackStatusUpdate={onPlaybackStatusUpdate}
/>
```

### Why This Works

- ✅ `expo-av` handles all playback internally
- ✅ No race conditions between state and playback
- ✅ Smooth transitions between reels
- ✅ Proper buffering handling

---

## 📊 Progress Bar Implementation

### Key Features

1. **Smooth seeking** - Updates immediately on drag
2. **Visual feedback** - Bar expands when touched
3. **Time display** - Shows current/total time when scrubbing
4. **Optimized rendering** - Uses `Animated` for 60fps

### Implementation

```tsx
const [isScrubbing, setIsScrubbing] = useState(false);

// Don't update progress while user is scrubbing
useEffect(() => {
  if (!isScrubbing && duration > 0) {
    setDisplayProgress(currentTime / duration);
  }
}, [currentTime, duration, isScrubbing]);

// Use PanResponder for smooth dragging
const panResponder = PanResponder.create({
  onPanResponderGrant: () => setIsScrubbing(true),
  onPanResponderMove: (evt) => updateProgress(evt.nativeEvent.pageX),
  onPanResponderRelease: () => {
    setIsScrubbing(false);
    onSeek(calculatedTime);
  },
});
```

---

## 🎭 Animations

### 1. Like Button Animation

```tsx
const scaleAnim = useRef(new Animated.Value(1)).current;

const toggleLike = () => {
  Animated.sequence([
    Animated.timing(scaleAnim, { toValue: 1.3, duration: 100 }),
    Animated.timing(scaleAnim, { toValue: 1, duration: 100 }),
  ]).start();
};
```

### 2. Music Disc Rotation

```tsx
useEffect(() => {
  if (active && !paused && isLoaded) {
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 3000,
        useNativeDriver: true,
      })
    ).start();
  } else {
    rotateAnim.stopAnimation();
  }
}, [active, paused, isLoaded]);
```

---

## 🐛 Common Issues & Solutions

### Issue 1: Videos Don't Autoplay

**Cause:** Using `playAsync()` conflicts with `shouldPlay`
**Solution:** Remove all `playAsync()/pauseAsync()` calls, use only `shouldPlay`

### Issue 2: Multiple Videos Play at Once

**Cause:** Incorrect `active` prop logic
**Solution:** Ensure only one item has `active={true}` at a time

### Issue 3: Stuttering/Lag

**Cause:** Too many items rendered, heavy re-renders
**Solution:**

- Use `windowSize={3}`
- Memoize components
- Use `removeClippedSubviews` on Android

### Issue 4: Progress Bar Jumps

**Cause:** Updating progress while user is scrubbing
**Solution:** Track `isScrubbing` state and don't update during scrub

### Issue 5: Videos Load Slowly

**Cause:** Large video files, no preloading
**Solution:**

- Compress videos (H.264, 720p max)
- Use CDN with good bandwidth
- Consider preloading next video

---

## 📦 Dependencies

```json
{
  "expo-av": "~14.0.0",
  "expo-linear-gradient": "~13.0.0",
  "lucide-react-native": "^0.x.x",
  "react-native-safe-area-context": "^4.x.x"
}
```

---

## 🧪 Testing Checklist

- [ ] Video autoplays when scrolling to it
- [ ] Video pauses when scrolling away
- [ ] Tap to pause/play works
- [ ] Progress bar updates smoothly
- [ ] Seeking works accurately
- [ ] Like animation plays
- [ ] Music disc rotates when playing
- [ ] Loading spinner shows while buffering
- [ ] Pull to refresh works
- [ ] Infinite scroll loads more reels
- [ ] No memory leaks after scrolling 50+ reels
- [ ] Works on low-end Android devices
- [ ] Works on iOS (test silent mode)

---

## 🎯 Performance Benchmarks

**Target Metrics:**

- Initial render: < 100ms
- Scroll to next reel: < 50ms
- Video start playback: < 500ms
- Memory usage: < 300MB for 20 reels
- FPS: 60fps during scroll

**Monitoring:**

```tsx
// Add performance monitoring
import { InteractionManager } from 'react-native';

useEffect(() => {
  const task = InteractionManager.runAfterInteractions(() => {
    console.log('Reel rendered and interactive');
  });
  return () => task.cancel();
}, []);
```

---

## 🚀 Deployment Tips

1. **Compress Videos**
   - Use H.264 codec
   - 720p resolution max
   - 30fps
   - 2-3 Mbps bitrate

2. **Use CDN**
   - CloudFlare, AWS CloudFront, or similar
   - Enable video streaming
   - Set proper cache headers

3. **Monitor Performance**
   - Use Sentry or similar for crash reporting
   - Track video load times
   - Monitor memory usage

4. **Test on Real Devices**
   - Low-end Android (4GB RAM)
   - iPhone 8 or older
   - Slow network (3G simulation)

---

## 📚 Additional Resources

- [Expo AV Documentation](https://docs.expo.dev/versions/latest/sdk/av/)
- [React Native Performance](https://reactnative.dev/docs/performance)
- [FlatList Optimization](https://reactnative.dev/docs/optimizing-flatlist-configuration)

---

## ✅ Summary

This implementation provides:

- ✅ Smooth, Instagram-like video playback
- ✅ Optimal performance (60fps)
- ✅ Proper state management
- ✅ Production-ready code
- ✅ Cross-platform compatibility
- ✅ Comprehensive error handling

**Remember:** The key to smooth reels is using `shouldPlay` declaratively and optimizing FlatList rendering!
