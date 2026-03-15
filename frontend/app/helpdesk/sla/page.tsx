'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AppLayout } from '@/components/layout';
import { TicketSLA } from '@/lib/services/helpdesk-sla.service';
import { useToast } from '@/components/notifications/ToastProvider';
import { ConfirmDialog } from '@/components/ui';

// ─── Validation Schemas ───────────────────────────────────────────────────────

const slaFormSchema = z.object({
  name: z.string().min(1, 'Policy name is required').max(255),
  description: z.string().optional().or(z.literal('')),
  priority: z.string().optional().or(z.literal('')),
  firstResponseMinutes: z.number({ coerce: true }).min(1, 'Must be >= 1'),
  resolutionMinutes: z.number({ coerce: true }).min(1, 'Must be >= 1'),
  escalationAfterMinutes: z.number({ coerce: true }).min(1, 'Must be >= 1').optional(),
  businessStartHour: z.number({ coerce: true }).min(0).max(23),
  businessEndHour: z.number({ coerce: true }).min(0).max(23),
  isBusinessHoursOnly: z.boolean().optional(),
  isActive: z.boolean().optional(),
  applyToAllCategories: z.boolean().optional(),
});

type SLAFormData = z.infer<typeof slaFormSchema>;
import {
  useSLADashboard,
  useSlaConfigs,
  useMyPendingEscalations,
  useCreateSlaConfig,
  useUpdateSlaConfig,
  useDeleteSlaConfig,
  useAcknowledgeEscalation,
} from '@/lib/hooks/queries/useHelpdeskSla';

export default function HelpdeskSLAPage() {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'slas' | 'escalations'>('dashboard');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [slaToDelete, setSlaToDelete] = useState<TicketSLA | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SLAFormData>({
    resolver: zodResolver(slaFormSchema),
    defaultValues: {
      name: '',
      description: '',
      firstResponseMinutes: 60,
      resolutionMinutes: 480,
      escalationAfterMinutes: 240,
      isBusinessHoursOnly: true,
      businessStartHour: 9,
      businessEndHour: 18,
      isActive: true,
      applyToAllCategories: true,
    },
  });

  const { data: dashboardData } = useSLADashboard();
  const { data: slasResponse, isLoading: slasLoading } = useSlaConfigs();
  const { data: escalations = [], isLoading: escalationsLoading } =
    useMyPendingEscalations();
  const createMutation = useCreateSlaConfig();
  const updateMutation = useUpdateSlaConfig();
  const deleteMutation = useDeleteSlaConfig();
  const acknowledgeMutation = useAcknowledgeEscalation();

  const slas = slasResponse?.content || [];
  const loading = slasLoading || escalationsLoading;

  const handleFormSubmit = async (data: SLAFormData) => {
    try {
      const slaData: Partial<TicketSLA> = {
        ...data,
        description: data.description || '',
        priority: data.priority || '',
        escalationAfterMinutes: data.escalationAfterMinutes || 240,
        workingDays: 'MON,TUE,WED,THU,FRI',
      };

      if (editingId) {
        await updateMutation.mutateAsync({ id: editingId, data: slaData });
      } else {
        await createMutation.mutateAsync(slaData);
      }
      setShowForm(false);
      setEditingId(null);
      resetFormHandler();
    } catch (error: unknown) {
      toast.error(
        (error as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || 'Failed to save SLA'
      );
    }
  };

  const handleEdit = (sla: TicketSLA) => {
    reset({
      name: sla.name,
      description: sla.description || '',
      priority: sla.priority || '',
      firstResponseMinutes: sla.firstResponseMinutes,
      resolutionMinutes: sla.resolutionMinutes,
      escalationAfterMinutes: sla.escalationAfterMinutes,
      isBusinessHoursOnly: sla.isBusinessHoursOnly,
      businessStartHour: sla.businessStartHour,
      businessEndHour: sla.businessEndHour,
      isActive: sla.isActive,
      applyToAllCategories: sla.applyToAllCategories,
    });
    setEditingId(sla.id);
    setShowForm(true);
  };

  const handleDelete = (sla: TicketSLA) => {
    setSlaToDelete(sla);
    setShowDeleteConfirm(true);
  };

  const performDelete = async () => {
    if (!slaToDelete) return;
    try {
      await deleteMutation.mutateAsync(slaToDelete.id);
      setShowDeleteConfirm(false);
      setSlaToDelete(null);
    } catch (error: unknown) {
      toast.error(
        (error as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || 'Failed to delete SLA'
      );
    }
  };

  const handleAcknowledge = async (escalationId: string) => {
    try {
      await acknowledgeMutation.mutateAsync(escalationId);
    } catch (error: unknown) {
      toast.error(
        (error as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || 'Failed to acknowledge escalation'
      );
    }
  };

  const resetFormHandler = () => {
    reset({
      name: '',
      description: '',
      firstResponseMinutes: 60,
      resolutionMinutes: 480,
      escalationAfterMinutes: 240,
      isBusinessHoursOnly: true,
      businessStartHour: 9,
      businessEndHour: 18,
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
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setSlaToDelete(null);
        }}
        onConfirm={performDelete}
        title="Delete SLA Policy"
        message={`Are you sure you want to delete "${slaToDelete?.name}"?`}
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />

      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-surface-900 dark:text-surface-50">SLA Management</h1>
          {activeTab === 'slas' && (
            <button
              onClick={() => { setShowForm(true); setEditingId(null); resetFormHandler(); }}
              className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
            >
              Create SLA Policy
            </button>
          )}
        </div>

        {/* Dashboard Cards */}
        {dashboardData && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-surface-50 dark:bg-surface-800 rounded-lg shadow p-6">
              <div className="text-3xl font-bold text-green-600 dark:text-green-400">{dashboardData.slaComplianceRate?.toFixed(1) || 0}%</div>
              <div className="text-surface-600 dark:text-surface-400">SLA Compliance</div>
              <div className="text-sm text-surface-500 dark:text-surface-400 mt-1">
                {dashboardData.slaMetCount} met / {dashboardData.slaBreachedCount} breached
              </div>
            </div>
            <div className="bg-surface-50 dark:bg-surface-800 rounded-lg shadow p-6">
              <div className="text-3xl font-bold text-primary-600 dark:text-primary-400">{formatMinutes(dashboardData.averageFirstResponseMinutes || 0)}</div>
              <div className="text-surface-600 dark:text-surface-400">Avg First Response</div>
            </div>
            <div className="bg-surface-50 dark:bg-surface-800 rounded-lg shadow p-6">
              <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">{formatMinutes(dashboardData.averageResolutionMinutes || 0)}</div>
              <div className="text-surface-600 dark:text-surface-400">Avg Resolution Time</div>
            </div>
            <div className="bg-surface-50 dark:bg-surface-800 rounded-lg shadow p-6">
              <div className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">{dashboardData.averageCSAT?.toFixed(1) || '-'}</div>
              <div className="text-surface-600 dark:text-surface-400">Avg CSAT Score</div>
              <div className="text-sm text-surface-500 dark:text-surface-400 mt-1">
                {dashboardData.firstContactResolutions} FCR
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
            <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Policy Name *</label>
                  <input
                    type="text"
                    {...register('name')}
                    className="w-full p-2 border border-surface-300 dark:border-surface-600 rounded-lg bg-[var(--bg-card)]"
                  />
                  {errors.name && (
                    <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Priority</label>
                  <select
                    {...register('priority')}
                    className="w-full p-2 border border-surface-300 dark:border-surface-600 rounded-lg bg-[var(--bg-card)]"
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
                  {...register('description')}
                  className="w-full p-2 border border-surface-300 dark:border-surface-600 rounded-lg bg-[var(--bg-card)]"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">First Response (minutes) *</label>
                  <input
                    type="number"
                    {...register('firstResponseMinutes')}
                    className="w-full p-2 border border-surface-300 dark:border-surface-600 rounded-lg bg-[var(--bg-card)]"
                    min="1"
                  />
                  {errors.firstResponseMinutes && (
                    <p className="text-red-500 text-sm mt-1">{errors.firstResponseMinutes.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Resolution Time (minutes) *</label>
                  <input
                    type="number"
                    {...register('resolutionMinutes')}
                    className="w-full p-2 border border-surface-300 dark:border-surface-600 rounded-lg bg-[var(--bg-card)]"
                    min="1"
                  />
                  {errors.resolutionMinutes && (
                    <p className="text-red-500 text-sm mt-1">{errors.resolutionMinutes.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Escalate After (minutes)</label>
                  <input
                    type="number"
                    {...register('escalationAfterMinutes')}
                    className="w-full p-2 border border-surface-300 dark:border-surface-600 rounded-lg bg-[var(--bg-card)]"
                    min="1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Business Hours Start</label>
                  <select
                    {...register('businessStartHour')}
                    className="w-full p-2 border border-surface-300 dark:border-surface-600 rounded-lg bg-[var(--bg-card)]"
                  >
                    {Array.from({ length: 24 }, (_, i) => (
                      <option key={i} value={i}>{i.toString().padStart(2, '0')}:00</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Business Hours End</label>
                  <select
                    {...register('businessEndHour')}
                    className="w-full p-2 border border-surface-300 dark:border-surface-600 rounded-lg bg-[var(--bg-card)]"
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
                      {...register('isBusinessHoursOnly')}
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
                    {...register('isActive')}
                    className="mr-2"
                  />
                  Active
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    {...register('applyToAllCategories')}
                    className="mr-2"
                  />
                  Apply to All Categories
                </label>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50"
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
            {activeTab === 'dashboard' && dashboardData && (
              <div className="bg-surface-50 dark:bg-surface-800 rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold mb-4">SLA Performance Overview</h2>
                <div className="space-y-6">
                  {/* SLA Compliance Bar */}
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-surface-700 dark:text-surface-300">SLA Compliance Rate</span>
                      <span className="font-bold">{dashboardData.slaComplianceRate?.toFixed(1) || 0}%</span>
                    </div>
                    <div className="w-full bg-surface-200 dark:bg-surface-700 rounded-full h-4">
                      <div
                        className={`h-4 rounded-full ${
                          (dashboardData.slaComplianceRate || 0) >= 90 ? 'bg-green-500' :
                          (dashboardData.slaComplianceRate || 0) >= 70 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${dashboardData.slaComplianceRate || 0}%` }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="p-4 bg-surface-50 dark:bg-surface-800/50 rounded-lg">
                      <div className="text-sm text-surface-600 dark:text-surface-400 mb-1">SLA Met</div>
                      <div className="text-2xl font-bold text-green-600">{dashboardData.slaMetCount}</div>
                    </div>
                    <div className="p-4 bg-surface-50 dark:bg-surface-800/50 rounded-lg">
                      <div className="text-sm text-surface-600 dark:text-surface-400 mb-1">SLA Breached</div>
                      <div className="text-2xl font-bold text-red-600">{dashboardData.slaBreachedCount}</div>
                    </div>
                    <div className="p-4 bg-surface-50 dark:bg-surface-800/50 rounded-lg">
                      <div className="text-sm text-surface-600 dark:text-surface-400 mb-1">First Contact Resolutions</div>
                      <div className="text-2xl font-bold text-primary-600 dark:text-primary-400">{dashboardData.firstContactResolutions}</div>
                    </div>
                    <div className="p-4 bg-surface-50 dark:bg-surface-800/50 rounded-lg">
                      <div className="text-sm text-surface-600 dark:text-surface-400 mb-1">Customer Satisfaction</div>
                      <div className="text-2xl font-bold text-purple-600">
                        {dashboardData.averageCSAT ? `${dashboardData.averageCSAT.toFixed(1)}/5` : 'N/A'}
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
                  <tbody className="bg-[var(--bg-card)] divide-y divide-surface-200 dark:divide-surface-700">
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
                            sla.isActive ? 'bg-green-100 text-green-800' : 'bg-[var(--bg-surface)] text-gray-800'
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
                            onClick={() => handleDelete(sla)}
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
