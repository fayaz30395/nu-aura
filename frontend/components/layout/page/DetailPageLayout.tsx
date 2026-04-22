'use client';

import * as React from 'react';
import {cn} from '@/lib/utils';
import {PageContainer, type PageContainerProps} from './PageContainer';
import {PageHeader, type PageHeaderProps} from './PageHeader';

export interface DetailPageLayoutProps extends Omit<PageContainerProps, 'title'> {
  /** Header props forwarded to <PageHeader>. Pass `null` to suppress the header. */
  header?: PageHeaderProps | null;
  /** Right-hand rail for summary card, meta, timeline. */
  sidebar?: React.ReactNode;
  /** Sidebar position. Defaults to 'right'. */
  sidebarPosition?: 'left' | 'right';
  /** Main detail body. */
  children: React.ReactNode;
  /** Optional sticky action bar at the bottom. */
  footer?: React.ReactNode;
}

/**
 * DetailPageLayout renders a two-column detail view with an optional sidebar rail.
 * On small viewports the sidebar stacks below the main content.
 */
export const DetailPageLayout = React.forwardRef<HTMLDivElement, DetailPageLayoutProps>(
  ({
     className,
     header,
     sidebar,
     sidebarPosition = 'right',
     footer,
     children,
     ...containerProps
   }, ref) => (
    <PageContainer ref={ref} className={cn(className)} {...containerProps}>
      {header && <PageHeader {...header}/>}
      {sidebar ? (
        <div
          className={cn(
            'grid gap-4 md:gap-6',
            sidebarPosition === 'right'
              ? 'grid-cols-1 lg:grid-cols-[1fr_320px]'
              : 'grid-cols-1 lg:grid-cols-[320px_1fr]'
          )}
        >
          {sidebarPosition === 'left' && <aside className="min-w-0">{sidebar}</aside>}
          <div className="min-w-0 space-y-6">{children}</div>
          {sidebarPosition === 'right' && <aside className="min-w-0">{sidebar}</aside>}
        </div>
      ) : (
        <div className="space-y-6">{children}</div>
      )}
      {footer && (
        <div
          className="sticky bottom-0 z-10 -mx-4 md:-mx-6 lg:-mx-8 mt-4 border-t border-[var(--border-main)] bg-[var(--bg-card)] px-4 md:px-6 lg:px-8 py-3">
          {footer}
        </div>
      )}
    </PageContainer>
  )
);

DetailPageLayout.displayName = 'DetailPageLayout';

export default DetailPageLayout;
