'use client';

import {useEffect} from 'react';
import {useRouter} from 'next/navigation';
import Link from 'next/link';
import {Card, CardContent} from '@/components/ui/Card';
import {Loader2, ArrowRight, Home} from 'lucide-react';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    const timer = window.setTimeout(() => {
      router.replace('/auth/login');
    }, 180);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="page-shell-centered fade-slide-up auth-delay-20 p-6">
      <Card className="card-aura fade-slide-up auth-delay-40 float-subtle">
        <CardContent className="py-10">
          <div className="flex items-start gap-4">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-accent-100 text-accent-700 dark:bg-accent-900/30 dark:text-accent-300" aria-hidden="true">
              <Home className="h-5 w-5"/>
            </span>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-[var(--text-primary)]">Welcome to NU-AURA</p>
              <p className="text-caption">
                The app is directing you to the secure sign-in flow.
              </p>
            </div>
          </div>
          <Link
            href="/auth/login"
            className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-accent-700 hover:text-accent-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 rounded-aura-sm"
          >
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true"/>
            Continue to Sign In
            <ArrowRight className="h-4 w-4" aria-hidden="true"/>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
