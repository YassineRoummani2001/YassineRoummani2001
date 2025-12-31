# iOS Overflow Fix - Complete App Audit

## Components That Need iOS Overflow Fix

This document identifies all components with `borderRadius` that may need `overflow: 'hidden'` for iOS compatibility.

### ✅ Already Fixed

- `components/FeedPost.tsx` - Post cards with images

### 🔍 Components to Review

#### **High Priority (Image/Video Containers)**

1. **`components/ReelItem.tsx`**
   - Contains avatar with borderRadius
   - Video container
   - Music disc animations
   - **Action:** Add `overflow: 'hidden'` to avatar and video containers

2. **`components/SimpleReelItem.tsx`**
   - Reel video display
   - Avatar containers
   - **Action:** Add `overflow: 'hidden'` to video wrapper

3. **`components/StoryList.tsx`**
   - Story circles with images
   - Avatar borders
   - **Action:** Add `overflow: 'hidden'` to story containers

4. **`app/user/[id].tsx`**
   - User profile with cover image
   - Avatar display
   - Grid images
   - **Action:** Add `overflow: 'hidden'` to image containers

5. **`app/(tabs)/profile.tsx`**
   - Already has safe area fix
   - **Action:** Verify overflow on cover image and avatar

6. **`app/story-view.tsx`**
   - Full-screen story display
   - **Action:** Check image clipping

7. **`app/media-view.tsx`**
   - Media viewer
   - **Action:** Ensure proper clipping

#### **Medium Priority (Modal/Card Components)**

8. **`components/ShareToUsersModal.tsx`**
   - User avatars in list
   - Modal container
   - **Action:** Add overflow to avatar containers

9. **`components/CommentsModal.tsx`**
   - Comment user avatars
   - **Action:** Add overflow to avatar wrappers

10. **`components/NewChatModal.tsx`**
    - User selection list
    - **Action:** Add overflow to user avatars

11. **`components/DeleteConfirmModal.tsx`**
    - Modal container with borderRadius
    - **Action:** Add overflow to modal

12. **`components/ConfirmationModal.tsx`**
    - Modal container
    - **Action:** Add overflow

#### **Low Priority (UI Elements)**

13. **`components/SkeletonPost.tsx`**
    - Skeleton loaders
    - **Action:** Add overflow for visual consistency

14. **`components/Skeletons.tsx`**
    - Various skeleton components
    - **Action:** Add overflow

15. **`components/PostOptionsMenu.tsx`**
    - Menu container
    - **Action:** Add overflow to menu

16. **`components/ReelOptionsModal.tsx`**
    - Options modal
    - **Action:** Add overflow

17. **`components/VideoProgressBar.tsx`**
    - Progress bar with borderRadius
    - **Action:** Add overflow

## iOS Overflow Fix Pattern

### **Standard Fix for Image Containers:**

```tsx
// ❌ BEFORE (Breaks on iOS)
const styles = StyleSheet.create({
    container: {
        borderRadius: 16,
        // Missing overflow!
    },
    image: {
        width: '100%',
        height: '100%',
    },
});

// ✅ AFTER (Works on iOS)
const styles = StyleSheet.create({
    container: {
        borderRadius: 16,
        overflow: 'hidden', // ✅ Critical for iOS
    },
    image: {
        width: '100%',
        height: '100%',
    },
});
```

### **For Nested Containers:**

```tsx
// ✅ Both parent and child need overflow
const styles = StyleSheet.create({
    card: {
        borderRadius: 16,
        padding: 16,
        overflow: 'hidden', // ✅ Parent overflow
    },
    imageWrapper: {
        borderRadius: 12,
        overflow: 'hidden', // ✅ Child overflow
    },
    image: {
        width: '100%',
        height: '100%',
    },
});
```

### **For Avatars:**

```tsx
// ✅ Avatar with proper overflow
const styles = StyleSheet.create({
    avatarContainer: {
        width: 50,
        height: 50,
        borderRadius: 25,
        overflow: 'hidden', // ✅ Clips circular image
    },
    avatar: {
        width: '100%',
        height: '100%',
    },
});
```

## Automated Fix Checklist

For each component, check:

- [ ] Does it have `borderRadius`?
- [ ] Does it contain `<Image>` or `<VideoView>`?
- [ ] Does it have `overflow: 'hidden'`?
- [ ] If nested, do both parent and child have overflow?

## Testing After Fixes

Test on:

- [ ] iPhone 15 Pro (Dynamic Island)
- [ ] iPhone 14 (Notch)
- [ ] iPhone SE (No notch)
- [ ] iPad
- [ ] Light mode
- [ ] Dark mode

## Priority Order

1. **Fix High Priority first** (visible image containers)
2. **Then Medium Priority** (modals and cards)
3. **Finally Low Priority** (UI elements)

## Files Modified Counter

- Total files with borderRadius: ~45
- High priority: 7 files
- Medium priority: 6 files
- Low priority: 6 files
- Already fixed: 1 file (FeedPost.tsx)

## Next Steps

1. Review each high-priority component
2. Add `overflow: 'hidden'` where needed
3. Test on iOS device
4. Move to medium priority
5. Final testing on all devices
