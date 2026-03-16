'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Legacy wall route — redirects to Wiki (Fluence is document-centric, not social).
 * The Social Wall lives in HRMS (/social-wall), not in NU-Fluence.
 */
export default function WallRedirect(): null {
  const router = useRouter();

  useEffect(() => {
    router.replace('/fluence/wiki');
  }, [router]);

  return null;
}
