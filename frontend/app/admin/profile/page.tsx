'use client';

import {useEffect} from 'react';
import {useRouter} from 'next/navigation';
import {Card, CardContent} from '@/components/ui/Card';
import {ShieldCheck} from 'lucide-react';
import Link from 'next/link';

/**
 * Admin profile is a redirect shim — user profiles live at /me/profile.
 * This prevents a dead link from the admin Header onProfile() callback.
 */
export default function AdminProfileRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    const timer = window.setTimeout(() => {
      router.replace('/me/profile');
    }, 180);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="page-shell-centered fade-slide-up auth-delay-20 p-6">
      <Card className="card-aura fade-slide-up auth-delay-40 float-subtle">
        <CardContent className="py-10">
          <div className="flex items-center gap-4">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-accent-100 text-accent-700 dark:bg-accent-900/30 dark:text-accent-300">
              <ShieldCheck className="h-5 w-5"/>
            </span>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-[var(--text-primary)]">Redirecting your profile</p>
              <p className="text-caption">
                Admin profile is managed from your personal workspace.
              </p>
            </div>
          </div>
          <Link
            href="/me/profile"
            className="mt-4 inline-block text-sm font-medium text-accent-700 hover:text-accent-800 transition-colors"
          >
            Go to My Profile now
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
