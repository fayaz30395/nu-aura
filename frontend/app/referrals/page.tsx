'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout';
import { PermissionGate } from '@/components/auth/PermissionGate';
import { Permissions } from '@/lib/hooks/usePermissions';
import { useAuth } from '@/lib/hooks/useAuth';
import { NuAuraLoader } from '@/components/ui/Loading';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  useMyReferrals,
  useAllReferrals,
  useActivePolicies,
  useReferralDashboard,
  useSubmitReferral,
  useUpdateReferralStatus,
} from '@/lib/hooks/queries/useReferrals';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Users,
  Plus,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  Gift,
  TrendingUp,
  UserPlus,
  FileText,
  DollarSign,
} from 'lucide-react';
import type { ReferralResponse, ReferralStatus, ReferralRelationship } from '@/lib/types/referral';

// ── Zod schema for submit referral form ──────────────────────
const referralFormSchema = z.object({
  candidateName: z.string().min(1, 'Candidate name is required'),
  candidateEmail: z.string().email('Valid email is required'),
  candidatePhone: z.string().optional(),
  candidateLinkedin: z.string().optional(),
  jobTitle: z.string().min(1, 'Position is required'),
  relationship: z.enum([
    'FORMER_COLLEAGUE',
    'FRIEND',
    'FAMILY',
    'CLASSMATE',
    'PROFESSIONAL_NETWORK',
    'OTHER',
  ] as const),
  referrerNotes: z.string().optional(),
});

type ReferralFormValues = z.infer<typeof referralFormSchema>;

// ── Status configuration ─────────────────────────────────────
const getStatusConfig = (status: ReferralStatus) => {
  switch (status) {
    case 'SUBMITTED':
      return { bg: 'bg-sky-100 dark:bg-sky-900/30', text: 'text-sky-700 dark:text-sky-400', label: 'Submitted' };
    case 'SCREENING':
      return { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-400', label: 'Screening' };
    case 'INTERVIEW_SCHEDULED':
      return { bg: 'bg-indigo-100 dark:bg-indigo-900/30', text: 'text-indigo-700 dark:text-indigo-400', label: 'Interview Scheduled' };
    case 'INTERVIEW_COMPLETED':
      return { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-400', label: 'Interview Done' };
    case 'OFFER_MADE':
      return { bg: 'bg-cyan-100 dark:bg-cyan-900/30', text: 'text-cyan-700 dark:text-cyan-400', label: 'Offer Made' };
    case 'OFFER_ACCEPTED':
      return { bg: 'bg-teal-100 dark:bg-teal-900/30', text: 'text-teal-700 dark:text-teal-400', label: 'Offer Accepted' };
    case 'JOINED':
      return { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-400', label: 'Joined' };
    case 'REJECTED':
      return { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400', label: 'Rejected' };
    case 'WITHDRAWN':
      return { bg: 'bg-gray-100 dark:bg-gray-900/30', text: 'text-gray-700 dark:text-gray-400', label: 'Withdrawn' };
    case 'ON_HOLD':
      return { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-400', label: 'On Hold' };
    default:
      return { bg: 'bg-gray-100 dark:bg-gray-900/30', text: 'text-gray-700 dark:text-gray-400', label: status };
  }
};

const RELATIONSHIP_LABELS: Record<ReferralRelationship, string> = {
  FORMER_COLLEAGUE: 'Former Colleague',
  FRIEND: 'Friend',
  FAMILY: 'Family',
  CLASSMATE: 'Classmate',
  PROFESSIONAL_NETWORK: 'Professional Network',
  OTHER: 'Other',
};

type TabKey = 'my-referrals' | 'submit' | 'policies' | 'manage';

export default function ReferralsPage() {
  const router = useRouter();
  const { user, isAuthenticated, hasHydrated } = useAuth();
  const [activeTab, setActiveTab] = useState<TabKey>('my-referrals');
  const [managePage, setManagePage] = useState(0);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Queries
  const { data: myReferrals = [], isLoading: isMyLoading } = useMyReferrals();
  const { data: allReferralsData, isLoading: isAllLoading } = useAllReferrals(managePage, 20);
  const { data: policies = [], isLoading: isPoliciesLoading } = useActivePolicies();
  const { data: dashboard, isLoading: isDashLoading } = useReferralDashboard();

  // Mutations
  const submitReferral = useSubmitReferral();
  const updateStatus = useUpdateReferralStatus();

  // Form
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ReferralFormValues>({
    resolver: zodResolver(referralFormSchema),
    defaultValues: {
      relationship: 'FORMER_COLLEAGUE',
    },
  });

  const onSubmitReferral = useCallback(
    async (data: ReferralFormValues) => {
      try {
        await submitReferral.mutateAsync({
          candidateName: data.candidateName,
          candidateEmail: data.candidateEmail,
          candidatePhone: data.candidatePhone,
          candidateLinkedin: data.candidateLinkedin,
          jobTitle: data.jobTitle,
          relationship: data.relationship,
          referrerNotes: data.referrerNotes,
        });
        setSubmitSuccess(true);
        reset();
        setTimeout(() => {
          setSubmitSuccess(false);
          setActiveTab('my-referrals');
        }, 2000);
      } catch {
        // Error handled by React Query
      }
    },
    [submitReferral, reset]
  );

  if (!hasHydrated) return null;
  if (!isAuthenticated) {
    router.push('/login');
    return null;
  }

  const tabs: { key: TabKey; label: string; permission?: string }[] = [
    { key: 'my-referrals', label: 'My Referrals' },
    { key: 'submit', label: 'Submit Referral' },
    { key: 'policies', label: 'Referral Policy' },
    { key: 'manage', label: 'Manage', permission: Permissions.REFERRAL_MANAGE },
  ];

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatCurrency = (amount: number | null | undefined) => {
    if (amount == null) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <AppLayout activeMenuItem="referrals">
      <motion.div
        className="space-y-6"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
      >
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] skeuo-emboss">
              Referral Portal
            </h1>
            <p className="text-[var(--text-secondary)] mt-1 skeuo-deboss">
              Refer candidates and track your referral bonuses
            </p>
          </div>
          <button
            onClick={() => setActiveTab('submit')}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-sky-500 to-sky-700 hover:from-sky-700 hover:to-sky-700 text-white rounded-xl font-medium shadow-lg shadow-sky-500/25 transition-all duration-200 hover:shadow-xl hover:shadow-sky-500/30 skeuo-button"
          >
            <Plus className="h-5 w-5" />
            Submit Referral
          </button>
        </div>

        {/* Dashboard Stats */}
        {dashboard && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total Referrals', value: dashboard.totalReferrals, icon: Users, gradient: 'from-sky-500 to-sky-700' },
              { label: 'Active', value: dashboard.activeReferrals, icon: TrendingUp, gradient: 'from-amber-500 to-amber-600' },
              { label: 'Hired', value: dashboard.hiredReferrals, icon: UserPlus, gradient: 'from-emerald-500 to-emerald-600' },
              { label: 'Bonuses Paid', value: formatCurrency(dashboard.totalBonusesPaid), icon: DollarSign, gradient: 'from-purple-500 to-purple-600' },
            ].map((stat) => (
              <div
                key={stat.label}
                className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-main)] p-4 hover:shadow-lg transition-all duration-200 skeuo-card"
              >
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-xl bg-gradient-to-br ${stat.gradient}`}>
                    <stat.icon className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-[var(--text-secondary)]">{stat.label}</p>
                    <p className="text-2xl font-bold text-[var(--text-primary)] skeuo-emboss">
                      {stat.value}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div className="border-b border-[var(--border-main)]">
          <nav className="flex gap-6 -mb-px">
            {tabs.map((tab) => {
              if (tab.permission) {
                return (
                  <PermissionGate key={tab.key} permission={tab.permission}>
                    <button
                      onClick={() => setActiveTab(tab.key)}
                      className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                        activeTab === tab.key
                          ? 'border-sky-700 text-sky-700 dark:text-sky-400'
                          : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-main)]'
                      }`}
                    >
                      {tab.label}
                    </button>
                  </PermissionGate>
                );
              }
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.key
                      ? 'border-sky-700 text-sky-700 dark:text-sky-400'
                      : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-main)]'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}

        {/* ── My Referrals ── */}
        {activeTab === 'my-referrals' && (
          <div>
            {isMyLoading ? (
              <NuAuraLoader message="Loading your referrals..." />
            ) : myReferrals.length === 0 ? (
              <EmptyState
                title="No referrals yet"
                description="Submit a referral to get started and earn bonuses."
                icon={<UserPlus className="h-12 w-12 text-[var(--text-muted)]" />}
              />
            ) : (
              <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-main)] overflow-hidden skeuo-card">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[var(--border-main)] bg-[var(--bg-secondary)]">
                        <th className="text-left text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider px-6 py-3">
                          Candidate
                        </th>
                        <th className="text-left text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider px-6 py-3">
                          Position
                        </th>
                        <th className="text-left text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider px-6 py-3">
                          Status
                        </th>
                        <th className="text-left text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider px-6 py-3">
                          Submitted
                        </th>
                        <th className="text-left text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider px-6 py-3">
                          Bonus
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-main)]">
                      {myReferrals.map((referral: ReferralResponse) => {
                        const statusConfig = getStatusConfig(referral.status);
                        return (
                          <tr
                            key={referral.id}
                            className="hover:bg-[var(--bg-card-hover)] transition-colors"
                          >
                            <td className="px-6 py-4">
                              <div>
                                <p className="text-sm font-medium text-[var(--text-primary)]">
                                  {referral.candidateName}
                                </p>
                                <p className="text-xs text-[var(--text-muted)]">
                                  {referral.candidateEmail}
                                </p>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">
                              {referral.jobTitle || '-'}
                            </td>
                            <td className="px-6 py-4">
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusConfig.bg} ${statusConfig.text}`}
                              >
                                {statusConfig.label}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">
                              {formatDate(referral.submittedDate)}
                            </td>
                            <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">
                              {referral.bonusAmount
                                ? formatCurrency(referral.bonusAmount)
                                : '-'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Submit Referral Form ── */}
        {activeTab === 'submit' && (
          <div className="max-w-2xl">
            {submitSuccess ? (
              <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-6 text-center">
                <CheckCircle className="h-12 w-12 text-emerald-600 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-emerald-800 dark:text-emerald-300">
                  Referral Submitted Successfully!
                </h3>
                <p className="text-sm text-emerald-600 dark:text-emerald-400 mt-1">
                  You can track its progress in the My Referrals tab.
                </p>
              </div>
            ) : (
              <form
                onSubmit={handleSubmit(onSubmitReferral)}
                className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-main)] p-6 space-y-5 skeuo-card"
              >
                <h2 className="text-lg font-semibold text-[var(--text-primary)] skeuo-emboss">
                  Submit a Referral
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Candidate Name */}
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                      Candidate Name *
                    </label>
                    <input
                      {...register('candidateName')}
                      className="w-full px-3 py-2 rounded-lg border border-[var(--border-main)] bg-[var(--bg-surface)] text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-sky-700 focus:ring-offset-2"
                      placeholder="Full name"
                    />
                    {errors.candidateName && (
                      <p className="text-xs text-red-500 mt-1">{errors.candidateName.message}</p>
                    )}
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                      Email *
                    </label>
                    <input
                      {...register('candidateEmail')}
                      type="email"
                      className="w-full px-3 py-2 rounded-lg border border-[var(--border-main)] bg-[var(--bg-surface)] text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-sky-700 focus:ring-offset-2"
                      placeholder="candidate@email.com"
                    />
                    {errors.candidateEmail && (
                      <p className="text-xs text-red-500 mt-1">{errors.candidateEmail.message}</p>
                    )}
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                      Phone
                    </label>
                    <input
                      {...register('candidatePhone')}
                      className="w-full px-3 py-2 rounded-lg border border-[var(--border-main)] bg-[var(--bg-surface)] text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-sky-700 focus:ring-offset-2"
                      placeholder="+1 (555) 000-0000"
                    />
                  </div>

                  {/* LinkedIn */}
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                      LinkedIn Profile
                    </label>
                    <input
                      {...register('candidateLinkedin')}
                      className="w-full px-3 py-2 rounded-lg border border-[var(--border-main)] bg-[var(--bg-surface)] text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-sky-700 focus:ring-offset-2"
                      placeholder="https://linkedin.com/in/..."
                    />
                  </div>

                  {/* Position */}
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                      Position *
                    </label>
                    <input
                      {...register('jobTitle')}
                      className="w-full px-3 py-2 rounded-lg border border-[var(--border-main)] bg-[var(--bg-surface)] text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-sky-700 focus:ring-offset-2"
                      placeholder="e.g., Senior Software Engineer"
                    />
                    {errors.jobTitle && (
                      <p className="text-xs text-red-500 mt-1">{errors.jobTitle.message}</p>
                    )}
                  </div>

                  {/* Relationship */}
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                      Relationship *
                    </label>
                    <select
                      {...register('relationship')}
                      className="w-full px-3 py-2 rounded-lg border border-[var(--border-main)] bg-[var(--bg-surface)] text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-sky-700 focus:ring-offset-2"
                    >
                      {(Object.entries(RELATIONSHIP_LABELS) as [ReferralRelationship, string][]).map(
                        ([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        )
                      )}
                    </select>
                    {errors.relationship && (
                      <p className="text-xs text-red-500 mt-1">{errors.relationship.message}</p>
                    )}
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                    Notes
                  </label>
                  <textarea
                    {...register('referrerNotes')}
                    rows={3}
                    className="w-full px-3 py-2 rounded-lg border border-[var(--border-main)] bg-[var(--bg-surface)] text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-sky-700 focus:ring-offset-2 resize-none"
                    placeholder="Why do you recommend this candidate?"
                  />
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      reset();
                      setActiveTab('my-referrals');
                    }}
                    className="px-4 py-2 text-sm font-medium text-[var(--text-secondary)] bg-[var(--bg-surface)] border border-[var(--border-main)] rounded-xl hover:bg-[var(--bg-card-hover)] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || submitReferral.isPending}
                    className="px-5 py-2 text-sm font-medium text-white bg-sky-700 hover:bg-sky-800 rounded-xl shadow-lg shadow-sky-700/25 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitReferral.isPending ? 'Submitting...' : 'Submit Referral'}
                  </button>
                </div>

                {submitReferral.isError && (
                  <p className="text-sm text-red-500 mt-2">
                    Failed to submit referral. Please try again.
                  </p>
                )}
              </form>
            )}
          </div>
        )}

        {/* ── Policies Tab ── */}
        {activeTab === 'policies' && (
          <div>
            {isPoliciesLoading ? (
              <NuAuraLoader message="Loading policies..." />
            ) : policies.length === 0 ? (
              <EmptyState
                title="No active policies"
                description="Referral policies will appear here once configured by HR."
                icon={<FileText className="h-12 w-12 text-[var(--text-muted)]" />}
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {policies.map((policy) => (
                  <div
                    key={policy.id}
                    className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-main)] p-5 skeuo-card"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="text-base font-semibold text-[var(--text-primary)]">
                          {policy.name}
                        </h3>
                        {policy.description && (
                          <p className="text-sm text-[var(--text-secondary)] mt-1">
                            {policy.description}
                          </p>
                        )}
                      </div>
                      <span
                        className={`text-xs font-medium px-2 py-1 rounded-full ${
                          policy.isActive
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                            : 'bg-gray-100 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400'
                        }`}
                      >
                        {policy.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-[var(--text-muted)]">Base Bonus</span>
                        <p className="font-medium text-[var(--text-primary)]">
                          {formatCurrency(policy.baseBonusAmount)}
                        </p>
                      </div>
                      <div>
                        <span className="text-[var(--text-muted)]">Applicable For</span>
                        <p className="font-medium text-[var(--text-primary)]">
                          {policy.applicableFor === 'ALL'
                            ? 'All Positions'
                            : policy.applicableFor === 'DEPARTMENT_SPECIFIC'
                              ? policy.departmentName || 'Specific Dept.'
                              : policy.jobLevel || 'Specific Level'}
                        </p>
                      </div>
                      {policy.retentionPeriodMonths && (
                        <div>
                          <span className="text-[var(--text-muted)]">Retention Period</span>
                          <p className="font-medium text-[var(--text-primary)]">
                            {policy.retentionPeriodMonths} months
                          </p>
                        </div>
                      )}
                      {policy.maxReferralsPerMonth && (
                        <div>
                          <span className="text-[var(--text-muted)]">Max/Month</span>
                          <p className="font-medium text-[var(--text-primary)]">
                            {policy.maxReferralsPerMonth}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Manage Tab (Admin) ── */}
        {activeTab === 'manage' && (
          <PermissionGate permission={Permissions.REFERRAL_MANAGE}>
            <div>
              {isAllLoading ? (
                <NuAuraLoader message="Loading all referrals..." />
              ) : !allReferralsData || allReferralsData.content.length === 0 ? (
                <EmptyState
                  title="No referrals found"
                  description="Referrals submitted by employees will appear here."
                  icon={<Users className="h-12 w-12 text-[var(--text-muted)]" />}
                />
              ) : (
                <>
                  <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-main)] overflow-hidden skeuo-card">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-[var(--border-main)] bg-[var(--bg-secondary)]">
                            <th className="text-left text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider px-6 py-3">
                              Referrer
                            </th>
                            <th className="text-left text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider px-6 py-3">
                              Candidate
                            </th>
                            <th className="text-left text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider px-6 py-3">
                              Position
                            </th>
                            <th className="text-left text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider px-6 py-3">
                              Status
                            </th>
                            <th className="text-left text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider px-6 py-3">
                              Submitted
                            </th>
                            <th className="text-left text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider px-6 py-3">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border-main)]">
                          {allReferralsData.content.map((referral: ReferralResponse) => {
                            const statusConfig = getStatusConfig(referral.status);
                            return (
                              <tr
                                key={referral.id}
                                className="hover:bg-[var(--bg-card-hover)] transition-colors"
                              >
                                <td className="px-6 py-4 text-sm text-[var(--text-primary)]">
                                  {referral.referrerName}
                                </td>
                                <td className="px-6 py-4">
                                  <div>
                                    <p className="text-sm font-medium text-[var(--text-primary)]">
                                      {referral.candidateName}
                                    </p>
                                    <p className="text-xs text-[var(--text-muted)]">
                                      {referral.candidateEmail}
                                    </p>
                                  </div>
                                </td>
                                <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">
                                  {referral.jobTitle || '-'}
                                </td>
                                <td className="px-6 py-4">
                                  <span
                                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusConfig.bg} ${statusConfig.text}`}
                                  >
                                    {statusConfig.label}
                                  </span>
                                </td>
                                <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">
                                  {formatDate(referral.submittedDate)}
                                </td>
                                <td className="px-6 py-4">
                                  {referral.status === 'SUBMITTED' && (
                                    <div className="flex gap-2">
                                      <button
                                        onClick={() =>
                                          updateStatus.mutate({
                                            id: referral.id,
                                            status: 'SCREENING',
                                          })
                                        }
                                        className="text-xs px-2.5 py-1 rounded-lg bg-sky-100 text-sky-700 hover:bg-sky-200 dark:bg-sky-900/30 dark:text-sky-400 transition-colors"
                                      >
                                        Screen
                                      </button>
                                    </div>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Pagination */}
                  {allReferralsData.totalPages > 1 && (
                    <div className="flex items-center justify-between mt-4">
                      <p className="text-sm text-[var(--text-muted)]">
                        Showing page {allReferralsData.number + 1} of{' '}
                        {allReferralsData.totalPages} ({allReferralsData.totalElements} total)
                      </p>
                      <div className="flex gap-2">
                        <button
                          disabled={managePage === 0}
                          onClick={() => setManagePage((p) => Math.max(0, p - 1))}
                          className="px-3 py-1.5 text-sm border border-[var(--border-main)] rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)] disabled:opacity-50 transition-colors"
                        >
                          Previous
                        </button>
                        <button
                          disabled={managePage >= allReferralsData.totalPages - 1}
                          onClick={() => setManagePage((p) => p + 1)}
                          className="px-3 py-1.5 text-sm border border-[var(--border-main)] rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)] disabled:opacity-50 transition-colors"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </PermissionGate>
        )}
      </motion.div>
    </AppLayout>
  );
}
