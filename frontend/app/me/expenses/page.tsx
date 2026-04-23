'use client';
import {useEffect} from 'react';
import {useRouter} from 'next/navigation';

/** Alias: /me/expenses → /expenses (self-scoped list rendered by the main expenses page). */
export default function MyExpensesRedirect(): null {
  const router = useRouter();
  useEffect(() => { router.replace('/expenses'); }, [router]);
  return null;
}
