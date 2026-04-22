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
        'fixed bottom-0 left-0 right-0 z-50 md:hidden',
        // Background and border
        'bg-[var(--bg-card)] border-t border-subtle',
        // Safe area for devices with home indicator
        'pb-safe',
        className
      )}
      role="navigation"
      aria-label="Mobile navigation"
    >
      <div className="flex items-center justify-around h-16 px-2">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center min-w-[64px] h-full px-4 py-2',
                'transition-colors duration-200',
                'touch-manipulation', // Optimize for touch
                active
                  ? 'text-accent'
                  : 'text-muted active:text-secondary'
              )}
              aria-current={active ? 'page' : undefined}
            >
              <div className="relative">
                <Icon
                  className={cn(
                    'h-6 w-6 transition-transform',
                    active && 'scale-110'
                  )}
                  strokeWidth={active ? 2.5 : 2}
                />
                {item.badge !== undefined && item.badge > 0 && (
                  <span
                    className='absolute -top-1.5 -right-1.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-xs font-semibold text-inverse bg-status-danger-bg rounded-full'>
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </div>
              <span
                className={cn(
                  'text-xs mt-1 font-medium',
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
              'flex flex-col items-center justify-center min-w-[64px] h-full px-4 py-2',
              'text-muted',
              'active:text-secondary',
              'transition-colors duration-200 touch-manipulation'
            )}
            aria-label="More options"
            aria-haspopup="true"
          >
            <MoreHorizontal className="h-6 w-6"/>
            <span className="text-xs mt-1 font-medium">More</span>
          </button>
        )}
      </div>
    </nav>
  );
}

// Hook to get bottom nav height for content padding
export function useMobileNavHeight() {
  return {
    height: 64, // 16 * 4 = 64px (h-16)
    paddingClass: 'pb-20 md:pb-0', // 80px on mobile (includes safe area)
  };
}

export default MobileBottomNav;
