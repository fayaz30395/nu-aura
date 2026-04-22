'use client';

import React, {useState} from 'react';
import Image from 'next/image';
import {motion} from 'framer-motion';
import {Award, Building2, Globe, MoreHorizontal, Pin, Trash2, Users,} from 'lucide-react';
import {formatDistanceToNow} from 'date-fns';
import {Card, CardContent} from '@/components/ui/Card';
import {cn} from '@/lib/utils';
import type {
  AuthorInfo,
  CommentResponse,
  PollOptionResponse,
  ReactionType,
  WallPostResponse,
} from '@/lib/services/core/wall.service';
import {ReactionBar} from './ReactionBar';
import {CommentThread} from './CommentThread';

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
      <div className="flex gap-4">
        {/* Avatar */}
        <div
          className='flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-accent-subtle text-sm font-semibold text-accent'>
          {initials}
        </div>

        {/* Author Info */}
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h4 className="font-medium text-[var(--text-primary)]">
              {author.fullName}
            </h4>
            {pinned && <Pin className='h-4 w-4 text-status-warning-text'/>}
          </div>

          <div className="mt-1 flex items-center gap-2 text-caption">
            {author.designation && <span>{author.designation}</span>}
            {author.designation && author.department && <span>·</span>}
            {author.department && <span>{author.department}</span>}
          </div>

          <div className="mt-1 flex items-center gap-2 text-caption">
            <span>{formatDistanceToNow(new Date(createdAt), {addSuffix: true})}</span>
            <VisibilityIcon className="h-3.5 w-3.5"/>
          </div>
        </div>
      </div>
      {/* More Menu */}
      {isAuthor && (onDelete || onPin) && (
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            aria-label="More options"
            className="rounded-lg p-1.5 hover:bg-[var(--bg-secondary)] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
          >
            <MoreHorizontal className="h-4 w-4 text-[var(--text-muted)]"/>
          </button>

          {showMenu && (
            <motion.div
              initial={{opacity: 0, scale: 0.9, y: -8}}
              animate={{opacity: 1, scale: 1, y: 0}}
              exit={{opacity: 0, scale: 0.9, y: -8}}
              transition={{duration: 0.15}}
              className="absolute right-0 top-full z-50 mt-1 rounded-lg border border-[var(--border-main)] bg-[var(--bg-card)] shadow-[var(--shadow-dropdown)]"
            >
              {onPin && (
                <button
                  onClick={() => {
                    onPin(postId, !pinned);
                    setShowMenu(false);
                  }}
                  className="flex w-full items-center gap-2 px-4 py-2 text-body-secondary hover:bg-[var(--bg-secondary)] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
                >
                  <Pin className="h-4 w-4"/>
                  {pinned ? 'Unpin' : 'Pin to top'}
                </button>
              )}

              {onDelete && (
                <button
                  onClick={() => {
                    onDelete(postId);
                    setShowMenu(false);
                  }}
                  className='flex w-full items-center gap-2 border-t border-[var(--border-subtle)] px-4 py-2 text-sm text-status-danger-text hover:bg-status-danger-bg cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2'
                >
                  <Trash2 className="h-4 w-4"/>
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

type PostCardProps = BaseCardProps;

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
      initial={{opacity: 0, y: 8}}
      animate={{opacity: 1, y: 0}}
      transition={{duration: 0.25, ease: 'easeOut'}}
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
          <div className="space-y-4">
            <p className="whitespace-pre-wrap text-body-secondary">
              {post.content}
            </p>

            {/* Image */}
            {post.imageUrl && (
              <div className="overflow-hidden rounded-lg bg-[var(--bg-secondary)]">
                <Image
                  src={post.imageUrl}
                  alt="Post content"
                  width={800}
                  height={450}
                  className="h-auto w-full object-cover"
                  style={{width: '100%', height: 'auto'}}
                  unoptimized
                />
              </div>
            )}
          </div>

          {/* Reaction Bar */}
          <div className="border-t border-[var(--border-subtle)] pt-4">
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
              initial={{opacity: 0, height: 0}}
              animate={{opacity: 1, height: 'auto'}}
              exit={{opacity: 0, height: 0}}
              transition={{duration: 0.2}}
              className="border-t border-[var(--border-subtle)] pt-4"
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
      initial={{opacity: 0, y: 8}}
      animate={{opacity: 1, y: 0}}
      transition={{duration: 0.25, ease: 'easeOut'}}
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
            <p className="text-sm font-medium text-[var(--text-primary)]">
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
            <div className="text-caption">
              {totalVotes} {totalVotes === 1 ? 'vote' : 'votes'}
            </div>
          )}

          {/* Reaction Bar */}
          <div className="border-t border-[var(--border-subtle)] pt-4">
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
              initial={{opacity: 0, height: 0}}
              animate={{opacity: 1, height: 'auto'}}
              exit={{opacity: 0, height: 0}}
              transition={{duration: 0.2}}
              className="border-t border-[var(--border-subtle)] pt-4"
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
                      totalVotes: _totalVotes,
                      onVote,
                    }: PollOptionProps): JSX.Element {
  const isSelected = userVotedOptionId === option.id;

  if (hasVoted) {
    // Show results as progress bars
    return (
      <div key={option.id} className="space-y-1.5">
        <div className="row-between">
          <span className="text-body-secondary">{option.text}</span>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-[var(--text-secondary)]">
              {option.votePercentage}%
            </span>
            <span className="text-caption">
              {option.voteCount}
            </span>
          </div>
        </div>
        <div className="overflow-hidden rounded-full bg-[var(--bg-secondary)]">
          <motion.div
            initial={{width: 0}}
            animate={{width: `${option.votePercentage}%`}}
            transition={{duration: 0.5, ease: 'easeOut'}}
            className={cn(
              'h-2 rounded-full transition-colors',
              isSelected
                ? 'bg-accent'
                : 'bg-[var(--text-muted)]'
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
      whileHover={{scale: 1.01}}
      whileTap={{scale: 0.99}}
      onClick={onVote}
      className='w-full rounded-lg border-2 border-[var(--border-main)] bg-[var(--bg-card)] px-4 py-4 text-left text-sm font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--accent-primary)] hover:bg-accent-subtle cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2'
    >
      {option.text}
    </motion.button>
  );
}

// ==================== PraiseCard ====================

type PraiseCardProps = BaseCardProps;

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
      initial={{opacity: 0, y: 8}}
      animate={{opacity: 1, y: 0}}
      transition={{duration: 0.25, ease: 'easeOut'}}
    >
      <Card
        variant="default"
        className={cn(
          'overflow-hidden border-l-4 border-l-warning-500',
          'bg-gradient-to-br from-warning-50/50 to-warning-50/50'
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
          <div className="flex items-center gap-2 rounded-lg bg-[var(--bg-card)] px-4 py-4">
            <Award className='h-5 w-5 text-status-warning-text'/>
            <span className='text-sm font-semibold text-status-warning-text'>
              Praised <span className='text-accent'>{recipient.fullName}</span>
            </span>
          </div>

          {/* Praise Message */}
          <div>
            <p className="whitespace-pre-wrap text-body-secondary">
              {post.content}
            </p>
          </div>

          {/* Recipient Info Box */}
          <div className='rounded-lg border-2 border-status-warning-border bg-[var(--bg-card)] px-4 py-4'>
            <div className="flex items-start gap-4">
              <div
                className='flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-status-warning-bg text-sm font-semibold text-status-warning-text'>
                {recipientInitials}
              </div>

              <div className="flex-1">
                <h4 className="font-medium text-[var(--text-primary)]">
                  {recipient.fullName}
                </h4>

                <div className="mt-1 flex items-center gap-2 text-caption">
                  {recipient.designation && <span>{recipient.designation}</span>}
                  {recipient.designation && recipient.department && <span>·</span>}
                  {recipient.department && <span>{recipient.department}</span>}
                </div>
              </div>
            </div>
          </div>

          {/* Reaction Bar */}
          <div className='border-t border-status-warning-border pt-4'>
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
              initial={{opacity: 0, height: 0}}
              animate={{opacity: 1, height: 'auto'}}
              exit={{opacity: 0, height: 0}}
              transition={{duration: 0.2}}
              className='border-t border-status-warning-border pt-4'
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
          onVote={onVote || (() => {
          })}
        />
      );
    case 'PRAISE':
      return <PraiseCard {...baseProps} />;
    case 'POST':
    default:
      return <PostCard {...baseProps} />;
  }
}
