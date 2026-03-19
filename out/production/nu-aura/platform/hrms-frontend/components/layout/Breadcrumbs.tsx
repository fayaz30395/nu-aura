'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: React.ReactNode;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
  separator?: React.ReactNode;
}

const Breadcrumbs: React.FC<BreadcrumbsProps> = ({
  items,
  className,
  separator = <ChevronRight className="h-4 w-4" />,
}) => {
  return (
    <nav
      className={cn(
        'flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400',
        className
      )}
      aria-label="breadcrumb"
    >
      <div className="flex items-center gap-2">
        {items.length > 0 && (
          <>
            <Link
              href="/"
              className="flex items-center gap-1 rounded-md hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-slate-50 px-2 py-1 transition-colors"
            >
              <Home className="h-4 w-4" />
              <span className="hidden sm:inline">Home</span>
            </Link>
            {separator}
          </>
        )}
      </div>

      <div className="flex items-center gap-2">
        {items.map((item, index) => (
          <div
            key={`${item.label}-${index}`}
            className="flex items-center gap-2"
          >
            {index > 0 && separator}

            {item.href ? (
              <Link
                href={item.href}
                className="flex items-center gap-1.5 rounded-md hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-slate-50 px-2 py-1 transition-colors"
              >
                {item.icon && <span className="flex items-center">{item.icon}</span>}
                <span>{item.label}</span>
              </Link>
            ) : (
              <span className="flex items-center gap-1.5 px-2 py-1 font-medium text-slate-900 dark:text-slate-50">
                {item.icon && <span className="flex items-center">{item.icon}</span>}
                {item.label}
              </span>
            )}
          </div>
        ))}
      </div>
    </nav>
  );
};

export { Breadcrumbs };
