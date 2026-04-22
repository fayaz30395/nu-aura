'use client';

import * as React from 'react';
import {cn} from '@/lib/utils';
import {PageContainer, type PageContainerProps} from './PageContainer';
import {PageHeader, type PageHeaderProps} from './PageHeader';

export interface ListPageLayoutProps extends Omit<PageContainerProps, 'title'> {
  /** Header props forwarded to <PageHeader>. Pass `null` to suppress the header. */
  header?: PageHeaderProps | null;
  /** Filters / search controls rendered above the list. */
  filters?: React.ReactNode;
  /** Bulk-action or pagination slot rendered directly above the list body. */
  toolbar?: React.ReactNode;
  /** The main list body — table, grid, etc. */
  children: React.ReactNode;
  /** Optional footer (pagination, load-more button). */
  footer?: React.ReactNode;
}

/**
 * ListPageLayout composes PageContainer + PageHeader + optional filters/toolbar/footer
 * into the canonical list-page shell. Consumers only supply the domain content.
 */
export const ListPageLayout = React.forwardRef<HTMLDivElement, ListPageLayoutProps>(
  ({className, header, filters, toolbar, footer, children, ...containerProps}, ref) => (
    <PageContainer ref={ref} className={cn(className)} {...containerProps}>
      {header && <PageHeader {...header}/>}
      {filters && <div>{filters}</div>}
      {toolbar && <div>{toolbar}</div>}
      <div>{children}</div>
      {footer && <div>{footer}</div>}
    </PageContainer>
  )
);

ListPageLayout.displayName = 'ListPageLayout';

export default ListPageLayout;
