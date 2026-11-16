'use client';

import {useMemo} from 'react';
import {ResponsiveTable, type Column, type RowActionItem} from '@/components/ui/ResponsiveTable';
import {StatusBadge} from '@/components/ui/StatusBadge';
import {EMPLOYEE_LIFECYCLE_STATUS} from '@/lib/status/vocabulary';
import type {Employee} from '@/lib/types/hrms/employee';
import {EmployeeAvatar} from './EmployeeAvatar';
import {joinedShort} from './employee-list-config';

interface EmployeesTableProps {
  employees: Employee[];
  visibleColumns: Set<string>;
  selected: Set<string>;
  onSelectionChange: (keys: Set<string>) => void;
  onOpen: (employee: Employee) => void;
  rowActions: (employee: Employee) => RowActionItem[];
}

function employeeColumn(onOpen: (employee: Employee) => void): Column<Employee> {
  return {
    key: 'employee',
    header: 'Employee',
    mobilePriority: 'primary',
    accessor: (e) => (
      <button
        type="button"
        className="flex min-w-0 items-center gap-2 rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
        aria-label={`View ${e.fullName} profile`}
        onClick={(event) => {
          event.stopPropagation();
          onOpen(e);
        }}
      >
        <EmployeeAvatar name={e.fullName} size={32} src={e.profilePhotoUrl}/>
        <span className="min-w-0">
          <span className="block truncate font-medium text-text-1">{e.fullName}</span>
          <span className="block truncate text-xs text-text-3">{e.workEmail}</span>
        </span>
      </button>
    ),
  };
}

const OPTIONAL_COLUMNS: Column<Employee>[] = [
  {key: 'role', header: 'Role', mobilePriority: 'secondary', accessor: (e) => e.designation ?? '—'},
  {key: 'department', header: 'Department', mobilePriority: 'secondary', accessor: (e) => e.departmentName ?? '—'},
  {
    key: 'location',
    header: 'Location',
    mobilePriority: 'hidden',
    accessor: (e) => [e.city, e.country].filter(Boolean).join(', ') || '—',
  },
  {
    key: 'joined',
    header: 'Joined',
    mobilePriority: 'hidden',
    accessor: (e) => <span className="whitespace-nowrap tabular-nums">{joinedShort(e.joiningDate)}</span>,
  },
];

const STATUS_COLUMN: Column<Employee> = {
  key: 'status',
  header: 'Status',
  mobilePriority: 'secondary',
  accessor: (e) => <StatusBadge status={e.status} domain={EMPLOYEE_LIFECYCLE_STATUS} compact/>,
};

export function EmployeesTable({
  employees,
  visibleColumns,
  selected,
  onSelectionChange,
  onOpen,
  rowActions,
}: EmployeesTableProps) {
  const columns = useMemo(
    () => [
      employeeColumn(onOpen),
      ...OPTIONAL_COLUMNS.filter((c) => visibleColumns.has(c.key)),
      STATUS_COLUMN,
    ],
    [visibleColumns, onOpen],
  );

  return (
    <ResponsiveTable
      columns={columns}
      data={employees}
      keyExtractor={(e) => e.id}
      stickyHeader
      selectable
      selectedKeys={selected}
      onSelectionChange={onSelectionChange}
      onRowClick={onOpen}
      rowActionsMenu={rowActions}
    />
  );
}
