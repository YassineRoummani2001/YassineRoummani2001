# Safe Area Implementation for Profile Header

## Problem

The header icons were overlapping with:

- iOS notch/Dynamic Island
- Android status bar
- Different device screen sizes

## Solution: `useSafeAreaInsets` Hook

### Why This Approach is Best Practice

1. **Cross-Platform Compatibility**: Automatically handles iOS and Android differences
2. **Device Agnostic**: Works on all screen sizes, notches, and punch-holes
3. **Dynamic**: Adjusts to orientation changes automatically
4. **Future-Proof**: Handles new device designs without code changes

### Implementation

```tsx
// 1. Import the hook
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// 2. Use the hook in your component
const insets = useSafeAreaInsets();

// 3. Pass insets to your styles
const styles = useMemo(() => createStyles(colors, insets), [colors, insets]);

// 4. Use insets.top for header positioning
const createStyles = (colors: any, insets: any) => StyleSheet.create({
    header: {
        position: 'absolute',
        top: insets.top,  // ✅ This is the key change
        left: 0,
        right: 0,
        height: 56,
        // ... rest of styles
    },
});
```

### What `insets` Provides

```tsx
{
  top: number,     // Safe area from top (status bar/notch)
  bottom: number,  // Safe area from bottom (home indicator)
  left: number,    // Safe area from left (landscape notch)
  right: number    // Safe area from right (landscape notch)
}
```

### Before vs After

**Before (Hardcoded):**

```tsx
top: Platform.OS === 'android' ? StatusBar.currentHeight : 0
```

❌ Problems:

- Doesn't account for iOS notch
- Doesn't handle Dynamic Island
- Breaks on newer Android devices with punch-holes
- Not responsive to orientation changes

**After (Safe Area Insets):**

```tsx
top: insets.top
```

✅ Benefits:

- Automatically handles all devices
- Respects notches, punch-holes, status bars
- Updates on orientation change
- Works on future devices

### Device Examples

| Device | `insets.top` Value |
|--------|-------------------|
| iPhone 15 Pro (Portrait) | 59px |
| iPhone SE | 20px |
| Android (Standard) | 24-48px |
| Android (Punch-hole) | 30-50px |
| iPad | 20px |

## Best Practices

1. **Always use `SafeAreaProvider`** at the root of your app (usually in `_layout.tsx`)
2. **Use `useSafeAreaInsets`** instead of hardcoded values
3. **Pass insets to StyleSheet** when you need dynamic positioning
4. **Use `SafeAreaView`** for simple cases, `useSafeAreaInsets` for complex layouts

## Related Files

- `app/(tabs)/profile.tsx` - Implementation example
- `app/_layout.tsx` - Should have `SafeAreaProvider` wrapper
