'use client';

import { useState, useCallback, useEffect, useRef, Fragment } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen,
  ArrowLeft,
  Edit,
  Share2,
  Archive,
  Eye,
  Heart,
  MessageCircle,
  RefreshCw,
  Calendar,
  Send,
  Trash2,
  Building2,
  Globe,
  Lock,
  Star,
  History,
  Users,
  Copy,
  Check,
  ThumbsUp,
  Reply,
  CornerDownRight,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { Skeleton, Modal, Tooltip, ActionIcon, Badge } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { AppLayout } from '@/components/layout';
import { Button } from '@/components/ui/Button';
import {
  useWikiPage,
  useComments,
  useLikeWikiPage,
  useUnlikeWikiPage,
  useCreateComment,
  useDeleteComment,
  useRecordView,
  useContentViewers,
  useAddFavorite,
  useRemoveFavorite,
  useWikiPageRevisions,
  useRestoreWikiPageRevision,
} from '@/lib/hooks/queries/useFluence';
import { useAuth } from '@/lib/hooks/useAuth';
import { MentionInput, type MentionInputHandle } from '@/components/fluence/MentionInput';
import { layout, typography, card, motion as dsMotion, iconSize } from '@/lib/design-system';
import type { FluenceComment } from '@/lib/types/fluence';

// Dynamically import Tiptap viewer to keep it out of the initial bundle
const ContentViewer = dynamic(
  () => import('@/components/fluence/ContentViewer'),
  { ssr: false, loading: () => <Skeleton height={300} radius="md" /> }
);

interface Viewer {
  id: string;
  viewerName?: string;
  viewedAt: string;
}

interface Revision {
  id: string;
  version: number;
  authorName?: string;
  changeDescription?: string;
  createdAt: string;
}

// ─── Helpers ──────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

const AVATAR_COLORS = [
  'from-indigo-500 to-indigo-600',
  'from-emerald-500 to-emerald-600',
  'from-amber-500 to-amber-600',
  'from-rose-500 to-rose-600',
  'from-violet-500 to-violet-600',
  'from-cyan-500 to-cyan-600',
  'from-orange-500 to-orange-600',
  'from-teal-500 to-teal-600',
];

function avatarColor(id: string): string {
  const hash = id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

/** Render comment body with @mentions highlighted */
function renderBodyWithMentions(body: string): React.ReactNode {
  // Match @Name patterns (supports multi-word names)
  const mentionRegex = /@([A-Z][a-z]+(?:\s[A-Z][a-z]*)*)/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null = null;

  while ((match = mentionRegex.exec(body)) !== null) {
    // Text before mention
    if (match.index > lastIndex) {
      parts.push(body.slice(lastIndex, match.index));
    }
    // Mention chip
    parts.push(
      <span
        key={`${match.index}-${match[1]}`}
        className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-[var(--primary-600)]/10 text-[var(--primary-600)] dark:text-[var(--primary-400)] text-xs font-medium cursor-pointer hover:bg-[var(--primary-600)]/20 transition-colors"
      >
        @{match[1]}
      </span>
    );
    lastIndex = match.index + match[0].length;
  }

  // Remaining text
  if (lastIndex < body.length) {
    parts.push(body.slice(lastIndex));
  }

  return parts.length > 0 ? parts : body;
}

function timeAgo(dateStr: string): string {
  const now = new Date();
  const then = new Date(dateStr);
  const diffMs = now.getTime() - then.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return then.toLocaleDateString();
}

// ─── Comment Thread Component ────────────────────────────────────

interface CommentThreadProps {
  comment: FluenceComment;
  userId?: string;
  onDelete: (id: string) => void;
  onReply: (parentId: string) => void;
  replyingTo: string | null;
  replyText: string;
  onReplyTextChange: (val: string) => void;
  onSubmitReply: () => void;
}

function CommentThread({
  comment,
  userId,
  onDelete,
  onReply,
  replyingTo,
  replyText,
  onReplyTextChange,
  onSubmitReply,
}: CommentThreadProps) {
  const [showReplies, setShowReplies] = useState(true);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(comment.likeCount || 0);
  const mentionRef = useRef<MentionInputHandle>(null);

  const replies = comment.replies || [];

  const handleLike = () => {
    setLiked(!liked);
    setLikeCount((prev) => (liked ? prev - 1 : prev + 1));
  };

  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 8 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.25 } },
      }}
      className="group"
    >
      {/* Main comment */}
      <div className="flex gap-4">
        <div
          className={`flex-shrink-0 h-10 w-10 rounded-full bg-gradient-to-br ${avatarColor(
            comment.authorId
          )} flex items-center justify-center text-sm font-semibold text-white`}
        >
          {getInitials(comment.authorName || 'A')}
        </div>
        <div className="flex-1 min-w-0">
          {/* Author + time */}
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-semibold text-[var(--text-primary)]">
              {comment.authorName || 'Anonymous'}
            </span>
            <span className="text-xs text-[var(--text-muted)]">{timeAgo(comment.createdAt)}</span>
          </div>

          {/* Body with @mentions */}
          <div className="text-sm text-[var(--text-secondary)] leading-relaxed mb-2">
            {renderBodyWithMentions(comment.body)}
          </div>

          {/* Action bar */}
          <div className="flex items-center gap-4">
            <button
              onClick={handleLike}
              className={`flex items-center gap-1.5 text-xs font-medium transition-colors duration-150 ${
                liked
                  ? 'text-[var(--primary-600)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              <ThumbsUp className={`h-3.5 w-3.5 ${liked ? 'fill-current' : ''}`} />
              {likeCount > 0 && <span>{likeCount}</span>}
            </button>

            <button
              onClick={() => onReply(comment.id)}
              className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors duration-150"
            >
              <Reply className="h-3.5 w-3.5" />
              Reply
            </button>

            {comment.authorId === userId && (
              <button
                onClick={() => onDelete(comment.id)}
                className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--status-danger-text)] transition-colors duration-150 opacity-0 group-hover:opacity-100"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </button>
            )}
          </div>

          {/* Replies */}
          {replies.length > 0 && (
            <div className="mt-4">
              <button
                onClick={() => setShowReplies(!showReplies)}
                className="flex items-center gap-1.5 text-xs font-medium text-[var(--primary-600)] hover:text-[var(--primary-700)] transition-colors mb-2"
              >
                <CornerDownRight className="h-3.5 w-3.5" />
                {showReplies ? (
                  <>
                    <ChevronUp className="h-3 w-3" />
                    Hide {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3 w-3" />
                    Show {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
                  </>
                )}
              </button>

              <AnimatePresence>
                {showReplies && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2, ease: 'easeInOut' }}
                    className="border-l-2 border-[var(--border-main)] pl-4 ml-1 space-y-4 overflow-hidden"
                  >
                    {replies.map((reply) => (
                      <ReplyItem
                        key={reply.id}
                        reply={reply}
                        userId={userId}
                        onDelete={onDelete}
                      />
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Inline reply input */}
          <AnimatePresence>
            {replyingTo === comment.id && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.15 }}
                className="mt-4 flex gap-2 items-start overflow-hidden"
              >
                <div className="flex-1">
                  <MentionInput
                    ref={mentionRef}
                    value={replyText}
                    onChange={onReplyTextChange}
                    onSubmit={onSubmitReply}
                    placeholder={`Reply to ${comment.authorName}... Use @ to tag`}
                  />
                </div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={onSubmitReply}
                  disabled={!replyText.trim()}
                  className="mt-0.5 p-2.5 rounded-xl bg-[var(--primary-600)] hover:bg-[var(--primary-700)] text-white transition-colors duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Send className="h-4 w-4" />
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Reply Item (nested) ─────────────────────────────────────────

interface ReplyItemProps {
  reply: FluenceComment;
  userId?: string;
  onDelete: (id: string) => void;
}

function ReplyItem({ reply, userId, onDelete }: ReplyItemProps) {
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(reply.likeCount || 0);

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2 }}
      className="flex gap-4 group/reply"
    >
      <div
        className={`flex-shrink-0 h-8 w-8 rounded-full bg-gradient-to-br ${avatarColor(
          reply.authorId
        )} flex items-center justify-center text-xs font-semibold text-white`}
      >
        {getInitials(reply.authorName || 'A')}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-sm font-semibold text-[var(--text-primary)]">
            {reply.authorName || 'Anonymous'}
          </span>
          <span className="text-xs text-[var(--text-muted)]">{timeAgo(reply.createdAt)}</span>
        </div>
        <div className="text-sm text-[var(--text-secondary)] leading-relaxed mb-1.5">
          {renderBodyWithMentions(reply.body)}
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              setLiked(!liked);
              setLikeCount((p) => (liked ? p - 1 : p + 1));
            }}
            className={`flex items-center gap-1.5 text-xs font-medium transition-colors duration-150 ${
              liked
                ? 'text-[var(--primary-600)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            <ThumbsUp className={`h-3 w-3 ${liked ? 'fill-current' : ''}`} />
            {likeCount > 0 && <span>{likeCount}</span>}
          </button>
          {reply.authorId === userId && (
            <button
              onClick={() => onDelete(reply.id)}
              className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--status-danger-text)] transition-colors duration-150 opacity-0 group-hover/reply:opacity-100"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────

export default function WikiPageDetailPage() {
  const router = useRouter();
  const params = useParams();
  const pageId = params.slug as string;
  const { user } = useAuth();
  const [commentText, setCommentText] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [showViewers, setShowViewers] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const commentInputRef = useRef<MentionInputHandle>(null);

  const { data: page, isLoading } = useWikiPage(pageId, !!pageId);
  const { data: commentsData } = useComments(pageId, 'WIKI', 0, 50, !!pageId && !!page);
  const { data: viewers } = useContentViewers(pageId, 'WIKI', showViewers && !!pageId);
  const { data: revisions } = useWikiPageRevisions(pageId, showHistory && !!pageId);

  const likeMutation = useLikeWikiPage();
  const unlikeMutation = useUnlikeWikiPage();
  const createComment = useCreateComment();
  const deleteComment = useDeleteComment();
  const recordView = useRecordView();
  const addFavorite = useAddFavorite();
  const removeFavorite = useRemoveFavorite();
  const restoreRevision = useRestoreWikiPageRevision();

  const comments = (commentsData?.content || []) as FluenceComment[];
  const isLiked = page?.isLikedByCurrentUser ?? false;
  const isFavorited = page?.isFavoritedByCurrentUser ?? false;

  // Total comment count including replies
  const totalCommentCount = comments.reduce(
    (sum, c) => sum + 1 + (c.replies?.length || 0),
    0
  );

  // Record view on page load
  useEffect(() => {
    if (pageId && page) {
      recordView.mutate({ contentId: pageId, contentType: 'WIKI' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageId, page?.id]);

  const handleToggleLike = useCallback(() => {
    if (!page) return;
    if (isLiked) {
      unlikeMutation.mutate(page.id);
    } else {
      likeMutation.mutate(page.id);
    }
  }, [page, isLiked, likeMutation, unlikeMutation]);

  const handleToggleFavorite = useCallback(() => {
    if (!page) return;
    if (isFavorited) {
      removeFavorite.mutate({ contentId: page.id, contentType: 'WIKI_PAGE' });
    } else {
      addFavorite.mutate({ contentId: page.id, contentType: 'WIKI_PAGE' });
    }
  }, [page, isFavorited, addFavorite, removeFavorite]);

  const handleAddComment = useCallback(() => {
    if (!page || !commentText.trim()) return;
    createComment.mutate(
      { contentId: page.id, contentType: 'WIKI', data: { body: commentText.trim() } },
      {
        onSuccess: () => {
          setCommentText('');
          notifications.show({ title: 'Comment added', message: '', color: 'green' });
        },
      }
    );
  }, [page, commentText, createComment]);

  const handleDeleteComment = useCallback(
    (commentId: string) => {
      if (!page) return;
      deleteComment.mutate(
        { contentId: page.id, contentType: 'WIKI', commentId },
        {
          onSuccess: () => {
            notifications.show({ title: 'Comment deleted', message: '', color: 'green' });
          },
        }
      );
    },
    [page, deleteComment]
  );

  const handleReply = useCallback((parentId: string) => {
    setReplyingTo((prev) => (prev === parentId ? null : parentId));
    setReplyText('');
  }, []);

  const handleSubmitReply = useCallback(() => {
    if (!page || !replyText.trim() || !replyingTo) return;
    createComment.mutate(
      {
        contentId: page.id,
        contentType: 'WIKI',
        data: { body: replyText.trim(), parentId: replyingTo },
      },
      {
        onSuccess: () => {
          setReplyText('');
          setReplyingTo(null);
          notifications.show({ title: 'Reply posted', message: '', color: 'green' });
        },
      }
    );
  }, [page, replyText, replyingTo, createComment]);

  const handleCopyLink = useCallback(() => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
      notifications.show({ title: 'Link copied to clipboard!', message: '', color: 'blue' });
    }
  }, []);

  const handleRestoreRevision = useCallback(
    (revisionId: string) => {
      if (!page) return;
      restoreRevision.mutate(
        { pageId: page.id, revisionId },
        {
          onSuccess: () => {
            setShowHistory(false);
            notifications.show({
              title: 'Revision restored',
              message: 'Page has been restored to the selected version.',
              color: 'green',
            });
          },
          onError: () => {
            notifications.show({
              title: 'Error',
              message: 'Failed to restore revision',
              color: 'red',
            });
          },
        }
      );
    },
    [page, restoreRevision]
  );

  const canEdit =
    page?.canEdit || page?.authorId === user?.id || page?.editorIds?.includes(user?.id || '');

  // ─── Loading ─────────────────────────────────────────────────

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <RefreshCw
            className={`${iconSize.pageHeader} text-[var(--text-muted)] animate-spin`}
          />
        </div>
      </AppLayout>
    );
  }

  if (!page) {
    return (
      <AppLayout>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="text-center py-16"
        >
          <BookOpen
            className={`${iconSize.pageHeader} mx-auto mb-4 text-[var(--text-muted)]`}
          />
          <h3 className={`${typography.sectionTitle} mb-1`}>Page not found</h3>
          <p className={`${typography.caption} mb-6`}>
            The page you&apos;re looking for doesn&apos;t exist
          </p>
          <Button
            onClick={() => router.back()}
            className="gap-2 bg-[var(--primary-600)] hover:bg-[var(--primary-700)]"
          >
            <ArrowLeft className={iconSize.button} />
            Go Back
          </Button>
        </motion.div>
      </AppLayout>
    );
  }

  const VisibilityIcon =
    page.visibility === 'PUBLIC' || page.visibility === 'ORGANIZATION'
      ? Globe
      : page.visibility === 'DEPARTMENT'
        ? Building2
        : Lock;

  // ─── Render ──────────────────────────────────────────────────

  return (
    <AppLayout>
      <motion.div {...dsMotion.pageEnter} className={layout.sectionGap}>
        {/* Back Button */}
        <motion.div
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
        >
          <button
            onClick={() => router.back()}
            className="mb-6 inline-flex items-center gap-2 text-[var(--primary-600)] hover:text-[var(--primary-700)] transition-colors duration-200 group"
          >
            <ArrowLeft
              className={`${iconSize.button} group-hover:-translate-x-1 transition-transform`}
            />
            <span className="text-sm font-medium">Back</span>
          </button>
        </motion.div>

        {/* Title Section */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut', delay: 0.1 }}
          className={card.base}
        >
          <div className={card.paddingLarge}>
            <div className="flex items-start justify-between gap-6 mb-4">
              <div className="flex-1 min-w-0">
                <h1 className="text-4xl font-bold text-[var(--text-primary)] mb-4 leading-tight">
                  {page.title}
                </h1>
                <div className="flex flex-wrap items-center gap-6 mb-6">
                  {/* Author */}
                  <div className="flex items-center gap-4">
                    <div
                      className={`flex-shrink-0 h-10 w-10 rounded-full bg-gradient-to-br ${avatarColor(
                        page.authorId || 'default'
                      )} flex items-center justify-center text-sm font-semibold text-white`}
                    >
                      {getInitials(page.authorName || 'A')}
                    </div>
                    <div>
                      <p className={typography.bodySecondary}>
                        {page.authorName || 'Unknown Author'}
                      </p>
                      <p className={typography.caption}>Author</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-[var(--text-muted)]">
                    <Calendar className={`${iconSize.cardInline} flex-shrink-0`} />
                    <span className="text-sm">
                      {new Date(page.updatedAt).toLocaleDateString()}
                    </span>
                  </div>

                  <Tooltip label="Click to see who viewed this page" withArrow>
                    <button
                      onClick={() => setShowViewers(true)}
                      className="flex items-center gap-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors duration-200 cursor-pointer group"
                    >
                      <Eye
                        className={`${iconSize.cardInline} flex-shrink-0 group-hover:scale-110 transition-transform`}
                      />
                      <span className="text-sm font-medium">{page.viewCount || 0} views</span>
                    </button>
                  </Tooltip>

                  {page.spaceName && (
                    <Badge variant="light" size="lg" color="var(--primary-600)">
                      {page.spaceName}
                    </Badge>
                  )}
                </div>

                {/* ═══ Engagement Bar ═══ */}
                <div className="flex items-center gap-2 pt-4 border-t border-[var(--border-main)]">
                  {/* Like Button */}
                  <motion.button
                    whileTap={{ scale: 0.92 }}
                    onClick={handleToggleLike}
                    disabled={likeMutation.isPending || unlikeMutation.isPending}
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 border ${
                      isLiked
                        ? 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400'
                        : 'bg-[var(--bg-secondary)] border-[var(--border-main)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:border-[var(--border-main)]'
                    } disabled:opacity-50`}
                  >
                    <Heart
                      className={`h-4 w-4 transition-transform duration-200 ${
                        isLiked ? 'fill-current scale-110' : ''
                      }`}
                    />
                    <span>{page.likeCount || 0}</span>
                  </motion.button>

                  {/* Favorite Button */}
                  <motion.button
                    whileTap={{ scale: 0.92 }}
                    onClick={handleToggleFavorite}
                    disabled={addFavorite.isPending || removeFavorite.isPending}
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 border ${
                      isFavorited
                        ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400'
                        : 'bg-[var(--bg-secondary)] border-[var(--border-main)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'
                    } disabled:opacity-50`}
                  >
                    <Star
                      className={`h-4 w-4 transition-transform duration-200 ${
                        isFavorited ? 'fill-current scale-110' : ''
                      }`}
                    />
                    <span>{isFavorited ? 'Saved' : 'Save'}</span>
                  </motion.button>

                  {/* Comment count chip */}
                  <button
                    onClick={() => {
                      document
                        .getElementById('comments-section')
                        ?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium bg-[var(--bg-secondary)] border border-[var(--border-main)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors"
                  >
                    <MessageCircle className="h-4 w-4" />
                    <span>{totalCommentCount}</span>
                  </button>

                  {/* Share */}
                  <motion.button
                    whileTap={{ scale: 0.92 }}
                    onClick={handleCopyLink}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium bg-[var(--bg-secondary)] border border-[var(--border-main)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors"
                  >
                    {linkCopied ? (
                      <Check className="h-4 w-4 text-[var(--status-success-text)]" />
                    ) : (
                      <Share2 className="h-4 w-4" />
                    )}
                    <span>{linkCopied ? 'Copied' : 'Share'}</span>
                  </motion.button>
                </div>
              </div>

              {/* Action Icons */}
              <div className="flex-shrink-0 flex items-center gap-2">
                {canEdit && (
                  <Tooltip label="Edit page" withArrow>
                    <ActionIcon
                      size="lg"
                      variant="subtle"
                      onClick={() => router.push(`/fluence/wiki/${page.id}/edit`)}
                      className="hover:bg-[var(--bg-secondary)] transition-colors"
                    >
                      <Edit className={iconSize.cardInline} />
                    </ActionIcon>
                  </Tooltip>
                )}
                <Tooltip label="View history" withArrow>
                  <ActionIcon
                    size="lg"
                    variant="subtle"
                    onClick={() => setShowHistory(true)}
                    className="hover:bg-[var(--bg-secondary)] transition-colors"
                  >
                    <History className={iconSize.cardInline} />
                  </ActionIcon>
                </Tooltip>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content Area */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut', delay: 0.15 }}
            className="lg:col-span-2"
          >
            <div className={`${card.base} ${card.paddingLarge}`}>
              <ContentViewer content={page.content} />
            </div>
          </motion.div>

          {/* Sidebar */}
          <motion.div
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut', delay: 0.15 }}
            className={layout.sectionGap}
          >
            {/* Stats Card */}
            <motion.div
              variants={{
                hidden: { opacity: 0, y: 8 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.25 } },
              }}
              initial="hidden"
              animate="visible"
              className={card.base}
            >
              <div className={card.paddingLarge}>
                <h3 className={`${typography.cardTitle} mb-4`}>Page Stats</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-4 border-b border-[var(--border-main)]">
                    <span className={typography.bodySecondary}>Views</span>
                    <span className="text-lg font-semibold text-[var(--text-primary)]">
                      {page.viewCount || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pb-4 border-b border-[var(--border-main)]">
                    <div className="flex items-center gap-2">
                      <Heart
                        className={`h-4 w-4 ${
                          isLiked ? 'fill-red-500 text-red-500' : 'text-[var(--text-muted)]'
                        }`}
                      />
                      <span className={typography.bodySecondary}>Likes</span>
                    </div>
                    <span className="text-lg font-semibold text-[var(--text-primary)]">
                      {page.likeCount || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pb-4 border-b border-[var(--border-main)]">
                    <div className="flex items-center gap-2">
                      <MessageCircle className="h-4 w-4 text-[var(--text-muted)]" />
                      <span className={typography.bodySecondary}>Comments</span>
                    </div>
                    <span className="text-lg font-semibold text-[var(--text-primary)]">
                      {totalCommentCount}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={typography.bodySecondary}>Version</span>
                    <span className="text-lg font-semibold text-[var(--text-primary)]">
                      v{page.version}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Actions Card */}
            <motion.div
              variants={{
                hidden: { opacity: 0, y: 8 },
                visible: {
                  opacity: 1,
                  y: 0,
                  transition: { duration: 0.25, delay: 0.06 },
                },
              }}
              initial="hidden"
              animate="visible"
              className={card.base}
            >
              <div className={card.paddingLarge}>
                <h3 className={`${typography.cardTitle} mb-4`}>Actions</h3>
                <div className="space-y-2">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setShowHistory(true)}
                    className="w-full flex items-center gap-4 px-4 py-2.5 rounded-lg bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors duration-200 text-sm font-medium text-[var(--text-primary)]"
                  >
                    <History className={`${iconSize.cardInline} flex-shrink-0`} />
                    <span>Version History</span>
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full flex items-center gap-4 px-4 py-2.5 rounded-lg bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors duration-200 text-sm font-medium text-[var(--text-primary)]"
                  >
                    <Archive className={`${iconSize.cardInline} flex-shrink-0`} />
                    <span>Archive</span>
                  </motion.button>
                </div>
              </div>
            </motion.div>

            {/* Visibility Info Card */}
            {page.visibility && (
              <motion.div
                variants={{
                  hidden: { opacity: 0, y: 8 },
                  visible: {
                    opacity: 1,
                    y: 0,
                    transition: { duration: 0.25, delay: 0.12 },
                  },
                }}
                initial="hidden"
                animate="visible"
                className={card.base}
              >
                <div className={card.paddingLarge}>
                  <h3 className={`${typography.cardTitle} mb-4`}>Visibility</h3>
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <VisibilityIcon
                        className={`${iconSize.cardInline} flex-shrink-0 ${
                          VisibilityIcon === Globe
                            ? 'text-[var(--status-success-text)]'
                            : VisibilityIcon === Building2
                              ? 'text-[var(--status-info-text)]'
                              : 'text-[var(--status-warning-text)]'
                        }`}
                      />
                      <span className={`${typography.bodySecondary} capitalize`}>
                        {page.visibility.toLowerCase()}
                      </span>
                    </div>
                    {page.departmentName && (
                      <p className={`${typography.caption} pl-7`}>
                        Department: {page.departmentName}
                      </p>
                    )}
                    {page.editorIds && page.editorIds.length > 0 && (
                      <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] pl-7 pt-2 border-t border-[var(--border-main)]">
                        <Users className={`${iconSize.meta} flex-shrink-0`} />
                        <span>
                          {page.editorIds.length} editor
                          {page.editorIds.length !== 1 ? 's' : ''} with edit access
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </motion.div>
        </div>

        {/* ═══════════════════════════════════════════════════════════
            COMMENTS SECTION
            ═══════════════════════════════════════════════════════════ */}
        <motion.div
          id="comments-section"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut', delay: 0.2 }}
          className={card.base}
        >
          <div className={card.paddingLarge}>
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <MessageCircle className={iconSize.cardInline} />
                <h2 className={typography.cardTitle}>
                  Discussion{' '}
                  <span className="text-[var(--text-muted)] font-normal">
                    ({totalCommentCount})
                  </span>
                </h2>
              </div>
            </div>

            {/* Comment Input */}
            <div className="flex gap-4 mb-8 pb-6 border-b border-[var(--border-main)]">
              <div
                className={`flex-shrink-0 h-10 w-10 rounded-full bg-gradient-to-br ${avatarColor(
                  user?.id || 'me'
                )} flex items-center justify-center text-sm font-semibold text-white`}
              >
                {getInitials(user?.fullName || 'You')}
              </div>
              <div className="flex-1 flex gap-2 items-start">
                <div className="flex-1">
                  <MentionInput
                    ref={commentInputRef}
                    value={commentText}
                    onChange={setCommentText}
                    onSubmit={handleAddComment}
                    placeholder="Join the discussion... Use @ to tag people"
                  />
                </div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleAddComment}
                  disabled={!commentText.trim() || createComment.isPending}
                  className="mt-0.5 p-2.5 rounded-xl bg-[var(--primary-600)] hover:bg-[var(--primary-700)] text-white font-medium text-sm transition-colors duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Send className="h-4 w-4" />
                </motion.button>
              </div>
            </div>

            {/* Comments List */}
            {comments.length === 0 ? (
              <div className="text-center py-12">
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-[var(--bg-secondary)] mx-auto mb-4">
                  <MessageCircle className="h-6 w-6 text-[var(--text-muted)]" />
                </div>
                <p className="text-sm font-medium text-[var(--text-primary)] mb-1">
                  No comments yet
                </p>
                <p className={typography.caption}>
                  Be the first to share your thoughts. Use @ to tag team members.
                </p>
              </div>
            ) : (
              <motion.div
                initial="hidden"
                animate="visible"
                variants={{
                  hidden: { opacity: 0 },
                  visible: {
                    opacity: 1,
                    transition: { staggerChildren: 0.08, delayChildren: 0 },
                  },
                }}
                className="space-y-6"
              >
                {comments.map((comment) => (
                  <Fragment key={comment.id}>
                    <CommentThread
                      comment={comment}
                      userId={user?.id}
                      onDelete={handleDeleteComment}
                      onReply={handleReply}
                      replyingTo={replyingTo}
                      replyText={replyText}
                      onReplyTextChange={setReplyText}
                      onSubmitReply={handleSubmitReply}
                    />
                    {/* Divider between top-level comments */}
                    <div className="border-b border-[var(--border-subtle)] last:border-b-0" />
                  </Fragment>
                ))}
              </motion.div>
            )}
          </div>
        </motion.div>
      </motion.div>

      {/* ═══ Viewers Modal ═══ */}
      <Modal
        opened={showViewers}
        onClose={() => setShowViewers(false)}
        title="Who viewed this page"
        size="md"
        styles={{ title: { fontSize: '1.125rem', fontWeight: 600 } }}
      >
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {!viewers || viewers.length === 0 ? (
            <p className={`${typography.caption} text-center py-8`}>
              No view records yet.
            </p>
          ) : (
            <motion.div
              initial="hidden"
              animate="visible"
              variants={{
                hidden: { opacity: 0 },
                visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
              }}
              className="space-y-2"
            >
              {(viewers as Viewer[]).map((v) => (
                <motion.div
                  key={v.id}
                  variants={{
                    hidden: { opacity: 0, x: -8 },
                    visible: { opacity: 1, x: 0, transition: { duration: 0.2 } },
                  }}
                  className="flex items-center justify-between py-3 px-2 rounded-lg hover:bg-[var(--bg-secondary)] transition-colors duration-200"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`flex-shrink-0 h-8 w-8 rounded-full bg-gradient-to-br ${avatarColor(
                        v.id
                      )} flex items-center justify-center text-xs font-semibold text-white`}
                    >
                      {getInitials(v.viewerName || 'U')}
                    </div>
                    <span className={typography.body}>{v.viewerName || 'Unknown'}</span>
                  </div>
                  <span className={typography.caption}>
                    {new Date(v.viewedAt).toLocaleString()}
                  </span>
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      </Modal>

      {/* ═══ Version History Modal ═══ */}
      <Modal
        opened={showHistory}
        onClose={() => setShowHistory(false)}
        title="Version History"
        size="lg"
        styles={{ title: { fontSize: '1.125rem', fontWeight: 600 } }}
      >
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {!revisions || revisions.length === 0 ? (
            <p className={`${typography.caption} text-center py-8`}>
              No version history available.
            </p>
          ) : (
            <motion.div
              initial="hidden"
              animate="visible"
              variants={{
                hidden: { opacity: 0 },
                visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
              }}
              className="space-y-4"
            >
              {(revisions as Revision[]).map((rev) => (
                <motion.div
                  key={rev.id}
                  variants={{
                    hidden: { opacity: 0, y: 8 },
                    visible: { opacity: 1, y: 0, transition: { duration: 0.2 } },
                  }}
                  className="flex items-start justify-between p-4 rounded-lg border border-[var(--border-main)] hover:bg-[var(--bg-secondary)] transition-colors duration-200"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-semibold text-[var(--text-primary)]">
                        v{rev.version}
                      </span>
                      {rev.version === page.version && (
                        <Badge size="sm" color="var(--status-success)">
                          Current
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs text-[var(--text-muted)]">
                        {rev.authorName || 'Unknown'}
                      </span>
                      <span className="text-xs text-[var(--text-muted)]">
                        {new Date(rev.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p
                      className={`${typography.caption} text-[var(--text-secondary)]`}
                    >
                      {rev.changeDescription || 'No description'}
                    </p>
                  </div>
                  {rev.version !== page.version && (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleRestoreRevision(rev.id)}
                      disabled={restoreRevision.isPending}
                      className="ml-4 px-3 py-1.5 text-xs font-medium rounded-lg bg-[var(--primary-600)] hover:bg-[var(--primary-700)] text-white transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 flex-shrink-0"
                    >
                      <RefreshCw className="h-3 w-3" />
                      Restore
                    </motion.button>
                  )}
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      </Modal>
    </AppLayout>
  );
}
