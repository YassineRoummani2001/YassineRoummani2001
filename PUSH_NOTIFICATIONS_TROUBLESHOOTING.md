# 🚨 Push Notifications - Quick Troubleshooting

## Common Errors & Quick Fixes

### ❌ Error: "EXPERIENCE_NOT_FOUND"

**What it means:** Expo can't find your project

**Quick Fix:**

```typescript
// Make sure projectId matches app.json
const projectId = 'db5ed8aa-713b-4876-9d33-1d01676f4e66';

await Notifications.getExpoPushTokenAsync({
    projectId: projectId  // ✅ Must include this!
});
```

**Verify:**

1. Check `app.json` → `extra.eas.projectId`
2. Make sure it matches the projectId in your code
3. No typos or extra spaces

---

### ❌ Error: "Push token not generated"

**Causes:**

1. Running on simulator/emulator ❌
2. Missing projectId ❌
3. Permissions denied ❌

**Quick Fixes:**

```bash
# ✅ Use physical device
# iOS: Use real iPhone/iPad
# Android: Use real Android phone

# ✅ Check permissions
# Go to device Settings → Vibe → Notifications → Allow
```

```typescript
// ✅ Always check device
if (!Device.isDevice) {
    console.log('Use physical device!');
    return;
}

// ✅ Always request permissions
const { status } = await Notifications.requestPermissionsAsync();
if (status !== 'granted') {
    console.log('Permission denied');
    return;
}
```

---

### ❌ Android: Notifications not showing

**Quick Fix:**

```typescript
// ✅ Configure notification channel (Android 8.0+)
if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.MAX,
        sound: 'default',
    });
}
```

**Also check:**

```json
// app.json
{
  "android": {
    "package": "com.vibe.app",  // ✅ Required!
    "permissions": [
      "NOTIFICATIONS"  // ✅ Required!
    ]
  }
}
```

---

### ❌ iOS: Notifications not working

**Quick Fixes:**

1. **Use physical device** (simulators don't support push)
2. **Check permissions:**
   - Settings → Vibe → Notifications → Allow
3. **For production:**

   ```bash
   eas credentials
   eas build --platform ios
   ```

---

### ❌ Web: Notifications not working

**Expected!** Web requires additional setup:

```typescript
// Current implementation
if (Platform.OS === 'web') {
    console.log('Web push requires VAPID configuration');
    return undefined;  // ✅ This is correct for now
}
```

**To enable web push:**

1. Set up Firebase Cloud Messaging
2. Generate VAPID keys
3. Configure in `app.json`
4. Implement service worker

---

## ✅ Quick Checklist

Before asking "why isn't it working?":

- [ ] Using **physical device** (not simulator)
- [ ] `projectId` in code **matches** `app.json`
- [ ] **Permissions granted** in device settings
- [ ] Android has **package name** in `app.json`
- [ ] iOS has **bundleIdentifier** in `app.json`
- [ ] Checked **console for errors**
- [ ] Token appears in console: `ExponentPushToken[...]`

---

## 🔍 Debug Steps

### Step 1: Check Console Output

**Good output:**

```
✅ Expo Push Token: ExponentPushToken[xxxxxxxxxxxxxx]
✅ Android notification channel configured
```

**Bad output:**

```
❌ Must use physical device for Push Notifications
❌ Permission not granted for push notifications
❌ Error getting push token: EXPERIENCE_NOT_FOUND
```

### Step 2: Verify Configuration

```bash
# Check app.json
cat app.json | grep projectId
# Should show: "projectId": "db5ed8aa-713b-4876-9d33-1d01676f4e66"

# Check if it matches your code
grep "projectId" context/NotificationContext.tsx
# Should show: const projectId = 'db5ed8aa-713b-4876-9d33-1d01676f4e66';
```

### Step 3: Test Token

```bash
# Visit: https://expo.dev/notifications
# Paste your token
# Send test notification
# Should receive it on device
```

---

## 📱 Platform-Specific Notes

### iOS

- ✅ Works in Expo Go (development)
- ✅ Works in standalone builds
- ❌ Does NOT work in simulator
- 🔐 Production requires Apple Developer account

### Android

- ✅ Works in Expo Go (development)
- ✅ Works in standalone builds
- ❌ Does NOT work in emulator
- ✅ No additional setup needed for development

### Web

- ⚠️ Requires Firebase/VAPID setup
- ⚠️ Not implemented by default
- ⚠️ Needs service worker
- 📚 See full guide for implementation

---

## 🎯 Most Common Mistake

**Forgetting to include `projectId`:**

```typescript
// ❌ WRONG - Will cause EXPERIENCE_NOT_FOUND
await Notifications.getExpoPushTokenAsync();

// ✅ CORRECT - Include projectId
await Notifications.getExpoPushTokenAsync({
    projectId: 'db5ed8aa-713b-4876-9d33-1d01676f4e66'
});
```

---

## 🚀 Quick Test

```bash
# 1. Start app on physical device
npm start

# 2. Check console for token
# Look for: ✅ Expo Push Token: ExponentPushToken[...]

# 3. Copy token

# 4. Send test notification
curl -H "Content-Type: application/json" \
     -X POST https://exp.host/--/api/v2/push/send \
     -d '{
  "to": "YOUR_TOKEN_HERE",
  "title": "Test",
  "body": "It works!"
}'

# 5. Should receive notification on device
```

---

## 📞 Still Not Working?

1. **Restart the app** completely
2. **Clear Expo cache:** `npx expo start -c`
3. **Reinstall app** on device
4. **Check device settings** → Notifications → Vibe → Enabled
5. **Try different physical device**
6. **Check full guide:** `PUSH_NOTIFICATIONS_GUIDE.md`

---

## ✅ Success Indicators

You know it's working when you see:

```
✅ Expo Push Token: ExponentPushToken[xxxxxxxxxxxxxx]
✅ Android notification channel configured (Android only)
```

And your backend receives the token successfully.

---

## 🎉 Summary

**Most issues are caused by:**

1. Using simulator instead of physical device (60%)
2. Missing or wrong projectId (30%)
3. Permissions not granted (10%)

**Quick fix for 90% of issues:**

- Use physical device
- Include projectId in getExpoPushTokenAsync()
- Grant permissions

That's it! 🚀
