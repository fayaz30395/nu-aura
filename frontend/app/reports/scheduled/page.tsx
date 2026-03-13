'use client';

import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout';
import { scheduledReportService } from '@/lib/services/scheduled-report.service';
import { departmentService } from '@/lib/services/department.service';
import { Department } from '@/lib/types/employee';
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

export default function ScheduledReportsPage() {
  const [reports, setReports] = useState<ScheduledReport[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedReport, setSelectedReport] = useState<ScheduledReport | null>(null);
  const [filterActive, setFilterActive] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [formData, setFormData] = useState<ScheduledReportRequest>({
    scheduleName: '',
    reportType: 'EMPLOYEE_DIRECTORY',
    frequency: 'WEEKLY',
    dayOfWeek: 1,
    dayOfMonth: 1,
    timeOfDay: '09:00',
    recipients: [''],
    exportFormat: 'EXCEL',
    isActive: true,
  });

  useEffect(() => {
    loadReports();
    loadDepartments();
  }, []);

  const loadReports = async () => {
    try {
      setLoading(true);
      const response = await scheduledReportService.getAll();
      setReports(response.content);
    } catch (error) {
      console.error('Error loading scheduled reports:', error);
      alert('Failed to load scheduled reports');
    } finally {
      setLoading(false);
    }
  };

  const loadDepartments = async () => {
    try {
      const depts = await departmentService.getActiveDepartments();
      setDepartments(depts);
    } catch (error) {
      console.error('Error loading departments:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Filter out empty recipients
    const filteredRecipients = formData.recipients.filter(r => r.trim() !== '');
    if (filteredRecipients.length === 0) {
      alert('Please add at least one recipient email');
      return;
    }

    try {
      setLoading(true);
      const dataToSubmit = {
        ...formData,
        recipients: filteredRecipients,
        dayOfWeek: formData.frequency === 'WEEKLY' ? formData.dayOfWeek : undefined,
        dayOfMonth: formData.frequency === 'MONTHLY' ? formData.dayOfMonth : undefined,
      };

      if (selectedReport) {
        await scheduledReportService.update(selectedReport.id, dataToSubmit);
      } else {
        await scheduledReportService.create(dataToSubmit);
      }

      setShowModal(false);
      resetForm();
      await loadReports();
    } catch (error: unknown) {
      alert((error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to save scheduled report');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedReport) return;
    try {
      setLoading(true);
      await scheduledReportService.delete(selectedReport.id);
      setShowDeleteConfirm(false);
      setSelectedReport(null);
      await loadReports();
    } catch (error: unknown) {
      alert((error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to delete scheduled report');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (report: ScheduledReport) => {
    try {
      await scheduledReportService.toggleStatus(report.id);
      await loadReports();
    } catch (error: unknown) {
      alert((error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to toggle report status');
    }
  };

  const openEditModal = (report: ScheduledReport) => {
    setSelectedReport(report);
    setFormData({
      scheduleName: report.scheduleName,
      reportType: report.reportType,
      frequency: report.frequency,
      dayOfWeek: report.dayOfWeek || 1,
      dayOfMonth: report.dayOfMonth || 1,
      timeOfDay: report.timeOfDay,
      recipients: report.recipients.length > 0 ? report.recipients : [''],
      departmentId: report.departmentId,
      status: report.status,
      exportFormat: report.exportFormat,
      isActive: report.isActive,
    });
    setShowModal(true);
  };

  const openDeleteConfirm = (report: ScheduledReport) => {
    setSelectedReport(report);
    setShowDeleteConfirm(true);
  };

  const resetForm = () => {
    setSelectedReport(null);
    setFormData({
      scheduleName: '',
      reportType: 'EMPLOYEE_DIRECTORY',
      frequency: 'WEEKLY',
      dayOfWeek: 1,
      dayOfMonth: 1,
      timeOfDay: '09:00',
      recipients: [''],
      exportFormat: 'EXCEL',
      isActive: true,
    });
  };

  const addRecipient = () => {
    setFormData({ ...formData, recipients: [...formData.recipients, ''] });
  };

  const removeRecipient = (index: number) => {
    const newRecipients = formData.recipients.filter((_, i) => i !== index);
    setFormData({ ...formData, recipients: newRecipients.length > 0 ? newRecipients : [''] });
  };

  const updateRecipient = (index: number, value: string) => {
    const newRecipients = [...formData.recipients];
    newRecipients[index] = value;
    setFormData({ ...formData, recipients: newRecipients });
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
              resetForm();
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
                  resetForm();
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
                <form onSubmit={handleSubmit}>
                  <div className="space-y-4">
                    {/* Schedule Name */}
                    <div>
                      <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                        Schedule Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.scheduleName}
                        onChange={(e) => setFormData({ ...formData, scheduleName: e.target.value })}
                        className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-surface-800"
                        placeholder="e.g., Weekly Attendance Report"
                      />
                    </div>

                    {/* Report Type */}
                    <div>
                      <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                        Report Type *
                      </label>
                      <select
                        required
                        value={formData.reportType}
                        onChange={(e) => setFormData({ ...formData, reportType: e.target.value as ReportType })}
                        className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-surface-800"
                      >
                        {Object.entries(REPORT_TYPE_LABELS).map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                    </div>

                    {/* Frequency */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                          Frequency *
                        </label>
                        <select
                          required
                          value={formData.frequency}
                          onChange={(e) => setFormData({ ...formData, frequency: e.target.value as Frequency })}
                          className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-surface-800"
                        >
                          {Object.entries(FREQUENCY_LABELS).map(([value, label]) => (
                            <option key={value} value={value}>{label}</option>
                          ))}
                        </select>
                      </div>

                      {/* Day Selection based on frequency */}
                      {formData.frequency === 'WEEKLY' && (
                        <div>
                          <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                            Day of Week *
                          </label>
                          <select
                            required
                            value={formData.dayOfWeek}
                            onChange={(e) => setFormData({ ...formData, dayOfWeek: parseInt(e.target.value) })}
                            className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-surface-800"
                          >
                            {Object.entries(DAY_OF_WEEK_LABELS).map(([value, label]) => (
                              <option key={value} value={value}>{label}</option>
                            ))}
                          </select>
                        </div>
                      )}

                      {formData.frequency === 'MONTHLY' && (
                        <div>
                          <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                            Day of Month *
                          </label>
                          <select
                            required
                            value={formData.dayOfMonth}
                            onChange={(e) => setFormData({ ...formData, dayOfMonth: parseInt(e.target.value) })}
                            className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-surface-800"
                          >
                            {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                              <option key={day} value={day}>{day}</option>
                            ))}
                          </select>
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
                          required
                          value={formData.timeOfDay}
                          onChange={(e) => setFormData({ ...formData, timeOfDay: e.target.value })}
                          className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-surface-800"
                        />
                      </div>

                      {/* Export Format */}
                      <div>
                        <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                          Export Format *
                        </label>
                        <select
                          required
                          value={formData.exportFormat}
                          onChange={(e) => setFormData({ ...formData, exportFormat: e.target.value as ExportFormat })}
                          className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-surface-800"
                        >
                          <option value="EXCEL">Excel (.xlsx)</option>
                          <option value="PDF">PDF</option>
                          <option value="CSV">CSV</option>
                        </select>
                      </div>
                    </div>

                    {/* Department Filter (optional) */}
                    <div>
                      <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                        Filter by Department (optional)
                      </label>
                      <select
                        value={formData.departmentId || ''}
                        onChange={(e) => setFormData({ ...formData, departmentId: e.target.value || undefined })}
                        className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-surface-800"
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
                        {formData.recipients.map((email, index) => (
                          <div key={index} className="flex gap-2">
                            <input
                              type="email"
                              value={email}
                              onChange={(e) => updateRecipient(index, e.target.value)}
                              className="flex-1 px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-surface-800"
                              placeholder="email@example.com"
                            />
                            {formData.recipients.length > 1 && (
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
                          onClick={addRecipient}
                          className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
                        >
                          <Plus className="h-4 w-4" />
                          Add another recipient
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-4 mt-6">
                    <button
                      type="button"
                      onClick={() => {
                        setShowModal(false);
                        resetForm();
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
