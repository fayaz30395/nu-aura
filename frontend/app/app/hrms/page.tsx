'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** NU-HRMS entry point — redirects to the employee dashboard */
export default function HrmsEntryPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/me/dashboard');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="skeuo-card p-8 text-center">
        <p className="text-[var(--text-muted)]">Redirecting...</p>
      </div>
    </div>
  );
}
