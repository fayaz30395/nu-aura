'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Pen,
  Plus,
  Search,
  Clock,
  Eye,
  Heart,
  MessageCircle,
  Tag,
} from 'lucide-react';
import { AppLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { typography } from '@/lib/design-system';
import { useBlogPosts, useBlogCategories } from '@/lib/hooks/queries/useFluence';
import { PermissionGate } from '@/components/auth/PermissionGate';
import { Permissions } from '@/lib/hooks/usePermissions';

interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  coverImageUrl?: string;
  categoryName?: string;
  categoryId?: string;
  viewCount?: number;
  likeCount?: number;
  commentCount?: number;
  publishedAt?: string;
  updatedAt?: string;
  authorName?: string;
  authorInitial?: string;
  authorAvatarUrl?: string;
  tags?: string[];
}

interface Category {
  id: string;
  name: string;
}

export default function BlogsPage() {
  const router = useRouter();
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | undefined>();
  const [searchQuery, setSearchQuery] = useState('');

  const {
    data: postsData,
    isLoading: postsLoading,
  } = useBlogPosts(0, 20, selectedCategoryId);
  const { data: categoriesData, isLoading: categoriesLoading } = useBlogCategories();

  const posts = (postsData?.content || []) as BlogPost[];
  const categories = (categoriesData || []) as Category[];

  const featuredPost = posts[0];
  const regularPosts = posts.slice(1);

  // Filter posts by search query
  const filteredPosts = regularPosts.filter((post) =>
    post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    post.excerpt?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleNewPost = () => {
    router.push('/fluence/blogs/new');
  };

  const handlePostClick = (postId: string) => {
    router.push(`/fluence/blogs/${postId}`);
  };

  const getAuthorInitial = (post: BlogPost): string => {
    return post.authorInitial || post.authorName?.charAt(0).toUpperCase() || '?';
  };

  const formatDate = (date: string | undefined): string => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <AppLayout>
      <motion.div
        className="space-y-8"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
      >
        {/* Page Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-4 mb-2">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-warning-500 via-warning-500 to-warning-600 flex items-center justify-center shadow-lg">
                <Pen className="w-6 h-6 text-white" />
              </div>
              <h1 className={`${typography.pageTitle} text-[var(--text-primary)]`}>
                Blog & Articles
              </h1>
            </div>
            <p className="text-[var(--text-secondary)] text-sm">
              Read and share insights with your team
            </p>
          </div>
          <PermissionGate permission={Permissions.KNOWLEDGE_BLOG_CREATE} showWhileLoading>
            <Button
              onClick={handleNewPost}
              className="gap-2 bg-gradient-to-r from-warning-600 to-warning-600 hover:from-warning-700 hover:to-warning-700 text-white shadow-md hover:shadow-lg transition-all"
            >
              <Plus className="w-4 h-4" />
              New Post
            </Button>
          </PermissionGate>
        </div>

        {/* Search and Filter Section */}
        <motion.div
          className="space-y-4"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Search posts by title or content..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-aura w-full pl-12 pr-4 py-2.5 rounded-lg border border-[var(--border-main)] bg-[var(--bg-secondary)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-offset-0 focus:ring-warning-500/50 transition-all"
            />
          </div>

          {/* Category Filter Pills */}
          {categoriesLoading ? (
            <div className="flex gap-2 flex-wrap">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-9 w-24 rounded-full bg-[var(--bg-secondary)] animate-pulse"
                />
              ))}
            </div>
          ) : (
            <motion.div
              className="flex flex-wrap gap-2"
              layout
            >
              <motion.button
                onClick={() => setSelectedCategoryId(undefined)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all relative overflow-hidden ${
                  selectedCategoryId === undefined
                    ? 'bg-gradient-to-r from-warning-600 to-warning-600 text-white shadow-md'
                    : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'
                }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
                layout
              >
                All Posts
                {selectedCategoryId === undefined && (
                  <motion.div
                    className="absolute bottom-0 left-0 h-0.5 bg-white"
                    layoutId="category-indicator"
                    transition={{ type: 'spring', stiffness: 380, damping: 40 }}
                  />
                )}
              </motion.button>
              {categories.map((category) => (
                <motion.button
                  key={category.id}
                  onClick={() => setSelectedCategoryId(category.id)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all relative overflow-hidden ${
                    selectedCategoryId === category.id
                      ? 'bg-gradient-to-r from-warning-600 to-warning-600 text-white shadow-md'
                      : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'
                  }`}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.98 }}
                  layout
                >
                  {category.name}
                  {selectedCategoryId === category.id && (
                    <motion.div
                      className="absolute bottom-0 left-0 h-0.5 bg-white"
                      layoutId="category-indicator"
                      transition={{ type: 'spring', stiffness: 380, damping: 40 }}
                    />
                  )}
                </motion.button>
              ))}
            </motion.div>
          )}
        </motion.div>

        {/* Content Section */}
        {postsLoading ? (
          <div className="space-y-6">
            {/* Featured Skeleton */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="h-80 rounded-xl bg-[var(--bg-secondary)] animate-pulse"
            />
            {/* Grid Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="rounded-xl bg-[var(--bg-secondary)] animate-pulse aspect-[3/4]"
                />
              ))}
            </div>
          </div>
        ) : posts.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <Card className="border-2 border-dashed border-[var(--border-main)]">
              <CardContent className="py-20 text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                >
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-warning-100 to-warning-100 dark:from-warning-900/20 dark:to-warning-900/20 flex items-center justify-center mx-auto mb-4">
                    <Pen className="w-8 h-8 text-warning-600 dark:text-warning-400" />
                  </div>
                </motion.div>
                <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
                  No posts yet
                </h3>
                <p className="text-[var(--text-secondary)] mb-6 max-w-sm mx-auto">
                  Start building your knowledge base by creating your first blog post
                </p>
                <PermissionGate permission={Permissions.KNOWLEDGE_BLOG_CREATE} showWhileLoading>
                  <Button
                    onClick={handleNewPost}
                    className="gap-2 bg-gradient-to-r from-warning-600 to-warning-600 hover:from-warning-700 hover:to-warning-700 text-white shadow-md hover:shadow-lg transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    Create First Post
                  </Button>
                </PermissionGate>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <div className="space-y-8">
            {/* Featured Post */}
            {featuredPost && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                whileHover={{ y: -2, transition: { duration: 0.2 } }}
              >
                <Card
                  className="cursor-pointer overflow-hidden shadow-lg hover:shadow-2xl transition-shadow h-full"
                  onClick={() => handlePostClick(featuredPost.id)}
                >
                  <CardContent className="p-0">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
                      {/* Image Section */}
                      {featuredPost.coverImageUrl ? (
                        <div className="h-64 md:h-full min-h-96 bg-gradient-to-br from-warning-400 via-warning-400 to-rose-400 overflow-hidden relative group">
                          <Image
                            src={featuredPost.coverImageUrl!}
                            alt={featuredPost.title}
                            fill
                            sizes="(max-width: 768px) 100vw, 50vw"
                            className="object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                        </div>
                      ) : (
                        <div className="h-64 md:h-full min-h-96 bg-gradient-to-br from-warning-400 via-warning-400 to-rose-400 flex items-center justify-center relative">
                          <Pen className="w-16 h-16 text-white/30" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                        </div>
                      )}

                      {/* Content Section */}
                      <div className="p-8 md:p-10 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center gap-4 mb-4">
                            <motion.div
                              className="px-4 py-1 rounded-full bg-gradient-to-r from-warning-100 to-warning-100 dark:from-warning-900/30 dark:to-warning-900/30"
                              whileHover={{ scale: 1.05 }}
                            >
                              <span className="text-xs font-bold text-warning-700 dark:text-warning-300 uppercase tracking-wide">
                                ⭐ Featured
                              </span>
                            </motion.div>
                            {featuredPost.categoryName && (
                              <span className="badge-status px-4 py-1 rounded-full text-xs font-medium bg-[var(--bg-secondary)] text-[var(--text-secondary)]">
                                {featuredPost.categoryName}
                              </span>
                            )}
                          </div>
                          <h2 className="text-2xl md:text-2xl font-bold text-[var(--text-primary)] mb-3 line-clamp-3">
                            {featuredPost.title}
                          </h2>
                          <p className="text-[var(--text-secondary)] text-base leading-relaxed line-clamp-3 mb-6">
                            {featuredPost.excerpt}
                          </p>
                        </div>

                        {/* Metadata */}
                        <div className="space-y-4 pt-4 border-t border-[var(--border-main)]">
                          {/* Author and Date */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              {featuredPost.authorAvatarUrl ? (
                                <Image
                                  src={featuredPost.authorAvatarUrl}
                                  alt={featuredPost.authorName || 'Author'}
                                  width={40}
                                  height={40}
                                  unoptimized
                                  className="w-10 h-10 rounded-full object-cover border-2 border-warning-500/20"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = 'none';
                                    target.nextElementSibling?.classList.remove('hidden');
                                  }}
                                />
                              ) : null}
                              <div className={`w-10 h-10 rounded-full bg-gradient-to-br from-warning-500 to-warning-600 flex items-center justify-center text-white font-bold text-sm ${featuredPost.authorAvatarUrl ? 'hidden' : ''}`}>
                                {getAuthorInitial(featuredPost)}
                              </div>
                              <div>
                                <p className="text-sm font-medium text-[var(--text-primary)]">
                                  {featuredPost.authorName || 'Anonymous'}
                                </p>
                                <p className="text-xs text-[var(--text-muted)] flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {formatDate(featuredPost.publishedAt || featuredPost.updatedAt)}
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Stats Row */}
                          <div className="flex items-center gap-6 text-sm text-[var(--text-muted)]">
                            <motion.div className="flex items-center gap-2" whileHover={{ scale: 1.1 }}>
                              <Eye className="w-4 h-4" />
                              <span className="font-medium">{featuredPost.viewCount || 0}</span>
                            </motion.div>
                            <motion.div className="flex items-center gap-2" whileHover={{ scale: 1.1 }}>
                              <Heart className="w-4 h-4" />
                              <span className="font-medium">{featuredPost.likeCount || 0}</span>
                            </motion.div>
                            <motion.div className="flex items-center gap-2" whileHover={{ scale: 1.1 }}>
                              <MessageCircle className="w-4 h-4" />
                              <span className="font-medium">{featuredPost.commentCount || 0}</span>
                            </motion.div>
                          </div>

                          {/* Tags */}
                          {featuredPost.tags && featuredPost.tags.length > 0 && (
                            <div className="flex flex-wrap gap-2 pt-2">
                              {featuredPost.tags.slice(0, 3).map((tag) => (
                                <span
                                  key={tag}
                                  className="inline-flex items-center gap-1.5 text-xs bg-[var(--bg-secondary)] text-[var(--text-secondary)] px-2.5 py-1 rounded-full"
                                >
                                  <Tag className="w-3 h-3" />
                                  {tag}
                                </span>
                              ))}
                              {featuredPost.tags.length > 3 && (
                                <span className="text-xs text-[var(--text-muted)] px-2.5 py-1">
                                  +{featuredPost.tags.length - 3}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Posts Grid */}
            {searchQuery && filteredPosts.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-12"
              >
                <Search className="w-12 h-12 mx-auto mb-3 text-[var(--text-muted)] opacity-50" />
                <p className="text-[var(--text-secondary)] mb-2">
                  No posts match &ldquo;{searchQuery}&rdquo;
                </p>
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-warning-600 dark:text-warning-400 hover:underline text-sm font-medium"
                >
                  Clear search
                </button>
              </motion.div>
            ) : (
              <motion.div
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                initial="hidden"
                animate="visible"
                variants={{
                  hidden: {},
                  visible: { transition: { staggerChildren: 0.06 } },
                }}
              >
                <AnimatePresence mode="popLayout">
                  {filteredPosts.map((post, _index) => (
                    <motion.div
                      key={post.id}
                      variants={{
                        hidden: { opacity: 0, y: 8 },
                        visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' } },
                      }}
                      exit={{ opacity: 0, y: -20 }}
                    >
                      <Card
                        className="card-interactive cursor-pointer overflow-hidden h-full flex flex-col shadow-md hover:shadow-xl transition-all duration-300"
                        onClick={() => handlePostClick(post.id)}
                      >
                        {/* Cover Image */}
                        {post.coverImageUrl ? (
                          <div className="h-40 bg-gradient-to-br from-warning-300 via-warning-300 to-rose-300 overflow-hidden relative group">
                            <Image
                              src={post.coverImageUrl!}
                              alt={post.title}
                              fill
                              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                              className="object-cover group-hover:scale-110 transition-transform duration-500"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                          </div>
                        ) : (
                          <div className="h-40 bg-gradient-to-br from-warning-300 via-warning-300 to-rose-300 flex items-center justify-center relative">
                            <Pen className="w-12 h-12 text-white/25" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                          </div>
                        )}

                        {/* Header */}
                        <CardHeader className="pb-3">
                          {post.categoryName && (
                            <motion.span
                              className="badge-status inline-block px-2.5 py-1 rounded-full bg-[var(--bg-secondary)] text-[var(--text-secondary)] text-xs font-medium w-fit mb-2"
                              whileHover={{ scale: 1.05 }}
                            >
                              {post.categoryName}
                            </motion.span>
                          )}
                          <CardTitle className="text-base font-bold text-[var(--text-primary)] line-clamp-2 leading-tight">
                            {post.title}
                          </CardTitle>
                        </CardHeader>

                        {/* Content */}
                        <CardContent className="flex-1 flex flex-col justify-between space-y-4 pb-4">
                          <p className="text-sm text-[var(--text-secondary)] line-clamp-2 leading-relaxed">
                            {post.excerpt}
                          </p>

                          {/* Tags */}
                          {post.tags && post.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              {post.tags.slice(0, 2).map((tag) => (
                                <span
                                  key={tag}
                                  className="inline-flex items-center gap-1 text-xs bg-[var(--bg-secondary)] text-[var(--text-secondary)] px-2 py-0.5 rounded-full"
                                >
                                  <Tag className="w-2.5 h-2.5" />
                                  {tag}
                                </span>
                              ))}
                              {post.tags.length > 2 && (
                                <span className="text-xs text-[var(--text-muted)]">
                                  +{post.tags.length - 2}
                                </span>
                              )}
                            </div>
                          )}

                          {/* Footer */}
                          <div className="space-y-4 pt-4 border-t border-[var(--border-main)]">
                            {/* Author */}
                            <div className="flex items-center gap-2.5">
                              {post.authorAvatarUrl ? (
                                <Image
                                  src={post.authorAvatarUrl}
                                  alt={post.authorName || 'Author'}
                                  width={32}
                                  height={32}
                                  unoptimized
                                  className="w-8 h-8 rounded-full object-cover border border-warning-500/20"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = 'none';
                                    target.nextElementSibling?.classList.remove('hidden');
                                  }}
                                />
                              ) : null}
                              <div className={`w-8 h-8 rounded-full bg-gradient-to-br from-warning-500 to-warning-600 flex items-center justify-center text-white font-bold text-xs ${post.authorAvatarUrl ? 'hidden' : ''}`}>
                                {getAuthorInitial(post)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium text-[var(--text-primary)] truncate">
                                  {post.authorName || 'Anonymous'}
                                </p>
                                <p className="text-xs text-[var(--text-muted)]">
                                  {formatDate(post.publishedAt || post.updatedAt)}
                                </p>
                              </div>
                            </div>

                            {/* Stats */}
                            <div className="flex items-center justify-between text-xs text-[var(--text-muted)] pt-1">
                              <motion.div
                                className="flex items-center gap-1.5"
                                whileHover={{ scale: 1.1 }}
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>{post.viewCount || 0}</span>
                              </motion.div>
                              <motion.div
                                className="flex items-center gap-1.5"
                                whileHover={{ scale: 1.1 }}
                              >
                                <Heart className="w-3.5 h-3.5" />
                                <span>{post.likeCount || 0}</span>
                              </motion.div>
                              {post.commentCount !== undefined && (
                                <motion.div
                                  className="flex items-center gap-1.5"
                                  whileHover={{ scale: 1.1 }}
                                >
                                  <MessageCircle className="w-3.5 h-3.5" />
                                  <span>{post.commentCount}</span>
                                </motion.div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </motion.div>
            )}
          </div>
        )}
      </motion.div>
    </AppLayout>
  );
}
