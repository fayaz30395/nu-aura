'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/layout';
import { leaveService } from '@/lib/services/leave.service';
import { LeaveRequest, LeaveType } from '@/lib/types/leave';

export default function LeaveApprovalsPage() {
  const router = useRouter();
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [pendingRequests, types] = await Promise.all([
        leaveService.getLeaveRequestsByStatus('PENDING', 0, 50),
        leaveService.getActiveLeaveTypes(),
      ]);
      setRequests(pendingRequests.content);
      setLeaveTypes(types);
    } catch (error) {
      console.error('Error loading approvals:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    if (!confirm('Are you sure you want to approve this leave request?')) return;

    try {
      setProcessing(id);
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      await leaveService.approveLeaveRequest(id, user.employeeId);
      alert('Leave request approved successfully');
      loadData();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to approve leave request');
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (id: string) => {
    const reason = prompt('Please provide a reason for rejection:');
    if (!reason) return;

    try {
      setProcessing(id);
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      await leaveService.rejectLeaveRequest(id, user.employeeId, reason);
      alert('Leave request rejected');
      loadData();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to reject leave request');
    } finally {
      setProcessing(null);
    }
  };

  const getLeaveTypeName = (leaveTypeId: string) => {
    return leaveTypes.find(t => t.id === leaveTypeId)?.leaveName || 'Unknown';
  };

  return (
    <AppLayout activeMenuItem="leave">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 flex items-center gap-2"
          >
            ← Back
          </button>
        </div>

        <h1 className="text-3xl font-bold mb-8 text-gray-900 dark:text-white">Leave Approvals</h1>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-surface-900 rounded-lg shadow-md p-6">
            <div className="text-sm text-surface-600 dark:text-surface-400 mb-1">Pending Requests</div>
            <div className="text-3xl font-bold text-yellow-600 dark:text-yellow-500">{requests.length}</div>
          </div>
        </div>

        {/* Requests Table */}
        <div className="bg-white dark:bg-surface-900 rounded-lg shadow-md overflow-hidden">
          {loading ? (
            <div className="text-center py-12 text-gray-900 dark:text-white">Loading...</div>
          ) : requests.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              No pending leave requests
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-surface-50 dark:bg-surface-800/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Request #</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Employee</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Leave Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Duration</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Days</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Reason</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Applied On</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-200 dark:divide-surface-700">
                  {requests.map((request) => (
                    <tr key={request.id} className="hover:bg-surface-50 dark:hover:bg-surface-800/50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                        {request.requestNumber}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                        {request.employeeId.substring(0, 8)}...
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                        {getLeaveTypeName(request.leaveTypeId)}
                      </td>
                      <td className="px-6 py-4 text-sm text-surface-600 dark:text-surface-400">
                        {new Date(request.startDate).toLocaleDateString()} - {new Date(request.endDate).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-sm text-surface-600 dark:text-surface-400">
                        {request.totalDays} {request.isHalfDay && '(Half)'}
                      </td>
                      <td className="px-6 py-4 text-sm text-surface-600 dark:text-surface-400 max-w-xs">
                        <div className="truncate" title={request.reason}>
                          {request.reason}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-surface-600 dark:text-surface-400">
                        {new Date(request.appliedOn).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleApprove(request.id)}
                            disabled={processing === request.id}
                            className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 text-xs font-medium"
                          >
                            {processing === request.id ? 'Processing...' : 'Approve'}
                          </button>
                          <button
                            onClick={() => handleReject(request.id)}
                            disabled={processing === request.id}
                            className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 text-xs font-medium"
                          >
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
