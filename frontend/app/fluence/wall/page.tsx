'use client';

import {useMemo} from 'react';
import {IconActivity, IconFlame, IconTrendingUp} from '@tabler/icons-react';
import {AppLayout} from '@/components/layout';
import {Permissions} from '@/lib/hooks/usePermissions';
import {PageDeniedFallback, PermissionGate} from '@/components/auth/PermissionGate';
import ActivityFeed from '@/components/fluence/ActivityFeed';
import {Reveal} from '@/components/motion';
import {PostComposer} from '@/components/wall';
import {useCreatePost} from '@/lib/hooks/queries/useWall';
import {useActivityFeed, useBlogPosts, useWikiPages} from '@/lib/hooks/queries/useFluence';
import {notifications} from '@mantine/notifications';
import {BookOpen, Eye, Heart, Newspaper} from 'lucide-react';
import {EmptyState} from '@/components/ui/EmptyState';
import {formatDateShort} from '@/lib/utils/format/date';

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
      <Reveal className="rounded-[var(--r-lg)] bg-[var(--surface)] border border-[var(--border)] p-4 shadow-[var(--sh-sm)]" inView>
        <div className="flex items-center gap-2 mb-4">
          <IconTrendingUp size={18} className="text-[var(--text-1)]" aria-hidden="true"/>
          <h2 className="text-sm font-semibold text-[var(--text-1)]">
            Trending Content
          </h2>
        </div>
        {trendingItems.length === 0 ? (
          <EmptyState
            icon={<IconFlame size={32} strokeWidth={1.5} aria-hidden="true"/>}
            title="No trending content yet"
            description="Start creating and sharing to see what is popular."
          />
        ) : (
          <ul className="space-y-2" aria-label="Trending content list">
            {trendingItems.map((item, idx) => (
              <li key={item.id}>
                <a
                  href={item.href}
                  className="flex items-start gap-2 p-2 rounded-[var(--r-sm)] hover:bg-[var(--surface-hover)] transition-colors group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
                  aria-label={`${item.type === 'WIKI' ? 'Wiki' : 'Blog'} #${idx + 1}: ${item.title}, ${item.viewCount} views, ${item.likeCount} likes`}
                >
                  <span className="text-xs font-bold text-[var(--text-3)] w-4 mt-0.5" aria-hidden="true">
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      {item.type === 'WIKI' ? (
                        <BookOpen className="h-3 w-3 text-[var(--accent)] flex-shrink-0"
                                  aria-hidden="true"/>
                      ) : (
                        <Newspaper className="h-3 w-3 text-[var(--accent)] flex-shrink-0"
                                   aria-hidden="true"/>
                      )}
                      <span
                        className="text-xs font-medium text-[var(--text-1)] truncate group-hover:text-[var(--accent)]">
                        {item.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-2xs text-[var(--text-3)]">
                      <span className="flex items-center gap-0.5">
                        <Eye className="h-2.5 w-2.5" aria-hidden="true"/>
                        <span className="num">{item.viewCount}</span>
                      </span>
                      <span className="flex items-center gap-0.5">
                        <Heart className="h-2.5 w-2.5" aria-hidden="true"/>
                        <span className="num">{item.likeCount}</span>
                      </span>
                    </div>
                  </div>
                </a>
              </li>
            ))}
          </ul>
        )}
      </Reveal>

      {/* Recent Activity Summary */}
      <Reveal className="rounded-[var(--r-lg)] bg-[var(--surface)] border border-[var(--border)] p-4 shadow-[var(--sh-sm)]" inView delay={0.06}>
        <div className="flex items-center gap-2 mb-4">
          <IconActivity size={18} className="text-[var(--text-1)]" aria-hidden="true"/>
          <span className="text-sm font-semibold text-[var(--text-1)]">
            Recent Activity
          </span>
        </div>
        {recentActivity.length === 0 ? (
          <EmptyState
            icon={<IconActivity size={32} strokeWidth={1.5} aria-hidden="true"/>}
            title="No recent activity"
            description="Activity from across your knowledge base will appear here."
          />
        ) : (
          <div className="space-y-2">
            {recentActivity.map((act) => (
              <div
                key={act.id}
                className="flex items-start gap-2 py-1.5 px-2 rounded-[var(--r-sm)] hover:bg-[var(--surface-hover)] transition-colors border-b border-[var(--border)] last:border-0"
              >
                <div
                  className="h-5 w-5 rounded-full bg-[var(--accent-soft)] flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-3xs font-medium text-[var(--accent)]">
                    {(act.actorName || 'U')[0].toUpperCase()}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="text-2xs text-[var(--text-2)] truncate">
                    <span className="font-medium">{act.actorName}</span>{' '}
                    {act.action.toLowerCase()}{' '}
                    <span className="font-medium">{act.contentTitle}</span>
                  </p>
                  <p className="text-3xs text-[var(--text-3)]">
                    {formatTimeAgo(act.createdAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Reveal>
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
  return formatDateShort(dateString);
}

function WallPageContent() {
  const createPost = useCreatePost();
  // Permission gate handled by <PermissionGate> wrapper in default export.

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6">
        <Reveal className="flex items-center gap-4 mb-6 flex-wrap sm:flex-nowrap">
          <IconActivity size={28} className="text-[var(--text-1)]" aria-hidden="true"/>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-[var(--text-1)]">
              Activity Wall
            </h1>
            <p className="text-sm text-[var(--text-2)]">
              See what is happening across your knowledge base
            </p>
          </div>
          <span
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-[var(--accent-soft)] text-[var(--accent)]"
            aria-label="Live updates">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--ok-fg)] animate-pulse" aria-hidden="true"/>
            Live
          </span>
        </Reveal>

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

export default function WallPage() {
  return (
    <PermissionGate anyOf={[Permissions.KNOWLEDGE_VIEW, Permissions.WALL_FLUENCE_VIEW]}
                    fallback={<PageDeniedFallback/>}>
      <WallPageContent/>
    </PermissionGate>
  );
}
