'use client';

import * as React from 'react';
import {cn} from '@/lib/utils';
import {PageContainer, type PageContainerProps} from './PageContainer';
import {PageHeader, type PageHeaderProps} from './PageHeader';

export interface FormPageLayoutProps extends Omit<PageContainerProps, 'title'> {
  /** Header props forwarded to <PageHeader>. Pass `null` to suppress the header. */
  header?: PageHeaderProps | null;
  /** Optional aside — help panel, progress indicator, side notes. */
  aside?: React.ReactNode;
  /** Form body. Consumers render `<form>` themselves. */
  children: React.ReactNode;
  /** Sticky action bar (Save / Cancel). Rendered in a bordered footer region. */
  actions?: React.ReactNode;
}

/**
 * FormPageLayout centers form content at a readable max-width and provides
 * an optional aside column plus a sticky action bar.
 */
export const FormPageLayout = React.forwardRef<HTMLDivElement, FormPageLayoutProps>(
  ({
     className,
     header,
     aside,
     actions,
     children,
     width = 'md',
     ...containerProps
   }, ref) => (
    <PageContainer ref={ref} width={width} className={cn(className)} {...containerProps}>
      {header && <PageHeader {...header}/>}
      {aside ? (
        <div className="grid gap-4 md:gap-6 grid-cols-1 lg:grid-cols-[1fr_280px]">
          <div className="min-w-0 space-y-6">{children}</div>
          <aside className="min-w-0">{aside}</aside>
        </div>
      ) : (
        <div className="space-y-6">{children}</div>
      )}
      {actions && (
        <div
          className="sticky bottom-0 z-10 -mx-4 md:-mx-6 lg:-mx-8 mt-4 border-t border-[var(--border-main)] bg-[var(--bg-card)] px-4 md:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-end gap-2">{actions}</div>
        </div>
      )}
    </PageContainer>
  )
);

FormPageLayout.displayName = 'FormPageLayout';

export default FormPageLayout;
