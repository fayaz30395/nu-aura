'use client';

import React from 'react';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {cn} from '@/lib/utils';
import {Calendar, ClipboardList, Home, LucideIcon, MoreHorizontal, User, Users,} from 'lucide-react';

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: number;
}

export interface MobileBottomNavProps {
  items?: NavItem[];
  className?: string;
  onMoreClick?: () => void;
}

const defaultNavItems: NavItem[] = [
  {label: 'Home', href: '/dashboard', icon: Home},
  {label: 'Team', href: '/employees', icon: Users},
  {label: 'Leave', href: '/leave', icon: Calendar},
  {label: 'Tasks', href: '/projects', icon: ClipboardList},
  {label: 'Me', href: '/me/dashboard', icon: User},
];

export function MobileBottomNav({
                                  items = defaultNavItems,
                                  className,
                                  onMoreClick,
                                }: MobileBottomNavProps) {
  const pathname = usePathname();

  // Only show 4 items + More button, or all items if 5 or fewer
  const visibleItems = items.length > 5 ? items.slice(0, 4) : items;
  const hasMore = items.length > 5;

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard' || pathname === '/';
    }
    return pathname === href || pathname.startsWith(href + '/');
  };

  return (
    <nav
      className={cn(
        // Only show on mobile
        'fixed inset-x-0 bottom-0 z-50 md:hidden pb-safe px-3',
        // Safe area for devices with home indicator
        'animate-slide-in-up page-reveal',
        className
      )}
      role="navigation"
      aria-label="Mobile navigation"
    >
      <div
        className="mx-auto flex h-14 w-full max-w-[560px] items-center justify-around gap-1 rounded-[26px] border border-[var(--border-subtle)] bg-[var(--bg-surface)]/90 px-1.5 shadow-[0_16px_50px_-30px_rgba(15,23,42,0.45)] ring-1 ring-[var(--border-main)]/45 backdrop-blur-md">
        {visibleItems.map((item, index) => {
          const Icon = item.icon;
          const active = isActive(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'relative overflow-hidden flex flex-1 flex-col items-center justify-center gap-0.5 h-10 rounded-xl px-2 py-1.5',
                'animate-in fade-in slide-in-from-bottom-1 duration-200',
                'transition-all duration-250 ease-[cubic-bezier(0.16,1,0.3,1)]',
                'text-[var(--text-secondary)]',
                'before:absolute before:inset-0 before:rounded-xl before:bg-[var(--accent-primary-subtle)] before:opacity-0 before:scale-95 before:transition-all before:duration-250 before:ease-[cubic-bezier(0.16,1,0.3,1)]',
                'touch-manipulation', // Optimize for touch
                active
                  ? 'text-[var(--accent-primary)] shadow-[0_12px_24px_-16px_var(--accent-primary)] before:opacity-100 before:scale-100 scale-[1.015]'
                  : 'hover:text-[var(--text-primary)] hover:before:scale-100 hover:before:opacity-80'
              )}
                style={{animationDelay: `${index * 45}ms`}}
              aria-current={active ? 'page' : undefined}
            >
              <div className="relative">
                <Icon
                  className={cn(
                    'h-5 w-5 transition-transform',
                    active && 'scale-110'
                  )}
                  strokeWidth={active ? 2.5 : 2}
                />
                {item.badge !== undefined && item.badge > 0 && (
                  <span
                    className="absolute -top-1.5 -right-1.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-xs font-semibold text-white bg-[var(--status-danger-text)] rounded-full">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </div>
              <span
                className={cn(
                  'text-2xs leading-none font-medium',
                  'transition-all duration-200',
                  active && 'font-semibold'
                )}
              >
                {item.label}
              </span>
            </Link>
          );
        })}

        {/* More button */}
        {hasMore && (
          <button
            onClick={onMoreClick}
            className={cn(
              'relative overflow-hidden flex flex-1 flex-col items-center justify-center gap-0.5 h-10 rounded-xl px-2 py-1.5',
              'animate-in fade-in slide-in-from-bottom-1 duration-200',
              'text-[var(--text-secondary)] transition-all duration-250 ease-[cubic-bezier(0.16,1,0.3,1)] touch-manipulation',
              'before:absolute before:inset-0 before:rounded-xl before:bg-[var(--bg-card)] before:opacity-0 before:scale-95 before:transition-all before:duration-250',
              'hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)]'
            )}
            aria-label="More options"
            aria-haspopup="true"
          >
            <MoreHorizontal className="h-6 w-6"/>
            <span className="text-2xs font-medium leading-none">More</span>
          </button>
        )}
      </div>
    </nav>
  );
}

// Hook to get bottom nav height for content padding
export function useMobileNavHeight() {
  return {
    height: 56,
    paddingClass: 'pb-20 md:pb-0', // 80px on mobile (56px bar + safe area)
  };
}

export default MobileBottomNav;
