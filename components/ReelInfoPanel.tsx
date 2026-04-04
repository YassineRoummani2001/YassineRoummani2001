import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    Image,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    TextInput,
    ActivityIndicator,
    Platform,
    Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useUser } from '@/context/UserContext';
import { API_BASE_URL } from '@/constants/Config';
import { useThemeContext } from '@/context/ThemeContext';
import CommentsModal from './CommentsModal';

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
    const avatarUri = author.avatar || 'https://i.pravatar.cc/150';

    const [comments, setComments] = useState<any[]>([]);
    const [commentText, setCommentText] = useState('');
    const [commentsLoading, setCommentsLoading] = useState(false);
    const [showAllComments, setShowAllComments] = useState(false);
    const [captionExpanded, setCaptionExpanded] = useState(false);

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
                setComments(Array.isArray(data) ? data.slice(0, 5) : []);
            }
        } catch (e) {
            // silent
        } finally {
            setCommentsLoading(false);
        }
    };

    useEffect(() => {
        if (item?._id) fetchComments();
    }, [item?._id]);

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
        try {
            await fetch(`${API_BASE_URL}/api/posts/${item._id}/comments`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${user.token}`,
                },
                body: JSON.stringify({ text }),
            });
            fetchComments();
        } catch (e) {
            // silent
        }
    };

    const isOwnReel = user?._id === (author._id || author.id);

    const bg = isDark ? '#0d0d0d' : '#fff';
    const cardBg = isDark ? '#161616' : '#f7f7f7';
    const border = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';
    const textColor = isDark ? '#fff' : '#111';
    const subText = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.45)';
    const inputBg = isDark ? '#1e1e1e' : '#f0f0f0';

    return (
        <View style={[styles.panel, { backgroundColor: bg, borderLeftColor: border }]}>
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {/* ─── USER CARD ─── */}
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

                {/* ─── CAPTION ─── */}
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

                {/* ─── STATS ROW ─── */}
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
                            {commentsCount > 999 ? `${(commentsCount / 1000).toFixed(1)}k` : commentsCount}
                        </Text>
                    </TouchableOpacity>

                    <View style={[styles.statDivider, { backgroundColor: border }]} />

                    <TouchableOpacity onPress={onShare} style={styles.statBtn} activeOpacity={0.7}>
                        <Send size={24} color={textColor} strokeWidth={2} />
                        <Text style={[styles.statText, { color: textColor }]}>Share</Text>
                    </TouchableOpacity>

                    <View style={[styles.statDivider, { backgroundColor: border }]} />

                    <TouchableOpacity onPress={handleSave} style={styles.statBtn} activeOpacity={0.7}>
                        <Animated.View style={{ transform: [{ scale: saveScaleAnim }] }}>
                            <Bookmark
                                size={24}
                                color={isSaved ? '#FACD00' : textColor}
                                fill={isSaved ? '#FACD00' : 'transparent'}
                                strokeWidth={isSaved ? 0 : 2}
                            />
                        </Animated.View>
                    </TouchableOpacity>
                </View>

                {/* ─── COMMENTS SECTION ─── */}
                <View style={[styles.commentsSection, { backgroundColor: cardBg, borderColor: border }]}>
                    <Text style={[styles.commentsTitle, { color: textColor }]}>
                        Comments
                        {commentsCount > 0 && (
                            <Text style={{ color: subText, fontWeight: '500' }}> · {commentsCount}</Text>
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
                        comments.map((comment, idx) => (
                            <View key={comment._id || idx} style={[styles.commentItem, { borderBottomColor: border }]}>
                                <Image
                                    source={{ uri: comment.user?.avatar || 'https://i.pravatar.cc/100' }}
                                    style={styles.commentAvatar}
                                />
                                <View style={styles.commentBody}>
                                    <Text style={[styles.commentUser, { color: textColor }]}>
                                        {comment.user?.name || 'User'}
                                    </Text>
                                    <Text style={[styles.commentText, { color: isDark ? 'rgba(255,255,255,0.75)' : 'rgba(0,0,0,0.7)' }]} numberOfLines={2}>
                                        {comment.text}
                                    </Text>
                                </View>
                            </View>
                        ))
                    )}

                    {commentsCount > 5 && (
                        <TouchableOpacity style={styles.viewAllBtn} activeOpacity={0.7}>
                            <Text style={[styles.viewAllText, { color: colors.primary }]}>
                                View all {commentsCount} comments
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* ─── COMMENT INPUT ─── */}
                <View style={[styles.commentInputRow, { backgroundColor: cardBg, borderColor: border }]}>
                    <Image
                        source={{ uri: user?.avatar || 'https://i.pravatar.cc/150' }}
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

                {/* ─── MUSIC TAG ─── */}
                {item?.music && (
                    <View style={[styles.musicTag, { backgroundColor: cardBg, borderColor: border }]}>
                        <Ionicons name="musical-notes" size={16} color={colors.primary} />
                        <Text style={[styles.musicText, { color: textColor }]} numberOfLines={1}>
                            {item.music}
                        </Text>
                    </View>
                )}
            </ScrollView>
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
    scrollContent: {
        padding: 16,
        gap: 12,
        paddingBottom: 40,
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
    avatar: {
        width: 52,
        height: 52,
        borderRadius: 26,
    },
    onlineDot: {
        position: 'absolute',
        bottom: 1,
        right: 1,
        width: 13,
        height: 13,
        borderRadius: 7,
        backgroundColor: '#22c55e',
        borderWidth: 2,
    },
    userMeta: {
        flex: 1,
    },
    userName: {
        fontSize: 15,
        fontWeight: '700',
        letterSpacing: 0.1,
    },
    userHandle: {
        fontSize: 13,
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
        fontSize: 14,
        lineHeight: 21,
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
        fontSize: 12,
        fontWeight: '600',
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
    commentUser: {
        fontSize: 13,
        fontWeight: '700',
        marginBottom: 2,
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
