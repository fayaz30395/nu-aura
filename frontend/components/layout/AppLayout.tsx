'use client';

import React, {lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {usePathname, useRouter, useSearchParams} from 'next/navigation';
import {AnimatePresence} from 'framer-motion';
import {logger} from '@/lib/utils/logger';
import {PageTransition} from '@/components/motion';
import {useUiStore} from '@/lib/stores/useUiStore';
// Icons moved to menuSections.tsx — only layout-specific imports remain
import {cn} from '@/lib/utils';
import {useToast} from '@/components/notifications';
import {
  MobileBottomNav,
  Sidebar,
  SidebarItem,
  SidebarSection
} from '@/components/ui';
import type {HeaderProps} from './Header';
import {type BreadcrumbItem} from './Breadcrumbs';
import {useAuth} from '@/lib/hooks/useAuth';
import {Permissions, Roles, usePermissions} from '@/lib/hooks/usePermissions';
import {useApprovalInboxCount} from '@/lib/hooks/queries/useApprovals';
import {useActiveApp} from '@/lib/hooks/useActiveApp';
import {type AppCode, APP_SIDEBAR_SECTIONS} from '@/lib/config/apps';
import {buildMenuSections} from './menuSections';
import {ProductRail} from './shell/ProductRail';
import {NavPanel} from './shell/NavPanel';
import {TopBar} from './shell/TopBar';
import {ErrorBoundary} from '@/components/errors';

// Lazy-load heavy components to reduce initial bundle
const CommandPalette = lazy(() => import('./shell/CommandPalette').then(mod => ({default: mod.CommandPalette})));
const FluenceChatWidget = lazy(() => import('@/components/fluence/FluenceChatWidget').then(mod => ({default: mod.FluenceChatWidget})));
import {
  BookOpen,
  Briefcase,
  Calendar,
  CheckSquare,
  ClipboardList,
  Edit,
  FileText,
  Home,
  MessageCircle,
  Target,
  User,
  UserPlus,
  Users
} from 'lucide-react';
import type {NavItem} from '@/components/ui/MobileBottomNav';

export interface AppLayoutProps {
  children: React.ReactNode;
  breadcrumbs?: BreadcrumbItem[];
  headerProps?: Partial<HeaderProps>;
  className?: string;
  showBreadcrumbs?: boolean;
  sidebarCollapsed?: boolean;
  onSidebarCollapsedChange?: (collapsed: boolean) => void;
  activeMenuItem?: string;
  onMenuItemClick?: (item: SidebarItem) => void;
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

function getBestRoleLabel(roles?: Array<{ code: string; name: string }>): string | undefined {
  if (!roles || roles.length === 0) return undefined;
  // Sort by priority descending and return the name of the highest-priority role
  const sorted = [...roles].sort((a, b) =>
    (ROLE_PRIORITY[b.code] ?? 20) - (ROLE_PRIORITY[a.code] ?? 20)
  );
  return sorted[0].name;
}

// Maps legacy activeMenuItem IDs (pre-hub-suffix era) to current sidebar item IDs.
// Pages that explicitly pass e.g. activeMenuItem="performance" are transparently
// remapped to 'performance-grow' without requiring mass page-file edits.
const LEGACY_ID_REMAP: Record<string, string> = {
  'performance': 'performance-grow',
  'learning': 'learning-grow',
  'training': 'training-grow',
  'surveys': 'surveys-grow',
  'wellness': 'wellness-grow',
  'recognition': 'recognition-grow',
  'one-on-one': 'one-on-one-grow',
  'okr': 'okr-grow',
  'onboarding': 'onboarding-hire',
};

const AppLayout: React.FC<AppLayoutProps> = ({
                                               children,
                                               breadcrumbs = [],
                                               headerProps = {},
                                               className,
                                               showBreadcrumbs = true,
                                               sidebarCollapsed: initialCollapsed,
                                               onSidebarCollapsedChange,
                                               activeMenuItem,
                                               onMenuItemClick,
                                             }) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const toast = useToast();
  const {logout, user} = useAuth();
  const {roles, hasPermission, isReady} = usePermissions();
  const isSuperAdmin = useMemo(
    () => roles.includes(Roles.SUPER_ADMIN),
    [roles]
  );
  const canSeeAdminSection = useMemo(
    () =>
      isSuperAdmin ||
      roles.includes(Roles.TENANT_ADMIN) ||
      roles.includes(Roles.HR_MANAGER),
    [isSuperAdmin, roles]
  );

  const {appCode, getAppEntryRoute, hasAppAccess} = useActiveApp();

  // Global ?denied=1 toast — fires whenever any route lands with this param.
  // Individual pages (recruitment, me/dashboard) also handle it; the shell-level
  // handler covers every other route so no redirect is ever silent.
  useEffect(() => {
    if (searchParams.get('denied') === '1') {
      toast.error('Access Denied', 'You do not have permission to access that page.');
    }
  }, [searchParams, toast]);

  // Approval inbox count for sidebar badge (polls every 30s)
  const canReadApprovalInbox = isReady && hasPermission(Permissions.WORKFLOW_VIEW);
  const {data: inboxCounts} = useApprovalInboxCount(canReadApprovalInbox);
  const pendingApprovalCount = inboxCounts?.pending ?? 0;

  // Cross-route UI state lives in useUiStore. The store's persist middleware
  // rehydrates `sidebarCollapsed` from the legacy `sidebar-collapsed` key on
  // mount, so existing user state survives this migration.
  const storeSidebarCollapsed = useUiStore((s) => s.sidebarCollapsed);
  const setStoreSidebarCollapsed = useUiStore((s) => s.setSidebarCollapsed);
  const isMobileMenuOpen = useUiStore((s) => s.mobileNavOpen);
  const setIsMobileMenuOpen = useUiStore((s) => s.setMobileNavOpen);

  // ⌘K command palette open state (ephemeral cross-route UI state).
  const isCommandPaletteOpen = useUiStore((s) => s.commandPaletteOpen);
  const setCommandPaletteOpen = useUiStore((s) => s.setCommandPaletteOpen);

  // Defer sidebar collapse state to after mount to prevent SSR/hydration mismatch.
  // Zustand rehydrates `sidebarCollapsed` from localStorage on the client —
  // rendering collapsed=false on the server then true on mount causes a width flash.
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => { setIsMounted(true); }, []);

  // If a parent supplies `sidebarCollapsed`, it wins; otherwise use the store.
  // Before mount, always render expanded so SSR matches the initial client paint.
  const isCollapsed = isMounted ? (initialCollapsed ?? storeSidebarCollapsed) : false;

  // Refs for mobile drawer focus management (audit N-6)
  const mobileDrawerRef = useRef<HTMLElement | null>(null);
  const previousMobileFocusRef = useRef<HTMLElement | null>(null);

  // Mobile drawer focus management — focus first link on open, restore on close (audit N-6)
  useEffect(() => {
    if (isMobileMenuOpen) {
      // Save the currently-focused element (typically the hamburger button) for restoration
      previousMobileFocusRef.current = document.activeElement as HTMLElement;
      // Focus the first link in the drawer on next paint
      requestAnimationFrame(() => {
        const firstLink = mobileDrawerRef.current?.querySelector<HTMLElement>('a, button');
        firstLink?.focus();
      });
    } else if (previousMobileFocusRef.current) {
      // Return focus to the element that triggered the drawer (usually the hamburger)
      previousMobileFocusRef.current.focus();
      previousMobileFocusRef.current = null;
    }
  }, [isMobileMenuOpen]);

  // Keyboard shortcut for toggling sidebar (Cmd/Ctrl + B)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault();
        const current = useUiStore.getState().sidebarCollapsed;
        const newValue = !current;
        setStoreSidebarCollapsed(newValue);
        onSidebarCollapsedChange?.(newValue);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onSidebarCollapsedChange, setStoreSidebarCollapsed]);

  // Global ⌘K / Ctrl+K → toggle the command palette.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        useUiStore.getState().toggleCommandPalette();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Switch products from the rail — navigate to the target app's entry route.
  const handleSelectProduct = useCallback(
    (code: AppCode) => {
      if (code === appCode) return;
      router.push(getAppEntryRoute(code));
    },
    [appCode, getAppEntryRoute, router]
  );

  const handleSidebarCollapsedChange = useCallback((collapsed: boolean) => {
    setStoreSidebarCollapsed(collapsed);
    onSidebarCollapsedChange?.(collapsed);
  }, [onSidebarCollapsedChange, setStoreSidebarCollapsed]);

  const handleMenuItemClick = useCallback((item: SidebarItem) => {
    // Link handles navigation, just notify parent
    onMenuItemClick?.(item);
  }, [onMenuItemClick]);

  const handleProfile = () => {
    router.push('/me/profile');
  };

  const handleSettings = () => {
    router.push('/settings');
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      logger.error('Logout error:', error);
    }
    router.replace('/auth/login');
  };

  // ── Sidebar Navigation ─────────────────────────────────────────────
  // Menu sections are defined in menuSections.tsx at module scope so the
  // 90+ icon elements are allocated once and reused across navigations.
  // Only the approval badge count is dynamic.
  const menuSections = useMemo(
    () => buildMenuSections(pendingApprovalCount),
    [pendingApprovalCount]
  );

  // ── Permission-based sidebar filtering ──────────────────────────────
  // SuperAdmin users see every item; other users only see items whose
  // requiredPermission they possess. During partial auth hydration, permission
  // checks stay false, so only ungated self-service items are visible.
  // Wrapped in useCallback to keep referential stability for the useMemo below.
  const filterSidebarItems = useCallback((items: SidebarItem[]): SidebarItem[] => {
    const filterItem = (item: SidebarItem): SidebarItem | null => {
      if (!isSuperAdmin) {
        if (item.requiredPermission && !hasPermission(item.requiredPermission)) {
          return null;
        }
      }

      if (item.children && item.children.length > 0) {
        const visibleChildren = item.children
          .map((child) => filterItem(child))
          .filter((child): child is SidebarItem => child !== null);

        if (visibleChildren.length === 0) {
          return null;
        }

        return {...item, children: visibleChildren};
      }

      return item;
    };

    return items
      .map((item) => filterItem(item))
      .filter((item): item is SidebarItem => item !== null);
  }, [isSuperAdmin, hasPermission]);

  // Filter sections by active app, then by RBAC permissions, then drop empty sections.
  // allowedSectionIds is derived inside useMemo so it doesn't create a new array
  // reference on every render (which would invalidate this memo on every pathname change).
  const filteredSections: SidebarSection[] = useMemo(() => {
    const allowedSectionIds = APP_SIDEBAR_SECTIONS[appCode] || APP_SIDEBAR_SECTIONS.HRMS;
    return menuSections
      // Show only sections that belong to the active app
      .filter((section) => allowedSectionIds.includes(section.id))
      .filter((section) => section.id !== 'admin' || canSeeAdminSection)
      .map((section) => ({
        ...section,
        items: filterSidebarItems(section.items),
      }))
      .filter((section) => section.items.length > 0);
  }, [menuSections, appCode, canSeeAdminSection, filterSidebarItems]);

  // Flatten sections to items for backward compatibility (memoized)
  const menuItems: SidebarItem[] = useMemo(() =>
      filteredSections.flatMap(section => section.items),
    [filteredSections]
  );

  // Auto-derive the active menu item from the current pathname using longest-prefix match.
  // Pages that explicitly pass `activeMenuItem` override this (e.g. fluence sub-pages).
  const autoActiveMenuId = useMemo(() => {
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
      '/biometric-devices': 'biometric-devices',
      '/compliance': 'compliance',
      '/allocations': 'allocations',
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
      '/feedback360': 'performance-grow',
      // NU-Fluence (more-specific paths first)
      '/fluence/analytics': 'fluence-analytics',
      '/fluence/search': 'fluence-search',
      '/fluence/drive': 'fluence-drive',
      '/fluence/templates': 'fluence-templates',
      '/fluence/my-content': 'fluence-my-content',
      '/fluence/blogs': 'fluence-blogs',
      '/fluence/wall': 'fluence-wiki',
      '/fluence/wiki': 'fluence-wiki',
      '/fluence/dashboard': 'fluence-wiki',
      '/fluence': 'fluence-wiki',
    };
    let bestId = 'my-dashboard';
    let bestLen = 0;
    for (const [path, id] of Object.entries(PATH_TO_MENU_ID)) {
      if (pathname === path || pathname.startsWith(path + '/')) {
        if (path.length > bestLen) {
          bestLen = path.length;
          bestId = id;
        }
      }
    }
    return bestId;
  }, [pathname]);

  const resolvedActiveMenuItem = useMemo(() => {
    const raw = activeMenuItem ?? autoActiveMenuId;
    return LEGACY_ID_REMAP[raw] ?? raw;
  }, [activeMenuItem, autoActiveMenuId]);

  // Mobile bottom nav items based on active app
  const mobileNavItems: NavItem[] = useMemo(() => {
    // Approval count for badge
    const appNavConfig: Record<string, NavItem[]> = {
      HRMS: [
        {label: 'Home', href: '/me/dashboard', icon: Home},
        {label: 'Team', href: '/employees', icon: Users},
        {label: 'Leave', href: '/leave', icon: Calendar},
        {label: 'Approvals', href: '/approvals', icon: CheckSquare, badge: pendingApprovalCount || undefined},
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
        {label: 'Wiki', href: '/fluence/wiki', icon: FileText},
        {label: 'Blogs', href: '/fluence/blogs', icon: Edit},
        {label: 'Wall', href: '/fluence/wall', icon: MessageCircle},
        {label: 'Me', href: '/me/profile', icon: User},
      ],
    };
    return appNavConfig[appCode] || appNavConfig.HRMS;
  }, [appCode, pendingApprovalCount]);

  return (
    <div
      className={cn(
        'relative isolate flex h-[100dvh] overflow-hidden bg-main text-primary transition-colors duration-300',
        'page-reveal',
        className
      )}
    >
      {/* Skip-link lives in the root layout (app/layout.tsx) and targets
          #main-content (the <main> below), so it bypasses the product rail +
          nav panel. No second skip-link here — one is sufficient and avoids
          redundant "Skip to content" controls in the tab order. */}

      {/* Aura desktop shell — product rail (72px) + contextual nav panel (232px).
          Hidden below md; mobile uses the drawer below. */}
      <div className="hidden md:flex">
        <ProductRail
          activeApp={appCode}
          onSelectProduct={handleSelectProduct}
          canAccess={hasAppAccess}
          onAvatar={handleProfile}
          onHelp={handleProfile}
          userName={user?.fullName || 'User'}
          userAvatarUrl={user?.profilePictureUrl}
        />
        <NavPanel
          activeApp={appCode}
          sections={filteredSections}
          activeId={resolvedActiveMenuItem}
          onItemClick={handleMenuItemClick}
          collapsed={isCollapsed}
          hasGrow={isSuperAdmin || hasAppAccess('GROW')}
        />
      </div>

      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <>
          <div
            onClick={() => setIsMobileMenuOpen(false)}
            className="fixed inset-0 z-30 bg-[var(--bg-overlay)] md:hidden animate-fade-in"
            aria-hidden="true"
          />
          <aside
            ref={mobileDrawerRef}
            role="navigation"
            aria-label="Sidebar navigation"
            className={cn(
              'fixed inset-y-0 left-0 z-40 w-72 md:hidden transform overflow-hidden border-r border-[var(--sidebar-border)]',
              'bg-[var(--bg-sidebar)] shadow-[var(--shadow-elevated)]',
              'animate-slide-in-left'
            )}
          >
            <Sidebar
              items={menuItems}
              sections={filteredSections}
              activeId={resolvedActiveMenuItem}
              collapsed={false}
              onItemClick={(item: SidebarItem) => {
                setIsMobileMenuOpen(false);
                handleMenuItemClick(item);
              }}
              collapsible={false}
              variant="default"
            />
          </aside>
        </>
      )}

      {/* Main Content — fills remaining space, never overflows the shell */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        {/* Aura sticky top bar (60px) — toggle · breadcrumbs · ⌘K · theme · bell · user */}
        <TopBar
          breadcrumbs={showBreadcrumbs ? breadcrumbs : []}
          onTogglePanel={() => handleSidebarCollapsedChange(!isCollapsed)}
          onMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          onOpenCommand={() => setCommandPaletteOpen(true)}
          onProfile={headerProps.onProfile ?? handleProfile}
          onSettings={headerProps.onSettings ?? handleSettings}
          onLogout={headerProps.onLogout ?? handleLogout}
          userName={headerProps.userName ?? user?.fullName ?? 'User'}
          userAvatarUrl={headerProps.userAvatar ?? user?.profilePictureUrl}
          userRole={headerProps.userRole ?? getBestRoleLabel(user?.roles) ?? 'Employee'}
        />

        {/* Content Area — scrollable, fills remaining vertical space.
            id="main-content" is the skip-link target for both the root layout
            skip-link and AppLayout's own skip-link, so the link bypasses the
            product rail + nav panel and lands on the actual content region.
            tabIndex=-1 lets the anchor move focus here programmatically
            without adding it to the tab order. */}
        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 overflow-y-auto overflow-x-hidden transition-colors duration-300 bg-transparent focus:outline-none"
        >
          {/* Auth is evaluated once by the AuthGuard in app/providers.tsx,
              which wraps the entire app tree. No second AuthGuard here — a
              redundant inner guard re-runs authorization + session-restore
              logic on every authed page. */}
          <ErrorBoundary resetKeys={[pathname]}>
            {/* Route-level fade+rise. AnimatePresence mode="wait" lets the
                outgoing route finish its exit before the new one enters;
                keyed on pathname. PageTransition honors reduced motion. */}
            <AnimatePresence mode="wait" initial={false}>
              <PageTransition
                key={pathname}
                className={cn(
                  'page-shell py-4 md:py-6',
                  'stagger-children overflow-x-hidden',
                  // Bottom padding: mobile needs space for fixed bottom nav
                  'pb-20 md:pb-6'
                )}
              >
                {children}
              </PageTransition>
            </AnimatePresence>
          </ErrorBoundary>
        </main>

        {/* Mobile Bottom Navigation */}
        <MobileBottomNav
          items={mobileNavItems}
          onMoreClick={() => setIsMobileMenuOpen(true)}
        />
      </div>

      {/* ⌘K Command Palette — global, navigates via the Next.js router */}
      {isCommandPaletteOpen && (
        <Suspense fallback={null}>
          <CommandPalette
            open={isCommandPaletteOpen}
            onClose={() => setCommandPaletteOpen(false)}
            sections={filteredSections}
          />
        </Suspense>
      )}

      {/* Fluence AI Chat Widget — only on Fluence routes */}
      {appCode === 'FLUENCE' && (
        <Suspense fallback={null}>
          <FluenceChatWidget/>
        </Suspense>
      )}
    </div>
  );
};

export {AppLayout};
