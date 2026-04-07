'use client';

import { useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
  useAgency,
  useAgencySubmissions,
  useAgencyPerformance,
} from '@/lib/hooks/queries/useAgency';
import {
  AgencyStatus,
  AgencySubmissionStatus,
  AgencyInvoiceStatus,
} from '@/lib/types/hire/recruitment';
import {
  ArrowLeft,
  Building2,
  Users,
  Mail,
  Phone,
  Globe,
  MapPin,
  Star,
  DollarSign,
  Calendar,
  FileText,
  TrendingUp,
  CheckCircle,
  XCircle,
  Clock,
} from 'lucide-react';

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
    ACTIVE: 'success', INACTIVE: 'default', BLACKLISTED: 'danger', PENDING_APPROVAL: 'warning',
  };
  return map[status];
}

function getSubmissionStatusVariant(status: AgencySubmissionStatus): 'success' | 'warning' | 'danger' | 'info' | 'default' {
  const map: Record<AgencySubmissionStatus, 'success' | 'warning' | 'danger' | 'info' | 'default'> = {
    SUBMITTED: 'info', SCREENING: 'warning', SHORTLISTED: 'warning', INTERVIEW: 'info',
    HIRED: 'success', REJECTED: 'danger', WITHDRAWN: 'default',
  };
  return map[status];
}

function getInvoiceVariant(status: AgencyInvoiceStatus): 'success' | 'warning' | 'danger' | 'default' {
  const map: Record<AgencyInvoiceStatus, 'success' | 'warning' | 'danger' | 'default'> = {
    NOT_APPLICABLE: 'default', PENDING: 'warning', INVOICED: 'info' as 'warning', PAID: 'success',
  };
  return map[status];
}

function formatDate(dateString?: string): string {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

function formatCurrency(amount?: number, currency: string = 'INR'): string {
  if (amount === undefined || amount === null) return '-';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency', currency, maximumFractionDigits: 0,
  }).format(amount);
}

export default function AgencyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const agencyId = params.id as string;

  const agencyQuery = useAgency(agencyId);
  const submissionsQuery = useAgencySubmissions(agencyId, 0, 50);
  const performanceQuery = useAgencyPerformance(agencyId);

  const agency = agencyQuery.data;
  const submissions = useMemo(() => submissionsQuery.data?.content || [], [submissionsQuery.data]);
  const perf = performanceQuery.data;

  if (agencyQuery.isLoading) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </AppLayout>
    );
  }

  if (agencyQuery.isError || !agency) {
    return (
      <AppLayout>
        <PageErrorFallback
          title="Agency Not Found"
          error={new Error('Could not load agency details.')}
          onReset={() => router.push('/recruitment/agencies')}
        />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PermissionGate permission={Permissions.AGENCY_VIEW}>
        <motion.div
          className="space-y-6"
          initial="hidden"
          animate="visible"
          variants={containerVariants}
        >
          {/* Back + Header */}
          <motion.div variants={itemVariants}>
            <button
              onClick={() => router.push('/recruitment/agencies')}
              className="flex items-center gap-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] mb-4 cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Agencies
            </button>
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold text-[var(--text-primary)] skeuo-emboss">
                    {agency.name}
                  </h1>
                  <Badge variant={getStatusVariant(agency.status)} size="sm">
                    {agency.status.replace(/_/g, ' ')}
                  </Badge>
                </div>
                {agency.specializations && (
                  <p className="text-xs text-[var(--text-muted)] mt-1">{agency.specializations}</p>
                )}
              </div>
              <PermissionGate permission={Permissions.AGENCY_UPDATE}>
                <Button
                  variant="outline"
                  onClick={() => router.push(`/recruitment/agencies?edit=${agency.id}`)}
                >
                  Edit Agency
                </Button>
              </PermissionGate>
            </div>
          </motion.div>

          {/* Info + Performance Row */}
          <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Contact Details */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-accent-600 dark:text-accent-400" />
                  Contact Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {agency.contactPerson && (
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                    <span>{agency.contactPerson}</span>
                  </div>
                )}
                {agency.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                    <span>{agency.email}</span>
                  </div>
                )}
                {agency.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                    <span>{agency.phone}</span>
                  </div>
                )}
                {agency.website && (
                  <div className="flex items-center gap-2 text-sm">
                    <Globe className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                    <span className="truncate">{agency.website}</span>
                  </div>
                )}
                {agency.address && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                    <span>{agency.address}</span>
                  </div>
                )}
                {agency.rating && (
                  <div className="flex items-center gap-2 text-sm">
                    <Star className="h-3.5 w-3.5 text-warning-500" />
                    <span>{agency.rating}/5</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Contract & Fee */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-accent-600 dark:text-accent-400" />
                  Contract & Fee
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--text-muted)]">Fee Type</span>
                  <span className="font-medium">{agency.feeType || '-'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--text-muted)]">Fee Amount</span>
                  <span className="font-medium">
                    {agency.feeType === 'PERCENTAGE'
                      ? `${agency.feeAmount}%`
                      : formatCurrency(agency.feeAmount)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--text-muted)]">Contract Start</span>
                  <span>{formatDate(agency.contractStartDate)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--text-muted)]">Contract End</span>
                  <span>{formatDate(agency.contractEndDate)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Performance Metrics */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-accent-600 dark:text-accent-400" />
                  Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                {performanceQuery.isLoading ? (
                  <div className="animate-pulse space-y-2">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="h-4 bg-[var(--bg-secondary)] rounded" />
                    ))}
                  </div>
                ) : perf ? (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-[var(--text-muted)]">Total Submissions</span>
                      <span className="font-medium">{perf.totalSubmissions}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-[var(--text-muted)] flex items-center gap-1">
                        <CheckCircle className="h-3 w-3 text-success-600" />
                        Hired
                      </span>
                      <span className="font-medium text-success-700 dark:text-success-400">{perf.hiredCount}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-[var(--text-muted)] flex items-center gap-1">
                        <XCircle className="h-3 w-3 text-danger-600" />
                        Rejected
                      </span>
                      <span className="font-medium text-danger-700 dark:text-danger-400">{perf.rejectedCount}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-[var(--text-muted)]">Hire Rate</span>
                      <span className="font-medium">{(perf.hireRate * 100).toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-[var(--text-muted)]">Total Fees Paid</span>
                      <span className="font-medium">{formatCurrency(perf.totalFeesPaid)}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-[var(--text-muted)]">No performance data</p>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Notes */}
          {agency.notes && (
            <motion.div variants={itemVariants}>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <FileText className="h-4 w-4 text-accent-600 dark:text-accent-400" />
                    Notes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap">{agency.notes}</p>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Submissions Table */}
          <motion.div variants={itemVariants}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-accent-600 dark:text-accent-400" />
                  Candidate Submissions
                  {submissions.length > 0 && (
                    <Badge variant="default" size="sm">{submissions.length}</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {submissionsQuery.isLoading ? (
                  <div className="animate-pulse space-y-2">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="h-12 bg-[var(--bg-secondary)] rounded" />
                    ))}
                  </div>
                ) : submissions.length === 0 ? (
                  <EmptyState
                    icon={<Users className="h-8 w-8" />}
                    title="No Submissions Yet"
                    description="This agency hasn't submitted any candidates"
                  />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[var(--border-main)]">
                          <th className="px-4 py-2 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">Candidate</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">Job</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">Status</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">Invoice</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">Fee</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">Submitted</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border-subtle)]">
                        {submissions.map((sub) => (
                          <tr key={sub.id} className="hover:bg-[var(--bg-secondary)]/50">
                            <td className="px-4 py-2 font-medium text-[var(--text-primary)]">
                              {sub.candidateName || sub.candidateId}
                            </td>
                            <td className="px-4 py-2 text-[var(--text-secondary)]">
                              {sub.jobTitle || sub.jobOpeningId}
                            </td>
                            <td className="px-4 py-2">
                              <Badge variant={getSubmissionStatusVariant(sub.status)} size="sm">
                                {sub.status}
                              </Badge>
                            </td>
                            <td className="px-4 py-2">
                              <Badge variant={getInvoiceVariant(sub.invoiceStatus)} size="sm">
                                {sub.invoiceStatus.replace(/_/g, ' ')}
                              </Badge>
                            </td>
                            <td className="px-4 py-2 text-[var(--text-secondary)]">
                              {formatCurrency(sub.feeAgreed, sub.feeCurrency)}
                            </td>
                            <td className="px-4 py-2 text-[var(--text-muted)]">
                              {formatDate(sub.submittedAt)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </PermissionGate>
    </AppLayout>
  );
}
