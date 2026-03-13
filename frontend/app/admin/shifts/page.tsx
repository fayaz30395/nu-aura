'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { shiftsApi } from '@/lib/api/shifts';
import { Shift, CreateShiftRequest } from '@/lib/types/shifts';
import { Clock, Plus, Edit, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import { useAuth } from '@/lib/hooks/useAuth';
import { usePermissions, Roles } from '@/lib/hooks/usePermissions';

const ADMIN_ACCESS_ROLES = [Roles.SUPER_ADMIN, Roles.TENANT_ADMIN, Roles.HR_ADMIN, Roles.HR_MANAGER];

export default function ShiftsManagementPage() {
  const router = useRouter();
  const { isAuthenticated, hasHydrated } = useAuth();
  const { hasAnyRole, isReady } = usePermissions();
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState<CreateShiftRequest>({
    shiftCode: '',
    shiftName: '',
    description: '',
    startTime: '09:00:00',
    endTime: '18:00:00',
    gracePeriodInMinutes: 15,
    lateMarkAfterMinutes: 30,
    halfDayAfterMinutes: 240,
    fullDayHours: 8,
    breakDurationMinutes: 60,
    isNightShift: false,
    workingDays: 'MONDAY,TUESDAY,WEDNESDAY,THURSDAY,FRIDAY',
    isActive: true,
    shiftType: 'REGULAR',
    colorCode: '#3B82F6',
    allowsOvertime: true,
    overtimeMultiplier: 1.5,
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

    loadShifts();
  }, [hasHydrated, isReady, isAuthenticated, router, hasAnyRole]);

  const loadShifts = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await shiftsApi.getAllShifts({ page: 0, size: 100 });
      setShifts(response.content);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load shifts');
      console.error('Error loading shifts:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError(null);

      if (editingShift) {
        await shiftsApi.updateShift(editingShift.id, formData);
      } else {
        await shiftsApi.createShift(formData);
      }

      await loadShifts();
      resetForm();
      setShowModal(false);
      setEditingShift(null);
    } catch (err: any) {
      setError(err.response?.data?.message || `Failed to ${editingShift ? 'update' : 'create'} shift`);
      console.error('Error saving shift:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      shiftCode: '',
      shiftName: '',
      description: '',
      startTime: '09:00:00',
      endTime: '18:00:00',
      gracePeriodInMinutes: 15,
      lateMarkAfterMinutes: 30,
      halfDayAfterMinutes: 240,
      fullDayHours: 8,
      breakDurationMinutes: 60,
      isNightShift: false,
      workingDays: 'MONDAY,TUESDAY,WEDNESDAY,THURSDAY,FRIDAY',
      isActive: true,
      shiftType: 'REGULAR',
      colorCode: '#3B82F6',
      allowsOvertime: true,
      overtimeMultiplier: 1.5,
    });
  };

  const handleEdit = (shift: Shift) => {
    setEditingShift(shift);
    setFormData({
      shiftCode: shift.shiftCode,
      shiftName: shift.shiftName,
      description: shift.description || '',
      startTime: shift.startTime,
      endTime: shift.endTime,
      gracePeriodInMinutes: shift.gracePeriodInMinutes || 0,
      lateMarkAfterMinutes: shift.lateMarkAfterMinutes || 0,
      halfDayAfterMinutes: shift.halfDayAfterMinutes || 0,
      fullDayHours: shift.fullDayHours || 8,
      breakDurationMinutes: shift.breakDurationMinutes || 0,
      isNightShift: shift.isNightShift || false,
      workingDays: shift.workingDays || '',
      isActive: shift.isActive,
      shiftType: shift.shiftType || 'REGULAR',
      colorCode: shift.colorCode || '#3B82F6',
      allowsOvertime: shift.allowsOvertime || false,
      overtimeMultiplier: shift.overtimeMultiplier || 1.5,
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this shift? This action cannot be undone.')) return;

    try {
      setError(null);
      await shiftsApi.deleteShift(id);
      await loadShifts();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete shift');
      console.error('Error deleting shift:', err);
    }
  };

  const handleToggleActive = async (shift: Shift) => {
    try {
      setError(null);
      await shiftsApi.updateShift(shift.id, { isActive: !shift.isActive });
      await loadShifts();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update shift status');
      console.error('Error toggling shift status:', err);
    }
  };

  const formatTime = (time: string) => {
    if (!time) return '';
    return time.substring(0, 5);
  };

  return (
    <>
      <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Clock className="h-8 w-8 text-primary-600" />
                Shift Management
              </h1>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Configure and manage work shifts for your organization
              </p>
            </div>
            <button
              onClick={() => {
                resetForm();
                setEditingShift(null);
                setShowModal(true);
              }}
              className="flex items-center gap-2 bg-primary-500 text-white px-4 py-2 rounded-lg hover:bg-primary-600 transition-colors shadow-lg hover:shadow-xl"
            >
              <Plus className="h-5 w-5" />
              Add Shift
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg relative animate-in fade-in slide-in-from-top-2 duration-300">
              <span className="block sm:inline">{error}</span>
              <button
                onClick={() => setError(null)}
                className="absolute top-0 bottom-0 right-0 px-4 py-3"
              >
                <span className="text-red-500 text-xl">&times;</span>
              </button>
            </div>
          )}

          {/* Shifts Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {loading ? (
              <div className="col-span-full flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
              </div>
            ) : shifts.length === 0 ? (
              <div className="col-span-full flex flex-col items-center py-12 text-gray-500 dark:text-gray-400">
                <Clock className="h-16 w-16 text-gray-400 dark:text-gray-600 mb-4" />
                <p className="text-lg font-medium">No shifts configured</p>
                <p className="text-sm mt-1">Click &quot;Add Shift&quot; to create your first shift</p>
              </div>
            ) : (
              shifts.map((shift) => (
                <div
                  key={shift.id}
                  className="bg-white dark:bg-surface-800 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden"
                  style={{ borderTop: `4px solid ${shift.colorCode || '#3B82F6'}` }}
                >
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">{shift.shiftName}</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{shift.shiftCode}</p>
                      </div>
                      <span
                        className={`px-3 py-1 text-xs font-semibold rounded-full ${
                          shift.isActive
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400'
                            : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400'
                        }`}
                      >
                        {shift.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>

                    {shift.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{shift.description}</p>
                    )}

                    <div className="space-y-2 mb-4">
                      <div className="flex items-center text-sm">
                        <Clock className="h-4 w-4 text-surface-600 dark:text-surface-400 mr-2" />
                        <span className="text-surface-700 dark:text-surface-300">
                          {formatTime(shift.startTime)} - {formatTime(shift.endTime)}
                        </span>
                      </div>
                      {(shift.breakDurationMinutes ?? 0) > 0 && (
                        <div className="text-sm text-surface-600 dark:text-surface-400">
                          Break: {shift.breakDurationMinutes} min
                        </div>
                      )}
                      <div className="text-sm text-surface-600 dark:text-surface-400">
                        Working Hours: {shift.netWorkingHours || shift.fullDayHours}h
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-4">
                      {shift.isNightShift && (
                        <span className="px-2 py-1 text-xs bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-400 rounded">
                          Night Shift
                        </span>
                      )}
                      {shift.allowsOvertime && (
                        <span className="px-2 py-1 text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-400 rounded">
                          OT: {shift.overtimeMultiplier}x
                        </span>
                      )}
                      {(shift.gracePeriodInMinutes ?? 0) > 0 && (
                        <span className="px-2 py-1 text-xs bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 rounded">
                          Grace: {shift.gracePeriodInMinutes}m
                        </span>
                      )}
                    </div>

                    <div className="flex justify-end gap-2 pt-4 border-t border-surface-200 dark:border-surface-700">
                      <button
                        onClick={() => handleEdit(shift)}
                        className="p-2 text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-950/30 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleToggleActive(shift)}
                        className="p-2 text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/30 rounded-lg transition-colors"
                        title={shift.isActive ? 'Deactivate' : 'Activate'}
                      >
                        {shift.isActive ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
                      </button>
                      <button
                        onClick={() => handleDelete(shift.id)}
                        className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Add/Edit Shift Modal */}
          {showModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white dark:bg-slate-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
                <div className="p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                      {editingShift ? 'Edit Shift' : 'Add New Shift'}
                    </h2>
                    <button
                      onClick={() => {
                        setShowModal(false);
                        setEditingShift(null);
                        resetForm();
                      }}
                      className="text-gray-400 hover:text-gray-500"
                    >
                      <span className="text-2xl">&times;</span>
                    </button>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Basic Information */}
                    <div className="border-b border-surface-200 dark:border-surface-700 pb-4">
                      <h3 className="text-lg font-medium text-surface-900 dark:text-white mb-4">Basic Information</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                            Shift Code *
                          </label>
                          <input
                            type="text"
                            required
                            value={formData.shiftCode}
                            onChange={(e) => setFormData({ ...formData, shiftCode: e.target.value })}
                            className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-slate-700 dark:text-white"
                            placeholder="DS, NS, GS"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                            Shift Name *
                          </label>
                          <input
                            type="text"
                            required
                            value={formData.shiftName}
                            onChange={(e) => setFormData({ ...formData, shiftName: e.target.value })}
                            className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-slate-700 dark:text-white"
                            placeholder="Day Shift, Night Shift"
                          />
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                            Shift Type
                          </label>
                          <select
                            value={formData.shiftType}
                            onChange={(e) => setFormData({ ...formData, shiftType: e.target.value })}
                            className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-slate-700 dark:text-white"
                          >
                            <option value="REGULAR">Regular</option>
                            <option value="ROTATIONAL">Rotational</option>
                            <option value="FLEXIBLE">Flexible</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                            Color Code
                          </label>
                          <input
                            type="color"
                            value={formData.colorCode}
                            onChange={(e) => setFormData({ ...formData, colorCode: e.target.value })}
                            className="w-full h-10 px-2 py-1 border border-surface-300 dark:border-surface-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-slate-700"
                          />
                        </div>
                      </div>

                      <div className="mt-4">
                        <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                          Description
                        </label>
                        <textarea
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          rows={2}
                          className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-slate-700 dark:text-white"
                          placeholder="Brief description of this shift..."
                        />
                      </div>
                    </div>

                    {/* Shift Timing */}
                    <div className="border-b border-surface-200 dark:border-surface-700 pb-4">
                      <h3 className="text-lg font-medium text-surface-900 dark:text-white mb-4">Shift Timing</h3>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Start Time *
                          </label>
                          <input
                            type="time"
                            required
                            value={formatTime(formData.startTime)}
                            onChange={(e) => setFormData({ ...formData, startTime: e.target.value + ':00' })}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-surface-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            End Time *
                          </label>
                          <input
                            type="time"
                            required
                            value={formatTime(formData.endTime)}
                            onChange={(e) => setFormData({ ...formData, endTime: e.target.value + ':00' })}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-surface-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Break (minutes)
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={formData.breakDurationMinutes}
                            onChange={(e) =>
                              setFormData({ ...formData, breakDurationMinutes: parseInt(e.target.value) || 0 })
                            }
                            className="w-full px-3 py-2 border border-gray-300 dark:border-surface-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-white"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mt-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Full Day Hours
                          </label>
                          <input
                            type="number"
                            step="0.5"
                            min="0"
                            value={formData.fullDayHours}
                            onChange={(e) => setFormData({ ...formData, fullDayHours: parseFloat(e.target.value) || 8 })}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-surface-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Working Days
                          </label>
                          <input
                            type="text"
                            value={formData.workingDays}
                            onChange={(e) => setFormData({ ...formData, workingDays: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-surface-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-white"
                            placeholder="MONDAY,TUESDAY,WEDNESDAY"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Attendance Rules */}
                    <div className="border-b border-surface-200 dark:border-surface-700 pb-4">
                      <h3 className="text-lg font-medium text-surface-900 dark:text-white mb-4">Attendance Rules</h3>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Grace Period (min)
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={formData.gracePeriodInMinutes}
                            onChange={(e) =>
                              setFormData({ ...formData, gracePeriodInMinutes: parseInt(e.target.value) || 0 })
                            }
                            className="w-full px-3 py-2 border border-gray-300 dark:border-surface-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Late Mark After (min)
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={formData.lateMarkAfterMinutes}
                            onChange={(e) =>
                              setFormData({ ...formData, lateMarkAfterMinutes: parseInt(e.target.value) || 0 })
                            }
                            className="w-full px-3 py-2 border border-gray-300 dark:border-surface-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Half Day After (min)
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={formData.halfDayAfterMinutes}
                            onChange={(e) =>
                              setFormData({ ...formData, halfDayAfterMinutes: parseInt(e.target.value) || 0 })
                            }
                            className="w-full px-3 py-2 border border-gray-300 dark:border-surface-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-white"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Shift Properties */}
                    <div className="border-b border-surface-200 dark:border-surface-700 pb-4">
                      <h3 className="text-lg font-medium text-surface-900 dark:text-white mb-4">Shift Properties</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-3">
                          <label className="flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={formData.isNightShift}
                              onChange={(e) => setFormData({ ...formData, isNightShift: e.target.checked })}
                              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-surface-300 dark:border-surface-600 rounded"
                            />
                            <span className="ml-2 text-sm text-surface-700 dark:text-surface-300">Night Shift</span>
                          </label>

                          <label className="flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={formData.allowsOvertime}
                              onChange={(e) => setFormData({ ...formData, allowsOvertime: e.target.checked })}
                              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-surface-300 dark:border-surface-600 rounded"
                            />
                            <span className="ml-2 text-sm text-surface-700 dark:text-surface-300">Allows Overtime</span>
                          </label>

                          <label className="flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={formData.isActive}
                              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-surface-300 dark:border-surface-600 rounded"
                            />
                            <span className="ml-2 text-sm text-surface-700 dark:text-surface-300">Active</span>
                          </label>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Overtime Multiplier
                          </label>
                          <input
                            type="number"
                            step="0.1"
                            min="1"
                            value={formData.overtimeMultiplier}
                            onChange={(e) =>
                              setFormData({ ...formData, overtimeMultiplier: parseFloat(e.target.value) || 1.5 })
                            }
                            className="w-full px-3 py-2 border border-gray-300 dark:border-surface-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-white"
                            disabled={!formData.allowsOvertime}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Form Actions */}
                    <div className="flex justify-end space-x-3">
                      <button
                        type="button"
                        onClick={() => {
                          setShowModal(false);
                          setEditingShift(null);
                          resetForm();
                        }}
                        className="px-4 py-2 border border-surface-300 dark:border-surface-600 rounded-md text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-700"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={submitting}
                        className="px-4 py-2 bg-primary-500 text-white rounded-md hover:bg-primary-600 disabled:opacity-50"
                      >
                        {submitting ? 'Saving...' : editingShift ? 'Update' : 'Create'} Shift
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
