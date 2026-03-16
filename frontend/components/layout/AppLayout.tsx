'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { logger } from '@/lib/utils/logger';
import { AuthGuard } from '@/components/auth/AuthGuard';
// Icons moved to menuSections.tsx — only layout-specific imports remain
import { cn } from '@/lib/utils';
import { Sidebar, SidebarItem, SidebarSection, MobileBottomNav, SIDEBAR_WIDTH_EXPANDED, SIDEBAR_WIDTH_COLLAPSED } from '@/components/ui';
import { Header } from './Header';
import type { HeaderProps } from './Header';
import { Breadcrumbs, type BreadcrumbItem } from './Breadcrumbs';
import { useAuth } from '@/lib/hooks/useAuth';
import { usePermissions, Roles } from '@/lib/hooks/usePermissions';
import { useApprovalInboxCount } from '@/lib/hooks/queries/useApprovals';
import { useActiveApp } from '@/lib/hooks/useActiveApp';
import { APP_SIDEBAR_SECTIONS } from '@/lib/config/apps';
import { buildMenuSections } from './menuSections';
import { ErrorBoundary } from '@/components/errors';
import { FluenceChatWidget } from '@/components/fluence/FluenceChatWidget';
import { Home, Users, Calendar, CheckSquare, User, Briefcase, UserPlus, ClipboardList, TrendingUp, BookOpen, Target, FileText, Edit, MessageCircle } from 'lucide-react';
import type { NavItem } from '@/components/ui/MobileBottomNav';

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

const SIDEBAR_COLLAPSED_KEY = 'sidebar-collapsed';

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
  const { logout, user, hasHydrated } = useAuth();
  const { permissions, roles, hasPermission, isReady } = usePermissions();
  const isSuperAdmin = useMemo(
    () => roles.includes(Roles.SUPER_ADMIN),
    [roles]
  );

  const { appCode } = useActiveApp();

  // Approval inbox count for sidebar badge (polls every 30s)
  const { data: inboxCounts } = useApprovalInboxCount();
  const pendingApprovalCount = inboxCounts?.pending ?? 0;

  // Initialize from localStorage to persist across page refreshes
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
      if (saved !== null) {
        return saved === 'true';
      }
    }
    return initialCollapsed ?? false;
  });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Sync sidebar collapsed state from localStorage on client hydration
    const saved = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    if (saved !== null) {
      setIsCollapsed(saved === 'true');
    }
  }, []);

  // Keyboard shortcut for toggling sidebar (Cmd/Ctrl + B)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault();
        setIsCollapsed(prev => {
          const newValue = !prev;
          onSidebarCollapsedChange?.(newValue);
          // Persist to localStorage
          if (typeof window !== 'undefined') {
            localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(newValue));
          }
          return newValue;
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onSidebarCollapsedChange]);

  const handleSidebarCollapsedChange = useCallback((collapsed: boolean) => {
    setIsCollapsed(collapsed);
    onSidebarCollapsedChange?.(collapsed);
    // Persist to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(collapsed));
    }
  }, [onSidebarCollapsedChange]);

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
  // requiredPermission they possess. Items without a requiredPermission
  // are always visible (e.g. Home).
  // Wrapped in useCallback to keep referential stability for the useMemo below.
  const filterSidebarItems = useCallback((items: SidebarItem[]): SidebarItem[] => {
    if (!isReady) {
      // During hydration, show the raw menu to avoid flicker
      return items;
    }

    // Safety net: if user is authenticated but permissions are empty (JWT/migration issue),
    // show all items rather than hiding everything except Home.
    // SuperAdmin always sees everything regardless.
    if (!isSuperAdmin && permissions.length === 0 && user) {
      return items;
    }

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

        if (visibleChildren.length === 0 && !item.href) {
          return null;
        }

        return { ...item, children: visibleChildren };
      }

      return item;
    };

    return items
      .map((item) => filterItem(item))
      .filter((item): item is SidebarItem => item !== null);
  }, [isReady, isSuperAdmin, permissions, user, hasPermission]);

  // Filter sections by active app, then by RBAC permissions, then drop empty sections.
  const allowedSectionIds = APP_SIDEBAR_SECTIONS[appCode] || APP_SIDEBAR_SECTIONS.HRMS;
  const filteredSections: SidebarSection[] = useMemo(() => {
    return menuSections
      // Show only sections that belong to the active app
      .filter((section) => allowedSectionIds.includes(section.id))
      .map((section) => ({
        ...section,
        items: filterSidebarItems(section.items),
      }))
      .filter((section) => section.items.length > 0);
  }, [menuSections, allowedSectionIds, filterSidebarItems]);

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
        { label: 'Home', href: '/me/dashboard', icon: Home },
        { label: 'Team', href: '/employees', icon: Users },
        { label: 'Leave', href: '/leave', icon: Calendar },
        { label: 'Approvals', href: '/approvals', icon: CheckSquare, badge: pendingApprovalCount || undefined },
        { label: 'Me', href: '/me/profile', icon: User },
      ],
      HIRE: [
        { label: 'Home', href: '/recruitment', icon: Home },
        { label: 'Jobs', href: '/recruitment/jobs', icon: Briefcase },
        { label: 'Candidates', href: '/recruitment/candidates', icon: Users },
        { label: 'Onboarding', href: '/onboarding', icon: UserPlus },
        { label: 'Me', href: '/me/profile', icon: User },
      ],
      GROW: [
        { label: 'Home', href: '/performance', icon: Home },
        { label: 'Performance', href: '/performance/reviews', icon: ClipboardList },
        { label: 'Learning', href: '/learning', icon: BookOpen },
        { label: 'OKRs', href: '/okr', icon: Target },
        { label: 'Me', href: '/me/profile', icon: User },
      ],
      FLUENCE: [
        { label: 'Home', href: '/fluence/wiki', icon: Home },
        { label: 'Wiki', href: '/fluence/wiki', icon: FileText },
        { label: 'Blogs', href: '/fluence/blogs', icon: Edit },
        { label: 'Wall', href: '/fluence/wall', icon: MessageCircle },
        { label: 'Me', href: '/me/profile', icon: User },
      ],
    };
    return appNavConfig[appCode] || appNavConfig.HRMS;
  }, [appCode, pendingApprovalCount]);

  return (
    <div className={cn('flex h-screen overflow-hidden bg-main text-primary transition-colors duration-300', className)}>
      {/* Sidebar — fixed width, never flexes, prevents content shift */}
      <aside
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
            className="fixed inset-0 z-30 bg-[var(--bg-overlay)] md:hidden transition-opacity duration-300"
          />
          <aside
            className="fixed inset-y-0 left-0 z-40 w-72 md:hidden transform transition-transform duration-300 ease-out animate-slide-in-left"
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
          userRole={user?.roles?.[0]?.name || 'Employee'}
          {...headerProps}
        />

        {/* Breadcrumbs */}
        {showBreadcrumbs && breadcrumbs.length > 0 && (
          <div
            className="flex-shrink-0 px-4 py-2 sm:px-6"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderBottom: '1px solid var(--border-subtle)',
            }}
          >
            <Breadcrumbs items={breadcrumbs} />
          </div>
        )}

        {/* Content Area — scrollable, fills remaining vertical space */}
        <main
          className="flex-1 overflow-auto transition-colors duration-300"
          style={{ backgroundColor: 'var(--bg-main)' }}
        >
          <AuthGuard>
            <ErrorBoundary>
              {/* Removed key={appCode} — it forced React to unmount/remount the entire
                  content tree on every app switch, defeating reconciliation and causing
                  a visible lag. The sidebar already updates per-app; content should
                  transition smoothly via React's normal diffing. */}
              <div
                className={cn(
                  'p-4 sm:p-6 lg:p-8',
                  // Bottom padding: mobile needs space for fixed bottom nav
                  'pb-24 md:pb-6 lg:pb-8'
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
      {appCode === 'FLUENCE' && <FluenceChatWidget />}
    </div>
  );
};

export { AppLayout };
