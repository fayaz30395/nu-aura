'use client';

import { useState } from 'react';
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
} from 'lucide-react';
import { AppLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import ContentViewer from '@/components/fluence/ContentViewer';
import { useBlogPost, useComments } from '@/lib/hooks/queries/useFluence';

export default function BlogPostDetailPage() {
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;
  const [isLiked, setIsLiked] = useState(false);

  const { data: post, isLoading } = useBlogPost(slug, !!slug);
  const { data: commentsData } = useComments(slug, 'BLOG', 0, 10, !!slug && !!post);

  const comments = commentsData?.content || [];

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <RefreshCw className="w-8 h-8 text-surface-400 animate-spin" />
        </div>
      </AppLayout>
    );
  }

  if (!post) {
    return (
      <AppLayout>
        <div className="text-center py-16">
          <Pen className="w-12 h-12 mx-auto mb-3 text-surface-300 dark:text-surface-700" />
          <h3 className="text-lg font-medium text-surface-700 dark:text-surface-300 mb-1">
            Post not found
          </h3>
          <p className="text-surface-500 dark:text-surface-400 mb-4">
            The post you're looking for doesn't exist
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
            <Button
              variant="secondary"
              className="gap-2"
              onClick={() => router.push(`/fluence/blogs/${post.id}/edit`)}
            >
              <Edit className="w-4 h-4" />
              Edit
            </Button>
            <Button variant="secondary" className="gap-2">
              <Share className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Featured Image */}
        {post.coverImageUrl && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
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
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-4xl font-bold text-surface-900 dark:text-surface-100 mb-4">
            {post.title}
          </h1>

          <div className="flex flex-wrap items-center gap-4 text-sm text-surface-600 dark:text-surface-400">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4" />
              {post.authorName || 'Unknown Author'}
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              {new Date(post.publishedAt || post.updatedAt).toLocaleDateString()}
            </div>
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4" />
              {post.viewCount || 0} views
            </div>
          </div>

          {/* Excerpt */}
          <p className="text-lg text-surface-600 dark:text-surface-400 mt-4 italic">
            {post.excerpt}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
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
                  <span className="text-sm text-surface-600 dark:text-surface-400">Views</span>
                  <span className="font-semibold">{post.viewCount || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-surface-600 dark:text-surface-400">Likes</span>
                  <span className="font-semibold">{post.likeCount || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-surface-600 dark:text-surface-400">Comments</span>
                  <span className="font-semibold">{post.commentCount || 0}</span>
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
                  onClick={() => setIsLiked(!isLiked)}
                >
                  <Heart
                    className={`w-4 h-4 ${isLiked ? 'fill-red-600 text-red-600' : ''}`}
                  />
                  {isLiked ? 'Unlike' : 'Like'}
                </Button>
                <Button variant="secondary" className="w-full gap-2 justify-start">
                  <MessageCircle className="w-4 h-4" />
                  Comment
                </Button>
                <Button variant="secondary" className="w-full gap-2 justify-start">
                  <Share className="w-4 h-4" />
                  Share
                </Button>
              </CardContent>
            </Card>

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
                        className="inline-flex items-center gap-1 bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400 px-3 py-1 rounded-full text-sm"
                      >
                        <Tag className="w-3 h-3" />
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
            {comments.length === 0 ? (
              <p className="text-center text-surface-500 dark:text-surface-400 py-8">
                No comments yet. Be the first to share your thoughts!
              </p>
            ) : (
              <div className="space-y-4">
                {comments.map((comment) => (
                  <div
                    key={comment.id}
                    className="flex gap-3 pb-4 border-b border-surface-200 dark:border-surface-700 last:border-b-0"
                  >
                    <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/30 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{comment.authorName || 'Anonymous'}</p>
                      <p className="text-sm text-surface-600 dark:text-surface-400 mt-1">
                        {comment.body}
                      </p>
                      <p className="text-xs text-surface-500 dark:text-surface-500 mt-2">
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
    </AppLayout>
  );
}
