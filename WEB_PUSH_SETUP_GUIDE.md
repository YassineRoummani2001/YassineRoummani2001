# 🌐 Web Push Notifications Setup Guide

## Overview

This guide will help you set up Firebase Cloud Messaging (FCM) for web push notifications in your Expo app.

---

## 📋 Prerequisites

- Firebase account (free)
- Your app already has mobile push working ✅

---

## 🔧 Step-by-Step Setup

### Step 1: Create Firebase Project

1. **Go to Firebase Console**
   - Visit: <https://console.firebase.google.com/>
   - Click "Add project" or "Create a project"

2. **Project Setup**

   ```
   Project name: Vibe
   Enable Google Analytics: Optional (you can disable it)
   Click "Create project"
   ```

3. **Wait for project creation** (takes ~30 seconds)

---

### Step 2: Register Web App

1. **In Firebase Console**, click the **Web icon** (</>) to add a web app

2. **Register app:**

   ```
   App nickname: Vibe Web
   ☑ Also set up Firebase Hosting (optional)
   Click "Register app"
   ```

3. **Copy Firebase Config** - You'll see something like:

   ```javascript
   const firebaseConfig = {
     apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
     authDomain: "vibe-xxxxx.firebaseapp.com",
     projectId: "vibe-xxxxx",
     storageBucket: "vibe-xxxxx.appspot.com",
     messagingSenderId: "123456789012",
     appId: "1:123456789012:web:xxxxxxxxxxxxx"
   };
   ```

   **Save this!** You'll need it in Step 4.

---

### Step 3: Enable Cloud Messaging

1. **In Firebase Console**, go to:
   - Project Settings (gear icon) → Cloud Messaging tab

2. **Generate Web Push Certificates**
   - Scroll to "Web Push certificates"
   - Click "Generate key pair"
   - **Copy the VAPID key** (starts with "B...")

   Example: `BNxXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX`

   **Save this!** This is your VAPID public key.

---

### Step 4: Install Firebase SDK

```bash
# In your project root
npm install firebase
```

---

### Step 5: Update app.json

Add Firebase configuration to your `app.json`:

```json
{
  "expo": {
    "web": {
      "output": "static",
      "favicon": "./assets/images/favicon.png",
      "config": {
        "firebase": {
          "apiKey": "YOUR_API_KEY_FROM_STEP_2",
          "authDomain": "YOUR_AUTH_DOMAIN",
          "projectId": "YOUR_PROJECT_ID",
          "storageBucket": "YOUR_STORAGE_BUCKET",
          "messagingSenderId": "YOUR_SENDER_ID",
          "appId": "YOUR_APP_ID",
          "measurementId": "YOUR_MEASUREMENT_ID"
        }
      }
    }
  }
}
```

**Replace** the values with your Firebase config from Step 2.

---

### Step 6: Create Firebase Config File

Create a new file: `config/firebase.ts`

```typescript
import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import Constants from 'expo-constants';

// Get Firebase config from app.json
const firebaseConfig = Constants.expoConfig?.web?.config?.firebase;

// Initialize Firebase
let app;
let messaging;

if (firebaseConfig) {
  app = initializeApp(firebaseConfig);
  
  // Initialize Firebase Cloud Messaging (only on web)
  if (typeof window !== 'undefined') {
    messaging = getMessaging(app);
  }
}

export { app, messaging };
```

---

### Step 7: Create Service Worker

Create: `public/firebase-messaging-sw.js`

```javascript
// Import Firebase scripts
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Initialize Firebase in service worker
firebase.initializeApp({
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
});

// Retrieve an instance of Firebase Messaging
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('Received background message:', payload);
  
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/icon.png'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
```

**Replace** the Firebase config values with yours from Step 2.

---

### Step 8: Update NotificationContext for Web

I'll update the `NotificationContext.tsx` to support web push.

---

### Step 9: Request Notification Permission

The updated code will automatically:

1. Request notification permission on web
2. Get FCM token for web
3. Register service worker
4. Handle incoming messages

---

## 🧪 Testing Web Push

### Test Locally

1. **Start your app:**

   ```bash
   npm start
   # Press 'w' to open in web browser
   ```

2. **Check browser console:**

   ```
   ✅ Web Push Token: [FCM token]
   ```

3. **Send test notification:**
   - Go to Firebase Console → Cloud Messaging
   - Click "Send your first message"
   - Or use the token with Expo's push service

---

## 📊 Comparison: Mobile vs Web Push

| Feature | Mobile (Expo) | Web (Firebase) |
|---------|---------------|----------------|
| **Token Format** | ExponentPushToken[...] | FCM token (long string) |
| **Service** | Expo Push Notification Service | Firebase Cloud Messaging |
| **Setup** | ✅ Already done | Requires Firebase setup |
| **Permissions** | iOS/Android system | Browser permission |
| **Background** | ✅ Works | ✅ Works (with service worker) |

---

## 🔒 Security Notes

1. **VAPID Key**: Keep your VAPID private key secure (don't commit to git)
2. **Firebase Config**: Public keys are safe to commit
3. **Server Key**: Never expose Firebase server key in client code

---

## 🐛 Troubleshooting

### "Permission denied"

- User must allow notifications in browser settings
- Check: Browser Settings → Site Settings → Notifications

### "Service worker not registered"

- Make sure `firebase-messaging-sw.js` is in `public/` folder
- Check browser console for errors

### "No token received"

- Verify Firebase config is correct
- Check VAPID key is set
- Ensure HTTPS (required for web push)

---

## 📚 Next Steps

After completing this guide:

1. Update `NotificationContext.tsx` (I'll do this)
2. Test on web browser
3. Test on mobile (already working)
4. Integrate both token types with your backend

---

## ✅ Checklist

- [ ] Created Firebase project
- [ ] Registered web app
- [ ] Generated VAPID key
- [ ] Installed Firebase SDK
- [ ] Updated `app.json` with Firebase config
- [ ] Created `config/firebase.ts`
- [ ] Created `public/firebase-messaging-sw.js`
- [ ] Updated `NotificationContext.tsx`
- [ ] Tested on web browser
- [ ] Tested on mobile device

---

**Ready to implement?** Let me know when you've completed Steps 1-3 (Firebase setup), and I'll update the code for you!
