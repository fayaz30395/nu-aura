'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { usePermissions, Permissions } from '@/lib/hooks/usePermissions';
import { useAuth } from '@/lib/hooks/useAuth';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Clock, CheckCircle, XCircle, PlusCircle, AlertCircle } from 'lucide-react';
import { notifications } from '@mantine/notifications';
import { Modal } from '@mantine/core';
import { AppLayout } from '@/components/layout';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { TablePagination } from '@/components/ui';
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

interface PageResponse<T> {
  content: T[];
  totalPages: number;
  totalElements: number;
  size: number;
  number: number;
}

// ─── Zod Schema ────────────────────────────────────────────────────────────────

const compOffSchema = z.object({
  attendanceDate: z.string().min(1, 'Please select an attendance date'),
  reason: z.string().optional(),
});

type CompOffFormData = z.infer<typeof compOffSchema>;

// ─── Status config ──────────────────────────────────────────────────────────────

const statusConfig: Record<string, { color: string; icon: typeof Clock; label: string }> = {
  PENDING:  { color: 'text-warning-600 tint-warning',  icon: AlertCircle,   label: 'Pending' },
  APPROVED: { color: 'text-accent-600 tint-info',       icon: CheckCircle,   label: 'Approved' },
  REJECTED: { color: 'text-danger-600 tint-danger',      icon: XCircle,       label: 'Rejected' },
  CREDITED: { color: 'text-success-600 tint-success',   icon: CheckCircle,   label: 'Credited' },
};

export default function CompOffPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showRequestModal, setShowRequestModal] = useState(false);
  const { hasAnyPermission, isReady } = usePermissions();

  const hasAccess = hasAnyPermission(
    Permissions.ATTENDANCE_VIEW_SELF,
    Permissions.ATTENDANCE_VIEW_ALL,
    Permissions.ATTENDANCE_MANAGE,
  );

  useEffect(() => {
    if (isReady && !hasAccess) {
      router.replace('/me/dashboard');
    }
  }, [isReady, hasAccess, router]);

  const [activeTab, setActiveTab] = useState<'my' | 'pending'>('my');
  const [pendingPage, setPendingPage] = useState(0);
  const [pendingPageSize, setPendingPageSize] = useState(20);
  const { user } = useAuth();
  const employeeId = user?.employeeId;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CompOffFormData>({
    resolver: zodResolver(compOffSchema),
    defaultValues: { attendanceDate: '', reason: '' },
  });

  const { data: myRequests, isLoading: loadingMy } = useQuery<CompOffRequest[]>({
    queryKey: ['comp-off', 'my', employeeId],
    queryFn: () => apiClient.get<CompOffRequest[]>(`/comp-off/my-pending/${employeeId}`).then(r => r.data),
    enabled: !!employeeId,
  });

  const { data: pendingRequests, isLoading: loadingPending } = useQuery<PageResponse<CompOffRequest>>({
    queryKey: ['comp-off', 'pending', pendingPage, pendingPageSize],
    queryFn: () => apiClient.get<PageResponse<CompOffRequest>>('/comp-off/pending', { params: { page: pendingPage, size: pendingPageSize } }).then(r => r.data),
    enabled: activeTab === 'pending' && !!employeeId,
  });

  const requestMutation = useMutation({
    mutationFn: (data: { employeeId: string; attendanceDate: string; reason?: string }) =>
      apiClient.post('/comp-off/request', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comp-off'] });
      setShowRequestModal(false);
      reset();
    },
    onError: () => notifications.show({ title: 'Error', message: 'Failed to submit comp-off request', color: 'red' }),
  });

  const approveMutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'approve' | 'reject' }) =>
      apiClient.post(`/comp-off/${id}/${action}`, { reviewerId: employeeId, note: '' }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['comp-off'] });
      const actionLabel = variables.action === 'approve' ? 'approved' : 'rejected';
      notifications.show({
        title: 'Success',
        message: `Comp-off request ${actionLabel} successfully`,
        color: variables.action === 'approve' ? 'green' : 'orange',
      });
    },
    onError: () => {
      notifications.show({ title: 'Error', message: 'Failed to process comp-off request', color: 'red' });
    },
  });

  if (!isReady || !hasAccess || !employeeId) return null;

  const onSubmitForm = (data: CompOffFormData) => {
    requestMutation.mutate({ employeeId, attendanceDate: data.attendanceDate, reason: data.reason });
  };

  const handleModalClose = () => {
    setShowRequestModal(false);
    reset();
  };

  const requests = activeTab === 'my' ? myRequests ?? [] : pendingRequests?.content ?? [];
  const isLoading = activeTab === 'my' ? loadingMy : loadingPending;

  return (
    <AppLayout>
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] skeuo-emboss">Compensatory Off</h1>
            <p className="text-[var(--text-muted)] mt-1 skeuo-deboss">Request and manage comp-off credits for overtime work</p>
          </div>
          <Button onClick={() => setShowRequestModal(true)}>
            <PlusCircle className="w-4 h-4 mr-2" />
            Request Comp-Off
          </Button>
        </div>

        {/* Info card */}
        <Card className="border-accent-200 tint-info skeuo-card">
          <CardContent className="pt-4">
            <div className="flex gap-4">
              <AlertCircle className="w-5 h-5 text-accent-600 shrink-0 mt-0.5" />
              <div className="text-sm text-accent-800">
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
              onClick={() => {
                setActiveTab(tab as 'my' | 'pending');
                setPendingPage(0);
              }}
              className={`cursor-pointer pb-2 px-4 text-sm font-medium border-b-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2 ${
                activeTab === tab
                  ? 'border-accent-600 text-accent-600'
                  : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              {tab === 'my' ? 'My Requests' : 'Pending Approval'}
            </button>
          ))}
        </div>

        {/* Requests table */}
        <Card className="skeuo-card">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 text-center text-[var(--text-muted)]">Loading...</div>
            ) : requests.length === 0 ? (
              <div className="p-8 text-center text-[var(--text-muted)]">
                <Clock className="w-10 h-10 mx-auto mb-2 text-[var(--text-muted)]" />
                <p>No comp-off requests found.</p>
              </div>
            ) : (
              <table className="w-full text-sm table-aura">
                <thead>
                  <tr className="border-b bg-[var(--bg-surface)] text-[var(--text-secondary)]">
                    <th className="px-4 py-2 text-left font-medium">Date</th>
                    <th className="px-4 py-2 text-left font-medium">Overtime</th>
                    <th className="px-4 py-2 text-left font-medium">Days</th>
                    <th className="px-4 py-2 text-left font-medium">Reason</th>
                    <th className="px-4 py-2 text-left font-medium">Status</th>
                    {activeTab === 'pending' && (
                      <th className="px-4 py-2 text-left font-medium">Action</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {requests.map((req: CompOffRequest) => {
                    const cfg = statusConfig[req.status] ?? statusConfig.PENDING;
                    const Icon = cfg.icon;
                    return (
                      <tr key={req.id} className="border-b hover:bg-[var(--bg-surface)]">
                        <td className="px-4 py-4 font-medium">{req.attendanceDate}</td>
                        <td className="px-4 py-4">
                          {Math.floor(req.overtimeMinutes / 60)}h {req.overtimeMinutes % 60}m
                        </td>
                        <td className="px-4 py-4 font-semibold text-accent-700">{req.compOffDays}</td>
                        <td className="px-4 py-4 text-[var(--text-secondary)] max-w-xs truncate">{req.reason ?? '—'}</td>
                        <td className="px-4 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium badge-status ${cfg.color}`}>
                            <Icon className="w-3.5 h-3.5" />
                            {cfg.label}
                          </span>
                        </td>
                        {activeTab === 'pending' && (
                          <td className="px-4 py-4">
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-success-700 border-success-200"
                                disabled={approveMutation.isPending}
                                onClick={() => approveMutation.mutate({ id: req.id, action: 'approve' })}
                              >
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-danger-700 border-danger-200"
                                disabled={approveMutation.isPending}
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

            {activeTab === 'pending' && (pendingRequests?.totalElements ?? 0) > 0 && (
              <div className="px-4 pb-4">
                <TablePagination
                  currentPage={pendingPage}
                  totalPages={pendingRequests?.totalPages ?? 0}
                  totalItems={pendingRequests?.totalElements ?? 0}
                  pageSize={pendingPageSize}
                  onPageChange={setPendingPage}
                  onPageSizeChange={(size) => {
                    setPendingPageSize(size);
                    setPendingPage(0);
                  }}
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Request Modal */}
      <Modal
        opened={showRequestModal}
        onClose={handleModalClose}
        title="Request Comp-Off"
        size="md"
        centered
      >
        <form onSubmit={handleSubmit(onSubmitForm)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Attendance Date *</label>
            <input
              type="date"
              {...register('attendanceDate')}
              className={`input-aura ${errors.attendanceDate ? 'border-danger-500' : ''}`}
            />
            {errors.attendanceDate && (
              <p className="mt-1 text-xs text-danger-500">{errors.attendanceDate.message}</p>
            )}
            <p className="text-xs text-[var(--text-muted)] mt-1">Must be a day with recorded overtime ≥ 60 minutes</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Reason</label>
            <textarea
              {...register('reason')}
              rows={3}
              placeholder="Optional: why you worked overtime"
              className="input-aura"
            />
          </div>
          <div className="flex gap-4 justify-end pt-2">
            <Button type="button" variant="outline" onClick={handleModalClose} className="btn-secondary">Cancel</Button>
            <Button type="submit" disabled={requestMutation.isPending} className="btn-primary">
              {requestMutation.isPending ? 'Submitting...' : 'Submit Request'}
            </Button>
          </div>
        </form>
      </Modal>
    </AppLayout>
  );
}
