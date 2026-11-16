import {
  BookOpen,
  Briefcase,
  Calendar,
  CheckSquare,
  ClipboardList,
  Edit,
  FileText,
  Home,
  type LucideIcon,
  MessageCircle,
  Target,
  User,
  UserPlus,
  Users,
} from 'lucide-react';
import type {AppCode} from '@/lib/config/apps';
import {findRouteConfig} from '@/lib/config/routes';
import {Permissions} from '@/lib/hooks/usePermissions';
import {canAccessNavItem, type NavAccess, type NavGate} from '../navAccess';

export interface MobileNavEntry extends NavGate {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Gate used only when the href has no AuthGuard route config (matches the sidebar item). */
  fallbackPermission?: string;
  showApprovalBadge?: boolean;
}

export const MOBILE_NAV_ENTRIES: Record<AppCode, readonly MobileNavEntry[]> = {
  HRMS: [
    {label: 'Home', href: '/me/dashboard', icon: Home},
    {label: 'Team', href: '/employees', icon: Users},
    {label: 'Leave', href: '/leave', icon: Calendar},
    {
      label: 'Approvals',
      href: '/approvals',
      icon: CheckSquare,
      fallbackPermission: Permissions.WORKFLOW_VIEW,
      showApprovalBadge: true,
    },
    {label: 'Me', href: '/me/profile', icon: User},
  ],
  HIRE: [
    {label: 'Home', href: '/recruitment', icon: Home},
    {label: 'Jobs', href: '/recruitment/jobs', icon: Briefcase},
    {label: 'Candidates', href: '/recruitment/candidates', icon: Users},
    {label: 'Onboarding', href: '/onboarding', icon: UserPlus},
    {label: 'Me', href: '/me/profile', icon: User},
  ],
  GROW: [
    {label: 'Home', href: '/performance', icon: Home},
    {label: 'Performance', href: '/performance/reviews', icon: ClipboardList},
    {label: 'Learning', href: '/learning', icon: BookOpen},
    {label: 'OKRs', href: '/okr', icon: Target},
    {label: 'Me', href: '/me/profile', icon: User},
  ],
  FLUENCE: [
    {label: 'Home', href: '/fluence/dashboard', icon: Home},
    {label: 'Wiki', href: '/fluence/wiki', icon: FileText, fallbackPermission: Permissions.KNOWLEDGE_WIKI_READ},
    {label: 'Blogs', href: '/fluence/blogs', icon: Edit, fallbackPermission: Permissions.KNOWLEDGE_BLOG_READ},
    {label: 'Wall', href: '/fluence/wall', icon: MessageCircle, fallbackPermission: Permissions.WALL_VIEW},
    {label: 'Me', href: '/me/profile', icon: User},
  ],
};

/**
 * The gate for a bottom-nav entry: the destination's AuthGuard route config
 * when one exists, otherwise the matching sidebar item's permission.
 */
export function mobileNavGate(entry: MobileNavEntry): NavGate {
  const route = findRouteConfig(entry.href);
  if (!route) return {requiredPermission: entry.fallbackPermission};
  return {
    requiredPermission: route.permission,
    anyPermission: route.anyPermission,
    anyRole: route.anyRole,
  };
}

export interface MobileNavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: number;
}

export function buildMobileNavItems(appCode: AppCode, access: NavAccess, pendingApprovals: number): MobileNavItem[] {
  const entries = MOBILE_NAV_ENTRIES[appCode] ?? MOBILE_NAV_ENTRIES.HRMS;
  return entries
    .filter((entry) => canAccessNavItem(mobileNavGate(entry), access))
    .map(({label, href, icon, showApprovalBadge}) => ({
      label,
      href,
      icon,
      badge: showApprovalBadge && pendingApprovals > 0 ? pendingApprovals : undefined,
    }));
}
