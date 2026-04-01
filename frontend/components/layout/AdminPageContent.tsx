'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export interface AdminPageContentProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * AdminPageContent
 *
 * Simple content wrapper for admin pages.
 * The admin layout (app/admin/layout.tsx) already provides Header + Sidebar,
 * so pages should NOT use AppLayout (which would create a duplicate layout).
 *
 * This wrapper just provides styling and structure for the page content.
 */
const AdminPageContent: React.FC<AdminPageContentProps> = ({
  children,
  className,
}) => {
  return (
    <div className={cn(
      'w-full h-full',
      className,
    )}>
      {children}
    </div>
  );
};

export { AdminPageContent };
