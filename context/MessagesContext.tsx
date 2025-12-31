import { API_BASE_URL } from '@/constants/Config';
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useUser } from './UserContext';

interface MessagesContextType {
    unreadCount: number;
    refreshUnreadCount: () => Promise<void>;
    markChatAsRead: (chatId: string) => Promise<void>;
    socket: Socket | null;
}

const MessagesContext = createContext<MessagesContextType | undefined>(undefined);

export function MessagesProvider({ children }: { children: React.ReactNode }) {
    const { user } = (useUser() || {}) as any;
    const [unreadCount, setUnreadCount] = useState(0);
    const [socket, setSocket] = useState<Socket | null>(null);
    const socketRef = useRef<Socket | null>(null);

    const fetchUnreadCount = async () => {
        if (!user?.token) return;

        try {
            const response = await fetch(`${API_BASE_URL}/api/chats/unread/count`, {
                headers: {
                    'Authorization': `Bearer ${user.token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                setUnreadCount(data.count || 0);
            }
        } catch (error) {
            console.error('Error fetching unread count:', error);
        }
    };

    const markChatAsRead = async (chatId: string) => {
        if (!user?.token) return;

        try {
            const response = await fetch(`${API_BASE_URL}/api/chats/${chatId}/read`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${user.token}`
                }
            });

            if (response.ok) {
                await fetchUnreadCount();
            }
        } catch (error) {
            console.error('Error marking chat as read:', error);
        }
    };

    // Socket Initialization
    useEffect(() => {
        if (user?._id) {
            // Initialize socket
            const newSocket = io(API_BASE_URL, {
                transports: ['websocket'],
                query: { userId: user._id }
            });

            socketRef.current = newSocket;
            setSocket(newSocket);

            newSocket.on('connect', () => {
                console.log('✅ Socket connected');
                newSocket.emit('user:online', user._id);
            });

            // Handle unread count updates via socket if possible
            newSocket.on('message:new', () => {
                fetchUnreadCount();
            });

            return () => {
                console.log('🔌 Disconnecting socket');
                newSocket.disconnect();
                setSocket(null);
            };
        }
    }, [user?._id]);

    useEffect(() => {
        if (user?.token) {
            fetchUnreadCount();
        }
    }, [user?.token]);

    return (
        <MessagesContext.Provider value={{
            unreadCount,
            refreshUnreadCount: fetchUnreadCount,
            markChatAsRead,
            socket
        }}>
            {children}
        </MessagesContext.Provider>
    );
}

export function useMessages() {
    const context = useContext(MessagesContext);
    if (context === undefined) {
        throw new Error('useMessages must be used within a MessagesProvider');
    }
    return context;
}
