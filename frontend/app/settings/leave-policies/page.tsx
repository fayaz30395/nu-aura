'use client';
import {useEffect} from 'react';
import {useRouter} from 'next/navigation';

/** Alias: /settings/leave-policies → /admin/leave-types (leave-type config doubles as policy). */
export default function SettingsLeavePoliciesRedirect(): null {
  const router = useRouter();
  useEffect(() => { router.replace('/admin/leave-types'); }, [router]);
  return null;
}
