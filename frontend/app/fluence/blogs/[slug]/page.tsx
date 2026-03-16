'use client';

import { useState, useCallback, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Pen,
  ArrowLeft,
  Edit,
  Share,
  Heart,
  MessageCircle,
  Eye,
  RefreshCw,
  Calendar,
  User,
  Tag,
  Send,
  Trash2,
  Building2,
  Globe,
  Lock,
  Star,
  Users,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { Skeleton, Modal } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { AppLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
  useBlogPost,
  useComments,
  useLikeBlogPost,
  useUnlikeBlogPost,
  useCreateComment,
  useDeleteComment,
  useRecordView,
  useContentViewers,
  useAddFavorite,
  useRemoveFavorite,
} from '@/lib/hooks/queries/useFluence';
import { useAuth } from '@/lib/hooks/useAuth';

// Dynamically import Tiptap viewer to keep it out of the initial bundle
const ContentViewer = dynamic(
  () => import('@/components/fluence/ContentViewer'),
  { ssr: false, loading: () => <Skeleton height={300} radius="md" /> }
);

export default function BlogPostDetailPage() {
  const router = useRouter();
  const params = useParams();
  const postId = params.slug as string;
  const { user } = useAuth();
  const [commentText, setCommentText] = useState('');
  const [showViewers, setShowViewers] = useState(false);

  const { data: post, isLoading } = useBlogPost(postId, !!postId);
  const { data: commentsData } = useComments(postId, 'BLOG', 0, 50, !!postId && !!post);
  const { data: viewers } = useContentViewers(postId, 'BLOG', showViewers && !!postId);

  const likeMutation = useLikeBlogPost();
  const unlikeMutation = useUnlikeBlogPost();
  const createComment = useCreateComment();
  const deleteComment = useDeleteComment();
  const recordView = useRecordView();
  const addFavorite = useAddFavorite();
  const removeFavorite = useRemoveFavorite();

  const isLiked = post?.isLikedByCurrentUser ?? false;
  const isFavorited = post?.isFavoritedByCurrentUser ?? false;

  // Record view on page load
  useEffect(() => {
    if (postId && post) {
      recordView.mutate({ contentId: postId, contentType: 'BLOG' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId, post?.id]);

  const handleToggleLike = useCallback(() => {
    if (!post) return;
    if (isLiked) {
      unlikeMutation.mutate(post.id);
    } else {
      likeMutation.mutate(post.id);
    }
  }, [post, isLiked, likeMutation, unlikeMutation]);

  const handleToggleFavorite = useCallback(() => {
    if (!post) return;
    if (isFavorited) {
      removeFavorite.mutate({ contentId: post.id, contentType: 'BLOG_POST' });
    } else {
      addFavorite.mutate({ contentId: post.id, contentType: 'BLOG_POST' });
    }
  }, [post, isFavorited, addFavorite, removeFavorite]);

  const handleAddComment = useCallback(() => {
    if (!post || !commentText.trim()) return;
    createComment.mutate(
      { contentId: post.id, contentType: 'BLOG', data: { body: commentText.trim() } },
      {
        onSuccess: () => {
          setCommentText('');
          notifications.show({ title: 'Comment added', message: '', color: 'green' });
        },
      }
    );
  }, [post, commentText, createComment]);

  const handleDeleteComment = useCallback(
    (commentId: string) => {
      if (!post) return;
      deleteComment.mutate(
        { contentId: post.id, contentType: 'BLOG', commentId },
        {
          onSuccess: () => {
            notifications.show({ title: 'Comment deleted', message: '', color: 'green' });
          },
        }
      );
    },
    [post, deleteComment]
  );

  const handleCopyLink = useCallback(() => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      notifications.show({ title: 'Link copied!', message: '', color: 'blue' });
    }
  }, []);

  const comments = commentsData?.content || [];
  const canEdit = post?.canEdit || post?.authorId === user?.id || post?.editorIds?.includes(user?.id || '');

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <RefreshCw className="w-8 h-8 text-[var(--text-muted)] animate-spin" />
        </div>
      </AppLayout>
    );
  }

  if (!post) {
    return (
      <AppLayout>
        <div className="text-center py-16">
          <Pen className="w-12 h-12 mx-auto mb-4 text-[var(--text-muted)]" />
          <h3 className="text-lg font-medium text-[var(--text-secondary)] mb-1">
            Post not found
          </h3>
          <p className="text-[var(--text-muted)] mb-4">
            The post you&apos;re looking for doesn&apos;t exist
          </p>
          <Button
            onClick={() => router.back()}
            className="gap-2 bg-amber-600 hover:bg-amber-700"
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
        <div className="flex items-start gap-4 justify-between">
          <button
            onClick={() => router.back()}
            className="text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <div className="flex gap-2">
            {canEdit && (
              <Button
                variant="secondary"
                className="gap-2"
                onClick={() => router.push(`/fluence/blogs/${post.id}/edit`)}
              >
                <Edit className="w-4 h-4" />
                Edit
              </Button>
            )}
            <Button variant="secondary" className="gap-2" onClick={handleCopyLink}>
              <Share className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Featured Image */}
        {post.coverImageUrl && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-lg overflow-hidden h-96 bg-gradient-to-br from-amber-300 to-orange-400"
          >
            <img
              src={post.coverImageUrl}
              alt={post.title}
              className="w-full h-full object-cover"
            />
          </motion.div>
        )}

        {/* Title and Meta */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-4xl font-bold text-[var(--text-primary)] mb-4">
            {post.title}
          </h1>

          <div className="flex flex-wrap items-center gap-4 text-sm text-[var(--text-secondary)]">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4" />
              {post.authorName || 'Unknown Author'}
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              {new Date(post.publishedAt || post.updatedAt).toLocaleDateString()}
            </div>
            <button
              className="flex items-center gap-2 hover:text-[var(--text-primary)] transition-colors cursor-pointer"
              onClick={() => setShowViewers(true)}
            >
              <Eye className="w-4 h-4" />
              {post.viewCount || 0} views
            </button>
            {post.categoryName && (
              <span className="text-xs bg-[var(--bg-secondary)] px-2 py-1 rounded-full">
                {post.categoryName}
              </span>
            )}
          </div>

          {/* Excerpt */}
          <p className="text-lg text-[var(--text-secondary)] mt-4 italic">
            {post.excerpt}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.25, ease: 'easeOut' }}
          className="grid grid-cols-1 lg:grid-cols-3 gap-6"
        >
          {/* Main Content */}
          <Card className="lg:col-span-2">
            <CardContent className="pt-6">
              <ContentViewer content={post.content} />
            </CardContent>
          </Card>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Stats Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Post Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[var(--text-secondary)]">Views</span>
                  <span className="font-semibold">{post.viewCount || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[var(--text-secondary)]">Likes</span>
                  <span className="font-semibold">{post.likeCount || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[var(--text-secondary)]">Comments</span>
                  <span className="font-semibold">{post.commentCount || comments.length}</span>
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
                  {isLiked ? 'Unlike' : 'Like'} ({post.likeCount || 0})
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
              </CardContent>
            </Card>

            {/* Access Control Info */}
            {post.visibility && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Visibility</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    {post.visibility === 'PUBLIC' || post.visibility === 'ORGANIZATION' ? (
                      <Globe className="w-4 h-4 text-green-600" />
                    ) : post.visibility === 'DEPARTMENT' ? (
                      <Building2 className="w-4 h-4 text-blue-600" />
                    ) : (
                      <Lock className="w-4 h-4 text-amber-600" />
                    )}
                    <span className="text-[var(--text-secondary)] capitalize">
                      {post.visibility.toLowerCase()}
                    </span>
                  </div>
                  {post.departmentName && (
                    <p className="text-xs text-[var(--text-muted)]">
                      Department: {post.departmentName}
                    </p>
                  )}
                  {post.editorIds && post.editorIds.length > 0 && (
                    <div className="flex items-center gap-1 text-xs text-[var(--text-muted)] mt-2">
                      <Users className="w-4 h-4" />
                      {post.editorIds.length} editor{post.editorIds.length !== 1 ? 's' : ''} with edit access
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Tags */}
            {post.tags && post.tags.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Tags</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {post.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 bg-[var(--bg-secondary)] text-[var(--text-secondary)] px-4 py-1 rounded-full text-sm"
                      >
                        <Tag className="w-4 h-4" />
                        {tag}
                      </span>
                    ))}
                  </div>
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
                className="flex-1 px-4 py-2 rounded-lg border border-[var(--border-main)] bg-[var(--bg-secondary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
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
                className="gap-2 bg-amber-600 hover:bg-amber-700"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>

            {comments.length === 0 ? (
              <p className="text-center text-[var(--text-muted)] py-8">
                No comments yet. Be the first to share your thoughts!
              </p>
            ) : (
              <div className="space-y-4">
                {comments.map((comment) => (
                  <div
                    key={comment.id}
                    className="flex gap-4 pb-4 border-b border-[var(--border-main)] last:border-b-0"
                  >
                    <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/30 flex-shrink-0 flex items-center justify-center text-xs font-semibold text-amber-700">
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
        title="Who viewed this post"
        size="md"
      >
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {!viewers || viewers.length === 0 ? (
            <p className="text-center text-[var(--text-muted)] py-8">No view records yet.</p>
          ) : (
            viewers.map((v) => (
              <div key={v.id} className="flex items-center justify-between py-2 border-b border-[var(--border-main)] last:border-b-0">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-xs font-semibold text-amber-700">
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
    </AppLayout>
  );
}
