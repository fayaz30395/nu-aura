'use client';

import React, {useState} from 'react';
import Image from 'next/image';
import {Heart, Send} from 'lucide-react';
import type {CommentResponse} from '@/lib/services/core/wall.service';
import {wallService} from '@/lib/services/core/wall.service';
import {logger} from '@/lib/utils/logger';
import {formatDistanceToNow, isToday, parseISO} from 'date-fns';

// ─── Helpers (local to this file — no circular dep with CompanyFeed) ──
function formatFeedDate(dateStr: string): string {
  try {
    const date = parseISO(dateStr);
    if (isToday(date)) return 'Today';
    return formatDistanceToNow(date, {addSuffix: true});
  } catch {
    return dateStr;
  }
}

// ─── Constants ────────────────────────────────────────────────────────
const MAX_REPLY_DEPTH = 3;

// ─── Props ────────────────────────────────────────────────────────────
export interface FeedCommentItemProps {
  comment: CommentResponse;
  postId: string;
  depth: number;
  onReplyAdded: () => void;
  currentUser?: { employeeId?: string; profilePictureUrl?: string };
}

/**
 * Recursive comment + reply thread item for a wall post.
 * Supports up to MAX_REPLY_DEPTH (3) levels of nesting.
 * Replies are lazy-loaded on first expansion.
 */
export const FeedCommentItem = React.memo(function FeedCommentItem({
                                                                     comment,
                                                                     postId,
                                                                     depth,
                                                                     onReplyAdded,
                                                                     currentUser,
                                                                   }: FeedCommentItemProps) {
  const [liked, setLiked] = useState(false);
  const [localLikes, setLocalLikes] = useState(comment.likesCount ?? 0);
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);
  const [childReplies, setChildReplies] = useState<CommentResponse[]>(comment.replies ?? []);
  const [showReplies, setShowReplies] = useState(false);
  const [isLoadingReplies, setIsLoadingReplies] = useState(false);
  const [repliesFetched, setRepliesFetched] = useState(false);

  // Resolve avatar: backend avatarUrl → current user's Google pic → generated fallback
  const isOwnComment = currentUser?.employeeId && comment.author.id === currentUser.employeeId;
  const commentAvatarUrl = comment.author.avatarUrl
    || (isOwnComment && currentUser?.profilePictureUrl ? currentUser.profilePictureUrl : null)
    || `https://ui-avatars.com/api/?name=${encodeURIComponent(comment.author.fullName)}&background=6366f1&color=fff&size=48&bold=true&format=svg`;

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
      logger.error('Failed to load replies:', error);
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
      logger.error('Failed to add reply:', error);
    } finally {
      setIsSubmittingReply(false);
    }
  };

  const hasReplies = childReplies.length > 0 || (comment.replyCount > 0 && !repliesFetched);

  return (
    <div className={depth > 0 ? 'ml-6 mt-1.5' : ''}>
      <div className="flex gap-2">
        <div className="flex-shrink-0 w-6 h-6 rounded-full overflow-hidden">
          <Image src={commentAvatarUrl} alt={comment.author.fullName} width={24} height={24}
                 className="rounded-full object-cover w-6 h-6"/>
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
              aria-label={liked ? 'Unlike comment' : 'Like comment'}
              className={`inline-flex items-center gap-0.5 text-2xs font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2 ${
                liked ? 'text-danger-500' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
              }`}
            >
              <Heart className={`h-2.5 w-2.5 ${liked ? 'fill-danger-500' : ''}`}/>
              {localLikes > 0 ? localLikes : 'Like'}
            </button>
            {depth < MAX_REPLY_DEPTH && (
              <button
                onClick={() => setShowReplyInput(!showReplyInput)}
                className="text-2xs font-medium text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
              >
                Reply
              </button>
            )}
            <span className="text-2xs text-[var(--text-muted)]">
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
                className="flex-1 px-2 py-1 text-xs rounded-lg border border-[var(--border-main)] bg-[var(--bg-surface)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-accent-500"
                disabled={isSubmittingReply}
                autoFocus
              />
              <button
                onClick={handleSubmitReply}
                disabled={!replyText.trim() || isSubmittingReply}
                aria-label="Send reply"
                className='px-2 py-1 text-xs font-semibold text-inverse bg-accent rounded-lg hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2'
              >
                <Send className="h-3 w-3"/>
              </button>
            </div>
          )}

          {/* Show/hide replies toggle */}
          {hasReplies && !showReplies && (
            <button
              onClick={handleLoadReplies}
              disabled={isLoadingReplies}
              className='text-2xs font-medium text-accent hover:text-accent mt-1 transition-colors disabled:opacity-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2'
            >
              {isLoadingReplies ? 'Loading...' : `View ${comment.replyCount || childReplies.length} ${(comment.replyCount || childReplies.length) === 1 ? 'reply' : 'replies'}`}
            </button>
          )}
          {showReplies && childReplies.length > 0 && (
            <button
              onClick={() => setShowReplies(false)}
              className="text-2xs font-medium text-[var(--text-muted)] hover:text-[var(--text-secondary)] mt-1 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
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
                  currentUser={currentUser}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
