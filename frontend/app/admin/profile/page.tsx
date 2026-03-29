'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Admin profile is a redirect shim — user profiles live at /me/profile.
 * This prevents a dead link from the admin Header onProfile() callback.
 */
export default function AdminProfileRedirectPage(): React.ReactNode {
  const router = useRouter();

  useEffect(() => {
    router.replace('/me/profile');
  }, [router]);

  return null;
}
