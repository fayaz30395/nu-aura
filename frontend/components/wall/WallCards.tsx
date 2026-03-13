'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Pin,
  Trash2,
  MoreHorizontal,
  Award,
  BarChart3,
  CheckCircle,
  Globe,
  Users,
  Building2,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import type {
  WallPostResponse,
  ReactionType,
  PostType,
  CommentResponse,
  AuthorInfo,
  PollOptionResponse,
} from '@/lib/services/wall.service';
import { ReactionBar } from './ReactionBar';
import { CommentThread } from './CommentThread';

// ==================== Base Props ====================

interface BaseCardProps {
  post: WallPostResponse;
  currentUserId?: string;
  comments: CommentResponse[];
  commentsLoading: boolean;
  commentsHasMore: boolean;
  showComments: boolean;
  commentSubmitting: boolean;
  onReact: (postId: string, type: ReactionType) => void;
  onRemoveReact: (postId: string) => void;
  onToggleComments: (postId: string) => void;
  onAddComment: (postId: string, content: string, parentCommentId?: string) => void;
  onDeleteComment: (commentId: string, postId: string) => void;
  onLoadMoreComments: (postId: string) => void;
  onDelete?: (postId: string) => void;
  onPin?: (postId: string, pinned: boolean) => void;
}

// ==================== Shared CardHeader Component ====================

interface CardHeaderProps {
  author: AuthorInfo;
  createdAt: string;
  visibility: 'ORGANIZATION' | 'DEPARTMENT' | 'TEAM';
  pinned: boolean;
  postId: string;
  currentUserId?: string;
  onDelete?: (postId: string) => void;
  onPin?: (postId: string, pinned: boolean) => void;
}

function CardHeader({
  author,
  createdAt,
  visibility,
  pinned,
  postId,
  currentUserId,
  onDelete,
  onPin,
}: CardHeaderProps): JSX.Element {
  const [showMenu, setShowMenu] = useState(false);
  const isAuthor = currentUserId === author.id;

  const initials = author.fullName
    .split(' ')
    .map((name) => name[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const visibilityIcon =
    visibility === 'ORGANIZATION'
      ? Globe
      : visibility === 'DEPARTMENT'
        ? Building2
        : Users;

  const VisibilityIcon = visibilityIcon;

  return (
    <div className="flex items-start justify-between">
      <div className="flex gap-3">
        {/* Avatar */}
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary-100 text-sm font-semibold text-primary-700 dark:bg-primary-900 dark:text-primary-300">
          {initials}
        </div>

        {/* Author Info */}
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h4 className="font-medium text-surface-900 dark:text-surface-50">
              {author.fullName}
            </h4>
            {pinned && <Pin className="h-4 w-4 text-amber-600 dark:text-amber-400" />}
          </div>

          <div className="mt-1 flex items-center gap-2 text-xs text-surface-500 dark:text-surface-400">
            {author.designation && <span>{author.designation}</span>}
            {author.designation && author.department && <span>•</span>}
            {author.department && <span>{author.department}</span>}
          </div>

          <div className="mt-1 flex items-center gap-2 text-xs text-surface-500 dark:text-surface-400">
            <span>{formatDistanceToNow(new Date(createdAt), { addSuffix: true })}</span>
            <VisibilityIcon className="h-3.5 w-3.5" />
          </div>
        </div>
      </div>

      {/* More Menu */}
      {isAuthor && (onDelete || onPin) && (
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="rounded-lg p-1.5 hover:bg-surface-100 dark:hover:bg-surface-700"
          >
            <MoreHorizontal className="h-4 w-4 text-surface-500" />
          </button>

          {showMenu && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: -8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -8 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-full z-50 mt-1 rounded-lg border border-surface-200 bg-white shadow-lg dark:border-surface-700 dark:bg-surface-800"
            >
              {onPin && (
                <button
                  onClick={() => {
                    onPin(postId, !pinned);
                    setShowMenu(false);
                  }}
                  className="flex w-full items-center gap-2 px-4 py-2 text-sm text-surface-700 hover:bg-surface-50 dark:text-surface-300 dark:hover:bg-surface-700"
                >
                  <Pin className="h-4 w-4" />
                  {pinned ? 'Unpin' : 'Pin to top'}
                </button>
              )}

              {onDelete && (
                <button
                  onClick={() => {
                    onDelete(postId);
                    setShowMenu(false);
                  }}
                  className="flex w-full items-center gap-2 border-t border-surface-200 px-4 py-2 text-sm text-danger-600 hover:bg-danger-50 dark:border-surface-700 dark:text-danger-400 dark:hover:bg-danger-900 dark:hover:bg-opacity-20"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </button>
              )}
            </motion.div>
          )}
        </div>
      )}
    </div>
  );
}

// ==================== PostCard ====================

interface PostCardProps extends BaseCardProps {}

export function PostCard({
  post,
  currentUserId,
  comments,
  commentsLoading,
  commentsHasMore,
  showComments,
  commentSubmitting,
  onReact,
  onRemoveReact,
  onToggleComments,
  onAddComment,
  onDeleteComment,
  onLoadMoreComments,
  onDelete,
  onPin,
}: PostCardProps): JSX.Element {
  const totalReactions = Object.values(post.reactionCounts).reduce((a, b) => a + b, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card variant="default" className="overflow-hidden">
        <CardContent className="space-y-4">
          {/* Header */}
          <CardHeader
            author={post.author}
            createdAt={post.createdAt}
            visibility={post.visibility}
            pinned={post.pinned}
            postId={post.id}
            currentUserId={currentUserId}
            onDelete={onDelete}
            onPin={onPin}
          />

          {/* Content */}
          <div className="space-y-3">
            <p className="whitespace-pre-wrap text-sm text-surface-700 dark:text-surface-300">
              {post.content}
            </p>

            {/* Image */}
            {post.imageUrl && (
              <div className="overflow-hidden rounded-lg bg-surface-100 dark:bg-surface-700">
                <img
                  src={post.imageUrl}
                  alt="Post content"
                  className="h-auto w-full object-cover"
                />
              </div>
            )}
          </div>

          {/* Reaction Bar */}
          <div className="border-t border-surface-200 pt-3 dark:border-surface-700">
            <ReactionBar
              reactionCounts={post.reactionCounts}
              totalReactions={totalReactions}
              commentCount={post.commentCount}
              hasReacted={post.hasReacted}
              userReactionType={post.userReactionType}
              onReact={(type) => onReact(post.id, type)}
              onRemoveReact={() => onRemoveReact(post.id)}
              onToggleComments={() => onToggleComments(post.id)}
            />
          </div>

          {/* Comments Thread */}
          {showComments && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="border-t border-surface-200 pt-4 dark:border-surface-700"
            >
              <CommentThread
                comments={comments}
                isLoading={commentsLoading}
                hasMore={commentsHasMore}
                currentUserId={currentUserId}
                onAddComment={(content, parentId) => onAddComment(post.id, content, parentId)}
                onDeleteComment={(commentId) => onDeleteComment(commentId, post.id)}
                onLoadMore={() => onLoadMoreComments(post.id)}
                isSubmitting={commentSubmitting}
              />
            </motion.div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ==================== PollCard ====================

interface PollCardProps extends BaseCardProps {
  onVote: (postId: string, optionId: string) => void;
}

export function PollCard({
  post,
  currentUserId,
  comments,
  commentsLoading,
  commentsHasMore,
  showComments,
  commentSubmitting,
  onReact,
  onRemoveReact,
  onToggleComments,
  onAddComment,
  onDeleteComment,
  onLoadMoreComments,
  onDelete,
  onPin,
  onVote,
}: PollCardProps): JSX.Element {
  const totalReactions = Object.values(post.reactionCounts).reduce((a, b) => a + b, 0);
  const totalVotes = (post.pollOptions || []).reduce((sum, opt) => sum + opt.voteCount, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card variant="default" className="overflow-hidden">
        <CardContent className="space-y-4">
          {/* Header */}
          <CardHeader
            author={post.author}
            createdAt={post.createdAt}
            visibility={post.visibility}
            pinned={post.pinned}
            postId={post.id}
            currentUserId={currentUserId}
            onDelete={onDelete}
            onPin={onPin}
          />

          {/* Poll Question */}
          <div>
            <p className="text-sm font-medium text-surface-900 dark:text-surface-50">
              {post.content}
            </p>
          </div>

          {/* Poll Options */}
          <div className="space-y-2">
            {post.pollOptions?.map((option) => (
              <PollOption
                key={option.id}
                option={option}
                hasVoted={post.hasVoted}
                userVotedOptionId={post.userVotedOptionId}
                totalVotes={totalVotes}
                onVote={() => onVote(post.id, option.id)}
              />
            ))}
          </div>

          {/* Vote Count */}
          {totalVotes > 0 && (
            <div className="text-xs text-surface-500 dark:text-surface-400">
              {totalVotes} {totalVotes === 1 ? 'vote' : 'votes'}
            </div>
          )}

          {/* Reaction Bar */}
          <div className="border-t border-surface-200 pt-3 dark:border-surface-700">
            <ReactionBar
              reactionCounts={post.reactionCounts}
              totalReactions={totalReactions}
              commentCount={post.commentCount}
              hasReacted={post.hasReacted}
              userReactionType={post.userReactionType}
              onReact={(type) => onReact(post.id, type)}
              onRemoveReact={() => onRemoveReact(post.id)}
              onToggleComments={() => onToggleComments(post.id)}
            />
          </div>

          {/* Comments Thread */}
          {showComments && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="border-t border-surface-200 pt-4 dark:border-surface-700"
            >
              <CommentThread
                comments={comments}
                isLoading={commentsLoading}
                hasMore={commentsHasMore}
                currentUserId={currentUserId}
                onAddComment={(content, parentId) => onAddComment(post.id, content, parentId)}
                onDeleteComment={(commentId) => onDeleteComment(commentId, post.id)}
                onLoadMore={() => onLoadMoreComments(post.id)}
                isSubmitting={commentSubmitting}
              />
            </motion.div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ==================== PollOption Sub-Component ====================

interface PollOptionProps {
  option: PollOptionResponse;
  hasVoted: boolean;
  userVotedOptionId?: string;
  totalVotes: number;
  onVote: () => void;
}

function PollOption({
  option,
  hasVoted,
  userVotedOptionId,
  totalVotes,
  onVote,
}: PollOptionProps): JSX.Element {
  const isSelected = userVotedOptionId === option.id;

  if (hasVoted) {
    // Show results as progress bars
    return (
      <div key={option.id} className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-sm text-surface-700 dark:text-surface-300">{option.text}</span>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-surface-600 dark:text-surface-400">
              {option.votePercentage}%
            </span>
            <span className="text-xs text-surface-500 dark:text-surface-400">
              {option.voteCount}
            </span>
          </div>
        </div>

        <div className="overflow-hidden rounded-full bg-surface-200 dark:bg-surface-700">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${option.votePercentage}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className={cn(
              'h-2 rounded-full transition-colors',
              isSelected
                ? 'bg-primary-500 dark:bg-primary-400'
                : 'bg-surface-400 dark:bg-surface-600'
            )}
          />
        </div>
      </div>
    );
  }

  // Show clickable options
  return (
    <motion.button
      key={option.id}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onVote}
      className="w-full rounded-lg border-2 border-surface-300 bg-surface-50 px-4 py-3 text-left text-sm font-medium text-surface-700 transition-colors hover:border-primary-400 hover:bg-primary-50 dark:border-surface-600 dark:bg-surface-800 dark:text-surface-300 dark:hover:border-primary-400 dark:hover:bg-primary-900 dark:hover:bg-opacity-20"
    >
      {option.text}
    </motion.button>
  );
}

// ==================== PraiseCard ====================

interface PraiseCardProps extends BaseCardProps {}

export function PraiseCard({
  post,
  currentUserId,
  comments,
  commentsLoading,
  commentsHasMore,
  showComments,
  commentSubmitting,
  onReact,
  onRemoveReact,
  onToggleComments,
  onAddComment,
  onDeleteComment,
  onLoadMoreComments,
  onDelete,
  onPin,
}: PraiseCardProps): JSX.Element {
  const totalReactions = Object.values(post.reactionCounts).reduce((a, b) => a + b, 0);
  const recipient = post.praiseRecipient;

  if (!recipient) {
    return <></>;
  }

  const recipientInitials = recipient.fullName
    .split(' ')
    .map((name) => name[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card
        variant="default"
        className={cn(
          'overflow-hidden border-l-4 border-l-amber-500 dark:border-l-amber-400',
          'bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950 dark:to-orange-950'
        )}
      >
        <CardContent className="space-y-4">
          {/* Header */}
          <CardHeader
            author={post.author}
            createdAt={post.createdAt}
            visibility={post.visibility}
            pinned={post.pinned}
            postId={post.id}
            currentUserId={currentUserId}
            onDelete={onDelete}
            onPin={onPin}
          />

          {/* Praise Title */}
          <div className="flex items-center gap-2 rounded-lg bg-white px-4 py-3 dark:bg-surface-800">
            <Award className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            <span className="text-sm font-semibold text-amber-900 dark:text-amber-200">
              Praised <span className="text-primary-600 dark:text-primary-300">{recipient.fullName}</span>
            </span>
          </div>

          {/* Praise Message */}
          <div>
            <p className="whitespace-pre-wrap text-sm text-surface-700 dark:text-surface-300">
              {post.content}
            </p>
          </div>

          {/* Recipient Info Box */}
          <div className="rounded-lg border-2 border-amber-200 bg-white px-4 py-3 dark:border-amber-800 dark:bg-surface-800">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-amber-100 text-sm font-semibold text-amber-700 dark:bg-amber-900 dark:text-amber-300">
                {recipientInitials}
              </div>

              <div className="flex-1">
                <h4 className="font-medium text-surface-900 dark:text-surface-50">
                  {recipient.fullName}
                </h4>

                <div className="mt-1 flex items-center gap-2 text-xs text-surface-600 dark:text-surface-400">
                  {recipient.designation && <span>{recipient.designation}</span>}
                  {recipient.designation && recipient.department && <span>•</span>}
                  {recipient.department && <span>{recipient.department}</span>}
                </div>
              </div>
            </div>
          </div>

          {/* Reaction Bar */}
          <div className="border-t border-amber-200 pt-3 dark:border-amber-800">
            <ReactionBar
              reactionCounts={post.reactionCounts}
              totalReactions={totalReactions}
              commentCount={post.commentCount}
              hasReacted={post.hasReacted}
              userReactionType={post.userReactionType}
              onReact={(type) => onReact(post.id, type)}
              onRemoveReact={() => onRemoveReact(post.id)}
              onToggleComments={() => onToggleComments(post.id)}
            />
          </div>

          {/* Comments Thread */}
          {showComments && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="border-t border-amber-200 pt-4 dark:border-amber-800"
            >
              <CommentThread
                comments={comments}
                isLoading={commentsLoading}
                hasMore={commentsHasMore}
                currentUserId={currentUserId}
                onAddComment={(content, parentId) => onAddComment(post.id, content, parentId)}
                onDeleteComment={(commentId) => onDeleteComment(commentId, post.id)}
                onLoadMore={() => onLoadMoreComments(post.id)}
                isSubmitting={commentSubmitting}
              />
            </motion.div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ==================== Convenience WallCard Component ====================

interface WallCardProps extends BaseCardProps {
  onVote?: (postId: string, optionId: string) => void;
}

export function WallCard({
  post,
  currentUserId,
  comments,
  commentsLoading,
  commentsHasMore,
  showComments,
  commentSubmitting,
  onReact,
  onRemoveReact,
  onToggleComments,
  onAddComment,
  onDeleteComment,
  onLoadMoreComments,
  onDelete,
  onPin,
  onVote,
}: WallCardProps): JSX.Element {
  const baseProps = {
    post,
    currentUserId,
    comments,
    commentsLoading,
    commentsHasMore,
    showComments,
    commentSubmitting,
    onReact,
    onRemoveReact,
    onToggleComments,
    onAddComment,
    onDeleteComment,
    onLoadMoreComments,
    onDelete,
    onPin,
  };

  switch (post.type) {
    case 'POLL':
      return (
        <PollCard
          {...baseProps}
          onVote={onVote || (() => {})}
        />
      );
    case 'PRAISE':
      return <PraiseCard {...baseProps} />;
    case 'POST':
    default:
      return <PostCard {...baseProps} />;
  }
}
