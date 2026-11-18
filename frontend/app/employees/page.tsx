'use client';

import {useCallback, useEffect, useState} from 'react';
import {useRouter} from 'next/navigation';
import {useQueryClient} from '@tanstack/react-query';
import {Button} from '@/components/ui/Button';
import {FileUp, GitPullRequest, UserPlus} from 'lucide-react';
import {AppLayout} from '@/components/layout';
import {PageTransition} from '@/components/motion';
import {PermissionGate} from '@/components/auth/PermissionGate';
import {AdvancedFilterPanel} from '@/components/ui/AdvancedFilterPanel';
import {ConfirmDialog} from '@/components/ui/ConfirmDialog';
import {PageHeader} from '@/components/ui/PageHeader';
import {QueryState} from '@/components/ui/QueryState';
import type {RowActionItem} from '@/components/ui/ResponsiveTable';
import {ListPageSkeleton} from '@/components/ui/skeletons';
import {useToast} from '@/components/ui/Toast';
import {useActiveDepartments} from '@/lib/hooks/queries/useDepartments';
import {
  employeeKeys,
  useBatchUpdateEmployeeStatus,
  useDeleteEmployee,
  useManagers,
} from '@/lib/hooks/queries/useEmployees';
import {Permissions, usePermissions} from '@/lib/hooks/usePermissions';
import type {Employee} from '@/lib/types/hrms/employee';
import {createLogger} from '@/lib/utils/logger';
import {AddEmployeeModal} from './_components/AddEmployeeModal';
import {EmployeesBulkBar, EmployeesToolbar} from './_components/EmployeesToolbar';
import {EmployeesTable} from './_components/EmployeesTable';
import {
  EMPLOYEE_FILTER_FIELDS,
  EMPLOYEE_LIST_PAGE_SIZE,
  EMPLOYEE_TABLE_ID,
  employeeListErrorMessage,
} from './_components/employee-list-config';
import {ListPagination} from './_components/ListPagination';
import {ProfileSheet} from './_components/ProfileSheet';
import {useEmployeeList} from './_hooks/useEmployeeList';

const log = createLogger('EmployeesPage');

const BREADCRUMBS = [{label: 'NU-HRMS'}, {label: 'Employees'}];
const TABLE_SKELETON = <ListPageSkeleton rows={8} columns={6} showHeader={false} showFilters={false}/>;

export default function EmployeesPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const {hasPermission, isReady: permReady} = usePermissions();
  const {error: toastError, success: toastSuccess} = useToast();

  const list = useEmployeeList();
  const {data: managers = []} = useManagers();
  const {data: departments = []} = useActiveDepartments();
  const deleteEmployeeMutation = useDeleteEmployee();
  const batchStatusMutation = useBatchUpdateEmployeeStatus();

  const [showAddModal, setShowAddModal] = useState(false);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [openEmployee, setOpenEmployee] = useState<Employee | null>(null);
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);
  const [confirmBulkDeactivate, setConfirmBulkDeactivate] = useState(false);

  const canCreate = hasPermission(Permissions.EMPLOYEE_CREATE);
  const canUpdate = hasPermission(Permissions.EMPLOYEE_UPDATE);
  const canDelete = hasPermission(Permissions.EMPLOYEE_DELETE);
  const canBulkChangeStatus = hasPermission(Permissions.EMPLOYEE_VIEW_ALL);

  useEffect(() => {
    document.title = 'Employees | NU-AURA';
  }, []);

  const rowActions = useCallback((employee: Employee): RowActionItem[] => {
    const items: RowActionItem[] = [
      {label: 'View profile', onClick: () => router.push(`/employees/${employee.id}`)},
    ];
    if (canUpdate) items.push({label: 'Edit', onClick: () => router.push(`/employees/${employee.id}/edit`)});
    if (canDelete) items.push({label: 'Delete', color: 'red', onClick: () => setEmployeeToDelete(employee)});
    return items;
  }, [router, canUpdate, canDelete]);

  if (!permReady) {
    return (
      <AppLayout activeMenuItem="employees">
        <ListPageSkeleton rows={8} columns={6}/>
      </AppLayout>
    );
  }

  const handleBulkDeactivate = () => {
    const ids = Array.from(list.selected);
    batchStatusMutation.mutate(
      {employeeIds: ids, status: 'INACTIVE'},
      {
        onSuccess: (result) => {
          if (result.failedEmployeeIds.length > 0) {
            toastError(`Deactivated ${result.updatedCount}, ${result.failedEmployeeIds.length} failed`);
          } else {
            toastSuccess(`Deactivated ${result.updatedCount} employee${result.updatedCount === 1 ? '' : 's'}`);
          }
          list.setSelected(new Set());
        },
        onSettled: () => setConfirmBulkDeactivate(false),
      }
    );
  };

  const handleDelete = async () => {
    if (!employeeToDelete) return;
    try {
      await deleteEmployeeMutation.mutateAsync(employeeToDelete.id);
      list.markDeleted(employeeToDelete);
      await queryClient.invalidateQueries({queryKey: employeeKeys.lists()});
    } catch (err: unknown) {
      // The global mutation handler already shows the error toast.
      log.error('Error deleting employee:', err);
    } finally {
      setEmployeeToDelete(null);
    }
  };

  const departmentCount = list.deptOptions.length - 1;
  const description = list.query.data ? (
    <>
      <span className="tabular-nums">{list.totalElements.toLocaleString()}</span> people across{' '}
      <span className="tabular-nums">{departmentCount}</span> department{departmentCount === 1 ? '' : 's'}
      {list.locationCount > 0 && (
        <>
          {' · '}
          <span className="tabular-nums">{list.locationCount}</span> location{list.locationCount === 1 ? '' : 's'}
        </>
      )}
    </>
  ) : undefined;

  return (
    <AppLayout activeMenuItem="employees">
      <PageTransition className="flex flex-col gap-6">
        <PageHeader
          title="Employees"
          description={description}
          breadcrumbs={BREADCRUMBS}
          actions={
            <>
              <Button
                variant="outline"
                leftIcon={<GitPullRequest className="h-4 w-4" aria-hidden/>}
                onClick={() => router.push('/employees/change-requests')}
                aria-label="Change Requests"
              >
                <span className="hidden sm:inline">Change Requests</span>
              </Button>
              <PermissionGate permission={Permissions.EMPLOYEE_CREATE}>
                <Button
                  variant="outline"
                  leftIcon={<FileUp className="h-4 w-4" aria-hidden/>}
                  onClick={() => router.push('/employees/import')}
                  aria-label="Import"
                >
                  <span className="hidden sm:inline">Import</span>
                </Button>
                <Button leftIcon={<UserPlus className="h-4 w-4" aria-hidden/>} onClick={() => setShowAddModal(true)}>
                  Add Employee
                </Button>
              </PermissionGate>
            </>
          }
        />

        <section aria-label="Employee directory" className="overflow-hidden rounded-lg border border-border bg-card">
          {list.selected.size > 0 ? (
            <EmployeesBulkBar
              count={list.selected.size}
              canDeactivate={canBulkChangeStatus}
              deactivating={batchStatusMutation.isPending}
              onDeactivate={() => setConfirmBulkDeactivate(true)}
              onClear={() => list.setSelected(new Set())}
            />
          ) : (
            <EmployeesToolbar
              list={list}
              showFilterPanel={showFilterPanel}
              onToggleFilterPanel={() => setShowFilterPanel((prev) => !prev)}
            />
          )}

          {showFilterPanel && (
            <div className="border-b border-border p-4">
              <AdvancedFilterPanel
                fields={EMPLOYEE_FILTER_FIELDS}
                onApply={(conditions, logic) => {
                  list.setFilterConditions(conditions);
                  list.setFilterLogic(logic);
                }}
                onClear={() => list.setFilterConditions([])}
                tableId={EMPLOYEE_TABLE_ID}
              />
            </div>
          )}

          <QueryState
            query={list.query}
            skeleton={TABLE_SKELETON}
            errorTitle="Couldn't load employees"
            errorMessage={employeeListErrorMessage(list.query.error)}
            isEmpty={() => list.visibleEmployees.length === 0}
            empty={
              list.hasActiveFilters
                ? {
                  title: 'No employees found',
                  description: 'No employees match your search or filters.',
                  action: {label: 'Clear filters', onClick: list.clearFilters},
                }
                : {
                  title: 'No employees found',
                  description: canCreate ? 'Add your first employee to get started.' : 'There are no active employees yet.',
                  action: canCreate ? {label: 'Add employee', onClick: () => setShowAddModal(true)} : undefined,
                }
            }
          >
            {() => (
              <>
                <EmployeesTable
                  employees={list.visibleEmployees}
                  visibleColumns={list.visibleColumns}
                  selected={list.selected}
                  onSelectionChange={list.setSelected}
                  onOpen={setOpenEmployee}
                  rowActions={rowActions}
                />
                <div className="border-t border-border p-4">
                  <ListPagination
                    page={list.currentPage}
                    pageSize={EMPLOYEE_LIST_PAGE_SIZE}
                    totalElements={list.totalElements}
                    totalPages={list.totalPages}
                    onPageChange={list.setCurrentPage}
                    label="Employee list pagination"
                  />
                </div>
              </>
            )}
          </QueryState>
        </section>

        <AddEmployeeModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          departments={departments}
          managers={managers}
        />

        {openEmployee && (
          <ProfileSheet
            employee={openEmployee}
            onClose={() => setOpenEmployee(null)}
            onViewFull={() => router.push(`/employees/${openEmployee.id}`)}
            onEdit={canUpdate ? () => router.push(`/employees/${openEmployee.id}/edit`) : undefined}
          />
        )}

        <ConfirmDialog
          isOpen={confirmBulkDeactivate}
          onClose={() => setConfirmBulkDeactivate(false)}
          onConfirm={handleBulkDeactivate}
          title="Deactivate employees?"
          message={`${list.selected.size} selected employee${list.selected.size === 1 ? '' : 's'} will be marked inactive.`}
          confirmText="Deactivate"
          type="warning"
          loading={batchStatusMutation.isPending}
        />

        <ConfirmDialog
          isOpen={!!employeeToDelete}
          onClose={() => setEmployeeToDelete(null)}
          onConfirm={handleDelete}
          title="Delete Employee?"
          message={`${employeeToDelete?.fullName ?? 'This employee'} will be deactivated and marked as terminated. Their employment records are retained for compliance and the account can be reactivated later.`}
          confirmText="Delete"
          type="danger"
          loading={deleteEmployeeMutation.isPending}
        />
      </PageTransition>
    </AppLayout>
  );
}
