'use client';

import { useState, useCallback, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  BookOpen,
  ArrowLeft,
  Edit,
  Share,
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
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { Skeleton, Modal } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { AppLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
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

// Dynamically import Tiptap viewer to keep it out of the initial bundle
const ContentViewer = dynamic(
  () => import('@/components/fluence/ContentViewer'),
  { ssr: false, loading: () => <Skeleton height={300} radius="md" /> }
);

export default function WikiPageDetailPage() {
  const router = useRouter();
  const params = useParams();
  const pageId = params.slug as string;
  const { user } = useAuth();
  const [commentText, setCommentText] = useState('');
  const [showViewers, setShowViewers] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

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

  const comments = commentsData?.content || [];
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
      notifications.show({ title: 'Link copied!', message: '', color: 'blue' });
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
            notifications.show({ title: 'Revision restored', message: 'Page has been restored to the selected version.', color: 'green' });
          },
          onError: () => {
            notifications.show({ title: 'Error', message: 'Failed to restore revision', color: 'red' });
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
          <RefreshCw className="w-8 h-8 text-[var(--text-muted)] animate-spin" />
        </div>
      </AppLayout>
    );
  }

  if (!page) {
    return (
      <AppLayout>
        <div className="text-center py-16">
          <BookOpen className="w-12 h-12 mx-auto mb-4 text-[var(--text-muted)]" />
          <h3 className="text-lg font-medium text-[var(--text-secondary)] mb-1">
            Page not found
          </h3>
          <p className="text-[var(--text-muted)] mb-4">
            The page you&apos;re looking for doesn&apos;t exist
          </p>
          <Button
            onClick={() => router.back()}
            className="gap-2 bg-violet-600 hover:bg-violet-700"
          >
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <button
              onClick={() => router.back()}
              className="mb-4 flex items-center gap-2 text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-2">
              {page.title}
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-sm text-[var(--text-muted)]">
              <div className="flex items-center gap-1">
                <User className="w-4 h-4" />
                {page.authorName || 'Unknown Author'}
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {new Date(page.updatedAt).toLocaleDateString()}
              </div>
              <button
                className="flex items-center gap-1 hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                onClick={() => setShowViewers(true)}
              >
                <Eye className="w-4 h-4" />
                {page.viewCount || 0} views
              </button>
              {page.spaceName && (
                <span className="text-xs bg-[var(--bg-secondary)] px-2 py-1 rounded-full">
                  {page.spaceName}
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            {canEdit && (
              <Button
                variant="secondary"
                className="gap-2"
                onClick={() => router.push(`/fluence/wiki/${page.id}/edit`)}
              >
                <Edit className="w-4 h-4" />
                Edit
              </Button>
            )}
            <Button
              variant="secondary"
              className="gap-2"
              onClick={() => setShowHistory(true)}
            >
              <History className="w-4 h-4" />
            </Button>
            <Button variant="secondary" className="gap-2" onClick={handleCopyLink}>
              <Share className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="grid grid-cols-1 lg:grid-cols-3 gap-6"
        >
          {/* Main Content */}
          <Card className="lg:col-span-2">
            <CardContent className="pt-6">
              <ContentViewer content={page.content} />
            </CardContent>
          </Card>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Stats Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Page Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[var(--text-secondary)]">Views</span>
                  <span className="font-semibold">{page.viewCount || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[var(--text-secondary)]">Likes</span>
                  <span className="font-semibold">{page.likeCount || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[var(--text-secondary)]">Comments</span>
                  <span className="font-semibold">{page.commentCount || comments.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[var(--text-secondary)]">Version</span>
                  <span className="font-semibold">v{page.version}</span>
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  variant="secondary"
                  className="w-full gap-2 justify-start"
                  onClick={handleToggleLike}
                  disabled={likeMutation.isPending || unlikeMutation.isPending}
                >
                  <Heart
                    className={`w-4 h-4 ${isLiked ? 'fill-red-600 text-red-600' : ''}`}
                  />
                  {isLiked ? 'Unlike' : 'Like'} ({page.likeCount || 0})
                </Button>
                <Button
                  variant="secondary"
                  className="w-full gap-2 justify-start"
                  onClick={handleToggleFavorite}
                  disabled={addFavorite.isPending || removeFavorite.isPending}
                >
                  <Star
                    className={`w-4 h-4 ${isFavorited ? 'fill-amber-500 text-amber-500' : ''}`}
                  />
                  {isFavorited ? 'Remove Favorite' : 'Add to Favorites'}
                </Button>
                <Button
                  variant="secondary"
                  className="w-full gap-2 justify-start"
                  onClick={() => {
                    const el = document.getElementById('comment-input');
                    el?.focus();
                  }}
                >
                  <MessageCircle className="w-4 h-4" />
                  Comment
                </Button>
                <Button
                  variant="secondary"
                  className="w-full gap-2 justify-start"
                  onClick={handleCopyLink}
                >
                  <Share className="w-4 h-4" />
                  Share Link
                </Button>
                <Button
                  variant="secondary"
                  className="w-full gap-2 justify-start"
                  onClick={() => setShowHistory(true)}
                >
                  <History className="w-4 h-4" />
                  Version History
                </Button>
                <Button variant="secondary" className="w-full gap-2 justify-start">
                  <Archive className="w-4 h-4" />
                  Archive
                </Button>
              </CardContent>
            </Card>

            {/* Visibility Info */}
            {page.visibility && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Visibility</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    {page.visibility === 'PUBLIC' || page.visibility === 'ORGANIZATION' ? (
                      <Globe className="w-4 h-4 text-green-600" />
                    ) : page.visibility === 'DEPARTMENT' ? (
                      <Building2 className="w-4 h-4 text-blue-600" />
                    ) : (
                      <Lock className="w-4 h-4 text-amber-600" />
                    )}
                    <span className="text-[var(--text-secondary)] capitalize">
                      {page.visibility.toLowerCase()}
                    </span>
                  </div>
                  {page.departmentName && (
                    <p className="text-xs text-[var(--text-muted)]">
                      Department: {page.departmentName}
                    </p>
                  )}
                  {page.editorIds && page.editorIds.length > 0 && (
                    <div className="flex items-center gap-1 text-xs text-[var(--text-muted)] mt-2">
                      <Users className="w-4 h-4" />
                      {page.editorIds.length} editor{page.editorIds.length !== 1 ? 's' : ''} with edit access
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </motion.div>

        {/* Comments Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5" />
              Comments ({comments.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Comment Input */}
            <div className="flex gap-2">
              <input
                id="comment-input"
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Write a comment..."
                className="flex-1 px-4 py-2 rounded-lg border border-[var(--border-main)] bg-[var(--bg-secondary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleAddComment();
                  }
                }}
              />
              <Button
                onClick={handleAddComment}
                disabled={!commentText.trim() || createComment.isPending}
                className="gap-2 bg-violet-600 hover:bg-violet-700"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>

            {comments.length === 0 ? (
              <p className="text-center text-[var(--text-muted)] py-8">
                No comments yet. Be the first to comment!
              </p>
            ) : (
              <div className="space-y-4">
                {comments.map((comment) => (
                  <div key={comment.id} className="flex gap-4 pb-4 border-b border-[var(--border-main)] last:border-b-0">
                    <div className="w-8 h-8 rounded-full bg-violet-100 dark:bg-violet-900/30 flex-shrink-0 flex items-center justify-center text-xs font-semibold text-violet-700">
                      {(comment.authorName || 'A').charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-sm">{comment.authorName || 'Anonymous'}</p>
                        {(comment.authorId === user?.id) && (
                          <button
                            onClick={() => handleDeleteComment(comment.id)}
                            className="text-[var(--text-muted)] hover:text-red-500 transition-colors"
                            title="Delete comment"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      <p className="text-sm text-[var(--text-secondary)] mt-1">
                        {comment.body}
                      </p>
                      <p className="text-xs text-[var(--text-muted)] mt-2">
                        {new Date(comment.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Viewers Modal */}
      <Modal
        opened={showViewers}
        onClose={() => setShowViewers(false)}
        title="Who viewed this page"
        size="md"
      >
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {!viewers || viewers.length === 0 ? (
            <p className="text-center text-[var(--text-muted)] py-8">No view records yet.</p>
          ) : (
            viewers.map((v) => (
              <div key={v.id} className="flex items-center justify-between py-2 border-b border-[var(--border-main)] last:border-b-0">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center text-xs font-semibold text-violet-700">
                    {(v.viewerName || 'U').charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm font-medium">{v.viewerName || 'Unknown'}</span>
                </div>
                <span className="text-xs text-[var(--text-muted)]">
                  {new Date(v.viewedAt).toLocaleString()}
                </span>
              </div>
            ))
          )}
        </div>
      </Modal>

      {/* Version History Modal */}
      <Modal
        opened={showHistory}
        onClose={() => setShowHistory(false)}
        title="Version History"
        size="lg"
      >
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {!revisions || revisions.length === 0 ? (
            <p className="text-center text-[var(--text-muted)] py-8">No version history available.</p>
          ) : (
            revisions.map((rev) => (
              <div key={rev.id} className="flex items-center justify-between p-4 rounded-lg border border-[var(--border-main)] hover:bg-[var(--bg-secondary)] transition-colors">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">v{rev.version}</span>
                    <span className="text-xs bg-[var(--bg-secondary)] px-2 py-0.5 rounded-full text-[var(--text-muted)]">
                      {rev.authorName || 'Unknown'}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--text-muted)] mt-1">
                    {rev.changeDescription || 'No description'}
                  </p>
                  <p className="text-xs text-[var(--text-muted)]">
                    {new Date(rev.createdAt).toLocaleString()}
                  </p>
                </div>
                {rev.version !== page.version && (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="gap-1 text-xs"
                    onClick={() => handleRestoreRevision(rev.id)}
                    disabled={restoreRevision.isPending}
                  >
                    <RefreshCw className="w-4 h-4" />
                    Restore
                  </Button>
                )}
                {rev.version === page.version && (
                  <span className="badge-status status-success text-xs">Current</span>
                )}
              </div>
            ))
          )}
        </div>
      </Modal>
    </AppLayout>
  );
}
