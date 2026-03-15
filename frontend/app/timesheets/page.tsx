'use client';

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { logger } from '@/lib/utils/logger';
import {
  Clock,
  Plus,
  Calendar,
  CheckCircle,
  AlertCircle,
  Loader2,
  Send,
  Eye,
  ChevronLeft,
  ChevronRight,
  Timer,
  FileSpreadsheet,
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import {
  Card,
  CardContent,
  Button,
  Badge,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  EmptyState,
} from '@/components/ui';
import { useAuth } from '@/lib/hooks/useAuth';
import { useEmployeeTimesheets, useTimesheetEntries, useCreateTimesheet, useSubmitTimesheet, useAddTimeEntry } from '@/lib/hooks/queries/useTimesheets';
import { useProjects } from '@/lib/hooks/queries/useProjects';
import { Timesheet, TimeEntry, ActivityType, CreateTimeEntryRequest } from '@/lib/types/timesheet';
import { Project } from '@/lib/types/project';

const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    DRAFT: 'bg-[var(--bg-surface)] text-gray-700 dark:bg-[var(--bg-secondary)] dark:text-gray-300',
    SUBMITTED: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
    UNDER_REVIEW: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
    APPROVED: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
    REJECTED: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
  };
  return colors[status] || colors.DRAFT;
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
};

const formatFullDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const ACTIVITY_TYPES: { value: ActivityType; label: string }[] = [
  { value: 'DEVELOPMENT', label: 'Development' },
  { value: 'TESTING', label: 'Testing' },
  { value: 'DESIGN', label: 'Design' },
  { value: 'DOCUMENTATION', label: 'Documentation' },
  { value: 'MEETING', label: 'Meeting' },
  { value: 'CODE_REVIEW', label: 'Code Review' },
  { value: 'PLANNING', label: 'Planning' },
  { value: 'SUPPORT', label: 'Support' },
  { value: 'RESEARCH', label: 'Research' },
  { value: 'OTHER', label: 'Other' },
];

export default function TimesheetsPage() {
  const router = useRouter();
  const { user, isAuthenticated, hasHydrated } = useAuth();

  // React Query hooks
  const { data: timesheets = [], isLoading, error: queryError } = useEmployeeTimesheets(
    user?.employeeId || '',
    isAuthenticated && hasHydrated && !!user?.employeeId
  );

  const { data: projectsResponse } = useProjects(0, 100);
  const projects = projectsResponse?.content ?? [];

  // Mutations
  const createTimesheetMutation = useCreateTimesheet();
  const submitTimesheetMutation = useSubmitTimesheet();
  const addTimeEntryMutation = useAddTimeEntry();

  const [error, setError] = useState<string | null>(queryError?.message || null);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEntryModal, setShowEntryModal] = useState(false);
  const [selectedTimesheet, setSelectedTimesheet] = useState<Timesheet | null>(null);
  // R2-014 FIX: Removed useState<TimeEntry[]> + useEffect that was syncing
  // React Query's entriesData into local state. Every re-fetch returned a new
  // array reference → useEffect fired → setState → re-render → potential loop.
  // entriesData from React Query is now used directly (see below).
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Week navigation
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const now = new Date();
    const first = now.getDate() - now.getDay();
    return new Date(now.setDate(first));
  });

  // Entry form
  const [entryForm, setEntryForm] = useState<CreateTimeEntryRequest>({
    employeeId: '',
    projectId: '',
    entryDate: '',
    hours: 0,
    isBillable: true,
    workDescription: '',
    activityType: 'DEVELOPMENT',
    isOvertime: false,
  });

  // Fetch timesheet entries when a timesheet is selected
  const { data: entriesData = [] } = useTimesheetEntries(
    selectedTimesheet?.id || '',
    showDetailModal && !!selectedTimesheet?.id
  );

  // R2-014 FIX: useEffect removed — entriesData is used directly below.

  const getWeekDates = () => {
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(currentWeekStart);
      date.setDate(date.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    setCurrentWeekStart(newDate);
  };

  const getCurrentWeekTimesheet = () => {
    const weekStart = currentWeekStart.toISOString().split('T')[0];
    return timesheets.find(ts => ts.weekStartDate === weekStart);
  };

  const handleCreateTimesheet = async () => {
    if (!user?.employeeId) return;

    setSaving(true);
    setError(null);
    try {
      const weekEnd = new Date(currentWeekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);

      await createTimesheetMutation.mutateAsync({
        employeeId: user.employeeId,
        weekStartDate: currentWeekStart.toISOString().split('T')[0],
        weekEndDate: weekEnd.toISOString().split('T')[0],
        totalHours: 0,
        billableHours: 0,
        nonBillableHours: 0,
      });

      setShowCreateModal(false);
    } catch (err: unknown) {
      logger.error('Error creating timesheet:', err);
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to create timesheet');
    } finally {
      setSaving(false);
    }
  };

  const handleViewTimesheet = (timesheet: Timesheet) => {
    setSelectedTimesheet(timesheet);
    setShowDetailModal(true);
  };

  const handleSubmitTimesheet = async () => {
    if (!selectedTimesheet) return;

    setSubmitting(true);
    setError(null);
    try {
      await submitTimesheetMutation.mutateAsync(selectedTimesheet.id);
      setShowDetailModal(false);
    } catch (err: unknown) {
      logger.error('Error submitting timesheet:', err);
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to submit timesheet');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddEntry = () => {
    if (!user?.employeeId || !selectedTimesheet) return;
    setEntryForm({
      employeeId: user.employeeId,
      projectId: projects[0]?.id || '',
      entryDate: selectedTimesheet.weekStartDate,
      hours: 0,
      isBillable: true,
      workDescription: '',
      activityType: 'DEVELOPMENT',
      isOvertime: false,
    });
    setShowEntryModal(true);
  };

  const handleSaveEntry = async () => {
    if (!selectedTimesheet || !entryForm.projectId) return;

    setSaving(true);
    setError(null);
    try {
      await addTimeEntryMutation.mutateAsync({
        timesheetId: selectedTimesheet.id,
        entry: entryForm,
      });
      setShowEntryModal(false);
    } catch (err: unknown) {
      logger.error('Error adding entry:', err);
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to add time entry');
    } finally {
      setSaving(false);
    }
  }

  const currentWeekTimesheet = getCurrentWeekTimesheet();
  const weekDates = getWeekDates();

  // Stats
  const stats = {
    totalHours: timesheets.reduce((sum, ts) => sum + (ts.totalHours || 0), 0),
    pending: timesheets.filter(ts => ts.status === 'SUBMITTED' || ts.status === 'UNDER_REVIEW').length,
    approved: timesheets.filter(ts => ts.status === 'APPROVED').length,
  };

  const breadcrumbs = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Timesheets' },
  ];

  if (!hasHydrated) {
    return null;
  }

  if (isLoading && timesheets.length === 0 && user?.employeeId) {
    return (
      <AppLayout breadcrumbs={breadcrumbs} activeMenuItem="timesheets">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
          <span className="ml-2 text-[var(--text-secondary)]">Loading timesheets...</span>
        </div>
      </AppLayout>
    );
  }

  // SuperAdmin (no employeeId) - show message
  if (!user?.employeeId) {
    return (
      <AppLayout breadcrumbs={breadcrumbs} activeMenuItem="timesheets">
        <EmptyState
          icon={<FileSpreadsheet className="h-12 w-12" />}
          title="Timesheets"
          description="As an administrator, you don't have personal timesheets. Select an employee to view their timesheets."
        />
      </AppLayout>
    );
  }

  return (
    <AppLayout breadcrumbs={breadcrumbs} activeMenuItem="timesheets">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">
              Timesheets
            </h1>
            <p className="text-[var(--text-secondary)]">
              Track your time against projects
            </p>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <Card className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                <AlertCircle className="h-5 w-5" />
                <span>{error}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-primary-100 p-3 dark:bg-primary-900">
                  <Timer className="h-6 w-6 text-primary-600 dark:text-primary-400" />
                </div>
                <div>
                  <p className="text-sm text-[var(--text-secondary)]">Total Hours</p>
                  <p className="text-2xl font-bold text-[var(--text-primary)]">{stats.totalHours.toFixed(1)}h</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-amber-100 p-3 dark:bg-amber-900">
                  <Clock className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-sm text-[var(--text-secondary)]">Pending Approval</p>
                  <p className="text-2xl font-bold text-[var(--text-primary)]">{stats.pending}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-green-100 p-3 dark:bg-green-900">
                  <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-[var(--text-secondary)]">Approved</p>
                  <p className="text-2xl font-bold text-[var(--text-primary)]">{stats.approved}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Current Week View */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <Button variant="outline" size="sm" onClick={() => navigateWeek('prev')}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="text-center">
                  <h3 className="font-semibold text-[var(--text-primary)]">
                    Week of {formatDate(currentWeekStart.toISOString())}
                  </h3>
                  <p className="text-sm text-[var(--text-muted)]">
                    {formatDate(weekDates[0].toISOString())} - {formatDate(weekDates[6].toISOString())}
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => navigateWeek('next')}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              {currentWeekTimesheet ? (
                <div className="flex items-center gap-2">
                  <Badge className={getStatusColor(currentWeekTimesheet.status)}>
                    {currentWeekTimesheet.status.replace('_', ' ')}
                  </Badge>
                  <Button size="sm" onClick={() => handleViewTimesheet(currentWeekTimesheet)}>
                    <Eye className="h-4 w-4 mr-2" />
                    View
                  </Button>
                </div>
              ) : (
                <Button onClick={() => setShowCreateModal(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Timesheet
                </Button>
              )}
            </div>

            {/* Week Grid */}
            <div className="grid grid-cols-7 gap-2">
              {weekDates.map((date, index) => (
                <div
                  key={index}
                  className="text-center p-3 rounded-lg bg-[var(--bg-secondary)]"
                >
                  <p className="text-xs text-[var(--text-muted)] uppercase">
                    {date.toLocaleDateString('en-US', { weekday: 'short' })}
                  </p>
                  <p className="text-lg font-semibold text-[var(--text-primary)]">
                    {date.getDate()}
                  </p>
                  {currentWeekTimesheet && (
                    <p className="text-xs text-primary-600 dark:text-primary-400 mt-1">
                      {/* Placeholder for hours per day */}
                      --
                    </p>
                  )}
                </div>
              ))}
            </div>

            {currentWeekTimesheet && (
              <div className="mt-4 pt-4 border-t border-[var(--border-main)] flex items-center justify-between">
                <div className="flex gap-6 text-sm">
                  <span className="text-[var(--text-secondary)]">
                    Total: <strong className="text-[var(--text-primary)]">{currentWeekTimesheet.totalHours}h</strong>
                  </span>
                  {currentWeekTimesheet.billableHours !== undefined && (
                    <span className="text-green-600 dark:text-green-400">
                      Billable: <strong>{currentWeekTimesheet.billableHours}h</strong>
                    </span>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Timesheet History */}
        <div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
            Timesheet History
          </h2>
          <div className="space-y-3">
            {timesheets.length > 0 ? (
              timesheets.map((timesheet) => (
                <Card key={timesheet.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="rounded-lg bg-[var(--bg-secondary)] p-3 dark:bg-[var(--bg-secondary)]">
                          <FileSpreadsheet className="h-5 w-5 text-[var(--text-secondary)]" />
                        </div>
                        <div>
                          <p className="font-medium text-[var(--text-primary)]">
                            Week of {formatDate(timesheet.weekStartDate)}
                          </p>
                          <p className="text-sm text-[var(--text-muted)]">
                            {formatDate(timesheet.weekStartDate)} - {formatDate(timesheet.weekEndDate)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-lg font-semibold text-[var(--text-primary)]">
                            {timesheet.totalHours}h
                          </p>
                          {timesheet.billableHours !== undefined && (
                            <p className="text-xs text-green-600 dark:text-green-400">
                              {timesheet.billableHours}h billable
                            </p>
                          )}
                        </div>
                        <Badge className={getStatusColor(timesheet.status)}>
                          {timesheet.status.replace('_', ' ')}
                        </Badge>
                        <Button size="sm" variant="outline" onClick={() => handleViewTimesheet(timesheet)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <EmptyState
                icon={<FileSpreadsheet className="h-12 w-12" />}
                title="No Timesheets"
                description="Fill in your timesheet for the current period"
                action={{ label: 'Create Timesheet', onClick: () => setShowCreateModal(true) }}
              />
            )}
          </div>
        </div>

        {/* Create Timesheet Modal */}
        <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} size="sm">
          <ModalHeader>
            <h2 className="text-xl font-semibold text-[var(--text-primary)]">
              Create Timesheet
            </h2>
          </ModalHeader>
          <ModalBody>
            <p className="text-[var(--text-secondary)]">
              Create a timesheet for the week of{' '}
              <strong>{formatFullDate(currentWeekStart.toISOString())}</strong>?
            </p>
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateTimesheet} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Create
                </>
              )}
            </Button>
          </ModalFooter>
        </Modal>

        {/* Timesheet Detail Modal */}
        <Modal isOpen={showDetailModal} onClose={() => setShowDetailModal(false)} size="lg">
          <ModalHeader>
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary-100 p-2 dark:bg-primary-900">
                <FileSpreadsheet className="h-6 w-6 text-primary-600 dark:text-primary-400" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-[var(--text-primary)]">
                  Timesheet Details
                </h2>
                <p className="text-sm text-[var(--text-muted)]">
                  {selectedTimesheet && `${formatDate(selectedTimesheet.weekStartDate)} - ${formatDate(selectedTimesheet.weekEndDate)}`}
                </p>
              </div>
            </div>
          </ModalHeader>
          <ModalBody>
            {selectedTimesheet && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <Badge className={getStatusColor(selectedTimesheet.status)}>
                    {selectedTimesheet.status.replace('_', ' ')}
                  </Badge>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-[var(--text-primary)]">
                      {selectedTimesheet.totalHours}h
                    </p>
                    <p className="text-sm text-[var(--text-muted)]">Total Hours</p>
                  </div>
                </div>

                {selectedTimesheet.rejectionReason && (
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg text-red-700 dark:text-red-300">
                    <strong>Rejection Reason:</strong> {selectedTimesheet.rejectionReason}
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium text-[var(--text-primary)]">Time Entries</h3>
                    {selectedTimesheet.status === 'DRAFT' && (
                      <Button size="sm" onClick={handleAddEntry}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Entry
                      </Button>
                    )}
                  </div>

                  {entriesData.length > 0 ? (
                    <div className="space-y-2">
                      {entriesData.map((entry) => (
                        <div
                          key={entry.id}
                          className="p-3 bg-[var(--bg-secondary)] rounded-lg"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-[var(--text-primary)]">
                                {projects.find(p => p.id === entry.projectId)?.name || 'Unknown Project'}
                              </p>
                              <p className="text-sm text-[var(--text-muted)]">
                                {formatDate(entry.entryDate)} - {entry.activityType?.replace('_', ' ')}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-[var(--text-primary)]">
                                {entry.hours}h
                              </p>
                              <p className="text-xs text-[var(--text-muted)]">
                                {entry.isBillable ? 'Billable' : 'Non-billable'}
                              </p>
                            </div>
                          </div>
                          {entry.workDescription && (
                            <p className="mt-2 text-sm text-[var(--text-secondary)]">
                              {entry.workDescription}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-[var(--text-muted)] py-4">
                      No time entries yet. Add your first entry to track your work.
                    </p>
                  )}
                </div>
              </div>
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" onClick={() => setShowDetailModal(false)}>
              Close
            </Button>
            {selectedTimesheet?.status === 'DRAFT' && (
              <Button onClick={handleSubmitTimesheet} disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Submit for Approval
                  </>
                )}
              </Button>
            )}
          </ModalFooter>
        </Modal>

        {/* Add Time Entry Modal */}
        <Modal isOpen={showEntryModal} onClose={() => setShowEntryModal(false)} size="md">
          <ModalHeader>
            <h2 className="text-xl font-semibold text-[var(--text-primary)]">
              Add Time Entry
            </h2>
          </ModalHeader>
          <ModalBody>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                  Project *
                </label>
                <select
                  required
                  value={entryForm.projectId}
                  onChange={(e) => setEntryForm({ ...entryForm, projectId: e.target.value })}
                  className="w-full px-3 py-2 bg-[var(--bg-input)] text-[var(--text-primary)] border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Select a project</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                    Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={entryForm.entryDate}
                    onChange={(e) => setEntryForm({ ...entryForm, entryDate: e.target.value })}
                    className="w-full px-3 py-2 bg-[var(--bg-input)] text-[var(--text-primary)] border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                    Hours *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    max="24"
                    step="0.5"
                    value={entryForm.hours}
                    onChange={(e) => setEntryForm({ ...entryForm, hours: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 bg-[var(--bg-input)] text-[var(--text-primary)] border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                  Activity Type
                </label>
                <select
                  value={entryForm.activityType}
                  onChange={(e) => setEntryForm({ ...entryForm, activityType: e.target.value as ActivityType })}
                  className="w-full px-3 py-2 bg-[var(--bg-input)] text-[var(--text-primary)] border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  {ACTIVITY_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                  Work Description
                </label>
                <textarea
                  rows={3}
                  value={entryForm.workDescription}
                  onChange={(e) => setEntryForm({ ...entryForm, workDescription: e.target.value })}
                  className="w-full px-3 py-2 bg-[var(--bg-input)] text-[var(--text-primary)] border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Describe the work done..."
                />
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={entryForm.isBillable}
                    onChange={(e) => setEntryForm({ ...entryForm, isBillable: e.target.checked })}
                    className="rounded border-[var(--border-main)] text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm text-[var(--text-secondary)]">Billable</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={entryForm.isOvertime || false}
                    onChange={(e) => setEntryForm({ ...entryForm, isOvertime: e.target.checked })}
                    className="rounded border-[var(--border-main)] text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm text-[var(--text-secondary)]">Overtime</span>
                </label>
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" onClick={() => setShowEntryModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEntry} disabled={saving || !entryForm.projectId || !entryForm.hours}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Entry
                </>
              )}
            </Button>
          </ModalFooter>
        </Modal>
      </div>
    </AppLayout>
  );
}
