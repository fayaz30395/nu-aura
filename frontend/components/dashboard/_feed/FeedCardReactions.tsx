'use client';

import Image from 'next/image';
import {MessageCircle, ThumbsUp} from 'lucide-react';
import type {LocalReactor} from './types';

export interface FeedCardReactionsProps {
  liked: boolean;
  likeCount: number;
  commentCount: number;
  reactors: LocalReactor[];
  allReactors: LocalReactor[];
  showReactorsPopover: boolean;
  isLoadingAllReactors: boolean;
  showComments: boolean;
  hidden?: boolean;
  onLike: () => void;
  onToggleComments: () => void;
  onShowAllReactors: () => void;
  onCloseReactorsPopover: () => void;
}

export function FeedCardReactions({
                                    liked,
                                    likeCount,
                                    commentCount,
                                    reactors,
                                    allReactors,
                                    showReactorsPopover,
                                    isLoadingAllReactors,
                                    showComments,
                                    hidden,
                                    onLike,
                                    onToggleComments,
                                    onShowAllReactors,
                                    onCloseReactorsPopover,
                                  }: FeedCardReactionsProps) {
  return (
    <div
      className={`row-between px-4 py-2 border-t border-[var(--border-subtle)] ${hidden ? 'hidden' : ''}`}>
      <div className="flex items-center gap-4">
        <button
          onClick={onLike}
          className={`inline-flex items-center gap-1.5 text-xs font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2 ${
            liked ? "text-accent" : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
          }`}
        >
          <ThumbsUp className={`h-4 w-4 ${liked ? "fill-accent-700" : ''}`}/>
          Like
        </button>
        <button
          onClick={onToggleComments}
          className={`inline-flex items-center gap-1.5 text-xs font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2 ${
            showComments ? "text-accent" : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
          }`}
        >
          <MessageCircle className="h-4 w-4"/>
          Comment
        </button>
      </div>
      {(likeCount > 0 || commentCount > 0) && (
        <div className="flex items-center gap-1 text-caption">
          {likeCount > 0 && (
            <div className="relative">
              <button
                onClick={onShowAllReactors}
                className="inline-flex items-center gap-1.5 hover:text-[var(--text-secondary)] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
                aria-label="Show all reactions"
              >
                {reactors.length > 0 && (
                  <div className="flex -space-x-1.5">
                    {reactors.slice(0, 3).map((reactor) => (
                      <Image
                        key={reactor.employeeId}
                        src={reactor.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(reactor.fullName)}&background=6366f1&color=fff&size=20&bold=true`}
                        alt={reactor.fullName}
                        width={20}
                        height={20}
                        className='h-5 w-5 rounded-full border border-[var(--bg-card)] dark:border-[var(--border-main)] object-cover'
                        title={reactor.fullName}
                        unoptimized
                      />
                    ))}
                  </div>
                )}
                {reactors.length === 0 && <span className="text-sm leading-none">👍</span>}
                <span>
                  {reactors.length > 0
                    ? likeCount <= 2
                      ? reactors.slice(0, 2).map((r) => r.fullName.split(' ')[0]).join(' and ')
                      : `${reactors[0].fullName.split(' ')[0]} and ${likeCount - 1} other${likeCount - 1 === 1 ? '' : 's'}`
                    : `${likeCount} ${likeCount === 1 ? 'reaction' : 'reactions'}`
                  }
                </span>
              </button>

              {/* Reactors popover */}
              {showReactorsPopover && (
                <>
                  <div className="fixed inset-0 z-40 cursor-pointer" onClick={onCloseReactorsPopover}/>
                  <div
                    className="absolute right-0 bottom-full mb-2 z-50 w-64 bg-[var(--bg-card)] border border-[var(--border-main)] rounded-xl shadow-[var(--shadow-dropdown)] overflow-hidden">
                    <div className="row-between px-4 py-2 divider-b">
                      <span
                        className="text-xs font-semibold text-[var(--text-primary)]">Reactions ({likeCount})</span>
                      <button onClick={onCloseReactorsPopover}
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
                        (allReactors.length > 0 ? allReactors : reactors).map((reactor) => (
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
                      {!isLoadingAllReactors && allReactors.length === 0 && reactors.length === 0 && (
                        <p className="text-caption text-center py-4">No reactions yet</p>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
          {likeCount > 0 && commentCount > 0 && (
            <span className="mx-0.5">·</span>
          )}
          {commentCount > 0 && (
            <button onClick={onToggleComments}
                    className="hover:text-[var(--text-secondary)] hover:underline transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2">
              {commentCount} {commentCount === 1 ? 'Comment' : 'Comments'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
