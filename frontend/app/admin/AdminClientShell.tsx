'use client';

import dynamic from 'next/dynamic';

const AdminLayoutInner = dynamic(
  () => import('./AdminLayoutInner'),
  {
    ssr: false,
    loading: () => (
      <div className="page-shell-centered fade-slide-up">
        <div className="page-shell-card p-8 max-w-md text-center">
          <div
            className="mx-auto mb-4 h-14 w-14 rounded-full bg-accent-100/80 dark:bg-accent-900/30 border border-accent-300/40 dark:border-accent-500/25 flex items-center justify-center"
          >
            <div className="h-6 w-6 border-2 border-accent-300/30 border-t-accent-600 rounded-full animate-spin"/>
          </div>
          <h1 className="text-xl font-semibold text-[var(--text-primary)] mb-2">Loading admin shell</h1>
          <p className="text-sm text-[var(--text-secondary)]">
            Secure dashboard layout is initializing...
          </p>
        </div>
      </div>
    ),
  }
);

export default function AdminClientShell({children}: {children: React.ReactNode}) {
  return <AdminLayoutInner>{children}</AdminLayoutInner>;
}
