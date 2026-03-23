'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AppLayout } from '@/components/layout';
import {
  Linkedin,
  Plus,
  Loader2,
  Edit2,
  Trash2,
  Search,
  X,
  ExternalLink,
  Heart,
  MessageCircle,
  Share2,
  Calendar,
  Tag,
  User,
  Zap,
} from 'lucide-react';
import { useAuth } from '@/lib/hooks/useAuth';
import { isAdmin } from '@/lib/utils';
import {
  useAllLinkedInPosts,
  useCreateLinkedInPost,
  useUpdateLinkedInPost,
  useDeleteLinkedInPost,
} from '@/lib/hooks/queries/useLinkedIn';
import { LinkedInPost, CreateLinkedInPostRequest, UpdateLinkedInPostRequest } from '@/lib/types/linkedin';
import { useToast } from '@/components/notifications/ToastProvider';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { createLogger } from '@/lib/utils/logger';
import { useDebounce } from '@/lib/hooks/useDebounce';

const logger = createLogger('LinkedInPosts');

export default function LinkedInPostsPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPost, setEditingPost] = useState<LinkedInPost | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // React Query hooks
  const { data: postsResponse, isLoading } = useAllLinkedInPosts(0, 100);
  const deletePostMutation = useDeleteLinkedInPost();

  const posts = postsResponse?.content || [];

  const handleEditPost = (post: LinkedInPost) => {
    setEditingPost(post);
    setShowCreateModal(true);
  };

  const handleDeletePost = async () => {
    if (!showDeleteConfirm) return;

    try {
      await deletePostMutation.mutateAsync(showDeleteConfirm);
      setShowDeleteConfirm(null);
      toast.success('Post Deleted', 'The LinkedIn post has been deleted.');
    } catch (error) {
      logger.error('Failed to delete post:', error);
      toast.error('Delete Failed', 'Unable to delete the post. Please try again.');
    }
  };

  const filteredPosts = posts.filter(p => {
    const matchesSearch =
      p.contentSnippet.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
      p.authorName.toLowerCase().includes(debouncedSearchTerm.toLowerCase());
    return matchesSearch;
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <AppLayout activeMenuItem="linkedin-posts">
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-[var(--text-primary)] flex items-center gap-4 skeuo-emboss">
                  <Linkedin className="w-8 h-8 text-blue-600" />
                  LinkedIn Posts
                </h1>
                <p className="text-[var(--text-secondary)] mt-2 skeuo-deboss">
                  Curate and manage LinkedIn posts for your company feed
                </p>
              </div>
              {isAdmin(user?.roles) && (
                <button
                  onClick={() => {
                    setEditingPost(null);
                    setShowCreateModal(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium shadow-sm"
                >
                  <Plus className="w-5 h-5" />
                  Add Post
                </button>
              )}
            </div>
          </motion.div>

          {/* Search */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-[var(--bg-card)] rounded-xl shadow-sm p-4 mb-6"
          >
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--text-muted)] w-5 h-5" />
              <input
                type="text"
                placeholder="Search by content or author..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-[var(--border-main)] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-[var(--bg-secondary)]/50 dark:text-white"
              />
            </div>
          </motion.div>

          {/* Posts Grid */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            {isLoading ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              </div>
            ) : filteredPosts.length === 0 ? (
              <EmptyState
                icon={<Linkedin className="h-12 w-12" />}
                title="No LinkedIn Posts"
                description={
                  debouncedSearchTerm
                    ? 'No posts match your search'
                    : 'No LinkedIn posts yet. Add one to get started.'
                }
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredPosts.map((post, index) => (
                  <motion.div
                    key={post.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="bg-[var(--bg-card)] rounded-xl shadow-sm hover:shadow-md transition-all border border-[var(--border-main)] overflow-hidden group"
                  >
                    {/* Card Header */}
                    <div className="p-5 border-b border-[var(--border-main)]">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <User className="w-4 h-4 text-[var(--text-muted)]" />
                            <span className="font-semibold text-[var(--text-primary)] truncate">
                              {post.authorName}
                            </span>
                          </div>
                          {post.authorTitle && (
                            <p className="text-sm text-[var(--text-muted)] truncate">
                              {post.authorTitle}
                            </p>
                          )}
                        </div>
                        {!post.isActive && (
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-[var(--bg-surface)] text-[var(--text-secondary)]">
                            Inactive
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-5 space-y-4">
                      <p className="text-sm text-[var(--text-secondary)] line-clamp-3">
                        {post.contentSnippet}
                      </p>

                      {/* Tags */}
                      {post.tags && post.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {post.tags.slice(0, 3).map((tag) => (
                            <span
                              key={tag}
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full"
                            >
                              <Tag className="w-3 h-3" />
                              {tag}
                            </span>
                          ))}
                          {post.tags.length > 3 && (
                            <span className="inline-flex items-center px-2 py-1 text-xs font-medium text-[var(--text-muted)]">
                              +{post.tags.length - 3}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Engagement Stats */}
                      <div className="grid grid-cols-3 gap-4 pt-3 border-t border-[var(--border-main)]">
                        <div className="flex items-center gap-2 text-sm">
                          <Heart className="w-4 h-4 text-red-500" />
                          <span className="text-[var(--text-secondary)]">
                            {post.engagement.likes}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <MessageCircle className="w-4 h-4 text-blue-500" />
                          <span className="text-[var(--text-secondary)]">
                            {post.engagement.comments}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Share2 className="w-4 h-4 text-green-500" />
                          <span className="text-[var(--text-secondary)]">
                            {post.engagement.shares}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="px-5 py-4 bg-[var(--bg-secondary)]/50 border-t border-[var(--border-main)]">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <span className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
                            <Calendar className="w-3.5 h-3.5" />
                            {formatDate(post.postedAt)}
                          </span>
                          {post.isFromNulogic && (
                            <span className="flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">
                              <Zap className="w-3 h-3" />
                              Nulogic
                            </span>
                          )}
                        </div>
                        <a
                          href={post.postUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 text-[var(--text-muted)] hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                          title="View on LinkedIn"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </div>
                    </div>

                    {/* Actions */}
                    {isAdmin(user?.roles) && (
                      <div className="px-5 py-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity bg-[var(--bg-surface)]/30 border-t border-[var(--border-main)]">
                        <button
                          onClick={() => handleEditPost(post)}
                          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                          Edit
                        </button>
                        <button
                          onClick={() => setShowDeleteConfirm(post.id)}
                          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-red-600 bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </button>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </div>

      {/* Create/Edit Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <CreateLinkedInPostModal
            post={editingPost}
            onClose={() => {
              setShowCreateModal(false);
              setEditingPost(null);
            }}
            onSuccess={() => {
              setShowCreateModal(false);
              setEditingPost(null);
            }}
          />
        )}
      </AnimatePresence>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(null)}
        onConfirm={handleDeletePost}
        title="Delete LinkedIn Post"
        message="Are you sure you want to delete this post? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
        loading={deletePostMutation.isPending}
      />
    </AppLayout>
  );
}

interface CreateLinkedInPostModalProps {
  post?: LinkedInPost | null;
  onClose: () => void;
  onSuccess: () => void;
}

const linkedInFormSchema = z.object({
  postUrl: z.string().url('Must be a valid URL').nonempty('Post URL is required'),
  authorName: z.string().min(2, 'Author name must be at least 2 characters').nonempty('Author name is required'),
  authorTitle: z.string().optional(),
  contentSnippet: z.string().min(10, 'Content must be at least 10 characters').nonempty('Content is required'),
  imageUrl: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  postedAt: z.string().nonempty('Posted date is required'),
  likes: z.number().int().min(0, 'Likes cannot be negative'),
  comments: z.number().int().min(0, 'Comments cannot be negative'),
  shares: z.number().int().min(0, 'Shares cannot be negative'),
  tags: z.string().optional(),
  isFromNulogic: z.boolean().optional().default(false),
});

type LinkedInFormData = z.infer<typeof linkedInFormSchema>;

function CreateLinkedInPostModal({ post, onClose, onSuccess }: CreateLinkedInPostModalProps) {
  const toast = useToast();
  const isEditing = !!post;
  const createPostMutation = useCreateLinkedInPost();
  const updatePostMutation = useUpdateLinkedInPost();

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<LinkedInFormData>({
    resolver: zodResolver(linkedInFormSchema),
    defaultValues: {
      postUrl: post?.postUrl || '',
      authorName: post?.authorName || '',
      authorTitle: post?.authorTitle || '',
      contentSnippet: post?.contentSnippet || '',
      imageUrl: post?.imageUrl || '',
      postedAt: post?.postedAt ? post.postedAt.split('T')[0] : new Date().toISOString().split('T')[0],
      likes: post?.engagement.likes || 0,
      comments: post?.engagement.comments || 0,
      shares: post?.engagement.shares || 0,
      tags: post?.tags ? post.tags.join(', ') : '',
      isFromNulogic: post?.isFromNulogic || false,
    },
  });

  const onSubmit = async (formData: LinkedInFormData) => {
    try {
      const tags: string[] = (formData.tags || '')
        .split(',')
        .map((t: string) => t.trim())
        .filter((t: string) => t);

      if (isEditing && post) {
        const updatePayload: UpdateLinkedInPostRequest = {
          contentSnippet: formData.contentSnippet,
          imageUrl: formData.imageUrl || undefined,
          engagement: {
            likes: formData.likes,
            comments: formData.comments,
            shares: formData.shares,
          },
          tags,
        };
        await updatePostMutation.mutateAsync({ id: post.id, data: updatePayload });
        toast.success('Post Updated', 'The LinkedIn post has been updated.');
      } else {
        const createPayload: CreateLinkedInPostRequest = {
          postUrl: formData.postUrl,
          authorName: formData.authorName,
          authorTitle: formData.authorTitle || '',
          contentSnippet: formData.contentSnippet,
          imageUrl: formData.imageUrl || '',
          postedAt: formData.postedAt,
          engagement: {
            likes: formData.likes,
            comments: formData.comments,
            shares: formData.shares,
          },
          tags,
          isFromNulogic: formData.isFromNulogic || false,
        };
        await createPostMutation.mutateAsync(createPayload);
        toast.success('Post Created', 'The LinkedIn post has been added.');
      }
      reset();
      onSuccess();
    } catch (err: unknown) {
      logger.error(`Failed to ${isEditing ? 'update' : 'create'} post:`, err);
      const errorMessage = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || `Failed to ${isEditing ? 'update' : 'create'} post`;
      toast.error(isEditing ? 'Update Failed' : 'Create Failed', errorMessage);
    }
  };

  useEffect(() => {
    if (!post) {
      reset({
        postUrl: '',
        authorName: '',
        authorTitle: '',
        contentSnippet: '',
        imageUrl: '',
        postedAt: new Date().toISOString().split('T')[0],
        likes: 0,
        comments: 0,
        shares: 0,
        tags: '',
        isFromNulogic: false,
      });
    }
  }, [post, reset]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--bg-overlay)] p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-[var(--bg-card)] rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-[var(--border-main)] flex items-center justify-between">
          <h2 className="text-xl font-bold text-[var(--text-primary)]">
            {isEditing ? 'Edit LinkedIn Post' : 'Add LinkedIn Post'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[var(--bg-surface)] rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-[var(--text-muted)]" />
          </button>
        </div>

        {/* Content */}
        <form id="linkedin-form" onSubmit={handleSubmit(onSubmit)} className="p-6 overflow-y-auto max-h-[60vh] space-y-4">
          {/* Post URL */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
              Post URL <span className="text-red-500">*</span>
            </label>
            <input
              type="url"
              {...register('postUrl')}
              className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-[var(--bg-secondary)] dark:text-white ${
                errors.postUrl ? 'border-red-500' : 'border-[var(--border-main)]'
              }`}
              placeholder="https://www.linkedin.com/feed/update/..."
            />
            {errors.postUrl && (
              <p className="mt-1 text-xs text-red-500">{errors.postUrl.message}</p>
            )}
          </div>

          {/* Author Name and Title */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                Author Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                {...register('authorName')}
                className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-[var(--bg-secondary)] dark:text-white ${
                  errors.authorName ? 'border-red-500' : 'border-[var(--border-main)]'
                }`}
                placeholder="John Doe"
              />
              {errors.authorName && (
                <p className="mt-1 text-xs text-red-500">{errors.authorName.message}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                Author Title
              </label>
              <input
                type="text"
                {...register('authorTitle')}
                className="w-full px-4 py-2.5 border border-[var(--border-main)] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-[var(--bg-secondary)] dark:text-white"
                placeholder="CEO at Company"
              />
            </div>
          </div>

          {/* Content Snippet */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
              Content Snippet <span className="text-red-500">*</span>
            </label>
            <textarea
              {...register('contentSnippet')}
              rows={4}
              className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-[var(--bg-secondary)] dark:text-white resize-none ${
                errors.contentSnippet ? 'border-red-500' : 'border-[var(--border-main)]'
              }`}
              placeholder="Paste the post content or a snippet..."
            />
            {errors.contentSnippet && (
              <p className="mt-1 text-xs text-red-500">{errors.contentSnippet.message}</p>
            )}
          </div>

          {/* Image URL */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
              Image URL
            </label>
            <input
              type="url"
              {...register('imageUrl')}
              className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-[var(--bg-secondary)] dark:text-white ${
                errors.imageUrl ? 'border-red-500' : 'border-[var(--border-main)]'
              }`}
              placeholder="https://..."
            />
            {errors.imageUrl && (
              <p className="mt-1 text-xs text-red-500">{errors.imageUrl.message}</p>
            )}
          </div>

          {/* Posted Date */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
              Posted Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              {...register('postedAt')}
              className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-[var(--bg-secondary)] dark:text-white ${
                errors.postedAt ? 'border-red-500' : 'border-[var(--border-main)]'
              }`}
            />
            {errors.postedAt && (
              <p className="mt-1 text-xs text-red-500">{errors.postedAt.message}</p>
            )}
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
              Tags
            </label>
            <input
              type="text"
              {...register('tags')}
              className="w-full px-4 py-2.5 border border-[var(--border-main)] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-[var(--bg-secondary)] dark:text-white"
              placeholder="tag1, tag2, tag3"
            />
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              Separate tags with commas
            </p>
          </div>

          {/* Engagement Stats */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-3">
              Engagement Stats
            </label>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-[var(--text-secondary)] mb-1">
                  Likes
                </label>
                <Controller
                  name="likes"
                  control={control}
                  render={({ field }) => (
                    <>
                      <input
                        type="number"
                        min="0"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-[var(--bg-secondary)] dark:text-white ${
                          errors.likes ? 'border-red-500' : 'border-[var(--border-main)]'
                        }`}
                      />
                      {errors.likes && (
                        <p className="mt-1 text-xs text-red-500">{errors.likes.message}</p>
                      )}
                    </>
                  )}
                />
              </div>
              <div>
                <label className="block text-xs text-[var(--text-secondary)] mb-1">
                  Comments
                </label>
                <Controller
                  name="comments"
                  control={control}
                  render={({ field }) => (
                    <>
                      <input
                        type="number"
                        min="0"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-[var(--bg-secondary)] dark:text-white ${
                          errors.comments ? 'border-red-500' : 'border-[var(--border-main)]'
                        }`}
                      />
                      {errors.comments && (
                        <p className="mt-1 text-xs text-red-500">{errors.comments.message}</p>
                      )}
                    </>
                  )}
                />
              </div>
              <div>
                <label className="block text-xs text-[var(--text-secondary)] mb-1">
                  Shares
                </label>
                <Controller
                  name="shares"
                  control={control}
                  render={({ field }) => (
                    <>
                      <input
                        type="number"
                        min="0"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-[var(--bg-secondary)] dark:text-white ${
                          errors.shares ? 'border-red-500' : 'border-[var(--border-main)]'
                        }`}
                      />
                      {errors.shares && (
                        <p className="mt-1 text-xs text-red-500">{errors.shares.message}</p>
                      )}
                    </>
                  )}
                />
              </div>
            </div>
          </div>

          {/* Checkbox Options */}
          <div className="flex items-center gap-2 cursor-pointer p-4 rounded-lg hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)]/50 transition-colors">
            <Controller
              name="isFromNulogic"
              control={control}
              render={({ field }) => (
                <input
                  type="checkbox"
                  checked={field.value || false}
                  onChange={(e) => field.onChange(e.target.checked)}
                  onBlur={field.onBlur}
                  name={field.name}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
              )}
            />
            <span className="text-sm text-[var(--text-secondary)]">
              This post is from Nulogic
            </span>
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[var(--border-main)] flex gap-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-[var(--border-main)] text-[var(--text-secondary)] rounded-lg hover:bg-[var(--bg-surface)] transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="linkedin-form"
            disabled={createPostMutation.isPending || updatePostMutation.isPending}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {createPostMutation.isPending || updatePostMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {isEditing ? 'Updating...' : 'Adding...'}
              </>
            ) : (
              <>
                <Linkedin className="w-4 h-4" />
                {isEditing ? 'Update' : 'Add Post'}
              </>
            )}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
