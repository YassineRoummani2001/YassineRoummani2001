# 🎬 Reels Implementation - Quick Reference

## ✅ DO's

### Video Playback

```tsx
// ✅ Use shouldPlay declaratively
<Video
  shouldPlay={active && !paused && isLoaded}
  onPlaybackStatusUpdate={onPlaybackStatusUpdate}
/>

// ✅ Track loading state properly
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

### FlatList Optimization

```tsx
// ✅ Optimal configuration
<FlatList
  windowSize={3}
  initialNumToRender={1}
  maxToRenderPerBatch={2}
  removeClippedSubviews={Platform.OS === 'android'}
  pagingEnabled
  snapToInterval={screenHeight}
  decelerationRate="fast"
/>
```

### Component Memoization

```tsx
// ✅ Prevent unnecessary re-renders
const MemoizedReelItem = memo(
  ReelItem,
  (prev, next) => prev.active === next.active && prev.item._id === next.item._id
);
```

---

## ❌ DON'Ts

### Video Playback

```tsx
// ❌ NEVER use playAsync/pauseAsync with shouldPlay
useEffect(() => {
  if (active) {
    videoRef.current?.playAsync(); // ❌ WRONG!
  }
}, [active]);

// ❌ NEVER play without checking isLoaded
shouldPlay={active && !paused} // ❌ Missing isLoaded check
```

### FlatList

```tsx
// ❌ Don't render too many items
windowSize={21}           // ❌ Too large
initialNumToRender={10}   // ❌ Too many
```

### State Updates

```tsx
// ❌ Don't update progress while scrubbing
setDisplayProgress(currentTime / duration); // ❌ Always updating
```

---

## 🎯 Critical Rules

1. **NEVER mix imperative (`playAsync`) with declarative (`shouldPlay`)**
2. **ALWAYS check `isLoaded` before playing**
3. **ALWAYS memoize components to prevent re-renders**
4. **ALWAYS use `useCallback` for functions passed to children**
5. **ALWAYS optimize FlatList with `windowSize={3}`**

---

## 🐛 Troubleshooting

| Problem | Solution |
|---------|----------|
| Videos don't autoplay | Remove `playAsync()`, use only `shouldPlay` |
| Multiple videos play | Check `active` prop logic |
| Stuttering/lag | Reduce `windowSize`, memoize components |
| Progress bar jumps | Track `isScrubbing` state |
| Slow loading | Compress videos, use CDN |

---

## 📊 Performance Targets

- **Initial render:** < 100ms
- **Scroll to next:** < 50ms
- **Video start:** < 500ms
- **Memory:** < 300MB for 20 reels
- **FPS:** 60fps during scroll

---

## 🔑 Key Code Snippets

### Proper shouldPlay Logic

```tsx
shouldPlay={active && !paused && isLoaded}
```

### Viewability Config

```tsx
const viewabilityConfig = {
  itemVisiblePercentThreshold: 80,
  minimumViewTime: 100,
};
```

### Audio Config

```tsx
Audio.setAudioModeAsync({
  playsInSilentModeIOS: true,
  staysActiveInBackground: false,
  shouldDuckAndroid: true,
});
```

---

## 📱 Platform Notes

**iOS:**

- ✅ Set `playsInSilentModeIOS: true`
- ⚠️ Test in silent mode

**Android:**

- ✅ Use `removeClippedSubviews={true}`
- ✅ Test on 4GB RAM devices

**Web:**

- ⚠️ Limited `expo-av` support
- 💡 Consider HTML5 video for web

---

## 🎨 UI Checklist

- [ ] Loading spinner during buffering
- [ ] Pause icon when paused
- [ ] Bottom gradient for text readability
- [ ] Text shadows for visibility
- [ ] Smooth animations (60fps)
- [ ] Progress bar with seek
- [ ] Like button animation
- [ ] Rotating music disc

---

## 🚀 Quick Start

1. Copy `ReelItem.tsx` and `ReelsScreen.tsx`
2. Install dependencies: `expo-av`, `expo-linear-gradient`
3. Configure audio mode in `ReelItem`
4. Optimize FlatList with `windowSize={3}`
5. Test on real device (not web)

---

**Remember:** The secret to smooth reels is `shouldPlay={active && !paused && isLoaded}` + optimized FlatList!
