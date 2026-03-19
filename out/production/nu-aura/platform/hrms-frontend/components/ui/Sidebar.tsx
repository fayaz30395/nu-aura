'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { ChevronRight, ChevronLeft, Sparkles } from 'lucide-react';

export interface SidebarItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  href?: string;
  badge?: string | number;
  onClick?: () => void;
  children?: SidebarItem[];
  disabled?: boolean;
  section?: string;
}

export interface SidebarSection {
  id: string;
  label: string;
  items: SidebarItem[];
}

export interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {
  items: SidebarItem[];
  sections?: SidebarSection[];
  activeId?: string;
  onItemClick?: (item: SidebarItem) => void;
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  collapsible?: boolean;
  variant?: 'default' | 'compact' | 'minimal';
  logo?: React.ReactNode;
  logoCollapsed?: React.ReactNode;
}

const SidebarItemComponent: React.FC<{
  item: SidebarItem;
  isActive: boolean;
  isCollapsed: boolean;
  onItemClick?: (item: SidebarItem) => void;
  variant?: 'default' | 'compact' | 'minimal';
  activeId?: string;
  depth?: number;
}> = ({ item, isActive, isCollapsed, onItemClick, variant = 'default', activeId, depth = 0 }) => {
  const [isOpen, setIsOpen] = useState(false);
  const hasChildren = item.children && item.children.length > 0;

  useEffect(() => {
    if (hasChildren && activeId) {
      const hasActiveChild = item.children?.some(child => child.id === activeId);
      if (hasActiveChild) {
        setIsOpen(true);
      }
    }
  }, [activeId, hasChildren, item.children]);

  const handleClick = () => {
    if (hasChildren) {
      setIsOpen(!isOpen);
    }
    onItemClick?.(item);
  };

  return (
    <div className="relative">
      <button
        onClick={handleClick}
        className={cn(
          'group relative flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150',
          isActive
            ? 'bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-300'
            : 'text-surface-600 hover:bg-surface-100 hover:text-surface-900 dark:text-surface-400 dark:hover:bg-surface-800 dark:hover:text-surface-200',
          item.disabled && 'cursor-not-allowed opacity-50',
          variant === 'compact' && 'py-1.5 text-xs',
          variant === 'minimal' && 'px-2 py-1.5',
          depth > 0 && 'ml-4'
        )}
        disabled={item.disabled}
      >
        {/* Active indicator */}
        {isActive && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-primary-500 rounded-r" />
        )}

        {item.icon && (
          <span
            className={cn(
              'flex items-center justify-center w-8 h-8 rounded-md transition-colors',
              isActive
                ? 'text-primary-600 dark:text-primary-400'
                : 'text-surface-500 group-hover:text-surface-700 dark:text-surface-400 dark:group-hover:text-surface-200'
            )}
          >
            {item.icon}
          </span>
        )}

        {!isCollapsed && (
          <div className="flex flex-1 items-center justify-between min-w-0">
            <span className="truncate">{item.label}</span>
            <div className="flex items-center gap-2">
              {item.badge && (
                <span className={cn(
                  'flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-medium',
                  isActive
                    ? 'bg-primary-500 text-white'
                    : 'bg-surface-200 text-surface-600 dark:bg-surface-700 dark:text-surface-300'
                )}>
                  {item.badge}
                </span>
              )}
              {hasChildren && (
                <ChevronRight
                  className={cn(
                    'h-4 w-4 text-surface-400 transition-transform duration-150',
                    isOpen && 'rotate-90'
                  )}
                />
              )}
            </div>
          </div>
        )}

        {/* Tooltip for collapsed state */}
        {isCollapsed && (
          <div className="absolute left-full ml-2 px-2.5 py-1.5 bg-surface-900 text-white text-sm rounded-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 whitespace-nowrap z-50 shadow-lg">
            {item.label}
            {item.badge && (
              <span className="ml-2 px-1.5 py-0.5 bg-primary-500 rounded-full text-xs">
                {item.badge}
              </span>
            )}
          </div>
        )}
      </button>

      {/* Submenu Items */}
      {hasChildren && isOpen && !isCollapsed && (
        <div className="mt-1 space-y-0.5 pl-4">
          {item.children?.map((child) => (
            <SidebarItemComponent
              key={child.id}
              item={child}
              isActive={activeId === child.id}
              isCollapsed={isCollapsed}
              onItemClick={onItemClick}
              variant={variant}
              activeId={activeId}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const Sidebar = React.forwardRef<HTMLDivElement, SidebarProps>(
  (
    {
      className,
      items,
      sections,
      activeId,
      onItemClick,
      collapsed = false,
      onCollapsedChange,
      collapsible = true,
      variant = 'default',
      logo,
      logoCollapsed,
      ...props
    },
    ref
  ) => {
    const [isCollapsed, setIsCollapsed] = useState(collapsed);

    useEffect(() => {
      setIsCollapsed(collapsed);
    }, [collapsed]);

    const handleCollapsedChange = (newCollapsed: boolean) => {
      setIsCollapsed(newCollapsed);
      onCollapsedChange?.(newCollapsed);
    };

    // Group items by section
    const groupedItems = React.useMemo(() => {
      if (sections) return sections;

      const groups: Record<string, SidebarItem[]> = {
        'Quick Access': [],
        'Management': [],
        'Settings': [],
      };

      items.forEach(item => {
        // Self-service items
        if (['profile', 'payslips', 'my-attendance', 'leaves'].includes(item.id)) {
          groups['Quick Access'].push(item);
        }
        // Settings items
        else if (['roles', 'settings'].includes(item.id)) {
          groups['Settings'].push(item);
        }
        // Everything else is management
        else {
          groups['Management'].push(item);
        }
      });

      return Object.entries(groups)
        .filter(([, items]) => items.length > 0)
        .map(([label, items]) => ({ id: label.toLowerCase().replace(/\s+/g, '-'), label, items }));
    }, [items, sections]);

    return (
      <div
        ref={ref}
        className={cn(
          'flex flex-col bg-white border-r border-surface-200 transition-all duration-200 h-screen',
          'dark:bg-surface-900 dark:border-surface-800',
          isCollapsed ? 'w-[72px]' : 'w-64',
          className
        )}
        {...props}
      >
        {/* Logo Header */}
        <div className={cn(
          'flex items-center border-b border-surface-200 dark:border-surface-800 h-16 px-4',
          isCollapsed ? 'justify-center' : 'justify-between'
        )}>
          {!isCollapsed ? (
            <div className="flex items-center gap-2">
              <Image
                src="/images/logo.png"
                alt="NuLogic"
                width={120}
                height={32}
                className="h-8 w-auto object-contain dark:brightness-110"
                priority
              />
            </div>
          ) : (
            <div className="flex items-center justify-center">
              <Image
                src="/images/symbol.png"
                alt="NuLogic"
                width={32}
                height={32}
                className="h-8 w-8 object-contain"
                priority
              />
            </div>
          )}

          {collapsible && !isCollapsed && (
            <button
              onClick={() => handleCollapsedChange(!isCollapsed)}
              className="p-1.5 rounded-md text-surface-400 hover:text-surface-600 hover:bg-surface-100 dark:hover:bg-surface-800 dark:hover:text-surface-300 transition-colors"
              aria-label="Collapse sidebar"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Expand button when collapsed */}
        {collapsible && isCollapsed && (
          <div className="px-3 py-2">
            <button
              onClick={() => handleCollapsedChange(false)}
              className="w-full p-2 rounded-md text-surface-400 hover:text-surface-600 hover:bg-surface-100 dark:hover:bg-surface-800 dark:hover:text-surface-300 transition-colors flex items-center justify-center"
              aria-label="Expand sidebar"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {groupedItems.map((section, sectionIndex) => (
            <div key={section.id}>
              {/* Section Label */}
              {!isCollapsed && (
                <div className="px-3 mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-surface-400 dark:text-surface-500">
                    {section.label}
                  </span>
                </div>
              )}

              {/* Section Items */}
              <div className="space-y-0.5">
                {section.items.map((item) => (
                  <SidebarItemComponent
                    key={item.id}
                    item={item}
                    isActive={activeId === item.id}
                    isCollapsed={isCollapsed}
                    onItemClick={onItemClick}
                    variant={variant}
                    activeId={activeId}
                  />
                ))}
              </div>

              {/* Section Divider */}
              {sectionIndex < groupedItems.length - 1 && !isCollapsed && (
                <div className="mt-4 border-t border-surface-100 dark:border-surface-800" />
              )}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className={cn(
          'border-t border-surface-200 dark:border-surface-800 p-3',
          isCollapsed && 'flex justify-center'
        )}>
          {!isCollapsed ? (
            <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-primary-50 dark:bg-primary-950/50">
              <div className="flex items-center justify-center w-8 h-8 rounded-md bg-primary-100 dark:bg-primary-900/50">
                <Sparkles className="h-4 w-4 text-primary-600 dark:text-primary-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-primary-700 dark:text-primary-300 truncate">
                  Pro Features
                </p>
                <p className="text-[10px] text-primary-600/70 dark:text-primary-400/70">
                  All modules active
                </p>
              </div>
            </div>
          ) : (
            <div className="w-8 h-8 rounded-md bg-primary-100 dark:bg-primary-900/50 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-primary-600 dark:text-primary-400" />
            </div>
          )}
        </div>
      </div>
    );
  }
);

Sidebar.displayName = 'Sidebar';

export { Sidebar };
