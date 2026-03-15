'use client';

import { useState } from 'react';
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
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { Skeleton } from '@mantine/core';
import { AppLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useWikiPage, useComments } from '@/lib/hooks/queries/useFluence';

// Dynamically import Tiptap viewer to keep it out of the initial bundle
const ContentViewer = dynamic(
  () => import('@/components/fluence/ContentViewer'),
  { ssr: false, loading: () => <Skeleton height={300} radius="md" /> }
);

export default function WikiPageDetailPage() {
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;

  const { data: page, isLoading } = useWikiPage(slug, !!slug);
  const { data: commentsData } = useComments(slug, 'WIKI', 0, 10, !!slug && !!page);

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

  if (!page) {
    return (
      <AppLayout>
        <div className="text-center py-16">
          <BookOpen className="w-12 h-12 mx-auto mb-3 text-surface-300 dark:text-surface-700" />
          <h3 className="text-lg font-medium text-surface-700 dark:text-surface-300 mb-1">
            Page not found
          </h3>
          <p className="text-surface-500 dark:text-surface-400 mb-4">
            The page you're looking for doesn't exist
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
              className="mb-3 flex items-center gap-2 text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <h1 className="text-3xl font-bold text-surface-900 dark:text-surface-100 mb-2">
              {page.title}
            </h1>
            <div className="flex items-center gap-4 text-sm text-surface-500 dark:text-surface-400">
              <div className="flex items-center gap-1">
                <User className="w-4 h-4" />
                {page.authorName || 'Unknown Author'}
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {new Date(page.updatedAt).toLocaleDateString()}
              </div>
              <div className="flex items-center gap-1">
                <Eye className="w-4 h-4" />
                {page.viewCount || 0} views
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              className="gap-2"
              onClick={() => router.push(`/fluence/wiki/${page.id}/edit`)}
            >
              <Edit className="w-4 h-4" />
              Edit
            </Button>
            <Button variant="secondary" className="gap-2">
              <Share className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
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
                  <span className="text-sm text-surface-600 dark:text-surface-400">Views</span>
                  <span className="font-semibold">{page.viewCount || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-surface-600 dark:text-surface-400">Likes</span>
                  <span className="font-semibold">{page.likeCount || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-surface-600 dark:text-surface-400">Version</span>
                  <span className="font-semibold">{page.version}</span>
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="secondary" className="w-full gap-2 justify-start">
                  <Heart className="w-4 h-4" />
                  Like
                </Button>
                <Button variant="secondary" className="w-full gap-2 justify-start">
                  <MessageCircle className="w-4 h-4" />
                  Comment
                </Button>
                <Button variant="secondary" className="w-full gap-2 justify-start">
                  <Archive className="w-4 h-4" />
                  Archive
                </Button>
              </CardContent>
            </Card>
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
                No comments yet. Be the first to comment!
              </p>
            ) : (
              <div className="space-y-4">
                {comments.map((comment) => (
                  <div key={comment.id} className="flex gap-3 pb-4 border-b border-surface-200 dark:border-surface-700 last:border-b-0">
                    <div className="w-8 h-8 rounded-full bg-violet-100 dark:bg-violet-900/30 flex-shrink-0" />
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
