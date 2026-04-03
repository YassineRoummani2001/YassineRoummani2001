// utils/ErrorHandler.ts
import { ErrorMessages } from '@/constants/ErrorMessages';
import * as Updates from 'expo-updates';
import Toast from 'react-native-toast-message';
import { captureException, initSentry } from './sentry';

interface AppError {
    message: string;
    originalError?: any;
    code?: string | number;
}

class ErrorHandler {
    static isInitialized = false;

    /**
     * Initialize Global Error Handlers
     * Should be called in _layout.tsx
     */
    static init() {
        if (this.isInitialized) return;

        // Initialize Logging
        initSentry();

        // 1. Global JS Error Handler (Prevents RedBox Crash in Prod)
        const defaultHandler = ErrorUtils.getGlobalHandler();
        ErrorUtils.setGlobalHandler(async (error: any, isFatal?: boolean) => {
            if (isFatal) {
                // In production, silent recovery for fatal errors
                if (!__DEV__) {
                    // Log to Sentry/Service first
                    captureException(error, { isFatal: true });

                    // Attempt silent reload to recover
                    try {
                        await Updates.reloadAsync();
                    } catch (e) {
                        // Last resort (native crash prevention if reload fails)
                    }
                } else {
                    // DEV: Show RedBox
                    if (defaultHandler) defaultHandler(error, isFatal);
                }
            } else {
                // Non-fatal: Log safely
                this.log('Non-fatal Error', error);
                captureException(error);
            }
        });

        // 2. Promise Rejection Handler (Uncommon in RN but good practice)
        // @ts-ignore - tracking unhandled promises
        if (global.Promise) {
            // @ts-ignore
            const originalHandler = global.onunhandledrejection;
            // @ts-ignore
            global.onunhandledrejection = (event) => {
                this.log('Unhandled Promise Rejection', event);
                captureException(event);
            };
        }

        // 3. Silence Console in Production
        if (!__DEV__) {
            console.log = () => { };
            console.info = () => { };
            console.warn = () => { };
            console.error = (message, ...args) => {
                // Capture real errors but don't spam STDOUT
                captureException(new Error(message), { args });
            };
        }

        this.isInitialized = true;
        // console.log('✅ Global Error Handling Initialized');
    }

    /**
     * Log error to console only in development
     */
    static log(message: string, error?: any) {
        if (__DEV__) {
            // console.log(`[Vibe API] ${message}`, error || '');
        } else {
            // Production: Send to Sentry
            if (error) captureException(error, { message });
        }
    }

    /**
     * Parse various error types into a user-friendly message
     */
    static parse(error: any): string {
        if (!error) return ErrorMessages.DEFAULT;

        // Extract message from object validity
        let rawMessage = error.message || error.error || (typeof error === 'string' ? error : '');
        
        // Handle expo-video error objects which might be nested or JSON strings
        if (typeof error === 'object' && !rawMessage) {
            try {
                rawMessage = JSON.stringify(error);
            } catch (e) {
                rawMessage = 'Unknown error';
            }
        }

        // 1. Video Playback Errors (expo-video, expo-av)
        if (
            rawMessage.includes('Failed to load') || 
            rawMessage.includes('player item') || 
            rawMessage.includes('permission') ||
            rawMessage.includes('Video playback failed')
        ) {
            return "This video couldn't be loaded. It may have been removed or is unavailable.";
        }

        // 2. Network / Connection
        if (
            rawMessage === 'Network request failed' ||
            rawMessage.includes('Network') ||
            rawMessage.includes('timeout') ||
            error.name === 'TypeError' ||
            error.name === 'AbortError'
        ) {
            return "Connection issue. Retrying...";
        }

        // 3. HTTP Status based
        if (error.status === 401) return "Session expired. Please login.";
        if (error.status === 403) return "Access denied.";
        if (error.status === 404) return "Resource not found.";
        if (error.status >= 500) return "Server is temporarily unavailable.";

        // 4. Backend standardized errors
        if (error.response?.data?.message) {
            const serverMsg = error.response.data.message;
            if (serverMsg.includes('SQL') || serverMsg.includes('Error:') || serverMsg.length > 100) {
                return "Something went wrong. Please try again.";
            }
            return serverMsg;
        }

        // 5. Default Safe Message
        return ErrorMessages.DEFAULT || "Something went wrong.";
    }

    /**
     * Display error to user based on severity
     * STRICT: NEVER USE ALERT.ALERT directly for non-fatal errors
     */
    static show(error: any, type: 'toast' | 'silent' = 'toast') {
        const message = this.parse(error);

        if (type === 'silent') {
            this.log('Silent Error:', error);
            return;
        }

        Toast.show({
            type: 'error',
            text1: 'Note',
            text2: message,
            position: 'top',
            visibilityTime: 4000,
            topOffset: 50
        });
    }
}

export default ErrorHandler;
