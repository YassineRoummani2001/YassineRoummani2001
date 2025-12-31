# 🚀 Web + Mobile Push Notifications - Quick Setup

## ✅ What's Already Done

- ✅ Firebase SDK installed
- ✅ Code updated to support both web and mobile
- ✅ Service worker created
- ✅ Firebase config module created
- ✅ Mobile push working (iOS & Android)

---

## 📋 What You Need To Do (5 minutes)

### Step 1: Create Firebase Project (2 minutes)

1. **Go to Firebase Console:**
   - Visit: <https://console.firebase.google.com/>
   - Click "Create a project" (or use existing)

2. **Project Setup:**

   ```
   Project name: Vibe (or your preferred name)
   Enable Google Analytics: No (optional)
   Click "Create project"
   ```

---

### Step 2: Add Web App (1 minute)

1. **In Firebase Console**, click the **Web icon** `</>`

2. **Register app:**

   ```
   App nickname: Vibe Web
   Firebase Hosting: No (optional)
   Click "Register app"
   ```

3. **Copy Firebase Config** - You'll see:

   ```javascript
   const firebaseConfig = {
     apiKey: "AIzaSy...",
     authDomain: "vibe-xxxxx.firebaseapp.com",
     projectId: "vibe-xxxxx",
     storageBucket: "vibe-xxxxx.appspot.com",
     messagingSenderId: "123456789012",
     appId: "1:123456789012:web:xxxxxxxxxxxxx"
   };
   ```

   **📋 Copy this entire object!**

---

### Step 3: Get VAPID Key (1 minute)

1. **In Firebase Console:**
   - Go to Project Settings (⚙️ gear icon)
   - Click "Cloud Messaging" tab
   - Scroll to "Web Push certificates"
   - Click "Generate key pair"

2. **Copy the VAPID key** (starts with "B...")

   ```
   Example: BNxXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
   ```

   **📋 Copy this key!**

---

### Step 4: Update Your Files (1 minute)

#### A. Update `app.json`

Add Firebase config to the `web` section:

```json
{
  "expo": {
    "web": {
      "output": "static",
      "favicon": "./assets/images/favicon.png",
      "config": {
        "firebase": {
          "apiKey": "PASTE_YOUR_API_KEY",
          "authDomain": "PASTE_YOUR_AUTH_DOMAIN",
          "projectId": "PASTE_YOUR_PROJECT_ID",
          "storageBucket": "PASTE_YOUR_STORAGE_BUCKET",
          "messagingSenderId": "PASTE_YOUR_SENDER_ID",
          "appId": "PASTE_YOUR_APP_ID"
        }
      }
    }
  }
}
```

**Replace** all the `PASTE_YOUR_*` values with your Firebase config from Step 2.

#### B. Update `public/firebase-messaging-sw.js`

Replace the Firebase config (lines 11-17):

```javascript
const firebaseConfig = {
  apiKey: "PASTE_YOUR_API_KEY",
  authDomain: "PASTE_YOUR_AUTH_DOMAIN",
  projectId: "PASTE_YOUR_PROJECT_ID",
  storageBucket: "PASTE_YOUR_STORAGE_BUCKET",
  messagingSenderId: "PASTE_YOUR_SENDER_ID",
  appId: "PASTE_YOUR_APP_ID"
};
```

#### C. Update `context/NotificationContext.tsx`

Find line ~77 and replace the VAPID key:

```typescript
// Replace this line:
const vapidKey = 'YOUR_VAPID_KEY_HERE';

// With your actual VAPID key:
const vapidKey = 'PASTE_YOUR_VAPID_KEY_FROM_STEP_3';
```

---

## 🧪 Test It

### Test Mobile (Already Working)

```bash
# On your phone with Expo Go
# You should see:
✅ Expo Push Token: ExponentPushToken[...]
```

### Test Web

```bash
# In browser
npm start
# Press 'w' to open web

# Check browser console:
✅ Web Push Token (FCM): [long token string]
```

---

## 📝 Quick Checklist

- [ ] Created Firebase project
- [ ] Added web app to Firebase
- [ ] Generated VAPID key
- [ ] Updated `app.json` with Firebase config
- [ ] Updated `public/firebase-messaging-sw.js` with Firebase config
- [ ] Updated `context/NotificationContext.tsx` with VAPID key
- [ ] Tested on web browser
- [ ] Tested on mobile device

---

## 🎯 Expected Results

### Mobile (iOS/Android)

```
✅ Expo Push Token: ExponentPushToken[xxxxxxxxxxxxxx]
✅ Android notification channel configured
✅ Push token sent to backend
```

### Web

```
🌐 Registering for web push notifications...
✅ Service worker registered
✅ Web Push Token (FCM): [FCM token]
✅ Push token sent to backend
```

---

## 🐛 Troubleshooting

### "YOUR_VAPID_KEY_HERE" message on web

→ You need to replace the VAPID key in `NotificationContext.tsx`

### "Service worker registration failed"

→ Make sure `firebase-messaging-sw.js` is in the `public/` folder

### "Firebase config not found"

→ Make sure you updated `app.json` with Firebase config

### Mobile not working

→ Use physical device (not simulator)
→ Check `PUSH_NOTIFICATIONS_TROUBLESHOOTING.md`

---

## 📚 Documentation

- **Complete Guide:** `WEB_PUSH_SETUP_GUIDE.md`
- **Mobile Push:** `PUSH_NOTIFICATIONS_GUIDE.md`
- **Troubleshooting:** `PUSH_NOTIFICATIONS_TROUBLESHOOTING.md`

---

## 🎉 Summary

**What works now:**

- ✅ Mobile push (iOS & Android) - Ready to use!
- ⚠️ Web push - Needs Firebase setup (5 minutes)

**After Firebase setup:**

- ✅ Mobile push (iOS & Android)
- ✅ Web push (Chrome, Firefox, Edge, etc.)
- ✅ Unified token management
- ✅ Backend integration

---

**Total setup time: ~5 minutes** ⏱️

Follow Steps 1-4 above, and you'll have push notifications working on all platforms! 🚀
