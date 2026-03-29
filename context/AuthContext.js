import { API_BASE_URL } from '@/constants/Config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { UserContext } from './UserContext';
// console.log('📦 AuthContext Module Evaluated.');

const TOKEN_KEY = 'vibe_auth_token';
const USER_KEY = 'vibe_user_data';

// Helper for cross-platform secure storage
const safeTokenStorage = {
    async set(token) {
        try {
            const isAvailable = await SecureStore.isAvailableAsync();
            if (isAvailable) return await SecureStore.setItemAsync(TOKEN_KEY, token);
            return await AsyncStorage.setItem(TOKEN_KEY, token);
        } catch (e) {
            return await AsyncStorage.setItem(TOKEN_KEY, token);
        }
    },
    async get() {
        try {
            const isAvailable = await SecureStore.isAvailableAsync();
            if (isAvailable) return await SecureStore.getItemAsync(TOKEN_KEY);
            return await AsyncStorage.getItem(TOKEN_KEY);
        } catch (e) {
            return await AsyncStorage.getItem(TOKEN_KEY);
        }
    },
    async remove() {
        try {
            const isAvailable = await SecureStore.isAvailableAsync();
            if (isAvailable) return await SecureStore.deleteItemAsync(TOKEN_KEY);
            return await AsyncStorage.removeItem(TOKEN_KEY);
        } catch (e) {
            return await AsyncStorage.removeItem(TOKEN_KEY);
        }
    }
};

export const UserProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadStoredUser = async () => {
            try {
                const token = await safeTokenStorage.get();
                const userJson = await AsyncStorage.getItem(USER_KEY);

                if (token && userJson) {
                    const userData = JSON.parse(userJson);
                    setUser({ ...userData, token });
                    // console.log('✅ User restored from storage');
                } else {
                    // console.log('ℹ️ No user session found');
                }
            } catch (error) {
                console.error('❌ Error loading user execution:', error);
            } finally {
                setLoading(false);
            }
        };
        loadStoredUser();
    }, []);

    const logout = useCallback(async () => {
        try {
            // console.log('🚪 Logging out...');
            setUser(null);
            await Promise.all([
                AsyncStorage.removeItem(USER_KEY),
                safeTokenStorage.remove()
            ]);
            // console.log('✅ Logout successful - user cleared');
        } catch (error) {
            console.error('❌ Logout error:', error);
            setUser(null);
        }
    }, []);

    const login = useCallback(async (userData) => {
        try {
            const { token, ...userWithoutToken } = userData;
            
            const essentialData = {
                _id: userWithoutToken._id,
                name: userWithoutToken.name,
                email: userWithoutToken.email,
                handle: userWithoutToken.handle,
                avatar: userWithoutToken.avatar,
                bio: userWithoutToken.bio,
                phone: userWithoutToken.phone,
                pronouns: userWithoutToken.pronouns,
                isOnline: userWithoutToken.isOnline,
                lastSeen: userWithoutToken.lastSeen,
                following: userWithoutToken.following || [],
                followers: userWithoutToken.followers || [],
                sentRequests: userWithoutToken.sentRequests || [],
                stories: userWithoutToken.stories || [],
                links: userWithoutToken.links || [], // Added links
            };
            
            setUser(userData); 
            await Promise.all([
                AsyncStorage.setItem(USER_KEY, JSON.stringify(essentialData)),
                safeTokenStorage.set(token)
            ]);
        } catch (error) {
            console.error('Login storage error:', error);
            try {
                await AsyncStorage.removeItem(USER_KEY);
                await AsyncStorage.setItem(USER_KEY, JSON.stringify({
                    _id: userData._id,
                    name: userData.name,
                    email: userData.email,
                    avatar: userData.avatar,
                }));
            } catch (retryError) {
                console.error('Retry failed:', retryError);
            }
        }
    }, []);

    const addStory = useCallback(async (newStory) => {
        if (!user || !user.token) return;
        try {
            const storyToAdd = { ...newStory, uri: newStory.image || newStory.uri, createdAt: new Date().toISOString() };
            const tempUser = { ...user, stories: user.stories ? [storyToAdd, ...user.stories] : [storyToAdd] };
            setUser(tempUser);
            const response = await fetch(`${API_BASE_URL}/api/auth/stories`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${user.token}` },
                body: JSON.stringify({ uri: storyToAdd.uri, type: newStory.type || 'image', content: newStory.content, color: newStory.color })
            });
            if (response.ok) {
                const updatedStories = await response.json();
                const finalUser = { ...user, stories: updatedStories };
                setUser(finalUser);
                const { token, ...dataToCache } = finalUser;
                await AsyncStorage.setItem(USER_KEY, JSON.stringify(dataToCache));
            }
        } catch (error) {
            console.error('Add story error:', error);
        }
    }, [user]);

    const updateProfile = useCallback(async (updatedData) => {
        if (!user || !user.token) return { success: false };
        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/profile`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${user.token}` },
                body: JSON.stringify(updatedData)
            });
            if (response.ok) {
                const data = await response.json();
                const newToken = data.token || user.token;
                const { token, ...dataWithoutToken } = data;
                const finalUserData = { ...data, token: newToken };
                setUser(finalUserData);
                await Promise.all([
                    AsyncStorage.setItem(USER_KEY, JSON.stringify(dataWithoutToken)),
                    safeTokenStorage.set(newToken)
                ]);
                return { success: true, data: finalUserData };
            }
            return { success: false };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }, [user]);

    const followUser = useCallback(async (userId) => {
        if (!user || !user.token) return { success: false };
        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/follow/${userId}`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${user.token}` }
            });
            if (response.ok) {
                const data = await response.json();
                
                let updatedFollowing = user.following || [];
                let updatedSentRequests = user.sentRequests || [];

                if (data.status === 'followed') {
                   if (!updatedFollowing.includes(userId)) updatedFollowing = [...updatedFollowing, userId];
                   updatedSentRequests = updatedSentRequests.filter(id => id !== userId);
                } else if (data.status === 'unfollowed') {
                    updatedFollowing = updatedFollowing.filter(id => id !== userId);
                    updatedSentRequests = updatedSentRequests.filter(id => id !== userId);
                } else if (data.status === 'requested') {
                    if (!updatedSentRequests.includes(userId)) updatedSentRequests = [...updatedSentRequests, userId];
                    updatedFollowing = updatedFollowing.filter(id => id !== userId);
                } else if (data.status === 'cancelled') {
                    updatedSentRequests = updatedSentRequests.filter(id => id !== userId);
                } else {
                     if (data.isFollowing) {
                         if (!updatedFollowing.includes(userId)) updatedFollowing = [...updatedFollowing, userId];
                     } else {
                         updatedFollowing = updatedFollowing.filter(id => id !== userId);
                     }
                }

                const updatedUser = { 
                    ...user, 
                    following: updatedFollowing,
                    sentRequests: updatedSentRequests
                };
                
                setUser(updatedUser);
                const { token, ...dataToCache } = updatedUser;
                await AsyncStorage.setItem(USER_KEY, JSON.stringify(dataToCache));
                return { success: true, data };
            }
            return { success: false };
        } catch (error) {
            return { success: false };
        }
    }, [user]);

    const deleteAccount = useCallback(async () => {
        if (!user || !user.token) return { success: false };
        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/profile`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${user.token}` }
            });
            
            if (response.ok) {
                 await logout(); 
                 return { success: true };
            }
            const data = await response.json();
            return { success: false, message: data.message };
        } catch (error) {
            console.error('Delete account error:', error);
            return { success: false, message: error.message };
        }
    }, [user, logout]);

    const refreshUser = useCallback(async () => {
        if (!user || !user._id) return;
        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/user/${user._id}`, {
                headers: { 'Authorization': `Bearer ${user.token}` }
            });
            if (response.ok) {
                const data = await response.json();
                const updatedUser = { ...user, ...data };
                setUser(updatedUser);
                const { token, ...dataToCache } = updatedUser;
                await AsyncStorage.setItem(USER_KEY, JSON.stringify(dataToCache));
            }
        } catch (error) {
            console.error('Refresh error:', error);
        }
    }, [user]);

    // Memoize the context value to prevent unnecessary re-renders in consumers
    const contextValue = useMemo(() => {
        return {
            user,
            login,
            logout,
            addStory,
            updateProfile,
            followUser,
            refreshUser,
            deleteAccount,
            loading
        };
    }, [user, login, logout, addStory, updateProfile, followUser, refreshUser, deleteAccount, loading]);

    // console.log('🛡️ UserProvider Rendering. Children:', !!children);

    return (
        <UserContext.Provider value={contextValue}>
            {children}
        </UserContext.Provider>
    );
};

export { useUser } from './UserContext';

// FORCE REFRESH TOKEN: 123
