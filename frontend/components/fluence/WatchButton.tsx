'use client';

import {Bell, BellOff} from 'lucide-react';
import {motion} from 'framer-motion';
import {notifications} from '@mantine/notifications';
import {useToggleWatchWikiPage, useWatchStatus} from '@/lib/hooks/queries/useFluence';

interface WatchButtonProps {
  pageId: string;
  size?: 'sm' | 'md';
}

export function WatchButton({pageId, size = 'md'}: WatchButtonProps) {
  const {data: watchStatus, isLoading} = useWatchStatus(pageId);
  const {mutate: toggleWatch, isPending} = useToggleWatchWikiPage();

  const isWatching = watchStatus?.watching ?? false;
  const iconClass = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5';

  const handleToggle = () => {
    toggleWatch(pageId, {
      onSuccess: (data) => {
        notifications.show({
          title: data.watching ? 'Watching' : 'Unwatched',
          message: data.watching
            ? 'You will be notified of updates to this page.'
            : 'You will no longer receive notifications for this page.',
          color: data.watching ? 'blue' : 'gray',
        });
      },
      onError: () => {
        notifications.show({
          title: 'Error',
          message: 'Failed to update watch status. Please try again.',
          color: 'red',
        });
      },
    });
  };

  if (isLoading) return null;

  return (
    <motion.button
      onClick={handleToggle}
      disabled={isPending}
      whileTap={{scale: 0.95}}
      aria-label={isWatching ? 'Unwatch this page' : 'Watch this page'}
      className={`
        flex items-center gap-2 px-4 py-2 rounded-[var(--r-control)] text-sm font-medium
        transition-colors duration-150 cursor-pointer
        focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none
        disabled:opacity-50 disabled:cursor-not-allowed
        ${isWatching
        ? 'bg-[var(--accent-soft)] text-[var(--accent)] border border-[var(--accent)]'
        : 'bg-[var(--surface)] text-[var(--text-2)] border border-[var(--border-soft)] hover:bg-[var(--surface-2)]'
      }
      `}
    >
      {isWatching ? (
        <Bell className={`${iconClass} fill-current`}/>
      ) : (
        <BellOff className={iconClass}/>
      )}
      {isWatching ? 'Watching' : 'Watch'}
    </motion.button>
  );
}
