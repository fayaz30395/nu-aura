'use client';

import {useEffect, useState} from 'react';
import {useRouter} from 'next/navigation';
import {Controller, useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';
import {AlertCircle, Ban, CheckCircle, Clock, PlusCircle, XCircle} from 'lucide-react';
import {notifications} from '@mantine/notifications';
import {Button, Modal, Tabs, Textarea} from '@mantine/core';
import {DateInput} from '@mantine/dates';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {AppLayout} from '@/components/layout';
import {Callout} from '@/components/ui/Callout';
import {EmptyState} from '@/components/ui/EmptyState';
import {PageHeader} from '@/components/ui/PageHeader';
import {QueryState} from '@/components/ui/QueryState';
import {ResponsiveTable, TablePagination, type Column} from '@/components/ui/ResponsiveTable';
import {ListPageSkeleton} from '@/components/ui/skeletons';
import {StatusBadge} from '@/components/ui/StatusBadge';
import {Permissions, usePermissions} from '@/lib/hooks/usePermissions';
import {useAuth} from '@/lib/hooks/useAuth';
import {apiClient} from '@/lib/api/client';
import type {StatusMeta} from '@/lib/status/vocabulary';

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

type CompOffTab = 'my' | 'pending';

const compOffSchema = z.object({
  attendanceDate: z.string().min(1, 'Please select an attendance date'),
  reason: z.string().optional(),
});

type CompOffFormData = z.infer<typeof compOffSchema>;

const COMP_OFF_STATUS: Record<string, StatusMeta> = {
  PENDING: {label: 'Pending', tone: 'warning', icon: AlertCircle},
  APPROVED: {label: 'Approved', tone: 'info', icon: CheckCircle},
  REJECTED: {label: 'Rejected', tone: 'danger', icon: XCircle},
  CREDITED: {label: 'Credited', tone: 'success', icon: CheckCircle},
};

const COLUMNS: Column<CompOffRequest>[] = [
  {
    key: 'date',
    header: 'Date',
    mobilePriority: 'primary',
    accessor: (r) => <span className="font-medium text-text-1">{r.attendanceDate}</span>,
  },
  {
    key: 'overtime',
    header: 'Overtime',
    mobileLabel: 'Overtime',
    numeric: true,
    accessor: (r) => `${Math.floor(r.overtimeMinutes / 60)}h ${r.overtimeMinutes % 60}m`,
  },
  {
    key: 'days',
    header: 'Days',
    mobileLabel: 'Days',
    numeric: true,
    accessor: (r) => <span className="font-semibold text-text-1">{r.compOffDays}</span>,
  },
  {
    key: 'reason',
    header: 'Reason',
    mobilePriority: 'hidden',
    accessor: (r) => <span className="block max-w-xs truncate text-text-2">{r.reason ?? '—'}</span>,
  },
  {
    key: 'status',
    header: 'Status',
    mobileLabel: 'Status',
    accessor: (r) => <StatusBadge status={r.status} meta={COMP_OFF_STATUS[r.status] ?? {label: r.status, tone: 'neutral', icon: Ban}}/>,
  },
];

const SKELETON = <ListPageSkeleton rows={5} columns={5} showHeader={false} showFilters={false}/>;

export default function CompOffPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showRequestModal, setShowRequestModal] = useState(false);
  const {hasAnyPermission, isPermissionReady} = usePermissions();

  const hasAccess = hasAnyPermission(
    Permissions.ATTENDANCE_VIEW_SELF,
    Permissions.ATTENDANCE_VIEW_ALL,
    Permissions.ATTENDANCE_MANAGE,
  );

  // Kept: the /attendance/comp-off route config gates on REGULARIZE/APPROVE, not these permissions.
  useEffect(() => {
    if (isPermissionReady && !hasAccess) {
      router.replace('/me/dashboard?denied=1');
    }
  }, [isPermissionReady, hasAccess, router]);

  const [activeTab, setActiveTab] = useState<CompOffTab>('my');
  const [pendingPage, setPendingPage] = useState(0);
  const [pendingPageSize, setPendingPageSize] = useState(20);
  const {user} = useAuth();
  const employeeId = user?.employeeId;

  const {control, handleSubmit, reset, register, formState: {errors}} = useForm<CompOffFormData>({
    resolver: zodResolver(compOffSchema),
    defaultValues: {attendanceDate: '', reason: ''},
  });

  const myQuery = useQuery<CompOffRequest[]>({
    queryKey: ['comp-off', 'my', employeeId],
    queryFn: () => apiClient.get<CompOffRequest[]>(`/comp-off/my-pending/${employeeId}`).then(r => r.data),
    enabled: !!employeeId,
  });

  const pendingQuery = useQuery<PageResponse<CompOffRequest>>({
    queryKey: ['comp-off', 'pending', pendingPage, pendingPageSize],
    queryFn: () => apiClient.get<PageResponse<CompOffRequest>>('/comp-off/pending', {
      params: {page: pendingPage, size: pendingPageSize},
    }).then(r => r.data),
    enabled: activeTab === 'pending' && !!employeeId,
  });

  const requestMutation = useMutation({
    mutationFn: (data: {employeeId: string; attendanceDate: string; reason?: string}) =>
      apiClient.post('/comp-off/request', data),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['comp-off']});
      setShowRequestModal(false);
      reset();
    },
    meta: {skipGlobalError: true},
    onError: () => notifications.show({title: 'Error', message: 'Failed to submit comp-off request', color: 'red'}),
  });

  const approveMutation = useMutation({
    mutationFn: ({id, action}: {id: string; action: 'approve' | 'reject'}) =>
      apiClient.post(`/comp-off/${id}/${action}`, {reviewerId: employeeId, note: ''}),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({queryKey: ['comp-off']});
      const actionLabel = variables.action === 'approve' ? 'approved' : 'rejected';
      notifications.show({
        title: 'Success',
        message: `Comp-off request ${actionLabel} successfully`,
        color: variables.action === 'approve' ? 'green' : 'orange',
      });
    },
    meta: {skipGlobalError: true},
    onError: () => {
      notifications.show({title: 'Error', message: 'Failed to process comp-off request', color: 'red'});
    },
  });

  const ready = isPermissionReady && hasAccess && !!employeeId;

  const onSubmitForm = (data: CompOffFormData) => {
    if (!employeeId) return;
    requestMutation.mutate({employeeId, attendanceDate: data.attendanceDate, reason: data.reason});
  };

  const handleModalClose = () => {
    setShowRequestModal(false);
    reset();
  };

  const emptyState = (
    <EmptyState
      icon={<Clock className="h-full w-full"/>}
      title="No comp-off requests"
      description={
        activeTab === 'my'
          ? 'Worked overtime? Request a comp-off credit for that day.'
          : 'There are no comp-off requests waiting for approval.'
      }
      actionLabel={activeTab === 'my' ? 'Request comp-off' : undefined}
      onAction={activeTab === 'my' ? () => setShowRequestModal(true) : undefined}
      size="compact"
    />
  );

  return (
    <AppLayout>
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <PageHeader
          title="Compensatory Off"
          description="Request and manage comp-off credits for overtime work"
          breadcrumbs={[{label: 'Attendance', href: '/attendance'}, {label: 'Comp-Off'}]}
          actions={
            ready ? (
              <Button leftSection={<PlusCircle size={16} aria-hidden/>} onClick={() => setShowRequestModal(true)}>
                Request Comp-Off
              </Button>
            ) : undefined
          }
        />

        <Callout tone="info" title="Eligibility">
          Minimum 60 minutes overtime required. Half-day credited for 4h+, full day for 8h+. Requests are
          auto-approved after 7 days if no manager action.
        </Callout>

        {!ready ? (
          SKELETON
        ) : (
          <Tabs
            value={activeTab}
            onChange={(v) => {
              if (!v) return;
              setActiveTab(v as CompOffTab);
              setPendingPage(0);
            }}
            keepMounted={false}
          >
            <Tabs.List>
              <Tabs.Tab value="my">My Requests</Tabs.Tab>
              <Tabs.Tab value="pending">Pending Approval</Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel value="my" pt="md">
              <QueryState query={myQuery} skeleton={SKELETON} errorTitle="Couldn't load your comp-off requests">
                {(data) => (
                  <ResponsiveTable
                    columns={COLUMNS}
                    data={data ?? []}
                    keyExtractor={(r) => r.id}
                    stickyHeader
                    emptyState={emptyState}
                  />
                )}
              </QueryState>
            </Tabs.Panel>

            <Tabs.Panel value="pending" pt="md">
              <QueryState query={pendingQuery} skeleton={SKELETON} errorTitle="Couldn't load pending comp-off requests">
                {(data) => (
                  <div className="flex flex-col gap-4">
                    <ResponsiveTable
                      columns={COLUMNS}
                      data={data.content ?? []}
                      keyExtractor={(r) => r.id}
                      stickyHeader
                      emptyState={emptyState}
                      rowActionsMenu={(r) => [
                        {
                          label: 'Approve',
                          onClick: () => approveMutation.mutate({id: r.id, action: 'approve'}),
                          disabled: approveMutation.isPending,
                        },
                        {
                          label: 'Reject',
                          color: 'red',
                          onClick: () => approveMutation.mutate({id: r.id, action: 'reject'}),
                          disabled: approveMutation.isPending,
                        },
                      ]}
                    />
                    {(data.totalElements ?? 0) > 0 && (
                      <TablePagination
                        currentPage={pendingPage}
                        totalPages={data.totalPages ?? 0}
                        totalItems={data.totalElements ?? 0}
                        pageSize={pendingPageSize}
                        onPageChange={setPendingPage}
                        onPageSizeChange={(size) => {
                          setPendingPageSize(size);
                          setPendingPage(0);
                        }}
                      />
                    )}
                  </div>
                )}
              </QueryState>
            </Tabs.Panel>
          </Tabs>
        )}
      </div>

      <Modal opened={showRequestModal} onClose={handleModalClose} title="Request Comp-Off" size="md" centered>
        <form onSubmit={handleSubmit(onSubmitForm)} noValidate className="flex flex-col gap-4">
          <Controller
            name="attendanceDate"
            control={control}
            render={({field}) => (
              <DateInput
                id="comp-off-attendance-date"
                label="Attendance date"
                withAsterisk
                description="Must be a day with recorded overtime ≥ 60 minutes"
                value={field.value || null}
                onChange={(d) => field.onChange(d ?? '')}
                onBlur={field.onBlur}
                valueFormat="YYYY-MM-DD"
                placeholder="YYYY-MM-DD"
                clearable
                error={errors.attendanceDate?.message}
              />
            )}
          />
          <Textarea
            id="comp-off-reason"
            label="Reason"
            rows={3}
            placeholder="Optional: why you worked overtime"
            {...register('reason')}
          />
          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <Button type="button" variant="default" onClick={handleModalClose}>Cancel</Button>
            <Button type="submit" loading={requestMutation.isPending} disabled={requestMutation.isPending}>
              Submit Request
            </Button>
          </div>
        </form>
      </Modal>
    </AppLayout>
  );
}
