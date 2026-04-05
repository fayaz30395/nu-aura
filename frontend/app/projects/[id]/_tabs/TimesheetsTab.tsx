'use client';

import React, {useMemo, useState} from 'react';
import {useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';
import {Loader2, Plus} from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  CardContent,
  EmptyState,
  Input,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ResponsiveTable,
} from '@/components/ui';
import {useCreatePsaTimesheet, usePsaProjectTimesheets, useSubmitPsaTimesheet} from '@/lib/hooks/queries/usePsa';
import {PSATimesheet} from '@/lib/types/hrms/psa';

interface TimesheetsTabProps {
  projectId: string;
}

const createTimesheetSchema = z.object({
  weekStartDate: z.string().min(1, 'Week start date is required'),
});

type CreateTimesheetFormData = z.infer<typeof createTimesheetSchema>;

const formatDate = (value?: string | null) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-IN', {day: '2-digit', month: 'short', year: 'numeric'});
};

const formatHours = (value?: number | null) => {
  if (value === null || value === undefined) return '—';
  return `${value.toFixed(1)}h`;
};

const STATUS_BADGE: Record<string, {
  label: string;
  variant: 'success' | 'warning' | 'secondary' | 'danger' | 'primary'
}> = {
  DRAFT: {label: 'Draft', variant: 'secondary'},
  SUBMITTED: {label: 'Submitted', variant: 'primary'},
  UNDER_REVIEW: {label: 'Under Review', variant: 'warning'},
  APPROVED: {label: 'Approved', variant: 'success'},
  REJECTED: {label: 'Rejected', variant: 'danger'},
};

const getStatusBadge = (status?: string | null) => {
  if (status && STATUS_BADGE[status]) {
    return STATUS_BADGE[status];
  }
  return {label: status ?? 'Unknown', variant: 'secondary' as const};
};

export function TimesheetsTab({projectId}: TimesheetsTabProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);

  const {
    register: registerCreate,
    handleSubmit: handleSubmitCreate,
    reset: resetCreate,
    formState: {errors: createErrors},
  } = useForm<CreateTimesheetFormData>({
    resolver: zodResolver(createTimesheetSchema),
    defaultValues: {
      weekStartDate: '',
    },
  });

  const {
    data: timesheets = [],
    isLoading: timesheetsLoading,
    error: timesheetsError,
    refetch: refetchTimesheets,
  } = usePsaProjectTimesheets(projectId, !!projectId);

  const createMutation = useCreatePsaTimesheet();
  const submitMutation = useSubmitPsaTimesheet();

  const timesheetsTotal = timesheets.length;

  const getWeekRange = (startDate: string) => {
    const start = new Date(startDate);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return `${formatDate(startDate)} - ${formatDate(end.toISOString().split('T')[0])}`;
  };

  const columns = useMemo(() => [
    {
      key: 'weekRange',
      header: 'Week',
      accessor: (timesheet: PSATimesheet) => (
        <span className="text-body-secondary">
          {getWeekRange(timesheet.weekStartDate)}
        </span>
      ),
      mobilePriority: 'primary' as const,
    },
    {
      key: 'totalHours',
      header: 'Total Hours',
      accessor: (timesheet: PSATimesheet) => (
        <span className="text-body-secondary">
          {formatHours(timesheet.totalHours)}
        </span>
      ),
      mobilePriority: 'secondary' as const,
    },
    {
      key: 'billableHours',
      header: 'Billable',
      accessor: (timesheet: PSATimesheet) => (
        <span className="text-body-secondary">
          {formatHours(timesheet.billableHours)}
        </span>
      ),
      mobilePriority: 'secondary' as const,
    },
    {
      key: 'nonBillableHours',
      header: 'Non-Billable',
      accessor: (timesheet: PSATimesheet) => (
        <span className="text-body-secondary">
          {formatHours(timesheet.nonBillableHours)}
        </span>
      ),
      mobilePriority: 'secondary' as const,
    },
    {
      key: 'status',
      header: 'Status',
      accessor: (timesheet: PSATimesheet) => {
        const badge = getStatusBadge(timesheet.status);
        return (
          <Badge variant={badge.variant} size="sm">
            {badge.label}
          </Badge>
        );
      },
      mobilePriority: 'secondary' as const,
    },
    {
      key: 'actions',
      header: '',
      accessor: (timesheet: PSATimesheet) => {
        if (timesheet.status !== 'DRAFT') return null;
        return (
          <Button
            variant="outline"
            size="sm"
            isLoading={submitMutation.isPending}
            onClick={async () => {
              try {
                await submitMutation.mutateAsync(timesheet.id);
                await refetchTimesheets();
              } catch (_err) {
                // Error handled by mutation
              }
            }}
          >
            Submit
          </Button>
        );
      },
      mobilePriority: 'secondary' as const,
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], []);

  const handleCreateSubmit = async (data: CreateTimesheetFormData) => {
    try {
      await createMutation.mutateAsync({
        projectId,
        weekStartDate: data.weekStartDate,
      } as Partial<PSATimesheet>);
      setShowCreateModal(false);
      resetCreate();
      await refetchTimesheets();
    } catch (_err) {
      // Error handled by mutation
    }
  };

  const timesheetsErrorMessage = timesheetsError ? (timesheetsError instanceof Error ? timesheetsError.message : String(timesheetsError)) : null;

  if (timesheetsLoading && !timesheets.length) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-accent-500"/>
        </CardContent>
      </Card>
    );
  }

  if (timesheetsTotal === 0) {
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="row-between py-6">
            <EmptyState
              title="No timesheets"
              description="Create a timesheet to track hours for this project."
            />
            <Button
              leftIcon={<Plus className="h-4 w-4"/>}
              onClick={() => setShowCreateModal(true)}
            >
              New Timesheet
            </Button>
          </CardContent>
        </Card>

        <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} size="lg">
          <ModalHeader onClose={() => setShowCreateModal(false)}>
            Create Timesheet
          </ModalHeader>
          <form onSubmit={handleSubmitCreate(handleCreateSubmit)}>
            <ModalBody className="space-y-4">
              <Input
                label="Week Start Date"
                type="date"
                {...registerCreate('weekStartDate')}
              />
              {createErrors.weekStartDate && (
                <p className="text-sm text-danger-500">{createErrors.weekStartDate.message}</p>
              )}
            </ModalBody>
            <ModalFooter>
              <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)}>
                Cancel
              </Button>
              <Button type="submit" isLoading={createMutation.isPending}>
                Create Timesheet
              </Button>
            </ModalFooter>
          </form>
        </Modal>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-[var(--text-primary)]">Timesheets</h2>
              <p className="text-body-muted">Track hours worked on this project.</p>
            </div>
            <Button
              leftIcon={<Plus className="h-4 w-4"/>}
              onClick={() => setShowCreateModal(true)}
            >
              New Timesheet
            </Button>
          </div>

          {timesheetsErrorMessage && (
            <div
              className="rounded-lg border border-danger-200 bg-danger-50 px-4 py-4 text-sm text-danger-700 dark:border-danger-800 dark:bg-danger-900/20 dark:text-danger-400">
              {timesheetsErrorMessage}
            </div>
          )}

          <ResponsiveTable
            columns={columns}
            data={timesheets}
            keyExtractor={(row) => row.id}
            isLoading={timesheetsLoading}
            emptyMessage="No timesheets found for this project."
          />
        </CardContent>
      </Card>

      {/* Create Timesheet Modal */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} size="lg">
        <ModalHeader onClose={() => setShowCreateModal(false)}>
          Create Timesheet
        </ModalHeader>
        <form onSubmit={handleSubmitCreate(handleCreateSubmit)}>
          <ModalBody className="space-y-4">
            <Input
              label="Week Start Date"
              type="date"
              {...registerCreate('weekStartDate')}
            />
            {createErrors.weekStartDate && (
              <p className="text-sm text-danger-500">{createErrors.weekStartDate.message}</p>
            )}
          </ModalBody>
          <ModalFooter>
            <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={createMutation.isPending}>
              Create Timesheet
            </Button>
          </ModalFooter>
        </form>
      </Modal>
    </div>
  );
}
