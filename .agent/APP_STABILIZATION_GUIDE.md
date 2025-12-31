# App Stabilization & Performance Guide

## 🚨 Why Your App Refreshes Too Often

Based on the analysis of your code, the frequent refreshing and re-rendering are caused by a combination of **unstable dependencies**, **object recreation**, and **polling mechanisms**.

### 1. The "Render Item" Anti-Pattern (Major Cause)

In `message/[id].tsx`, you have defined components *inside* the main component body:

```tsx
export default function MessageScreen() {
  // ...
  // ❌ DEFINED INSIDE: Re-created on EVERY render
  const MessageContent = ({ item }) => ( ... )

  // ❌ DEFINED INSIDE: Re-created on EVERY render
  const renderMessage = ({ item }) => ( ... )

  return <FlatList renderItem={renderMessage} ... />
}
```

**Why this is bad:** React sees `renderMessage` as a *new function* every time the screen updates (e.g., when the timer ticks or a message arrives). This forces the `FlatList` to discard all its rows and re-render them from scratch, causing flickering and scroll jumps.

### 2. Context Value Instability

If your `UserContext` or `NotificationContext` provider looks like this:

```tsx
// ❌ Value object created fresh on every render
<Context.Provider value={{ user, unreadCount }}>
```

Then *every* time the provider renders, *all* consuming components (Home, Chat) will re-render, even if the data hasn't changed.

### 3. Aggressive Polling

In `message/[id].tsx`:

```tsx
// ❌ Updates state blindly
setMessages(data);
```

Even if `data` is identical to the current `messages`, React (depending on version/setup) might schedule a re-render or effect cycle. Using a deep check or ref-based check prevents this.

### 4. `useEffect` Dependency Chains

In `Home` and `Chat`, effects depend on `user` object:

```tsx
useEffect(() => { ... }, [user]);
```

If the `user` object reference changes (even with same content) due to Context updates, these effects fire again, causing API calls and potential content flashes.

---

## ✅ Optimizing the Message Screen (Step-by-Step)

### Step 1: Move Sub-Components Out

Extract `MessageContent` and `renderMessage` logic outside the main component.

### Step 2: Memoize Callbacks

Use `useCallback` for `renderItem` and event handlers.

### Step 3: Smart State Updates

Don't update state if data hasn't changed.

```tsx
if (JSON.stringify(data) !== JSON.stringify(prevMessages)) {
  setMessages(data);
}
```

### Step 4: Stabilize Context Consumption

Only select the data you need or use memoized selectors if available.

---

## 🔧 Recommended `useEffect` Pattern

```tsx
// ✅ Stable dependency pattern
const fetchRef = useRef(false);

useEffect(() => {
  if (fetchRef.current) return;
  fetchRef.current = true;
  
  // Do fetch
}, []); // Empty dependency if initialization logic
```

## 🚀 Action Plan for You

1. **Refactor `MessageScreen`**: Move `MessageContent` out.
2. **Optimize `HomeScreen`**: Wrap `fetchPosts` in `useCallback`.
3. **Check `UserContext`**: Ensure `value={useMemo(() => ({...}), [...])}` is used.
