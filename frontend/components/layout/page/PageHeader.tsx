'use client';

import * as React from 'react';
import type {LucideIcon} from 'lucide-react';
import {cn} from '@/lib/utils';
import {typography, iconSize} from '@/lib/design-system';
import {useThemeVersion} from '@/lib/theme/ThemeVersionProvider';

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
   }, ref) => {
    const isV2 = useThemeVersion() === 'v2';
    return (
    <header
      ref={ref}
      className={cn(
        'w-full',
        isV2 ? 'py-5' : '',
        divider && (isV2 ? 'pb-5 border-b border-[var(--border-main)]' : 'pb-4 border-b border-[var(--border-main)]'),
        className
      )}
      {...props}
    >
      {breadcrumbs && <div className={cn(isV2 ? 'mb-1' : 'mb-2')}>{breadcrumbs}</div>}
      <div className="flex items-start justify-between gap-4">
        <div className={cn('flex items-start min-w-0', isV2 ? 'gap-3' : 'gap-4')}>
          {Icon && (
            <span
              aria-hidden
              className={cn(
                'inline-flex shrink-0 items-center justify-center bg-accent-subtle text-accent',
                isV2 ? 'h-8 w-8 rounded-md' : 'h-10 w-10 rounded-lg',
              )}
            >
              <Icon className={iconSize.cardInline}/>
            </span>
          )}
          <div className="min-w-0">
            <h1 className={cn(typography.pageTitle, 'truncate', isV2 && 'text-xl leading-tight')}>{title}</h1>
            {description && (
              <p className={cn(typography.bodySecondary, isV2 ? 'mt-0.5' : 'mt-1')}>{description}</p>
            )}
          </div>
        </div>
        {actions && (
          <div className="flex items-center gap-2 shrink-0">{actions}</div>
        )}
      </div>
    </header>
    );
  }
);

PageHeader.displayName = 'PageHeader';

export default PageHeader;
