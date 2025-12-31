import { Heart, MessageCircle, Share2 } from 'lucide-react-native';
import { Dimensions, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const { width } = Dimensions.get('window');

/**
 * iOS-Compatible Post Card Component
 * 
 * Key Features:
 * - Proper overflow handling for iOS
 * - Correct borderRadius clipping
 * - SafeAreaView compatible
 * - Works on all iPhone sizes
 */

interface PostCardProps {
    post: {
        id: string;
        user: {
            name: string;
            avatar: string;
        };
        image: string;
        caption: string;
        likes: number;
        comments: number;
        timeAgo: string;
    };
    onLike?: () => void;
    onComment?: () => void;
    onShare?: () => void;
}

export default function PostCard({ post, onLike, onComment, onShare }: PostCardProps) {
    return (
        <View style={styles.card}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.userInfo}>
                    <Image
                        source={{ uri: post.user.avatar }}
                        style={styles.avatar}
                    />
                    <View>
                        <Text style={styles.username}>{post.user.name}</Text>
                        <Text style={styles.timeAgo}>{post.timeAgo}</Text>
                    </View>
                </View>
                <TouchableOpacity>
                    <Text style={styles.menuIcon}>•••</Text>
                </TouchableOpacity>
            </View>

            {/* Caption */}
            {post.caption && (
                <Text style={styles.caption}>{post.caption}</Text>
            )}

            {/* Image Container - Critical iOS Fix */}
            <View style={styles.imageWrapper}>
                <Image
                    source={{ uri: post.image }}
                    style={styles.image}
                    resizeMode="cover"
                />
            </View>

            {/* Footer Actions */}
            <View style={styles.footer}>
                <View style={styles.actions}>
                    <TouchableOpacity style={styles.actionButton} onPress={onLike}>
                        <Heart size={24} color="#000" />
                        <Text style={styles.actionText}>{post.likes}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionButton} onPress={onComment}>
                        <MessageCircle size={24} color="#000" />
                        <Text style={styles.actionText}>{post.comments}</Text>
                    </TouchableOpacity>
                </View>
                <TouchableOpacity onPress={onShare}>
                    <Share2 size={22} color="#000" />
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    // ✅ CRITICAL: overflow: 'hidden' on card container
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        marginHorizontal: 16,
        marginBottom: 20,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
        overflow: 'hidden', // ✅ Essential for iOS - clips all children
    },

    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },

    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },

    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#E0E0E0',
    },

    username: {
        fontSize: 15,
        fontWeight: '700',
        color: '#000',
    },

    timeAgo: {
        fontSize: 12,
        color: '#666',
        marginTop: 2,
    },

    menuIcon: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#666',
    },

    caption: {
        fontSize: 14,
        lineHeight: 20,
        color: '#000',
        marginBottom: 12,
    },

    // ✅ CRITICAL: Wrapper view with overflow: 'hidden'
    imageWrapper: {
        width: '100%',
        aspectRatio: 1, // Square images
        borderRadius: 12, // Slightly less than card borderRadius
        overflow: 'hidden', // ✅ Essential for iOS image clipping
        backgroundColor: '#F0F0F0', // Placeholder color
        marginBottom: 12,
    },

    // ✅ Image fills wrapper completely
    image: {
        width: '100%',
        height: '100%',
    },

    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },

    actions: {
        flexDirection: 'row',
        gap: 20,
    },

    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },

    actionText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#000',
    },
});

/**
 * USAGE EXAMPLE:
 * 
 * <FlatList
 *   data={posts}
 *   renderItem={({ item }) => (
 *     <PostCard
 *       post={item}
 *       onLike={() => handleLike(item.id)}
 *       onComment={() => handleComment(item.id)}
 *       onShare={() => handleShare(item.id)}
 *     />
 *   )}
 *   keyExtractor={(item) => item.id}
 * />
 * 
 * KEY POINTS FOR iOS:
 * 1. ✅ Card has overflow: 'hidden'
 * 2. ✅ ImageWrapper has overflow: 'hidden'
 * 3. ✅ BorderRadius is consistent
 * 4. ✅ No absolute positioning conflicts
 * 5. ✅ AspectRatio for consistent sizing
 */
