'use client';

import {Users} from 'lucide-react';
import {Button} from '@/components/ui/Button';
import {EmptyState} from '@/components/ui/EmptyState';
import {SkeletonTable} from '@/components/ui/Skeleton';
import {PermissionGate} from '@/components/auth/PermissionGate';
import {Permissions} from '@/lib/hooks/usePermissions';
import type {Employee} from '@/lib/types/hrms/employee';

const getStatusBadgeColor = (status: string): string => {
  switch (status) {
    case 'ACTIVE':
      return "bg-status-success-bg text-status-success-text";
    case 'ON_LEAVE':
      return "bg-status-warning-bg text-status-warning-text";
    case 'TERMINATED':
      return "bg-status-danger-bg text-status-danger-text";
    default:
      return 'bg-[var(--bg-secondary)] text-[var(--text-primary)]';
  }
};

export interface EmployeeTableProps {
  employees: Employee[];
  loading: boolean;
  searchQuery: string;
  canCreate: boolean;
  currentPage: number;
  totalPages: number;
  totalElements: number;
  pageSize: number;
  onAdd: () => void;
  onView: (employeeId: string) => void;
  onDelete: (employee: Employee) => void;
  onPageChange: (updater: number | ((prev: number) => number)) => void;
}

export function EmployeeTable({
                                employees,
                                loading,
                                searchQuery,
                                canCreate,
                                currentPage,
                                totalPages,
                                totalElements,
                                pageSize,
                                onAdd,
                                onView,
                                onDelete,
                                onPageChange,
                              }: EmployeeTableProps) {
  return (
    <div className="card-aura skeuo-card overflow-hidden">
      {loading ? (
        <SkeletonTable rows={8} columns={7}/>
      ) : employees.length === 0 ? (
        <EmptyState
          icon={<Users className="h-12 w-12"/>}
          title={searchQuery.trim() ? 'No employees match your search' : 'No Employees Found'}
          description={searchQuery.trim() ? 'Try adjusting your search terms' : 'Add your first employee to get started'}
          action={canCreate ? {label: 'Add Employee', onClick: onAdd} : undefined}
        />
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="table-aura">
              <thead className="skeuo-table-header">
              <tr>
                <th>Employee</th>
                <th>Code</th>
                <th>Designation</th>
                <th>Department</th>
                <th className="text-center">Level</th>
                <th>Manager</th>
                <th className="text-center">Status</th>
                <th className="text-right">Actions</th>
              </tr>
              </thead>
              <tbody>
              {employees.map((employee) => (
                <tr key={employee.id} className="h-11">
                  <td className="whitespace-nowrap">
                    <div className="flex items-center gap-4">
                      <div
                        className='flex-shrink-0 h-10 w-10 bg-accent-subtle rounded-lg flex items-center justify-center'>
                          <span className='text-sm font-medium text-accent'>
                            {employee.firstName.charAt(0)}{employee.lastName?.charAt(0) || ''}
                          </span>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-[var(--text-primary)]">{employee.fullName}</div>
                        <div className="text-caption">{employee.workEmail}</div>
                      </div>
                    </div>
                  </td>
                  <td className="whitespace-nowrap">
                    <span className="text-sm font-mono text-[var(--text-secondary)]">{employee.employeeCode}</span>
                  </td>
                  <td className="whitespace-nowrap">
                    <span className="text-sm text-[var(--text-primary)]">{employee.designation}</span>
                  </td>
                  <td className="whitespace-nowrap">
                    <span className="text-sm text-[var(--text-primary)]">{employee.departmentName || '-'}</span>
                  </td>
                  <td className="whitespace-nowrap text-center">
                    {employee.level ? (
                      <span
                        className='px-2 py-0.5 inline-flex text-xs font-medium rounded-md bg-accent-subtle text-accent'>
                          {employee.level.replace('_', ' ')}
                        </span>
                    ) : (
                      <span className="text-body-muted">-</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap">
                    <span className="text-sm text-[var(--text-primary)]">{employee.managerName || '-'}</span>
                  </td>
                  <td className="whitespace-nowrap text-center">
                      <span
                        className={`px-2 py-0.5 inline-flex text-xs font-medium rounded-md ${getStatusBadgeColor(employee.status)}`}>
                        {employee.status ? employee.status.replace('_', ' ') : '-'}
                      </span>
                  </td>
                  <td className="whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          onView(employee.id);
                        }}
                      >
                        View
                      </Button>
                      <PermissionGate permission={Permissions.EMPLOYEE_DELETE}>
                        <Button
                          type="button"
                          variant="ghost"
                          size="xs"
                          className='text-status-danger-text hover:text-status-danger-text hover:bg-status-danger-bg'
                          onClick={(e) => {
                            e.stopPropagation();
                            onDelete(employee);
                          }}
                        >
                          Delete
                        </Button>
                      </PermissionGate>
                    </div>
                  </td>
                </tr>
              ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-[var(--border-subtle)] row-between">
              <p className="text-body-secondary">
                Showing{' '}
                <span className="font-medium text-[var(--text-primary)]">{currentPage * pageSize + 1}</span>
                {' '}–{' '}
                <span className="font-medium text-[var(--text-primary)]">
                    {Math.min((currentPage + 1) * pageSize, totalElements)}
                  </span>
                {' '}of{' '}
                <span className="font-medium text-[var(--text-primary)]">{totalElements}</span> employees
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="xs"
                  onClick={() => onPageChange((p) => Math.max(0, p - 1))}
                  disabled={currentPage === 0}
                >
                  Previous
                </Button>
                <span className="px-2 text-body-muted tabular-nums">
                    {currentPage + 1} / {totalPages}
                  </span>
                <Button
                  variant="outline"
                  size="xs"
                  onClick={() => onPageChange((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={currentPage >= totalPages - 1}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
