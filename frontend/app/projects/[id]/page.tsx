'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
import { hrmsProjectService } from '@/lib/services/hrms-project.service';
import { hrmsProjectAllocationService } from '@/lib/services/hrms-project-allocation.service';
import { HrmsProject, ProjectStatus, ProjectType } from '@/lib/types/hrms-project';
import { ProjectAllocation } from '@/lib/types/hrms-allocation';
import { apiClient } from '@/lib/api/client';

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
        <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-lg border border-surface-200 bg-white shadow-lg dark:border-surface-700 dark:bg-surface-800">
          {loading && (
            <div className="px-4 py-3 text-sm text-surface-500">Searching employees...</div>
          )}
          {!loading && results.length === 0 && (
            <div className="px-4 py-3 text-sm text-surface-500">No employees found</div>
          )}
          {!loading && results.length > 0 && (
            <ul className="max-h-64 overflow-y-auto">
              {results.map((employee) => (
                <li key={employee.id}>
                  <button
                    type="button"
                    className="flex w-full flex-col gap-0.5 px-4 py-3 text-left text-sm text-surface-700 hover:bg-surface-100 dark:text-surface-200 dark:hover:bg-surface-700"
                    onClick={() => handleSelect(employee)}
                  >
                    <span className="font-medium text-surface-900 dark:text-surface-50">
                      {buildEmployeeName(employee)}
                    </span>
                    {employee.employeeCode && (
                      <span className="text-xs text-surface-500 dark:text-surface-400">
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

  const [project, setProject] = useState<HrmsProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [allocations, setAllocations] = useState<ProjectAllocation[]>([]);
  const [allocationsLoading, setAllocationsLoading] = useState(true);
  const [allocationsError, setAllocationsError] = useState<string | null>(null);
  const [allocationsPage, setAllocationsPage] = useState(0);
  const [allocationsSize, setAllocationsSize] = useState(20);
  const [allocationsTotal, setAllocationsTotal] = useState(0);
  const [allocationsTotalPages, setAllocationsTotalPages] = useState(0);
  const [exportingRoster, setExportingRoster] = useState(false);

  const [actionLoading, setActionLoading] = useState(false);
  const [showActivateDialog, setShowActivateDialog] = useState(false);
  const [showCloseDialog, setShowCloseDialog] = useState(false);

  // Add Member modal state
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [addMemberSaving, setAddMemberSaving] = useState(false);
  const [addMemberError, setAddMemberError] = useState<string | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeSummary | null>(null);
  const [addMemberForm, setAddMemberForm] = useState({
    role: 'MEMBER',
    allocationPercentage: '',
    startDate: '',
    endDate: '',
  });

  // End Allocation dialog state
  const [endAllocationTarget, setEndAllocationTarget] = useState<ProjectAllocation | null>(null);
  const [endAllocationLoading, setEndAllocationLoading] = useState(false);

  const fetchProject = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await hrmsProjectService.getProject(projectId);
      setProject(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load project';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const fetchAllocations = useCallback(async () => {
    setAllocationsLoading(true);
    setAllocationsError(null);
    try {
      const response = await hrmsProjectAllocationService.listProjectAllocations(
        projectId,
        allocationsPage,
        allocationsSize
      );
      setAllocations(response.content ?? []);
      setAllocationsTotal(response.totalElements ?? 0);
      setAllocationsTotalPages(response.totalPages ?? 0);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load roster';
      setAllocationsError(message);
      setAllocations([]);
      setAllocationsTotal(0);
      setAllocationsTotalPages(0);
    } finally {
      setAllocationsLoading(false);
    }
  }, [allocationsPage, allocationsSize, projectId]);

  useEffect(() => {
    fetchProject();
  }, [fetchProject]);

  useEffect(() => {
    fetchAllocations();
  }, [fetchAllocations]);

  const handleExportRoster = async () => {
    setExportingRoster(true);
    try {
      const blob = await hrmsProjectAllocationService.exportProjectAllocations(projectId);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'project_roster.csv';
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to export roster';
      setAllocationsError(message);
    } finally {
      setExportingRoster(false);
    }
  };

  const handleActivate = async () => {
    setActionLoading(true);
    try {
      await hrmsProjectService.activateProject(projectId);
      setShowActivateDialog(false);
      fetchProject();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to activate project';
      setError(message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleClose = async () => {
    setActionLoading(true);
    try {
      await hrmsProjectService.closeProject(projectId);
      setShowCloseDialog(false);
      fetchProject();
      fetchAllocations();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to close project';
      setError(message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenAddMember = () => {
    setSelectedEmployee(null);
    setAddMemberForm({
      role: 'MEMBER',
      allocationPercentage: '',
      startDate: '',
      endDate: '',
    });
    setAddMemberError(null);
    setShowAddMemberModal(true);
  };

  const handleAddMemberSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setAddMemberError(null);

    if (!selectedEmployee) {
      setAddMemberError('Please select an employee.');
      return;
    }
    const allocationPct = Number(addMemberForm.allocationPercentage);
    if (!addMemberForm.allocationPercentage || Number.isNaN(allocationPct) || allocationPct < 1 || allocationPct > 100) {
      setAddMemberError('Allocation % must be between 1 and 100.');
      return;
    }
    if (!addMemberForm.startDate) {
      setAddMemberError('Start date is required.');
      return;
    }

    setAddMemberSaving(true);
    try {
      await hrmsProjectAllocationService.assignEmployee(projectId, {
        employeeId: selectedEmployee.id,
        role: addMemberForm.role,
        allocationPercentage: allocationPct,
        startDate: addMemberForm.startDate,
        endDate: addMemberForm.endDate || undefined,
      });
      setShowAddMemberModal(false);
      fetchAllocations();
    } catch (err) {
      const response = (err as { response?: { data?: { message?: string } } })?.response?.data;
      setAddMemberError(response?.message || (err instanceof Error ? err.message : 'Failed to allocate member.'));
    } finally {
      setAddMemberSaving(false);
    }
  };

  const handleEndAllocation = async () => {
    if (!endAllocationTarget) return;
    setEndAllocationLoading(true);
    try {
      await hrmsProjectAllocationService.endAllocation(projectId, endAllocationTarget.id);
      setEndAllocationTarget(null);
      fetchAllocations();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to end allocation';
      setAllocationsError(message);
      setEndAllocationTarget(null);
    } finally {
      setEndAllocationLoading(false);
    }
  };

  const today = new Date().toISOString().split('T')[0];

  const isActiveAllocation = (allocation: ProjectAllocation) => {
    if (!allocation.endDate) return true;
    return allocation.endDate >= today;
  };

  const rosterColumns = useMemo(() => [
    {
      key: 'employee',
      header: 'Employee',
      accessor: (allocation: ProjectAllocation) => (
        <div className="space-y-1">
          <div className="font-medium text-surface-900 dark:text-surface-100">
            {allocation.employeeName || allocation.employeeCode || '—'}
          </div>
          <div className="text-xs text-surface-500 dark:text-surface-400">
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
        <span className="text-sm text-surface-700 dark:text-surface-300">
          {formatPercent(allocation.allocationPercent)}
        </span>
      ),
      mobilePriority: 'secondary' as const,
    },
    {
      key: 'start',
      header: 'Start Date',
      accessor: (allocation: ProjectAllocation) => (
        <span className="text-sm text-surface-700 dark:text-surface-300">
          {formatDate(allocation.startDate)}
        </span>
      ),
      mobilePriority: 'secondary' as const,
    },
    {
      key: 'end',
      header: 'End Date',
      accessor: (allocation: ProjectAllocation) => (
        <span className="text-sm text-surface-700 dark:text-surface-300">
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
          <span className="ml-2 text-sm text-surface-500">Loading project...</span>
        </div>
      </AppLayout>
    );
  }

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
                <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-50">
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
              <p className="text-sm text-surface-500 dark:text-surface-400">
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

        {error && (
          <Card className="border-danger-200 bg-danger-50 dark:border-danger-800 dark:bg-danger-950/20">
            <CardContent className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-danger-500" />
              <p className="text-sm text-danger-700 dark:text-danger-300">{error}</p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-xs text-surface-500">Project Manager</p>
              <p className="text-sm font-medium text-surface-900 dark:text-surface-100">
                {project?.projectManagerName || '—'}
              </p>
            </div>
            <div>
              <p className="text-xs text-surface-500">Start date</p>
              <p className="text-sm font-medium text-surface-900 dark:text-surface-100">
                {formatDate(project?.startDate)}
              </p>
            </div>
            <div>
              <p className="text-xs text-surface-500">Expected end date</p>
              <p className="text-sm font-medium text-surface-900 dark:text-surface-100">
                {formatDate(project?.expectedEndDate)}
              </p>
            </div>
            <div>
              <p className="text-xs text-surface-500">Client</p>
              <p className="text-sm font-medium text-surface-900 dark:text-surface-100">
                {project?.clientName || '—'}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-surface-900 dark:text-surface-50">Project Roster</h2>
                <p className="text-sm text-surface-500">Allocated employees and their allocation percent.</p>
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

            {allocationsError && (
              <div className="rounded-lg border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-700">
                {allocationsError}
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
        <form onSubmit={handleAddMemberSubmit}>
          <ModalBody className="space-y-4">
            {addMemberError && (
              <div className="rounded-lg border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-700">
                {addMemberError}
              </div>
            )}

            <EmployeeTypeahead
              label="Employee"
              value={selectedEmployee}
              onChange={setSelectedEmployee}
              placeholder="Search employee by name or code..."
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <Select
                label="Role"
                value={addMemberForm.role}
                onChange={(event) => setAddMemberForm((prev) => ({ ...prev, role: event.target.value }))}
                required
              >
                {ALLOCATION_ROLES.map((role) => (
                  <option key={role} value={role}>
                    {role.replace(/_/g, ' ')}
                  </option>
                ))}
              </Select>

              <Input
                label="Allocation %"
                type="number"
                min={1}
                max={100}
                value={addMemberForm.allocationPercentage}
                onChange={(event) => setAddMemberForm((prev) => ({ ...prev, allocationPercentage: event.target.value }))}
                placeholder="e.g. 100"
                required
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Start Date"
                type="date"
                value={addMemberForm.startDate}
                onChange={(event) => setAddMemberForm((prev) => ({ ...prev, startDate: event.target.value }))}
                required
              />
              <Input
                label="End Date (optional)"
                type="date"
                value={addMemberForm.endDate}
                onChange={(event) => setAddMemberForm((prev) => ({ ...prev, endDate: event.target.value }))}
              />
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
