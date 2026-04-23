'use client';

import React, {memo, useCallback, useEffect, useMemo, useState} from 'react';
import {ChevronDown} from 'lucide-react';
import {cn} from '@/lib/utils';
import {
  HEADER_HEIGHT,
  SIDEBAR_WIDTH_COLLAPSED,
  SIDEBAR_WIDTH_EXPANDED,
  STORAGE_KEY_COLLAPSED,
  STORAGE_KEY_COLLAPSED_SECTIONS,
  type SidebarItem,
  type SidebarProps,
  type SidebarSection,
} from './sidebar/types';
import {ChildrenFlyover} from './sidebar/ChildrenFlyover';
import {SidebarMenuItem} from './sidebar/SidebarMenuItem';
import {SectionDivider} from './sidebar/SectionDivider';
import {SidebarHeader} from './sidebar/SidebarHeader';
import {SidebarFooter} from './sidebar/SidebarFooter';
import {useShellDimensions} from '@/lib/theme/useShellDimensions';

export {SIDEBAR_WIDTH_EXPANDED, SIDEBAR_WIDTH_COLLAPSED, HEADER_HEIGHT};
export type {SidebarItem, SidebarSection, SidebarProps};

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
    const [openFlyoverId, setOpenFlyoverId] = useState<string | null>(null);
    const [flyoverTriggerRect, setFlyoverTriggerRect] = useState<DOMRect | null>(null);
    const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
    const shellDims = useShellDimensions();

    const sectionStorageKey = storageKeyPrefix
      ? `${storageKeyPrefix}-${STORAGE_KEY_COLLAPSED_SECTIONS}`
      : STORAGE_KEY_COLLAPSED_SECTIONS;

    useEffect(() => {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem(sectionStorageKey);
        if (saved) {
          try {
            setCollapsedSections(new Set(JSON.parse(saved)));
          } catch {
            // ignore parse errors
          }
        }
      }
    }, [sectionStorageKey]);

    useEffect(() => {
      setIsCollapsed(collapsed);
    }, [collapsed]);

    const handleCollapsedChange = useCallback(
      (newCollapsed: boolean) => {
        setIsCollapsed(newCollapsed);
        onCollapsedChange?.(newCollapsed);
        if (typeof window !== 'undefined') {
          localStorage.setItem(STORAGE_KEY_COLLAPSED, String(newCollapsed));
        }
        setOpenFlyoverId(null);
        setFlyoverTriggerRect(null);
      },
      [onCollapsedChange]
    );

    const handleToggleFlyover = useCallback(
      (itemId: string, rect: DOMRect | null) => {
        if (openFlyoverId === itemId) {
          setOpenFlyoverId(null);
          setFlyoverTriggerRect(null);
        } else {
          setOpenFlyoverId(itemId);
          setFlyoverTriggerRect(rect);
        }
      },
      [openFlyoverId]
    );

    const handleCloseFlyover = useCallback(() => {
      setOpenFlyoverId(null);
      setFlyoverTriggerRect(null);
    }, []);

    const handleToggleSection = useCallback(
      (sectionId: string) => {
        setCollapsedSections((prev) => {
          const next = new Set(prev);
          if (next.has(sectionId)) next.delete(sectionId);
          else next.add(sectionId);
          if (typeof window !== 'undefined') {
            localStorage.setItem(sectionStorageKey, JSON.stringify([...next]));
          }
          return next;
        });
      },
      [sectionStorageKey]
    );

    const groupedItems = useMemo<SidebarSection[]>(() => {
      if (sections) return sections;

      const groups: Record<string, SidebarItem[]> = {
        'Quick Access': [],
        'Management': [],
        'Settings': [],
      };

      items.forEach((item) => {
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
        .map(([label, sectionItems]) => ({
          id: label.toLowerCase().replace(/\s+/g, '-'),
          label,
          items: sectionItems,
        }));
    }, [items, sections]);

    const flyoverItem = useMemo(() => {
      if (!openFlyoverId) return null;
      for (const section of groupedItems) {
        const item = section.items.find((i) => i.id === openFlyoverId);
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
            width: isCollapsed ? shellDims.sidebarCollapsed : shellDims.sidebarExpanded,
            minWidth: isCollapsed ? shellDims.sidebarCollapsed : shellDims.sidebarExpanded,
            boxShadow: 'inset -1px 0 0 rgba(255, 255, 255, 0.04)',
          }}
        >
          <SidebarHeader
            isCollapsed={isCollapsed}
            collapsible={collapsible}
            onToggleCollapsed={() => handleCollapsedChange(!isCollapsed)}
          />

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
                      className="w-full row-between px-4 py-2.5 group rounded-md transition-all duration-200"
                      suppressHydrationWarning
                    >
                      <span
                        className="skeuo-deboss text-xs font-semibold uppercase tracking-wider transition-colors duration-200"
                        style={{color: 'var(--sidebar-section-text)'}}
                        suppressHydrationWarning
                      >
                        {section.label}
                      </span>
                      <ChevronDown
                        className={cn(
                          'h-3 w-3 transition-transform duration-300 ease-out',
                          !isSectionExpanded && '-rotate-90'
                        )}
                        style={{color: 'var(--sidebar-text-muted)'}}
                      />
                    </button>
                  )}

                  <div
                    className="space-y-0.5 overflow-hidden transition-all duration-150 ease-out"
                    style={isSectionExpanded ? {} : {height: 0, opacity: 0, pointerEvents: 'none'}}
                  >
                    {section.items.map((item) => (
                      <SidebarMenuItem
                        key={item.id}
                        item={item}
                        isActive={
                          activeId === item.id ||
                          (item.children?.some((c) => c.id === activeId) ?? false)
                        }
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

          <SidebarFooter isCollapsed={isCollapsed}/>
        </div>

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

const MemoizedSidebar = memo(Sidebar);
MemoizedSidebar.displayName = 'Sidebar';

export {MemoizedSidebar as Sidebar};
