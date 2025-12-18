'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/layout';
import { leaveService } from '@/lib/services/leave.service';
import { LeaveRequest, LeaveType, LeaveRequestStatus } from '@/lib/types/leave';

export default function MyLeavesPage() {
  const router = useRouter();
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<LeaveRequestStatus | ''>('');
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  useEffect(() => {
    loadData();
  }, [filterStatus, currentPage]);

  const loadData = async () => {
    try {
      setLoading(true);
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      
      const [requestsData, typesData] = await Promise.all([
        filterStatus
          ? leaveService.getLeaveRequestsByStatus(filterStatus as LeaveRequestStatus, currentPage, 10)
          : leaveService.getLeaveRequestsByEmployee(user.employeeId, currentPage, 10),
        leaveService.getActiveLeaveTypes(),
      ]);

      setRequests(requestsData.content);
      setTotalPages(requestsData.totalPages);
      setLeaveTypes(typesData);
    } catch (error) {
      console.error('Error loading leaves:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm('Are you sure you want to cancel this leave request?')) return;
    
    const reason = prompt('Please provide a reason for cancellation:');
    if (!reason) return;

    try {
      await leaveService.cancelLeaveRequest(id, reason);
      alert('Leave request cancelled successfully');
      loadData();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to cancel leave request');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED': return 'bg-green-100 text-green-800';
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      case 'REJECTED': return 'bg-red-100 text-red-800';
      case 'CANCELLED': return 'bg-gray-100 text-gray-800';
      default: return 'bg-blue-100 text-blue-800';
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

        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">My Leaves</h1>
          <button
            onClick={() => router.push('/leave/apply')}
            className="px-6 py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600 font-semibold"
          >
            Apply for Leave
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-surface-900 rounded-lg shadow-md p-6 mb-6">
          <div className="flex gap-4 items-center">
            <label className="text-sm font-medium text-surface-700 dark:text-surface-300">Filter by Status:</label>
            <select
              value={filterStatus}
              onChange={(e) => { setFilterStatus(e.target.value as LeaveRequestStatus | ''); setCurrentPage(0); }}
              className="px-4 py-2 border border-surface-300 dark:border-surface-600 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white dark:bg-surface-900 text-gray-900 dark:text-white"
            >
              <option value="">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        </div>

        {/* Leave Requests Table */}
        <div className="bg-white dark:bg-surface-900 rounded-lg shadow-md overflow-hidden">
          {loading ? (
            <div className="text-center py-12 text-gray-900 dark:text-white">Loading...</div>
          ) : requests.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              No leave requests found
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-surface-50 dark:bg-surface-800/50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Request #</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Leave Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Duration</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Days</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Reason</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
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
                          {getLeaveTypeName(request.leaveTypeId)}
                        </td>
                        <td className="px-6 py-4 text-sm text-surface-600 dark:text-surface-400">
                          {new Date(request.startDate).toLocaleDateString()} - {new Date(request.endDate).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-sm text-surface-600 dark:text-surface-400">
                          {request.totalDays} {request.isHalfDay && '(Half)'}
                        </td>
                        <td className="px-6 py-4 text-sm text-surface-600 dark:text-surface-400 max-w-xs truncate">
                          {request.reason}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(request.status)}`}>
                            {request.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-surface-600 dark:text-surface-400">
                          {new Date(request.appliedOn).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          {request.status === 'PENDING' && (
                            <button
                              onClick={() => handleCancel(request.id)}
                              className="text-red-600 dark:text-red-500 hover:text-red-700 dark:hover:text-red-400 font-medium"
                            >
                              Cancel
                            </button>
                          )}
                          {request.status === 'REJECTED' && request.rejectionReason && (
                            <button
                              onClick={() => alert(`Rejection Reason: ${request.rejectionReason}`)}
                              className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium"
                            >
                              View Reason
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="px-6 py-4 bg-surface-50 dark:bg-surface-800/50 flex justify-between items-center">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                    disabled={currentPage === 0}
                    className="px-4 py-2 bg-white dark:bg-surface-900 border border-surface-300 dark:border-surface-600 rounded-lg disabled:opacity-50 hover:bg-surface-50 dark:hover:bg-surface-800/50 text-gray-900 dark:text-white"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-surface-700 dark:text-surface-300">
                    Page {currentPage + 1} of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
                    disabled={currentPage >= totalPages - 1}
                    className="px-4 py-2 bg-white dark:bg-surface-900 border border-surface-300 dark:border-surface-600 rounded-lg disabled:opacity-50 hover:bg-surface-50 dark:hover:bg-surface-800/50 text-gray-900 dark:text-white"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
