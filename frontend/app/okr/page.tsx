'use client';

import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout';
import { okrService, Objective, OkrSummary, ObjectiveRequest } from '@/lib/services/okr.service';

export default function OKRPage() {
  const [objectives, setObjectives] = useState<Objective[]>([]);
  const [summary, setSummary] = useState<OkrSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState<'my' | 'company'>('my');
  const [formData, setFormData] = useState<ObjectiveRequest>({
    title: '',
    description: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    objectiveLevel: 'INDIVIDUAL',
  });

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [objData, summaryData] = await Promise.all([
        activeTab === 'my' ? okrService.getMyObjectives() : okrService.getCompanyObjectives(),
        okrService.getDashboardSummary()
      ]);
      setObjectives(objData);
      setSummary(summaryData);
    } catch (error) {
      console.error('Error loading OKR data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await okrService.createObjective(formData);
      setShowForm(false);
      setFormData({
        title: '',
        description: '',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        objectiveLevel: 'INDIVIDUAL',
      });
      loadData();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to create objective');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ON_TRACK': return 'bg-green-100 text-green-800';
      case 'AT_RISK': return 'bg-yellow-100 text-yellow-800';
      case 'BEHIND': return 'bg-red-100 text-red-800';
      case 'COMPLETED': return 'bg-primary-50 dark:bg-primary-950/30 text-primary-600 dark:text-primary-400';
      case 'ACTIVE': return 'bg-purple-100 text-purple-800';
      default: return 'bg-surface-100 dark:bg-surface-800 text-surface-800 dark:text-surface-200';
    }
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 70) return 'bg-green-500';
    if (progress >= 40) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <AppLayout activeMenuItem="performance">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-surface-900 dark:text-surface-50">OKRs - Objectives & Key Results</h1>
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
          >
            Create Objective
          </button>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-surface-50 dark:bg-surface-800 rounded-lg shadow p-6">
              <div className="text-3xl font-bold text-primary-600 dark:text-primary-400">{summary.totalObjectives}</div>
              <div className="text-surface-600 dark:text-surface-400">Total Objectives</div>
            </div>
            <div className="bg-surface-50 dark:bg-surface-800 rounded-lg shadow p-6">
              <div className="text-3xl font-bold text-green-600 dark:text-green-400">{summary.activeObjectives}</div>
              <div className="text-surface-600 dark:text-surface-400">Active</div>
            </div>
            <div className="bg-surface-50 dark:bg-surface-800 rounded-lg shadow p-6">
              <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">{summary.completedObjectives}</div>
              <div className="text-surface-600 dark:text-surface-400">Completed</div>
            </div>
            <div className="bg-surface-50 dark:bg-surface-800 rounded-lg shadow p-6">
              <div className="text-3xl font-bold text-primary-600 dark:text-primary-400">{summary.averageProgress?.toFixed(1)}%</div>
              <div className="text-surface-600 dark:text-surface-400">Avg Progress</div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b mb-6">
          <button
            className={`px-6 py-3 font-medium ${activeTab === 'my' ? 'border-b-2 border-primary-500 text-primary-600 dark:text-primary-400' : 'text-surface-600 dark:text-surface-400'}`}
            onClick={() => setActiveTab('my')}
          >
            My Objectives
          </button>
          <button
            className={`px-6 py-3 font-medium ${activeTab === 'company' ? 'border-b-2 border-primary-500 text-primary-600 dark:text-primary-400' : 'text-surface-600 dark:text-surface-400'}`}
            onClick={() => setActiveTab('company')}
          >
            Company Objectives
          </button>
        </div>

        {/* Create Form */}
        {showForm && (
          <div className="bg-surface-50 dark:bg-surface-800 rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Create New Objective</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full p-2 border border-surface-300 dark:border-surface-600 rounded-lg bg-white dark:bg-surface-900"
                  placeholder="What do you want to achieve?"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full p-2 border border-surface-300 dark:border-surface-600 rounded-lg bg-white dark:bg-surface-900"
                  rows={3}
                  placeholder="Describe the objective..."
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Level</label>
                  <select
                    value={formData.objectiveLevel}
                    onChange={(e) => setFormData(prev => ({ ...prev, objectiveLevel: e.target.value }))}
                    className="w-full p-2 border border-surface-300 dark:border-surface-600 rounded-lg bg-white dark:bg-surface-900"
                  >
                    <option value="INDIVIDUAL">Individual</option>
                    <option value="TEAM">Team</option>
                    <option value="DEPARTMENT">Department</option>
                    <option value="COMPANY">Company</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Start Date *</label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                    className="w-full p-2 border border-surface-300 dark:border-surface-600 rounded-lg bg-white dark:bg-surface-900"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">End Date *</label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                    className="w-full p-2 border border-surface-300 dark:border-surface-600 rounded-lg bg-white dark:bg-surface-900"
                    required
                  />
                </div>
              </div>
              <div className="flex gap-4">
                <button type="submit" className="px-6 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600">
                  Create Objective
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-6 py-2 bg-surface-100 dark:bg-surface-800 text-surface-700 dark:text-surface-300 rounded-lg hover:bg-surface-50 dark:hover:bg-surface-800/50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Objectives List */}
        {loading ? (
          <div className="text-center py-8">Loading...</div>
        ) : (
          <div className="space-y-4">
            {objectives.map((objective) => (
              <div key={objective.id} className="bg-surface-50 dark:bg-surface-800 rounded-lg shadow-md p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold">{objective.title}</h3>
                    {objective.description && (
                      <p className="text-surface-600 dark:text-surface-400 mt-1">{objective.description}</p>
                    )}
                    <div className="flex gap-2 mt-2">
                      <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(objective.status)}`}>
                        {objective.status}
                      </span>
                      <span className="px-2 py-1 rounded-full text-xs bg-surface-100 dark:bg-surface-800 text-surface-800 dark:text-surface-200">
                        {objective.objectiveLevel}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold">{objective.progressPercentage?.toFixed(0) || 0}%</div>
                    <div className="text-sm text-surface-600 dark:text-surface-400">Progress</div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-surface-100 dark:bg-surface-800 rounded-full h-2 mb-4">
                  <div
                    className={`h-2 rounded-full ${getProgressColor(objective.progressPercentage || 0)}`}
                    style={{ width: `${objective.progressPercentage || 0}%` }}
                  />
                </div>

                {/* Key Results */}
                {objective.keyResults && objective.keyResults.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-surface-700 dark:text-surface-300">Key Results:</div>
                    {objective.keyResults.map((kr) => (
                      <div key={kr.id} className="flex items-center gap-4 bg-surface-50 dark:bg-surface-800/50 p-3 rounded-lg">
                        <div className="flex-1">
                          <div className="font-medium">{kr.title}</div>
                          <div className="text-sm text-surface-600 dark:text-surface-400">
                            {kr.currentValue} / {kr.targetValue} {kr.measurementUnit}
                          </div>
                        </div>
                        <div className="w-32">
                          <div className="w-full bg-surface-200 dark:bg-surface-700 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${getProgressColor(kr.progressPercentage || 0)}`}
                              style={{ width: `${kr.progressPercentage || 0}%` }}
                            />
                          </div>
                        </div>
                        <div className="w-16 text-right font-medium">
                          {kr.progressPercentage?.toFixed(0) || 0}%
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex justify-between items-center mt-4 pt-4 border-t text-sm text-surface-600 dark:text-surface-400">
                  <div>
                    {new Date(objective.startDate).toLocaleDateString()} - {new Date(objective.endDate).toLocaleDateString()}
                  </div>
                  <a href={`/okr/${objective.id}`} className="text-primary-600 dark:text-primary-400 hover:text-primary-600">
                    View Details
                  </a>
                </div>
              </div>
            ))}
            {objectives.length === 0 && (
              <div className="bg-surface-50 dark:bg-surface-800 rounded-lg shadow-md p-8 text-center text-surface-500 dark:text-surface-400">
                No objectives found. Create your first objective to get started!
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
