'use client';

import {useState} from 'react';
import {Button, NativeSelect} from '@mantine/core';
import {Plus, Target, UserCheck} from 'lucide-react';
import {AppLayout} from '@/components/layout';
import {PageHeader} from '@/components/ui/PageHeader';
import {QueryState} from '@/components/ui/QueryState';
import {EmptyState} from '@/components/ui/EmptyState';
import {ConfirmDialog} from '@/components/ui/ConfirmDialog';
import {ListPageSkeleton} from '@/components/ui/skeletons';
import {PermissionGate} from '@/components/auth/PermissionGate';
import {Permissions, usePermissions} from '@/lib/hooks/usePermissions';
import {useCreateGoal, useDeleteGoal, useEmployeeGoals, useUpdateGoal} from '@/lib/hooks/queries/useGoals';
import type {Goal, GoalRequest, GoalStatus, GoalType} from '@/lib/types/grow/performance';
import {useAuth} from '@/lib/hooks/useAuth';
import {createLogger} from '@/lib/utils/logger';
import {type GoalFormData, STATUS_FILTER_OPTIONS, TYPE_FILTER_OPTIONS} from './_components/goalConfig';
import {GoalCard} from './_components/GoalCard';
import {GoalFormModal} from './_components/GoalFormModal';

const log = createLogger('GoalsPage');

const BREADCRUMBS = [{label: 'Performance', href: '/performance'}, {label: 'Goals'}];

export default function GoalsPage() {
  const {user} = useAuth();
  const {hasPermission} = usePermissions();
  const goalsQuery = useEmployeeGoals(user?.employeeId || '');
  const createGoalMutation = useCreateGoal();
  const updateGoalMutation = useUpdateGoal();
  const deleteGoalMutation = useDeleteGoal();

  const [formOpen, setFormOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [deletingGoal, setDeletingGoal] = useState<Goal | null>(null);
  const [filterType, setFilterType] = useState<GoalType | 'ALL'>('ALL');
  const [filterStatus, setFilterStatus] = useState<GoalStatus | 'ALL'>('ALL');

  const openCreate = () => {
    setEditingGoal(null);
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditingGoal(null);
  };

  // Failures are reported by the global MutationCache toast; the dialog stays open so the user can retry.
  const handleSave = async (formData: GoalFormData) => {
    const goalData = {
      ...formData,
      employeeId: user?.employeeId || '',
      description: formData.description || '',
    };
    try {
      if (editingGoal) {
        await updateGoalMutation.mutateAsync({id: editingGoal.id, data: goalData as GoalRequest});
      } else {
        await createGoalMutation.mutateAsync(goalData as GoalRequest);
      }
    } catch (error: unknown) {
      log.error('Error saving goal:', error);
      return;
    }
    closeForm();
  };

  const handleDelete = async () => {
    if (!deletingGoal) return;
    try {
      await deleteGoalMutation.mutateAsync(deletingGoal.id);
    } catch (error: unknown) {
      log.error('Error deleting goal:', error);
      return;
    }
    setDeletingGoal(null);
  };

  if (!user?.employeeId) {
    return (
      <AppLayout activeMenuItem="performance" breadcrumbs={BREADCRUMBS}>
        <EmptyState
          icon={<UserCheck className="h-full w-full"/>}
          title="No Employee Profile Linked"
          description="Goal management requires an employee profile. Use the admin panels to manage employee goals."
          actionLabel="Go Back"
          onAction={() => window.history.back()}
        />
      </AppLayout>
    );
  }

  const filtersActive = filterType !== 'ALL' || filterStatus !== 'ALL';
  const canCreate = hasPermission(Permissions.GOAL_CREATE);

  return (
    <AppLayout activeMenuItem="performance" breadcrumbs={BREADCRUMBS}>
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <PageHeader
          title="Goals"
          description="Set, track and update progress on your goals."
          actions={
            <PermissionGate permission={Permissions.GOAL_CREATE}>
              <Button leftSection={<Plus className="h-4 w-4" aria-hidden/>} onClick={openCreate}>
                Create Goal
              </Button>
            </PermissionGate>
          }
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:max-w-2xl">
          <NativeSelect
            id="filter-goal-type"
            label="Filter by Type"
            data={TYPE_FILTER_OPTIONS}
            value={filterType}
            onChange={(e) => setFilterType(e.currentTarget.value as GoalType | 'ALL')}
          />
          <NativeSelect
            id="filter-goal-status"
            label="Filter by Status"
            data={STATUS_FILTER_OPTIONS}
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.currentTarget.value as GoalStatus | 'ALL')}
          />
        </div>

        <QueryState
          query={goalsQuery}
          skeleton={<ListPageSkeleton showHeader={false} showFilters={false} rows={4} columns={3}/>}
          errorTitle="Couldn't load goals"
        >
          {(data) => {
            const goals = (data || []).filter(goal =>
              (filterType === 'ALL' || goal.goalType === filterType) &&
              (filterStatus === 'ALL' || goal.status === filterStatus));

            if (goals.length === 0) {
              return filtersActive ? (
                <EmptyState
                  icon={<Target className="h-full w-full"/>}
                  title="No goals found"
                  description="No goals match the selected filters."
                  actionLabel="Clear filters"
                  onAction={() => {
                    setFilterType('ALL');
                    setFilterStatus('ALL');
                  }}
                />
              ) : (
                <EmptyState
                  icon={<Target className="h-full w-full"/>}
                  title="No goals found"
                  description={canCreate
                    ? 'Create your first goal to start tracking progress.'
                    : 'Check back once goals have been created.'}
                  {...(canCreate ? {actionLabel: 'Create Your First Goal', onAction: openCreate} : {})}
                />
              );
            }

            return (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {goals.map(goal => (
                  <GoalCard
                    key={goal.id}
                    goal={goal}
                    onEdit={(g) => {
                      setEditingGoal(g);
                      setFormOpen(true);
                    }}
                    onDelete={setDeletingGoal}
                  />
                ))}
              </div>
            );
          }}
        </QueryState>
      </div>

      <GoalFormModal
        isOpen={formOpen}
        goal={editingGoal}
        employeeId={user.employeeId}
        isSaving={createGoalMutation.isPending || updateGoalMutation.isPending}
        onClose={closeForm}
        onSubmit={handleSave}
      />

      <ConfirmDialog
        isOpen={!!deletingGoal}
        onClose={() => setDeletingGoal(null)}
        onConfirm={handleDelete}
        title="Delete Goal?"
        message={`This action cannot be undone. "${deletingGoal?.title ?? ''}" will be permanently deleted.`}
        confirmText="Delete"
        type="danger"
        loading={deleteGoalMutation.isPending}
      />
    </AppLayout>
  );
}
