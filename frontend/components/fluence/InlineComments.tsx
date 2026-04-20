'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  useInlineComments,
  useCreateInlineComment,
  useReplyToInlineComment,
  useResolveInlineComment,
  useDeleteInlineComment,
} from '@/lib/hooks/queries/useFluence';
import { WikiInlineComment } from '@/lib/types/platform/fluence';
import {
  MessageSquare,
  Send,
  CheckCircle,
  Trash2,
  Reply,
  X,
  MessageCircle,
  ChevronDown,
  ChevronUp,
  Plus,
} from 'lucide-react';

const commentSchema = z.object({
  content: z.string().min(1, 'Comment cannot be empty'),
});

type CommentFormValues = z.infer<typeof commentSchema>;

// ─── Text Selection Handler ─────────────────────────────────────────────────

interface TextSelection {
  text: string;
  selector: string;
  offset: number;
}

function getTextSelection(): TextSelection | null {
  const selection = window.getSelection();
  if (!selection || selection.isCollapsed || !selection.rangeCount) return null;

  const range = selection.getRangeAt(0);
  const text = selection.toString().trim();
  if (!text || text.length < 2) return null;

  const container = range.startContainer.parentElement;
  if (!container) return null;

  // Build a simple CSS path as anchor selector
  const path: string[] = [];
  let el: HTMLElement | null = container;
  while (el && !el.classList.contains('prose') && !el.hasAttribute('data-page-content')) {
    const tag = el.tagName.toLowerCase();
    const idx = el.parentElement
      ? Array.from(el.parentElement.children).filter((c) => c.tagName === el!.tagName).indexOf(el) + 1
      : 1;
    path.unshift(`${tag}:nth-of-type(${idx})`);
    el = el.parentElement;
  }

  return {
    text: text.substring(0, 500),
    selector: path.join(' > '),
    offset: range.startOffset,
  };
}

// ─── Single Comment Thread ──────────────────────────────────────────────────

interface CommentThreadProps {
  comment: WikiInlineComment;
  pageId: string;
  depth?: number;
}

function CommentThread({comment, pageId, depth = 0}: CommentThreadProps) {
  const [showReply, setShowReply] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const replyMutation = useReplyToInlineComment();
  const resolveMutation = useResolveInlineComment();
  const deleteMutation = useDeleteInlineComment();

  const form = useForm<CommentFormValues>({
    resolver: zodResolver(commentSchema),
  });

  async function handleReply(values: CommentFormValues) {
    await replyMutation.mutateAsync({
      commentId: comment.id,
      pageId,
      data: { content: values.content },
    });
    form.reset();
    setShowReply(false);
  }

  const isResolved = comment.status === 'RESOLVED';
  const hasReplies = comment.replies && comment.replies.length > 0;
  const timeAgo = formatTimeAgo(comment.createdAt);

  return (
    <div className={`${depth > 0 ? 'ml-6 border-l-2 border-[var(--border-subtle)] pl-4' : ''}`}>
      <div className={`py-2 ${isResolved ? 'opacity-60' : ''}`}>
        {/* Comment Header */}
        <div className="flex items-center gap-2 mb-1">
          <div className="h-6 w-6 rounded-full bg-accent-100 dark:bg-accent-900/30 flex items-center justify-center flex-shrink-0">
            <span className="text-2xs font-medium text-accent-700 dark:text-accent-400">
              {(comment.authorName || 'U')[0].toUpperCase()}
            </span>
          </div>
          <span className="text-xs font-medium text-[var(--text-primary)]">
            {comment.authorName || 'Unknown'}
          </span>
          <span className="text-2xs text-[var(--text-muted)]">{timeAgo}</span>
          {isResolved && (
            <Badge variant="success" size="sm">Resolved</Badge>
          )}
        </div>

        {/* Anchor context */}
        {comment.anchorText && depth === 0 && (
          <div className="mb-1 px-2 py-1 bg-warning-50 dark:bg-warning-900/20 border-l-2 border-warning-400 rounded-r text-2xs text-[var(--text-secondary)] italic truncate">
            &ldquo;{comment.anchorText}&rdquo;
          </div>
        )}

        {/* Comment Body */}
        <p className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap">
          {comment.content}
        </p>

        {/* Actions */}
        <div className="flex items-center gap-2 mt-1">
          {!isResolved && (
            <>
              <button
                onClick={() => setShowReply(!showReply)}
                className="flex items-center gap-1 text-2xs text-[var(--text-muted)] hover:text-accent-600 cursor-pointer"
              >
                <Reply className="h-3 w-3" />
                Reply
              </button>
              <button
                onClick={() => resolveMutation.mutate({ commentId: comment.id, pageId })}
                className="flex items-center gap-1 text-2xs text-[var(--text-muted)] hover:text-success-600 cursor-pointer"
                disabled={resolveMutation.isPending}
              >
                <CheckCircle className="h-3 w-3" />
                Resolve
              </button>
            </>
          )}
          <button
            onClick={() => deleteMutation.mutate({ commentId: comment.id, pageId })}
            className="flex items-center gap-1 text-2xs text-[var(--text-muted)] hover:text-danger-600 cursor-pointer"
            disabled={deleteMutation.isPending}
          >
            <Trash2 className="h-3 w-3" />
            Delete
          </button>
        </div>

        {/* Reply form */}
        {showReply && (
          <form onSubmit={form.handleSubmit(handleReply)} className="mt-2 flex gap-2">
            <input
              {...form.register('content')}
              placeholder="Write a reply..."
              className="flex-1 px-4 py-2 text-sm bg-[var(--bg-input)] border border-[var(--border-main)] rounded-lg input-skeuo"
              autoFocus
            />
            <Button type="submit" disabled={replyMutation.isPending} className="px-2 py-2">
              <Send className="h-3.5 w-3.5" />
            </Button>
          </form>
        )}
      </div>

      {/* Replies */}
      {hasReplies && (
        <>
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-2xs text-[var(--text-muted)] hover:text-[var(--text-primary)] mb-1 cursor-pointer"
          >
            {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            {comment.replies!.length} {comment.replies!.length === 1 ? 'reply' : 'replies'}
          </button>
          {expanded &&
            comment.replies!.map((reply) => (
              <CommentThread
                key={reply.id}
                comment={reply}
                pageId={pageId}
                depth={depth + 1}
              />
            ))}
        </>
      )}
    </div>
  );
}

// ─── Main Inline Comments Panel ─────────────────────────────────────────────

interface InlineCommentsPanelProps {
  pageId: string;
  isOpen: boolean;
  onToggle: () => void;
}

export function InlineCommentsPanel({ pageId, isOpen, onToggle }: InlineCommentsPanelProps) {
  const [showNewForm, setShowNewForm] = useState(false);
  const [selectedText, setSelectedText] = useState<TextSelection | null>(null);
  const [showResolved, setShowResolved] = useState(false);
  const commentsQuery = useInlineComments(pageId, isOpen);
  const createMutation = useCreateInlineComment();

  const form = useForm<CommentFormValues>({
    resolver: zodResolver(commentSchema),
  });

  // Listen for text selection
  useEffect(() => {
    if (!isOpen) return;

    function handleMouseUp() {
      const sel = getTextSelection();
      if (sel) {
        setSelectedText(sel);
        setShowNewForm(true);
      }
    }

    const contentEl = document.querySelector('[data-page-content]');
    if (contentEl) {
      contentEl.addEventListener('mouseup', handleMouseUp);
      return () => contentEl.removeEventListener('mouseup', handleMouseUp);
    }
  }, [isOpen]);

  async function handleCreate(values: CommentFormValues) {
    await createMutation.mutateAsync({
      pageId,
      data: {
        content: values.content,
        anchorSelector: selectedText?.selector,
        anchorText: selectedText?.text,
        anchorOffset: selectedText?.offset,
      },
    });
    form.reset();
    setShowNewForm(false);
    setSelectedText(null);
  }

  const allComments = commentsQuery.data || [];
  const rootComments = allComments.filter((c) => !c.parentCommentId);
  const openComments = rootComments.filter((c) => c.status === 'OPEN');
  const resolvedComments = rootComments.filter((c) => c.status === 'RESOLVED');
  const displayComments = showResolved ? rootComments : openComments;

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={onToggle}
        className="fixed right-4 bottom-20 z-40 flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-[var(--bg-card)] border border-[var(--border-main)] rounded-lg shadow-[var(--shadow-elevated)] hover:bg-[var(--bg-secondary)] cursor-pointer"
        aria-label="Toggle inline comments"
      >
        <MessageSquare className="h-4 w-4 text-accent-600 dark:text-accent-400" />
        Comments
        {openComments.length > 0 && (
          <Badge variant="info" size="sm">{openComments.length}</Badge>
        )}
      </button>

      {/* Sidebar Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: 340, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 340, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 w-[340px] z-50 bg-[var(--bg-card)] border-l border-[var(--border-main)] shadow-[var(--shadow-elevated)] flex flex-col"
          >
            {/* Panel Header */}
            <div className="flex items-center justify-between px-4 py-4 border-b border-[var(--border-main)]">
              <div className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4 text-accent-600 dark:text-accent-400" />
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                  Inline Comments
                </h3>
                <Badge variant="default" size="sm">
                  {openComments.length} open
                </Badge>
              </div>
              <button
                onClick={onToggle}
                className="p-1.5 rounded-md hover:bg-[var(--bg-secondary)] cursor-pointer"
                aria-label="Close comments panel"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* New Comment Button */}
            <div className="px-4 py-2 border-b border-[var(--border-subtle)]">
              <Button
                onClick={() => { setShowNewForm(true); setSelectedText(null); }}
                variant="outline"
                className="w-full flex items-center gap-2 text-sm"
              >
                <Plus className="h-3.5 w-3.5" />
                New Comment
              </Button>
              <p className="text-2xs text-[var(--text-muted)] mt-1 text-center">
                Select text on the page to attach a comment
              </p>
            </div>

            {/* New Comment Form */}
            <AnimatePresence>
              {showNewForm && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="px-4 py-2 border-b border-[var(--border-subtle)] overflow-hidden"
                >
                  {selectedText && (
                    <div className="mb-2 px-2 py-1 bg-warning-50 dark:bg-warning-900/20 border-l-2 border-warning-400 rounded-r text-2xs italic truncate">
                      &ldquo;{selectedText.text}&rdquo;
                    </div>
                  )}
                  <form onSubmit={form.handleSubmit(handleCreate)} className="space-y-2">
                    <textarea
                      {...form.register('content')}
                      placeholder="Write your comment..."
                      rows={3}
                      className="w-full px-4 py-2 text-sm bg-[var(--bg-input)] border border-[var(--border-main)] rounded-lg resize-none input-skeuo"
                      autoFocus
                    />
                    {form.formState.errors.content && (
                      <p className="text-xs text-danger-600">
                        {form.formState.errors.content.message}
                      </p>
                    )}
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => { setShowNewForm(false); setSelectedText(null); }}
                        className="px-4 py-2 text-xs"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={createMutation.isPending}
                        className="px-4 py-2 text-xs"
                      >
                        {createMutation.isPending ? 'Posting...' : 'Post Comment'}
                      </Button>
                    </div>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Filter Toggle */}
            <div className="px-4 py-2 flex items-center gap-2">
              <button
                onClick={() => setShowResolved(!showResolved)}
                className={`text-2xs px-2 py-0.5 rounded cursor-pointer ${
                  showResolved
                    ? 'bg-accent-100 dark:bg-accent-900/30 text-accent-700 dark:text-accent-400'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                {showResolved ? 'Showing all' : `Show resolved (${resolvedComments.length})`}
              </button>
            </div>

            {/* Comment List */}
            <div className="flex-1 overflow-y-auto px-4 pb-4">
              {commentsQuery.isLoading ? (
                <div className="space-y-4 pt-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-4 bg-[var(--bg-secondary)] rounded w-24 mb-2" />
                      <div className="h-8 bg-[var(--bg-secondary)] rounded" />
                    </div>
                  ))}
                </div>
              ) : displayComments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <MessageSquare className="h-8 w-8 text-[var(--text-muted)] mb-2" />
                  <p className="text-sm text-[var(--text-muted)]">
                    {showResolved ? 'No comments yet' : 'No open comments'}
                  </p>
                  <p className="text-2xs text-[var(--text-muted)] mt-1">
                    Select text on the page to start a discussion
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-[var(--border-subtle)]">
                  {displayComments.map((comment) => (
                    <CommentThread
                      key={comment.id}
                      comment={comment}
                      pageId={pageId}
                    />
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ─── Utility ────────────────────────────────────────────────────────────────

function formatTimeAgo(dateString: string): string {
  const now = Date.now();
  const then = new Date(dateString).getTime();
  const diff = now - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric',
  });
}
