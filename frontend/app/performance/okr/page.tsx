'use client';

import { useState, useEffect, useCallback } from 'react';
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
import { okrService, Objective, KeyResult, ObjectiveRequest, KeyResultRequest } from '@/lib/services/okr.service';

const OBJECTIVE_LEVELS = ['COMPANY', 'DEPARTMENT', 'TEAM', 'INDIVIDUAL'] as const;
const OBJECTIVE_STATUSES = ['DRAFT', 'ACTIVE', 'ON_TRACK', 'AT_RISK', 'BEHIND', 'COMPLETED', 'CANCELLED'] as const;
const MEASUREMENT_TYPES = ['PERCENTAGE', 'NUMBER', 'CURRENCY', 'BINARY', 'MILESTONE'] as const;

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
      return 'bg-gray-100 text-gray-800';
    case 'ACTIVE':
      return 'bg-blue-100 text-blue-800';
    case 'ON_TRACK':
      return 'bg-green-100 text-green-800';
    case 'AT_RISK':
      return 'bg-orange-100 text-orange-800';
    case 'BEHIND':
      return 'bg-red-100 text-red-800';
    case 'COMPLETED':
      return 'bg-emerald-100 text-emerald-800';
    case 'CANCELLED':
      return 'bg-gray-100 text-gray-500';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const getProgressColor = (progress: number) => {
  if (progress >= 80) return 'bg-green-500';
  if (progress >= 50) return 'bg-blue-500';
  if (progress >= 25) return 'bg-yellow-500';
  return 'bg-red-500';
};

const getKeyResultStatusIcon = (status: string) => {
  switch (status) {
    case 'COMPLETED':
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case 'ON_TRACK':
      return <CheckCircle className="h-4 w-4 text-blue-500" />;
    case 'AT_RISK':
      return <AlertTriangle className="h-4 w-4 text-orange-500" />;
    case 'BEHIND':
      return <AlertTriangle className="h-4 w-4 text-red-500" />;
    default:
      return <Clock className="h-4 w-4 text-gray-500" />;
  }
};

export default function OKRPage() {
  const [objectives, setObjectives] = useState<Objective[]>([]);
  const [companyObjectives, setCompanyObjectives] = useState<Objective[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedObjectives, setExpandedObjectives] = useState<Set<string>>(new Set());
  const [showObjectiveModal, setShowObjectiveModal] = useState(false);
  const [showKeyResultModal, setShowKeyResultModal] = useState(false);
  const [editingObjective, setEditingObjective] = useState<Objective | null>(null);
  const [selectedObjectiveId, setSelectedObjectiveId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'my' | 'company'>('my');
  const [filterLevel, setFilterLevel] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  const [objectiveForm, setObjectiveForm] = useState<ObjectiveRequest>({
    title: '',
    description: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    objectiveLevel: 'INDIVIDUAL',
    weight: 1,
    isStretchGoal: false,
  });

  const [keyResultForm, setKeyResultForm] = useState<KeyResultRequest>({
    title: '',
    description: '',
    measurementType: 'PERCENTAGE',
    startValue: 0,
    targetValue: 100,
    measurementUnit: '%',
    weight: 1,
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [myOkrs, companyOkrs] = await Promise.all([
        okrService.getMyObjectives(),
        okrService.getCompanyObjectives(),
      ]);
      setObjectives(myOkrs || []);
      setCompanyObjectives(companyOkrs || []);
    } catch (err) {
      console.error('Error fetching OKRs:', err);
      setError('Failed to load OKRs');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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

  const handleCreateObjective = async () => {
    try {
      await okrService.createObjective(objectiveForm);
      setShowObjectiveModal(false);
      resetObjectiveForm();
      fetchData();
    } catch (err) {
      console.error('Error creating objective:', err);
      setError('Failed to create objective');
    }
  };

  const handleUpdateObjective = async () => {
    if (!editingObjective) return;
    try {
      await okrService.updateObjective(editingObjective.id, objectiveForm);
      setShowObjectiveModal(false);
      setEditingObjective(null);
      resetObjectiveForm();
      fetchData();
    } catch (err) {
      console.error('Error updating objective:', err);
      setError('Failed to update objective');
    }
  };

  const handleDeleteObjective = async (id: string) => {
    if (!confirm('Are you sure you want to delete this objective?')) return;
    try {
      await okrService.deleteObjective(id);
      fetchData();
    } catch (err) {
      console.error('Error deleting objective:', err);
      setError('Failed to delete objective');
    }
  };

  const handleAddKeyResult = async () => {
    if (!selectedObjectiveId) return;
    try {
      await okrService.addKeyResult(selectedObjectiveId, keyResultForm);
      setShowKeyResultModal(false);
      setSelectedObjectiveId(null);
      resetKeyResultForm();
      fetchData();
    } catch (err) {
      console.error('Error adding key result:', err);
      setError('Failed to add key result');
    }
  };

  const handleUpdateKeyResultProgress = async (krId: string, newValue: number) => {
    try {
      await okrService.updateKeyResultProgress(krId, newValue);
      fetchData();
    } catch (err) {
      console.error('Error updating key result:', err);
      setError('Failed to update progress');
    }
  };

  const handleDeleteKeyResult = async (id: string) => {
    if (!confirm('Are you sure you want to delete this key result?')) return;
    try {
      await okrService.deleteKeyResult(id);
      fetchData();
    } catch (err) {
      console.error('Error deleting key result:', err);
      setError('Failed to delete key result');
    }
  };

  const resetObjectiveForm = () => {
    setObjectiveForm({
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
    setKeyResultForm({
      title: '',
      description: '',
      measurementType: 'PERCENTAGE',
      startValue: 0,
      targetValue: 100,
      measurementUnit: '%',
      weight: 1,
    });
  };

  const openEditObjective = (objective: Objective) => {
    setEditingObjective(objective);
    setObjectiveForm({
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

  const displayedObjectives = activeTab === 'my' ? objectives : companyObjectives;
  const filteredObjectives = displayedObjectives.filter((obj) => {
    if (filterLevel !== 'ALL' && obj.objectiveLevel !== filterLevel) return false;
    if (filterStatus !== 'ALL' && obj.status !== filterStatus) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">OKR Management</h1>
          <p className="text-sm text-gray-500 mt-1">
            Objectives and Key Results tracking
          </p>
        </div>
        <button
          onClick={() => {
            resetObjectiveForm();
            setEditingObjective(null);
            setShowObjectiveModal(true);
          }}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="h-5 w-5 mr-2" />
          New Objective
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('my')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'my'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            My Objectives ({objectives.length})
          </button>
          <button
            onClick={() => setActiveTab('company')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'company'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
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
          className="px-3 py-2 border border-gray-300 rounded-md text-sm"
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
          className="px-3 py-2 border border-gray-300 rounded-md text-sm"
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
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <Flag className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No objectives</h3>
            <p className="mt-1 text-sm text-gray-500">
              Get started by creating a new objective.
            </p>
          </div>
        ) : (
          filteredObjectives.map((objective) => (
            <div
              key={objective.id}
              className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden"
            >
              {/* Objective Header */}
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <button
                      onClick={() => toggleExpanded(objective.id)}
                      className="mt-1 text-gray-400 hover:text-gray-600"
                    >
                      {expandedObjectives.has(objective.id) ? (
                        <ChevronDown className="h-5 w-5" />
                      ) : (
                        <ChevronRight className="h-5 w-5" />
                      )}
                    </button>
                    <div className="text-gray-400">{getLevelIcon(objective.objectiveLevel)}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-medium text-gray-900">{objective.title}</h3>
                        {objective.isStretchGoal && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                            Stretch
                          </span>
                        )}
                      </div>
                      {objective.description && (
                        <p className="text-sm text-gray-500 mb-2">{objective.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-gray-500">
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
                      <div className="text-2xl font-bold text-gray-900">
                        {objective.progressPercentage}%
                      </div>
                      <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${getProgressColor(objective.progressPercentage)}`}
                          style={{ width: `${objective.progressPercentage}%` }}
                        />
                      </div>
                    </div>
                    {activeTab === 'my' && (
                      <>
                        <button
                          onClick={() => openEditObjective(objective)}
                          className="p-2 text-gray-400 hover:text-blue-600"
                        >
                          <Pencil className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDeleteObjective(objective.id)}
                          className="p-2 text-gray-400 hover:text-red-600"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Key Results */}
              {expandedObjectives.has(objective.id) && (
                <div className="border-t border-gray-200 bg-gray-50 px-4 py-3">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="text-sm font-medium text-gray-700">
                      Key Results ({objective.keyResults?.length || 0})
                    </h4>
                    {activeTab === 'my' && (
                      <button
                        onClick={() => openAddKeyResult(objective.id)}
                        className="text-sm text-blue-600 hover:text-blue-700 flex items-center"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add Key Result
                      </button>
                    )}
                  </div>
                  {objective.keyResults && objective.keyResults.length > 0 ? (
                    <div className="space-y-3">
                      {objective.keyResults.map((kr) => (
                        <div
                          key={kr.id}
                          className="bg-white rounded-md border border-gray-200 p-3"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-2 flex-1">
                              {getKeyResultStatusIcon(kr.status)}
                              <div className="flex-1">
                                <div className="font-medium text-gray-900 text-sm">
                                  {kr.title}
                                </div>
                                {kr.description && (
                                  <p className="text-xs text-gray-500 mt-1">{kr.description}</p>
                                )}
                                <div className="flex items-center gap-4 mt-2">
                                  <div className="flex-1">
                                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                                      <span>
                                        {kr.currentValue} / {kr.targetValue}{' '}
                                        {kr.measurementUnit}
                                      </span>
                                      <span>{kr.progressPercentage}%</span>
                                    </div>
                                    <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
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
                                        className="w-16 px-2 py-1 text-xs border border-gray-300 rounded"
                                      />
                                      <button
                                        onClick={() => handleDeleteKeyResult(kr.id)}
                                        className="p-1 text-gray-400 hover:text-red-600"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </button>
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
                    <p className="text-sm text-gray-500 text-center py-4">
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
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingObjective ? 'Edit Objective' : 'Create Objective'}
              </h2>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  value={objectiveForm.title}
                  onChange={(e) =>
                    setObjectiveForm({ ...objectiveForm, title: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="What do you want to achieve?"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={objectiveForm.description}
                  onChange={(e) =>
                    setObjectiveForm({ ...objectiveForm, description: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  rows={3}
                  placeholder="Why is this important?"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    value={objectiveForm.startDate}
                    onChange={(e) =>
                      setObjectiveForm({ ...objectiveForm, startDate: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Date *
                  </label>
                  <input
                    type="date"
                    value={objectiveForm.endDate}
                    onChange={(e) =>
                      setObjectiveForm({ ...objectiveForm, endDate: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Level
                  </label>
                  <select
                    value={objectiveForm.objectiveLevel}
                    onChange={(e) =>
                      setObjectiveForm({ ...objectiveForm, objectiveLevel: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    {OBJECTIVE_LEVELS.map((level) => (
                      <option key={level} value={level}>
                        {level.replace('_', ' ')}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Weight
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={10}
                    step={0.1}
                    value={objectiveForm.weight}
                    onChange={(e) =>
                      setObjectiveForm({
                        ...objectiveForm,
                        weight: parseFloat(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isStretchGoal"
                  checked={objectiveForm.isStretchGoal}
                  onChange={(e) =>
                    setObjectiveForm({ ...objectiveForm, isStretchGoal: e.target.checked })
                  }
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                />
                <label htmlFor="isStretchGoal" className="ml-2 text-sm text-gray-700">
                  This is a stretch goal (ambitious target)
                </label>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowObjectiveModal(false);
                  setEditingObjective(null);
                  resetObjectiveForm();
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={editingObjective ? handleUpdateObjective : handleCreateObjective}
                disabled={!objectiveForm.title}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
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
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Add Key Result</h2>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  value={keyResultForm.title}
                  onChange={(e) =>
                    setKeyResultForm({ ...keyResultForm, title: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="What measurable outcome will you achieve?"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={keyResultForm.description}
                  onChange={(e) =>
                    setKeyResultForm({ ...keyResultForm, description: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Measurement Type
                  </label>
                  <select
                    value={keyResultForm.measurementType}
                    onChange={(e) =>
                      setKeyResultForm({ ...keyResultForm, measurementType: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    {MEASUREMENT_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Unit
                  </label>
                  <input
                    type="text"
                    value={keyResultForm.measurementUnit}
                    onChange={(e) =>
                      setKeyResultForm({ ...keyResultForm, measurementUnit: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="%"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Value
                  </label>
                  <input
                    type="number"
                    value={keyResultForm.startValue}
                    onChange={(e) =>
                      setKeyResultForm({
                        ...keyResultForm,
                        startValue: parseFloat(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Target Value *
                  </label>
                  <input
                    type="number"
                    value={keyResultForm.targetValue}
                    onChange={(e) =>
                      setKeyResultForm({
                        ...keyResultForm,
                        targetValue: parseFloat(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Weight
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={10}
                    step={0.1}
                    value={keyResultForm.weight}
                    onChange={(e) =>
                      setKeyResultForm({
                        ...keyResultForm,
                        weight: parseFloat(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Due Date
                </label>
                <input
                  type="date"
                  value={keyResultForm.dueDate || ''}
                  onChange={(e) =>
                    setKeyResultForm({ ...keyResultForm, dueDate: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowKeyResultModal(false);
                  setSelectedObjectiveId(null);
                  resetKeyResultForm();
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAddKeyResult}
                disabled={!keyResultForm.title || !keyResultForm.targetValue}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                Add Key Result
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
