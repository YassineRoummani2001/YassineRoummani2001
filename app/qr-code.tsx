import { useThemeContext } from '@/context/ThemeContext';
import { useUser } from '@/context/UserContext';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { ArrowLeft, Share2 } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Image,
    Platform,
    SafeAreaView,
    Share,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';

const { width } = Dimensions.get('window');

export default function QrCodeScreen() {
    const router = useRouter();
    const { user } = (useUser() || {}) as any;
    const { colors, isDark } = useThemeContext();
    const [activeTab, setActiveTab] = useState<'my-code' | 'scan'>('my-code');
    const [permission, requestPermission] = useCameraPermissions();
    const [scanned, setScanned] = useState(false);
    const [qrReady, setQrReady] = useState(false);
    const isScanning = React.useRef(false);

    // Initial permission request if entering scan tab
    useEffect(() => {
        if (activeTab === 'scan' && !permission?.granted) {
            requestPermission();
        }
        // Reset scanner lock when switching tabs
        if (activeTab === 'scan') {
            setScanned(false);
            isScanning.current = false;
        }
    }, [activeTab]);

    // Defer QR code rendering to avoid blocking screen transition
    useEffect(() => {
        const timer = setTimeout(() => setQrReady(true), 200);
        return () => clearTimeout(timer);
    }, []);

    const handleBarCodeScanned = ({ type, data }: { type: string; data: string }) => {
        if (scanned || isScanning.current) return;

        isScanning.current = true;
        setScanned(true);

        try {
            // Expected format: vibe://user/{userId} or just {userId} or https://vibe.app/user/{userId}
            // For now, let's look for "vibe://user/" or assuming the data IS the link
            let userId = null;

            if (data.includes('vibe://user/')) {
                userId = data.split('vibe://user/')[1];
            } else if (data.includes('/user/')) {
                // web link
                const parts = data.split('/user/');
                userId = parts[1];
            } else {
                // Try to assume it's an ID if it looks like one (Mongo ID is 24 hex chars)
                if (/^[0-9a-fA-F]{24}$/.test(data)) {
                    userId = data;
                }
            }

            if (userId) {
                // Navigate to user profile
                router.push({ pathname: '/user/[id]', params: { id: userId } });

                // Reset scanner after a delay, ONLY if we want them to be able to scan again immediately
                // preventing immediate re-scan while navigating
                setTimeout(() => {
                    setScanned(false);
                    isScanning.current = false;
                }, 3000);
            } else {
                Alert.alert('Invalid Code', 'This QR code does not appear to be a Vibe user profile.', [
                    {
                        text: 'OK',
                        onPress: () => {
                            setScanned(false);
                            isScanning.current = false;
                        }
                    }
                ]);
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to process QR code');
            setScanned(false);
            isScanning.current = false;
        }
    };

    const handleShare = async () => {
        try {
            const shareContent: any = {
                message: `Check out my profile on Vibe! vibe://user/${user?._id || user?.id}`,
                title: 'Share Profile'
            };

            // Only add URL on iOS and if it's a valid HTTP(S) URL
            // Custom schemes like vibe:// are not valid for Share API
            if (Platform.OS === 'ios') {
                // You could add a web URL here if you have one
                // shareContent.url = `https://vibe.app/user/${user?._id || user?.id}`;
            }

            await Share.share(shareContent);
        } catch (error) {
            console.error(error);
        }
    };

    if (!user) return <View style={styles.center}><ActivityIndicator /></View>;

    const userId = user._id || user.id;

    const renderMyCode = () => (
        <View style={styles.contentContainer}>
            <View style={[styles.card, { backgroundColor: isDark ? '#1A1A1A' : 'white' }]}>
                <View style={[styles.avatarContainer, { backgroundColor: isDark ? '#333' : 'white' }]}>
                    <Image
                        source={{ uri: user.avatar || 'https://i.pravatar.cc/150?u=fake' }}
                        style={styles.avatar}
                    />
                </View>
                <Text style={[styles.name, { color: colors.text }]}>{user.name || 'User'}</Text>
                <Text style={[styles.handle, { color: colors.textSecondary }]}>{user.handle || '@user'}</Text>

                <View style={styles.qrContainer}>
                    {userId && qrReady ? (
                        <QRCode
                            value={`vibe://user/${userId}`}
                            size={200}
                            color={isDark ? 'white' : 'black'}
                            backgroundColor="transparent"
                        />
                    ) : (
                        <View style={{ width: 200, height: 200, alignItems: 'center', justifyContent: 'center' }}>
                            <ActivityIndicator color={colors.primary} size="large" />
                            <Text style={{ color: colors.textSecondary, marginTop: 10 }}>Generating...</Text>
                        </View>
                    )}
                </View>

                <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                    Scan this code to view my profile
                </Text>
            </View>

            <View style={styles.actions}>
                <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: colors.primary, opacity: userId ? 1 : 0.6 }]}
                    onPress={handleShare}
                    disabled={!userId}
                >
                    <Share2 color="white" size={20} />
                    <Text style={styles.actionText}>Share Profile</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    const renderScanner = () => {
        if (!permission) {
            return <View style={styles.center}><ActivityIndicator /></View>;
        }

        if (!permission.granted) {
            return (
                <View style={styles.center}>
                    <Text style={{ color: colors.text, marginBottom: 20 }}>Camera permission is required</Text>
                    <TouchableOpacity style={styles.btn} onPress={requestPermission}>
                        <Text style={styles.btnText}>Grant Permission</Text>
                    </TouchableOpacity>
                </View>
            );
        }

        return (
            <View style={styles.scannerContainer}>
                <CameraView
                    style={StyleSheet.absoluteFillObject}
                    onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                    barcodeScannerSettings={{
                        barcodeTypes: ["qr"],
                    }}
                />
                <View style={styles.scanOverlay}>
                    <View style={styles.scanFrame} />
                    <Text style={styles.scanText}>Align QR code within the frame</Text>
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <ArrowLeft size={24} color={colors.text} />
                </TouchableOpacity>
                <View style={[styles.tabContainer, { backgroundColor: isDark ? '#1A1A1A' : '#F2F2F2' }]}>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'my-code' && [styles.activeTab, { backgroundColor: isDark ? '#333' : 'white' }]]}
                        onPress={() => setActiveTab('my-code')}
                    >
                        <Text style={[styles.tabText, activeTab === 'my-code' ? { color: colors.text, fontWeight: 'bold' } : { color: colors.textSecondary }]}>My Code</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'scan' && [styles.activeTab, { backgroundColor: isDark ? '#333' : 'white' }]]}
                        onPress={() => setActiveTab('scan')}
                    >
                        <Text style={[styles.tabText, activeTab === 'scan' ? { color: colors.text, fontWeight: 'bold' } : { color: colors.textSecondary }]}>Scan</Text>
                    </TouchableOpacity>
                </View>
                <View style={{ width: 40 }} />
            </View>

            {activeTab === 'my-code' ? renderMyCode() : renderScanner()}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        // No border bottom
    },
    backButton: {
        padding: 4,
    },
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: '#F2F2F2', 
        borderRadius: 25,
        padding: 4,
    },
    tab: {
        paddingVertical: 8,
        paddingHorizontal: 24,
        borderRadius: 22,
    },
    activeTab: {
        backgroundColor: 'white',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    tabText: {
        fontSize: 14,
        fontWeight: '600',
    },
    contentContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center', // Center vertically
        padding: 20,
    },
    card: {
        width: '100%',
        maxWidth: 320,
        borderRadius: 24,
        paddingVertical: 40,
        paddingHorizontal: 30,
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.08,
        shadowRadius: 20,
        elevation: 10,
        backgroundColor: 'white',
    },
    avatarContainer: {
        marginBottom: 16,
        padding: 3,
        backgroundColor: 'white',
        borderRadius: 50,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    avatar: {
        width: 70,
        height: 70,
        borderRadius: 35,
    },
    name: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 4,
        textAlign: 'center',
    },
    handle: {
        fontSize: 13,
        marginBottom: 30,
        textAlign: 'center',
    },
    qrContainer: {
        marginBottom: 30,
        // No background color changes here, relying on transparency/white of the card
    },
    infoText: {
        fontSize: 12,
        textAlign: 'center',
        opacity: 0.6,
    },
    actions: {
        marginTop: 40,
        width: '100%',
        maxWidth: 320,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderRadius: 16,
        gap: 8,
        backgroundColor: '#6C63FF', // Specific purple from screenshot
        shadowColor: "#6C63FF",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    actionText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
    },
    scannerContainer: {
        flex: 1,
        position: 'relative',
    },
    scanOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    scanFrame: {
        width: 250,
        height: 250,
        borderWidth: 2,
        borderColor: 'white',
        borderRadius: 20,
        backgroundColor: 'transparent',
    },
    scanText: {
        color: 'white',
        marginTop: 20,
        fontSize: 14,
        fontWeight: '500',
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        overflow: 'hidden',
    },
    btn: {
        backgroundColor: '#6C63FF',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 8,
    },
    btnText: {
        color: 'white',
        fontWeight: 'bold',
    }
});
