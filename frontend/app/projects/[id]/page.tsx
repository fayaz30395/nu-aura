'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Download, Loader2, XCircle } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import {
  Badge,
  Button,
  Card,
  CardContent,
  ConfirmDialog,
  ResponsiveTable,
  TablePagination,
} from '@/components/ui';
import { hrmsProjectService } from '@/lib/services/hrms-project.service';
import { hrmsProjectAllocationService } from '@/lib/services/hrms-project-allocation.service';
import { HrmsProject, ProjectStatus, ProjectType } from '@/lib/types/hrms-project';
import { ProjectAllocation } from '@/lib/types/hrms-allocation';

const STATUS_BADGE: Record<ProjectStatus, { label: string; variant: 'success' | 'warning' | 'secondary' | 'danger' | 'primary' }> = {
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
  ], []);

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
              <Button
                variant="outline"
                leftIcon={<Download className="h-4 w-4" />}
                isLoading={exportingRoster}
                onClick={handleExportRoster}
              >
                Export roster
              </Button>
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
