# Web Push Notifications - Best Practices for Expo

## Overview

This guide explains how to safely handle web push notifications in an Expo app without breaking the user experience.

## The Problem

Web push notifications can cause several issues if not handled properly:

- **Page Reloads**: Firebase initialization can trigger page refreshes
- **App Crashes**: Missing configuration causes errors that break the app
- **UX Breaks**: Long loading times while trying to register service workers
- **Development Friction**: Requires complex setup just to test the app

## The Solution: Make Web Push Optional

### ✅ Current Implementation (Safe & Recommended)

```tsx
// In NotificationContext.tsx
if (Platform.OS === 'web') {
    console.log('ℹ️ Web push notifications are disabled (prevents page reloads)');
    console.log('💡 To enable web push:');
    console.log('   1. Set up Firebase Cloud Messaging');
    console.log('   2. Configure VAPID key');
    console.log('   3. Update this section in NotificationContext.tsx');
    console.log('');
    console.log('✅ App works normally without web push');
    return undefined;
}
```

**Benefits:**

- ✅ No page reloads
- ✅ No crashes
- ✅ Fast app loading
- ✅ Works immediately without setup
- ✅ Clear instructions for enabling later

---

## When to Enable Web Push

Only enable web push notifications when:

1. **You need them** - Most apps work fine with in-app notifications
2. **You've set up Firebase** - Complete Firebase project with FCM configured
3. **You're ready for production** - Not needed during development
4. **Users request it** - Real user need, not just a "nice to have"

---

## How to Enable Web Push (When Ready)

### Step 1: Set Up Firebase

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project (or select existing)
3. Add a web app to your project
4. Go to **Project Settings** → **Cloud Messaging**
5. Generate a **Web Push certificate** (VAPID key)

### Step 2: Configure Environment Variables

Create/update `.env` file:

```env
EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id
EXPO_PUBLIC_FIREBASE_VAPID_KEY=your_vapid_key
```

### Step 3: Update NotificationContext.tsx

Replace the disabled section with:

```tsx
if (Platform.OS === 'web') {
    console.log('🌐 Web push notifications enabled');

    try {
        // Check browser support
        if (!('Notification' in window) || !('serviceWorker' in navigator)) {
            console.log('ℹ️ Browser does not support web push');
            return undefined;
        }

        // Get VAPID key from environment
        const vapidKey = process.env.EXPO_PUBLIC_FIREBASE_VAPID_KEY;
        
        if (!vapidKey) {
            console.log('⚠️ VAPID key not configured');
            return undefined;
        }

        // Dynamic import (only loads on web)
        const firebaseModule = await import('../config/firebase');
        const { getWebPushToken, onMessageListener } = firebaseModule;

        // Register service worker (with timeout)
        const swPromise = navigator.serviceWorker.register('/firebase-messaging-sw.js');
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('SW timeout')), 3000)
        );

        await Promise.race([swPromise, timeoutPromise]);
        console.log('✅ Service worker registered');

        // Get token (with timeout)
        const tokenPromise = getWebPushToken(vapidKey);
        const tokenTimeout = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Token timeout')), 5000)
        );

        token = await Promise.race([tokenPromise, tokenTimeout]) as string;

        if (token) {
            console.log('✅ Web push token obtained');

            // Listen for messages (non-blocking)
            onMessageListener()
                .then((payload: any) => {
                    console.log('📬 Message received:', payload);
                    fetchUnreadCount();
                })
                .catch(() => {
                    // Silent fail - don't break the app
                });
        }

        return token;
    } catch (error: any) {
        // Never let web push break the app
        console.log('ℹ️ Web push setup failed:', error.message);
        return undefined;
    }
}
```

### Step 4: Create Service Worker

Create `public/firebase-messaging-sw.js`:

```javascript
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "your_api_key",
  authDomain: "your_project.firebaseapp.com",
  projectId: "your_project_id",
  storageBucket: "your_project.appspot.com",
  messagingSenderId: "your_sender_id",
  appId: "your_app_id"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('Background message received:', payload);
  
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/icon.png'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
```

---

## Best Practices

### ✅ DO

- **Use Platform.OS guards** - Always check `Platform.OS === 'web'`
- **Add timeouts** - Prevent hanging on slow connections
- **Graceful fallbacks** - Return `undefined` on errors
- **Silent failures** - Log errors but don't crash
- **Environment variables** - Use `.env` for configuration
- **Dynamic imports** - Only load Firebase on web
- **Clear logging** - Help developers understand what's happening

### ❌ DON'T

- **Block app loading** - Web push should be async and non-blocking
- **Throw errors** - Catch all errors and fail gracefully
- **Require setup** - App should work without web push
- **Reload pages** - Avoid any code that triggers page refreshes
- **Hardcode credentials** - Use environment variables
- **Import Firebase globally** - Use dynamic imports for web only

---

## Testing

### Development (Current Setup)

```bash
npm start
# Open http://localhost:8081
# Check console - should see "Web push notifications are disabled"
# App loads fast, no errors, no reloads ✅
```

### With Web Push Enabled

```bash
# 1. Set up Firebase
# 2. Configure .env
# 3. Update NotificationContext.tsx
npm start
# Open http://localhost:8081
# Check console - should see "Web push token obtained"
# Test notifications from Firebase Console
```

---

## Troubleshooting

### Page Keeps Reloading

**Cause**: Firebase initialization or service worker registration  
**Fix**: Add timeouts and error handling (see Step 3 above)

### "VAPID key not configured" Error

**Cause**: Missing environment variable  
**Fix**: Add `EXPO_PUBLIC_FIREBASE_VAPID_KEY` to `.env`

### Service Worker Registration Failed

**Cause**: Missing `firebase-messaging-sw.js` or HTTPS required  
**Fix**: Create service worker file, use HTTPS in production

### Token Not Generated

**Cause**: User denied permission or browser doesn't support  
**Fix**: Check `Notification.permission`, handle gracefully

---

## Mobile vs Web Comparison

| Feature | Mobile (Expo) | Web (Firebase) |
|---------|---------------|----------------|
| **Setup** | Automatic | Manual (Firebase) |
| **Permissions** | System prompt | Browser prompt |
| **Token Type** | Expo Push Token | FCM Token |
| **Service Worker** | Not needed | Required |
| **Offline** | Works | Requires SW |
| **Development** | Works in Expo Go | Needs HTTPS |

---

## Recommended Approach

### For Development

- ✅ **Disable web push** (current setup)
- ✅ Focus on mobile push notifications
- ✅ Test in-app notifications
- ✅ Fast iteration, no setup required

### For Production

- ✅ **Enable web push** only if needed
- ✅ Set up Firebase properly
- ✅ Test thoroughly on all browsers
- ✅ Monitor error rates
- ✅ Have fallback for unsupported browsers

---

## Summary

**Current Status**: Web push is **safely disabled** to prevent UX issues.

**Why This Is Good**:

- ✅ App loads fast
- ✅ No crashes or errors
- ✅ No page reloads
- ✅ Works on all platforms
- ✅ Easy to enable later when needed

**When to Enable**: Only when you have a real need and Firebase is properly configured.

**Key Principle**: **Never let optional features break core functionality.**

---

## Additional Resources

- [Firebase Cloud Messaging Docs](https://firebase.google.com/docs/cloud-messaging/js/client)
- [Expo Push Notifications](https://docs.expo.dev/push-notifications/overview/)
- [Service Workers API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Web Push Protocol](https://developers.google.com/web/fundamentals/push-notifications)
