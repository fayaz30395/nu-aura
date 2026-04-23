'use client';
import {useEffect} from 'react';
import {useRouter} from 'next/navigation';

/** Alias: /settings/permissions → /admin/permissions (canonical location). */
export default function SettingsPermissionsRedirect(): null {
  const router = useRouter();
  useEffect(() => { router.replace('/admin/permissions'); }, [router]);
  return null;
}
