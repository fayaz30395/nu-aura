'use client';

import { useEffect, ReactElement } from 'react';
import { useRouter } from 'next/navigation';

/** NU-Fluence entry page — redirect to wiki */
export default function FluenceEntryPage(): ReactElement | null {
  const router = useRouter();

  useEffect(() => {
    router.push('/fluence/wiki');
  }, [router]);

  return null;
}
