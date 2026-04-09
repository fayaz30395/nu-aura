'use client';

import React, {useEffect, useState} from 'react';
import {useRouter} from 'next/navigation';
import {
  AlertCircle,
  ArrowUpRight,
  CheckCircle,
  ChevronRight,
  Clock,
  DollarSign,
  Eye,
  FileText,
  Filter,
  PieChart,
  Play,
  Plus,
  Search,
  TrendingUp,
  Users,
} from 'lucide-react';
import {AppLayout} from '@/components/layout/AppLayout';
import {
  Badge,
  Button,
  Card,
  CardContent,
  Input,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Select,
  Textarea,
} from '@/components/ui';
import {
  useApproveRevision,
  useCompensationCycles,
  useCompensationRevisions,
  useRejectRevision,
} from '@/lib/hooks/queries/useCompensation';
import {Permissions, usePermissions} from '@/lib/hooks/usePermissions';
import {PermissionGate} from '@/components/auth/PermissionGate';
import type {
  CompensationReviewCycle,
  CycleStatus,
  CycleType,
  RevisionStatus,
  RevisionType,
  SalaryRevision,
} from '@/lib/types/hrms/compensation';
import {createLogger} from '@/lib/utils/logger';

const cycleTypeLabels: Record<CycleType, string> = {
  ANNUAL: 'Annual',
  MID_YEAR: 'Mid-Year',
  QUARTERLY: 'Quarterly',
  SPECIAL: 'Special',
  AD_HOC: 'Ad Hoc',
};

const log = createLogger('CompensationPage');

const cycleStatusLabels: Record<CycleStatus, string> = {
  DRAFT: 'Draft',
  PLANNING: 'Planning',
  IN_PROGRESS: 'In Progress',
  REVIEW: 'Review',
  APPROVAL: 'Approval',
  APPROVED: 'Approved',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

const revisionTypeLabels: Record<RevisionType, string> = {
  ANNUAL_INCREMENT: 'Annual Increment',
  PROMOTION: 'Promotion',
  ROLE_CHANGE: 'Role Change',
  MARKET_ADJUSTMENT: 'Market Adjustment',
  PERFORMANCE_BONUS: 'Performance Bonus',
  SPECIAL_INCREMENT: 'Special Increment',
  PROBATION_CONFIRMATION: 'Probation Confirmation',
  RETENTION: 'Retention',
  CORRECTION: 'Correction',
};

const revisionStatusLabels: Record<RevisionStatus, string> = {
  DRAFT: 'Draft',
  PENDING_REVIEW: 'Pending Review',
  REVIEWED: 'Reviewed',
  PENDING_APPROVAL: 'Pending Approval',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  CANCELLED: 'Cancelled',
  APPLIED: 'Applied',
};

const getCycleStatusColor = (status: CycleStatus) => {
  const colors: Record<CycleStatus, string> = {
    DRAFT: 'default',
    PLANNING: 'info',
    IN_PROGRESS: 'warning',
    REVIEW: 'info',
    APPROVAL: 'warning',
    APPROVED: 'success',
    COMPLETED: 'success',
    CANCELLED: 'danger',
  };
  return colors[status] || 'default';
};

const getRevisionStatusColor = (status: RevisionStatus) => {
  const colors: Record<RevisionStatus, string> = {
    DRAFT: 'default',
    PENDING_REVIEW: 'warning',
    REVIEWED: 'info',
    PENDING_APPROVAL: 'warning',
    APPROVED: 'success',
    REJECTED: 'danger',
    CANCELLED: 'default',
    APPLIED: 'success',
  };
  return colors[status] || 'default';
};

export default function CompensationPage() {

  const router = useRouter();
  const {hasPermission, isReady: permReady} = usePermissions();

  // RBAC guard — redirect if user lacks required permission
  useEffect(() => {
    if (!permReady) return;
    if (!hasPermission(Permissions.COMPENSATION_VIEW)) {
      router.replace('/dashboard');
    }
  }, [permReady, hasPermission, router]);

  const [activeTab, setActiveTab] = useState<'cycles' | 'revisions' | 'pending'>('cycles');

  // React Query hooks
  const {
    data: cyclesData,
    isLoading: isCyclesLoading,
    error: cyclesError,
  } = useCompensationCycles(0, 100);
  const {data: revisionsData, isLoading: isRevisionsLoading} = useCompensationRevisions(0, 100);
  const approveRevisionMutation = useApproveRevision();
  const rejectRevisionMutation = useRejectRevision();

  const cycles = cyclesData?.content || [];
  const loading = isCyclesLoading || isRevisionsLoading;
  const error = cyclesError instanceof Error ? cyclesError.message : null;

  const revisions = revisionsData?.content || [];

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCycle, setSelectedCycle] = useState<CompensationReviewCycle | null>(null);
  const [selectedRevision, setSelectedRevision] = useState<SalaryRevision | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isRevisionModalOpen, setIsRevisionModalOpen] = useState(false);
  const [isCreateCycleModalOpen, setIsCreateCycleModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectionReasonInput, setShowRejectionReasonInput] = useState(false);

  // RBAC guard — all hooks declared above; safe to return early after them
  if (!permReady) {
    return (
      <AppLayout breadcrumbs={[{label: 'Dashboard', href: '/dashboard'}, {label: 'Compensation'}]} activeMenuItem="compensation">
        <div className="flex items-center justify-center h-64">
          <div className="h-8 w-8 border-4 border-accent-200 border-t-accent-500 rounded-full animate-spin" />
        </div>
      </AppLayout>
    );
  }
  if (!hasPermission(Permissions.COMPENSATION_VIEW)) {
    return (
      <AppLayout breadcrumbs={[{label: 'Dashboard', href: '/dashboard'}, {label: 'Compensation'}]} activeMenuItem="compensation">
        <div className="flex items-center justify-center h-64">
          <p className="text-[var(--text-secondary)]">You don&apos;t have permission to view compensation.</p>
        </div>
      </AppLayout>
    );
  }

  // Stats
  const activeCycle = cycles.find((c) => c.status === 'IN_PROGRESS');
  const stats = {
    totalBudget: activeCycle?.budgetAmount || 0,
    utilizedBudget: activeCycle?.utilizedAmount || 0,
    budgetUtilization: activeCycle?.budgetAmount
      ? Math.round(((activeCycle?.utilizedAmount || 0) / activeCycle.budgetAmount) * 100)
      : 0,
    totalRevisions: revisions.length,
    pendingApprovals: revisions.filter((r) => r.status === 'PENDING_APPROVAL').length,
    approvedRevisions: revisions.filter((r) => r.status === 'APPROVED' || r.status === 'APPLIED').length,
    avgIncrement: revisions.length > 0
      ? (revisions.reduce((sum, r) => sum + (r.incrementPercentage || 0), 0) / revisions.length).toFixed(1)
      : 0,
  };

  const handleViewCycle = (cycle: CompensationReviewCycle) => {
    setSelectedCycle(cycle);
    setIsDetailModalOpen(true);
  };

  const handleViewRevision = (revision: SalaryRevision) => {
    setSelectedRevision(revision);
    setIsRevisionModalOpen(true);
    setRejectionReason('');
    setShowRejectionReasonInput(false);
  };

  const handleApproveRevision = async (revisionId: string) => {
    try {
      await approveRevisionMutation.mutateAsync({revisionId});
      setIsRevisionModalOpen(false);
      // Update local selected revision with new status
      const updated = revisions.find((r) => r.id === revisionId);
      if (updated) {
        setSelectedRevision({...updated, status: 'APPROVED' as RevisionStatus});
      }
    } catch (err) {
      log.error('Failed to approve revision:', err);
    }
  };

  const handleRejectRevision = async (revisionId: string) => {
    if (!rejectionReason.trim()) {
      log.warn('Rejection reason is required');
      return;
    }

    try {
      await rejectRevisionMutation.mutateAsync({revisionId, reason: rejectionReason});
      setIsRevisionModalOpen(false);
      setRejectionReason('');
      setShowRejectionReasonInput(false);
      // Update local selected revision with new status
      const updated = revisions.find((r) => r.id === revisionId);
      if (updated) {
        setSelectedRevision({...updated, status: 'REJECTED' as RevisionStatus});
      }
    } catch (err) {
      log.error('Failed to reject revision:', err);
    }
  };

  const filteredRevisions = revisions.filter((r) =>
    r.employeeName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.employeeCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.department?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const pendingRevisions = revisions.filter((r) =>
    r.status === 'PENDING_REVIEW' || r.status === 'PENDING_APPROVAL'
  );

  const breadcrumbs = [
    {label: 'Dashboard', href: '/dashboard'},
    {label: 'Compensation'},
  ];

  return (
    <AppLayout breadcrumbs={breadcrumbs} activeMenuItem="compensation">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)] skeuo-emboss">
              Compensation Planning
            </h1>
            <p className="text-[var(--text-secondary)] skeuo-deboss">
              Manage compensation review cycles and salary revisions
            </p>
          </div>
          <Button onClick={() => setIsCreateCycleModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2"/>
            New Review Cycle
          </Button>
        </div>

        {/* Loading State */}
        {loading && (
          <Card>
            <CardContent className="p-12 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-500 mx-auto mb-4"/>
              <p className="text-[var(--text-secondary)]">Loading compensation data...</p>
            </CardContent>
          </Card>
        )}

        {/* Error State */}
        {error && !loading && (
          <Card className="border-danger-200 bg-danger-50 dark:border-danger-800 dark:bg-danger-900/20">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <AlertCircle
                  className="h-5 w-5 text-danger-500 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"/>
                <p
                  className="text-danger-700 dark:text-danger-400 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2">{error}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Cards */}
        {!loading && !error && (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="rounded-lg bg-success-100 p-4 dark:bg-success-900">
                      <DollarSign
                        className="h-6 w-6 text-success-600 dark:text-success-400 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"/>
                    </div>
                    <div>
                      <p className="text-body-secondary">Total Budget</p>
                      <p className="text-xl font-bold text-[var(--text-primary)]">
                        ${(stats.totalBudget / 1000000).toFixed(1)}M
                      </p>
                      <p className="text-caption">
                        {stats.budgetUtilization}% utilized
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="rounded-lg bg-accent-100 p-4 dark:bg-accent-900">
                      <FileText
                        className="h-6 w-6 text-accent-600 dark:text-accent-400 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"/>
                    </div>
                    <div>
                      <p className="text-body-secondary">Total Revisions</p>
                      <p className="text-xl font-bold text-[var(--text-primary)]">
                        {stats.totalRevisions}
                      </p>
                      <p className="text-caption">
                        {stats.approvedRevisions} approved
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="rounded-lg bg-warning-100 p-4 dark:bg-warning-900">
                      <Clock
                        className="h-6 w-6 text-warning-600 dark:text-warning-400 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"/>
                    </div>
                    <div>
                      <p className="text-body-secondary">Pending Approvals</p>
                      <p className="text-xl font-bold text-[var(--text-primary)]">
                        {stats.pendingApprovals}
                      </p>
                      <p className="text-caption">
                        Awaiting review
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="rounded-lg bg-accent-100 p-4 dark:bg-accent-900">
                      <TrendingUp
                        className="h-6 w-6 text-accent-800 dark:text-accent-600 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"/>
                    </div>
                    <div>
                      <p className="text-body-secondary">Avg. Increment</p>
                      <p className="text-xl font-bold text-[var(--text-primary)]">
                        {stats.avgIncrement}%
                      </p>
                      <p className="text-caption">
                        Target: {activeCycle?.averageIncrementTarget || 8}%
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Tabs */}
            <div className="border-b border-[var(--border-main)]">
              <nav className="flex gap-4">
                <button
                  onClick={() => setActiveTab('cycles')}
                  className={`pb-4 px-1 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'cycles'
                      ? 'border-accent-500 text-accent-700 dark:text-accent-400'
                      : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] dark:text-[var(--text-muted)] dark:hover:text-white'
                  }`}
                >
                  Review Cycles
                </button>
                <button
                  onClick={() => setActiveTab('revisions')}
                  className={`pb-4 px-1 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'revisions'
                      ? 'border-accent-500 text-accent-700 dark:text-accent-400'
                      : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] dark:text-[var(--text-muted)] dark:hover:text-white'
                  }`}
                >
                  All Revisions
                </button>
                <button
                  onClick={() => setActiveTab('pending')}
                  className={`pb-4 px-1 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                    activeTab === 'pending'
                      ? 'border-accent-500 text-accent-700 dark:text-accent-400'
                      : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] dark:text-[var(--text-muted)] dark:hover:text-white'
                  }`}
                >
                  Pending Approvals
                  {pendingRevisions.length > 0 && (
                    <span className="bg-warning-500 text-white text-xs px-2 py-0.5 rounded-full">
                  {pendingRevisions.length}
                </span>
                  )}
                </button>
              </nav>
            </div>
          </>
        )}

        {/* Content */}
        {activeTab === 'cycles' && !loading && !error && (
          <div className="space-y-4">
            {/* Active Cycle Banner */}
            {activeCycle && (
              <Card className="bg-gradient-to-r from-accent-500 to-accent-700">
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="text-white">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="secondary" className="bg-white/20">Active</Badge>
                        <span className="text-sm opacity-80">{cycleTypeLabels[activeCycle.cycleType]}</span>
                      </div>
                      <h3 className="text-xl font-semibold">{activeCycle.name}</h3>
                      <p className="mt-1 opacity-90 text-sm">
                        Effective: {new Date(activeCycle.effectiveDate).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-4">
                      <div className="bg-white/10 rounded-lg p-4 text-center min-w-[100px]">
                        <p className="text-xl font-bold text-white">{activeCycle.revisionsDrafted}</p>
                        <p className="text-xs text-white/80">Drafted</p>
                      </div>
                      <div className="bg-white/10 rounded-lg p-4 text-center min-w-[100px]">
                        <p className="text-xl font-bold text-white">{activeCycle.revisionsApproved}</p>
                        <p className="text-xs text-white/80">Approved</p>
                      </div>
                      <Button variant="secondary" onClick={() => handleViewCycle(activeCycle)}>
                        View Details
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Cycles Grid */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {cycles.map((cycle) => (
                <Card key={cycle.id} className="hover:shadow-[var(--shadow-dropdown)] transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-semibold text-[var(--text-primary)]">
                          {cycle.name}
                        </h3>
                        <p className="text-body-muted">
                          {cycleTypeLabels[cycle.cycleType]} - FY{cycle.fiscalYear}
                        </p>
                      </div>
                      <Badge
                        variant={getCycleStatusColor(cycle.status) as 'default' | 'success' | 'warning' | 'danger' | 'info'}>
                        {cycleStatusLabels[cycle.status]}
                      </Badge>
                    </div>

                    {cycle.description && (
                      <p className="text-body-secondary mb-4 line-clamp-2">
                        {cycle.description}
                      </p>
                    )}

                    <div className="space-y-2 mb-4">
                      <div className="row-between text-sm">
                        <span className="text-[var(--text-muted)]">Budget</span>
                        <span className="font-medium text-[var(--text-primary)]">
                          ${((cycle.budgetAmount || 0) / 1000000).toFixed(1)}M
                        </span>
                      </div>
                      {cycle.budgetAmount && cycle.utilizedAmount !== undefined && (
                        <div className="w-full bg-[var(--bg-secondary)] dark:bg-[var(--bg-secondary)] rounded-full h-2">
                          <div
                            className="bg-accent-500 h-2 rounded-full"
                            style={{width: `${Math.min((cycle.utilizedAmount / cycle.budgetAmount) * 100, 100)}%`}}
                          />
                        </div>
                      )}
                      <div className="row-between text-sm">
                        <span className="text-[var(--text-muted)]">Employees</span>
                        <span className="text-[var(--text-primary)]">{cycle.totalEmployees}</span>
                      </div>
                      <div className="row-between text-sm">
                        <span className="text-[var(--text-muted)]">Effective Date</span>
                        <span className="text-[var(--text-primary)]">
                          {new Date(cycle.effectiveDate).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => handleViewCycle(cycle)}
                      >
                        <Eye className="h-4 w-4 mr-1"/>
                        Details
                      </Button>
                      {cycle.status === 'DRAFT' && (
                        <Button size="sm" className="flex-1">
                          <Play className="h-4 w-4 mr-1"/>
                          Start
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'revisions' && !loading && !error && (
          <div className="space-y-4">
            {/* Search */}
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]"/>
                <Input
                  placeholder="Search by name, code, or department..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button variant="outline">
                <Filter className="h-4 w-4 mr-2"/>
                Filter
              </Button>
            </div>

            {/* Revisions Table */}
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                  <tr className="border-b border-[var(--border-main)]">
                    <th className="text-left p-4 text-sm font-medium text-[var(--text-secondary)]">
                      Employee
                    </th>
                    <th className="text-left p-4 text-sm font-medium text-[var(--text-secondary)]">
                      Type
                    </th>
                    <th className="text-right p-4 text-sm font-medium text-[var(--text-secondary)]">
                      Current Salary
                    </th>
                    <th className="text-right p-4 text-sm font-medium text-[var(--text-secondary)]">
                      New Salary
                    </th>
                    <th className="text-right p-4 text-sm font-medium text-[var(--text-secondary)]">
                      Increment
                    </th>
                    <th className="text-center p-4 text-sm font-medium text-[var(--text-secondary)]">
                      Status
                    </th>
                    <th className="text-right p-4 text-sm font-medium text-[var(--text-secondary)]">
                      Actions
                    </th>
                  </tr>
                  </thead>
                  <tbody>
                  {filteredRevisions.map((revision) => (
                    <tr
                      key={revision.id}
                      className="h-11 border-b border-[var(--border-main)] hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)]"
                    >
                      <td className="p-4">
                        <div>
                          <p className="font-medium text-[var(--text-primary)]">
                            {revision.employeeName}
                          </p>
                          <p className="text-body-muted">
                            {revision.employeeCode} - {revision.department}
                          </p>
                        </div>
                      </td>
                      <td className="p-4">
                          <span className="text-body-secondary">
                            {revisionTypeLabels[revision.revisionType]}
                          </span>
                      </td>
                      <td className="p-4 text-right">
                          <span className="text-[var(--text-primary)]">
                            ${revision.previousSalary.toLocaleString()}
                          </span>
                      </td>
                      <td className="p-4 text-right">
                          <span className="font-medium text-[var(--text-primary)]">
                            ${revision.newSalary.toLocaleString()}
                          </span>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <ArrowUpRight
                            className="h-4 w-4 text-success-500 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"/>
                          <span
                            className="text-success-600 dark:text-success-400 font-medium cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2">
                              {revision.incrementPercentage?.toFixed(1)}%
                            </span>
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <Badge
                          variant={getRevisionStatusColor(revision.status) as 'default' | 'success' | 'warning' | 'danger' | 'info'}>
                          {revisionStatusLabels[revision.status]}
                        </Badge>
                      </td>
                      <td className="p-4 text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleViewRevision(revision)}
                        >
                          <Eye className="h-4 w-4"/>
                        </Button>
                      </td>
                    </tr>
                  ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'pending' && !loading && !error && (
          <div className="space-y-4">
            {pendingRevisions.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <CheckCircle
                    className="h-12 w-12 text-success-500 mx-auto mb-4 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"/>
                  <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2">
                    All Caught Up!
                  </h3>
                  <p className="text-[var(--text-secondary)]">
                    There are no pending salary revisions requiring your approval.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {pendingRevisions.map((revision) => (
                  <Card key={revision.id} className="hover:shadow-[var(--shadow-dropdown)] transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <div className="bg-warning-100 dark:bg-warning-900 rounded-full p-4">
                            <AlertCircle
                              className="h-5 w-5 text-warning-600 dark:text-warning-400 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"/>
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-[var(--text-primary)]">
                                {revision.employeeName}
                              </h3>
                              <Badge
                                variant={getRevisionStatusColor(revision.status) as 'default' | 'success' | 'warning' | 'danger' | 'info'}>
                                {revisionStatusLabels[revision.status]}
                              </Badge>
                            </div>
                            <p className="text-body-muted">
                              {revision.employeeCode} - {revision.department} - {revision.designation}
                            </p>
                            <p className="text-body-secondary mt-1">
                              {revisionTypeLabels[revision.revisionType]}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="text-center">
                            <p className="text-body-muted">Current</p>
                            <p className="text-lg font-medium text-[var(--text-primary)]">
                              ${revision.previousSalary.toLocaleString()}
                            </p>
                          </div>
                          <ChevronRight className="h-5 w-5 text-[var(--text-muted)]"/>
                          <div className="text-center">
                            <p className="text-body-muted">Proposed</p>
                            <p
                              className="text-lg font-bold text-success-600 dark:text-success-400 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2">
                              ${revision.newSalary.toLocaleString()}
                            </p>
                          </div>
                          <div className="text-center">
                            <p className="text-body-muted">Increment</p>
                            <p
                              className="text-lg font-medium text-success-600 dark:text-success-400 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2">
                              +{revision.incrementPercentage?.toFixed(1)}%
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleViewRevision(revision)}
                            >
                              Review
                            </Button>
                            <PermissionGate permission={Permissions.COMPENSATION_APPROVE}>
                              <Button
                                size="sm"
                                onClick={() => handleApproveRevision(revision.id)}
                              >
                                Approve
                              </Button>
                            </PermissionGate>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Cycle Detail Modal */}
        <Modal isOpen={isDetailModalOpen} onClose={() => setIsDetailModalOpen(false)} size="lg">
          <ModalHeader>
            <div className="flex items-center gap-4">
              {selectedCycle && (
                <>
                  <div className="rounded-lg bg-accent-100 dark:bg-accent-900 p-2">
                    <PieChart
                      className="h-5 w-5 text-accent-700 dark:text-accent-400 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"/>
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-[var(--text-primary)]">
                      {selectedCycle.name}
                    </h2>
                    <p className="text-body-muted">
                      {cycleTypeLabels[selectedCycle.cycleType]} - FY{selectedCycle.fiscalYear}
                    </p>
                  </div>
                </>
              )}
            </div>
          </ModalHeader>
          <ModalBody>
            {selectedCycle && (
              <div className="space-y-6">
                <div className="flex items-center gap-2">
                  <Badge
                    variant={getCycleStatusColor(selectedCycle.status) as 'default' | 'success' | 'warning' | 'danger' | 'info'}>
                    {cycleStatusLabels[selectedCycle.status]}
                  </Badge>
                </div>

                {selectedCycle.description && (
                  <p className="text-[var(--text-secondary)]">
                    {selectedCycle.description}
                  </p>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-[var(--bg-secondary)] rounded-lg">
                    <p className="text-body-muted">Start Date</p>
                    <p className="text-lg font-medium text-[var(--text-primary)]">
                      {new Date(selectedCycle.startDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="p-4 bg-[var(--bg-secondary)] rounded-lg">
                    <p className="text-body-muted">End Date</p>
                    <p className="text-lg font-medium text-[var(--text-primary)]">
                      {new Date(selectedCycle.endDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="p-4 bg-[var(--bg-secondary)] rounded-lg">
                    <p className="text-body-muted">Effective Date</p>
                    <p className="text-lg font-medium text-[var(--text-primary)]">
                      {new Date(selectedCycle.effectiveDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="p-4 bg-[var(--bg-secondary)] rounded-lg">
                    <p className="text-body-muted">Total Budget</p>
                    <p className="text-lg font-medium text-[var(--text-primary)]">
                      ${((selectedCycle.budgetAmount || 0) / 1000000).toFixed(2)}M
                    </p>
                  </div>
                </div>

                <div className="border-t border-[var(--border-main)] pt-4">
                  <h4 className="font-medium text-[var(--text-primary)] mb-4">
                    Increment Guidelines
                  </h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-[var(--bg-secondary)] rounded-lg">
                      <p className="text-xl font-bold text-[var(--text-primary)]">
                        {selectedCycle.minIncrementPercentage || 0}%
                      </p>
                      <p className="text-body-muted">Minimum</p>
                    </div>
                    <div className="text-center p-4 bg-accent-50 dark:bg-accent-900/30 rounded-lg">
                      <p
                        className="text-xl font-bold text-accent-700 dark:text-accent-400 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2">
                        {selectedCycle.averageIncrementTarget || 0}%
                      </p>
                      <p className="text-body-muted">Target Avg</p>
                    </div>
                    <div className="text-center p-4 bg-[var(--bg-secondary)] rounded-lg">
                      <p className="text-xl font-bold text-[var(--text-primary)]">
                        {selectedCycle.maxIncrementPercentage || 0}%
                      </p>
                      <p className="text-body-muted">Maximum</p>
                    </div>
                  </div>
                </div>

                <div className="border-t border-[var(--border-main)] pt-4">
                  <h4 className="font-medium text-[var(--text-primary)] mb-4">
                    Progress
                  </h4>
                  <div className="grid grid-cols-4 gap-4">
                    <div className="text-center">
                      <p className="text-xl font-bold text-[var(--text-primary)]">
                        {selectedCycle.totalEmployees}
                      </p>
                      <p className="text-body-muted">Total</p>
                    </div>
                    <div className="text-center">
                      <p
                        className="text-xl font-bold text-accent-600 dark:text-accent-400 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2">
                        {selectedCycle.revisionsDrafted}
                      </p>
                      <p className="text-body-muted">Drafted</p>
                    </div>
                    <div className="text-center">
                      <p
                        className="text-xl font-bold text-success-600 dark:text-success-400 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2">
                        {selectedCycle.revisionsApproved}
                      </p>
                      <p className="text-body-muted">Approved</p>
                    </div>
                    <div className="text-center">
                      <p
                        className="text-xl font-bold text-accent-800 dark:text-accent-600 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2">
                        {selectedCycle.revisionsApplied}
                      </p>
                      <p className="text-body-muted">Applied</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" onClick={() => setIsDetailModalOpen(false)}>
              Close
            </Button>
            <Button>
              View Revisions
            </Button>
          </ModalFooter>
        </Modal>

        {/* Revision Detail Modal */}
        <Modal isOpen={isRevisionModalOpen} onClose={() => setIsRevisionModalOpen(false)} size="lg">
          <ModalHeader>
            <h2 className="text-xl font-semibold text-[var(--text-primary)]">
              Salary Revision Details
            </h2>
          </ModalHeader>
          <ModalBody>
            {selectedRevision && (
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="bg-[var(--bg-secondary)] rounded-full h-14 w-14 flex items-center justify-center">
                    <Users className="h-6 w-6 text-[var(--text-secondary)]"/>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-[var(--text-primary)]">
                      {selectedRevision.employeeName}
                    </h3>
                    <p className="text-body-muted">
                      {selectedRevision.employeeCode} - {selectedRevision.department}
                    </p>
                    <p className="text-body-secondary">
                      {selectedRevision.designation}
                    </p>
                  </div>
                  <Badge
                    variant={getRevisionStatusColor(selectedRevision.status) as 'default' | 'success' | 'warning' | 'danger' | 'info'}
                    className="ml-auto"
                  >
                    {revisionStatusLabels[selectedRevision.status]}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-4 p-4 bg-[var(--bg-secondary)] rounded-lg">
                  <div>
                    <p className="text-body-muted mb-1">Current Salary</p>
                    <p className="text-xl font-bold text-[var(--text-primary)]">
                      ${selectedRevision.previousSalary.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-body-muted mb-1">Proposed Salary</p>
                    <p
                      className="text-xl font-bold text-success-600 dark:text-success-400 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2">
                      ${selectedRevision.newSalary.toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 bg-success-50 dark:bg-success-900/20 rounded-lg text-center">
                    <p className="text-body-muted">Increment Amount</p>
                    <p
                      className="text-xl font-bold text-success-600 dark:text-success-400 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2">
                      +${selectedRevision.incrementAmount?.toLocaleString()}
                    </p>
                  </div>
                  <div className="p-4 bg-success-50 dark:bg-success-900/20 rounded-lg text-center">
                    <p className="text-body-muted">Increment %</p>
                    <p
                      className="text-xl font-bold text-success-600 dark:text-success-400 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2">
                      +{selectedRevision.incrementPercentage?.toFixed(2)}%
                    </p>
                  </div>
                  <div className="p-4 bg-accent-50 dark:bg-accent-900/20 rounded-lg text-center">
                    <p className="text-body-muted">Performance</p>
                    <p
                      className="text-xl font-bold text-accent-600 dark:text-accent-400 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2">
                      {selectedRevision.performanceRating?.toFixed(1) || 'N/A'}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--text-muted)]">Revision Type</span>
                    <span className="text-[var(--text-primary)]">
                      {revisionTypeLabels[selectedRevision.revisionType]}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--text-muted)]">Effective Date</span>
                    <span className="text-[var(--text-primary)]">
                      {new Date(selectedRevision.effectiveDate).toLocaleDateString()}
                    </span>
                  </div>
                  {selectedRevision.newDesignation && (
                    <div className="flex justify-between text-sm">
                      <span className="text-[var(--text-muted)]">New Designation</span>
                      <span className="text-[var(--text-primary)]">
                        {selectedRevision.newDesignation}
                      </span>
                    </div>
                  )}
                </div>

                {selectedRevision.justification && (
                  <div className="border-t border-[var(--border-main)] pt-4">
                    <h4 className="font-medium text-[var(--text-primary)] mb-2">
                      Justification
                    </h4>
                    <p className="text-body-secondary">
                      {selectedRevision.justification}
                    </p>
                  </div>
                )}
              </div>
            )}
          </ModalBody>
          <ModalFooter className="flex-col gap-4">
            {showRejectionReasonInput && selectedRevision && (selectedRevision.status === 'PENDING_REVIEW' || selectedRevision.status === 'PENDING_APPROVAL') && (
              <div className="w-full space-y-4 border-t border-[var(--border-main)] pt-4">
                <label className="block text-sm font-medium text-[var(--text-secondary)]">
                  Rejection Reason <span
                  className="text-danger-600 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2">*</span>
                </label>
                <Textarea
                  placeholder="Please provide a reason for rejecting this revision..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="min-h-24"
                />
              </div>
            )}
            <div className="flex gap-2 justify-end w-full">
              <Button variant="outline" onClick={() => {
                setIsRevisionModalOpen(false);
                setRejectionReason('');
                setShowRejectionReasonInput(false);
              }}>
                Close
              </Button>
              {selectedRevision && (selectedRevision.status === 'PENDING_REVIEW' || selectedRevision.status === 'PENDING_APPROVAL') && (
                <>
                  {showRejectionReasonInput ? (
                    <>
                      <Button
                        variant="outline"
                        onClick={() => setShowRejectionReasonInput(false)}
                      >
                        Cancel Rejection
                      </Button>
                      <Button
                        className="bg-danger-600 hover:bg-danger-700 text-white"
                        disabled={!rejectionReason.trim() || rejectRevisionMutation.isPending}
                        onClick={() => handleRejectRevision(selectedRevision.id)}
                      >
                        {rejectRevisionMutation.isPending ? 'Rejecting...' : 'Confirm Rejection'}
                      </Button>
                    </>
                  ) : (
                    <>
                      <PermissionGate permission={Permissions.COMPENSATION_APPROVE}>
                        <Button
                          variant="outline"
                          className="text-danger-600 border-danger-600 hover:bg-danger-50 dark:hover:bg-danger-900/40 dark:text-danger-400 dark:border-danger-700 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
                          disabled={approveRevisionMutation.isPending || rejectRevisionMutation.isPending}
                          onClick={() => setShowRejectionReasonInput(true)}
                        >
                          Reject
                        </Button>
                      </PermissionGate>
                      <PermissionGate permission={Permissions.COMPENSATION_APPROVE}>
                        <Button
                          disabled={approveRevisionMutation.isPending || rejectRevisionMutation.isPending}
                          onClick={() => handleApproveRevision(selectedRevision.id)}
                        >
                          {approveRevisionMutation.isPending ? 'Approving...' : 'Approve'}
                        </Button>
                      </PermissionGate>
                    </>
                  )}
                </>
              )}
            </div>
          </ModalFooter>
        </Modal>

        {/* Create Cycle Modal */}
        <Modal isOpen={isCreateCycleModalOpen} onClose={() => setIsCreateCycleModalOpen(false)} size="lg">
          <ModalHeader>
            <h2 className="text-xl font-semibold text-[var(--text-primary)]">
              Create Review Cycle
            </h2>
          </ModalHeader>
          <ModalBody>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                  Cycle Name
                </label>
                <Input placeholder="e.g., Annual Review 2025"/>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                    Cycle Type
                  </label>
                  <Select>
                    <option value="ANNUAL">Annual</option>
                    <option value="MID_YEAR">Mid-Year</option>
                    <option value="QUARTERLY">Quarterly</option>
                    <option value="SPECIAL">Special</option>
                    <option value="AD_HOC">Ad Hoc</option>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                    Fiscal Year
                  </label>
                  <Select>
                    <option value="2025">2025</option>
                    <option value="2024">2024</option>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                    Start Date
                  </label>
                  <Input type="date"/>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                    End Date
                  </label>
                  <Input type="date"/>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                    Effective Date
                  </label>
                  <Input type="date"/>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                  Budget Amount
                </label>
                <Input type="number" placeholder="Enter budget amount"/>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                    Min Increment %
                  </label>
                  <Input type="number" placeholder="0"/>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                    Target Avg %
                  </label>
                  <Input type="number" placeholder="8"/>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                    Max Increment %
                  </label>
                  <Input type="number" placeholder="25"/>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                  Description
                </label>
                <textarea
                  className="w-full rounded-lg border border-[var(--border-main)] dark:border-[var(--border-main)] bg-[var(--bg-input)] px-4 py-2 text-[var(--text-primary)]"
                  rows={3}
                  placeholder="Describe this review cycle..."
                />
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" onClick={() => setIsCreateCycleModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => setIsCreateCycleModalOpen(false)}>
              Create Cycle
            </Button>
          </ModalFooter>
        </Modal>
      </div>
    </AppLayout>
  );
}
