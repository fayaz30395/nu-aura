'use client';

import React, {useEffect, useState} from 'react';
import Image from 'next/image';
import {Bell, HelpCircle, Menu, Search} from 'lucide-react';
import dynamic from 'next/dynamic';
import {cn} from '@/lib/utils';
import AppSwitcher from '../platform/AppSwitcher';
import {ThemeToggle} from '@/components/ui/ThemeToggle';
import {useWebSocket} from '@/lib/contexts/WebSocketContext';
import {useUnreadNotificationCount} from '@/lib/hooks/queries/useNotifications';
import {Permissions, usePermissions} from '@/lib/hooks/usePermissions';
import {NotificationDropdown} from './NotificationDropdown';
import {UserMenu} from './UserMenu';

// Lazy-load GlobalSearch — 589 lines of JS that's only needed when search opens
const GlobalSearch = dynamic(() => import('./GlobalSearch').then(mod => ({default: mod.GlobalSearch})), {
  ssr: false,
  loading: () => null,
});

// ─── Props ────────────────────────────────────────────────────────────
export interface HeaderProps {
  onMenuClick?: () => void;
  showMenuButton?: boolean;
  userName?: string;
  userAvatar?: string;
  userRole?: string;
  notificationCount?: number;
  onLogout?: () => void;
  onProfile?: () => void;
  onSettings?: () => void;
  className?: string;
}

// ─── Header (Orchestrator) ────────────────────────────────────────────
const Header: React.FC<HeaderProps> = ({
                                         onMenuClick,
                                         showMenuButton = true,
                                         userName = 'John Doe',
                                         userAvatar,
                                         userRole = 'Employee',
                                         notificationCount: _notificationCount = 0,
                                         onLogout,
                                         onProfile,
                                         onSettings,
                                         className,
                                       }) => {
  const [isMounted, setIsMounted] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);

  // Unread count: use the larger of WebSocket in-memory count vs REST API persisted count
  const {isConnected: isWebSocketConnected, unreadCount: wsUnreadCount, notifications: _wsNotifications} = useWebSocket();
  const {hasPermission, isReady} = usePermissions();
  const canReadNotifications = isReady && hasPermission(Permissions.NOTIFICATION_VIEW);
  const {data: persistedUnreadCount = 0} = useUnreadNotificationCount(canReadNotifications);
  const systemUnreadCount = Math.max(wsUnreadCount, persistedUnreadCount);
  // Google notification count isn't known until the panel opens — use system count for badge
  const totalUnreadCount = systemUnreadCount;

  // Set mounted flag to avoid hydration mismatch on SSR
  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.user-dropdown')) setIsDropdownOpen(false);
      if (!target.closest('.notification-dropdown') && !target.closest('.notification-btn')) setIsNotificationsOpen(false);
    };

    if (isDropdownOpen || isNotificationsOpen) {
      document.addEventListener('click', handleClickOutside);
    }
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [isDropdownOpen, isNotificationsOpen]);

  const iconActionClass =
    'group relative inline-flex items-center justify-center overflow-hidden rounded-xl border border-transparent aura-touch-target ' +
    'text-[var(--header-text-muted)] cursor-pointer transition-all duration-250 ease-[cubic-bezier(0.16,1,0.3,1)] ' +
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 ' +
    'before:absolute before:inset-0 before:rounded-xl before:bg-[var(--header-hover-bg)] before:opacity-0 before:scale-95 ' +
    'before:transition before:duration-250 before:ease-[cubic-bezier(0.16,1,0.3,1)] ' +
    'hover:text-[var(--header-text)] hover:before:scale-100 hover:before:opacity-100 ' +
    'active:scale-[0.98] active:before:opacity-60';

  return (
    <header
      role="banner"
      className={cn(
        'sticky top-0 z-40 flex-shrink-0 border-b border-header-border',
        'h-14 md:h-14 transition-all duration-250 page-reveal',
        'bg-[var(--bg-surface)]/95 backdrop-blur-sm will-change-transform',
        className
      )}
    >
      <div className="row-between h-full px-3 sm:px-4 md:px-5">
        {/* Left Side */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Mobile hamburger */}
          {showMenuButton && (
            <button onClick={onMenuClick}
                    type="button"
                    className={`inline-flex ${iconActionClass} md:hidden`}
                    aria-label="Toggle menu"
            >
              <Menu className="h-5 w-5" aria-hidden="true"/>
            </button>
          )}

          {/* Logo — only visible on mobile (sidebar has logo on desktop) */}
          <div className="flex items-center gap-1.5 md:hidden">
            <Image
              src="/images/nulogic-logo.svg"
              alt="NULogic"
              width={100}
              height={28}
              className="h-6 w-auto object-contain dark:hidden"
              priority
            />
            <Image
              src="/images/nulogic-logo-white.svg"
              alt="NULogic"
              width={100}
              height={28}
              className="h-6 w-auto object-contain hidden dark:block"
              priority
            />
          </div>

          {/* App Switcher */}
          <nav
            aria-label="Product switcher"
            className="flex items-center rounded-xl border border-[var(--border-subtle)] px-2 py-1 bg-[var(--bg-card)]/60"
          >
            <AppSwitcher/>
          </nav>

          {/* Global Search - Desktop */}
          <div className="hidden lg:flex shrink-0">
            <GlobalSearch/>
          </div>

          {/* Mobile Search Button */}
          <button
            type="button"
            onClick={() => setIsMobileSearchOpen(true)}
            className={`inline-flex ${iconActionClass} lg:hidden`}
            aria-label="Search"
          >
            <Search className="h-5 w-5" aria-hidden="true"/>
          </button>
        </div>

        {/* Right Side - Actions */}
        <div className="flex items-center gap-1 sm:gap-2.5">
          {/* Help */}
          <button
            type="button"
            className={`hidden sm:inline-flex ${iconActionClass}`}
            aria-label="Open help"
            title="Help">
            <HelpCircle className="h-5 w-5" aria-hidden="true"/>
          </button>

          {/* Theme Toggle */}
          <ThemeToggle className="hidden sm:block"/>
          <ThemeToggle compact className="sm:hidden"/>

          {/* Notifications */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
              className={`notification-btn relative inline-flex ${iconActionClass}`}
              data-testid="notification-bell"
              data-ws-connected={isWebSocketConnected ? 'true' : 'false'}
              aria-label={`Notifications${totalUnreadCount > 0 ? `: ${totalUnreadCount} unread` : ''}`}
              aria-expanded={isNotificationsOpen}
              aria-haspopup="true"
            >
              <Bell className="h-5 w-5" aria-hidden="true"/>
              {totalUnreadCount > 0 && (
                <span
                  className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center"
                  aria-label={`${totalUnreadCount} unread notifications`}
                >
                  <span
                    data-testid="notification-count"
                    className="relative inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--btn-primary-bg)] px-1 text-2xs font-semibold text-white"
                    aria-hidden="true"
                  >
                    {totalUnreadCount > 9 ? '9+' : totalUnreadCount}
                  </span>
                </span>
              )}
              <span
                aria-label={`WebSocket status: ${isWebSocketConnected ? 'connected' : 'disconnected'}`}
                className={cn(
                  'pointer-events-none absolute -bottom-1.5 -right-1.5 h-1.5 w-1.5 rounded-full transition-opacity duration-300',
                  isWebSocketConnected ? 'bg-emerald-400 opacity-90' : 'bg-transparent opacity-0'
                )}
              />
            </button>

            <NotificationDropdown
              isOpen={isNotificationsOpen}
              onClose={() => setIsNotificationsOpen(false)}
            />
          </div>

          {/* Divider */}
          <div className="hidden sm:block w-px h-8 mx-2 bg-[var(--header-divider)]"/>

          {/* User Dropdown */}
          <UserMenu
            isOpen={isDropdownOpen}
            onToggle={() => setIsDropdownOpen(!isDropdownOpen)}
            onClose={() => setIsDropdownOpen(false)}
            userName={userName}
            userAvatar={userAvatar}
            userRole={userRole}
            onProfile={onProfile}
            onSettings={onSettings}
            onLogout={onLogout}
          />
        </div>
      </div>

      {/* Mobile Search Overlay — only render after client hydration to avoid SSR mismatch */}
        {isMounted && isMobileSearchOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-[var(--bg-overlay)] cursor-pointer"
               onClick={() => setIsMobileSearchOpen(false)}/>
          <div
            className="absolute inset-x-0 top-0 z-10 animate-slide-in-up border-b border-[var(--border-main)] px-4 py-2 bg-[var(--bg-surface)]/95 shadow-[var(--shadow-dropdown)] rounded-b-2xl backdrop-blur-md">
            <GlobalSearch onSelect={() => setIsMobileSearchOpen(false)} autoFocus/>
          </div>
        </div>
      )}
    </header>
  );
};

export {Header};
