'use client';

// Duplicate route — canonical implementation lives at /performance/okr.
// Redirect so any bookmarks or old links continue to work.
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function OkrRedirectPage(): null {
  const router = useRouter();

  useEffect(() => {
    router.replace('/performance/okr');
  }, [router]);

  return null;
}
