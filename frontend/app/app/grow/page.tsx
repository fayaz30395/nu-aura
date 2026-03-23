'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** NU-Grow entry point — redirects to performance hub */
export default function GrowEntryPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/performance');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="skeuo-card p-8 text-center">
        <p className="text-[var(--text-muted)]">Redirecting...</p>
      </div>
    </div>
  );
}
