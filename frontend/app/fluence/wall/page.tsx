'use client';

import {useEffect, useMemo} from 'react';
import {useRouter} from 'next/navigation';
import {IconActivity, IconFlame, IconTrendingUp} from '@tabler/icons-react';
import {AppLayout} from '@/components/layout';
import {Permissions, usePermissions} from '@/lib/hooks/usePermissions';
import ActivityFeed from '@/components/fluence/ActivityFeed';
import {PostComposer} from '@/components/wall';
import {useCreatePost} from '@/lib/hooks/queries/useWall';
import {useWikiPages, useBlogPosts, useActivityFeed} from '@/lib/hooks/queries/useFluence';
import {notifications} from '@mantine/notifications';
import {Eye, Heart, BookOpen, Newspaper} from 'lucide-react';

interface TrendingItem {
  id: string;
  title: string;
  type: 'WIKI' | 'BLOG';
  viewCount: number;
  likeCount: number;
  href: string;
}

function TrendingSidebar() {
  const {data: wikiData} = useWikiPages(undefined, 0, 20);
  const {data: blogData} = useBlogPosts(0, 20);
  const {data: activityData} = useActivityFeed(0, 10);

  const trendingItems = useMemo(() => {
    const items: TrendingItem[] = [];

    (wikiData?.content || []).forEach((p) => {
      items.push({
        id: p.id,
        title: p.title,
        type: 'WIKI',
        viewCount: p.viewCount || 0,
        likeCount: p.likeCount || 0,
        href: `/fluence/wiki/${p.id}`,
      });
    });

    (blogData?.content || []).forEach((p) => {
      items.push({
        id: p.id,
        title: p.title,
        type: 'BLOG',
        viewCount: p.viewCount || 0,
        likeCount: p.likeCount || 0,
        href: `/fluence/blogs/${p.id}`,
      });
    });

    return items
      .sort((a, b) => b.viewCount + b.likeCount * 3 - (a.viewCount + a.likeCount * 3))
      .slice(0, 5);
  }, [wikiData, blogData]);

  const recentActivity = useMemo(() => {
    return (activityData?.content || []).slice(0, 5);
  }, [activityData]);

  return (
    <div className="space-y-4">
      {/* Trending Content */}
      <div className="skeuo-card p-4 rounded-xl">
        <div className="flex items-center gap-2 mb-4">
          <IconTrendingUp size={18} className="text-[var(--text-primary)]"/>
          <span className="text-sm font-semibold text-[var(--text-primary)]">
            Trending Content
          </span>
        </div>
        {trendingItems.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-4">
            <IconFlame size={32} strokeWidth={1.5} className="text-[var(--text-muted)]"/>
            <p className="text-caption text-center">
              No trending content yet. Start creating and sharing to see what is popular.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {trendingItems.map((item, idx) => (
              <a
                key={item.id}
                href={item.href}
                className="flex items-start gap-2 p-2 rounded-lg hover:bg-[var(--bg-secondary)] transition-colors cursor-pointer group"
              >
                <span className="text-xs font-bold text-[var(--text-muted)] w-4 mt-0.5">
                  {idx + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    {item.type === 'WIKI' ? (
                      <BookOpen className='h-3 w-3 text-accent flex-shrink-0'/>
                    ) : (
                      <Newspaper className='h-3 w-3 text-accent flex-shrink-0'/>
                    )}
                    <span className='text-xs font-medium text-[var(--text-primary)] truncate group-hover:text-accent'>
                      {item.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-2xs text-[var(--text-muted)]">
                    <span className="flex items-center gap-0.5">
                      <Eye className="h-2.5 w-2.5"/>
                      {item.viewCount}
                    </span>
                    <span className="flex items-center gap-0.5">
                      <Heart className="h-2.5 w-2.5"/>
                      {item.likeCount}
                    </span>
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
      {/* Recent Activity Summary */}
      <div className="skeuo-card p-4 rounded-xl">
        <div className="flex items-center gap-2 mb-4">
          <IconActivity size={18} className="text-[var(--text-primary)]"/>
          <span className="text-sm font-semibold text-[var(--text-primary)]">
            Recent Activity
          </span>
        </div>
        {recentActivity.length === 0 ? (
          <p className="text-caption text-center py-4">No recent activity</p>
        ) : (
          <div className="space-y-2">
            {recentActivity.map((act) => (
              <div
                key={act.id}
                className="flex items-start gap-2 py-1.5 border-b border-[var(--border-subtle)] last:border-0"
              >
                <div
                  className='h-5 w-5 rounded-full bg-accent-subtle flex items-center justify-center flex-shrink-0 mt-0.5'>
                  <span className='text-3xs font-medium text-accent'>
                    {(act.actorName || 'U')[0].toUpperCase()}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="text-2xs text-[var(--text-secondary)] truncate">
                    <span className="font-medium">{act.actorName}</span>{' '}
                    {act.action.toLowerCase()}{' '}
                    <span className="font-medium">{act.contentTitle}</span>
                  </p>
                  <p className="text-3xs text-[var(--text-muted)]">
                    {formatTimeAgo(act.createdAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function formatTimeAgo(dateString: string): string {
  const now = Date.now();
  const then = new Date(dateString).getTime();
  const diff = now - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export default function WallPage() {
  const router = useRouter();
  const createPost = useCreatePost();
  const {hasAnyPermission, isReady} = usePermissions();

  const hasAccess = hasAnyPermission(
    Permissions.KNOWLEDGE_VIEW,
    Permissions.WALL_FLUENCE_VIEW,
  );

  useEffect(() => {
    if (isReady && !hasAccess) {
      router.replace('/me/dashboard');
    }
  }, [isReady, hasAccess, router]);

  if (!isReady) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-[calc(100vh-200px)]">
          <div className="flex flex-col items-center gap-4">
            <IconActivity size={32} className='animate-pulse text-accent'/>
            <p className="text-[var(--text-secondary)]">Loading Activity Wall...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!hasAccess) return null;

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6">
        <div className="flex items-center gap-4 mb-6">
          <IconActivity size={28} className="text-[var(--text-primary)]"/>
          <div>
            <h2 className="text-xl font-bold text-[var(--text-primary)] skeuo-emboss">
              Activity Wall
            </h2>
            <p className="text-body-muted">
              See what is happening across your knowledge base
            </p>
          </div>
          <span
            className='inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-accent-subtle text-accent'>
            Live
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          <div className="md:col-span-8 space-y-4">
            <PostComposer
              onSubmit={(data) => {
                createPost.mutate(data, {
                  onSuccess: () => {
                    notifications.show({
                      title: 'Posted',
                      message: data.type === 'POLL'
                        ? 'Your poll has been created.'
                        : data.type === 'PRAISE'
                          ? 'Your praise has been sent.'
                          : 'Your post has been published.',
                      color: 'green',
                    });
                  },
                  onError: () => {
                    notifications.show({
                      title: 'Error',
                      message: 'Failed to create post. Please try again.',
                      color: 'red',
                    });
                  },
                });
              }}
              isSubmitting={createPost.isPending}
            />
            <ActivityFeed/>
          </div>

          <div className="md:col-span-4">
            <TrendingSidebar/>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
