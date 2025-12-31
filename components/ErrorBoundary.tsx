// components/ErrorBoundary.tsx
import ErrorHandler from '@/utils/ErrorHandler';
import { AlertTriangle, RefreshCw } from 'lucide-react-native';
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        ErrorHandler.log('Uncaught Error:', error);
        ErrorHandler.log('Component Stack:', errorInfo);
    }

    private handleRetry = () => {
        // Attempt to reset state
        this.setState({ hasError: false, error: null });
    };

    public render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <SafeAreaView style={styles.container}>
                    <View style={styles.content}>
                        <AlertTriangle size={64} color="#EF4444" style={styles.icon} />
                        <Text style={styles.title}>Oops! Something went wrong.</Text>
                        <Text style={styles.message}>
                            We encountered an unexpected error.
                        </Text>

                        {/* Standard "Try Again" Button */}
                        <TouchableOpacity style={styles.retryBtn} onPress={this.handleRetry}>
                            <RefreshCw size={20} color="#fff" />
                            <Text style={styles.retryText}>Try Again</Text>
                        </TouchableOpacity>

                        {/* Developer details - masked in prod */}
                        {__DEV__ && this.state.error && (
                            <ScrollView style={styles.devBox}>
                                <Text style={styles.devText}>{this.state.error.toString()}</Text>
                            </ScrollView>
                        )}
                    </View>
                </SafeAreaView>
            );
        }

        return this.props.children;
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        width: '90%',
        alignItems: 'center',
        padding: 24,
    },
    icon: {
        marginBottom: 20,
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#1F2937',
        marginBottom: 8,
        textAlign: 'center',
    },
    message: {
        fontSize: 16,
        color: '#6B7280',
        textAlign: 'center',
        marginBottom: 32,
    },
    retryBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#6366F1',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 12,
        gap: 10,
        shadowColor: '#6366F1',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    retryText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    devBox: {
        marginTop: 40,
        width: '100%',
        maxHeight: 200,
        backgroundColor: '#F3F4F6',
        padding: 12,
        borderRadius: 8,
    },
    devText: {
        color: '#EF4444',
        fontSize: 12,
        fontFamily: 'monospace',
    }
});

export default ErrorBoundary;
