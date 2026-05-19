'use client';

import {useEffect} from 'react';
import {useRouter} from 'next/navigation';

export default function TeamLeaveRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/leave/approvals');
  }, [router]);

  return (
    <main className="min-h-screen bg-[var(--bg-page)] p-6">
      <h1 className="text-xl font-bold text-[var(--text-primary)]">Team Leave</h1>
      <p className="mt-2 text-[var(--text-secondary)]">Opening leave approvals...</p>
    </main>
  );
}
