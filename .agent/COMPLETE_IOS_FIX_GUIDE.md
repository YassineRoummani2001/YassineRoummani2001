# Complete iOS Overflow Fix Guide

## ✅ Already Fixed Components

1. **`components/FeedPost.tsx`**
   - ✅ Container has `overflow: 'hidden'`
   - ✅ MediaContainer has `overflow: 'hidden'` and `borderRadius: 12`

2. **`components/ReelItem.tsx`**
   - ✅ Avatar has `overflow: 'hidden'`

3. **`app/(tabs)/profile.tsx`**
   - ✅ Has safe area insets implementation

---

## 🔧 Quick Fix Pattern

For **ANY** component with images/videos and borderRadius, apply this pattern:

```tsx
// ❌ BEFORE
const styles = StyleSheet.create({
    imageContainer: {
        width: 200,
        height: 200,
        borderRadius: 16,
        // Missing overflow!
    },
});

// ✅ AFTER
const styles = StyleSheet.create({
    imageContainer: {
        width: 200,
        height: 200,
        borderRadius: 16,
        overflow: 'hidden', // ✅ Add this!
    },
});
```

---

## 📝 Manual Fix Checklist

### For Each Component

1. **Open the file**
2. **Find `StyleSheet.create`**
3. **Search for `borderRadius`**
4. **Check if it contains `<Image>` or `<VideoView>`**
5. **Add `overflow: 'hidden'`** if missing
6. **Save and test on iOS**

---

## 🎯 Priority Components to Fix

### **High Priority** (User-facing, image-heavy)

#### 1. `components/SimpleReelItem.tsx`

```tsx
// Find styles with borderRadius and add overflow
avatar: {
    borderRadius: 20,
    overflow: 'hidden', // ✅ Add
},
```

#### 2. `components/StoryList.tsx`

```tsx
storyContainer: {
    borderRadius: 34,
    overflow: 'hidden', // ✅ Add
},
storyImage: {
    borderRadius: 32,
    overflow: 'hidden', // ✅ Add
},
```

#### 3. `app/user/[id].tsx`

```tsx
avatarBorder: {
    borderRadius: 60,
    overflow: 'hidden', // ✅ Add
},
avatar: {
    borderRadius: 50,
    overflow: 'hidden', // ✅ Add
},
coverImage: {
    // Add wrapper with overflow if needed
},
```

#### 4. `app/story-view.tsx`

```tsx
// Check all image containers
imageContainer: {
    borderRadius: X,
    overflow: 'hidden', // ✅ Add
},
```

#### 5. `app/media-view.tsx`

```tsx
mediaContainer: {
    borderRadius: X,
    overflow: 'hidden', // ✅ Add
},
```

### **Medium Priority** (Modals and UI)

#### 6. `components/ShareToUsersModal.tsx`

```tsx
avatar: {
    borderRadius: 24,
    overflow: 'hidden', // ✅ Add
},
modalContent: {
    borderRadius: 20,
    overflow: 'hidden', // ✅ Add if contains images
},
```

#### 7. `components/CommentsModal.tsx`

```tsx
userAvatar: {
    borderRadius: X,
    overflow: 'hidden', // ✅ Add
},
```

#### 8. `components/NewChatModal.tsx`

```tsx
avatar: {
    borderRadius: X,
    overflow: 'hidden', // ✅ Add
},
```

#### 9. `components/DeleteConfirmModal.tsx`

```tsx
modalContainer: {
    borderRadius: 24,
    overflow: 'hidden', // ✅ Add if needed
},
```

#### 10. `components/ConfirmationModal.tsx`

```tsx
modalContainer: {
    borderRadius: X,
    overflow: 'hidden', // ✅ Add if needed
},
```

---

## 🚀 Automated Fix (Advanced)

If you want to automate this, use this regex find/replace:

### **Find:**

```regex
(\w+):\s*\{([^}]*borderRadius[^}]*)\}
```

### **Check if missing `overflow`:**

```regex
(\w+):\s*\{([^}]*borderRadius(?!.*overflow)[^}]*)\}
```

### **Manual Review Required:**

- Not all borderRadius styles need overflow
- Only add overflow where there are images/videos
- Buttons and text containers usually don't need it

---

## 🧪 Testing Protocol

After applying fixes:

### **Test on iOS:**

1. Open app on iPhone (physical device or simulator)
2. Navigate to each screen
3. Check for:
   - ✅ Images clip correctly within rounded corners
   - ✅ No overflow beyond borders
   - ✅ Smooth edges on all sides
   - ✅ No visual glitches

### **Test Scenarios:**

- [ ] Feed posts with images
- [ ] Feed posts with videos
- [ ] User profiles (own and others)
- [ ] Stories (viewing and creating)
- [ ] Reels
- [ ] Modals (comments, share, options)
- [ ] Chat avatars
- [ ] Search results
- [ ] Gallery view

### **Devices to Test:**

- [ ] iPhone 15 Pro (Dynamic Island)
- [ ] iPhone 14 (Notch)
- [ ] iPhone SE (No notch)
- [ ] iPad
- [ ] Light mode
- [ ] Dark mode

---

## 📊 Expected Results

### **Before Fix:**

- ❌ Images overflow rounded corners
- ❌ Sharp edges visible on iOS
- ❌ Inconsistent rendering
- ❌ Visual glitches

### **After Fix:**

- ✅ Perfect rounded corners
- ✅ Clean image clipping
- ✅ Consistent across devices
- ✅ Professional appearance

---

## 🎓 Why This Happens

### **iOS (Core Animation):**

- Strict rendering engine
- Requires explicit `overflow: 'hidden'`
- BorderRadius doesn't auto-clip children
- More precise but less forgiving

### **Android (Skia):**

- Forgiving rendering engine
- Implicit clipping with borderRadius
- Auto-clips children in most cases
- More lenient

---

## 💡 Best Practices Going Forward

### **Always use this pattern for images:**

```tsx
// ✅ CORRECT PATTERN
<View style={styles.imageWrapper}>
    <Image source={{uri}} style={styles.image} />
</View>

const styles = StyleSheet.create({
    imageWrapper: {
        borderRadius: 16,
        overflow: 'hidden', // ✅ Always include
    },
    image: {
        width: '100%',
        height: '100%',
    },
});
```

### **For nested containers:**

```tsx
// ✅ BOTH need overflow
card: {
    borderRadius: 20,
    padding: 16,
    overflow: 'hidden', // ✅ Parent
},
imageContainer: {
    borderRadius: 12,
    overflow: 'hidden', // ✅ Child
},
```

---

## 📞 Need Help?

If you encounter issues:

1. Check if `overflow: 'hidden'` is present
2. Verify borderRadius values are correct
3. Ensure parent containers also have overflow
4. Test on actual iOS device (simulator may differ)
5. Check for conflicting styles

---

## ✅ Completion Checklist

- [ ] All high-priority components fixed
- [ ] All medium-priority components fixed
- [ ] Tested on iOS device
- [ ] Tested in light/dark mode
- [ ] No visual regressions
- [ ] Performance is good
- [ ] Code committed

---

**Last Updated:** 2025-12-21  
**Status:** Ready for implementation  
**Estimated Time:** 30-60 minutes for all fixes
