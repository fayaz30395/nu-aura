'use client';

import React, {useCallback, useEffect, useMemo, useRef} from 'react';
import {usePathname, useRouter} from 'next/navigation';
import {logger} from '@/lib/utils/logger';
import {AuthGuard} from '@/components/auth/AuthGuard';
import {useUiStore} from '@/lib/stores/useUiStore';
// Icons moved to menuSections.tsx — only layout-specific imports remain
import {cn} from '@/lib/utils';
import {
  MobileBottomNav,
  Sidebar,
  SIDEBAR_WIDTH_COLLAPSED,
  SIDEBAR_WIDTH_EXPANDED,
  SidebarItem,
  SidebarSection
} from '@/components/ui';
import type {HeaderProps} from './Header';
import {Header} from './Header';
import {type BreadcrumbItem, Breadcrumbs} from './Breadcrumbs';
import {useAuth} from '@/lib/hooks/useAuth';
import {Permissions, Roles, usePermissions} from '@/lib/hooks/usePermissions';
import {useApprovalInboxCount} from '@/lib/hooks/queries/useApprovals';
import {useActiveApp} from '@/lib/hooks/useActiveApp';
import {APP_SIDEBAR_SECTIONS} from '@/lib/config/apps';
import {buildMenuSections} from './menuSections';
import {ErrorBoundary} from '@/components/errors';
import {FluenceChatWidget} from '@/components/fluence/FluenceChatWidget';
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

  const {appCode} = useActiveApp();

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
    router.push('/auth/login');
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
      {/* Sidebar — fixed width, never flexes, prevents content shift */}
      <aside
        data-print-hide="true"
        className="hidden md:flex flex-shrink-0 transition-[width] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]"
        style={{
          width: isCollapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH_EXPANDED,
          minWidth: isCollapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH_EXPANDED,
        }}
      >
        <Sidebar
          items={menuItems}
          sections={filteredSections}
          activeId={activeMenuItem}
          collapsed={isCollapsed}
          onCollapsedChange={handleSidebarCollapsedChange}
          onItemClick={handleMenuItemClick}
          collapsible
          variant="default"
        />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <>
          <div
            onClick={() => setIsMobileMenuOpen(false)}
            className="fixed inset-0 z-30 bg-[var(--bg-overlay)] md:hidden animate-fade-in"
          />
          <aside
            ref={mobileDrawerRef}
            role="dialog"
            aria-modal="true"
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

      {/* Main Content — fills remaining space, never overflows sidebar */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        {/* Header — fixed height */}
        <Header
          onMenuClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          showMenuButton={true}
          onProfile={handleProfile}
          onSettings={handleSettings}
          onLogout={handleLogout}
          userName={user?.fullName || 'User'}
          userAvatar={user?.profilePictureUrl}
          userRole={getBestRoleLabel(user?.roles) || 'Employee'}
          {...headerProps}
        />

        {/* Breadcrumbs */}
        {showBreadcrumbs && breadcrumbs.length > 0 && (
          <div
            className="flex-shrink-0 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]/90 backdrop-blur supports-[backdrop-filter]:bg-[var(--bg-surface)]/75"
          >
            <div className="mx-auto w-full max-w-7xl xl:max-w-[1320px] px-4 sm:px-6 lg:px-8 py-2.5">
              <Breadcrumbs items={breadcrumbs}/>
            </div>
          </div>
        )}

        {/* Content Area — scrollable, fills remaining vertical space */}
        <main
          id="main-content"
          tabIndex={0}
          aria-label="Main content"
          className="flex-1 overflow-y-auto overflow-x-hidden transition-colors duration-300 bg-transparent"
        >
          <AuthGuard>
            <ErrorBoundary resetKeys={[pathname]}>
          <div
            className={cn(
              'mx-auto w-full max-w-7xl xl:max-w-[1320px] px-4 sm:px-6 lg:px-8 py-5 md:py-7',
              'stagger-children overflow-x-hidden',
              // Bottom padding: mobile needs space for fixed bottom nav
              'pb-24 md:pb-8'
            )}
          >
                {children}
              </div>
            </ErrorBoundary>
          </AuthGuard>
        </main>

        {/* Mobile Bottom Navigation */}
        <MobileBottomNav
          items={mobileNavItems}
          onMoreClick={() => setIsMobileMenuOpen(true)}
        />
      </div>

      {/* Fluence AI Chat Widget — only on Fluence routes */}
      {appCode === 'FLUENCE' && <FluenceChatWidget/>}
    </div>
  );
};

export {AppLayout};
