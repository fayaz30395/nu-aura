'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Send, CornerDownRight, Trash2, MoreHorizontal } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/Button';
import { CommentResponse, AuthorInfo } from '@/lib/services/wall.service';
import { cn } from '@/lib/utils';

// ==================== Props ====================

interface CommentThreadProps {
  comments: CommentResponse[];
  isLoading: boolean;
  hasMore: boolean;
  currentUserId?: string;
  onAddComment: (content: string, parentCommentId?: string) => void;
  onDeleteComment: (commentId: string) => void;
  onLoadMore: () => void;
  isSubmitting: boolean;
}

// ==================== Avatar Component ====================

function AuthorAvatar({ author }: { author: AuthorInfo }): JSX.Element {
  const initials = author.fullName
    .split(' ')
    .map((name) => name[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-xs font-semibold text-primary-700 dark:bg-primary-900 dark:text-primary-300">
      {initials}
    </div>
  );
}

// ==================== Comment Item Component ====================

interface CommentItemProps {
  comment: CommentResponse;
  currentUserId?: string;
  isReply?: boolean;
  onReply: (commentId: string, authorName: string) => void;
  onDelete: (commentId: string) => void;
}

function CommentItem({
  comment,
  currentUserId,
  isReply = false,
  onReply,
  onDelete,
}: CommentItemProps): JSX.Element {
  const isAuthor = currentUserId === comment.author.id;

  return (
    <motion.div
      initial={{ x: -10, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.2 }}
      className={cn('flex gap-3', isReply && 'ml-12')}
    >
      {/* Left border for replies */}
      {isReply && (
        <div className="absolute left-4 top-0 h-full w-0.5 bg-surface-200 dark:bg-surface-700" />
      )}

      {/* Avatar */}
      <AuthorAvatar author={comment.author} />

      {/* Comment content */}
      <div className="flex-1">
        <div className="rounded-lg bg-surface-100 p-3 dark:bg-surface-800">
          {/* Header: Name and details */}
          <div className="flex items-baseline gap-2">
            <span className="font-medium text-surface-900 dark:text-surface-50">
              {comment.author.fullName}
            </span>
            {comment.author.department && (
              <span className="text-xs text-surface-500 dark:text-surface-400">
                {comment.author.department}
              </span>
            )}
            <span className="text-xs text-surface-500 dark:text-surface-400">
              {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
            </span>
          </div>

          {/* Comment text */}
          <p className="mt-1 text-sm text-surface-700 dark:text-surface-200">{comment.content}</p>
        </div>

        {/* Actions: Reply and Delete */}
        <div className="mt-2 flex items-center gap-4">
          <button
            onClick={() => onReply(comment.id, comment.author.fullName)}
            className="inline-flex items-center gap-1 text-xs font-medium text-surface-600 hover:text-primary-600 dark:text-surface-400 dark:hover:text-primary-400"
          >
            <CornerDownRight className="h-3.5 w-3.5" />
            Reply
          </button>

          {isAuthor && (
            <button
              onClick={() => onDelete(comment.id)}
              className="inline-flex items-center gap-1 text-xs font-medium text-danger-600 hover:text-danger-700 dark:text-danger-400 dark:hover:text-danger-300"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </button>
          )}
        </div>

        {/* Nested replies */}
        {comment.replies && comment.replies.length > 0 && (
          <div className="mt-3 space-y-3">
            {comment.replies.map((reply) => (
              <CommentItem
                key={reply.id}
                comment={reply}
                currentUserId={currentUserId}
                isReply
                onReply={onReply}
                onDelete={onDelete}
              />
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ==================== Main Component ====================

export function CommentThread({
  comments,
  isLoading,
  hasMore,
  currentUserId,
  onAddComment,
  onDeleteComment,
  onLoadMore,
  isSubmitting,
}: CommentThreadProps): JSX.Element {
  const [newCommentContent, setNewCommentContent] = useState('');
  const [replyingTo, setReplyingTo] = useState<{ commentId: string; authorName: string } | null>(
    null
  );

  const handleAddComment = (): void => {
    if (!newCommentContent.trim()) return;

    onAddComment(newCommentContent, replyingTo?.commentId);
    setNewCommentContent('');
    setReplyingTo(null);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>): void => {
    if (e.key === 'Enter' && e.ctrlKey) {
      handleAddComment();
    }
  };

  return (
    <div className="space-y-4">
      {/* Load more button */}
      {hasMore && !isLoading && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={onLoadMore}
          className="text-center text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
        >
          Load more comments
        </motion.button>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-surface-300 border-t-primary-500 dark:border-surface-600 dark:border-t-primary-400" />
        </div>
      )}

      {/* Comments list */}
      <div className="space-y-4">
        {comments.map((comment) => (
          <CommentItem
            key={comment.id}
            comment={comment}
            currentUserId={currentUserId}
            onReply={(commentId, authorName) => setReplyingTo({ commentId, authorName })}
            onDelete={onDeleteComment}
          />
        ))}
      </div>

      {/* No comments state */}
      {!isLoading && comments.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-lg border border-surface-200 bg-surface-50 p-6 text-center dark:border-surface-700 dark:bg-surface-900"
        >
          <p className="text-sm text-surface-500 dark:text-surface-400">
            No comments yet. Be the first to comment!
          </p>
        </motion.div>
      )}

      {/* Input section */}
      <div className="space-y-2 border-t border-surface-200 pt-4 dark:border-surface-700">
        {/* Reply indicator */}
        {replyingTo && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="rounded-lg bg-primary-50 p-2 dark:bg-primary-900"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-primary-700 dark:text-primary-300">
                Replying to {replyingTo.authorName}
              </span>
              <button
                onClick={() => setReplyingTo(null)}
                className="text-xs text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        )}

        {/* Input field and button */}
        <div className="flex gap-2">
          <textarea
            value={newCommentContent}
            onChange={(e) => setNewCommentContent(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={
              replyingTo ? `Reply to ${replyingTo.authorName}...` : 'Add a comment...'
            }
            disabled={isSubmitting}
            className={cn(
              'flex-1 resize-none rounded-lg border border-surface-300 bg-white p-2.5 text-sm text-surface-900 placeholder-surface-400 transition-colors dark:border-surface-600 dark:bg-surface-800 dark:text-surface-50 dark:placeholder-surface-500',
              'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-0 dark:focus:ring-primary-400',
              'disabled:cursor-not-allowed disabled:opacity-50',
              'min-h-[40px] max-h-[120px]'
            )}
          />
          <Button
            onClick={handleAddComment}
            disabled={isSubmitting || !newCommentContent.trim()}
            size="icon"
            variant="primary"
            isLoading={isSubmitting}
            loadingText=""
            className="mt-auto"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>

        {/* Helper text */}
        <p className="text-xs text-surface-500 dark:text-surface-400">
          Press Ctrl+Enter to submit
        </p>
      </div>
    </div>
  );
}
