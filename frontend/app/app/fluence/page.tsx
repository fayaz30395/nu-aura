'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** NU-Fluence entry page — redirect to wiki */
export default function FluenceEntryPage() {
  const router = useRouter();

  useEffect(() => {
    router.push('/fluence/wiki');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="skeuo-card p-8 text-center">
        <p className="text-[var(--text-muted)]">Redirecting...</p>
      </div>
    </div>
  );
}
