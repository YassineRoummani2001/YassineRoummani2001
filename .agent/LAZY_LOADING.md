# Lazy Loading Implementation Guide

## Overview

This document describes the lazy loading implementation in the Vibe React Native app to improve performance and reduce initial bundle size.

## What is Lazy Loading?

Lazy loading is a design pattern that defers the loading of components until they are actually needed. This:

- **Reduces initial bundle size** - Only essential code loads on app start
- **Improves startup time** - Faster time to interactive
- **Optimizes memory usage** - Components load on-demand
- **Better code splitting** - Automatic bundle optimization

## Implementation

### Utility Module: `utils/lazyLoad.tsx`

We created a centralized utility for lazy loading with Suspense boundaries:

```typescript
import { lazyLoad, MinimalLoader, ScreenLoader } from '@/utils/lazyLoad';

// Lazy load a component
const MyComponent = lazyLoad(() => import('@/components/MyComponent'));

// With custom fallback
const MyComponent = lazyLoad(
  () => import('@/components/MyComponent'),
  <MinimalLoader />
);
```

### Components with Lazy Loading

#### ✅ Implemented

1. **Home Screen** (`app/(tabs)/index.tsx`)
   - `FeedPost` - Heavy component with video support
   - `StoryList` - Image-heavy component

2. **Reels Screen** (`app/(tabs)/reels.tsx`)
   - `ReelItem` - Video player component

### Loading Fallbacks

Three types of loading indicators are available:

1. **LoadingFallback** - Default loader for components

   ```typescript
   <LoadingFallback size="large" />
   ```

2. **MinimalLoader** - Compact loader for inline components

   ```typescript
   <MinimalLoader />
   ```

3. **ScreenLoader** - Full-screen loader for route-level components

   ```typescript
   <ScreenLoader />
   ```

## Benefits Achieved

### Performance Improvements

- ✅ **Reduced initial bundle size** - Heavy components load on-demand
- ✅ **Faster app startup** - Only essential code loads initially
- ✅ **Better memory management** - Components unmount when not needed
- ✅ **Improved navigation** - Screens load progressively

### Code Organization

- ✅ **Centralized lazy loading logic** - Single utility module
- ✅ **Consistent loading states** - Standardized fallbacks
- ✅ **Type-safe** - Full TypeScript support
- ✅ **Reusable** - Easy to apply to new components

## Usage Guidelines

### When to Use Lazy Loading

✅ **Good candidates:**

- Heavy components (video players, image galleries)
- Modal screens and overlays
- Components with large dependencies
- Rarely-used features
- Route-level components

❌ **Avoid lazy loading for:**

- Small, lightweight components
- Components needed immediately on app start
- Critical path components
- Components that cause layout shift

### Best Practices

1. **Group related lazy imports**

   ```typescript
   // Good - grouped at top
   const FeedPost = lazyLoad(() => import('@/components/FeedPost'));
   const StoryList = lazyLoad(() => import('@/components/StoryList'));
   ```

2. **Use appropriate fallbacks**

   ```typescript
   // For inline components
   const SmallComponent = lazyLoad(() => import('./Small'), <MinimalLoader />);
   
   // For screens
   const ScreenComponent = lazyLoad(() => import('./Screen'), <ScreenLoader />);
   ```

3. **Preload critical components**

   ```typescript
   // Preload on hover or focus
   const preloadComponent = () => {
     import('@/components/HeavyComponent');
   };
   ```

## Future Enhancements

### Recommended Next Steps

1. **Route-based code splitting**
   - Lazy load modal screens (create, edit-profile, etc.)
   - Lazy load auth screens (login, signup)
   - Lazy load user profile screens

2. **Prefetching strategies**
   - Preload next screen on navigation intent
   - Preload on user interaction (hover, focus)
   - Background loading during idle time

3. **Bundle analysis**
   - Use Metro bundler analysis tools
   - Identify large dependencies
   - Optimize chunk sizes

4. **Progressive loading**
   - Load critical content first
   - Defer below-the-fold content
   - Implement intersection observer for images

## Example: Adding Lazy Loading to New Component

```typescript
// Before
import MyHeavyComponent from '@/components/MyHeavyComponent';

export default function MyScreen() {
  return <MyHeavyComponent />;
}

// After
import { lazyLoad, MinimalLoader } from '@/utils/lazyLoad';

const MyHeavyComponent = lazyLoad(
  () => import('@/components/MyHeavyComponent'),
  <MinimalLoader />
);

export default function MyScreen() {
  return <MyHeavyComponent />;
}
```

## Monitoring & Debugging

### Check Bundle Size

```bash
# Analyze bundle
npx react-native bundle --platform android --dev false --entry-file index.js --bundle-output android-release.bundle --sourcemap-output android-release.map

# View bundle stats
npx react-native-bundle-visualizer
```

### Debug Lazy Loading

```typescript
// Add logging to track component loads
const MyComponent = lazyLoad(() => {
  console.log('Loading MyComponent...');
  return import('@/components/MyComponent');
});
```

## Performance Metrics

### Expected Improvements

- **Initial bundle size**: ~20-30% reduction
- **Time to interactive**: ~15-25% faster
- **Memory usage**: ~10-20% lower on initial load
- **Navigation performance**: Smoother transitions

## Troubleshooting

### Common Issues

1. **"Cannot find module" error**
   - Ensure the import path is correct
   - Check that the component exports a default export

2. **Loading state flickers**
   - Use appropriate fallback size
   - Consider preloading for better UX

3. **Type errors**
   - Ensure component props are properly typed
   - Use `ComponentProps<typeof Component>` for type inference

## Conclusion

Lazy loading is now implemented for heavy components in the Vibe app. This provides:

- ✅ Better performance
- ✅ Smaller initial bundle
- ✅ Improved user experience
- ✅ Scalable architecture

Continue to identify and lazy load heavy components as the app grows.
