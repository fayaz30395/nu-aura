'use client';

import {useEffect, useState} from 'react';
import {useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';
import {useMutation, useQueryClient} from '@tanstack/react-query';
import {Drawer} from '@mantine/core';
import {
  AlertCircle,
  Building2,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Plus,
  Search,
  ToggleLeft,
  ToggleRight,
  Trash2,
} from 'lucide-react';
import {AdminPageContent} from '@/components/layout';
import {PageTransition, Reveal} from '@/components/motion';
import {Button} from '@/components/ui/Button';
import {EmptyState} from '@/components/ui/EmptyState';
import {Input} from '@/components/ui/Input';
import {Modal, ModalBody, ModalFooter, ModalHeader} from '@/components/ui/Modal';
import {Select} from '@/components/ui/Select';
import {Textarea} from '@/components/ui/Textarea';
import {useToast} from '@/components/notifications/ToastProvider';
import {PermissionGate} from '@/components/auth/PermissionGate';
import {Permissions, usePermissions} from '@/lib/hooks/usePermissions';
import {departmentKeys, useAllDepartments} from '@/lib/hooks/queries/useDepartments';
import {departmentService} from '@/lib/services/hrms/department.service';
import {Department, DepartmentRequest, DepartmentType} from '@/lib/types/hrms/employee';

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
  const {isReady: permReady} = usePermissions();

  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Department | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Department | null>(null);

  const {data, isLoading, isError} = useAllDepartments(page, PAGE_SIZE);
  const departments = data?.content ?? [];
  const totalPages = data?.totalPages ?? 0;

  const filtered = search.trim()
    ? departments.filter(d =>
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.code.toLowerCase().includes(search.toLowerCase())
    )
    : departments;

  const {register, handleSubmit, reset, formState: {errors}} = useForm<DeptFormData>({
    resolver: zodResolver(deptSchema),
  });

  const invalidate = () => queryClient.invalidateQueries({queryKey: departmentKeys.all});

  const createMutation = useMutation({
    mutationFn: (data: DepartmentRequest) => departmentService.createDepartment(data),
    onSuccess: () => {
      toast.success('Department created');
      invalidate();
      closeDrawer();
    },
    onError: (err: unknown) => toast.error((err as {
      response?: { data?: { message?: string } }
    })?.response?.data?.message ?? 'Create failed'),
  });

  const updateMutation = useMutation({
    mutationFn: ({id, data}: { id: string; data: DepartmentRequest }) => departmentService.updateDepartment(id, data),
    onSuccess: () => {
      toast.success('Department updated');
      invalidate();
      closeDrawer();
    },
    onError: (err: unknown) => toast.error((err as {
      response?: { data?: { message?: string } }
    })?.response?.data?.message ?? 'Update failed'),
  });

  const toggleMutation = useMutation({
    mutationFn: ({id, active}: { id: string; active: boolean }) =>
      active ? departmentService.deactivateDepartment(id) : departmentService.activateDepartment(id),
    onSuccess: (_, vars) => {
      toast.success(vars.active ? 'Department deactivated' : 'Department activated');
      invalidate();
    },
    onError: (err: unknown) => toast.error((err as {
      response?: { data?: { message?: string } }
    })?.response?.data?.message ?? 'Toggle failed'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => departmentService.deleteDepartment(id),
    onSuccess: () => {
      toast.success('Department deleted');
      invalidate();
      setDeleteTarget(null);
    },
    onError: (err: unknown) => toast.error((err as {
      response?: { data?: { message?: string } }
    })?.response?.data?.message ?? 'Delete failed'),
  });

  const openCreate = () => {
    setEditTarget(null);
    reset({code: '', name: '', description: '', location: '', costCenter: ''});
    setDrawerOpen(true);
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
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setEditTarget(null);
  };

  // Escape closes delete-confirm modal (drawer handles its own escape)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' && deleteTarget) {
        return;
      }
      if (e.key === 'Escape' && deleteTarget) {
        setDeleteTarget(null);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [deleteTarget]);

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
      updateMutation.mutate({id: editTarget.id, data: payload});
    } else {
      createMutation.mutate(payload);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  if (!permReady) {
    return (
      <AdminPageContent className="page-shell">
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="card-aura p-4 animate-pulse">
              <div className="h-4 bg-[var(--skeleton-base)] rounded w-1/4 mb-2"/>
              <div className="h-3 bg-[var(--skeleton-base)] rounded w-1/2"/>
            </div>
          ))}
        </div>
      </AdminPageContent>
    );
  }

  return (
    <AdminPageContent className="page-shell">
      <PermissionGate
        anyOf={[Permissions.EMPLOYEE_READ, Permissions.EMPLOYEE_VIEW_ALL, Permissions.DEPARTMENT_MANAGE]}
        fallback={<p className="text-danger-600 p-6">You do not have permission to view departments.</p>}
      >
        <PageTransition>
        {/* Header */}
        <Reveal className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold">Department management</h1>
            <p className="text-sm text-[var(--text-secondary)] mt-0.5">
              {data?.totalElements ?? 0} departments
            </p>
          </div>
          <Button variant="primary" onClick={openCreate} className="flex items-center gap-2">
            <Plus className="h-4 w-4"/>
            New department
          </Button>
        </Reveal>

        {/* Search */}
        <div className="mb-4 max-w-sm">
          <Input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or code"
            icon={<Search className="h-4 w-4"/>}
            aria-label="Search departments"
          />
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="card-aura p-4 animate-pulse flex gap-4">
                <div className="h-4 bg-[var(--skeleton-base)] rounded w-16"/>
                <div className="h-4 bg-[var(--skeleton-base)] rounded w-40"/>
                <div className="h-4 bg-[var(--skeleton-base)] rounded w-24 ml-auto"/>
              </div>
            ))}
          </div>
        ) : isError ? (
          <div className="card-aura flex items-center gap-2 p-6 text-danger-600">
            <AlertCircle className="h-5 w-5 flex-shrink-0"/>
            <span className="text-sm">Failed to load departments. Please try again.</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="card-aura">
            <EmptyState
              icon={<Building2 className="w-full h-full"/>}
              title={search ? 'No departments match your search' : 'No departments yet'}
              description={search ? 'Try a different search term.' : 'Create your first department to organize teams.'}
              actionLabel={!search ? 'Create department' : undefined}
              onAction={!search ? openCreate : undefined}
            />
          </div>
        ) : (
          <Reveal className="card-aura overflow-hidden">
            <table className="table-aura w-full text-sm">
              <thead>
              <tr className="border-b border-[var(--border-subtle)]">
                <th
                  className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-[var(--text-3)]">Code
                </th>
                <th
                  className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-[var(--text-3)]">Name
                </th>
                <th
                  className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-[var(--text-3)]">Type
                </th>
                <th
                  className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-[var(--text-3)]">Employees
                </th>
                <th
                  className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-[var(--text-3)]">Status
                </th>
                <th
                  className="text-right px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-[var(--text-3)]">Actions
                </th>
              </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
              {filtered.map(dept => (
                <tr key={dept.id} className="hover:bg-[var(--surface-aura-2)] transition-colors duration-150">
                  <td className="px-4 py-2.5 font-mono text-xs text-[var(--text-1)] tabular-nums">{dept.code}</td>
                  <td className="px-4 py-2.5 font-medium text-[var(--text-1)]">{dept.name}</td>
                  <td className="px-4 py-2.5 text-[var(--text-2)]">
                    {dept.type ? (
                      <span
                        className="px-2 py-0.5 rounded-full bg-accent-100 dark:bg-accent-900/30 text-accent-700 dark:text-accent-300 text-xs font-medium">
                          {dept.type}
                        </span>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-2.5 text-[var(--text-1)] font-mono tabular-nums">{dept.employeeCount ?? 0}</td>
                  <td className="px-4 py-2.5">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        dept.isActive
                          ? 'bg-success-100 dark:bg-success-900/30 text-success-700 dark:text-success-400'
                          : 'bg-[var(--surface-aura-2)] text-[var(--text-3)]'
                      }`}>
                        {dept.isActive ? 'Active' : 'Inactive'}
                      </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        aria-label={dept.isActive ? 'Deactivate department' : 'Activate department'}
                        onClick={() => toggleMutation.mutate({id: dept.id, active: dept.isActive})}
                        disabled={toggleMutation.isPending}
                        className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-accent-600 hover:bg-accent-50 dark:hover:bg-accent-900/20 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] disabled:opacity-40"
                      >
                        {dept.isActive
                          ? <ToggleRight className="h-4 w-4 text-success-600"/>
                          : <ToggleLeft className="h-4 w-4"/>}
                      </button>
                      <button
                        aria-label="Edit department"
                        onClick={() => openEdit(dept)}
                        className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-accent-600 hover:bg-accent-50 dark:hover:bg-accent-900/20 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)]"
                      >
                        <Pencil className="h-4 w-4"/>
                      </button>
                      <button
                        aria-label="Delete department"
                        onClick={() => setDeleteTarget(dept)}
                        className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-danger-600 hover:bg-danger-50 dark:hover:bg-danger-900/20 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)]"
                      >
                        <Trash2 className="h-4 w-4"/>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              </tbody>
            </table>
          </Reveal>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <nav aria-label="Pagination" className="flex items-center justify-between mt-4">
            <span className="text-xs text-[var(--text-3)] font-mono tabular-nums" aria-current="page">
              Page {page + 1} of {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                aria-label="Previous page"
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="p-1.5 rounded-md border border-[var(--border-main)] disabled:opacity-40 hover:bg-[var(--bg-elevated)] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)]"
              >
                <ChevronLeft className="h-4 w-4"/>
              </button>
              <button
                aria-label="Next page"
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="p-1.5 rounded-md border border-[var(--border-main)] disabled:opacity-40 hover:bg-[var(--bg-elevated)] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)]"
              >
                <ChevronRight className="h-4 w-4"/>
              </button>
            </div>
          </nav>
        )}

        {/* Create / Edit Drawer (table context stays visible) */}
        <Drawer
          opened={drawerOpen}
          onClose={closeDrawer}
          position="right"
          size="md"
          title={
            <span className="text-base font-semibold text-[var(--text-primary)]">
              {editTarget ? 'Edit Department' : 'New Department'}
            </span>
          }
          styles={{
            title: {width: '100%'},
            body: {padding: '0 24px 24px'},
          }}
        >
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                id="admin-dept-code"
                label="Code"
                {...register('code')}
                aria-required="true"
                placeholder="ENG"
                error={errors.code?.message}
                className="uppercase"
              />
              <Input
                id="admin-dept-name"
                label="Name"
                {...register('name')}
                aria-required="true"
                placeholder="Engineering"
                error={errors.name?.message}
              />
            </div>

            <Select
              id="admin-dept-type"
              label="Type"
              {...register('type')}
              error={errors.type?.message}
            >
              <option value="">Select type</option>
              {DEPT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </Select>

            <div className="space-y-1.5">
              <label htmlFor="admin-dept-description" className="block text-sm font-medium text-[var(--text-secondary)]">
                Description
              </label>
              <Textarea
                id="admin-dept-description"
                {...register('description')}
                rows={2}
                placeholder="Optional description"
                error={!!errors.description}
                className="resize-none"
              />
              {errors.description && <p className="text-danger-500 text-xs">{errors.description.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                id="admin-dept-location"
                label="Location"
                {...register('location')}
                placeholder="Chennai"
                error={errors.location?.message}
              />
              <Input
                id="admin-dept-cost-center"
                label="Cost center"
                {...register('costCenter')}
                placeholder="CC-001"
                error={errors.costCenter?.message}
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-[var(--border-subtle)]">
              <Button type="button" variant="ghost" onClick={closeDrawer}>Cancel</Button>
              <Button type="submit" variant="primary" disabled={isPending}>
                {isPending ? 'Saving…' : editTarget ? 'Save Changes' : 'Create Department'}
              </Button>
            </div>
          </form>
        </Drawer>

        {/* Delete Confirmation */}
        <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} size="sm">
          <ModalHeader onClose={() => setDeleteTarget(null)}>Delete Department?</ModalHeader>
          <ModalBody>
            <div className="flex items-start gap-2">
              <div className="p-2 rounded-lg bg-danger-100 dark:bg-danger-900/30">
                <Trash2 className="h-5 w-5 text-danger-600"/>
              </div>
              <p className="text-sm text-[var(--text-secondary)] mt-1">
                This action cannot be undone. <strong>{deleteTarget?.name}</strong> will be permanently deleted.
                Departments with active employees cannot be deleted.
              </p>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button
              variant="danger"
              disabled={deleteMutation.isPending}
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            >
              {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
            </Button>
          </ModalFooter>
        </Modal>
        </PageTransition>
      </PermissionGate>
    </AdminPageContent>
  );
}
