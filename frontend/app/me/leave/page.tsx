'use client';
import {useEffect} from 'react';
import {useRouter} from 'next/navigation';

/** Alias: /me/leave → /me/leaves (canonical plural form exists at that path). */
export default function MyLeaveRedirect(): null {
  const router = useRouter();
  useEffect(() => { router.replace('/me/leaves'); }, [router]);
  return null;
}
