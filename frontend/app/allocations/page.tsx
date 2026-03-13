'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/layout';
import { Loader2 } from 'lucide-react';

export default function AllocationsPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/allocations/summary');
  }, [router]);

  return (
    <AppLayout>
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-3 text-muted-foreground">Loading Allocations...</span>
      </div>
    </AppLayout>
  );
}
