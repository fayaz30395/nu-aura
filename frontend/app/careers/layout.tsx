import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Careers | NU-AURA',
  description: 'Explore open positions and join our team. Browse job listings, learn about our culture, and apply today.',
  openGraph: {
    title: 'Careers | NU-AURA',
    description: 'Explore open positions and join our team.',
    type: 'website',
  },
};

export default function CareersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[var(--bg-card)]">
      {/* Public Navbar */}
      <header className="sticky top-0 z-50 bg-[var(--bg-card)] border-b border-[var(--border-main)] shadow-[var(--shadow-card)]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/careers" className="flex items-center gap-4">
            <Image
              src="/images/nulogic-logo.svg"
              alt="NULogic"
              width={130}
              height={38}
              className="h-8 w-auto object-contain dark:hidden"
              priority
            />
            <Image
              src="/images/nulogic-logo-white.svg"
              alt="NULogic"
              width={130}
              height={38}
              className="h-8 w-auto object-contain hidden dark:block"
              priority
            />
            <span className="text-sm font-medium text-[var(--text-muted)] border-l border-[var(--border-main)] pl-3">
              Careers
            </span>
          </Link>
          <a
            href="mailto:careers@nulogic.io"
            className="text-sm font-medium text-accent-600 hover:text-accent-700 transition-colors"
          >
            Contact HR
          </a>
        </div>
      </header>

      {children}
    </div>
  );
}
