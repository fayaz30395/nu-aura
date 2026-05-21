import {redirect} from 'next/navigation';

/**
 * Redirect /approvals -> /approvals/inbox (DEF-42 + DEF-47).
 *
 * The /approvals page was a reduced-functionality duplicate of /approvals/inbox
 * that lacked permission checks and several features (delegation, WebSocket,
 * summary counts, detail panel). Consolidating to a single implementation
 * eliminates the maintenance burden and the permission gap.
 */
export default function ApprovalsRedirectPage() {
  redirect('/approvals/inbox');
}
