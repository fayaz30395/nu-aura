'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { AppLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { PageErrorFallback } from '@/components/errors/PageErrorFallback';
import { PermissionGate } from '@/components/auth/PermissionGate';
import { Permissions } from '@/lib/hooks/usePermissions';
import {
  useAgencies,
  useCreateAgency,
  useUpdateAgency,
  useDeleteAgency,
} from '@/lib/hooks/queries/useAgency';
import {
  RecruitmentAgency,
  AgencyStatus,
  AgencyFeeType,
  CreateAgencyRequest,
  UpdateAgencyRequest,
} from '@/lib/types/hire/recruitment';
import {
  Briefcase,
  Plus,
  Search,
  Star,
  Phone,
  Mail,
  Globe,
  Edit2,
  Trash2,
  X,
  Building2,
  Filter,
  Users,
  TrendingUp,
  DollarSign,
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const agencySchema = z.object({
  name: z.string().min(1, 'Agency name is required').max(200),
  contactPerson: z.string().optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().optional(),
  website: z.string().optional(),
  address: z.string().optional(),
  feeType: z.enum(['FIXED', 'PERCENTAGE', 'RETAINER']).optional(),
  feeAmount: z.coerce.number().min(0).optional(),
  contractStartDate: z.string().optional(),
  contractEndDate: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'BLACKLISTED', 'PENDING_APPROVAL']).optional(),
  specializations: z.string().optional(),
  notes: z.string().optional(),
  rating: z.coerce.number().min(1).max(5).optional(),
});

type AgencyFormValues = z.infer<typeof agencySchema>;

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

function getStatusVariant(status: AgencyStatus): 'success' | 'warning' | 'danger' | 'default' {
  const map: Record<AgencyStatus, 'success' | 'warning' | 'danger' | 'default'> = {
    ACTIVE: 'success',
    INACTIVE: 'default',
    BLACKLISTED: 'danger',
    PENDING_APPROVAL: 'warning',
  };
  return map[status];
}

function getFeeLabel(feeType?: AgencyFeeType, feeAmount?: number): string {
  if (!feeType || feeAmount === undefined) return 'Not set';
  if (feeType === 'PERCENTAGE') return `${feeAmount}%`;
  if (feeType === 'RETAINER') return `Retainer`;
  return `Fixed`;
}

function RatingStars({ rating }: { rating?: number }) {
  if (!rating) return <span className="text-caption">No rating</span>;
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`h-3.5 w-3.5 ${
            i < rating
              ? 'fill-warning-500 text-warning-500'
              : 'text-[var(--text-muted)]'
          }`}
        />
      ))}
    </div>
  );
}

export default function AgenciesPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<AgencyStatus | undefined>();
  const [showForm, setShowForm] = useState(false);
  const [editingAgency, setEditingAgency] = useState<RecruitmentAgency | null>(null);

  const agenciesQuery = useAgencies(0, 100, statusFilter, search || undefined);
  const createMutation = useCreateAgency();
  const updateMutation = useUpdateAgency();
  const deleteMutation = useDeleteAgency();

  const form = useForm<AgencyFormValues>({
    resolver: zodResolver(agencySchema),
    defaultValues: { status: 'ACTIVE' },
  });

  const agencies = useMemo(() => agenciesQuery.data?.content || [], [agenciesQuery.data]);

  const stats = useMemo(() => {
    const active = agencies.filter((a) => a.status === 'ACTIVE').length;
    const pending = agencies.filter((a) => a.status === 'PENDING_APPROVAL').length;
    const avgRating = agencies.filter((a) => a.rating).length > 0
      ? agencies.filter((a) => a.rating).reduce((sum, a) => sum + (a.rating || 0), 0) /
        agencies.filter((a) => a.rating).length
      : 0;
    return { total: agencies.length, active, pending, avgRating };
  }, [agencies]);

  function openCreateForm() {
    setEditingAgency(null);
    form.reset({ status: 'ACTIVE' });
    setShowForm(true);
  }

  function openEditForm(agency: RecruitmentAgency) {
    setEditingAgency(agency);
    form.reset({
      name: agency.name,
      contactPerson: agency.contactPerson || '',
      email: agency.email || '',
      phone: agency.phone || '',
      website: agency.website || '',
      address: agency.address || '',
      feeType: agency.feeType,
      feeAmount: agency.feeAmount,
      contractStartDate: agency.contractStartDate?.split('T')[0],
      contractEndDate: agency.contractEndDate?.split('T')[0],
      status: agency.status,
      specializations: agency.specializations || '',
      notes: agency.notes || '',
      rating: agency.rating,
    });
    setShowForm(true);
  }

  async function onSubmit(values: AgencyFormValues) {
    const payload = {
      ...values,
      email: values.email || undefined,
    };

    if (editingAgency) {
      await updateMutation.mutateAsync({ id: editingAgency.id, data: payload as UpdateAgencyRequest });
    } else {
      await createMutation.mutateAsync(payload as CreateAgencyRequest);
    }
    setShowForm(false);
    setEditingAgency(null);
    form.reset();
  }

  async function handleDelete(id: string) {
    await deleteMutation.mutateAsync(id);
  }

  if (agenciesQuery.isError) {
    return (
      <AppLayout>
        <PageErrorFallback
          title="Failed to Load Agencies"
          error={new Error('Could not load agency data. Please try refreshing.')}
          onReset={() => window.location.reload()}
        />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PermissionGate
        permission={Permissions.AGENCY_VIEW}
        fallback={
          <div className="flex items-center justify-center h-[60vh]">
            <p className="text-[var(--text-muted)]">You do not have permission to view agencies.</p>
          </div>
        }
      >
        <motion.div
          className="space-y-6"
          initial="hidden"
          animate="visible"
          variants={containerVariants}
        >
          {/* Header */}
          <motion.div variants={itemVariants} className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-[var(--text-primary)] skeuo-emboss">
                Recruitment Agencies
              </h1>
              <p className="text-xs text-[var(--text-muted)] mt-1 skeuo-deboss">
                Manage external recruitment partners and track submissions
              </p>
            </div>
            <PermissionGate permission={Permissions.AGENCY_CREATE}>
              <Button
                onClick={openCreateForm}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Agency
              </Button>
            </PermissionGate>
          </motion.div>

          {/* Stat Cards */}
          <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="p-4">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-accent-600 dark:text-accent-400" />
                <span className="text-xs uppercase tracking-wide text-[var(--text-muted)]">Total</span>
              </div>
              <p className="text-2xl font-bold text-[var(--text-primary)] mt-1">{stats.total}</p>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-success-600 dark:text-success-400" />
                <span className="text-xs uppercase tracking-wide text-[var(--text-muted)]">Active</span>
              </div>
              <p className="text-2xl font-bold text-[var(--text-primary)] mt-1">{stats.active}</p>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-warning-600 dark:text-warning-400" />
                <span className="text-xs uppercase tracking-wide text-[var(--text-muted)]">Pending</span>
              </div>
              <p className="text-2xl font-bold text-[var(--text-primary)] mt-1">{stats.pending}</p>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 text-warning-500" />
                <span className="text-xs uppercase tracking-wide text-[var(--text-muted)]">Avg Rating</span>
              </div>
              <p className="text-2xl font-bold text-[var(--text-primary)] mt-1">
                {stats.avgRating > 0 ? stats.avgRating.toFixed(1) : '-'}
              </p>
            </Card>
          </motion.div>

          {/* Filters */}
          <motion.div variants={itemVariants} className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
              <input
                type="text"
                placeholder="Search agencies..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm bg-[var(--bg-input)] border border-[var(--border-main)] rounded-lg focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] input-skeuo"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-[var(--text-muted)]" />
              <select
                value={statusFilter || ''}
                onChange={(e) => setStatusFilter((e.target.value || undefined) as AgencyStatus | undefined)}
                className="px-4 py-2 text-sm bg-[var(--bg-input)] border border-[var(--border-main)] rounded-lg cursor-pointer input-skeuo"
              >
                <option value="">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
                <option value="PENDING_APPROVAL">Pending</option>
                <option value="BLACKLISTED">Blacklisted</option>
              </select>
            </div>
          </motion.div>

          {/* Agency Form Modal */}
          {showForm && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/40"
              onClick={() => setShowForm(false)}
            >
              <Card
                className="w-full max-w-2xl max-h-[80vh] overflow-y-auto mx-4"
                onClick={(e: React.MouseEvent) => e.stopPropagation()}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>
                      {editingAgency ? 'Edit Agency' : 'Add New Agency'}
                    </CardTitle>
                    <button
                      onClick={() => setShowForm(false)}
                      className="p-1.5 rounded-md hover:bg-[var(--bg-secondary)] cursor-pointer"
                      aria-label="Close form"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </CardHeader>
                <CardContent>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                          Agency Name *
                        </label>
                        <input
                          {...form.register('name')}
                          className="w-full px-4 py-2 text-sm bg-[var(--bg-input)] border border-[var(--border-main)] rounded-lg input-skeuo"
                          placeholder="Agency name"
                        />
                        {form.formState.errors.name && (
                          <p className="text-xs text-danger-600 mt-1">
                            {form.formState.errors.name.message}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                          Contact Person
                        </label>
                        <input
                          {...form.register('contactPerson')}
                          className="w-full px-4 py-2 text-sm bg-[var(--bg-input)] border border-[var(--border-main)] rounded-lg input-skeuo"
                          placeholder="Primary contact"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                          Email
                        </label>
                        <input
                          {...form.register('email')}
                          type="email"
                          className="w-full px-4 py-2 text-sm bg-[var(--bg-input)] border border-[var(--border-main)] rounded-lg input-skeuo"
                          placeholder="agency@example.com"
                        />
                        {form.formState.errors.email && (
                          <p className="text-xs text-danger-600 mt-1">
                            {form.formState.errors.email.message}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                          Phone
                        </label>
                        <input
                          {...form.register('phone')}
                          className="w-full px-4 py-2 text-sm bg-[var(--bg-input)] border border-[var(--border-main)] rounded-lg input-skeuo"
                          placeholder="+91 XXXXX XXXXX"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                          Website
                        </label>
                        <input
                          {...form.register('website')}
                          className="w-full px-4 py-2 text-sm bg-[var(--bg-input)] border border-[var(--border-main)] rounded-lg input-skeuo"
                          placeholder="https://..."
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                          Status
                        </label>
                        <select
                          {...form.register('status')}
                          className="w-full px-4 py-2 text-sm bg-[var(--bg-input)] border border-[var(--border-main)] rounded-lg cursor-pointer input-skeuo"
                        >
                          <option value="ACTIVE">Active</option>
                          <option value="INACTIVE">Inactive</option>
                          <option value="PENDING_APPROVAL">Pending Approval</option>
                          <option value="BLACKLISTED">Blacklisted</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                          Fee Type
                        </label>
                        <select
                          {...form.register('feeType')}
                          className="w-full px-4 py-2 text-sm bg-[var(--bg-input)] border border-[var(--border-main)] rounded-lg cursor-pointer input-skeuo"
                        >
                          <option value="">Select fee type</option>
                          <option value="FIXED">Fixed</option>
                          <option value="PERCENTAGE">Percentage</option>
                          <option value="RETAINER">Retainer</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                          Fee Amount
                        </label>
                        <input
                          {...form.register('feeAmount')}
                          type="number"
                          step="0.01"
                          className="w-full px-4 py-2 text-sm bg-[var(--bg-input)] border border-[var(--border-main)] rounded-lg input-skeuo"
                          placeholder="0.00"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                          Contract Start
                        </label>
                        <input
                          {...form.register('contractStartDate')}
                          type="date"
                          className="w-full px-4 py-2 text-sm bg-[var(--bg-input)] border border-[var(--border-main)] rounded-lg input-skeuo"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                          Contract End
                        </label>
                        <input
                          {...form.register('contractEndDate')}
                          type="date"
                          className="w-full px-4 py-2 text-sm bg-[var(--bg-input)] border border-[var(--border-main)] rounded-lg input-skeuo"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                          Rating (1-5)
                        </label>
                        <input
                          {...form.register('rating')}
                          type="number"
                          min={1}
                          max={5}
                          className="w-full px-4 py-2 text-sm bg-[var(--bg-input)] border border-[var(--border-main)] rounded-lg input-skeuo"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                          Specializations
                        </label>
                        <input
                          {...form.register('specializations')}
                          className="w-full px-4 py-2 text-sm bg-[var(--bg-input)] border border-[var(--border-main)] rounded-lg input-skeuo"
                          placeholder="e.g., IT, Finance, Engineering"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                        Address
                      </label>
                      <input
                        {...form.register('address')}
                        className="w-full px-4 py-2 text-sm bg-[var(--bg-input)] border border-[var(--border-main)] rounded-lg input-skeuo"
                        placeholder="Full address"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                        Notes
                      </label>
                      <textarea
                        {...form.register('notes')}
                        rows={3}
                        className="w-full px-4 py-2 text-sm bg-[var(--bg-input)] border border-[var(--border-main)] rounded-lg resize-none input-skeuo"
                        placeholder="Additional notes..."
                      />
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowForm(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={createMutation.isPending || updateMutation.isPending}
                      >
                        {createMutation.isPending || updateMutation.isPending
                          ? 'Saving...'
                          : editingAgency
                            ? 'Update Agency'
                            : 'Create Agency'}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Agency List */}
          {agenciesQuery.isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </div>
          ) : agencies.length === 0 ? (
            <EmptyState
              icon={<Building2 className="h-10 w-10" />}
              title="No Agencies Found"
              description={
                search || statusFilter
                  ? 'No agencies match your filters'
                  : 'Add your first recruitment agency to get started'
              }
              action={
                !search && !statusFilter
                  ? { label: 'Add Agency', onClick: openCreateForm }
                  : undefined
              }
            />
          ) : (
            <motion.div
              variants={containerVariants}
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
            >
              {agencies.map((agency) => (
                <motion.div key={agency.id} variants={itemVariants}>
                  <Card className="hover:shadow-[var(--shadow-elevated)] transition-shadow cursor-pointer">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3
                              className="font-semibold text-sm text-[var(--text-primary)] truncate cursor-pointer"
                              onClick={() => router.push(`/recruitment/agencies/${agency.id}`)}
                            >
                              {agency.name}
                            </h3>
                            <Badge variant={getStatusVariant(agency.status)} size="sm">
                              {agency.status.replace(/_/g, ' ')}
                            </Badge>
                          </div>
                          <RatingStars rating={agency.rating} />
                          <div className="mt-2 space-y-1">
                            {agency.contactPerson && (
                              <p className="text-xs text-[var(--text-muted)] flex items-center gap-1.5">
                                <Users className="h-3 w-3" />
                                {agency.contactPerson}
                              </p>
                            )}
                            {agency.email && (
                              <p className="text-xs text-[var(--text-muted)] flex items-center gap-1.5">
                                <Mail className="h-3 w-3" />
                                {agency.email}
                              </p>
                            )}
                            {agency.phone && (
                              <p className="text-xs text-[var(--text-muted)] flex items-center gap-1.5">
                                <Phone className="h-3 w-3" />
                                {agency.phone}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-4 mt-2">
                            <span className="text-xs text-[var(--text-muted)] flex items-center gap-1">
                              <DollarSign className="h-3 w-3" />
                              {getFeeLabel(agency.feeType, agency.feeAmount)}
                            </span>
                            {agency.specializations && (
                              <span className="text-xs text-[var(--text-muted)] truncate">
                                {agency.specializations}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <PermissionGate permission={Permissions.AGENCY_UPDATE}>
                            <button
                              onClick={(e) => { e.stopPropagation(); openEditForm(agency); }}
                              className="p-1.5 rounded-md hover:bg-[var(--bg-secondary)] cursor-pointer"
                              aria-label="Edit agency"
                            >
                              <Edit2 className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                            </button>
                          </PermissionGate>
                          <PermissionGate permission={Permissions.AGENCY_DELETE}>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDelete(agency.id); }}
                              className="p-1.5 rounded-md hover:bg-danger-50 dark:hover:bg-danger-900/20 cursor-pointer"
                              aria-label="Delete agency"
                            >
                              <Trash2 className="h-3.5 w-3.5 text-danger-600 dark:text-danger-400" />
                            </button>
                          </PermissionGate>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          )}
        </motion.div>
      </PermissionGate>
    </AppLayout>
  );
}
