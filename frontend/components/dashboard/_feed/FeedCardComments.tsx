'use client';

import {Send} from 'lucide-react';
import type {CommentResponse} from '@/lib/services/core/wall.service';
import {FeedCommentItem} from '../FeedCommentThread';

export interface FeedCardCommentsProps {
  wallPostId: string;
  commentText: string;
  comments: CommentResponse[];
  isLoadingComments: boolean;
  isSubmittingComment: boolean;
  currentUser?: { employeeId?: string; profilePictureUrl?: string };
  variant?: 'wall' | 'default';
  onChangeText: (value: string) => void;
  onSubmit: () => void;
  onReplyAdded: () => void;
}

export function FeedCardComments({
                                   wallPostId,
                                   commentText,
                                   comments,
                                   isLoadingComments,
                                   isSubmittingComment,
                                   currentUser,
                                   variant = 'wall',
                                   onChangeText,
                                   onSubmit,
                                   onReplyAdded,
                                 }: FeedCardCommentsProps) {
  if (variant === 'default') {
    return (
      <div className="mt-2 pt-2 border-t border-[var(--border-subtle)] space-y-2">
        <div className="flex gap-2">
          <input
            type="text"
            value={commentText}
            onChange={(e) => onChangeText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                onSubmit();
              }
            }}
            placeholder="Write a comment..."
            className="flex-1 px-2.5 py-1.5 text-xs rounded-lg border border-[var(--border-main)] bg-[var(--bg-surface)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-accent-500"
            disabled={isSubmittingComment}
          />
          <button
            onClick={onSubmit}
            disabled={!commentText.trim() || isSubmittingComment}
            className='inline-flex items-center gap-1 px-4 py-1.5 text-xs font-semibold text-inverse bg-accent rounded-lg hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
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
                postId={wallPostId}
                depth={0}
                onReplyAdded={onReplyAdded}
                currentUser={currentUser}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="px-4 py-4 space-y-2">
      <div className="flex gap-2">
        <input
          type="text"
          value={commentText}
          onChange={(e) => onChangeText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              onSubmit();
            }
          }}
          placeholder="Write a comment..."
          className="flex-1 px-4 py-2 text-xs rounded-lg border border-[var(--border-main)] bg-[var(--bg-surface)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-accent-500"
          disabled={isSubmittingComment}
        />
        <button
          onClick={onSubmit}
          disabled={!commentText.trim() || isSubmittingComment}
          className='inline-flex items-center gap-1 px-4 py-2 text-xs font-semibold text-inverse bg-accent rounded-lg hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2'
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
            <FeedCommentItem
              key={comment.id}
              comment={comment}
              postId={wallPostId}
              depth={0}
              onReplyAdded={onReplyAdded}
              currentUser={currentUser}
            />
          ))}
        </div>
      )}
    </div>
  );
}
