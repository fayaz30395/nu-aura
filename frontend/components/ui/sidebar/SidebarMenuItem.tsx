'use client';

import React, {memo, useRef} from 'react';
import Link from 'next/link';
import {ChevronRight} from 'lucide-react';
import {cn} from '@/lib/utils';
import type {SidebarItem} from './types';

export interface SidebarMenuItemProps {
  item: SidebarItem;
  isActive: boolean;
  isCollapsed: boolean;
  onItemClick?: (item: SidebarItem) => void;
  activeId?: string;
  openFlyoverId: string | null;
  onToggleFlyover: (itemId: string, rect: DOMRect | null) => void;
}

function scheduleHardNavFallback(targetHref: string) {
  const timeout = setTimeout(() => {
    if (window.location.pathname !== targetHref) {
      window.location.href = targetHref;
    }
  }, 3000);
  const checkAndClear = () => {
    if (
      window.location.pathname === targetHref ||
      window.location.pathname.startsWith(targetHref + '/')
    ) {
      clearTimeout(timeout);
    }
  };
  setTimeout(checkAndClear, 500);
  setTimeout(checkAndClear, 1500);
}

export const SidebarMenuItem: React.FC<SidebarMenuItemProps> = memo(({
                                                                       item,
                                                                       isActive,
                                                                       isCollapsed,
                                                                       onItemClick,
                                                                       activeId: _activeId,
                                                                       openFlyoverId,
                                                                       onToggleFlyover,
                                                                     }) => {
  const elementRef = useRef<HTMLButtonElement & HTMLAnchorElement>(null);
  const hasChildren = !!item.children && item.children.length > 0;
  const isFlyoverOpen = openFlyoverId === item.id;

  const handleClick = (e: React.MouseEvent) => {
    if (hasChildren) {
      e.preventDefault();
      e.stopPropagation();
      if (isFlyoverOpen) {
        onToggleFlyover(item.id, null);
      } else {
        onToggleFlyover(item.id, elementRef.current?.getBoundingClientRect() || null);
      }
    } else {
      onItemClick?.(item);
      if (item.href) scheduleHardNavFallback(item.href);
    }
  };

  const commonClasses = cn(
    'sidebar-menu-item group relative flex w-full items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium',
    'transition-all duration-150 ease-out',
    isActive || isFlyoverOpen
      ? 'font-semibold shadow-[var(--shadow-card)] border-l-[3px]'
      : 'hover:bg-[var(--sidebar-hover-bg)]',
    item.disabled && 'cursor-not-allowed opacity-50'
  );

  const activeStyles = isActive || isFlyoverOpen
    ? {
      backgroundColor: 'var(--sidebar-active-bg)',
      borderLeftColor: 'var(--sidebar-active-border)',
      color: 'var(--sidebar-text-active)',
      boxShadow:
        'inset 0 1px 0 rgba(255, 255, 255, 0.08), 0 1px 2px rgba(0, 0, 0, 0.15), 0 0 12px rgba(58, 95, 217, 0.08)',
    }
    : {color: 'var(--sidebar-text)'};

  const content = (
    <>
      {item.icon && (
        <span
          className="flex items-center justify-center w-6 h-6 flex-shrink-0 transition-colors duration-200"
          style={{
            color: isActive || isFlyoverOpen
              ? 'var(--sidebar-text-active)'
              : 'var(--sidebar-text)',
          }}
        >
          {item.icon}
        </span>
      )}

      {!isCollapsed && (
        <div className="flex flex-1 items-center justify-between min-w-0">
          <span className="truncate group-hover:translate-x-0.5 transition-transform duration-200">
            {item.label}
          </span>
          <div className="flex items-center gap-2">
            {item.badge && (
              <span
                className={cn(
                  'flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-medium transition-colors duration-200',
                  isActive || isFlyoverOpen
                    ? 'bg-accent text-inverse'
                    : 'bg-white/10 text-[var(--sidebar-text)]'
                )}
              >
                {item.badge}
              </span>
            )}
            {hasChildren && (
              <ChevronRight
                className={cn(
                  'h-4 w-4 transition-all duration-200',
                  isFlyoverOpen && 'translate-x-0.5'
                )}
                style={{
                  color: isFlyoverOpen ? 'var(--sidebar-text-active)' : 'var(--sidebar-text-muted)',
                }}
              />
            )}
          </div>
        </div>
      )}

      {isCollapsed && (
        <div
          className="absolute left-full ml-2 px-2.5 py-1.5 bg-[var(--bg-elevated)] border border-[var(--border-main)] text-[var(--text-primary)] text-sm rounded-md opacity-0 invisible group-hover:opacity-100 group-hover:visible group-focus-within:opacity-100 group-focus-within:visible whitespace-nowrap z-50 shadow-[var(--shadow-dropdown)] pointer-events-none transition-all duration-150">
          {item.label}
          {item.badge && (
            <span className='ml-2 px-1.5 py-0.5 bg-accent rounded-full text-xs text-inverse'>
              {item.badge}
            </span>
          )}
        </div>
      )}
    </>
  );

  if (item.href && !hasChildren) {
    return (
      <div className="relative">
        <Link
          ref={elementRef as React.Ref<HTMLAnchorElement>}
          href={item.href}
          onClick={handleClick}
          className={commonClasses}
          style={activeStyles}
          prefetch
        >
          {content}
        </Link>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        ref={elementRef as React.Ref<HTMLButtonElement>}
        onClick={handleClick}
        className={commonClasses}
        style={activeStyles}
        disabled={item.disabled}
        aria-expanded={hasChildren ? isFlyoverOpen : undefined}
        aria-haspopup={hasChildren ? 'true' : undefined}
      >
        {content}
      </button>
    </div>
  );
});

SidebarMenuItem.displayName = 'SidebarMenuItem';
