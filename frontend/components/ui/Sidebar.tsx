'use client';

import React, { useState, useEffect, useCallback, useRef, memo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { ChevronRight, ChevronDown, Sparkles, PanelLeftClose, PanelLeft, X } from 'lucide-react';

const STORAGE_KEY_COLLAPSED_SECTIONS = 'sidebar-collapsed-sections';

/** Shared layout constants — keep in sync with AppLayout & Header */
export const SIDEBAR_WIDTH_EXPANDED = 256;
export const SIDEBAR_WIDTH_COLLAPSED = 72;
export const HEADER_HEIGHT = 64; // h-16 = 4rem = 64px

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
  /**
   * Optional permission code required to see this item.
   * Filtering is handled by the parent layout using auth state.
   */
  requiredPermission?: string;
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
  /**
   * Optional prefix for the localStorage key used to persist section collapse state.
   * Allows multiple sidebar instances (e.g., main app vs admin) to maintain independent state.
   * Defaults to '' (uses the base key 'sidebar-collapsed-sections').
   */
  storageKeyPrefix?: string;
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
          'fixed inset-0 z-40 bg-[var(--bg-overlay)] transition-opacity duration-200',
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
      />

      {/* Flyover Panel */}
      <div
        ref={panelRef}
        className={cn(
          'fixed z-50 w-64 bg-[var(--bg-elevated)]',
          'rounded-lg shadow-xl',
          'transform transition-all duration-100 ease-out',
          isOpen ? 'translate-x-0 opacity-100 scale-100' : 'translate-x-3 opacity-0 scale-95 pointer-events-none'
        )}
        style={{
          left: `${triggerRect.right + 8}px`,
          // Clamp top so flyover doesn't overflow viewport
          top: `${Math.min(triggerRect.top, window.innerHeight - 400)}px`,
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-main bg-surface/50">
          <div className="flex items-center gap-2">
            {item.icon && (
              <span className="text-secondary">
                {item.icon}
              </span>
            )}
            <span className="font-semibold text-sm text-primary">
              {item.label}
            </span>
            {item.badge && (
              <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-medium bg-accent-500 text-white">
                {item.badge}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-secondary hover:text-primary hover:bg-accent-500/10 transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Children items */}
        <div className="py-2 max-h-[400px] overflow-y-auto scrollbar-hide">
          {item.children?.map((child) => {
            const childClasses = cn(
              'w-full flex items-center gap-2 px-4 py-2.5 text-sm transition-all duration-150 ease-[cubic-bezier(0.16,1,0.3,1)]',
              activeId === child.id
                ? 'bg-accent-500/10 text-accent-700 dark:text-accent-300 font-medium'
                : 'text-secondary hover:bg-accent-500/10 hover:text-primary'
            );

            const childContent = (
              <>
                {child.icon && (
                  <span className={cn(
                    "w-5 h-5 flex items-center justify-center",
                    activeId === child.id ? 'text-accent-500' : 'text-secondary'
                  )}>
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

            // Use Link for instant navigation with hard-nav fallback.
            // In dev mode, first-time page compilation can make client-side
            // routing hang. A timeout ensures users always reach the target.
            if (child.href) {
              return (
                <Link
                  key={child.id}
                  href={child.href}
                  onClick={() => {
                    onItemClick?.(child);
                    onClose();
                    // Fallback: if Next.js client navigation doesn't complete
                    // within 3s (e.g. first compile in dev), force a hard nav.
                    if (child.href) {
                      const fallbackHref = child.href;
                      const timeout = setTimeout(() => {
                        window.location.href = fallbackHref;
                      }, 3000);
                      // Clear timeout if navigation succeeds (page unmounts)
                      const cleanup = () => clearTimeout(timeout);
                      window.addEventListener('beforeunload', cleanup, { once: true });
                      // Also clear on popstate (successful SPA navigation changes URL)
                      const checkNav = () => {
                        if (window.location.pathname === fallbackHref || window.location.pathname.startsWith(fallbackHref)) {
                          clearTimeout(timeout);
                        }
                      };
                      setTimeout(checkNav, 500);
                      setTimeout(checkNav, 1500);
                    }
                  }}
                  className={childClasses}
                  prefetch={true}
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

        {/* Footer */}
        <div className="px-4 py-2 border-t border-main bg-surface/30">
          <p className="text-xs text-secondary/50">
            {item.children?.length || 0} items
          </p>
        </div>
      </div>
    </>
  );
};

// Individual menu item — memoized to prevent re-renders when unrelated sidebar state changes
const SidebarMenuItem: React.FC<{
  item: SidebarItem;
  isActive: boolean;
  isCollapsed: boolean;
  onItemClick?: (item: SidebarItem) => void;
  activeId?: string;
  openFlyoverId: string | null;
  onToggleFlyover: (itemId: string, rect: DOMRect | null) => void;
}> = memo(({ item, isActive, isCollapsed, onItemClick, activeId: _activeId, openFlyoverId, onToggleFlyover }) => {
  const elementRef = useRef<HTMLButtonElement & HTMLAnchorElement>(null);
  const hasChildren = item.children && item.children.length > 0;
  const isFlyoverOpen = openFlyoverId === item.id;

  const handleClick = (e: React.MouseEvent) => {
    if (hasChildren) {
      e.preventDefault();
      e.stopPropagation();
      // Toggle flyover for items with children
      if (isFlyoverOpen) {
        onToggleFlyover(item.id, null);
      } else {
        const rect = elementRef.current?.getBoundingClientRect() || null;
        onToggleFlyover(item.id, rect);
      }
    } else {
      // Let Link handle navigation naturally for speed
      onItemClick?.(item);
      // Fallback: if Next.js client navigation doesn't complete within 3s
      // (e.g. dev-mode first compile), hard-navigate to the target.
      if (item.href) {
        const targetHref = item.href;
        const timeout = setTimeout(() => {
          if (window.location.pathname !== targetHref) {
            window.location.href = targetHref;
          }
        }, 3000);
        // Clear timeout quickly if navigation succeeds
        const checkAndClear = () => {
          if (window.location.pathname === targetHref || window.location.pathname.startsWith(targetHref + '/')) {
            clearTimeout(timeout);
          }
        };
        setTimeout(checkAndClear, 500);
        setTimeout(checkAndClear, 1500);
      }
    }
  };

  const commonClasses = cn(
    'sidebar-menu-item group relative flex w-full items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium',
    'transition-all duration-150 ease-out',
    isActive || isFlyoverOpen
      ? 'font-semibold shadow-sm border-l-[3px]'
      : 'hover:bg-[var(--sidebar-hover-bg)]',
    item.disabled && 'cursor-not-allowed opacity-50'
  );

  // Active state styling with CSS variables (dark sidebar aware) + glow accent
  const activeStyles = isActive || isFlyoverOpen ? {
    backgroundColor: 'var(--sidebar-active-bg)',
    borderLeftColor: 'var(--sidebar-active-border)',
    color: 'var(--sidebar-text-active)',
    boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.08), 0 1px 2px rgba(0, 0, 0, 0.15), 0 0 12px rgba(58, 95, 217, 0.08)',
  } : {
    color: 'var(--sidebar-text)',
  };

  const content = (
    <>
      {/* Active indicator (handled by border-l in commonClasses) */}

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
          <span className="truncate group-hover:translate-x-0.5 transition-transform duration-200">{item.label}</span>
          <div className="flex items-center gap-2">
            {item.badge && (
              <span className={cn(
                'flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-medium transition-colors duration-200',
                isActive || isFlyoverOpen
                  ? 'bg-accent-500 text-white'
                  : 'bg-white/10 text-[var(--sidebar-text)]'
              )}>
                {item.badge}
              </span>
            )}
            {hasChildren && (
              <ChevronRight
                className={cn(
                  'h-4 w-4 transition-all duration-200',
                  isFlyoverOpen && 'translate-x-0.5'
                )}
                style={{ color: isFlyoverOpen ? 'var(--sidebar-text-active)' : 'var(--sidebar-text-muted)' }}
              />
            )}
          </div>
        </div>
      )}

      {/* Tooltip for collapsed state (all items) */}
      {isCollapsed && (
        <div className="absolute left-full ml-2 px-2.5 py-1.5 bg-[var(--bg-elevated)] border border-[var(--border-main)] text-[var(--text-primary)] text-sm rounded-md opacity-0 invisible group-hover:opacity-100 group-hover:visible group-focus-within:opacity-100 group-focus-within:visible whitespace-nowrap z-50 shadow-xl pointer-events-none transition-all duration-150">
          {item.label}
          {item.badge && (
            <span className="ml-2 px-1.5 py-0.5 bg-accent-500 rounded-full text-xs text-white">
              {item.badge}
            </span>
          )}
        </div>
      )}
    </>
  );

  // Use Link for items with href (no children) for instant navigation
  if (item.href && !hasChildren) {
    return (
      <div className="relative">
        <Link
          ref={elementRef as React.Ref<HTMLAnchorElement>}
          href={item.href}
          onClick={handleClick}
          className={commonClasses}
          style={activeStyles}
          prefetch={true}
        >
          {content}
        </Link>
      </div>
    );
  }

  // Use button for items with children or no href
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

// Section divider with label - collapsible
const SectionDivider: React.FC<{
  label: string;
  sectionId: string;
  isCollapsed: boolean;
  isSectionExpanded: boolean;
  onToggleSection: (sectionId: string) => void;
}> = ({ label, sectionId, isCollapsed, isSectionExpanded, onToggleSection }) => {
  if (isCollapsed) {
    return (
      <div className="px-4 py-4 text-center">
        <div className="w-full h-px mx-auto" style={{ borderTop: '1px solid var(--sidebar-border)' }} />
      </div>
    );
  }

  return (
    <button
      onClick={() => onToggleSection(sectionId)}
      aria-expanded={isSectionExpanded}
      className="w-full flex items-center justify-between px-4 py-2.5 group rounded-md transition-all duration-200 hover:translate-x-0.5"
    >
      <span
        className="skeuo-deboss text-xs font-semibold uppercase tracking-wider transition-colors duration-200"
        style={{ color: 'var(--sidebar-section-text)' }}
        suppressHydrationWarning
      >
        {label}
      </span>
      <ChevronDown
        className={cn(
          'h-3 w-3 transition-transform duration-300 ease-out',
          !isSectionExpanded && '-rotate-90'
        )}
        style={{ color: 'var(--sidebar-text-muted)' }}
      />
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
      variant: _variant = 'default',
      storageKeyPrefix = '',
      ..._props
    },
    ref
  ) => {
    const [isCollapsed, setIsCollapsed] = useState(collapsed);
    const [, setIsHovering] = useState(false);
    const [openFlyoverId, setOpenFlyoverId] = useState<string | null>(null);
    const [flyoverTriggerRect, setFlyoverTriggerRect] = useState<DOMRect | null>(null);
    const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());

    // Build a namespaced storage key so multiple sidebar instances (main app vs admin)
    // maintain independent section-collapse state.
    const sectionStorageKey = storageKeyPrefix
      ? `${storageKeyPrefix}-${STORAGE_KEY_COLLAPSED_SECTIONS}`
      : STORAGE_KEY_COLLAPSED_SECTIONS;

    // Load collapsed section state from localStorage
    // NOTE: Sidebar collapsed state (expand/collapse) is managed by AppLayout to avoid
    // dual-source race conditions. Only section collapse (which sections are open) is local.
    useEffect(() => {
      if (typeof window !== 'undefined') {
        const savedCollapsedSections = localStorage.getItem(sectionStorageKey);
        if (savedCollapsedSections) {
          try {
            const parsed = JSON.parse(savedCollapsedSections);
            setCollapsedSections(new Set(parsed));
          } catch {
            // Ignore parse errors
          }
        }
      }
    }, [sectionStorageKey]);

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

    const handleToggleSection = useCallback((sectionId: string) => {
      setCollapsedSections(prev => {
        const newSet = new Set(prev);
        if (newSet.has(sectionId)) {
          newSet.delete(sectionId);
        } else {
          newSet.add(sectionId);
        }
        // Persist to localStorage using the namespaced key
        if (typeof window !== 'undefined') {
          localStorage.setItem(sectionStorageKey, JSON.stringify([...newSet]));
        }
        return newSet;
      });
    }, [sectionStorageKey]);

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
          ref={ref as React.Ref<HTMLDivElement>}
          data-sidebar
          className={cn(
            'flex flex-col border-r relative h-screen overflow-hidden',
            'transition-[width] duration-150 ease-[cubic-bezier(0.4,0,0.2,1)]',
            'will-change-[width]',
            className
          )}
          suppressHydrationWarning
          style={{
            backgroundColor: 'var(--bg-sidebar)',
            backgroundImage: 'var(--sidebar-gradient)',
            borderColor: 'var(--sidebar-border)',
            width: isCollapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH_EXPANDED,
            minWidth: isCollapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH_EXPANDED,
            boxShadow: 'inset -1px 0 0 rgba(255, 255, 255, 0.04)',
          }}
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
        >
          {/* Logo Header */}
          <div
            className={cn(
              'flex items-center h-16 px-4 transition-all duration-300',
              isCollapsed ? 'justify-center' : 'justify-between'
            )}
            style={{ borderBottom: '1px solid var(--sidebar-border)' }}
          >
            {!isCollapsed ? (
              <div className="flex items-center gap-2">
                <Image
                  src="/images/logo.png"
                  alt="NuLogic"
                  width={120}
                  height={32}
                  className="h-8 w-auto object-contain brightness-0 invert"
                  priority
                />
              </div>
            ) : (
              <div className="flex items-center justify-center">
                <Image
                  src="/images/logo.png"
                  alt="NuLogic"
                  width={32}
                  height={32}
                  className="h-8 w-8 object-contain brightness-0 invert"
                  priority
                />
              </div>
            )}
          </div>

          {/* Collapse Toggle */}
          {collapsible && (
            <div
              className={cn(
                'px-4 py-2.5 transition-all duration-300',
                isCollapsed ? 'flex justify-center' : ''
              )}
              style={{ borderBottom: '1px solid var(--sidebar-border)' }}
            >
              <button
                onClick={() => handleCollapsedChange(!isCollapsed)}
                className={cn(
                  'flex items-center gap-2 p-2 rounded-lg transition-all duration-200 ease-out',
                  isCollapsed ? 'w-full justify-center' : 'w-full',
                )}
                style={{
                  color: 'var(--sidebar-text)',
                }}
                aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                title={isCollapsed ? 'Expand sidebar (Ctrl+B)' : 'Collapse sidebar (Ctrl+B)'}
              >
                {isCollapsed ? (
                  <PanelLeft className="h-5 w-5 transition-transform duration-300" />
                ) : (
                  <>
                    <PanelLeftClose className="h-5 w-5 transition-transform duration-300" />
                    <span className="text-xs font-medium transition-opacity duration-200">Collapse</span>
                    <kbd className="ml-auto text-xs font-mono px-1.5 py-0.5 rounded transition-colors duration-200" style={{ color: 'var(--sidebar-text-muted)', backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid var(--sidebar-border)' }}>
                      ⌘B
                    </kbd>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 space-y-1 scrollbar-hide">
            {groupedItems.map((section, sectionIndex) => {
              const isSectionExpanded = !collapsedSections.has(section.id);

              return (
                <div key={section.id}>
                  {sectionIndex > 0 && (
                    <SectionDivider
                      label={section.label}
                      sectionId={section.id}
                      isCollapsed={isCollapsed}
                      isSectionExpanded={isSectionExpanded}
                      onToggleSection={handleToggleSection}
                    />
                  )}
                  {sectionIndex === 0 && !isCollapsed && (
                    <button
                      onClick={() => handleToggleSection(section.id)}
                      aria-expanded={isSectionExpanded}
                      className="w-full flex items-center justify-between px-4 py-2.5 group rounded-md transition-all duration-200"
                    >
                      <span
                        className="skeuo-deboss text-xs font-semibold uppercase tracking-wider transition-colors duration-200"
                        style={{ color: 'var(--sidebar-section-text)' }}
                        suppressHydrationWarning
                      >
                        {section.label}
                      </span>
                      <ChevronDown
                        className={cn(
                          'h-3 w-3 transition-transform duration-300 ease-out',
                          !isSectionExpanded && '-rotate-90'
                        )}
                        style={{ color: 'var(--sidebar-text-muted)' }}
                      />
                    </button>
                  )}

                  {/* Collapsible items container — CSS-only, no Framer Motion overhead */}
                  <div
                    className="space-y-0.5 overflow-hidden transition-all duration-150 ease-out"
                    style={isSectionExpanded ? {} : { height: 0, opacity: 0, pointerEvents: 'none' }}
                  >
                    {section.items.map((item) => (
                      <SidebarMenuItem
                        key={item.id}
                        item={item}
                        isActive={activeId === item.id || (item.children?.some(c => c.id === activeId) ?? false)}
                        isCollapsed={isCollapsed}
                        onItemClick={onItemClick}
                        activeId={activeId}
                        openFlyoverId={openFlyoverId}
                        onToggleFlyover={handleToggleFlyover}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </nav>

          {/* Footer */}
          <div
            className={cn(
              'p-4 transition-all duration-300',
              isCollapsed && 'flex justify-center'
            )}
            style={{ borderTop: '1px solid var(--sidebar-border)' }}
          >
            {!isCollapsed ? (
              <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl transition-all duration-200" style={{ background: 'linear-gradient(135deg, rgba(58, 95, 217, 0.12) 0%, rgba(96, 165, 250, 0.08) 100%)', border: '1px solid rgba(58, 95, 217, 0.20)', boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.06), 0 1px 3px rgba(0, 0, 0, 0.15)' }}>
                <div className="flex items-center justify-center w-8 h-8 rounded-lg transition-colors duration-200" style={{ background: 'linear-gradient(135deg, rgba(58, 95, 217, 0.25), rgba(96, 165, 250, 0.15))' }}>
                  <Sparkles className="h-4 w-4 text-accent-300 transition-transform duration-200" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold truncate" style={{ color: 'var(--sidebar-text-active)' }}>
                    Pro Features
                  </p>
                  <p className="text-[10px]" style={{ color: 'var(--sidebar-text-muted)' }}>
                    All modules active
                  </p>
                </div>
              </div>
            ) : (
              <div className="w-8 h-8 rounded-lg flex items-center justify-center group relative transition-all duration-200 hover:scale-105" style={{ background: 'linear-gradient(135deg, rgba(58, 95, 217, 0.25), rgba(96, 165, 250, 0.15))' }}>
                <Sparkles className="h-4 w-4 text-accent-300 transition-transform duration-200" />
                <div className="absolute left-full ml-2 px-2.5 py-1.5 bg-[var(--bg-elevated)] border border-[var(--border-main)] text-[var(--text-primary)] text-xs rounded-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 whitespace-nowrap z-50 shadow-xl">
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

// Wrap in memo so React skips re-rendering the sidebar when the parent
// (AppLayout) re-renders due to unrelated state changes (e.g. breadcrumb
// updates, header interactions). The sidebar only needs to re-render when
// its own props change — sections, activeId, or collapsed state.
const MemoizedSidebar = memo(Sidebar);
MemoizedSidebar.displayName = 'Sidebar';

export { MemoizedSidebar as Sidebar };
