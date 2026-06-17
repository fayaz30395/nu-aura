/**
 * NAV-002 fix: /admin/users was registered in routes.ts but had no page.tsx,
 * causing a 404. User management lives at /admin/employees.
 * This server-side redirect keeps bookmarks and E2E specs working.
 */
import { redirect } from 'next/navigation';

export default function AdminUsersPage() {
  redirect('/admin/employees');
}
