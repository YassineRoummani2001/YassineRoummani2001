# 🔧 Upload Reel Error - Fix Guide

## ❌ Current Issue

Upload is failing with: `Error: Failed to upload reel`

## 🎯 Root Cause

The backend needs to be restarted to:

1. Load the new `multer` package
2. Register the `/api/posts/upload-reel` endpoint
3. Apply the new logging

## ✅ Solution

### Step 1: Restart Backend

1. In the terminal running `npm run dev` (backend):
   - Press **Ctrl+C** to stop the server

2. Start it again:

   ```bash
   npm run dev
   ```

3. You should see:

   ```
   🚀 Server running on http://localhost:5000
   ✅ MongoDB "vibe" database connected successfully
   ```

### Step 2: Test Upload Again

1. Open the app on your mobile device
2. Tap the "+ Create" button on Reels page
3. Upload or record a video
4. Add a caption
5. Tap "Create Reel"

### Step 3: Check Logs

**Frontend (Metro bundler):**
Look for:

```
Upload response status: 201
New reel created: { ... }
```

**Backend (terminal):**
Look for:

```
📤 Upload reel request received
User: ...
File: Present
✅ File received: reel-...
Creating post with: { ... }
✅ Post created: ...
✅ Sending response
```

---

## 🐛 If Still Failing

### Check 1: Backend Running?

```bash
# Test the endpoint
curl http://localhost:5000/
# Should return: "Vibe API is running..."
```

### Check 2: Multer Installed?

```bash
cd backend
npm list multer
# Should show: multer@...
```

### Check 3: Permissions?

The backend needs write access to create `uploads/reels/` folder.

### Check 4: File Size?

Videos must be < 100MB

### Check 5: File Type?

Only mp4, mov, avi, mkv allowed

---

## 📋 Quick Checklist

- [ ] Backend restarted with `npm run dev`
- [ ] See "Server running" message
- [ ] MongoDB connected successfully
- [ ] Frontend app refreshed
- [ ] Testing on mobile (not web)
- [ ] Video file < 100MB
- [ ] Video format: mp4/mov/avi/mkv

---

## 🔍 Debug Commands

### Test Backend

```bash
# Check if backend is running
curl http://localhost:5000/

# Check reels endpoint
curl http://localhost:5000/api/posts/reels
```

### Check Uploads Folder

```bash
cd backend
ls -la uploads/reels/
# Should show uploaded videos
```

---

## 💡 Common Issues

### Issue: "Video file is required"

**Cause:** File not being sent properly
**Fix:** Check FormData construction in create-reel.tsx

### Issue: "Upload failed with status 401"

**Cause:** Not authenticated
**Fix:** Make sure you're logged in

### Issue: "Upload failed with status 500"

**Cause:** Server error
**Fix:** Check backend terminal for error details

---

## ✅ Expected Flow

1. User selects video → FormData created
2. POST to `/api/posts/upload-reel` → Multer saves file
3. Post created in MongoDB → User details populated
4. Response sent to frontend → Added to ReelContext
5. Navigate to Reels page → New reel at top!

---

**After restarting the backend, try uploading again and check both frontend and backend logs!** 🚀
