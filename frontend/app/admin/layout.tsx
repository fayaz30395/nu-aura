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
      <div className="flex h-screen items-center justify-center bg-[var(--bg-page)]">
        <div className="h-12 w-12 rounded-full border-4 border-[var(--border-subtle)] border-t-accent-700 animate-spin" />
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
