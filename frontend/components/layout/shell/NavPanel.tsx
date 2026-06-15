'use client';

/**
 * Aura Nav Panel — 232px dark contextual navigation.
 *
 * Product header (icon in product color + name + tag) · workspace switcher row ·
 * grouped nav (10px uppercase labels, 18px Lucide icons, active = --nav-active +
 * accent-300 icon, count pills incl. red Approvals badge) · "Unlock NU-Grow"
 * upsell footer.
 *
 * Fed from the EXISTING filtered SidebarSection[] registry so every real route
 * stays addressable. Navigation goes through Next.js <Link>. Token-driven only.
 */

import React from 'react';
import Link from 'next/link';
import {ChevronsUpDown, Sparkles} from 'lucide-react';
import {cn} from '@/lib/utils';
import type {SidebarItem, SidebarSection} from '@/components/ui';
import type {AppCode} from '@/lib/config/apps';
import {getShellProduct, SHELL_PRODUCT_HEADER_ICON} from './shellConfig';

const PRODUCT_HEADER_BG_CLASS: Record<AppCode, string> = {
  HRMS: 'bg-[var(--prod-hrms)]',
  HIRE: 'bg-[var(--prod-hire)]',
  GROW: 'bg-[var(--prod-grow)]',
  FLUENCE: 'bg-[var(--prod-fluence)]',
};

export interface NavPanelProps {
  /** Active sub-app — drives the product header + accent. */
  activeApp: AppCode;
  /** Filtered, RBAC-aware nav sections (from AppLayout). */
  sections: SidebarSection[];
  /** Active menu item id (or a child id) — highlights the row. */
  activeId?: string;
  /** Forwarded so the parent can react to navigation (e.g. analytics). */
  onItemClick?: (item: SidebarItem) => void;
  /** Collapsed state (panel toggle in the top bar). */
  collapsed?: boolean;
  /** Workspace switcher label + sub-label (real app metadata). */
  workspaceName?: string;
  workspaceSub?: string;
  /** "Start trial" upsell CTA. */
  onUpsell?: () => void;
}

function isItemActive(item: SidebarItem, activeId?: string): boolean {
  if (!activeId) return false;
  if (item.id === activeId) return true;
  return item.children?.some((c) => c.id === activeId) ?? false;
}

function NavRow({
                  item,
                  activeId,
                  onItemClick,
                }: {
  item: SidebarItem;
  activeId?: string;
  onItemClick?: (item: SidebarItem) => void;
}) {
  const active = isItemActive(item, activeId);
  // Items with children still navigate to the parent href (overview route).
  const href = item.href ?? item.children?.find((c) => c.href)?.href;

  const rowClass = cn(
    'group relative flex w-full items-center gap-[11px] rounded-[9px] px-[10px] py-2 text-left text-[13px] font-medium',
    'transform-gpu transition-[background-color,color,transform] duration-[var(--t-fast)] ease-[var(--ease)]',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]',
    active
      ? 'bg-[var(--nav-active)] font-semibold text-white'
      : 'text-[var(--on-rail)] hover:bg-[var(--nav-soft)] hover:text-white'
  );

  const content = (
    <>
      <span
        className={cn(
          'grid h-[18px] w-[18px] flex-shrink-0 place-items-center transition-colors duration-[var(--t-fast)] [&_svg]:h-[18px] [&_svg]:w-[18px]',
          active
            ? 'text-[var(--accent-300)]'
            : 'text-[var(--on-rail-dim)] group-hover:text-white'
        )}
      >
        {item.icon}
      </span>
      <span className="flex-1 truncate">{item.label}</span>
      {item.badge != null && (
        <span
          className={cn(
            'num rounded-full px-[7px] py-px text-[11px] font-bold leading-tight text-white',
            // Approvals (or any flagged) badge = red; others = neutral chip.
            item.id === 'approvals'
              ? 'bg-[var(--err-fg)]'
              : 'bg-white/10'
          )}
        >
          {item.badge}
        </span>
      )}
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        prefetch
        onClick={() => onItemClick?.(item)}
        aria-current={active ? 'page' : undefined}
        className={rowClass}
      >
        {content}
      </Link>
    );
  }

  return (
    <button type="button" onClick={() => onItemClick?.(item)} className={rowClass}>
      {content}
    </button>
  );
}

export function NavPanel({
                           activeApp,
                           sections,
                           activeId,
                           onItemClick,
                           collapsed = false,
                           workspaceName = 'All Modules Active',
                           workspaceSub = 'Pro Plan',
                           onUpsell,
                         }: NavPanelProps) {
  const product = getShellProduct(activeApp);

  return (
    <nav
      data-print-hide="true"
      aria-label={`${product.name} navigation`}
      className={cn(
        'relative z-30 flex flex-shrink-0 flex-col overflow-hidden border-r border-white/[0.05] bg-[var(--nav)] text-[var(--on-rail)]',
        'transition-[width] duration-[var(--t-slow)] ease-[var(--ease)]',
        collapsed ? 'w-0 border-0' : 'w-[232px]'
      )}
    >
      {/* Product header */}
      <div className="px-[18px] pb-[14px] pt-4">
        <div className="flex items-center gap-2.5">
          <div
            className={`grid h-[30px] w-[30px] place-items-center rounded-[9px] text-white [&_svg]:h-[17px] [&_svg]:w-[17px] ${PRODUCT_HEADER_BG_CLASS[activeApp]}`}
          >
            {SHELL_PRODUCT_HEADER_ICON[activeApp]}
          </div>
          <div className="min-w-0">
            <div className="truncate font-display text-[15px] font-bold tracking-[-0.01em] text-white">
              {product.name}
            </div>
            <div className="mt-px text-[10.5px] tracking-[0.02em] text-[var(--on-rail-dim)]">
              {product.tag}
            </div>
          </div>
        </div>
      </div>

      {/* Workspace switcher */}
      <button
        type="button"
        className="mx-[14px] mb-2.5 mt-1 flex items-center gap-[9px] rounded-[10px] bg-white/[0.04] px-2.5 py-2 text-left transition-[background-color] duration-[var(--t-fast)] ease-[var(--ease)] hover:bg-white/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
      >
        <span className="grid h-[26px] w-[26px] place-items-center rounded-[7px] bg-[var(--nu-grad-brand)] font-display text-[11px] font-bold text-white">
          NU
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[12.5px] font-semibold text-white">
            {workspaceName}
          </span>
          <span className="block truncate text-[10.5px] text-[var(--on-rail-dim)]">
            {workspaceSub}
          </span>
        </span>
        <ChevronsUpDown className="ml-auto h-[14px] w-[14px] text-[var(--on-rail-dim)]"/>
      </button>

      {/* Grouped nav */}
      <div className="flex-1 overflow-y-auto px-3 pb-3 pt-1.5 scrollbar-hide">
        {sections.map((section) => (
          <div key={section.id} className="mb-3.5">
            <div className="px-2.5 pb-1.5 pt-2 text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--on-rail-dim)]">
              {section.label}
            </div>
            <div className="space-y-px">
              {section.items.map((item) => (
                <NavRow
                  key={item.id}
                  item={item}
                  activeId={activeId}
                  onItemClick={onItemClick}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Upsell footer */}
      <div className="border-t border-white/[0.05] px-3.5 py-2.5">
        <div className="rounded-[11px] border border-white/[0.07] bg-[linear-gradient(150deg,rgba(104,132,220,0.16),rgba(139,92,246,0.10))] p-4">
          <div className="flex items-center gap-1.5 text-[12.5px] font-bold text-white">
            <Sparkles className="h-3.5 w-3.5 text-[var(--accent-300)]"/>
            Unlock NU-Grow
          </div>
          <div className="mb-[9px] mt-[3px] text-[11px] leading-[1.5] text-[var(--on-rail)]">
            Reviews, OKRs &amp; learning in one place.
          </div>
          <button
            type="button"
            onClick={onUpsell}
            className="inline-flex h-7 items-center rounded-[8px] bg-white/[0.08] px-3 text-[12px] font-semibold text-white transition-[background-color,transform] duration-[var(--t-fast)] ease-[var(--ease)] hover:bg-white/[0.14] active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          >
            Start trial
          </button>
        </div>
      </div>
    </nav>
  );
}
