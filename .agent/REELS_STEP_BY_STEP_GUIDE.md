# 🎬 Building Instagram Reels in React Native - Complete Step-by-Step Guide

**From Zero to Production-Ready Reels Feed**

---

## 📋 What We're Building

A full-featured vertical video feed with:

- ✅ Auto-playing videos (one at a time)
- ✅ Smooth vertical scrolling with snap
- ✅ Interactive UI (like, comment, share)
- ✅ User profiles and follow buttons
- ✅ Audio attribution
- ✅ Optimized performance

---

## 🛠 Step-by-Step Implementation

### 📌 Step 1: ReelComponent - The Main Container

This is the **core component** that manages scrolling, visibility tracking, and rendering.

```tsx
// app/(tabs)/reels.tsx
import { Animated, StyleSheet, View, StatusBar } from 'react-native';
import React, { useRef, useState, useCallback } from 'react';
import { useWindowDimensions } from 'react-native';
import FeedRow from '@/components/FeedRow';

const ReelsScreen = () => {
  const { height } = useWindowDimensions();
  const scrollY = useRef(new Animated.Value(0)).current;
  const [scrollInfo, setScrollInfo] = useState({ isViewable: true, index: 0 });
  const refFlatList = useRef(null);

  // Viewability configuration - when is a reel "visible"?
  const viewabilityConfig = useRef({ 
    viewAreaCoveragePercentThreshold: 80 // 80% visible = active
  });

  /**
   * Track which reel is currently visible
   * This is called whenever the visible items change
   */
  const onViewableItemsChanged = useCallback(({ changed }) => {
    if (changed.length > 0) {
      setScrollInfo({
        isViewable: changed[0].isViewable,
        index: changed[0].index,
      });
    }
  }, []);

  /**
   * CRITICAL: getItemLayout for performance
   * Tells FlatList the exact size of each item
   * Prevents expensive layout calculations
   */
  const getItemLayout = useCallback(
    (_, index) => ({
      length: height,
      offset: height * index,
      index,
    }),
    [height],
  );

  /**
   * Key extractor - must be unique and stable
   */
  const keyExtractor = useCallback(item => `${item.id}`, []);

  /**
   * Animated scroll handler
   * Tracks scroll position for animations
   */
  const onScroll = useCallback(
    Animated.event(
      [{ nativeEvent: { contentOffset: { y: scrollY } } }],
      { useNativeDriver: true }
    ),
    [],
  );

  /**
   * Render each reel
   * Pass visibility info to control video playback
   */
  const renderItem = useCallback(
    ({ item, index }) => {
      const { index: scrollIndex } = scrollInfo;
      const isNext = Math.abs(index - scrollIndex) <= 1; // Preload adjacent reels
      const isVisible = scrollIndex === index; // Only this reel plays

      return (
        <FeedRow
          data={item}
          index={index}
          isNext={isNext}
          visible={scrollInfo}
          isVisible={isVisible}
        />
      );
    },
    [scrollInfo],
  );

  return (
    <View style={styles.flexContainer}>
      <StatusBar barStyle="light-content" backgroundColor="black" />
      <Animated.FlatList
        // SCROLL BEHAVIOR
        pagingEnabled // Snap to each reel
        showsVerticalScrollIndicator={false}
        decelerationRate="fast"
        bounces={false}
        
        // REFS & CALLBACKS
        ref={refFlatList}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig.current}
        onScroll={onScroll}
        
        // DATA
        data={reels}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        
        // PERFORMANCE
        getItemLayout={getItemLayout}
        removeClippedSubviews
        onEndReachedThreshold={0.2}
        automaticallyAdjustContentInsets
      />
    </View>
  );
};

export default ReelsScreen;

const styles = StyleSheet.create({
  flexContainer: { 
    flex: 1, 
    backgroundColor: 'black' 
  },
});
```

---

### 🎞 Step 2: FeedRow - Individual Reel Container

Each reel is wrapped in `FeedRow` which combines video + UI elements.

```tsx
// components/FeedRow.tsx
import { StyleSheet, View } from 'react-native';
import React from 'react';
import VideoComponent from './VideoComponent';
import FeedFooter from './FeedFooter';
import FeedSideBar from './FeedSideBar';
import FeedHeader from './FeedHeader';

/**
 * FeedRow - Container for each reel
 * 
 * Combines:
 * - VideoComponent (the actual video)
 * - FeedHeader (title, camera icon)
 * - FeedSideBar (like, comment, share)
 * - FeedFooter (user info, caption)
 */
const FeedRow = ({ data, index, visible, isVisible, isNext }) => {
  return (
    <View>
      {/* Background Video */}
      <VideoComponent 
        data={data} 
        isNext={isNext} 
        isVisible={isVisible} 
      />
      
      {/* Overlay UI Elements */}
      <FeedHeader index={index} />
      <FeedSideBar data={data} />
      <FeedFooter data={data} />
    </View>
  );
};

export default FeedRow;
```

---

### 🎥 Step 3: VideoComponent - The Video Player

Handles video playback with auto-play/pause logic.

```tsx
// components/VideoComponent.tsx
import { StyleSheet, Platform, useWindowDimensions } from 'react-native';
import React, { useMemo } from 'react';
import { VideoView, useVideoPlayer } from 'expo-video';
import LinearGradient from 'react-native-linear-gradient';

/**
 * VideoComponent - Plays video with auto-play logic
 * 
 * Key Features:
 * - Auto-plays when visible
 * - Pauses when not visible
 * - Muted by default (for autoplay)
 * - Gradient overlay for better text readability
 */
const VideoComponent = ({ data, isVisible }) => {
  const { height } = useWindowDimensions();

  // Create video player
  const player = useVideoPlayer(data.videoUrl, (player) => {
    player.loop = true;
    player.muted = true; // Start muted for autoplay
  });

  // Control playback based on visibility
  React.useEffect(() => {
    if (isVisible) {
      player.play();
    } else {
      player.pause();
    }
  }, [isVisible, player]);

  const videoStyle = useMemo(
    () => styles.video(height), 
    [height]
  );

  return (
    <>
      <VideoView
        player={player}
        style={videoStyle}
        contentFit="cover"
        nativeControls={false}
      />
      
      {/* Gradient overlay for better UI visibility */}
      <LinearGradient
        colors={[
          '#000000F0',
          '#000000D0',
          '#000000A0',
          '#00000070',
          '#00000040',
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 0.5 }}
        style={styles.controlsContainer}
      />
    </>
  );
};

export default VideoComponent;

const styles = StyleSheet.create({
  video: height => ({
    backgroundColor: 'black',
    width: '100%',
    height: Platform.OS === 'ios' ? height : height - 50,
  }),
  controlsContainer: {
    ...StyleSheet.absoluteFillObject,
  },
});
```

---

### 🎭 Step 4: UI Components - Making It Engaging

#### 🏷 FeedHeader - Title & Camera Icon

```tsx
// components/FeedHeader.tsx
import { SafeAreaView, StyleSheet, Text, Platform } from 'react-native';
import React from 'react';
import { Camera } from 'lucide-react-native';

/**
 * FeedHeader - Top overlay
 * 
 * Shows:
 * - "Reels" title (only on first reel)
 * - Camera icon (create new reel)
 */
const FeedHeader = ({ index }) => {
  return (
    <SafeAreaView style={styles.container}>
      {index === 0 && (
        <Text style={styles.title}>Reels</Text>
      )}
      <Camera color="white" size={24} style={styles.alignRight} />
    </SafeAreaView>
  );
};

export default FeedHeader;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'absolute',
    top: Platform.OS === 'ios' ? 65 : 10,
    marginHorizontal: 20,
    width: '100%',
  },
  alignRight: {
    position: 'absolute',
    right: 25,
  },
  title: {
    color: '#fff',
    flex: 1,
    fontSize: 24,
    fontWeight: '700',
  },
});
```

---

#### 👤 FeedFooter - User Info & Caption

```tsx
// components/FeedFooter.tsx
import { StyleSheet, View, Text, Image, Platform } from 'react-native';
import React from 'react';
import { Music, CheckCircle } from 'lucide-react-native';

/**
 * FeedFooter - Bottom overlay
 * 
 * Shows:
 * - User profile picture
 * - Username & verification badge
 * - Audio attribution
 * - Follow button
 * - Caption/description
 * - Followed by info
 */
const FeedFooter = ({ data }) => {
  const { 
    thumbnailUrl, 
    title, 
    description, 
    isLive, 
    friends 
  } = data;
  
  const followerCount = Math.floor(Math.random() * 20) + 1;

  return (
    <View style={styles.container}>
      {/* User Profile Section */}
      <View style={styles.profileContainer}>
        <Image 
          source={{ uri: thumbnailUrl }} 
          style={styles.thumbnail} 
          resizeMode="cover" 
        />
        
        <View style={styles.userInfo}>
          <View style={styles.userNameContainer}>
            <Text style={styles.nameStyle}>{title}</Text>
            {isLive && <CheckCircle size={14} color="#1DA1F2" />}
          </View>
          
          <View style={styles.audioContainer}>
            <Music width={10} height={10} color="white" />
            <Text style={styles.audioText}>Original audio</Text>
          </View>
        </View>
        
        <View style={styles.followButton}>
          <Text style={styles.followText}>Follow</Text>
        </View>
      </View>

      {/* Caption */}
      <Text numberOfLines={2} style={styles.desc}>
        {description}
      </Text>

      {/* Followed By Section */}
      <View style={styles.friendsContainer}>
        {friends?.map((item, index) => (
          <Image 
            key={index} 
            source={{ uri: item.imageUrl }} 
            style={styles.friendImage} 
          />
        ))}
        <Text style={styles.followInfo}>
          {`Followed by ${friends?.[0]?.name || 'others'} and ${followerCount} others`}
        </Text>
      </View>
    </View>
  );
};

export default FeedFooter;

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 120 : 90,
    marginLeft: 20,
  },
  profileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  thumbnail: {
    width: 30,
    height: 30,
    borderRadius: 20,
    overflow: 'hidden',
  },
  userInfo: {
    marginLeft: 10,
  },
  userNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  nameStyle: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  audioContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 6,
  },
  audioText: {
    color: '#fff',
    fontSize: 11,
  },
  followButton: {
    marginLeft: 24,
    borderWidth: 1,
    borderColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  followText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  desc: {
    color: '#fff',
    width: 300,
    fontSize: 13,
  },
  friendsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  friendImage: {
    width: 15,
    height: 15,
    borderRadius: 150,
    marginRight: -5,
    borderWidth: 1,
    borderColor: 'white',
  },
  followInfo: {
    color: '#fff',
    marginLeft: 13,
    fontSize: 12,
  },
});
```

---

#### ❤️ FeedSideBar - Action Buttons

```tsx
// components/FeedSideBar.tsx
import { StyleSheet, View, Text, Image, Platform } from 'react-native';
import React from 'react';
import { Heart, MessageCircle, Share2, MoreVertical } from 'lucide-react-native';

/**
 * IconWithText - Reusable icon + count component
 */
const IconWithText = ({ IconComponent, count }) => (
  <View style={styles.iconContainer}>
    <IconComponent color="white" size={28} />
    <Text style={styles.countText}>{count}</Text>
  </View>
);

/**
 * FeedSideBar - Right side action buttons
 * 
 * Shows:
 * - Like button + count
 * - Comment button + count
 * - Share button + count
 * - More options menu
 * - Spinning music disc (user avatar)
 */
const FeedSideBar = ({ data }) => {
  const { likes, comments, shares, thumbnailUrl } = data;

  return (
    <View style={styles.container}>
      <IconWithText IconComponent={Heart} count={likes} />
      <IconWithText IconComponent={MessageCircle} count={comments} />
      <IconWithText IconComponent={Share2} count={shares} />
      <MoreVertical color="white" size={28} />
      
      {/* Music Disc (Avatar) */}
      <View style={styles.thumbnailContainer}>
        <Image
          source={{ uri: thumbnailUrl }}
          style={styles.thumbnail}
          resizeMode="cover"
        />
      </View>
    </View>
  );
};

export default FeedSideBar;

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 120 : 90,
    alignSelf: 'flex-end',
    alignItems: 'center',
    gap: 20,
    right: 20,
  },
  iconContainer: {
    alignItems: 'center',
  },
  countText: {
    color: '#fff',
    marginTop: 4,
    fontSize: 12,
    fontWeight: '600',
  },
  thumbnailContainer: {
    borderWidth: 3,
    borderColor: '#fff',
    borderRadius: 8,
    overflow: 'hidden',
    marginTop: 10,
  },
  thumbnail: {
    width: 24,
    height: 24,
    borderRadius: 8,
  },
});
```

---

## 🎨 Advanced Enhancements

### 1. **Spinning Music Disc Animation**

```tsx
import { Animated } from 'react-native';

const spinValue = useRef(new Animated.Value(0)).current;

useEffect(() => {
  if (isVisible) {
    Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 3000,
        useNativeDriver: true,
      })
    ).start();
  }
}, [isVisible]);

const spin = spinValue.interpolate({
  inputRange: [0, 1],
  outputRange: ['0deg', '360deg'],
});

<Animated.View style={{ transform: [{ rotate: spin }] }}>
  <Image source={{ uri: thumbnailUrl }} />
</Animated.View>
```

### 2. **Double-Tap to Like**

```tsx
import { TapGestureHandler } from 'react-native-gesture-handler';

const handleDoubleTap = () => {
  setIsLiked(true);
  // Show heart animation
};

<TapGestureHandler
  numberOfTaps={2}
  onActivated={handleDoubleTap}
>
  <VideoView player={player} />
</TapGestureHandler>
```

### 3. **Progress Bar**

```tsx
const [progress, setProgress] = useState(0);

useEffect(() => {
  const interval = setInterval(() => {
    if (player.status === 'playing') {
      setProgress(player.currentTime / player.duration);
    }
  }, 100);
  
  return () => clearInterval(interval);
}, [player]);

<View style={styles.progressBar}>
  <View style={[styles.progress, { width: `${progress * 100}%` }]} />
</View>
```

---

## 🎬 Final Thoughts

Congratulations! 🎉 You've built a **production-ready Reels feed** with:

✅ Auto-playing videos  
✅ Smooth scrolling with snap  
✅ Interactive UI elements  
✅ User profiles & follow buttons  
✅ Audio attribution  
✅ Optimized performance  

### 🚀 Next Steps

Try adding:

- 🔥 Swipe gestures for navigation
- 📌 Video caching for offline playback
- 🎶 Background music support
- 💾 Save to favorites
- 📊 View analytics

**Now go build your viral Reels app!** 🎬✨

---

**Built with ❤️ for React Native developers**

*Last updated: 2025-12-19*
