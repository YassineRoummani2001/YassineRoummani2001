# 🎬 Create Reel Feature - Complete Implementation Guide

## ✅ Feature Overview

A complete "Create New Reel" feature that allows users to:

1. Upload or record videos
2. Add captions and music
3. Automatically navigate to the Reels page
4. See their new reel at the top of the list
5. Real-time updates across the app

---

## 📦 What's Included

### 1. **ReelContext** (`context/ReelContext.tsx`)

Global state management for reels with:

- `reels` - Array of all reels
- `loading` - Loading state
- `error` - Error messages
- `fetchReels()` - Fetch reels from API
- `addNewReel()` - Add new reel to top of list
- `updateReel()` - Update existing reel
- `deleteReel()` - Remove a reel
- `clearReels()` - Clear all reels

### 2. **CreateReelScreen** (`app/create-reel.tsx`)

Full-featured reel creation with:

- Video upload from gallery
- Video recording with camera
- Video preview with playback
- Caption input (500 char limit)
- Music/audio input (optional)
- Upload progress indicator
- Automatic navigation after creation

### 3. **Updated ReelsScreen** (`app/(tabs)/reels.tsx`)

Enhanced reels page with:

- Floating "+ Create" button
- Integration with ReelContext
- Automatic updates when new reels added
- Pull to refresh
- Infinite scroll
- Optimized performance

### 4. **Backend API** (`backend/routes/posts.js`)

New endpoint for reel uploads:

- `POST /api/posts/upload-reel`
- Multer for file handling
- Video validation (mp4, mov, avi, mkv)
- 100MB file size limit
- Automatic file storage in `uploads/reels/`

---

## 🚀 How It Works

### User Flow

1. **User taps "+ Create" button** on Reels page
2. **CreateReelScreen opens** as full-screen modal
3. **User selects video** (upload or record)
4. **Video preview** shows with playback
5. **User adds caption** and optional music
6. **User taps "Create Reel"**
7. **Video uploads** to backend with progress indicator
8. **New reel added** to ReelContext (top of list)
9. **Auto-navigate** to Reels page
10. **New reel appears** at the top automatically!

### Technical Flow

```
CreateReelScreen
  ↓
  Upload video to backend
  ↓
  Backend saves file & creates Post
  ↓
  Returns populated reel data
  ↓
  addNewReel() adds to context
  ↓
  ReelsScreen auto-updates (subscribed to context)
  ↓
  New reel appears at top!
```

---

## 🎯 Key Features

### 1. Real-Time Updates

- **No manual refresh needed!**
- ReelContext automatically updates all subscribers
- New reels appear instantly at the top

### 2. Optimistic UI

- Video preview shows immediately
- Upload progress indicator
- Success/error alerts

### 3. File Upload

- Multer handles multipart/form-data
- Videos saved to `uploads/reels/`
- Automatic filename generation
- File type validation

### 4. Navigation

- Full-screen modal presentation
- Automatic navigation after creation
- Back button to cancel

### 5. Form Validation

- Video required
- Caption max 500 characters
- Music optional, max 100 characters
- File type validation

---

## 📝 Usage Examples

### Access ReelContext Anywhere

```tsx
import { useReels } from '@/context/ReelContext';

function MyComponent() {
  const { reels, loading, fetchReels, addNewReel } = useReels();
  
  // Fetch reels
  useEffect(() => {
    fetchReels();
  }, []);
  
  // Add a new reel
  const handleAddReel = (newReel) => {
    addNewReel(newReel);
  };
  
  return (
    <FlatList
      data={reels}
      renderItem={({ item }) => <ReelItem item={item} />}
    />
  );
}
```

### Navigate to Create Reel

```tsx
import { useRouter } from 'expo-router';

function MyButton() {
  const router = useRouter();
  
  return (
    <TouchableOpacity onPress={() => router.push('/create-reel')}>
      <Text>Create Reel</Text>
    </TouchableOpacity>
  );
}
```

---

## 🔧 Configuration

### Backend Setup

1. **Install multer** (already done):

   ```bash
   npm install multer
   ```

2. **Create uploads directory**:

   ```bash
   mkdir -p uploads/reels
   ```

3. **Restart backend**:

   ```bash
   npm run dev
   ```

### Frontend Setup

1. **Install expo-image-picker** (if not already):

   ```bash
   npx expo install expo-image-picker
   ```

2. **Request permissions** (handled automatically in CreateReelScreen)

---

## 📱 Permissions Required

### iOS (Info.plist)

```xml
<key>NSCameraUsageDescription</key>
<string>We need access to your camera to record videos</string>
<key>NSPhotoLibraryUsageDescription</key>
<string>We need access to your photo library to select videos</string>
<key>NSMicrophoneUsageDescription</key>
<string>We need access to your microphone to record audio</string>
```

### Android (AndroidManifest.xml)

```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.RECORD_AUDIO" />
```

---

## 🎨 UI Components

### Create Button (Floating)

```tsx
<TouchableOpacity
  style={styles.createButton}
  onPress={() => router.push('/create-reel')}
>
  <Plus size={24} color="#fff" />
</TouchableOpacity>
```

### Video Upload Buttons

```tsx
<TouchableOpacity onPress={pickVideo}>
  <Upload size={32} color="#007AFF" />
  <Text>Upload</Text>
</TouchableOpacity>

<TouchableOpacity onPress={recordVideo}>
  <Camera size={32} color="#007AFF" />
  <Text>Record</Text>
</TouchableOpacity>
```

### Video Preview

```tsx
<Video
  source={{ uri: videoUri }}
  style={styles.video}
  resizeMode={ResizeMode.COVER}
  isLooping
  shouldPlay
/>
```

---

## 🔄 State Management Flow

### ReelContext Provider Hierarchy

```
<CustomThemeProvider>
  <UserProvider>
    <NetworkProvider>
      <SettingsProvider>
        <NotificationProvider>
          <ReelProvider>  ← Reels available everywhere!
            <App />
          </ReelProvider>
        </NotificationProvider>
      </SettingsProvider>
    </NetworkProvider>
  </UserProvider>
</CustomThemeProvider>
```

### Context Methods

| Method | Description | Usage |
|--------|-------------|-------|
| `fetchReels(page, isRefresh)` | Fetch reels from API | Initial load, pagination |
| `addNewReel(reel)` | Add reel to top | After creation |
| `updateReel(id, updates)` | Update existing reel | Edit, like, comment |
| `deleteReel(id)` | Remove reel | Delete action |
| `clearReels()` | Clear all reels | Logout |

---

## 🐛 Troubleshooting

### Issue: "Cannot find module '@/context/ReelContext'"

**Solution:** Make sure the file exists at `context/ReelContext.tsx`

### Issue: "Video upload fails"

**Solution:**

- Check backend is running
- Verify multer is installed
- Check file size (< 100MB)
- Verify file type (mp4, mov, avi, mkv)

### Issue: "New reel doesn't appear"

**Solution:**

- Verify ReelProvider is in _layout.tsx
- Check addNewReel() is called after upload
- Verify navigation happens after addNewReel()

### Issue: "Permission denied"

**Solution:**

- Check app permissions in device settings
- Verify Info.plist / AndroidManifest.xml

---

## 📊 API Endpoints

### Upload Reel

```
POST /api/posts/upload-reel
Authorization: Bearer <token>
Content-Type: multipart/form-data

Body:
- video: File (required)
- caption: String (optional)
- music: String (optional)

Response:
{
  _id: "...",
  user: { name, handle, avatar },
  type: "reel",
  uri: "/uploads/reels/...",
  videoUri: "/uploads/reels/...",
  caption: "...",
  music: "...",
  likes: [],
  comments: [],
  views: 0,
  shares: 0,
  createdAt: "..."
}
```

### Get Reels

```
GET /api/posts/reels?page=1&limit=10

Response:
[
  { _id, user, type, uri, videoUri, caption, ... },
  ...
]
```

---

## ✅ Testing Checklist

- [ ] Can open Create Reel screen
- [ ] Can upload video from gallery
- [ ] Can record video with camera
- [ ] Video preview plays correctly
- [ ] Can add caption
- [ ] Can add music (optional)
- [ ] Upload shows progress
- [ ] Success alert appears
- [ ] Auto-navigates to Reels page
- [ ] New reel appears at top
- [ ] Can play the new reel
- [ ] Pull to refresh works
- [ ] Infinite scroll works

---

## 🎉 Success

You now have a complete Create Reel feature with:

- ✅ Video upload/recording
- ✅ Real-time updates
- ✅ Global state management
- ✅ Automatic navigation
- ✅ Beautiful UI
- ✅ File validation
- ✅ Progress indicators
- ✅ Error handling

**Your users can now create and share reels seamlessly! 🚀**

---

## 📚 Related Documentation

- **REELS_IMPLEMENTATION_GUIDE.md** - Full reels implementation
- **REELS_QUICK_REFERENCE.md** - Quick tips
- **REELS_SUCCESS.md** - Success summary

---

**Built with ❤️ for the Vibe social media app**
