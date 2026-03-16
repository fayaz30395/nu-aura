'use client';

import React, { useMemo, useRef, useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Download, Loader2, Plus, Search, X, XCircle } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import {
  Badge,
  Button,
  Card,
  CardContent,
  ConfirmDialog,
  Input,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ResponsiveTable,
  Select,
  TablePagination,
} from '@/components/ui';
import { HrmsProject, ProjectStatus, ProjectType } from '@/lib/types/hrms-project';
import { ProjectAllocation } from '@/lib/types/hrms-allocation';
import { apiClient } from '@/lib/api/client';
import {
  useHrmsProject,
  useActivateHrmsProject,
  useCloseHrmsProject,
  useProjectAllocations,
  useAssignToProject,
  useEndAllocation,
  useExportAllocations,
} from '@/lib/hooks/queries/useProjects';

interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

interface EmployeeSummary {
  id: string;
  employeeCode?: string | null;
  firstName: string;
  lastName?: string | null;
}

const STATUS_BADGE: Record<ProjectStatus, { label: string; variant: 'success' | 'warning' | 'secondary' | 'danger' | 'primary' }> = {
  DRAFT: { label: 'Draft', variant: 'secondary' },
  PLANNED: { label: 'Planned', variant: 'secondary' },
  IN_PROGRESS: { label: 'In Progress', variant: 'primary' },
  ON_HOLD: { label: 'On Hold', variant: 'warning' },
  COMPLETED: { label: 'Completed', variant: 'success' },
  CANCELLED: { label: 'Cancelled', variant: 'danger' },
};

const TYPE_BADGE: Record<ProjectType, { label: string; variant: 'primary' | 'outline' }> = {
  CLIENT: { label: 'Client', variant: 'primary' },
  INTERNAL: { label: 'Internal', variant: 'outline' },
};

const ALLOCATION_ROLES = [
  'MEMBER',
  'DEVELOPER',
  'SENIOR_DEVELOPER',
  'TEAM_LEAD',
  'QA_ENGINEER',
  'DESIGNER',
  'BUSINESS_ANALYST',
  'ARCHITECT',
  'CONSULTANT',
  'PROJECT_MANAGER',
] as const;

const getStatusBadge = (status?: ProjectStatus | null) => {
  if (status && STATUS_BADGE[status]) {
    return STATUS_BADGE[status];
  }
  return { label: status ?? 'Unknown', variant: 'secondary' as const };
};

const getTypeBadge = (type?: ProjectType | null) => {
  if (type && TYPE_BADGE[type]) {
    return TYPE_BADGE[type];
  }
  return { label: type ?? 'Unknown', variant: 'outline' as const };
};

const formatDate = (value?: string | null) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatPercent = (value?: number | null) => {
  if (value === null || value === undefined) return '—';
  const numeric = Number(value);
  if (Number.isNaN(numeric)) return '—';
  return `${numeric.toFixed(0)}%`;
};

const buildEmployeeName = (employee?: EmployeeSummary | null) => {
  if (!employee) return '—';
  const last = employee.lastName?.trim();
  if (!last) return employee.firstName;
  return `${employee.firstName} ${last}`;
};

// Zod schema for add member form
const addMemberFormSchema = z.object({
  role: z.string().min(1, 'Role is required'),
  allocationPercentage: z
    .union([z.string(), z.number()])
    .transform((v) => typeof v === 'string' ? Number(v) : v)
    .refine((n) => !Number.isNaN(n) && n >= 1 && n <= 100, 'Allocation % must be between 1 and 100'),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().optional().or(z.literal('')),
});

type AddMemberFormData = z.infer<typeof addMemberFormSchema>;

interface EmployeeTypeaheadProps {
  label: string;
  value: EmployeeSummary | null;
  onChange: (value: EmployeeSummary | null) => void;
  placeholder?: string;
  disabled?: boolean;
}

function EmployeeTypeahead({ label, value, onChange, placeholder, disabled }: EmployeeTypeaheadProps) {
  const [query, setQuery] = useState(value ? buildEmployeeName(value) : '');
  const [results, setResults] = useState<EmployeeSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(value ? buildEmployeeName(value) : '');
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }
    const term = query.trim();
    if (term.length < 2) {
      setResults([]);
      return;
    }
    const handle = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await apiClient.get<PageResponse<EmployeeSummary>>('/employees', {
          params: { search: term, page: 0, size: 10 },
        });
        setResults(response.data.content ?? []);
      } catch (err) {
        console.error('Employee search failed', err);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(handle);
  }, [query, open]);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (value) {
      onChange(null);
    }
    setQuery(event.target.value);
    setOpen(true);
  };

  const handleSelect = (employee: EmployeeSummary) => {
    onChange(employee);
    setOpen(false);
    setResults([]);
  };

  const handleClear = () => {
    onChange(null);
    setQuery('');
    setResults([]);
    setOpen(false);
  };

  const showClear = Boolean(value) || query.length > 0;

  return (
    <div className="relative" ref={containerRef}>
      <Input
        label={label}
        placeholder={placeholder}
        value={query}
        onChange={handleInputChange}
        onFocus={() => setOpen(true)}
        icon={<Search className="h-4 w-4" />}
        rightIcon={loading ? <Loader2 className="h-4 w-4 animate-spin" /> : showClear ? <X className="h-4 w-4" /> : undefined}
        onRightIconClick={showClear ? handleClear : undefined}
        disabled={disabled}
      />
      {open && query.trim().length >= 2 && (
        <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-lg border border-[var(--border-main)] bg-white shadow-lg dark:border-[var(--border-main)] dark:bg-[var(--bg-secondary)]">
          {loading && (
            <div className="px-4 py-3 text-sm text-[var(--text-muted)]">Searching employees...</div>
          )}
          {!loading && results.length === 0 && (
            <div className="px-4 py-3 text-sm text-[var(--text-muted)]">No employees found</div>
          )}
          {!loading && results.length > 0 && (
            <ul className="max-h-64 overflow-y-auto">
              {results.map((employee) => (
                <li key={employee.id}>
                  <button
                    type="button"
                    className="flex w-full flex-col gap-0.5 px-4 py-3 text-left text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)]"
                    onClick={() => handleSelect(employee)}
                  >
                    <span className="font-medium text-[var(--text-primary)]">
                      {buildEmployeeName(employee)}
                    </span>
                    {employee.employeeCode && (
                      <span className="text-xs text-[var(--text-muted)]">
                        {employee.employeeCode}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [allocationsPage, setAllocationsPage] = useState(0);
  const [allocationsSize, setAllocationsSize] = useState(20);
  const [showActivateDialog, setShowActivateDialog] = useState(false);
  const [showCloseDialog, setShowCloseDialog] = useState(false);

  // Add Member modal state
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeSummary | null>(null);
  const [addMemberError, setAddMemberError] = useState<string | null>(null);

  // React Hook Form setup for add member
  const {
    register: registerAddMember,
    handleSubmit: handleSubmitAddMember,
    reset: resetAddMember,
    formState: { errors: addMemberErrors },
  } = useForm<AddMemberFormData>({
    resolver: zodResolver(addMemberFormSchema),
    defaultValues: {
      role: 'MEMBER',
      allocationPercentage: 100,
      startDate: '',
      endDate: '',
    },
  });

  // End Allocation dialog state
  const [endAllocationTarget, setEndAllocationTarget] = useState<ProjectAllocation | null>(null);

  // Queries
  const { data: project, isLoading, error, refetch: refetchProject } = useHrmsProject(projectId, !!projectId);
  const {
    data: allocationsData,
    isLoading: allocationsLoading,
    error: allocationsError,
    refetch: refetchAllocations,
  } = useProjectAllocations(projectId, allocationsPage, allocationsSize, !!projectId);

  // Mutations
  const activateMutation = useActivateHrmsProject();
  const closeMutation = useCloseHrmsProject();
  const assignMutation = useAssignToProject();
  const endAllocationMutation = useEndAllocation();
  const exportMutation = useExportAllocations();

  const allocations = allocationsData?.content ?? [];
  const allocationsTotal = allocationsData?.totalElements ?? 0;
  const allocationsTotalPages = allocationsData?.totalPages ?? 0;
  const loading = isLoading;
  const exportingRoster = exportMutation.isPending;
  const addMemberSaving = assignMutation.isPending;
  const endAllocationLoading = endAllocationMutation.isPending;
  const actionLoading = activateMutation.isPending || closeMutation.isPending;

  const handleExportRoster = async () => {
    try {
      const result = await exportMutation.mutateAsync(projectId);
      if (result instanceof Blob) {
        const url = URL.createObjectURL(result);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'project_roster.csv';
        link.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      // Error handled by mutation
    }
  };

  const handleActivate = async () => {
    try {
      await activateMutation.mutateAsync(projectId);
      setShowActivateDialog(false);
      await refetchProject();
    } catch (err) {
      // Error handled by mutation
    }
  };

  const handleClose = async () => {
    try {
      await closeMutation.mutateAsync({ id: projectId });
      setShowCloseDialog(false);
      await refetchProject();
      await refetchAllocations();
    } catch (err) {
      // Error handled by mutation
    }
  };

  const handleOpenAddMember = () => {
    setSelectedEmployee(null);
    setAddMemberError(null);
    resetAddMember();
    setShowAddMemberModal(true);
  };

  const handleAddMemberSubmit = async (data: AddMemberFormData) => {
    if (!selectedEmployee) {
      setAddMemberError('Please select an employee before allocating');
      return;
    }

    try {
      await assignMutation.mutateAsync({
        projectId,
        data: {
          employeeId: selectedEmployee.id,
          role: data.role,
          allocationPercentage: data.allocationPercentage,
          startDate: data.startDate,
          endDate: data.endDate || undefined,
        },
      });
      setShowAddMemberModal(false);
      await refetchAllocations();
    } catch (err) {
      // Error handled by mutation
    }
  };

  const handleEndAllocation = async () => {
    if (!endAllocationTarget) return;
    try {
      await endAllocationMutation.mutateAsync({
        projectId,
        allocationId: endAllocationTarget.id,
      });
      setEndAllocationTarget(null);
      await refetchAllocations();
    } catch (err) {
      // Error handled by mutation
      setEndAllocationTarget(null);
    }
  };

  const today = new Date().toISOString().split('T')[0];

  const isActiveAllocation = (allocation: ProjectAllocation) => {
    if (!allocation.endDate) return true;
    return new Date(allocation.endDate) >= new Date(today);
  };

  const rosterColumns = useMemo(() => [
    {
      key: 'employee',
      header: 'Employee',
      accessor: (allocation: ProjectAllocation) => (
        <div className="space-y-1">
          <div className="font-medium text-[var(--text-primary)]">
            {allocation.employeeName || allocation.employeeCode || '—'}
          </div>
          <div className="text-xs text-[var(--text-muted)]">
            {allocation.employeeCode || '—'}
          </div>
        </div>
      ),
      mobilePriority: 'primary' as const,
    },
    {
      key: 'allocation',
      header: 'Allocation',
      accessor: (allocation: ProjectAllocation) => (
        <span className="text-sm text-[var(--text-secondary)]">
          {formatPercent(allocation.allocationPercent)}
        </span>
      ),
      mobilePriority: 'secondary' as const,
    },
    {
      key: 'start',
      header: 'Start Date',
      accessor: (allocation: ProjectAllocation) => (
        <span className="text-sm text-[var(--text-secondary)]">
          {formatDate(allocation.startDate)}
        </span>
      ),
      mobilePriority: 'secondary' as const,
    },
    {
      key: 'end',
      header: 'End Date',
      accessor: (allocation: ProjectAllocation) => (
        <span className="text-sm text-[var(--text-secondary)]">
          {formatDate(allocation.endDate)}
        </span>
      ),
      mobilePriority: 'secondary' as const,
    },
    {
      key: 'actions',
      header: '',
      accessor: (allocation: ProjectAllocation) => {
        if (!isActiveAllocation(allocation)) return null;
        return (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEndAllocationTarget(allocation)}
          >
            End
          </Button>
        );
      },
      mobilePriority: 'secondary' as const,
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [today]);

  if (loading && !project) {
    return (
      <AppLayout breadcrumbs={[{ label: 'Projects', href: '/projects' }, { label: 'Project' }]}>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-primary-500" />
          <span className="ml-2 text-sm text-[var(--text-muted)]">Loading project...</span>
        </div>
      </AppLayout>
    );
  }

  const projectError = error ? (error instanceof Error ? error.message : String(error)) : null;
  const allocationsErrorMessage = allocationsError ? (allocationsError instanceof Error ? allocationsError.message : String(allocationsError)) : null;

  return (
    <AppLayout breadcrumbs={[{ label: 'Projects', href: '/projects' }, { label: project?.name || 'Project' }]}>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <Button variant="outline" size="sm" onClick={() => router.back()} leftIcon={<ArrowLeft className="h-4 w-4" />}>
              Back
            </Button>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold text-[var(--text-primary)]">
                  {project?.name || 'Project'}
                </h1>
                {project && (() => {
                  const statusBadge = getStatusBadge(project.status);
                  const typeBadge = getTypeBadge(project.type);
                  return (
                    <>
                      <Badge variant={statusBadge.variant} size="sm">
                        {statusBadge.label}
                      </Badge>
                      <Badge variant={typeBadge.variant} size="sm">
                        {typeBadge.label}
                      </Badge>
                    </>
                  );
                })()}
              </div>
              <p className="text-sm text-[var(--text-muted)]">
                {project?.projectCode || '—'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {project?.status === 'PLANNED' && (
              <Button onClick={() => setShowActivateDialog(true)}>
                Start Project
              </Button>
            )}
            {project?.status === 'IN_PROGRESS' && (
              <Button variant="outline" onClick={() => setShowCloseDialog(true)}>
                Complete Project
              </Button>
            )}
          </div>
        </div>

        {projectError && (
          <Card className="border-danger-200 bg-danger-50 dark:border-danger-800 dark:bg-danger-950/20">
            <CardContent className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-danger-500" />
              <p className="text-sm text-danger-700 dark:text-danger-300">{projectError}</p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-xs text-[var(--text-muted)]">Project Manager</p>
              <p className="text-sm font-medium text-[var(--text-primary)]">
                {project?.projectManagerName || '—'}
              </p>
            </div>
            <div>
              <p className="text-xs text-[var(--text-muted)]">Start date</p>
              <p className="text-sm font-medium text-[var(--text-primary)]">
                {formatDate(project?.startDate)}
              </p>
            </div>
            <div>
              <p className="text-xs text-[var(--text-muted)]">Expected end date</p>
              <p className="text-sm font-medium text-[var(--text-primary)]">
                {formatDate(project?.expectedEndDate)}
              </p>
            </div>
            <div>
              <p className="text-xs text-[var(--text-muted)]">Client</p>
              <p className="text-sm font-medium text-[var(--text-primary)]">
                {project?.clientName || '—'}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">Project Roster</h2>
                <p className="text-sm text-[var(--text-muted)]">Allocated employees and their allocation percent.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  leftIcon={<Plus className="h-4 w-4" />}
                  onClick={handleOpenAddMember}
                >
                  Add Member
                </Button>
                <Button
                  variant="outline"
                  leftIcon={<Download className="h-4 w-4" />}
                  isLoading={exportingRoster}
                  onClick={handleExportRoster}
                >
                  Export roster
                </Button>
              </div>
            </div>

            {allocationsErrorMessage && (
              <div className="rounded-lg border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-700">
                {allocationsErrorMessage}
              </div>
            )}

            <ResponsiveTable
              columns={rosterColumns}
              data={allocations}
              keyExtractor={(row) => row.id}
              isLoading={allocationsLoading}
              emptyMessage="No allocations found for this project."
            />

            {allocationsTotal > 0 && (
              <TablePagination
                currentPage={allocationsPage}
                totalPages={allocationsTotalPages}
                totalItems={allocationsTotal}
                pageSize={allocationsSize}
                onPageChange={setAllocationsPage}
                onPageSizeChange={(size) => {
                  setAllocationsSize(size);
                  setAllocationsPage(0);
                }}
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add Member Modal */}
      <Modal isOpen={showAddMemberModal} onClose={() => setShowAddMemberModal(false)} size="lg">
        <ModalHeader onClose={() => setShowAddMemberModal(false)}>
          Add Member
        </ModalHeader>
        <form onSubmit={handleSubmitAddMember(handleAddMemberSubmit)}>
          <ModalBody className="space-y-4">
            {addMemberError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
                {addMemberError}
              </div>
            )}

            {!selectedEmployee && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                Please select an employee
              </div>
            )}

            <EmployeeTypeahead
              label="Employee"
              value={selectedEmployee}
              onChange={setSelectedEmployee}
              placeholder="Search employee by name or code..."
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Select label="Role" {...registerAddMember('role')}>
                  {ALLOCATION_ROLES.map((role) => (
                    <option key={role} value={role}>
                      {role.replace(/_/g, ' ')}
                    </option>
                  ))}
                </Select>
                {addMemberErrors.role && <p className="text-red-500 text-sm mt-1">{addMemberErrors.role.message}</p>}
              </div>

              <div>
                <Input
                  label="Allocation %"
                  type="number"
                  min={1}
                  max={100}
                  placeholder="e.g. 100"
                  {...registerAddMember('allocationPercentage')}
                />
                {addMemberErrors.allocationPercentage && <p className="text-red-500 text-sm mt-1">{addMemberErrors.allocationPercentage.message}</p>}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Input label="Start Date" type="date" {...registerAddMember('startDate')} />
                {addMemberErrors.startDate && <p className="text-red-500 text-sm mt-1">{addMemberErrors.startDate.message}</p>}
              </div>
              <div>
                <Input label="End Date (optional)" type="date" {...registerAddMember('endDate')} />
                {addMemberErrors.endDate && <p className="text-red-500 text-sm mt-1">{addMemberErrors.endDate.message}</p>}
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button type="button" variant="outline" onClick={() => setShowAddMemberModal(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={addMemberSaving}>
              Allocate Member
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* End Allocation Confirm Dialog */}
      <ConfirmDialog
        isOpen={Boolean(endAllocationTarget)}
        onClose={() => setEndAllocationTarget(null)}
        onConfirm={handleEndAllocation}
        title="End Allocation"
        message={`End the allocation for ${endAllocationTarget?.employeeName || endAllocationTarget?.employeeCode || 'this employee'}? This cannot be undone.`}
        confirmText="End Allocation"
        type="warning"
        loading={endAllocationLoading}
      />

      <ConfirmDialog
        isOpen={showActivateDialog}
        onClose={() => setShowActivateDialog(false)}
        onConfirm={handleActivate}
        title="Activate project"
        message="This will mark the project as active and allow allocations. Continue?"
        confirmText="Activate"
        type="info"
        loading={actionLoading}
      />

      <ConfirmDialog
        isOpen={showCloseDialog}
        onClose={() => setShowCloseDialog(false)}
        onConfirm={handleClose}
        title="Close project"
        message="Closing the project will end active allocations on today's date. Continue?"
        confirmText="Close project"
        type="warning"
        loading={actionLoading}
      />
    </AppLayout>
  );
}
