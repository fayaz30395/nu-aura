'use client';

import React, { useState, useEffect } from 'react';
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
import {
  Card,
  CardContent,
  Button,
  Badge,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  EmptyState,
} from '@/components/ui';
import { benefitsService } from '@/lib/services/benefits.service';
import {
  BenefitPlan,
  BenefitEnrollment,
  BenefitClaim,
  CoverageLevel,
  ClaimRequest,
  EmployeeBenefitsSummary,
} from '@/lib/types/benefits';

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
      return 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400';
    case 'DENTAL':
      return 'bg-pink-100 text-pink-600 dark:bg-pink-900 dark:text-pink-400';
    case 'LIFE':
      return 'bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-400';
    case 'RETIREMENT':
      return 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400';
    case 'FSA':
    case 'HSA':
      return 'bg-amber-100 text-amber-600 dark:bg-amber-900 dark:text-amber-400';
    case 'VISION':
      return 'bg-cyan-100 text-cyan-600 dark:bg-cyan-900 dark:text-cyan-400';
    default:
      return 'bg-gray-100 text-gray-600 dark:bg-gray-900 dark:text-gray-400';
  }
};

const coverageLevelLabels: Record<CoverageLevel, string> = {
  'EMPLOYEE_ONLY': 'Employee Only',
  'EMPLOYEE_SPOUSE': 'Employee + Spouse',
  'EMPLOYEE_CHILDREN': 'Employee + Children',
  'FAMILY': 'Family',
};

const claimStatusColors: Record<string, string> = {
  'SUBMITTED': 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
  'UNDER_REVIEW': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
  'APPROVED': 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
  'REJECTED': 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
  'PAID': 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300',
  'APPEALED': 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300',
};

export default function BenefitsPage() {
  const { user, hasHydrated } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('plans');
  const [benefits, setBenefits] = useState<DisplayBenefit[]>([]);
  const [enrollments, setEnrollments] = useState<BenefitEnrollment[]>([]);
  const [claims, setClaims] = useState<BenefitClaim[]>([]);
  const [summary, setSummary] = useState<EmployeeBenefitsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedBenefit, setSelectedBenefit] = useState<DisplayBenefit | null>(null);
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [submittingClaim, setSubmittingClaim] = useState(false);

  // Enrollment form state
  const [enrollmentForm, setEnrollmentForm] = useState({
    coverageLevel: 'EMPLOYEE_ONLY' as CoverageLevel,
    effectiveDate: new Date().toISOString().split('T')[0],
    useFlexCredits: false,
  });

  // Claim form state
  const [claimForm, setClaimForm] = useState<{
    enrollmentId: string;
    claimType: 'MEDICAL' | 'DENTAL' | 'VISION' | 'PRESCRIPTION' | 'OTHER';
    claimAmount: string;
    serviceDate: string;
    serviceProvider: string;
    description: string;
    receiptUrl: string;
  }>({
    enrollmentId: '',
    claimType: 'MEDICAL',
    claimAmount: '',
    serviceDate: new Date().toISOString().split('T')[0],
    serviceProvider: '',
    description: '',
    receiptUrl: '',
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

  useEffect(() => {
    if (hasHydrated && user?.employeeId) {
      fetchData();
    }
  }, [hasHydrated, user?.employeeId, activeTab]);

  const fetchData = async () => {
    if (!user?.employeeId) return;

    setLoading(true);
    setError(null);
    try {
      if (activeTab === 'plans') {
        const [plans, userEnrollments] = await Promise.all([
          benefitsService.getActivePlans(),
          benefitsService.getActiveEnrollments(user.employeeId).catch(() => [] as BenefitEnrollment[]),
        ]);

        const displayBenefits: DisplayBenefit[] = plans.map((plan) => {
          const enrollment = userEnrollments.find(e => e.benefitPlanId === plan.id);
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

        setBenefits(displayBenefits);
      } else if (activeTab === 'enrollments') {
        const userEnrollments = await benefitsService.getEmployeeEnrollments(user.employeeId);
        setEnrollments(userEnrollments);
      } else if (activeTab === 'claims') {
        const claimsData = await benefitsService.getEmployeeClaims(user.employeeId);
        setClaims(claimsData.content || []);
      }

      // Always fetch summary
      try {
        const summaryData = await benefitsService.getEmployeeBenefitsSummary(user.employeeId);
        setSummary(summaryData);
      } catch (e) {
        console.warn('Failed to fetch benefits summary', e);
      }
    } catch (err: any) {
      console.error('Error fetching data:', err);
      setError(err.response?.data?.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const stats = {
    totalEnrolled: benefits.filter((b) => b.isEnrolled).length,
    monthlyPremium: benefits.filter((b) => b.isEnrolled).reduce((sum, b) => sum + b.monthlyPremium, 0),
    availablePlans: benefits.length,
    totalCoverage: benefits.filter((b) => b.isEnrolled).reduce((sum, b) => sum + b.coverage, 0),
    flexCredits: summary?.flexCreditsAvailable || 0,
  };

  const handleOpenEnrollModal = (benefit: DisplayBenefit) => {
    setSelectedBenefit(benefit);
    setEnrollmentForm({
      coverageLevel: 'EMPLOYEE_ONLY',
      effectiveDate: new Date().toISOString().split('T')[0],
      useFlexCredits: false,
    });
    setIsEnrollModalOpen(true);
  };

  const handleEnroll = async () => {
    if (!selectedBenefit || !user?.employeeId) return;

    setEnrolling(true);
    try {
      await benefitsService.enrollEmployee({
        benefitPlanId: selectedBenefit.id,
        employeeId: user.employeeId,
        coverageLevel: enrollmentForm.coverageLevel,
        effectiveDate: enrollmentForm.effectiveDate,
        useFlexCredits: enrollmentForm.useFlexCredits,
      });

      setIsEnrollModalOpen(false);
      showNotification(`Successfully enrolled in ${selectedBenefit.name}!`, 'success');
      fetchData();
    } catch (err: any) {
      console.error('Error enrolling:', err);
      showNotification(err.response?.data?.message || 'Failed to enroll', 'error');
    } finally {
      setEnrolling(false);
    }
  };

  const handleTerminateEnrollment = async (enrollmentId: string) => {
    if (!confirm('Are you sure you want to terminate this enrollment?')) return;

    try {
      await benefitsService.terminateEnrollment(enrollmentId, 'Employee requested termination');
      showNotification('Enrollment terminated successfully', 'success');
      fetchData();
    } catch (err: any) {
      console.error('Error terminating:', err);
      showNotification(err.response?.data?.message || 'Failed to terminate enrollment', 'error');
    }
  };

  const handleOpenClaimModal = () => {
    if (enrollments.filter(e => e.status === 'ACTIVE').length === 0) {
      showNotification('You need an active enrollment to submit a claim', 'error');
      return;
    }
    setClaimForm({
      enrollmentId: enrollments.find(e => e.status === 'ACTIVE')?.id || '',
      claimType: 'MEDICAL',
      claimAmount: '',
      serviceDate: new Date().toISOString().split('T')[0],
      serviceProvider: '',
      description: '',
      receiptUrl: '',
    });
    setIsClaimModalOpen(true);
  };

  const handleSubmitClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.employeeId) return;

    setSubmittingClaim(true);
    try {
      const request: ClaimRequest = {
        enrollmentId: claimForm.enrollmentId,
        claimType: claimForm.claimType,
        claimAmount: parseFloat(claimForm.claimAmount),
        serviceDate: claimForm.serviceDate,
        serviceProvider: claimForm.serviceProvider,
        description: claimForm.description,
        receiptUrl: claimForm.receiptUrl || undefined,
      };

      await benefitsService.submitClaim(request);
      setIsClaimModalOpen(false);
      showNotification('Claim submitted successfully!', 'success');
      setActiveTab('claims');
      fetchData();
    } catch (err: any) {
      console.error('Error submitting claim:', err);
      showNotification(err.response?.data?.message || 'Failed to submit claim', 'error');
    } finally {
      setSubmittingClaim(false);
    }
  };

  const breadcrumbs = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Benefits' },
  ];

  if (!hasHydrated || (loading && user?.employeeId)) {
    return (
      <AppLayout breadcrumbs={breadcrumbs} activeMenuItem="benefits">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
          <span className="ml-2 text-surface-600 dark:text-surface-400">Loading benefits...</span>
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
          <div className="p-4 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-lg flex items-center gap-2 text-red-800 dark:text-red-300">
            <AlertCircle className="w-5 h-5" />
            {error}
            <Button size="sm" variant="outline" onClick={fetchData} className="ml-auto">
              Retry
            </Button>
          </div>
        )}
        {success && (
          <div className="p-4 bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700 rounded-lg flex items-center gap-2 text-green-800 dark:text-green-300">
            <CheckCircle className="w-5 h-5" />
            {success}
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-surface-900 dark:text-white">
              Benefits Management
            </h1>
            <p className="text-surface-600 dark:text-surface-400">
              View and manage your employee benefits enrollment
            </p>
          </div>
          <Button onClick={handleOpenClaimModal}>
            <Plus className="h-4 w-4 mr-1" />
            Submit Claim
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-green-100 p-3 dark:bg-green-900">
                  <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-surface-600 dark:text-surface-400">Enrolled Plans</p>
                  <p className="text-2xl font-bold text-surface-900 dark:text-white">{stats.totalEnrolled}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-blue-100 p-3 dark:bg-blue-900">
                  <DollarSign className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-surface-600 dark:text-surface-400">Monthly Premium</p>
                  <p className="text-2xl font-bold text-surface-900 dark:text-white">${stats.monthlyPremium.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-purple-100 p-3 dark:bg-purple-900">
                  <Gift className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-sm text-surface-600 dark:text-surface-400">Available Plans</p>
                  <p className="text-2xl font-bold text-surface-900 dark:text-white">{stats.availablePlans}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-amber-100 p-3 dark:bg-amber-900">
                  <Shield className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-sm text-surface-600 dark:text-surface-400">Total Coverage</p>
                  <p className="text-2xl font-bold text-surface-900 dark:text-white">
                    ${stats.totalCoverage.toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-cyan-100 p-3 dark:bg-cyan-900">
                  <CreditCard className="h-6 w-6 text-cyan-600 dark:text-cyan-400" />
                </div>
                <div>
                  <p className="text-sm text-surface-600 dark:text-surface-400">Flex Credits</p>
                  <p className="text-2xl font-bold text-surface-900 dark:text-white">
                    ${stats.flexCredits.toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <div className="bg-surface-50 dark:bg-surface-800 rounded-lg shadow-sm">
          <div className="flex border-b border-surface-200 dark:border-surface-700">
            <button
              onClick={() => setActiveTab('plans')}
              className={`px-6 py-3 font-medium transition-colors ${activeTab === 'plans'
                  ? 'text-primary-600 dark:text-primary-400 border-b-2 border-primary-500'
                  : 'text-surface-600 dark:text-surface-400 hover:text-surface-900 dark:hover:text-surface-100'
                }`}
            >
              <Gift className="h-4 w-4 inline-block mr-2" />
              Benefit Plans
            </button>
            <button
              onClick={() => setActiveTab('enrollments')}
              className={`px-6 py-3 font-medium transition-colors ${activeTab === 'enrollments'
                  ? 'text-primary-600 dark:text-primary-400 border-b-2 border-primary-500'
                  : 'text-surface-600 dark:text-surface-400 hover:text-surface-900 dark:hover:text-surface-100'
                }`}
            >
              <CheckCircle className="h-4 w-4 inline-block mr-2" />
              My Enrollments
            </button>
            <button
              onClick={() => setActiveTab('claims')}
              className={`px-6 py-3 font-medium transition-colors ${activeTab === 'claims'
                  ? 'text-primary-600 dark:text-primary-400 border-b-2 border-primary-500'
                  : 'text-surface-600 dark:text-surface-400 hover:text-surface-900 dark:hover:text-surface-100'
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
                <h2 className="text-lg font-semibold text-surface-900 dark:text-white mb-4">
                  My Enrolled Benefits
                </h2>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {benefits.filter((b) => b.isEnrolled).map((benefit) => (
                    <Card key={benefit.id} className="hover:shadow-lg transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className={`rounded-lg p-3 ${getBenefitColor(benefit.type)}`}>
                            {getBenefitIcon(benefit.type)}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-start justify-between">
                              <h3 className="font-semibold text-surface-900 dark:text-white">
                                {benefit.name}
                              </h3>
                              <Badge variant="success">Enrolled</Badge>
                            </div>
                            <p className="text-sm text-surface-600 dark:text-surface-400 mt-1 line-clamp-2">
                              {benefit.description}
                            </p>
                            <div className="flex items-center gap-4 mt-3 text-sm text-surface-500">
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
                <h2 className="text-lg font-semibold text-surface-900 dark:text-white mb-4">
                  Available Benefits
                </h2>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {benefits.filter((b) => !b.isEnrolled).map((benefit) => (
                    <Card key={benefit.id} className="hover:shadow-lg transition-shadow border-dashed">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className={`rounded-lg p-3 ${getBenefitColor(benefit.type)} opacity-60`}>
                            {getBenefitIcon(benefit.type)}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-start justify-between">
                              <h3 className="font-semibold text-surface-900 dark:text-white">
                                {benefit.name}
                              </h3>
                              <Badge variant="default">Available</Badge>
                            </div>
                            <p className="text-sm text-surface-600 dark:text-surface-400 mt-1 line-clamp-2">
                              {benefit.description}
                            </p>
                            <div className="flex items-center gap-4 mt-3 text-sm text-surface-500">
                              <span className="flex items-center gap-1">
                                <DollarSign className="h-4 w-4" />
                                ${benefit.monthlyPremium}/mo
                              </span>
                              <span className="flex items-center gap-1">
                                <Building className="h-4 w-4" />
                                {benefit.provider}
                              </span>
                            </div>
                            <Button
                              size="sm"
                              className="mt-3"
                              onClick={() => handleOpenEnrollModal(benefit)}
                            >
                              <Plus className="h-4 w-4 mr-1" />
                              Enroll
                            </Button>
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
                  <Gift className="h-12 w-12 mx-auto text-surface-400 mb-4" />
                  <h3 className="text-lg font-semibold text-surface-900 dark:text-white mb-2">
                    No Benefit Plans Available
                  </h3>
                  <p className="text-surface-600 dark:text-surface-400">
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
                  <FileText className="h-12 w-12 mx-auto text-surface-400 mb-4" />
                  <h3 className="text-lg font-semibold text-surface-900 dark:text-white mb-2">
                    No Enrollments Yet
                  </h3>
                  <p className="text-surface-600 dark:text-surface-400">
                    You haven&apos;t enrolled in any benefit plans yet.
                  </p>
                  <Button className="mt-4" onClick={() => setActiveTab('plans')}>
                    Browse Plans
                  </Button>
                </CardContent>
              </Card>
            ) : (
              enrollments.map((enrollment) => (
                <Card key={enrollment.id}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-lg">{enrollment.benefitPlanName}</h3>
                          <Badge variant={enrollment.status === 'ACTIVE' ? 'success' : 'default'}>
                            {enrollment.status}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-surface-600 dark:text-surface-400">Coverage Level:</span>
                            <p className="font-medium">{coverageLevelLabels[enrollment.coverageLevel]}</p>
                          </div>
                          <div>
                            <span className="text-surface-600 dark:text-surface-400">Effective Date:</span>
                            <p className="font-medium">{new Date(enrollment.effectiveDate).toLocaleDateString()}</p>
                          </div>
                          <div>
                            <span className="text-surface-600 dark:text-surface-400">Monthly Premium:</span>
                            <p className="font-medium">${enrollment.employeeContribution}</p>
                          </div>
                          <div>
                            <span className="text-surface-600 dark:text-surface-400">Coverage:</span>
                            <p className="font-medium">${enrollment.currentCoverage.toLocaleString()}</p>
                          </div>
                        </div>
                        {enrollment.dependentCount > 0 && (
                          <div className="mt-2 flex items-center gap-2 text-sm text-surface-600 dark:text-surface-400">
                            <UserPlus className="h-4 w-4" />
                            {enrollment.dependentCount} dependent(s) covered
                          </div>
                        )}
                      </div>
                      {enrollment.status === 'ACTIVE' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                          onClick={() => handleTerminateEnrollment(enrollment.id)}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Terminate
                        </Button>
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
                  <Receipt className="h-12 w-12 mx-auto text-surface-400 mb-4" />
                  <h3 className="text-lg font-semibold text-surface-900 dark:text-white mb-2">
                    No Claims Yet
                  </h3>
                  <p className="text-surface-600 dark:text-surface-400">
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
                <Card key={claim.id}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-lg">{claim.claimNumber}</h3>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${claimStatusColors[claim.status] || ''}`}>
                            {claim.status}
                          </span>
                        </div>
                        <p className="text-surface-600 dark:text-surface-400 mb-2">{claim.description}</p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-surface-600 dark:text-surface-400">Type:</span>
                            <p className="font-medium">{claim.claimType}</p>
                          </div>
                          <div>
                            <span className="text-surface-600 dark:text-surface-400">Service Date:</span>
                            <p className="font-medium">{new Date(claim.serviceDate).toLocaleDateString()}</p>
                          </div>
                          <div>
                            <span className="text-surface-600 dark:text-surface-400">Claim Amount:</span>
                            <p className="font-medium">${claim.claimAmount.toLocaleString()}</p>
                          </div>
                          {claim.approvedAmount !== undefined && (
                            <div>
                              <span className="text-surface-600 dark:text-surface-400">Approved Amount:</span>
                              <p className="font-medium text-green-600">${claim.approvedAmount.toLocaleString()}</p>
                            </div>
                          )}
                        </div>
                        {claim.rejectionReason && (
                          <div className="mt-2 text-sm text-red-600">
                            <span className="font-medium">Rejection Reason:</span> {claim.rejectionReason}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-surface-900 dark:text-surface-50">
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
        <Card className="bg-gradient-to-r from-primary-500 to-primary-600">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="text-white">
                <h3 className="text-xl font-semibold">Open Enrollment Period</h3>
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
        <Modal isOpen={isEnrollModalOpen} onClose={() => setIsEnrollModalOpen(false)} size="lg">
          <ModalHeader>
            <div className="flex items-center gap-3">
              {selectedBenefit && (
                <>
                  <div className={`rounded-lg p-2 ${getBenefitColor(selectedBenefit.type)}`}>
                    {getBenefitIcon(selectedBenefit.type)}
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-surface-900 dark:text-white">
                      Enroll in {selectedBenefit.name}
                    </h2>
                    <p className="text-sm text-surface-500">{selectedBenefit.provider}</p>
                  </div>
                </>
              )}
            </div>
          </ModalHeader>
          <ModalBody>
            {selectedBenefit && (
              <div className="space-y-6">
                <p className="text-surface-600 dark:text-surface-400">
                  {selectedBenefit.description}
                </p>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-surface-50 dark:bg-surface-800 rounded-lg">
                    <p className="text-sm text-surface-500">Monthly Premium</p>
                    <p className="text-2xl font-bold text-surface-900 dark:text-white">
                      ${selectedBenefit.monthlyPremium.toLocaleString()}
                    </p>
                  </div>
                  <div className="p-4 bg-surface-50 dark:bg-surface-800 rounded-lg">
                    <p className="text-sm text-surface-500">Coverage Amount</p>
                    <p className="text-2xl font-bold text-surface-900 dark:text-white">
                      ${selectedBenefit.coverage.toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="border-t border-surface-200 dark:border-surface-700 pt-4 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                      <User className="h-4 w-4 inline-block mr-1" />
                      Coverage Level
                    </label>
                    <select
                      className="w-full bg-white dark:bg-surface-900 text-surface-900 dark:text-surface-100 border border-surface-300 dark:border-surface-600 rounded-lg p-2"
                      value={enrollmentForm.coverageLevel}
                      onChange={(e) => setEnrollmentForm({
                        ...enrollmentForm,
                        coverageLevel: e.target.value as CoverageLevel
                      })}
                    >
                      <option value="EMPLOYEE_ONLY">Employee Only</option>
                      <option value="EMPLOYEE_SPOUSE">Employee + Spouse</option>
                      <option value="EMPLOYEE_CHILDREN">Employee + Children</option>
                      <option value="FAMILY">Family</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                      <Calendar className="h-4 w-4 inline-block mr-1" />
                      Effective Date
                    </label>
                    <input
                      type="date"
                      className="w-full bg-white dark:bg-surface-900 text-surface-900 dark:text-surface-100 border border-surface-300 dark:border-surface-600 rounded-lg p-2"
                      value={enrollmentForm.effectiveDate}
                      onChange={(e) => setEnrollmentForm({
                        ...enrollmentForm,
                        effectiveDate: e.target.value
                      })}
                    />
                  </div>

                  {stats.flexCredits > 0 && (
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="useFlexCredits"
                        checked={enrollmentForm.useFlexCredits}
                        onChange={(e) => setEnrollmentForm({
                          ...enrollmentForm,
                          useFlexCredits: e.target.checked
                        })}
                        className="w-4 h-4"
                      />
                      <label htmlFor="useFlexCredits" className="text-sm text-surface-700 dark:text-surface-300">
                        Use flex credits (${stats.flexCredits} available)
                      </label>
                    </div>
                  )}
                </div>
              </div>
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" onClick={() => setIsEnrollModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEnroll} disabled={enrolling}>
              {enrolling ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  Enrolling...
                </>
              ) : (
                'Confirm Enrollment'
              )}
            </Button>
          </ModalFooter>
        </Modal>

        {/* Claim Modal */}
        <Modal isOpen={isClaimModalOpen} onClose={() => setIsClaimModalOpen(false)} size="lg">
          <ModalHeader>
            <h2 className="text-xl font-semibold text-surface-900 dark:text-white">
              Submit Benefit Claim
            </h2>
          </ModalHeader>
          <ModalBody>
            <form onSubmit={handleSubmitClaim} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                  Benefit Plan
                </label>
                <select
                  className="w-full bg-white dark:bg-surface-900 text-surface-900 dark:text-surface-100 border border-surface-300 dark:border-surface-600 rounded-lg p-2"
                  value={claimForm.enrollmentId}
                  onChange={(e) => setClaimForm({ ...claimForm, enrollmentId: e.target.value })}
                  required
                >
                  <option value="">Select a plan</option>
                  {enrollments.filter(e => e.status === 'ACTIVE').map((enrollment) => (
                    <option key={enrollment.id} value={enrollment.id}>
                      {enrollment.benefitPlanName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                  Claim Type
                </label>
                <select
                  className="w-full bg-white dark:bg-surface-900 text-surface-900 dark:text-surface-100 border border-surface-300 dark:border-surface-600 rounded-lg p-2"
                  value={claimForm.claimType}
                  onChange={(e) => setClaimForm({
                    ...claimForm,
                    claimType: e.target.value as typeof claimForm.claimType
                  })}
                  required
                >
                  <option value="MEDICAL">Medical</option>
                  <option value="DENTAL">Dental</option>
                  <option value="VISION">Vision</option>
                  <option value="PRESCRIPTION">Prescription</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                    Service Date
                  </label>
                  <input
                    type="date"
                    className="w-full bg-white dark:bg-surface-900 text-surface-900 dark:text-surface-100 border border-surface-300 dark:border-surface-600 rounded-lg p-2"
                    value={claimForm.serviceDate}
                    onChange={(e) => setClaimForm({ ...claimForm, serviceDate: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                    Claim Amount ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="w-full bg-white dark:bg-surface-900 text-surface-900 dark:text-surface-100 border border-surface-300 dark:border-surface-600 rounded-lg p-2"
                    value={claimForm.claimAmount}
                    onChange={(e) => setClaimForm({ ...claimForm, claimAmount: e.target.value })}
                    required
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                  Service Provider
                </label>
                <input
                  type="text"
                  className="w-full bg-white dark:bg-surface-900 text-surface-900 dark:text-surface-100 border border-surface-300 dark:border-surface-600 rounded-lg p-2"
                  value={claimForm.serviceProvider}
                  onChange={(e) => setClaimForm({ ...claimForm, serviceProvider: e.target.value })}
                  required
                  placeholder="Doctor/Hospital name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                  Description
                </label>
                <textarea
                  className="w-full bg-white dark:bg-surface-900 text-surface-900 dark:text-surface-100 border border-surface-300 dark:border-surface-600 rounded-lg p-2"
                  rows={3}
                  value={claimForm.description}
                  onChange={(e) => setClaimForm({ ...claimForm, description: e.target.value })}
                  required
                  placeholder="Describe the service/treatment..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                  Receipt URL (Optional)
                </label>
                <input
                  type="url"
                  className="w-full bg-white dark:bg-surface-900 text-surface-900 dark:text-surface-100 border border-surface-300 dark:border-surface-600 rounded-lg p-2"
                  value={claimForm.receiptUrl}
                  onChange={(e) => setClaimForm({ ...claimForm, receiptUrl: e.target.value })}
                  placeholder="https://..."
                />
              </div>
            </form>
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" onClick={() => setIsClaimModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmitClaim} disabled={submittingClaim}>
              {submittingClaim ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Claim'
              )}
            </Button>
          </ModalFooter>
        </Modal>
      </div>
    </AppLayout>
  );
}
