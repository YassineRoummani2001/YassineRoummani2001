// utils/api.ts
import { API_BASE_URL } from '@/constants/Config';
import { ErrorMessages } from '@/constants/ErrorMessages';
import NetInfo from '@react-native-community/netinfo';
import ErrorHandler from './ErrorHandler';

// Configure defaults
const DEFAULT_TIMEOUT = 10000; // 10s

interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    message?: string;
    status?: number;
}

/**
 * Safe API Wrapper
 * Handles: timeouts, offline state, non-200 responses, parsing
 */
export const api = async <T = any>(
    endpoint: string,
    options: RequestInit = {}
): Promise<ApiResponse<T>> => {

    // 1. Check Offline Status
    const netState = await NetInfo.fetch();
    if (!netState.isConnected && netState.isInternetReachable === false) {
        ErrorHandler.show(ErrorMessages.NETWORK.OFFLINE, 'toast');
        return { success: false, message: ErrorMessages.NETWORK.OFFLINE };
    }

    // 2. Setup Timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT);

    try {
        const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;

        ErrorHandler.log(`API Request: ${options.method || 'GET'} ${url}`);

        const response = await fetch(url, {
            ...options,
            signal: controller.signal,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            },
        });

        clearTimeout(timeoutId);

        // 3. Handle Empty Responses (204 No Content)
        if (response.status === 204) {
            return { success: true, status: 204 };
        }

        const data = await response.json().catch(() => ({}));

        // 4. Handle Non-200 Status
        if (!response.ok) {
            const errorMessage = data.message || `Server Error (${response.status})`;
            ErrorHandler.log(`API Error ${response.status}:`, errorMessage);

            // Handle 401 Unauthorized globally if needed (e.g. logout)
            // if (response.status === 401) { Auth.logout(); }

            return {
                success: false,
                message: errorMessage,
                status: response.status
            };
        }

        return { success: true, data: data as T, status: response.status };

    } catch (error: any) {
        clearTimeout(timeoutId);

        const friendlyMessage = ErrorHandler.parse(error);
        ErrorHandler.log('API Exception:', error);

        return { success: false, message: friendlyMessage };
    }
};

// Convenience methods
export const ApiClient = {
    get: <T>(url: string, headers?: any) => api<T>(url, { method: 'GET', headers }),
    post: <T>(url: string, body: any, headers?: any) => api<T>(url, { method: 'POST', body: JSON.stringify(body), headers }),
    put: <T>(url: string, body: any, headers?: any) => api<T>(url, { method: 'PUT', body: JSON.stringify(body), headers }),
    delete: <T>(url: string, headers?: any) => api<T>(url, { method: 'DELETE', headers }),
};
