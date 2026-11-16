import {isPublicRoute} from '@/lib/config/routes';
import {isAdminConsolePath} from './ShellContext';

// Full-bleed marketing pages (exact paths; /integrations/slack is an app page).
const MARKETING_PATHS = ['/about', '/contact', '/features', '/pricing', '/security', '/integrations'];

function matches(pathname: string, base: string): boolean {
  return pathname === base || pathname.startsWith(`${base}/`);
}

/**
 * Whether a route renders inside the persistent app shell. Public, auth and
 * marketing routes opt out, and so does /admin, which keeps its own console
 * shell (AdminClientShell) until the admin console moves onto this one.
 */
export function isShellRoute(pathname: string | null): boolean {
  if (!pathname) return false;
  if (isPublicRoute(pathname)) return false;
  if (matches(pathname, '/auth') || isAdminConsolePath(pathname)) return false;
  return !MARKETING_PATHS.includes(pathname);
}
