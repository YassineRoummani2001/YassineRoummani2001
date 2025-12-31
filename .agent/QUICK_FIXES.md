# Quick Fixes - Deprecation & Network Errors

## ⚠️ Issue 1: ImagePicker Deprecation

**Warning:**

```
[expo-image-picker] ImagePicker.MediaTypeOptions have been deprecated. 
Use ImagePicker.MediaType or an array of ImagePicker.MediaType instead.
```

### **Quick Fix:**

Replace all instances:

```tsx
// ❌ OLD (Deprecated)
mediaTypes: ImagePicker.MediaTypeOptions.Images
mediaTypes: ImagePicker.MediaTypeOptions.Videos

// ✅ NEW (Correct)
mediaTypes: ImagePicker.MediaTypeOptions.Images  // Keep for now, still works
// OR use the new API when ready:
mediaTypes: ['Images']  // New simplified API
mediaTypes: ['Videos']
```

**Note:** The old API still works, this is just a warning. You can ignore it for now or update when convenient.

---

## ❌ Issue 2: Network Request Failed (CRITICAL)

**Errors:**

```
ERROR ❌ Error fetching posts: [TypeError: Network request failed]
ERROR Fetch reels error: [TypeError: Network request failed]
```

### **🚨 IMMEDIATE ACTION REQUIRED:**

Your backend server is NOT responding properly!

### **Step 1: Check Backend Server**

```bash
# In backend terminal, you should see:
Server running on port 5000
MongoDB connected
```

If you don't see this, **restart the backend:**

```bash
# Stop current server (Ctrl+C)
cd backend
npm run dev
```

### **Step 2: Test Backend Health**

Open browser and visit:

```
http://localhost:5000/api/health
```

Should return:

```json
{"status": "ok"}
```

If this fails, backend is NOT running!

### **Step 3: Check MongoDB**

Backend logs should show:

```
✓ MongoDB connected
```

If not, check your MongoDB connection string in `.env`:

```
MONGODB_URI=mongodb://localhost:27017/vibe
```

### **Step 4: Restart Everything**

```bash
# Terminal 1: Backend
cd backend
npm run dev

# Terminal 2: Frontend (after backend is running)
npm start -- --clear
```

---

## 🔧 Quick Diagnostic

### **Test 1: Backend Running?**

```bash
curl http://localhost:5000/api/health
```

### **Test 2: Posts Endpoint?**

```bash
curl http://localhost:5000/api/posts
```

### **Test 3: Reels Endpoint?**

```bash
curl http://localhost:5000/api/reels
```

If any fail, backend has issues!

---

## 📋 Common Causes

| Error | Cause | Fix |
|-------|-------|-----|
| Network request failed | Backend not running | Restart backend |
| Connection refused | Wrong port | Check port 5000 |
| Timeout | Server crashed | Check backend logs |
| MongoDB error | DB not connected | Check MongoDB |

---

## ✅ Solution Checklist

- [ ] Backend server is running (`npm run dev`)
- [ ] See "Server running on port 5000" in backend terminal
- [ ] See "MongoDB connected" in backend terminal
- [ ] Can access <http://localhost:5000/api/health>
- [ ] No errors in backend terminal
- [ ] Frontend restarted with `--clear` flag

---

## 🚀 Quick Start (Fresh)

```bash
# Terminal 1: Start MongoDB (if local)
mongod

# Terminal 2: Start Backend
cd backend
npm run dev

# Wait for "Server running" and "MongoDB connected"

# Terminal 3: Start Frontend
npm start -- --clear

# Then press 'i' for iOS or 'a' for Android
```

---

## 💡 If Backend Won't Start

Check backend `package.json` for the dev script:

```json
{
  "scripts": {
    "dev": "nodemon server.js"
  }
}
```

If missing, run:

```bash
node server.js
```

---

## 🔍 Backend Logs to Look For

**✅ Good:**

```
Server running on port 5000
MongoDB connected successfully
```

**❌ Bad:**

```
Error: Cannot find module
EADDRINUSE: Port 5000 already in use
MongoDB connection error
```

---

## ⚡ Emergency Fix

If nothing works:

```bash
# Kill all Node processes
taskkill /F /IM node.exe

# Restart backend
cd backend
npm install
npm run dev

# Restart frontend
npm start -- --clear
```

---

**PRIORITY: Fix the network errors first! The deprecation warning is not critical.**
