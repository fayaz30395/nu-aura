'use client';

// Duplicate route — canonical implementation lives at /performance/360-feedback.
// Redirect so any bookmarks or old links continue to work.
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Feedback360RedirectPage(): null {
  const router = useRouter();

  useEffect(() => {
    router.replace('/performance/360-feedback');
  }, [router]);

  return null;
}
