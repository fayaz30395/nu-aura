/**
 * Aura app-shell static configuration.
 *
 * Maps the platform's 4 sub-apps (HRMS / Hire / Grow / Fluence) onto the
 * product rail, and pairs each with a Lucide icon + product-accent token.
 * These tokens resolve to `--prod-*` CSS vars (token-driven, no hardcoded hex).
 *
 * The nav panel and command palette are fed from the EXISTING menu registry
 * (`buildMenuSections` / filtered sections in AppLayout), not from this file —
 * this only describes the rail products + their entry metadata.
 */

import React from 'react';
import {BookOpen, Briefcase, TrendingUp, Users} from 'lucide-react';
import type {AppCode} from '@/lib/config/apps';

export interface ShellProduct {
  /** Platform app code — the canonical identity. */
  code: AppCode;
  /** Display name shown in tooltip + nav header. */
  name: string;
  /** Short contextual tag under the product name. */
  tag: string;
  /** Pre-allocated Lucide icon element (rail + nav header use it). */
  icon: React.ReactNode;
  /** CSS var reference for the product accent — never a literal hex. */
  color: string;
}

// Pre-allocated once at module scope so the rail doesn't re-create icons on
// every render (mirrors the menuSections optimization).
export const SHELL_PRODUCTS: ShellProduct[] = [
  {
    code: 'HRMS',
    name: 'NU-HRMS',
    tag: 'Core HR',
    icon: <Users className="h-[21px] w-[21px]"/>,
    color: 'var(--prod-hrms)',
  },
  {
    code: 'HIRE',
    name: 'NU-Hire',
    tag: 'Recruitment',
    icon: <Briefcase className="h-[21px] w-[21px]"/>,
    color: 'var(--prod-hire)',
  },
  {
    code: 'GROW',
    name: 'NU-Grow',
    tag: 'Performance',
    icon: <TrendingUp className="h-[21px] w-[21px]"/>,
    color: 'var(--prod-grow)',
  },
  {
    code: 'FLUENCE',
    name: 'NU-Fluence',
    tag: 'Knowledge',
    icon: <BookOpen className="h-[21px] w-[21px]"/>,
    color: 'var(--prod-fluence)',
  },
];

/** Smaller (17px) icon variant for the nav-panel product header. */
export const SHELL_PRODUCT_HEADER_ICON: Record<AppCode, React.ReactNode> = {
  HRMS: <Users className="h-[17px] w-[17px]"/>,
  HIRE: <Briefcase className="h-[17px] w-[17px]"/>,
  GROW: <TrendingUp className="h-[17px] w-[17px]"/>,
  FLUENCE: <BookOpen className="h-[17px] w-[17px]"/>,
};

export function getShellProduct(code: AppCode): ShellProduct {
  return SHELL_PRODUCTS.find((p) => p.code === code) ?? SHELL_PRODUCTS[0];
}
