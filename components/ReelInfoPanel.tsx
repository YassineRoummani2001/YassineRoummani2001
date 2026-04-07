import { API_BASE_URL } from '@/constants/Config';
import { useThemeContext } from '@/context/ThemeContext';
import { useUser } from '@/context/UserContext';
import { getCorrectUrl } from '@/utils/api';
import { Ionicons } from '@expo/vector-icons';
import { formatDistanceToNow } from 'date-fns';
import { useRouter } from 'expo-router';
import { Bookmark, Heart, MessageCircle, MoreHorizontal, Send } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    Image,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import CommentsModal from './CommentsModal';
import ShareToUsersModal from './ShareToUsersModal';

interface ReelInfoPanelProps {
    item: any;
    liked: boolean;
    likesCount: number;
    isSaved: boolean;
    commentsCount: number;
    isFollowing: boolean;
    isRequested: boolean;
    onToggleLike: () => void;
    onToggleSave: () => void;
    onToggleFollow: () => void;
    onShare: () => void;
}

export default function ReelInfoPanel({
    item,
    liked,
    likesCount,
    isSaved,
    commentsCount,
    isFollowing,
    isRequested,
    onToggleLike,
    onToggleSave,
    onToggleFollow,
    onShare,
}: ReelInfoPanelProps) {
    const router = useRouter();
    const { user } = (useUser() || {}) as any;
    const { colors, isDark } = useThemeContext();

    const author = item?.user || {};
    const avatarUri = getCorrectUrl(author.avatar) || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(author.name || 'User') + '&background=random';

    const [comments, setComments] = useState<any[]>([]);
    const [commentText, setCommentText] = useState('');
    const [commentsLoading, setCommentsLoading] = useState(false);
    const [showAllComments, setShowAllComments] = useState(false);
    const [captionExpanded, setCaptionExpanded] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);

    const likeScaleAnim = useRef(new Animated.Value(1)).current;
    const saveScaleAnim = useRef(new Animated.Value(1)).current;

    const fetchComments = async () => {
        if (!item?._id) return;
        setCommentsLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/posts/${item._id}/comments`, {
                headers: { Authorization: `Bearer ${user?.token}` },
            });
            if (res.ok) {
                const data = await res.json();
                setComments(Array.isArray(data) ? data : []);
            }
        } catch (e) {
            // silent
        } finally {
            setCommentsLoading(false);
        }
    };

    useEffect(() => {
        if (item?.comments && Array.isArray(item.comments) && item.comments.length > 0 && item.comments[0].text) {
             setComments(item.comments);
        } else if (item?._id) {
             fetchComments();
        }
    }, [item]);

    const handleLike = () => {
        Animated.sequence([
            Animated.timing(likeScaleAnim, { toValue: 1.4, duration: 100, useNativeDriver: true }),
            Animated.spring(likeScaleAnim, { toValue: 1, friction: 3, useNativeDriver: true }),
        ]).start();
        onToggleLike();
    };

    const handleSave = () => {
        Animated.sequence([
            Animated.timing(saveScaleAnim, { toValue: 1.4, duration: 100, useNativeDriver: true }),
            Animated.spring(saveScaleAnim, { toValue: 1, friction: 3, useNativeDriver: true }),
        ]).start();
        onToggleSave();
    };

    const handlePostComment = async () => {
        if (!commentText.trim() || !user) return;
        const text = commentText.trim();
        setCommentText('');

        // Optimistic update
        const newComment = {
            _id: Math.random().toString(),
            text,
            user: {
                _id: user._id,
                name: user.name || 'User',
                avatar: user.avatar,
            },
            createdAt: new Date().toISOString(),
        };
        setComments(prev => [newComment, ...prev]);

        try {
            const res = await fetch(`${API_BASE_URL}/api/posts/${item._id}/comment`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${user.token}`,
                },
                body: JSON.stringify({ text }),
            });
            if (res.ok) {
                fetchComments(); // Sync with server
            }
        } catch (e) {
            console.error("Error posting comment to Reel:", e);
        }
    };

    const isOwnReel = user?._id === (author._id || author.id);

    const bg = isDark ? '#060608' : '#ffffff';
    const cardBg = isDark ? '#111111' : '#f7f7f7';
    const border = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';
    const textColor = isDark ? '#ffffff' : '#000000';
    const subText = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.45)';
    const inputBg = isDark ? '#1a1a1a' : '#f0f0f0';

    return (
        <View style={[styles.panel, { backgroundColor: bg, borderLeftColor: border }]}>
            {/* ─── FIXED TOP SECTION ─── */}
            <View style={styles.fixedTop}>
                {/* ── USER CARD ── */}
                <View style={[styles.userCard, { backgroundColor: cardBg, borderColor: border }]}>
                    <TouchableOpacity
                        onPress={() => router.push(`/user/${author._id || author.id}` as any)}
                        style={styles.avatarWrap}
                        activeOpacity={0.8}
                    >
                        <Image source={{ uri: avatarUri }} style={styles.avatar} />
                        <View style={[styles.onlineDot, { borderColor: bg }]} />
                    </TouchableOpacity>

                    <View style={styles.userMeta}>
                        <TouchableOpacity
                            onPress={() => router.push(`/user/${author._id || author.id}` as any)}
                            activeOpacity={0.8}
                        >
                            <Text style={[styles.userName, { color: textColor }]} numberOfLines={1}>
                                {author.name || 'User'}
                            </Text>
                            <Text style={[styles.userHandle, { color: subText }]} numberOfLines={1}>
                                @{author.handle || author.name?.toLowerCase().replace(' ', '_') || 'user'}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {!isOwnReel && (
                        <TouchableOpacity
                            onPress={onToggleFollow}
                            style={[
                                styles.followBtn,
                                isFollowing || isRequested
                                    ? [styles.followingBtn, { borderColor: border }]
                                    : styles.followActiveBtn,
                            ]}
                            activeOpacity={0.8}
                        >
                            <Text style={[
                                styles.followBtnText,
                                (isFollowing || isRequested) && { color: textColor },
                            ]}>
                                {isFollowing ? 'Following' : isRequested ? 'Requested' : 'Follow'}
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* ── CAPTION ── */}
                {item?.caption ? (
                    <TouchableOpacity
                        onPress={() => setCaptionExpanded(!captionExpanded)}
                        activeOpacity={0.8}
                        style={[styles.captionCard, { backgroundColor: cardBg, borderColor: border }]}
                    >
                        <Text style={[styles.caption, { color: textColor }]} numberOfLines={captionExpanded ? undefined : 3}>
                            {item.caption}
                        </Text>
                        {item.caption.length > 120 && (
                            <Text style={[styles.seeMore, { color: colors.primary }]}>
                                {captionExpanded ? 'See less' : 'See more'}
                            </Text>
                        )}
                    </TouchableOpacity>
                ) : null}

                {/* ── STATS ROW ── */}
                <View style={[styles.statsRow, { backgroundColor: cardBg, borderColor: border }]}>
                    <TouchableOpacity onPress={handleLike} style={styles.statBtn} activeOpacity={0.7}>
                        <Animated.View style={{ transform: [{ scale: likeScaleAnim }] }}>
                            <Heart
                                size={26}
                                color={liked ? '#ff2d55' : textColor}
                                fill={liked ? '#ff2d55' : 'transparent'}
                                strokeWidth={2}
                            />
                        </Animated.View>
                        <Text style={[styles.statText, { color: liked ? '#ff2d55' : textColor }]}>
                            {likesCount > 999 ? `${(likesCount / 1000).toFixed(1)}k` : likesCount}
                        </Text>
                    </TouchableOpacity>

                    <View style={[styles.statDivider, { backgroundColor: border }]} />

                    <TouchableOpacity style={styles.statBtn} activeOpacity={0.7}>
                        <MessageCircle size={26} color={textColor} strokeWidth={2} />
                        <Text style={[styles.statText, { color: textColor }]}>
                            {comments.length > 0 ? comments.length : (commentsCount || 0)}
                        </Text>
                    </TouchableOpacity>

                    <View style={[styles.statDivider, { backgroundColor: border }]} />

                    <TouchableOpacity onPress={() => setShowShareModal(true)} style={styles.statBtn} activeOpacity={0.7}>
                        <Send size={24} color={textColor} strokeWidth={2} />
                        <Text style={[styles.statText, { color: textColor }]}>Share</Text>
                    </TouchableOpacity>

                    <View style={[styles.statDivider, { backgroundColor: border }]} />

                    <TouchableOpacity onPress={handleSave} style={styles.statBtn} activeOpacity={0.7}>
                        <Animated.View style={{ transform: [{ scale: saveScaleAnim }] }}>
                            <Bookmark
                                size={24}
                                color={isSaved ? '#FFEA00' : textColor}
                                fill={isSaved ? '#FFEA00' : 'transparent'}
                                strokeWidth={isSaved ? 0 : 2}
                            />
                        </Animated.View>
                    </TouchableOpacity>
                </View>
            </View>

            {/* ─── SCROLLABLE COMMENTS SECTION ─── */}
            <View style={[styles.commentsContainer, { backgroundColor: cardBg, borderColor: border }]}>
                <Text style={[styles.commentsTitle, { color: textColor }]}>
                    Comments
                    {(comments.length > 0 || commentsCount > 0) && (
                        <Text style={{ color: subText, fontWeight: '500' }}> · {comments.length || commentsCount}</Text>
                    )}
                </Text>

                {commentsLoading ? (
                    <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 12 }} />
                ) : comments.length === 0 ? (
                    <View style={styles.noComments}>
                        <MessageCircle size={28} color={subText} strokeWidth={1.5} />
                        <Text style={[styles.noCommentsText, { color: subText }]}>
                            No comments yet
                        </Text>
                    </View>
                ) : (
                    <ScrollView 
                        style={{ flex: 1 }} 
                        contentContainerStyle={{ paddingRight: 4 }}
                        nestedScrollEnabled={true} 
                        showsVerticalScrollIndicator={true}
                    >
                        {[...comments].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()).map((comment, idx) => (
                            <View key={comment._id || idx} style={[styles.commentItem, { borderBottomColor: border }]}>
                                <Image
                                    source={{ uri: getCorrectUrl(comment.user?.avatar) || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(comment.user?.name || 'User') + '&background=random' }}
                                    style={styles.commentAvatar}
                                />
                                <View style={styles.commentBody}>
                                    <View style={styles.commentUserRow}>
                                        <Text style={[styles.commentUser, { color: textColor }]} numberOfLines={1}>
                                            {comment.user?.name || 'User'}
                                        </Text>
                                        <Text style={[styles.commentDate, { color: subText }]}>
                                            {comment.createdAt ? formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true }).replace('about ', '') : ''}
                                        </Text>
                                    </View>
                                    <Text style={[styles.commentText, { color: isDark ? 'rgba(255,255,255,0.75)' : 'rgba(0,0,0,0.7)' }]} numberOfLines={3}>
                                        {comment.text}
                                    </Text>
                                </View>
                            </View>
                        ))}
                    </ScrollView>
                )}
            </View>

            {/* ─── FIXED BOTTOM SECTION ─── */}
            <View style={styles.fixedBottom}>
                {/* ── COMMENT INPUT ── */}
                <View style={[styles.commentInputRow, { backgroundColor: cardBg, borderColor: border }]}>
                    <Image
                        source={{ uri: getCorrectUrl(user?.avatar) || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user?.name || 'User') + '&background=random' }}
                        style={styles.commentInputAvatar}
                    />
                    <TextInput
                        value={commentText}
                        onChangeText={setCommentText}
                        placeholder="Add a comment..."
                        placeholderTextColor={subText}
                        style={[styles.commentInput, { backgroundColor: inputBg, color: textColor }]}
                        returnKeyType="send"
                        onSubmitEditing={handlePostComment}
                        multiline={false}
                    />
                    {commentText.trim().length > 0 && (
                        <TouchableOpacity onPress={handlePostComment} style={[styles.sendBtn, { backgroundColor: colors.primary }]} activeOpacity={0.8}>
                            <Ionicons name="send" size={16} color="white" />
                        </TouchableOpacity>
                    )}
                </View>

                {/* ── MUSIC TAG ── */}
                {item?.music && (
                    <View style={[styles.musicTag, { backgroundColor: cardBg, borderColor: border }]}>
                        <Ionicons name="musical-notes" size={16} color={colors.primary} />
                        <Text style={[styles.musicText, { color: textColor }]} numberOfLines={1}>
                            {item.music}
                        </Text>
                    </View>
                )}
            </View>

            {/* MODALS */}
            <ShareToUsersModal visible={showShareModal} onClose={() => setShowShareModal(false)} post={item} />
        </View>
    );
}

const styles = StyleSheet.create({
    panel: {
        flex: 1,
        width: '100%' as any,
        height: '100%' as any,
        borderLeftWidth: 1,
        flexShrink: 0,
    },
    fixedTop: {
        padding: 12,
        paddingBottom: 4,
        gap: 8,
    },
    fixedBottom: {
        padding: 12,
        paddingTop: 4,
        gap: 8,
        paddingBottom: 16,
    },
    commentsContainer: {
        flex: 1,
        marginHorizontal: 12,
        padding: 12,
        borderRadius: 16,
        borderWidth: 1,
        marginBottom: 4,
        overflow: 'hidden' as any,
    },
    // User Card
    userCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        borderRadius: 16,
        borderWidth: 1,
        gap: 10,
    },
    avatarWrap: {
        position: 'relative',
    },
    avatarArea: {
        marginBottom: 4,
    },
    avatar: {
        width: 64,
        height: 64,
        borderRadius: 32,
    },
    onlineDot: {
        position: 'absolute',
        bottom: 2,
        right: 2,
        width: 14,
        height: 14,
        borderRadius: 7,
        backgroundColor: '#22c55e',
        borderWidth: 2,
    },
    userMeta: {
        flex: 1,
    },
    userName: {
        fontSize: 18,
        fontWeight: '800',
        letterSpacing: 0.1,
    },
    userHandle: {
        fontSize: 14,
        marginTop: 2,
    },
    followBtn: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
    },
    followActiveBtn: {
        backgroundColor: '#0095f6',
    },
    followingBtn: {
        backgroundColor: 'transparent',
        borderWidth: 1,
    },
    followBtnText: {
        fontSize: 13,
        fontWeight: '700',
        color: 'white',
    },
    // Caption
    captionCard: {
        padding: 14,
        borderRadius: 16,
        borderWidth: 1,
    },
    caption: {
        fontSize: 16,
        lineHeight: 24,
        fontWeight: '400',
    },
    seeMore: {
        fontSize: 13,
        fontWeight: '600',
        marginTop: 6,
    },
    // Stats
    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 16,
        borderWidth: 1,
        paddingVertical: 8,
        paddingHorizontal: 6,
    },
    statBtn: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
        gap: 5,
    },
    statDivider: {
        width: 1,
        height: 28,
        opacity: 0.5,
    },
    statText: {
        fontSize: 14,
        fontWeight: '700',
    },
    // Comments
    commentsSection: {
        padding: 14,
        borderRadius: 16,
        borderWidth: 1,
    },
    commentsTitle: {
        fontSize: 15,
        fontWeight: '800',
        marginBottom: 12,
        letterSpacing: 0.1,
    },
    noComments: {
        alignItems: 'center',
        paddingVertical: 20,
        gap: 8,
    },
    noCommentsText: {
        fontSize: 13,
    },
    commentItem: {
        flexDirection: 'row',
        gap: 10,
        paddingVertical: 10,
        borderBottomWidth: 0.5,
    },
    commentAvatar: {
        width: 34,
        height: 34,
        borderRadius: 17,
    },
    commentBody: {
        flex: 1,
    },
    commentUserRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 2,
    },
    commentUser: {
        fontSize: 13,
        fontWeight: '700',
        flexShrink: 1,
    },
    commentDate: {
        fontSize: 11,
        opacity: 0.8,
    },
    commentText: {
        fontSize: 13,
        lineHeight: 18,
    },
    viewAllBtn: {
        marginTop: 12,
        alignItems: 'center',
    },
    viewAllText: {
        fontSize: 13,
        fontWeight: '700',
    },
    // Comment Input
    commentInputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        borderRadius: 16,
        borderWidth: 1,
        gap: 10,
    },
    commentInputAvatar: {
        width: 34,
        height: 34,
        borderRadius: 17,
    },
    commentInput: {
        flex: 1,
        height: 38,
        borderRadius: 20,
        paddingHorizontal: 14,
        fontSize: 14,
    },
    sendBtn: {
        width: 34,
        height: 34,
        borderRadius: 17,
        alignItems: 'center',
        justifyContent: 'center',
    },
    // Music
    musicTag: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        padding: 12,
        borderRadius: 16,
        borderWidth: 1,
    },
    musicText: {
        fontSize: 13,
        fontWeight: '500',
        flex: 1,
    },
});
