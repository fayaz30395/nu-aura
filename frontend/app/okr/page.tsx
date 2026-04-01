'use client';

// Duplicate route — canonical implementation lives at /performance/okr.
// Redirect so any bookmarks or old links continue to work.
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function OkrRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/performance/okr');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="skeuo-card p-8 text-center">
        <p className="text-[var(--text-muted)]">Redirecting...</p>
      </div>
    </div>
  );
}
