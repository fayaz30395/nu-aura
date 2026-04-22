'use client';

import * as React from 'react';
import {cn} from '@/lib/utils';
import {layout} from '@/lib/design-system';

type PageWidth = 'full' | 'wide' | 'md' | 'sm';

const WIDTH_CLASS: Record<PageWidth, string> = {
  full: 'w-full',
  wide: 'w-full max-w-screen-2xl mx-auto',
  md: 'w-full max-w-5xl mx-auto',
  sm: 'w-full max-w-3xl mx-auto',
};

export interface PageContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Max width preset. 'full' = stretch, 'wide' = 1536px cap, 'md' = 1024px, 'sm' = 768px. */
  width?: PageWidth;
  /** When false, skip the responsive page padding (`p-4 md:p-6 lg:p-8`). */
  padded?: boolean;
  /** When true, constrain vertical stacking to `layout.sectionGap`. */
  stacked?: boolean;
}

export const PageContainer = React.forwardRef<HTMLDivElement, PageContainerProps>(
  ({className, width = 'full', padded = true, stacked = true, children, ...props}, ref) => (
    <div
      ref={ref}
      className={cn(
        WIDTH_CLASS[width],
        padded && layout.pagePadding,
        stacked && layout.sectionGap,
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
);

PageContainer.displayName = 'PageContainer';

export default PageContainer;
