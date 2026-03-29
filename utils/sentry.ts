// Sentry is currently disabled or not installed
// import * as Sentry from 'sentry-expo';

export const initSentry = () => {
    // Sentry.init({
    //   dsn: 'YOUR_DSN_HERE',
    //   enableInExpoDevelopment: true,
    //   debug: true,
    // });
    if (__DEV__) {
        // console.log('[Sentry] Mock initialization');
    }
};

export const captureException = (error: any, context?: any) => {
    // Sentry.Native.captureException(error);
    if (__DEV__) {
        // console.log('[Sentry] Mock captureException:', error);
        if (context) {
            // console.log('[Sentry] Context:', context);
        }
    }
};
