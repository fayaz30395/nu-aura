'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { ChevronRight, Sparkles, PanelLeftClose, PanelLeft, X } from 'lucide-react';

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

const STORAGE_KEY_COLLAPSED = 'sidebar-collapsed';

// Flyover panel for showing children on the right side
const ChildrenFlyover: React.FC<{
  item: SidebarItem;
  isOpen: boolean;
  onClose: () => void;
  onItemClick?: (item: SidebarItem) => void;
  activeId?: string;
  triggerRect: DOMRect | null;
}> = ({ item, isOpen, onClose, onItemClick, activeId, triggerRect }) => {
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  // Close on Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen || !triggerRect) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/5 dark:bg-black/20 transition-opacity duration-200',
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
      />

      {/* Flyover Panel */}
      <div
        ref={panelRef}
        className={cn(
          'fixed z-50 w-64 bg-white dark:bg-surface-900',
          'border border-surface-200 dark:border-surface-700 rounded-lg shadow-2xl',
          'transform transition-all duration-200 ease-out',
          isOpen ? 'translate-x-0 opacity-100 scale-100' : 'translate-x-2 opacity-0 scale-95 pointer-events-none'
        )}
        style={{
          left: `${triggerRect.right + 8}px`,
          top: `${triggerRect.top}px`,
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800/50">
          <div className="flex items-center gap-2">
            {item.icon && (
              <span className="text-primary-600 dark:text-primary-400">
                {item.icon}
              </span>
            )}
            <span className="font-semibold text-sm text-surface-900 dark:text-surface-50">
              {item.label}
            </span>
            {item.badge && (
              <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-medium bg-primary-500 text-white">
                {item.badge}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-surface-400 hover:text-surface-600 hover:bg-surface-100 dark:hover:bg-surface-700 dark:hover:text-surface-300 transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Children items */}
        <div className="py-2 max-h-[400px] overflow-y-auto">
          {item.children?.map((child) => (
            <button
              key={child.id}
              onClick={() => {
                onItemClick?.(child);
                onClose();
              }}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors',
                activeId === child.id
                  ? 'bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-300 font-medium'
                  : 'text-surface-600 hover:bg-surface-100 hover:text-surface-900 dark:text-surface-400 dark:hover:bg-surface-800 dark:hover:text-surface-200'
              )}
            >
              {child.icon && (
                <span className={cn(
                  "w-5 h-5 flex items-center justify-center",
                  activeId === child.id ? 'text-primary-600 dark:text-primary-400' : 'text-surface-400'
                )}>
                  {child.icon}
                </span>
              )}
              <span className="flex-1 text-left truncate">{child.label}</span>
              {child.badge && (
                <span className="text-xs bg-surface-200 dark:bg-surface-700 text-surface-600 dark:text-surface-300 px-1.5 py-0.5 rounded-full">
                  {child.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-surface-100 dark:border-surface-800 bg-surface-50/50 dark:bg-surface-800/30">
          <p className="text-xs text-surface-400 dark:text-surface-500">
            {item.children?.length || 0} items
          </p>
        </div>
      </div>
    </>
  );
};

// Individual menu item
const SidebarMenuItem: React.FC<{
  item: SidebarItem;
  isActive: boolean;
  isCollapsed: boolean;
  onItemClick?: (item: SidebarItem) => void;
  activeId?: string;
  openFlyoverId: string | null;
  onToggleFlyover: (itemId: string, rect: DOMRect | null) => void;
}> = ({ item, isActive, isCollapsed, onItemClick, activeId, openFlyoverId, onToggleFlyover }) => {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const hasChildren = item.children && item.children.length > 0;
  const isFlyoverOpen = openFlyoverId === item.id;

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (hasChildren) {
      // Toggle flyover for items with children
      if (isFlyoverOpen) {
        onToggleFlyover(item.id, null);
      } else {
        const rect = buttonRef.current?.getBoundingClientRect() || null;
        onToggleFlyover(item.id, rect);
      }
    } else {
      // Direct click for items without children
      onItemClick?.(item);
    }
  };

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={handleClick}
        className={cn(
          'group relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150',
          isActive || isFlyoverOpen
            ? 'bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-300'
            : 'text-surface-600 hover:bg-surface-100 hover:text-surface-900 dark:text-surface-400 dark:hover:bg-surface-800 dark:hover:text-surface-200',
          item.disabled && 'cursor-not-allowed opacity-50'
        )}
        disabled={item.disabled}
      >
        {/* Active indicator */}
        {(isActive || isFlyoverOpen) && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary-500 rounded-r-full" />
        )}

        {item.icon && (
          <span
            className={cn(
              'flex items-center justify-center w-6 h-6 transition-colors flex-shrink-0',
              isActive || isFlyoverOpen
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
                  isActive || isFlyoverOpen
                    ? 'bg-primary-500 text-white'
                    : 'bg-surface-200 text-surface-600 dark:bg-surface-700 dark:text-surface-300'
                )}>
                  {item.badge}
                </span>
              )}
              {hasChildren && (
                <ChevronRight
                  className={cn(
                    'h-4 w-4 text-surface-400 transition-transform duration-200'
                  )}
                />
              )}
            </div>
          </div>
        )}

        {/* Tooltip for collapsed state (items without children) */}
        {isCollapsed && !hasChildren && (
          <div className="absolute left-full ml-2 px-2.5 py-1.5 bg-surface-900 text-white text-sm rounded-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 whitespace-nowrap z-50 shadow-lg pointer-events-none">
            {item.label}
            {item.badge && (
              <span className="ml-2 px-1.5 py-0.5 bg-primary-500 rounded-full text-xs">
                {item.badge}
              </span>
            )}
          </div>
        )}
      </button>
    </div>
  );
};

// Section divider with label
const SectionDivider: React.FC<{
  label: string;
  isCollapsed: boolean;
}> = ({ label, isCollapsed }) => {
  if (isCollapsed) {
    return (
      <div className="px-3 py-2">
        <div className="w-full h-px bg-surface-200 dark:bg-surface-700" />
      </div>
    );
  }

  return (
    <div className="px-3 py-2">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-surface-400 dark:text-surface-500">
        {label}
      </span>
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
      ...props
    },
    ref
  ) => {
    const [isCollapsed, setIsCollapsed] = useState(collapsed);
    const [isHovering, setIsHovering] = useState(false);
    const [openFlyoverId, setOpenFlyoverId] = useState<string | null>(null);
    const [flyoverTriggerRect, setFlyoverTriggerRect] = useState<DOMRect | null>(null);

    // Load collapsed state from localStorage
    useEffect(() => {
      if (typeof window !== 'undefined') {
        const savedCollapsed = localStorage.getItem(STORAGE_KEY_COLLAPSED);
        if (savedCollapsed !== null) {
          const parsedCollapsed = savedCollapsed === 'true';
          setIsCollapsed(parsedCollapsed);
          onCollapsedChange?.(parsedCollapsed);
        }
      }
    }, [onCollapsedChange]);

    // Sync with prop changes
    useEffect(() => {
      setIsCollapsed(collapsed);
    }, [collapsed]);

    const handleCollapsedChange = useCallback((newCollapsed: boolean) => {
      setIsCollapsed(newCollapsed);
      onCollapsedChange?.(newCollapsed);
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY_COLLAPSED, String(newCollapsed));
      }
      // Close flyover when collapsing/expanding
      setOpenFlyoverId(null);
      setFlyoverTriggerRect(null);
    }, [onCollapsedChange]);

    const handleToggleFlyover = useCallback((itemId: string, rect: DOMRect | null) => {
      if (openFlyoverId === itemId) {
        setOpenFlyoverId(null);
        setFlyoverTriggerRect(null);
      } else {
        setOpenFlyoverId(itemId);
        setFlyoverTriggerRect(rect);
      }
    }, [openFlyoverId]);

    const handleCloseFlyover = useCallback(() => {
      setOpenFlyoverId(null);
      setFlyoverTriggerRect(null);
    }, []);

    // Group items by section
    const groupedItems = React.useMemo(() => {
      if (sections) return sections;

      const groups: Record<string, SidebarItem[]> = {
        'Quick Access': [],
        'Management': [],
        'Settings': [],
      };

      items.forEach(item => {
        if (['profile', 'payslips', 'my-attendance', 'leaves'].includes(item.id)) {
          groups['Quick Access'].push(item);
        } else if (['roles', 'settings'].includes(item.id)) {
          groups['Settings'].push(item);
        } else {
          groups['Management'].push(item);
        }
      });

      return Object.entries(groups)
        .filter(([, sectionItems]) => sectionItems.length > 0)
        .map(([label, sectionItems]) => ({ id: label.toLowerCase().replace(/\s+/g, '-'), label, items: sectionItems }));
    }, [items, sections]);

    // Find the item with open flyover
    const flyoverItem = React.useMemo(() => {
      if (!openFlyoverId) return null;

      for (const section of groupedItems) {
        const item = section.items.find(i => i.id === openFlyoverId);
        if (item) return item;
      }
      return null;
    }, [openFlyoverId, groupedItems]);

    return (
      <>
        <div
          ref={ref}
          data-sidebar
          className={cn(
            'flex flex-col bg-white border-r border-surface-200 transition-all duration-300 ease-in-out h-screen relative',
            'dark:bg-surface-900 dark:border-surface-800',
            isCollapsed ? 'w-[72px]' : 'w-64',
            className
          )}
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
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
          </div>

          {/* Collapse Toggle */}
          {collapsible && (
            <div className={cn(
              'px-3 py-2 border-b border-surface-100 dark:border-surface-800',
              isCollapsed ? 'flex justify-center' : ''
            )}>
              <button
                onClick={() => handleCollapsedChange(!isCollapsed)}
                className={cn(
                  'flex items-center gap-2 p-2 rounded-lg text-surface-500 hover:text-surface-700 hover:bg-surface-100 dark:hover:bg-surface-800 dark:hover:text-surface-300 transition-all duration-150',
                  isCollapsed ? 'w-full justify-center' : 'w-full',
                  isCollapsed && isHovering && 'bg-surface-100 dark:bg-surface-800'
                )}
                aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                title={isCollapsed ? 'Expand sidebar (Ctrl+B)' : 'Collapse sidebar (Ctrl+B)'}
              >
                {isCollapsed ? (
                  <PanelLeft className="h-5 w-5" />
                ) : (
                  <>
                    <PanelLeftClose className="h-5 w-5" />
                    <span className="text-xs font-medium">Collapse</span>
                    <kbd className="ml-auto text-[10px] font-mono text-surface-400 bg-surface-100 dark:bg-surface-800 px-1.5 py-0.5 rounded">
                      ⌘B
                    </kbd>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
            {groupedItems.map((section, sectionIndex) => (
              <div key={section.id}>
                {sectionIndex > 0 && (
                  <SectionDivider label={section.label} isCollapsed={isCollapsed} />
                )}
                {sectionIndex === 0 && !isCollapsed && (
                  <div className="px-3 py-2">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-surface-400 dark:text-surface-500">
                      {section.label}
                    </span>
                  </div>
                )}

                <div className="space-y-0.5">
                  {section.items.map((item) => (
                    <SidebarMenuItem
                      key={item.id}
                      item={item}
                      isActive={activeId === item.id || item.children?.some(c => c.id === activeId)}
                      isCollapsed={isCollapsed}
                      onItemClick={onItemClick}
                      activeId={activeId}
                      openFlyoverId={openFlyoverId}
                      onToggleFlyover={handleToggleFlyover}
                    />
                  ))}
                </div>
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
              <div className="w-8 h-8 rounded-md bg-primary-100 dark:bg-primary-900/50 flex items-center justify-center group relative">
                <Sparkles className="h-4 w-4 text-primary-600 dark:text-primary-400" />
                <div className="absolute left-full ml-2 px-2.5 py-1.5 bg-surface-900 text-white text-xs rounded-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 whitespace-nowrap z-50 shadow-lg">
                  Pro Features Active
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Children Flyover Panel */}
        {flyoverItem && (
          <ChildrenFlyover
            item={flyoverItem}
            isOpen={!!openFlyoverId}
            onClose={handleCloseFlyover}
            onItemClick={onItemClick}
            activeId={activeId}
            triggerRect={flyoverTriggerRect}
          />
        )}
      </>
    );
  }
);

Sidebar.displayName = 'Sidebar';

export { Sidebar };
