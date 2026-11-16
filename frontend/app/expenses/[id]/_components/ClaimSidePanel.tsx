'use client';

import {CheckCircle, Clock, DollarSign, XCircle} from 'lucide-react';
import {formatCurrency} from '@/lib/utils';
import {formatDate, formatDateTime} from '@/lib/utils/format/date';
import type {ExpenseClaim} from '@/lib/types/hrms/expense';

function Field({label, children}: {label: string; children: React.ReactNode}) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <dt className="text-xs text-text-3">{label}</dt>
      <dd className="text-right text-sm font-medium text-text-1">{children}</dd>
    </div>
  );
}

export function ClaimSidePanel({claim}: {claim: ExpenseClaim}) {
  const events = [
    claim.submittedAt && {
      key: 'submitted',
      icon: Clock,
      tone: 'text-accent-700 dark:text-accent-300',
      text: `Submitted on ${formatDateTime(claim.submittedAt)}`,
    },
    claim.approvedAt && {
      key: 'approved',
      icon: CheckCircle,
      tone: 'text-success-600',
      text: `Approved by ${claim.approvedByName ?? '—'} on ${formatDateTime(claim.approvedAt)}`,
    },
    claim.rejectedAt && {
      key: 'rejected',
      icon: XCircle,
      tone: 'text-danger-600',
      text: `Rejected by ${claim.rejectedByName ?? '—'} on ${formatDateTime(claim.rejectedAt)}${
        claim.rejectionReason ? `: "${claim.rejectionReason}"` : ''
      }`,
    },
    claim.reimbursedAt && {
      key: 'reimbursed',
      icon: DollarSign,
      tone: 'text-success-600',
      text: `Reimbursed on ${formatDateTime(claim.reimbursedAt)}`,
    },
  ].filter(Boolean) as {key: string; icon: typeof Clock; tone: string; text: string}[];

  return (
    <aside className="flex flex-col gap-4">
      <section aria-labelledby="claim-summary-heading" className="rounded-lg border border-border bg-card p-4">
        <h2 id="claim-summary-heading" className="text-base font-semibold text-text-1">Summary</h2>
        <dl className="mt-2 divide-y divide-border">
          <Field label="Total amount">
            <span className="tabular-nums">{formatCurrency(claim.amount, claim.currency)}</span>
          </Field>
          <Field label="Employee">{claim.employeeName ?? '—'}</Field>
          <Field label="Claim date">{formatDate(claim.claimDate)}</Field>
          <Field label="Category">{claim.categoryDisplayName || claim.category}</Field>
        </dl>
      </section>

      {events.length > 0 && (
        <section aria-labelledby="claim-timeline-heading" className="rounded-lg border border-border bg-card p-4">
          <h2 id="claim-timeline-heading" className="text-base font-semibold text-text-1">Approval timeline</h2>
          <ol className="mt-4 flex flex-col gap-4">
            {events.map(({key, icon: Icon, tone, text}) => (
              <li key={key} className="flex items-start gap-2">
                <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${tone}`} aria-hidden/>
                <p className="text-sm text-text-2">{text}</p>
              </li>
            ))}
          </ol>
        </section>
      )}

      {claim.notes && (
        <section aria-labelledby="claim-notes-heading" className="rounded-lg border border-border bg-card p-4">
          <h2 id="claim-notes-heading" className="text-base font-semibold text-text-1">Notes</h2>
          <p className="mt-2 whitespace-pre-line text-sm text-text-2">{claim.notes}</p>
        </section>
      )}
    </aside>
  );
}
