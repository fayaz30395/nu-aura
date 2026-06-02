import {useEffect} from 'react';
import {useRouter} from 'next/navigation';
import Link from 'next/link';
import {Card, CardContent} from '@/components/ui/Card';
import {Loader2, BarChart3, ArrowRight} from 'lucide-react';

export default function OKRsRedirect() {
  const router = useRouter();

  useEffect(() => {
    const timer = window.setTimeout(() => {
      router.replace('/performance/okr');
    }, 180);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="page-shell-centered fade-slide-up auth-delay-20 p-6">
      <Card className="card-aura fade-slide-up auth-delay-40 float-subtle">
        <CardContent className="py-10">
          <div className="flex items-start gap-4">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-accent-100 text-accent-700 dark:bg-accent-900/30 dark:text-accent-300">
              <BarChart3 className="h-5 w-5"/>
            </span>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                OKRs lives in /performance/okr
              </p>
              <p className="text-caption">
                Redirecting to the maintained OKR experience.
              </p>
            </div>
          </div>
          <Link
            href="/performance/okr"
            className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-accent-700 hover:text-accent-800 transition-colors"
          >
            <Loader2 className="h-4 w-4 animate-spin"/>
            Continue to OKRs
            <ArrowRight className="h-4 w-4"/>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
