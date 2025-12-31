# iOS Post Card Layout Fix

## Problem

On iOS, the post card layout breaks with:

- Image overflowing rounded corners
- Incorrect clipping
- Misaligned right/top edges
- Works fine on Android

## Root Causes (iOS-Specific)

### 1. **iOS Rendering Engine Differences**

- iOS uses **Core Animation** which handles `overflow: 'hidden'` differently than Android
- iOS requires explicit `overflow: 'hidden'` on BOTH the container AND parent wrapper
- Android is more forgiving with implicit clipping

### 2. **BorderRadius + Overflow Issue**

- On iOS, when a parent has `borderRadius`, child elements don't automatically clip
- You MUST add `overflow: 'hidden'` explicitly
- This is a known React Native iOS quirk

### 3. **AspectRatio + Absolute Positioning**

- iOS handles `aspectRatio` with absolute positioned children differently
- Can cause layout shifts and overflow

### 4. **Image Component Behavior**

- iOS Image component doesn't respect parent borderRadius without explicit overflow
- `ImageBackground` has even more issues on iOS

## The Fix

### Key Changes

1. ✅ Add `overflow: 'hidden'` to container
2. ✅ Add `overflow: 'hidden'` to mediaContainer
3. ✅ Ensure borderRadius is consistent
4. ✅ Remove conflicting styles

### Before (Broken on iOS)

```tsx
container: {
    borderRadius: Layout.borderRadius,
    // ❌ Missing overflow: 'hidden'
},
mediaContainer: {
    borderRadius: 0,  // ❌ Should match or have overflow
    overflow: 'hidden',
},
```

### After (Fixed)

```tsx
container: {
    borderRadius: Layout.borderRadius,
    overflow: 'hidden',  // ✅ Critical for iOS
},
mediaContainer: {
    borderRadius: 12,  // ✅ Match inner radius
    overflow: 'hidden',  // ✅ Double insurance
},
```

## Why Android Works But iOS Doesn't

| Aspect | Android | iOS |
|--------|---------|-----|
| **Rendering** | Skia (more forgiving) | Core Animation (strict) |
| **Overflow** | Implicit clipping | Requires explicit `overflow: 'hidden'` |
| **BorderRadius** | Auto-clips children | Needs manual overflow |
| **Image Clipping** | Automatic | Manual via overflow |

## Best Practices for iOS Compatibility

### 1. **Always Use Overflow Hidden**

```tsx
// ✅ Good
<View style={{ borderRadius: 12, overflow: 'hidden' }}>
  <Image />
</View>

// ❌ Bad (breaks on iOS)
<View style={{ borderRadius: 12 }}>
  <Image />
</View>
```

### 2. **Nested BorderRadius**

```tsx
// Parent borderRadius: 16
// Child borderRadius should be: 16 - padding = actual visible radius
container: {
    borderRadius: 16,
    padding: 16,
    overflow: 'hidden',
},
mediaContainer: {
    borderRadius: 12,  // Slightly less than parent
    overflow: 'hidden',
},
```

### 3. **Use Wrapper Views**

```tsx
// ✅ Best approach for complex layouts
<View style={styles.card}>
  <View style={styles.imageWrapper}>
    <Image style={styles.image} />
  </View>
</View>
```

### 4. **Avoid ImageBackground on iOS**

- Use `<View>` with `<Image>` instead
- Better control over clipping
- More predictable behavior

## Testing Checklist

- [ ] Test on iPhone with notch (14, 15, 16)
- [ ] Test on older iPhone (SE, 8)
- [ ] Test on iPad
- [ ] Test in both light and dark mode
- [ ] Test with different image aspect ratios
- [ ] Verify no overflow on corners
- [ ] Check SafeAreaView compatibility

## Related Files

- `components/FeedPost.tsx` - Main post card component
- `constants/Colors.ts` - Layout constants
