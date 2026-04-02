'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { notFound } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Edit,
  Share,
  Heart,
  MessageCircle,
  Eye,
  RefreshCw,
  Calendar,
  Tag,
  Send,
  Trash2,
  Building2,
  Globe,
  Lock,
  Star,
  Users,
  Pen,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { Skeleton, Modal } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { AppLayout } from '@/components/layout';
import { PermissionGate } from '@/components/auth/PermissionGate';
import { Permissions } from '@/lib/hooks/usePermissions';

import { card, motion as dsMotion, iconSize } from '@/lib/design-system';
import { TableOfContents } from '@/components/fluence/TableOfContents';
import { Breadcrumbs } from '@/components/fluence/Breadcrumbs';
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
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

// Dynamically import Tiptap viewer to keep it out of the initial bundle
const ContentViewer = dynamic(
  () => import('@/components/fluence/ContentViewer'),
  { ssr: false, loading: () => <Skeleton height={300} radius="md" /> }
);

interface Comment {
  id: string;
  authorName?: string;
  authorId: string;
  body: string;
  createdAt: string;
}

interface Viewer {
  id: string;
  viewerName?: string;
  viewedAt: string;
}

export default function BlogPostDetailPage() {
  const router = useRouter();
  const params = useParams();
  const postId = params.slug as string;
  const { user } = useAuth();
  const [commentText, setCommentText] = useState('');
  const [showViewers, setShowViewers] = useState(false);
  const [deleteCommentId, setDeleteCommentId] = useState<string | null>(null);
  const [readingProgress, setReadingProgress] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);
  const contentContainerRef = useRef<HTMLDivElement>(null);

  const { data: post, isLoading } = useBlogPost(postId, !!postId);
  const { data: commentsData } = useComments(postId, 'BLOG', 0, 50, !!postId && !!post?.id);
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

  // Reading progress tracking
  useEffect(() => {
    const handleScroll = () => {
      if (!contentRef.current) return;
      const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
      const totalScrollHeight = scrollHeight - clientHeight;
      const progress = totalScrollHeight > 0 ? (scrollTop / totalScrollHeight) * 100 : 0;
      setReadingProgress(Math.min(progress, 100));
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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

  const comments: Comment[] = commentsData?.content || [];
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
    notFound();
  }

  const getInitial = (name?: string): string => {
    return (name || 'A').charAt(0).toUpperCase();
  };

  const getAvatarColor = (initial: string): string => {
    const colors = [
      'bg-accent-100 dark:bg-accent-900/30 text-accent-700',
      'bg-accent-300 dark:bg-accent-900/30 text-accent-900',
      'bg-accent-300 dark:bg-accent-900/30 text-accent-900',
      'bg-success-100 dark:bg-success-900/30 text-success-700',
      'bg-warning-100 dark:bg-warning-900/30 text-warning-700',
    ];
    const index = initial.charCodeAt(0) % colors.length;
    return colors[index];
  };

  return (
    <AppLayout>
      {/* Reading Progress Bar */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-[var(--accent-500)] to-[var(--accent-800)] origin-left z-50"
        style={{ scaleX: readingProgress / 100 }}
      />

      <div className="space-y-6">
        {/* Back Button */}
        <motion.button
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 text-[var(--accent-700)] dark:text-[var(--accent-400)] hover:text-[var(--accent-800)] dark:hover:text-[var(--accent-300)] transition-colors group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2 rounded"
          whileHover={{ x: -4 }}
          aria-label="Back"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back
        </motion.button>

        {/* Hero Cover Image */}
        {post.coverImageUrl && (
          <motion.div
            initial={dsMotion.pageEnter.initial}
            animate={dsMotion.pageEnter.animate}
            transition={dsMotion.pageEnter.transition}
            className="relative rounded-xl overflow-hidden h-96 bg-gradient-to-br from-[var(--accent-300)] to-[var(--accent-500)] group cursor-pointer"
          >
            <motion.img
              src={post.coverImageUrl}
              alt={post.title}
              className="w-full h-full object-cover"
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.3 }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
          </motion.div>
        )}

        {/* Article Header */}
        <motion.div
          initial={dsMotion.pageEnter.initial}
          animate={dsMotion.pageEnter.animate}
          transition={dsMotion.pageEnter.transition}
          className="space-y-4"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl md:text-5xl font-bold text-[var(--text-primary)] skeuo-emboss mb-4 leading-tight">
                {post.title}
              </h1>

              {/* Meta Information */}
              <div className="meta-row">
                {/* Author */}
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-semibold ${getAvatarColor(getInitial(post.authorName))}`}>
                    {getInitial(post.authorName)}
                  </div>
                  <span className="font-medium text-[var(--text-primary)]">
                    {post.authorName || 'Unknown Author'}
                  </span>
                </div>

                {/* Published Date */}
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 flex-shrink-0" />
                  <time dateTime={post.publishedAt || post.updatedAt}>
                    {new Date(post.publishedAt || post.updatedAt).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </time>
                </div>

                {/* Category Badge */}
                {post.categoryName && (
                  <motion.span
                    whileHover={{ scale: 1.05 }}
                    className="inline-flex items-center gap-1 bg-[var(--accent-100)] dark:bg-[var(--accent-950)]/30 text-[var(--accent-800)] dark:text-[var(--accent-300)] px-4 py-1 rounded-full text-xs font-medium"
                  >
                    {post.categoryName}
                  </motion.span>
                )}

                {/* Views */}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  onClick={() => setShowViewers(true)}
                  className="flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--accent-700)] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2 rounded"
                  aria-label={`${post.viewCount || 0} views`}
                >
                  <Eye className="w-4 h-4 flex-shrink-0" />
                  <span>{post.viewCount || 0} views</span>
                </motion.button>
              </div>

              {/* Excerpt */}
              {post.excerpt && (
                <p className="text-lg text-[var(--text-secondary)] mt-4 italic leading-relaxed">
                  {post.excerpt}
                </p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 flex-shrink-0">
              {canEdit && (
                <PermissionGate permission={Permissions.KNOWLEDGE_BLOG_UPDATE}>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => router.push(`/fluence/blogs/${post.id}/edit`)}
                    className="p-2 rounded-lg bg-[var(--bg-secondary)] hover:bg-[var(--accent-100)] dark:hover:bg-[var(--accent-950)]/30 text-[var(--accent-700)] dark:text-[var(--accent-300)] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
                    title="Edit post"
                    aria-label="Edit post"
                  >
                    <Edit className="w-5 h-5" />
                  </motion.button>
                </PermissionGate>
              )}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleCopyLink}
                className="p-2 rounded-lg bg-[var(--bg-secondary)] hover:bg-[var(--accent-100)] dark:hover:bg-[var(--accent-950)]/30 text-[var(--accent-700)] dark:text-[var(--accent-300)] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
                title="Copy link"
                aria-label="Copy link"
              >
                <Share className="w-5 h-5" />
              </motion.button>
            </div>
          </div>
        </motion.div>

        {/* Breadcrumbs */}
        <Breadcrumbs
          items={[
            { label: 'Blog', href: '/fluence/blogs' },
            {
              label: post.categoryName || 'Uncategorized',
              href: `/fluence/blogs?category=${post.categoryId}`,
            },
            {
              label: post.title,
              icon: <Pen className={iconSize.meta} />,
            },
          ]}
          className="mb-4"
        />

        {/* Main Content Grid */}
        <motion.div
          initial={dsMotion.pageEnter.initial}
          animate={dsMotion.pageEnter.animate}
          transition={{ ...dsMotion.pageEnter.transition, delay: 0.1 }}
          className="grid grid-cols-1 lg:grid-cols-4 gap-6"
          ref={contentRef}
        >
          {/* Table of Contents (hidden on mobile/tablet) */}
          <div className="hidden lg:block lg:col-span-1 order-last">
            <TableOfContents contentRef={contentContainerRef} />
          </div>

          {/* Main Content */}
          <motion.div
            variants={dsMotion.staggerItem}
            className="lg:col-span-2"
          >
            <motion.div
              ref={contentContainerRef}
              className={`${card.base} p-8 rounded-xl`}
              whileHover={dsMotion.cardHover}
            >
              <ContentViewer content={post.content} />
            </motion.div>
          </motion.div>

          {/* Sidebar */}
          <motion.div
            className="space-y-4 lg:col-span-1"
            initial="hidden"
            animate="visible"
            variants={{
              hidden: {},
              visible: { transition: { staggerChildren: 0.06 } },
            }}
          >
            {/* Action Bar */}
            <motion.div
              variants={dsMotion.staggerItem}
              className={`${card.base} rounded-xl p-4 space-y-2 sticky top-24`}
            >
              <div className="grid grid-cols-2 gap-2">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleToggleLike}
                  disabled={likeMutation.isPending || unlikeMutation.isPending}
                  className={`flex items-center justify-center gap-2 py-2 px-4 rounded-lg transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2 ${
                    isLiked
                      ? 'bg-danger-100 dark:bg-danger-900/30 text-danger-600 dark:text-danger-300'
                      : 'bg-[var(--bg-secondary)] hover:bg-danger-100 dark:hover:bg-danger-900/30 text-[var(--text-secondary)] hover:text-danger-600 dark:hover:text-danger-300'
                  }`}
                  title={isLiked ? 'Unlike' : 'Like'}
                  aria-label={isLiked ? 'Unlike' : 'Like'}
                >
                  <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
                  <span className="text-xs font-medium">{post.likeCount || 0}</span>
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleToggleFavorite}
                  disabled={addFavorite.isPending || removeFavorite.isPending}
                  className={`flex items-center justify-center gap-2 py-2 px-4 rounded-lg transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2 ${
                    isFavorited
                      ? 'bg-warning-100 dark:bg-warning-900/30 text-warning-600 dark:text-warning-300'
                      : 'bg-[var(--bg-secondary)] hover:bg-warning-100 dark:hover:bg-warning-900/30 text-[var(--text-secondary)] hover:text-warning-600 dark:hover:text-warning-300'
                  }`}
                  title={isFavorited ? 'Remove favorite' : 'Add to favorites'}
                  aria-label={isFavorited ? 'Remove favorite' : 'Add to favorites'}
                >
                  <Star className={`w-4 h-4 ${isFavorited ? 'fill-current' : ''}`} />
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    const el = document.getElementById('comment-input');
                    el?.focus();
                  }}
                  className="flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-[var(--bg-secondary)] hover:bg-[var(--accent-100)] dark:hover:bg-[var(--accent-950)]/30 text-[var(--text-secondary)] hover:text-[var(--accent-700)] dark:hover:text-[var(--accent-300)] transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
                  title="Comment"
                  aria-label="Comment"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span className="text-xs font-medium">{comments.length}</span>
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleCopyLink}
                  className="flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-[var(--bg-secondary)] hover:bg-[var(--accent-100)] dark:hover:bg-[var(--accent-950)]/30 text-[var(--text-secondary)] hover:text-[var(--accent-700)] dark:hover:text-[var(--accent-300)] transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
                  title="Share"
                  aria-label="Share"
                >
                  <Share className="w-4 h-4" />
                </motion.button>
              </div>
            </motion.div>

            {/* Stats Card */}
            <motion.div
              variants={dsMotion.staggerItem}
              className={`${card.base} rounded-xl p-4`}
              whileHover={dsMotion.cardHover}
            >
              <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Stats</h3>
              <div className="space-y-4">
                <div className="row-between">
                  <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                    <Eye className="w-4 h-4 flex-shrink-0" />
                    Views
                  </div>
                  <span className="font-semibold text-[var(--text-primary)]">{post.viewCount || 0}</span>
                </div>
                <div className="row-between">
                  <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                    <Heart className="w-4 h-4 flex-shrink-0" />
                    Likes
                  </div>
                  <span className="font-semibold text-[var(--text-primary)]">{post.likeCount || 0}</span>
                </div>
                <div className="row-between">
                  <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                    <MessageCircle className="w-4 h-4 flex-shrink-0" />
                    Comments
                  </div>
                  <span className="font-semibold text-[var(--text-primary)]">{post.commentCount || comments.length}</span>
                </div>
              </div>
            </motion.div>

            {/* Visibility Card */}
            {post.visibility && (
              <motion.div
                variants={dsMotion.staggerItem}
                className={`${card.base} rounded-xl p-4`}
                whileHover={dsMotion.cardHover}
              >
                <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Visibility</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    {post.visibility === 'PUBLIC' || post.visibility === 'ORGANIZATION' ? (
                      <Globe className="w-4 h-4 flex-shrink-0 text-success-600" />
                    ) : post.visibility === 'DEPARTMENT' ? (
                      <Building2 className="w-4 h-4 flex-shrink-0 text-accent-600" />
                    ) : (
                      <Lock className="w-4 h-4 flex-shrink-0 text-warning-600" />
                    )}
                    <span className="text-[var(--text-secondary)] capitalize font-medium">
                      {post.visibility.toLowerCase()}
                    </span>
                  </div>
                  {post.departmentName && (
                    <p className="text-caption ml-6">
                      {post.departmentName}
                    </p>
                  )}
                  {post.editorIds && post.editorIds.length > 0 && (
                    <div className="flex items-center gap-1 text-caption mt-2 ml-6">
                      <Users className="w-3 h-3" />
                      {post.editorIds.length} editor{post.editorIds.length !== 1 ? 's' : ''}
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* Tags Card */}
            {post.tags && post.tags.length > 0 && (
              <motion.div
                variants={dsMotion.staggerItem}
                className={`${card.base} rounded-xl p-4`}
                whileHover={dsMotion.cardHover}
              >
                <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {post.tags.map((tag, index) => (
                    <motion.span
                      key={tag}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.05 }}
                      className="inline-flex items-center gap-1 bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--accent-100)] dark:hover:bg-[var(--accent-950)]/30 hover:text-[var(--accent-700)] dark:hover:text-[var(--accent-300)] px-2.5 py-1 rounded-full text-xs font-medium transition-colors"
                    >
                      <Tag className="w-3 h-3" />
                      {tag}
                    </motion.span>
                  ))}
                </div>
              </motion.div>
            )}
          </motion.div>
        </motion.div>

        {/* Comments Section */}
        <motion.div
          initial={dsMotion.pageEnter.initial}
          animate={dsMotion.pageEnter.animate}
          transition={{ ...dsMotion.pageEnter.transition, delay: 0.2 }}
          className={`${card.base} rounded-xl p-8`}
        >
          <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-6 flex items-center gap-2">
            <MessageCircle className="w-6 h-6 text-[var(--accent-700)]" />
            Comments ({comments.length})
          </h2>

          <div className="space-y-6">
            {/* Comment Input */}
            <div className="flex gap-4">
              <div className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-sm font-semibold ${getAvatarColor(getInitial(user?.fullName))}`}>
                {getInitial(user?.fullName)}
              </div>
              <div className="flex-1 flex gap-2">
                <input
                  id="comment-input"
                  type="text"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Share your thoughts..."
                  className="flex-1 px-4 py-2.5 rounded-lg border border-[var(--border-main)] bg-[var(--bg-secondary)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-500)] text-sm transition-all"
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
                  className="px-4 py-2.5 rounded-lg bg-[var(--accent-700)] hover:bg-[var(--accent-800)] text-white font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
                  aria-label="Send comment"
                >
                  <Send className="w-4 h-4" />
                </motion.button>
              </div>
            </div>

            {/* Comments List */}
            {comments.length === 0 ? (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center text-[var(--text-muted)] py-8"
              >
                No comments yet. Be the first to share your thoughts!
              </motion.p>
            ) : (
              <motion.div
                className="space-y-4"
                initial="hidden"
                animate="visible"
                variants={{
                  hidden: {},
                  visible: { transition: { staggerChildren: 0.06 } },
                }}
              >
                {comments.map((comment) => (
                  <motion.div
                    key={comment.id}
                    variants={dsMotion.staggerItem}
                    className="flex gap-4 pb-4 border-b border-[var(--border-main)] last:border-b-0 hover:bg-[var(--bg-secondary)]/50 p-4 rounded-lg transition-colors"
                  >
                    <div className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-sm font-semibold ${getAvatarColor(getInitial(comment.authorName))}`}>
                      {getInitial(comment.authorName)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="row-between gap-2">
                        <p className="font-semibold text-sm text-[var(--text-primary)]">
                          {comment.authorName || 'Anonymous'}
                        </p>
                        {comment.authorId === user?.id && (
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setDeleteCommentId(comment.id)}
                            className="text-[var(--text-muted)] hover:text-danger-500 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2 rounded"
                            title="Delete comment"
                            aria-label="Delete comment"
                          >
                            <Trash2 className="w-4 h-4" />
                          </motion.button>
                        )}
                      </div>
                      <p className="text-body-secondary mt-1.5 leading-relaxed">
                        {comment.body}
                      </p>
                      <p className="text-caption mt-2">
                        {new Date(comment.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Delete Comment Confirm Dialog */}
      <ConfirmDialog
        isOpen={deleteCommentId !== null}
        onClose={() => setDeleteCommentId(null)}
        onConfirm={() => {
          if (deleteCommentId) {
            handleDeleteComment(deleteCommentId);
            setDeleteCommentId(null);
          }
        }}
        title="Delete Comment"
        message="Are you sure you want to delete this comment? This action cannot be undone."
        confirmText="Delete"
        type="danger"
        loading={deleteComment.isPending}
      />

      {/* Viewers Modal */}
      <Modal
        opened={showViewers}
        onClose={() => setShowViewers(false)}
        title="Who viewed this post"
        size="md"
        styles={{
          header: { backgroundColor: 'var(--bg-secondary)' },
          content: { backgroundColor: 'var(--bg-primary)' },
        }}
      >
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {!viewers || viewers.length === 0 ? (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center text-[var(--text-muted)] py-8"
            >
              No view records yet.
            </motion.p>
          ) : (
            <motion.div
              className="space-y-2"
              initial="hidden"
              animate="visible"
              variants={{
                hidden: {},
                visible: { transition: { staggerChildren: 0.06 } },
              }}
            >
              {viewers.map((v: Viewer) => (
                <motion.div
                  key={v.id}
                  variants={dsMotion.staggerItem}
                  className="row-between py-4 px-4 rounded-lg hover:bg-[var(--bg-secondary)] transition-colors"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className={`w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-semibold ${getAvatarColor(getInitial(v.viewerName))}`}>
                      {getInitial(v.viewerName)}
                    </div>
                    <span className="text-sm font-medium text-[var(--text-primary)] truncate">
                      {v.viewerName || 'Unknown'}
                    </span>
                  </div>
                  <span className="text-caption flex-shrink-0 ml-2">
                    {new Date(v.viewedAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      </Modal>
    </AppLayout>
  );
}
