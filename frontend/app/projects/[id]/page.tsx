'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { notFound } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Edit2, Loader2, XCircle } from 'lucide-react';
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
  Select,
  Textarea,
} from '@/components/ui';
import {
  ProjectStatus,
  ProjectType,
  ProjectPriority,
  ProjectUpdateRequest,
} from '@/lib/types/hrms-project';
import {
  useHrmsProject,
  useActivateHrmsProject,
  useCloseHrmsProject,
  useUpdateHrmsProject,
} from '@/lib/hooks/queries/useProjects';
import { OverviewTab } from './_tabs/OverviewTab';
import { TeamTab } from './_tabs/TeamTab';
import { TimesheetsTab } from './_tabs/TimesheetsTab';
import { InvoicesTab } from './_tabs/InvoicesTab';

// Edit form schema
const editProjectSchema = z.object({
  name: z.string().min(1, 'Project name is required'),
  status: z.enum(['DRAFT', 'PLANNED', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CANCELLED']),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  startDate: z.string().min(1, 'Start date is required'),
  expectedEndDate: z.string().optional().or(z.literal('')),
  endDate: z.string().optional().or(z.literal('')),
  clientName: z.string().optional().or(z.literal('')),
  description: z.string().optional().or(z.literal('')),
  isBillable: z.boolean().optional().default(false),
  billingType: z.enum(['TIME_AND_MATERIAL', 'FIXED_PRICE', 'RETAINER']).optional(),
  billingRate: z.union([z.string(), z.number()]).optional()
    .transform((v) => v === '' || v === undefined ? undefined : typeof v === 'string' ? Number(v) : v),
});

type EditFormData = z.infer<typeof editProjectSchema>;

type ActiveTab = 'overview' | 'team' | 'timesheets' | 'invoices';

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

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [showActivateDialog, setShowActivateDialog] = useState(false);
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Queries
  const { data: project, isLoading, error, refetch: refetchProject } = useHrmsProject(projectId, !!projectId);

  // Mutations
  const activateMutation = useActivateHrmsProject();
  const closeMutation = useCloseHrmsProject();
  const updateMutation = useUpdateHrmsProject();

  // Edit form
  const {
    register: editRegister,
    handleSubmit: editHandleSubmit,
    reset: editReset,
    watch: editWatch,
    formState: { errors: editErrors, isSubmitting: editIsSubmitting },
  } = useForm<EditFormData>({
    resolver: zodResolver(editProjectSchema),
  });

  const loading = isLoading;
  const actionLoading = activateMutation.isPending || closeMutation.isPending;

  const handleActivate = async () => {
    try {
      await activateMutation.mutateAsync(projectId);
      setShowActivateDialog(false);
      await refetchProject();
    } catch (_err) {
      // Error handled by mutation
    }
  };

  const handleClose = async () => {
    try {
      await closeMutation.mutateAsync({ id: projectId });
      setShowCloseDialog(false);
      await refetchProject();
    } catch (_err) {
      // Error handled by mutation
    }
  };

  const handleOpenEdit = () => {
    if (!project) return;
    editReset({
      name: project.name,
      status: project.status,
      priority: project.priority,
      startDate: project.startDate?.split('T')[0] || '',
      expectedEndDate: project.expectedEndDate?.split('T')[0] || '',
      endDate: project.endDate?.split('T')[0] || '',
      clientName: project.clientName || '',
      description: project.description || '',
      isBillable: project.isBillable ?? false,
      billingType: project.billingType ?? undefined,
      billingRate: project.billingRate ?? undefined,
    });
    setEditError(null);
    setShowEditModal(true);
  };

  const handleEditProject = async (data: EditFormData) => {
    const payload: ProjectUpdateRequest = {
      name: data.name.trim(),
      status: data.status,
      priority: data.priority as ProjectPriority,
      startDate: data.startDate,
      expectedEndDate: data.expectedEndDate || undefined,
      endDate: data.endDate || undefined,
      clientName: data.clientName?.trim() || undefined,
      description: data.description?.trim() || undefined,
      isBillable: data.isBillable ?? false,
      billingType: data.isBillable ? data.billingType : undefined,
      billingRate: data.isBillable && data.billingRate ? Number(data.billingRate) : undefined,
    };

    try {
      await updateMutation.mutateAsync({ id: projectId, data: payload });
      setShowEditModal(false);
      await refetchProject();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update project';
      setEditError(msg);
    }
  };

  if (!loading && !error && !project) {
    notFound();
  }

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

  // Determine which tabs to show
  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'team', label: 'Team' },
    { id: 'timesheets', label: 'Timesheets' },
    ...(project?.isBillable ? [{ id: 'invoices', label: 'Invoices' }] : []),
  ] as Array<{ id: ActiveTab; label: string }>;

  return (
    <AppLayout breadcrumbs={[{ label: 'Projects', href: '/projects' }, { label: project?.name || 'Project' }]}>
      <div className="space-y-6">
        {/* Header Section */}
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
            <Button variant="outline" onClick={handleOpenEdit} leftIcon={<Edit2 className="h-4 w-4" />}>
              Edit
            </Button>
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
          <Card className="border border-danger-200 bg-danger-50 dark:border-danger-800 dark:bg-danger-900/20">
            <CardContent className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-danger-700 dark:text-danger-400" />
              <p className="text-sm text-danger-700 dark:text-danger-400">{projectError}</p>
            </CardContent>
          </Card>
        )}

        {/* Tab Navigation */}
        <div className="flex border-b border-[var(--border-main)]">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div>
          {activeTab === 'overview' && project && <OverviewTab project={project} />}
          {activeTab === 'team' && <TeamTab projectId={projectId} />}
          {activeTab === 'timesheets' && <TimesheetsTab projectId={projectId} />}
          {activeTab === 'invoices' && project?.isBillable && <InvoicesTab projectId={projectId} />}
        </div>
      </div>

      {/* Confirm Dialogs */}
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

      {/* Edit Project Modal */}
      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} size="lg">
        <ModalHeader onClose={() => setShowEditModal(false)}>
          Edit Project
        </ModalHeader>
        <form onSubmit={editHandleSubmit(handleEditProject)}>
          <ModalBody className="space-y-4">
            {editError && (
              <div className="rounded-lg border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-700 dark:border-danger-800 dark:bg-danger-900/20 dark:text-danger-400">
                {editError}
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[var(--text-secondary)]">
                  Project code
                </label>
                <div className="rounded-lg border border-[var(--border-main)] bg-[var(--bg-secondary)] px-4 py-2.5 text-sm text-[var(--text-secondary)]">
                  {project?.projectCode}
                </div>
              </div>
              <div>
                <Input label="Project name" {...editRegister('name')} />
                {editErrors.name && <p className="text-sm text-danger-500 mt-1">{editErrors.name.message}</p>}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Input label="Start date" type="date" {...editRegister('startDate')} />
                {editErrors.startDate && <p className="text-sm text-danger-500 mt-1">{editErrors.startDate.message}</p>}
              </div>
              <div>
                <Input label="Expected end date" type="date" {...editRegister('expectedEndDate')} />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Input label="Actual end date" type="date" {...editRegister('endDate')} />
              </div>
              <div>
                <Select label="Status" {...editRegister('status')}>
                  <option value="DRAFT">Draft</option>
                  <option value="PLANNED">Planned</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="ON_HOLD">On Hold</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="CANCELLED">Cancelled</option>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Select label="Priority" {...editRegister('priority')}>
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="CRITICAL">Critical</option>
                </Select>
              </div>
              <div>
                <Input label="Client name" placeholder="e.g. Acme Corp" {...editRegister('clientName')} />
              </div>
            </div>

            {/* Billing toggle */}
            <div className="rounded-lg border border-[var(--border-main)] p-4 space-y-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-[var(--border-main)] text-primary-600 focus:ring-primary-500"
                  {...editRegister('isBillable')}
                />
                <span className="text-sm font-medium text-[var(--text-primary)]">Billable project</span>
                <span className="text-xs text-[var(--text-muted)]">— enables invoicing</span>
              </label>

              {editWatch('isBillable') && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Select label="Billing type" {...editRegister('billingType')}>
                      <option value="">Select billing type</option>
                      <option value="TIME_AND_MATERIAL">Time &amp; Material</option>
                      <option value="FIXED_PRICE">Fixed Price</option>
                      <option value="RETAINER">Retainer</option>
                    </Select>
                  </div>
                  <div>
                    <Input label="Billing rate (per hour)" type="number" min={0} placeholder="e.g. 150" {...editRegister('billingRate')} />
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-[var(--text-secondary)]">
                Description (optional)
              </label>
              <Textarea placeholder="Add a short description or scope notes" {...editRegister('description')} />
            </div>
          </ModalBody>
          <ModalFooter>
            <Button type="button" variant="outline" onClick={() => setShowEditModal(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={editIsSubmitting || updateMutation.isPending}>
              Save Changes
            </Button>
          </ModalFooter>
        </form>
      </Modal>
    </AppLayout>
  );
}
