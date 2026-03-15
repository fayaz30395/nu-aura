'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { format, formatDistanceToNow, isToday, parseISO } from 'date-fns';
import {
  Megaphone, Cake, Trophy, UserPlus, TrendingUp, Award,
  MessageCircle, ThumbsUp, Heart, Star, Pin, ChevronDown,
  RefreshCw, Linkedin, Lightbulb, ExternalLink, Send, MessageSquare,
  MoreHorizontal, Trash2, Pencil,
} from 'lucide-react';
import { feedService } from '@/lib/services/feed.service';
import { wallService } from '@/lib/services/wall.service';
import type { CommentResponse } from '@/lib/services/wall.service';
import type { FeedItem, FeedItemType } from '@/lib/types/feed';
import { useAuth } from '@/lib/hooks/useAuth';
import { usePermissions, Permissions } from '@/lib/hooks/usePermissions';

// ─── Config ──────────────────────────────────────────────────────────
const FEED_COLORS: Record<FeedItemType, { bg: string; border: string; icon: string; badge: string }> = {
  ANNOUNCEMENT: {
    bg: 'bg-[var(--bg-surface)]',
    border: 'border-l-gray-400',
    icon: 'text-[var(--text-muted)]',
    badge: 'bg-[var(--bg-surface)] text-[var(--text-primary)] dark:bg-gray-800 dark:text-gray-300',
  },
  BIRTHDAY: {
    bg: 'bg-[var(--bg-surface)]',
    border: 'border-l-gray-400',
    icon: 'text-[var(--text-muted)]',
    badge: 'bg-[var(--bg-surface)] text-[var(--text-primary)] dark:bg-gray-800 dark:text-gray-300',
  },
  WORK_ANNIVERSARY: {
    bg: 'bg-[var(--bg-surface)]',
    border: 'border-l-gray-400',
    icon: 'text-[var(--text-muted)]',
    badge: 'bg-[var(--bg-surface)] text-[var(--text-primary)] dark:bg-gray-800 dark:text-gray-300',
  },
  NEW_JOINER: {
    bg: 'bg-[var(--bg-surface)]',
    border: 'border-l-gray-400',
    icon: 'text-[var(--text-muted)]',
    badge: 'bg-[var(--bg-surface)] text-[var(--text-primary)] dark:bg-gray-800 dark:text-gray-300',
  },
  PROMOTION: {
    bg: 'bg-[var(--bg-surface)]',
    border: 'border-l-gray-400',
    icon: 'text-[var(--text-muted)]',
    badge: 'bg-[var(--bg-surface)] text-[var(--text-primary)] dark:bg-gray-800 dark:text-gray-300',
  },
  RECOGNITION: {
    bg: 'bg-[var(--bg-surface)]',
    border: 'border-l-gray-400',
    icon: 'text-[var(--text-muted)]',
    badge: 'bg-[var(--bg-surface)] text-[var(--text-primary)] dark:bg-gray-800 dark:text-gray-300',
  },
  LINKEDIN_POST: {
    bg: 'bg-[var(--bg-surface)]',
    border: 'border-l-gray-400',
    icon: 'text-[var(--text-muted)]',
    badge: 'bg-[var(--bg-surface)] text-[var(--text-primary)] dark:bg-gray-800 dark:text-gray-300',
  },
  SPOTLIGHT: {
    bg: 'bg-[var(--bg-surface)]',
    border: 'border-l-gray-400',
    icon: 'text-[var(--text-muted)]',
    badge: 'bg-[var(--bg-surface)] text-[var(--text-primary)] dark:bg-gray-800 dark:text-gray-300',
  },
  WALL_POST: {
    bg: 'bg-[var(--bg-surface)]',
    border: 'border-l-primary-400',
    icon: 'text-primary-500',
    badge: 'bg-primary-50 text-primary-700 dark:bg-primary-900 dark:text-primary-300',
  },
};

const FEED_ICONS: Record<FeedItemType, React.ReactNode> = {
  ANNOUNCEMENT: <Megaphone className="h-4 w-4" />,
  BIRTHDAY: <Cake className="h-4 w-4" />,
  WORK_ANNIVERSARY: <Trophy className="h-4 w-4" />,
  NEW_JOINER: <UserPlus className="h-4 w-4" />,
  PROMOTION: <TrendingUp className="h-4 w-4" />,
  RECOGNITION: <Award className="h-4 w-4" />,
  LINKEDIN_POST: <Linkedin className="h-4 w-4" />,
  SPOTLIGHT: <Lightbulb className="h-4 w-4" />,
  WALL_POST: <MessageSquare className="h-4 w-4" />,
};

const FEED_LABELS: Record<FeedItemType, string> = {
  ANNOUNCEMENT: 'Announcement',
  BIRTHDAY: 'Birthday',
  WORK_ANNIVERSARY: 'Work Anniversary',
  NEW_JOINER: 'New Joiner',
  PROMOTION: 'Promotion',
  RECOGNITION: 'Recognition',
  LINKEDIN_POST: 'LinkedIn',
  SPOTLIGHT: 'Spotlight',
  WALL_POST: 'Post',
};

const ITEMS_PER_PAGE = 8;

type FeedFilter = 'ALL' | FeedItemType;

const FILTER_OPTIONS: { value: FeedFilter; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'ANNOUNCEMENT', label: 'Announcements' },
  { value: 'BIRTHDAY', label: 'Birthdays' },
  { value: 'WORK_ANNIVERSARY', label: 'Anniversaries' },
  { value: 'NEW_JOINER', label: 'New Joiners' },
  { value: 'RECOGNITION', label: 'Recognition' },
  { value: 'LINKEDIN_POST', label: 'LinkedIn' },
  { value: 'WALL_POST', label: 'Posts' },
];

// ─── Main Component ──────────────────────────────────────────────────
interface CompanyFeedProps {
  employeeId?: string;
  refreshKey?: number;
}

export function CompanyFeed({ employeeId, refreshKey = 0 }: CompanyFeedProps) {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FeedFilter>('ALL');
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadFeed = async (showRefresh = false) => {
    try {
      if (showRefresh) setIsRefreshing(true);
      else setIsLoading(true);
      const data = await feedService.getCompanyFeed(employeeId);
      setItems(data);
    } catch {
      setItems(getDemoFeed());
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => { loadFeed(); }, [employeeId, refreshKey]);

  const filteredItems = activeFilter === 'ALL' ? items : items.filter(item => item.type === activeFilter);
  const visibleItems = filteredItems.slice(0, visibleCount);
  const hasMore = visibleCount < filteredItems.length;

  if (isLoading) {
    return (
      <div className="rounded-xl border border-[var(--border-main)] bg-[var(--bg-card)] p-4">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Company Feed</h3>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-start gap-2.5 p-3 rounded-lg bg-[var(--bg-surface)] relative overflow-hidden">
              {/* Shimmer effect */}
              <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />

              <div className="w-8 h-8 rounded-full bg-gray-200/50 dark:bg-gray-700/50 animate-pulse" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3.5 bg-gray-200/50 dark:bg-gray-700/50 rounded w-1/3 animate-pulse" style={{ animationDelay: '0.1s' }} />
                <div className="h-3 bg-gray-200/50 dark:bg-gray-700/50 rounded w-2/3 animate-pulse" style={{ animationDelay: '0.2s' }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[var(--border-main)] bg-[var(--bg-card)] p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">
          Company Feed
        </h3>
        <button
          onClick={() => loadFeed(true)}
          disabled={isRefreshing}
          className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] dark:hover:bg-gray-800 transition-colors"
          title="Refresh"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Filter Chips */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {FILTER_OPTIONS.map(option => (
          <button
            key={option.value}
            onClick={() => { setActiveFilter(option.value); setVisibleCount(ITEMS_PER_PAGE); }}
            className={`px-2.5 py-1 text-xs font-medium rounded-full transition-colors ${
              activeFilter === option.value
                ? 'bg-[var(--text-primary)] text-[var(--text-inverse)]'
                : 'bg-[var(--bg-surface)] text-[var(--text-muted)] hover:bg-gray-200 dark:bg-gray-800 dark:text-[var(--text-muted)] dark:hover:bg-gray-700'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {/* Feed Items */}
      {visibleItems.length > 0 ? (
        <div className="space-y-2">
          {visibleItems.map(item => (
            <FeedCard key={item.id} item={item} onDeleted={(id) => setItems((prev) => prev.filter((i) => i.id !== id))} />
          ))}
        </div>
      ) : (
        <div className="text-center py-6">
          <p className="text-xs text-[var(--text-muted)]">
            {activeFilter === 'ALL' ? 'No feed items yet.' : `No ${FEED_LABELS[activeFilter as FeedItemType]?.toLowerCase()} items.`}
          </p>
        </div>
      )}

      {/* Show More */}
      {hasMore && (
        <button
          onClick={() => setVisibleCount(prev => prev + ITEMS_PER_PAGE)}
          className="w-full mt-3 py-2 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] dark:hover:bg-gray-900 rounded-lg transition-colors flex items-center justify-center gap-1"
        >
          Show more <ChevronDown className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

// ─── Action Menu (shared) ─────────────────────────────────────────────
function ActionMenu({ showMenu, setShowMenu, onDelete, isDeleting }: {
  showMenu: boolean;
  setShowMenu: (v: boolean) => void;
  onDelete: () => void;
  isDeleting: boolean;
}) {
  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="p-0.5 rounded text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)] transition-colors"
      >
        <MoreHorizontal className="h-3.5 w-3.5" />
      </button>
      {showMenu && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
          <div className="absolute right-0 top-full mt-1 z-20 min-w-[120px] rounded-lg border border-[var(--border-main)] bg-[var(--bg-card)] shadow-lg py-1">
            <button
              onClick={onDelete}
              disabled={isDeleting}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
            >
              <Trash2 className="h-3 w-3" />
              {isDeleting ? 'Deleting...' : 'Delete post'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Feed Card ───────────────────────────────────────────────────────
function FeedCard({ item, onDeleted }: { item: FeedItem; onDeleted?: (id: string) => void }) {
  const colors = FEED_COLORS[item.type];
  const icon = FEED_ICONS[item.type];
  const { user } = useAuth();
  const { hasPermission, isAdmin } = usePermissions();
  const [liked, setLiked] = useState(item.hasReacted ?? false);
  const [localLikeCount, setLocalLikeCount] = useState(item.likesCount ?? 0);
  const [localCommentCount, setLocalCommentCount] = useState(item.commentsCount ?? 0);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<CommentResponse[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isHidden, setIsHidden] = useState(false);

  // Determine if current user can manage this post
  const isPostAuthor = item.wallPostId && item.wallPostAuthorId && user?.employeeId === item.wallPostAuthorId;
  const canManagePost = item.wallPostId && (isPostAuthor || isAdmin || hasPermission(Permissions.WALL_MANAGE));

  const handleDeletePost = async () => {
    if (!item.wallPostId || isDeleting) return;
    setIsDeleting(true);
    try {
      await wallService.deletePost(item.wallPostId);
      setIsHidden(true);
      onDeleted?.(item.id);
    } catch (error) {
      console.error('Failed to delete post:', error);
    } finally {
      setIsDeleting(false);
      setShowActionMenu(false);
    }
  };

  if (isHidden) return null;

  const loadComments = async () => {
    if (!item.wallPostId) return;
    setIsLoadingComments(true);
    try {
      const data = await wallService.getComments(item.wallPostId, 0, 20);
      setComments(data.content);
      setLocalCommentCount(data.totalElements);
    } catch (error) {
      console.error('Failed to load comments:', error);
    } finally {
      setIsLoadingComments(false);
    }
  };

  const handleToggleComments = () => {
    const willShow = !showComments;
    setShowComments(willShow);
    if (willShow && comments.length === 0) {
      loadComments();
    }
  };

  const handleLike = async () => {
    // If no wallPostId, this item doesn't support likes yet
    if (!item.wallPostId) {
      console.warn('This feed item does not support likes yet');
      return;
    }

    const wasLiked = liked;
    setLiked(!wasLiked);
    setLocalLikeCount((prev) => wasLiked ? Math.max(0, prev - 1) : prev + 1);

    try {
      if (wasLiked) {
        await wallService.removeReaction(item.wallPostId);
      } else {
        await wallService.addReaction(item.wallPostId, 'LIKE');
      }
    } catch (error) {
      console.error('Failed to update reaction:', error);
      // Revert on error
      setLiked(wasLiked);
      setLocalLikeCount(item.likesCount ?? 0);
    }
  };

  const handleSubmitComment = async () => {
    if (!commentText.trim() || !item.wallPostId || isSubmittingComment) return;

    setIsSubmittingComment(true);
    try {
      const newComment = await wallService.addComment(item.wallPostId, { content: commentText.trim() });
      setComments((prev) => [...prev, newComment]);
      setCommentText('');
      setLocalCommentCount((prev) => prev + 1);
    } catch (error) {
      console.error('Failed to add comment:', error);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  // ─── WALL_POST: social-style card (like reference image) ───
  if (item.type === 'WALL_POST') {
    const authorInitials = (item.wallPostAuthor ?? '')
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

    return (
      <div className="rounded-xl border border-[var(--border-main)] bg-[var(--bg-card)] overflow-hidden transition-colors">
        {/* Header: avatar + "Author created a post" + timestamp + action menu */}
        <div className="flex items-start gap-3 px-4 pt-4 pb-2">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
            {item.personAvatarUrl ? (
              <Image src={item.personAvatarUrl} alt={item.wallPostAuthor || ''} width={40} height={40} className="rounded-full object-cover" />
            ) : (
              <span className="text-sm font-semibold text-primary-700 dark:text-primary-300">{authorInitials}</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm leading-snug">
              <span className="font-semibold text-[var(--text-primary)]">{item.wallPostAuthor}</span>
              <span className="text-[var(--text-muted)] font-normal"> created a post</span>
            </p>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              {formatFeedDate(item.timestamp)}
              {item.wallPostAuthorDepartment && (
                <span> · {item.wallPostAuthorDepartment}</span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {item.isPinned && (
              <span className="inline-flex items-center gap-0.5 text-[10px] text-[var(--text-muted)]">
                <Pin className="h-2.5 w-2.5" /> Pinned
              </span>
            )}
            {canManagePost && (
              <ActionMenu
                showMenu={showActionMenu}
                setShowMenu={setShowActionMenu}
                onDelete={handleDeletePost}
                isDeleting={isDeleting}
              />
            )}
          </div>
        </div>

        {/* Post content */}
        <div className="px-4 pb-3">
          <p className="text-sm text-[var(--text-primary)] leading-relaxed whitespace-pre-wrap">
            {item.description || item.title}
          </p>
        </div>

        {/* Post image */}
        {item.wallPostImageUrl && (
          <div className="relative w-full h-48 bg-[var(--bg-secondary)]">
            <Image src={item.wallPostImageUrl} alt="Post image" fill className="object-cover" sizes="(max-width: 768px) 100vw, 600px" />
          </div>
        )}

        {/* Action bar: Like + Comment on left, counts on right */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-[var(--border-subtle)]">
          <div className="flex items-center gap-4">
            <button
              onClick={handleLike}
              className={`inline-flex items-center gap-1.5 text-xs font-medium transition-colors ${
                liked ? 'text-primary-600 dark:text-primary-400' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
              }`}
            >
              <ThumbsUp className={`h-4 w-4 ${liked ? 'fill-primary-600 dark:fill-primary-400' : ''}`} />
              Like
            </button>
            <button
              onClick={handleToggleComments}
              className={`inline-flex items-center gap-1.5 text-xs font-medium transition-colors ${
                showComments ? 'text-primary-600 dark:text-primary-400' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
              }`}
            >
              <MessageCircle className="h-4 w-4" />
              Comment
            </button>
          </div>
          {(localLikeCount > 0 || localCommentCount > 0) && (
            <div className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
              {localLikeCount > 0 && (
                <span className="inline-flex items-center gap-1">
                  <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-primary-500 text-white">
                    <ThumbsUp className="h-2 w-2" />
                  </span>
                  {localLikeCount} {localLikeCount === 1 ? 'reaction' : 'reactions'}
                </span>
              )}
              {localLikeCount > 0 && localCommentCount > 0 && (
                <span className="mx-0.5">·</span>
              )}
              {localCommentCount > 0 && (
                <button onClick={handleToggleComments} className="hover:text-[var(--text-secondary)] hover:underline transition-colors">
                  {localCommentCount} {localCommentCount === 1 ? 'Comment' : 'Comments'}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Comment section */}
        {showComments && item.wallPostId && (
          <div className="px-4 py-3 space-y-2">
            <div className="flex gap-2">
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmitComment(); }
                }}
                placeholder="Write a comment..."
                className="flex-1 px-3 py-2 text-xs rounded-lg border border-[var(--border-main)] bg-[var(--bg-surface)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-primary-500"
                disabled={isSubmittingComment}
              />
              <button
                onClick={handleSubmitComment}
                disabled={!commentText.trim() || isSubmittingComment}
                className="inline-flex items-center gap-1 px-3 py-2 text-xs font-semibold text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Send className="h-3 w-3" />
              </button>
            </div>
            {isLoadingComments && (
              <div className="flex items-center gap-2 py-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--border-main)] border-t-primary-500" />
                <span className="text-xs text-[var(--text-muted)]">Loading comments...</span>
              </div>
            )}
            {!isLoadingComments && comments.length > 0 && (
              <div className="space-y-2">
                {comments.map((comment) => (
                  <FeedCommentItem key={comment.id} comment={comment} postId={item.wallPostId!} depth={0} onReplyAdded={() => setLocalCommentCount((prev) => prev + 1)} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // ─── Default card layout (non-WALL_POST types) ───
  return (
    <div className={`rounded-lg border-l-2 ${colors.border} ${colors.bg} p-3 transition-colors hover:bg-[var(--bg-surface)] dark:hover:bg-gray-800`}>
      <div className="flex items-start gap-2.5">
        {/* Icon */}
        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-white border border-[var(--border-main)] dark:bg-gray-800 dark:border-gray-700 ${colors.icon}`}>
          {item.personAvatarUrl ? (
            <Image src={item.personAvatarUrl} alt={item.personName || ''} width={32} height={32} className="rounded-full object-cover" />
          ) : icon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Badge row */}
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className={`inline-flex items-center px-1.5 py-0.5 text-xs font-medium rounded ${colors.badge}`}>
              {FEED_LABELS[item.type]}
            </span>
            {item.isPinned && (
              <span className="inline-flex items-center gap-0.5 text-xs text-[var(--text-muted)]">
                <Pin className="h-2.5 w-2.5" /> Pinned
              </span>
            )}
            {item.isToday && (
              <span className="text-xs font-medium text-green-600 dark:text-green-400">Today</span>
            )}
            {item.priority === 'CRITICAL' && (
              <span className="text-xs font-medium text-red-600 dark:text-red-400">Urgent</span>
            )}
          </div>

          {/* Title */}
          <p className="text-sm font-medium text-[var(--text-primary)] leading-snug">
            {item.title}
          </p>

          {/* Type-specific content */}
          {item.type === 'ANNOUNCEMENT' && item.description && (
            <p className="text-xs text-[var(--text-muted)] mt-0.5 line-clamp-2">
              {stripHtml(item.description)}
            </p>
          )}

          {item.type === 'RECOGNITION' && (
            <div className="mt-0.5">
              <p className="text-xs text-[var(--text-muted)]">
                {item.giverName} recognized <span className="font-medium text-[var(--text-secondary)]">{item.receiverName}</span>
              </p>
              {item.description && (
                <p className="text-xs text-[var(--text-muted)] mt-0.5 line-clamp-2 italic">
                  &ldquo;{item.description}&rdquo;
                </p>
              )}
              <div className="flex items-center gap-2.5 mt-1">
                {item.pointsAwarded && item.pointsAwarded > 0 && (
                  <span className="inline-flex items-center gap-0.5 text-xs text-[var(--text-muted)]">
                    <Star className="h-2.5 w-2.5" /> {item.pointsAwarded} pts
                  </span>
                )}
                {(item.likesCount ?? 0) > 0 && (
                  <span className="inline-flex items-center gap-0.5 text-xs text-[var(--text-muted)]">
                    <ThumbsUp className="h-2.5 w-2.5" /> {item.likesCount}
                  </span>
                )}
                {(item.commentsCount ?? 0) > 0 && (
                  <span className="inline-flex items-center gap-0.5 text-xs text-[var(--text-muted)]">
                    <MessageCircle className="h-2.5 w-2.5" /> {item.commentsCount}
                  </span>
                )}
              </div>
            </div>
          )}

          {item.type === 'BIRTHDAY' && (
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              {item.personDepartment}
              {!item.isToday && item.daysUntil !== undefined && ` · in ${item.daysUntil}d`}
            </p>
          )}

          {item.type === 'WORK_ANNIVERSARY' && (
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              {item.personDesignation}{item.personDepartment && ` · ${item.personDepartment}`}
            </p>
          )}

          {item.type === 'NEW_JOINER' && (
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              {item.description}
              {item.daysSinceJoining !== undefined && item.daysSinceJoining <= 7 && (
                <span className="ml-1 text-[var(--text-secondary)] font-medium">
                  (joined {item.daysSinceJoining === 0 ? 'today' : `${item.daysSinceJoining}d ago`})
                </span>
              )}
            </p>
          )}

          {item.type === 'LINKEDIN_POST' && (
            <div className="mt-1">
              {item.description && (
                <p className="text-xs text-[var(--text-muted)] line-clamp-2">{item.description}</p>
              )}
              {item.linkedinImageUrl && (
                <div className="mt-1.5 rounded-lg overflow-hidden bg-[var(--bg-surface)] relative w-full h-24">
                  <Image src={item.linkedinImageUrl} alt={item.title ? `Image for post: ${item.title}` : 'LinkedIn post image'} fill className="object-cover" sizes="(max-width: 768px) 100vw, 400px" />
                </div>
              )}
              <div className="flex items-center gap-2.5 mt-1.5">
                {item.linkedinEngagement && (
                  <>
                    {item.linkedinEngagement.likes > 0 && (
                      <span className="inline-flex items-center gap-0.5 text-xs text-[var(--text-muted)]">
                        <ThumbsUp className="h-2.5 w-2.5" /> {item.linkedinEngagement.likes}
                      </span>
                    )}
                    {item.linkedinEngagement.comments > 0 && (
                      <span className="inline-flex items-center gap-0.5 text-xs text-[var(--text-muted)]">
                        <MessageCircle className="h-2.5 w-2.5" /> {item.linkedinEngagement.comments}
                      </span>
                    )}
                  </>
                )}
                {item.linkedinPostUrl && (
                  <a
                    href={item.linkedinPostUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-0.5 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] dark:hover:text-gray-300 ml-auto"
                  >
                    View on LinkedIn <ExternalLink className="h-2.5 w-2.5" />
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Reaction Bar - Only show if item supports social features */}
          {item.wallPostId && (
            <div className="flex items-center gap-3 mt-2 pt-1.5 border-t border-[var(--border-subtle)]">
              <button
                onClick={handleLike}
                className={`inline-flex items-center gap-1 text-xs font-medium transition-colors ${
                  liked ? 'text-red-500' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)] dark:hover:text-gray-300'
                }`}
              >
                <Heart className={`h-3 w-3 ${liked ? 'fill-red-500' : ''}`} />
                {localLikeCount > 0 ? localLikeCount : 'Like'}
              </button>
              <button
                onClick={handleToggleComments}
                className={`inline-flex items-center gap-1 text-xs font-medium transition-colors ${
                  showComments ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)] dark:hover:text-gray-300'
                }`}
              >
                <MessageCircle className="h-3 w-3" />
                {localCommentCount > 0 ? localCommentCount : 'Comment'}
              </button>
            </div>
          )}

          {/* Comment Section */}
          {showComments && item.wallPostId && (
            <div className="mt-2 pt-2 border-t border-[var(--border-subtle)] space-y-2">
              {/* Comment Input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmitComment();
                    }
                  }}
                  placeholder="Write a comment..."
                  className="flex-1 px-2.5 py-1.5 text-xs rounded-lg border border-[var(--border-main)] bg-[var(--bg-surface)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-primary-500"
                  disabled={isSubmittingComment}
                />
                <button
                  onClick={handleSubmitComment}
                  disabled={!commentText.trim() || isSubmittingComment}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Send className="h-3 w-3" />
                  {isSubmittingComment ? 'Posting...' : 'Post'}
                </button>
              </div>

              {/* Comments List */}
              {isLoadingComments && (
                <div className="flex items-center gap-2 py-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--border-main)] border-t-primary-500" />
                  <span className="text-xs text-[var(--text-muted)]">Loading comments...</span>
                </div>
              )}

              {!isLoadingComments && comments.length > 0 && (
                <div className="space-y-2">
                  {comments.map((comment) => (
                    <FeedCommentItem
                      key={comment.id}
                      comment={comment}
                      postId={item.wallPostId!}
                      depth={0}
                      onReplyAdded={() => setLocalCommentCount((prev) => prev + 1)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Timestamp */}
          <div className="flex items-center gap-1.5 mt-1 text-xs text-[var(--text-muted)]">
            <span>{formatFeedDate(item.timestamp)}</span>
            {item.publishedByName && <span>· {item.publishedByName}</span>}
            {item.readCount !== undefined && item.readCount > 0 && (
              <span>· {item.readCount} read{item.readCount !== 1 ? 's' : ''}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Recursive Comment Item ──────────────────────────────────────────
const MAX_REPLY_DEPTH = 3;

function FeedCommentItem({
  comment,
  postId,
  depth,
  onReplyAdded,
}: {
  comment: CommentResponse;
  postId: string;
  depth: number;
  onReplyAdded: () => void;
}) {
  const [liked, setLiked] = useState(false);
  const [localLikes, setLocalLikes] = useState(comment.likesCount ?? 0);
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);
  const [childReplies, setChildReplies] = useState<CommentResponse[]>(comment.replies ?? []);
  const [showReplies, setShowReplies] = useState(false);
  const [isLoadingReplies, setIsLoadingReplies] = useState(false);
  const [repliesFetched, setRepliesFetched] = useState(false);

  const initials = comment.author.fullName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const handleLikeComment = () => {
    // Optimistic toggle — backend comment-like endpoint not yet implemented
    const wasLiked = liked;
    setLiked(!wasLiked);
    setLocalLikes((prev) => (wasLiked ? Math.max(0, prev - 1) : prev + 1));
  };

  const handleLoadReplies = async () => {
    if (repliesFetched || isLoadingReplies) {
      setShowReplies(true);
      return;
    }
    setIsLoadingReplies(true);
    try {
      const data = await wallService.getReplies(comment.id, 0, 20);
      setChildReplies(data.content);
      setRepliesFetched(true);
      setShowReplies(true);
    } catch (error) {
      console.error('Failed to load replies:', error);
    } finally {
      setIsLoadingReplies(false);
    }
  };

  const handleSubmitReply = async () => {
    if (!replyText.trim() || isSubmittingReply) return;
    setIsSubmittingReply(true);
    try {
      const newReply = await wallService.addComment(postId, {
        content: replyText.trim(),
        parentCommentId: comment.id,
      });
      setChildReplies((prev) => [...prev, newReply]);
      setReplyText('');
      setShowReplyInput(false);
      setShowReplies(true);
      setRepliesFetched(true);
      onReplyAdded();
    } catch (error) {
      console.error('Failed to add reply:', error);
    } finally {
      setIsSubmittingReply(false);
    }
  };

  const hasReplies = childReplies.length > 0 || (comment.replyCount > 0 && !repliesFetched);

  return (
    <div className={depth > 0 ? 'ml-6 mt-1.5' : ''}>
      <div className="flex gap-2">
        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
          <span className="text-[10px] font-semibold text-primary-700 dark:text-primary-300">
            {initials}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="rounded-lg bg-[var(--bg-secondary)] px-2.5 py-1.5">
            <span className="text-xs font-medium text-[var(--text-primary)]">
              {comment.author.fullName}
            </span>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              {comment.content}
            </p>
          </div>
          {/* Actions row: like, reply, timestamp */}
          <div className="flex items-center gap-2 mt-0.5">
            <button
              onClick={handleLikeComment}
              className={`inline-flex items-center gap-0.5 text-[10px] font-medium transition-colors ${
                liked ? 'text-red-500' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
              }`}
            >
              <Heart className={`h-2.5 w-2.5 ${liked ? 'fill-red-500' : ''}`} />
              {localLikes > 0 ? localLikes : 'Like'}
            </button>
            {depth < MAX_REPLY_DEPTH && (
              <button
                onClick={() => setShowReplyInput(!showReplyInput)}
                className="text-[10px] font-medium text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
              >
                Reply
              </button>
            )}
            <span className="text-[10px] text-[var(--text-muted)]">
              {formatFeedDate(comment.createdAt)}
            </span>
          </div>

          {/* Reply input */}
          {showReplyInput && (
            <div className="flex gap-1.5 mt-1.5">
              <input
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmitReply();
                  }
                }}
                placeholder="Write a reply..."
                className="flex-1 px-2 py-1 text-xs rounded-lg border border-[var(--border-main)] bg-[var(--bg-surface)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-primary-500"
                disabled={isSubmittingReply}
                autoFocus
              />
              <button
                onClick={handleSubmitReply}
                disabled={!replyText.trim() || isSubmittingReply}
                className="px-2 py-1 text-xs font-semibold text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Send className="h-3 w-3" />
              </button>
            </div>
          )}

          {/* Show/hide replies toggle */}
          {hasReplies && !showReplies && (
            <button
              onClick={handleLoadReplies}
              disabled={isLoadingReplies}
              className="text-[10px] font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 mt-1 transition-colors disabled:opacity-50"
            >
              {isLoadingReplies ? 'Loading...' : `View ${comment.replyCount || childReplies.length} ${(comment.replyCount || childReplies.length) === 1 ? 'reply' : 'replies'}`}
            </button>
          )}
          {showReplies && childReplies.length > 0 && (
            <button
              onClick={() => setShowReplies(false)}
              className="text-[10px] font-medium text-[var(--text-muted)] hover:text-[var(--text-secondary)] mt-1 transition-colors"
            >
              Hide replies
            </button>
          )}

          {/* Recursive child replies */}
          {showReplies && childReplies.length > 0 && (
            <div className="space-y-1.5">
              {childReplies.map((reply) => (
                <FeedCommentItem
                  key={reply.id}
                  comment={reply}
                  postId={postId}
                  depth={depth + 1}
                  onReplyAdded={onReplyAdded}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
}

function formatFeedDate(dateStr: string): string {
  try {
    const date = parseISO(dateStr);
    if (isToday(date)) return 'Today';
    return formatDistanceToNow(date, { addSuffix: true });
  } catch {
    return dateStr;
  }
}

// ─── Demo Feed Data ──────────────────────────────────────────────────
function getDemoFeed(): FeedItem[] {
  const today = new Date().toISOString();
  const yesterday = new Date(Date.now() - 86400000).toISOString();
  const twoDaysAgo = new Date(Date.now() - 172800000).toISOString();
  const threeDaysAgo = new Date(Date.now() - 259200000).toISOString();
  const fiveDaysAgo = new Date(Date.now() - 432000000).toISOString();

  return [
    {
      id: 'demo-ann-1', type: 'ANNOUNCEMENT', timestamp: today,
      title: 'Q1 2026 All-Hands Meeting — March 20th',
      description: 'Join us for the quarterly all-hands meeting. We will discuss company performance, upcoming product launches, and open Q&A with leadership.',
      category: 'EVENT', priority: 'HIGH', isPinned: true, publishedByName: 'HR Team', readCount: 45,
    },
    {
      id: 'demo-bday-1', type: 'BIRTHDAY', timestamp: today,
      title: 'Happy Birthday, Priya Sharma!',
      personName: 'Priya Sharma', personDepartment: 'Engineering', isToday: true, daysUntil: 0,
    },
    {
      id: 'demo-recog-1', type: 'RECOGNITION', timestamp: yesterday,
      title: 'Outstanding Delivery',
      description: 'Incredible work on the payment gateway integration. The client was thrilled with the early delivery!',
      giverName: 'Arjun Patel', receiverName: 'Meera Nair',
      recognitionType: 'KUDOS', recognitionCategory: 'GOING_EXTRA_MILE',
      pointsAwarded: 50, likesCount: 12, commentsCount: 3,
    },
    {
      id: 'demo-anniv-1', type: 'WORK_ANNIVERSARY', timestamp: yesterday,
      title: 'Rahul Verma completes 3 years!',
      personName: 'Rahul Verma', personDepartment: 'Product', personDesignation: 'Senior Product Manager',
      yearsCompleted: 3, isToday: false, daysUntil: 1,
    },
    {
      id: 'demo-newjoin-1', type: 'NEW_JOINER', timestamp: twoDaysAgo,
      title: 'Welcome Ananya Reddy to the team!',
      description: 'UX Designer - Design',
      personName: 'Ananya Reddy', personDepartment: 'Design', personDesignation: 'UX Designer',
      daysSinceJoining: 2,
    },
    {
      id: 'demo-ann-2', type: 'ANNOUNCEMENT', timestamp: threeDaysAgo,
      title: 'Updated Remote Work Policy — Effective April 1',
      description: 'We are updating our hybrid work policy. Employees can now work remotely up to 3 days per week.',
      category: 'POLICY_UPDATE', priority: 'MEDIUM', isPinned: false, publishedByName: 'Deepa Kumar', readCount: 128,
    },
    {
      id: 'demo-recog-2', type: 'RECOGNITION', timestamp: fiveDaysAgo,
      title: 'Team Player Award',
      description: 'Always willing to help others and share knowledge. A true team player!',
      giverName: 'Vikram Singh', receiverName: 'Kavitha Rajan',
      recognitionType: 'APPRECIATION', recognitionCategory: 'TEAMWORK',
      pointsAwarded: 30, likesCount: 8, commentsCount: 1,
    },
    {
      id: 'demo-bday-2', type: 'BIRTHDAY', timestamp: new Date(Date.now() + 172800000).toISOString(),
      title: "Arun Kumar's birthday is coming up",
      personName: 'Arun Kumar', personDepartment: 'Finance', isToday: false, daysUntil: 2,
    },
    {
      id: 'demo-linkedin-1', type: 'LINKEDIN_POST' as FeedItemType, timestamp: yesterday,
      title: 'Nulogic recognized as Top 50 HR Tech Startups 2026',
      description: 'Thrilled to announce that Nulogic has been featured in the Top 50 HR Tech Startups to Watch in 2026.',
      linkedinAuthor: 'Nulogic', linkedinAuthorTitle: 'Official Company Page',
      linkedinPostUrl: 'https://linkedin.com/company/nulogic', linkedinImageUrl: undefined,
      linkedinEngagement: { likes: 234, comments: 45, shares: 67 },
    },
  ];
}
