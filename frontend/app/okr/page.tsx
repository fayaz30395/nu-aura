'use client';

// Duplicate route — canonical implementation lives at /performance/okr.
// Redirect so any bookmarks or old links continue to work.
import {useEffect, useState} from 'react';
import {useRouter} from 'next/navigation';
import Link from 'next/link';

export default function OkrRedirectPage() {
  const router = useRouter();
  const [showFallback, setShowFallback] = useState(false);

  useEffect(() => {
    router.replace('/performance/okr');
    const timer = setTimeout(() => setShowFallback(true), 3000);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-main)]">
      <div className="skeuo-card p-8 text-center">
        <p className="text-[var(--text-muted)]">Redirecting...</p>
        {showFallback && (
          <Link
            href="/performance/okr"
            className="mt-4 inline-block text-sm text-accent-700 dark:text-accent-400 hover:underline cursor-pointer"
          >
            Click here if not redirected
          </Link>
        )}
      </div>
    </div>
  );
}
