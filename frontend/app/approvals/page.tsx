'use client';

import {useEffect} from 'react';
import {useRouter} from 'next/navigation';
import Link from 'next/link';
import {Card, CardContent} from '@/components/ui/Card';
import {Loader2, MessageSquareText, ArrowRight} from 'lucide-react';
import {Reveal} from '@/components/motion';

export default function ApprovalsRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    const timer = window.setTimeout(() => {
      router.replace('/approvals/inbox');
    }, 180);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="min-h-screen bg-[var(--bg-app)] flex items-center justify-center p-6">
      <Reveal>
        <Card className="w-full max-w-sm shadow-[var(--sh-sm)] hover:shadow-[var(--sh-md)] transition-shadow duration-[var(--t-base)] rounded-[var(--r-lg)]">
          <CardContent className="py-10 px-6">
            <div className="flex items-start gap-4 mb-6">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-[var(--r-md)] bg-[var(--accent-soft)] text-[var(--accent)]">
                <MessageSquareText className="h-5 w-5"/>
              </span>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-[var(--text-1)]">
                  Approvals moved to the inbox
                </p>
                <p className="text-xs text-[var(--text-3)]">
                  You are being redirected to the unified approvals center.
                </p>
              </div>
            </div>
            <Link
              href="/approvals/inbox"
              className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors duration-[var(--t-fast)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 rounded-[var(--r-control)]"
              aria-label="Continue to approvals inbox"
            >
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true"/>
              Continue to inbox
              <ArrowRight className="h-4 w-4" aria-hidden="true"/>
            </Link>
          </CardContent>
        </Card>
      </Reveal>
    </div>
  );
}
