'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeftRight, PlusCircle } from 'lucide-react';
import { AppLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';

interface ShiftSwapRequest {
  id: string;
  requesterEmployeeId: string;
  targetEmployeeId?: string;
  requesterShiftDate: string;
  targetShiftDate?: string;
  swapType: 'SWAP' | 'GIVE_AWAY' | 'PICK_UP';
  status: 'PENDING' | 'TARGET_ACCEPTED' | 'TARGET_DECLINED' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'COMPLETED' | 'CANCELLED';
  reason?: string;
  requestedAt: string;
}

const statusColors: Record<string, string> = {
  PENDING:           'tint-warning text-yellow-700',
  TARGET_ACCEPTED:   'tint-info text-blue-700',
  TARGET_DECLINED:   'tint-danger text-red-700',
  PENDING_APPROVAL:  'tint-orange text-orange-700',
  APPROVED:          'tint-success text-green-700',
  REJECTED:          'tint-danger text-red-700',
  COMPLETED:         'tint-success text-green-800',
  CANCELLED:         'bg-[var(--bg-surface)] text-[var(--text-muted)]',
};

const swapTypeLabels: Record<string, string> = {
  SWAP:      'Shift Swap',
  GIVE_AWAY: 'Give Away',
  PICK_UP:   'Pick Up',
};

// ─── Zod Schema ────────────────────────────────────────────────────────────────

const shiftSwapSchema = z.object({
  swapType: z.enum(['SWAP', 'GIVE_AWAY', 'PICK_UP']),
  requesterShiftDate: z.string().min(1, 'My shift date is required'),
  targetShiftDate: z.string().optional(),
  requesterAssignmentId: z.string().min(1, 'My assignment ID is required'),
  targetEmployeeId: z.string().optional(),
  reason: z.string().optional(),
});

type ShiftSwapFormData = z.infer<typeof shiftSwapSchema>;

export default function ShiftSwapPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'my' | 'incoming' | 'approval'>('my');
  const [showModal, setShowModal] = useState(false);
  const [employeeId] = useState('current'); // resolved from JWT by backend

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<ShiftSwapFormData>({
    resolver: zodResolver(shiftSwapSchema),
    defaultValues: {
      swapType: 'SWAP',
      requesterShiftDate: '',
      targetShiftDate: '',
      requesterAssignmentId: '',
      targetEmployeeId: '',
      reason: '',
    },
  });

  const watchedSwapType = watch('swapType');

  const { data: myRequestsData, isLoading: loadingMy } = useQuery<{ content: ShiftSwapRequest[] }>({
    queryKey: ['shift-swap', 'my', employeeId],
    queryFn: () => apiClient.get<{ content: ShiftSwapRequest[] }>(`/shift-swaps/my-requests/${employeeId}`).then(r => r.data),
    enabled: activeTab === 'my',
  });

  const { data: incomingRequests, isLoading: loadingIncoming } = useQuery<ShiftSwapRequest[]>({
    queryKey: ['shift-swap', 'incoming', employeeId],
    queryFn: () => apiClient.get<ShiftSwapRequest[]>(`/shift-swaps/incoming/${employeeId}`).then(r => r.data),
    enabled: activeTab === 'incoming',
  });

  const { data: pendingApproval, isLoading: loadingApproval } = useQuery<ShiftSwapRequest[]>({
    queryKey: ['shift-swap', 'pending-approval'],
    queryFn: () => apiClient.get<ShiftSwapRequest[]>('/shift-swaps/pending-approval').then(r => r.data),
    enabled: activeTab === 'approval',
  });

  const submitMutation = useMutation({
    mutationFn: (data: ShiftSwapFormData) =>
      apiClient.post('/shift-swaps', { ...data, requesterEmployeeId: employeeId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shift-swap'] });
      setShowModal(false);
      reset();
    },
  });

  const onSubmitForm = (data: ShiftSwapFormData) => {
    submitMutation.mutate(data);
  };

  const handleModalClose = () => {
    setShowModal(false);
    reset();
  };

  const actionMutation = useMutation({
    mutationFn: ({ id, action, payload }: { id: string; action: string; payload: Record<string, string> }) =>
      apiClient.post(`/shift-swaps/${id}/${action}`, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['shift-swap'] }),
  });

  const tabs = [
    { key: 'my', label: 'My Requests' },
    { key: 'incoming', label: 'Incoming Requests' },
    { key: 'approval', label: 'Pending Approval' },
  ];

  const getDisplayData = (): ShiftSwapRequest[] => {
    if (activeTab === 'my') return myRequestsData?.content ?? [];
    if (activeTab === 'incoming') return incomingRequests ?? [];
    return pendingApproval ?? [];
  };

  const isLoading = activeTab === 'my' ? loadingMy : activeTab === 'incoming' ? loadingIncoming : loadingApproval;

  return (
    <AppLayout>
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">Shift Swap</h1>
            <p className="text-[var(--text-muted)] mt-1">Request shift swaps, give-aways, and pick-ups</p>
          </div>
          <Button onClick={() => setShowModal(true)}>
            <PlusCircle className="w-4 h-4 mr-2" />
            New Request
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as 'my' | 'incoming' | 'approval')}
              className={`pb-2 px-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 text-center text-[var(--text-muted)]">Loading...</div>
            ) : getDisplayData().length === 0 ? (
              <div className="p-8 text-center text-[var(--text-muted)]">
                <ArrowLeftRight className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                <p>No shift swap requests found.</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-[var(--bg-surface)] text-[var(--text-secondary)]">
                    <th className="px-4 py-3 text-left font-medium">Type</th>
                    <th className="px-4 py-3 text-left font-medium">Shift Date</th>
                    <th className="px-4 py-3 text-left font-medium">Target Date</th>
                    <th className="px-4 py-3 text-left font-medium">Reason</th>
                    <th className="px-4 py-3 text-left font-medium">Status</th>
                    <th className="px-4 py-3 text-left font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {getDisplayData().map((req: ShiftSwapRequest) => (
                    <tr key={req.id} className="border-b hover:bg-[var(--bg-surface)]">
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-1.5 text-[var(--text-primary)]">
                          <ArrowLeftRight className="w-3.5 h-3.5" />
                          {swapTypeLabels[req.swapType]}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium">{req.requesterShiftDate}</td>
                      <td className="px-4 py-3">{req.targetShiftDate ?? '—'}</td>
                      <td className="px-4 py-3 text-[var(--text-secondary)] max-w-xs truncate">{req.reason ?? '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[req.status]}`}>
                          {req.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {activeTab === 'incoming' && req.status === 'PENDING' && (
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" className="text-green-700 border-green-200"
                              onClick={() => actionMutation.mutate({ id: req.id, action: 'accept', payload: { employeeId } })}>
                              Accept
                            </Button>
                            <Button size="sm" variant="outline" className="text-red-700 border-red-200"
                              onClick={() => actionMutation.mutate({ id: req.id, action: 'decline', payload: { employeeId } })}>
                              Decline
                            </Button>
                          </div>
                        )}
                        {activeTab === 'approval' && req.status === 'PENDING_APPROVAL' && (
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" className="text-green-700 border-green-200"
                              onClick={() => actionMutation.mutate({ id: req.id, action: 'approve', payload: { managerId: employeeId } })}>
                              Approve
                            </Button>
                            <Button size="sm" variant="outline" className="text-red-700 border-red-200"
                              onClick={() => actionMutation.mutate({ id: req.id, action: 'reject', payload: { managerId: employeeId, reason: '' } })}>
                              Reject
                            </Button>
                          </div>
                        )}
                        {activeTab === 'my' && (req.status === 'PENDING' || req.status === 'TARGET_ACCEPTED') && (
                          <Button size="sm" variant="outline" className="text-[var(--text-secondary)]"
                            onClick={() => actionMutation.mutate({ id: req.id, action: 'cancel', payload: { employeeId } })}>
                            Cancel
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create modal */}
      {showModal && (
        <div className="fixed inset-0 bg-[var(--bg-overlay)] flex items-center justify-center z-50">
          <Card className="w-full max-w-lg mx-4">
            <CardHeader>
              <CardTitle>New Shift Swap Request</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmitForm)} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Type *</label>
                  <select
                    {...register('swapType')}
                    className="w-full border border-[var(--border-strong)] rounded-md px-3 py-2 text-sm"
                  >
                    <option value="SWAP">Shift Swap (exchange with another employee)</option>
                    <option value="GIVE_AWAY">Give Away (transfer shift to another employee)</option>
                    <option value="PICK_UP">Pick Up (take an available shift)</option>
                  </select>
                  {errors.swapType && (
                    <p className="mt-1 text-xs text-red-500">{errors.swapType.message}</p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">My Shift Date *</label>
                    <input
                      type="date"
                      {...register('requesterShiftDate')}
                      className={`w-full border ${errors.requesterShiftDate ? 'border-red-500' : 'border-[var(--border-strong)]'} rounded-md px-3 py-2 text-sm`}
                    />
                    {errors.requesterShiftDate && (
                      <p className="mt-1 text-xs text-red-500">{errors.requesterShiftDate.message}</p>
                    )}
                  </div>
                  {watchedSwapType === 'SWAP' && (
                    <div>
                      <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Target Shift Date</label>
                      <input
                        type="date"
                        {...register('targetShiftDate')}
                        className="w-full border border-[var(--border-strong)] rounded-md px-3 py-2 text-sm"
                      />
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">My Assignment ID *</label>
                  <input
                    type="text"
                    {...register('requesterAssignmentId')}
                    placeholder="UUID of your shift assignment"
                    className={`w-full border ${errors.requesterAssignmentId ? 'border-red-500' : 'border-[var(--border-strong)]'} rounded-md px-3 py-2 text-sm`}
                  />
                  {errors.requesterAssignmentId && (
                    <p className="mt-1 text-xs text-red-500">{errors.requesterAssignmentId.message}</p>
                  )}
                </div>
                {watchedSwapType !== 'PICK_UP' && (
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Target Employee ID</label>
                    <input
                      type="text"
                      {...register('targetEmployeeId')}
                      placeholder="UUID of the other employee"
                      className="w-full border border-[var(--border-strong)] rounded-md px-3 py-2 text-sm"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Reason</label>
                  <textarea
                    {...register('reason')}
                    rows={2}
                    placeholder="Optional reason for the swap"
                    className="w-full border border-[var(--border-strong)] rounded-md px-3 py-2 text-sm"
                  />
                </div>
                <div className="flex gap-4 justify-end pt-2">
                  <Button type="button" variant="outline" onClick={handleModalClose}>Cancel</Button>
                  <Button type="submit" disabled={submitMutation.isPending}>
                    {submitMutation.isPending ? 'Submitting...' : 'Submit Request'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </AppLayout>
  );
}
