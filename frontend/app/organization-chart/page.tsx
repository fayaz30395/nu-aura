'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function OrganizationChartRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/admin/org-hierarchy');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="skeuo-card p-10 text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary-600 mx-auto mb-4"></div>
        <p className="text-[var(--text-secondary)]">Redirecting to Organization Chart...</p>
      </div>
    </div>
  );
}
