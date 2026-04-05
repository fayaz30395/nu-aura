'use client';

import {useEffect} from 'react';
import {useRouter} from 'next/navigation';

/** /goals redirect — the actual page lives at /performance/goals */
export default function GoalsRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/performance/goals');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="skeuo-card p-8 text-center">
        <p className="text-[var(--text-muted)]">Redirecting...</p>
      </div>
    </div>
  );
}
