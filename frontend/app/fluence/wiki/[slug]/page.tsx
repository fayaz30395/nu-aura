'use client';

import { useState, useCallback, useEffect, useRef, Fragment } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { usePermissions, Permissions } from '@/lib/hooks/usePermissions';
import { notFound } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
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
  Check,
  ThumbsUp,
  Reply,
  CornerDownRight,
  ChevronDown,
  ChevronUp,
  BookOpen,
  Download,
  FileText,
  FileType,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { Skeleton, Modal, Tooltip, ActionIcon, Badge } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { AppLayout } from '@/components/layout';
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
import { fluenceService } from '@/lib/services/platform/fluence.service';
import { MentionInput, type MentionInputHandle } from '@/components/fluence/MentionInput';
import { layout, typography, card, motion as dsMotion, iconSize } from '@/lib/design-system';
import { TableOfContents } from '@/components/fluence/TableOfContents';
import { Breadcrumbs } from '@/components/fluence/Breadcrumbs';
import { WatchButton } from '@/components/fluence/WatchButton';
import type { FluenceComment } from '@/lib/types/platform/fluence';

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
  'from-accent-500 to-accent-600',
  'from-success-500 to-success-600',
  'from-warning-500 to-warning-600',
  'from-danger-500 to-danger-600',
  'from-accent-700 to-accent-800',
  'from-accent-500 to-accent-600',
  'from-warning-500 to-warning-600',
  'from-success-500 to-success-600',
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
        className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-[var(--accent-700)]/10 text-[var(--accent-700)] dark:text-[var(--accent-400)] text-xs font-medium cursor-pointer hover:bg-[var(--accent-700)]/20 transition-colors"
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
            <span className="text-caption">{timeAgo(comment.createdAt)}</span>
          </div>

          {/* Body with @mentions */}
          <div className="text-body-secondary leading-relaxed mb-2">
            {renderBodyWithMentions(comment.body)}
          </div>

          {/* Action bar */}
          <div className="flex items-center gap-4">
            <button
              onClick={handleLike}
              aria-label={liked ? 'Unlike comment' : 'Like comment'}
              className={`flex items-center gap-1.5 text-xs font-medium transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-700)] ${
                liked
                  ? 'text-[var(--accent-700)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              <ThumbsUp className={`h-3.5 w-3.5 ${liked ? 'fill-current' : ''}`} />
              {likeCount > 0 && <span>{likeCount}</span>}
            </button>

            <button
              onClick={() => onReply(comment.id)}
              className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-700)]"
            >
              <Reply className="h-3.5 w-3.5" />
              Reply
            </button>

            {comment.authorId === userId && (
              <button
                onClick={() => onDelete(comment.id)}
                aria-label="Delete comment"
                className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--status-danger-text)] transition-colors duration-150 opacity-0 group-hover:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-700)]"
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
                className="flex items-center gap-1.5 text-xs font-medium text-[var(--accent-700)] hover:text-[var(--accent-800)] transition-colors mb-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-700)]"
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
                  aria-label="Send reply"
                  className="mt-0.5 p-2.5 rounded-xl bg-[var(--accent-700)] hover:bg-[var(--accent-800)] text-white transition-colors duration-200 disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-700)]"
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
          <span className="text-caption">{timeAgo(reply.createdAt)}</span>
        </div>
        <div className="text-body-secondary leading-relaxed mb-1.5">
          {renderBodyWithMentions(reply.body)}
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              setLiked(!liked);
              setLikeCount((p) => (liked ? p - 1 : p + 1));
            }}
            aria-label={liked ? 'Unlike reply' : 'Like reply'}
            className={`flex items-center gap-1.5 text-xs font-medium transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-700)] ${
              liked
                ? 'text-[var(--accent-700)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            <ThumbsUp className={`h-3 w-3 ${liked ? 'fill-current' : ''}`} />
            {likeCount > 0 && <span>{likeCount}</span>}
          </button>
          {reply.authorId === userId && (
            <button
              onClick={() => onDelete(reply.id)}
              aria-label="Delete reply"
              className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--status-danger-text)] transition-colors duration-150 opacity-0 group-hover/reply:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-700)]"
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
  const { hasAnyPermission, isReady } = usePermissions();

  const hasAccess = hasAnyPermission(
    Permissions.WIKI_VIEW,
    Permissions.KNOWLEDGE_WIKI_READ,
    Permissions.KNOWLEDGE_VIEW,
  );

  useEffect(() => {
    if (isReady && !hasAccess) {
      router.replace('/me/dashboard');
    }
  }, [isReady, hasAccess, router]);

  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [showViewers, setShowViewers] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const commentInputRef = useRef<MentionInputHandle>(null);
  const contentContainerRef = useRef<HTMLDivElement>(null);

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

  const handleExport = useCallback(
    async (format: 'pdf' | 'docx') => {
      if (!page) return;
      setExporting(true);
      setExportMenuOpen(false);
      try {
        const blob = await fluenceService.exportPage(page.id, format);
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${page.title}.${format}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        notifications.show({
          title: 'Export complete',
          message: `Downloaded as ${format.toUpperCase()}`,
          color: 'green',
        });
      } catch {
        notifications.show({
          title: 'Export failed',
          message: 'Unable to export the page. Please try again.',
          color: 'red',
        });
      } finally {
        setExporting(false);
      }
    },
    [page]
  );

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

  if (!isReady || !hasAccess) return null;

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
    notFound();
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
            aria-label="Go back"
            className="mb-6 inline-flex items-center gap-2 text-[var(--accent-700)] hover:text-[var(--accent-800)] transition-colors duration-200 group focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-700)]"
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
                <h1 className="text-2xl font-bold text-[var(--text-primary)] skeuo-emboss mb-4 leading-tight">
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
                      aria-label="Show viewers"
                      className="flex items-center gap-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors duration-200 cursor-pointer group focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-700)]"
                    >
                      <Eye
                        className={`${iconSize.cardInline} flex-shrink-0 group-hover:scale-110 transition-transform`}
                      />
                      <span className="text-sm font-medium">{page.viewCount || 0} views</span>
                    </button>
                  </Tooltip>

                  {page.spaceName && (
                    <Badge variant="light" size="lg" color="var(--accent-700)">
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
                    aria-label={isLiked ? 'Unlike' : 'Like'}
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 border focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-700)] ${
                      isLiked
                        ? 'bg-danger-50 dark:bg-danger-950/30 border-danger-200 dark:border-danger-800 text-danger-600 dark:text-danger-400'
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
                    aria-label={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 border focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-700)] ${
                      isFavorited
                        ? 'bg-warning-50 dark:bg-warning-950/30 border-warning-200 dark:border-warning-800 text-warning-600 dark:text-warning-400'
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
                    aria-label="Jump to comments"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium bg-[var(--bg-secondary)] border border-[var(--border-main)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-700)]"
                  >
                    <MessageCircle className="h-4 w-4" />
                    <span>{totalCommentCount}</span>
                  </button>

                  {/* Share */}
                  <motion.button
                    whileTap={{ scale: 0.92 }}
                    onClick={handleCopyLink}
                    aria-label="Share link"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium bg-[var(--bg-secondary)] border border-[var(--border-main)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-700)]"
                  >
                    {linkCopied ? (
                      <Check className="h-4 w-4 text-[var(--status-success-text)]" />
                    ) : (
                      <Share2 className="h-4 w-4" />
                    )}
                    <span>{linkCopied ? 'Copied' : 'Share'}</span>
                  </motion.button>

                  {/* Watch / Subscribe */}
                  <WatchButton pageId={page.id} size="sm" />
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

                {/* Export dropdown */}
                <div className="relative">
                  <Tooltip label="Export page" withArrow>
                    <ActionIcon
                      size="lg"
                      variant="subtle"
                      onClick={() => setExportMenuOpen((prev) => !prev)}
                      loading={exporting}
                      className="hover:bg-[var(--bg-secondary)] transition-colors"
                    >
                      <Download className={iconSize.cardInline} />
                    </ActionIcon>
                  </Tooltip>

                  <AnimatePresence>
                    {exportMenuOpen && (
                      <>
                        {/* Backdrop to close menu */}
                        <div
                          className="fixed inset-0 z-40"
                          onClick={() => setExportMenuOpen(false)}
                        />
                        <motion.div
                          initial={{ opacity: 0, y: -4, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -4, scale: 0.95 }}
                          transition={{ duration: 0.15 }}
                          className="absolute right-0 top-full mt-1 z-50 w-44 rounded-lg border border-[var(--border-main)] bg-[var(--bg-card)] shadow-[var(--shadow-dropdown)] overflow-hidden"
                        >
                          <button
                            onClick={() => handleExport('pdf')}
                            className="flex items-center gap-2 w-full px-4 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors cursor-pointer"
                          >
                            <FileText className={iconSize.button} />
                            Export as PDF
                          </button>
                          <button
                            onClick={() => handleExport('docx')}
                            className="flex items-center gap-2 w-full px-4 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors cursor-pointer"
                          >
                            <FileType className={iconSize.button} />
                            Export as DOCX
                          </button>
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Breadcrumbs */}
        <Breadcrumbs
          items={[
            { label: 'Wiki', href: '/fluence/wiki' },
            {
              label: page.spaceName || 'Untitled Space',
              href: `/fluence/wiki?space=${page.spaceId}`,
            },
            {
              label: page.title,
              icon: <BookOpen className={iconSize.meta} />,
            },
          ]}
          className="mb-4"
        />

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Table of Contents (hidden on mobile/tablet) */}
          <div className="hidden lg:block lg:col-span-1 order-last">
            <TableOfContents contentRef={contentContainerRef} />
          </div>

          {/* Main Content Area */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut', delay: 0.15 }}
            className="lg:col-span-2"
          >
            <div ref={contentContainerRef} className={`${card.base} ${card.paddingLarge}`}>
              <ContentViewer content={page.content} />
            </div>
          </motion.div>

          {/* Sidebar */}
          <motion.div
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut', delay: 0.15 }}
            className="lg:col-span-1"
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
                  <div className="row-between pb-4 border-b border-[var(--border-main)]">
                    <span className={typography.bodySecondary}>Views</span>
                    <span className="text-lg font-semibold text-[var(--text-primary)]">
                      {page.viewCount || 0}
                    </span>
                  </div>
                  <div className="row-between pb-4 border-b border-[var(--border-main)]">
                    <div className="flex items-center gap-2">
                      <Heart
                        className={`h-4 w-4 ${
                          isLiked ? 'fill-danger-500 text-danger-500' : 'text-[var(--text-muted)]'
                        }`}
                      />
                      <span className={typography.bodySecondary}>Likes</span>
                    </div>
                    <span className="text-lg font-semibold text-[var(--text-primary)]">
                      {page.likeCount || 0}
                    </span>
                  </div>
                  <div className="row-between pb-4 border-b border-[var(--border-main)]">
                    <div className="flex items-center gap-2">
                      <MessageCircle className="h-4 w-4 text-[var(--text-muted)]" />
                      <span className={typography.bodySecondary}>Comments</span>
                    </div>
                    <span className="text-lg font-semibold text-[var(--text-primary)]">
                      {totalCommentCount}
                    </span>
                  </div>
                  <div className="row-between">
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
                    className="w-full flex items-center gap-4 px-4 py-2.5 rounded-lg bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors duration-200 text-sm font-medium text-[var(--text-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-700)]"
                  >
                    <History className={`${iconSize.cardInline} flex-shrink-0`} />
                    <span>Version History</span>
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full flex items-center gap-4 px-4 py-2.5 rounded-lg bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors duration-200 text-sm font-medium text-[var(--text-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-700)]"
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
                      <div className="flex items-center gap-2 text-caption pl-7 pt-2 border-t border-[var(--border-main)]">
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
            <div className="row-between mb-6">
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
                  aria-label="Send comment"
                  className="mt-0.5 p-2.5 rounded-xl bg-[var(--accent-700)] hover:bg-[var(--accent-800)] text-white font-medium text-sm transition-colors duration-200 disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-700)]"
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
                    <div className="divider-b last:border-b-0" />
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
                  className="row-between py-4 px-2 rounded-lg hover:bg-[var(--bg-secondary)] transition-colors duration-200"
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
                      <span className="text-caption">
                        {rev.authorName || 'Unknown'}
                      </span>
                      <span className="text-caption">
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
                      className="ml-4 px-4 py-1.5 text-xs font-medium rounded-lg bg-[var(--accent-700)] hover:bg-[var(--accent-800)] text-white transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 flex-shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-700)]"
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
