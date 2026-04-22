'use client';

import * as React from 'react';
import type {LucideIcon} from 'lucide-react';
import {cn} from '@/lib/utils';
import {typography, iconSize} from '@/lib/design-system';

export interface PageHeaderProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  title: React.ReactNode;
  /** Short descriptive sub-text rendered under the title. */
  description?: React.ReactNode;
  /** Optional breadcrumb element (typically `<Breadcrumbs />`) rendered above the title. */
  breadcrumbs?: React.ReactNode;
  /** Optional decorative icon rendered left of the title. */
  icon?: LucideIcon;
  /** Right-aligned action slot — buttons, filters, toggles. */
  actions?: React.ReactNode;
  /** When true, render a bottom border separator. */
  divider?: boolean;
}

export const PageHeader = React.forwardRef<HTMLDivElement, PageHeaderProps>(
  ({
     className,
     title,
     description,
     breadcrumbs,
     icon: Icon,
     actions,
     divider = false,
     ...props
   }, ref) => (
    <header
      ref={ref}
      className={cn(
        'w-full',
        divider && 'pb-4 border-b border-[var(--border-main)]',
        className
      )}
      {...props}
    >
      {breadcrumbs && <div className="mb-2">{breadcrumbs}</div>}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4 min-w-0">
          {Icon && (
            <span
              aria-hidden
              className='inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent-subtle text-accent'
            >
              <Icon className={iconSize.cardInline}/>
            </span>
          )}
          <div className="min-w-0">
            <h1 className={cn(typography.pageTitle, 'truncate')}>{title}</h1>
            {description && (
              <p className={cn(typography.bodySecondary, 'mt-1')}>{description}</p>
            )}
          </div>
        </div>
        {actions && (
          <div className="flex items-center gap-2 shrink-0">{actions}</div>
        )}
      </div>
    </header>
  )
);

PageHeader.displayName = 'PageHeader';

export default PageHeader;
