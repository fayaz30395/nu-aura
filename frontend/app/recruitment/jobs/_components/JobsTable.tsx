'use client';

import {ResponsiveTable, type Column, type RowActionItem} from '@/components/ui/ResponsiveTable';
import {StatusBadge} from '@/components/ui/StatusBadge';
import {JOB_STATUS} from '@/lib/status/vocabulary';
import type {JobOpening} from '@/lib/types/hire/recruitment';
import {formatDate} from '@/lib/utils/format/date';
import {PRIORITY_OPTIONS, PRIORITY_TONE} from './job-options';

const priorityLabel = (value: string) => PRIORITY_OPTIONS.find((o) => o.value === value)?.label ?? value;

function salaryRange(job: JobOpening): string {
  if (job.minSalary && job.maxSalary) return `${job.minSalary.toLocaleString()} – ${job.maxSalary.toLocaleString()}`;
  return job.minSalary?.toLocaleString() || job.maxSalary?.toLocaleString() || '—';
}

const COLUMNS: Column<JobOpening>[] = [
  {
    key: 'job',
    header: 'Job',
    mobilePriority: 'primary',
    accessor: (job) => (
      <span className="block min-w-0">
        <span className="block truncate font-medium text-text-1">{job.jobTitle}</span>
        <span className="block truncate text-xs text-text-3">{job.jobCode}</span>
      </span>
    ),
  },
  {key: 'department', header: 'Department', mobilePriority: 'secondary', accessor: (job) => job.departmentName || '—'},
  {key: 'location', header: 'Location', mobilePriority: 'hidden', accessor: (job) => job.location || '—'},
  {key: 'salary', header: 'Salary', mobilePriority: 'hidden', numeric: true, accessor: salaryRange},
  {
    key: 'openings',
    header: 'Openings',
    mobilePriority: 'hidden',
    numeric: true,
    accessor: (job) => job.numberOfOpenings ?? '—',
  },
  {
    key: 'priority',
    header: 'Priority',
    mobilePriority: 'hidden',
    accessor: (job) =>
      job.priority ? (
        <StatusBadge status={job.priority} label={priorityLabel(job.priority)} tone={PRIORITY_TONE[job.priority]} compact/>
      ) : '—',
  },
  {
    key: 'closing',
    header: 'Closes',
    mobilePriority: 'hidden',
    accessor: (job) => (job.closingDate ? <span className="whitespace-nowrap tabular-nums">{formatDate(job.closingDate)}</span> : '—'),
  },
  {
    key: 'status',
    header: 'Status',
    mobilePriority: 'secondary',
    accessor: (job) => <StatusBadge status={job.status} domain={JOB_STATUS} compact/>,
  },
];

interface JobsTableProps {
  jobs: JobOpening[];
  onOpen: (job: JobOpening) => void;
  rowActions: (job: JobOpening) => RowActionItem[];
}

export function JobsTable({jobs, onOpen, rowActions}: JobsTableProps) {
  return (
    <ResponsiveTable
      columns={COLUMNS}
      data={jobs}
      keyExtractor={(job) => job.id}
      stickyHeader
      onRowClick={onOpen}
      rowActionsMenu={rowActions}
    />
  );
}
