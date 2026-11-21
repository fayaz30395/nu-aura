'use client';

import React from 'react';
import {Breadcrumbs, type BreadcrumbItem} from '@/components/layout/Breadcrumbs';
import {cn} from '@/lib/utils';

/** Props for {@link PageHeader}. */
export interface PageHeaderProps {
  /** Page title, rendered as the page's single h1. */
  title: React.ReactNode;
  /** Optional one-line description under the title. */
  description?: React.ReactNode;
  breadcrumbs?: BreadcrumbItem[];
  /** Right-aligned actions: at most one primary button, secondary as default/subtle, overflow in a Menu. */
  actions?: React.ReactNode;
  className?: string;
}

/** Canonical page header: optional breadcrumbs, h1 title, description, and actions slot. */
export function PageHeader({title, description, breadcrumbs, actions, className}: PageHeaderProps) {
  return (
    <header className={cn('flex flex-col gap-2', className)}>
      {breadcrumbs && breadcrumbs.length > 0 && <Breadcrumbs items={breadcrumbs} />}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight text-text-1">{title}</h1>
          {description && <p className="line-clamp-2 max-w-3xl text-sm text-text-2">{description}</p>}
        </div>
        {actions && <div className="flex min-w-0 max-w-full flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}
