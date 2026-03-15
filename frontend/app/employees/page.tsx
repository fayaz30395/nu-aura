'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useEmployees, useManagers, useCreateEmployee, useDeleteEmployee } from '@/lib/hooks/queries/useEmployees';
import { useActiveDepartments } from '@/lib/hooks/queries/useDepartments';
import { Employee, CreateEmployeeRequest, Department, Gender, EmploymentType, EmployeeLevel, JobRole } from '@/lib/types/employee';
import { toGender, toEmploymentType, toEmployeeLevel, toJobRole } from '@/lib/utils/type-guards';
import { AppLayout } from '@/components/layout';
import { motion } from 'framer-motion';
import { Users } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';

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
  bankAccountNumber: z.string().optional().or(z.literal('')),
  bankName: z.string().optional().or(z.literal('')),
  bankIfscCode: z.string().optional().or(z.literal('')),
  taxId: z.string().optional().or(z.literal('')),
  password: z.string().min(1, 'Password is required'),
});

type CreateEmployeeFormData = z.infer<typeof createEmployeeFormSchema>;

export default function EmployeesPage() {
  const router = useRouter();
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentTab, setCurrentTab] = useState('basic'); // basic, personal, employment, bank
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);
  // BUG-006 FIX: paginate the employee list instead of hard-coding page=0, size=100
  const [currentPage, setCurrentPage] = useState(0);
  const PAGE_SIZE = 20;

  // React Query - fetch employees, managers, and departments
  // BUG-006 FIX: pass currentPage so navigation actually changes the query
  const { data: employeeResponse, isLoading: employeesLoading, error: employeesError } = useEmployees(currentPage, PAGE_SIZE);
  // BUG-013 FIX: use useManagers() instead of useEmployees(0,100) so the dropdown
  // only lists employees who are eligible to be assigned as managers (LEAD and above)
  const { data: managers = [], isLoading: managersLoading } = useManagers();
  const { data: departments = [], isLoading: departmentsLoading } = useActiveDepartments();

  const employees = employeeResponse?.content ?? [];
  const totalPages = employeeResponse?.totalPages ?? 1;
  const totalElements = employeeResponse?.totalElements ?? 0;
  const loading = employeesLoading || managersLoading || departmentsLoading;
  const error = employeesError
    ? employeesError instanceof Error
      ? employeesError.message
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
      console.error('Error creating employee:', err);
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
      console.error('Error deleting employee:', err);
      setShowDeleteModal(false);
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300';
      case 'ON_LEAVE': return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300';
      case 'TERMINATED': return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300';
      default: return 'bg-surface-100 dark:bg-surface-800 text-surface-800 dark:text-surface-200';
    }
  };

  return (
    <AppLayout activeMenuItem="employees">
      <motion.div
        className="p-3 sm:p-6 space-y-4 sm:space-y-6"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
      >
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-surface-900 dark:text-surface-50">Employee Management</h1>
            <p className="text-sm sm:text-base text-surface-600 dark:text-surface-400 mt-1">Manage your organization&apos;s employees</p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => router.push('/employees/change-requests')}
              className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-surface-700 dark:text-surface-300 bg-white dark:bg-surface-800 border border-surface-300 dark:border-surface-600 hover:bg-surface-50 dark:hover:bg-surface-700 rounded-xl transition-colors"
            >
              Change Requests
            </button>
            <button
              onClick={() => router.push('/employees/import')}
              className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-surface-700 dark:text-surface-300 bg-white dark:bg-surface-800 border border-surface-300 dark:border-surface-600 hover:bg-surface-50 dark:hover:bg-surface-700 rounded-xl transition-colors"
            >
              Import
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-xl shadow-md shadow-primary-500/25 transition-all whitespace-nowrap"
            >
              + Add Employee
            </button>
          </div>
        </div>
        {/* Error Message */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Search and Filters */}
        <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row gap-2 sm:gap-4">
          <div className="flex-1 flex gap-2">
            <input
              type="text"
              placeholder="Search employees..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="flex-1 min-w-0 px-3 sm:px-4 py-2.5 sm:py-3 text-sm border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 text-surface-900 dark:text-surface-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
            />
            <button
              onClick={handleSearch}
              className="px-3 sm:px-4 py-2 text-sm bg-surface-100 dark:bg-surface-800 text-surface-700 dark:text-surface-300 hover:bg-surface-200 dark:hover:bg-surface-700 rounded-xl transition-colors whitespace-nowrap"
            >
              Search
            </button>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 sm:px-4 py-2.5 text-sm border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 text-surface-900 dark:text-surface-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
          >
            <option value="">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="ON_LEAVE">On Leave</option>
            <option value="TERMINATED">Terminated</option>
          </select>
        </div>

        {/* Employee Table */}
        <div className="bg-white dark:bg-surface-900 rounded-2xl shadow-soft border border-surface-200 dark:border-surface-800 overflow-hidden">
          {loading ? (
            <div className="px-6 py-12 text-center text-surface-500 dark:text-surface-400">
              Loading employees...
            </div>
          ) : employees.length === 0 ? (
            <EmptyState
              icon={<Users className="h-12 w-12" />}
              title={searchQuery.trim() ? 'No employees match your search' : 'No Employees Found'}
              description={searchQuery.trim() ? 'Try adjusting your search terms' : 'Add your first employee to get started'}
              action={{ label: 'Add Employee', onClick: () => setShowAddModal(true) }}
            />
          ) : (
            <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-surface-200 dark:divide-surface-800">
                <thead className="bg-surface-50 dark:bg-surface-800/50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-surface-600 dark:text-surface-400 uppercase tracking-wider">
                      Employee
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-surface-600 dark:text-surface-400 uppercase tracking-wider">
                      Code
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-surface-600 dark:text-surface-400 uppercase tracking-wider">
                      Designation
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-surface-600 dark:text-surface-400 uppercase tracking-wider">
                      Department
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-surface-600 dark:text-surface-400 uppercase tracking-wider">
                      Level
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-surface-600 dark:text-surface-400 uppercase tracking-wider">
                      Manager
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-surface-600 dark:text-surface-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-surface-600 dark:text-surface-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-surface-900 divide-y divide-surface-100 dark:divide-surface-800">
                  {employees.map((employee) => (
                  <tr key={employee.id} className="hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-primary-100 dark:bg-primary-900/30 rounded-xl flex items-center justify-center">
                          <span className="text-sm font-medium text-primary-700 dark:text-primary-300">
                            {employee.firstName.charAt(0)}{employee.lastName?.charAt(0) || ''}
                          </span>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-surface-900 dark:text-surface-50">{employee.fullName}</div>
                          <div className="text-sm text-surface-500 dark:text-surface-400">{employee.workEmail}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-surface-900 dark:text-surface-50">{employee.employeeCode}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-surface-900 dark:text-surface-50">{employee.designation}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-surface-900 dark:text-surface-50">{employee.departmentName || '-'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {employee.level ? (
                        <span className="px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-lg bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300">
                          {employee.level.replace('_', ' ')}
                        </span>
                      ) : (
                        <span className="text-sm text-surface-400 dark:text-surface-500">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-surface-900 dark:text-surface-50">{employee.managerName || '-'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-lg ${getStatusBadgeColor(employee.status)}`}>
                        {employee.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => router.push(`/employees/${employee.id}`)}
                        className="text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300 mr-4 transition-colors"
                      >
                        View
                      </button>
                      <button
                        onClick={() => {
                          setEmployeeToDelete(employee);
                          setShowDeleteModal(true);
                        }}
                        className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 transition-colors"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* BUG-006 FIX: Pagination controls */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-surface-100 dark:border-surface-800 flex items-center justify-between">
                <p className="text-sm text-surface-600 dark:text-surface-400">
                  Showing{' '}
                  <span className="font-medium">{currentPage * PAGE_SIZE + 1}</span>
                  {' '}–{' '}
                  <span className="font-medium">
                    {Math.min((currentPage + 1) * PAGE_SIZE, totalElements)}
                  </span>
                  {' '}of{' '}
                  <span className="font-medium">{totalElements}</span> employees
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                    disabled={currentPage === 0}
                    className="px-3 py-1.5 text-sm rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    Previous
                  </button>
                  <span className="px-3 py-1.5 text-sm text-surface-600 dark:text-surface-400">
                    Page {currentPage + 1} of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
                    disabled={currentPage >= totalPages - 1}
                    className="px-3 py-1.5 text-sm rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
            </>
          )}
        </div>

        {/* Add Employee Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 z-50">
            <div className="bg-white dark:bg-surface-900 rounded-2xl w-full max-w-[calc(100vw-1rem)] sm:max-w-4xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto border border-surface-200 dark:border-surface-700 shadow-xl">
              <div className="p-4 sm:p-6">
                <div className="flex justify-between items-center mb-4 sm:mb-6">
                  <h2 className="text-xl sm:text-2xl font-bold text-surface-900 dark:text-surface-50">Add New Employee</h2>
                  <button
                    onClick={() => {
                      setShowAddModal(false);
                      reset();
                      setCurrentTab('basic');
                    }}
                    className="text-surface-400 hover:text-surface-600 dark:hover:text-surface-300 transition-colors"
                  >
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Tabs */}
                <div className="mb-6 border-b border-surface-200 dark:border-surface-700">
                  <nav className="-mb-px flex space-x-8">
                    <button
                      onClick={() => setCurrentTab('basic')}
                      className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                        currentTab === 'basic'
                          ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                          : 'border-transparent text-surface-500 dark:text-surface-400 hover:text-surface-700 dark:hover:text-surface-300 hover:border-surface-300 dark:hover:border-surface-600'
                      }`}
                    >
                      Basic Info
                    </button>
                    <button
                      onClick={() => setCurrentTab('personal')}
                      className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                        currentTab === 'personal'
                          ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                          : 'border-transparent text-surface-500 dark:text-surface-400 hover:text-surface-700 dark:hover:text-surface-300 hover:border-surface-300 dark:hover:border-surface-600'
                      }`}
                    >
                      Personal Details
                    </button>
                    <button
                      onClick={() => setCurrentTab('employment')}
                      className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                        currentTab === 'employment'
                          ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                          : 'border-transparent text-surface-500 dark:text-surface-400 hover:text-surface-700 dark:hover:text-surface-300 hover:border-surface-300 dark:hover:border-surface-600'
                      }`}
                    >
                      Employment
                    </button>
                    <button
                      onClick={() => setCurrentTab('bank')}
                      className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                        currentTab === 'bank'
                          ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                          : 'border-transparent text-surface-500 dark:text-surface-400 hover:text-surface-700 dark:hover:text-surface-300 hover:border-surface-300 dark:hover:border-surface-600'
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
                          <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                            Employee Code *
                          </label>
                          <input
                            type="text"
                            {...register('employeeCode')}
                            className="w-full px-3 py-2.5 border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                            placeholder="EMP001"
                          />
                          {errors.employeeCode && <p className="text-red-500 text-sm mt-1">{errors.employeeCode.message}</p>}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                            Work Email *
                          </label>
                          <input
                            type="email"
                            {...register('workEmail')}
                            className="w-full px-3 py-2.5 border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                            placeholder="employee@company.com"
                          />
                          {errors.workEmail && <p className="text-red-500 text-sm mt-1">{errors.workEmail.message}</p>}
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                            First Name *
                          </label>
                          <input
                            type="text"
                            {...register('firstName')}
                            className="w-full px-3 py-2.5 border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                          />
                          {errors.firstName && <p className="text-red-500 text-sm mt-1">{errors.firstName.message}</p>}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                            Middle Name
                          </label>
                          <input
                            type="text"
                            {...register('middleName')}
                            className="w-full px-3 py-2.5 border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                          />
                          {errors.middleName && <p className="text-red-500 text-sm mt-1">{errors.middleName.message}</p>}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                            Last Name
                          </label>
                          <input
                            type="text"
                            {...register('lastName')}
                            className="w-full px-3 py-2.5 border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                          />
                          {errors.lastName && <p className="text-red-500 text-sm mt-1">{errors.lastName.message}</p>}
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                          Initial Password *
                        </label>
                        <input
                          type="password"
                          {...register('password')}
                          className="w-full px-3 py-2.5 border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                          placeholder="Employee will change on first login"
                        />
                        {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password.message}</p>}
                      </div>
                    </div>
                  )}

                  {/* Personal Details Tab */}
                  {currentTab === 'personal' && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                            Personal Email
                          </label>
                          <input
                            type="email"
                            {...register('personalEmail')}
                            className="w-full px-3 py-2.5 border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                            placeholder="personal@email.com"
                          />
                          {errors.personalEmail && <p className="text-red-500 text-sm mt-1">{errors.personalEmail.message}</p>}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                            Phone Number
                          </label>
                          <input
                            type="tel"
                            {...register('phoneNumber')}
                            className="w-full px-3 py-2.5 border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                            placeholder="+1 234 567 8900"
                          />
                          {errors.phoneNumber && <p className="text-red-500 text-sm mt-1">{errors.phoneNumber.message}</p>}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                            Emergency Contact
                          </label>
                          <input
                            type="tel"
                            {...register('emergencyContactNumber')}
                            className="w-full px-3 py-2.5 border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                            placeholder="+1 234 567 8900"
                          />
                          {errors.emergencyContactNumber && <p className="text-red-500 text-sm mt-1">{errors.emergencyContactNumber.message}</p>}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                            Date of Birth
                          </label>
                          <input
                            type="date"
                            {...register('dateOfBirth')}
                            className="w-full px-3 py-2.5 border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                          />
                          {errors.dateOfBirth && <p className="text-red-500 text-sm mt-1">{errors.dateOfBirth.message}</p>}
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                          Gender
                        </label>
                        <Controller
                          name="gender"
                          control={control}
                          render={({ field }) => (
                            <select
                              {...field}
                              value={field.value || ''}
                              className="w-full px-3 py-2.5 border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                            >
                              <option value="">Select Gender</option>
                              <option value="MALE">Male</option>
                              <option value="FEMALE">Female</option>
                              <option value="OTHER">Other</option>
                              <option value="PREFER_NOT_TO_SAY">Prefer not to say</option>
                            </select>
                          )}
                        />
                        {errors.gender && <p className="text-red-500 text-sm mt-1">{errors.gender.message}</p>}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                          Address
                        </label>
                        <textarea
                          rows={2}
                          {...register('address')}
                          className="w-full px-3 py-2.5 border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                          placeholder="Street address"
                        />
                        {errors.address && <p className="text-red-500 text-sm mt-1">{errors.address.message}</p>}
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                            City
                          </label>
                          <input
                            type="text"
                            {...register('city')}
                            className="w-full px-3 py-2.5 border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                          />
                          {errors.city && <p className="text-red-500 text-sm mt-1">{errors.city.message}</p>}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                            State/Province
                          </label>
                          <input
                            type="text"
                            {...register('state')}
                            className="w-full px-3 py-2.5 border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                          />
                          {errors.state && <p className="text-red-500 text-sm mt-1">{errors.state.message}</p>}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                            Postal Code
                          </label>
                          <input
                            type="text"
                            {...register('postalCode')}
                            className="w-full px-3 py-2.5 border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                          />
                          {errors.postalCode && <p className="text-red-500 text-sm mt-1">{errors.postalCode.message}</p>}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                            Country
                          </label>
                          <input
                            type="text"
                            {...register('country')}
                            className="w-full px-3 py-2.5 border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                          />
                          {errors.country && <p className="text-red-500 text-sm mt-1">{errors.country.message}</p>}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Employment Tab */}
                  {currentTab === 'employment' && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                            Designation *
                          </label>
                          <input
                            type="text"
                            {...register('designation')}
                            className="w-full px-3 py-2.5 border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                            placeholder="Senior Software Engineer"
                          />
                          {errors.designation && <p className="text-red-500 text-sm mt-1">{errors.designation.message}</p>}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                            Employment Type *
                          </label>
                          <Controller
                            name="employmentType"
                            control={control}
                            render={({ field }) => (
                              <select
                                {...field}
                                className="w-full px-3 py-2.5 border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                              >
                                <option value="FULL_TIME">Full Time</option>
                                <option value="PART_TIME">Part Time</option>
                                <option value="CONTRACT">Contract</option>
                                <option value="INTERN">Intern</option>
                              </select>
                            )}
                          />
                          {errors.employmentType && <p className="text-red-500 text-sm mt-1">{errors.employmentType.message}</p>}
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                          Department *
                        </label>
                        <Controller
                          name="departmentId"
                          control={control}
                          render={({ field }) => (
                            <select
                              {...field}
                              className="w-full px-3 py-2.5 border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
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
                        {errors.departmentId && <p className="text-red-500 text-sm mt-1">{errors.departmentId.message}</p>}
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                            Employee Level
                          </label>
                          <Controller
                            name="level"
                            control={control}
                            render={({ field }) => (
                              <select
                                {...field}
                                value={field.value || ''}
                                className="w-full px-3 py-2.5 border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
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
                          {errors.level && <p className="text-red-500 text-sm mt-1">{errors.level.message}</p>}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                            Job Role
                          </label>
                          <Controller
                            name="jobRole"
                            control={control}
                            render={({ field }) => (
                              <select
                                {...field}
                                value={field.value || ''}
                                className="w-full px-3 py-2.5 border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
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
                          {errors.jobRole && <p className="text-red-500 text-sm mt-1">{errors.jobRole.message}</p>}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                            Joining Date *
                          </label>
                          <input
                            type="date"
                            {...register('joiningDate')}
                            className="w-full px-3 py-2.5 border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                          />
                          {errors.joiningDate && <p className="text-red-500 text-sm mt-1">{errors.joiningDate.message}</p>}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                            Confirmation Date
                          </label>
                          <input
                            type="date"
                            {...register('confirmationDate')}
                            className="w-full px-3 py-2.5 border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                          />
                          {errors.confirmationDate && <p className="text-red-500 text-sm mt-1">{errors.confirmationDate.message}</p>}
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                          Reporting Manager
                        </label>
                        <Controller
                          name="managerId"
                          control={control}
                          render={({ field }) => (
                            <select
                              {...field}
                              className="w-full px-3 py-2.5 border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
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
                        <p className="mt-1 text-xs text-surface-500 dark:text-surface-400">
                          Select "Self" for top-level employees who don't report to anyone.
                        </p>
                        {errors.managerId && <p className="text-red-500 text-sm mt-1">{errors.managerId.message}</p>}
                      </div>
                    </div>
                  )}

                  {/* Banking & Tax Tab */}
                  {currentTab === 'bank' && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                            Bank Account Number
                          </label>
                          <input
                            type="text"
                            {...register('bankAccountNumber')}
                            className="w-full px-3 py-2.5 border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                            placeholder="1234567890"
                          />
                          {errors.bankAccountNumber && <p className="text-red-500 text-sm mt-1">{errors.bankAccountNumber.message}</p>}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                            Bank Name
                          </label>
                          <input
                            type="text"
                            {...register('bankName')}
                            className="w-full px-3 py-2.5 border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                            placeholder="Bank of America"
                          />
                          {errors.bankName && <p className="text-red-500 text-sm mt-1">{errors.bankName.message}</p>}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                            IFSC Code / Routing Number
                          </label>
                          <input
                            type="text"
                            {...register('bankIfscCode')}
                            className="w-full px-3 py-2.5 border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                            placeholder="HDFC0001234"
                          />
                          {errors.bankIfscCode && <p className="text-red-500 text-sm mt-1">{errors.bankIfscCode.message}</p>}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                            Tax ID / SSN
                          </label>
                          <input
                            type="text"
                            {...register('taxId')}
                            className="w-full px-3 py-2.5 border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                            placeholder="XXX-XX-XXXX"
                          />
                          {errors.taxId && <p className="text-red-500 text-sm mt-1">{errors.taxId.message}</p>}
                        </div>
                      </div>

                      <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                        <p className="text-sm text-blue-700 dark:text-blue-400">
                          <strong>Note:</strong> Banking and tax information is encrypted and stored securely. This information will be used for payroll processing.
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3 pt-4 border-t border-surface-200 dark:border-surface-700">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddModal(false);
                        reset();
                        setCurrentTab('basic');
                      }}
                      className="flex-1 px-4 py-2.5 border border-surface-300 dark:border-surface-600 rounded-xl text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-1 px-4 py-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-700 shadow-md shadow-primary-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? 'Adding...' : 'Add Employee'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && employeeToDelete && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-surface-900 rounded-2xl max-w-md w-full p-6 border border-surface-200 dark:border-surface-700 shadow-xl">
              <div className="flex items-center mb-4">
                <div className="flex-shrink-0 h-12 w-12 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                  <svg className="h-6 w-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h3 className="ml-4 text-lg font-medium text-surface-900 dark:text-surface-50">Delete Employee</h3>
              </div>
              <p className="text-sm text-surface-500 dark:text-surface-400 mb-6">
                Are you sure you want to delete <strong className="text-surface-700 dark:text-surface-300">{employeeToDelete.fullName}</strong>? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setEmployeeToDelete(null);
                  }}
                  disabled={deleteEmployeeMutation.isPending}
                  className="flex-1 px-4 py-2.5 border border-surface-300 dark:border-surface-600 rounded-xl text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-800 disabled:opacity-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleteEmployeeMutation.isPending}
                  className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:opacity-50 shadow-md shadow-red-500/25 transition-all"
                >
                  {deleteEmployeeMutation.isPending ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </AppLayout>
  );
}
