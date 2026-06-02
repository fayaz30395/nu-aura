'use client';

/**
 * Admin Layout — thin SSR-free wrapper.
 *
 * The inner layout depends heavily on Zustand's auth store (via usePermissions,
 * useAuth, useUnreadNotificationCount). Zustand's `persist` middleware calls
 * `setHasHydrated(true)` synchronously during module initialization via the
 * `onRehydrateStorage` callback, which triggers subscriber re-renders before
 * React's hydration is complete. In React 18 Concurrent Mode this races with
 * the hydration render and causes consistent "Hydration failed" errors in dev.
 *
 * Using `dynamic(() => import('./AdminLayoutInner'), { ssr: false })` prevents
 * any server-side render of the inner layout. The server sends a plain spinner,
 * the client replaces it with the full layout once the bundle loads — no
 * hydration mismatch possible because there is no server HTML to reconcile.
 */
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

export default function AdminLayout({
                                      children,
                                    }: {
  children: React.ReactNode;
}) {
  return <AdminLayoutInner>{children}</AdminLayoutInner>;
}
