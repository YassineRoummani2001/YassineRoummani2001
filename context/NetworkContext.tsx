import { API_BASE_URL } from '@/constants/Config';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';

interface NetworkContextType {
    isConnected: boolean | null;
    isInternetReachable: boolean | null;
    isWeakConnection: boolean;
    type: string;
}

const NetworkContext = createContext<NetworkContextType>({
    isConnected: true,
    isInternetReachable: true,
    isWeakConnection: false,
    type: 'unknown',
});

export const NetworkProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [state, setState] = useState<NetworkContextType>({
        isConnected: true,
        isInternetReachable: true,
        isWeakConnection: false,
        type: 'unknown',
    });

    useEffect(() => {
        // Configure reachability check to avoid errors on localhost:8081
        // On web, we point to our own API which has CORS enabled to avoid CORS blocks
        NetInfo.configure({
            reachabilityUrl: Platform.OS === 'web' ? `${API_BASE_URL}/` : 'https://clients3.google.com/generate_204',
            reachabilityTest: async (response) => response.status === 204 || response.status === 200,
            reachabilityLongTimeout: 60 * 1000, // 60s
            reachabilityShortTimeout: 5 * 1000, // 5s
            reachabilityRequestTimeout: 15 * 1000, // 15s
        });

        // 1. Subscribe to network state changes
        const unsubscribe = NetInfo.addEventListener((nextState: NetInfoState) => {
            // Logic for "Weak" connection:
            // - If cellular and 2g/3g
            // - Or if internet is reachable but speed is theoretically low (NetInfo doesn't give real-time speed, but gives types)
            const isWeak =
                nextState.type === 'cellular' &&
                (nextState.details as any)?.cellularGeneration === '2g' ||
                (nextState.details as any)?.cellularGeneration === '3g';

            setState({
                isConnected: nextState.isConnected,
                isInternetReachable: nextState.isInternetReachable,
                isWeakConnection: !!isWeak || (!!nextState.isConnected && nextState.isInternetReachable === false),
                type: nextState.type,
            });
        });

        return () => unsubscribe();
    }, []);

    return (
        <NetworkContext.Provider value={state}>
            {children}
        </NetworkContext.Provider>
    );
};

export const useNetwork = () => useContext(NetworkContext);
