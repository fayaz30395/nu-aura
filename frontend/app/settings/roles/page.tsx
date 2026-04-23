'use client';
import {useEffect} from 'react';
import {useRouter} from 'next/navigation';

/** Alias: /settings/roles → /admin/roles (canonical location). */
export default function SettingsRolesRedirect(): null {
  const router = useRouter();
  useEffect(() => { router.replace('/admin/roles'); }, [router]);
  return null;
}
