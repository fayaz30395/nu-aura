'use client';

import {useState} from 'react';
import {useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';
import {AppLayout} from '@/components/layout';
import {TicketSLA} from '@/lib/services/hrms/helpdesk-sla.service';
import {useToast} from '@/components/notifications/ToastProvider';
import {ConfirmDialog} from '@/components/ui';
import {SkeletonTable} from '@/components/ui/Skeleton';
import {PermissionGate} from '@/components/auth/PermissionGate';
import {Permissions} from '@/lib/hooks/usePermissions';
import {
  useAcknowledgeEscalation,
  useCreateSlaConfig,
  useDeleteSlaConfig,
  useMyPendingEscalations,
  useSlaConfigs,
  useSLADashboard,
  useUpdateSlaConfig,
} from '@/lib/hooks/queries/useHelpdeskSla';

// ─── Validation Schemas ───────────────────────────────────────────────────────

const slaFormSchema = z.object({
  name: z.string().min(1, 'Policy name is required').max(255),
  description: z.string().optional().or(z.literal('')),
  priority: z.string().optional().or(z.literal('')),
  firstResponseMinutes: z.number({coerce: true}).min(1, 'Must be >= 1'),
  resolutionMinutes: z.number({coerce: true}).min(1, 'Must be >= 1'),
  escalationAfterMinutes: z.number({coerce: true}).min(1, 'Must be >= 1').optional(),
  businessStartHour: z.number({coerce: true}).min(0).max(23),
  businessEndHour: z.number({coerce: true}).min(0).max(23),
  isBusinessHoursOnly: z.boolean().optional(),
  isActive: z.boolean().optional(),
  applyToAllCategories: z.boolean().optional(),
});

type SLAFormData = z.infer<typeof slaFormSchema>;

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
    formState: {errors, isSubmitting},
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

  const {data: dashboardData} = useSLADashboard();
  const {data: slasResponse, isLoading: slasLoading} = useSlaConfigs();
  const {data: escalations = [], isLoading: escalationsLoading} =
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
        await updateMutation.mutateAsync({id: editingId, data: slaData});
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
      case 'FIRST':
        return 'bg-warning-100 text-warning-800';
      case 'SECOND':
        return 'bg-warning-100 text-warning-800';
      case 'THIRD':
        return 'bg-danger-100 text-danger-800';
      default:
        return 'bg-[var(--bg-secondary)] text-[var(--text-primary)]';
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
          <h1 className="text-xl font-bold skeuo-emboss">SLA Management</h1>
          {activeTab === 'slas' && (
            <PermissionGate permission={Permissions.HELPDESK_SLA_MANAGE}>
              <button
                onClick={() => {
                  setShowForm(true);
                  setEditingId(null);
                  resetFormHandler();
                }}
                className="btn-primary !h-auto"
              >
                Create SLA Policy
              </button>
            </PermissionGate>
          )}
        </div>

        {/* Dashboard Cards */}
        {dashboardData && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="skeuo-card p-6">
              <div
                className="text-3xl font-bold text-success-600 dark:text-success-400">{dashboardData.slaComplianceRate?.toFixed(1) || 0}%
              </div>
              <div className="text-[var(--text-secondary)]">SLA Compliance</div>
              <div className="text-body-muted mt-1">
                {dashboardData.slaMetCount} met / {dashboardData.slaBreachedCount} breached
              </div>
            </div>
            <div className="skeuo-card p-6">
              <div
                className="text-3xl font-bold text-accent-700 dark:text-accent-400">{formatMinutes(dashboardData.averageFirstResponseMinutes || 0)}</div>
              <div className="text-[var(--text-secondary)]">Avg First Response</div>
            </div>
            <div className="skeuo-card p-6">
              <div
                className="text-3xl font-bold text-accent-800 dark:text-accent-600">{formatMinutes(dashboardData.averageResolutionMinutes || 0)}</div>
              <div className="text-[var(--text-secondary)]">Avg Resolution Time</div>
            </div>
            <div className="skeuo-card p-6">
              <div
                className="text-3xl font-bold text-warning-600 dark:text-warning-400">{dashboardData.averageCSAT?.toFixed(1) || '-'}</div>
              <div className="text-[var(--text-secondary)]">Avg CSAT Score</div>
              <div className="text-body-muted mt-1">
                {dashboardData.firstContactResolutions} FCR
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b mb-6">
          <button
            className={`px-6 py-4 font-medium ${activeTab === 'dashboard' ? 'border-b-2 border-accent-500 text-accent-700 dark:text-accent-400' : 'text-[var(--text-secondary)]'}`}
            onClick={() => setActiveTab('dashboard')}
          >
            Dashboard
          </button>
          <button
            className={`px-6 py-4 font-medium ${activeTab === 'slas' ? 'border-b-2 border-accent-500 text-accent-700 dark:text-accent-400' : 'text-[var(--text-secondary)]'}`}
            onClick={() => setActiveTab('slas')}
          >
            SLA Policies
          </button>
          <button
            className={`px-6 py-4 font-medium ${activeTab === 'escalations' ? 'border-b-2 border-accent-500 text-accent-700 dark:text-accent-400' : 'text-[var(--text-secondary)]'}`}
            onClick={() => setActiveTab('escalations')}
          >
            Pending Escalations
          </button>
        </div>

        {/* SLA Form */}
        {showForm && activeTab === 'slas' && (
          <div className="skeuo-card p-6 mb-6">
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
                    className="input-aura"
                  />
                  {errors.name && (
                    <p className="text-danger-500 text-sm mt-1">{errors.name.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Priority</label>
                  <select
                    {...register('priority')}
                    className="input-aura"
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
                  className="input-aura"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">First Response (minutes) *</label>
                  <input
                    type="number"
                    {...register('firstResponseMinutes')}
                    className="input-aura"
                    min="1"
                  />
                  {errors.firstResponseMinutes && (
                    <p className="text-danger-500 text-sm mt-1">{errors.firstResponseMinutes.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Resolution Time (minutes) *</label>
                  <input
                    type="number"
                    {...register('resolutionMinutes')}
                    className="input-aura"
                    min="1"
                  />
                  {errors.resolutionMinutes && (
                    <p className="text-danger-500 text-sm mt-1">{errors.resolutionMinutes.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Escalate After (minutes)</label>
                  <input
                    type="number"
                    {...register('escalationAfterMinutes')}
                    className="input-aura"
                    min="1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Business Hours Start</label>
                  <select
                    {...register('businessStartHour')}
                    className="input-aura"
                  >
                    {Array.from({length: 24}, (_, i) => (
                      <option key={i} value={i}>{i.toString().padStart(2, '0')}:00</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Business Hours End</label>
                  <select
                    {...register('businessEndHour')}
                    className="input-aura"
                  >
                    {Array.from({length: 24}, (_, i) => (
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
                <PermissionGate permission={Permissions.HELPDESK_SLA_MANAGE}>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="btn-primary !h-auto disabled:opacity-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
                  >
                    {editingId ? 'Update' : 'Create'}
                  </button>
                </PermissionGate>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingId(null);
                  }}
                  className="btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {loading ? (
          <SkeletonTable rows={5} columns={4} />
        ) : (
          <>
            {/* Dashboard Tab */}
            {activeTab === 'dashboard' && dashboardData && (
              <div className="skeuo-card p-6">
                <h2 className="text-xl font-semibold mb-4">SLA Performance Overview</h2>
                <div className="space-y-6">
                  {/* SLA Compliance Bar */}
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-[var(--text-secondary)]">SLA Compliance Rate</span>
                      <span className="font-bold">{dashboardData.slaComplianceRate?.toFixed(1) || 0}%</span>
                    </div>
                    <div className="w-full bg-[var(--bg-secondary)] dark:bg-[var(--bg-secondary)] rounded-full h-4">
                      <div
                        className={`h-4 rounded-full ${
                          (dashboardData.slaComplianceRate || 0) >= 90 ? 'bg-success-500' :
                            (dashboardData.slaComplianceRate || 0) >= 70 ? 'bg-warning-500' : 'bg-danger-500'
                        }`}
                        style={{width: `${dashboardData.slaComplianceRate || 0}%`}}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="p-4 bg-[var(--bg-secondary)]/50 rounded-lg">
                      <div className="text-body-secondary mb-1">SLA Met</div>
                      <div className="text-xl font-bold text-success-600">{dashboardData.slaMetCount}</div>
                    </div>
                    <div className="p-4 bg-[var(--bg-secondary)]/50 rounded-lg">
                      <div className="text-body-secondary mb-1">SLA Breached</div>
                      <div className="text-xl font-bold text-danger-600">{dashboardData.slaBreachedCount}</div>
                    </div>
                    <div className="p-4 bg-[var(--bg-secondary)]/50 rounded-lg">
                      <div className="text-body-secondary mb-1">First Contact Resolutions</div>
                      <div
                        className="text-xl font-bold text-accent-700 dark:text-accent-400">{dashboardData.firstContactResolutions}</div>
                    </div>
                    <div className="p-4 bg-[var(--bg-secondary)]/50 rounded-lg">
                      <div className="text-body-secondary mb-1">Customer Satisfaction</div>
                      <div className="text-xl font-bold text-accent-800">
                        {dashboardData.averageCSAT ? `${dashboardData.averageCSAT.toFixed(1)}/5` : 'N/A'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* SLA Policies Tab */}
            {activeTab === 'slas' && (
              <div className="skeuo-card overflow-hidden">
                <table className="table-aura">
                  <thead className="skeuo-table-header">
                  <tr>
                    <th
                      className="px-6 py-2 text-left text-xs font-medium text-[var(--text-secondary)] uppercase">Policy
                    </th>
                    <th className="px-6 py-2 text-left text-xs font-medium text-[var(--text-secondary)] uppercase">First
                      Response
                    </th>
                    <th
                      className="px-6 py-2 text-left text-xs font-medium text-[var(--text-secondary)] uppercase">Resolution
                    </th>
                    <th
                      className="px-6 py-2 text-left text-xs font-medium text-[var(--text-secondary)] uppercase">Escalation
                    </th>
                    <th
                      className="px-6 py-2 text-left text-xs font-medium text-[var(--text-secondary)] uppercase">Hours
                    </th>
                    <th
                      className="px-6 py-2 text-left text-xs font-medium text-[var(--text-secondary)] uppercase">Status
                    </th>
                    <th
                      className="px-6 py-2 text-left text-xs font-medium text-[var(--text-secondary)] uppercase">Actions
                    </th>
                  </tr>
                  </thead>
                  <tbody className="bg-[var(--bg-card)] divide-y divide-surface-200 dark:divide-surface-700">
                  {slas.map((sla) => (
                    <tr key={sla.id}>
                      <td className="px-6 py-4">
                        <div className="font-medium">{sla.name}</div>
                        {sla.priority && (
                          <span className="text-xs text-[var(--text-secondary)]">Priority: {sla.priority}</span>
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
                            sla.isActive ? 'bg-success-100 text-success-800' : 'bg-[var(--bg-surface)] text-[var(--text-secondary)]'
                          }`}>
                            {sla.isActive ? 'Active' : 'Inactive'}
                          </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <PermissionGate permission={Permissions.HELPDESK_SLA_MANAGE}>
                          <button
                            onClick={() => handleEdit(sla)}
                            className="text-accent-700 dark:text-accent-400 hover:text-accent-700 mr-4"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(sla)}
                            className="text-danger-600 hover:text-danger-800"
                          >
                            Delete
                          </button>
                        </PermissionGate>
                      </td>
                    </tr>
                  ))}
                  {slas.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-6 py-8 text-center text-[var(--text-secondary)]">
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
                    <div key={escalation.id} className="skeuo-card p-6">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <span
                              className={`px-2 py-1 rounded-full text-xs ${getEscalationLevelColor(escalation.escalationLevel)}`}>
                              {escalation.escalationLevel} Level
                            </span>
                            <span
                              className="px-2 py-1 bg-[var(--bg-secondary)] text-[var(--text-primary)] rounded-full text-xs">
                              {escalation.escalationReason?.replace(/_/g, ' ') ?? '-'}
                            </span>
                            {escalation.isAutoEscalated && (
                              <span
                                className="px-2 py-1 bg-accent-50 dark:bg-accent-950/30 text-accent-700 dark:text-accent-400 rounded-full text-xs">
                                Auto-Escalated
                              </span>
                            )}
                          </div>
                          <div className="text-body-secondary">
                            Ticket: {escalation.ticketId.slice(0, 8)}...
                          </div>
                          {escalation.notes && (
                            <div className="text-body-secondary mt-2">{escalation.notes}</div>
                          )}
                          <div className="text-body-secondary mt-2">
                            Escalated: {new Date(escalation.escalatedAt).toLocaleString()}
                          </div>
                        </div>
                        <PermissionGate permission={Permissions.HELPDESK_SLA_MANAGE}>
                          <button
                            onClick={() => handleAcknowledge(escalation.id)}
                            className="btn-primary !h-auto"
                          >
                            Acknowledge
                          </button>
                        </PermissionGate>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="skeuo-card p-8 text-center text-[var(--text-muted)]">
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
