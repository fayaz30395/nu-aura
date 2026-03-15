import type { Metadata } from 'next';
import { DarkModeProvider } from '@/components/layout/DarkModeProvider';

export const metadata: Metadata = {
  title: 'Careers | NU-AURA',
  description: 'Explore open positions and join our team. Browse job listings, learn about our culture, and apply today.',
  openGraph: {
    title: 'Careers | NU-AURA',
    description: 'Explore open positions and join our team.',
    type: 'website',
  },
};

/**
 * Careers Layout — Server Component
 *
 * Public-facing layout for careers pages. Does NOT include the authenticated
 * app shell (sidebar/top nav). Rendered as a Server Component so that
 * metadata can be exported; inner DarkModeProvider is a Client Component.
 */
export default function CareersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DarkModeProvider>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        {children}
      </div>
    </DarkModeProvider>
  );
}
