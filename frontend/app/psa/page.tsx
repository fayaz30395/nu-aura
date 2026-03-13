'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/layout';
import { Loader2 } from 'lucide-react';

export default function PsaPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/psa/projects');
  }, [router]);

  return (
    <AppLayout>
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-3 text-muted-foreground">Loading PSA...</span>
      </div>
    </AppLayout>
  );
}
