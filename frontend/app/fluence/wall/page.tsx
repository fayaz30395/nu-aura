'use client';

import { IconTrendingUp, IconActivity, IconFlame } from '@tabler/icons-react';
import { AppLayout } from '@/components/layout';
import ActivityFeed from '@/components/fluence/ActivityFeed';
import { PostComposer } from '@/components/wall';
import { useCreatePost } from '@/lib/hooks/queries/useWall';
import { notifications } from '@mantine/notifications';

function TrendingSidebar() {
  return (
    <div className="skeuo-card p-4 rounded-xl">
      <div className="flex items-center gap-2 mb-4">
        <IconTrendingUp size={18} className="text-[var(--text-primary)]" />
        <span className="text-sm font-semibold text-[var(--text-primary)]">
          Trending Content
        </span>
      </div>
      <div className="flex flex-col items-center gap-2 py-4">
        <IconFlame size={32} strokeWidth={1.5} className="text-[var(--text-muted)]" />
        <p className="text-xs text-[var(--text-muted)] text-center">
          No trending content yet. Start creating and sharing to see what is popular.
        </p>
      </div>
    </div>
  );
}

export default function WallPage() {
  const createPost = useCreatePost();

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6">
        <div className="flex items-center gap-3 mb-6">
          <IconActivity size={28} className="text-[var(--text-primary)]" />
          <div>
            <h2 className="text-2xl font-bold text-[var(--text-primary)] skeuo-emboss">
              Activity Wall
            </h2>
            <p className="text-sm text-[var(--text-muted)]">
              See what is happening across your knowledge base
            </p>
          </div>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400">
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
            <ActivityFeed />
          </div>

          <div className="md:col-span-4">
            <TrendingSidebar />
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
