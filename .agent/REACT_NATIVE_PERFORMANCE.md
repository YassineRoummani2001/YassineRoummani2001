# React Native Performance Optimization Guide

## 1. Common Performance Bottlenecks

- **Excessive Re-renders**: Components rendering when data hasn't changed.
- **Large Image Assets**: Loading full-resolution images for thumbnails.
- **Bridge Congestion**: Too much data passing between JS and Native threads.
- **Heavy Computations on JS Thread**: Blocking the UI.
- **Unoptimized Lists**: Rendering off-screen items.

---

## 2. Optimizing Startup

### Lazy Loading Components

Use `React.lazy` and `Suspense` (or specific React Native lazy loaders) to load heavy components only when needed.

```tsx
import React, { Suspense, lazy } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';

// Lazy load a heavy component (e.g., a complex chart or map)
const HeavyComponent = lazy(() => import('./HeavyComponent'));

export default function MyScreen() {
  return (
    <View style={{ flex: 1 }}>
      <Suspense fallback={<ActivityIndicator size="large" />}>
        <HeavyComponent />
      </Suspense>
    </View>
  );
}
```

### Deferred API Calls

Don't block the UI with network requests immediately on launch. Use `InteractionManager` to wait until animations/transitions are done.

```tsx
import { InteractionManager } from 'react-native';
import { useEffect } from 'react';

useEffect(() => {
  const task = InteractionManager.runAfterInteractions(() => {
    // Start network requests or heavy logic here
    fetchData();
  });

  return () => task.cancel();
}, []);
```

---

## 3. Optimizing FlatList

Use these props to significantly improve list performance.

```tsx
<FlatList
  data={bigDataArray}
  renderItem={renderItem}
  keyExtractor={(item) => item.id}
  
  // Optimization Props
  initialNumToRender={10}     // Render just enough to fill screen
  maxToRenderPerBatch={5}     // Render in small chunks
  windowSize={5}              // Keep 5 screens worth of items in memory (prev/current/next)
  removeClippedSubviews={true} // Unmount components off-screen (Android mainly)
  getItemLayout={(data, index) => (
    // Skip measurement if height is fixed (huge perf boost)
    { length: ITEM_HEIGHT, offset: ITEM_HEIGHT * index, index }
  )}
/>
```

---

## 4. Reducing Re-renders

Use `React.memo`, `useCallback`, and `useMemo` to prevent unnecessary updates.

### React.memo (Component level)

Prevents a child from re-rendering if props haven't changed.

```tsx
// ChildComponent.tsx
import React, { memo } from 'react';

const ChildComponent = ({ title, onClick }) => {
  console.log('Child Rendered');
  return <Text onPress={onClick}>{title}</Text>;
};

// Only re-renders if 'title' or 'onClick' ref changes
export default memo(ChildComponent);
```

### useCallback (Function level)

Prevents function re-creation on every parent render, keeping `onClick` stable for `React.memo`.

```tsx
// ParentComponent.tsx
import React, { useState, useCallback } from 'react';
import ChildComponent from './ChildComponent';

export default function Parent() {
  const [count, setCount] = useState(0);

  // Without useCallback, this function is new every render, breaking memo
  const handleClick = useCallback(() => {
    console.log('Clicked');
  }, []); // Dependencies array

  return (
    <View>
      <Text>{count}</Text>
      <ChildComponent title="Fixed Title" onClick={handleClick} />
      <Button onPress={() => setCount(c => c + 1)} title="Increment" />
    </View>
  );
}
```

### useMemo (Value level)

Caches the result of an expensive calculation.

```tsx
import React, { useMemo } from 'react';

const ExpensiveList = ({ data, filter }) => {
  // Only re-filter when data or filter string changes
  const filteredData = useMemo(() => {
    console.log('Filtering...');
    return data.filter(item => item.name.includes(filter));
  }, [data, filter]);

  return <FlatList data={filteredData} ... />;
};
```

---

## 5. Image Optimization

Use `expo-image` or `react-native-fast-image` for caching and performance. Avoid `Image` from react-native for lists.

### Using Expo Image (Recommended for Expo)

```bash
npx expo install expo-image
```

```tsx
import { Image } from 'expo-image';

<Image
  source={uri}
  style={{ width: 100, height: 100 }}
  contentFit="cover"
  transition={1000} // Smooth fade in
  cachePolicy="memory-disk" // Cache aggressively
/>
```

---

## 6. Navigation Performance

- **Use `react-native-screens`**: It uses native primitives (Fragment/UIViewController).
- **Avoid heavy components in Navigators**: Don't put massive components directly in `Drawer` or `Tab` roots if possible.
- **Freeze**: `react-navigation` often freezes inactive screens automatically, but verify.

```tsx
// In _layout.tsx (Expo Router uses native screens by default)
import { Stack } from 'expo-router';

export default function Layout() {
  return (
    <Stack screenOptions={{
      animation: 'slide_from_right', // Native animation
      presentation: 'card',
    }} />
  );
}
```

---

## 7. Performance Tools

1. **React Native Monitor**: In Developer Menu (Shake device -> "Show Perf Monitor"). Shows FPS (Frames Per Second) and RAM usage.
2. **React DevTools Profiler**: Connect React DevTools to see which components rendered and *why*.
3. **Flipper (if enabled)**: powerful debugging for network/layout/logs.
4. **`why-did-you-render`**: A library that alerts you in the console when a component re-renders redundantly.

### Basic Measurement

```tsx
const start = performance.now();
doHeavyWork();
const end = performance.now();
console.log(`Work took ${end - start}ms`);
```
