'use client';

import {useEffect} from 'react';
import {useRouter} from 'next/navigation';
import {useAuth} from '@/lib/hooks/useAuth';

/**
 * Handles direct navigation to /auth/logout.
 * Calls the auth store logout action and redirects to login.
 * Prevents a 404 when the URL is typed or followed from an email/bookmark.
 */
export default function LogoutPage() {
  const {logout} = useAuth();
  const router = useRouter();

  useEffect(() => {
    logout().finally(() => {
      router.replace('/auth/login');
    });
  }, [logout, router]);

  return null;
}
