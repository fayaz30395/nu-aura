'use client';

import { useState } from 'react';
import { Clock, CheckCircle, XCircle, PlusCircle, AlertCircle } from 'lucide-react';
import { AppLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';

interface CompOffRequest {
  id: string;
  employeeId: string;
  attendanceDate: string;
  overtimeMinutes: number;
  compOffDays: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CREDITED';
  reason?: string;
  reviewedAt?: string;
  reviewNote?: string;
  createdAt: string;
}

const statusConfig: Record<string, { color: string; icon: typeof Clock; label: string }> = {
  PENDING:  { color: 'text-yellow-600 bg-yellow-50',  icon: AlertCircle,   label: 'Pending' },
  APPROVED: { color: 'text-blue-600 bg-blue-50',      icon: CheckCircle,   label: 'Approved' },
  REJECTED: { color: 'text-red-600 bg-red-50',        icon: XCircle,       label: 'Rejected' },
  CREDITED: { color: 'text-green-600 bg-green-50',    icon: CheckCircle,   label: 'Credited' },
};

export default function CompOffPage() {
  const queryClient = useQueryClient();
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [form, setForm] = useState({ attendanceDate: '', reason: '' });
  const [activeTab, setActiveTab] = useState<'my' | 'pending'>('my');
  const [employeeId] = useState('current'); // resolved by backend from JWT

  const { data: myRequests, isLoading: loadingMy } = useQuery<CompOffRequest[]>({
    queryKey: ['comp-off', 'my', employeeId],
    queryFn: () => apiClient.get(`/comp-off/my-pending/${employeeId}`).then(r => r.data),
  });

  const { data: pendingRequests, isLoading: loadingPending } = useQuery<{ content: CompOffRequest[] }>({
    queryKey: ['comp-off', 'pending'],
    queryFn: () => apiClient.get('/comp-off/pending').then(r => r.data),
    enabled: activeTab === 'pending',
  });

  const requestMutation = useMutation({
    mutationFn: (data: { employeeId: string; attendanceDate: string; reason: string }) =>
      apiClient.post('/comp-off/request', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comp-off'] });
      setShowRequestModal(false);
      setForm({ attendanceDate: '', reason: '' });
    },
  });

  const approveMutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'approve' | 'reject' }) =>
      apiClient.post(`/comp-off/${id}/${action}`, { reviewerId: employeeId, note: '' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['comp-off'] }),
  });

  const requests = activeTab === 'my' ? myRequests ?? [] : pendingRequests?.content ?? [];
  const isLoading = activeTab === 'my' ? loadingMy : loadingPending;

  return (
    <AppLayout>
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Compensatory Off</h1>
            <p className="text-gray-500 mt-1">Request and manage comp-off credits for overtime work</p>
          </div>
          <Button onClick={() => setShowRequestModal(true)}>
            <PlusCircle className="w-4 h-4 mr-2" />
            Request Comp-Off
          </Button>
        </div>

        {/* Info card */}
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-4">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
                <strong>Eligibility:</strong> Minimum 60 minutes overtime required. Half-day credited for 4h+, full day for 8h+.
                Requests are auto-approved after 7 days if no manager action.
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <div className="flex gap-2 border-b">
          {['my', 'pending'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as 'my' | 'pending')}
              className={`pb-2 px-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab === 'my' ? 'My Requests' : 'Pending Approval'}
            </button>
          ))}
        </div>

        {/* Requests table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 text-center text-gray-500">Loading...</div>
            ) : requests.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Clock className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                <p>No comp-off requests found.</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50 text-gray-600">
                    <th className="px-4 py-3 text-left font-medium">Date</th>
                    <th className="px-4 py-3 text-left font-medium">Overtime</th>
                    <th className="px-4 py-3 text-left font-medium">Days</th>
                    <th className="px-4 py-3 text-left font-medium">Reason</th>
                    <th className="px-4 py-3 text-left font-medium">Status</th>
                    {activeTab === 'pending' && (
                      <th className="px-4 py-3 text-left font-medium">Action</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {requests.map((req) => {
                    const cfg = statusConfig[req.status] ?? statusConfig.PENDING;
                    const Icon = cfg.icon;
                    return (
                      <tr key={req.id} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium">{req.attendanceDate}</td>
                        <td className="px-4 py-3">
                          {Math.floor(req.overtimeMinutes / 60)}h {req.overtimeMinutes % 60}m
                        </td>
                        <td className="px-4 py-3 font-semibold text-blue-700">{req.compOffDays}</td>
                        <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{req.reason ?? '—'}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.color}`}>
                            <Icon className="w-3.5 h-3.5" />
                            {cfg.label}
                          </span>
                        </td>
                        {activeTab === 'pending' && (
                          <td className="px-4 py-3">
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-green-700 border-green-200 hover:bg-green-50"
                                onClick={() => approveMutation.mutate({ id: req.id, action: 'approve' })}
                              >
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-700 border-red-200 hover:bg-red-50"
                                onClick={() => approveMutation.mutate({ id: req.id, action: 'reject' })}
                              >
                                Reject
                              </Button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Request Modal */}
      {showRequestModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>Request Comp-Off</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Attendance Date *</label>
                <input
                  type="date"
                  value={form.attendanceDate}
                  onChange={e => setForm(f => ({ ...f, attendanceDate: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">Must be a day with recorded overtime ≥ 60 minutes</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                <textarea
                  rows={3}
                  value={form.reason}
                  onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                  placeholder="Optional: why you worked overtime"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                />
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <Button variant="outline" onClick={() => setShowRequestModal(false)}>Cancel</Button>
                <Button
                  onClick={() => requestMutation.mutate({
                    employeeId,
                    attendanceDate: form.attendanceDate,
                    reason: form.reason,
                  })}
                  disabled={!form.attendanceDate || requestMutation.isPending}
                >
                  {requestMutation.isPending ? 'Submitting...' : 'Submit Request'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </AppLayout>
  );
}
