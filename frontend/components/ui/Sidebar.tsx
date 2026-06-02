'use client';

import React, {memo, useCallback, useEffect, useRef, useState} from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {cn} from '@/lib/utils';
import {safeStorage} from '@/lib/utils/safeStorage';
import {ChevronDown, ChevronRight, PanelLeft, PanelLeftClose, Sparkles, X} from 'lucide-react';

const STORAGE_KEY_COLLAPSED_SECTIONS = 'sidebar-collapsed-sections';

/** Shared layout constants — keep in sync with AppLayout & Header */
export const SIDEBAR_WIDTH_EXPANDED = 248;
export const SIDEBAR_WIDTH_COLLAPSED = 68;
export const HEADER_HEIGHT = 56; // h-14 = 3.5rem = 56px

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

// Note: sidebar collapse state is persisted by the parent layout via
// `useUiStore` (legacy key `sidebar-collapsed` for the user app,
// `admin-sidebar-collapsed` for the admin shell). This component is
// presentation-only with respect to collapse persistence.

// Flyover panel for showing children on the right side
const ChildrenFlyover: React.FC<{
  item: SidebarItem;
  isOpen: boolean;
  onClose: () => void;
  onItemClick?: (item: SidebarItem) => void;
  activeId?: string;
  triggerRect: DOMRect | null;
}> = ({item, isOpen, onClose, onItemClick, activeId, triggerRect}) => {
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
          'fixed z-50 w-60 bg-[var(--bg-elevated)]',
          'rounded-2xl shadow-[var(--shadow-dropdown)] border border-[var(--border-subtle)]',
          'transform-gpu transition-all duration-150 ease-[cubic-bezier(0.16,1,0.3,1)]',
          isOpen ? 'translate-x-0 opacity-100 scale-100' : 'translate-x-3 opacity-0 scale-95 pointer-events-none'
        )}
        style={{
          left: `${triggerRect.right + 8}px`,
          // Clamp top so flyover doesn't overflow viewport
          top: `${Math.min(triggerRect.top, window.innerHeight - 400)}px`,
        }}
      >
        {/* Header */}
        <div
          className="row-between px-3 py-3 border-b border-[var(--border-main)] bg-[var(--bg-surface)]/85"
          suppressHydrationWarning
        >
          <div className="flex items-center gap-2">
            {item.icon && (
              <span className="text-[var(--sidebar-text-muted)]">
                {item.icon}
              </span>
            )}
            <span className="font-semibold text-sm text-[var(--text-primary)]">
              {item.label}
            </span>
            {item.badge && (
              <span
                className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-medium bg-[var(--accent-primary)] text-white">
                {item.badge}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2.5 rounded-md text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--sidebar-hover-bg)] transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2 active:scale-[0.985]"
            aria-label="Close"
          >
            <X className="h-4 w-4"/>
          </button>
        </div>

        {/* Children items */}
        <div className="py-2 max-h-[400px] overflow-y-auto scrollbar-hide">
          {item.children?.map((child) => {
            const childClasses = cn(
              'w-full flex items-center gap-2 px-4 py-2 text-sm rounded-md transition-all duration-180 ease-[cubic-bezier(0.16,1,0.3,1)]',
              activeId === child.id
                ? 'font-medium bg-[var(--accent-primary-subtle)] text-[var(--accent-primary)] shadow-[0_10px_20px_-16px_var(--accent-primary)]'
                : 'text-[var(--text-secondary)] hover:bg-[var(--sidebar-hover-bg)] hover:text-[var(--text-primary)]'
            );

            const childContent = (
              <>
                {child.icon && (
                <span
                    className={cn(
                      'w-5 h-5 flex items-center justify-center transition-transform duration-200',
                      activeId === child.id ? 'text-[var(--accent-primary)] scale-105' : 'text-[var(--sidebar-text)]'
                    )}
                  >
                    {child.icon}
                  </span>
                )}
                <span className="flex-1 text-left truncate">{child.label}</span>
                {child.badge && (
                  <span
                    className="text-xs border border-[var(--border-main)] bg-[var(--bg-card)] text-[var(--text-secondary)] px-1.5 py-0.5 rounded-full shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]">
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
                      window.addEventListener('beforeunload', cleanup, {once: true});
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
                  aria-current={activeId === child.id ? 'page' : undefined}
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
        <div className="px-4 py-2 border-t border-[var(--border-main)] bg-[var(--bg-surface)]/70">
          <p className="text-xs text-[var(--sidebar-section-text)]">
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
}> = memo(({item, isActive, isCollapsed, onItemClick, activeId: _activeId, openFlyoverId, onToggleFlyover}) => {
  const elementRef = useRef<HTMLButtonElement & HTMLAnchorElement>(null);
  const hasChildren = item.children && item.children.length > 0;
  const isFlyoverOpen = openFlyoverId === item.id;
  const isActiveState = isActive || isFlyoverOpen;

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
    'sidebar-menu-item group relative flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium',
    'transition-all duration-150 ease-out',
    isActiveState
      ? 'font-semibold bg-[var(--sidebar-active-bg)] text-[var(--sidebar-text-active)]'
      : 'text-[var(--sidebar-text)] hover:bg-[var(--sidebar-hover-bg)] hover:translate-x-0.5',
    item.disabled && 'cursor-not-allowed opacity-50'
  );

  const content = (
    <>
      {isActiveState && !isCollapsed && (
        <span
          className="absolute left-2.5 h-1.5 w-1.5 rounded-full bg-[var(--sidebar-active-border)]"
          aria-hidden
        />
      )}

      {item.icon && (
        <span
          className={cn(
            'flex items-center justify-center w-6 h-6 flex-shrink-0 transition-colors duration-200',
            isActiveState ? 'text-[var(--sidebar-text-active)]' : 'text-[var(--sidebar-text)]'
          )}
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
                isActiveState
                  ? 'bg-[var(--accent-primary)] text-white'
                  : 'bg-[var(--sidebar-hover-bg)] text-[var(--sidebar-text)]'
              )}>
                {item.badge}
              </span>
            )}
            {hasChildren && (
              <ChevronRight
                className={cn(
                  'h-4 w-4 transition-all duration-200',
                  isFlyoverOpen
                    ? 'translate-x-0.5 text-[var(--sidebar-text-active)]'
                    : 'text-[var(--sidebar-text-muted)]'
                )}
              />
            )}
          </div>
        </div>
      )}

      {/* Tooltip for collapsed state (all items) */}
      {isCollapsed && (
        <div
          className="absolute left-full ml-2 px-2.5 py-1.5 bg-[var(--bg-elevated)] border border-[var(--border-main)] text-[var(--text-primary)] text-sm rounded-md opacity-0 invisible group-hover:opacity-100 group-hover:visible group-focus-within:opacity-100 group-focus-within:visible whitespace-nowrap z-50 shadow-[var(--shadow-dropdown)] pointer-events-none transition-all duration-150">
          {item.label}
          {item.badge && (
            <span className="ml-2 px-1.5 py-0.5 bg-[var(--accent-primary)] rounded-full text-xs text-white">
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
          prefetch={true}
          aria-current={isActive ? 'page' : undefined}
          aria-label={isCollapsed ? item.label : undefined}
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
        disabled={item.disabled}
        aria-expanded={hasChildren ? isFlyoverOpen : undefined}
        aria-haspopup={hasChildren ? 'true' : undefined}
        aria-current={isActive && !hasChildren ? 'page' : undefined}
        aria-label={isCollapsed ? item.label : undefined}
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
}> = ({label, sectionId, isCollapsed, isSectionExpanded, onToggleSection}) => {
  if (isCollapsed) {
    return (
      <div className="px-4 py-3 text-center">
        <div className="w-full h-px mx-auto border-t border-[var(--sidebar-border)]"/>
      </div>
    );
  }

  return (
    <button
      onClick={() => onToggleSection(sectionId)}
      aria-expanded={isSectionExpanded}
      className="w-full row-between px-3 py-2 group rounded-md transition-all duration-200"
    >
      <span
        className="text-2xs font-medium uppercase tracking-[0.14em] text-[var(--sidebar-section-text)] transition-colors duration-200"
        suppressHydrationWarning
      >
        {label}
      </span>
      <ChevronDown
        className={cn(
          'h-3 w-3 text-[var(--sidebar-text-muted)] transition-transform duration-300 ease-out',
          !isSectionExpanded && '-rotate-90'
        )}
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

    // Load collapsed section state from safeStorage
    // NOTE: Sidebar collapsed state (expand/collapse) is managed by AppLayout to avoid
    // dual-source race conditions. Only section collapse (which sections are open) is local.
    useEffect(() => {
      const savedCollapsedSections = safeStorage.get(sectionStorageKey);
      if (savedCollapsedSections) {
        try {
          const parsed = JSON.parse(savedCollapsedSections);
          setCollapsedSections(new Set(parsed));
        } catch {
          // Ignore parse errors
        }
      }
    }, [sectionStorageKey]);

    // Sync with prop changes
    useEffect(() => {
      setIsCollapsed(collapsed);
    }, [collapsed]);

    const handleCollapsedChange = useCallback((newCollapsed: boolean) => {
      setIsCollapsed(newCollapsed);
      // Persistence is owned by the parent layout via `useUiStore`
      // (`sidebarCollapsed` or `adminSidebarCollapsed`). The store's
      // persist middleware writes through to the legacy
      // `sidebar-collapsed` / `admin-sidebar-collapsed` keys. We forward
      // the change to the parent and let it drive storage — writing here
      // would cause a double-write race against the store.
      onCollapsedChange?.(newCollapsed);
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
        // Persist via safeStorage using the namespaced key
        safeStorage.set(sectionStorageKey, JSON.stringify([...newSet]));
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
        .map(([label, sectionItems]) => ({id: label.toLowerCase().replace(/\s+/g, '-'), label, items: sectionItems}));
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
            'flex flex-col border-r relative h-full overflow-hidden',
            'transition-[width] duration-150 ease-[cubic-bezier(0.4,0,0.2,1)]',
            'will-change-[width] bg-[var(--bg-sidebar)] border-[var(--sidebar-border)]',
            isCollapsed ? 'w-[68px] min-w-[68px]' : 'w-[248px] min-w-[248px]',
            className
          )}
          suppressHydrationWarning
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
        >
          {/* Logo Header */}
          <div
            className={cn(
              'flex items-center h-14 px-3 transition-all duration-300',
              'border-b border-[var(--sidebar-border)]',
              isCollapsed ? 'justify-center' : 'justify-between'
            )}
          >
            {!isCollapsed ? (
              <div className="flex items-center gap-2">
                <Image
                  src="/images/nulogic-logo-white.svg"
                  alt="NULogic"
                  width={130}
                  height={38}
                  className="h-7 w-auto object-contain"
                  priority
                />
              </div>
            ) : (
              <div className="flex items-center justify-center">
                <Image
                  src="/images/nulogic-icon.svg"
                  alt="NULogic"
                  width={32}
                  height={32}
                  className="h-7 w-7 object-contain"
                  priority
                />
              </div>
            )}
          </div>

          {/* Collapse Toggle */}
          {collapsible && (
            <div
              className={cn(
                'px-3 py-1.5 border-b border-[var(--sidebar-border)] transition-all duration-300',
                isCollapsed ? 'flex justify-center' : ''
              )}
            >
              <button
                onClick={() => handleCollapsedChange(!isCollapsed)}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-md text-[var(--sidebar-text)] hover:bg-[var(--sidebar-hover-bg)] hover:text-[var(--sidebar-text-active)] transition-all duration-200 ease-out w-full cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2',
                  isCollapsed ? 'justify-center' : ''
                )}
                aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                title={isCollapsed ? 'Expand sidebar (Ctrl+B)' : 'Collapse sidebar (Ctrl+B)'}
              >
                {isCollapsed ? (
                  <PanelLeft className="h-5 w-5 transition-transform duration-300"/>
                ) : (
                  <>
                    <PanelLeftClose className="h-5 w-5 transition-transform duration-300"/>
                    <span className="text-xs font-medium transition-opacity duration-200">Collapse</span>
                    <kbd className="ml-auto text-xs font-mono px-1.5 py-0.5 rounded border border-[var(--sidebar-border)] bg-[var(--sidebar-hover-bg)] text-[var(--sidebar-text-muted)] transition-colors duration-200">
                      ⌘B
                    </kbd>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-2.5 space-y-1 scrollbar-hide"
               aria-label="Main navigation">
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
                      className="w-full row-between px-3 py-2 group rounded-md transition-all duration-200"
                      suppressHydrationWarning
                    >
                      <span
                        className="text-2xs font-medium uppercase tracking-[0.14em] text-[var(--sidebar-section-text)] transition-colors duration-200"
                        suppressHydrationWarning
                      >
                        {section.label}
                      </span>
                      <ChevronDown
                        className={cn(
                          'h-3 w-3 text-[var(--sidebar-text-muted)] transition-transform duration-300 ease-out',
                          !isSectionExpanded && '-rotate-90'
                        )}
                      />
                    </button>
                  )}

                  {/* Collapsible items container — CSS-only, no Framer Motion overhead */}
                  <div
                    className={cn(
                      'space-y-0.5 overflow-hidden transition-all duration-150 ease-out',
                      !isSectionExpanded && 'h-0 opacity-0 pointer-events-none'
                    )}
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
              'p-1.5 border-t border-[var(--sidebar-border)] transition-all duration-300',
              isCollapsed && 'flex justify-center'
            )}
          >
            {!isCollapsed ? (
              <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg border border-[var(--sidebar-border)] bg-[var(--sidebar-active-bg)] transition-all duration-200">
                <div className="flex items-center justify-center w-6 h-6 rounded-md bg-[var(--sidebar-hover-bg)]">
                  <Sparkles className="h-3.5 w-3.5 text-[var(--sidebar-active-border)]"/>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold truncate text-[var(--sidebar-text-active)]">All
                    Modules Active</p>
                  <p className="text-2xs text-[var(--sidebar-text-muted)]">Pro Plan</p>
                </div>
              </div>
            ) : (
              <div
                className="w-7 h-7 rounded-md flex items-center justify-center group relative bg-[var(--sidebar-hover-bg)] transition-all duration-200 hover:scale-105">
                <Sparkles className="h-3.5 w-3.5 text-[var(--sidebar-active-border)]"/>
                <div
                  className="absolute left-full ml-2 px-2.5 py-1.5 bg-[var(--bg-elevated)] border border-[var(--border-main)] text-[var(--text-primary)] text-xs rounded-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 whitespace-nowrap z-50 shadow-[var(--shadow-dropdown)]">
                  All Modules Active
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

export {MemoizedSidebar as Sidebar};
