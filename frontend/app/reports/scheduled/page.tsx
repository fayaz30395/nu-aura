'use client';

import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AppLayout } from '@/components/layout';
import { Department } from '@/lib/types/employee';
import { useActiveDepartments } from '@/lib/hooks/queries/useDepartments';
import {
  ScheduledReport,
  ScheduledReportRequest,
  Frequency,
  ReportType,
  ExportFormat,
  REPORT_TYPE_LABELS,
  FREQUENCY_LABELS,
  DAY_OF_WEEK_LABELS,
} from '@/lib/types/analytics';
import { useToast } from '@/components/notifications/ToastProvider';
import {
  Plus,
  Edit,
  Trash2,
  Clock,
  Calendar,
  Mail,
  Play,
  Pause,
  FileText,
  Users,
  TrendingUp,
  DollarSign,
  BarChart3,
  CalendarDays,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import React from 'react';
import {
  useScheduledReports,
  useCreateScheduledReport,
  useUpdateScheduledReport,
  useDeleteScheduledReport,
  useToggleScheduledReportStatus,
} from '@/lib/hooks/queries/useReports';

const REPORT_TYPE_ICONS: Record<ReportType, React.ElementType> = {
  EMPLOYEE_DIRECTORY: Users,
  ATTENDANCE: CalendarDays,
  LEAVE: FileText,
  PAYROLL: DollarSign,
  PERFORMANCE: TrendingUp,
  DEPARTMENT_HEADCOUNT: BarChart3,
};

const REPORT_TYPE_COLORS: Record<ReportType, string> = {
  EMPLOYEE_DIRECTORY: 'text-blue-600 bg-blue-50 dark:bg-blue-950/20',
  ATTENDANCE: 'text-green-600 bg-green-50 dark:bg-green-950/20',
  LEAVE: 'text-orange-600 bg-orange-50 dark:bg-orange-950/20',
  PAYROLL: 'text-purple-600 bg-purple-50 dark:bg-purple-950/20',
  PERFORMANCE: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/20',
  DEPARTMENT_HEADCOUNT: 'text-pink-600 bg-pink-50 dark:bg-pink-950/20',
};

// Zod schema for scheduled report form
const scheduledReportFormSchema = z.object({
  scheduleName: z.string().min(1, 'Schedule name is required'),
  reportType: z.string().min(1, 'Report type is required'),
  frequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY']),
  dayOfWeek: z.union([z.string(), z.number()]).transform(v => typeof v === 'string' ? parseInt(v) : v).optional(),
  dayOfMonth: z.union([z.string(), z.number()]).transform(v => typeof v === 'string' ? parseInt(v) : v).optional(),
  timeOfDay: z.string().min(1, 'Time is required'),
  recipients: z.array(z.object({ email: z.string().email('Invalid email') })),
  departmentId: z.string().optional(),
  exportFormat: z.enum(['EXCEL', 'PDF', 'CSV']),
  isActive: z.boolean(),
});

type ScheduledReportFormData = z.infer<typeof scheduledReportFormSchema>;

export default function ScheduledReportsPage() {
  const toast = useToast();
  const [showModal, setShowModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedReport, setSelectedReport] = useState<ScheduledReport | null>(null);
  const [filterActive, setFilterActive] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  // React Hook Form setup
  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    formState: { errors },
  } = useForm<ScheduledReportFormData>({
    resolver: zodResolver(scheduledReportFormSchema),
    defaultValues: {
      scheduleName: '',
      reportType: 'EMPLOYEE_DIRECTORY',
      frequency: 'WEEKLY',
      dayOfWeek: 1,
      dayOfMonth: 1,
      timeOfDay: '09:00',
      recipients: [{ email: '' }],
      exportFormat: 'EXCEL',
      isActive: true,
    },
  });

  const { fields: recipientFields, append: appendRecipient, remove: removeRecipient } = useFieldArray({
    control,
    name: 'recipients',
  });

  const frequency = watch('frequency');

  const { data: response, isLoading: loading, refetch } = useScheduledReports();
  const { data: departmentsData = [] } = useActiveDepartments();
  const reports = response?.content || [];
  const departments = departmentsData;

  const createMutation = useCreateScheduledReport();
  const updateMutation = useUpdateScheduledReport();
  const deleteMutation = useDeleteScheduledReport();
  const toggleMutation = useToggleScheduledReportStatus();

  const handleFormSubmit = async (data: ScheduledReportFormData) => {
    // Filter out empty recipients
    const filteredRecipients = data.recipients.filter(r => r.email.trim() !== '').map(r => r.email);
    if (filteredRecipients.length === 0) {
      toast.error('Please add at least one recipient email');
      return;
    }

    const dataToSubmit: ScheduledReportRequest = {
      scheduleName: data.scheduleName,
      reportType: data.reportType as ReportType,
      frequency: data.frequency,
      dayOfWeek: data.frequency === 'WEEKLY' ? data.dayOfWeek : undefined,
      dayOfMonth: data.frequency === 'MONTHLY' ? data.dayOfMonth : undefined,
      timeOfDay: data.timeOfDay,
      recipients: filteredRecipients,
      departmentId: data.departmentId || undefined,
      exportFormat: data.exportFormat,
      isActive: data.isActive,
    };

    try {
      if (selectedReport) {
        await updateMutation.mutateAsync({ id: selectedReport.id, data: dataToSubmit });
        toast.success('Scheduled report updated successfully');
      } else {
        await createMutation.mutateAsync(dataToSubmit);
        toast.success('Scheduled report created successfully');
      }

      setShowModal(false);
      reset();
      setSelectedReport(null);
      refetch();
    } catch (error: unknown) {
      toast.error((error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to save scheduled report');
    }
  };

  const handleDelete = async () => {
    if (!selectedReport) return;
    try {
      await deleteMutation.mutateAsync(selectedReport.id);
      toast.success('Scheduled report deleted successfully');
      setShowDeleteConfirm(false);
      setSelectedReport(null);
      refetch();
    } catch (error: unknown) {
      toast.error((error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to delete scheduled report');
    }
  };

  const handleToggleStatus = async (report: ScheduledReport) => {
    try {
      await toggleMutation.mutateAsync(report.id);
      toast.success(report.isActive ? 'Report paused' : 'Report activated');
      refetch();
    } catch (error: unknown) {
      toast.error((error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to toggle report status');
    }
  };

  const openEditModal = (report: ScheduledReport) => {
    setSelectedReport(report);
    reset({
      scheduleName: report.scheduleName,
      reportType: report.reportType as string,
      frequency: report.frequency,
      dayOfWeek: report.dayOfWeek || 1,
      dayOfMonth: report.dayOfMonth || 1,
      timeOfDay: report.timeOfDay,
      recipients: report.recipients.length > 0 ? report.recipients.map(r => ({ email: r })) : [{ email: '' }],
      departmentId: report.departmentId || '',
      exportFormat: report.exportFormat,
      isActive: report.isActive,
    });
    setShowModal(true);
  };

  const openDeleteConfirm = (report: ScheduledReport) => {
    setSelectedReport(report);
    setShowDeleteConfirm(true);
  };

  const getScheduleDescription = (report: ScheduledReport) => {
    let desc = '';
    switch (report.frequency) {
      case 'DAILY':
        desc = `Daily at ${report.timeOfDay}`;
        break;
      case 'WEEKLY':
        desc = `Every ${DAY_OF_WEEK_LABELS[report.dayOfWeek || 1]} at ${report.timeOfDay}`;
        break;
      case 'MONTHLY':
        desc = `Monthly on day ${report.dayOfMonth} at ${report.timeOfDay}`;
        break;
    }
    return desc;
  };

  const filteredReports = reports.filter(report => {
    if (filterActive === 'ACTIVE') return report.isActive;
    if (filterActive === 'INACTIVE') return !report.isActive;
    return true;
  });

  return (
    <AppLayout activeMenuItem="reports">
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Scheduled Reports</h1>
            <p className="text-surface-600 dark:text-surface-400 mt-1">
              Configure automated report delivery to your team
            </p>
          </div>
          <button
            onClick={() => {
              reset();
              setSelectedReport(null);
              setShowModal(true);
            }}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            New Schedule
          </button>
        </div>

        {/* Filters */}
        <div className="bg-surface-light dark:bg-surface-dark rounded-lg shadow-md p-4 mb-6">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-surface-700 dark:text-surface-300">
              Status:
            </label>
            <div className="flex gap-2">
              {(['ALL', 'ACTIVE', 'INACTIVE'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setFilterActive(status)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    filterActive === status
                      ? 'bg-primary-600 text-white'
                      : 'bg-surface-100 dark:bg-surface-800 text-surface-700 dark:text-surface-300 hover:bg-surface-200 dark:hover:bg-surface-700'
                  }`}
                >
                  {status === 'ALL' ? 'All' : status === 'ACTIVE' ? 'Active' : 'Inactive'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Reports List */}
        {loading && reports.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-surface-600 dark:text-surface-400">Loading scheduled reports...</div>
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="bg-surface-light dark:bg-surface-dark rounded-lg shadow-md p-12 text-center">
            <Clock className="h-12 w-12 text-surface-400 mx-auto mb-4" />
            <div className="text-surface-600 dark:text-surface-400 mb-4">
              {filterActive === 'ALL' ? 'No scheduled reports found' : `No ${filterActive.toLowerCase()} scheduled reports`}
            </div>
            {filterActive === 'ALL' && (
              <button
                onClick={() => {
                  reset();
                  setSelectedReport(null);
                  setShowModal(true);
                }}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                Create Your First Schedule
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredReports.map((report) => {
              const IconComponent = REPORT_TYPE_ICONS[report.reportType];
              const colorClass = REPORT_TYPE_COLORS[report.reportType];

              return (
                <div
                  key={report.id}
                  className={`bg-surface-light dark:bg-surface-dark rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow ${
                    !report.isActive ? 'opacity-60' : ''
                  }`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${colorClass}`}>
                        <IconComponent className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold">{report.scheduleName}</h3>
                        <p className="text-sm text-surface-600 dark:text-surface-400">
                          {REPORT_TYPE_LABELS[report.reportType]}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleToggleStatus(report)}
                      className={`p-2 rounded-lg transition-colors ${
                        report.isActive
                          ? 'bg-green-50 dark:bg-green-950/20 text-green-600 hover:bg-green-100'
                          : 'bg-surface-100 dark:bg-surface-800 text-surface-500 hover:bg-surface-200'
                      }`}
                      title={report.isActive ? 'Pause schedule' : 'Activate schedule'}
                    >
                      {report.isActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </button>
                  </div>

                  <div className="space-y-3 mb-4">
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-surface-400" />
                      <span className="text-surface-600 dark:text-surface-400">
                        {getScheduleDescription(report)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-surface-400" />
                      <span className="text-surface-600 dark:text-surface-400">
                        {report.recipients.length} recipient{report.recipients.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <FileText className="h-4 w-4 text-surface-400" />
                      <span className="text-surface-600 dark:text-surface-400">
                        {report.exportFormat} format
                      </span>
                    </div>
                    {report.departmentName && (
                      <div className="flex items-center gap-2 text-sm">
                        <Users className="h-4 w-4 text-surface-400" />
                        <span className="text-surface-600 dark:text-surface-400">
                          Filtered: {report.departmentName}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-surface-200 dark:border-surface-700">
                    <div className="flex items-center gap-2">
                      {report.isActive ? (
                        <span className="flex items-center gap-1 text-xs text-green-600">
                          <CheckCircle className="h-3 w-3" />
                          Active
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs text-surface-500">
                          <XCircle className="h-3 w-3" />
                          Inactive
                        </span>
                      )}
                      {report.nextRunAt && report.isActive && (
                        <span className="text-xs text-surface-500 ml-2">
                          Next: {new Date(report.nextRunAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => openEditModal(report)}
                        className="p-2 bg-primary-50 dark:bg-primary-950/30 text-primary-600 dark:text-primary-400 rounded hover:bg-primary-100"
                        title="Edit"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => openDeleteConfirm(report)}
                        className="p-2 bg-red-50 text-red-600 rounded hover:bg-red-100"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Create/Edit Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-surface-light dark:bg-surface-dark rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <h2 className="text-2xl font-bold mb-6">
                  {selectedReport ? 'Edit Scheduled Report' : 'Create Scheduled Report'}
                </h2>
                <form onSubmit={handleSubmit(handleFormSubmit)}>
                  <div className="space-y-4">
                    {/* Schedule Name */}
                    <div>
                      <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                        Schedule Name *
                      </label>
                      <input
                        type="text"
                        placeholder="e.g., Weekly Attendance Report"
                        {...register('scheduleName')}
                        className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-[var(--bg-input)]"
                      />
                      {errors.scheduleName && <p className="text-red-500 text-sm mt-1">{errors.scheduleName.message}</p>}
                    </div>

                    {/* Report Type */}
                    <div>
                      <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                        Report Type *
                      </label>
                      <select
                        {...register('reportType')}
                        className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-[var(--bg-input)]"
                      >
                        {Object.entries(REPORT_TYPE_LABELS).map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                      {errors.reportType && <p className="text-red-500 text-sm mt-1">{errors.reportType.message}</p>}
                    </div>

                    {/* Frequency */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                          Frequency *
                        </label>
                        <select
                          {...register('frequency')}
                          className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-[var(--bg-input)]"
                        >
                          {Object.entries(FREQUENCY_LABELS).map(([value, label]) => (
                            <option key={value} value={value}>{label}</option>
                          ))}
                        </select>
                        {errors.frequency && <p className="text-red-500 text-sm mt-1">{errors.frequency.message}</p>}
                      </div>

                      {/* Day Selection based on frequency */}
                      {frequency === 'WEEKLY' && (
                        <div>
                          <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                            Day of Week *
                          </label>
                          <select
                            {...register('dayOfWeek', { valueAsNumber: true })}
                            className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-[var(--bg-input)]"
                          >
                            {Object.entries(DAY_OF_WEEK_LABELS).map(([value, label]) => (
                              <option key={value} value={value}>{label}</option>
                            ))}
                          </select>
                          {errors.dayOfWeek && <p className="text-red-500 text-sm mt-1">{errors.dayOfWeek.message}</p>}
                        </div>
                      )}

                      {frequency === 'MONTHLY' && (
                        <div>
                          <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                            Day of Month *
                          </label>
                          <select
                            {...register('dayOfMonth', { valueAsNumber: true })}
                            className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-[var(--bg-input)]"
                          >
                            {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                              <option key={day} value={day}>{day}</option>
                            ))}
                          </select>
                          {errors.dayOfMonth && <p className="text-red-500 text-sm mt-1">{errors.dayOfMonth.message}</p>}
                        </div>
                      )}
                    </div>

                    {/* Time */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                          Time *
                        </label>
                        <input
                          type="time"
                          {...register('timeOfDay')}
                          className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-[var(--bg-input)]"
                        />
                        {errors.timeOfDay && <p className="text-red-500 text-sm mt-1">{errors.timeOfDay.message}</p>}
                      </div>

                      {/* Export Format */}
                      <div>
                        <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                          Export Format *
                        </label>
                        <select
                          {...register('exportFormat')}
                          className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-[var(--bg-input)]"
                        >
                          <option value="EXCEL">Excel (.xlsx)</option>
                          <option value="PDF">PDF</option>
                          <option value="CSV">CSV</option>
                        </select>
                        {errors.exportFormat && <p className="text-red-500 text-sm mt-1">{errors.exportFormat.message}</p>}
                      </div>
                    </div>

                    {/* Department Filter (optional) */}
                    <div>
                      <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                        Filter by Department (optional)
                      </label>
                      <select
                        {...register('departmentId')}
                        className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-[var(--bg-input)]"
                      >
                        <option value="">All Departments</option>
                        {departments.map((dept) => (
                          <option key={dept.id} value={dept.id}>{dept.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Recipients */}
                    <div>
                      <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                        Recipients *
                      </label>
                      <div className="space-y-2">
                        {recipientFields.map((field, index) => (
                          <div key={field.id} className="flex gap-2">
                            <input
                              type="email"
                              placeholder="email@example.com"
                              {...register(`recipients.${index}.email`)}
                              className="flex-1 px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-[var(--bg-input)]"
                            />
                            {recipientFields.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeRecipient(index)}
                                className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => appendRecipient({ email: '' })}
                          className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
                        >
                          <Plus className="h-4 w-4" />
                          Add another recipient
                        </button>
                      </div>
                      {errors.recipients && <p className="text-red-500 text-sm mt-1">Please check recipients</p>}
                    </div>
                  </div>

                  <div className="flex gap-4 mt-6">
                    <button
                      type="button"
                      onClick={() => {
                        setShowModal(false);
                        reset();
                        setSelectedReport(null);
                      }}
                      className="flex-1 px-4 py-2 border border-surface-300 dark:border-surface-600 rounded-lg hover:bg-surface-50 dark:hover:bg-surface-800/50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                    >
                      {loading ? 'Saving...' : selectedReport ? 'Update' : 'Create'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation */}
        {showDeleteConfirm && selectedReport && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-surface-light dark:bg-surface-dark rounded-lg max-w-md w-full p-6">
              <h2 className="text-xl font-bold mb-4">Delete Scheduled Report</h2>
              <p className="text-surface-600 dark:text-surface-400 mb-6">
                Are you sure you want to delete &quot;{selectedReport.scheduleName}&quot;? This action cannot be undone.
              </p>
              <div className="flex gap-4">
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setSelectedReport(null);
                  }}
                  className="flex-1 px-4 py-2 border border-surface-300 dark:border-surface-600 rounded-lg hover:bg-surface-50 dark:hover:bg-surface-800/50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  {loading ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
