'use client';

import {Button} from '@mantine/core';
import {AlertTriangle, CheckCircle, XCircle} from 'lucide-react';
import {ResponsiveTable, type Column} from '@/components/ui/ResponsiveTable';
import {Stat} from '@/components/ui/Stat';
import {StatusBadge} from '@/components/ui/StatusBadge';
import type {StatusTone} from '@/lib/status/vocabulary';
import type {EmployeeImportResult, ImportedEmployee, ImportStatus} from '@/lib/types/hrms/employee';

const STATUS_VIEW: Record<ImportStatus, {heading: string; tone: StatusTone; icon: typeof CheckCircle; iconClass: string}> = {
  COMPLETED: {heading: 'Completed', tone: 'success', icon: CheckCircle, iconClass: 'text-success-600'},
  PARTIAL_SUCCESS: {heading: 'Partially Completed', tone: 'warning', icon: AlertTriangle, iconClass: 'text-warning-600'},
  FAILED: {heading: 'Failed', tone: 'danger', icon: XCircle, iconClass: 'text-danger-600'},
};

const IMPORTED_COLUMNS: Column<ImportedEmployee>[] = [
  {key: 'code', header: 'Employee Code', accessor: (emp) => emp.employeeCode},
  {key: 'name', header: 'Name', mobilePriority: 'primary', accessor: (emp) => emp.fullName},
  {key: 'email', header: 'Email', accessor: (emp) => emp.workEmail},
];

const PREVIEW_LIMIT = 10;

interface ResultStepProps {
  result: EmployeeImportResult;
  onImportMore: () => void;
  onViewEmployees: () => void;
}

export function ResultStep({result, onImportMore, onViewEmployees}: ResultStepProps) {
  const view = STATUS_VIEW[result.status] ?? STATUS_VIEW.FAILED;
  const Icon = view.icon;
  const imported = result.importedEmployees ?? [];
  const failed = result.failedImports ?? [];

  return (
    <div className="flex flex-col gap-6 rounded-lg border border-border bg-card p-4 sm:p-6">
      <div className="flex flex-col items-center gap-2 text-center">
        <Icon className={`h-8 w-8 ${view.iconClass}`} aria-hidden/>
        <h2 className="text-xl font-semibold text-text-1">Import {view.heading}</h2>
        <StatusBadge label={result.status ? result.status.replace('_', ' ') : '-'} tone={view.tone}/>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-border p-4">
          <Stat size="compact" label="Total Processed" value={result.totalProcessed} tone="accent"/>
        </div>
        <div className="rounded-lg border border-border p-4">
          <Stat size="compact" label="Successfully Imported" value={result.successCount} tone="success"/>
        </div>
        <div className="rounded-lg border border-border p-4">
          <Stat size="compact" label="Failed" value={result.failedCount} tone="danger"/>
        </div>
      </div>

      {imported.length > 0 && (
        <section className="flex flex-col gap-4">
          <h3 className="text-base font-semibold text-text-1">Imported Employees</h3>
          <ResponsiveTable
            columns={IMPORTED_COLUMNS}
            data={imported.slice(0, PREVIEW_LIMIT)}
            keyExtractor={(emp) => emp.employeeId}
          />
          {imported.length > PREVIEW_LIMIT && (
            <p className="text-center text-xs text-text-2">
              ...and {imported.length - PREVIEW_LIMIT} more employees
            </p>
          )}
        </section>
      )}

      {failed.length > 0 && (
        <section className="flex flex-col gap-4">
          <h3 className="text-base font-semibold text-text-1">Failed Imports</h3>
          <ul className="rounded-lg border border-danger-200 bg-danger-50 p-4 dark:border-danger-800 dark:bg-danger-900/20">
            {failed.map((fail, idx) => (
              <li
                key={idx}
                className="flex items-start gap-2 border-b border-danger-200 py-2 last:border-0 dark:border-danger-800"
              >
                <XCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-danger-600" aria-hidden/>
                <p className="text-sm text-danger-700 dark:text-danger-300">
                  <span className="font-medium text-danger-800 dark:text-danger-200">
                    Row {fail.rowNumber}
                    {fail.employeeCode && ` (${fail.employeeCode})`}:
                  </span>{' '}
                  {fail.reason}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="flex flex-wrap justify-between gap-2 border-t border-border pt-4">
        <Button variant="default" onClick={onImportMore}>
          Import More
        </Button>
        <Button onClick={onViewEmployees}>View Employees</Button>
      </div>
    </div>
  );
}
