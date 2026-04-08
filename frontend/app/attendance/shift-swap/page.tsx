'use client';

import {useEffect, useState} from 'react';
import {useRouter} from 'next/navigation';
import {useForm} from 'react-hook-form';
import {Permissions, usePermissions} from '@/lib/hooks/usePermissions';
import {useAuth} from '@/lib/hooks/useAuth';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';
import {ArrowLeftRight, PlusCircle} from 'lucide-react';
import {notifications} from '@mantine/notifications';
import {Modal} from '@mantine/core';
import {AppLayout} from '@/components/layout';
import {Card, CardContent} from '@/components/ui/Card';
import {Button} from '@/components/ui/Button';
import {TablePagination} from '@/components/ui';
import {SkeletonTable} from '@/components/ui/Skeleton';
import {EmployeeSearchAutocomplete} from '@/components/ui/EmployeeSearchAutocomplete';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {apiClient} from '@/lib/api/client';
import {shiftService} from '@/lib/services/hrms/shift.service';
import {ShiftAssignment} from '@/lib/types/hrms/shift';

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

interface ApiError {
  response?: {
    data?: {
      message?: string;
    };
  };
}

const statusColors: Record<string, string> = {
  PENDING: 'tint-warning text-warning-700',
  TARGET_ACCEPTED: 'tint-info text-accent-700',
  TARGET_DECLINED: 'tint-danger text-danger-700',
  PENDING_APPROVAL: 'tint-orange text-warning-700',
  APPROVED: 'tint-success text-success-700',
  REJECTED: 'tint-danger text-danger-700',
  COMPLETED: 'tint-success text-success-800',
  CANCELLED: 'bg-[var(--bg-surface)] text-[var(--text-muted)]',
};

const swapTypeLabels: Record<string, string> = {
  SWAP: 'Shift Swap',
  GIVE_AWAY: 'Give Away',
  PICK_UP: 'Pick Up',
};

// ─── Zod Schema ────────────────────────────────────────────────────────────────

const shiftSwapSchema = z.object({
  swapType: z.enum(['SWAP', 'GIVE_AWAY', 'PICK_UP']),
  requesterShiftDate: z.string().min(1, 'My shift date is required'),
  targetShiftDate: z.string().optional(),
  requesterAssignmentId: z.string().min(1, 'Please select your shift assignment'),
  targetEmployeeId: z.string().optional(),
  reason: z.string().optional(),
});

type ShiftSwapFormData = z.infer<typeof shiftSwapSchema>;

export default function ShiftSwapPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'my' | 'incoming' | 'approval'>('my');
  const [myPage, setMyPage] = useState(0);
  const [myPageSize, setMyPageSize] = useState(20);
  const {hasAnyPermission, isReady} = usePermissions();

  const hasAccess = hasAnyPermission(
    Permissions.ATTENDANCE_VIEW_SELF,
    Permissions.ATTENDANCE_VIEW_ALL,
    Permissions.SHIFT_VIEW,
    Permissions.ATTENDANCE_MANAGE,
  );

  useEffect(() => {
    if (isReady && !hasAccess) {
      router.replace('/me/dashboard');
    }
  }, [isReady, hasAccess, router]);

  const [showModal, setShowModal] = useState(false);
  const [selectedTargetEmployee, setSelectedTargetEmployee] = useState<{ id: string; name: string } | null>(null);
  const {user} = useAuth();
  const employeeId = user?.employeeId;

  const {
    register,
    handleSubmit,
    watch,
    reset,
    setValue,
    formState: {errors},
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

  // Fetch the current user's active shift assignments for the dropdown
  const {data: myAssignmentsData} = useQuery({
    queryKey: ['shift-assignments', 'employee', employeeId],
    queryFn: () => shiftService.getEmployeeAssignments(employeeId!, 0, 50),
    enabled: !!employeeId && showModal,
    staleTime: 2 * 60 * 1000,
  });

  const activeAssignments = (myAssignmentsData?.content ?? []).filter(
    (a: ShiftAssignment) => a.status === 'ACTIVE'
  );

  const {data: myRequestsData, isLoading: loadingMy} = useQuery<{
    content: ShiftSwapRequest[];
    totalPages: number;
    totalElements: number
  }>({
    queryKey: ['shift-swap', 'my', employeeId, myPage, myPageSize],
    queryFn: () => apiClient.get<{
      content: ShiftSwapRequest[];
      totalPages: number;
      totalElements: number
    }>(`/shift-swaps/my-requests/${employeeId}`, {params: {page: myPage, size: myPageSize}}).then(r => r.data),
    enabled: activeTab === 'my' && !!employeeId,
  });

  const {data: incomingRequests, isLoading: loadingIncoming} = useQuery<ShiftSwapRequest[]>({
    queryKey: ['shift-swap', 'incoming', employeeId],
    queryFn: () => apiClient.get<ShiftSwapRequest[]>(`/shift-swaps/incoming/${employeeId}`).then(r => r.data),
    enabled: activeTab === 'incoming' && !!employeeId,
  });

  const {data: pendingApproval, isLoading: loadingApproval} = useQuery<ShiftSwapRequest[]>({
    queryKey: ['shift-swap', 'pending-approval'],
    queryFn: () => apiClient.get<ShiftSwapRequest[]>('/shift-swaps/pending-approval').then(r => r.data),
    enabled: activeTab === 'approval' && !!employeeId,
  });

  const submitMutation = useMutation({
    mutationFn: (data: ShiftSwapFormData) =>
      apiClient.post('/shift-swaps', {...data, requesterEmployeeId: employeeId}),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['shift-swap']});
      setShowModal(false);
      setSelectedTargetEmployee(null);
      reset();
    },
    onError: () => notifications.show({title: 'Error', message: 'Failed to submit shift swap request', color: 'red'}),
  });

  const actionMutation = useMutation({
    mutationFn: ({id, action, payload}: { id: string; action: string; payload: Record<string, string> }) =>
      apiClient.post(`/shift-swaps/${id}/${action}`, payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({queryKey: ['shift-swap']});
      const actionLabels: Record<string, string> = {
        approve: 'approved',
        reject: 'rejected',
        accept: 'accepted',
        decline: 'declined',
        cancel: 'cancelled'
      };
      const label = actionLabels[variables.action] ?? variables.action;
      notifications.show({title: 'Success', message: `Shift swap request ${label} successfully`, color: 'green'});
    },
    onError: (error: ApiError) => {
      const errorMessage = error?.response?.data?.message || 'Failed to process the request';
      notifications.show({
        title: 'Action Failed',
        message: errorMessage,
        color: 'red',
      });
    },
  });

  if (!isReady || !hasAccess || !employeeId) return null;

  const onSubmitForm = (data: ShiftSwapFormData) => {
    submitMutation.mutate(data);
  };

  const handleModalClose = () => {
    setShowModal(false);
    setSelectedTargetEmployee(null);
    reset();
  };

  const tabs = [
    {key: 'my', label: 'My Requests'},
    {key: 'incoming', label: 'Incoming Requests'},
    {key: 'approval', label: 'Pending Approval'},
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
        <div className="row-between">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] skeuo-emboss">Shift Swap</h1>
            <p className="text-[var(--text-muted)] mt-1 skeuo-deboss">Request shift swaps, give-aways, and pick-ups</p>
          </div>
          <Button onClick={() => setShowModal(true)}>
            <PlusCircle className="w-4 h-4 mr-2"/>
            New Request
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => {
                setActiveTab(tab.key as 'my' | 'incoming' | 'approval');
                setMyPage(0);
              }}
              className={`cursor-pointer pb-2 px-4 text-sm font-medium border-b-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2 ${
                activeTab === tab.key
                  ? 'border-accent-600 text-accent-600'
                  : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <Card className="skeuo-card">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-4"><SkeletonTable rows={5} columns={5} /></div>
            ) : getDisplayData().length === 0 ? (
              <div className="p-8 text-center text-[var(--text-muted)]">
                <ArrowLeftRight className="w-10 h-10 mx-auto mb-2 text-[var(--text-muted)]"/>
                <p>No shift swap requests found.</p>
              </div>
            ) : (
              <table className="w-full text-sm table-aura">
                <thead>
                <tr className="border-b bg-[var(--bg-surface)] text-[var(--text-secondary)]">
                  <th className="px-4 py-2 text-left font-medium">Type</th>
                  <th className="px-4 py-2 text-left font-medium">Shift Date</th>
                  <th className="px-4 py-2 text-left font-medium">Target Date</th>
                  <th className="px-4 py-2 text-left font-medium">Reason</th>
                  <th className="px-4 py-2 text-left font-medium">Status</th>
                  <th className="px-4 py-2 text-left font-medium">Actions</th>
                </tr>
                </thead>
                <tbody>
                {getDisplayData().map((req: ShiftSwapRequest) => (
                  <tr key={req.id} className="border-b hover:bg-[var(--bg-surface)]">
                    <td className="px-4 py-4">
                        <span className="flex items-center gap-1.5 text-[var(--text-primary)]">
                          <ArrowLeftRight className="w-3.5 h-3.5"/>
                          {swapTypeLabels[req.swapType]}
                        </span>
                    </td>
                    <td className="px-4 py-4 font-medium">{req.requesterShiftDate}</td>
                    <td className="px-4 py-4">{req.targetShiftDate ?? '—'}</td>
                    <td className="px-4 py-4 text-[var(--text-secondary)] max-w-xs truncate">{req.reason ?? '—'}</td>
                    <td className="px-4 py-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-medium badge-status ${statusColors[req.status]}`}>
                          {req.status.replace(/_/g, ' ')}
                        </span>
                    </td>
                    <td className="px-4 py-4">
                      {activeTab === 'incoming' && req.status === 'PENDING' && (
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" className="text-success-700 border-success-200"
                                  disabled={actionMutation.isPending}
                                  onClick={() => actionMutation.mutate({
                                    id: req.id,
                                    action: 'accept',
                                    payload: {employeeId}
                                  })}>
                            Accept
                          </Button>
                          <Button size="sm" variant="outline" className="text-danger-700 border-danger-200"
                                  disabled={actionMutation.isPending}
                                  onClick={() => actionMutation.mutate({
                                    id: req.id,
                                    action: 'decline',
                                    payload: {employeeId}
                                  })}>
                            Decline
                          </Button>
                        </div>
                      )}
                      {activeTab === 'approval' && req.status === 'PENDING_APPROVAL' && (
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" className="text-success-700 border-success-200"
                                  disabled={actionMutation.isPending}
                                  onClick={() => actionMutation.mutate({
                                    id: req.id,
                                    action: 'approve',
                                    payload: {managerId: employeeId}
                                  })}>
                            Approve
                          </Button>
                          <Button size="sm" variant="outline" className="text-danger-700 border-danger-200"
                                  disabled={actionMutation.isPending}
                                  onClick={() => actionMutation.mutate({
                                    id: req.id,
                                    action: 'reject',
                                    payload: {managerId: employeeId, reason: ''}
                                  })}>
                            Reject
                          </Button>
                        </div>
                      )}
                      {activeTab === 'my' && (req.status === 'PENDING' || req.status === 'TARGET_ACCEPTED') && (
                        <Button size="sm" variant="outline" className="text-[var(--text-secondary)]"
                                disabled={actionMutation.isPending}
                                onClick={() => actionMutation.mutate({
                                  id: req.id,
                                  action: 'cancel',
                                  payload: {employeeId}
                                })}>
                          Cancel
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
                </tbody>
              </table>
            )}

            {activeTab === 'my' && (myRequestsData?.totalElements ?? 0) > 0 && (
              <div className="px-4 pb-4">
                <TablePagination
                  currentPage={myPage}
                  totalPages={myRequestsData?.totalPages ?? 0}
                  totalItems={myRequestsData?.totalElements ?? 0}
                  pageSize={myPageSize}
                  onPageChange={setMyPage}
                  onPageSizeChange={(size) => {
                    setMyPageSize(size);
                    setMyPage(0);
                  }}
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create modal */}
      <Modal opened={showModal} onClose={handleModalClose} title="New Shift Swap Request" size="lg" centered>
        <form onSubmit={handleSubmit(onSubmitForm)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Type *</label>
            <select
              {...register('swapType')}
              className="input-aura"
            >
              <option value="SWAP">Shift Swap (exchange with another employee)</option>
              <option value="GIVE_AWAY">Give Away (transfer shift to another employee)</option>
              <option value="PICK_UP">Pick Up (take an available shift)</option>
            </select>
            {errors.swapType && (
              <p className="mt-1 text-xs text-danger-500">{errors.swapType.message}</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">My Shift Date *</label>
              <input
                type="date"
                {...register('requesterShiftDate')}
                className={`input-aura ${errors.requesterShiftDate ? 'border-danger-500' : ''}`}
              />
              {errors.requesterShiftDate && (
                <p className="mt-1 text-xs text-danger-500">{errors.requesterShiftDate.message}</p>
              )}
            </div>
            {watchedSwapType === 'SWAP' && (
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Target Shift Date</label>
                <input
                  type="date"
                  {...register('targetShiftDate')}
                  className="input-aura"
                />
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">My Shift Assignment *</label>
            <select
              {...register('requesterAssignmentId')}
              className={`input-aura ${errors.requesterAssignmentId ? 'border-danger-500' : ''}`}
            >
              <option value="">Select your shift assignment</option>
              {activeAssignments.map((a: ShiftAssignment) => (
                <option key={a.id} value={a.id}>
                  {a.shiftName} ({a.shiftCode}) — {a.assignmentDate} ({a.shiftStartTime}–{a.shiftEndTime})
                </option>
              ))}
            </select>
            {activeAssignments.length === 0 && (
              <p className="mt-1 text-caption">No active shift assignments found</p>
            )}
            {errors.requesterAssignmentId && (
              <p className="mt-1 text-xs text-danger-500">{errors.requesterAssignmentId.message}</p>
            )}
          </div>
          {watchedSwapType !== 'PICK_UP' && (
            <div>
              <EmployeeSearchAutocomplete
                label="Target Employee"
                placeholder="Search for an employee..."
                excludeIds={employeeId ? [employeeId] : []}
                value={selectedTargetEmployee}
                onChange={(emp) => {
                  setSelectedTargetEmployee(emp);
                  setValue('targetEmployeeId', emp?.id ?? '', {shouldValidate: true});
                }}
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Reason</label>
            <textarea
              {...register('reason')}
              rows={2}
              placeholder="Optional reason for the swap"
              className="input-aura"
            />
          </div>
          <div className="flex gap-4 justify-end pt-2">
            <Button type="button" variant="outline" onClick={handleModalClose}>Cancel</Button>
            <Button type="submit" disabled={submitMutation.isPending}>
              {submitMutation.isPending ? 'Submitting...' : 'Submit Request'}
            </Button>
          </div>
        </form>
      </Modal>
    </AppLayout>
  );
}
