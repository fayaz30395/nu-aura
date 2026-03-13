'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Pen,
  Plus,
  Search,
  Filter,
  Clock,
  Eye,
  Heart,
  MessageCircle,
  Tag,
  RefreshCw,
} from 'lucide-react';
import { AppLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useBlogPosts, useBlogCategories } from '@/lib/hooks/queries/useFluence';

export default function BlogsPage() {
  const router = useRouter();
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | undefined>();
  const [searchQuery, setSearchQuery] = useState('');

  const {
    data: postsData,
    isLoading: postsLoading,
  } = useBlogPosts(0, 20, selectedCategoryId);
  const { data: categoriesData, isLoading: categoriesLoading } = useBlogCategories();

  const posts = postsData?.content || [];
  const categories = categoriesData || [];

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-surface-900 dark:text-surface-100 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                <Pen className="w-6 h-6 text-white" />
              </div>
              Blog
            </h1>
            <p className="text-surface-600 dark:text-surface-400 mt-1">
              Read and share insights with your team
            </p>
          </div>
          <Button
            onClick={() => router.push('/fluence/blogs/new')}
            className="gap-2 bg-amber-600 hover:bg-amber-700"
          >
            <Plus className="w-4 h-4" />
            New Post
          </Button>
        </div>

        {/* Featured Post */}
        {posts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card
              className="cursor-pointer hover:shadow-lg transition-shadow overflow-hidden"
              onClick={() => router.push(`/fluence/blogs/${posts[0].id}`)}
            >
              <CardContent className="p-0">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-0">
                  {posts[0].coverImageUrl && (
                    <div className="h-64 md:h-auto md:col-span-1 bg-gradient-to-br from-amber-400 to-orange-400 flex items-center justify-center">
                      <img
                        src={posts[0].coverImageUrl}
                        alt={posts[0].title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className={`p-6 ${posts[0].coverImageUrl ? 'md:col-span-2' : 'col-span-1'}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="inline-block px-2 py-1 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-xs font-semibold">
                        Featured
                      </span>
                      {posts[0].categoryName && (
                        <span className="inline-block px-2 py-1 rounded-full bg-surface-200 dark:bg-surface-700 text-surface-700 dark:text-surface-300 text-xs">
                          {posts[0].categoryName}
                        </span>
                      )}
                    </div>
                    <h2 className="text-2xl font-bold text-surface-900 dark:text-surface-100 mb-2">
                      {posts[0].title}
                    </h2>
                    <p className="text-surface-600 dark:text-surface-400 mb-4 line-clamp-2">
                      {posts[0].excerpt}
                    </p>
                    <div className="flex items-center gap-4 text-sm text-surface-500 dark:text-surface-400">
                      <div className="flex items-center gap-1">
                        <Eye className="w-4 h-4" />
                        {posts[0].viewCount || 0}
                      </div>
                      <div className="flex items-center gap-1">
                        <Heart className="w-4 h-4" />
                        {posts[0].likeCount || 0}
                      </div>
                      <div className="flex items-center gap-1">
                        <MessageCircle className="w-4 h-4" />
                        {posts[0].commentCount || 0}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {new Date(posts[0].publishedAt || posts[0].updatedAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Filters and Search */}
        <div className="flex flex-col gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-surface-400" />
            <input
              type="text"
              placeholder="Search posts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-900 text-surface-900 dark:text-surface-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Categories Filter */}
          {categoriesLoading ? (
            <div className="flex gap-2">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-8 w-20 rounded-full bg-surface-200 dark:bg-surface-700 animate-pulse"
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedCategoryId(undefined)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  selectedCategoryId === undefined
                    ? 'bg-amber-600 text-white'
                    : 'bg-surface-200 dark:bg-surface-700 text-surface-700 dark:text-surface-300 hover:bg-surface-300 dark:hover:bg-surface-600'
                }`}
              >
                All Posts
              </button>
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategoryId(category.id)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    selectedCategoryId === category.id
                      ? 'bg-amber-600 text-white'
                      : 'bg-surface-200 dark:bg-surface-700 text-surface-700 dark:text-surface-300 hover:bg-surface-300 dark:hover:bg-surface-600'
                  }`}
                >
                  {category.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Posts Grid */}
        {postsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="h-64" />
              </Card>
            ))}
          </div>
        ) : posts.length === 0 ? (
          <Card className="border-dashed border-2">
            <CardContent className="py-16 text-center">
              <Pen className="w-12 h-12 mx-auto mb-3 text-surface-300 dark:text-surface-700" />
              <h3 className="text-lg font-medium text-surface-700 dark:text-surface-300 mb-1">
                No posts yet
              </h3>
              <p className="text-surface-500 dark:text-surface-400 mb-4">
                Start by creating your first blog post
              </p>
              <Button
                onClick={() => router.push('/fluence/blogs/new')}
                className="gap-2 bg-amber-600 hover:bg-amber-700"
              >
                <Plus className="w-4 h-4" />
                Create Post
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {posts.slice(1).map((post, index) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card
                  className="cursor-pointer hover:shadow-lg transition-shadow h-full flex flex-col"
                  onClick={() => router.push(`/fluence/blogs/${post.id}`)}
                >
                  {post.coverImageUrl && (
                    <div className="h-40 bg-gradient-to-br from-amber-300 to-orange-400 flex items-center justify-center overflow-hidden">
                      <img
                        src={post.coverImageUrl}
                        alt={post.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <CardHeader>
                    {post.categoryName && (
                      <span className="inline-block px-2 py-1 rounded-full bg-surface-200 dark:bg-surface-700 text-surface-700 dark:text-surface-300 text-xs w-fit mb-2">
                        {post.categoryName}
                      </span>
                    )}
                    <CardTitle className="text-base line-clamp-2">
                      {post.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex-1 space-y-3">
                    <p className="text-sm text-surface-600 dark:text-surface-400 line-clamp-2">
                      {post.excerpt}
                    </p>
                    {post.tags && post.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {post.tags.slice(0, 2).map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex items-center gap-1 text-xs bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400 px-2 py-1 rounded"
                          >
                            <Tag className="w-3 h-3" />
                            {tag}
                          </span>
                        ))}
                        {post.tags.length > 2 && (
                          <span className="text-xs text-surface-500 dark:text-surface-500">
                            +{post.tags.length - 2}
                          </span>
                        )}
                      </div>
                    )}
                    <div className="flex items-center gap-3 text-xs text-surface-500 dark:text-surface-400 pt-2">
                      <div className="flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        {post.viewCount || 0}
                      </div>
                      <div className="flex items-center gap-1">
                        <Heart className="w-3 h-3" />
                        {post.likeCount || 0}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
