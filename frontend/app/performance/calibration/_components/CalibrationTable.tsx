'use client';

import {Button, NumberInput} from '@mantine/core';
import {Info} from 'lucide-react';
import {ResponsiveTable, type Column} from '@/components/ui/ResponsiveTable';
import {EmptyState} from '@/components/ui/EmptyState';
import {PermissionGate} from '@/components/auth/PermissionGate';
import {Permissions} from '@/lib/hooks/usePermissions';
import {RatingBadge} from './CalibrationSummary';
import type {EmployeeRatingRow, SortField, SortOrder} from './calibrationModel';

interface CalibrationTableProps {
  rows: EmployeeRatingRow[];
  overrides: Record<string, number>;
  sortField: SortField;
  sortOrder: SortOrder;
  savingEmployeeId: string | null;
  onSort: (field: SortField) => void;
  onRatingChange: (employeeId: string, value: number | string) => void;
  onSave: (row: EmployeeRatingRow) => void;
}

const isDirty = (row: EmployeeRatingRow, overrides: Record<string, number>) =>
  overrides[row.employeeId] != null && overrides[row.employeeId] !== row.finalRating;

const ratingsDiverge = (row: EmployeeRatingRow) =>
  row.managerRating != null && row.selfRating != null && Math.abs(row.managerRating - row.selfRating) > 0.5;

export function CalibrationTable({
  rows,
  overrides,
  sortField,
  sortOrder,
  savingEmployeeId,
  onSort,
  onRatingChange,
  onSave,
}: CalibrationTableProps) {
  const columns: Column<EmployeeRatingRow>[] = [
    {
      key: 'name',
      header: 'Employee',
      sortable: true,
      mobilePriority: 'primary',
      accessor: (row) => <span className="font-medium text-text-1">{row.employeeName}</span>,
    },
    {key: 'department', header: 'Department', sortable: true, accessor: (row) => row.department},
    {key: 'self', header: 'Self Rating', align: 'center', accessor: (row) => <RatingBadge rating={row.selfRating}/>},
    {
      key: 'manager',
      header: 'Manager Rating',
      align: 'center',
      accessor: (row) => <RatingBadge rating={row.managerRating}/>,
    },
    {
      key: 'rating',
      header: 'Final Rating',
      align: 'center',
      sortable: true,
      accessor: (row) => (
        <NumberInput
          aria-label={`Final rating for ${row.employeeName}`}
          size="sm"
          w={96}
          min={1}
          max={5}
          step={0.5}
          decimalScale={1}
          placeholder="1–5"
          value={overrides[row.employeeId] ?? row.finalRating ?? ''}
          onChange={(value) => onRatingChange(row.employeeId, value)}
          className="mx-auto"
        />
      ),
    },
    {
      key: 'action',
      header: 'Action',
      align: 'center',
      accessor: (row) =>
        isDirty(row, overrides) ? (
          <PermissionGate permission={Permissions.CALIBRATION_MANAGE}>
            <Button loading={savingEmployeeId === row.employeeId} onClick={() => onSave(row)}>
              Save
            </Button>
          </PermissionGate>
        ) : null,
    },
  ];

  return (
    <ResponsiveTable
      columns={columns}
      data={rows}
      keyExtractor={(row) => row.employeeId}
      sortColumn={sortField}
      sortDirection={sortOrder}
      onSort={(column) => onSort(column as SortField)}
      rowClassName={(row) => (isDirty(row, overrides) || ratingsDiverge(row) ? 'bg-warning-50' : '')}
      emptyState={
        <EmptyState
          icon={<Info className="h-8 w-8"/>}
          title="No reviews found"
          description="Activate the cycle to generate reviews for employees"
        />
      }
    />
  );
}
