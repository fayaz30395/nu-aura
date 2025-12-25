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
              'flex items-center justify-center w-8 h-8 rounded-md transition-colors flex-shrink-0',
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

// Section Header Component - clickable to expand flyout to the right
const SectionHeader: React.FC<{
  section: SidebarSection;
  isCollapsed: boolean;
  isExpanded: boolean;
  onToggle: () => void;
  hasActiveItem: boolean;
}> = ({ section, isCollapsed, isExpanded, onToggle, hasActiveItem }) => {
  return (
    <button
      onClick={onToggle}
      className={cn(
        'w-full flex items-center justify-between px-3 py-2.5 group rounded-lg transition-all duration-150',
        isExpanded
          ? 'bg-primary-50 text-primary-700 dark:bg-primary-950/50 dark:text-primary-300'
          : 'hover:bg-surface-50 dark:hover:bg-surface-800/50',
        hasActiveItem && !isExpanded && 'border-l-2 border-primary-500'
      )}
    >
      <div className="flex items-center gap-2">
        {/* Section indicator dot */}
        <div className={cn(
          'w-2 h-2 rounded-full transition-colors flex-shrink-0',
          isExpanded
            ? 'bg-primary-500'
            : hasActiveItem
              ? 'bg-primary-400'
              : 'bg-surface-300 dark:bg-surface-600 group-hover:bg-surface-400 dark:group-hover:bg-surface-500'
        )} />
        {!isCollapsed && (
          <span className={cn(
            'text-xs font-semibold uppercase tracking-wider transition-colors',
            isExpanded
              ? 'text-primary-700 dark:text-primary-300'
              : 'text-surface-500 dark:text-surface-400 group-hover:text-surface-700 dark:group-hover:text-surface-300'
          )}>
            {section.label}
          </span>
        )}
      </div>
      {!isCollapsed && (
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-medium text-surface-400 dark:text-surface-500 bg-surface-100 dark:bg-surface-800 px-1.5 py-0.5 rounded">
            {section.items.length}
          </span>
          <ChevronRight
            className={cn(
              'h-4 w-4 transition-all duration-200',
              isExpanded
                ? 'text-primary-500'
                : 'text-surface-400 group-hover:text-surface-600 dark:group-hover:text-surface-400'
            )}
          />
        </div>
      )}

      {/* Tooltip for collapsed state */}
      {isCollapsed && (
        <div className="absolute left-full ml-2 px-2.5 py-1.5 bg-surface-900 text-white text-xs font-medium rounded-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 whitespace-nowrap z-50 shadow-lg">
          {section.label} ({section.items.length})
        </div>
      )}
    </button>
  );
};

// Flyout Panel Component - expands to the right of the sidebar
const FlyoutPanel: React.FC<{
  section: SidebarSection;
  isOpen: boolean;
  onClose: () => void;
  onItemClick?: (item: SidebarItem) => void;
  activeId?: string;
  sidebarWidth: number;
  sidebarRef: React.RefObject<HTMLDivElement>;
}> = ({ section, isOpen, onClose, onItemClick, activeId, sidebarWidth, sidebarRef }) => {
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        // Check if click is on sidebar
        if (sidebarRef.current && !sidebarRef.current.contains(e.target as Node)) {
          onClose();
        }
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose, sidebarRef]);

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

  return (
    <>
      {/* Backdrop - subtle overlay */}
      <div
        className={cn(
          'fixed inset-0 z-40 transition-opacity duration-300',
          isOpen ? 'bg-black/10 dark:bg-black/30 opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
      />

      {/* Flyout Panel */}
      <div
        ref={panelRef}
        className={cn(
          'fixed top-0 bottom-0 z-50 w-72 bg-white dark:bg-surface-900',
          'border-r border-surface-200 dark:border-surface-700 shadow-xl',
          'transform transition-all duration-300 ease-out',
          isOpen ? 'translate-x-0 opacity-100' : '-translate-x-4 opacity-0 pointer-events-none'
        )}
        style={{ left: sidebarWidth }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800/50">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-primary-500" />
            <h2 className="text-sm font-semibold text-surface-900 dark:text-surface-50 uppercase tracking-wider">
              {section.label}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-surface-400 hover:text-surface-600 hover:bg-surface-100 dark:hover:bg-surface-700 dark:hover:text-surface-300 transition-colors"
            aria-label="Close panel"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto p-3 max-h-[calc(100vh-120px)]">
          <div className="space-y-1">
            {section.items.map((item) => (
              <SidebarItemComponent
                key={item.id}
                item={item}
                isActive={activeId === item.id}
                isCollapsed={false}
                onItemClick={(clickedItem) => {
                  onItemClick?.(clickedItem);
                  if (clickedItem.href) {
                    onClose();
                  }
                }}
                activeId={activeId}
              />
            ))}
          </div>
        </div>

        {/* Item count footer */}
        <div className="px-4 py-3 border-t border-surface-100 dark:border-surface-800 bg-surface-50/50 dark:bg-surface-800/30">
          <p className="text-xs text-surface-400 dark:text-surface-500">
            {section.items.length} items in {section.label}
          </p>
        </div>
      </div>
    </>
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
    const [expandedSection, setExpandedSection] = useState<string | null>(null);
    const [isHovering, setIsHovering] = useState(false);
    const sidebarRef = useRef<HTMLDivElement>(null);

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
      // Close flyout when collapsing
      if (newCollapsed) {
        setExpandedSection(null);
      }
    }, [onCollapsedChange]);

    const toggleSection = useCallback((sectionId: string) => {
      setExpandedSection(prev => prev === sectionId ? null : sectionId);
    }, []);

    const closeFlyout = useCallback(() => {
      setExpandedSection(null);
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

    // Check if a section contains the active item
    const sectionContainsActiveItem = useCallback((section: SidebarSection) => {
      return section.items.some(item =>
        item.id === activeId ||
        item.children?.some(child => child.id === activeId)
      );
    }, [activeId]);

    const sidebarWidth = isCollapsed ? 72 : 256;

    return (
      <>
        <div
          ref={(node) => {
            // Handle both refs
            if (typeof ref === 'function') {
              ref(node);
            } else if (ref) {
              ref.current = node;
            }
            (sidebarRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
          }}
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

          {/* Navigation - Section Headers only (items show in flyout) */}
          <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
            {groupedItems.map((section) => {
              const hasActiveItem = sectionContainsActiveItem(section);
              const isExpanded = expandedSection === section.id;

              return (
                <div key={section.id} className="relative">
                  <SectionHeader
                    section={section}
                    isCollapsed={isCollapsed}
                    isExpanded={isExpanded}
                    onToggle={() => toggleSection(section.id)}
                    hasActiveItem={hasActiveItem}
                  />
                </div>
              );
            })}
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

        {/* Flyout Panels for expanded sections */}
        {groupedItems.map((section) => (
          <FlyoutPanel
            key={section.id}
            section={section}
            isOpen={expandedSection === section.id}
            onClose={closeFlyout}
            onItemClick={onItemClick}
            activeId={activeId}
            sidebarWidth={sidebarWidth}
            sidebarRef={sidebarRef}
          />
        ))}
      </>
    );
  }
);

Sidebar.displayName = 'Sidebar';

export { Sidebar };
