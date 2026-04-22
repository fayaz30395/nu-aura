'use client';

import {useEffect, useState} from 'react';
import {useRouter} from 'next/navigation';
import {motion} from 'framer-motion';
import {
  useCreateEmployee,
  useDeleteEmployee,
  useEmployees,
  useManagers,
} from '@/lib/hooks/queries/useEmployees';
import {useActiveDepartments} from '@/lib/hooks/queries/useDepartments';
import type {CreateEmployeeRequest, Employee} from '@/lib/types/hrms/employee';
import {AppLayout} from '@/components/layout';
import {Button} from '@/components/ui/Button';
import {SkeletonTable} from '@/components/ui/Skeleton';
import {PermissionGate} from '@/components/auth/PermissionGate';
import {Permissions, usePermissions} from '@/lib/hooks/usePermissions';
import {createLogger} from '@/lib/utils/logger';
import {EmployeeFilters} from './_components/EmployeeFilters';
import {EmployeeTable} from './_components/EmployeeTable';
import {EmployeeCreateModal} from './_components/EmployeeCreateModal';
import {EmployeeDeleteModal} from './_components/EmployeeDeleteModal';
import {useEmployeeListState} from './_components/useEmployeeListState';

const log = createLogger('EmployeesPage');

export default function EmployeesPage() {
  const router = useRouter();
  const {hasPermission, isReady: permReady} = usePermissions();

  const canCreate = hasPermission(Permissions.EMPLOYEE_CREATE);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);

  const {
    searchQuery,
    statusFilter,
    currentPage,
    pageSize,
    setSearchQuery,
    setStatusFilter,
    setCurrentPage,
  } = useEmployeeListState();

  const {data: employeeResponse, isLoading: employeesLoading, error: employeesError} = useEmployees(
    currentPage, pageSize, 'createdAt', 'DESC',
    searchQuery || undefined, statusFilter || undefined,
  );
  const {data: managers = [], isLoading: managersLoading} = useManagers();
  const {data: departments = [], isLoading: departmentsLoading} = useActiveDepartments();

  const employees = employeeResponse?.content ?? [];
  const totalPages = employeeResponse?.totalPages ?? 1;
  const totalElements = employeeResponse?.totalElements ?? 0;
  const loading = employeesLoading || managersLoading || departmentsLoading;
  const error = employeesError
    ? employeesError instanceof Error
      ? employeesError.message.includes('403')
        ? 'You do not have permission to view employees. Contact your administrator.'
        : employeesError.message.includes('401')
          ? 'Your session has expired. Please log in again.'
          : employeesError.message.includes('500')
            ? 'The server encountered an error. Please try again in a moment.'
            : employeesError.message.includes('Network Error')
              ? 'Unable to reach the server. Please check your connection.'
              : employeesError.message
      : 'Failed to load employees'
    : null;

  const createEmployeeMutation = useCreateEmployee();
  const deleteEmployeeMutation = useDeleteEmployee();

  useEffect(() => {
    if (!permReady) return;
    if (!hasPermission(Permissions.EMPLOYEE_READ)) {
      router.replace('/dashboard');
    }
  }, [permReady, hasPermission, router]);

  if (!permReady) {
    return (
      <AppLayout activeMenuItem="employees">
        <div className="p-6">
          <div className="max-w-7xl mx-auto">
            <div className="mb-8">
              <div className="h-10 bg-[var(--skeleton-base)] rounded-lg w-1/3 mb-4"/>
              <div className="h-5 bg-[var(--skeleton-base)] rounded-lg w-2/3"/>
            </div>
            <SkeletonTable rows={5} columns={4}/>
          </div>
        </div>
      </AppLayout>
    );
  }

  const handleCreateSubmit = async (data: CreateEmployeeRequest) => {
    await createEmployeeMutation.mutateAsync(data);
    setShowAddModal(false);
  };

  const handleSearch = () => {
    setCurrentPage(0);
  };

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value);
    setCurrentPage(0);
  };

  const handleDelete = async () => {
    if (!employeeToDelete) return;
    try {
      await deleteEmployeeMutation.mutateAsync(employeeToDelete.id);
      setShowDeleteModal(false);
      setEmployeeToDelete(null);
    } catch (err: unknown) {
      log.error('Error deleting employee:', err);
      setShowDeleteModal(false);
    }
  };

  const handleRequestDelete = (employee: Employee) => {
    setEmployeeToDelete(employee);
    setShowDeleteModal(true);
  };

  return (
    <AppLayout activeMenuItem="employees">
      <motion.div
        className="space-y-6"
        initial={{opacity: 0, y: 8}}
        animate={{opacity: 1, y: 0}}
        transition={{duration: 0.25, ease: 'easeOut'}}
      >
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1
              className="text-xl sm:text-xl font-bold tracking-tight text-[var(--text-primary)] skeuo-emboss">Employee
              Management</h1>
            <p className="text-xs sm:text-sm text-body-secondary mt-1 skeuo-deboss">Manage your organization&apos;s
              employees</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/employees/change-requests')}
            >
              Change Requests
            </Button>
            <PermissionGate permission={Permissions.EMPLOYEE_CREATE}>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push('/employees/import')}
              >
                Import
              </Button>
            </PermissionGate>
            <PermissionGate permission={Permissions.EMPLOYEE_CREATE}>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setShowAddModal(true)}
              >
                + Add Employee
              </Button>
            </PermissionGate>
          </div>
        </div>

        {error && (
          <div
            className='p-4 bg-status-danger-bg border border-status-danger-border rounded-xl'>
            <p className='text-sm text-status-danger-text'>{error}</p>
          </div>
        )}

        <EmployeeFilters
          searchQuery={searchQuery}
          statusFilter={statusFilter}
          onSearchQueryChange={setSearchQuery}
          onStatusFilterChange={handleStatusFilterChange}
          onSearch={handleSearch}
        />

        <EmployeeTable
          employees={employees}
          loading={loading}
          searchQuery={searchQuery}
          canCreate={canCreate}
          currentPage={currentPage}
          totalPages={totalPages}
          totalElements={totalElements}
          pageSize={pageSize}
          onAdd={() => setShowAddModal(true)}
          onView={(id) => router.push(`/employees/${id}`)}
          onDelete={handleRequestDelete}
          onPageChange={setCurrentPage}
        />

        {showAddModal && (
          <EmployeeCreateModal
            departments={departments}
            managers={managers}
            onSubmit={handleCreateSubmit}
            onClose={() => setShowAddModal(false)}
          />
        )}

        {showDeleteModal && employeeToDelete && (
          <EmployeeDeleteModal
            employee={employeeToDelete}
            isDeleting={deleteEmployeeMutation.isPending}
            onConfirm={handleDelete}
            onCancel={() => {
              setShowDeleteModal(false);
              setEmployeeToDelete(null);
            }}
          />
        )}
      </motion.div>
    </AppLayout>
  );
}
