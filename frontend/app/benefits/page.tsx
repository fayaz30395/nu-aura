'use client';

import React, {useMemo, useState} from 'react';
import {useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';
import {
  AlertCircle,
  Building,
  Calendar,
  CheckCircle,
  CreditCard,
  FileText,
  Gift,
  Heart,
  IndianRupee,
  Loader2,
  Plus,
  Receipt,
  Shield,
  Stethoscope,
  User,
  UserPlus,
  Users,
  XCircle,
} from 'lucide-react';
import {AppLayout} from '@/components/layout/AppLayout';
import {useAuth} from '@/lib/hooks/useAuth';
import {Permissions} from '@/lib/hooks/usePermissions';
import {PermissionGate} from '@/components/auth/PermissionGate';
import {
  Badge,
  Button,
  Card,
  CardContent,
  ConfirmDialog,
  EmptyState,
  Modal,
  ModalBody,
  ModalHeader,
  Stat,
} from '@/components/ui';
import {Ring} from '@/components/charts/aura';
import {BenefitClaim, BenefitEnrollment, ClaimRequest, CoverageLevel,} from '@/lib/types/hrms/benefits';
import {
  useActiveBenefitPlans,
  useActiveEnrollments,
  useEmployeeBenefitEnrollments,
  useEnrollEmployee,
  useSubmitBenefitClaim,
  useTerminateEnrollment,
} from '@/lib/hooks/queries';
import {createLogger} from '@/lib/utils/logger';
import {formatDate} from '@/lib/utils/format/date';

const log = createLogger('BenefitsPage');

function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {style: 'currency', currency: 'INR', maximumFractionDigits: 0}).format(amount);
}

const enrollmentFormSchema = z.object({
  coverageLevel: z.string().min(1, 'Coverage level required'),
  effectiveDate: z.string().min(1, 'Effective date required'),
  useFlexCredits: z.boolean().default(false),
});

const claimFormSchema = z.object({
  enrollmentId: z.string().min(1, 'Enrollment required'),
  claimType: z.string().min(1, 'Claim type required'),
  claimAmount: z.coerce.number().positive('Amount must be positive'),
  serviceDate: z.string().min(1, 'Service date required'),
  serviceProvider: z.string().min(1, 'Service provider required'),
  description: z.string().optional().or(z.literal('')),
  receiptUrl: z.string().url().optional().or(z.literal('')),
});

type EnrollmentFormData = z.infer<typeof enrollmentFormSchema>;
type ClaimFormData = z.infer<typeof claimFormSchema>;

type TabType = 'plans' | 'enrollments' | 'claims';

interface DisplayBenefit {
  id: string;
  name: string;
  type: string;
  description: string;
  monthlyPremium: number;
  coverage: number;
  isEnrolled: boolean;
  provider: string;
  enrollmentId?: string;
  enrollment?: BenefitEnrollment;
}

const mapPlanTypeToDisplay = (planType: string): string => {
  const typeMap: Record<string, string> = {
    'HEALTH_INSURANCE': 'HEALTH',
    'LIFE_INSURANCE': 'LIFE',
    'DENTAL': 'DENTAL',
    'VISION': 'VISION',
    'DISABILITY': 'DISABILITY',
    'RETIREMENT': 'RETIREMENT',
    'FSA': 'FSA',
    'HSA': 'HSA',
    'WELLNESS': 'OTHER',
    'EAP': 'OTHER',
    'OTHER': 'OTHER',
  };
  return typeMap[planType] || planType;
};

const getBenefitIcon = (type: string) => {
  switch (type) {
    case 'HEALTH':
      return <Stethoscope className="h-6 w-6"/>;
    case 'DENTAL':
      return <Heart className="h-6 w-6"/>;
    case 'LIFE':
      return <Shield className="h-6 w-6"/>;
    case 'RETIREMENT':
      return <Building className="h-6 w-6"/>;
    case 'FSA':
    case 'HSA':
      return <IndianRupee className="h-6 w-6"/>;
    case 'VISION':
      return <Users className="h-6 w-6"/>;
    default:
      return <Gift className="h-6 w-6"/>;
  }
};

/**
 * Per-benefit accent color, resolved to a chart palette token (Aura).
 * Mirrors the prototype, which assigns each plan a distinct `--chart-N` hue so
 * the plan grid reads as a varied program list rather than one flat accent.
 * Token-driven only — the tile background is derived via `color-mix` at 14%
 * (matching the prototype's tile recipe), so light/dark parity is automatic.
 */
const getBenefitChartColor = (type: string): string => {
  switch (type) {
    case 'HEALTH':
      return 'var(--chart-1)';
    case 'DENTAL':
      return 'var(--chart-3)';
    case 'VISION':
      return 'var(--chart-5)';
    case 'RETIREMENT':
    case 'FSA':
    case 'HSA':
      return 'var(--chart-4)';
    case 'LIFE':
      return 'var(--chart-2)';
    default:
      return 'var(--chart-3)';
  }
};

const coverageLevelLabels: Record<CoverageLevel, string> = {
  'EMPLOYEE_ONLY': 'Employee Only',
  'EMPLOYEE_SPOUSE': 'Employee + Spouse',
  'EMPLOYEE_CHILDREN': 'Employee + Children',
  'FAMILY': 'Family',
};

export default function BenefitsPage() {
  const {user, hasHydrated} = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('plans');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedBenefit, setSelectedBenefit] = useState<DisplayBenefit | null>(null);
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);
  const [showTerminateConfirm, setShowTerminateConfirm] = useState(false);
  const [selectedEnrollmentForTerminate, setSelectedEnrollmentForTerminate] = useState<string | null>(null);

  // Initialize React Query hooks
  const plansQuery = useActiveBenefitPlans();
  const activeEnrollmentsQuery = useActiveEnrollments(user?.employeeId || '');
  const employeeEnrollmentsQuery = useEmployeeBenefitEnrollments(user?.employeeId || '');
  const enrollMutation = useEnrollEmployee();
  const terminateMutation = useTerminateEnrollment();
  const submitClaimMutation = useSubmitBenefitClaim();

  // Form setup for enrollment
  const {
    register: registerEnrollment,
    handleSubmit: handleSubmitEnrollment,
    reset: resetEnrollmentForm,
    formState: {errors: enrollmentErrors, isSubmitting: isEnrollingForm},
  } = useForm<EnrollmentFormData>({
    resolver: zodResolver(enrollmentFormSchema),
    defaultValues: {
      coverageLevel: 'EMPLOYEE_ONLY',
      effectiveDate: new Date().toISOString().split('T')[0],
      useFlexCredits: false,
    },
  });

  // Form setup for claims
  const {
    register: registerClaim,
    handleSubmit: handleSubmitClaim,
    reset: resetClaimForm,
    formState: {errors: claimErrors, isSubmitting: isSubmittingClaim},
  } = useForm<ClaimFormData>({
    resolver: zodResolver(claimFormSchema),
    defaultValues: {
      enrollmentId: '',
      claimType: 'MEDICAL',
      claimAmount: 0,
      serviceDate: new Date().toISOString().split('T')[0],
      serviceProvider: '',
      description: '',
      receiptUrl: '',
    },
  });

  const showNotification = (message: string, type: 'success' | 'error') => {
    if (type === 'success') {
      setSuccess(message);
      setError(null);
    } else {
      setError(message);
      setSuccess(null);
    }
    setTimeout(() => {
      setSuccess(null);
      setError(null);
    }, 5000);
  };

  // Compute display benefits from query data
  const benefits = useMemo(() => {
    const plans = plansQuery.data || [];
    const enrollments = activeEnrollmentsQuery.data || [];

    const displayBenefits: DisplayBenefit[] = plans.map((plan) => {
      const enrollment = enrollments.find(e => e.benefitPlanId === plan.id);

      return {
        id: plan.id,
        name: plan.planName,
        type: mapPlanTypeToDisplay(plan.benefitType),
        description: plan.description || '',
        monthlyPremium: plan.employeeContribution,
        coverage: plan.coverageAmount,
        isEnrolled: !!enrollment,
        provider: plan.providerName || 'Provider',
        enrollmentId: enrollment?.id,
        enrollment,
      };
    });

    return displayBenefits;
  }, [plansQuery.data, activeEnrollmentsQuery.data]);

  // For enrollments tab, use the employeeEnrollmentsQuery
  const enrollments = useMemo(() => {
    return employeeEnrollmentsQuery.data || [];
  }, [employeeEnrollmentsQuery.data]);

  // Placeholder for claims - would need a useEmployeeClaims hook
  const claims: BenefitClaim[] = [];
  // Note: We kept this as empty since we didn't create a hook for it.
  // If needed, add useEmployeeClaims to the useBenefits hooks.

  const stats = {
    totalEnrolled: benefits.filter((b) => b.isEnrolled).length,
    monthlyPremium: benefits.filter((b) => b.isEnrolled).reduce((sum, b) => sum + b.monthlyPremium, 0),
    availablePlans: benefits.length,
    totalCoverage: benefits.filter((b) => b.isEnrolled).reduce((sum, b) => sum + b.coverage, 0),
    flexCredits: 0,
  };

  const handleOpenEnrollModal = (benefit: DisplayBenefit) => {
    setSelectedBenefit(benefit);
    resetEnrollmentForm();
    setIsEnrollModalOpen(true);
  };

  const onEnrollSubmit = async (data: EnrollmentFormData) => {
    if (!selectedBenefit || !user?.employeeId) return;

    try {
      await enrollMutation.mutateAsync({
        benefitPlanId: selectedBenefit.id,
        employeeId: user.employeeId,
        coverageLevel: data.coverageLevel as CoverageLevel,
        effectiveDate: data.effectiveDate,
        useFlexCredits: data.useFlexCredits,
      });

      setIsEnrollModalOpen(false);
      resetEnrollmentForm();
      showNotification(`Successfully enrolled in ${selectedBenefit.name}!`, 'success');
    } catch (err: unknown) {
      log.error('Error enrolling:', err);
      showNotification((err as {
        response?: { data?: { message?: string } }
      })?.response?.data?.message || 'Failed to enroll', 'error');
    }
  };

  const handleTerminateStart = (enrollmentId: string) => {
    setSelectedEnrollmentForTerminate(enrollmentId);
    setShowTerminateConfirm(true);
  };

  const handleTerminateConfirm = async () => {
    if (!selectedEnrollmentForTerminate) return;

    try {
      await terminateMutation.mutateAsync({
        enrollmentId: selectedEnrollmentForTerminate,
        reason: 'Employee requested termination'
      });
      showNotification('Enrollment terminated successfully', 'success');
      setShowTerminateConfirm(false);
      setSelectedEnrollmentForTerminate(null);
    } catch (err: unknown) {
      log.error('Error terminating:', err);
      showNotification((err as {
        response?: { data?: { message?: string } }
      })?.response?.data?.message || 'Failed to terminate enrollment', 'error');
    }
  };

  const handleOpenClaimModal = () => {
    if (enrollments.filter(e => e.status === 'ACTIVE').length === 0) {
      showNotification('You need an active enrollment to submit a claim', 'error');
      return;
    }
    resetClaimForm({
      enrollmentId: enrollments.find(e => e.status === 'ACTIVE')?.id || '',
      claimType: 'MEDICAL',
      claimAmount: 0,
      serviceDate: new Date().toISOString().split('T')[0],
      serviceProvider: '',
      description: '',
      receiptUrl: '',
    });
    setIsClaimModalOpen(true);
  };

  const onClaimSubmit = async (data: ClaimFormData) => {
    if (!user?.employeeId) return;

    try {
      const request: ClaimRequest = {
        enrollmentId: data.enrollmentId,
        claimType: data.claimType as 'MEDICAL' | 'DENTAL' | 'VISION' | 'PRESCRIPTION' | 'OTHER',
        claimAmount: data.claimAmount,
        serviceDate: data.serviceDate,
        serviceProvider: data.serviceProvider,
        description: data.description ?? '',
        receiptUrl: data.receiptUrl || undefined,
      };

      await submitClaimMutation.mutateAsync(request);
      setIsClaimModalOpen(false);
      resetClaimForm();
      showNotification('Claim submitted successfully!', 'success');
      setActiveTab('claims');
    } catch (err: unknown) {
      log.error('Error submitting claim:', err);
      showNotification((err as {
        response?: { data?: { message?: string } }
      })?.response?.data?.message || 'Failed to submit claim', 'error');
    }
  };

  const breadcrumbs = [
    {label: 'Dashboard', href: '/dashboard'},
    {label: 'Benefits'},
  ];

  if (!hasHydrated || (plansQuery.isLoading && user?.employeeId)) {
    return (
      <AppLayout breadcrumbs={breadcrumbs} activeMenuItem="benefits">
        <div className="flex h-64 items-center justify-center" role="status" aria-live="polite">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--accent)]"/>
          <span className="ml-2 text-sm text-[var(--text-2)]">Loading benefits…</span>
        </div>
      </AppLayout>
    );
  }

  // SuperAdmin (no employeeId) - show message
  if (!user?.employeeId) {
    return (
      <AppLayout breadcrumbs={breadcrumbs} activeMenuItem="benefits">
        <EmptyState
          icon={<Gift className="h-12 w-12"/>}
          title="Benefits Management"
          description="As an administrator, you don't have personal benefits. Select an employee to view their benefits enrollment."
        />
      </AppLayout>
    );
  }

  return (
    <AppLayout breadcrumbs={breadcrumbs} activeMenuItem="benefits">
      <div className="space-y-6">
        {/* Notifications */}
        {error && (
          <div
            role="alert"
            className="flex items-center gap-2 rounded-aura-lg border border-[var(--err-bd)] bg-[var(--err-bg)] p-4 text-sm text-[var(--err-fg)]">
            <AlertCircle className="h-5 w-5 shrink-0"/>
            <span>{error}</span>
            <Button size="sm" variant="outline" onClick={() => plansQuery.refetch()} className="ml-auto">
              Retry
            </Button>
          </div>
        )}
        {success && (
          <div
            role="status"
            className="flex items-center gap-2 rounded-aura-lg border border-[var(--ok-bd)] bg-[var(--ok-bg)] p-4 text-sm text-[var(--ok-fg)]">
            <CheckCircle className="h-5 w-5 shrink-0"/>
            <span>{success}</span>
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-aura-title text-[var(--text-1)]">Benefits</h1>
            <p className="mt-1 text-sm text-[var(--text-2)]">
              <span className="tnum">{stats.totalEnrolled}</span> of{' '}
              <span className="tnum">{stats.availablePlans}</span> plans enrolled ·{' '}
              <span className="tnum">{formatINR(stats.monthlyPremium)}</span>/mo your share
            </p>
          </div>
          <PermissionGate permission={Permissions.BENEFIT_CLAIM_SUBMIT}>
            <Button onClick={handleOpenClaimModal} leftIcon={<Plus className="h-4 w-4"/>}>
              Submit claim
            </Button>
          </PermissionGate>
        </div>

        {/* KPI Stats — Aura icon-tile + value + footnote */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Card padding="sm">
            <Stat
              iconTone="success"
              icon={<CheckCircle className="h-5 w-5"/>}
              label="Enrolled plans"
              value={<span className="tnum">{stats.totalEnrolled}</span>}
              foot={`of ${stats.availablePlans} available`}
            />
          </Card>
          <Card padding="sm">
            <Stat
              iconTone="accent"
              icon={<IndianRupee className="h-5 w-5"/>}
              label="Monthly premium"
              value={<span className="tnum">{formatINR(stats.monthlyPremium)}</span>}
              foot="Your share / mo"
            />
          </Card>
          <Card padding="sm">
            <Stat
              iconTone="info"
              icon={<Gift className="h-5 w-5"/>}
              label="Available plans"
              value={<span className="tnum">{stats.availablePlans}</span>}
              foot="Open for enrollment"
            />
          </Card>
          <Card padding="sm">
            <Stat
              iconTone="warning"
              icon={<Shield className="h-5 w-5"/>}
              label="Total coverage"
              value={<span className="tnum">{formatINR(stats.totalCoverage)}</span>}
              foot="Across enrolled plans"
            />
          </Card>
          <Card padding="sm">
            <Stat
              iconTone="neutral"
              icon={<CreditCard className="h-5 w-5"/>}
              label="Flex credits"
              value={<span className="tnum">{formatINR(stats.flexCredits)}</span>}
              foot="Available to apply"
            />
          </Card>
        </div>

        {/* Tabs — Aura underline tab strip */}
        <div className="flex gap-1 border-b border-[var(--border)]" role="tablist" aria-label="Benefits views">
          {([
            {id: 'plans', label: 'Benefit Plans', icon: Gift},
            {id: 'enrollments', label: 'My Enrollments', icon: CheckCircle},
            {id: 'claims', label: 'Claims', icon: Receipt},
          ] as const).map(({id, label, icon: TabIcon}) => {
            const isActive = activeTab === id;
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveTab(id)}
                className={`-mb-px inline-flex items-center gap-2 rounded-t-aura-md px-4 py-2.5 text-sm font-semibold transition-colors duration-[var(--t-fast)] focus-ring ${
                  isActive
                    ? 'border-b-2 border-[var(--accent)] text-[var(--accent-text)]'
                    : 'border-b-2 border-transparent text-[var(--text-3)] hover:text-[var(--text-1)]'
                }`}
              >
                <TabIcon className="h-4 w-4"/>
                {label}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        {activeTab === 'plans' && (
          <div className="space-y-4">
            {/* Section head — Aura */}
            {benefits.length > 0 && (
              <div>
                <h2 className="font-display text-[15px] font-bold text-[var(--text-1)]">Plans</h2>
                <p className="text-xs text-[var(--text-3)]">Enrollment and coverage by program</p>
              </div>
            )}

            {/* Plans grid — color icon tile · provider · enrolled bar · Tier/Cost footer */}
            {benefits.length > 0 && (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {benefits.map((benefit) => {
                  const planColor = getBenefitChartColor(benefit.type);
                  const barColor = planColor;
                  // Real-data adaptation: the prototype shows org-wide "enrolled n/total"
                  // counts, which this route does not fetch. We bind the bar to the real
                  // per-user enrollment signal instead — full when the employee is covered.
                  const enrolledPct = benefit.isEnrolled ? 100 : 0;
                  const tier = benefit.enrollment
                    ? coverageLevelLabels[benefit.enrollment.coverageLevel]
                    : 'Not enrolled';
                  return (
                    <Card key={benefit.id} hover className="flex flex-col p-4">
                      {/* Header: icon tile + name + provider */}
                      <div className="mb-4 flex items-center gap-2">
                        <span
                          className="inline-grid h-11 w-11 place-items-center rounded-aura-lg"
                          style={{
                            background: `color-mix(in srgb, ${planColor} 14%, transparent)`,
                            color: planColor,
                          }}
                        >
                          {getBenefitIcon(benefit.type)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-display text-[15px] font-bold text-[var(--text-1)]">
                            {benefit.name}
                          </div>
                          <div className="truncate text-xs text-[var(--text-3)]">{benefit.provider}</div>
                        </div>
                        {benefit.isEnrolled ? (
                          <Badge variant="success" size="sm">Enrolled</Badge>
                        ) : (
                          <Badge variant="info" size="sm">Available</Badge>
                        )}
                      </div>

                      {/* Enrolled row + progress bar */}
                      <div className="mb-1.5 flex items-center justify-between text-[12.5px]">
                        <span className="text-[var(--text-3)]">Enrolled</span>
                        <span className="tnum whitespace-nowrap font-semibold text-[var(--text-1)]">
                          {benefit.isEnrolled ? 'Active' : <span className="text-[var(--text-3)]">Not enrolled</span>}
                        </span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-aura-full bg-[var(--surface-sunken)]">
                        <div
                          className="h-full rounded-aura-full transition-[width] duration-[var(--t-slow)] ease-[var(--ease)]"
                          style={{width: `${enrolledPct}%`, background: barColor}}
                        />
                      </div>

                      {/* Footer: Tier / Cost */}
                      <div className="mt-4 flex items-end justify-between border-t border-[var(--border-soft)] pt-3.5">
                        <div>
                          <div className="text-aura-micro">Tier</div>
                          <div className="mt-[3px] text-[12.5px] font-semibold text-[var(--text-1)]">{tier}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-aura-micro">Cost</div>
                          <div className="tnum mt-[3px] whitespace-nowrap text-[12.5px] font-semibold text-[var(--text-1)]">
                            {formatINR(benefit.monthlyPremium)}/mo
                          </div>
                        </div>
                      </div>

                      {/* Enroll action for available plans */}
                      {!benefit.isEnrolled && (
                        <PermissionGate permission={Permissions.BENEFIT_ENROLL}>
                          <Button
                            size="sm"
                            variant="soft"
                            className="mt-3 w-full"
                            leftIcon={<Plus className="h-4 w-4"/>}
                            onClick={() => handleOpenEnrollModal(benefit)}
                          >
                            Enroll
                          </Button>
                        </PermissionGate>
                      )}
                    </Card>
                  );
                })}
              </div>
            )}

            {benefits.length === 0 && (
              <Card>
                <EmptyState
                  icon={<Gift className="h-12 w-12"/>}
                  title="No benefit plans available"
                  description="There are currently no benefit plans open for enrollment. Check back when your open-enrollment window begins."
                />
              </Card>
            )}

            {/* Open enrollment progress — 92px Ring + status bars (presentation) */}
            {benefits.length > 0 && (() => {
              const enrolledCount = stats.totalEnrolled;
              const availableCount = stats.availablePlans;
              const notEnrolled = Math.max(0, availableCount - enrolledCount);
              const ringPct = availableCount > 0 ? Math.round((enrolledCount / availableCount) * 100) : 0;
              const pctOf = (n: number) => (availableCount > 0 ? Math.round((n / availableCount) * 100) : 0);
              const rows: Array<[string, number, string]> = [
                ['Enrolled', enrolledCount, 'var(--ok-fg)'],
                ['Not enrolled', notEnrolled, 'var(--err-fg)'],
              ];
              return (
                <Card className="p-5">
                  <div className="mb-4 flex items-start justify-between gap-4">
                    <div>
                      <h2 className="font-display text-[15px] font-bold text-[var(--text-1)]">
                        Your enrollment progress
                      </h2>
                      <p className="text-xs text-[var(--text-3)]">
                        Coverage across available plans
                      </p>
                    </div>
                    <Badge variant="success" size="sm">
                      <span className="tnum">{ringPct}%</span> covered
                    </Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-6">
                    <Ring
                      value={ringPct}
                      size={92}
                      thickness={10}
                      color="var(--ok-fg)"
                      label={`${ringPct}%`}
                      ariaLabel={`${ringPct} percent of available plans enrolled`}
                    />
                    <div className="flex min-w-[240px] flex-1 flex-col gap-4">
                      {rows.map(([label, n, color]) => (
                        <div key={label}>
                          <div className="mb-1.5 flex items-center justify-between text-xs">
                            <span className="font-semibold text-[var(--text-2)]">{label}</span>
                            <span className="tnum text-[var(--text-3)]">
                              {n} · {pctOf(n)}%
                            </span>
                          </div>
                          <div className="h-1.5 w-full overflow-hidden rounded-aura-full bg-[var(--surface-sunken)]">
                            <div
                              className="h-full rounded-aura-full transition-[width] duration-[var(--t-slow)] ease-[var(--ease)]"
                              style={{width: `${pctOf(n)}%`, background: color}}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>
              );
            })()}
          </div>
        )}

        {activeTab === 'enrollments' && (
          <div className="space-y-4">
            {enrollments.length === 0 ? (
              <Card>
                <EmptyState
                  icon={<FileText className="h-12 w-12"/>}
                  title="No enrollments yet"
                  description="You haven't enrolled in any benefit plans yet. Browse the available plans to get covered."
                  actionLabel="Browse plans"
                  onAction={() => setActiveTab('plans')}
                />
              </Card>
            ) : (
              enrollments.map((enrollment) => (
                <Card key={enrollment.id} hover className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="mb-3 flex items-center gap-2">
                        <h3 className="font-display text-[15px] font-bold text-[var(--text-1)]">
                          {enrollment.benefitPlanName}
                        </h3>
                        <Badge variant={enrollment.status === 'ACTIVE' ? 'success' : 'default'} size="sm">
                          {enrollment.status === 'ACTIVE' ? 'Active' : enrollment.status}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-x-6 gap-y-3 md:grid-cols-4">
                        <div>
                          <div className="text-aura-micro">Coverage level</div>
                          <p className="mt-0.5 text-[13px] font-semibold text-[var(--text-1)]">
                            {coverageLevelLabels[enrollment.coverageLevel]}
                          </p>
                        </div>
                        <div>
                          <div className="text-aura-micro">Effective date</div>
                          <p className="tnum mt-0.5 text-[13px] font-semibold text-[var(--text-1)]">
                            {formatDate(enrollment.effectiveDate)}
                          </p>
                        </div>
                        <div>
                          <div className="text-aura-micro">Monthly premium</div>
                          <p className="tnum mt-0.5 text-[13px] font-semibold text-[var(--text-1)]">
                            {formatINR(enrollment.employeeContribution)}
                          </p>
                        </div>
                        <div>
                          <div className="text-aura-micro">Coverage</div>
                          <p className="tnum mt-0.5 text-[13px] font-semibold text-[var(--text-1)]">
                            {formatINR(enrollment.currentCoverage)}
                          </p>
                        </div>
                      </div>
                      {enrollment.dependentCount > 0 && (
                        <div className="mt-3 flex items-center gap-2 text-[13px] text-[var(--text-2)]">
                          <UserPlus className="h-4 w-4 text-[var(--text-3)]"/>
                          <span className="tnum">{enrollment.dependentCount}</span> dependent(s) covered
                        </div>
                      )}
                    </div>
                    {enrollment.status === 'ACTIVE' && (
                        <PermissionGate permission={Permissions.BENEFIT_MANAGE}>
                          <Button
                            size="sm"
                            variant="soft-danger"
                            leftIcon={<XCircle className="h-4 w-4"/>}
                            onClick={() => handleTerminateStart(enrollment.id)}
                          >
                            Terminate
                          </Button>
                        </PermissionGate>
                      )}
                  </div>
                </Card>
              ))
            )}
          </div>
        )}

        {activeTab === 'claims' && (
          <div className="space-y-4">
            {claims.length === 0 ? (
              <Card>
                <EmptyState
                  icon={<Receipt className="h-12 w-12"/>}
                  title="No claims yet"
                  description="You haven't submitted any benefit claims yet. Submit a claim against one of your active enrollments."
                  actionLabel="Submit claim"
                  onAction={handleOpenClaimModal}
                />
              </Card>
            ) : (
              claims.map((claim) => {
                const claimStatusVariant: 'success' | 'danger' | 'warning' | 'info' =
                  claim.status === 'APPROVED' || claim.status === 'PAID'
                    ? 'success'
                    : claim.status === 'REJECTED'
                      ? 'danger'
                      : claim.status === 'UNDER_REVIEW' || claim.status === 'APPEALED'
                        ? 'warning'
                        : 'info';
                return (
                  <Card key={claim.id} hover className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="mb-2 flex items-center gap-2">
                          <h3 className="tnum font-display text-[15px] font-bold text-[var(--text-1)]">
                            {claim.claimNumber}
                          </h3>
                          <Badge variant={claimStatusVariant} size="sm">{claim.status}</Badge>
                        </div>
                        <p className="mb-3 text-[13px] text-[var(--text-2)]">{claim.description}</p>
                        <div className="grid grid-cols-2 gap-x-6 gap-y-3 md:grid-cols-4">
                          <div>
                            <div className="text-aura-micro">Type</div>
                            <p className="mt-0.5 text-[13px] font-semibold text-[var(--text-1)]">{claim.claimType}</p>
                          </div>
                          <div>
                            <div className="text-aura-micro">Service date</div>
                            <p className="tnum mt-0.5 text-[13px] font-semibold text-[var(--text-1)]">
                              {formatDate(claim.serviceDate)}
                            </p>
                          </div>
                          <div>
                            <div className="text-aura-micro">Claim amount</div>
                            <p className="tnum mt-0.5 text-[13px] font-semibold text-[var(--text-1)]">
                              {formatINR(claim.claimAmount)}
                            </p>
                          </div>
                          {claim.approvedAmount !== undefined && (
                            <div>
                              <div className="text-aura-micro">Approved amount</div>
                              <p className="tnum mt-0.5 text-[13px] font-semibold text-[var(--ok-fg)]">
                                {formatINR(claim.approvedAmount)}
                              </p>
                            </div>
                          )}
                        </div>
                        {claim.rejectionReason && (
                          <div className="mt-3 text-[13px] text-[var(--err-fg)]">
                            <span className="font-semibold">Rejection reason:</span> {claim.rejectionReason}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-aura-stat tnum text-[var(--text-1)]">
                          {formatINR(claim.claimAmount)}
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        )}

        {/* Open Enrollment Banner — Aura accent-soft surface */}
        <Card className="border-[var(--border)] bg-[var(--accent-soft)]">
          <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-display text-base font-bold text-[var(--accent-text)]">
                Open enrollment period
              </h3>
              <p className="mt-1 text-sm text-[var(--text-2)]">
                March 1 – March 31,{' '}
                <span className="tnum">
                  {new Date().getMonth() < 2 ? new Date().getFullYear() : new Date().getFullYear() + 1}
                </span>
                . Review and update your benefits selections.
              </p>
            </div>
            <Button variant="secondary" onClick={() => setActiveTab('plans')}>
              Review benefits
            </Button>
          </CardContent>
        </Card>

        {/* Enrollment Modal */}
        <Modal isOpen={isEnrollModalOpen} onClose={() => {
          setIsEnrollModalOpen(false);
          resetEnrollmentForm();
        }} size="lg">
          <ModalHeader>
            <div className="flex items-center gap-4">
              {selectedBenefit && (
                <>
                  <div
                    className="inline-grid h-11 w-11 place-items-center rounded-aura-lg"
                    style={{
                      background: `color-mix(in srgb, ${getBenefitChartColor(selectedBenefit.type)} 14%, transparent)`,
                      color: getBenefitChartColor(selectedBenefit.type),
                    }}
                  >
                    {getBenefitIcon(selectedBenefit.type)}
                  </div>
                  <div>
                    <h2 className="font-display text-lg font-bold text-[var(--text-1)]">
                      Enroll in {selectedBenefit.name}
                    </h2>
                    <p className="text-sm text-[var(--text-3)]">{selectedBenefit.provider}</p>
                  </div>
                </>
              )}
            </div>
          </ModalHeader>
          <ModalBody>
            {selectedBenefit && (
              <div className="space-y-6">
                <p className="text-[var(--text-secondary)]">
                  {selectedBenefit.description}
                </p>

                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-aura-lg border border-[var(--border)] bg-[var(--surface-sunken)] p-4">
                    <p className="text-aura-micro">Monthly premium</p>
                    <p className="tnum mt-1 text-2xl font-bold text-[var(--text-1)]">
                      {formatINR(selectedBenefit.monthlyPremium)}
                    </p>
                  </div>
                  <div className="rounded-aura-lg border border-[var(--border)] bg-[var(--surface-sunken)] p-4">
                    <p className="text-aura-micro">Coverage amount</p>
                    <p className="tnum mt-1 text-2xl font-bold text-[var(--text-1)]">
                      {formatINR(selectedBenefit.coverage)}
                    </p>
                  </div>
                </div>

                <form onSubmit={handleSubmitEnrollment(onEnrollSubmit)}>
                  <div className="border-t border-[var(--border-main)] pt-4 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                        <User className="h-4 w-4 inline-block mr-1"/>
                        Coverage Level
                      </label>
                      <select
                        aria-label="Coverage Level"
                        className="w-full input-aura rounded-lg p-2"
                        {...registerEnrollment('coverageLevel')}
                      >
                        <option value="EMPLOYEE_ONLY">Employee Only</option>
                        <option value="EMPLOYEE_SPOUSE">Employee + Spouse</option>
                        <option value="EMPLOYEE_CHILDREN">Employee + Children</option>
                        <option value="FAMILY">Family</option>
                      </select>
                      {enrollmentErrors.coverageLevel &&
                        <span className="text-danger-500 text-sm">{enrollmentErrors.coverageLevel.message}</span>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                        <Calendar className="h-4 w-4 inline-block mr-1"/>
                        Effective Date
                      </label>
                      <input
                        type="date"
                        className="w-full input-aura rounded-lg p-2"
                        {...registerEnrollment('effectiveDate')}
                      />
                      {enrollmentErrors.effectiveDate &&
                        <span className="text-danger-500 text-sm">{enrollmentErrors.effectiveDate.message}</span>}
                    </div>

                    {stats.flexCredits > 0 && (
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="useFlexCredits"
                          className="w-4 h-4"
                          {...registerEnrollment('useFlexCredits')}
                        />
                        <label htmlFor="useFlexCredits" className="text-body-secondary">
                          Use flex credits ({formatINR(stats.flexCredits)} available)
                        </label>
                      </div>
                    )}
                  </div>
                  <div className="mt-6 flex justify-end gap-2 border-t border-[var(--border-main)] pt-4">
                    <Button type="button" variant="outline" onClick={() => {
                      setIsEnrollModalOpen(false);
                      resetEnrollmentForm();
                    }}>
                      Cancel
                    </Button>
                    <Button type="submit" isLoading={isEnrollingForm} loadingText="Enrolling…">
                      Confirm enrollment
                    </Button>
                  </div>
                </form>
              </div>
            )}
          </ModalBody>
        </Modal>

        {/* Claim Modal */}
        <Modal isOpen={isClaimModalOpen} onClose={() => {
          setIsClaimModalOpen(false);
          resetClaimForm();
        }} size="lg">
          <ModalHeader>
            <h2 className="text-xl font-semibold text-[var(--text-primary)]">
              Submit Benefit Claim
            </h2>
          </ModalHeader>
          <ModalBody>
            <form onSubmit={handleSubmitClaim(onClaimSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Benefit Plan
                </label>
                <select
                  aria-label="Benefit plan"
                  className="w-full input-aura rounded-lg p-2"
                  {...registerClaim('enrollmentId')}
                >
                  <option value="">Select a plan</option>
                  {enrollments.filter(e => e.status === 'ACTIVE').map((enrollment) => (
                    <option key={enrollment.id} value={enrollment.id}>
                      {enrollment.benefitPlanName}
                    </option>
                  ))}
                </select>
                {claimErrors.enrollmentId &&
                  <span className="text-danger-500 text-sm">{claimErrors.enrollmentId.message}</span>}
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Claim Type
                </label>
                <select
                  aria-label="Claim type"
                  className="w-full input-aura rounded-lg p-2"
                  {...registerClaim('claimType')}
                >
                  <option value="MEDICAL">Medical</option>
                  <option value="DENTAL">Dental</option>
                  <option value="VISION">Vision</option>
                  <option value="PRESCRIPTION">Prescription</option>
                  <option value="OTHER">Other</option>
                </select>
                {claimErrors.claimType &&
                  <span className="text-danger-500 text-sm">{claimErrors.claimType.message}</span>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                    Service Date
                  </label>
                  <input
                    type="date"
                    className="w-full input-aura rounded-lg p-2"
                    {...registerClaim('serviceDate')}
                  />
                  {claimErrors.serviceDate &&
                    <span className="text-danger-500 text-sm">{claimErrors.serviceDate.message}</span>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                    Claim Amount (INR)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="w-full input-aura rounded-lg p-2"
                    placeholder="0.00"
                    {...registerClaim('claimAmount')}
                  />
                  {claimErrors.claimAmount &&
                    <span className="text-danger-500 text-sm">{claimErrors.claimAmount.message}</span>}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Service Provider
                </label>
                <input
                  type="text"
                  className="w-full input-aura rounded-lg p-2"
                  placeholder="Doctor/Hospital name"
                  {...registerClaim('serviceProvider')}
                />
                {claimErrors.serviceProvider &&
                  <span className="text-danger-500 text-sm">{claimErrors.serviceProvider.message}</span>}
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Description
                </label>
                <textarea
                  className="w-full input-aura rounded-lg p-2"
                  rows={3}
                  placeholder="Describe the service/treatment..."
                  {...registerClaim('description')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Receipt URL (Optional)
                </label>
                <input
                  type="url"
                  className="w-full input-aura rounded-lg p-2"
                  placeholder="https://..."
                  {...registerClaim('receiptUrl')}
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-[var(--border-main)]">
                <Button type="button" variant="outline" onClick={() => {
                  setIsClaimModalOpen(false);
                  resetClaimForm();
                }}>
                  Cancel
                </Button>
                <Button type="submit" isLoading={isSubmittingClaim} loadingText="Submitting…">
                  Submit claim
                </Button>
              </div>
            </form>
          </ModalBody>
        </Modal>

        {/* Terminate Enrollment Confirmation Dialog */}
        <ConfirmDialog
          isOpen={showTerminateConfirm}
          onClose={() => {
            setShowTerminateConfirm(false);
            setSelectedEnrollmentForTerminate(null);
          }}
          onConfirm={handleTerminateConfirm}
          title="Terminate Enrollment"
          message="Are you sure you want to terminate this benefit enrollment? This action will end your coverage under this plan."
          confirmText="Terminate"
          cancelText="Cancel"
          type="danger"
          loading={terminateMutation.isPending}
        />
      </div>
    </AppLayout>
  );
}
