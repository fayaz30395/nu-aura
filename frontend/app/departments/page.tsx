'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Building2, Plus, Edit2, Trash2, ToggleLeft, ToggleRight, Users, Search, X } from 'lucide-react';
import { AppLayout } from '@/components/layout';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Department, DepartmentRequest, DepartmentType } from '@/lib/types/hrms/employee';
import { useAuth } from '@/lib/hooks/useAuth';
import { usePermissions, Permissions } from '@/lib/hooks/usePermissions';
import { SkeletonTable } from '@/components/ui/Loading';
import { useToast } from '@/components/notifications/ToastProvider';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import {
  useAllDepartments,
  useCreateDepartment,
  useUpdateDepartment,
  useActivateDepartment,
  useDeactivateDepartment,
  useDeleteDepartment,
} from '@/lib/hooks/queries/useDepartments';
import { useEmployees } from '@/lib/hooks/queries/useEmployees';
import { createLogger } from '@/lib/utils/logger';

const log = createLogger('DepartmentsPage');

const departmentSchema = z.object({
  code: z.string().min(1, 'Code required').max(50),
  name: z.string().min(1, 'Name required').max(100),
  description: z.string().optional().or(z.literal('')),
  parentDepartmentId: z.string().optional().or(z.literal('')),
  managerId: z.string().optional().or(z.literal('')),
  location: z.string().optional().or(z.literal('')),
  costCenter: z.string().optional().or(z.literal('')),
  type: z.string().optional().or(z.literal('')),
  isActive: z.boolean().default(true),
});

type DepartmentFormData = z.infer<typeof departmentSchema>;

export default function DepartmentsPage() {
  const router = useRouter();
  const { isAuthenticated, hasHydrated } = useAuth();
  const { hasPermission, isReady: permReady } = usePermissions();
  const toast = useToast();

  // Form state — ALL hooks must be called unconditionally before any returns
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<DepartmentFormData>({
    resolver: zodResolver(departmentSchema),
    defaultValues: {
      code: '',
      name: '',
      description: '',
      parentDepartmentId: '',
      managerId: '',
      location: '',
      costCenter: '',
      type: '',
      isActive: true,
    },
  });

  // Local UI state
  const [showAddModal, setShowAddModal] = React.useState(false);
  const [editingDepartment, setEditingDepartment] = React.useState<Department | null>(null);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<string | null>(null);
  const [showToggleConfirm, setShowToggleConfirm] = React.useState(false);
  const [toggleTarget, setToggleTarget] = React.useState<Department | null>(null);
  const [currentPage] = React.useState(0);
  const [pageSize] = React.useState(10);

  // React Query hooks
  const { data: deptData, isLoading } = useAllDepartments(currentPage, pageSize);
  const { data: empData } = useEmployees(0, 500);
  const createMutation = useCreateDepartment();
  const updateMutation = useUpdateDepartment();
  const activateMutation = useActivateDepartment();
  const deactivateMutation = useDeactivateDepartment();
  const deleteMutation = useDeleteDepartment();

  const departments = deptData?.content || [];
  const employees = empData?.content || [];

  useEffect(() => {
    if (!hasHydrated) return;
    if (!isAuthenticated) {
      router.push('/auth/login');
    }
  }, [hasHydrated, isAuthenticated, router]);

  // Redirect users without DEPARTMENT:VIEW permission
  useEffect(() => {
    if (!permReady) return;
    if (!hasPermission(Permissions.DEPARTMENT_VIEW)) {
      router.replace('/dashboard');
    }
  }, [permReady, hasPermission, router]);

  // Show skeleton while permissions are loading
  if (!permReady) {
    return (
      <AppLayout activeMenuItem="departments">
        <div className="p-6">
          <div className="max-w-7xl mx-auto">
            <div className="mb-8">
              <div className="h-10 bg-[var(--skeleton-base)] rounded-lg w-1/3 mb-4" />
              <div className="h-5 bg-[var(--skeleton-base)] rounded-lg w-2/3" />
            </div>
            <SkeletonTable rows={5} columns={4} />
          </div>
        </div>
      </AppLayout>
    );
  }

  const onSubmit = async (data: DepartmentFormData) => {
    try {
      setError(null);

      const submitData: DepartmentRequest = {
        code: data.code,
        name: data.name,
        description: data.description || undefined,
        parentDepartmentId: data.parentDepartmentId || undefined,
        managerId: data.managerId || undefined,
        isActive: data.isActive,
        location: data.location || undefined,
        costCenter: data.costCenter || undefined,
        type: (data.type || undefined) as DepartmentType | undefined,
      };

      if (editingDepartment) {
        await updateMutation.mutateAsync({ id: editingDepartment.id, data: submitData });
        toast.success('Department Updated', 'The department has been updated successfully.');
      } else {
        await createMutation.mutateAsync(submitData);
        toast.success('Department Created', 'The department has been created successfully.');
      }

      reset();
      setShowAddModal(false);
      setEditingDepartment(null);
    } catch (err: unknown) {
      const errorMsg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || `Failed to ${editingDepartment ? 'update' : 'create'} department`;
      setError(errorMsg);
      toast.error('Error', errorMsg);
      log.error('Error saving department:', err);
    }
  };

  const handleEdit = (department: Department) => {
    setEditingDepartment(department);
    reset({
      code: department.code,
      name: department.name,
      description: department.description || '',
      parentDepartmentId: department.parentDepartmentId || '',
      managerId: department.managerId || '',
      isActive: department.isActive,
      location: department.location || '',
      costCenter: department.costCenter || '',
      type: department.type || '',
    });
    setShowAddModal(true);
  };

  const handleDeleteClick = (id: string) => {
    setDeleteTarget(id);
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setShowDeleteConfirm(false);

    try {
      setError(null);
      await deleteMutation.mutateAsync(deleteTarget);
      toast.success('Department Deleted', 'The department has been deleted successfully.');
      setDeleteTarget(null);
    } catch (err: unknown) {
      const errorMsg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to delete department';
      setError(errorMsg);
      toast.error('Error', errorMsg);
      log.error('Error deleting department:', err);
    }
  };

  const handleToggleClick = (department: Department) => {
    setToggleTarget(department);
    setShowToggleConfirm(true);
  };

  const handleToggleConfirm = async () => {
    if (!toggleTarget) return;
    setShowToggleConfirm(false);

    try {
      setError(null);
      if (toggleTarget.isActive) {
        await deactivateMutation.mutateAsync(toggleTarget.id);
        toast.success('Department Deactivated', 'The department has been deactivated.');
      } else {
        await activateMutation.mutateAsync(toggleTarget.id);
        toast.success('Department Activated', 'The department has been activated.');
      }
      setToggleTarget(null);
    } catch (err: unknown) {
      const errorMsg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to update department status';
      setError(errorMsg);
      toast.error('Error', errorMsg);
      log.error('Error toggling department status:', err);
    }
  };

  const departmentTypes: DepartmentType[] = [
    'ENGINEERING', 'PRODUCT', 'DESIGN', 'MARKETING', 'SALES',
    'OPERATIONS', 'FINANCE', 'HR', 'LEGAL', 'ADMIN', 'SUPPORT', 'OTHER'
  ];

  const filteredDepartments = departments.filter((dept) =>
    dept.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    dept.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (dept.type && dept.type.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const totalEmployees = departments.reduce((sum, dept) => sum + (dept.employeeCount || 0), 0);
  const activeDepartments = departments.filter(d => d.isActive).length;

  return (
    <AppLayout activeMenuItem="departments">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] skeuo-emboss">Departments</h1>
            <p className="text-[var(--text-muted)] mt-1 skeuo-deboss">
              Manage your organization&apos;s departments and structure
            </p>
          </div>
          <Button
            variant="primary"
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => {
              reset();
              setEditingDepartment(null);
              setShowAddModal(true);
            }}
          >
            Add Department
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="bg-[var(--bg-card)] skeuo-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-[var(--text-muted)] skeuo-deboss">Total Departments</p>
                  <p className="text-2xl font-bold skeuo-emboss">{departments.length}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-accent-50 dark:bg-accent-950/30 flex items-center justify-center">
                  <Building2 className="h-6 w-6 text-accent-700 dark:text-accent-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[var(--bg-card)] skeuo-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-[var(--text-muted)] skeuo-deboss">Active Departments</p>
                  <p className="text-2xl font-bold skeuo-emboss">{activeDepartments}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-success-50 dark:bg-success-950/30 flex items-center justify-center">
                  <ToggleRight className="h-6 w-6 text-success-600 dark:text-success-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[var(--bg-card)] skeuo-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-[var(--text-muted)] skeuo-deboss">Total Employees</p>
                  <p className="text-2xl font-bold skeuo-emboss">{totalEmployees}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-accent-50 dark:bg-accent-950/30 flex items-center justify-center">
                  <Users className="h-6 w-6 text-accent-600 dark:text-accent-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-danger-50 dark:bg-danger-950/30 border border-danger-200 dark:border-danger-800 text-danger-700 dark:text-danger-400 px-4 py-4 rounded-xl flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-danger-500 hover:text-danger-700">
              <X className="h-5 w-5" />
            </button>
          </div>
        )}

        {/* Search and Filter */}
        <Card className="bg-[var(--bg-card)]">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
              <input
                type="text"
                placeholder="Search departments by name, code, or type..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-[var(--border-main)] rounded-xl bg-[var(--bg-input)] text-[var(--text-primary)] placeholder-surface-400 focus:ring-2 focus:ring-accent-500 focus:border-transparent"
              />
            </div>
          </CardContent>
        </Card>

        {/* Departments Table */}
        <Card className="bg-[var(--bg-card)]">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[var(--border-main)]">
                    <th className="px-6 py-4 text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                      Department
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                      Parent
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                      Manager
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                      Employees
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-200 dark:divide-surface-700">
                  {isLoading ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center gap-4">
                          <div className="w-8 h-8 border-4 border-accent-200 border-t-accent-500 rounded-full animate-spin" aria-label="Loading departments" />
                          <span className="text-[var(--text-muted)]">Loading departments...</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredDepartments.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center gap-4">
                          <div className="w-16 h-16 rounded-full bg-[var(--bg-secondary)] flex items-center justify-center">
                            <Building2 className="h-8 w-8 text-[var(--text-muted)]" />
                          </div>
                          <div>
                            <p className="text-[var(--text-primary)] font-medium">No departments found</p>
                            <p className="text-[var(--text-muted)] text-sm mt-1">
                              {searchQuery ? 'Try a different search term' : 'Click "Add Department" to get started'}
                            </p>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredDepartments.map((dept) => (
                      <tr key={dept.id} className="h-11 hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)]/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-accent-50 dark:bg-accent-950/30 flex items-center justify-center">
                              <Building2 className="h-5 w-5 text-accent-700 dark:text-accent-400" />
                            </div>
                            <div>
                              <p className="font-medium text-[var(--text-primary)]">{dept.name}</p>
                              <p className="text-sm text-[var(--text-muted)]">{dept.code}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {dept.type ? (
                            <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-accent-100 dark:bg-accent-950/30 text-accent-700 dark:text-accent-400">
                              {dept.type}
                            </span>
                          ) : (
                            <span className="text-[var(--text-muted)]">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-[var(--text-primary)]">
                          {dept.parentDepartmentName || '-'}
                        </td>
                        <td className="px-6 py-4 text-[var(--text-primary)]">
                          {dept.managerName || '-'}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Users className="h-4 w-4 text-[var(--text-muted)]" />
                            <span className="text-[var(--text-primary)]">{dept.employeeCount || 0}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                            dept.isActive
                              ? 'bg-success-100 dark:bg-success-950/30 text-success-700 dark:text-success-400'
                              : 'bg-danger-100 dark:bg-danger-950/30 text-danger-700 dark:text-danger-400'
                          }`}>
                            {dept.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleEdit(dept)}
                              className="p-2 rounded-lg text-[var(--text-muted)] hover:text-accent-700 hover:bg-accent-50 dark:hover:bg-accent-950/30 transition-colors"
                              title="Edit"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleToggleClick(dept)}
                              className="p-2 rounded-lg text-[var(--text-muted)] hover:text-warning-600 hover:bg-warning-50 dark:hover:bg-warning-950/30 transition-colors"
                              title={dept.isActive ? 'Deactivate' : 'Activate'}
                            >
                              {dept.isActive ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
                            </button>
                            <button
                              onClick={() => handleDeleteClick(dept.id)}
                              className="p-2 rounded-lg text-[var(--text-muted)] hover:text-danger-600 hover:bg-danger-50 dark:hover:bg-danger-950/30 transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Add/Edit Department Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-[var(--bg-overlay)] flex items-center justify-center p-4 z-50">
            <div className="bg-[var(--bg-card)] rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
              <div className="p-6 border-b border-[var(--border-main)]">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-accent-50 dark:bg-accent-950/30 flex items-center justify-center">
                      <Building2 className="h-5 w-5 text-accent-700 dark:text-accent-400" />
                    </div>
                    <h2 className="text-xl font-bold text-[var(--text-primary)]">
                      {editingDepartment ? 'Edit Department' : 'Add New Department'}
                    </h2>
                  </div>
                  <button
                    onClick={() => {
                      setShowAddModal(false);
                      setEditingDepartment(null);
                      reset();
                    }}
                    className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)] transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                      Department Code *
                    </label>
                    <input
                      type="text"
                      {...register('code')}
                      className="w-full px-4 py-2.5 border border-[var(--border-main)] rounded-xl bg-[var(--bg-input)] text-[var(--text-primary)] focus:ring-2 focus:ring-accent-500 focus:border-transparent"
                      placeholder="ENG, HR, FIN"
                    />
                    {errors.code && <p className="text-danger-500 text-sm mt-1">{errors.code.message}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                      Department Name *
                    </label>
                    <input
                      type="text"
                      {...register('name')}
                      className="w-full px-4 py-2.5 border border-[var(--border-main)] rounded-xl bg-[var(--bg-input)] text-[var(--text-primary)] focus:ring-2 focus:ring-accent-500 focus:border-transparent"
                      placeholder="Engineering"
                    />
                    {errors.name && <p className="text-danger-500 text-sm mt-1">{errors.name.message}</p>}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                    Description
                  </label>
                  <textarea
                    {...register('description')}
                    rows={3}
                    className="w-full px-4 py-2.5 border border-[var(--border-main)] rounded-xl bg-[var(--bg-input)] text-[var(--text-primary)] focus:ring-2 focus:ring-accent-500 focus:border-transparent resize-none"
                    placeholder="Department description..."
                  />
                  {errors.description && <p className="text-danger-500 text-sm mt-1">{errors.description.message}</p>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                      Department Type
                    </label>
                    <Controller
                      name="type"
                      control={control}
                      render={({ field }) => (
                        <select
                          {...field}
                          className="w-full px-4 py-2.5 border border-[var(--border-main)] rounded-xl bg-[var(--bg-input)] text-[var(--text-primary)] focus:ring-2 focus:ring-accent-500 focus:border-transparent"
                        >
                          <option value="">Select Type</option>
                          {departmentTypes.map(type => (
                            <option key={type} value={type}>{type}</option>
                          ))}
                        </select>
                      )}
                    />
                    {errors.type && <p className="text-danger-500 text-sm mt-1">{errors.type.message}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                      Parent Department
                    </label>
                    <Controller
                      name="parentDepartmentId"
                      control={control}
                      render={({ field }) => (
                        <select
                          {...field}
                          className="w-full px-4 py-2.5 border border-[var(--border-main)] rounded-xl bg-[var(--bg-input)] text-[var(--text-primary)] focus:ring-2 focus:ring-accent-500 focus:border-transparent"
                        >
                          <option value="">None (Root Department)</option>
                          {departments
                            .filter(d => !editingDepartment || d.id !== editingDepartment.id)
                            .map((dept) => (
                              <option key={dept.id} value={dept.id}>
                                {dept.name} ({dept.code})
                              </option>
                            ))}
                        </select>
                      )}
                    />
                    {errors.parentDepartmentId && <p className="text-danger-500 text-sm mt-1">{errors.parentDepartmentId.message}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                      Department Manager
                    </label>
                    <Controller
                      name="managerId"
                      control={control}
                      render={({ field }) => (
                        <select
                          {...field}
                          className="w-full px-4 py-2.5 border border-[var(--border-main)] rounded-xl bg-[var(--bg-input)] text-[var(--text-primary)] focus:ring-2 focus:ring-accent-500 focus:border-transparent"
                        >
                          <option value="">Select Manager</option>
                          {employees.map((emp) => (
                            <option key={emp.id} value={emp.id}>
                              {emp.fullName} ({emp.employeeCode})
                            </option>
                          ))}
                        </select>
                      )}
                    />
                    {errors.managerId && <p className="text-danger-500 text-sm mt-1">{errors.managerId.message}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                      Location
                    </label>
                    <input
                      type="text"
                      {...register('location')}
                      className="w-full px-4 py-2.5 border border-[var(--border-main)] rounded-xl bg-[var(--bg-input)] text-[var(--text-primary)] focus:ring-2 focus:ring-accent-500 focus:border-transparent"
                      placeholder="Building A, Floor 2"
                    />
                    {errors.location && <p className="text-danger-500 text-sm mt-1">{errors.location.message}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                      Cost Center
                    </label>
                    <input
                      type="text"
                      {...register('costCenter')}
                      className="w-full px-4 py-2.5 border border-[var(--border-main)] rounded-xl bg-[var(--bg-input)] text-[var(--text-primary)] focus:ring-2 focus:ring-accent-500 focus:border-transparent"
                      placeholder="CC-1001"
                    />
                    {errors.costCenter && <p className="text-danger-500 text-sm mt-1">{errors.costCenter.message}</p>}
                  </div>
                  <div className="flex items-end">
                    <Controller
                      name="isActive"
                      control={control}
                      render={({ field: { value, onChange } }) => (
                        <label className="flex items-center cursor-pointer p-2.5 rounded-xl hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)] transition-colors">
                          <input
                            type="checkbox"
                            checked={value}
                            onChange={(e) => onChange(e.target.checked)}
                            className="h-5 w-5 text-accent-700 focus:ring-accent-500 border-[var(--border-main)] dark:border-[var(--border-main)] rounded"
                          />
                          <span className="ml-3 text-sm font-medium text-[var(--text-secondary)]">Active Department</span>
                        </label>
                      )}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-4 pt-4 border-t border-[var(--border-main)]">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowAddModal(false);
                      setEditingDepartment(null);
                      reset();
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={isSubmitting || createMutation.isPending || updateMutation.isPending}
                  >
                    {isSubmitting || createMutation.isPending || updateMutation.isPending ? 'Saving...' : (editingDepartment ? 'Update' : 'Create')} Department
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation Dialog */}
        <ConfirmDialog
          isOpen={showDeleteConfirm}
          onClose={() => {
            setShowDeleteConfirm(false);
            setDeleteTarget(null);
          }}
          onConfirm={handleDeleteConfirm}
          title="Delete Department?"
          message="Are you sure you want to delete this department? This action cannot be undone."
          confirmText="Delete"
          cancelText="Cancel"
          type="danger"
        />

        {/* Toggle Status Confirmation Dialog */}
        <ConfirmDialog
          isOpen={showToggleConfirm}
          onClose={() => {
            setShowToggleConfirm(false);
            setToggleTarget(null);
          }}
          onConfirm={handleToggleConfirm}
          title={toggleTarget?.isActive ? 'Deactivate Department?' : 'Activate Department?'}
          message={toggleTarget?.isActive
            ? 'Are you sure you want to deactivate this department? Employees may be affected.'
            : 'Are you sure you want to activate this department?'}
          confirmText={toggleTarget?.isActive ? 'Deactivate' : 'Activate'}
          cancelText="Cancel"
          type="warning"
        />
      </div>
    </AppLayout>
  );
}
