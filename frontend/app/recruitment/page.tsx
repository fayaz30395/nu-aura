'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RecruitmentPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to jobs page by default
    router.replace('/recruitment/jobs');
  }, [router]);

  return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-surface-500 dark:text-surface-400">Redirecting to Job Openings...</div>
    </div>
  );
}
