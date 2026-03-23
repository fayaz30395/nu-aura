'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Fluence entry point — redirects to the Wiki section (default landing).
 * This matches the `entryRoute` in apps.ts config.
 */
export default function FluencePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/fluence/wiki');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="skeuo-card p-8 text-center">
        <p className="text-[var(--text-muted)]">Redirecting...</p>
      </div>
    </div>
  );
}
