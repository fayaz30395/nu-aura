'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { usePermissions, Permissions } from '@/lib/hooks/usePermissions';
import {
  Plus,
  BookOpen,
  Pen,
  FileText,
  TrendingUp,
  Clock,
} from 'lucide-react';
import { AppLayout } from '@/components/layout';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import {
  useWikiPages,
  useBlogPosts,
  useFluenceTemplates,
} from '@/lib/hooks/queries/useFluence';
import { ContentGrid, type ContentItem } from '@/components/fluence/ContentGrid';
import { layout, typography, card, motion as dsMotion, iconSize } from '@/lib/design-system';

/**
 * NU-Fluence Dashboard — central hub for knowledge management.
 * Displays recent content, trending items, and quick access actions.
 */
export default function FluenceDashboardPage() {
  const router = useRouter();
  const { hasAnyPermission, isReady } = usePermissions();

  const hasAccess = hasAnyPermission(
    Permissions.KNOWLEDGE_VIEW,
    Permissions.WIKI_VIEW,
    Permissions.BLOG_VIEW,
  );

  useEffect(() => {
    if (isReady && !hasAccess) {
      router.replace('/me/dashboard');
    }
  }, [isReady, hasAccess, router]);

  if (!isReady || !hasAccess) return null;

  // Fetch recent content
  const { data: wikiData, isLoading: wikiLoading } = useWikiPages(undefined, 0, 6);
  const { data: blogData, isLoading: blogLoading } = useBlogPosts(0, 6);
  const { data: templatesData, isLoading: templatesLoading } = useFluenceTemplates(0, 3);

  const recentWiki = (wikiData?.content || []).slice(0, 3);
  const recentBlogs = (blogData?.content || []).slice(0, 3);
  const templates = (templatesData?.content || []).slice(0, 3);

  // Combine and sort by date for "Recent" section
  const allRecent: ContentItem[] = [
    ...(wikiData?.content || []).map((p) => ({
      id: p.id,
      title: p.title,
      type: 'WIKI' as const,
      viewCount: p.viewCount,
      likeCount: p.likeCount,
      updatedAt: p.updatedAt,
      authorName: p.authorName,
      spaceName: p.spaceName,
    })),
    ...(blogData?.content || []).map((p) => ({
      id: p.id,
      title: p.title,
      excerpt: p.excerpt,
      type: 'BLOG' as const,
      viewCount: p.viewCount,
      likeCount: p.likeCount,
      commentCount: p.commentCount,
      updatedAt: p.updatedAt,
      authorName: p.authorName,
      categoryName: p.categoryName,
    })),
  ]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 6);

  const isLoading = wikiLoading || blogLoading || templatesLoading;

  return (
    <AppLayout>
      <motion.div className={layout.sectionGap} {...dsMotion.pageEnter}>
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="relative overflow-hidden rounded-xl bg-gradient-to-br from-[var(--accent-700)] via-[var(--accent-500)] to-[var(--accent-400)] dark:from-[var(--accent-950)] dark:via-[var(--accent-900)] dark:to-[var(--accent-800)] p-8 md:p-12"
        >
          <div className="relative z-10">
            <div className="flex items-start justify-between gap-6 mb-6">
              <div className="flex-1">
                <div className="flex items-center gap-4 mb-3">
                  <div className="p-4 bg-white/20 rounded-lg backdrop-blur-sm">
                    <BookOpen className="w-6 h-6 text-white" />
                  </div>
                  <h1 className={`${typography.pageTitle} text-white skeuo-emboss`}>
                    NU-Fluence Knowledge Hub
                  </h1>
                </div>
                <p className="text-white/80 max-w-2xl">
                  Discover, create, and share knowledge across your organization.
                  Find answers, collaborate, and build collective intelligence.
                </p>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-wrap gap-4">
              <Button
                onClick={() => router.push('/fluence/wiki/new')}
                className="gap-2 bg-[var(--bg-card)] text-[var(--accent-700)] hover:bg-[var(--bg-card-hover)] font-medium shadow-lg hover:shadow-xl transition-all"
              >
                <Plus className={iconSize.button} />
                New Wiki Page
              </Button>
              <Button
                onClick={() => router.push('/fluence/blogs/new')}
                variant="outline"
                className="gap-2 border-white/30 bg-white/10 hover:bg-white/20 text-white font-medium backdrop-blur-sm"
              >
                <Pen className={iconSize.button} />
                Write Blog Post
              </Button>
              <Button
                onClick={() => router.push('/fluence/search')}
                variant="outline"
                className="gap-2 border-white/30 bg-white/10 hover:bg-white/20 text-white font-medium backdrop-blur-sm"
              >
                <Clock className={iconSize.button} />
                Explore
              </Button>
            </div>
          </div>

          {/* Decorative background */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl transform translate-x-1/3 -translate-y-1/4" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-white rounded-full blur-3xl transform -translate-x-1/3 translate-y-1/4" />
          </div>
        </motion.div>

        {/* Stats Grid */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-4 gap-4"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.3 }}
        >
          <StatCard
            icon={BookOpen}
            label="Wiki Pages"
            value={wikiData?.totalElements || 0}
            color="violet"
          />
          <StatCard
            icon={Pen}
            label="Blog Posts"
            value={blogData?.totalElements || 0}
            color="amber"
          />
          <StatCard
            icon={FileText}
            label="Templates"
            value={templatesData?.totalElements || 0}
            color="emerald"
          />
          <StatCard
            icon={TrendingUp}
            label="Total Content"
            value={(wikiData?.totalElements || 0) + (blogData?.totalElements || 0) + (templatesData?.totalElements || 0)}
            color="blue"
          />
        </motion.div>

        {/* Recent Content */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.3 }}
        >
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className={`${card.base} ${card.paddingLarge} h-32 animate-pulse`} />
              ))}
            </div>
          ) : (
            <ContentGrid
              items={allRecent}
              title="Recently Updated"
              columns={3}
              emptyMessage="No content yet. Start by creating a wiki page or blog post!"
            />
          )}
        </motion.div>

        {/* Three Column Layout */}
        <motion.div
          className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.3 }}
        >
          {/* Popular Wiki Pages */}
          <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}>
            <Card className={card.base}>
              <CardHeader className="pb-4 border-b border-[var(--border-main)]">
                <div className="flex items-center gap-2">
                  <BookOpen className={`${iconSize.cardInline} text-accent-600`} />
                  <CardTitle className={typography.cardTitle}>
                    Top Wiki Pages
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                {recentWiki.length === 0 ? (
                  <p className={typography.bodySecondary}>
                    No wiki pages yet
                  </p>
                ) : (
                  recentWiki.map((page) => (
                    <motion.button
                      key={page.id}
                      onClick={() => router.push(`/fluence/wiki/${page.id}`)}
                      className="block w-full text-left p-2.5 rounded-lg hover:bg-[var(--bg-secondary)] transition-colors group"
                      whileHover={{ x: 4 }}
                    >
                      <p className={`${typography.cardTitle} text-sm line-clamp-2 group-hover:text-[var(--accent-700)]`}>
                        {page.title}
                      </p>
                      <p className={`${typography.caption} mt-1`}>
                        {page.viewCount || 0} views
                      </p>
                    </motion.button>
                  ))
                )}
                <motion.button
                  onClick={() => router.push('/fluence/wiki')}
                  className="w-full pt-2 border-t border-[var(--border-main)] text-[var(--accent-700)] font-medium text-sm hover:text-[var(--accent-800)] transition-colors"
                  whileHover={{ scale: 1.02 }}
                >
                  View All Pages →
                </motion.button>
              </CardContent>
            </Card>
          </motion.div>

          {/* Recent Blog Posts */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <Card className={card.base}>
              <CardHeader className="pb-4 border-b border-[var(--border-main)]">
                <div className="flex items-center gap-2">
                  <Pen className={`${iconSize.cardInline} text-warning-600`} />
                  <CardTitle className={typography.cardTitle}>
                    Latest Blog Posts
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                {recentBlogs.length === 0 ? (
                  <p className={typography.bodySecondary}>
                    No blog posts yet
                  </p>
                ) : (
                  recentBlogs.map((post) => (
                    <motion.button
                      key={post.id}
                      onClick={() => router.push(`/fluence/blogs/${post.id}`)}
                      className="block w-full text-left p-2.5 rounded-lg hover:bg-[var(--bg-secondary)] transition-colors group"
                      whileHover={{ x: 4 }}
                    >
                      <p className={`${typography.cardTitle} text-sm line-clamp-2 group-hover:text-[var(--accent-700)]`}>
                        {post.title}
                      </p>
                      <p className={`${typography.caption} mt-1`}>
                        {post.authorName || 'Anonymous'}
                      </p>
                    </motion.button>
                  ))
                )}
                <motion.button
                  onClick={() => router.push('/fluence/blogs')}
                  className="w-full pt-2 border-t border-[var(--border-main)] text-[var(--accent-700)] font-medium text-sm hover:text-[var(--accent-800)] transition-colors"
                  whileHover={{ scale: 1.02 }}
                >
                  Read All Posts →
                </motion.button>
              </CardContent>
            </Card>
          </motion.div>

          {/* Template Library */}
          <motion.div initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }}>
            <Card className={card.base}>
              <CardHeader className="pb-4 border-b border-[var(--border-main)]">
                <div className="flex items-center gap-2">
                  <FileText className={`${iconSize.cardInline} text-success-600`} />
                  <CardTitle className={typography.cardTitle}>
                    Templates
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                {templates.length === 0 ? (
                  <p className={typography.bodySecondary}>
                    No templates yet
                  </p>
                ) : (
                  templates.map((template) => (
                    <motion.button
                      key={template.id}
                      onClick={() => router.push(`/fluence/templates/${template.id}`)}
                      className="block w-full text-left p-2.5 rounded-lg hover:bg-[var(--bg-secondary)] transition-colors group"
                      whileHover={{ x: 4 }}
                    >
                      <p className={`${typography.cardTitle} text-sm line-clamp-2 group-hover:text-[var(--accent-700)]`}>
                        {template.name || 'Untitled'}
                      </p>
                      <p className={`${typography.caption} mt-1`}>
                        {template.usageCount || 0} uses
                      </p>
                    </motion.button>
                  ))
                )}
                <motion.button
                  onClick={() => router.push('/fluence/templates')}
                  className="w-full pt-2 border-t border-[var(--border-main)] text-[var(--accent-700)] font-medium text-sm hover:text-[var(--accent-800)] transition-colors"
                  whileHover={{ scale: 1.02 }}
                >
                  All Templates →
                </motion.button>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </motion.div>
    </AppLayout>
  );
}

interface StatCardProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  color: 'violet' | 'amber' | 'emerald' | 'blue';
}

function StatCard({ icon: IconComponent, label, value, color }: StatCardProps) {
  const colorMap = {
    violet: 'from-accent-700 to-accent-800 bg-accent-100 dark:bg-accent-900/30',
    amber: 'from-warning-500 to-warning-600 bg-warning-100 dark:bg-warning-900/30',
    emerald: 'from-success-500 to-success-600 bg-success-100 dark:bg-success-900/30',
    blue: 'from-accent-500 to-accent-600 bg-accent-100 dark:bg-accent-900/30',
  };

  const textColorMap = {
    violet: 'text-accent-700 dark:text-accent-300',
    amber: 'text-warning-700 dark:text-warning-300',
    emerald: 'text-success-700 dark:text-success-300',
    blue: 'text-accent-700 dark:text-accent-300',
  };

  return (
    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
      <Card className={card.base}>
        <CardContent className={`p-6 flex items-center justify-between`}>
          <div>
            <p className={typography.caption}>{label}</p>
            <p className="text-2xl font-bold text-[var(--text-primary)] mt-1">
              {value}
            </p>
          </div>
          <div className={`p-4 rounded-lg ${colorMap[color]}`}>
            <IconComponent className={`w-6 h-6 ${textColorMap[color]}`} />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
