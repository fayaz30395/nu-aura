'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import {
  Building2, Plus, Search, Pencil, Trash2, ToggleLeft, ToggleRight,
  ChevronLeft, ChevronRight, AlertCircle, X,
} from 'lucide-react';
import { AdminPageContent } from '@/components/layout';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/notifications/ToastProvider';
import { PermissionGate } from '@/components/auth/PermissionGate';
import { Permissions, usePermissions } from '@/lib/hooks/usePermissions';
import { useAllDepartments, departmentKeys } from '@/lib/hooks/queries/useDepartments';
import { departmentService } from '@/lib/services/hrms/department.service';
import { Department, DepartmentRequest, DepartmentType } from '@/lib/types/hrms/employee';

const DEPT_TYPES: DepartmentType[] = [
  'ENGINEERING', 'PRODUCT', 'DESIGN', 'MARKETING', 'SALES',
  'OPERATIONS', 'FINANCE', 'HR', 'LEGAL', 'ADMIN', 'SUPPORT', 'OTHER',
];

const deptSchema = z.object({
  code: z.string().min(1, 'Code is required').max(20).regex(/^[A-Z0-9_-]+$/, 'Uppercase letters, numbers, underscores, hyphens only'),
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(500).optional().default(''),
  type: z.enum(['ENGINEERING', 'PRODUCT', 'DESIGN', 'MARKETING', 'SALES', 'OPERATIONS', 'FINANCE', 'HR', 'LEGAL', 'ADMIN', 'SUPPORT', 'OTHER']).optional(),
  location: z.string().max(200).optional().default(''),
  costCenter: z.string().max(50).optional().default(''),
});
type DeptFormData = z.infer<typeof deptSchema>;

const PAGE_SIZE = 20;

export default function DepartmentsPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { isReady: permReady } = usePermissions();

  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<Department | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Department | null>(null);

  const { data, isLoading, isError } = useAllDepartments(page, PAGE_SIZE);
  const departments = data?.content ?? [];
  const totalPages = data?.totalPages ?? 0;

  const filtered = search.trim()
    ? departments.filter(d =>
        d.name.toLowerCase().includes(search.toLowerCase()) ||
        d.code.toLowerCase().includes(search.toLowerCase())
      )
    : departments;

  const { register, handleSubmit, reset, formState: { errors } } = useForm<DeptFormData>({
    resolver: zodResolver(deptSchema),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: departmentKeys.all });

  const createMutation = useMutation({
    mutationFn: (data: DepartmentRequest) => departmentService.createDepartment(data),
    onSuccess: () => { toast.success('Department created'); invalidate(); closeModal(); },
    onError: (err: unknown) => toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Create failed'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: DepartmentRequest }) => departmentService.updateDepartment(id, data),
    onSuccess: () => { toast.success('Department updated'); invalidate(); closeModal(); },
    onError: (err: unknown) => toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Update failed'),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      active ? departmentService.deactivateDepartment(id) : departmentService.activateDepartment(id),
    onSuccess: (_, vars) => { toast.success(vars.active ? 'Department deactivated' : 'Department activated'); invalidate(); },
    onError: (err: unknown) => toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Toggle failed'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => departmentService.deleteDepartment(id),
    onSuccess: () => { toast.success('Department deleted'); invalidate(); setDeleteTarget(null); },
    onError: (err: unknown) => toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Delete failed'),
  });

  const openCreate = () => {
    setEditTarget(null);
    reset({ code: '', name: '', description: '', location: '', costCenter: '' });
    setShowModal(true);
  };

  const openEdit = (dept: Department) => {
    setEditTarget(dept);
    reset({
      code: dept.code,
      name: dept.name,
      description: dept.description ?? '',
      type: dept.type,
      location: dept.location ?? '',
      costCenter: dept.costCenter ?? '',
    });
    setShowModal(true);
  };

  const closeModal = () => { setShowModal(false); setEditTarget(null); };

  // Escape key closes any open modal
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (deleteTarget) { setDeleteTarget(null); return; }
      if (showModal) closeModal();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [showModal, deleteTarget]); // eslint-disable-line react-hooks/exhaustive-deps

  const onSubmit = (data: DeptFormData) => {
    const payload: DepartmentRequest = {
      code: data.code,
      name: data.name,
      description: data.description || undefined,
      type: data.type,
      location: data.location || undefined,
      costCenter: data.costCenter || undefined,
    };
    if (editTarget) {
      updateMutation.mutate({ id: editTarget.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  if (!permReady) {
    return (
      <AdminPageContent>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="skeuo-card p-4 animate-pulse">
              <div className="h-4 bg-[var(--skeleton-base)] rounded w-1/4 mb-2" />
              <div className="h-3 bg-[var(--skeleton-base)] rounded w-1/2" />
            </div>
          ))}
        </div>
      </AdminPageContent>
    );
  }

  return (
    <AdminPageContent>
      <PermissionGate
        permission={Permissions.EMPLOYEE_READ}
        fallback={<p className="text-danger-600 p-6">You do not have permission to view departments.</p>}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold skeuo-emboss">Department Management</h1>
            <p className="text-sm text-[var(--text-secondary)] mt-0.5">
              {data?.totalElements ?? 0} departments
            </p>
          </div>
          <Button variant="primary" onClick={openCreate} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            New Department
          </Button>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or code…"
            className="input-aura pl-10 w-full max-w-sm"
            aria-label="Search departments"
          />
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="skeuo-card p-4 animate-pulse flex gap-4">
                <div className="h-4 bg-[var(--skeleton-base)] rounded w-16" />
                <div className="h-4 bg-[var(--skeleton-base)] rounded w-40" />
                <div className="h-4 bg-[var(--skeleton-base)] rounded w-24 ml-auto" />
              </div>
            ))}
          </div>
        ) : isError ? (
          <div className="flex items-center gap-3 p-6 skeuo-card text-danger-600">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <span className="text-sm">Failed to load departments. Please try again.</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="skeuo-card p-12 flex flex-col items-center gap-3 text-center">
            <Building2 className="h-10 w-10 text-[var(--text-muted)]" />
            <p className="text-sm font-medium text-[var(--text-secondary)]">
              {search ? 'No departments match your search' : 'No departments yet'}
            </p>
            {!search && (
              <Button variant="ghost" onClick={openCreate} className="mt-2">
                Create the first department
              </Button>
            )}
          </div>
        ) : (
          <div className="skeuo-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border-subtle)]">
                  <th className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Code</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Name</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Type</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Employees</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Status</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {filtered.map(dept => (
                  <tr key={dept.id} className="hover:bg-[var(--bg-elevated)] transition-colors">
                    <td className="px-4 py-2.5 font-mono text-xs text-[var(--text-secondary)]">{dept.code}</td>
                    <td className="px-4 py-2.5 font-medium">{dept.name}</td>
                    <td className="px-4 py-2.5 text-[var(--text-secondary)]">
                      {dept.type ? (
                        <span className="px-2 py-0.5 rounded-full bg-accent-100 dark:bg-accent-900/30 text-accent-700 dark:text-accent-300 text-xs font-medium">
                          {dept.type}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-[var(--text-secondary)]">{dept.employeeCount ?? 0}</td>
                    <td className="px-4 py-2.5">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        dept.isActive
                          ? 'bg-success-100 dark:bg-success-900/30 text-success-700 dark:text-success-400'
                          : 'bg-[var(--bg-elevated)] text-[var(--text-muted)]'
                      }`}>
                        {dept.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          aria-label={dept.isActive ? 'Deactivate department' : 'Activate department'}
                          onClick={() => toggleMutation.mutate({ id: dept.id, active: dept.isActive })}
                          disabled={toggleMutation.isPending}
                          className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-accent-600 hover:bg-accent-50 dark:hover:bg-accent-900/20 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] disabled:opacity-40"
                        >
                          {dept.isActive
                            ? <ToggleRight className="h-4 w-4 text-success-600" />
                            : <ToggleLeft className="h-4 w-4" />}
                        </button>
                        <button
                          aria-label="Edit department"
                          onClick={() => openEdit(dept)}
                          className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-accent-600 hover:bg-accent-50 dark:hover:bg-accent-900/20 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)]"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          aria-label="Delete department"
                          onClick={() => setDeleteTarget(dept)}
                          className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-danger-600 hover:bg-danger-50 dark:hover:bg-danger-900/20 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)]"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <span className="text-xs text-[var(--text-muted)]">
              Page {page + 1} of {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                aria-label="Previous page"
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="p-1.5 rounded-md border border-[var(--border-main)] disabled:opacity-40 hover:bg-[var(--bg-elevated)] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)]"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                aria-label="Next page"
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="p-1.5 rounded-md border border-[var(--border-main)] disabled:opacity-40 hover:bg-[var(--bg-elevated)] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)]"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Create / Edit Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <div className="w-full max-w-lg skeuo-card p-6 shadow-[var(--shadow-elevated)]">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold skeuo-emboss">
                  {editTarget ? 'Edit Department' : 'New Department'}
                </h2>
                <button
                  aria-label="Close modal"
                  onClick={closeModal}
                  className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                      Code <span className="text-danger-500">*</span>
                    </label>
                    <input {...register('code')} placeholder="ENG" className="input-aura w-full uppercase" />
                    {errors.code && <p className="text-danger-500 text-xs mt-1">{errors.code.message}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                      Name <span className="text-danger-500">*</span>
                    </label>
                    <input {...register('name')} placeholder="Engineering" className="input-aura w-full" />
                    {errors.name && <p className="text-danger-500 text-xs mt-1">{errors.name.message}</p>}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Type</label>
                  <select {...register('type')} className="input-aura w-full">
                    <option value="">Select type…</option>
                    {DEPT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Description</label>
                  <textarea {...register('description')} rows={2} placeholder="Optional description…" className="input-aura w-full resize-none" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Location</label>
                    <input {...register('location')} placeholder="e.g. Chennai" className="input-aura w-full" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Cost Center</label>
                    <input {...register('costCenter')} placeholder="e.g. CC-001" className="input-aura w-full" />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <Button type="button" variant="ghost" onClick={closeModal}>Cancel</Button>
                  <Button type="submit" variant="primary" disabled={isPending}>
                    {isPending ? 'Saving…' : editTarget ? 'Save Changes' : 'Create Department'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation */}
        {deleteTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <div className="w-full max-w-sm skeuo-card p-6 shadow-[var(--shadow-elevated)]">
              <div className="flex items-start gap-3 mb-4">
                <div className="p-2 rounded-lg bg-danger-100 dark:bg-danger-900/30">
                  <Trash2 className="h-5 w-5 text-danger-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-[var(--text-primary)]">Delete Department</h3>
                  <p className="text-sm text-[var(--text-secondary)] mt-1">
                    Delete <strong>{deleteTarget.name}</strong>? This cannot be undone. Departments with active employees cannot be deleted.
                  </p>
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="ghost" onClick={() => setDeleteTarget(null)}>Cancel</Button>
                <Button
                  variant="danger"
                  disabled={deleteMutation.isPending}
                  onClick={() => deleteMutation.mutate(deleteTarget.id)}
                >
                  {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </PermissionGate>
    </AdminPageContent>
  );
}
