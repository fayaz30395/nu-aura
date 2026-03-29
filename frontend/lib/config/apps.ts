/**
 * NU-AURA Platform App Configuration
 *
 * NU-AURA is a bundle platform containing 4 sub-apps:
 *   - NU-HRMS: Core HR management
 *   - NU-Hire: Recruitment & onboarding
 *   - NU-Grow: Performance, learning, engagement
 *   - NU-Fluence: Knowledge management & collaboration (Phase 2)
 *
 * Each app has its own sidebar sections, entry point, and RBAC gating.
 * Routes are flat (e.g., /employees, /recruitment) but mapped to apps
 * via pathname matching.
 */

// ─── App Definitions ─────────────────────────────────────────────────────────

export type AppCode = 'HRMS' | 'HIRE' | 'GROW' | 'FLUENCE';

export interface NuApp {
  code: AppCode;
  name: string;
  shortName: string;
  description: string;
  /** Entry point route when clicking the app icon */
  entryRoute: string;
  /** Gradient classes for the app icon */
  gradient: string;
  /** Lucide icon name (resolved in components) */
  iconName: string;
  /** Permission prefix — user needs at least one permission starting with this to access */
  permissionPrefixes: string[];
  /** Route prefixes that belong to this app */
  routePrefixes: string[];
  /** Whether the app is available (Phase 2 apps are not yet) */
  available: boolean;
  /** Sort order in the waffle grid */
  order: number;
}

export const PLATFORM_APPS: Record<AppCode, NuApp> = {
  HRMS: {
    code: 'HRMS',
    name: 'NU-HRMS',
    shortName: 'HRMS',
    description: 'Core HR management',
    entryRoute: '/me/dashboard',
    gradient: 'from-blue-600 to-blue-700',
    iconName: 'Users',
    permissionPrefixes: [
      'employee', 'department', 'leave', 'attendance', 'payroll',
      'compensation', 'benefit', 'expense', 'loan', 'travel',
      'asset', 'letter', 'statutory', 'lwf', 'tax', 'helpdesk', 'overtime', 'probation',
      'dashboard', 'self_service', 'document', 'calendar',
      'announcement', 'workflow', 'org_structure', 'report',
      'analytics', 'settings', 'role', 'permission', 'integration',
      'timesheet', 'project', 'resource', 'email', 'shift',
    ],
    routePrefixes: [
      '/me', '/dashboard', '/dashboards',
      '/me', '/employees', '/departments',
      '/attendance', '/leave', '/payroll',
      '/compensation', '/benefits', '/expenses',
      '/loans', '/travel', '/assets', '/letters', '/letter-templates',
      '/statutory', '/lwf', '/tax', '/helpdesk',
      '/approvals', '/announcements', '/org-chart',
      '/organization-chart', '/timesheets', '/time-tracking',
      '/projects', '/resources', '/allocations',
      '/calendar', '/nu-calendar', '/nu-drive', '/nu-mail',
      '/overtime', '/probation', '/restricted-holidays', '/biometric-devices', '/shifts',
      '/statutory-filings',
      '/reports', '/analytics', '/predictive-analytics',
      '/settings', '/admin',
    ],
    available: true,
    order: 1,
  },
  HIRE: {
    code: 'HIRE',
    name: 'NU-Hire',
    shortName: 'Hire',
    description: 'Recruitment & onboarding',
    entryRoute: '/recruitment',
    gradient: 'from-emerald-500 to-emerald-600',
    iconName: 'UserPlus',
    permissionPrefixes: [
      'recruitment', 'candidate', 'onboarding', 'exit',
      'preboarding', 'referral',
    ],
    routePrefixes: [
      '/recruitment', '/onboarding', '/preboarding',
      '/offboarding', '/offer-portal', '/careers', '/referrals',
    ],
    available: true,
    order: 2,
  },
  GROW: {
    code: 'GROW',
    name: 'NU-Grow',
    shortName: 'Grow',
    description: 'Performance, learning & engagement',
    entryRoute: '/performance',
    gradient: 'from-amber-500 to-orange-500',
    iconName: 'TrendingUp',
    permissionPrefixes: [
      'review', 'okr', 'feedback_360', 'training', 'lms',
      'recognition', 'survey', 'wellness', 'goal', 'competency', 'meeting',
    ],
    routePrefixes: [
      '/performance', '/okr', '/feedback360',
      '/training', '/learning',
      '/recognition', '/surveys', '/wellness',
      '/one-on-one',
    ],
    available: true,
    order: 3,
  },
  FLUENCE: {
    code: 'FLUENCE',
    name: 'NU-Fluence',
    shortName: 'Fluence',
    description: 'Knowledge management & collaboration',
    entryRoute: '/fluence/wiki',
    gradient: 'from-violet-500 to-purple-600',
    iconName: 'BookOpen',
    permissionPrefixes: [
      'knowledge',
    ],
    routePrefixes: [
      '/fluence/wiki',
      '/fluence/blogs',
      '/fluence/templates',
      '/fluence/drive',
      '/fluence/search',
      '/fluence/my-content',
      '/fluence/wall',
      '/fluence/dashboard',
    ],
    available: true,
    order: 4,
  },
};

/** Ordered list of apps for the waffle grid */
export const APP_LIST: NuApp[] = Object.values(PLATFORM_APPS).sort(
  (a, b) => a.order - b.order
);

// ─── Route → App Mapping ────────────────────────────────────────────────────

/**
 * Determine which app a given pathname belongs to.
 * Returns 'HRMS' as default fallback (shell routes like /home, /settings).
 */
export function getAppForRoute(pathname: string): AppCode {
  // Check specific apps first (HIRE, GROW, FLUENCE) before HRMS
  // because HRMS is the catch-all
  for (const app of [PLATFORM_APPS.HIRE, PLATFORM_APPS.GROW, PLATFORM_APPS.FLUENCE]) {
    if (app.routePrefixes.some((prefix) => pathname === prefix || pathname.startsWith(prefix + '/'))) {
      return app.code;
    }
  }

  // Default to HRMS for all other authenticated routes
  return 'HRMS';
}

// ─── Sidebar Section IDs per App ─────────────────────────────────────────────

/**
 * Maps each app to the sidebar section IDs it should display.
 * These IDs match the `id` field on SidebarSection in AppLayout.
 */
export const APP_SIDEBAR_SECTIONS: Record<AppCode, string[]> = {
  HRMS: [
    'home', 'my-space', 'people', 'hr-ops', 'finance',
    'projects-workspace', 'reports-analytics', 'admin',
  ],
  HIRE: [
    'hire-hub',
  ],
  GROW: [
    'grow-hub',
  ],
  FLUENCE: [
    'fluence-hub',
  ],
};
