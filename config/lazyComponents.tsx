/**
 * Lazy Loading Configuration
 * 
 * This file exports lazy-loaded versions of heavy components and screens
 * to improve app performance and reduce initial bundle size.
 */

import { lazyLoad, MinimalLoader, ScreenLoader } from '@/utils/lazyLoad';

// ============================================================================
// COMPONENTS - Heavy UI components
// ============================================================================

/**
 * FeedPost - Heavy component with video support and interactions
 * Used in: Home screen, User profiles
 */
export const LazyFeedPost = lazyLoad(
    () => import('@/components/FeedPost'),
    <MinimalLoader />
);

/**
 * ReelItem - Video player component for reels
 * Used in: Reels screen
 */
export const LazyReelItem = lazyLoad(
    () => import('@/components/ReelItem'),
    <MinimalLoader />
);

/**
 * StoryList - Horizontal story carousel with images
 * Used in: Home screen
 */
export const LazyStoryList = lazyLoad(
    () => import('@/components/StoryList'),
    <MinimalLoader />
);

// ============================================================================
// SCREENS - Modal and secondary screens
// ============================================================================

/**
 * CreateScreen - Post/Reel creation modal
 * Heavy due to image picker and camera functionality
 */
export const LazyCreateScreen = lazyLoad(
    () => import('@/app/create'),
    <ScreenLoader />
);

/**
 * EditProfileScreen - Profile editing modal
 * Includes image picker and form validation
 */
export const LazyEditProfileScreen = lazyLoad(
    () => import('@/app/edit-profile'),
    <ScreenLoader />
);

/**
 * MediaViewScreen - Full-screen media viewer
 * Heavy due to video/image rendering
 */
export const LazyMediaViewScreen = lazyLoad(
    () => import('@/app/media-view'),
    <ScreenLoader />
);

/**
 * ChatScreen - Chat interface
 * Heavy due to real-time messaging
 */
export const LazyChatScreen = lazyLoad(
    () => import('@/app/chat'),
    <ScreenLoader />
);

/**
 * StoryCreateScreen - Story creation modal
 * Heavy due to camera and image processing
 */
export const LazyStoryCreateScreen = lazyLoad(
    () => import('@/app/story-create'),
    <ScreenLoader />
);

/**
 * StoryViewScreen - Story viewer modal
 * Heavy due to video playback and animations
 */
export const LazyStoryViewScreen = lazyLoad(
    () => import('@/app/story-view'),
    <ScreenLoader />
);

/**
 * UserProfileScreen - Other user's profile
 * Heavy due to posts grid and user data
 */
export const LazyUserProfileScreen = lazyLoad(
    () => import('@/app/user/[id]'),
    <ScreenLoader />
);

/**
 * DiscoverPeopleScreen - User discovery screen
 * Heavy due to user list and images
 */
export const LazyDiscoverPeopleScreen = lazyLoad(
    () => import('@/app/discover-people'),
    <ScreenLoader />
);

/**
 * UsersListScreen - Followers/Following list
 * Heavy due to user list rendering
 */
export const LazyUsersListScreen = lazyLoad(
    () => import('@/app/users-list'),
    <ScreenLoader />
);

// ============================================================================
// USAGE EXAMPLES
// ============================================================================

/*
// In a screen component:
import { LazyFeedPost } from '@/config/lazyComponents';

export default function MyScreen() {
  return (
    <View>
      <LazyFeedPost post={postData} />
    </View>
  );
}

// In a navigation setup:
import { LazyCreateScreen } from '@/config/lazyComponents';

<Stack.Screen 
  name="create" 
  component={LazyCreateScreen}
  options={{ presentation: 'modal' }}
/>
*/
