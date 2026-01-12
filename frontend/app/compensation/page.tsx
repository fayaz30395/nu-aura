'use client';

import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  TrendingUp,
  Users,
  CheckCircle,
  Clock,
  Calendar,
  Plus,
  Eye,
  Play,
  Pause,
  ChevronRight,
  Search,
  Filter,
  FileText,
  ArrowUpRight,
  ArrowDownRight,
  Building,
  Target,
  PieChart,
  AlertCircle,
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import {
  Card,
  CardContent,
  Button,
  Badge,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Input,
  Select,
} from '@/components/ui';
import { compensationService } from '@/lib/services/compensation.service';
import type {
  CompensationReviewCycle,
  SalaryRevision,
  CycleType,
  CycleStatus,
  RevisionType,
  RevisionStatus,
  CompensationCycleRequest,
} from '@/lib/types/compensation';

const cycleTypeLabels: Record<CycleType, string> = {
  ANNUAL: 'Annual',
  MID_YEAR: 'Mid-Year',
  QUARTERLY: 'Quarterly',
  SPECIAL: 'Special',
  AD_HOC: 'Ad Hoc',
};

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
  const [activeTab, setActiveTab] = useState<'cycles' | 'revisions' | 'pending'>('cycles');
  const [cycles, setCycles] = useState<CompensationReviewCycle[]>([]);
  const [revisions, setRevisions] = useState<SalaryRevision[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch compensation data from API
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [cyclesResponse, revisionsResponse] = await Promise.all([
          compensationService.getAllCycles(0, 100),
          compensationService.getAllRevisions(0, 100),
        ]);
        setCycles(cyclesResponse.content || []);
        setRevisions(revisionsResponse.content || []);
      } catch (err) {
        console.error('Failed to fetch compensation data:', err);
        setError('Failed to load compensation data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCycle, setSelectedCycle] = useState<CompensationReviewCycle | null>(null);
  const [selectedRevision, setSelectedRevision] = useState<SalaryRevision | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isRevisionModalOpen, setIsRevisionModalOpen] = useState(false);
  const [isCreateCycleModalOpen, setIsCreateCycleModalOpen] = useState(false);

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
  };

  const handleApproveRevision = (revisionId: string) => {
    setRevisions(revisions.map((r) =>
      r.id === revisionId ? { ...r, status: 'APPROVED' as RevisionStatus } : r
    ));
    setIsRevisionModalOpen(false);
  };

  const handleRejectRevision = (revisionId: string) => {
    setRevisions(revisions.map((r) =>
      r.id === revisionId ? { ...r, status: 'REJECTED' as RevisionStatus } : r
    ));
    setIsRevisionModalOpen(false);
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
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Compensation' },
  ];

  return (
    <AppLayout breadcrumbs={breadcrumbs} activeMenuItem="compensation">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-surface-900 dark:text-white">
              Compensation Planning
            </h1>
            <p className="text-surface-600 dark:text-surface-400">
              Manage compensation review cycles and salary revisions
            </p>
          </div>
          <Button onClick={() => setIsCreateCycleModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Review Cycle
          </Button>
        </div>

        {/* Loading State */}
        {loading && (
          <Card>
            <CardContent className="p-12 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto mb-4" />
              <p className="text-surface-600 dark:text-surface-400">Loading compensation data...</p>
            </CardContent>
          </Card>
        )}

        {/* Error State */}
        {error && !loading && (
          <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-red-500" />
                <p className="text-red-700 dark:text-red-400">{error}</p>
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
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-green-100 p-3 dark:bg-green-900">
                  <DollarSign className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-surface-600 dark:text-surface-400">Total Budget</p>
                  <p className="text-2xl font-bold text-surface-900 dark:text-white">
                    ${(stats.totalBudget / 1000000).toFixed(1)}M
                  </p>
                  <p className="text-xs text-surface-500">
                    {stats.budgetUtilization}% utilized
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-blue-100 p-3 dark:bg-blue-900">
                  <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-surface-600 dark:text-surface-400">Total Revisions</p>
                  <p className="text-2xl font-bold text-surface-900 dark:text-white">
                    {stats.totalRevisions}
                  </p>
                  <p className="text-xs text-surface-500">
                    {stats.approvedRevisions} approved
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-amber-100 p-3 dark:bg-amber-900">
                  <Clock className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-sm text-surface-600 dark:text-surface-400">Pending Approvals</p>
                  <p className="text-2xl font-bold text-surface-900 dark:text-white">
                    {stats.pendingApprovals}
                  </p>
                  <p className="text-xs text-surface-500">
                    Awaiting review
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-purple-100 p-3 dark:bg-purple-900">
                  <TrendingUp className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-sm text-surface-600 dark:text-surface-400">Avg. Increment</p>
                  <p className="text-2xl font-bold text-surface-900 dark:text-white">
                    {stats.avgIncrement}%
                  </p>
                  <p className="text-xs text-surface-500">
                    Target: {activeCycle?.averageIncrementTarget || 8}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <div className="border-b border-surface-200 dark:border-surface-700">
          <nav className="flex gap-4">
            <button
              onClick={() => setActiveTab('cycles')}
              className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'cycles'
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-surface-600 hover:text-surface-900 dark:text-surface-400 dark:hover:text-white'
              }`}
            >
              Review Cycles
            </button>
            <button
              onClick={() => setActiveTab('revisions')}
              className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'revisions'
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-surface-600 hover:text-surface-900 dark:text-surface-400 dark:hover:text-white'
              }`}
            >
              All Revisions
            </button>
            <button
              onClick={() => setActiveTab('pending')}
              className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === 'pending'
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-surface-600 hover:text-surface-900 dark:text-surface-400 dark:hover:text-white'
              }`}
            >
              Pending Approvals
              {pendingRevisions.length > 0 && (
                <span className="bg-amber-500 text-white text-xs px-2 py-0.5 rounded-full">
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
              <Card className="bg-gradient-to-r from-primary-500 to-primary-600">
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
                    <div className="flex flex-col sm:flex-row gap-3">
                      <div className="bg-white/10 rounded-lg p-3 text-center min-w-[100px]">
                        <p className="text-2xl font-bold text-white">{activeCycle.revisionsDrafted}</p>
                        <p className="text-xs text-white/80">Drafted</p>
                      </div>
                      <div className="bg-white/10 rounded-lg p-3 text-center min-w-[100px]">
                        <p className="text-2xl font-bold text-white">{activeCycle.revisionsApproved}</p>
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
                <Card key={cycle.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-surface-900 dark:text-white">
                          {cycle.name}
                        </h3>
                        <p className="text-sm text-surface-500">
                          {cycleTypeLabels[cycle.cycleType]} - FY{cycle.fiscalYear}
                        </p>
                      </div>
                      <Badge variant={getCycleStatusColor(cycle.status) as 'default' | 'success' | 'warning' | 'danger' | 'info'}>
                        {cycleStatusLabels[cycle.status]}
                      </Badge>
                    </div>

                    {cycle.description && (
                      <p className="text-sm text-surface-600 dark:text-surface-400 mb-4 line-clamp-2">
                        {cycle.description}
                      </p>
                    )}

                    <div className="space-y-2 mb-4">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-surface-500">Budget</span>
                        <span className="font-medium text-surface-900 dark:text-white">
                          ${((cycle.budgetAmount || 0) / 1000000).toFixed(1)}M
                        </span>
                      </div>
                      {cycle.budgetAmount && cycle.utilizedAmount !== undefined && (
                        <div className="w-full bg-surface-200 dark:bg-surface-700 rounded-full h-2">
                          <div
                            className="bg-primary-500 h-2 rounded-full"
                            style={{ width: `${Math.min((cycle.utilizedAmount / cycle.budgetAmount) * 100, 100)}%` }}
                          />
                        </div>
                      )}
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-surface-500">Employees</span>
                        <span className="text-surface-900 dark:text-white">{cycle.totalEmployees}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-surface-500">Effective Date</span>
                        <span className="text-surface-900 dark:text-white">
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
                        <Eye className="h-4 w-4 mr-1" />
                        Details
                      </Button>
                      {cycle.status === 'DRAFT' && (
                        <Button size="sm" className="flex-1">
                          <Play className="h-4 w-4 mr-1" />
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
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400" />
                <Input
                  placeholder="Search by name, code, or department..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button variant="outline">
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
            </div>

            {/* Revisions Table */}
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-surface-200 dark:border-surface-700">
                      <th className="text-left p-4 text-sm font-medium text-surface-600 dark:text-surface-400">
                        Employee
                      </th>
                      <th className="text-left p-4 text-sm font-medium text-surface-600 dark:text-surface-400">
                        Type
                      </th>
                      <th className="text-left p-4 text-sm font-medium text-surface-600 dark:text-surface-400">
                        Current Salary
                      </th>
                      <th className="text-left p-4 text-sm font-medium text-surface-600 dark:text-surface-400">
                        New Salary
                      </th>
                      <th className="text-left p-4 text-sm font-medium text-surface-600 dark:text-surface-400">
                        Increment
                      </th>
                      <th className="text-left p-4 text-sm font-medium text-surface-600 dark:text-surface-400">
                        Status
                      </th>
                      <th className="text-left p-4 text-sm font-medium text-surface-600 dark:text-surface-400">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRevisions.map((revision) => (
                      <tr
                        key={revision.id}
                        className="border-b border-surface-200 dark:border-surface-700 hover:bg-surface-50 dark:hover:bg-surface-800"
                      >
                        <td className="p-4">
                          <div>
                            <p className="font-medium text-surface-900 dark:text-white">
                              {revision.employeeName}
                            </p>
                            <p className="text-sm text-surface-500">
                              {revision.employeeCode} - {revision.department}
                            </p>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="text-sm text-surface-600 dark:text-surface-400">
                            {revisionTypeLabels[revision.revisionType]}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className="text-surface-900 dark:text-white">
                            ${revision.previousSalary.toLocaleString()}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className="font-medium text-surface-900 dark:text-white">
                            ${revision.newSalary.toLocaleString()}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-1">
                            <ArrowUpRight className="h-4 w-4 text-green-500" />
                            <span className="text-green-600 dark:text-green-400 font-medium">
                              {revision.incrementPercentage?.toFixed(1)}%
                            </span>
                          </div>
                        </td>
                        <td className="p-4">
                          <Badge variant={getRevisionStatusColor(revision.status) as 'default' | 'success' | 'warning' | 'danger' | 'info'}>
                            {revisionStatusLabels[revision.status]}
                          </Badge>
                        </td>
                        <td className="p-4">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleViewRevision(revision)}
                          >
                            <Eye className="h-4 w-4" />
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
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-surface-900 dark:text-white mb-2">
                    All Caught Up!
                  </h3>
                  <p className="text-surface-600 dark:text-surface-400">
                    There are no pending salary revisions requiring your approval.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {pendingRevisions.map((revision) => (
                  <Card key={revision.id} className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <div className="bg-amber-100 dark:bg-amber-900 rounded-full p-3">
                            <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-surface-900 dark:text-white">
                                {revision.employeeName}
                              </h3>
                              <Badge variant={getRevisionStatusColor(revision.status) as 'default' | 'success' | 'warning' | 'danger' | 'info'}>
                                {revisionStatusLabels[revision.status]}
                              </Badge>
                            </div>
                            <p className="text-sm text-surface-500">
                              {revision.employeeCode} - {revision.department} - {revision.designation}
                            </p>
                            <p className="text-sm text-surface-600 dark:text-surface-400 mt-1">
                              {revisionTypeLabels[revision.revisionType]}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="text-center">
                            <p className="text-sm text-surface-500">Current</p>
                            <p className="text-lg font-medium text-surface-900 dark:text-white">
                              ${revision.previousSalary.toLocaleString()}
                            </p>
                          </div>
                          <ChevronRight className="h-5 w-5 text-surface-400" />
                          <div className="text-center">
                            <p className="text-sm text-surface-500">Proposed</p>
                            <p className="text-lg font-bold text-green-600 dark:text-green-400">
                              ${revision.newSalary.toLocaleString()}
                            </p>
                          </div>
                          <div className="text-center">
                            <p className="text-sm text-surface-500">Increment</p>
                            <p className="text-lg font-medium text-green-600 dark:text-green-400">
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
                            <Button
                              size="sm"
                              onClick={() => handleApproveRevision(revision.id)}
                            >
                              Approve
                            </Button>
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
            <div className="flex items-center gap-3">
              {selectedCycle && (
                <>
                  <div className="rounded-lg bg-primary-100 dark:bg-primary-900 p-2">
                    <PieChart className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-surface-900 dark:text-white">
                      {selectedCycle.name}
                    </h2>
                    <p className="text-sm text-surface-500">
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
                  <Badge variant={getCycleStatusColor(selectedCycle.status) as 'default' | 'success' | 'warning' | 'danger' | 'info'}>
                    {cycleStatusLabels[selectedCycle.status]}
                  </Badge>
                </div>

                {selectedCycle.description && (
                  <p className="text-surface-600 dark:text-surface-400">
                    {selectedCycle.description}
                  </p>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-surface-50 dark:bg-surface-800 rounded-lg">
                    <p className="text-sm text-surface-500">Start Date</p>
                    <p className="text-lg font-medium text-surface-900 dark:text-white">
                      {new Date(selectedCycle.startDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="p-4 bg-surface-50 dark:bg-surface-800 rounded-lg">
                    <p className="text-sm text-surface-500">End Date</p>
                    <p className="text-lg font-medium text-surface-900 dark:text-white">
                      {new Date(selectedCycle.endDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="p-4 bg-surface-50 dark:bg-surface-800 rounded-lg">
                    <p className="text-sm text-surface-500">Effective Date</p>
                    <p className="text-lg font-medium text-surface-900 dark:text-white">
                      {new Date(selectedCycle.effectiveDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="p-4 bg-surface-50 dark:bg-surface-800 rounded-lg">
                    <p className="text-sm text-surface-500">Total Budget</p>
                    <p className="text-lg font-medium text-surface-900 dark:text-white">
                      ${((selectedCycle.budgetAmount || 0) / 1000000).toFixed(2)}M
                    </p>
                  </div>
                </div>

                <div className="border-t border-surface-200 dark:border-surface-700 pt-4">
                  <h4 className="font-medium text-surface-900 dark:text-white mb-4">
                    Increment Guidelines
                  </h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-3 bg-surface-50 dark:bg-surface-800 rounded-lg">
                      <p className="text-2xl font-bold text-surface-900 dark:text-white">
                        {selectedCycle.minIncrementPercentage || 0}%
                      </p>
                      <p className="text-sm text-surface-500">Minimum</p>
                    </div>
                    <div className="text-center p-3 bg-primary-50 dark:bg-primary-900/30 rounded-lg">
                      <p className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                        {selectedCycle.averageIncrementTarget || 0}%
                      </p>
                      <p className="text-sm text-surface-500">Target Avg</p>
                    </div>
                    <div className="text-center p-3 bg-surface-50 dark:bg-surface-800 rounded-lg">
                      <p className="text-2xl font-bold text-surface-900 dark:text-white">
                        {selectedCycle.maxIncrementPercentage || 0}%
                      </p>
                      <p className="text-sm text-surface-500">Maximum</p>
                    </div>
                  </div>
                </div>

                <div className="border-t border-surface-200 dark:border-surface-700 pt-4">
                  <h4 className="font-medium text-surface-900 dark:text-white mb-4">
                    Progress
                  </h4>
                  <div className="grid grid-cols-4 gap-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-surface-900 dark:text-white">
                        {selectedCycle.totalEmployees}
                      </p>
                      <p className="text-sm text-surface-500">Total</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {selectedCycle.revisionsDrafted}
                      </p>
                      <p className="text-sm text-surface-500">Drafted</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                        {selectedCycle.revisionsApproved}
                      </p>
                      <p className="text-sm text-surface-500">Approved</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                        {selectedCycle.revisionsApplied}
                      </p>
                      <p className="text-sm text-surface-500">Applied</p>
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
            <h2 className="text-xl font-semibold text-surface-900 dark:text-white">
              Salary Revision Details
            </h2>
          </ModalHeader>
          <ModalBody>
            {selectedRevision && (
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="bg-surface-100 dark:bg-surface-800 rounded-full h-14 w-14 flex items-center justify-center">
                    <Users className="h-6 w-6 text-surface-600 dark:text-surface-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-surface-900 dark:text-white">
                      {selectedRevision.employeeName}
                    </h3>
                    <p className="text-sm text-surface-500">
                      {selectedRevision.employeeCode} - {selectedRevision.department}
                    </p>
                    <p className="text-sm text-surface-600 dark:text-surface-400">
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

                <div className="grid grid-cols-2 gap-4 p-4 bg-surface-50 dark:bg-surface-800 rounded-lg">
                  <div>
                    <p className="text-sm text-surface-500 mb-1">Current Salary</p>
                    <p className="text-2xl font-bold text-surface-900 dark:text-white">
                      ${selectedRevision.previousSalary.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-surface-500 mb-1">Proposed Salary</p>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                      ${selectedRevision.newSalary.toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg text-center">
                    <p className="text-sm text-surface-500">Increment Amount</p>
                    <p className="text-xl font-bold text-green-600 dark:text-green-400">
                      +${selectedRevision.incrementAmount?.toLocaleString()}
                    </p>
                  </div>
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg text-center">
                    <p className="text-sm text-surface-500">Increment %</p>
                    <p className="text-xl font-bold text-green-600 dark:text-green-400">
                      +{selectedRevision.incrementPercentage?.toFixed(2)}%
                    </p>
                  </div>
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-center">
                    <p className="text-sm text-surface-500">Performance</p>
                    <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
                      {selectedRevision.performanceRating?.toFixed(1) || 'N/A'}
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-surface-500">Revision Type</span>
                    <span className="text-surface-900 dark:text-white">
                      {revisionTypeLabels[selectedRevision.revisionType]}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-surface-500">Effective Date</span>
                    <span className="text-surface-900 dark:text-white">
                      {new Date(selectedRevision.effectiveDate).toLocaleDateString()}
                    </span>
                  </div>
                  {selectedRevision.newDesignation && (
                    <div className="flex justify-between text-sm">
                      <span className="text-surface-500">New Designation</span>
                      <span className="text-surface-900 dark:text-white">
                        {selectedRevision.newDesignation}
                      </span>
                    </div>
                  )}
                </div>

                {selectedRevision.justification && (
                  <div className="border-t border-surface-200 dark:border-surface-700 pt-4">
                    <h4 className="font-medium text-surface-900 dark:text-white mb-2">
                      Justification
                    </h4>
                    <p className="text-sm text-surface-600 dark:text-surface-400">
                      {selectedRevision.justification}
                    </p>
                  </div>
                )}
              </div>
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" onClick={() => setIsRevisionModalOpen(false)}>
              Close
            </Button>
            {selectedRevision && (selectedRevision.status === 'PENDING_REVIEW' || selectedRevision.status === 'PENDING_APPROVAL') && (
              <>
                <Button
                  variant="outline"
                  className="text-red-600 border-red-600 hover:bg-red-50"
                  onClick={() => handleRejectRevision(selectedRevision.id)}
                >
                  Reject
                </Button>
                <Button onClick={() => handleApproveRevision(selectedRevision.id)}>
                  Approve
                </Button>
              </>
            )}
          </ModalFooter>
        </Modal>

        {/* Create Cycle Modal */}
        <Modal isOpen={isCreateCycleModalOpen} onClose={() => setIsCreateCycleModalOpen(false)} size="lg">
          <ModalHeader>
            <h2 className="text-xl font-semibold text-surface-900 dark:text-white">
              Create Review Cycle
            </h2>
          </ModalHeader>
          <ModalBody>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                  Cycle Name
                </label>
                <Input placeholder="e.g., Annual Review 2025" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
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
                  <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
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
                  <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                    Start Date
                  </label>
                  <Input type="date" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                    End Date
                  </label>
                  <Input type="date" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                    Effective Date
                  </label>
                  <Input type="date" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                  Budget Amount
                </label>
                <Input type="number" placeholder="Enter budget amount" />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                    Min Increment %
                  </label>
                  <Input type="number" placeholder="0" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                    Target Avg %
                  </label>
                  <Input type="number" placeholder="8" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                    Max Increment %
                  </label>
                  <Input type="number" placeholder="25" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                  Description
                </label>
                <textarea
                  className="w-full rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 px-4 py-2 text-surface-900 dark:text-white"
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
