import { API_BASE_URL } from '@/constants/Config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { UserContext } from './UserContext';
// console.log('📦 AuthContext Module Evaluated.');

const TOKEN_KEY = 'vibe_auth_token';
const USER_KEY = 'vibe_user_data';
const ACCOUNTS_KEY = 'vibe_accounts_list';

// Helper for cross-platform secure storage
const safeTokenStorage = {
    async set(token, key = TOKEN_KEY) {
        try {
            const isAvailable = await SecureStore.isAvailableAsync();
            if (isAvailable) return await SecureStore.setItemAsync(key, token);
            return await AsyncStorage.setItem(key, token);
        } catch (e) {
            return await AsyncStorage.setItem(key, token);
        }
    },
    async get(key = TOKEN_KEY) {
        try {
            const isAvailable = await SecureStore.isAvailableAsync();
            if (isAvailable) return await SecureStore.getItemAsync(key);
            return await AsyncStorage.getItem(key);
        } catch (e) {
            return await AsyncStorage.getItem(key);
        }
    },
    async remove(key = TOKEN_KEY) {
        try {
            const isAvailable = await SecureStore.isAvailableAsync();
            if (isAvailable) return await SecureStore.deleteItemAsync(key);
            return await AsyncStorage.removeItem(key);
        } catch (e) {
            return await AsyncStorage.removeItem(key);
        }
    }
};

export const UserProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [accounts, setAccounts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadStoredUser = async () => {
            try {
                const [token, userJson, accountsJson] = await Promise.all([
                    safeTokenStorage.get(),
                    AsyncStorage.getItem(USER_KEY),
                    AsyncStorage.getItem(ACCOUNTS_KEY)
                ]);

                if (accountsJson) {
                    setAccounts(JSON.parse(accountsJson));
                }

                if (token && userJson) {
                    const userData = JSON.parse(userJson);
                    setUser({ ...userData, token });
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
            // Remove current account from accounts list to keep it clean if desired
            // Or just clear active session
            const newAccounts = accounts.filter(a => a._id !== user?._id);
            setAccounts(newAccounts);
            setUser(null);
            
            await Promise.all([
                AsyncStorage.removeItem(USER_KEY),
                safeTokenStorage.remove(),
                AsyncStorage.setItem(ACCOUNTS_KEY, JSON.stringify(newAccounts))
            ]);
        } catch (error) {
            console.error('❌ Logout error:', error);
            setUser(null);
        }
    }, [user, accounts]);

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
                links: userWithoutToken.links || [], 
                coverImage: userWithoutToken.coverImage,
                saved: userWithoutToken.saved || [],
                isPrivate: userWithoutToken.isPrivate || false,
            };
            
            setUser(userData); 

            // Update accounts list
            const otherAccounts = accounts.filter(a => a._id !== userData._id);
            const newAccounts = [essentialData, ...otherAccounts];
            setAccounts(newAccounts);

            await Promise.all([
                AsyncStorage.setItem(USER_KEY, JSON.stringify(essentialData)),
                safeTokenStorage.set(token),
                AsyncStorage.setItem(ACCOUNTS_KEY, JSON.stringify(newAccounts)),
                // Store individual tokens for each account to allow switching
                safeTokenStorage.set(token, `vibe_token_${userData._id}`)
            ]);
        } catch (error) {
            console.error('Login storage error:', error);
        }
    }, [accounts]);

    const switchAccount = useCallback(async (targetUserId) => {
        try {
            setLoading(true);
            const targetUser = accounts.find(a => a._id === targetUserId);
            if (!targetUser) return;

            const token = await safeTokenStorage.get(`vibe_token_${targetUserId}`);
            if (!token) {
                // If no token, we might need them to log in again
                return logout();
            }

            setUser({ ...targetUser, token });
            await Promise.all([
                AsyncStorage.setItem(USER_KEY, JSON.stringify(targetUser)),
                safeTokenStorage.set(token)
            ]);
        } catch (error) {
            console.error('Switch account error:', error);
        } finally {
            setLoading(false);
        }
    }, [accounts, logout]);

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
                const essentialDataToCache = {
                    ...dataToCache,
                    coverImage: finalUser.coverImage
                };
                await AsyncStorage.setItem(USER_KEY, JSON.stringify(essentialDataToCache));
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

                const isMatch = (item, targetId) => {
                    if (typeof item === 'string') return item === targetId;
                    return item._id === targetId || item.id === targetId;
                };

                if (data.status === 'followed') {
                   if (!updatedFollowing.some(f => isMatch(f, userId))) {
                       updatedFollowing = [...updatedFollowing, userId];
                   }
                   updatedSentRequests = updatedSentRequests.filter(r => !isMatch(r, userId));
                } else if (data.status === 'unfollowed') {
                    updatedFollowing = updatedFollowing.filter(f => !isMatch(f, userId));
                    updatedSentRequests = updatedSentRequests.filter(r => !isMatch(r, userId));
                } else if (data.status === 'requested') {
                    if (!updatedSentRequests.some(r => isMatch(r, userId))) {
                        updatedSentRequests = [...updatedSentRequests, userId];
                    }
                    updatedFollowing = updatedFollowing.filter(f => !isMatch(f, userId));
                } else if (data.status === 'cancelled') {
                    updatedSentRequests = updatedSentRequests.filter(r => !isMatch(r, userId));
                } else {
                     if (data.isFollowing) {
                         if (!updatedFollowing.some(f => isMatch(f, userId))) {
                             updatedFollowing = [...updatedFollowing, userId];
                         }
                     } else {
                         updatedFollowing = updatedFollowing.filter(f => !isMatch(f, userId));
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

    const savePost = useCallback(async (postId, isSaving) => {
        if (!user || !user.token) return;
        
        const currentSaved = user.saved || [];
        let updatedSaved;
        
        if (isSaving) {
            updatedSaved = [...currentSaved, postId];
        } else {
            updatedSaved = currentSaved.filter(id => id !== postId);
        }
        
        const updatedUser = { ...user, saved: updatedSaved };
        setUser(updatedUser);
        
        // Cache updated user data
        const { token, ...dataToCache } = updatedUser;
        await AsyncStorage.setItem(USER_KEY, JSON.stringify(dataToCache));
        
        // No need to wait for backend here if we want optimistic UI
        // But we return success/fail if needed
        return { success: true };
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
            accounts,
            login,
            logout,
            switchAccount,
            addStory,
            updateProfile,
            followUser,
            savePost,
            refreshUser,
            deleteAccount,
            loading
        };
    }, [user, accounts, login, logout, switchAccount, addStory, updateProfile, followUser, savePost, refreshUser, deleteAccount, loading]);

    // console.log('🛡️ UserProvider Rendering. Children:', !!children);

    return (
        <UserContext.Provider value={contextValue}>
            {children}
        </UserContext.Provider>
    );
};

export { useUser } from './UserContext';

// FORCE REFRESH TOKEN: 123
