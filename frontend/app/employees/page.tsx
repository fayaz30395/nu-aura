'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useEmployees, useManagers, useCreateEmployee, useDeleteEmployee } from '@/lib/hooks/queries/useEmployees';
import { useActiveDepartments } from '@/lib/hooks/queries/useDepartments';
import { Employee, CreateEmployeeRequest } from '@/lib/types/employee';
import { AppLayout } from '@/components/layout';
import { motion } from 'framer-motion';
import { Users } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { SkeletonTable } from '@/components/ui/Loading';
import { PermissionGate } from '@/components/auth/PermissionGate';
import { usePermissions, Permissions } from '@/lib/hooks/usePermissions';
import { createLogger } from '@/lib/utils/logger';

const log = createLogger('EmployeesPage');

// Zod schema for create employee form
const createEmployeeFormSchema = z.object({
  employeeCode: z.string().min(1, 'Employee Code is required'),
  firstName: z.string().min(1, 'First Name is required'),
  middleName: z.string().optional().or(z.literal('')),
  lastName: z.string().optional().or(z.literal('')),
  workEmail: z.string().email('Invalid work email').min(1, 'Work Email is required'),
  personalEmail: z.string().email('Invalid personal email').optional().or(z.literal('')),
  phoneNumber: z.string().optional().or(z.literal('')),
  emergencyContactNumber: z.string().optional().or(z.literal('')),
  dateOfBirth: z.string().optional().or(z.literal('')),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY']).optional(),
  address: z.string().optional().or(z.literal('')),
  city: z.string().optional().or(z.literal('')),
  state: z.string().optional().or(z.literal('')),
  postalCode: z.string().optional().or(z.literal('')),
  country: z.string().optional().or(z.literal('')),
  designation: z.string().min(1, 'Designation is required'),
  level: z.enum(['ENTRY', 'MID', 'SENIOR', 'LEAD', 'MANAGER', 'DIRECTOR', 'VP', 'SVP', 'CXO']).optional(),
  jobRole: z.string().optional().or(z.literal('')),
  departmentId: z.string().min(1, 'Department is required'),
  employmentType: z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN']).default('FULL_TIME'),
  status: z.enum(['ACTIVE', 'ON_LEAVE', 'ON_NOTICE', 'TERMINATED', 'RESIGNED']).default('ACTIVE'),
  joiningDate: z.string().min(1, 'Joining Date is required'),
  confirmationDate: z.string().optional().or(z.literal('')),
  managerId: z.string().optional().or(z.literal('')),
  dottedLineManager1Id: z.string().optional().or(z.literal('')),
  dottedLineManager2Id: z.string().optional().or(z.literal('')),
  bankAccountNumber: z.string().optional().or(z.literal('')),
  bankName: z.string().optional().or(z.literal('')),
  bankIfscCode: z.string().optional().or(z.literal('')),
  taxId: z.string().optional().or(z.literal('')),
  password: z.string().min(1, 'Password is required'),
});

type CreateEmployeeFormData = z.infer<typeof createEmployeeFormSchema>;

export default function EmployeesPage() {
  const router = useRouter();
  const { hasPermission } = usePermissions();
  const canCreate = hasPermission(Permissions.EMPLOYEE_CREATE);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentTab, setCurrentTab] = useState('basic'); // basic, personal, employment, bank
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const PAGE_SIZE = 20;

  // React Query - fetch employees, managers, and departments
  const { data: employeeResponse, isLoading: employeesLoading, error: employeesError } = useEmployees(currentPage, PAGE_SIZE);
  const { data: managers = [], isLoading: managersLoading } = useManagers();
  const { data: departments = [], isLoading: departmentsLoading } = useActiveDepartments();

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

  // React Hook Form setup
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<CreateEmployeeFormData>({
    resolver: zodResolver(createEmployeeFormSchema),
    defaultValues: {
      employeeCode: '',
      firstName: '',
      middleName: '',
      lastName: '',
      workEmail: '',
      personalEmail: '',
      phoneNumber: '',
      emergencyContactNumber: '',
      dateOfBirth: '',
      gender: undefined,
      address: '',
      city: '',
      state: '',
      postalCode: '',
      country: '',
      designation: '',
      level: undefined,
      jobRole: undefined,
      departmentId: '',
      employmentType: 'FULL_TIME',
      status: 'ACTIVE',
      joiningDate: new Date().toISOString().split('T')[0],
      confirmationDate: '',
      managerId: '',
      dottedLineManager1Id: '',
      dottedLineManager2Id: '',
      bankAccountNumber: '',
      bankName: '',
      bankIfscCode: '',
      taxId: '',
      password: '',
    },
  });

  const onSubmit = async (data: CreateEmployeeFormData) => {
    // Clean up empty optional fields
    // Handle SELF manager - set selfManaged flag for backend to set managerId to employee's own ID
    const isSelfManaged = data.managerId === 'SELF';

    const submitData = {
      ...data,
      middleName: data.middleName || undefined,
      lastName: data.lastName || undefined,
      personalEmail: data.personalEmail || undefined,
      phoneNumber: data.phoneNumber || undefined,
      emergencyContactNumber: data.emergencyContactNumber || undefined,
      dateOfBirth: data.dateOfBirth || undefined,
      address: data.address || undefined,
      city: data.city || undefined,
      state: data.state || undefined,
      postalCode: data.postalCode || undefined,
      country: data.country || undefined,
      confirmationDate: data.confirmationDate || undefined,
      managerId: isSelfManaged ? undefined : (data.managerId || undefined),
      dottedLineManager1Id: data.dottedLineManager1Id || undefined,
      dottedLineManager2Id: data.dottedLineManager2Id || undefined,
      selfManaged: isSelfManaged,
      bankAccountNumber: data.bankAccountNumber || undefined,
      bankName: data.bankName || undefined,
      bankIfscCode: data.bankIfscCode || undefined,
      taxId: data.taxId || undefined,
      gender: data.gender,
      level: data.level,
      jobRole: data.jobRole || undefined,
      departmentId: data.departmentId,
      employmentType: data.employmentType,
      status: data.status,
    } as CreateEmployeeRequest;

    try {
      await createEmployeeMutation.mutateAsync(submitData);
      setShowAddModal(false);
      reset();
      setCurrentTab('basic');
    } catch (err: unknown) {
      // Error handling is done by the mutation
      log.error('Error creating employee:', err);
    }
  };

  const handleSearch = async () => {
    // Search is handled by React Query - just update searchQuery state
    // The query will automatically refetch with updated filters
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

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300';
      case 'ON_LEAVE': return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300';
      case 'TERMINATED': return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300';
      default: return 'bg-[var(--bg-secondary)] text-[var(--text-primary)]';
    }
  };

  return (
    <AppLayout activeMenuItem="employees">
      <motion.div
        className="space-y-6"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
      >
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)] skeuo-emboss">Employee Management</h1>
            <p className="text-sm text-[var(--text-secondary)] mt-1 skeuo-deboss">Manage your organization&apos;s employees</p>
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
        {/* Error Message */}
        {error && (
          <div className="p-4 bg-danger-50 dark:bg-danger-950/20 border border-danger-200 dark:border-danger-800 rounded-xl">
            <p className="text-sm text-danger-600 dark:text-danger-400">{error}</p>
          </div>
        )}

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 flex gap-2">
            <input
              type="text"
              placeholder="Search employees..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="flex-1 min-w-0 h-10 px-4 text-sm border border-[var(--border-main)] bg-[var(--bg-card)] text-[var(--text-primary)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--ring-primary)] focus:border-[var(--border-focus)] transition-all skeuo-input"
            />
            <Button variant="secondary" size="sm" onClick={handleSearch}>
              Search
            </Button>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 px-4 text-sm border border-[var(--border-main)] bg-[var(--bg-card)] text-[var(--text-primary)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--ring-primary)] focus:border-[var(--border-focus)] transition-all skeuo-input"
          >
            <option value="">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="ON_LEAVE">On Leave</option>
            <option value="TERMINATED">Terminated</option>
          </select>
        </div>

        {/* Employee Table */}
        <div className="card-aura skeuo-card overflow-hidden">
          {loading ? (
            <SkeletonTable rows={8} columns={7} />
          ) : employees.length === 0 ? (
            <EmptyState
              icon={<Users className="h-12 w-12" />}
              title={searchQuery.trim() ? 'No employees match your search' : 'No Employees Found'}
              description={searchQuery.trim() ? 'Try adjusting your search terms' : 'Add your first employee to get started'}
              action={canCreate ? { label: 'Add Employee', onClick: () => setShowAddModal(true) } : undefined}
            />
          ) : (
            <>
            <div className="overflow-x-auto">
              <table className="table-aura">
                <thead className="skeuo-table-header">
                  <tr>
                    <th>
                      Employee
                    </th>
                    <th>
                      Code
                    </th>
                    <th>
                      Designation
                    </th>
                    <th>
                      Department
                    </th>
                    <th>
                      Level
                    </th>
                    <th>
                      Manager
                    </th>
                    <th>
                      Status
                    </th>
                    <th className="text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((employee) => (
                  <tr key={employee.id}>
                    <td className="whitespace-nowrap">
                      <div className="flex items-center gap-4">
                        <div className="flex-shrink-0 h-10 w-10 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center">
                          <span className="text-sm font-medium text-primary-700 dark:text-primary-300">
                            {employee.firstName.charAt(0)}{employee.lastName?.charAt(0) || ''}
                          </span>
                        </div>
                        <div>
                          <div className="text-sm font-medium text-[var(--text-primary)]">{employee.fullName}</div>
                          <div className="text-xs text-[var(--text-muted)]">{employee.workEmail}</div>
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
                    <td className="whitespace-nowrap">
                      {employee.level ? (
                        <span className="px-2 py-0.5 inline-flex text-xs font-medium rounded-md bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300">
                          {employee.level.replace('_', ' ')}
                        </span>
                      ) : (
                        <span className="text-sm text-[var(--text-muted)]">-</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap">
                      <span className="text-sm text-[var(--text-primary)]">{employee.managerName || '-'}</span>
                    </td>
                    <td className="whitespace-nowrap">
                      <span className={`px-2 py-0.5 inline-flex text-xs font-medium rounded-md ${getStatusBadgeColor(employee.status)}`}>
                        {employee.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={() => router.push(`/employees/${employee.id}`)}
                        >
                          View
                        </Button>
                        <PermissionGate permission={Permissions.EMPLOYEE_DELETE}>
                          <Button
                            variant="ghost"
                            size="xs"
                            className="text-danger-600 dark:text-danger-400 hover:text-danger-700 hover:bg-danger-50 dark:hover:bg-danger-950/30"
                            onClick={() => {
                              setEmployeeToDelete(employee);
                              setShowDeleteModal(true);
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
              <div className="px-6 py-4 border-t border-[var(--border-subtle)] flex items-center justify-between">
                <p className="text-sm text-[var(--text-secondary)]">
                  Showing{' '}
                  <span className="font-medium text-[var(--text-primary)]">{currentPage * PAGE_SIZE + 1}</span>
                  {' '}–{' '}
                  <span className="font-medium text-[var(--text-primary)]">
                    {Math.min((currentPage + 1) * PAGE_SIZE, totalElements)}
                  </span>
                  {' '}of{' '}
                  <span className="font-medium text-[var(--text-primary)]">{totalElements}</span> employees
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="xs"
                    onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                    disabled={currentPage === 0}
                  >
                    Previous
                  </Button>
                  <span className="px-2 text-sm text-[var(--text-muted)] tabular-nums">
                    {currentPage + 1} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="xs"
                    onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
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

        {/* Add Employee Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-[var(--bg-overlay)] flex items-center justify-center p-4 z-50">
            <div className="bg-[var(--bg-card)] rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto border border-[var(--border-main)] shadow-xl skeuo-card">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-[var(--text-primary)]">Add New Employee</h2>
                  <button
                    onClick={() => {
                      setShowAddModal(false);
                      reset();
                      setCurrentTab('basic');
                    }}
                    aria-label="Close add employee dialog"
                    className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] dark:hover:text-[var(--text-muted)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2 rounded-md"
                  >
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Tabs */}
                <div className="mb-6 border-b border-[var(--border-main)]">
                  <nav className="-mb-px flex space-x-8">
                    <button
                      onClick={() => setCurrentTab('basic')}
                      className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2 rounded-t-sm ${
                        currentTab === 'basic'
                          ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                          : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)] dark:hover:text-[var(--text-muted)] hover:border-[var(--border-main)] dark:hover:border-[var(--border-main)]'
                      }`}
                    >
                      Basic Info
                    </button>
                    <button
                      onClick={() => setCurrentTab('personal')}
                      className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2 rounded-t-sm ${
                        currentTab === 'personal'
                          ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                          : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)] dark:hover:text-[var(--text-muted)] hover:border-[var(--border-main)] dark:hover:border-[var(--border-main)]'
                      }`}
                    >
                      Personal Details
                    </button>
                    <button
                      onClick={() => setCurrentTab('employment')}
                      className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2 rounded-t-sm ${
                        currentTab === 'employment'
                          ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                          : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)] dark:hover:text-[var(--text-muted)] hover:border-[var(--border-main)] dark:hover:border-[var(--border-main)]'
                      }`}
                    >
                      Employment
                    </button>
                    <button
                      onClick={() => setCurrentTab('bank')}
                      className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2 rounded-t-sm ${
                        currentTab === 'bank'
                          ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                          : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)] dark:hover:text-[var(--text-muted)] hover:border-[var(--border-main)] dark:hover:border-[var(--border-main)]'
                      }`}
                    >
                      Banking & Tax
                    </button>
                  </nav>
                </div>

                <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
                  {/* Basic Info Tab */}
                  {currentTab === 'basic' && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                            Employee Code *
                          </label>
                          <input
                            type="text"
                            {...register('employeeCode')}
                            className="w-full h-10 px-4 text-sm border border-[var(--border-main)] bg-[var(--bg-input)] text-[var(--text-primary)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--ring-primary)] focus:border-[var(--border-focus)] transition-all"
                            placeholder="EMP001"
                          />
                          {errors.employeeCode && <p className="text-danger-500 dark:text-danger-400 text-xs mt-1">{errors.employeeCode.message}</p>}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                            Work Email *
                          </label>
                          <input
                            type="email"
                            {...register('workEmail')}
                            className="w-full h-10 px-4 text-sm border border-[var(--border-main)] bg-[var(--bg-input)] text-[var(--text-primary)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--ring-primary)] focus:border-[var(--border-focus)] transition-all"
                            placeholder="employee@company.com"
                          />
                          {errors.workEmail && <p className="text-danger-500 dark:text-danger-400 text-xs mt-1">{errors.workEmail.message}</p>}
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                            First Name *
                          </label>
                          <input
                            type="text"
                            {...register('firstName')}
                            className="w-full h-10 px-4 text-sm border border-[var(--border-main)] bg-[var(--bg-input)] text-[var(--text-primary)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--ring-primary)] focus:border-[var(--border-focus)] transition-all"
                          />
                          {errors.firstName && <p className="text-danger-500 dark:text-danger-400 text-xs mt-1">{errors.firstName.message}</p>}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                            Middle Name
                          </label>
                          <input
                            type="text"
                            {...register('middleName')}
                            className="w-full h-10 px-4 text-sm border border-[var(--border-main)] bg-[var(--bg-input)] text-[var(--text-primary)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--ring-primary)] focus:border-[var(--border-focus)] transition-all"
                          />
                          {errors.middleName && <p className="text-danger-500 dark:text-danger-400 text-xs mt-1">{errors.middleName.message}</p>}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                            Last Name
                          </label>
                          <input
                            type="text"
                            {...register('lastName')}
                            className="w-full h-10 px-4 text-sm border border-[var(--border-main)] bg-[var(--bg-input)] text-[var(--text-primary)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--ring-primary)] focus:border-[var(--border-focus)] transition-all"
                          />
                          {errors.lastName && <p className="text-danger-500 dark:text-danger-400 text-xs mt-1">{errors.lastName.message}</p>}
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                          Initial Password *
                        </label>
                        <input
                          type="password"
                          {...register('password')}
                          className="w-full h-10 px-4 text-sm border border-[var(--border-main)] bg-[var(--bg-input)] text-[var(--text-primary)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--ring-primary)] focus:border-[var(--border-focus)] transition-all"
                          placeholder="Employee will change on first login"
                        />
                        {errors.password && <p className="text-danger-500 dark:text-danger-400 text-xs mt-1">{errors.password.message}</p>}
                      </div>
                    </div>
                  )}

                  {/* Personal Details Tab */}
                  {currentTab === 'personal' && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                            Personal Email
                          </label>
                          <input
                            type="email"
                            {...register('personalEmail')}
                            className="w-full h-10 px-4 text-sm border border-[var(--border-main)] bg-[var(--bg-input)] text-[var(--text-primary)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--ring-primary)] focus:border-[var(--border-focus)] transition-all"
                            placeholder="personal@email.com"
                          />
                          {errors.personalEmail && <p className="text-danger-500 dark:text-danger-400 text-xs mt-1">{errors.personalEmail.message}</p>}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                            Phone Number
                          </label>
                          <input
                            type="tel"
                            {...register('phoneNumber')}
                            className="w-full h-10 px-4 text-sm border border-[var(--border-main)] bg-[var(--bg-input)] text-[var(--text-primary)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--ring-primary)] focus:border-[var(--border-focus)] transition-all"
                            placeholder="+1 234 567 8900"
                          />
                          {errors.phoneNumber && <p className="text-danger-500 dark:text-danger-400 text-xs mt-1">{errors.phoneNumber.message}</p>}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                            Emergency Contact
                          </label>
                          <input
                            type="tel"
                            {...register('emergencyContactNumber')}
                            className="w-full h-10 px-4 text-sm border border-[var(--border-main)] bg-[var(--bg-input)] text-[var(--text-primary)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--ring-primary)] focus:border-[var(--border-focus)] transition-all"
                            placeholder="+1 234 567 8900"
                          />
                          {errors.emergencyContactNumber && <p className="text-danger-500 dark:text-danger-400 text-xs mt-1">{errors.emergencyContactNumber.message}</p>}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                            Date of Birth
                          </label>
                          <input
                            type="date"
                            {...register('dateOfBirth')}
                            className="w-full h-10 px-4 text-sm border border-[var(--border-main)] bg-[var(--bg-input)] text-[var(--text-primary)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--ring-primary)] focus:border-[var(--border-focus)] transition-all"
                          />
                          {errors.dateOfBirth && <p className="text-danger-500 dark:text-danger-400 text-xs mt-1">{errors.dateOfBirth.message}</p>}
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                          Gender
                        </label>
                        <Controller
                          name="gender"
                          control={control}
                          render={({ field }) => (
                            <select
                              {...field}
                              value={field.value || ''}
                              className="w-full h-10 px-4 text-sm border border-[var(--border-main)] bg-[var(--bg-input)] text-[var(--text-primary)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--ring-primary)] focus:border-[var(--border-focus)] transition-all"
                            >
                              <option value="">Select Gender</option>
                              <option value="MALE">Male</option>
                              <option value="FEMALE">Female</option>
                              <option value="OTHER">Other</option>
                              <option value="PREFER_NOT_TO_SAY">Prefer not to say</option>
                            </select>
                          )}
                        />
                        {errors.gender && <p className="text-danger-500 dark:text-danger-400 text-xs mt-1">{errors.gender.message}</p>}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                          Address
                        </label>
                        <textarea
                          rows={2}
                          {...register('address')}
                          className="w-full h-10 px-4 text-sm border border-[var(--border-main)] bg-[var(--bg-input)] text-[var(--text-primary)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--ring-primary)] focus:border-[var(--border-focus)] transition-all"
                          placeholder="Street address"
                        />
                        {errors.address && <p className="text-danger-500 dark:text-danger-400 text-xs mt-1">{errors.address.message}</p>}
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                            City
                          </label>
                          <input
                            type="text"
                            {...register('city')}
                            className="w-full h-10 px-4 text-sm border border-[var(--border-main)] bg-[var(--bg-input)] text-[var(--text-primary)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--ring-primary)] focus:border-[var(--border-focus)] transition-all"
                          />
                          {errors.city && <p className="text-danger-500 dark:text-danger-400 text-xs mt-1">{errors.city.message}</p>}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                            State/Province
                          </label>
                          <input
                            type="text"
                            {...register('state')}
                            className="w-full h-10 px-4 text-sm border border-[var(--border-main)] bg-[var(--bg-input)] text-[var(--text-primary)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--ring-primary)] focus:border-[var(--border-focus)] transition-all"
                          />
                          {errors.state && <p className="text-danger-500 dark:text-danger-400 text-xs mt-1">{errors.state.message}</p>}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                            Postal Code
                          </label>
                          <input
                            type="text"
                            {...register('postalCode')}
                            className="w-full h-10 px-4 text-sm border border-[var(--border-main)] bg-[var(--bg-input)] text-[var(--text-primary)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--ring-primary)] focus:border-[var(--border-focus)] transition-all"
                          />
                          {errors.postalCode && <p className="text-danger-500 dark:text-danger-400 text-xs mt-1">{errors.postalCode.message}</p>}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                            Country
                          </label>
                          <input
                            type="text"
                            {...register('country')}
                            className="w-full h-10 px-4 text-sm border border-[var(--border-main)] bg-[var(--bg-input)] text-[var(--text-primary)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--ring-primary)] focus:border-[var(--border-focus)] transition-all"
                          />
                          {errors.country && <p className="text-danger-500 dark:text-danger-400 text-xs mt-1">{errors.country.message}</p>}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Employment Tab */}
                  {currentTab === 'employment' && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                            Designation *
                          </label>
                          <input
                            type="text"
                            {...register('designation')}
                            className="w-full h-10 px-4 text-sm border border-[var(--border-main)] bg-[var(--bg-input)] text-[var(--text-primary)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--ring-primary)] focus:border-[var(--border-focus)] transition-all"
                            placeholder="Senior Software Engineer"
                          />
                          {errors.designation && <p className="text-danger-500 dark:text-danger-400 text-xs mt-1">{errors.designation.message}</p>}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                            Employment Type *
                          </label>
                          <Controller
                            name="employmentType"
                            control={control}
                            render={({ field }) => (
                              <select
                                {...field}
                                className="w-full h-10 px-4 text-sm border border-[var(--border-main)] bg-[var(--bg-input)] text-[var(--text-primary)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--ring-primary)] focus:border-[var(--border-focus)] transition-all"
                              >
                                <option value="FULL_TIME">Full Time</option>
                                <option value="PART_TIME">Part Time</option>
                                <option value="CONTRACT">Contract</option>
                                <option value="INTERN">Intern</option>
                              </select>
                            )}
                          />
                          {errors.employmentType && <p className="text-danger-500 dark:text-danger-400 text-xs mt-1">{errors.employmentType.message}</p>}
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                          Department *
                        </label>
                        <Controller
                          name="departmentId"
                          control={control}
                          render={({ field }) => (
                            <select
                              {...field}
                              className="w-full h-10 px-4 text-sm border border-[var(--border-main)] bg-[var(--bg-input)] text-[var(--text-primary)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--ring-primary)] focus:border-[var(--border-focus)] transition-all"
                            >
                              <option value="">Select Department</option>
                              {departments.map((dept) => (
                                <option key={dept.id} value={dept.id}>
                                  {dept.name} ({dept.code})
                                </option>
                              ))}
                            </select>
                          )}
                        />
                        {errors.departmentId && <p className="text-danger-500 dark:text-danger-400 text-xs mt-1">{errors.departmentId.message}</p>}
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                            Employee Level
                          </label>
                          <Controller
                            name="level"
                            control={control}
                            render={({ field }) => (
                              <select
                                {...field}
                                value={field.value || ''}
                                className="w-full h-10 px-4 text-sm border border-[var(--border-main)] bg-[var(--bg-input)] text-[var(--text-primary)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--ring-primary)] focus:border-[var(--border-focus)] transition-all"
                              >
                                <option value="">Select Level</option>
                                <option value="JUNIOR">Junior</option>
                                <option value="SENIOR">Senior</option>
                                <option value="LEAD">Lead</option>
                                <option value="MANAGER">Manager</option>
                                <option value="SENIOR_MANAGER">Senior Manager</option>
                                <option value="DIRECTOR">Director</option>
                                <option value="EXECUTIVE">Executive</option>
                              </select>
                            )}
                          />
                          {errors.level && <p className="text-danger-500 dark:text-danger-400 text-xs mt-1">{errors.level.message}</p>}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                            Job Role
                          </label>
                          <Controller
                            name="jobRole"
                            control={control}
                            render={({ field }) => (
                              <select
                                {...field}
                                value={field.value || ''}
                                className="w-full h-10 px-4 text-sm border border-[var(--border-main)] bg-[var(--bg-input)] text-[var(--text-primary)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--ring-primary)] focus:border-[var(--border-focus)] transition-all"
                              >
                                <option value="">Select Role</option>
                                <option value="ENGINEER">Engineer</option>
                                <option value="MANAGER">Manager</option>
                                <option value="ANALYST">Analyst</option>
                                <option value="DESIGNER">Designer</option>
                                <option value="SUPPORT">Support</option>
                                <option value="SALES">Sales</option>
                                <option value="MARKETING">Marketing</option>
                                <option value="HR">HR</option>
                                <option value="FINANCE">Finance</option>
                                <option value="OPERATIONS">Operations</option>
                                <option value="OTHER">Other</option>
                              </select>
                            )}
                          />
                          {errors.jobRole && <p className="text-danger-500 dark:text-danger-400 text-xs mt-1">{errors.jobRole.message}</p>}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                            Joining Date *
                          </label>
                          <input
                            type="date"
                            {...register('joiningDate')}
                            className="w-full h-10 px-4 text-sm border border-[var(--border-main)] bg-[var(--bg-input)] text-[var(--text-primary)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--ring-primary)] focus:border-[var(--border-focus)] transition-all"
                          />
                          {errors.joiningDate && <p className="text-danger-500 dark:text-danger-400 text-xs mt-1">{errors.joiningDate.message}</p>}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                            Confirmation Date
                          </label>
                          <input
                            type="date"
                            {...register('confirmationDate')}
                            className="w-full h-10 px-4 text-sm border border-[var(--border-main)] bg-[var(--bg-input)] text-[var(--text-primary)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--ring-primary)] focus:border-[var(--border-focus)] transition-all"
                          />
                          {errors.confirmationDate && <p className="text-danger-500 dark:text-danger-400 text-xs mt-1">{errors.confirmationDate.message}</p>}
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                          Reporting Manager
                        </label>
                        <Controller
                          name="managerId"
                          control={control}
                          render={({ field }) => (
                            <select
                              {...field}
                              className="w-full h-10 px-4 text-sm border border-[var(--border-main)] bg-[var(--bg-input)] text-[var(--text-primary)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--ring-primary)] focus:border-[var(--border-focus)] transition-all"
                            >
                              <option value="">Select Manager</option>
                              <option value="SELF">Self (No Reporting Manager)</option>
                              {managers.map((manager) => (
                                <option key={manager.id} value={manager.id}>
                                  {manager.fullName} ({manager.employeeCode})
                                </option>
                              ))}
                            </select>
                          )}
                        />
                        <p className="mt-1 text-xs text-[var(--text-muted)]">
                          Select &ldquo;Self&rdquo; for top-level employees who don&apos;t report to anyone.
                        </p>
                        {errors.managerId && <p className="text-danger-500 dark:text-danger-400 text-xs mt-1">{errors.managerId.message}</p>}
                      </div>

                      {/* Dotted-Line Managers (Optional, Matrix Reporting) */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                            Dotted-Line Manager 1 <span className="text-[var(--text-muted)]">(Optional)</span>
                          </label>
                          <Controller
                            name="dottedLineManager1Id"
                            control={control}
                            render={({ field }) => (
                              <select
                                {...field}
                                className="w-full h-10 px-4 text-sm border border-[var(--border-main)] bg-[var(--bg-input)] text-[var(--text-primary)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--ring-primary)] focus:border-[var(--border-focus)] transition-all"
                              >
                                <option value="">None</option>
                                {managers.map((manager) => (
                                  <option key={manager.id} value={manager.id}>
                                    {manager.fullName} ({manager.employeeCode})
                                  </option>
                                ))}
                              </select>
                            )}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                            Dotted-Line Manager 2 <span className="text-[var(--text-muted)]">(Optional)</span>
                          </label>
                          <Controller
                            name="dottedLineManager2Id"
                            control={control}
                            render={({ field }) => (
                              <select
                                {...field}
                                className="w-full h-10 px-4 text-sm border border-[var(--border-main)] bg-[var(--bg-input)] text-[var(--text-primary)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--ring-primary)] focus:border-[var(--border-focus)] transition-all"
                              >
                                <option value="">None</option>
                                {managers.map((manager) => (
                                  <option key={manager.id} value={manager.id}>
                                    {manager.fullName} ({manager.employeeCode})
                                  </option>
                                ))}
                              </select>
                            )}
                          />
                        </div>
                      </div>
                      <p className="text-xs text-[var(--text-muted)]">
                        Dotted-line managers represent matrix reporting relationships. They are informational only and do not participate in approval workflows.
                      </p>
                    </div>
                  )}

                  {/* Banking & Tax Tab */}
                  {currentTab === 'bank' && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                            Bank Account Number
                          </label>
                          <input
                            type="text"
                            {...register('bankAccountNumber')}
                            className="w-full h-10 px-4 text-sm border border-[var(--border-main)] bg-[var(--bg-input)] text-[var(--text-primary)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--ring-primary)] focus:border-[var(--border-focus)] transition-all"
                            placeholder="1234567890"
                          />
                          {errors.bankAccountNumber && <p className="text-danger-500 dark:text-danger-400 text-xs mt-1">{errors.bankAccountNumber.message}</p>}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                            Bank Name
                          </label>
                          <input
                            type="text"
                            {...register('bankName')}
                            className="w-full h-10 px-4 text-sm border border-[var(--border-main)] bg-[var(--bg-input)] text-[var(--text-primary)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--ring-primary)] focus:border-[var(--border-focus)] transition-all"
                            placeholder="Bank of America"
                          />
                          {errors.bankName && <p className="text-danger-500 dark:text-danger-400 text-xs mt-1">{errors.bankName.message}</p>}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                            IFSC Code / Routing Number
                          </label>
                          <input
                            type="text"
                            {...register('bankIfscCode')}
                            className="w-full h-10 px-4 text-sm border border-[var(--border-main)] bg-[var(--bg-input)] text-[var(--text-primary)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--ring-primary)] focus:border-[var(--border-focus)] transition-all"
                            placeholder="HDFC0001234"
                          />
                          {errors.bankIfscCode && <p className="text-danger-500 dark:text-danger-400 text-xs mt-1">{errors.bankIfscCode.message}</p>}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                            Tax ID / SSN
                          </label>
                          <input
                            type="text"
                            {...register('taxId')}
                            className="w-full h-10 px-4 text-sm border border-[var(--border-main)] bg-[var(--bg-input)] text-[var(--text-primary)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--ring-primary)] focus:border-[var(--border-focus)] transition-all"
                            placeholder="XXX-XX-XXXX"
                          />
                          {errors.taxId && <p className="text-danger-500 dark:text-danger-400 text-xs mt-1">{errors.taxId.message}</p>}
                        </div>
                      </div>

                      <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                        <p className="text-sm text-blue-700 dark:text-blue-400">
                          <strong>Note:</strong> Banking and tax information is encrypted and stored securely. This information will be used for payroll processing.
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-4 pt-6 border-t border-[var(--border-subtle)]">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        setShowAddModal(false);
                        reset();
                        setCurrentTab('basic');
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      className="flex-1"
                      isLoading={isSubmitting}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? 'Adding...' : 'Add Employee'}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && employeeToDelete && (
          <div className="fixed inset-0 bg-[var(--bg-overlay)] flex items-center justify-center p-4 z-50">
            <div className="bg-[var(--bg-card)] rounded-xl max-w-md w-full p-6 border border-[var(--border-main)] shadow-xl skeuo-card">
              <div className="flex items-center gap-4 mb-4">
                <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-danger-100 dark:bg-danger-900/30 flex items-center justify-center">
                  <svg className="h-5 w-5 text-danger-600 dark:text-danger-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">Delete Employee</h3>
              </div>
              <p className="text-sm text-[var(--text-secondary)] mb-6">
                Are you sure you want to delete <strong className="text-[var(--text-primary)]">{employeeToDelete.fullName}</strong>? This action cannot be undone.
              </p>
              <div className="flex gap-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setShowDeleteModal(false);
                    setEmployeeToDelete(null);
                  }}
                  disabled={deleteEmployeeMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  className="flex-1"
                  onClick={handleDelete}
                  isLoading={deleteEmployeeMutation.isPending}
                  disabled={deleteEmployeeMutation.isPending}
                >
                  {deleteEmployeeMutation.isPending ? 'Deleting...' : 'Delete'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </AppLayout>
  );
}
