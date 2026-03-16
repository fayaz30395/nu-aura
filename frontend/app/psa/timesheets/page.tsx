'use client';

import { AppLayout } from '@/components/layout';
import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Clock, CheckCircle, AlertCircle } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonTable } from '@/components/ui/Loading';
import { ResponsiveTable, type Column } from '@/components/ui/ResponsiveTable';

import { PSATimesheet, TimesheetStatus } from '@/lib/types/psa';
import {
  usePsaEmployeeTimesheets,
  useCreatePsaTimesheet,
  useSubmitPsaTimesheet,
  usePsaProjects,
} from '@/lib/hooks/queries/usePsa';
import { useAuth } from '@/lib/hooks/useAuth';

// Zod schema for timesheet creation form
const timesheetSchema = z.object({
  weekStartDate: z.string().min(1, 'Week start date is required'),
});

type TimesheetFormData = z.infer<typeof timesheetSchema>;

const ITEMS_PER_PAGE = 10;

export default function PsaTimesheetsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'my-timesheets' | 'approvals'>('my-timesheets');
  const [modalOpen, setModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Get employee ID from auth
  const employeeId = user?.employeeId || user?.id || '';

  // Queries & mutations
  const { data: timesheets = [], isLoading } = usePsaEmployeeTimesheets(employeeId);
  const { data: projects = [] } = usePsaProjects();
  const createTimesheet = useCreatePsaTimesheet();
  const submitTimesheet = useSubmitPsaTimesheet();

  // Form setup
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TimesheetFormData>({
    resolver: zodResolver(timesheetSchema),
    defaultValues: {
      weekStartDate: new Date().toISOString().split('T')[0],
    },
  });

  // Handle timesheet creation
  const onCreateTimesheet = async (data: TimesheetFormData) => {
    if (!employeeId) {
      setErrorMessage('User not authenticated. Please log in again.');
      return;
    }

    try {
      setErrorMessage(null);
      const startDate = new Date(data.weekStartDate);
      const endDate = new Date(startDate.getTime() + 6 * 24 * 60 * 60 * 1000);

      await createTimesheet.mutateAsync({
        employeeId,
        weekStartDate: data.weekStartDate,
        weekEndDate: endDate.toISOString().split('T')[0],
        totalHours: 0,
        status: TimesheetStatus.DRAFT,
      });

      reset();
      setModalOpen(false);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to create timesheet';
      setErrorMessage(errorMsg);
    }
  };

  // Handle timesheet submission
  const handleSubmitTimesheet = async (id: string) => {
    try {
      await submitTimesheet.mutateAsync(id);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to submit timesheet';
      setErrorMessage(errorMsg);
    }
  };

  // Map status to badge variant
  const getStatusBadgeVariant = (status: TimesheetStatus) => {
    switch (status) {
      case TimesheetStatus.APPROVED:
        return 'success';
      case TimesheetStatus.REJECTED:
        return 'danger';
      case TimesheetStatus.SUBMITTED:
        return 'info';
      case TimesheetStatus.UNDER_REVIEW:
        return 'warning';
      default:
        return 'default';
    }
  };

  // Format status display
  const formatStatus = (status: TimesheetStatus) => {
    return status.replace(/_/g, ' ');
  };

  // Table columns definition
  const columns: Column<PSATimesheet>[] = [
    {
      key: 'week',
      header: 'Week',
      accessor: (row) => `${row.weekStartDate} - ${row.weekEndDate}`,
      sortable: true,
      mobileLabel: 'Week',
      mobilePriority: 'primary',
    },
    {
      key: 'totalHours',
      header: 'Total Hours',
      accessor: (row) => `${row.totalHours} hrs`,
      sortable: true,
      width: 'w-24',
    },
    {
      key: 'billableHours',
      header: 'Billable',
      accessor: (row) => `${row.billableHours || 0} hrs`,
      width: 'w-24',
    },
    {
      key: 'status',
      header: 'Status',
      accessor: (row) => (
        <Badge variant={getStatusBadgeVariant(row.status)} size="md">
          {formatStatus(row.status)}
        </Badge>
      ),
      width: 'w-32',
    },
  ];

  // Paginate timesheets
  const paginatedTimesheets = useMemo(() => {
    const startIdx = (currentPage - 1) * ITEMS_PER_PAGE;
    return timesheets.slice(startIdx, startIdx + ITEMS_PER_PAGE);
  }, [timesheets, currentPage]);

  const totalPages = Math.ceil(timesheets.length / ITEMS_PER_PAGE);

  // Render row actions (menu)
  const renderRowActions = (row: PSATimesheet) => (
    <div className="flex items-center gap-2 justify-end">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => router.push(`/psa/timesheets/${row.id}`)}
        title="Edit time entries"
      >
        <Clock className="h-4 w-4" />
        Edit
      </Button>
      {row.status === TimesheetStatus.DRAFT && (
        <Button
          variant="soft-success"
          size="sm"
          onClick={() => handleSubmitTimesheet(row.id)}
          disabled={submitTimesheet.isPending}
          title="Submit for approval"
        >
          <CheckCircle className="h-4 w-4" />
          Submit
        </Button>
      )}
    </div>
  );

  return (
    <AppLayout>
      <div className="p-6 lg:p-8">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">Timesheets</h1>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              Track work hours and project billability
            </p>
          </div>
          <Button
            variant="primary"
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            New Timesheet
          </Button>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <Card className="mb-6 border-danger-200 bg-danger-50 dark:bg-danger-950/20 dark:border-danger-800">
            <CardContent className="flex gap-3 pt-4">
              <AlertCircle className="h-5 w-5 text-danger-600 dark:text-danger-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-danger-900 dark:text-danger-200">
                  Error
                </p>
                <p className="text-sm text-danger-800 dark:text-danger-300 mt-1">
                  {errorMessage}
                </p>
              </div>
              <button
                onClick={() => setErrorMessage(null)}
                className="text-danger-500 hover:text-danger-700 dark:text-danger-400 dark:hover:text-danger-300"
              >
                ✕
              </button>
            </CardContent>
          </Card>
        )}

        {/* Tab Navigation */}
        <div className="flex border-b border-[var(--border-main)] mb-6">
          <button
            onClick={() => setActiveTab('my-timesheets')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'my-timesheets'
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              My Timesheets
            </div>
          </button>
          <button
            onClick={() => setActiveTab('approvals')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'approvals'
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Approvals
            </div>
          </button>
        </div>

        {/* My Timesheets Tab */}
        {activeTab === 'my-timesheets' && (
          <div className="space-y-4">
            {isLoading ? (
              <SkeletonTable rows={5} columns={4} />
            ) : timesheets.length === 0 ? (
              <EmptyState
                icon={<Clock className="h-8 w-8" />}
                iconColor="bg-primary-100 dark:bg-primary-950 text-primary-600 dark:text-primary-400"
                title="No timesheets yet"
                description="Create your first weekly timesheet to start tracking work hours."
                actionLabel="New Timesheet"
                onAction={() => setModalOpen(true)}
              />
            ) : (
              <>
                <Card>
                  <CardContent className="p-0">
                    <ResponsiveTable
                      columns={columns}
                      data={paginatedTimesheets}
                      keyExtractor={(row) => row.id}
                      isLoading={isLoading}
                      renderRowActions={renderRowActions}
                      emptyMessage="No timesheets found"
                      className="w-full"
                    />
                  </CardContent>
                </Card>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4">
                    <p className="text-sm text-[var(--text-secondary)]">
                      Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to{' '}
                      {Math.min(currentPage * ITEMS_PER_PAGE, timesheets.length)} of{' '}
                      {timesheets.length} timesheets
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                      >
                        Previous
                      </Button>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: totalPages }).map((_, i) => (
                          <button
                            key={i + 1}
                            onClick={() => setCurrentPage(i + 1)}
                            className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                              currentPage === i + 1
                                ? 'bg-primary-500 text-white'
                                : 'bg-[var(--bg-surface)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
                            }`}
                          >
                            {i + 1}
                          </button>
                        ))}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Approvals Tab */}
        {activeTab === 'approvals' && (
          <EmptyState
            icon={<CheckCircle className="h-8 w-8" />}
            iconColor="bg-success-100 dark:bg-success-950 text-success-600 dark:text-success-400"
            title="No pending approvals"
            description="You don't have any timesheets pending approval right now."
          />
        )}
      </div>

      {/* Create Timesheet Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setErrorMessage(null);
          reset();
        }}
        size="md"
      >
        <ModalHeader onClose={() => setModalOpen(false)}>
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            <h2 className="text-lg font-semibold">Create New Weekly Timesheet</h2>
          </div>
        </ModalHeader>

        <form onSubmit={handleSubmit(onCreateTimesheet)}>
          <ModalBody className="space-y-4">
            <Input
              type="date"
              label="Week Start Date"
              error={errors.weekStartDate?.message}
              {...register('weekStartDate')}
            />
            <p className="text-xs text-[var(--text-secondary)]">
              Select Monday of the week you want to create a timesheet for. The timesheet will
              automatically cover the entire week (Monday - Sunday).
            </p>
          </ModalBody>

          <ModalFooter className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setModalOpen(false);
                setErrorMessage(null);
                reset();
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting || createTimesheet.isPending}
            >
              {isSubmitting || createTimesheet.isPending ? 'Creating...' : 'Create Draft'}
            </Button>
          </ModalFooter>
        </form>
      </Modal>
    </AppLayout>
  );
}
