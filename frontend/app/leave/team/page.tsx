'use client';

import {useEffect} from 'react';
import {useRouter} from 'next/navigation';
import {ListPageSkeleton} from '@/components/ui/skeletons';

export default function TeamLeaveRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/leave/approvals');
  }, [router]);

  return <ListPageSkeleton/>;
}
