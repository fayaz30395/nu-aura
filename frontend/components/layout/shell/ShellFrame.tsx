'use client';

import React, {lazy, Suspense, useCallback, useEffect, useMemo, useRef} from 'react';
import {usePathname, useRouter, useSearchParams} from 'next/navigation';
import {logger} from '@/lib/utils/logger';
import {cn} from '@/lib/utils';
import {useUiStore} from '@/lib/stores/useUiStore';
import {useToast} from '@/components/notifications';
import {MobileBottomNav, type SidebarSection} from '@/components/ui';
import {ErrorBoundary} from '@/components/errors';
import {useAuth} from '@/lib/hooks/useAuth';
import {Permissions, Roles, usePermissions} from '@/lib/hooks/usePermissions';
import {useApprovalInboxCount} from '@/lib/hooks/queries/useApprovals';
import {useActiveApp} from '@/lib/hooks/useActiveApp';
import {type AppCode, APP_SIDEBAR_SECTIONS} from '@/lib/config/apps';
import {buildMenuSections, filterNavItems, hasAdminConsoleAccess, type NavAccess} from '../menuSections';
import {ProductRail} from './ProductRail';
import {NavPanel} from './NavPanel';
import {TopBar} from './TopBar';
import {MobileNavDrawer} from './MobileNavDrawer';
import {buildMobileNavItems} from './mobileNav';
import {getBestRoleLabel, resolveActiveMenuId} from './activeMenu';
import type {ShellPageConfig} from './ShellContext';

const CommandPalette = lazy(() => import('./CommandPalette').then((mod) => ({default: mod.CommandPalette})));
const FluenceChatWidget = lazy(() =>
  import('@/components/fluence/FluenceChatWidget').then((mod) => ({default: mod.FluenceChatWidget}))
);

/**
 * Global ?denied=1 toast, the single source of truth for access-denied feedback.
 * Fires once per denial (useToast is referentially unstable, so the ref guards
 * re-renders) and strips the param so back/forward/refresh can't replay it.
 * Isolated behind Suspense because useSearchParams in the root shell would
 * otherwise opt every route out of static prerendering.
 */
function DeniedNotice() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const toast = useToast();
  const shownRef = useRef(false);

  useEffect(() => {
    const denied = searchParams.get('denied') === '1';
    if (denied && !shownRef.current) {
      shownRef.current = true;
      toast.error('Access Denied', 'You do not have permission to access that page.');
      const params = new URLSearchParams(searchParams.toString());
      params.delete('denied');
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, {scroll: false});
    } else if (!denied) {
      shownRef.current = false;
    }
  }, [searchParams, toast, router, pathname]);

  return null;
}

interface ShellFrameProps {
  config: ShellPageConfig;
  children: React.ReactNode;
}

/** The app chrome: product rail, nav panel, top bar, mobile nav and content region. */
export function ShellFrame({config, children}: ShellFrameProps) {
  const router = useRouter();
  const pathname = usePathname() ?? '';
  const {logout, user} = useAuth();
  const {roles, hasPermission, hasAnyRole, isReady} = usePermissions();
  const {appCode, getAppEntryRoute, hasAppAccess} = useActiveApp();

  const access: NavAccess = useMemo(() => ({roles, hasPermission, hasAnyRole}), [roles, hasPermission, hasAnyRole]);

  const canReadApprovalInbox = isReady && hasPermission(Permissions.WORKFLOW_VIEW);
  const {data: inboxCounts} = useApprovalInboxCount(canReadApprovalInbox);
  const pendingApprovalCount = inboxCounts?.pending ?? 0;

  // The shell only mounts after AuthGuard's client mount gate, so reading the
  // persisted value synchronously cannot cause a hydration mismatch.
  const isCollapsed = useUiStore((s) => s.sidebarCollapsed);
  const setSidebarCollapsed = useUiStore((s) => s.setSidebarCollapsed);
  const isMobileMenuOpen = useUiStore((s) => s.mobileNavOpen);
  const setMobileNavOpen = useUiStore((s) => s.setMobileNavOpen);
  const isCommandPaletteOpen = useUiStore((s) => s.commandPaletteOpen);
  const setCommandPaletteOpen = useUiStore((s) => s.setCommandPaletteOpen);

  const closeMobileNav = useCallback(() => setMobileNavOpen(false), [setMobileNavOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return;
      if (e.key === 'b' || e.key === 'B') {
        e.preventDefault();
        const ui = useUiStore.getState();
        ui.setSidebarCollapsed(!ui.sidebarCollapsed);
      } else if (e.key === 'k' || e.key === 'K') {
        e.preventDefault();
        useUiStore.getState().toggleCommandPalette();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSelectProduct = useCallback(
    (code: AppCode) => {
      if (code !== appCode) router.push(getAppEntryRoute(code));
    },
    [appCode, getAppEntryRoute, router]
  );

  const handleProfile = useCallback(() => router.push('/me/profile'), [router]);
  const handleSettings = useCallback(() => router.push('/settings'), [router]);
  const handleLogout = useCallback(async () => {
    try {
      await logout();
    } catch (error) {
      logger.error('Logout error:', error);
    }
    router.replace('/auth/login');
  }, [logout, router]);

  const menuSections = useMemo(() => buildMenuSections(pendingApprovalCount), [pendingApprovalCount]);
  const canSeeAdminSection = useMemo(() => hasAdminConsoleAccess(access), [access]);

  // Active app → RBAC filter → drop empty sections. During partial auth
  // hydration permission checks stay false, so only ungated items show.
  const filteredSections: SidebarSection[] = useMemo(() => {
    const allowedSectionIds = APP_SIDEBAR_SECTIONS[appCode] || APP_SIDEBAR_SECTIONS.HRMS;
    return menuSections
      .filter((section) => allowedSectionIds.includes(section.id))
      .filter((section) => section.id !== 'admin' || canSeeAdminSection)
      .map((section) => ({...section, items: filterNavItems(section.items, access)}))
      .filter((section) => section.items.length > 0);
  }, [menuSections, appCode, canSeeAdminSection, access]);

  const activeId = useMemo(
    () => resolveActiveMenuId(pathname, config.activeMenuItem),
    [pathname, config.activeMenuItem]
  );

  // Q-028: unique per-route document title from the active nav item's label.
  useEffect(() => {
    const findLabel = (items: SidebarSection['items']): string | undefined => {
      for (const item of items) {
        if (item.id === activeId) return item.label;
        const nested = item.children && findLabel(item.children);
        if (nested) return nested;
      }
      return undefined;
    };
    for (const section of menuSections) {
      const label = findLabel(section.items);
      if (label) {
        document.title = `${label} | NU-AURA`;
        return;
      }
    }
  }, [activeId, menuSections]);

  const mobileNavItems = useMemo(
    () => buildMobileNavItems(appCode, access, pendingApprovalCount),
    [appCode, access, pendingApprovalCount]
  );

  const hasGrow = roles.includes(Roles.SUPER_ADMIN) || hasAppAccess('GROW');
  const {headerProps} = config;

  return (
    <div
      className={cn(
        'relative isolate flex h-[100dvh] overflow-hidden bg-main text-primary',
        config.className
      )}
    >
      <Suspense fallback={null}>
        <DeniedNotice/>
      </Suspense>

      {/* Desktop: product rail + contextual nav panel. Below md the drawer takes over. */}
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
          activeId={activeId}
          collapsed={isCollapsed}
          hasGrow={hasGrow}
        />
      </div>

      <MobileNavDrawer
        open={isMobileMenuOpen}
        onClose={closeMobileNav}
        activeApp={appCode}
        sections={filteredSections}
        activeId={activeId}
        hasGrow={hasGrow}
      />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <TopBar
          breadcrumbs={config.showBreadcrumbs ? config.breadcrumbs : []}
          onTogglePanel={() => setSidebarCollapsed(!isCollapsed)}
          onMobileMenu={() => setMobileNavOpen(!isMobileMenuOpen)}
          onOpenCommand={() => setCommandPaletteOpen(true)}
          onProfile={headerProps.onProfile ?? handleProfile}
          onSettings={headerProps.onSettings ?? handleSettings}
          onLogout={headerProps.onLogout ?? handleLogout}
          userName={headerProps.userName ?? user?.fullName ?? 'User'}
          userAvatarUrl={headerProps.userAvatar ?? user?.profilePictureUrl}
          userRole={headerProps.userRole ?? getBestRoleLabel(user?.roles) ?? 'Employee'}
        />

        {/* Skip-link target from app/layout.tsx; tabIndex=-1 takes focus without joining the tab order. */}
        <main
          id="main-content"
          tabIndex={-1}
          data-altitude={config.altitude}
          className="flex-1 overflow-y-auto overflow-x-hidden bg-transparent focus:outline-none"
        >
          <ErrorBoundary resetKeys={[pathname]}>
            <div key={pathname} className="page-shell motion-rise overflow-x-hidden py-4 pb-20 md:py-6 md:pb-6">
              {children}
            </div>
          </ErrorBoundary>
        </main>

        <MobileBottomNav items={mobileNavItems} onMoreClick={() => setMobileNavOpen(true)}/>
      </div>

      {isCommandPaletteOpen && (
        <Suspense fallback={null}>
          <CommandPalette
            open={isCommandPaletteOpen}
            onClose={() => setCommandPaletteOpen(false)}
            sections={filteredSections}
          />
        </Suspense>
      )}

      {appCode === 'FLUENCE' && (
        <Suspense fallback={null}>
          <FluenceChatWidget/>
        </Suspense>
      )}
    </div>
  );
}
