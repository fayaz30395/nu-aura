'use client';

import { redirect } from 'next/navigation';

/** NU-HRMS entry point — redirects to the HRMS home dashboard */
export default function HrmsEntryPage() {
  redirect('/home');
}
