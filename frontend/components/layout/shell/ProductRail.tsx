'use client';

/**
 * Aura Product Rail — 72px dark vertical strip.
 *
 * NULogic gradient "N" mark · 4 product buttons (HRMS/Hire/Grow/Fluence) with
 * a product-colored active indicator + glow + tinted chip + hover tooltip ·
 * help button + 34px user avatar pinned to the bottom.
 *
 * Token-driven: background `--rail`, product accents via `--prod-*`, all radii
 * and motion from the Aura token layer. Motion is transform/opacity only and
 * never rests at opacity:0.
 */

import React from 'react';
import {LifeBuoy} from 'lucide-react';
import {cn, getInitials} from '@/lib/utils';
import type {AppCode} from '@/lib/config/apps';
import {SHELL_PRODUCTS} from './shellConfig';

const PRODUCT_ACCENT_CLASSES: Record<AppCode, {
  ring: string;
  indicator: string;
  chip: string;
  glow: string;
}> = {
  HRMS: {
    ring: 'focus-visible:ring-[var(--prod-hrms)]',
    indicator: 'bg-[var(--prod-hrms)]',
    chip: 'bg-[color-mix(in_srgb,var(--prod-hrms)_24%,transparent)] shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--prod-hrms)_45%,transparent)]',
    glow: 'shadow-[0_0_12px_var(--prod-hrms)]',
  },
  HIRE: {
    ring: 'focus-visible:ring-[var(--prod-hire)]',
    indicator: 'bg-[var(--prod-hire)]',
    chip: 'bg-[color-mix(in_srgb,var(--prod-hire)_24%,transparent)] shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--prod-hire)_45%,transparent)]',
    glow: 'shadow-[0_0_12px_var(--prod-hire)]',
  },
  GROW: {
    ring: 'focus-visible:ring-[var(--prod-grow)]',
    indicator: 'bg-[var(--prod-grow)]',
    chip: 'bg-[color-mix(in_srgb,var(--prod-grow)_24%,transparent)] shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--prod-grow)_45%,transparent)]',
    glow: 'shadow-[0_0_12px_var(--prod-grow)]',
  },
  FLUENCE: {
    ring: 'focus-visible:ring-[var(--prod-fluence)]',
    indicator: 'bg-[var(--prod-fluence)]',
    chip: 'bg-[color-mix(in_srgb,var(--prod-fluence)_24%,transparent)] shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--prod-fluence)_45%,transparent)]',
    glow: 'shadow-[0_0_12px_var(--prod-fluence)]',
  },
};

export interface ProductRailProps {
  /** Currently active sub-app (derived from the route). */
  activeApp: AppCode;
  /** Switch products — navigates to the app's entry route. */
  onSelectProduct: (code: AppCode) => void;
  /** Whether the user can access a given product (RBAC gate). */
  canAccess?: (code: AppCode) => boolean;
  /** Avatar click — opens the user's profile. */
  onAvatar?: () => void;
  /** Help button click. */
  onHelp?: () => void;
  userName?: string;
  userAvatarUrl?: string;
}

export function ProductRail({
                              activeApp,
                              onSelectProduct,
                              canAccess,
                              onAvatar,
                              onHelp,
                              userName = 'User',
                              userAvatarUrl,
                            }: ProductRailProps) {
  return (
    <aside
      data-print-hide="true"
      aria-label="Product navigation"
      className="relative z-40 flex w-[72px] flex-shrink-0 flex-col items-center gap-1 border-r border-white/[0.04] bg-[var(--rail)] pb-3 pt-3.5"
    >
      {/* Brand mark — NULogic gradient "N" */}
      <div
        title="NU-AURA"
        className="relative mb-3 grid h-10 w-10 place-items-center rounded-[11px] bg-[var(--nu-grad-brand)] shadow-[0_4px_14px_rgba(180,58,134,0.4),inset_0_1px_0_rgba(255,255,255,0.25)]"
      >
        <span className="font-display text-[17px] font-extrabold tracking-[-0.04em] text-white">
          N
        </span>
      </div>

      <div className="mx-auto mb-1.5 h-px w-[26px] bg-white/[0.08]"/>

      {/* Product buttons */}
      {SHELL_PRODUCTS.map((p) => {
        const isActive = activeApp === p.code;
        const disabled = canAccess ? !canAccess(p.code) : false;
        const accent = PRODUCT_ACCENT_CLASSES[p.code];
        return (
          <button
            key={p.code}
            type="button"
            data-tip={p.name}
            aria-label={p.name}
            aria-current={isActive ? 'true' : undefined}
            disabled={disabled}
            onClick={() => onSelectProduct(p.code)}
            className={cn(
              'group relative grid h-[46px] w-[46px] place-items-center rounded-[13px]',
              'transform-gpu transition-[color,background-color,transform] duration-[var(--t-base)] ease-[var(--ease)]',
              'focus-visible:outline-none focus-visible:ring-2',
              accent.ring,
              isActive ? 'text-white' : 'text-[var(--on-rail-dim)]',
              disabled
                ? 'cursor-not-allowed opacity-40'
                : 'hover:bg-white/[0.06] hover:text-white active:scale-[0.94]'
            )}
          >
            {/* Active 4px left indicator + glow */}
            <span
              aria-hidden
              className={cn(
                `pointer-events-none absolute -left-[14px] top-1/2 h-[22px] w-1 -translate-y-1/2 rounded-r-[4px] ${accent.indicator}`,
                'transform-gpu origin-center transition-[transform,opacity] duration-[var(--t-base)] ease-[var(--ease)]',
                isActive
                  ? `scale-y-100 opacity-100 ${accent.glow}`
                  : 'scale-y-0 opacity-0'
              )}
            />
            {/* Tinted chip behind the icon when active */}
            <span
              aria-hidden
              className={cn(
                'absolute inset-0 rounded-[13px] transition-[background-color,box-shadow] duration-[var(--t-base)] ease-[var(--ease)]',
                isActive
                  ? accent.chip
                  : ''
              )}
            />
            <span className="relative z-[1]">{p.icon}</span>

            {/* Hover tooltip to the right */}
            <span
              aria-hidden
              className="pointer-events-none absolute left-[56px] top-1/2 z-50 -translate-y-1/2 translate-x-[-4px] whitespace-nowrap rounded-lg border border-white/[0.08] bg-[var(--rail-2)] px-2.5 py-1.5 text-xs font-semibold text-white opacity-0 shadow-[var(--sh-pop)] transition-[opacity,transform] duration-[var(--t-fast)] ease-[var(--ease)] group-hover:translate-x-0 group-hover:opacity-100"
            >
              {p.name}
            </span>
          </button>
        );
      })}

      <div className="flex-1"/>

      {/* Help */}
      <button
        type="button"
        data-tip="Help & support"
        aria-label="Help & support"
        onClick={onHelp}
        className="group relative grid h-[46px] w-[46px] place-items-center rounded-[13px] text-[var(--on-rail-dim)] transition-[color,background-color,transform] duration-[var(--t-base)] ease-[var(--ease)] hover:bg-white/[0.06] hover:text-white active:scale-[0.94] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
      >
        <LifeBuoy className="h-5 w-5"/>
        <span
          aria-hidden
          className="pointer-events-none absolute left-[56px] top-1/2 z-50 -translate-y-1/2 translate-x-[-4px] whitespace-nowrap rounded-lg border border-white/[0.08] bg-[var(--rail-2)] px-2.5 py-1.5 text-xs font-semibold text-white opacity-0 shadow-[var(--sh-pop)] transition-[opacity,transform] duration-[var(--t-fast)] ease-[var(--ease)] group-hover:translate-x-0 group-hover:opacity-100"
        >
          Help &amp; support
        </span>
      </button>

      {/* User avatar */}
      <button
        type="button"
        onClick={onAvatar}
        aria-label="Your profile"
        className="mt-1.5 grid h-[34px] w-[34px] place-items-center overflow-hidden rounded-[11px] bg-[var(--nav-active)] text-[11px] font-semibold text-white shadow-[0_0_0_2px_rgba(255,255,255,0.08)] transition-transform duration-[var(--t-fast)] ease-[var(--ease)] hover:scale-[1.05] active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
      >
        {userAvatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={userAvatarUrl} alt={userName} className="h-full w-full object-cover"/>
        ) : (
          <span className="num">{getInitials(userName)}</span>
        )}
      </button>
    </aside>
  );
}
