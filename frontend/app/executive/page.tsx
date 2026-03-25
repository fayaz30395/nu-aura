'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** /executive redirect — the actual page lives at /dashboards/executive */
export default function ExecutiveRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboards/executive');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="skeuo-card p-8 text-center">
        <p className="text-[var(--text-muted)]">Redirecting...</p>
      </div>
    </div>
  );
}
