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
    <div className="page-shell-centered fade-slide-up auth-delay-20">
      <p className="text-[var(--text-muted)]">Redirecting to courses...</p>
    </div>
  );
}
