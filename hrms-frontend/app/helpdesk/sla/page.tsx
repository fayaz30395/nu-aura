'use client';

import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout';
import { helpdeskSLAService, TicketSLA, TicketEscalation, SLADashboard } from '@/lib/services/helpdesk-sla.service';

export default function HelpdeskSLAPage() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'slas' | 'escalations'>('dashboard');
  const [slas, setSlas] = useState<TicketSLA[]>([]);
  const [escalations, setEscalations] = useState<TicketEscalation[]>([]);
  const [dashboard, setDashboard] = useState<SLADashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<TicketSLA>>({
    name: '',
    description: '',
    firstResponseMinutes: 60,
    resolutionMinutes: 480,
    escalationAfterMinutes: 240,
    isBusinessHoursOnly: true,
    businessStartHour: 9,
    businessEndHour: 18,
    workingDays: 'MON,TUE,WED,THU,FRI',
    isActive: true,
    applyToAllCategories: true,
  });

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    try {
      setLoading(true);
      const dashboardData = await helpdeskSLAService.getDashboard();
      setDashboard(dashboardData);

      if (activeTab === 'slas') {
        const result = await helpdeskSLAService.getSLAs();
        setSlas(result.content);
      } else if (activeTab === 'escalations') {
        const pending = await helpdeskSLAService.getMyPendingEscalations();
        setEscalations(pending);
      }
    } catch (error) {
      console.error('Error loading SLA data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await helpdeskSLAService.updateSLA(editingId, formData);
      } else {
        await helpdeskSLAService.createSLA(formData);
      }
      setShowForm(false);
      setEditingId(null);
      resetForm();
      loadData();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to save SLA');
    }
  };

  const handleEdit = (sla: TicketSLA) => {
    setFormData({
      name: sla.name,
      description: sla.description,
      categoryId: sla.categoryId,
      priority: sla.priority,
      firstResponseMinutes: sla.firstResponseMinutes,
      resolutionMinutes: sla.resolutionMinutes,
      escalationAfterMinutes: sla.escalationAfterMinutes,
      escalationTo: sla.escalationTo,
      secondEscalationMinutes: sla.secondEscalationMinutes,
      secondEscalationTo: sla.secondEscalationTo,
      isBusinessHoursOnly: sla.isBusinessHoursOnly,
      businessStartHour: sla.businessStartHour,
      businessEndHour: sla.businessEndHour,
      workingDays: sla.workingDays,
      isActive: sla.isActive,
      applyToAllCategories: sla.applyToAllCategories,
    });
    setEditingId(sla.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this SLA?')) return;
    try {
      await helpdeskSLAService.deleteSLA(id);
      loadData();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to delete SLA');
    }
  };

  const handleAcknowledge = async (escalationId: string) => {
    try {
      await helpdeskSLAService.acknowledgeEscalation(escalationId);
      loadData();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to acknowledge escalation');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      firstResponseMinutes: 60,
      resolutionMinutes: 480,
      escalationAfterMinutes: 240,
      isBusinessHoursOnly: true,
      businessStartHour: 9,
      businessEndHour: 18,
      workingDays: 'MON,TUE,WED,THU,FRI',
      isActive: true,
      applyToAllCategories: true,
    });
  };

  const formatMinutes = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const getEscalationLevelColor = (level: string) => {
    switch (level) {
      case 'FIRST': return 'bg-yellow-100 text-yellow-800';
      case 'SECOND': return 'bg-orange-100 text-orange-800';
      case 'THIRD': return 'bg-red-100 text-red-800';
      default: return 'bg-surface-100 dark:bg-surface-800 text-surface-800 dark:text-surface-200';
    }
  };

  return (
    <AppLayout activeMenuItem="helpdesk">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-surface-900 dark:text-surface-50">SLA Management</h1>
          {activeTab === 'slas' && (
            <button
              onClick={() => { setShowForm(true); setEditingId(null); resetForm(); }}
              className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
            >
              Create SLA Policy
            </button>
          )}
        </div>

        {/* Dashboard Cards */}
        {dashboard && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-surface-50 dark:bg-surface-800 rounded-lg shadow p-6">
              <div className="text-3xl font-bold text-green-600 dark:text-green-400">{dashboard.slaComplianceRate?.toFixed(1) || 0}%</div>
              <div className="text-surface-600 dark:text-surface-400">SLA Compliance</div>
              <div className="text-sm text-surface-500 dark:text-surface-400 mt-1">
                {dashboard.slaMetCount} met / {dashboard.slaBreachedCount} breached
              </div>
            </div>
            <div className="bg-surface-50 dark:bg-surface-800 rounded-lg shadow p-6">
              <div className="text-3xl font-bold text-primary-600 dark:text-primary-400">{formatMinutes(dashboard.averageFirstResponseMinutes || 0)}</div>
              <div className="text-surface-600 dark:text-surface-400">Avg First Response</div>
            </div>
            <div className="bg-surface-50 dark:bg-surface-800 rounded-lg shadow p-6">
              <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">{formatMinutes(dashboard.averageResolutionMinutes || 0)}</div>
              <div className="text-surface-600 dark:text-surface-400">Avg Resolution Time</div>
            </div>
            <div className="bg-surface-50 dark:bg-surface-800 rounded-lg shadow p-6">
              <div className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">{dashboard.averageCSAT?.toFixed(1) || '-'}</div>
              <div className="text-surface-600 dark:text-surface-400">Avg CSAT Score</div>
              <div className="text-sm text-surface-500 dark:text-surface-400 mt-1">
                {dashboard.firstContactResolutions} FCR
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b mb-6">
          <button
            className={`px-6 py-3 font-medium ${activeTab === 'dashboard' ? 'border-b-2 border-primary-500 text-primary-600 dark:text-primary-400' : 'text-surface-600 dark:text-surface-400'}`}
            onClick={() => setActiveTab('dashboard')}
          >
            Dashboard
          </button>
          <button
            className={`px-6 py-3 font-medium ${activeTab === 'slas' ? 'border-b-2 border-primary-500 text-primary-600 dark:text-primary-400' : 'text-surface-600 dark:text-surface-400'}`}
            onClick={() => setActiveTab('slas')}
          >
            SLA Policies
          </button>
          <button
            className={`px-6 py-3 font-medium ${activeTab === 'escalations' ? 'border-b-2 border-primary-500 text-primary-600 dark:text-primary-400' : 'text-surface-600 dark:text-surface-400'}`}
            onClick={() => setActiveTab('escalations')}
          >
            Pending Escalations
          </button>
        </div>

        {/* SLA Form */}
        {showForm && activeTab === 'slas' && (
          <div className="bg-surface-50 dark:bg-surface-800 rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">
              {editingId ? 'Edit SLA Policy' : 'Create SLA Policy'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Policy Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full p-2 border border-surface-300 dark:border-surface-600 rounded-lg bg-white dark:bg-surface-900"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Priority</label>
                  <select
                    value={formData.priority || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value }))}
                    className="w-full p-2 border border-surface-300 dark:border-surface-600 rounded-lg bg-white dark:bg-surface-900"
                  >
                    <option value="">All Priorities</option>
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  value={formData.description || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full p-2 border border-surface-300 dark:border-surface-600 rounded-lg bg-white dark:bg-surface-900"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">First Response (minutes) *</label>
                  <input
                    type="number"
                    value={formData.firstResponseMinutes}
                    onChange={(e) => setFormData(prev => ({ ...prev, firstResponseMinutes: parseInt(e.target.value) }))}
                    className="w-full p-2 border border-surface-300 dark:border-surface-600 rounded-lg bg-white dark:bg-surface-900"
                    required
                    min="1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Resolution Time (minutes) *</label>
                  <input
                    type="number"
                    value={formData.resolutionMinutes}
                    onChange={(e) => setFormData(prev => ({ ...prev, resolutionMinutes: parseInt(e.target.value) }))}
                    className="w-full p-2 border border-surface-300 dark:border-surface-600 rounded-lg bg-white dark:bg-surface-900"
                    required
                    min="1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Escalate After (minutes)</label>
                  <input
                    type="number"
                    value={formData.escalationAfterMinutes || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, escalationAfterMinutes: parseInt(e.target.value) || undefined }))}
                    className="w-full p-2 border border-surface-300 dark:border-surface-600 rounded-lg bg-white dark:bg-surface-900"
                    min="1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Business Hours Start</label>
                  <select
                    value={formData.businessStartHour}
                    onChange={(e) => setFormData(prev => ({ ...prev, businessStartHour: parseInt(e.target.value) }))}
                    className="w-full p-2 border border-surface-300 dark:border-surface-600 rounded-lg bg-white dark:bg-surface-900"
                  >
                    {Array.from({ length: 24 }, (_, i) => (
                      <option key={i} value={i}>{i.toString().padStart(2, '0')}:00</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Business Hours End</label>
                  <select
                    value={formData.businessEndHour}
                    onChange={(e) => setFormData(prev => ({ ...prev, businessEndHour: parseInt(e.target.value) }))}
                    className="w-full p-2 border border-surface-300 dark:border-surface-600 rounded-lg bg-white dark:bg-surface-900"
                  >
                    {Array.from({ length: 24 }, (_, i) => (
                      <option key={i} value={i}>{i.toString().padStart(2, '0')}:00</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end gap-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.isBusinessHoursOnly}
                      onChange={(e) => setFormData(prev => ({ ...prev, isBusinessHoursOnly: e.target.checked }))}
                      className="mr-2"
                    />
                    Business Hours Only
                  </label>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                    className="mr-2"
                  />
                  Active
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.applyToAllCategories}
                    onChange={(e) => setFormData(prev => ({ ...prev, applyToAllCategories: e.target.checked }))}
                    className="mr-2"
                  />
                  Apply to All Categories
                </label>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="submit"
                  className="px-6 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
                >
                  {editingId ? 'Update' : 'Create'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setEditingId(null); }}
                  className="px-6 py-2 bg-surface-100 dark:bg-surface-800 text-surface-700 dark:text-surface-300 rounded-lg hover:bg-surface-50 dark:hover:bg-surface-800/50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {loading ? (
          <div className="text-center py-8">Loading...</div>
        ) : (
          <>
            {/* Dashboard Tab */}
            {activeTab === 'dashboard' && dashboard && (
              <div className="bg-surface-50 dark:bg-surface-800 rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold mb-4">SLA Performance Overview</h2>
                <div className="space-y-6">
                  {/* SLA Compliance Bar */}
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-surface-700 dark:text-surface-300">SLA Compliance Rate</span>
                      <span className="font-bold">{dashboard.slaComplianceRate?.toFixed(1) || 0}%</span>
                    </div>
                    <div className="w-full bg-surface-200 dark:bg-surface-700 rounded-full h-4">
                      <div
                        className={`h-4 rounded-full ${
                          (dashboard.slaComplianceRate || 0) >= 90 ? 'bg-green-500' :
                          (dashboard.slaComplianceRate || 0) >= 70 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${dashboard.slaComplianceRate || 0}%` }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="p-4 bg-surface-50 dark:bg-surface-800/50 rounded-lg">
                      <div className="text-sm text-surface-600 dark:text-surface-400 mb-1">SLA Met</div>
                      <div className="text-2xl font-bold text-green-600">{dashboard.slaMetCount}</div>
                    </div>
                    <div className="p-4 bg-surface-50 dark:bg-surface-800/50 rounded-lg">
                      <div className="text-sm text-surface-600 dark:text-surface-400 mb-1">SLA Breached</div>
                      <div className="text-2xl font-bold text-red-600">{dashboard.slaBreachedCount}</div>
                    </div>
                    <div className="p-4 bg-surface-50 dark:bg-surface-800/50 rounded-lg">
                      <div className="text-sm text-surface-600 dark:text-surface-400 mb-1">First Contact Resolutions</div>
                      <div className="text-2xl font-bold text-primary-600 dark:text-primary-400">{dashboard.firstContactResolutions}</div>
                    </div>
                    <div className="p-4 bg-surface-50 dark:bg-surface-800/50 rounded-lg">
                      <div className="text-sm text-surface-600 dark:text-surface-400 mb-1">Customer Satisfaction</div>
                      <div className="text-2xl font-bold text-purple-600">
                        {dashboard.averageCSAT ? `${dashboard.averageCSAT.toFixed(1)}/5` : 'N/A'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* SLA Policies Tab */}
            {activeTab === 'slas' && (
              <div className="bg-surface-50 dark:bg-surface-800 rounded-lg shadow-md overflow-hidden">
                <table className="min-w-full divide-y divide-surface-200 dark:divide-surface-700">
                  <thead className="bg-surface-50 dark:bg-surface-800/50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-surface-600 dark:text-surface-400 uppercase">Policy</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-surface-600 dark:text-surface-400 uppercase">First Response</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-surface-600 dark:text-surface-400 uppercase">Resolution</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-surface-600 dark:text-surface-400 uppercase">Escalation</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-surface-600 dark:text-surface-400 uppercase">Hours</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-surface-600 dark:text-surface-400 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-surface-600 dark:text-surface-400 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-surface-900 divide-y divide-surface-200 dark:divide-surface-700">
                    {slas.map((sla) => (
                      <tr key={sla.id}>
                        <td className="px-6 py-4">
                          <div className="font-medium">{sla.name}</div>
                          {sla.priority && (
                            <span className="text-xs text-surface-600 dark:text-surface-400">Priority: {sla.priority}</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {formatMinutes(sla.firstResponseMinutes)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {formatMinutes(sla.resolutionMinutes)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {sla.escalationAfterMinutes ? formatMinutes(sla.escalationAfterMinutes) : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {sla.isBusinessHoursOnly ? (
                            <span>{sla.businessStartHour}:00 - {sla.businessEndHour}:00</span>
                          ) : (
                            <span>24/7</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            sla.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {sla.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => handleEdit(sla)}
                            className="text-primary-600 dark:text-primary-400 hover:text-primary-600 mr-4"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(sla.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                    {slas.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-6 py-8 text-center text-surface-600 dark:text-surface-400">
                          No SLA policies found. Create one to get started.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pending Escalations Tab */}
            {activeTab === 'escalations' && (
              <div className="space-y-4">
                {escalations.length > 0 ? (
                  escalations.map((escalation) => (
                    <div key={escalation.id} className="bg-surface-50 dark:bg-surface-800 rounded-lg shadow-md p-6">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`px-2 py-1 rounded-full text-xs ${getEscalationLevelColor(escalation.escalationLevel)}`}>
                              {escalation.escalationLevel} Level
                            </span>
                            <span className="px-2 py-1 bg-surface-100 dark:bg-surface-800 text-surface-800 dark:text-surface-200 rounded-full text-xs">
                              {escalation.escalationReason.replace('_', ' ')}
                            </span>
                            {escalation.isAutoEscalated && (
                              <span className="px-2 py-1 bg-primary-50 dark:bg-primary-950/30 text-primary-600 dark:text-primary-400 rounded-full text-xs">
                                Auto-Escalated
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-surface-600 dark:text-surface-400">
                            Ticket: {escalation.ticketId.slice(0, 8)}...
                          </div>
                          {escalation.notes && (
                            <div className="text-sm text-surface-600 dark:text-surface-400 mt-2">{escalation.notes}</div>
                          )}
                          <div className="text-sm text-surface-600 dark:text-surface-400 mt-2">
                            Escalated: {new Date(escalation.escalatedAt).toLocaleString()}
                          </div>
                        </div>
                        <button
                          onClick={() => handleAcknowledge(escalation.id)}
                          className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
                        >
                          Acknowledge
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="bg-surface-50 dark:bg-surface-800 rounded-lg shadow-md p-8 text-center text-surface-500 dark:text-surface-400">
                    No pending escalations. All caught up!
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}
