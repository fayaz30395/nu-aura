'use client';

import { redirect } from 'next/navigation';

/** NU-HRMS entry point — redirects to the employee dashboard */
export default function HrmsEntryPage() {
  redirect('/me/dashboard');
}
