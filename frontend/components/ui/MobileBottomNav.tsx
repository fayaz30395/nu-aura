'use client';

import React from 'react';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {motion} from 'framer-motion';
import {cn} from '@/lib/utils';
import {MOTION_DURATION, MOTION_EASE, useReducedMotionSafe} from '@/lib/animation';
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
  const {prefersReduced} = useReducedMotionSafe();

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
                'relative flex flex-1 flex-col items-center justify-center gap-0.5 h-10 rounded-xl px-2 py-1.5 isolate',
                'animate-in fade-in slide-in-from-bottom-1 duration-200',
                'transform-gpu transition-[color,transform] duration-[var(--motion-base)] ease-[var(--ease-out-expo)]',
                'text-[var(--text-secondary)] focus-ring focus-visible:outline-none active:scale-[var(--motion-press-scale)]',
                'touch-manipulation', // Optimize for touch
                active
                  ? 'text-[var(--accent-primary)]'
                  : 'hover:text-[var(--text-primary)]'
              )}
                style={{animationDelay: `${index * 45}ms`}}
              aria-current={active ? 'page' : undefined}
              aria-label={item.badge !== undefined && item.badge > 0
                ? `${item.label}, ${item.badge > 99 ? '99 plus' : item.badge} notification${item.badge === 1 ? '' : 's'}`
                : item.label}
            >
              {/* Shared sliding indicator — animates between items via layoutId.
                  Transform/opacity only; honors reduced motion (no layout tween). */}
              {active && (
                <motion.span
                  layoutId={prefersReduced ? undefined : 'mobile-nav-indicator'}
                  aria-hidden
                  className="absolute inset-0 -z-10 rounded-xl bg-[var(--accent-primary-subtle)] shadow-[0_12px_24px_-16px_var(--accent-primary)]"
                  transition={{
                    duration: MOTION_DURATION.base,
                    ease: MOTION_EASE.outExpo,
                  }}
                />
              )}
              <div className="relative">
                <Icon
                  className={cn(
                    'h-5 w-5 transform-gpu transition-transform duration-[var(--motion-base)] ease-[var(--ease-spring)]',
                    active && 'scale-110'
                  )}
                  strokeWidth={active ? 2.5 : 2}
                />
                {item.badge !== undefined && item.badge > 0 && (
                  <span
                    aria-hidden="true"
                    className="absolute -top-1.5 -right-1.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-xs font-semibold text-white bg-[var(--status-danger-text)] rounded-full">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </div>
              <span
                className={cn(
                  'text-2xs leading-none font-medium',
                  'transition-colors duration-[var(--motion-base)] ease-[var(--ease-standard)]',
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
              'group/more relative overflow-hidden flex flex-1 flex-col items-center justify-center gap-0.5 h-10 rounded-xl px-2 py-1.5',
              'animate-in fade-in slide-in-from-bottom-1 duration-200',
              'text-[var(--text-secondary)] transform-gpu transition-[color,background-color,transform] duration-[var(--motion-base)] ease-[var(--ease-out-expo)] touch-manipulation',
              'focus-ring focus-visible:outline-none active:scale-[var(--motion-press-scale)]',
              'hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)]'
            )}
            aria-label="More options"
            aria-haspopup="true"
          >
            <MoreHorizontal className="h-6 w-6 transform-gpu transition-transform duration-[var(--motion-base)] ease-[var(--ease-spring)] group-hover/more:scale-110"/>
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
