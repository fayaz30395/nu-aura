'use client';

/**
 * Aura Top Bar — sticky 60px translucent header.
 *
 * Panel toggle · breadcrumbs (last crumb emphasized) · ⌘K search trigger
 * (260px, shows ⌘K kbd) · theme toggle · notification bell w/ dot · divider ·
 * user block (avatar + name + role + chevron).
 *
 * Reuses the existing NotificationDropdown / UserMenu / ThemeToggle so all
 * notification + auth wiring is preserved. Translucent surface + blur(14px),
 * token-driven. Marked client because it owns dropdown open state.
 */

import React, {memo, useCallback, useEffect, useMemo, useState} from 'react';
import Link from 'next/link';
import {Bell, ChevronRight, Menu, PanelLeft, Search} from 'lucide-react';
import {cn} from '@/lib/utils';
import {ThemeToggle} from '@/components/ui/ThemeToggle';
import {useWebSocket} from '@/lib/contexts/WebSocketContext';
import {useUnreadNotificationCount} from '@/lib/hooks/queries/useNotifications';
import {Permissions, usePermissions} from '@/lib/hooks/usePermissions';
import {NotificationDropdown} from '../NotificationDropdown';
import {UserMenu} from '../UserMenu';
import type {BreadcrumbItem} from '../Breadcrumbs';

export interface TopBarProps {
  /** Breadcrumb trail rendered inline; last crumb is emphasized. */
  breadcrumbs?: BreadcrumbItem[];
  /** Toggle the nav panel (desktop). */
  onTogglePanel?: () => void;
  /** Open the mobile drawer (hamburger, < md). */
  onMobileMenu?: () => void;
  /** Open the ⌘K command palette. */
  onOpenCommand?: () => void;
  userName?: string;
  userAvatarUrl?: string;
  userRole?: string;
  onProfile?: () => void;
  onSettings?: () => void;
  onLogout?: () => void;
}

function TopBarContent({
                         breadcrumbs = [],
                         onTogglePanel,
                         onMobileMenu,
                         onOpenCommand,
                         userName = 'User',
                         userAvatarUrl,
                         userRole = 'Employee',
                         onProfile,
                         onSettings,
                         onLogout,
                       }: TopBarProps) {
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const {isConnected: isWsConnected, unreadCount: wsUnread} = useWebSocket();
  const {hasPermission, isReady} = usePermissions();
  const canReadNotifications = isReady && hasPermission(Permissions.NOTIFICATION_VIEW);
  const {data: persistedUnread = 0} = useUnreadNotificationCount(canReadNotifications);
  const unreadCount = useMemo(() => Math.max(wsUnread, persistedUnread), [wsUnread, persistedUnread]);

  // Memoize callbacks to prevent child re-renders
  const handleNotificationClose = useCallback(() => setIsNotificationsOpen(false), []);
  const handleUserMenuClose = useCallback(() => setIsUserMenuOpen(false), []);

  // Close popovers on outside click (mirrors the legacy Header behavior).
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (!t.closest('.user-dropdown')) setIsUserMenuOpen(false);
      if (!t.closest('.notification-dropdown') && !t.closest('.notification-btn')) {
        setIsNotificationsOpen(false);
      }
    };
    if (isUserMenuOpen || isNotificationsOpen) {
      document.addEventListener('click', handler);
    }
    return () => document.removeEventListener('click', handler);
  }, [isUserMenuOpen, isNotificationsOpen]);

  return (
    <header
      role="banner"
      data-print-hide="true"
      className="sticky top-0 z-20 flex h-[60px] flex-shrink-0 items-center gap-4 border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--surface)_86%,transparent)] pl-4 pr-[22px] backdrop-blur-[14px]"
    >
      {/* Mobile hamburger (< md) */}
      <button
        type="button"
        onClick={onMobileMenu}
        aria-label="Open navigation"
        className="grid h-[34px] w-[34px] place-items-center rounded-[9px] text-[var(--text-2)] transition-[background-color] duration-[var(--t-fast)] hover:bg-[var(--surface-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] md:hidden"
      >
        <Menu className="h-[19px] w-[19px]"/>
      </button>

      {/* Desktop panel toggle (>= md) */}
      <button
        type="button"
        onClick={onTogglePanel}
        aria-label="Toggle navigation panel"
        className="hidden h-[34px] w-[34px] place-items-center rounded-[9px] text-[var(--text-2)] transition-[background-color] duration-[var(--t-fast)] hover:bg-[var(--surface-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] md:grid"
      >
        <PanelLeft className="h-[19px] w-[19px]"/>
      </button>

      {/* Breadcrumbs */}
      {breadcrumbs.length > 0 && (
        <nav
          aria-label="Breadcrumb"
          className="mr-2 flex min-w-0 flex-1 items-center gap-[7px] overflow-hidden whitespace-nowrap text-[13px]"
        >
          {breadcrumbs.map((c, i) => {
            const isLast = i === breadcrumbs.length - 1;
            return (
              <React.Fragment key={`${c.label}-${i}`}>
                {i > 0 && (
                  <span className="text-[var(--border-strong)]" aria-hidden>
                    <ChevronRight className="block h-[14px] w-[14px]"/>
                  </span>
                )}
                {c.href && !isLast ? (
                  <Link
                    href={c.href}
                    className="max-w-[18ch] truncate font-medium text-[var(--text-3)] transition-colors hover:text-[var(--text-2)]"
                  >
                    {c.label}
                  </Link>
                ) : (
                  <span
                    aria-current={isLast ? 'page' : undefined}
                    className={cn(
                      isLast
                        ? 'font-semibold text-[var(--text-1)]'
                        : 'max-w-[18ch] truncate font-medium text-[var(--text-3)]'
                    )}
                  >
                    {c.label}
                  </span>
                )}
              </React.Fragment>
            );
          })}
        </nav>
      )}

      <div className="flex-1"/>

      {/* ⌘K search trigger */}
      <button
        type="button"
        onClick={onOpenCommand}
        aria-label="Open command palette"
        className="hidden h-9 w-[260px] items-center gap-[9px] rounded-[10px] border border-[var(--border)] bg-[var(--surface-2)] pl-3 pr-2.5 text-[13px] text-[var(--text-3)] transition-[border-color,background-color] duration-[var(--t-fast)] ease-[var(--ease)] hover:border-[var(--border-strong)] hover:bg-[var(--surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] sm:flex"
      >
        <Search className="h-4 w-4"/>
        <span className="flex-1 text-left">Search or jump to…</span>
        <kbd className="num rounded-[5px] border border-[var(--border)] bg-[var(--surface)] px-1.5 py-0.5 text-[10.5px] font-semibold text-[var(--text-3)] shadow-[0_1px_0_var(--border)]">
          ⌘K
        </kbd>
      </button>

      {/* Compact search (mobile) */}
      <button
        type="button"
        onClick={onOpenCommand}
        aria-label="Search"
        className="grid h-9 w-9 place-items-center rounded-[10px] text-[var(--text-2)] transition-[background-color] duration-[var(--t-fast)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] sm:hidden"
      >
        <Search className="h-[18px] w-[18px]"/>
      </button>

      {/* Theme toggle */}
      <ThemeToggle/>

      {/* Notification bell */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsNotificationsOpen((v) => !v)}
          className="notification-btn relative grid h-9 w-9 place-items-center rounded-[10px] border border-transparent text-[var(--text-2)] transition-[background-color,color] duration-[var(--t-fast)] ease-[var(--ease)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          data-testid="notification-bell"
          data-ws-connected={isWsConnected ? 'true' : 'false'}
          aria-label="Notifications"
          aria-expanded={isNotificationsOpen}
          aria-haspopup="true"
        >
          <Bell className="h-[18px] w-[18px]"/>
          {unreadCount > 0 && (
            <span className="absolute right-2 top-[7px] h-2 w-2 rounded-full border-2 border-[var(--surface)] bg-[var(--err-fg)]"/>
          )}
        </button>
        <NotificationDropdown
          isOpen={isNotificationsOpen}
          onClose={handleNotificationClose}
        />
      </div>

      {/* Divider */}
      <div className="hidden h-[26px] w-px bg-[var(--border)] sm:block"/>

      {/* User block */}
      <UserMenu
        isOpen={isUserMenuOpen}
        onToggle={() => setIsUserMenuOpen((v) => !v)}
        onClose={handleUserMenuClose}
        userName={userName}
        userAvatar={userAvatarUrl}
        userRole={userRole}
        onProfile={onProfile}
        onSettings={onSettings}
        onLogout={onLogout}
      />
    </header>
  );
}

// Memoize TopBar to prevent re-renders from parent state changes
// Export both the memoized component and the name for backward compatibility
export const TopBar = memo(TopBarContent);
TopBar.displayName = 'TopBar';
