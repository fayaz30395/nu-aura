'use client';

import { useState, useCallback, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
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
  User,
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
import { layout, typography, card, motion as dsMotion, iconSize, status } from '@/lib/design-system';

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

interface Comment {
  id: string;
  authorId?: string;
  authorName?: string;
  body: string;
  createdAt: string;
}

interface WikiPage {
  id: string;
  title: string;
  content: string;
  authorId?: string;
  authorName?: string;
  updatedAt: string;
  viewCount?: number;
  likeCount?: number;
  commentCount?: number;
  version: number;
  spaceName?: string;
  visibility?: string;
  departmentName?: string;
  editorIds?: string[];
  canEdit?: boolean;
  isLikedByCurrentUser?: boolean;
  isFavoritedByCurrentUser?: boolean;
}

export default function WikiPageDetailPage() {
  const router = useRouter();
  const params = useParams();
  const pageId = params.slug as string;
  const { user } = useAuth();
  const [commentText, setCommentText] = useState('');
  const [showViewers, setShowViewers] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

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

  const comments = (commentsData?.content || []) as Comment[];
  const isLiked = page?.isLikedByCurrentUser ?? false;
  const isFavorited = page?.isFavoritedByCurrentUser ?? false;

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

  const canEdit = page?.canEdit || page?.authorId === user?.id || page?.editorIds?.includes(user?.id || '');

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <RefreshCw className={`${iconSize.pageHeader} text-[var(--text-muted)] animate-spin`} />
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
          <BookOpen className={`${iconSize.pageHeader} mx-auto mb-4 text-[var(--text-muted)]`} />
          <h3 className={`${typography.sectionTitle} mb-1`}>Page not found</h3>
          <p className={`${typography.caption} mb-6`}>The page you&apos;re looking for doesn&apos;t exist</p>
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

  const visibilityIcon =
    page.visibility === 'PUBLIC' || page.visibility === 'ORGANIZATION'
      ? Globe
      : page.visibility === 'DEPARTMENT'
        ? Building2
        : Lock;

  return (
    <AppLayout>
      <motion.div {...dsMotion.pageEnter} className={layout.sectionGap}>
        {/* Back Button & Header */}
        <motion.div
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
        >
          <button
            onClick={() => router.back()}
            className="mb-6 inline-flex items-center gap-2 text-[var(--primary-600)] hover:text-[var(--primary-700)] transition-colors duration-200 group"
          >
            <ArrowLeft className={`${iconSize.button} group-hover:-translate-x-1 transition-transform`} />
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
                <h1 className="text-4xl font-bold text-[var(--text-primary)] mb-4 leading-tight">{page.title}</h1>
                <div className="flex flex-wrap items-center gap-6 mb-6">
                  {/* Author */}
                  <div className="flex items-center gap-4">
                    <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gradient-to-br from-[var(--primary-400)] to-[var(--primary-600)] flex items-center justify-center text-sm font-semibold text-white">
                      {(page.authorName || 'A').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className={typography.bodySecondary}>{page.authorName || 'Unknown Author'}</p>
                      <p className={typography.caption}>Author</p>
                    </div>
                  </div>

                  {/* Updated Date */}
                  <div className="flex items-center gap-2 text-[var(--text-muted)]">
                    <Calendar className={`${iconSize.cardInline} flex-shrink-0`} />
                    <span className="text-sm">{new Date(page.updatedAt).toLocaleDateString()}</span>
                  </div>

                  {/* View Count - Clickable */}
                  <Tooltip label="Click to see who viewed this page" withArrow>
                    <button
                      onClick={() => setShowViewers(true)}
                      className="flex items-center gap-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors duration-200 cursor-pointer group"
                    >
                      <Eye className={`${iconSize.cardInline} flex-shrink-0 group-hover:scale-110 transition-transform`} />
                      <span className="text-sm font-medium">{page.viewCount || 0} views</span>
                    </button>
                  </Tooltip>

                  {/* Space Badge */}
                  {page.spaceName && (
                    <Badge variant="light" size="lg" color="var(--primary-600)">
                      {page.spaceName}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Action Buttons - Horizontal */}
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
                <Tooltip label={linkCopied ? 'Copied!' : 'Copy link'} withArrow>
                  <ActionIcon
                    size="lg"
                    variant="subtle"
                    onClick={handleCopyLink}
                    className="hover:bg-[var(--bg-secondary)] transition-colors"
                  >
                    {linkCopied ? (
                      <Check className={iconSize.cardInline} style={{ color: 'var(--status-success-text)' }} />
                    ) : (
                      <Copy className={iconSize.cardInline} />
                    )}
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
            className={`${layout.sectionGap}`}
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
                    <span className="text-lg font-semibold text-[var(--text-primary)]">{page.viewCount || 0}</span>
                  </div>
                  <div className="flex items-center justify-between pb-4 border-b border-[var(--border-main)]">
                    <span className={typography.bodySecondary}>Likes</span>
                    <span className="text-lg font-semibold text-[var(--text-primary)]">{page.likeCount || 0}</span>
                  </div>
                  <div className="flex items-center justify-between pb-4 border-b border-[var(--border-main)]">
                    <span className={typography.bodySecondary}>Comments</span>
                    <span className="text-lg font-semibold text-[var(--text-primary)]">
                      {page.commentCount || comments.length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={typography.bodySecondary}>Version</span>
                    <span className="text-lg font-semibold text-[var(--text-primary)]">v{page.version}</span>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Actions Card */}
            <motion.div
              variants={{
                hidden: { opacity: 0, y: 8 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.25, delay: 0.06 } },
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
                    onClick={handleToggleLike}
                    disabled={likeMutation.isPending || unlikeMutation.isPending}
                    className="w-full flex items-center gap-4 px-4 py-2.5 rounded-lg bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium text-[var(--text-primary)]"
                  >
                    <Heart
                      className={`${iconSize.cardInline} flex-shrink-0 ${isLiked ? 'fill-[var(--status-danger-text)] text-[var(--status-danger-text)]' : ''}`}
                    />
                    <span>
                      {isLiked ? 'Unlike' : 'Like'} ({page.likeCount || 0})
                    </span>
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleToggleFavorite}
                    disabled={addFavorite.isPending || removeFavorite.isPending}
                    className="w-full flex items-center gap-4 px-4 py-2.5 rounded-lg bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium text-[var(--text-primary)]"
                  >
                    <Star
                      className={`${iconSize.cardInline} flex-shrink-0 ${isFavorited ? 'fill-[var(--status-warning-text)] text-[var(--status-warning-text)]' : ''}`}
                    />
                    <span>{isFavorited ? 'Remove from Favorites' : 'Add to Favorites'}</span>
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      const el = document.getElementById('comment-input');
                      el?.focus();
                    }}
                    className="w-full flex items-center gap-4 px-4 py-2.5 rounded-lg bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors duration-200 text-sm font-medium text-[var(--text-primary)]"
                  >
                    <MessageCircle className={`${iconSize.cardInline} flex-shrink-0`} />
                    <span>Comment</span>
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleCopyLink}
                    className="w-full flex items-center gap-4 px-4 py-2.5 rounded-lg bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors duration-200 text-sm font-medium text-[var(--text-primary)]"
                  >
                    <Share2 className={`${iconSize.cardInline} flex-shrink-0`} />
                    <span>Share Link</span>
                  </motion.button>

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
                  visible: { opacity: 1, y: 0, transition: { duration: 0.25, delay: 0.12 } },
                }}
                initial="hidden"
                animate="visible"
                className={card.base}
              >
                <div className={card.paddingLarge}>
                  <h3 className={`${typography.cardTitle} mb-4`}>Visibility</h3>
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      {visibilityIcon === Globe && (
                        <Globe className={`${iconSize.cardInline} text-[var(--status-success-text)] flex-shrink-0`} />
                      )}
                      {visibilityIcon === Building2 && (
                        <Building2 className={`${iconSize.cardInline} text-[var(--status-info-text)] flex-shrink-0`} />
                      )}
                      {visibilityIcon === Lock && (
                        <Lock className={`${iconSize.cardInline} text-[var(--status-warning-text)] flex-shrink-0`} />
                      )}
                      <span className={`${typography.bodySecondary} capitalize`}>
                        {page.visibility.toLowerCase()}
                      </span>
                    </div>
                    {page.departmentName && (
                      <p className={`${typography.caption} pl-7`}>Department: {page.departmentName}</p>
                    )}
                    {page.editorIds && page.editorIds.length > 0 && (
                      <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] pl-7 pt-2 border-t border-[var(--border-main)]">
                        <Users className={`${iconSize.meta} flex-shrink-0`} />
                        <span>
                          {page.editorIds.length} editor{page.editorIds.length !== 1 ? 's' : ''} with edit access
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </motion.div>
        </div>

        {/* Comments Section */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut', delay: 0.2 }}
          className={card.base}
        >
          <div className={card.paddingLarge}>
            <div className="flex items-center gap-2 mb-6">
              <MessageCircle className={iconSize.cardInline} />
              <h2 className={typography.cardTitle}>
                Comments <span className="text-[var(--text-muted)] font-normal">({comments.length})</span>
              </h2>
            </div>

            {/* Comment Input */}
            <div className="flex gap-4 mb-6 pb-6 border-b border-[var(--border-main)]">
              <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gradient-to-br from-[var(--primary-400)] to-[var(--primary-600)] flex items-center justify-center text-sm font-semibold text-white">
                {(user?.fullName || 'U').charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 flex gap-2">
                <input
                  id="comment-input"
                  type="text"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Write a comment..."
                  className="flex-1 px-4 py-2.5 rounded-lg border border-[var(--border-main)] bg-[var(--bg-secondary)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-600)] focus:ring-offset-2 focus:ring-offset-[var(--bg-primary)] text-sm transition-all duration-200"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleAddComment();
                    }
                  }}
                />
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleAddComment}
                  disabled={!commentText.trim() || createComment.isPending}
                  className="px-4 py-2.5 rounded-lg bg-[var(--primary-600)] hover:bg-[var(--primary-700)] text-white font-medium text-sm transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Send className={iconSize.button} />
                </motion.button>
              </div>
            </div>

            {/* Comments List */}
            {comments.length === 0 ? (
              <p className={`${typography.caption} text-center py-8`}>No comments yet. Be the first to comment!</p>
            ) : (
              <motion.div
                initial="hidden"
                animate="visible"
                variants={{
                  hidden: { opacity: 0 },
                  visible: {
                    opacity: 1,
                    transition: { staggerChildren: 0.06, delayChildren: 0 },
                  },
                }}
                className="space-y-4"
              >
                {comments.map((comment) => (
                  <motion.div
                    key={comment.id}
                    variants={{
                      hidden: { opacity: 0, y: 8 },
                      visible: { opacity: 1, y: 0, transition: { duration: 0.25 } },
                    }}
                    className="flex gap-4 pb-4 border-b border-[var(--border-main)] last:border-b-0"
                  >
                    <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gradient-to-br from-[var(--primary-400)] to-[var(--primary-600)] flex items-center justify-center text-sm font-semibold text-white">
                      {(comment.authorName || 'A').charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-medium text-sm text-[var(--text-primary)]">
                          {comment.authorName || 'Anonymous'}
                        </p>
                        {comment.authorId === user?.id && (
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => handleDeleteComment(comment.id)}
                            className="text-[var(--text-muted)] hover:text-[var(--status-danger-text)] transition-colors duration-200"
                            title="Delete comment"
                          >
                            <Trash2 className={iconSize.cardInline} />
                          </motion.button>
                        )}
                      </div>
                      <p className={`${typography.body} mt-1`}>{comment.body}</p>
                      <p className={`${typography.caption} mt-2`}>{new Date(comment.createdAt).toLocaleDateString()}</p>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </div>
        </motion.div>
      </motion.div>

      {/* Viewers Modal */}
      <Modal
        opened={showViewers}
        onClose={() => setShowViewers(false)}
        title="Who viewed this page"
        size="md"
        styles={{
          title: { fontSize: '1.125rem', fontWeight: 600 },
        }}
      >
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {!viewers || viewers.length === 0 ? (
            <p className={`${typography.caption} text-center py-8`}>No view records yet.</p>
          ) : (
            <motion.div
              initial="hidden"
              animate="visible"
              variants={{
                hidden: { opacity: 0 },
                visible: {
                  opacity: 1,
                  transition: { staggerChildren: 0.05 },
                },
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
                    <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gradient-to-br from-[var(--primary-400)] to-[var(--primary-600)] flex items-center justify-center text-xs font-semibold text-white">
                      {(v.viewerName || 'U').charAt(0).toUpperCase()}
                    </div>
                    <span className={typography.body}>{v.viewerName || 'Unknown'}</span>
                  </div>
                  <span className={typography.caption}>{new Date(v.viewedAt).toLocaleString()}</span>
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      </Modal>

      {/* Version History Modal */}
      <Modal
        opened={showHistory}
        onClose={() => setShowHistory(false)}
        title="Version History"
        size="lg"
        styles={{
          title: { fontSize: '1.125rem', fontWeight: 600 },
        }}
      >
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {!revisions || revisions.length === 0 ? (
            <p className={`${typography.caption} text-center py-8`}>No version history available.</p>
          ) : (
            <motion.div
              initial="hidden"
              animate="visible"
              variants={{
                hidden: { opacity: 0 },
                visible: {
                  opacity: 1,
                  transition: { staggerChildren: 0.05 },
                },
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
                      <span className="text-sm font-semibold text-[var(--text-primary)]">v{rev.version}</span>
                      {rev.version === page.version && (
                        <Badge size="sm" color="var(--status-success)">
                          Current
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs text-[var(--text-muted)]">{rev.authorName || 'Unknown'}</span>
                      <span className="text-xs text-[var(--text-muted)]">
                        {new Date(rev.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className={`${typography.caption} text-[var(--text-secondary)]`}>
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
