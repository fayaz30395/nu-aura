'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usePermissions, Permissions } from '@/lib/hooks/usePermissions';

/**
 * Fluence entry point — redirects to the Wiki section (default landing).
 * This matches the `entryRoute` in apps.ts config.
 */
export default function FluencePage() {
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
      return;
    }
    if (isReady && hasAccess) {
      router.replace('/fluence/wiki');
    }
  }, [router, isReady, hasAccess]);

  if (!isReady || !hasAccess) return null;

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="skeuo-card p-8 text-center">
        <p className="text-[var(--text-muted)]">Redirecting...</p>
      </div>
    </div>
  );
}
