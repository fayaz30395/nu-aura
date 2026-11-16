'use client';

import type {ReactNode} from 'react';
import {useRouter} from 'next/navigation';
import {formatDate as canonicalFormatDate} from '@/lib/utils/format/date';
import {EmployeeAvatar} from '../../_components/EmployeeAvatar';

export function formatDate(date?: string) {
  if (!date) return '-';
  return canonicalFormatDate(date);
}

export function formatEnumValue(value?: string) {
  if (!value) return '-';
  return value.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
}

export function InfoField({label, value}: {label: string; value: ReactNode}) {
  return (
    <div className="min-w-0 space-y-1">
      <dt className="text-xs font-medium text-text-3">{label}</dt>
      <dd className="break-words text-sm text-text-1">{value || '-'}</dd>
    </div>
  );
}

export function InfoGrid({children, columns = 2}: {children: ReactNode; columns?: 2 | 3}) {
  return (
    <dl className={`grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 ${columns === 3 ? 'xl:grid-cols-3' : ''}`}>
      {children}
    </dl>
  );
}

export function SectionCard({
  title,
  description,
  actions,
  children,
  className = '',
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-lg border border-border bg-card p-4 sm:p-6 ${className}`}>
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-text-1">{title}</h2>
          {description && <p className="mt-1 text-xs text-text-2">{description}</p>}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}

/** Avatar + name that navigates to another employee profile. */
export function PersonLink({
  id,
  name,
  subtitle,
  ariaLabel,
}: {
  id?: string;
  name: string;
  subtitle?: string;
  ariaLabel?: string;
}) {
  const router = useRouter();
  const body = (
    <>
      <EmployeeAvatar name={name} size={32}/>
      <span className="min-w-0 text-left">
        <span className={`block truncate text-sm font-medium ${id ? 'text-accent-700 group-hover:underline dark:text-accent-400' : 'text-text-1'}`}>
          {name}
        </span>
        {subtitle && <span className="block truncate text-xs text-text-3">{subtitle}</span>}
      </span>
    </>
  );
  if (!id) return <div className="flex min-w-0 items-center gap-2">{body}</div>;
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        router.push(`/employees/${id}`);
      }}
      aria-label={ariaLabel ?? `View profile of ${name}`}
      className="group flex min-w-0 items-center gap-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2"
    >
      {body}
    </button>
  );
}
