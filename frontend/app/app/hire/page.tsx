'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** NU-Hire entry point — redirects to recruitment dashboard */
export default function HireEntryPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/recruitment');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="skeuo-card p-8 text-center">
        <p className="text-[var(--text-muted)]">Redirecting...</p>
      </div>
    </div>
  );
}
