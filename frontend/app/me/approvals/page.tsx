'use client';
import {useEffect} from 'react';
import {useRouter} from 'next/navigation';

/** Alias: /me/approvals → /approvals (inbox already scopes to the current user). */
export default function MyApprovalsRedirect(): null {
  const router = useRouter();
  useEffect(() => { router.replace('/approvals'); }, [router]);
  return null;
}
