'use client';

import React, {lazy, Suspense, useCallback, useEffect, useMemo, useRef} from 'react';
import {usePathname, useRouter} from 'next/navigation';
import {AnimatePresence} from 'framer-motion';
import {logger} from '@/lib/utils/logger';
import {PageTransition} from '@/components/motion';
import {AuthGuard} from '@/components/auth/AuthGuard';
import {useUiStore} from '@/lib/stores/useUiStore';
// Icons moved to menuSections.tsx — only layout-specific imports remain
import {cn} from '@/lib/utils';
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

const AppLayout: React.FC<AppLayoutProps> = ({
                                               children,
                                               breadcrumbs = [],
                                               headerProps = {},
                                               className,
                                               showBreadcrumbs = true,
                                               sidebarCollapsed: initialCollapsed,
                                               onSidebarCollapsedChange,
                                               activeMenuItem = 'dashboard',
                                               onMenuItemClick,
                                             }) => {
  const router = useRouter();
  const pathname = usePathname();
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

  // If a parent supplies `sidebarCollapsed`, it wins; otherwise use the store.
  const isCollapsed = initialCollapsed ?? storeSidebarCollapsed;

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
        'relative isolate flex min-h-[100dvh] overflow-hidden bg-main text-primary transition-colors duration-300',
        'page-reveal',
        className
      )}
    >
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
          activeId={activeMenuItem}
          onItemClick={handleMenuItemClick}
          collapsed={isCollapsed}
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
              activeId={activeMenuItem}
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
      <div className="flex flex-1 flex-col overflow-hidden min-w-0" role="main">
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

        {/* Content Area — scrollable, fills remaining vertical space */}
        <main
          className="flex-1 overflow-y-auto overflow-x-hidden transition-colors duration-300 bg-transparent"
          role="main"
        >
          <AuthGuard>
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
          </AuthGuard>
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
