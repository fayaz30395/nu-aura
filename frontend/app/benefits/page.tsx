'use client';

import React, { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Gift,
  Heart,
  Shield,
  Stethoscope,
  Building,
  DollarSign,
  Users,
  CheckCircle,
  XCircle,
  FileText,
  Plus,
  AlertCircle,
  Loader2,
  CreditCard,
  Receipt,
  Calendar,
  User,
  UserPlus,
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/lib/hooks/useAuth';
import { Permissions } from '@/lib/hooks/usePermissions';
import { PermissionGate } from '@/components/auth/PermissionGate';
import {
  Card,
  CardContent,
  Button,
  Modal,
  ModalHeader,
  ModalBody,
  EmptyState,
  ConfirmDialog,
} from '@/components/ui';
import {
  BenefitEnrollment,
  BenefitClaim,
  CoverageLevel,
  ClaimRequest,
} from '@/lib/types/benefits';
import {
  useActiveBenefitPlans,
  useActiveEnrollments,
  useEmployeeBenefitEnrollments,
  useEnrollEmployee,
  useTerminateEnrollment,
  useSubmitBenefitClaim,
} from '@/lib/hooks/queries';
import { createLogger } from '@/lib/utils/logger';

const log = createLogger('BenefitsPage');

const enrollmentFormSchema = z.object({
  coverageLevel: z.string().min(1, 'Coverage level required'),
  effectiveDate: z.string().min(1, 'Effective date required'),
  useFlexCredits: z.boolean().default(false),
});

const claimFormSchema = z.object({
  enrollmentId: z.string().min(1, 'Enrollment required'),
  claimType: z.string().min(1, 'Claim type required'),
  claimAmount: z.number({ coerce: true }).positive('Amount must be positive'),
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
      return <Stethoscope className="h-6 w-6" />;
    case 'DENTAL':
      return <Heart className="h-6 w-6" />;
    case 'LIFE':
      return <Shield className="h-6 w-6" />;
    case 'RETIREMENT':
      return <Building className="h-6 w-6" />;
    case 'FSA':
    case 'HSA':
      return <DollarSign className="h-6 w-6" />;
    case 'VISION':
      return <Users className="h-6 w-6" />;
    default:
      return <Gift className="h-6 w-6" />;
  }
};

const getBenefitColor = (type: string) => {
  switch (type) {
    case 'HEALTH':
      return 'bg-accent-100 text-accent-600 dark:bg-accent-900 dark:text-accent-400';
    case 'DENTAL':
      return 'bg-accent-100 text-accent-600 dark:bg-accent-900 dark:text-accent-400';
    case 'LIFE':
      return 'bg-accent-300 text-accent-700 dark:bg-accent-900 dark:text-accent-600';
    case 'RETIREMENT':
      return 'bg-success-100 text-success-600 dark:bg-success-900 dark:text-success-400';
    case 'FSA':
    case 'HSA':
      return 'bg-warning-100 text-warning-600 dark:bg-warning-900 dark:text-warning-400';
    case 'VISION':
      return 'bg-accent-100 text-accent-600 dark:bg-accent-900 dark:text-accent-400';
    default:
      return 'bg-[var(--bg-surface)] text-[var(--text-secondary)]';
  }
};

const coverageLevelLabels: Record<CoverageLevel, string> = {
  'EMPLOYEE_ONLY': 'Employee Only',
  'EMPLOYEE_SPOUSE': 'Employee + Spouse',
  'EMPLOYEE_CHILDREN': 'Employee + Children',
  'FAMILY': 'Family',
};

const _claimStatusColors: Record<string, string> = {
  'SUBMITTED': 'bg-accent-100 text-accent-800 dark:bg-accent-900/50 dark:text-accent-300',
  'UNDER_REVIEW': 'bg-warning-100 text-warning-800 dark:bg-warning-900/50 dark:text-warning-300',
  'APPROVED': 'bg-success-100 text-success-800 dark:bg-success-900/50 dark:text-success-300',
  'REJECTED': 'bg-danger-100 text-danger-800 dark:bg-danger-900/50 dark:text-danger-300',
  'PAID': 'bg-accent-100 text-accent-800 dark:bg-accent-900/50 dark:text-accent-300',
  'APPEALED': 'bg-warning-100 text-warning-800 dark:bg-warning-900/50 dark:text-warning-300',
};

export default function BenefitsPage() {
  const { user, hasHydrated } = useAuth();
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
    formState: { errors: enrollmentErrors, isSubmitting: isEnrollingForm },
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
    formState: { errors: claimErrors, isSubmitting: isSubmittingClaim },
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
      showNotification((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to enroll', 'error');
    }
  };

  const handleTerminateStart = (enrollmentId: string) => {
    setSelectedEnrollmentForTerminate(enrollmentId);
    setShowTerminateConfirm(true);
  };

  const handleTerminateConfirm = async () => {
    if (!selectedEnrollmentForTerminate) return;

    try {
      await terminateMutation.mutateAsync({ enrollmentId: selectedEnrollmentForTerminate, reason: 'Employee requested termination' });
      showNotification('Enrollment terminated successfully', 'success');
      setShowTerminateConfirm(false);
      setSelectedEnrollmentForTerminate(null);
    } catch (err: unknown) {
      log.error('Error terminating:', err);
      showNotification((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to terminate enrollment', 'error');
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
        description: data.description,
        receiptUrl: data.receiptUrl || undefined,
      };

      await submitClaimMutation.mutateAsync(request);
      setIsClaimModalOpen(false);
      resetClaimForm();
      showNotification('Claim submitted successfully!', 'success');
      setActiveTab('claims');
    } catch (err: unknown) {
      log.error('Error submitting claim:', err);
      showNotification((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to submit claim', 'error');
    }
  };

  const breadcrumbs = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Benefits' },
  ];

  if (!hasHydrated || (plansQuery.isLoading && user?.employeeId)) {
    return (
      <AppLayout breadcrumbs={breadcrumbs} activeMenuItem="benefits">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-accent-500" />
          <span className="ml-2 text-[var(--text-secondary)]">Loading benefits...</span>
        </div>
      </AppLayout>
    );
  }

  // SuperAdmin (no employeeId) - show message
  if (!user?.employeeId) {
    return (
      <AppLayout breadcrumbs={breadcrumbs} activeMenuItem="benefits">
        <EmptyState
          icon={<Gift className="h-12 w-12" />}
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
          <div className="p-4 bg-danger-100 dark:bg-danger-900/30 border border-danger-300 dark:border-danger-700 rounded-lg flex items-center gap-2 text-danger-800 dark:text-danger-300">
            <AlertCircle className="w-5 h-5" />
            {error}
            <Button size="sm" variant="outline" onClick={() => plansQuery.refetch()} className="ml-auto">
              Retry
            </Button>
          </div>
        )}
        {success && (
          <div className="p-4 bg-success-100 dark:bg-success-900/30 border border-success-300 dark:border-success-700 rounded-lg flex items-center gap-2 text-success-800 dark:text-success-300">
            <CheckCircle className="w-5 h-5" />
            {success}
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] skeuo-emboss">
              Benefits Management
            </h1>
            <p className="text-[var(--text-secondary)] skeuo-deboss">
              View and manage your employee benefits enrollment
            </p>
          </div>
          <PermissionGate permission={Permissions.BENEFIT_CLAIM_SUBMIT}>
            <Button onClick={handleOpenClaimModal}>
              <Plus className="h-4 w-4 mr-1" />
              Submit Claim
            </Button>
          </PermissionGate>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Card className="skeuo-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-success-100 p-4 dark:bg-success-900">
                  <CheckCircle className="h-6 w-6 text-success-600 dark:text-success-400" />
                </div>
                <div>
                  <p className="text-sm text-[var(--text-secondary)] skeuo-deboss">Enrolled Plans</p>
                  <p className="text-2xl font-bold text-[var(--text-primary)] skeuo-emboss">{stats.totalEnrolled}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="skeuo-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-accent-100 p-4 dark:bg-accent-900">
                  <DollarSign className="h-6 w-6 text-accent-600 dark:text-accent-400" />
                </div>
                <div>
                  <p className="text-sm text-[var(--text-secondary)] skeuo-deboss">Monthly Premium</p>
                  <p className="text-2xl font-bold text-[var(--text-primary)] skeuo-emboss">${stats.monthlyPremium.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="skeuo-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-accent-300 p-4 dark:bg-accent-900">
                  <Gift className="h-6 w-6 text-accent-700 dark:text-accent-600" />
                </div>
                <div>
                  <p className="text-sm text-[var(--text-secondary)] skeuo-deboss">Available Plans</p>
                  <p className="text-2xl font-bold text-[var(--text-primary)] skeuo-emboss">{stats.availablePlans}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="skeuo-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-warning-100 p-4 dark:bg-warning-900">
                  <Shield className="h-6 w-6 text-warning-600 dark:text-warning-400" />
                </div>
                <div>
                  <p className="text-sm text-[var(--text-secondary)] skeuo-deboss">Total Coverage</p>
                  <p className="text-2xl font-bold text-[var(--text-primary)] skeuo-emboss">
                    ${stats.totalCoverage.toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="skeuo-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-accent-100 p-4 dark:bg-accent-900">
                  <CreditCard className="h-6 w-6 text-accent-600 dark:text-accent-400" />
                </div>
                <div>
                  <p className="text-sm text-[var(--text-secondary)] skeuo-deboss">Flex Credits</p>
                  <p className="text-2xl font-bold text-[var(--text-primary)] skeuo-emboss">
                    ${stats.flexCredits.toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <div className="bg-[var(--bg-secondary)] rounded-lg shadow-sm">
          <div className="flex border-b border-[var(--border-main)]">
            <button
              onClick={() => setActiveTab('plans')}
              className={`px-6 py-4 font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2 rounded-t-md ${activeTab === 'plans'
                  ? 'text-accent-700 dark:text-accent-400 border-b-2 border-accent-500'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] dark:hover:text-[var(--text-primary)]'
                }`}
            >
              <Gift className="h-4 w-4 inline-block mr-2" />
              Benefit Plans
            </button>
            <button
              onClick={() => setActiveTab('enrollments')}
              className={`px-6 py-4 font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2 rounded-t-md ${activeTab === 'enrollments'
                  ? 'text-accent-700 dark:text-accent-400 border-b-2 border-accent-500'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] dark:hover:text-[var(--text-primary)]'
                }`}
            >
              <CheckCircle className="h-4 w-4 inline-block mr-2" />
              My Enrollments
            </button>
            <button
              onClick={() => setActiveTab('claims')}
              className={`px-6 py-4 font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2 rounded-t-md ${activeTab === 'claims'
                  ? 'text-accent-700 dark:text-accent-400 border-b-2 border-accent-500'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] dark:hover:text-[var(--text-primary)]'
                }`}
            >
              <Receipt className="h-4 w-4 inline-block mr-2" />
              Claims
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'plans' && (
          <div className="space-y-6">
            {/* Enrolled Benefits */}
            {benefits.filter((b) => b.isEnrolled).length > 0 && (
              <div>
                <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-4">
                  My Enrolled Benefits
                </h2>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {benefits.filter((b) => b.isEnrolled).map((benefit) => (
                    <Card key={benefit.id} className="card-interactive">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-4">
                          <div className={`rounded-lg p-4 ${getBenefitColor(benefit.type)}`}>
                            {getBenefitIcon(benefit.type)}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-start justify-between">
                              <h3 className="font-semibold text-[var(--text-primary)]">
                                {benefit.name}
                              </h3>
                              <span className="badge-status status-success">Enrolled</span>
                            </div>
                            <p className="text-sm text-[var(--text-secondary)] mt-1 line-clamp-2">
                              {benefit.description}
                            </p>
                            <div className="flex items-center gap-4 mt-3 text-sm text-[var(--text-muted)]">
                              <span className="flex items-center gap-1">
                                <DollarSign className="h-4 w-4" />
                                ${benefit.monthlyPremium}/mo
                              </span>
                              {benefit.enrollment && (
                                <span className="flex items-center gap-1">
                                  <Users className="h-4 w-4" />
                                  {coverageLevelLabels[benefit.enrollment.coverageLevel]}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Available Benefits */}
            {benefits.filter((b) => !b.isEnrolled).length > 0 && (
              <div>
                <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-4">
                  Available Benefits
                </h2>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {benefits.filter((b) => !b.isEnrolled).map((benefit) => (
                    <Card key={benefit.id} className="card-interactive border-dashed">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-4">
                          <div className={`rounded-lg p-4 ${getBenefitColor(benefit.type)} opacity-60`}>
                            {getBenefitIcon(benefit.type)}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-start justify-between">
                              <h3 className="font-semibold text-[var(--text-primary)]">
                                {benefit.name}
                              </h3>
                              <span className="badge-status status-info">Available</span>
                            </div>
                            <p className="text-sm text-[var(--text-secondary)] mt-1 line-clamp-2">
                              {benefit.description}
                            </p>
                            <div className="flex items-center gap-4 mt-3 text-sm text-[var(--text-muted)]">
                              <span className="flex items-center gap-1">
                                <DollarSign className="h-4 w-4" />
                                ${benefit.monthlyPremium}/mo
                              </span>
                              <span className="flex items-center gap-1">
                                <Building className="h-4 w-4" />
                                {benefit.provider}
                              </span>
                            </div>
                            <PermissionGate permission={Permissions.BENEFIT_ENROLL}>
                              <Button
                                size="sm"
                                className="mt-3"
                                onClick={() => handleOpenEnrollModal(benefit)}
                              >
                                <Plus className="h-4 w-4 mr-1" />
                                Enroll
                              </Button>
                            </PermissionGate>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {benefits.length === 0 && (
              <Card>
                <CardContent className="p-8 text-center">
                  <Gift className="h-12 w-12 mx-auto text-[var(--text-muted)] mb-4" />
                  <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
                    No Benefit Plans Available
                  </h3>
                  <p className="text-[var(--text-secondary)]">
                    There are currently no benefit plans available for enrollment.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {activeTab === 'enrollments' && (
          <div className="space-y-4">
            {enrollments.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <FileText className="h-12 w-12 mx-auto text-[var(--text-muted)] mb-4" />
                  <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
                    No Enrollments Yet
                  </h3>
                  <p className="text-[var(--text-secondary)]">
                    You haven&apos;t enrolled in any benefit plans yet.
                  </p>
                  <Button className="mt-4" onClick={() => setActiveTab('plans')}>
                    Browse Plans
                  </Button>
                </CardContent>
              </Card>
            ) : (
              enrollments.map((enrollment) => (
                <Card key={enrollment.id} className="card-aura">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-4 mb-2">
                          <h3 className="font-semibold text-lg">{enrollment.benefitPlanName}</h3>
                          <span className={`badge-status ${enrollment.status === 'ACTIVE' ? 'status-success' : 'status-neutral'}`}>
                            {enrollment.status}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-[var(--text-secondary)]">Coverage Level:</span>
                            <p className="font-medium">{coverageLevelLabels[enrollment.coverageLevel]}</p>
                          </div>
                          <div>
                            <span className="text-[var(--text-secondary)]">Effective Date:</span>
                            <p className="font-medium">{new Date(enrollment.effectiveDate).toLocaleDateString()}</p>
                          </div>
                          <div>
                            <span className="text-[var(--text-secondary)]">Monthly Premium:</span>
                            <p className="font-medium">${enrollment.employeeContribution}</p>
                          </div>
                          <div>
                            <span className="text-[var(--text-secondary)]">Coverage:</span>
                            <p className="font-medium">${enrollment.currentCoverage.toLocaleString()}</p>
                          </div>
                        </div>
                        {enrollment.dependentCount > 0 && (
                          <div className="mt-2 flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                            <UserPlus className="h-4 w-4" />
                            {enrollment.dependentCount} dependent(s) covered
                          </div>
                        )}
                      </div>
                      {enrollment.status === 'ACTIVE' && (
                        <PermissionGate permission={Permissions.BENEFIT_MANAGE}>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-danger-600 hover:bg-danger-50 dark:hover:bg-danger-900/20"
                            onClick={() => handleTerminateStart(enrollment.id)}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Terminate
                          </Button>
                        </PermissionGate>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}

        {activeTab === 'claims' && (
          <div className="space-y-4">
            {claims.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Receipt className="h-12 w-12 mx-auto text-[var(--text-muted)] mb-4" />
                  <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
                    No Claims Yet
                  </h3>
                  <p className="text-[var(--text-secondary)]">
                    You haven&apos;t submitted any benefit claims yet.
                  </p>
                  <Button className="mt-4" onClick={handleOpenClaimModal}>
                    <Plus className="h-4 w-4 mr-1" />
                    Submit Claim
                  </Button>
                </CardContent>
              </Card>
            ) : (
              claims.map((claim) => (
                <Card key={claim.id} className="card-aura">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-4 mb-2">
                          <h3 className="font-semibold text-lg">{claim.claimNumber}</h3>
                          <span className={`badge-status ${claim.status === 'APPROVED' || claim.status === 'PAID' ? 'status-success' : claim.status === 'REJECTED' ? 'status-danger' : claim.status === 'UNDER_REVIEW' || claim.status === 'APPEALED' ? 'status-warning' : 'status-info'}`}>
                            {claim.status}
                          </span>
                        </div>
                        <p className="text-[var(--text-secondary)] mb-2">{claim.description}</p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-[var(--text-secondary)]">Type:</span>
                            <p className="font-medium">{claim.claimType}</p>
                          </div>
                          <div>
                            <span className="text-[var(--text-secondary)]">Service Date:</span>
                            <p className="font-medium">{new Date(claim.serviceDate).toLocaleDateString()}</p>
                          </div>
                          <div>
                            <span className="text-[var(--text-secondary)]">Claim Amount:</span>
                            <p className="font-medium">${claim.claimAmount.toLocaleString()}</p>
                          </div>
                          {claim.approvedAmount !== undefined && (
                            <div>
                              <span className="text-[var(--text-secondary)]">Approved Amount:</span>
                              <p className="font-medium text-success-600">${claim.approvedAmount.toLocaleString()}</p>
                            </div>
                          )}
                        </div>
                        {claim.rejectionReason && (
                          <div className="mt-2 text-sm text-danger-600">
                            <span className="font-medium">Rejection Reason:</span> {claim.rejectionReason}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-[var(--text-primary)] skeuo-emboss">
                          ${claim.claimAmount.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}

        {/* Open Enrollment Banner */}
        <Card className="bg-gradient-to-r from-accent-500 to-accent-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="text-white">
                <h3 className="text-base font-semibold">Open Enrollment Period</h3>
                <p className="mt-1 opacity-90">
                  November 1 - November 30, 2025. Review and update your benefits selections.
                </p>
              </div>
              <Button variant="secondary" onClick={() => setActiveTab('plans')}>
                Review Benefits
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Enrollment Modal */}
        <Modal isOpen={isEnrollModalOpen} onClose={() => { setIsEnrollModalOpen(false); resetEnrollmentForm(); }} size="lg">
          <ModalHeader>
            <div className="flex items-center gap-4">
              {selectedBenefit && (
                <>
                  <div className={`rounded-lg p-2 ${getBenefitColor(selectedBenefit.type)}`}>
                    {getBenefitIcon(selectedBenefit.type)}
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-[var(--text-primary)]">
                      Enroll in {selectedBenefit.name}
                    </h2>
                    <p className="text-sm text-[var(--text-muted)]">{selectedBenefit.provider}</p>
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
                  <div className="p-4 skeuo-card rounded-lg">
                    <p className="text-sm text-[var(--text-muted)] skeuo-deboss">Monthly Premium</p>
                    <p className="text-2xl font-bold text-[var(--text-primary)] skeuo-emboss">
                      ${selectedBenefit.monthlyPremium.toLocaleString()}
                    </p>
                  </div>
                  <div className="p-4 skeuo-card rounded-lg">
                    <p className="text-sm text-[var(--text-muted)] skeuo-deboss">Coverage Amount</p>
                    <p className="text-2xl font-bold text-[var(--text-primary)] skeuo-emboss">
                      ${selectedBenefit.coverage.toLocaleString()}
                    </p>
                  </div>
                </div>

                <form onSubmit={handleSubmitEnrollment(onEnrollSubmit)}>
                  <div className="border-t border-[var(--border-main)] pt-4 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                        <User className="h-4 w-4 inline-block mr-1" />
                        Coverage Level
                      </label>
                      <select
                        className="w-full input-aura rounded-lg p-2"
                        {...registerEnrollment('coverageLevel')}
                      >
                        <option value="EMPLOYEE_ONLY">Employee Only</option>
                        <option value="EMPLOYEE_SPOUSE">Employee + Spouse</option>
                        <option value="EMPLOYEE_CHILDREN">Employee + Children</option>
                        <option value="FAMILY">Family</option>
                      </select>
                      {enrollmentErrors.coverageLevel && <span className="text-danger-500 text-sm">{enrollmentErrors.coverageLevel.message}</span>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                        <Calendar className="h-4 w-4 inline-block mr-1" />
                        Effective Date
                      </label>
                      <input
                        type="date"
                        className="w-full input-aura rounded-lg p-2"
                        {...registerEnrollment('effectiveDate')}
                      />
                      {enrollmentErrors.effectiveDate && <span className="text-danger-500 text-sm">{enrollmentErrors.effectiveDate.message}</span>}
                    </div>

                    {stats.flexCredits > 0 && (
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="useFlexCredits"
                          className="w-4 h-4"
                          {...registerEnrollment('useFlexCredits')}
                        />
                        <label htmlFor="useFlexCredits" className="text-sm text-[var(--text-secondary)]">
                          Use flex credits (${stats.flexCredits} available)
                        </label>
                      </div>
                    )}
                  </div>
                  <div className="mt-6 flex justify-end gap-2 border-t border-[var(--border-main)] pt-4">
                    <Button type="button" variant="outline" onClick={() => { setIsEnrollModalOpen(false); resetEnrollmentForm(); }}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isEnrollingForm}>
                      {isEnrollingForm ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                          Enrolling...
                        </>
                      ) : (
                        'Confirm Enrollment'
                      )}
                    </Button>
                  </div>
                </form>
              </div>
            )}
          </ModalBody>
        </Modal>

        {/* Claim Modal */}
        <Modal isOpen={isClaimModalOpen} onClose={() => { setIsClaimModalOpen(false); resetClaimForm(); }} size="lg">
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
                {claimErrors.enrollmentId && <span className="text-danger-500 text-sm">{claimErrors.enrollmentId.message}</span>}
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Claim Type
                </label>
                <select
                  className="w-full input-aura rounded-lg p-2"
                  {...registerClaim('claimType')}
                >
                  <option value="MEDICAL">Medical</option>
                  <option value="DENTAL">Dental</option>
                  <option value="VISION">Vision</option>
                  <option value="PRESCRIPTION">Prescription</option>
                  <option value="OTHER">Other</option>
                </select>
                {claimErrors.claimType && <span className="text-danger-500 text-sm">{claimErrors.claimType.message}</span>}
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
                  {claimErrors.serviceDate && <span className="text-danger-500 text-sm">{claimErrors.serviceDate.message}</span>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                    Claim Amount ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="w-full input-aura rounded-lg p-2"
                    placeholder="0.00"
                    {...registerClaim('claimAmount')}
                  />
                  {claimErrors.claimAmount && <span className="text-danger-500 text-sm">{claimErrors.claimAmount.message}</span>}
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
                {claimErrors.serviceProvider && <span className="text-danger-500 text-sm">{claimErrors.serviceProvider.message}</span>}
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
                <Button type="button" variant="outline" onClick={() => { setIsClaimModalOpen(false); resetClaimForm(); }}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmittingClaim}>
                  {isSubmittingClaim ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    'Submit Claim'
                  )}
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
