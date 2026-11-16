'use client';

import {useState} from 'react';
import {Button, NativeSelect} from '@mantine/core';
import {CalendarClock, Plus} from 'lucide-react';
import {AppLayout} from '@/components/layout';
import {PageHeader} from '@/components/ui/PageHeader';
import {QueryState} from '@/components/ui/QueryState';
import {EmptyState} from '@/components/ui/EmptyState';
import {ConfirmDialog} from '@/components/ui/ConfirmDialog';
import {ListPageSkeleton} from '@/components/ui/skeletons';
import {PermissionGate} from '@/components/auth/PermissionGate';
import {Permissions, usePermissions} from '@/lib/hooks/usePermissions';
import type {
  ActivateCycleRequest,
  ActivateCycleResponse,
  CycleStatus,
  CycleType,
  ReviewCycle,
  ReviewCycleRequest,
} from '@/lib/types/grow/performance';
import {
  useActivatePerformanceCycle,
  useCreatePerformanceCycle,
  useDeletePerformanceCycle,
  usePerformanceAllCycles,
  useUpdatePerformanceCycle,
} from '@/lib/hooks/queries/useReviewCycles';
import {useActiveDepartments} from '@/lib/hooks/queries/useDepartments';
import {useActiveOfficeLocations} from '@/lib/hooks/queries/useOfficeLocations';
import {CycleCard} from './_components/CycleCard';
import {CycleFormModal} from './_components/CycleFormModal';
import {ActivateCycleModal} from './_components/ActivateCycleModal';
import {ActivationResultModal} from './_components/ActivationResultModal';
import {CYCLE_STATUS_OPTIONS, CYCLE_TYPE_OPTIONS} from './_components/cycleOptions';

const TYPE_FILTER_OPTIONS = [{value: 'ALL', label: 'All Types'}, ...CYCLE_TYPE_OPTIONS];
const STATUS_FILTER_OPTIONS = [{value: 'ALL', label: 'All Status'}, ...CYCLE_STATUS_OPTIONS];

export default function ReviewCyclesPage() {
  const cyclesQuery = usePerformanceAllCycles();
  const {data: departments = []} = useActiveDepartments();
  const {data: locations = []} = useActiveOfficeLocations();
  const createMutation = useCreatePerformanceCycle();
  const updateMutation = useUpdatePerformanceCycle();
  const deleteMutation = useDeletePerformanceCycle();
  const activateMutation = useActivatePerformanceCycle();
  const {hasPermission} = usePermissions();

  const [formOpen, setFormOpen] = useState(false);
  const [editingCycle, setEditingCycle] = useState<ReviewCycle | null>(null);
  const [deletingCycle, setDeletingCycle] = useState<ReviewCycle | null>(null);
  const [activatingCycle, setActivatingCycle] = useState<ReviewCycle | null>(null);
  const [activationResult, setActivationResult] = useState<ActivateCycleResponse | null>(null);
  const [filterType, setFilterType] = useState<CycleType | 'ALL'>('ALL');
  const [filterStatus, setFilterStatus] = useState<CycleStatus | 'ALL'>('ALL');

  const openCreate = () => {
    setEditingCycle(null);
    setFormOpen(true);
  };

  const openEdit = (cycle: ReviewCycle) => {
    setEditingCycle(cycle);
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditingCycle(null);
  };

  // Failures are reported by the global MutationCache toast; the dialog stays open so the user can retry.
  const handleSave = async (data: ReviewCycleRequest) => {
    try {
      if (editingCycle) {
        await updateMutation.mutateAsync({id: editingCycle.id, data});
      } else {
        await createMutation.mutateAsync(data);
      }
    } catch {
      return;
    }
    closeForm();
  };

  const handleDelete = () => {
    if (!deletingCycle) return;
    deleteMutation.mutate(deletingCycle.id, {onSuccess: () => setDeletingCycle(null)});
  };

  const handleActivate = (data: ActivateCycleRequest) => {
    if (!activatingCycle) return;
    activateMutation.mutate(
      {id: activatingCycle.id, data},
      {
        onSuccess: (result) => {
          setActivatingCycle(null);
          setActivationResult(result);
        },
      },
    );
  };

  const filtersActive = filterType !== 'ALL' || filterStatus !== 'ALL';
  const canCreate = hasPermission(Permissions.REVIEW_CREATE);

  return (
    <AppLayout
      activeMenuItem="performance"
      breadcrumbs={[{label: 'Performance', href: '/performance'}, {label: 'Review Cycles'}]}
    >
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <PageHeader
          title="Review Cycles"
          description="Plan, activate and track performance review cycles."
          actions={
            <PermissionGate permission={Permissions.REVIEW_CREATE}>
              <Button leftSection={<Plus className="h-4 w-4" aria-hidden/>} onClick={openCreate}>
                Create Cycle
              </Button>
            </PermissionGate>
          }
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:max-w-2xl">
          <NativeSelect
            id="filterType"
            label="Filter by Type"
            data={TYPE_FILTER_OPTIONS}
            value={filterType}
            onChange={(e) => setFilterType(e.currentTarget.value as CycleType | 'ALL')}
          />
          <NativeSelect
            id="filterStatus"
            label="Filter by Status"
            data={STATUS_FILTER_OPTIONS}
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.currentTarget.value as CycleStatus | 'ALL')}
          />
        </div>

        <QueryState
          query={cyclesQuery}
          skeleton={<ListPageSkeleton showHeader={false} showFilters={false} rows={4} columns={3}/>}
          errorTitle="Couldn't load review cycles"
        >
          {(response) => {
            const cycles = (response?.content ?? []).filter(cycle =>
              (filterType === 'ALL' || cycle.cycleType === filterType) &&
              (filterStatus === 'ALL' || cycle.status === filterStatus));

            if (cycles.length === 0) {
              return filtersActive ? (
                <EmptyState
                  icon={<CalendarClock className="h-full w-full"/>}
                  title="No review cycles found"
                  description="No cycles match the selected filters."
                  actionLabel="Clear filters"
                  onAction={() => {
                    setFilterType('ALL');
                    setFilterStatus('ALL');
                  }}
                />
              ) : (
                <EmptyState
                  icon={<CalendarClock className="h-full w-full"/>}
                  title="No review cycles found"
                  description="Create a cycle to start collecting self and manager reviews."
                  {...(canCreate ? {actionLabel: 'Create Your First Cycle', onAction: openCreate} : {})}
                />
              );
            }

            return (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {cycles.map((cycle) => (
                  <CycleCard
                    key={cycle.id}
                    cycle={cycle}
                    onActivate={setActivatingCycle}
                    onEdit={openEdit}
                    onDelete={setDeletingCycle}
                  />
                ))}
              </div>
            );
          }}
        </QueryState>
      </div>

      <CycleFormModal
        isOpen={formOpen}
        cycle={editingCycle}
        isSaving={createMutation.isPending || updateMutation.isPending}
        onClose={closeForm}
        onSubmit={handleSave}
      />

      <ConfirmDialog
        isOpen={!!deletingCycle}
        onClose={() => setDeletingCycle(null)}
        onConfirm={handleDelete}
        title="Delete Review Cycle?"
        message={`This action cannot be undone. "${deletingCycle?.name ?? deletingCycle?.cycleName ?? ''}" will be permanently deleted.`}
        confirmText="Delete"
        type="danger"
        loading={deleteMutation.isPending}
      />

      <ActivateCycleModal
        cycle={activatingCycle}
        departments={departments}
        locations={locations}
        isActivating={activateMutation.isPending}
        onClose={() => setActivatingCycle(null)}
        onActivate={handleActivate}
      />

      <ActivationResultModal result={activationResult} onClose={() => setActivationResult(null)}/>
    </AppLayout>
  );
}
