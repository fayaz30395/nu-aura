'use client';

import Image from 'next/image';
import {ExternalLink, Heart, MessageCircle, Pin, Star, ThumbsUp} from 'lucide-react';
import type {CommentResponse} from '@/lib/services/core/wall.service';
import type {FeedItem} from '@/lib/types/core/feed';
import {FEED_COLORS, FEED_LABELS, stripHtml} from './types';
import {FEED_ICONS} from './icons';
import {formatFeedDate} from './formatFeedDate';
import {FeedCardComments} from './FeedCardComments';

export interface FeedCardDefaultProps {
  item: FeedItem;
  liked: boolean;
  localLikeCount: number;
  localCommentCount: number;
  showComments: boolean;
  comments: CommentResponse[];
  commentText: string;
  isLoadingComments: boolean;
  isSubmittingComment: boolean;
  currentUser?: { employeeId?: string; profilePictureUrl?: string };
  onLike: () => void;
  onToggleComments: () => void;
  onChangeCommentText: (value: string) => void;
  onSubmitComment: () => void;
  onReplyAdded: () => void;
}

export function FeedCardDefault({
                                  item,
                                  liked,
                                  localLikeCount,
                                  localCommentCount,
                                  showComments,
                                  comments,
                                  commentText,
                                  isLoadingComments,
                                  isSubmittingComment,
                                  currentUser,
                                  onLike,
                                  onToggleComments,
                                  onChangeCommentText,
                                  onSubmitComment,
                                  onReplyAdded,
                                }: FeedCardDefaultProps) {
  const colors = FEED_COLORS[item.type];
  const icon = FEED_ICONS[item.type];

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
              <span className='text-xs font-medium text-status-success-text'>Today</span>
            )}
            {item.priority === 'CRITICAL' && (
              <span className='text-xs font-medium text-status-danger-text'>Urgent</span>
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
                onClick={onLike}
                className={`inline-flex items-center gap-1 text-xs font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2 ${
                  liked ? 'text-danger-500' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)] '
                }`}
              >
                <Heart className={`h-3 w-3 ${liked ? 'fill-danger-500' : ''}`}/>
                {localLikeCount > 0 ? localLikeCount : 'Like'}
              </button>
              <button
                onClick={onToggleComments}
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
            <FeedCardComments
              wallPostId={item.wallPostId}
              commentText={commentText}
              comments={comments}
              isLoadingComments={isLoadingComments}
              isSubmittingComment={isSubmittingComment}
              currentUser={currentUser}
              variant="default"
              onChangeText={onChangeCommentText}
              onSubmit={onSubmitComment}
              onReplyAdded={onReplyAdded}
            />
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
