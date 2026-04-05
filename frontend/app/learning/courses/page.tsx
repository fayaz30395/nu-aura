'use client';

// Redirect to the main learning page which includes the course catalog tab.
// Individual courses are accessible at /learning/courses/[id].
import {useEffect} from 'react';
import {useRouter} from 'next/navigation';

export default function CoursesRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/learning');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-main)]">
      <p className="text-[var(--text-muted)]">Redirecting to courses...</p>
    </div>
  );
}
