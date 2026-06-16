/**
 * Admin Layout — Server Component wrapper.
 *
 * Exports metadata (requires Server Component) then delegates to AdminClientShell
 * which holds the `next/dynamic` + `ssr:false` load of AdminLayoutInner.
 *
 * The split is necessary because `ssr: false` in next/dynamic is only allowed
 * inside Client Components, but metadata exports require Server Components.
 */
import type {Metadata} from 'next';
import AdminClientShell from './AdminClientShell';

export const metadata: Metadata = {title: 'Admin'};

export default function AdminLayout({children}: {children: React.ReactNode}) {
  return <AdminClientShell>{children}</AdminClientShell>;
}
