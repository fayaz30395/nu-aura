'use client';

import {useEffect} from 'react';
import {useRouter} from 'next/navigation';
import Link from 'next/link';
import {Card, CardContent} from '@/components/ui/Card';
import {Loader2, BookOpenText, ArrowRight} from 'lucide-react';

export default function KnowledgeLegacyRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    const timer = window.setTimeout(() => {
      router.replace('/fluence/wiki');
    }, 180);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen p-6 bg-[var(--bg-app)]">
      <Card className="max-w-md rounded-[var(--r-lg)] shadow-[var(--sh-md)]">
        <CardContent className="py-10">
          <div className="flex items-start gap-4">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-[var(--r-md)] bg-[var(--accent-soft)] text-[var(--accent)]">
              <BookOpenText className="h-5 w-5"/>
            </span>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-[var(--text-1)]">
                Knowledge moved to NU-Fluence
              </p>
              <p className="text-xs text-[var(--text-3)]">
                Opening the latest knowledge workspace to keep taxonomy and permissions.
              </p>
            </div>
          </div>
          <Link
            href="/fluence/wiki"
            className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 rounded-sm"
          >
            <Loader2 className="h-4 w-4 animate-spin"/>
            Open Fluence wiki
            <ArrowRight className="h-4 w-4"/>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
