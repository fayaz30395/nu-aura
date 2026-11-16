'use client';

import {ArrowRight, Briefcase, Calendar, TrendingDown, TrendingUp} from 'lucide-react';
import {StatusBadge} from '@/components/ui/StatusBadge';
import {COMPENSATION_REVISION_STATUS} from '@/lib/status/vocabulary';
import type {SalaryRevision} from '@/lib/types/hrms/compensation';
import {cn} from '@/lib/utils';
import {formatCurrency, formatDate, formatPercentage, formatRevisionType, getRevisionIcon} from './compensation-format';

export function RevisionCard({revision, isLatest}: {revision: SalaryRevision; isLatest: boolean}) {
  const Icon = getRevisionIcon(revision.revisionType);
  const isPositive = (revision.incrementAmount ?? 0) >= 0;
  const designationChanged =
    revision.newDesignation &&
    revision.previousDesignation &&
    revision.newDesignation !== revision.previousDesignation;

  return (
    <li className="flex gap-4 rounded-lg border border-border bg-card p-4">
      <span
        className={cn(
          'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full',
          isLatest ? 'bg-accent-100 text-accent-700 dark:bg-accent-900/30 dark:text-accent-400' : 'bg-surface-aura-sunken text-text-3'
        )}
        aria-hidden
      >
        <Icon className="h-4 w-4"/>
      </span>

      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-text-1">{formatRevisionType(revision.revisionType)}</h3>
            <p className="mt-1 flex items-center gap-1 text-xs text-text-2">
              <Calendar className="h-3 w-3" aria-hidden/>
              Effective {formatDate(revision.effectiveDate)}
            </p>
          </div>
          <StatusBadge status={revision.status} domain={COMPENSATION_REVISION_STATUS}/>
        </div>

        <dl className="flex flex-wrap items-center gap-4">
          <div>
            <dt className="text-xs text-text-3">Previous CTC</dt>
            <dd className="text-sm font-medium tabular-nums text-text-2">
              {formatCurrency(revision.previousSalary, revision.currency)}
            </dd>
          </div>
          <ArrowRight className="h-4 w-4 text-text-3" aria-hidden/>
          <div>
            <dt className="text-xs text-text-3">New CTC</dt>
            <dd className="text-sm font-semibold tabular-nums text-text-1">
              {formatCurrency(revision.newSalary, revision.currency)}
            </dd>
          </div>
          {revision.incrementPercentage != null && (
            <div
              className={cn(
                'flex items-center gap-1 text-sm font-semibold tabular-nums',
                isPositive ? 'text-success-700 dark:text-success-400' : 'text-danger-700 dark:text-danger-400'
              )}
            >
              {isPositive ? <TrendingUp className="h-4 w-4" aria-hidden/> : <TrendingDown className="h-4 w-4" aria-hidden/>}
              {formatPercentage(revision.incrementPercentage)}
            </div>
          )}
        </dl>

        {designationChanged && (
          <p className="flex flex-wrap items-center gap-2 text-xs text-text-2">
            <Briefcase className="h-3 w-3" aria-hidden/>
            <span>{revision.previousDesignation}</span>
            <ArrowRight className="h-3 w-3" aria-hidden/>
            <span className="font-medium text-text-1">{revision.newDesignation}</span>
          </p>
        )}

        {revision.justification && <p className="text-xs italic text-text-2">{revision.justification}</p>}
      </div>
    </li>
  );
}
