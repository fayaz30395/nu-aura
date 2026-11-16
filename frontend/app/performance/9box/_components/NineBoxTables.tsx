'use client';

import {Badge, NumberInput, TextInput} from '@mantine/core';
import {Search, Users} from 'lucide-react';
import {type Column, ResponsiveTable} from '@/components/ui/ResponsiveTable';
import {EmptyState} from '@/components/ui/EmptyState';
import {cn} from '@/lib/utils';
import {BOX_CONFIG, boxKey, type EmployeePoint, type SortField} from './nineBoxModel';

type PotentialChange = (employeeId: string, value: number | string) => void;

function PotentialInput({point, overrides, onChange}: {
  point: EmployeePoint;
  overrides: Record<string, number>;
  onChange: PotentialChange;
}) {
  return (
    <NumberInput
      aria-label={`Potential score for ${point.employeeName}`}
      size="sm"
      w={96}
      min={1}
      max={5}
      step={0.5}
      value={overrides[point.employeeId] ?? Number(point.potential.toFixed(1))}
      onChange={(value) => onChange(point.employeeId, value)}
      className="mx-auto"
    />
  );
}

const nameColumn: Column<EmployeePoint> = {
  key: 'name',
  header: 'Employee',
  mobilePriority: 'primary',
  accessor: (p) => <span className="font-medium text-text-1">{p.employeeName}</span>,
};

const performanceColumn: Column<EmployeePoint> = {
  key: 'performance',
  header: 'Performance',
  align: 'center',
  numeric: true,
  accessor: (p) => p.performance.toFixed(1),
};

const potentialColumn = (overrides: Record<string, number>, onChange: PotentialChange): Column<EmployeePoint> => ({
  key: 'potential',
  header: 'Potential',
  align: 'center',
  accessor: (p) => <PotentialInput point={p} overrides={overrides} onChange={onChange}/>,
});

interface SelectedBoxPanelProps {
  boxKey: string;
  points: EmployeePoint[];
  overrides: Record<string, number>;
  onPotentialChange: PotentialChange;
}

export function SelectedBoxPanel({boxKey: key, points, overrides, onPotentialChange}: SelectedBoxPanelProps) {
  const meta = BOX_CONFIG[key];
  return (
    <section className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4 sm:p-6">
      <header className="flex flex-wrap items-center gap-4">
        <span className={cn('rounded-lg border px-4 py-1.5 text-sm font-bold', meta.bg, meta.border, meta.text)}>
          {meta.label}
        </span>
        <span className="text-sm text-text-2">{meta.sublabel}</span>
        <span className="ml-auto text-sm font-semibold text-text-2">{points.length} employees</span>
      </header>
      <ResponsiveTable
        columns={[nameColumn, performanceColumn, potentialColumn(overrides, onPotentialChange)]}
        data={points}
        keyExtractor={(p) => p.employeeId}
        emptyState={<EmptyState icon={<Users className="h-8 w-8"/>} title="No employees in this box"/>}
      />
      <p className="text-xs text-text-2">Edit potential scores to re-plot employees in the grid dynamically</p>
    </section>
  );
}

interface AllEmployeesTableProps {
  points: EmployeePoint[];
  overrides: Record<string, number>;
  searchQuery: string;
  sortField: SortField;
  onSearchChange: (value: string) => void;
  onSort: (field: SortField) => void;
  onPotentialChange: PotentialChange;
}

export function AllEmployeesTable({
  points,
  overrides,
  searchQuery,
  sortField,
  onSearchChange,
  onSort,
  onPotentialChange,
}: AllEmployeesTableProps) {
  const columns: Column<EmployeePoint>[] = [
    {...nameColumn, sortable: true},
    {...performanceColumn, sortable: true},
    {...potentialColumn(overrides, onPotentialChange), header: 'Potential (est.)', sortable: true},
    {
      key: 'category',
      header: 'Category',
      align: 'center',
      accessor: (p) => {
        const meta = BOX_CONFIG[boxKey(p.performance, p.potential)];
        return (
          <Badge variant="transparent" radius="xl" className={cn(meta?.bg, meta?.text)}>
            {meta?.label ?? '—'}
          </Badge>
        );
      },
    },
  ];

  return (
    <section className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4 sm:p-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <h2 className="text-sm font-semibold text-text-1">All Employees</h2>
        <TextInput
          aria-label="Search..."
          placeholder="Search..."
          leftSection={<Search className="h-4 w-4" aria-hidden/>}
          value={searchQuery}
          onChange={(e) => onSearchChange(e.currentTarget.value)}
          className="w-full sm:ml-auto sm:w-64"
        />
      </header>
      <ResponsiveTable
        columns={columns}
        data={points}
        keyExtractor={(p) => p.employeeId}
        sortColumn={sortField}
        sortDirection="asc"
        onSort={(column) => onSort(column as SortField)}
        emptyState={
          <EmptyState
            icon={<Search className="h-8 w-8"/>}
            title="No matching employees"
            description="No employees match your search."
            actionLabel="Clear search"
            onAction={() => onSearchChange('')}
          />
        }
      />
      <p className="text-xs text-text-2">
        Potential scores are estimated from review ratings until a dedicated potential assessment is completed.
      </p>
    </section>
  );
}
