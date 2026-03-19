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
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  Plus,
  AlertCircle,
  Loader2,
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
} from '@/components/ui';
import { benefitsService } from '@/lib/services/benefits.service';
import { BenefitPlan, BenefitEnrollment, PlanType } from '@/lib/types/benefits';

// UI-friendly benefit representation
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

export default function BenefitsPage() {
  const { user } = useAuth();
  const [benefits, setBenefits] = useState<DisplayBenefit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedBenefit, setSelectedBenefit] = useState<DisplayBenefit | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [enrolling, setEnrolling] = useState(false);

  useEffect(() => {
    if (user?.employeeId) {
      fetchBenefits();
    }
  }, [user?.employeeId]);

  const fetchBenefits = async () => {
    setLoading(true);
    setError(null);
    try {
      if (!user?.employeeId) return;

      // Fetch all active plans
      const plans = await benefitsService.getActivePlans();

      // Fetch current user's enrollments
      let enrollments: BenefitEnrollment[] = [];
      try {
        enrollments = await benefitsService.getActiveEnrollments(user.employeeId);
      } catch (e) {
        console.warn('Failed to fetch enrollments or user has none', e);
      }

      // Map plans to display format
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
        };
      });

      setBenefits(displayBenefits);
    } catch (err: any) {
      console.error('Error fetching benefits:', err);
      setError(err.response?.data?.message || 'Failed to load benefits');
      // Fallback to empty array on error
      setBenefits([]);
    } finally {
      setLoading(false);
    }
  };

  // Stats
  const stats = {
    totalEnrolled: benefits.filter((b) => b.isEnrolled).length,
    monthlyPremium: benefits.filter((b) => b.isEnrolled).reduce((sum, b) => sum + b.monthlyPremium, 0),
    availablePlans: benefits.length,
    totalCoverage: benefits.filter((b) => b.isEnrolled).reduce((sum, b) => sum + b.coverage, 0),
  };

  const handleViewDetails = (benefit: DisplayBenefit) => {
    setSelectedBenefit(benefit);
    setIsDetailModalOpen(true);
  };

  const handleEnroll = async (benefitId: string) => {
    setEnrolling(true);
    try {
      if (!user?.employeeId) {
        throw new Error('User not authenticated');
      }

      await benefitsService.enrollEmployee({
        benefitPlanId: benefitId,
        employeeId: user.employeeId,
        coverageLevel: 'EMPLOYEE_ONLY',
        effectiveDate: new Date().toISOString().split('T')[0],
      });

      await fetchBenefits();
      setIsDetailModalOpen(false);
    } catch (err: any) {
      console.error('Error enrolling:', err);
      setError(err.response?.data?.message || 'Failed to enroll');
    } finally {
      setEnrolling(false);
    }
  };

  const breadcrumbs = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Benefits' },
  ];

  if (loading) {
    return (
      <AppLayout breadcrumbs={breadcrumbs} activeMenuItem="benefits">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
          <span className="ml-2 text-surface-600 dark:text-surface-400">Loading benefits...</span>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout breadcrumbs={breadcrumbs} activeMenuItem="benefits">
      <div className="space-y-6">
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
        </div>

        {/* Error Alert */}
        {error && (
          <Card className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                <AlertCircle className="h-5 w-5" />
                <span>{error}</span>
                <Button size="sm" variant="outline" onClick={fetchBenefits} className="ml-auto">
                  Retry
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
        </div>

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
                          <span className="flex items-center gap-1">
                            <Building className="h-4 w-4" />
                            {benefit.provider}
                          </span>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="mt-3"
                          onClick={() => handleViewDetails(benefit)}
                        >
                          View Details
                        </Button>
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
                          onClick={() => handleViewDetails(benefit)}
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

        {/* No Benefits Message */}
        {benefits.length === 0 && !loading && !error && (
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
              <Button variant="secondary">
                Review Benefits
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Benefit Detail Modal */}
        <Modal isOpen={isDetailModalOpen} onClose={() => setIsDetailModalOpen(false)} size="lg">
          <ModalHeader>
            <div className="flex items-center gap-3">
              {selectedBenefit && (
                <>
                  <div className={`rounded-lg p-2 ${getBenefitColor(selectedBenefit.type)}`}>
                    {getBenefitIcon(selectedBenefit.type)}
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-surface-900 dark:text-white">
                      {selectedBenefit.name}
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

                <div className="border-t border-surface-200 dark:border-surface-700 pt-4">
                  <h4 className="font-medium text-surface-900 dark:text-white mb-2">
                    Plan Details
                  </h4>
                  <ul className="space-y-2 text-sm text-surface-600 dark:text-surface-400">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Coverage starts on the first of the month
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Network includes over 1,000 providers
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      24/7 customer support available
                    </li>
                  </ul>
                </div>
              </div>
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" onClick={() => setIsDetailModalOpen(false)}>
              Close
            </Button>
            {selectedBenefit && !selectedBenefit.isEnrolled && (
              <Button
                onClick={() => handleEnroll(selectedBenefit.id)}
                disabled={enrolling}
              >
                {enrolling ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    Enrolling...
                  </>
                ) : (
                  'Enroll in Plan'
                )}
              </Button>
            )}
          </ModalFooter>
        </Modal>
      </div>
    </AppLayout>
  );
}
