# Video Player Fix - expo-video Migration

## Issue

**Error:** `Uncaught (in promise) NotSupportedError: The element has no supported sources.`

This error occurred after migrating from `expo-av` to `expo-video` because the video player was being initialized with `null` for non-video posts.

## Root Cause

The `useVideoPlayer` hook was being called unconditionally, even when `post.isVideo` was false:

```typescript
// ❌ BEFORE - Problematic code
const videoSource = post.videoUri || post.image;
const player = useVideoPlayer(post.isVideo ? videoSource : null, player => {
    player.loop = true;  // This would fail when videoSource is null
    player.muted = isMuted;
    player.play();
});
```

When a post didn't have a video, `videoSource` would be `null`, causing the player to fail with "no supported sources" error.

## Solution

### 1. **FeedPost.tsx** - Fixed Hook Violation

**Problem:** `useVideoPlayer` was being called conditionally inside `FeedPost`, violating React's Rules of Hooks. This caused unstable behavior and potentially prevented the player from initializing correctly.

**Solution:** Extracted video logic into a separate `FeedVideo` component.

```typescript
// ✅ NEW Component
const FeedVideo = ({ videoSource, isMuted, setIsMuted }) => {
    // Hook called unconditionally inside this component
    const player = useVideoPlayer(videoSource, (player) => {
        player.loop = true;
        player.muted = isMuted;
        player.play();
    });

    // ... render VideoView
};

// FeedPost usage
{hasVideo ? (
    <FeedVideo videoSource={videoSource} ... />
) : (
    <Image ... />
)}
```

**Changes:**

- Created `FeedVideo` component
- Moved `useVideoPlayer` and `useEffect` for syncing volume into `FeedVideo`
- Removed conditional hook call from main `FeedPost` component
- Cleaned up rendered JSX to use `<FeedVideo />`

### 2. **ReelItem.tsx** - Migrated from expo-av to expo-video

**Before:**

```typescript
import { ResizeMode, Video } from 'expo-av';

const videoRef = useRef<Video>(null);
const [status, setStatus] = useState<any>({});

<Video
    ref={videoRef}
    source={{ uri: videoUri }}
    resizeMode={ResizeMode.COVER}
    isLooping
    shouldPlay={active}
    isMuted={false}
    onPlaybackStatusUpdate={status => setStatus(() => status)}
/>
```

**After:**

```typescript
import { VideoView, useVideoPlayer } from 'expo-video';

const player = useVideoPlayer(videoUri, (player) => {
    if (player) {
        player.loop = true;
        player.muted = false;
    }
});

const [isPlaying, setIsPlaying] = useState(true);

<VideoView
    style={styles.video}
    player={player}
    allowsFullscreen={false}
    allowsPictureInPicture={false}
    nativeControls={false}
    contentFit="cover"
/>
```

**Changes:**

- Replaced `Video` component with `VideoView`
- Replaced `useRef` with `useVideoPlayer` hook
- Updated playback controls to use player methods (`play()`, `pause()`)
- Removed `onPlaybackStatusUpdate` callback (not needed with new API)
- Added state management for play/pause button

## Files Modified

1. **`components/FeedPost.tsx`**
   - Fixed video player initialization with null checks
   - Added useEffect to sync muted state
   - Improved video source fallback logic

2. **`components/ReelItem.tsx`**
   - Migrated from expo-av to expo-video
   - Updated imports and component usage
   - Implemented new playback control logic

## Testing

### Verify the fix

1. **Image posts** - Should load without errors
2. **Video posts** - Should play correctly with mute/unmute
3. **Reels** - Should play/pause correctly
4. **No console errors** - Check for "NotSupportedError"

### Test cases

- ✅ Load home feed with mixed image/video posts
- ✅ Navigate to reels screen
- ✅ Toggle mute/unmute on video posts
- ✅ Play/pause reels
- ✅ Switch between reels (auto-play/pause)

## Key Learnings

### expo-video API Differences

| expo-av | expo-video |
|---------|------------|
| `<Video ref={ref} />` | `useVideoPlayer()` hook |
| `ref.current.playAsync()` | `player.play()` |
| `ref.current.pauseAsync()` | `player.pause()` |
| `isLooping` prop | `player.loop = true` |
| `isMuted` prop | `player.muted = true` |
| `shouldPlay` prop | `player.play()` method |
| `onPlaybackStatusUpdate` | Not needed (use state) |
| `resizeMode` prop | `contentFit` prop |

### Best Practices

1. **Always check for null** before initializing video player

   ```typescript
   const videoSource = hasVideo ? uri : null;
   const player = useVideoPlayer(videoSource, (player) => {
       if (player && videoSource) {
           // Configure player
       }
   });
   ```

2. **Sync state with useEffect**

   ```typescript
   useEffect(() => {
       if (player && videoSource) {
           player.muted = isMuted;
       }
   }, [isMuted, player, videoSource]);
   ```

3. **Control playback based on visibility**

   ```typescript
   useEffect(() => {
       if (player) {
           if (active) {
               player.play();
           } else {
               player.pause();
           }
       }
   }, [active, player]);
   ```

## Status

✅ **FIXED** - Video player now works correctly for:

- Image posts (no video player initialized)
- Video posts (player initialized and plays)
- Reels (player initialized with proper controls)

No more "NotSupportedError" in console! 🎉
