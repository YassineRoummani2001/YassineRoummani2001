import { API_BASE_URL } from '@/constants/Config';
import React, { createContext, ReactNode, useCallback, useContext, useState } from 'react';

interface Reel {
    _id: string;
    user: any;
    type: string;
    uri: string;
    videoUri?: string;
    caption: string;
    music?: string;
    likes: string[];
    comments: any[];
    views: number;
    shares: number;
    createdAt: string;
}

interface ReelContextType {
    reels: Reel[];
    loading: boolean;
    error: string | null;
    fetchReels: (page?: number, isRefresh?: boolean) => Promise<void>;
    addNewReel: (reel: Reel) => void;
    updateReel: (reelId: string, updates: Partial<Reel>) => void;
    deleteReel: (reelId: string) => void;
    clearReels: () => void;
}

const ReelContext = createContext<ReelContextType | undefined>(undefined);

export const useReels = () => {
    const context = useContext(ReelContext);
    if (!context) {
        throw new Error('useReels must be used within a ReelProvider');
    }
    return context;
};

interface ReelProviderProps {
    children: ReactNode;
}

export const ReelProvider = ({ children }: ReelProviderProps) => {
    const [reels, setReels] = useState<Reel[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Fetch reels from API
    const fetchReels = useCallback(async (page = 1, isRefresh = false) => {
        if (isRefresh) {
            setLoading(true);
        }

        try {
            const response = await fetch(
                `${API_BASE_URL}/api/posts/reels?page=${page}&limit=10`
            );

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            const incomingReels = Array.isArray(data) ? data : data.posts || [];

            setReels((prev) => {
                if (isRefresh || page === 1) return incomingReels;

                // Deduplicate
                const existingIds = new Set(prev.map((r) => r._id));
                const uniqueNew = incomingReels.filter((r: Reel) => !existingIds.has(r._id));
                return [...prev, ...uniqueNew];
            });

            setError(null);
        } catch (err: any) {
            console.error('Fetch reels error:', err);
            setError(err.message || 'Failed to fetch reels');
        } finally {
            setLoading(false);
        }
    }, []);

    // Add a new reel to the top of the list
    const addNewReel = useCallback((reel: Reel) => {
        setReels((prev) => [reel, ...prev]);
    }, []);

    // Update an existing reel
    const updateReel = useCallback((reelId: string, updates: Partial<Reel>) => {
        setReels((prev) =>
            prev.map((reel) =>
                reel._id === reelId ? { ...reel, ...updates } : reel
            )
        );
    }, []);

    // Delete a reel
    const deleteReel = useCallback((reelId: string) => {
        setReels((prev) => prev.filter((reel) => reel._id !== reelId));
    }, []);

    // Clear all reels
    const clearReels = useCallback(() => {
        setReels([]);
    }, []);

    const value: ReelContextType = {
        reels,
        loading,
        error,
        fetchReels,
        addNewReel,
        updateReel,
        deleteReel,
        clearReels,
    };

    return <ReelContext.Provider value={value}>{children}</ReelContext.Provider>;
};
