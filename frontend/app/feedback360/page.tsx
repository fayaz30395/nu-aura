'use client';

// Duplicate route: canonical implementation lives at /performance/360-feedback.
import {useEffect} from 'react';
import {useRouter} from 'next/navigation';
import Link from 'next/link';
import {Card, CardContent} from '@/components/ui/Card';
import {Loader2, MessageSquareQuote, ArrowRight} from 'lucide-react';

export default function Feedback360RedirectPage() {
  const router = useRouter();

  useEffect(() => {
    const timer = window.setTimeout(() => {
      router.replace('/performance/360-feedback');
    }, 180);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="page-shell-centered fade-slide-up auth-delay-20 p-6">
      <Card className="card-aura fade-slide-up auth-delay-40 float-subtle">
        <CardContent className="py-10">
          <div className="flex items-start gap-4">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-accent-100 text-accent-700 dark:bg-accent-900/30 dark:text-accent-300">
              <MessageSquareQuote className="h-5 w-5"/>
            </span>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                360 feedback route is consolidated
              </p>
              <p className="text-caption">
                The modern workflow is at performance/360-feedback.
              </p>
            </div>
          </div>
          <Link
            href="/performance/360-feedback"
            className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-accent-700 hover:text-accent-800 transition-colors"
          >
            <Loader2 className="h-4 w-4 animate-spin"/>
            Continue to 360 feedback
            <ArrowRight className="h-4 w-4"/>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
