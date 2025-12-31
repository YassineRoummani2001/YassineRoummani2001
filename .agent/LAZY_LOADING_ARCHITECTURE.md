# Lazy Loading Architecture

## Component Loading Flow

```
┌─────────────────────────────────────────────────────────────┐
│                      App Initialization                      │
│                                                               │
│  1. Load essential code only                                 │
│  2. Register lazy component imports                          │
│  3. Show initial screen                                      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    User Navigates/Scrolls                    │
│                                                               │
│  Component becomes needed                                    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   Lazy Loading Triggered                     │
│                                                               │
│  1. Show loading fallback (MinimalLoader/ScreenLoader)       │
│  2. Start dynamic import                                     │
│  3. Download component code                                  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   Component Loaded                           │
│                                                               │
│  1. Hide loading fallback                                    │
│  2. Render actual component                                  │
│  3. Component cached for future use                          │
└─────────────────────────────────────────────────────────────┘
```

## File Structure

```
Vibe/
├── utils/
│   └── lazyLoad.tsx              # Core lazy loading utility
│       ├── lazyLoad()            # Main function
│       ├── LoadingFallback       # Default loader
│       ├── MinimalLoader         # Compact loader
│       └── ScreenLoader          # Full-screen loader
│
├── config/
│   └── lazyComponents.tsx        # Pre-configured lazy components
│       ├── LazyFeedPost
│       ├── LazyReelItem
│       ├── LazyStoryList
│       └── ... (other components)
│
├── app/
│   ├── (tabs)/
│   │   ├── index.tsx             # ✅ Uses lazy loading
│   │   ├── reels.tsx             # ✅ Uses lazy loading
│   │   ├── profile.tsx
│   │   ├── gallery.tsx
│   │   └── search.tsx
│   │
│   ├── create.tsx                # Can be lazy loaded
│   ├── edit-profile.tsx          # Can be lazy loaded
│   ├── media-view.tsx            # Can be lazy loaded
│   └── ...
│
└── components/
    ├── FeedPost.tsx              # ✅ Lazy loaded
    ├── ReelItem.tsx              # ✅ Lazy loaded
    ├── StoryList.tsx             # ✅ Lazy loaded
    └── ...
```

## Bundle Splitting Strategy

### Before Lazy Loading

```
┌──────────────────────────────────────────────────────────┐
│                    Single Large Bundle                    │
│                                                            │
│  • All components loaded upfront                          │
│  • Large initial download                                 │
│  • Slower startup                                         │
│  • Higher memory usage                                    │
│                                                            │
│  Size: ~2-3 MB                                            │
└──────────────────────────────────────────────────────────┘
```

### After Lazy Loading

```
┌────────────────────┐  ┌──────────────┐  ┌──────────────┐
│   Main Bundle      │  │  FeedPost    │  │  ReelItem    │
│                    │  │   Chunk      │  │   Chunk      │
│  • Core app code   │  │              │  │              │
│  • Navigation      │  │  Loads when  │  │  Loads when  │
│  • Essential UI    │  │  needed      │  │  needed      │
│                    │  │              │  │              │
│  Size: ~1-1.5 MB   │  │  ~200-300 KB │  │  ~200-300 KB │
└────────────────────┘  └──────────────┘  └──────────────┘
         ↓                      ↓                  ↓
    Loads First          Loads on Demand    Loads on Demand
```

## Component Loading Timeline

```
Time →
0ms     ┌─────────────────────────────────────────────────────┐
        │ App Start                                            │
        │ • Load main bundle                                   │
        │ • Initialize navigation                              │
        │ • Show splash/loading screen                         │
        └─────────────────────────────────────────────────────┘

500ms   ┌─────────────────────────────────────────────────────┐
        │ Home Screen Visible                                  │
        │ • Show layout                                        │
        │ • Trigger lazy loads for visible components          │
        └─────────────────────────────────────────────────────┘

700ms   ┌─────────────────────────────────────────────────────┐
        │ StoryList Loaded                                     │
        │ • Show stories carousel                              │
        │ • Still loading FeedPost                             │
        └─────────────────────────────────────────────────────┘

900ms   ┌─────────────────────────────────────────────────────┐
        │ FeedPost Loaded                                      │
        │ • Show feed items                                    │
        │ • App fully interactive                              │
        └─────────────────────────────────────────────────────┘

User navigates to Reels →

1000ms  ┌─────────────────────────────────────────────────────┐
        │ Reels Screen                                         │
        │ • Show loading indicator                             │
        │ • Load ReelItem component                            │
        └─────────────────────────────────────────────────────┘

1200ms  ┌─────────────────────────────────────────────────────┐
        │ ReelItem Loaded                                      │
        │ • Show reel videos                                   │
        │ • Reels screen interactive                           │
        └─────────────────────────────────────────────────────┘
```

## Memory Usage Pattern

### Without Lazy Loading

```
Memory
  ↑
  │     ┌─────────────────────────────────────────────────┐
  │     │  All components loaded in memory                │
  │     │                                                  │
  │     │  • FeedPost                                      │
  │     │  • ReelItem                                      │
  │     │  • StoryList                                     │
  │     │  • All screens                                   │
  │     │  • All modals                                    │
  │     │                                                  │
  │     └─────────────────────────────────────────────────┘
  │
  └────────────────────────────────────────────────────────→ Time
```

### With Lazy Loading

```
Memory
  ↑
  │                    ┌──────┐
  │                    │Reel  │
  │          ┌─────────┤Item  │
  │          │FeedPost │      │
  │     ┌────┤         │      │
  │     │Core│         │      │
  │     │App │         │      │
  │     │    │         │      │
  │     └────┴─────────┴──────┘
  │
  └────────────────────────────────────────────────────────→ Time
       Start   Home    Scroll   Navigate
                       Down     to Reels
```

## Decision Tree: When to Lazy Load

```
                    ┌─────────────────────┐
                    │  New Component      │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │ Is it > 50KB?       │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │ YES          NO     │
                    │  │            │     │
                    │  │            └────→ Don't lazy load
                    │  │
                    │  ▼
                    │ ┌────────────────────┐
                    │ │ Used immediately?  │
                    │ └────────┬───────────┘
                    │          │
                    │ ┌────────▼────────┐
                    │ │ YES      NO     │
                    │ │  │        │     │
                    │ │  │        └────→ ✅ LAZY LOAD
                    │ │  │
                    │ │  ▼
                    │ │ ┌──────────────────┐
                    │ │ │ Critical path?   │
                    │ │ └────────┬─────────┘
                    │ │          │
                    │ │ ┌────────▼────────┐
                    │ │ │ YES      NO     │
                    │ │ │  │        │     │
                    │ │ │  │        └────→ ✅ LAZY LOAD
                    │ │ │  │
                    │ │ │  ▼
                    │ │ │  Don't lazy load
                    │ │ │  (Keep in main bundle)
                    └─┴─┴──────────────────
```

## Loading State Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    Component Requested                       │
└──────────────────────────┬──────────────────────────────────┘
                           │
                ┌──────────▼──────────┐
                │ Already loaded?     │
                └──────────┬──────────┘
                           │
            ┌──────────────┴──────────────┐
            │                             │
         YES│                             │NO
            │                             │
            ▼                             ▼
    ┌───────────────┐          ┌──────────────────┐
    │ Render        │          │ Show Fallback    │
    │ Immediately   │          │ (MinimalLoader)  │
    └───────────────┘          └────────┬─────────┘
                                        │
                              ┌─────────▼─────────┐
                              │ Start Import      │
                              │ (Dynamic)         │
                              └─────────┬─────────┘
                                        │
                              ┌─────────▼─────────┐
                              │ Download Code     │
                              │ (Network)         │
                              └─────────┬─────────┘
                                        │
                              ┌─────────▼─────────┐
                              │ Parse & Execute   │
                              │ (JavaScript)      │
                              └─────────┬─────────┘
                                        │
                              ┌─────────▼─────────┐
                              │ Cache Component   │
                              │ (Memory)          │
                              └─────────┬─────────┘
                                        │
                              ┌─────────▼─────────┐
                              │ Hide Fallback     │
                              │ Render Component  │
                              └───────────────────┘
```

## Summary

✅ **Implemented**: Lazy loading for heavy components
✅ **Benefits**: Faster startup, smaller bundle, better performance
✅ **Architecture**: Modular, reusable, type-safe
✅ **Ready**: Production-ready implementation

**Next**: Monitor performance metrics and optimize further as needed.
