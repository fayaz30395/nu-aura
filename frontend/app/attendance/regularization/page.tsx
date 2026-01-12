'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ClipboardCheck, Clock, CheckCircle, XCircle, AlertCircle, Plus, Info } from 'lucide-react';
import { AppLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { attendanceService } from '@/lib/services/attendance.service';
import { AttendanceRecord } from '@/lib/types/attendance';

interface RegularizationRequest {
  id: string;
  employeeId: string;
  employeeName?: string;
  attendanceDate: string;
  originalCheckIn?: string;
  originalCheckOut?: string;
  requestedCheckIn: string;
  requestedCheckOut: string;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  requestedOn: string;
  approvedBy?: string;
  approvedOn?: string;
  remarks?: string;
}

export default function RegularizationPage() {
  const router = useRouter();
  const [requests, setRequests] = useState<RegularizationRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    attendanceDate: '',
    requestedCheckIn: '',
    requestedCheckOut: '',
    reason: '',
  });

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      setLoading(true);
      // Mock data - in real implementation, fetch from API
      setRequests([]);
    } catch (error) {
      console.error('Error loading regularization requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const user = JSON.parse(localStorage.getItem('user') || '{}');

      // In real implementation, call regularization API
      alert('Regularization request submitted successfully');
      setShowCreateModal(false);
      setFormData({
        attendanceDate: '',
        requestedCheckIn: '',
        requestedCheckOut: '',
        reason: '',
      });
      loadRequests();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to submit request');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED': return 'bg-green-100 dark:bg-green-950/30 text-green-800 dark:text-green-400';
      case 'PENDING': return 'bg-yellow-100 dark:bg-yellow-950/30 text-yellow-800 dark:text-yellow-400';
      case 'REJECTED': return 'bg-red-100 dark:bg-red-950/30 text-red-800 dark:text-red-400';
      default: return 'bg-surface-100 dark:bg-surface-800 text-surface-800 dark:text-surface-400';
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <AppLayout activeMenuItem="attendance">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-50">Attendance Regularization</h1>
            <p className="text-surface-500 dark:text-surface-400 mt-1">
              Request corrections for your attendance records
            </p>
          </div>
          <Button
            onClick={() => setShowCreateModal(true)}
            className="bg-primary-500 hover:bg-primary-600 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Request Regularization
          </Button>
        </div>

        {/* Info Card */}
        <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
          <CardContent className="p-4">
            <div className="flex gap-3">
              <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800 dark:text-blue-300">
                <p className="font-semibold mb-1">About Attendance Regularization</p>
                <p className="text-blue-700 dark:text-blue-400">
                  If you forgot to check in/out or need to correct your attendance, you can submit a regularization request.
                  Your manager will review and approve/reject the request.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-white dark:bg-surface-900">
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-yellow-50 dark:bg-yellow-950/30 flex items-center justify-center">
                  <Clock className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div>
                  <p className="text-sm text-surface-500 dark:text-surface-400">Pending</p>
                  <p className="text-2xl font-bold text-surface-900 dark:text-surface-50">
                    {requests.filter(r => r.status === 'PENDING').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-surface-900">
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-green-50 dark:bg-green-950/30 flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-surface-500 dark:text-surface-400">Approved</p>
                  <p className="text-2xl font-bold text-surface-900 dark:text-surface-50">
                    {requests.filter(r => r.status === 'APPROVED').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-surface-900">
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-red-50 dark:bg-red-950/30 flex items-center justify-center">
                  <XCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <p className="text-sm text-surface-500 dark:text-surface-400">Rejected</p>
                  <p className="text-2xl font-bold text-surface-900 dark:text-surface-50">
                    {requests.filter(r => r.status === 'REJECTED').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Requests Table */}
        <Card className="bg-white dark:bg-surface-900">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-surface-900 dark:text-surface-50">
              Your Regularization Requests
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="text-center py-12 text-surface-500 dark:text-surface-400">
                Loading requests...
              </div>
            ) : requests.length === 0 ? (
              <div className="text-center py-12">
                <ClipboardCheck className="h-12 w-12 text-surface-300 dark:text-surface-600 mx-auto mb-4" />
                <p className="text-surface-500 dark:text-surface-400 mb-4">No regularization requests found</p>
                <Button
                  onClick={() => setShowCreateModal(true)}
                  className="bg-primary-500 hover:bg-primary-600 text-white"
                >
                  Submit Your First Request
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-surface-50 dark:bg-surface-800/50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-surface-500 dark:text-surface-400 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-surface-500 dark:text-surface-400 uppercase tracking-wider">Original Time</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-surface-500 dark:text-surface-400 uppercase tracking-wider">Requested Time</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-surface-500 dark:text-surface-400 uppercase tracking-wider">Reason</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-surface-500 dark:text-surface-400 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-surface-500 dark:text-surface-400 uppercase tracking-wider">Requested On</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-surface-500 dark:text-surface-400 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-200 dark:divide-surface-700">
                    {requests.map((request) => (
                      <tr key={request.id} className="hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors">
                        <td className="px-6 py-4 text-sm font-medium text-surface-900 dark:text-surface-50">
                          {new Date(request.attendanceDate).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-sm text-surface-600 dark:text-surface-400">
                          <div>In: {request.originalCheckIn ? formatTime(request.originalCheckIn) : 'Not marked'}</div>
                          <div>Out: {request.originalCheckOut ? formatTime(request.originalCheckOut) : 'Not marked'}</div>
                        </td>
                        <td className="px-6 py-4 text-sm text-primary-600 dark:text-primary-400 font-medium">
                          <div>In: {formatTime(request.requestedCheckIn)}</div>
                          <div>Out: {formatTime(request.requestedCheckOut)}</div>
                        </td>
                        <td className="px-6 py-4 text-sm text-surface-600 dark:text-surface-400 max-w-xs">
                          <div className="truncate" title={request.reason}>
                            {request.reason}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${getStatusColor(request.status)}`}>
                            {request.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-surface-600 dark:text-surface-400">
                          {new Date(request.requestedOn).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          {request.status === 'PENDING' && (
                            <button
                              className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-medium"
                              onClick={() => {
                                if (confirm('Cancel this request?')) {
                                  // Handle cancel
                                }
                              }}
                            >
                              Cancel
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create Request Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-surface-900 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="p-6">
              <h2 className="text-xl font-bold text-surface-900 dark:text-surface-50 mb-6">
                Request Attendance Regularization
              </h2>

              <form onSubmit={handleSubmitRequest}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                      Attendance Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.attendanceDate}
                      onChange={(e) => setFormData({ ...formData, attendanceDate: e.target.value })}
                      max={new Date().toISOString().split('T')[0]}
                      className="w-full px-4 py-2 border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-50 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                        Requested Check In Time *
                      </label>
                      <input
                        type="time"
                        required
                        value={formData.requestedCheckIn}
                        onChange={(e) => setFormData({ ...formData, requestedCheckIn: e.target.value })}
                        className="w-full px-4 py-2 border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-50 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                        Requested Check Out Time *
                      </label>
                      <input
                        type="time"
                        required
                        value={formData.requestedCheckOut}
                        onChange={(e) => setFormData({ ...formData, requestedCheckOut: e.target.value })}
                        className="w-full px-4 py-2 border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-50 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                      Reason for Regularization *
                    </label>
                    <textarea
                      required
                      value={formData.reason}
                      onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                      rows={4}
                      className="w-full px-4 py-2 border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-50 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                      placeholder="Please explain why you need attendance regularization..."
                    />
                  </div>
                </div>

                <div className="flex gap-4 mt-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-primary-500 hover:bg-primary-600 text-white"
                  >
                    {loading ? 'Submitting...' : 'Submit Request'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
