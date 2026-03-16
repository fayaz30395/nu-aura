'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, XCircle } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import {
  Badge,
  Button,
  Card,
  CardContent,
  ConfirmDialog,
} from '@/components/ui';
import { HrmsProject, ProjectStatus, ProjectType } from '@/lib/types/hrms-project';
import {
  useHrmsProject,
  useActivateHrmsProject,
  useCloseHrmsProject,
} from '@/lib/hooks/queries/useProjects';
import { OverviewTab } from './_tabs/OverviewTab';
import { TeamTab } from './_tabs/TeamTab';
import { TimesheetsTab } from './_tabs/TimesheetsTab';
import { InvoicesTab } from './_tabs/InvoicesTab';

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

  // Queries
  const { data: project, isLoading, error, refetch: refetchProject } = useHrmsProject(projectId, !!projectId);

  // Mutations
  const activateMutation = useActivateHrmsProject();
  const closeMutation = useCloseHrmsProject();

  const loading = isLoading;
  const actionLoading = activateMutation.isPending || closeMutation.isPending;

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
    } catch (err) {
      // Error handled by mutation
    }
  };

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
    </AppLayout>
  );
}
