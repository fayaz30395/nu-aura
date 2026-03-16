'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  Pen,
  Eye,
  Heart,
  MessageCircle,
  Calendar,
  Plus,
  RefreshCw,
  Star,
  BarChart3,
} from 'lucide-react';
import { AppLayout } from '@/components/layout';
import { Button } from '@/components/ui/Button';
import {
  useMyWikiPages,
  useMyBlogPosts,
  useFluenceFavorites,
} from '@/lib/hooks/queries/useFluence';
import type { WikiPage, BlogPost, FluenceFavorite } from '@/lib/types/fluence';
import { layout, typography, card, motion as dsMotion, iconSize, status } from '@/lib/design-system';

type TabType = 'wiki' | 'blog' | 'favorites';

export default function MyContentPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('wiki');

  const { data: myWikiData, isLoading: wikiLoading } = useMyWikiPages(0, 50);
  const { data: myBlogData, isLoading: myBlogLoading } = useMyBlogPosts(0, 50);
  const { data: favorites, isLoading: favsLoading } = useFluenceFavorites();

  const myWikiPages = myWikiData?.content || [];
  const myBlogPosts = myBlogData?.content || [];
  const myFavorites = favorites || [];

  const tabs: { id: TabType; label: string; count: number }[] = [
    { id: 'wiki', label: 'Wiki Pages', count: myWikiPages.length },
    { id: 'blog', label: 'Blog Posts', count: myBlogPosts.length },
    { id: 'favorites', label: 'Favorites', count: myFavorites.length },
  ];

  const isLoading = activeTab === 'wiki' ? wikiLoading : activeTab === 'blog' ? myBlogLoading : favsLoading;

  return (
    <AppLayout>
      <motion.div className={layout.sectionGap} {...dsMotion.pageEnter}>
        {/* Header with title and actions */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className={typography.pageTitle}>My Content</h1>
            <p className={`${typography.bodySecondary} mt-2`}>
              View and manage all your pages, posts, and favorites
            </p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <Button
              variant="primary"
              size="sm"
              className="gap-2"
              onClick={() => router.push('/fluence/wiki/new')}
            >
              <Plus className={iconSize.button} />
              New Page
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="gap-2"
              onClick={() => router.push('/fluence/blogs/new')}
            >
              <Plus className={iconSize.button} />
              New Post
            </Button>
          </div>
        </div>

        {/* Stat cards summary row */}
        <motion.div
          className={layout.grid3}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <StatCard
            icon={FileText}
            label="Wiki Pages"
            value={myWikiPages.length}
            iconColor="violet"
          />
          <StatCard
            icon={Pen}
            label="Blog Posts"
            value={myBlogPosts.length}
            iconColor="amber"
          />
          <StatCard
            icon={Star}
            label="Favorites"
            value={myFavorites.length}
            iconColor="yellow"
          />
        </motion.div>

        {/* Animated tab bar with sliding indicator */}
        <motion.div
          className="flex gap-1 border-b border-[var(--border-main)] overflow-x-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.15 }}
        >
          {tabs.map((tab, idx) => (
            <motion.button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                relative px-4 py-3 text-sm font-medium whitespace-nowrap
                transition-colors duration-200 flex items-center gap-2
                ${activeTab === tab.id
                  ? 'text-[var(--primary-600)] dark:text-[var(--primary-400)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                }
              `}
              whileHover={{ y: -1 }}
              whileTap={{ y: 0 }}
            >
              {tab.label}
              <motion.span
                className={`px-2 py-0.5 text-xs font-medium rounded-full transition-colors ${
                  activeTab === tab.id
                    ? 'bg-[var(--primary-100)] text-[var(--primary-700)] dark:bg-[var(--primary-900)] dark:text-[var(--primary-300)]'
                    : 'bg-[var(--bg-secondary)] text-[var(--text-muted)]'
                }`}
                initial={false}
                animate={{ scale: activeTab === tab.id ? 1.05 : 1 }}
              >
                {tab.count}
              </motion.span>

              {/* Sliding underline indicator */}
              {activeTab === tab.id && (
                <motion.div
                  layoutId="tab-indicator"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--primary-600)] dark:bg-[var(--primary-400)]"
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}
            </motion.button>
          ))}
        </motion.div>

        {/* Content with AnimatePresence */}
        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-center py-16"
            >
              <RefreshCw className="h-8 w-8 text-[var(--text-muted)] animate-spin" />
            </motion.div>
          ) : (
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
            >
              {activeTab === 'wiki' && (
                <WikiPageList
                  pages={myWikiPages}
                  onNavigate={(id) => router.push(`/fluence/wiki/${id}`)}
                />
              )}
              {activeTab === 'blog' && (
                <BlogPostList
                  posts={myBlogPosts}
                  onNavigate={(id) => router.push(`/fluence/blogs/${id}`)}
                />
              )}
              {activeTab === 'favorites' && (
                <FavoritesList
                  favorites={myFavorites}
                  onNavigate={(fav) => {
                    if (fav.contentType === 'WIKI_PAGE') router.push(`/fluence/wiki/${fav.contentId}`);
                    else if (fav.contentType === 'BLOG_POST') router.push(`/fluence/blogs/${fav.contentId}`);
                    else if (fav.contentType === 'WIKI_SPACE') router.push(`/fluence/wiki?space=${fav.contentId}`);
                  }}
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AppLayout>
  );
}

// ─────────────────────────────────────────────────────────────
// Stat Card Component
// ─────────────────────────────────────────────────────────────

interface StatCardProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  iconColor: 'violet' | 'amber' | 'yellow';
}

function StatCard({ icon: Icon, label, value, iconColor }: StatCardProps) {
  const colorMap = {
    violet: 'bg-violet-100 dark:bg-violet-950 text-violet-600 dark:text-violet-400',
    amber: 'bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400',
    yellow: 'bg-yellow-100 dark:bg-yellow-950 text-yellow-600 dark:text-yellow-400',
  };

  return (
    <motion.div
      className={`${card.base} ${card.padding} flex items-start gap-4`}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
    >
      <div className={`${colorMap[iconColor]} rounded-lg p-3 flex-shrink-0`}>
        <Icon className={iconSize.statCard} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={typography.caption}>{label}</p>
        <p className="text-3xl font-bold tabular-nums text-[var(--text-primary)] mt-1">
          {value}
        </p>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────
// Wiki Pages List
// ─────────────────────────────────────────────────────────────

function WikiPageList({
  pages,
  onNavigate,
}: {
  pages: WikiPage[];
  onNavigate: (id: string) => void;
}) {
  if (pages.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title="No wiki pages yet"
        description="Create your first wiki page to get started"
        actionLabel="New Page"
        onAction={() => {
          // Navigate to new page (handled by parent)
        }}
      />
    );
  }

  return (
    <motion.div
      className="space-y-2"
      {...dsMotion.staggerContainer}
    >
      {pages.map((page) => (
        <motion.div key={page.id} {...dsMotion.staggerItem}>
          <ContentCard
            icon={FileText}
            iconColor="violet"
            title={page.title}
            status={page.status}
            metadata={[
              { label: new Date(page.updatedAt).toLocaleDateString(), icon: Calendar },
              { label: `${page.viewCount || 0}`, icon: Eye },
              { label: `${page.likeCount || 0}`, icon: Heart },
            ]}
            onClick={() => onNavigate(page.id)}
          />
        </motion.div>
      ))}
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────
// Blog Posts List
// ─────────────────────────────────────────────────────────────

function BlogPostList({
  posts,
  onNavigate,
}: {
  posts: BlogPost[];
  onNavigate: (id: string) => void;
}) {
  if (posts.length === 0) {
    return (
      <EmptyState
        icon={Pen}
        title="No blog posts yet"
        description="Write your first blog post to share with the team"
        actionLabel="New Post"
        onAction={() => {
          // Navigate to new post (handled by parent)
        }}
      />
    );
  }

  return (
    <motion.div
      className="space-y-2"
      {...dsMotion.staggerContainer}
    >
      {posts.map((post) => (
        <motion.div key={post.id} {...dsMotion.staggerItem}>
          <ContentCard
            icon={Pen}
            iconColor="amber"
            title={post.title}
            subtitle={post.excerpt}
            status={post.status}
            metadata={[
              { label: new Date(post.publishedAt || post.updatedAt).toLocaleDateString(), icon: Calendar },
              { label: `${post.viewCount || 0}`, icon: Eye },
              { label: `${post.likeCount || 0}`, icon: Heart },
              { label: `${post.commentCount || 0}`, icon: MessageCircle },
            ]}
            onClick={() => onNavigate(post.id)}
          />
        </motion.div>
      ))}
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────
// Favorites List
// ─────────────────────────────────────────────────────────────

function FavoritesList({
  favorites,
  onNavigate,
}: {
  favorites: FluenceFavorite[];
  onNavigate: (fav: FluenceFavorite) => void;
}) {
  if (favorites.length === 0) {
    return (
      <EmptyState
        icon={Star}
        title="No favorites yet"
        description="Star pages and posts to quickly access them here"
        actionLabel="Explore Content"
        onAction={() => {
          // Navigate to explore (handled by parent)
        }}
      />
    );
  }

  const getTypeIcon = (contentType: string) => {
    const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
      WIKI_PAGE: FileText,
      BLOG_POST: Pen,
      WIKI_SPACE: BarChart3,
    };
    return iconMap[contentType] || FileText;
  };

  const getTypeColor = (contentType: string): 'violet' | 'amber' | 'yellow' => {
    const colorMap: Record<string, 'violet' | 'amber' | 'yellow'> = {
      WIKI_PAGE: 'violet',
      BLOG_POST: 'amber',
      WIKI_SPACE: 'yellow',
    };
    return colorMap[contentType] || 'violet';
  };

  return (
    <motion.div
      className="space-y-2"
      {...dsMotion.staggerContainer}
    >
      {favorites.map((fav) => {
        const TypeIcon = getTypeIcon(fav.contentType);
        const typeColor = getTypeColor(fav.contentType);
        return (
          <motion.div key={fav.id} {...dsMotion.staggerItem}>
            <FavoriteCard
              starIcon={Star}
              typeIcon={TypeIcon}
              typeColor={typeColor}
              title={fav.contentTitle}
              contentType={fav.contentType}
              dateAdded={new Date(fav.createdAt).toLocaleDateString()}
              onClick={() => onNavigate(fav)}
            />
          </motion.div>
        );
      })}
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────
// Content Card Component
// ─────────────────────────────────────────────────────────────

interface ContentCardProps {
  icon: React.ComponentType<{ className?: string }>;
  iconColor: 'violet' | 'amber';
  title: string;
  subtitle?: string;
  status: string;
  metadata: Array<{ label: string; icon: React.ComponentType<{ className?: string }> }>;
  onClick: () => void;
}

function ContentCard({
  icon: Icon,
  iconColor,
  title,
  subtitle,
  status,
  metadata,
  onClick,
}: ContentCardProps) {
  const colorMap = {
    violet: 'text-violet-600 dark:text-violet-400',
    amber: 'text-amber-600 dark:text-amber-400',
  };

  const getStatusClass = (st: string): string => {
    if (st === 'PUBLISHED') return 'badge-status status-success';
    if (st === 'DRAFT') return 'badge-status status-warning';
    return 'badge-status status-neutral';
  };

  return (
    <motion.button
      onClick={onClick}
      className={`${card.interactive} ${card.padding} w-full text-left`}
      {...dsMotion.cardHover}
    >
      <div className="flex items-start gap-4">
        <div className={`${colorMap[iconColor]} flex-shrink-0 mt-0.5`}>
          <Icon className={iconSize.cardInline} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className={`${typography.cardTitle} truncate`}>{title}</h3>
            <span className={`${getStatusClass(status)} text-xs font-medium`}>
              {status}
            </span>
          </div>
          {subtitle && (
            <p className={`${typography.caption} mt-1 line-clamp-1`}>{subtitle}</p>
          )}
          <div className="flex items-center gap-4 mt-2 flex-wrap">
            {metadata.map((item, idx) => {
              const MetaIcon = item.icon;
              return (
                <span key={idx} className={`${typography.caption} flex items-center gap-1`}>
                  <MetaIcon className={iconSize.meta} />
                  {item.label}
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </motion.button>
  );
}

// ─────────────────────────────────────────────────────────────
// Favorite Card Component
// ─────────────────────────────────────────────────────────────

interface FavoriteCardProps {
  starIcon: React.ComponentType<{ className?: string }>;
  typeIcon: React.ComponentType<{ className?: string }>;
  typeColor: 'violet' | 'amber' | 'yellow';
  title: string;
  contentType: string;
  dateAdded: string;
  onClick: () => void;
}

function FavoriteCard({
  starIcon: StarIcon,
  typeIcon: TypeIcon,
  typeColor,
  title,
  contentType,
  dateAdded,
  onClick,
}: FavoriteCardProps) {
  const colorMap = {
    violet: 'text-violet-600 dark:text-violet-400',
    amber: 'text-amber-600 dark:text-amber-400',
    yellow: 'text-yellow-600 dark:text-yellow-400',
  };

  const typeLabel = contentType.replace(/_/g, ' ').toLowerCase();

  return (
    <motion.button
      onClick={onClick}
      className={`${card.interactive} ${card.padding} w-full text-left flex items-center gap-4`}
      {...dsMotion.cardHover}
    >
      <StarIcon className="h-5 w-5 text-yellow-500 fill-yellow-500 flex-shrink-0" />
      <div className={`${colorMap[typeColor]} flex-shrink-0`}>
        <TypeIcon className={iconSize.cardInline} />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className={`${typography.cardTitle} truncate`}>{title}</h3>
        <p className={typography.caption}>
          {typeLabel} · Added {dateAdded}
        </p>
      </div>
    </motion.button>
  );
}

// ─────────────────────────────────────────────────────────────
// Empty State Component
// ─────────────────────────────────────────────────────────────

interface EmptyStateProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
}

function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <motion.div
      className="flex flex-col items-center justify-center py-16 px-4"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="rounded-lg bg-[var(--bg-secondary)] p-6 mb-4">
        <Icon className="h-12 w-12 text-[var(--text-muted)]" />
      </div>
      <h3 className={`${typography.sectionTitle} text-center`}>{title}</h3>
      <p className={`${typography.bodySecondary} text-center mt-2 max-w-xs`}>
        {description}
      </p>
      <Button
        variant="secondary"
        size="sm"
        className="mt-4"
        onClick={onAction}
      >
        {actionLabel}
      </Button>
    </motion.div>
  );
}
