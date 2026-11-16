'use client';

import {useRouter} from 'next/navigation';
import {ProfileIdentity} from '@/components/ui/ProfileHero';
import {ResponsiveTable, type Column} from '@/components/ui/ResponsiveTable';
import type {RowActionItem} from '@/components/ui/ResponsiveTable';
import {StatusBadge} from '@/components/ui/StatusBadge';
import {EMPLOYEE_LIFECYCLE_STATUS} from '@/lib/status/vocabulary';
import type {DirectoryEmployee} from './directory-options';

const COLUMNS: Column<DirectoryEmployee>[] = [
  {
    key: 'employee',
    header: 'Employee',
    mobilePriority: 'primary',
    accessor: (e) => (
      <ProfileIdentity name={e.fullName} photoUrl={e.profileImageUrl} secondary={e.employeeCode} size="sm"/>
    ),
  },
  {
    key: 'department',
    header: 'Department',
    accessor: (e) => (
      <div>
        <p className="text-sm text-text-1">{e.departmentName || '-'}</p>
        <p className="text-xs text-text-2">{e.designation || e.jobRole}</p>
      </div>
    ),
  },
  {
    key: 'contact',
    header: 'Contact',
    accessor: (e) => (
      <div>
        <p className="text-sm text-text-1">{e.personalEmail || '-'}</p>
        <p className="text-xs text-text-2">{e.phoneNumber || '-'}</p>
      </div>
    ),
  },
  {
    key: 'status',
    header: 'Status',
    mobilePriority: 'secondary',
    accessor: (e) => <StatusBadge status={e.status} domain={EMPLOYEE_LIFECYCLE_STATUS} compact/>,
  },
];

interface DirectoryTableProps {
  employees: DirectoryEmployee[];
  onSelect: (employee: DirectoryEmployee) => void;
}

export function DirectoryTable({employees, onSelect}: DirectoryTableProps) {
  const router = useRouter();

  const rowActions = (employee: DirectoryEmployee): RowActionItem[] => {
    const items: RowActionItem[] = [
      {label: 'Quick view', onClick: () => onSelect(employee)},
      {label: 'View full profile', onClick: () => router.push(`/employees/${employee.id}`)},
    ];
    if (employee.personalEmail) {
      items.push({label: 'Send email', onClick: () => window.location.assign(`mailto:${employee.personalEmail}`)});
    }
    if (employee.phoneNumber) {
      items.push({label: 'Call', onClick: () => window.location.assign(`tel:${employee.phoneNumber}`)});
    }
    return items;
  };

  return (
    <div className="rounded-lg border border-border bg-card">
      <ResponsiveTable
        columns={COLUMNS}
        data={employees}
        keyExtractor={(e) => e.id}
        stickyHeader
        onRowClick={onSelect}
        rowActionsMenu={rowActions}
      />
    </div>
  );
}
