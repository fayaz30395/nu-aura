'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { attendanceService } from '@/lib/services/attendance.service';
import { Holiday, HolidayRequest, HolidayType } from '@/lib/types/attendance';
import { useAuth } from '@/lib/hooks/useAuth';
import { usePermissions, Roles } from '@/lib/hooks/usePermissions';

const ADMIN_ACCESS_ROLES = [Roles.SUPER_ADMIN, Roles.TENANT_ADMIN, Roles.HR_ADMIN, Roles.HR_MANAGER];

export default function HolidayCalendarManagementPage() {
  const router = useRouter();
  const { isAuthenticated, hasHydrated } = useAuth();
  const { hasAnyRole, isReady } = usePermissions();
  const currentYear = new Date().getFullYear();

  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState<HolidayRequest>({
    holidayName: '',
    holidayDate: '',
    holidayType: 'NATIONAL',
    description: '',
    isOptional: false,
    isRestricted: false,
    applicableLocations: '',
    applicableDepartments: '',
  });

  useEffect(() => {
    if (!hasHydrated || !isReady) return;

    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }

    if (!hasAnyRole(...ADMIN_ACCESS_ROLES)) {
      router.push('/home');
      return;
    }

    loadHolidays();
  }, [selectedYear, hasHydrated, isReady, isAuthenticated, router, hasAnyRole]);

  const loadHolidays = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await attendanceService.getHolidaysByYear(selectedYear);
      setHolidays(data);
    } catch (err: unknown) {
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to load holidays');
      console.error('Error loading holidays:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError(null);

      const submitData: HolidayRequest = {
        holidayName: formData.holidayName,
        holidayDate: formData.holidayDate,
        holidayType: formData.holidayType,
        description: formData.description || undefined,
        isOptional: formData.isOptional || false,
        isRestricted: formData.isRestricted || false,
        applicableLocations: formData.applicableLocations || undefined,
        applicableDepartments: formData.applicableDepartments || undefined,
      };

      if (editingHoliday) {
        await attendanceService.updateHoliday(editingHoliday.id, submitData);
      } else {
        await attendanceService.createHoliday(submitData);
      }

      await loadHolidays();
      resetForm();
      setShowModal(false);
      setEditingHoliday(null);
    } catch (err: unknown) {
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || `Failed to ${editingHoliday ? 'update' : 'create'} holiday`);
      console.error('Error saving holiday:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      holidayName: '',
      holidayDate: '',
      holidayType: 'NATIONAL',
      description: '',
      isOptional: false,
      isRestricted: false,
      applicableLocations: '',
      applicableDepartments: '',
    });
  };

  const handleEdit = (holiday: Holiday) => {
    setEditingHoliday(holiday);
    setFormData({
      holidayName: holiday.holidayName,
      holidayDate: holiday.holidayDate,
      holidayType: holiday.holidayType,
      description: holiday.description || '',
      isOptional: holiday.isOptional,
      isRestricted: holiday.isRestricted,
      applicableLocations: holiday.applicableLocations || '',
      applicableDepartments: holiday.applicableDepartments || '',
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this holiday? This action cannot be undone.')) return;

    try {
      setError(null);
      await attendanceService.deleteHoliday(id);
      await loadHolidays();
    } catch (err: unknown) {
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to delete holiday');
      console.error('Error deleting holiday:', err);
    }
  };

  const holidayTypes: HolidayType[] = ['NATIONAL', 'REGIONAL', 'OPTIONAL', 'RESTRICTED', 'FESTIVAL', 'COMPANY_EVENT'];

  const getHolidayTypeColor = (type: HolidayType) => {
    const colors: Record<HolidayType, string> = {
      NATIONAL: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
      REGIONAL: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
      OPTIONAL: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
      RESTRICTED: 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300',
      FESTIVAL: 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300',
      COMPANY_EVENT: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
    };
    return colors[type];
  };

  const getMonthName = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', { month: 'long' });
  };

  // Group holidays by month
  const holidaysByMonth = holidays.reduce((acc, holiday) => {
    const month = getMonthName(holiday.holidayDate);
    if (!acc[month]) {
      acc[month] = [];
    }
    acc[month].push(holiday);
    return acc;
  }, {} as Record<string, Holiday[]>);

  const months = Object.keys(holidaysByMonth).sort((a, b) => {
    const monthADate = holidaysByMonth[a]?.[0]?.holidayDate;
    const monthBDate = holidaysByMonth[b]?.[0]?.holidayDate;
    if (!monthADate || !monthBDate) return 0;
    return new Date(monthADate).getMonth() - new Date(monthBDate).getMonth();
  });

  return (
    <>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-surface-900 dark:text-surface-100">Holiday Calendar Management</h1>
            <p className="mt-1 text-sm text-surface-600 dark:text-surface-400">
              Manage organizational holidays and events
            </p>
          </div>
          <div className="flex items-center space-x-4">
            {/* Year Selector */}
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="px-4 py-2 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 border border-surface-300 dark:border-surface-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {[currentYear - 1, currentYear, currentYear + 1, currentYear + 2].map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
            <button
              onClick={() => {
                resetForm();
                setEditingHoliday(null);
                setFormData({ ...formData, holidayDate: `${selectedYear}-01-01` });
                setShowModal(true);
              }}
              className="bg-primary-500 text-white px-4 py-2 rounded-md hover:bg-primary-600 transition-colors"
            >
              + Add Holiday
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded relative">
            <span className="block sm:inline">{error}</span>
            <button
              onClick={() => setError(null)}
              className="absolute top-0 bottom-0 right-0 px-4 py-3"
            >
              <span className="text-red-500 dark:text-red-400 text-xl">&times;</span>
            </button>
          </div>
        )}

        {/* Statistics */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-surface-900 p-4 rounded-lg shadow">
            <div className="text-sm text-surface-600 dark:text-surface-400">Total Holidays</div>
            <div className="text-2xl font-bold text-surface-900 dark:text-surface-100">{holidays.length}</div>
          </div>
          <div className="bg-white dark:bg-surface-900 p-4 rounded-lg shadow">
            <div className="text-sm text-surface-600 dark:text-surface-400">National</div>
            <div className="text-2xl font-bold text-red-600">
              {holidays.filter((h) => h.holidayType === 'NATIONAL').length}
            </div>
          </div>
          <div className="bg-white dark:bg-surface-900 p-4 rounded-lg shadow">
            <div className="text-sm text-surface-600 dark:text-surface-400">Optional</div>
            <div className="text-2xl font-bold text-yellow-600">
              {holidays.filter((h) => h.isOptional).length}
            </div>
          </div>
          <div className="bg-white dark:bg-surface-900 p-4 rounded-lg shadow">
            <div className="text-sm text-surface-600 dark:text-surface-400">Restricted</div>
            <div className="text-2xl font-bold text-orange-600">
              {holidays.filter((h) => h.isRestricted).length}
            </div>
          </div>
        </div>

        {/* Holidays List */}
        <div className="bg-white dark:bg-surface-900 rounded-lg shadow dark:shadow-surface-950/50">
          {loading ? (
            <div className="px-6 py-12 text-center text-surface-500 dark:text-surface-400">
              Loading holidays for {selectedYear}...
            </div>
          ) : holidays.length === 0 ? (
            <div className="px-6 py-12 text-center text-surface-500 dark:text-surface-400">
              <div className="flex flex-col items-center">
                <svg className="h-12 w-12 text-surface-400 dark:text-surface-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-surface-600 dark:text-surface-400">No holidays configured for {selectedYear}</p>
                <p className="text-sm text-surface-500 dark:text-surface-500 mt-1">Click &quot;Add Holiday&quot; to create your first holiday</p>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-surface-200 dark:divide-surface-700">
              {months.map((month) => (
                <div key={month} className="p-6">
                  <h3 className="text-lg font-semibold text-surface-900 dark:text-surface-100 mb-4">{month}</h3>
                  <div className="space-y-3">
                    {(holidaysByMonth[month] ?? []).map((holiday) => (
                      <div
                        key={holiday.id}
                        className="flex items-center justify-between p-4 bg-surface-50 dark:bg-surface-800/50 rounded-lg hover:bg-surface-100 dark:bg-surface-800 transition-colors"
                      >
                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            <div className="text-center min-w-16">
                              <div className="text-2xl font-bold text-surface-900 dark:text-surface-100">
                                {new Date(holiday.holidayDate).getDate()}
                              </div>
                              <div className="text-xs text-surface-500 dark:text-surface-400 uppercase">
                                {new Date(holiday.holidayDate).toLocaleDateString('en-US', { weekday: 'short' })}
                              </div>
                            </div>
                            <div className="flex-1">
                              <div className="font-medium text-surface-900 dark:text-surface-100">{holiday.holidayName}</div>
                              {holiday.description && (
                                <div className="text-sm text-surface-600 dark:text-surface-400 mt-1">{holiday.description}</div>
                              )}
                              <div className="flex flex-wrap gap-2 mt-2">
                                <span className={`px-2 py-1 text-xs font-semibold rounded ${getHolidayTypeColor(holiday.holidayType)}`}>
                                  {holiday.holidayType.replace('_', ' ')}
                                </span>
                                {holiday.isOptional && (
                                  <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300 font-semibold rounded">
                                    Optional
                                  </span>
                                )}
                                {holiday.isRestricted && (
                                  <span className="px-2 py-1 text-xs bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300 font-semibold rounded">
                                    Restricted
                                  </span>
                                )}
                                {holiday.applicableLocations && (
                                  <span className="px-2 py-1 text-xs bg-surface-200 dark:bg-surface-700 text-surface-700 dark:text-surface-300 rounded">
                                    {holiday.applicableLocations}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleEdit(holiday)}
                            className="text-primary-600 hover:text-blue-900 px-3 py-1"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(holiday.id)}
                            className="text-red-600 hover:text-red-900 px-3 py-1"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add/Edit Holiday Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-surface-900 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-surface-900 dark:text-surface-100">
                    {editingHoliday ? 'Edit Holiday' : 'Add New Holiday'}
                  </h2>
                  <button
                    onClick={() => {
                      setShowModal(false);
                      setEditingHoliday(null);
                      resetForm();
                    }}
                    className="text-surface-400 dark:text-surface-500 hover:text-surface-600 dark:hover:text-surface-300"
                  >
                    <span className="text-2xl">&times;</span>
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Basic Information */}
                  <div>
                    <h3 className="text-lg font-medium text-surface-900 dark:text-surface-100 mb-4">Holiday Information</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                          Holiday Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.holidayName}
                          onChange={(e) => setFormData({ ...formData, holidayName: e.target.value })}
                          className="w-full px-3 py-2 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 border border-surface-300 dark:border-surface-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                          placeholder="New Year's Day, Independence Day"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                            Date *
                          </label>
                          <input
                            type="date"
                            required
                            value={formData.holidayDate}
                            onChange={(e) => setFormData({ ...formData, holidayDate: e.target.value })}
                            className="w-full px-3 py-2 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 border border-surface-300 dark:border-surface-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                            Holiday Type *
                          </label>
                          <select
                            value={formData.holidayType}
                            onChange={(e) => setFormData({ ...formData, holidayType: e.target.value as HolidayType })}
                            className="w-full px-3 py-2 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 border border-surface-300 dark:border-surface-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                          >
                            {holidayTypes.map((type) => (
                              <option key={type} value={type}>
                                {type.replace('_', ' ')}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                          Description
                        </label>
                        <textarea
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          rows={2}
                          className="w-full px-3 py-2 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 border border-surface-300 dark:border-surface-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                          placeholder="Brief description of the holiday..."
                        />
                      </div>
                    </div>
                  </div>

                  {/* Settings */}
                  <div>
                    <h3 className="text-lg font-medium text-surface-900 dark:text-surface-100 mb-4">Settings</h3>
                    <div className="space-y-3">
                      <label className="flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.isOptional}
                          onChange={(e) => setFormData({ ...formData, isOptional: e.target.checked })}
                          className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-surface-300 dark:border-surface-600 rounded"
                        />
                        <span className="ml-2 text-sm text-surface-700 dark:text-surface-300">Optional Holiday</span>
                        <span className="ml-2 text-xs text-surface-500 dark:text-surface-400">(Employees can choose to work)</span>
                      </label>

                      <label className="flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.isRestricted}
                          onChange={(e) => setFormData({ ...formData, isRestricted: e.target.checked })}
                          className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-surface-300 dark:border-surface-600 rounded"
                        />
                        <span className="ml-2 text-sm text-surface-700 dark:text-surface-300">Restricted Holiday</span>
                        <span className="ml-2 text-xs text-surface-500 dark:text-surface-400">(Limited to certain employees)</span>
                      </label>
                    </div>
                  </div>

                  {/* Applicability */}
                  <div>
                    <h3 className="text-lg font-medium text-surface-900 dark:text-surface-100 mb-4">Applicability (Optional)</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                          Applicable Locations
                        </label>
                        <input
                          type="text"
                          value={formData.applicableLocations}
                          onChange={(e) => setFormData({ ...formData, applicableLocations: e.target.value })}
                          className="w-full px-3 py-2 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 border border-surface-300 dark:border-surface-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                          placeholder="e.g., New York, California (comma-separated)"
                        />
                        <p className="text-xs text-surface-500 dark:text-surface-400 mt-1">Leave empty for all locations</p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                          Applicable Departments
                        </label>
                        <input
                          type="text"
                          value={formData.applicableDepartments}
                          onChange={(e) => setFormData({ ...formData, applicableDepartments: e.target.value })}
                          className="w-full px-3 py-2 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 border border-surface-300 dark:border-surface-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                          placeholder="e.g., Engineering, Sales (comma-separated)"
                        />
                        <p className="text-xs text-surface-500 dark:text-surface-400 mt-1">Leave empty for all departments</p>
                      </div>
                    </div>
                  </div>

                  {/* Form Actions */}
                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => {
                        setShowModal(false);
                        setEditingHoliday(null);
                        resetForm();
                      }}
                      className="px-4 py-2 border border-surface-300 dark:border-surface-600 rounded-md text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-800/50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-4 py-2 bg-primary-500 text-white rounded-md hover:bg-primary-600 disabled:opacity-50"
                    >
                      {submitting ? 'Saving...' : (editingHoliday ? 'Update' : 'Create')} Holiday
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
