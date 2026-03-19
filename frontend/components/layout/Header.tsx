'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Bell, Menu, HelpCircle, Search } from 'lucide-react';
import dynamic from 'next/dynamic';

// Lazy-load GlobalSearch — 589 lines of JS that's only needed when search opens
const GlobalSearch = dynamic(() => import('./GlobalSearch').then(mod => ({ default: mod.GlobalSearch })), {
  ssr: false,
  loading: () => null,
});
import { cn } from '@/lib/utils';
import AppSwitcher from '../platform/AppSwitcher';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { useWebSocket } from '@/lib/contexts/WebSocketContext';
import { useUnreadNotificationCount } from '@/lib/hooks/queries/useNotifications';
import { NotificationDropdown } from './NotificationDropdown';
import { UserMenu } from './UserMenu';

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
  const router = useRouter();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [, setMounted] = useState(false);

  // Unread count: use the larger of WebSocket in-memory count vs REST API persisted count
  const { unreadCount: wsUnreadCount, notifications: _wsNotifications } = useWebSocket();
  const { data: persistedUnreadCount = 0 } = useUnreadNotificationCount();
  const systemUnreadCount = Math.max(wsUnreadCount, persistedUnreadCount);
  // Google notification count isn't known until the panel opens — use system count for badge
  const totalUnreadCount = systemUnreadCount;

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.user-dropdown')) setIsDropdownOpen(false);
      if (!target.closest('.notification-dropdown') && !target.closest('.notification-btn')) setIsNotificationsOpen(false);
    };

    if (isDropdownOpen || isNotificationsOpen) {
      document.addEventListener('click', handleClickOutside);
    }
    return () => { document.removeEventListener('click', handleClickOutside); };
  }, [isDropdownOpen, isNotificationsOpen]);

  return (
    <header
      className={cn(
        'sticky top-0 z-40 flex-shrink-0 glass-aura border-b transition-all duration-300',
        'h-16',
        className
      )}
    >
      <div className="flex items-center justify-between h-full px-4 sm:px-6">
        {/* Left Side */}
        <div className="flex items-center gap-2">
          {/* Mobile hamburger */}
          {showMenuButton && (
            <button
              onClick={onMenuClick}
              className="p-2 rounded-xl text-[var(--header-text-muted)] hover:text-[var(--header-text)] hover:bg-[var(--header-hover-bg)] transition-all md:hidden min-w-[40px] min-h-[40px] flex items-center justify-center"
              aria-label="Toggle menu"
            >
              <Menu className="h-5 w-5" />
            </button>
          )}

          {/* Logo — only visible on mobile (sidebar has logo on desktop) */}
          <div className="flex items-center gap-2 md:hidden">
            <Image
              src="/images/logo.png"
              alt="NuLogic"
              width={120}
              height={32}
              className="h-7 w-auto object-contain"
              priority
            />
          </div>

          {/* App Switcher */}
          <div className="flex items-center">
            <AppSwitcher />
          </div>

          {/* Global Search - Desktop */}
          <div className="hidden lg:flex">
            <GlobalSearch />
          </div>

          {/* Mobile Search Button */}
          <button
            onClick={() => setIsMobileSearchOpen(true)}
            className="lg:hidden p-2.5 rounded-xl text-[var(--header-text-muted)] hover:text-[var(--header-text)] hover:bg-[var(--header-hover-bg)] transition-all min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Search"
          >
            <Search className="h-5 w-5" />
          </button>
        </div>

        {/* Right Side - Actions */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Help */}
          <button className="hidden sm:flex p-2.5 rounded-xl text-[var(--header-text-muted)] hover:text-[var(--header-text)] hover:bg-[var(--header-hover-bg)] transition-all" aria-label="Help">
            <HelpCircle className="h-5 w-5" />
          </button>

          {/* Theme Toggle */}
          <ThemeToggle className="hidden sm:block" />
          <ThemeToggle compact className="sm:hidden" />

          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
              className="notification-btn relative p-2.5 rounded-xl text-[var(--header-text-muted)] hover:text-[var(--header-text)] hover:bg-[var(--header-hover-bg)] transition-all"
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5" />
              {totalUnreadCount > 0 && (
                <span className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary-400 opacity-75" />
                  <span className="relative inline-flex h-4 w-4 items-center justify-center rounded-full bg-gradient-to-r from-primary-500 to-primary-600 text-xs font-bold text-white">
                    {totalUnreadCount > 9 ? '9+' : totalUnreadCount}
                  </span>
                </span>
              )}
            </button>

            <NotificationDropdown
              isOpen={isNotificationsOpen}
              onClose={() => setIsNotificationsOpen(false)}
            />
          </div>

          {/* Divider */}
          <div className="hidden sm:block w-px h-8 mx-2" style={{ backgroundColor: 'var(--header-divider)' }} />

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

      {/* Mobile Search Overlay */}
      {isMobileSearchOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-[var(--bg-overlay)]" onClick={() => setIsMobileSearchOpen(false)} />
          <div className="absolute top-0 left-0 right-0 glass-midnight p-4 shadow-xl animate-fade-in-down">
            <GlobalSearch onSelect={() => setIsMobileSearchOpen(false)} autoFocus />
          </div>
        </div>
      )}
    </header>
  );
};

export { Header };
