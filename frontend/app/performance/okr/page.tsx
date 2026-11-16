'use client';

import {useState} from 'react';
import {Button, NativeSelect, Tabs} from '@mantine/core';
import {Flag, Plus} from 'lucide-react';
import {AppLayout} from '@/components/layout';
import {Card} from '@/components/ui/Card';
import {ConfirmDialog} from '@/components/ui/ConfirmDialog';
import {EmptyState} from '@/components/ui/EmptyState';
import {PageHeader} from '@/components/ui/PageHeader';
import {QueryState} from '@/components/ui/QueryState';
import {ListPageSkeleton} from '@/components/ui/skeletons';
import {PermissionGate} from '@/components/auth/PermissionGate';
import {Permissions} from '@/lib/hooks/usePermissions';
import {
  useAddKeyResult,
  useCompanyObjectives,
  useCreateObjective,
  useDeleteKeyResult,
  useDeleteObjective,
  useMyObjectives,
  useUpdateKeyResultProgress,
  useUpdateObjective,
} from '@/lib/hooks/queries/useOkr';
import type {KeyResultRequest, Objective, ObjectiveRequest} from '@/lib/services/grow/okr.service';
import {humanize, OBJECTIVE_LEVELS, OBJECTIVE_STATUSES, type KeyResultFormData, type ObjectiveFormData} from './_components/okrConfig';
import {ObjectiveCard} from './_components/ObjectiveCard';
import {ObjectiveFormModal} from './_components/ObjectiveFormModal';
import {KeyResultFormModal} from './_components/KeyResultFormModal';

type OkrTab = 'my' | 'company';

const LEVEL_FILTER_OPTIONS = [
  {value: 'ALL', label: 'All Levels'},
  ...OBJECTIVE_LEVELS.map((level) => ({value: level, label: humanize(level)})),
];
const STATUS_FILTER_OPTIONS = [
  {value: 'ALL', label: 'All Statuses'},
  ...OBJECTIVE_STATUSES.map((status) => ({value: status, label: humanize(status)})),
];

export default function OKRPage() {
  const myObjectivesQuery = useMyObjectives();
  const companyObjectivesQuery = useCompanyObjectives();
  const createObjectiveMutation = useCreateObjective();
  const updateObjectiveMutation = useUpdateObjective();
  const deleteObjectiveMutation = useDeleteObjective();
  const addKeyResultMutation = useAddKeyResult();
  const updateKeyResultProgressMutation = useUpdateKeyResultProgress();
  const deleteKeyResultMutation = useDeleteKeyResult();

  const [expandedObjectives, setExpandedObjectives] = useState<Set<string>>(new Set());
  const [showObjectiveModal, setShowObjectiveModal] = useState(false);
  const [editingObjective, setEditingObjective] = useState<Objective | null>(null);
  const [keyResultObjectiveId, setKeyResultObjectiveId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<OkrTab>('my');
  const [filterLevel, setFilterLevel] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [deleteObjectiveConfirm, setDeleteObjectiveConfirm] = useState<string | null>(null);
  const [deleteKeyResultConfirm, setDeleteKeyResultConfirm] = useState<string | null>(null);
  const [savingKeyResultId, setSavingKeyResultId] = useState<string | null>(null);

  const toggleExpanded = (id: string) => {
    setExpandedObjectives((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const openCreateObjective = () => {
    setEditingObjective(null);
    setShowObjectiveModal(true);
  };

  const closeObjectiveModal = () => {
    setShowObjectiveModal(false);
    setEditingObjective(null);
  };

  // Failures are reported by the global MutationCache toast; modals stay open so the user can retry.
  const handleSaveObjective = async (data: ObjectiveFormData) => {
    if (createObjectiveMutation.isPending || updateObjectiveMutation.isPending) return;
    try {
      if (editingObjective) {
        await updateObjectiveMutation.mutateAsync({id: editingObjective.id, data: data as ObjectiveRequest});
      } else {
        await createObjectiveMutation.mutateAsync(data as ObjectiveRequest);
      }
    } catch {
      return;
    }
    closeObjectiveModal();
  };

  const handleDeleteObjective = async (id: string) => {
    if (deleteObjectiveMutation.isPending) return;
    try {
      await deleteObjectiveMutation.mutateAsync(id);
    } catch {
      return;
    }
    setDeleteObjectiveConfirm(null);
  };

  const handleAddKeyResult = async (data: KeyResultFormData) => {
    if (!keyResultObjectiveId || addKeyResultMutation.isPending) return;
    try {
      await addKeyResultMutation.mutateAsync({objectiveId: keyResultObjectiveId, data: data as KeyResultRequest});
    } catch {
      return;
    }
    setKeyResultObjectiveId(null);
  };

  const handleCommitProgress = async (krId: string, value: number) => {
    setSavingKeyResultId(krId);
    try {
      await updateKeyResultProgressMutation.mutateAsync({id: krId, value});
      return true;
    } catch {
      return false;
    } finally {
      setSavingKeyResultId(null);
    }
  };

  const handleDeleteKeyResult = async (id: string) => {
    if (deleteKeyResultMutation.isPending) return;
    try {
      await deleteKeyResultMutation.mutateAsync(id);
    } catch {
      return;
    }
    setDeleteKeyResultConfirm(null);
  };

  const myCount = myObjectivesQuery.data?.length ?? 0;
  const companyCount = companyObjectivesQuery.data?.length ?? 0;
  const activeQuery = activeTab === 'my' ? myObjectivesQuery : companyObjectivesQuery;
  const filtersActive = filterLevel !== 'ALL' || filterStatus !== 'ALL';

  const applyFilters = (list: Objective[]) =>
    list.filter((obj) =>
      (filterLevel === 'ALL' || obj.objectiveLevel === filterLevel) &&
      (filterStatus === 'ALL' || obj.status === filterStatus));

  const emptyState = filtersActive ? (
    <EmptyState
      icon={<Flag className="h-8 w-8"/>}
      title="No objectives"
      description="No objectives match these filters."
      actionLabel="Clear filters"
      onAction={() => {
        setFilterLevel('ALL');
        setFilterStatus('ALL');
      }}
    />
  ) : (
    <PermissionGate
      permission={Permissions.OKR_CREATE}
      fallback={
        <EmptyState
          icon={<Flag className="h-8 w-8"/>}
          title="No objectives"
          description="Adjust your filters or check back once objectives have been created."
        />
      }
    >
      <EmptyState
        icon={<Flag className="h-8 w-8"/>}
        title="No objectives"
        description="Get started by creating a new objective and breaking it into key results."
        actionLabel="New Objective"
        onAction={openCreateObjective}
      />
    </PermissionGate>
  );

  return (
    <AppLayout
      breadcrumbs={[{label: 'Performance', href: '/performance'}, {label: 'OKR Management'}]}
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-6 p-4 sm:p-6">
        <PageHeader
          title="OKR Management"
          description="Objectives and Key Results tracking"
          actions={
            <PermissionGate permission={Permissions.OKR_CREATE}>
              <Button leftSection={<Plus className="h-4 w-4"/>} onClick={openCreateObjective}>
                New Objective
              </Button>
            </PermissionGate>
          }
        />

        <Tabs value={activeTab} onChange={(value) => value && setActiveTab(value as OkrTab)}>
          <Tabs.List>
            <Tabs.Tab value="my">My Objectives ({myCount})</Tabs.Tab>
            <Tabs.Tab value="company">Company Objectives ({companyCount})</Tabs.Tab>
          </Tabs.List>
        </Tabs>

        <div className="flex flex-col gap-4 sm:flex-row">
          <NativeSelect
            aria-label="Filter by level"
            value={filterLevel}
            onChange={(e) => setFilterLevel(e.currentTarget.value)}
            data={LEVEL_FILTER_OPTIONS}
            className="sm:w-48"
          />
          <NativeSelect
            aria-label="Filter by status"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.currentTarget.value)}
            data={STATUS_FILTER_OPTIONS}
            className="sm:w-48"
          />
        </div>

        <QueryState
          query={activeQuery}
          skeleton={<ListPageSkeleton showHeader={false} showFilters={false} rows={4} columns={3}/>}
          errorTitle="Couldn't load objectives"
        >
          {(objectives) => {
            const filtered = applyFilters(objectives);
            if (filtered.length === 0) return <Card>{emptyState}</Card>;
            return (
              <div className="flex flex-col gap-4">
                {filtered.map((objective) => (
                  <ObjectiveCard
                    key={objective.id}
                    objective={objective}
                    expanded={expandedObjectives.has(objective.id)}
                    editable={activeTab === 'my'}
                    savingKeyResultId={savingKeyResultId}
                    onToggle={() => toggleExpanded(objective.id)}
                    onEdit={() => {
                      setEditingObjective(objective);
                      setShowObjectiveModal(true);
                    }}
                    onDelete={() => setDeleteObjectiveConfirm(objective.id)}
                    onAddKeyResult={() => setKeyResultObjectiveId(objective.id)}
                    onDeleteKeyResult={setDeleteKeyResultConfirm}
                    onCommitProgress={handleCommitProgress}
                  />
                ))}
              </div>
            );
          }}
        </QueryState>
      </div>

      <ObjectiveFormModal
        isOpen={showObjectiveModal}
        objective={editingObjective}
        isSaving={createObjectiveMutation.isPending || updateObjectiveMutation.isPending}
        onClose={closeObjectiveModal}
        onSubmit={handleSaveObjective}
      />

      <KeyResultFormModal
        isOpen={keyResultObjectiveId !== null}
        isSaving={addKeyResultMutation.isPending}
        onClose={() => setKeyResultObjectiveId(null)}
        onSubmit={handleAddKeyResult}
      />

      <ConfirmDialog
        isOpen={!!deleteObjectiveConfirm}
        onClose={() => setDeleteObjectiveConfirm(null)}
        onConfirm={async () => {
          if (deleteObjectiveConfirm) await handleDeleteObjective(deleteObjectiveConfirm);
        }}
        title="Delete Objective"
        message="Are you sure you want to delete this objective? This action cannot be undone and all associated key results will be deleted."
        confirmText="Delete"
        type="danger"
        loading={deleteObjectiveMutation.isPending}
      />

      <ConfirmDialog
        isOpen={!!deleteKeyResultConfirm}
        onClose={() => setDeleteKeyResultConfirm(null)}
        onConfirm={async () => {
          if (deleteKeyResultConfirm) await handleDeleteKeyResult(deleteKeyResultConfirm);
        }}
        title="Delete Key Result"
        message="Are you sure you want to delete this key result? This action cannot be undone."
        confirmText="Delete"
        type="danger"
        loading={deleteKeyResultMutation.isPending}
      />
    </AppLayout>
  );
}
