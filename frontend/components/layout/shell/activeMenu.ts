// Longest-prefix map from route to sidebar item id. More specific paths win.
const PATH_TO_MENU_ID: Record<string, string> = {
  // HRMS — My Space
  '/me/dashboard': 'my-dashboard',
  '/me/profile': 'profile',
  '/me/payslips': 'payslips',
  '/me/attendance': 'my-attendance',
  '/me/leaves': 'leaves',
  '/me/documents': 'my-documents',
  '/me/skills': 'my-skills',
  '/me/assets': 'my-assets',
  // HRMS — Dashboards
  '/dashboards/executive': 'executive-dashboard',
  '/dashboard': 'dashboard',
  // HRMS — People
  '/employees/directory': 'team-directory',
  '/employees': 'employees',
  '/departments': 'departments',
  '/admin/org-hierarchy': 'org-chart',
  // HRMS — HR Ops
  '/announcements': 'announcements',
  '/approvals': 'approvals',
  '/attendance': 'attendance',
  '/shifts': 'shift-management',
  '/leave': 'leave',
  '/overtime': 'overtime',
  '/probation': 'probation',
  '/assets': 'assets',
  '/letters/templates': 'letter-templates',
  '/letters': 'letters',
  '/contracts': 'contracts',
  // HRMS — Finance
  '/payroll': 'payroll',
  '/compensation': 'compensation',
  '/benefits': 'benefits',
  '/expenses': 'expenses',
  '/loans': 'loans',
  '/travel': 'travel',
  '/statutory': 'statutory',
  '/tax': 'tax',
  // HRMS — Projects
  '/tasks': 'my-tasks',
  '/projects/psa/invoices': 'psa-invoices',
  '/projects/psa/timesheets': 'psa-timesheets',
  '/projects/psa': 'psa-projects',
  '/projects': 'projects',
  '/resources': 'resources',
  '/timesheets': 'timesheets',
  '/time-tracking': 'time-tracking',
  '/nu-calendar': 'nu-calendar',
  '/nu-drive': 'nu-drive',
  '/nu-mail': 'nu-mail',
  // HRMS — Reports & Analytics
  '/analytics/org-health': 'org-health',
  '/analytics': 'analytics',
  '/predictive-analytics': 'predictive-analytics',
  '/reports': 'reports',
  // HRMS — Admin
  '/admin/budget': 'budget-planning',
  '/admin/audit': 'admin-audit',
  '/admin/roles': 'admin-roles',
  '/admin/permissions': 'admin-permissions',
  '/admin/holidays': 'holidays',
  '/admin/leave-types': 'leave-types',
  '/admin/integrations': 'integrations',
  '/admin': 'admin-page',
  '/workflows': 'workflows',
  '/import-export': 'import-export',
  '/helpdesk': 'helpdesk-tickets',
  '/settings': 'settings',
  // NU-Hire
  '/recruitment': 'recruitment',
  '/onboarding': 'onboarding-hire',
  '/preboarding': 'preboarding-hire',
  '/offboarding': 'offboarding-group-hire',
  '/offer-portal': 'offer-portal-hire',
  '/careers': 'careers-hire',
  '/referrals': 'referrals-hire',
  // NU-Grow (more-specific paths first so prefix match picks the right item)
  '/performance/competency-matrix': 'competency-matrix-grow',
  '/performance/okr': 'okr-grow',
  '/performance/revolution': 'performance-revolution-grow',
  '/performance': 'performance-grow',
  '/okr': 'okr-grow',
  '/one-on-one': 'one-on-one-grow',
  '/training': 'training-grow',
  '/learning': 'learning-grow',
  '/recognition': 'recognition-grow',
  '/surveys': 'surveys-grow',
  '/wellness': 'wellness-grow',
  '/feedback360': 'feedback360-grow',
  // NU-Fluence (more-specific paths first)
  '/fluence/analytics': 'fluence-analytics',
  '/fluence/search': 'fluence-search',
  '/fluence/drive': 'fluence-drive',
  '/fluence/ai-chat': 'fluence-ai-chat',
  '/fluence/templates': 'fluence-templates',
  '/fluence/my-content': 'fluence-my-content',
  '/fluence/blogs': 'fluence-blogs',
  '/fluence/wall': 'fluence-wiki',
  '/fluence/wiki': 'fluence-wiki',
  '/fluence/dashboard': 'fluence-wiki',
  '/fluence': 'fluence-wiki',
};

// Maps legacy activeMenuItem IDs (pre-hub-suffix era) to current sidebar item IDs.
const LEGACY_ID_REMAP: Record<string, string> = {
  'performance': 'performance-grow',
  'learning': 'learning-grow',
  'training': 'training-grow',
  'training-catalog': 'training-grow',
  'surveys': 'surveys-grow',
  'wellness': 'wellness-grow',
  'recognition': 'recognition-grow',
  'one-on-one': 'one-on-one-grow',
  'okr': 'okr-grow',
  'competency-matrix': 'competency-matrix-grow',
  'onboarding': 'onboarding-hire',
  'preboarding': 'preboarding-hire',
  'offboarding': 'offboarding-group-hire',
  'referrals': 'referrals-hire',
};

export function resolveActiveMenuId(pathname: string, explicitId?: string): string {
  let raw = explicitId;
  if (!raw) {
    raw = 'my-dashboard';
    let bestLen = 0;
    for (const [path, id] of Object.entries(PATH_TO_MENU_ID)) {
      if ((pathname === path || pathname.startsWith(path + '/')) && path.length > bestLen) {
        bestLen = path.length;
        raw = id;
      }
    }
  }
  return LEGACY_ID_REMAP[raw] ?? raw;
}

// Role priority for display — higher-priority roles appear first
const ROLE_PRIORITY: Record<string, number> = {
  SUPER_ADMIN: 100,
  TENANT_ADMIN: 90,
  HR_ADMIN: 80,
  HR_MANAGER: 75,
  FINANCE_ADMIN: 70,
  PAYROLL_ADMIN: 65,
  DEPARTMENT_HEAD: 60,
  MANAGER: 55,
  RECRUITMENT_ADMIN: 50,
  TEAM_LEAD: 45,
  TRAINER: 40,
  RECRUITER: 35,
  EMPLOYEE: 10,
};

export function getBestRoleLabel(roles?: Array<{ code: string; name: string }>): string | undefined {
  if (!roles || roles.length === 0) return undefined;
  // Sort by priority descending and return the name of the highest-priority role
  const sorted = [...roles].sort((a, b) =>
    (ROLE_PRIORITY[b.code] ?? 20) - (ROLE_PRIORITY[a.code] ?? 20)
  );
  return sorted[0].name;
}
