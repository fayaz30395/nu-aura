'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { leaveService } from '@/lib/services/leave.service';
import { LeaveType, LeaveTypeRequest, AccrualType, GenderSpecific } from '@/lib/types/leave';

export default function LeaveTypesManagementPage() {
  const router = useRouter();
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingLeaveType, setEditingLeaveType] = useState<LeaveType | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState<LeaveTypeRequest>({
    leaveCode: '',
    leaveName: '',
    description: '',
    isPaid: true,
    colorCode: '#3B82F6',
    annualQuota: 0,
    maxConsecutiveDays: undefined,
    minDaysNotice: 0,
    maxDaysPerRequest: undefined,
    isCarryForwardAllowed: false,
    maxCarryForwardDays: undefined,
    isEncashable: false,
    requiresDocument: false,
    applicableAfterDays: 0,
    accrualType: undefined,
    accrualRate: undefined,
    genderSpecific: undefined,
  });

  useEffect(() => {
    loadLeaveTypes();
  }, []);

  const loadLeaveTypes = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await leaveService.getAllLeaveTypes(0, 100);
      setLeaveTypes(response.content);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load leave types');
      console.error('Error loading leave types:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError(null);

      const submitData: LeaveTypeRequest = {
        leaveCode: formData.leaveCode,
        leaveName: formData.leaveName,
        description: formData.description || undefined,
        isPaid: formData.isPaid,
        colorCode: formData.colorCode || undefined,
        annualQuota: formData.annualQuota || undefined,
        maxConsecutiveDays: formData.maxConsecutiveDays || undefined,
        minDaysNotice: formData.minDaysNotice || 0,
        maxDaysPerRequest: formData.maxDaysPerRequest || undefined,
        isCarryForwardAllowed: formData.isCarryForwardAllowed,
        maxCarryForwardDays: formData.maxCarryForwardDays || undefined,
        isEncashable: formData.isEncashable,
        requiresDocument: formData.requiresDocument,
        applicableAfterDays: formData.applicableAfterDays || 0,
        accrualType: formData.accrualType || undefined,
        accrualRate: formData.accrualRate || undefined,
        genderSpecific: formData.genderSpecific || undefined,
      };

      if (editingLeaveType) {
        await leaveService.updateLeaveType(editingLeaveType.id, submitData);
      } else {
        await leaveService.createLeaveType(submitData);
      }

      await loadLeaveTypes();
      resetForm();
      setShowModal(false);
      setEditingLeaveType(null);
    } catch (err: any) {
      setError(err.response?.data?.message || `Failed to ${editingLeaveType ? 'update' : 'create'} leave type`);
      console.error('Error saving leave type:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      leaveCode: '',
      leaveName: '',
      description: '',
      isPaid: true,
      colorCode: '#3B82F6',
      annualQuota: 0,
      maxConsecutiveDays: undefined,
      minDaysNotice: 0,
      maxDaysPerRequest: undefined,
      isCarryForwardAllowed: false,
      maxCarryForwardDays: undefined,
      isEncashable: false,
      requiresDocument: false,
      applicableAfterDays: 0,
      accrualType: undefined,
      accrualRate: undefined,
      genderSpecific: undefined,
    });
  };

  const handleEdit = (leaveType: LeaveType) => {
    setEditingLeaveType(leaveType);
    setFormData({
      leaveCode: leaveType.leaveCode,
      leaveName: leaveType.leaveName,
      description: leaveType.description || '',
      isPaid: leaveType.isPaid,
      colorCode: leaveType.colorCode || '#3B82F6',
      annualQuota: leaveType.annualQuota || 0,
      maxConsecutiveDays: leaveType.maxConsecutiveDays,
      minDaysNotice: leaveType.minDaysNotice || 0,
      maxDaysPerRequest: leaveType.maxDaysPerRequest,
      isCarryForwardAllowed: leaveType.isCarryForwardAllowed,
      maxCarryForwardDays: leaveType.maxCarryForwardDays,
      isEncashable: leaveType.isEncashable,
      requiresDocument: leaveType.requiresDocument,
      applicableAfterDays: leaveType.applicableAfterDays || 0,
      accrualType: leaveType.accrualType,
      accrualRate: leaveType.accrualRate,
      genderSpecific: leaveType.genderSpecific,
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this leave type? This action cannot be undone.')) return;

    try {
      setError(null);
      await leaveService.deleteLeaveType(id);
      await loadLeaveTypes();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete leave type');
      console.error('Error deleting leave type:', err);
    }
  };

  const handleToggleActive = async (leaveType: LeaveType) => {
    try {
      setError(null);
      if (leaveType.isActive) {
        await leaveService.deactivateLeaveType(leaveType.id);
      } else {
        await leaveService.activateLeaveType(leaveType.id);
      }
      await loadLeaveTypes();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update leave type status');
      console.error('Error toggling leave type status:', err);
    }
  };

  const accrualTypes: AccrualType[] = ['MONTHLY', 'QUARTERLY', 'YEARLY', 'NO_ACCRUAL'];
  const genderOptions: GenderSpecific[] = ['ALL', 'MALE', 'FEMALE'];

  return (
    <>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-surface-900 dark:text-surface-100">Leave Types Management</h1>
            <p className="mt-1 text-sm text-surface-600 dark:text-surface-400">
              Configure and manage leave types for your organization
            </p>
          </div>
          <button
            onClick={() => {
              resetForm();
              setEditingLeaveType(null);
              setShowModal(true);
            }}
            className="bg-primary-500 text-white px-4 py-2 rounded-md hover:bg-primary-600 transition-colors"
          >
            + Add Leave Type
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative">
            <span className="block sm:inline">{error}</span>
            <button
              onClick={() => setError(null)}
              className="absolute top-0 bottom-0 right-0 px-4 py-3"
            >
              <span className="text-red-500 text-xl">&times;</span>
            </button>
          </div>
        )}

        {/* Leave Types Table */}
        <div className="bg-white dark:bg-surface-900 rounded-lg shadow">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Code & Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Annual Quota
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Properties
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-surface-900 divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    Loading leave types...
                  </td>
                </tr>
              ) : leaveTypes.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center">
                      <svg className="h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      <p className="text-surface-600 dark:text-surface-400">No leave types configured</p>
                      <p className="text-sm text-gray-500 mt-1">Click &quot;Add Leave Type&quot; to create your first leave type</p>
                    </div>
                  </td>
                </tr>
              ) : (
                leaveTypes.map((leaveType) => (
                  <tr key={leaveType.id} className="hover:bg-surface-50 dark:hover:bg-surface-800/50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div
                          className="h-8 w-8 rounded-full mr-3"
                          style={{ backgroundColor: leaveType.colorCode || '#3B82F6' }}
                        />
                        <div>
                          <div className="text-sm font-medium text-surface-900 dark:text-surface-100">{leaveType.leaveName}</div>
                          <div className="text-sm text-gray-500">{leaveType.leaveCode}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${leaveType.isPaid ? 'bg-green-100 text-green-800' : 'bg-surface-100 dark:bg-surface-800 text-surface-800 dark:text-surface-200'}`}>
                        {leaveType.isPaid ? 'Paid' : 'Unpaid'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-surface-900 dark:text-surface-100">
                      {leaveType.annualQuota ? `${leaveType.annualQuota} days` : '-'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {leaveType.isCarryForwardAllowed && (
                          <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">Carry Forward</span>
                        )}
                        {leaveType.isEncashable && (
                          <span className="px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded">Encashable</span>
                        )}
                        {leaveType.requiresDocument && (
                          <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded">Requires Doc</span>
                        )}
                        {leaveType.genderSpecific && leaveType.genderSpecific !== 'ALL' && (
                          <span className="px-2 py-1 text-xs bg-pink-100 text-pink-800 rounded">{leaveType.genderSpecific}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${leaveType.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {leaveType.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleEdit(leaveType)}
                        className="text-primary-600 hover:text-blue-900 mr-3"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleToggleActive(leaveType)}
                        className="text-yellow-600 hover:text-yellow-900 mr-3"
                      >
                        {leaveType.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        onClick={() => handleDelete(leaveType.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Add/Edit Leave Type Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-surface-900 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-surface-900 dark:text-surface-100">
                    {editingLeaveType ? 'Edit Leave Type' : 'Add New Leave Type'}
                  </h2>
                  <button
                    onClick={() => {
                      setShowModal(false);
                      setEditingLeaveType(null);
                      resetForm();
                    }}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <span className="text-2xl">&times;</span>
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Basic Information */}
                  <div className="border-b pb-4">
                    <h3 className="text-lg font-medium text-surface-900 dark:text-surface-100 mb-4">Basic Information</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                          Leave Code *
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.leaveCode}
                          onChange={(e) => setFormData({ ...formData, leaveCode: e.target.value })}
                          className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                          placeholder="AL, SL, CL"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                          Leave Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.leaveName}
                          onChange={(e) => setFormData({ ...formData, leaveName: e.target.value })}
                          className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                          placeholder="Annual Leave, Sick Leave"
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
                        className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                        placeholder="Brief description of this leave type..."
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-4 mt-4">
                      <div>
                        <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                          Color Code
                        </label>
                        <input
                          type="color"
                          value={formData.colorCode}
                          onChange={(e) => setFormData({ ...formData, colorCode: e.target.value })}
                          className="w-full h-10 px-1 py-1 border border-surface-300 dark:border-surface-600 rounded-md"
                        />
                      </div>
                      <div className="flex items-center pt-6">
                        <label className="flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.isPaid}
                            onChange={(e) => setFormData({ ...formData, isPaid: e.target.checked })}
                            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-surface-300 dark:border-surface-600 rounded"
                          />
                          <span className="ml-2 text-sm text-surface-700 dark:text-surface-300">Paid Leave</span>
                        </label>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                          Gender Specific
                        </label>
                        <select
                          value={formData.genderSpecific || 'ALL'}
                          onChange={(e) => setFormData({ ...formData, genderSpecific: e.target.value as GenderSpecific })}
                          className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                        >
                          {genderOptions.map(option => (
                            <option key={option} value={option}>{option}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Quota & Limits */}
                  <div className="border-b pb-4">
                    <h3 className="text-lg font-medium text-surface-900 dark:text-surface-100 mb-4">Quota & Limits</h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                          Annual Quota (days)
                        </label>
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          value={formData.annualQuota}
                          onChange={(e) => setFormData({ ...formData, annualQuota: parseFloat(e.target.value) || 0 })}
                          className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                          Max Consecutive Days
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={formData.maxConsecutiveDays || ''}
                          onChange={(e) => setFormData({ ...formData, maxConsecutiveDays: e.target.value ? parseInt(e.target.value) : undefined })}
                          className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                          Max Days Per Request
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={formData.maxDaysPerRequest || ''}
                          onChange={(e) => setFormData({ ...formData, maxDaysPerRequest: e.target.value ? parseInt(e.target.value) : undefined })}
                          className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <div>
                        <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                          Min Days Notice
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={formData.minDaysNotice}
                          onChange={(e) => setFormData({ ...formData, minDaysNotice: parseInt(e.target.value) || 0 })}
                          className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                          Applicable After (days)
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={formData.applicableAfterDays}
                          onChange={(e) => setFormData({ ...formData, applicableAfterDays: parseInt(e.target.value) || 0 })}
                          className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Accrual Settings */}
                  <div className="border-b pb-4">
                    <h3 className="text-lg font-medium text-surface-900 dark:text-surface-100 mb-4">Accrual Settings</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                          Accrual Type
                        </label>
                        <select
                          value={formData.accrualType || ''}
                          onChange={(e) => setFormData({ ...formData, accrualType: e.target.value as AccrualType || undefined })}
                          className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                        >
                          <option value="">No Accrual</option>
                          {accrualTypes.map(type => (
                            <option key={type} value={type}>{type.replace('_', ' ')}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                          Accrual Rate (days/period)
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          value={formData.accrualRate || ''}
                          onChange={(e) => setFormData({ ...formData, accrualRate: e.target.value ? parseFloat(e.target.value) : undefined })}
                          className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Carry Forward & Encashment */}
                  <div className="border-b pb-4">
                    <h3 className="text-lg font-medium text-surface-900 dark:text-surface-100 mb-4">Carry Forward & Encashment</h3>
                    <div className="space-y-4">
                      <label className="flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.isCarryForwardAllowed}
                          onChange={(e) => setFormData({ ...formData, isCarryForwardAllowed: e.target.checked })}
                          className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-surface-300 dark:border-surface-600 rounded"
                        />
                        <span className="ml-2 text-sm text-surface-700 dark:text-surface-300">Allow Carry Forward</span>
                      </label>

                      {formData.isCarryForwardAllowed && (
                        <div>
                          <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                            Max Carry Forward Days
                          </label>
                          <input
                            type="number"
                            step="0.5"
                            min="0"
                            value={formData.maxCarryForwardDays || ''}
                            onChange={(e) => setFormData({ ...formData, maxCarryForwardDays: e.target.value ? parseFloat(e.target.value) : undefined })}
                            className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                          />
                        </div>
                      )}

                      <label className="flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.isEncashable}
                          onChange={(e) => setFormData({ ...formData, isEncashable: e.target.checked })}
                          className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-surface-300 dark:border-surface-600 rounded"
                        />
                        <span className="ml-2 text-sm text-surface-700 dark:text-surface-300">Encashable</span>
                      </label>

                      <label className="flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.requiresDocument}
                          onChange={(e) => setFormData({ ...formData, requiresDocument: e.target.checked })}
                          className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-surface-300 dark:border-surface-600 rounded"
                        />
                        <span className="ml-2 text-sm text-surface-700 dark:text-surface-300">Requires Supporting Document</span>
                      </label>
                    </div>
                  </div>

                  {/* Form Actions */}
                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => {
                        setShowModal(false);
                        setEditingLeaveType(null);
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
                      {submitting ? 'Saving...' : (editingLeaveType ? 'Update' : 'Create')} Leave Type
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
