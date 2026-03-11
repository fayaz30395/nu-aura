'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { AppLayout } from '@/components/layout';
import { leaveService } from '@/lib/services/leave.service';
import { LeaveType, LeaveBalance, HalfDayPeriod } from '@/lib/types/leave';

export default function ApplyLeavePage() {
  const router = useRouter();
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    leaveTypeId: '',
    startDate: '',
    endDate: '',
    isHalfDay: false,
    halfDayPeriod: '',
    reason: '',
    documentPath: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setDataLoading(true);
      setError(null);
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const year = new Date().getFullYear();
      const [types, bal] = await Promise.all([
        leaveService.getActiveLeaveTypes(),
        leaveService.getEmployeeBalancesForYear(user.employeeId, year),
      ]);
      setLeaveTypes(types);
      setBalances(bal);
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load leave types and balances. Please try again.');
    } finally {
      setDataLoading(false);
    }
  };

  const calculateDays = () => {
    if (!formData.startDate || !formData.endDate) return 0;
    const start = new Date(formData.startDate);
    const end = new Date(formData.endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return formData.isHalfDay ? 0.5 : diffDays;
  };

  const getAvailableBalance = () => {
    if (!formData.leaveTypeId) return null;
    return balances.find(b => b.leaveTypeId === formData.leaveTypeId);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const totalDays = calculateDays();

      await leaveService.createLeaveRequest({
        employeeId: user.employeeId,
        leaveTypeId: formData.leaveTypeId,
        startDate: formData.startDate,
        endDate: formData.endDate,
        totalDays,
        isHalfDay: formData.isHalfDay,
        halfDayPeriod: formData.isHalfDay ? (formData.halfDayPeriod as HalfDayPeriod) : undefined,
        reason: formData.reason,
        documentPath: formData.documentPath || undefined,
      });

      alert('Leave request submitted successfully!');
      router.push('/leave');
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to submit leave request');
    } finally {
      setLoading(false);
    }
  };

  const balance = getAvailableBalance();
  const totalDays = calculateDays();

  return (
    <AppLayout activeMenuItem="leave">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="max-w-4xl mx-auto"
      >
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 flex items-center gap-2"
          >
            ← Back
          </button>
        </div>

        <h1 className="text-3xl font-bold mb-8 text-gray-900 dark:text-white">Apply for Leave</h1>

        {error && (
          <div className="mb-6 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
            </div>
            <button
              onClick={loadData}
              className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white dark:bg-surface-900 rounded-lg shadow-md p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Leave Type */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                Leave Type *
              </label>
              <select
                value={formData.leaveTypeId}
                onChange={(e) => setFormData({ ...formData, leaveTypeId: e.target.value })}
                className="w-full px-4 py-2 border border-surface-300 dark:border-surface-600 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white dark:bg-surface-900 text-gray-900 dark:text-white"
                required
              >
                <option value="">Select Leave Type</option>
                {leaveTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.leaveName} {type.isPaid ? '(Paid)' : '(Unpaid)'}
                  </option>
                ))}
              </select>
              {balance && (
                <div className="mt-2 text-sm text-surface-600 dark:text-surface-400">
                  Available Balance: <span className="font-semibold">{balance.available} days</span>
                </div>
              )}
            </div>

            {/* Start Date */}
            <div>
              <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                Start Date *
              </label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full px-4 py-2 border border-surface-300 dark:border-surface-600 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white dark:bg-surface-900 text-gray-900 dark:text-white"
                required
              />
            </div>

            {/* End Date */}
            <div>
              <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                End Date *
              </label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                min={formData.startDate}
                className="w-full px-4 py-2 border border-surface-300 dark:border-surface-600 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white dark:bg-surface-900 text-gray-900 dark:text-white"
                required
              />
            </div>

            {/* Half Day */}
            <div className="md:col-span-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.isHalfDay}
                  onChange={(e) => setFormData({ ...formData, isHalfDay: e.target.checked })}
                  className="w-4 h-4 text-primary-600"
                />
                <span className="text-sm font-medium text-surface-700 dark:text-surface-300">Half Day Leave</span>
              </label>
            </div>

            {/* Half Day Period */}
            {formData.isHalfDay && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                  Half Day Period *
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      value="MORNING"
                      checked={formData.halfDayPeriod === 'MORNING'}
                      onChange={(e) => setFormData({ ...formData, halfDayPeriod: e.target.value })}
                      className="w-4 h-4 text-primary-600"
                    />
                    <span className="text-sm text-surface-700 dark:text-surface-300">First Half (Morning)</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      value="AFTERNOON"
                      checked={formData.halfDayPeriod === 'AFTERNOON'}
                      onChange={(e) => setFormData({ ...formData, halfDayPeriod: e.target.value })}
                      className="w-4 h-4 text-primary-600"
                    />
                    <span className="text-sm text-surface-700 dark:text-surface-300">Second Half (Afternoon)</span>
                  </label>
                </div>
              </div>
            )}

            {/* Total Days */}
            <div className="md:col-span-2 bg-primary-50 dark:bg-primary-950/30 p-4 rounded-lg">
              <div className="text-sm text-surface-700 dark:text-surface-300">Total Days Requested:</div>
              <div className="text-2xl font-bold text-primary-600 dark:text-primary-400">{totalDays} days</div>
            </div>

            {/* Reason */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                Reason *
              </label>
              <textarea
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                rows={4}
                className="w-full px-4 py-2 border border-surface-300 dark:border-surface-600 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white dark:bg-surface-900 text-gray-900 dark:text-white"
                placeholder="Please provide a reason for your leave..."
                required
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-4 mt-6">
            <button
              type="submit"
              disabled={loading || !formData.leaveTypeId}
              className="px-6 py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 font-semibold"
            >
              {loading ? 'Submitting...' : 'Submit Leave Request'}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-3 bg-surface-100 dark:bg-surface-800 text-surface-700 dark:text-surface-300 rounded-lg hover:bg-surface-50 dark:hover:bg-surface-800/50 font-semibold"
            >
              Cancel
            </button>
          </div>
        </form>
      </motion.div>
    </AppLayout>
  );
}
