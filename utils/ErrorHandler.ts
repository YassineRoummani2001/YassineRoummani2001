// utils/ErrorHandler.ts
import { ErrorMessages } from '@/constants/ErrorMessages';
import Toast from 'react-native-toast-message';

/**
 * Standardized error structure
 */
interface AppError {
    message: string;
    originalError?: any;
    code?: string | number;
}

class ErrorHandler {
    /**
     * Log error to console only in development
     */
    static log(message: string, error?: any) {
        if (__DEV__) {
            console.log(`[ErrorHandler] ${message}`, error || '');
        } else {
            // In production, you would send this to Sentry/Crashlytics
            // Sentry.captureException(error);
        }
    }

    /**
     * Parse various error types into a user-friendly message
     * STRICT: Never return technical jargon.
     */
    static parse(error: any): string {
        if (!error) return ErrorMessages.DEFAULT;

        // 1. Network / Connection
        if (
            error.message === 'Network request failed' ||
            error.name === 'TypeError' ||
            error.name === 'AbortError' ||
            error.message?.includes('timeout')
        ) {
            return "Connection issue. Retrying...";
        }

        // 2. HTTP Status based (if verified safe)
        if (error.status === 401) return "Please sign in again.";
        if (error.status === 403) return "Access denied.";
        if (error.status === 404) return "Content not found.";

        // 3. Backend standardized errors - ONLY if they are user friendly
        // We assume 'message' from backend is decently sanitized, but if we want Absolute Zero usage of backend text:
        // return "Something went wrong. Please try again."; 
        // However, usually validations like "Username taken" are needed. 
        // We will allow backend messages but fallback to generic if it looks technical.
        if (error.response?.data?.message) {
            const serverMsg = error.response.data.message;
            // Simple basic heuristic to filter out SQL/Code dumps
            if (serverMsg.includes('SQL') || serverMsg.includes('Error') || serverMsg.length > 50) {
                return "Something went wrong. Please try again.";
            }
            return serverMsg;
        }

        // 4. Default Safe Message
        return "Something went wrong. Please try again.";
    }

    /**
     * Display error to user based on severity
     * STRICT: NEVER USE ALERT.ALERT
     */
    static show(error: any, type: 'toast' | 'alert' | 'silent' = 'toast') {
        const message = this.parse(error);
        this.log('Showing error:', { message, original: error });

        if (type === 'silent') return;

        // Force 'alert' to be a 'toast' to avoid blocking UI
        // We use 'error' type for Toast which usually is red, but we can make it softer if needed.
        Toast.show({
            type: 'error',
            text1: 'Note', // Neutral title
            text2: message,
            position: 'top',
            visibilityTime: 4000,
        });
    }

    /**
     * Handle critical failures (e.g. crash boundaries)
     */
    static handleCritical(error: Error) {
        this.log('CRITICAL ERROR:', error);
        // Using Toast even for critical errors to strictly follow "No blocking" rule if possible.
        // But ErrorBoundary usually handles critical crashes with a fallback UI.
    }
}

export default ErrorHandler;
