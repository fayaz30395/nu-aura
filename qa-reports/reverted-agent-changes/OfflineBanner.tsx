'use client';

import {useSyncExternalStore} from 'react';
import {WifiOff} from 'lucide-react';
import {useQueryClient} from '@tanstack/react-query';
import {useEffect, useRef} from 'react';

function subscribe(callback: () => void) {
  window.addEventListener('online', callback);
  window.addEventListener('offline', callback);
  return () => {
    window.removeEventListener('online', callback);
    window.removeEventListener('offline', callback);
  };
}

function useIsOnline(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true, // SSR: assume online to avoid hydration flash
  );
}

/**
 * Global connectivity indicator. Shows a banner while the browser is offline and,
 * on reconnect, invalidates cached queries so stale data refreshes automatically.
 */
export function OfflineBanner() {
  const isOnline = useIsOnline();
  const queryClient = useQueryClient();
  const wasOffline = useRef(false);

  useEffect(() => {
    if (!isOnline) {
      wasOffline.current = true;
      return;
    }
    if (wasOffline.current) {
      wasOffline.current = false;
      void queryClient.invalidateQueries();
    }
  }, [isOnline, queryClient]);

  if (isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-0 top-0 z-[200] flex items-center justify-center gap-2 bg-amber-500/95 px-4 py-2 text-[13px] font-medium text-amber-950 shadow-md backdrop-blur-sm"
    >
      <WifiOff className="h-4 w-4" aria-hidden="true" />
      <span>You&rsquo;re offline. Some data may be out of date — we&rsquo;ll refresh when you reconnect.</span>
    </div>
  );
}
