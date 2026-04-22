'use client';

import React, {useEffect, useRef} from 'react';
import Link from 'next/link';
import {X} from 'lucide-react';
import {cn} from '@/lib/utils';
import type {SidebarItem} from './types';

export interface ChildrenFlyoverProps {
  item: SidebarItem;
  isOpen: boolean;
  onClose: () => void;
  onItemClick?: (item: SidebarItem) => void;
  activeId?: string;
  triggerRect: DOMRect | null;
}

export const ChildrenFlyover: React.FC<ChildrenFlyoverProps> = ({
                                                                  item,
                                                                  isOpen,
                                                                  onClose,
                                                                  onItemClick,
                                                                  activeId,
                                                                  triggerRect,
                                                                }) => {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen || !triggerRect) return null;

  return (
    <>
      <div
        className={cn(
          'fixed inset-0 z-40 bg-[var(--bg-overlay)] transition-opacity duration-200',
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
      />
      <div
        ref={panelRef}
        className={cn(
          'fixed z-50 w-64 bg-[var(--bg-elevated)]',
          'rounded-lg shadow-[var(--shadow-dropdown)]',
          'transform transition-all duration-100 ease-out',
          isOpen ? 'translate-x-0 opacity-100 scale-100' : 'translate-x-3 opacity-0 scale-95 pointer-events-none'
        )}
        style={{
          left: `${triggerRect.right + 8}px`,
          top: `${Math.min(triggerRect.top, window.innerHeight - 400)}px`,
        }}
      >
        <div
          className="row-between px-4 py-4 border-b border-main bg-surface/50"
          suppressHydrationWarning
        >
          <div className="flex items-center gap-2">
            {item.icon && <span className="text-secondary">{item.icon}</span>}
            <span className="font-semibold text-sm text-primary">{item.label}</span>
            {item.badge && (
              <span
                className='ml-auto flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-medium bg-accent text-inverse'>
                {item.badge}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-secondary hover:text-primary hover:bg-[var(--accent-500)]/10 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
            aria-label="Close"
          >
            <X className="h-4 w-4"/>
          </button>
        </div>

        <div className="py-2 max-h-[400px] overflow-y-auto scrollbar-hide">
          {item.children?.map((child) => {
            const childClasses = cn(
              'w-full flex items-center gap-2 px-4 py-2.5 text-sm transition-all duration-150 ease-[cubic-bezier(0.16,1,0.3,1)]',
              activeId === child.id
                ? "bg-[var(--accent-500)]/10 text-accent font-medium"
                : "text-secondary hover:bg-[var(--accent-500)]/10 hover:text-primary"
            );

            const childContent = (
              <>
                {child.icon && (
                  <span
                    className={cn(
                      'w-5 h-5 flex items-center justify-center',
                      activeId === child.id ? 'text-accent' : 'text-secondary'
                    )}
                  >
                    {child.icon}
                  </span>
                )}
                <span className="flex-1 text-left truncate">{child.label}</span>
                {child.badge && (
                  <span className="text-xs bg-surface border border-main text-secondary px-1.5 py-0.5 rounded-full">
                    {child.badge}
                  </span>
                )}
              </>
            );

            if (child.href) {
              return (
                <Link
                  key={child.id}
                  href={child.href}
                  onClick={() => {
                    onItemClick?.(child);
                    onClose();
                    const fallbackHref = child.href!;
                    const timeout = setTimeout(() => {
                      window.location.href = fallbackHref;
                    }, 3000);
                    const cleanup = () => clearTimeout(timeout);
                    window.addEventListener('beforeunload', cleanup, {once: true});
                    const checkNav = () => {
                      if (
                        window.location.pathname === fallbackHref ||
                        window.location.pathname.startsWith(fallbackHref)
                      ) {
                        clearTimeout(timeout);
                      }
                    };
                    setTimeout(checkNav, 500);
                    setTimeout(checkNav, 1500);
                  }}
                  className={childClasses}
                  prefetch
                >
                  {childContent}
                </Link>
              );
            }

            return (
              <button
                key={child.id}
                onClick={() => {
                  onItemClick?.(child);
                  onClose();
                }}
                className={childClasses}
              >
                {childContent}
              </button>
            );
          })}
        </div>

        <div className="px-4 py-2 border-t border-main bg-surface/30">
          <p className="text-xs text-secondary/50">{item.children?.length || 0} items</p>
        </div>
      </div>
    </>
  );
};
