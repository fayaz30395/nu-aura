'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Plus,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronRight,
  Flag,
  CheckCircle,
  AlertTriangle,
  Clock,
  Building2,
  Users,
  User,
} from 'lucide-react';
import { AppLayout } from '@/components/layout';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { PermissionGate } from '@/components/auth/PermissionGate';
import { Permissions } from '@/lib/hooks/usePermissions';
import {
  useMyObjectives,
  useCompanyObjectives,
  useCreateObjective,
  useUpdateObjective,
  useDeleteObjective,
  useAddKeyResult,
  useUpdateKeyResultProgress,
  useDeleteKeyResult,
} from '@/lib/hooks/queries/usePerformance';
import type { Objective, KeyResult, ObjectiveRequest, KeyResultRequest } from '@/lib/services/grow/okr.service';

const OBJECTIVE_LEVELS = ['COMPANY', 'DEPARTMENT', 'TEAM', 'INDIVIDUAL'] as const;
const OBJECTIVE_STATUSES = ['DRAFT', 'ACTIVE', 'ON_TRACK', 'AT_RISK', 'BEHIND', 'COMPLETED', 'CANCELLED'] as const;
const MEASUREMENT_TYPES = ['PERCENTAGE', 'NUMBER', 'CURRENCY', 'BINARY', 'MILESTONE'] as const;

const objectiveFormSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional().or(z.literal('')),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  objectiveLevel: z.string().min(1),
  weight: z.number().min(0).max(10),
  isStretchGoal: z.boolean(),
});

type ObjectiveFormData = z.infer<typeof objectiveFormSchema>;

const keyResultFormSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional().or(z.literal('')),
  measurementType: z.string().min(1),
  startValue: z.number(),
  targetValue: z.number().min(0.01, 'Target value must be greater than 0'),
  measurementUnit: z.string().optional().or(z.literal('')),
  weight: z.number().min(0).max(10),
  dueDate: z.string().optional().or(z.literal('')),
});

type KeyResultFormData = z.infer<typeof keyResultFormSchema>;

const getLevelIcon = (level: string) => {
  switch (level) {
    case 'COMPANY':
      return <Building2 className="h-5 w-5" />;
    case 'DEPARTMENT':
      return <Building2 className="h-5 w-5" />;
    case 'TEAM':
      return <Users className="h-5 w-5" />;
    case 'INDIVIDUAL':
      return <User className="h-5 w-5" />;
    default:
      return <Flag className="h-5 w-5" />;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'DRAFT':
      return 'bg-[var(--bg-surface)] text-[var(--text-primary)]';
    case 'ACTIVE':
      return 'bg-accent-100 text-accent-800';
    case 'ON_TRACK':
      return 'bg-success-100 text-success-800';
    case 'AT_RISK':
      return 'bg-warning-100 text-warning-800';
    case 'BEHIND':
      return 'bg-danger-100 text-danger-800';
    case 'COMPLETED':
      return 'bg-success-100 text-success-800';
    case 'CANCELLED':
      return 'bg-[var(--bg-surface)] text-[var(--text-muted)]';
    default:
      return 'bg-[var(--bg-surface)] text-[var(--text-primary)]';
  }
};

const getProgressColor = (progress: number) => {
  if (progress >= 80) return 'bg-success-500';
  if (progress >= 50) return 'bg-accent-500';
  if (progress >= 25) return 'bg-warning-500';
  return 'bg-danger-500';
};

const getKeyResultStatusIcon = (status: string) => {
  switch (status) {
    case 'COMPLETED':
      return <CheckCircle className="h-4 w-4 text-success-500" />;
    case 'ON_TRACK':
      return <CheckCircle className="h-4 w-4 text-accent-500" />;
    case 'AT_RISK':
      return <AlertTriangle className="h-4 w-4 text-warning-500" />;
    case 'BEHIND':
      return <AlertTriangle className="h-4 w-4 text-danger-500" />;
    default:
      return <Clock className="h-4 w-4 text-[var(--text-muted)]" />;
  }
};

export default function OKRPage() {
  // React Query hooks
  const myObjectivesQuery = useMyObjectives();
  const companyObjectivesQuery = useCompanyObjectives();
  const createObjectiveMutation = useCreateObjective();
  const updateObjectiveMutation = useUpdateObjective();
  const deleteObjectiveMutation = useDeleteObjective();
  const addKeyResultMutation = useAddKeyResult();
  const updateKeyResultProgressMutation = useUpdateKeyResultProgress();
  const deleteKeyResultMutation = useDeleteKeyResult();

  // Local state
  const [expandedObjectives, setExpandedObjectives] = useState<Set<string>>(new Set());
  const [showObjectiveModal, setShowObjectiveModal] = useState(false);
  const [showKeyResultModal, setShowKeyResultModal] = useState(false);
  const [editingObjective, setEditingObjective] = useState<Objective | null>(null);
  const [selectedObjectiveId, setSelectedObjectiveId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'my' | 'company'>('my');
  const [filterLevel, setFilterLevel] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [deleteObjectiveConfirm, setDeleteObjectiveConfirm] = useState<string | null>(null);
  const [deleteKeyResultConfirm, setDeleteKeyResultConfirm] = useState<string | null>(null);

  const objectiveForm = useForm<ObjectiveFormData>({
    resolver: zodResolver(objectiveFormSchema),
    defaultValues: {
      title: '',
      description: '',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      objectiveLevel: 'INDIVIDUAL',
      weight: 1,
      isStretchGoal: false,
    },
  });

  const keyResultForm = useForm<KeyResultFormData>({
    resolver: zodResolver(keyResultFormSchema),
    defaultValues: {
      title: '',
      description: '',
      measurementType: 'PERCENTAGE',
      startValue: 0,
      targetValue: 100,
      measurementUnit: '%',
      weight: 1,
      dueDate: '',
    },
  });

  const toggleExpanded = (id: string) => {
    setExpandedObjectives((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleCreateObjective = async (data: ObjectiveFormData) => {
    await createObjectiveMutation.mutateAsync(data as ObjectiveRequest);
    setShowObjectiveModal(false);
    resetObjectiveForm();
  };

  const handleUpdateObjective = async (data: ObjectiveFormData) => {
    if (!editingObjective) return;
    await updateObjectiveMutation.mutateAsync({ id: editingObjective.id, data: data as ObjectiveRequest });
    setShowObjectiveModal(false);
    setEditingObjective(null);
    resetObjectiveForm();
  };

  const handleDeleteObjective = async (id: string) => {
    await deleteObjectiveMutation.mutateAsync(id);
  };

  const handleAddKeyResult = async (data: KeyResultFormData) => {
    if (!selectedObjectiveId) return;
    await addKeyResultMutation.mutateAsync({ objectiveId: selectedObjectiveId, data: data as KeyResultRequest });
    setShowKeyResultModal(false);
    setSelectedObjectiveId(null);
    resetKeyResultForm();
  };

  const handleUpdateKeyResultProgress = async (krId: string, newValue: number) => {
    await updateKeyResultProgressMutation.mutateAsync({ id: krId, value: newValue });
  };

  const handleDeleteKeyResult = async (id: string) => {
    await deleteKeyResultMutation.mutateAsync(id);
  };

  const resetObjectiveForm = () => {
    objectiveForm.reset({
      title: '',
      description: '',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      objectiveLevel: 'INDIVIDUAL',
      weight: 1,
      isStretchGoal: false,
    });
  };

  const resetKeyResultForm = () => {
    keyResultForm.reset({
      title: '',
      description: '',
      measurementType: 'PERCENTAGE',
      startValue: 0,
      targetValue: 100,
      measurementUnit: '%',
      weight: 1,
      dueDate: '',
    });
  };

  const openEditObjective = (objective: Objective) => {
    setEditingObjective(objective);
    objectiveForm.reset({
      title: objective.title,
      description: objective.description || '',
      startDate: objective.startDate.split('T')[0],
      endDate: objective.endDate.split('T')[0],
      objectiveLevel: objective.objectiveLevel,
      weight: objective.weight,
      isStretchGoal: objective.isStretchGoal,
    });
    setShowObjectiveModal(true);
  };

  const openAddKeyResult = (objectiveId: string) => {
    setSelectedObjectiveId(objectiveId);
    resetKeyResultForm();
    setShowKeyResultModal(true);
  };

  const objectives = myObjectivesQuery.data || [];
  const companyObjectives = companyObjectivesQuery.data || [];
  const isLoading = myObjectivesQuery.isLoading || companyObjectivesQuery.isLoading;

  const displayedObjectives = activeTab === 'my' ? objectives : companyObjectives;
  const filteredObjectives = displayedObjectives.filter((obj: Objective) => {
    if (filterLevel !== 'ALL' && obj.objectiveLevel !== filterLevel) return false;
    if (filterStatus !== 'ALL' && obj.status !== filterStatus) return false;
    return true;
  });

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-600"></div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] skeuo-emboss">OKR Management</h1>
          <p className="text-body-muted mt-1">
            Objectives and Key Results tracking
          </p>
        </div>
        <PermissionGate permission={Permissions.OKR_CREATE}>
          <button
            onClick={() => {
              resetObjectiveForm();
              setEditingObjective(null);
              setShowObjectiveModal(true);
            }}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-[var(--shadow-card)] text-sm font-medium text-white bg-accent-600 hover:bg-accent-700"
          >
            <Plus className="h-5 w-5 mr-2" />
            New Objective
          </button>
        </PermissionGate>
      </div>

      {/* Tabs */}
      <div className="border-b border-[var(--border-main)] mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('my')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'my'
                ? 'border-accent-500 text-accent-600'
                : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)]'
            }`}
          >
            My Objectives ({objectives.length})
          </button>
          <button
            onClick={() => setActiveTab('company')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'company'
                ? 'border-accent-500 text-accent-600'
                : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)]'
            }`}
          >
            Company Objectives ({companyObjectives.length})
          </button>
        </nav>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <select
          value={filterLevel}
          onChange={(e) => setFilterLevel(e.target.value)}
          className="px-4 py-2 border border-[var(--border-strong)] rounded-md text-sm"
        >
          <option value="ALL">All Levels</option>
          {OBJECTIVE_LEVELS.map((level) => (
            <option key={level} value={level}>
              {level.replace('_', ' ')}
            </option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2 border border-[var(--border-strong)] rounded-md text-sm"
        >
          <option value="ALL">All Statuses</option>
          {OBJECTIVE_STATUSES.map((status) => (
            <option key={status} value={status}>
              {status.replace('_', ' ')}
            </option>
          ))}
        </select>
      </div>

      {/* Objectives List */}
      <div className="space-y-4">
        {filteredObjectives.length === 0 ? (
          <div className="text-center py-12 bg-[var(--bg-card)] rounded-lg border border-[var(--border-main)]">
            <Flag className="mx-auto h-12 w-12 text-[var(--text-muted)]" />
            <h3 className="mt-2 text-sm font-medium text-[var(--text-primary)]">No objectives</h3>
            <p className="mt-1 text-body-muted">
              Get started by creating a new objective.
            </p>
          </div>
        ) : (
          filteredObjectives.map((objective: Objective) => (
            <div
              key={objective.id}
              className="bg-[var(--bg-card)] rounded-lg border border-[var(--border-main)] shadow-[var(--shadow-card)] overflow-hidden"
            >
              {/* Objective Header */}
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <button
                      onClick={() => toggleExpanded(objective.id)}
                      className="mt-1 text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                    >
                      {expandedObjectives.has(objective.id) ? (
                        <ChevronDown className="h-5 w-5" />
                      ) : (
                        <ChevronRight className="h-5 w-5" />
                      )}
                    </button>
                    <div className="text-[var(--text-muted)]">{getLevelIcon(objective.objectiveLevel)}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-medium text-[var(--text-primary)]">{objective.title}</h3>
                        {objective.isStretchGoal && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-accent-300 text-accent-900">
                            Stretch
                          </span>
                        )}
                      </div>
                      {objective.description && (
                        <p className="text-body-muted mb-2">{objective.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-caption">
                        <span>{objective.objectiveLevel}</span>
                        <span>
                          {new Date(objective.startDate).toLocaleDateString()} -{' '}
                          {new Date(objective.endDate).toLocaleDateString()}
                        </span>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                            objective.status
                          )}`}
                        >
                          {objective.status.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right mr-4">
                      <div className="text-2xl font-bold text-[var(--text-primary)] skeuo-emboss">
                        {objective.progressPercentage}%
                      </div>
                      <div className="w-24 h-2 bg-[var(--border-main)] rounded-full overflow-hidden">
                        <div
                          className={`h-full ${getProgressColor(objective.progressPercentage)}`}
                          style={{ width: `${objective.progressPercentage}%` }}
                        />
                      </div>
                    </div>
                    {activeTab === 'my' && (
                      <>
                        <PermissionGate permission={Permissions.OKR_UPDATE}>
                          <button
                            onClick={() => openEditObjective(objective)}
                            className="p-2 text-[var(--text-muted)] hover:text-accent-600"
                          >
                            <Pencil className="h-5 w-5" />
                          </button>
                        </PermissionGate>
                        <PermissionGate permission={Permissions.OKR_DELETE}>
                          <button
                            onClick={() => setDeleteObjectiveConfirm(objective.id)}
                            className="p-2 text-[var(--text-muted)] hover:text-danger-600"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </PermissionGate>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Key Results */}
              {expandedObjectives.has(objective.id) && (
                <div className="border-t border-[var(--border-main)] bg-[var(--bg-surface)] px-4 py-4">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="text-sm font-medium text-[var(--text-primary)]">
                      Key Results ({objective.keyResults?.length || 0})
                    </h4>
                    {activeTab === 'my' && (
                      <PermissionGate permission={Permissions.OKR_UPDATE}>
                        <button
                          onClick={() => openAddKeyResult(objective.id)}
                          className="text-sm text-accent-600 hover:text-accent-700 flex items-center"
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Add Key Result
                        </button>
                      </PermissionGate>
                    )}
                  </div>
                  {objective.keyResults && objective.keyResults.length > 0 ? (
                    <div className="space-y-4">
                      {objective.keyResults.map((kr: KeyResult) => (
                        <div
                          key={kr.id}
                          className="bg-[var(--bg-card)] rounded-md border border-[var(--border-main)] p-4"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-2 flex-1">
                              {getKeyResultStatusIcon(kr.status)}
                              <div className="flex-1">
                                <div className="font-medium text-[var(--text-primary)] text-sm">
                                  {kr.title}
                                </div>
                                {kr.description && (
                                  <p className="text-caption mt-1">{kr.description}</p>
                                )}
                                <div className="flex items-center gap-4 mt-2">
                                  <div className="flex-1">
                                    <div className="flex justify-between text-caption mb-1">
                                      <span>
                                        {kr.currentValue} / {kr.targetValue}{' '}
                                        {kr.measurementUnit}
                                      </span>
                                      <span>{kr.progressPercentage}%</span>
                                    </div>
                                    <div className="w-full h-1.5 bg-[var(--border-main)] rounded-full overflow-hidden">
                                      <div
                                        className={`h-full ${getProgressColor(
                                          kr.progressPercentage
                                        )}`}
                                        style={{ width: `${kr.progressPercentage}%` }}
                                      />
                                    </div>
                                  </div>
                                  {activeTab === 'my' && (
                                    <div className="flex items-center gap-1">
                                      <input
                                        type="number"
                                        min={kr.startValue}
                                        max={kr.targetValue}
                                        value={kr.currentValue}
                                        onChange={(e) =>
                                          handleUpdateKeyResultProgress(
                                            kr.id,
                                            parseFloat(e.target.value)
                                          )
                                        }
                                        className="w-16 px-2 py-1 text-xs border border-[var(--border-strong)] rounded"
                                      />
                                      <PermissionGate permission={Permissions.OKR_DELETE}>
                                        <button
                                          onClick={() => setDeleteKeyResultConfirm(kr.id)}
                                          className="p-1 text-[var(--text-muted)] hover:text-danger-600"
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </button>
                                      </PermissionGate>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-body-muted text-center py-4">
                      No key results yet. Add some to track progress.
                    </p>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Objective Modal */}
      {showObjectiveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-[var(--bg-elevated)] rounded-lg shadow-[var(--shadow-dropdown)] max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-[var(--border-main)]">
              <h2 className="text-xl font-semibold text-[var(--text-primary)]">
                {editingObjective ? 'Edit Objective' : 'Create Objective'}
              </h2>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  {...objectiveForm.register('title')}
                  className="w-full px-4 py-2 border border-[var(--border-strong)] rounded-md"
                  placeholder="What do you want to achieve?"
                />
                {objectiveForm.formState.errors.title && (
                  <p className="text-danger-500 text-xs mt-1">{objectiveForm.formState.errors.title.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                  Description
                </label>
                <textarea
                  {...objectiveForm.register('description')}
                  className="w-full px-4 py-2 border border-[var(--border-strong)] rounded-md"
                  rows={3}
                  placeholder="Why is this important?"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    {...objectiveForm.register('startDate')}
                    className="w-full px-4 py-2 border border-[var(--border-strong)] rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                    End Date *
                  </label>
                  <input
                    type="date"
                    {...objectiveForm.register('endDate')}
                    className="w-full px-4 py-2 border border-[var(--border-strong)] rounded-md"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                    Level
                  </label>
                  <select
                    {...objectiveForm.register('objectiveLevel')}
                    className="w-full px-4 py-2 border border-[var(--border-strong)] rounded-md"
                  >
                    {OBJECTIVE_LEVELS.map((level) => (
                      <option key={level} value={level}>
                        {level.replace('_', ' ')}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                    Weight
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={10}
                    step={0.1}
                    {...objectiveForm.register('weight', { valueAsNumber: true })}
                    className="w-full px-4 py-2 border border-[var(--border-strong)] rounded-md"
                  />
                </div>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isStretchGoal"
                  {...objectiveForm.register('isStretchGoal')}
                  className="h-4 w-4 text-accent-600 border-[var(--border-strong)] rounded"
                />
                <label htmlFor="isStretchGoal" className="ml-2 text-sm text-[var(--text-primary)]">
                  This is a stretch goal (ambitious target)
                </label>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-[var(--border-main)] flex justify-end gap-4">
              <button
                onClick={() => {
                  setShowObjectiveModal(false);
                  setEditingObjective(null);
                  resetObjectiveForm();
                }}
                className="px-4 py-2 text-sm font-medium text-[var(--text-primary)] bg-[var(--bg-card)] border border-[var(--border-strong)] rounded-md hover:bg-[var(--bg-surface)]"
              >
                Cancel
              </button>
              <button
                onClick={objectiveForm.handleSubmit(editingObjective ? handleUpdateObjective : handleCreateObjective)}
                disabled={!objectiveForm.formState.isValid && objectiveForm.formState.isSubmitted}
                className="px-4 py-2 text-sm font-medium text-white bg-accent-600 rounded-md hover:bg-accent-700 disabled:opacity-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
              >
                {editingObjective ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Key Result Modal */}
      {showKeyResultModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-[var(--bg-elevated)] rounded-lg shadow-[var(--shadow-dropdown)] max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-[var(--border-main)]">
              <h2 className="text-xl font-semibold text-[var(--text-primary)]">Add Key Result</h2>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  {...keyResultForm.register('title')}
                  className="w-full px-4 py-2 border border-[var(--border-strong)] rounded-md"
                  placeholder="What measurable outcome will you achieve?"
                />
                {keyResultForm.formState.errors.title && (
                  <p className="text-danger-500 text-xs mt-1">{keyResultForm.formState.errors.title.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                  Description
                </label>
                <textarea
                  {...keyResultForm.register('description')}
                  className="w-full px-4 py-2 border border-[var(--border-strong)] rounded-md"
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                    Measurement Type
                  </label>
                  <select
                    {...keyResultForm.register('measurementType')}
                    className="w-full px-4 py-2 border border-[var(--border-strong)] rounded-md"
                  >
                    {MEASUREMENT_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                    Unit
                  </label>
                  <input
                    type="text"
                    {...keyResultForm.register('measurementUnit')}
                    className="w-full px-4 py-2 border border-[var(--border-strong)] rounded-md"
                    placeholder="%"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                    Start Value
                  </label>
                  <input
                    type="number"
                    {...keyResultForm.register('startValue', { valueAsNumber: true })}
                    className="w-full px-4 py-2 border border-[var(--border-strong)] rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                    Target Value *
                  </label>
                  <input
                    type="number"
                    {...keyResultForm.register('targetValue', { valueAsNumber: true })}
                    className="w-full px-4 py-2 border border-[var(--border-strong)] rounded-md"
                  />
                  {keyResultForm.formState.errors.targetValue && (
                    <p className="text-danger-500 text-xs mt-1">{keyResultForm.formState.errors.targetValue.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                    Weight
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={10}
                    step={0.1}
                    {...keyResultForm.register('weight', { valueAsNumber: true })}
                    className="w-full px-4 py-2 border border-[var(--border-strong)] rounded-md"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                  Due Date
                </label>
                <input
                  type="date"
                  {...keyResultForm.register('dueDate')}
                  className="w-full px-4 py-2 border border-[var(--border-strong)] rounded-md"
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-[var(--border-main)] flex justify-end gap-4">
              <button
                onClick={() => {
                  setShowKeyResultModal(false);
                  setSelectedObjectiveId(null);
                  resetKeyResultForm();
                }}
                className="px-4 py-2 text-sm font-medium text-[var(--text-primary)] bg-[var(--bg-card)] border border-[var(--border-strong)] rounded-md hover:bg-[var(--bg-surface)]"
              >
                Cancel
              </button>
              <button
                onClick={keyResultForm.handleSubmit(handleAddKeyResult)}
                disabled={!keyResultForm.formState.isValid && keyResultForm.formState.isSubmitted}
                className="px-4 py-2 text-sm font-medium text-white bg-accent-600 rounded-md hover:bg-accent-700 disabled:opacity-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
              >
                Add Key Result
              </button>
            </div>
          </div>
        </div>
      )}
    </div>

      {/* Delete Objective Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteObjectiveConfirm}
        onClose={() => setDeleteObjectiveConfirm(null)}
        onConfirm={async () => {
          if (deleteObjectiveConfirm) {
            await handleDeleteObjective(deleteObjectiveConfirm);
            setDeleteObjectiveConfirm(null);
          }
        }}
        title="Delete Objective"
        message="Are you sure you want to delete this objective? This action cannot be undone and all associated key results will be deleted."
        confirmText="Delete"
        type="danger"
      />

      {/* Delete Key Result Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteKeyResultConfirm}
        onClose={() => setDeleteKeyResultConfirm(null)}
        onConfirm={async () => {
          if (deleteKeyResultConfirm) {
            await handleDeleteKeyResult(deleteKeyResultConfirm);
            setDeleteKeyResultConfirm(null);
          }
        }}
        title="Delete Key Result"
        message="Are you sure you want to delete this key result? This action cannot be undone."
        confirmText="Delete"
        type="danger"
      />
    </AppLayout>
  );
}
