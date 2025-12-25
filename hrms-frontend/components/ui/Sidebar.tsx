'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { ChevronRight, ChevronLeft, ChevronDown, Sparkles, PanelLeftClose, PanelLeft } from 'lucide-react';

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
const STORAGE_KEY_SECTIONS = 'sidebar-sections-state';

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

// Collapsible Section Header Component
const SectionHeader: React.FC<{
  section: SidebarSection;
  isExpanded: boolean;
  isCollapsed: boolean;
  onToggle: () => void;
  itemCount: number;
}> = ({ section, isExpanded, isCollapsed, onToggle, itemCount }) => {
  if (isCollapsed) {
    return (
      <div className="relative group px-2 py-1.5">
        <div className="w-full h-px bg-surface-200 dark:bg-surface-700" />
        {/* Tooltip showing section name */}
        <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 px-2.5 py-1.5 bg-surface-900 text-white text-xs font-medium rounded-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 whitespace-nowrap z-50 shadow-lg">
          {section.label} ({itemCount})
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between px-3 py-2 group hover:bg-surface-50 dark:hover:bg-surface-800/50 rounded-md transition-colors"
    >
      <span className="text-xs font-semibold uppercase tracking-wider text-surface-400 dark:text-surface-500 group-hover:text-surface-600 dark:group-hover:text-surface-400 transition-colors">
        {section.label}
      </span>
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] font-medium text-surface-400 dark:text-surface-500 bg-surface-100 dark:bg-surface-800 px-1.5 py-0.5 rounded">
          {itemCount}
        </span>
        <ChevronDown
          className={cn(
            'h-3.5 w-3.5 text-surface-400 transition-transform duration-200',
            !isExpanded && '-rotate-90'
          )}
        />
      </div>
    </button>
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
    const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
    const [isHovering, setIsHovering] = useState(false);

    // Load collapsed state from localStorage
    useEffect(() => {
      if (typeof window !== 'undefined') {
        const savedCollapsed = localStorage.getItem(STORAGE_KEY_COLLAPSED);
        if (savedCollapsed !== null) {
          const parsedCollapsed = savedCollapsed === 'true';
          setIsCollapsed(parsedCollapsed);
          onCollapsedChange?.(parsedCollapsed);
        }

        const savedSections = localStorage.getItem(STORAGE_KEY_SECTIONS);
        if (savedSections) {
          try {
            setExpandedSections(JSON.parse(savedSections));
          } catch {
            // Initialize all sections as expanded
            const allExpanded: Record<string, boolean> = {};
            groupedItems.forEach(section => {
              allExpanded[section.id] = true;
            });
            setExpandedSections(allExpanded);
          }
        } else {
          // Default: all sections expanded
          const allExpanded: Record<string, boolean> = {};
          groupedItems.forEach(section => {
            allExpanded[section.id] = true;
          });
          setExpandedSections(allExpanded);
        }
      }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

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
    }, [onCollapsedChange]);

    const toggleSection = useCallback((sectionId: string) => {
      setExpandedSections(prev => {
        const newState = { ...prev, [sectionId]: !prev[sectionId] };
        if (typeof window !== 'undefined') {
          localStorage.setItem(STORAGE_KEY_SECTIONS, JSON.stringify(newState));
        }
        return newState;
      });
    }, []);

    const expandAllSections = useCallback(() => {
      const allExpanded: Record<string, boolean> = {};
      groupedItems.forEach(section => {
        allExpanded[section.id] = true;
      });
      setExpandedSections(allExpanded);
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY_SECTIONS, JSON.stringify(allExpanded));
      }
    }, []);

    const collapseAllSections = useCallback(() => {
      const allCollapsed: Record<string, boolean> = {};
      groupedItems.forEach(section => {
        allCollapsed[section.id] = false;
      });
      setExpandedSections(allCollapsed);
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY_SECTIONS, JSON.stringify(allCollapsed));
      }
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
        .filter(([, items]) => items.length > 0)
        .map(([label, items]) => ({ id: label.toLowerCase().replace(/\s+/g, '-'), label, items }));
    }, [items, sections]);

    // Check if a section contains the active item
    const sectionContainsActiveItem = useCallback((section: SidebarSection) => {
      return section.items.some(item =>
        item.id === activeId ||
        item.children?.some(child => child.id === activeId)
      );
    }, [activeId]);

    // Auto-expand section containing active item
    useEffect(() => {
      if (activeId) {
        groupedItems.forEach(section => {
          if (sectionContainsActiveItem(section) && !expandedSections[section.id]) {
            setExpandedSections(prev => ({ ...prev, [section.id]: true }));
          }
        });
      }
    }, [activeId, groupedItems, sectionContainsActiveItem, expandedSections]);

    return (
      <div
        ref={ref}
        className={cn(
          'flex flex-col bg-white border-r border-surface-200 transition-all duration-300 ease-in-out h-screen',
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

        {/* Collapse Toggle - Always visible */}
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
                // Highlight when hovering over collapsed sidebar
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

            {/* Expand/Collapse all sections - only when expanded */}
            {!isCollapsed && (
              <div className="flex items-center gap-1 mt-1.5">
                <button
                  onClick={expandAllSections}
                  className="flex-1 text-[10px] text-surface-400 hover:text-surface-600 dark:hover:text-surface-300 py-1 px-2 rounded hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors"
                >
                  Expand all
                </button>
                <span className="text-surface-300 dark:text-surface-600">|</span>
                <button
                  onClick={collapseAllSections}
                  className="flex-1 text-[10px] text-surface-400 hover:text-surface-600 dark:hover:text-surface-300 py-1 px-2 rounded hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors"
                >
                  Collapse all
                </button>
              </div>
            )}
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1 scrollbar-thin scrollbar-thumb-surface-300 dark:scrollbar-thumb-surface-600 hover:scrollbar-thumb-surface-400 dark:hover:scrollbar-thumb-surface-500">
          {groupedItems.map((section) => {
            const isExpanded = expandedSections[section.id] !== false;
            const hasActiveItem = sectionContainsActiveItem(section);

            return (
              <div key={section.id} className="mb-2">
                {/* Section Header */}
                <SectionHeader
                  section={section}
                  isExpanded={isExpanded}
                  isCollapsed={isCollapsed}
                  onToggle={() => toggleSection(section.id)}
                  itemCount={section.items.length}
                />

                {/* Section Items - with animation */}
                <div
                  className={cn(
                    'overflow-hidden transition-all duration-200 ease-in-out',
                    isExpanded || isCollapsed ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
                  )}
                >
                  <div className={cn(
                    'space-y-0.5',
                    !isCollapsed && 'mt-1'
                  )}>
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
                </div>

                {/* Collapsed indicator for active section */}
                {isCollapsed && hasActiveItem && (
                  <div className="mt-1 mx-auto w-1 h-1 rounded-full bg-primary-500" />
                )}
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
              {/* Tooltip */}
              <div className="absolute left-full ml-2 px-2.5 py-1.5 bg-surface-900 text-white text-xs rounded-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 whitespace-nowrap z-50 shadow-lg">
                Pro Features Active
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }
);

Sidebar.displayName = 'Sidebar';

export { Sidebar };
