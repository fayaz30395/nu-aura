'use client';

import {useState} from 'react';
import Image from 'next/image';
import {formatDistanceToNow, isToday, parseISO,} from 'date-fns';
import {
  Award,
  Cake,
  Check,
  ExternalLink,
  Heart,
  Lightbulb,
  Linkedin,
  Megaphone,
  MessageCircle,
  MessageSquare,
  MoreHorizontal,
  Pencil,
  Pin,
  Send,
  Star,
  ThumbsUp,
  Trash2,
  TrendingUp,
  Trophy,
  UserPlus,
} from 'lucide-react';
import type {CommentResponse} from '@/lib/services/core/wall.service';
import {wallService} from '@/lib/services/core/wall.service';
import {PRAISE_CATEGORIES} from '@/components/dashboard/PostComposer';
import type {FeedItem, FeedItemType} from '@/lib/types/core/feed';
import {useAuth} from '@/lib/hooks/useAuth';
import {Permissions, usePermissions} from '@/lib/hooks/usePermissions';
import {cn} from '@/lib/utils';
import {logger} from '@/lib/utils/logger';
import {FeedCommentItem} from './FeedCommentThread';

// ─── Config (co-located with FeedCard, exported for CompanyFeed) ──────
export const FEED_COLORS: Record<FeedItemType, { bg: string; border: string; icon: string; badge: string }> = {
  ANNOUNCEMENT: {
    bg: 'bg-[var(--bg-surface)]',
    border: 'border-l-[var(--border-main)]',
    icon: 'text-[var(--text-muted)]',
    badge: 'bg-[var(--bg-surface)] text-[var(--text-primary)]',
  },
  BIRTHDAY: {
    bg: 'bg-[var(--bg-surface)]',
    border: 'border-l-[var(--border-main)]',
    icon: 'text-[var(--text-muted)]',
    badge: 'bg-[var(--bg-surface)] text-[var(--text-primary)]',
  },
  WORK_ANNIVERSARY: {
    bg: 'bg-[var(--bg-surface)]',
    border: 'border-l-[var(--border-main)]',
    icon: 'text-[var(--text-muted)]',
    badge: 'bg-[var(--bg-surface)] text-[var(--text-primary)]',
  },
  NEW_JOINER: {
    bg: 'bg-[var(--bg-surface)]',
    border: 'border-l-[var(--border-main)]',
    icon: 'text-[var(--text-muted)]',
    badge: 'bg-[var(--bg-surface)] text-[var(--text-primary)]',
  },
  PROMOTION: {
    bg: 'bg-[var(--bg-surface)]',
    border: 'border-l-[var(--border-main)]',
    icon: 'text-[var(--text-muted)]',
    badge: 'bg-[var(--bg-surface)] text-[var(--text-primary)]',
  },
  RECOGNITION: {
    bg: 'bg-[var(--bg-surface)]',
    border: 'border-l-[var(--border-main)]',
    icon: 'text-[var(--text-muted)]',
    badge: 'bg-[var(--bg-surface)] text-[var(--text-primary)]',
  },
  LINKEDIN_POST: {
    bg: 'bg-[var(--bg-surface)]',
    border: 'border-l-[var(--border-main)]',
    icon: 'text-[var(--text-muted)]',
    badge: 'bg-[var(--bg-surface)] text-[var(--text-primary)]',
  },
  SPOTLIGHT: {
    bg: 'bg-[var(--bg-surface)]',
    border: 'border-l-[var(--border-main)]',
    icon: 'text-[var(--text-muted)]',
    badge: 'bg-[var(--bg-surface)] text-[var(--text-primary)]',
  },
  WALL_POST: {
    bg: 'bg-[var(--bg-surface)]',
    border: 'border-l-accent-400',
    icon: 'text-accent-500',
    badge: 'bg-accent-50 text-accent-700 dark:bg-accent-900 dark:text-accent-300',
  },
};

export const FEED_ICONS: Record<FeedItemType, React.ReactNode> = {
  ANNOUNCEMENT: <Megaphone className="h-4 w-4"/>,
  BIRTHDAY: <Cake className="h-4 w-4"/>,
  WORK_ANNIVERSARY: <Trophy className="h-4 w-4"/>,
  NEW_JOINER: <UserPlus className="h-4 w-4"/>,
  PROMOTION: <TrendingUp className="h-4 w-4"/>,
  RECOGNITION: <Award className="h-4 w-4"/>,
  LINKEDIN_POST: <Linkedin className="h-4 w-4"/>,
  SPOTLIGHT: <Lightbulb className="h-4 w-4"/>,
  WALL_POST: <MessageSquare className="h-4 w-4"/>,
};

export const FEED_LABELS: Record<FeedItemType, string> = {
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

// ─── Helpers ──────────────────────────────────────────────────────────
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
}

export function formatFeedDate(dateStr: string): string {
  try {
    const date = parseISO(dateStr);
    if (isToday(date)) return 'Today';
    return formatDistanceToNow(date, {addSuffix: true});
  } catch {
    return dateStr;
  }
}

// ─── ActionMenu ───────────────────────────────────────────────────────
interface ActionMenuProps {
  showMenu: boolean;
  setShowMenu: (v: boolean) => void;
  onEdit?: () => void;
  onDelete: () => void;
  isDeleting: boolean;
}

function ActionMenu({showMenu, setShowMenu, onEdit, onDelete, isDeleting}: ActionMenuProps) {
  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="p-0.5 rounded text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
        aria-label="Open menu"
      >
        <MoreHorizontal className="h-3.5 w-3.5"/>
      </button>
      {showMenu && (
        <>
          <div className="fixed inset-0 z-10 cursor-pointer" onClick={() => setShowMenu(false)}/>
          <div
            className="absolute right-0 top-full mt-1 z-20 min-w-[120px] rounded-lg border border-[var(--border-main)] bg-[var(--bg-card)] shadow-[var(--shadow-dropdown)] py-1">
            {onEdit && (
              <button
                onClick={() => {
                  onEdit();
                  setShowMenu(false);
                }}
                className="w-full flex items-center gap-2 px-4 py-1.5 text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-surface)]  transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
              >
                <Pencil className="h-3 w-3"/>
                Edit post
              </button>
            )}
            <button
              onClick={onDelete}
              disabled={isDeleting}
              className="w-full flex items-center gap-2 px-4 py-1.5 text-xs text-danger-600 hover:bg-danger-50 dark:hover:bg-danger-900/20 transition-colors disabled:opacity-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
            >
              <Trash2 className="h-3 w-3"/>
              {isDeleting ? 'Deleting...' : 'Delete post'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ─── FeedCard Props ───────────────────────────────────────────────────
export interface FeedCardProps {
  item: FeedItem;
  onDeleted?: (id: string) => void;
  onUpdated?: (id: string, newContent: string) => void;
}

/**
 * Universal feed card renderer.
 * Handles WALL_POST (social card with reactions, comments, polls, praise)
 * and all other feed item types (announcement, birthday, recognition, etc.).
 */
export function FeedCard({item, onDeleted, onUpdated}: FeedCardProps) {
  const colors = FEED_COLORS[item.type];
  const icon = FEED_ICONS[item.type];
  const {user} = useAuth();
  const {hasPermission, isAdmin} = usePermissions();
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

  // Poll state
  const [localPollOptions, setLocalPollOptions] = useState(item.pollOptions ?? []);
  const [localHasVoted, setLocalHasVoted] = useState(item.hasVoted ?? false);
  const [localVotedOptionId, setLocalVotedOptionId] = useState(item.userVotedOptionId ?? null);
  const [isVoting, setIsVoting] = useState(false);

  // Edit post state
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(item.description || item.title || '');
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [localContent, setLocalContent] = useState(item.description || item.title || '');

  // Reactor details state
  const [localReactors, setLocalReactors] = useState(item.recentReactors ?? []);
  const [showReactorsPopover, setShowReactorsPopover] = useState(false);
  const [allReactors, setAllReactors] = useState<Array<{
    employeeId: string;
    fullName: string;
    avatarUrl?: string;
    reactionType: string;
    reactedAt: string
  }>>([]);
  const [isLoadingAllReactors, setIsLoadingAllReactors] = useState(false);

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
      logger.error('Failed to delete post:', error);
    } finally {
      setIsDeleting(false);
      setShowActionMenu(false);
    }
  };

  const handleStartEdit = () => {
    setEditContent(localContent);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditContent(localContent);
  };

  const handleSaveEdit = async () => {
    if (!item.wallPostId || !editContent.trim() || isSavingEdit) return;
    setIsSavingEdit(true);
    try {
      await wallService.updatePost(item.wallPostId, {content: editContent.trim()});
      setLocalContent(editContent.trim());
      setIsEditing(false);
      onUpdated?.(item.id, editContent.trim());
    } catch (error) {
      logger.error('Failed to update post:', error);
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleVote = async (optionId: string) => {
    if (!item.wallPostId || isVoting) return;
    setIsVoting(true);
    try {
      const updated = await wallService.vote(item.wallPostId, optionId);
      if (updated.pollOptions) {
        setLocalPollOptions(updated.pollOptions.map((o) => ({
          id: o.id,
          text: o.text,
          voteCount: o.voteCount,
          votePercentage: o.votePercentage,
        })));
      }
      setLocalHasVoted(true);
      setLocalVotedOptionId(optionId);
    } catch (error) {
      logger.error('Failed to vote:', error);
    } finally {
      setIsVoting(false);
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
      logger.error('Failed to load comments:', error);
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
    if (!item.wallPostId) {
      logger.warn('This feed item does not support likes yet');
      return;
    }

    const wasLiked = liked;
    const prevReactors = [...localReactors];
    setLiked(!wasLiked);
    setLocalLikeCount((prev) => wasLiked ? Math.max(0, prev - 1) : prev + 1);

    // Optimistically update reactor list
    if (wasLiked) {
      setLocalReactors((prev) => prev.filter((r) => r.employeeId !== user?.employeeId));
    } else if (user) {
      setLocalReactors((prev) => [
        {
          employeeId: user.employeeId || '',
          fullName: user.fullName || 'You',
          avatarUrl: user.profilePictureUrl,
          reactionType: 'LIKE',
          reactedAt: new Date().toISOString()
        },
        ...prev,
      ].slice(0, 5));
    }

    try {
      if (wasLiked) {
        await wallService.removeReaction(item.wallPostId);
      } else {
        await wallService.addReaction(item.wallPostId, 'LIKE');
      }
    } catch (error) {
      logger.error('Failed to update reaction:', error);
      // Revert on error
      setLiked(wasLiked);
      setLocalLikeCount(item.likesCount ?? 0);
      setLocalReactors(prevReactors);
    }
  };

  const handleShowAllReactors = async () => {
    if (!item.wallPostId) return;
    setShowReactorsPopover(true);
    if (allReactors.length === 0) {
      setIsLoadingAllReactors(true);
      try {
        const data = await wallService.getPostReactions(item.wallPostId, 0, 50);
        setAllReactors(data.content);
      } catch (error) {
        logger.error('Failed to load reactors:', error);
      } finally {
        setIsLoadingAllReactors(false);
      }
    }
  };

  const handleSubmitComment = async () => {
    if (!commentText.trim() || !item.wallPostId || isSubmittingComment) return;

    setIsSubmittingComment(true);
    try {
      const newComment = await wallService.addComment(item.wallPostId, {content: commentText.trim()});
      setComments((prev) => [...prev, newComment]);
      setCommentText('');
      setLocalCommentCount((prev) => prev + 1);
    } catch (error) {
      logger.error('Failed to add comment:', error);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  // ─── WALL_POST: social-style card ────────────────────────────────────
  if (item.type === 'WALL_POST') {
    const _authorInitials = (item.wallPostAuthor ?? '')
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

    const isOwnPost = user?.employeeId === item.wallPostAuthorId;
    const avatarUrl = item.personAvatarUrl
      || (isOwnPost && user?.profilePictureUrl ? user.profilePictureUrl : null)
      || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.wallPostAuthor || 'U')}&background=6366f1&color=fff&size=80&bold=true&format=svg`;

    return (
      <div
        className="rounded-xl border border-[var(--border-main)] bg-[var(--bg-card)] overflow-hidden transition-colors">
        {/* Header: avatar + "Author created a post" + timestamp + action menu */}
        <div className="flex items-start gap-2 px-4 pt-4 pb-2">
          <div className="flex-shrink-0 w-10 h-10 rounded-full overflow-hidden">
            <Image src={avatarUrl} alt={item.wallPostAuthor || ''} width={40} height={40}
                   className="rounded-full object-cover w-10 h-10"/>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm leading-snug">
              <span className="font-semibold text-[var(--text-primary)]">{item.wallPostAuthor}</span>
              <span className="text-[var(--text-muted)] font-normal">
                {item.wallPostType === 'POLL' && ' created a poll'}
                {item.wallPostType === 'PRAISE' && <> recognized <span
                  className="font-semibold text-[var(--text-primary)]">{item.praiseRecipientName}</span></>}
                {(!item.wallPostType || item.wallPostType === 'POST') && ' created a post'}
              </span>
            </p>
            <p className="text-caption mt-0.5">
              {formatFeedDate(item.timestamp)}
              {item.wallPostAuthorDepartment && (
                <span> · {item.wallPostAuthorDepartment}</span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {item.isPinned && (
              <span className="inline-flex items-center gap-0.5 text-2xs text-[var(--text-muted)]">
                <Pin className="h-2.5 w-2.5"/> Pinned
              </span>
            )}
            {canManagePost && (
              <ActionMenu
                showMenu={showActionMenu}
                setShowMenu={setShowActionMenu}
                onEdit={item.wallPostId ? handleStartEdit : undefined}
                onDelete={handleDeletePost}
                isDeleting={isDeleting}
              />
            )}
          </div>
        </div>

        {/* Post content — inline edit mode */}
        <div className="px-4 pb-4">
          {isEditing ? (
            <div className="space-y-2">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.ctrlKey) handleSaveEdit();
                  if (e.key === 'Escape') handleCancelEdit();
                }}
                className="input-aura w-full resize-none text-sm min-h-[60px]"
                autoFocus
                disabled={isSavingEdit}
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={handleCancelEdit}
                  disabled={isSavingEdit}
                  className="px-4 py-1.5 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] rounded-lg transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={!editContent.trim() || isSavingEdit}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-accent-700 rounded-lg hover:bg-accent-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
                >
                  {isSavingEdit ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-[var(--text-primary)] leading-relaxed whitespace-pre-wrap">
              {localContent}
            </p>
          )}
        </div>

        {/* Post image */}
        {item.wallPostImageUrl && (
          <div className="relative w-full h-48 bg-[var(--bg-secondary)]">
            <Image src={item.wallPostImageUrl} alt="Post image" fill className="object-cover"
                   sizes="(max-width: 768px) 100vw, 600px"/>
          </div>
        )}

        {/* Poll voting UI */}
        {item.wallPostType === 'POLL' && localPollOptions.length > 0 && (
          <div className="px-4 pb-2 space-y-1.5">
            {localPollOptions.map((option) => {
              const isSelected = localVotedOptionId === option.id;
              const totalVotes = localPollOptions.reduce((sum, o) => sum + o.voteCount, 0);
              const pct = totalVotes > 0 ? Math.round((option.voteCount / totalVotes) * 100) : 0;

              return (
                <button
                  key={option.id}
                  onClick={() => !localHasVoted && handleVote(option.id)}
                  disabled={isVoting || localHasVoted}
                  className={cn(
                    'relative w-full text-left rounded-lg border px-4 py-2.5 text-sm transition-all overflow-hidden',
                    localHasVoted
                      ? 'cursor-default border-[var(--border-main)]'
                      : 'cursor-pointer border-[var(--border-main)] hover:border-accent-300 hover:bg-accent-50/50 dark:hover:border-accent-700 dark:hover:bg-accent-950/30'
                  )}
                >
                  {localHasVoted && (
                    <div
                      className={cn(
                        'absolute inset-y-0 left-0 transition-all duration-500 rounded-lg',
                        isSelected
                          ? 'bg-accent-100 dark:bg-accent-900/40'
                          : 'bg-[var(--bg-secondary)]'
                      )}
                      style={{width: `${pct}%`}}
                    />
                  )}
                  <div className="relative row-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {isSelected && (
                        <Check size={14} className="text-accent-700 dark:text-accent-400 shrink-0"/>
                      )}
                      <span className={cn(
                        'truncate',
                        isSelected ? 'font-semibold text-accent-700 dark:text-accent-300' : 'text-[var(--text-primary)]'
                      )}>
                        {option.text}
                      </span>
                    </div>
                    {localHasVoted && (
                      <span className="text-xs font-medium text-[var(--text-muted)] shrink-0">{pct}%</span>
                    )}
                  </div>
                </button>
              );
            })}
            <p className="text-caption pt-1 pl-1">
              {localPollOptions.reduce((sum, o) => sum + o.voteCount, 0)} vote{localPollOptions.reduce((sum, o) => sum + o.voteCount, 0) !== 1 ? 's' : ''}
              {localHasVoted && ' · You voted'}
            </p>
          </div>
        )}

        {/* Praise badge + recipient */}
        {item.wallPostType === 'PRAISE' && item.praiseRecipientName && (
          <div className="px-4 pb-2">
            <div
              className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-warning-50 to-warning-50 dark:from-warning-950/30 dark:to-warning-950/30 border border-warning-200/50 dark:border-warning-800/30">
              <div
                className="w-12 h-12 rounded-full bg-warning-100 dark:bg-warning-900/50 flex items-center justify-center text-lg font-bold text-warning-700 dark:text-warning-300 overflow-hidden shrink-0">
                {item.praiseRecipientAvatar ? (
                  <Image src={item.praiseRecipientAvatar} alt={item.praiseRecipientName ?? ''} width={48} height={48}
                         className="w-full h-full object-cover"/>
                ) : (
                  item.praiseRecipientName.charAt(0)
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[var(--text-primary)]">{item.praiseRecipientName}</p>
                {(item.praiseRecipientDesignation || item.praiseRecipientDepartment) && (
                  <p className="text-caption truncate">
                    {[item.praiseRecipientDesignation, item.praiseRecipientDepartment].filter(Boolean).join(' · ')}
                  </p>
                )}
                {item.praiseCategory && (() => {
                  const cat = PRAISE_CATEGORIES.find((c) => c.id === item.praiseCategory);
                  return cat ? (
                    <span
                      className={cn('inline-flex items-center gap-1 mt-1.5 px-2.5 py-1 rounded-full text-xs font-medium border', cat.color)}>
                      <span>{cat.emoji}</span> {cat.label}
                    </span>
                  ) : (
                    <span
                      className="inline-flex items-center gap-1 mt-1.5 px-2.5 py-1 rounded-full text-xs font-medium border border-warning-200 bg-warning-50 text-warning-700 dark:bg-warning-950 dark:text-warning-300 dark:border-warning-800">
                      🏆 {item.praiseCategory}
                    </span>
                  );
                })()}
              </div>
            </div>
          </div>
        )}

        {/* Action bar: Like + Comment (hidden for polls) */}
        <div
          className={`row-between px-4 py-2 border-t border-[var(--border-subtle)] ${item.wallPostType === 'POLL' ? 'hidden' : ''}`}>
          <div className="flex items-center gap-4">
            <button
              onClick={handleLike}
              className={`inline-flex items-center gap-1.5 text-xs font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2 ${
                liked ? 'text-accent-700 dark:text-accent-400' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
              }`}
            >
              <ThumbsUp className={`h-4 w-4 ${liked ? 'fill-accent-700 dark:fill-accent-400' : ''}`}/>
              Like
            </button>
            <button
              onClick={handleToggleComments}
              className={`inline-flex items-center gap-1.5 text-xs font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2 ${
                showComments ? 'text-accent-700 dark:text-accent-400' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
              }`}
            >
              <MessageCircle className="h-4 w-4"/>
              Comment
            </button>
          </div>
          {(localLikeCount > 0 || localCommentCount > 0) && (
            <div className="flex items-center gap-1 text-caption">
              {localLikeCount > 0 && (
                <div className="relative">
                  <button
                    onClick={handleShowAllReactors}
                    className="inline-flex items-center gap-1.5 hover:text-[var(--text-secondary)] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
                    aria-label="Show all reactions"
                  >
                    {localReactors.length > 0 && (
                      <div className="flex -space-x-1.5">
                        {localReactors.slice(0, 3).map((reactor) => (
                          <Image
                            key={reactor.employeeId}
                            src={reactor.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(reactor.fullName)}&background=6366f1&color=fff&size=20&bold=true`}
                            alt={reactor.fullName}
                            width={20}
                            height={20}
                            className="h-5 w-5 rounded-full border border-white dark:border-[var(--border-main)] object-cover"
                            title={reactor.fullName}
                            unoptimized
                          />
                        ))}
                      </div>
                    )}
                    {localReactors.length === 0 && <span className="text-sm leading-none">👍</span>}
                    <span>
                      {localReactors.length > 0
                        ? localLikeCount <= 2
                          ? localReactors.slice(0, 2).map((r) => r.fullName.split(' ')[0]).join(' and ')
                          : `${localReactors[0].fullName.split(' ')[0]} and ${localLikeCount - 1} other${localLikeCount - 1 === 1 ? '' : 's'}`
                        : `${localLikeCount} ${localLikeCount === 1 ? 'reaction' : 'reactions'}`
                      }
                    </span>
                  </button>

                  {/* Reactors popover */}
                  {showReactorsPopover && (
                    <>
                      <div className="fixed inset-0 z-40 cursor-pointer" onClick={() => setShowReactorsPopover(false)}/>
                      <div
                        className="absolute right-0 bottom-full mb-2 z-50 w-64 bg-[var(--bg-card)] border border-[var(--border-main)] rounded-xl shadow-[var(--shadow-dropdown)] overflow-hidden">
                        <div className="row-between px-4 py-2 divider-b">
                          <span
                            className="text-xs font-semibold text-[var(--text-primary)]">Reactions ({localLikeCount})</span>
                          <button onClick={() => setShowReactorsPopover(false)}
                                  className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
                                  aria-label="Close reactions popup">✕
                          </button>
                        </div>
                        <div className="max-h-48 overflow-y-auto">
                          {isLoadingAllReactors ? (
                            <div className="flex items-center justify-center py-4">
                              <div
                                className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--border-main)] border-t-accent-500"/>
                            </div>
                          ) : (
                            (allReactors.length > 0 ? allReactors : localReactors).map((reactor) => (
                              <div key={reactor.employeeId}
                                   className="flex items-center gap-2 px-4 py-2 hover:bg-[var(--bg-surface)] transition-colors">
                                <Image
                                  src={reactor.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(reactor.fullName)}&background=6366f1&color=fff&size=28&bold=true`}
                                  alt={reactor.fullName}
                                  width={28}
                                  height={28}
                                  className="h-7 w-7 rounded-full object-cover flex-shrink-0"
                                  unoptimized
                                />
                                <div className="flex-1 min-w-0">
                                  <p
                                    className="text-xs font-medium text-[var(--text-primary)] truncate">{reactor.fullName}</p>
                                </div>
                                <span className="text-sm">👍</span>
                              </div>
                            ))
                          )}
                          {!isLoadingAllReactors && allReactors.length === 0 && localReactors.length === 0 && (
                            <p className="text-caption text-center py-4">No reactions yet</p>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
              {localLikeCount > 0 && localCommentCount > 0 && (
                <span className="mx-0.5">·</span>
              )}
              {localCommentCount > 0 && (
                <button onClick={handleToggleComments}
                        className="hover:text-[var(--text-secondary)] hover:underline transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2">
                  {localCommentCount} {localCommentCount === 1 ? 'Comment' : 'Comments'}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Comment section */}
        {showComments && item.wallPostId && (
          <div className="px-4 py-4 space-y-2">
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
                className="flex-1 px-4 py-2 text-xs rounded-lg border border-[var(--border-main)] bg-[var(--bg-surface)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-accent-500"
                disabled={isSubmittingComment}
              />
              <button
                onClick={handleSubmitComment}
                disabled={!commentText.trim() || isSubmittingComment}
                className="inline-flex items-center gap-1 px-4 py-2 text-xs font-semibold text-white bg-accent-700 rounded-lg hover:bg-accent-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
                aria-label="Submit comment"
              >
                <Send className="h-3 w-3"/>
              </button>
            </div>
            {isLoadingComments && (
              <div className="flex items-center gap-2 py-2">
                <div
                  className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--border-main)] border-t-accent-500"/>
                <span className="text-caption">Loading comments...</span>
              </div>
            )}
            {!isLoadingComments && comments.length > 0 && (
              <div className="space-y-2">
                {comments.map((comment) => (
                  <FeedCommentItem key={comment.id} comment={comment} postId={item.wallPostId!} depth={0}
                                   onReplyAdded={() => setLocalCommentCount((prev) => prev + 1)} currentUser={user ? {
                    employeeId: user.employeeId,
                    profilePictureUrl: user.profilePictureUrl
                  } : undefined}/>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // ─── Default card layout (non-WALL_POST types) ─────────────────────
  return (
    <div
      className={`rounded-lg border-l-2 ${colors.border} ${colors.bg} p-4 transition-colors hover:bg-[var(--bg-surface)] `}>
      <div className="flex items-start gap-2.5">
        {/* Icon */}
        <div
          className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-[var(--bg-card)] border border-[var(--border-main)] ${colors.icon}`}>
          {item.personAvatarUrl ? (
            <Image src={item.personAvatarUrl} alt={item.personName || ''} width={32} height={32}
                   className="rounded-full object-cover"/>
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
              <span className="inline-flex items-center gap-0.5 text-caption">
                <Pin className="h-2.5 w-2.5"/> Pinned
              </span>
            )}
            {item.isToday && (
              <span className="text-xs font-medium text-success-600 dark:text-success-400">Today</span>
            )}
            {item.priority === 'CRITICAL' && (
              <span className="text-xs font-medium text-danger-600 dark:text-danger-400">Urgent</span>
            )}
          </div>

          {/* Title */}
          <p className="text-sm font-medium text-[var(--text-primary)] leading-snug">
            {item.title}
          </p>

          {/* Type-specific content */}
          {item.type === 'ANNOUNCEMENT' && item.description && (
            <p className="text-caption mt-0.5 line-clamp-2">
              {stripHtml(item.description)}
            </p>
          )}

          {item.type === 'RECOGNITION' && (
            <div className="mt-0.5">
              <p className="text-caption">
                {item.giverName} recognized <span
                className="font-medium text-[var(--text-secondary)]">{item.receiverName}</span>
              </p>
              {item.description && (
                <p className="text-caption mt-0.5 line-clamp-2 italic">
                  &ldquo;{item.description}&rdquo;
                </p>
              )}
              <div className="flex items-center gap-2.5 mt-1">
                {item.pointsAwarded && item.pointsAwarded > 0 && (
                  <span className="inline-flex items-center gap-0.5 text-caption">
                    <Star className="h-2.5 w-2.5"/> {item.pointsAwarded} pts
                  </span>
                )}
                {(item.likesCount ?? 0) > 0 && (
                  <span className="inline-flex items-center gap-0.5 text-caption">
                    <ThumbsUp className="h-2.5 w-2.5"/> {item.likesCount}
                  </span>
                )}
                {(item.commentsCount ?? 0) > 0 && (
                  <span className="inline-flex items-center gap-0.5 text-caption">
                    <MessageCircle className="h-2.5 w-2.5"/> {item.commentsCount}
                  </span>
                )}
              </div>
            </div>
          )}

          {item.type === 'BIRTHDAY' && (
            <p className="text-caption mt-0.5">
              {item.personDepartment}
              {!item.isToday && item.daysUntil !== undefined && ` · in ${item.daysUntil}d`}
            </p>
          )}

          {item.type === 'WORK_ANNIVERSARY' && (
            <p className="text-caption mt-0.5">
              {item.personDesignation}{item.personDepartment && ` · ${item.personDepartment}`}
            </p>
          )}

          {item.type === 'NEW_JOINER' && (
            <p className="text-caption mt-0.5">
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
                <p className="text-caption line-clamp-2">{item.description}</p>
              )}
              {item.linkedinImageUrl && (
                <div className="mt-1.5 rounded-lg overflow-hidden bg-[var(--bg-surface)] relative w-full h-24">
                  <Image src={item.linkedinImageUrl}
                         alt={item.title ? `Image for post: ${item.title}` : 'LinkedIn post image'} fill
                         className="object-cover" sizes="(max-width: 768px) 100vw, 400px"/>
                </div>
              )}
              <div className="flex items-center gap-2.5 mt-1.5">
                {item.linkedinEngagement && (
                  <>
                    {item.linkedinEngagement.likes > 0 && (
                      <span className="inline-flex items-center gap-0.5 text-caption">
                        <ThumbsUp className="h-2.5 w-2.5"/> {item.linkedinEngagement.likes}
                      </span>
                    )}
                    {item.linkedinEngagement.comments > 0 && (
                      <span className="inline-flex items-center gap-0.5 text-caption">
                        <MessageCircle className="h-2.5 w-2.5"/> {item.linkedinEngagement.comments}
                      </span>
                    )}
                  </>
                )}
                {item.linkedinPostUrl && (
                  <a
                    href={item.linkedinPostUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-0.5 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)]  ml-auto"
                  >
                    View on LinkedIn <ExternalLink className="h-2.5 w-2.5"/>
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Reaction Bar - Only show if item supports social features */}
          {item.wallPostId && (
            <div className="flex items-center gap-2 mt-2 pt-1.5 border-t border-[var(--border-subtle)]">
              <button
                onClick={handleLike}
                className={`inline-flex items-center gap-1 text-xs font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2 ${
                  liked ? 'text-danger-500' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)] '
                }`}
              >
                <Heart className={`h-3 w-3 ${liked ? 'fill-danger-500' : ''}`}/>
                {localLikeCount > 0 ? localLikeCount : 'Like'}
              </button>
              <button
                onClick={handleToggleComments}
                className={`inline-flex items-center gap-1 text-xs font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2 ${
                  showComments ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)] '
                }`}
              >
                <MessageCircle className="h-3 w-3"/>
                {localCommentCount > 0 ? localCommentCount : 'Comment'}
              </button>
            </div>
          )}

          {/* Comment Section */}
          {showComments && item.wallPostId && (
            <div className="mt-2 pt-2 border-t border-[var(--border-subtle)] space-y-2">
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
                  className="flex-1 px-2.5 py-1.5 text-xs rounded-lg border border-[var(--border-main)] bg-[var(--bg-surface)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-accent-500"
                  disabled={isSubmittingComment}
                />
                <button
                  onClick={handleSubmitComment}
                  disabled={!commentText.trim() || isSubmittingComment}
                  className="inline-flex items-center gap-1 px-4 py-1.5 text-xs font-semibold text-white bg-accent-700 rounded-lg hover:bg-accent-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Send className="h-3 w-3"/>
                  {isSubmittingComment ? 'Posting...' : 'Post'}
                </button>
              </div>

              {isLoadingComments && (
                <div className="flex items-center gap-2 py-2">
                  <div
                    className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--border-main)] border-t-accent-500"/>
                  <span className="text-caption">Loading comments...</span>
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
                      currentUser={user ? {
                        employeeId: user.employeeId,
                        profilePictureUrl: user.profilePictureUrl
                      } : undefined}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Timestamp */}
          <div className="flex items-center gap-1.5 mt-1 text-caption">
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
