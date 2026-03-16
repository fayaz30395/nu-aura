'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Fluence entry point — redirects to the Wiki section (default landing).
 * This matches the `entryRoute` in apps.ts config.
 */
export default function FluencePage(): null {
  const router = useRouter();

  useEffect(() => {
    router.replace('/fluence/wiki');
  }, [router]);

  return null;
}
