'use client';

import React, {useState} from 'react';
import {motion} from 'framer-motion';
import {CornerDownRight, Send, Trash2} from 'lucide-react';
import {formatDistanceToNow} from 'date-fns';
import {Button} from '@/components/ui/Button';
import {AuthorInfo, CommentResponse} from '@/lib/services/core/wall.service';
import {cn} from '@/lib/utils';

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

interface AuthorAvatarProps {
  author: AuthorInfo;
}

function AuthorAvatar({author}: AuthorAvatarProps): JSX.Element {
  const initials = author.fullName
    .split(' ')
    .map((name) => name[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div
      className='flex h-8 w-8 items-center justify-center rounded-full bg-accent-subtle text-xs font-semibold text-accent'>
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
      initial={{x: -8, opacity: 0}}
      animate={{x: 0, opacity: 1}}
      transition={{duration: 0.2}}
      className={cn('flex gap-4', isReply && 'ml-12')}
    >
      {/* Left border for replies */}
      {isReply && (
        <div className="absolute left-4 top-0 h-full w-0.5 bg-[var(--border-subtle)]"/>
      )}
      {/* Avatar */}
      <AuthorAvatar author={comment.author}/>
      {/* Comment content */}
      <div className="flex-1">
        <div className="rounded-lg bg-[var(--bg-secondary)] p-4">
          {/* Header: Name and details */}
          <div className="flex items-baseline gap-2">
            <span className="font-medium text-[var(--text-primary)]">
              {comment.author.fullName}
            </span>
            {comment.author.department && (
              <span className="text-caption">
                {comment.author.department}
              </span>
            )}
            <span className="text-caption">
              {formatDistanceToNow(new Date(comment.createdAt), {addSuffix: true})}
            </span>
          </div>

          {/* Comment text */}
          <p className="mt-1 text-body-secondary">{comment.content}</p>
        </div>

        {/* Actions: Reply and Delete */}
        <div className="mt-2 flex items-center gap-4">
          <button
            onClick={() => onReply(comment.id, comment.author.fullName)}
            className='inline-flex items-center gap-1 text-xs font-medium text-[var(--text-muted)] hover:text-accent cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2 rounded'
          >
            <CornerDownRight className="h-3.5 w-3.5"/>
            Reply
          </button>

          {isAuthor && (
            <button
              onClick={() => onDelete(comment.id)}
              className='inline-flex items-center gap-1 text-xs font-medium text-status-danger-text hover:text-status-danger-text cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2 rounded'
            >
              <Trash2 className="h-3.5 w-3.5"/>
              Delete
            </button>
          )}
        </div>

        {/* Nested replies */}
        {comment.replies && comment.replies.length > 0 && (
          <div className="mt-4 space-y-4">
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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>): void => {
    if (e.key === 'Enter' && e.ctrlKey) {
      handleAddComment();
    }
  };

  return (
    <div className="space-y-4">
      {/* Load more button */}
      {hasMore && !isLoading && (
        <motion.button
          initial={{opacity: 0}}
          animate={{opacity: 1}}
          onClick={onLoadMore}
          className='text-center text-sm font-medium text-accent hover:text-accent cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2 rounded'
        >
          Load more comments
        </motion.button>
      )}
      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <div
            className='h-8 w-8 animate-spin rounded-full border-2 border-[var(--border-main)] border-t-accent-500'/>
        </div>
      )}
      {/* Comments list */}
      <div className="space-y-4">
        {comments.map((comment) => (
          <CommentItem
            key={comment.id}
            comment={comment}
            currentUserId={currentUserId}
            onReply={(commentId, authorName) => setReplyingTo({commentId, authorName})}
            onDelete={onDeleteComment}
          />
        ))}
      </div>
      {/* No comments state */}
      {!isLoading && comments.length === 0 && (
        <motion.div
          initial={{opacity: 0}}
          animate={{opacity: 1}}
          className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-6 text-center"
        >
          <p className="text-body-muted">
            No comments yet. Be the first to comment!
          </p>
        </motion.div>
      )}
      {/* Input section */}
      <div className="space-y-2 border-t border-[var(--border-subtle)] pt-4">
        {/* Reply indicator */}
        {replyingTo && (
          <motion.div
            initial={{opacity: 0, height: 0}}
            animate={{opacity: 1, height: 'auto'}}
            exit={{opacity: 0, height: 0}}
            className='rounded-lg bg-accent-subtle p-2'
          >
            <div className="row-between">
              <span className='text-xs font-medium text-accent'>
                Replying to {replyingTo.authorName}
              </span>
              <button
                onClick={() => setReplyingTo(null)}
                className='text-xs text-accent hover:text-accent cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2 rounded'
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
            onKeyDown={handleKeyDown}
            placeholder={
              replyingTo ? `Reply to ${replyingTo.authorName}...` : 'Add a comment...'
            }
            disabled={isSubmitting}
            className={cn(
              'input-aura flex-1 resize-none',
              'min-h-[40px] max-h-[120px]',
              'disabled:cursor-not-allowed disabled:opacity-50'
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
            <Send className="h-4 w-4"/>
          </Button>
        </div>

        {/* Helper text */}
        <p className="text-caption">
          Press Ctrl+Enter to submit
        </p>
      </div>
    </div>
  );
}
