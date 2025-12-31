# Network Request Failed - Troubleshooting Guide

## ❌ Error

```
ERROR Error fetching user data: [TypeError: Network request failed]
```

## 🔍 Common Causes

### **1. Backend Server Not Running**

- Backend server stopped or crashed
- Port 5000 not accessible
- Server not started

### **2. Wrong API URL**

- iOS using wrong localhost
- Android emulator using wrong IP
- Web CORS issues

### **3. Firewall/Network Issues**

- Firewall blocking port 5000
- Network not allowing connections
- VPN interfering

### **4. Timeout Issues**

- Request taking too long
- Server not responding
- Network slow

---

## ✅ Quick Fixes

### **Fix 1: Restart Backend Server**

```bash
# Stop current server (Ctrl+C)
# Then restart:
cd backend
npm run dev
```

**Expected output:**

```
Server running on port 5000
MongoDB connected
```

### **Fix 2: Check Backend is Running**

Open browser and visit:

```
http://localhost:5000/api/health
```

Should return:

```json
{"status": "ok"}
```

### **Fix 3: Verify API_BASE_URL**

Add console log to check URL:

```tsx
import { API_BASE_URL } from '@/constants/Config';
console.log('API_BASE_URL:', API_BASE_URL);
```

**Expected values:**

- **iOS Simulator:** `http://localhost:5000`
- **Android Emulator:** `http://10.0.2.2:5000`
- **Physical Device:** `http://192.168.x.x:5000`
- **Web:** `http://localhost:5000`

### **Fix 4: Add Network Error Handling**

Update fetch calls with better error handling:

```tsx
const fetchUserData = async () => {
    try {
        console.log('Fetching from:', `${API_BASE_URL}/api/auth/user/${id}`);
        
        const response = await fetch(`${API_BASE_URL}/api/auth/user/${id}`, {
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        setUserData(data);
    } catch (error) {
        console.error('Error fetching user data:', error);
        
        // Show user-friendly error
        if (error.message === 'Network request failed') {
            Alert.alert(
                'Connection Error',
                'Cannot connect to server. Please check your internet connection and try again.',
                [{ text: 'OK' }]
            );
        }
    }
};
```

---

## 🔧 Platform-Specific Fixes

### **iOS**

If on **physical device**, update `Config.ts`:

```tsx
if (Platform.OS === 'ios') {
    if (hostUri) {
        return `http://${localhost}:5000`;
    }
    // For physical device, use your computer's IP
    return 'http://192.168.1.100:5000'; // Replace with your IP
}
```

### **Android**

If on **physical device**, update `Config.ts`:

```tsx
if (Platform.OS === 'android') {
    if (hostUri) {
        return `http://${localhost}:5000`;
    }
    // For physical device, use your computer's IP
    return 'http://192.168.1.100:5000'; // Replace with your IP
}
```

### **Web**

If getting CORS errors, update backend `server.js`:

```javascript
const cors = require('cors');

app.use(cors({
    origin: '*', // For development
    credentials: true
}));
```

---

## 🛠️ Diagnostic Steps

### **Step 1: Check Backend Server**

```bash
# In backend directory
npm run dev
```

Look for:

```
✓ Server running on port 5000
✓ MongoDB connected
```

### **Step 2: Test API Endpoint**

```bash
# Test with curl
curl http://localhost:5000/api/health

# Or use browser
http://localhost:5000/api/health
```

### **Step 3: Check Network**

```bash
# Check if port 5000 is open
netstat -an | findstr :5000

# Or on Mac/Linux
lsof -i :5000
```

### **Step 4: Get Your IP Address**

```bash
# Windows
ipconfig

# Mac/Linux
ifconfig
```

Look for IPv4 address (e.g., `192.168.1.100`)

---

## 🚀 Recommended Solution

### **1. Create Health Check Endpoint**

**`backend/routes/health.js`:**

```javascript
const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

module.exports = router;
```

**`backend/server.js`:**

```javascript
app.use('/api/health', require('./routes/health'));
```

### **2. Add Network Status Check**

**Create `utils/NetworkCheck.ts`:**

```tsx
import { API_BASE_URL } from '@/constants/Config';

export const checkNetworkConnection = async (): Promise<boolean> => {
    try {
        const response = await fetch(`${API_BASE_URL}/api/health`, {
            method: 'GET',
            timeout: 5000,
        });
        return response.ok;
    } catch (error) {
        console.error('Network check failed:', error);
        return false;
    }
};
```

### **3. Use Network Context**

Your app already has `NetworkContext.tsx` - make sure it's being used:

```tsx
import { useNetwork } from '@/context/NetworkContext';

const MyComponent = () => {
    const { isOnline } = useNetwork();

    if (!isOnline) {
        return <Text>No internet connection</Text>;
    }

    // ... rest of component
};
```

---

## 📱 Testing Checklist

- [ ] Backend server is running (`npm run dev`)
- [ ] Health endpoint works (`http://localhost:5000/api/health`)
- [ ] Correct API_BASE_URL for your platform
- [ ] Firewall allows port 5000
- [ ] No VPN interfering
- [ ] Network connection is stable

---

## 🔄 Auto-Retry Logic

Add automatic retry for failed requests:

```tsx
const fetchWithRetry = async (url: string, options = {}, retries = 3) => {
    for (let i = 0; i < retries; i++) {
        try {
            const response = await fetch(url, options);
            if (response.ok) return response;
            
            // If server error, retry
            if (response.status >= 500 && i < retries - 1) {
                await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
                continue;
            }
            
            return response;
        } catch (error) {
            if (i === retries - 1) throw error;
            await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
        }
    }
};
```

---

## ⚡ Quick Start Commands

```bash
# Terminal 1: Start Backend
cd backend
npm run dev

# Terminal 2: Start Frontend
npm start

# Then press:
# i - for iOS
# a - for Android
# w - for Web
```

---

## 📊 Common Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| `Network request failed` | Backend not running | Start backend server |
| `ECONNREFUSED` | Wrong port/IP | Check API_BASE_URL |
| `Timeout` | Server too slow | Increase timeout |
| `CORS error` | Web security | Add CORS headers |
| `ERR_CONNECTION_REFUSED` | Firewall | Allow port 5000 |

---

## ✅ Prevention

1. **Always start backend first**
2. **Use health check endpoint**
3. **Add error boundaries**
4. **Show network status**
5. **Add retry logic**
6. **Log all network errors**

---

**Status:** Follow the diagnostic steps above to identify and fix the network issue!
