'use client';

import {Button, Checkbox} from '@mantine/core';
import {Upload} from 'lucide-react';
import {PermissionGate} from '@/components/auth/PermissionGate';
import {Callout} from '@/components/ui/Callout';
import {ResponsiveTable, type Column} from '@/components/ui/ResponsiveTable';
import {Stat} from '@/components/ui/Stat';
import {StatusBadge} from '@/components/ui/StatusBadge';
import {Permissions} from '@/lib/hooks/usePermissions';
import type {EmployeeImportPreview, EmployeeImportRowPreview} from '@/lib/types/hrms/employee';

const PREVIEW_COLUMNS: Column<EmployeeImportRowPreview>[] = [
  {key: 'row', header: 'Row', numeric: true, width: '64px', accessor: (row) => row.rowNumber},
  {
    key: 'status',
    header: 'Status',
    mobilePriority: 'secondary',
    accessor: (row) =>
      row.isValid ? <StatusBadge compact label="Valid" tone="success"/> : <StatusBadge compact label="Invalid" tone="danger"/>,
  },
  {key: 'code', header: 'Employee Code', accessor: (row) => row.employeeCode},
  {key: 'name', header: 'Name', mobilePriority: 'primary', accessor: (row) => row.fullName},
  {key: 'email', header: 'Email', accessor: (row) => row.workEmail},
  {key: 'department', header: 'Department', accessor: (row) => row.departmentName || '-'},
  {
    key: 'errors',
    header: 'Errors',
    accessor: (row) =>
      row.rowErrors.length > 0 ? (
        <ul className="flex flex-col gap-1 text-xs text-danger-600 dark:text-danger-400">
          {row.rowErrors.map((err, idx) => (
            <li key={idx}>{err}</li>
          ))}
        </ul>
      ) : (
        '-'
      ),
  },
];

interface PreviewStepProps {
  preview: EmployeeImportPreview;
  loading: boolean;
  skipInvalid: boolean;
  onSkipInvalidChange: (value: boolean) => void;
  onStartOver: () => void;
  onImport: () => void;
}

export function PreviewStep({preview, loading, skipInvalid, onSkipInvalidChange, onStartOver, onImport}: PreviewStepProps) {
  return (
    <div className="flex flex-col gap-6 rounded-lg border border-border bg-card p-4 sm:p-6">
      <section className="flex flex-col gap-4">
        <h2 className="text-base font-semibold text-text-1">Import Preview</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-border p-4">
            <Stat size="compact" label="Total Rows" value={preview.totalRows}/>
          </div>
          <div className="rounded-lg border border-border p-4">
            <Stat size="compact" label="Valid Rows" value={preview.validRows} tone="success"/>
          </div>
          <div className="rounded-lg border border-border p-4">
            <Stat size="compact" label="Invalid Rows" value={preview.invalidRows} tone="danger"/>
          </div>
        </div>
      </section>

      <ResponsiveTable
        columns={PREVIEW_COLUMNS}
        data={preview.rows}
        keyExtractor={(row) => String(row.rowNumber)}
        stickyHeader
        emptyMessage="The file has no employee rows."
        rowClassName={(row) => (row.isValid ? '' : 'bg-danger-50 dark:bg-danger-900/10')}
      />

      {preview.hasErrors && (
        <Callout tone="warning" title="Some rows have validation errors">
          <p>
            You can either fix the file and re-upload, or proceed with importing only the valid rows.
          </p>
          <Checkbox
            className="mt-4"
            checked={skipInvalid}
            onChange={(e) => onSkipInvalidChange(e.currentTarget.checked)}
            label={`Skip invalid rows and import only valid employees (${preview.validRows} employees)`}
          />
        </Callout>
      )}

      <div className="flex flex-wrap justify-between gap-2 border-t border-border pt-4">
        <Button variant="default" onClick={onStartOver} disabled={loading}>
          Start Over
        </Button>
        <PermissionGate permission={Permissions.EMPLOYEE_CREATE}>
          <Button
            onClick={onImport}
            loading={loading}
            disabled={(preview.hasErrors && !skipInvalid) || preview.validRows === 0}
            rightSection={<Upload className="h-4 w-4"/>}
          >
            Import {skipInvalid ? preview.validRows : preview.totalRows} Employees
          </Button>
        </PermissionGate>
      </div>
    </div>
  );
}
