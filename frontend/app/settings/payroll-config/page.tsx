'use client';
import {useEffect} from 'react';
import {useRouter} from 'next/navigation';

/** Alias: /settings/payroll-config → /admin/payroll (canonical admin location). */
export default function SettingsPayrollConfigRedirect(): null {
  const router = useRouter();
  useEffect(() => { router.replace('/admin/payroll'); }, [router]);
  return null;
}
