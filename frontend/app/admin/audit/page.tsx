'use client';

import {useEffect} from 'react';
import {useRouter} from 'next/navigation';

export default function AdminAuditRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/admin/system');
  }, [router]);

  return (
    <div className="page-shell-centered fade-slide-up auth-delay-20 p-6 space-y-2">
      <h1 className="text-xl font-bold text-[var(--text-primary)]">Audit Logs</h1>
      <p className="text-[var(--text-secondary)]">Opening system audit dashboard...</p>
    </div>
  );
}
