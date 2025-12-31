import { useEffect, useRef } from 'react';

// Simple polling-based real-time updates for React Native
export function useRealtimeMessages(chatId: string | null, onNewMessage: (message: any) => void) {
    const intervalRef = useRef<any>(null);
    const lastMessageIdRef = useRef<string | null>(null);

    useEffect(() => {
        if (!chatId) return;

        // Poll for new messages every 2 seconds
        intervalRef.current = setInterval(() => {
            // This will be handled by the parent component
            // We just provide the mechanism
        }, 2000);

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [chatId]);

    return {
        lastMessageId: lastMessageIdRef.current,
        setLastMessageId: (id: string) => {
            lastMessageIdRef.current = id;
        }
    };
}
