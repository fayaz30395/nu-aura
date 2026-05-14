'use client';

import React from 'react';
import Link from 'next/link';
import {ChevronRight, Home} from 'lucide-react';
import {cn} from '@/lib/utils';

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
                                                   separator,
                                                 }) => {
  const chevron = separator ?? (
    <ChevronRight
      className="h-3 w-3 text-[var(--text-muted)]"
      aria-hidden="true"
    />
  );

  return (
    <nav
      className={cn(
        'flex items-center gap-1.5 text-2xs font-medium uppercase tracking-[0.12em] text-[var(--text-muted)]',
        className,
      )}
      aria-label="breadcrumb"
    >
      {items.length > 0 && (
        <>
          <Link
            href="/"
            className="inline-flex items-center gap-1 rounded px-1 py-0.5 text-[var(--text-muted)] transition-colors hover:text-[var(--text-heading)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2"
          >
            <Home className="h-3.5 w-3.5" aria-hidden="true"/>
            <span className="sr-only sm:not-sr-only">Home</span>
          </Link>
          <span className="inline-flex items-center" aria-hidden="true">{chevron}</span>
        </>
      )}

      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <div
            key={`${item.label}-${index}`}
            className="inline-flex items-center gap-1.5"
          >
            {index > 0 && (
              <span className="inline-flex items-center" aria-hidden="true">{chevron}</span>
            )}

            {item.href && !isLast ? (
              <Link
                href={item.href}
                className="inline-flex items-center gap-1.5 rounded px-1 py-0.5 text-[var(--text-muted)] transition-colors hover:text-[var(--text-heading)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2"
              >
                {item.icon && <span className="flex items-center" aria-hidden="true">{item.icon}</span>}
                <span>{item.label}</span>
              </Link>
            ) : (
              <span
                className="inline-flex items-center gap-1.5 px-1 py-0.5 font-semibold text-[var(--text-heading)] normal-case tracking-normal text-xs"
                aria-current={isLast ? 'page' : undefined}
              >
                {item.icon && <span className="flex items-center" aria-hidden="true">{item.icon}</span>}
                {item.label}
              </span>
            )}
          </div>
        );
      })}
    </nav>
  );
};

export {Breadcrumbs};
