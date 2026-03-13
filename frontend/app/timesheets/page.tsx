'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
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
import { timesheetService } from '@/lib/services/timesheet.service';
import { projectService } from '@/lib/services/project.service';
import { Timesheet, TimeEntry, ActivityType, CreateTimeEntryRequest } from '@/lib/types/timesheet';
import { Project } from '@/lib/types/project';

const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    DRAFT: 'bg-gray-100 text-gray-700 dark:bg-surface-800 dark:text-gray-300',
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

  const [timesheets, setTimesheets] = useState<Timesheet[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEntryModal, setShowEntryModal] = useState(false);
  const [selectedTimesheet, setSelectedTimesheet] = useState<Timesheet | null>(null);
  const [timesheetEntries, setTimesheetEntries] = useState<TimeEntry[]>([]);
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

  // Authentication check
  useEffect(() => {
    if (!hasHydrated) return;
    if (!isAuthenticated) {
      router.push('/auth/login');
    }
  }, [hasHydrated, isAuthenticated, router]);

  const fetchData = useCallback(async () => {
    if (!user?.employeeId) return;

    setLoading(true);
    setError(null);
    try {
      const [timesheetData, projectData] = await Promise.all([
        timesheetService.getEmployeeTimesheets(user.employeeId),
        projectService.getAllProjects(0, 100),
      ]);
      setTimesheets(timesheetData);
      setProjects(projectData.content);
    } catch (err: unknown) {
      console.error('Error fetching data:', err);
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to load timesheets');
    } finally {
      setLoading(false);
    }
  }, [user?.employeeId]);

  useEffect(() => {
    if (user?.employeeId) {
      fetchData();
    }
  }, [user?.employeeId, fetchData]);

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
    try {
      const weekEnd = new Date(currentWeekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);

      await timesheetService.createTimesheet({
        employeeId: user.employeeId,
        weekStartDate: currentWeekStart.toISOString().split('T')[0],
        weekEndDate: weekEnd.toISOString().split('T')[0],
        totalHours: 0,
        billableHours: 0,
        nonBillableHours: 0,
      });

      fetchData();
      setShowCreateModal(false);
    } catch (err: unknown) {
      console.error('Error creating timesheet:', err);
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to create timesheet');
    } finally {
      setSaving(false);
    }
  };

  const handleViewTimesheet = async (timesheet: Timesheet) => {
    setSelectedTimesheet(timesheet);
    try {
      const entries = await timesheetService.getTimesheetEntries(timesheet.id);
      setTimesheetEntries(entries);
    } catch (err) {
      console.error('Error fetching entries:', err);
      setTimesheetEntries([]);
    }
    setShowDetailModal(true);
  };

  const handleSubmitTimesheet = async () => {
    if (!selectedTimesheet) return;

    setSubmitting(true);
    try {
      await timesheetService.submitTimesheet(selectedTimesheet.id);
      fetchData();
      setShowDetailModal(false);
    } catch (err: unknown) {
      console.error('Error submitting timesheet:', err);
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
    try {
      await timesheetService.addTimeEntry(selectedTimesheet.id, entryForm);
      const entries = await timesheetService.getTimesheetEntries(selectedTimesheet.id);
      setTimesheetEntries(entries);
      setShowEntryModal(false);
      fetchData();
    } catch (err: unknown) {
      console.error('Error adding entry:', err);
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to add time entry');
    } finally {
      setSaving(false);
    }
  };

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

  if (loading && timesheets.length === 0 && user?.employeeId) {
    return (
      <AppLayout breadcrumbs={breadcrumbs} activeMenuItem="timesheets">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
          <span className="ml-2 text-surface-600 dark:text-surface-400">Loading timesheets...</span>
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
            <h1 className="text-2xl font-bold text-surface-900 dark:text-white">
              Timesheets
            </h1>
            <p className="text-surface-600 dark:text-surface-400">
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
                <Button size="sm" variant="outline" onClick={fetchData} className="ml-auto">
                  Retry
                </Button>
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
                  <p className="text-sm text-surface-600 dark:text-surface-400">Total Hours</p>
                  <p className="text-2xl font-bold text-surface-900 dark:text-white">{stats.totalHours.toFixed(1)}h</p>
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
                  <p className="text-sm text-surface-600 dark:text-surface-400">Pending Approval</p>
                  <p className="text-2xl font-bold text-surface-900 dark:text-white">{stats.pending}</p>
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
                  <p className="text-sm text-surface-600 dark:text-surface-400">Approved</p>
                  <p className="text-2xl font-bold text-surface-900 dark:text-white">{stats.approved}</p>
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
                  <h3 className="font-semibold text-surface-900 dark:text-white">
                    Week of {formatDate(currentWeekStart.toISOString())}
                  </h3>
                  <p className="text-sm text-surface-500">
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
                  className="text-center p-3 rounded-lg bg-surface-50 dark:bg-surface-800"
                >
                  <p className="text-xs text-surface-500 uppercase">
                    {date.toLocaleDateString('en-US', { weekday: 'short' })}
                  </p>
                  <p className="text-lg font-semibold text-surface-900 dark:text-white">
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
              <div className="mt-4 pt-4 border-t border-surface-200 dark:border-surface-700 flex items-center justify-between">
                <div className="flex gap-6 text-sm">
                  <span className="text-surface-600 dark:text-surface-400">
                    Total: <strong className="text-surface-900 dark:text-white">{currentWeekTimesheet.totalHours}h</strong>
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
          <h2 className="text-lg font-semibold text-surface-900 dark:text-white mb-4">
            Timesheet History
          </h2>
          <div className="space-y-3">
            {timesheets.length > 0 ? (
              timesheets.map((timesheet) => (
                <Card key={timesheet.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="rounded-lg bg-surface-100 p-3 dark:bg-surface-800">
                          <FileSpreadsheet className="h-5 w-5 text-surface-600 dark:text-surface-400" />
                        </div>
                        <div>
                          <p className="font-medium text-surface-900 dark:text-white">
                            Week of {formatDate(timesheet.weekStartDate)}
                          </p>
                          <p className="text-sm text-surface-500">
                            {formatDate(timesheet.weekStartDate)} - {formatDate(timesheet.weekEndDate)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-lg font-semibold text-surface-900 dark:text-white">
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
            <h2 className="text-xl font-semibold text-surface-900 dark:text-white">
              Create Timesheet
            </h2>
          </ModalHeader>
          <ModalBody>
            <p className="text-surface-600 dark:text-surface-400">
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
                <h2 className="text-xl font-semibold text-surface-900 dark:text-white">
                  Timesheet Details
                </h2>
                <p className="text-sm text-surface-500">
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
                    <p className="text-2xl font-bold text-surface-900 dark:text-white">
                      {selectedTimesheet.totalHours}h
                    </p>
                    <p className="text-sm text-surface-500">Total Hours</p>
                  </div>
                </div>

                {selectedTimesheet.rejectionReason && (
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg text-red-700 dark:text-red-300">
                    <strong>Rejection Reason:</strong> {selectedTimesheet.rejectionReason}
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium text-surface-900 dark:text-white">Time Entries</h3>
                    {selectedTimesheet.status === 'DRAFT' && (
                      <Button size="sm" onClick={handleAddEntry}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Entry
                      </Button>
                    )}
                  </div>

                  {timesheetEntries.length > 0 ? (
                    <div className="space-y-2">
                      {timesheetEntries.map((entry) => (
                        <div
                          key={entry.id}
                          className="p-3 bg-surface-50 dark:bg-surface-800 rounded-lg"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-surface-900 dark:text-white">
                                {projects.find(p => p.id === entry.projectId)?.name || 'Unknown Project'}
                              </p>
                              <p className="text-sm text-surface-500">
                                {formatDate(entry.entryDate)} - {entry.activityType?.replace('_', ' ')}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-surface-900 dark:text-white">
                                {entry.hours}h
                              </p>
                              <p className="text-xs text-surface-500">
                                {entry.isBillable ? 'Billable' : 'Non-billable'}
                              </p>
                            </div>
                          </div>
                          {entry.workDescription && (
                            <p className="mt-2 text-sm text-surface-600 dark:text-surface-400">
                              {entry.workDescription}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-surface-500 py-4">
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
            <h2 className="text-xl font-semibold text-surface-900 dark:text-white">
              Add Time Entry
            </h2>
          </ModalHeader>
          <ModalBody>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                  Project *
                </label>
                <select
                  required
                  value={entryForm.projectId}
                  onChange={(e) => setEntryForm({ ...entryForm, projectId: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 border border-surface-300 dark:border-surface-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
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
                  <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                    Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={entryForm.entryDate}
                    onChange={(e) => setEntryForm({ ...entryForm, entryDate: e.target.value })}
                    className="w-full px-3 py-2 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 border border-surface-300 dark:border-surface-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
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
                    className="w-full px-3 py-2 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 border border-surface-300 dark:border-surface-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                  Activity Type
                </label>
                <select
                  value={entryForm.activityType}
                  onChange={(e) => setEntryForm({ ...entryForm, activityType: e.target.value as ActivityType })}
                  className="w-full px-3 py-2 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 border border-surface-300 dark:border-surface-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  {ACTIVITY_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                  Work Description
                </label>
                <textarea
                  rows={3}
                  value={entryForm.workDescription}
                  onChange={(e) => setEntryForm({ ...entryForm, workDescription: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 border border-surface-300 dark:border-surface-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Describe the work done..."
                />
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={entryForm.isBillable}
                    onChange={(e) => setEntryForm({ ...entryForm, isBillable: e.target.checked })}
                    className="rounded border-surface-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm text-surface-700 dark:text-surface-300">Billable</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={entryForm.isOvertime || false}
                    onChange={(e) => setEntryForm({ ...entryForm, isOvertime: e.target.checked })}
                    className="rounded border-surface-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm text-surface-700 dark:text-surface-300">Overtime</span>
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
