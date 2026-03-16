'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
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
} from 'lucide-react';
import { AppLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
  useMyWikiPages,
  useMyBlogPosts,
  useFluenceFavorites,
} from '@/lib/hooks/queries/useFluence';
import type { WikiPage, BlogPost, FluenceFavorite } from '@/lib/types/fluence';

type TabType = 'wiki' | 'blog' | 'favorites';

export default function MyContentPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('wiki');

  const { data: myWikiData, isLoading: wikiLoading } = useMyWikiPages(0, 50);
  const { data: myBlogData, isLoading: blogLoading } = useMyBlogPosts(0, 50);
  const { data: favorites, isLoading: favsLoading } = useFluenceFavorites();

  const myWikiPages = myWikiData?.content || [];
  const myBlogPosts = myBlogData?.content || [];
  const myFavorites = favorites || [];

  const tabs: { id: TabType; label: string; count: number }[] = [
    { id: 'wiki', label: 'My Wiki Pages', count: myWikiPages.length },
    { id: 'blog', label: 'My Blog Posts', count: myBlogPosts.length },
    { id: 'favorites', label: 'Favorites', count: myFavorites.length },
  ];

  const isLoading = activeTab === 'wiki' ? wikiLoading : activeTab === 'blog' ? blogLoading : favsLoading;

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">
              My Content
            </h1>
            <p className="text-[var(--text-secondary)] mt-1">
              View and manage all your posts, pages, and favorites
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              className="gap-2 bg-violet-600 hover:bg-violet-700"
              onClick={() => router.push('/fluence/wiki/new')}
            >
              <Plus className="w-4 h-4" />
              New Page
            </Button>
            <Button
              className="gap-2 bg-amber-600 hover:bg-amber-700"
              onClick={() => router.push('/fluence/blogs/new')}
            >
              <Plus className="w-4 h-4" />
              New Post
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-[var(--border-main)]">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-violet-600 text-violet-600 dark:text-violet-400'
                  : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
              }`}
            >
              {tab.label}
              <span className="ml-2 text-xs bg-[var(--bg-secondary)] px-2 py-0.5 rounded-full">
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <RefreshCw className="w-8 h-8 text-[var(--text-muted)] animate-spin" />
          </div>
        ) : (
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="space-y-4"
          >
            {activeTab === 'wiki' && (
              <WikiPageList pages={myWikiPages} onNavigate={(id) => router.push(`/fluence/wiki/${id}`)} />
            )}
            {activeTab === 'blog' && (
              <BlogPostList posts={myBlogPosts} onNavigate={(id) => router.push(`/fluence/blogs/${id}`)} />
            )}
            {activeTab === 'favorites' && (
              <FavoritesList favorites={myFavorites} onNavigate={(fav) => {
                if (fav.contentType === 'WIKI_PAGE') router.push(`/fluence/wiki/${fav.contentId}`);
                else if (fav.contentType === 'BLOG_POST') router.push(`/fluence/blogs/${fav.contentId}`);
                else if (fav.contentType === 'WIKI_SPACE') router.push(`/fluence/wiki?space=${fav.contentId}`);
              }} />
            )}
          </motion.div>
        )}
      </div>
    </AppLayout>
  );
}

function WikiPageList({ pages, onNavigate }: { pages: WikiPage[]; onNavigate: (id: string) => void }) {
  if (pages.length === 0) {
    return (
      <div className="text-center py-16">
        <FileText className="w-12 h-12 mx-auto mb-4 text-[var(--text-muted)]" />
        <h3 className="text-lg font-medium text-[var(--text-secondary)] mb-1">
          No wiki pages yet
        </h3>
        <p className="text-[var(--text-muted)]">
          Create your first wiki page to get started
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {pages.map((page) => (
        <Card key={page.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => onNavigate(page.id)}>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-violet-600 flex-shrink-0" />
                  <h3 className="font-medium text-[var(--text-primary)] truncate">{page.title}</h3>
                  <span className={`badge-status ${page.status === 'PUBLISHED' ? 'status-success' : page.status === 'DRAFT' ? 'status-warning' : 'status-neutral'} text-xs`}>
                    {page.status}
                  </span>
                </div>
                <div className="flex items-center gap-4 mt-1 text-xs text-[var(--text-muted)]">
                  <span className="flex items-center gap-1"><Calendar className="w-4 h-4" />{new Date(page.updatedAt).toLocaleDateString()}</span>
                  <span className="flex items-center gap-1"><Eye className="w-4 h-4" />{page.viewCount || 0}</span>
                  <span className="flex items-center gap-1"><Heart className="w-4 h-4" />{page.likeCount || 0}</span>
                  <span className="capitalize text-[var(--text-muted)]">{page.visibility.toLowerCase()}</span>
                </div>
              </div>
              <span className="text-xs text-[var(--text-muted)]">v{page.version}</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function BlogPostList({ posts, onNavigate }: { posts: BlogPost[]; onNavigate: (id: string) => void }) {
  if (posts.length === 0) {
    return (
      <div className="text-center py-16">
        <Pen className="w-12 h-12 mx-auto mb-4 text-[var(--text-muted)]" />
        <h3 className="text-lg font-medium text-[var(--text-secondary)] mb-1">
          No blog posts yet
        </h3>
        <p className="text-[var(--text-muted)]">
          Write your first blog post to share with the team
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {posts.map((post) => (
        <Card key={post.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => onNavigate(post.id)}>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Pen className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  <h3 className="font-medium text-[var(--text-primary)] truncate">{post.title}</h3>
                  <span className={`badge-status ${post.status === 'PUBLISHED' ? 'status-success' : post.status === 'DRAFT' ? 'status-warning' : 'status-neutral'} text-xs`}>
                    {post.status}
                  </span>
                </div>
                <p className="text-xs text-[var(--text-muted)] mt-0.5 truncate">{post.excerpt}</p>
                <div className="flex items-center gap-4 mt-1 text-xs text-[var(--text-muted)]">
                  <span className="flex items-center gap-1"><Calendar className="w-4 h-4" />{new Date(post.publishedAt || post.updatedAt).toLocaleDateString()}</span>
                  <span className="flex items-center gap-1"><Eye className="w-4 h-4" />{post.viewCount || 0}</span>
                  <span className="flex items-center gap-1"><Heart className="w-4 h-4" />{post.likeCount || 0}</span>
                  <span className="flex items-center gap-1"><MessageCircle className="w-4 h-4" />{post.commentCount || 0}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function FavoritesList({ favorites, onNavigate }: { favorites: FluenceFavorite[]; onNavigate: (fav: FluenceFavorite) => void }) {
  if (favorites.length === 0) {
    return (
      <div className="text-center py-16">
        <Star className="w-12 h-12 mx-auto mb-4 text-[var(--text-muted)]" />
        <h3 className="text-lg font-medium text-[var(--text-secondary)] mb-1">
          No favorites yet
        </h3>
        <p className="text-[var(--text-muted)]">
          Star pages and posts to quickly access them here
        </p>
      </div>
    );
  }

  const typeIcon = (type: string) => {
    switch (type) {
      case 'WIKI_PAGE': return <FileText className="w-4 h-4 text-violet-600" />;
      case 'BLOG_POST': return <Pen className="w-4 h-4 text-amber-600" />;
      case 'WIKI_SPACE': return <FileText className="w-4 h-4 text-blue-600" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-2">
      {favorites.map((fav) => (
        <Card key={fav.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => onNavigate(fav)}>
          <CardContent className="py-4">
            <div className="flex items-center gap-4">
              <Star className="w-4 h-4 text-amber-500 fill-amber-500 flex-shrink-0" />
              {typeIcon(fav.contentType)}
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-[var(--text-primary)] truncate">{fav.contentTitle}</h3>
                <p className="text-xs text-[var(--text-muted)]">
                  {fav.contentType.replace('_', ' ').toLowerCase()} · Added {new Date(fav.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
