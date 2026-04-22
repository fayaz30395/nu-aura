'use client';

import {useState} from 'react';
import type {CommentResponse} from '@/lib/services/core/wall.service';
import {wallService} from '@/lib/services/core/wall.service';
import type {FeedItem} from '@/lib/types/core/feed';
import {useAuth} from '@/lib/hooks/useAuth';
import {Permissions, usePermissions} from '@/lib/hooks/usePermissions';
import {logger} from '@/lib/utils/logger';
import {FEED_COLORS, FEED_LABELS} from './_feed/types';
import {FEED_ICONS} from './_feed/icons';
import {formatFeedDate} from './_feed/formatFeedDate';
import {FeedCardHeader} from './_feed/FeedCardHeader';
import {FeedCardBody} from './_feed/FeedCardBody';
import {FeedCardMediaGrid} from './_feed/FeedCardMediaGrid';
import {FeedCardPoll} from './_feed/FeedCardPoll';
import {FeedCardPraise} from './_feed/FeedCardPraise';
import {FeedCardReactions} from './_feed/FeedCardReactions';
import {FeedCardComments} from './_feed/FeedCardComments';
import {FeedCardDefault} from './_feed/FeedCardDefault';
import type {LocalReactor, PollOption} from './_feed/types';

// Re-exports for external consumers (CompanyFeed and others)
export {FEED_COLORS, FEED_ICONS, FEED_LABELS, formatFeedDate};

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
  const {user} = useAuth();
  const {hasPermission, isAdmin} = usePermissions();

  // Reactions / comments state
  const [liked, setLiked] = useState(item.hasReacted ?? false);
  const [localLikeCount, setLocalLikeCount] = useState(item.likesCount ?? 0);
  const [localCommentCount, setLocalCommentCount] = useState(item.commentsCount ?? 0);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<CommentResponse[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  // Post management state
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isHidden, setIsHidden] = useState(false);

  // Poll state
  const [localPollOptions, setLocalPollOptions] = useState<PollOption[]>(item.pollOptions ?? []);
  const [localHasVoted, setLocalHasVoted] = useState(item.hasVoted ?? false);
  const [localVotedOptionId, setLocalVotedOptionId] = useState<string | null>(item.userVotedOptionId ?? null);
  const [isVoting, setIsVoting] = useState(false);

  // Edit post state
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(item.description || item.title || '');
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [localContent, setLocalContent] = useState(item.description || item.title || '');

  // Reactor details state
  const [localReactors, setLocalReactors] = useState<LocalReactor[]>(item.recentReactors ?? []);
  const [showReactorsPopover, setShowReactorsPopover] = useState(false);
  const [allReactors, setAllReactors] = useState<LocalReactor[]>([]);
  const [isLoadingAllReactors, setIsLoadingAllReactors] = useState(false);

  // Determine if current user can manage this post
  const isPostAuthor = item.wallPostId && item.wallPostAuthorId && user?.employeeId === item.wallPostAuthorId;
  const canManagePost = !!item.wallPostId && (isPostAuthor || isAdmin || hasPermission(Permissions.WALL_MANAGE));

  const currentUser = user
    ? {employeeId: user.employeeId, profilePictureUrl: user.profilePictureUrl}
    : undefined;

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
          reactedAt: new Date().toISOString(),
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

  const handleReplyAdded = () => setLocalCommentCount((prev) => prev + 1);

  if (isHidden) return null;

  // ─── WALL_POST: social-style card ────────────────────────────────────
  if (item.type === 'WALL_POST') {
    const isOwnPost = user?.employeeId === item.wallPostAuthorId;
    const avatarUrl = item.personAvatarUrl
      || (isOwnPost && user?.profilePictureUrl ? user.profilePictureUrl : null)
      || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.wallPostAuthor || 'U')}&background=6366f1&color=fff&size=80&bold=true&format=svg`;

    return (
      <div
        className="rounded-xl border border-[var(--border-main)] bg-[var(--bg-card)] overflow-hidden transition-colors">
        <FeedCardHeader
          item={item}
          avatarUrl={avatarUrl}
          canManagePost={canManagePost}
          showActionMenu={showActionMenu}
          setShowActionMenu={setShowActionMenu}
          onEdit={item.wallPostId ? handleStartEdit : undefined}
          onDelete={handleDeletePost}
          isDeleting={isDeleting}
        />

        <FeedCardBody
          isEditing={isEditing}
          editContent={editContent}
          localContent={localContent}
          isSavingEdit={isSavingEdit}
          onEditChange={setEditContent}
          onSave={handleSaveEdit}
          onCancel={handleCancelEdit}
        />

        {item.wallPostImageUrl && <FeedCardMediaGrid imageUrl={item.wallPostImageUrl}/>}

        {item.wallPostType === 'POLL' && (
          <FeedCardPoll
            options={localPollOptions}
            hasVoted={localHasVoted}
            votedOptionId={localVotedOptionId}
            isVoting={isVoting}
            onVote={handleVote}
          />
        )}

        {item.wallPostType === 'PRAISE' && <FeedCardPraise item={item}/>}

        <FeedCardReactions
          liked={liked}
          likeCount={localLikeCount}
          commentCount={localCommentCount}
          reactors={localReactors}
          allReactors={allReactors}
          showReactorsPopover={showReactorsPopover}
          isLoadingAllReactors={isLoadingAllReactors}
          showComments={showComments}
          hidden={item.wallPostType === 'POLL'}
          onLike={handleLike}
          onToggleComments={handleToggleComments}
          onShowAllReactors={handleShowAllReactors}
          onCloseReactorsPopover={() => setShowReactorsPopover(false)}
        />

        {showComments && item.wallPostId && (
          <FeedCardComments
            wallPostId={item.wallPostId}
            commentText={commentText}
            comments={comments}
            isLoadingComments={isLoadingComments}
            isSubmittingComment={isSubmittingComment}
            currentUser={currentUser}
            variant="wall"
            onChangeText={setCommentText}
            onSubmit={handleSubmitComment}
            onReplyAdded={handleReplyAdded}
          />
        )}
      </div>
    );
  }

  // ─── Default card layout (non-WALL_POST types) ─────────────────────
  return (
    <FeedCardDefault
      item={item}
      liked={liked}
      localLikeCount={localLikeCount}
      localCommentCount={localCommentCount}
      showComments={showComments}
      comments={comments}
      commentText={commentText}
      isLoadingComments={isLoadingComments}
      isSubmittingComment={isSubmittingComment}
      currentUser={currentUser}
      onLike={handleLike}
      onToggleComments={handleToggleComments}
      onChangeCommentText={setCommentText}
      onSubmitComment={handleSubmitComment}
      onReplyAdded={handleReplyAdded}
    />
  );
}
