'use client';

import React, {useEffect, useMemo, useState} from 'react';
import {useRouter} from 'next/navigation';
import {motion} from 'framer-motion';
import {AppLayout} from '@/components/layout';
import {Button} from '@/components/ui/Button';
import {
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  Building2,
  ChevronDown,
  Clock,
  DollarSign,
  Download,
  FolderOpen,
  RefreshCw,
  Search,
  TrendingUp,
  User,
  Users,
} from 'lucide-react';
import {Card, CardContent, CardHeader, CardTitle,} from '@/components/ui/Card';
import {Badge} from '@/components/ui/Badge';
import {Skeleton} from '@/components/ui/Skeleton';
import {
  formatCurrency,
  formatHours,
  formatPercentage,
  getUtilizationBgColor,
  getUtilizationColor,
} from '@/lib/types/hrms/utilization';
import {getDateRanges} from '@/lib/services/hrms/utilization.service';
import {Permissions, usePermissions} from '@/lib/hooks/usePermissions';
import {useUtilizationDashboard} from '@/lib/hooks/queries/useReports';

type DateRangeKey = 'thisWeek' | 'lastWeek' | 'thisMonth' | 'lastMonth' | 'thisQuarter' | 'thisYear' | 'custom';

export default function UtilizationReportsPage() {

  const router = useRouter();
  const {hasPermission, isReady: permReady} = usePermissions();

  // RBAC guard — redirect if user lacks required permission
  useEffect(() => {
    if (!permReady) return;
    if (!hasPermission(Permissions.REPORT_VIEW)) {
      router.replace('/reports');
    }
  }, [permReady, hasPermission, router]);

  const [selectedDateRange, setSelectedDateRange] = useState<DateRangeKey>('thisMonth');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'employees' | 'departments' | 'projects'>('overview');

  const dateRanges = useMemo(() => getDateRanges(), []);

  const currentRange = useMemo(() => {
    if (selectedDateRange === 'custom') {
      return {startDate: customStartDate, endDate: customEndDate, label: 'Custom Range'};
    }
    return dateRanges[selectedDateRange];
  }, [selectedDateRange, customStartDate, customEndDate, dateRanges]);

  const {data: dashboardData, isLoading: loading, error, refetch} = useUtilizationDashboard(
    {
      startDate: currentRange.startDate,
      endDate: currentRange.endDate,
    },
    true
  );

  const filteredEmployees = useMemo(() => {
    if (!dashboardData) return [];

    // Sort logic handled in backend usually, but for filter:
    const allEmployees = [...(dashboardData.topPerformers || []), ...(dashboardData.underUtilized || [])];

    if (!searchQuery) return allEmployees;
    const query = searchQuery.toLowerCase();

    // De-duplicate in case employee appears in both lists (unlikely but possible in edge cases)
    const seen = new Set();
    return allEmployees.filter(emp => {
      if (seen.has(emp.employeeId)) return false;
      seen.add(emp.employeeId);

      return (
        emp.employeeName.toLowerCase().includes(query) ||
        emp.employeeCode?.toLowerCase().includes(query) ||
        emp.departmentName?.toLowerCase().includes(query)
      );
    });
  }, [dashboardData, searchQuery]);

  // RBAC guard — all hooks declared above; safe to return null after them
  if (!permReady || !hasPermission(Permissions.REPORT_VIEW)) {
    return null;
  }


  const StatCard = ({
                      title,
                      value,
                      subValue,
                      icon: Icon,
                      trend,
                      trendDirection,
                      color,
                    }: {
    title: string;
    value: string | number;
    subValue?: string;
    icon: React.ElementType;
    trend?: string;
    trendDirection?: 'up' | 'down';
    color: string;
  }) => (
    <Card className="hover:shadow-[var(--shadow-elevated)] transition-shadow">
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-[var(--text-muted)]">{title}</p>
            <p className="text-xl font-bold skeuo-emboss">{value}</p>
            {subValue && (
              <p className="text-body-muted">{subValue}</p>
            )}
            {trend && (
              <div className="flex items-center gap-1">
                {trendDirection === 'up' ? (
                  <ArrowUpRight className='h-4 w-4 text-status-success-text'/>
                ) : (
                  <ArrowDownRight className='h-4 w-4 text-status-danger-text'/>
                )}
                <span
                  className={`text-sm font-medium ${trendDirection === 'up' ? 'text-success-500' : 'text-danger-500'
                  }`}
                >
                  {trend}
                </span>
              </div>
            )}
          </div>
          <div className={`p-4 rounded-xl ${color}`}>
            <Icon className='h-6 w-6 text-inverse'/>
          </div>
        </div>
      </CardContent>
    </Card>
  );


  const UtilizationBar = ({rate}: { rate: number }) => (
    <div className="flex items-center gap-4">
      <div className="flex-1 h-2 bg-[var(--bg-secondary)] dark:bg-[var(--bg-secondary)] rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${rate >= 90 ? 'bg-success-500' :
            rate >= 75 ? 'bg-accent-500' :
              rate >= 50 ? 'bg-warning-500' :
                'bg-danger-500'
          }`}
          style={{width: `${Math.min(rate, 100)}%`}}
        />
      </div>
      <span className={`text-sm font-medium w-12 text-right ${getUtilizationColor(rate)}`}>
        {formatPercentage(rate)}
      </span>
    </div>
  );

  const LoadingSkeleton = () => (
    <div className="space-y-6 animate-pulse">
      {/* Header Skeleton */}
      <div className="flex justify-between items-center h-10">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64"/>
          <Skeleton className="h-4 w-96"/>
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-40"/>
          <Skeleton className="h-10 w-10"/>
          <Skeleton className="h-10 w-24"/>
        </div>
      </div>

      {/* Stats Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-32 rounded-xl"/>
        ))}
      </div>

      {/* Tabs Skeleton */}
      <div className="flex gap-6 border-b border-[var(--border-main)] pb-1">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-10 w-24"/>
        ))}
      </div>

      {/* Content Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Skeleton className="h-96 rounded-xl"/>
        <Skeleton className="h-96 rounded-xl"/>
      </div>
    </div>
  );

  if (loading && !dashboardData) {
    return (
      <AppLayout activeMenuItem="reports">
        <div className="p-6">
          <LoadingSkeleton/>
        </div>
      </AppLayout>
    );
  }

  if (!dashboardData && !loading) {
    return (
      <AppLayout activeMenuItem="reports">
        <div className="p-6 flex flex-col items-center justify-center h-[60vh]">
          <AlertCircle className='w-16 h-16 text-status-danger-text mb-4'/>
          <h2 className="text-xl font-bold text-[var(--text-primary)]">Failed to load data</h2>
          <p
            className="text-[var(--text-muted)] mt-2">{typeof error === 'object' && error ? (error as Error).message : 'Unknown error occurred'}</p>
          <Button
            onClick={() => refetch()}
            variant="primary"
            className="mt-4"
          >
            Retry
          </Button>
        </div>
      </AppLayout>
    );
  }

  // Safe check for typescript
  if (!dashboardData) return null;

  return (
    <AppLayout activeMenuItem="reports">
      <div className="p-6 space-y-6">
        {/* Header */}
        <motion.div
          initial={{opacity: 0, y: -20}}
          animate={{opacity: 1, y: 0}}
          className="flex flex-col md:flex-row md:items-center md:justify-between gap-4"
        >
          <div>
            <h1 className="text-xl font-bold skeuo-emboss">
              Utilization Dashboard
            </h1>
            <p className="text-[var(--text-secondary)] mt-1">
              Track employee productivity and resource utilization
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            {/* Date Range Selector */}
            <div className="relative">
              <select
                value={selectedDateRange}
                onChange={(e) => setSelectedDateRange(e.target.value as DateRangeKey)}
                className="appearance-none pl-4 pr-10 py-2 bg-[var(--bg-input)] border border-[var(--border-main)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent-500"
              >
                <option value="thisWeek">This Week</option>
                <option value="lastWeek">Last Week</option>
                <option value="thisMonth">This Month</option>
                <option value="lastMonth">Last Month</option>
                <option value="thisQuarter">This Quarter</option>
                <option value="thisYear">This Year</option>
                <option value="custom">Custom Range</option>
              </select>
              <ChevronDown
                className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)] pointer-events-none"/>
            </div>

            {selectedDateRange === 'custom' && (
              <>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="px-4 py-2 bg-[var(--bg-input)] border border-[var(--border-main)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent-500"
                />
                <span className="text-[var(--text-muted)]">to</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="px-4 py-2 bg-[var(--bg-input)] border border-[var(--border-main)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent-500"
                />
              </>
            )}

            <button
              onClick={() => refetch()}
              disabled={loading}
              className="p-2 bg-[var(--bg-input)] border border-[var(--border-main)] rounded-lg hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)] transition-colors"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`}/>
            </button>

            <Button variant="primary" leftIcon={<Download className="h-4 w-4"/>}>
              Export
            </Button>
          </div>
        </motion.div>

        {/* Error Alert */}
        {error && (
          <motion.div
            initial={{opacity: 0, y: -10}}
            animate={{opacity: 1, y: 0}}
            className='p-4 bg-status-danger-bg border border-status-danger-border rounded-lg flex items-center gap-4'
          >
            <AlertCircle className='h-5 w-5 text-status-danger-text'/>
            <span
              className='text-status-danger-text'>{typeof error === 'object' && error ? (error as Error).message : String(error)}</span>
          </motion.div>
        )}

        {/* Stats Cards */}
        <motion.div
          initial={{opacity: 0, y: 20}}
          animate={{opacity: 1, y: 0}}
          transition={{delay: 0.1}}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          <StatCard
            title="Average Utilization"
            value={formatPercentage(dashboardData.summary.averageUtilization)}
            icon={TrendingUp}
            trend="+5.2% vs last period"
            trendDirection="up"
            color="bg-gradient-to-br from-accent-500 to-accent-600"
          />
          <StatCard
            title="Billable Hours"
            value={formatHours(dashboardData.summary.totalBillableHours)}
            subValue={`of ${formatHours(dashboardData.summary.totalBillableHours + dashboardData.summary.totalNonBillableHours)} total`}
            icon={Clock}
            color="bg-gradient-to-br from-success-500 to-success-600"
          />
          <StatCard
            title="Active Resources"
            value={dashboardData.summary.totalEmployees}
            subValue="employees tracked"
            icon={Users}
            color="bg-gradient-to-br from-accent-700 to-accent-800"
          />
          <StatCard
            title="Revenue Generated"
            value={formatCurrency(dashboardData.summary.billedAmount)}
            icon={DollarSign}
            trend="+12.3% vs last period"
            trendDirection="up"
            color="bg-gradient-to-br from-warning-500 to-warning-600"
          />
        </motion.div>

        {/* Tabs */}
        <div className="border-b border-[var(--border-main)]">
          <nav className="flex gap-6">
            {[
              {id: 'overview', label: 'Overview', icon: TrendingUp},
              {id: 'employees', label: 'By Employee', icon: User},
              {id: 'departments', label: 'By Department', icon: Building2},
              {id: 'projects', label: 'By Project', icon: FolderOpen},
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`flex items-center gap-2 px-1 py-4 border-b-2 transition-colors ${activeTab === tab.id
                  ? 'border-accent-500 text-accent-700 dark:text-accent-400'
                  : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)] dark:hover:text-[var(--text-muted)]'
                }`}
              >
                <tab.icon className="h-4 w-4"/>
                <span className="font-medium">{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <motion.div
          key={activeTab}
          initial={{opacity: 0, y: 10}}
          animate={{opacity: 1, y: 0}}
          transition={{duration: 0.2}}
        >
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top Performers */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ArrowUpRight className='h-5 w-5 text-status-success-text'/>
                    Top Performers
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {dashboardData.topPerformers.slice(0, 5).map((emp, index) => (
                      <div
                        key={emp.employeeId}
                        className="flex items-center gap-4 p-4 rounded-lg bg-[var(--bg-secondary)]/50"
                      >
                        <div
                          className='flex items-center justify-center w-8 h-8 rounded-full bg-status-success-bg text-status-success-text text-sm font-bold'>
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-[var(--text-primary)] truncate">
                            {emp.employeeName}
                          </p>
                          <p className="text-body-muted truncate">
                            {emp.designation} - {emp.departmentName}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className={`font-semibold ${getUtilizationColor(emp.utilizationRate)}`}>
                            {formatPercentage(emp.utilizationRate)}
                          </p>
                          <p className="text-caption">
                            {formatHours(emp.billableHours)} billable
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Under-Utilized */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ArrowDownRight className='h-5 w-5 text-status-danger-text'/>
                    Under-Utilized Resources
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {dashboardData.underUtilized.map((emp) => (
                      <div
                        key={emp.employeeId}
                        className="flex items-center gap-4 p-4 rounded-lg bg-[var(--bg-secondary)]/50"
                      >
                        <div
                          className='w-10 h-10 rounded-full bg-status-danger-bg flex items-center justify-center'>
                          <User className='h-5 w-5 text-status-danger-text'/>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-[var(--text-primary)] truncate">
                            {emp.employeeName}
                          </p>
                          <p className="text-body-muted truncate">
                            {emp.designation} - {emp.departmentName}
                          </p>
                        </div>
                        <div className="w-32">
                          <UtilizationBar rate={emp.utilizationRate}/>
                        </div>
                      </div>
                    ))}
                    {dashboardData.underUtilized.length === 0 && (
                      <p className="text-center text-[var(--text-muted)] py-8">
                        All employees are well-utilized!
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Department Breakdown */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className='h-5 w-5 text-accent'/>
                    Department Utilization
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {dashboardData.byDepartment.map((dept) => (
                      <div
                        key={dept.departmentId}
                        className='p-4 rounded-lg border border-[var(--border-main)] hover:border-[var(--accent-primary)] transition-colors'
                      >
                        <div className="row-between mb-4">
                          <h4 className="font-medium text-[var(--text-primary)]">
                            {dept.departmentName}
                          </h4>
                          <Badge variant="secondary">{dept.employeeCount} members</Badge>
                        </div>
                        <UtilizationBar rate={dept.averageUtilization}/>
                        <div className="mt-4 flex justify-between text-body-muted">
                          <span>{formatHours(dept.billableHours)} billable</span>
                          <span>of {formatHours(dept.totalHours)} total</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'employees' && (
            <Card>
              <CardHeader>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <CardTitle>Employee Utilization</CardTitle>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]"/>
                    <input
                      type="text"
                      placeholder="Search employees..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 pr-4 py-2 bg-[var(--bg-input)] border border-[var(--border-main)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent-500"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                    <tr className="border-b border-[var(--border-main)]">
                      <th className="text-left py-2 px-4 text-sm font-medium text-[var(--text-muted)]">Employee</th>
                      <th className="text-left py-2 px-4 text-sm font-medium text-[var(--text-muted)]">Department</th>
                      <th className="text-right py-2 px-4 text-sm font-medium text-[var(--text-muted)]">Total Hours</th>
                      <th className="text-right py-2 px-4 text-sm font-medium text-[var(--text-muted)]">Billable Hours
                      </th>
                      <th
                        className="text-left py-2 px-4 text-sm font-medium text-[var(--text-muted)] w-48">Utilization
                      </th>
                      <th className="text-right py-2 px-4 text-sm font-medium text-[var(--text-muted)]">Billable Rate
                      </th>
                    </tr>
                    </thead>
                    <tbody>
                    {filteredEmployees.map((emp) => (
                      <tr
                        key={emp.employeeId}
                        className="border-b border-[var(--border-main)] hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)]/50"
                      >
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-4">
                            <div
                              className='w-8 h-8 rounded-full bg-accent-subtle flex items-center justify-center text-accent text-sm font-medium'>
                              {emp.employeeName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                            </div>
                            <div>
                              <p className="font-medium text-[var(--text-primary)]">{emp.employeeName}</p>
                              <p className="text-caption">{emp.employeeCode}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-[var(--text-secondary)]">{emp.departmentName}</td>
                        <td
                          className="py-4 px-4 text-right text-[var(--text-primary)]">{formatHours(emp.totalHours)}</td>
                        <td
                          className="py-4 px-4 text-right text-[var(--text-primary)]">{formatHours(emp.billableHours)}</td>
                        <td className="py-4 px-4">
                          <UtilizationBar rate={emp.utilizationRate}/>
                        </td>
                        <td className={`py-4 px-4 text-right font-medium ${getUtilizationColor(emp.billableRate)}`}>
                          {formatPercentage(emp.billableRate)}
                        </td>
                      </tr>
                    ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'departments' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {dashboardData.byDepartment.map((dept) => (
                <Card key={dept.departmentId}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-xl font-semibold text-[var(--text-primary)]">
                          {dept.departmentName}
                        </h3>
                        <p className="text-body-muted">{dept.employeeCount} employees</p>
                      </div>
                      <div
                        className={`px-4 py-1 rounded-full text-sm font-medium ${getUtilizationBgColor(dept.averageUtilization)} ${getUtilizationColor(dept.averageUtilization)}`}>
                        {formatPercentage(dept.averageUtilization)}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-[var(--text-muted)]">Billable Hours</span>
                          <span className="font-medium text-[var(--text-primary)]">
                            {formatHours(dept.billableHours)}
                          </span>
                        </div>
                        <div
                          className="h-2 bg-[var(--bg-secondary)] dark:bg-[var(--bg-secondary)] rounded-full overflow-hidden">
                          <div
                            className='h-full bg-status-success-bg rounded-full'
                            style={{width: `${(dept.billableHours / dept.totalHours) * 100}%`}}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-[var(--text-muted)]">Non-Billable Hours</span>
                          <span className="font-medium text-[var(--text-primary)]">
                            {formatHours(dept.totalHours - dept.billableHours)}
                          </span>
                        </div>
                        <div
                          className="h-2 bg-[var(--bg-secondary)] dark:bg-[var(--bg-secondary)] rounded-full overflow-hidden">
                          <div
                            className='h-full bg-status-warning-bg rounded-full'
                            style={{width: `${((dept.totalHours - dept.billableHours) / dept.totalHours) * 100}%`}}
                          />
                        </div>
                      </div>

                      <div className="pt-4 border-t border-[var(--border-main)]">
                        <div className="flex justify-between">
                          <span className="text-body-muted">Total Hours</span>
                          <span className="font-semibold text-[var(--text-primary)]">
                            {formatHours(dept.totalHours)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {activeTab === 'projects' && (
            <Card>
              <CardHeader>
                <CardTitle>Project Utilization</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                    <tr className="border-b border-[var(--border-main)]">
                      <th className="text-left py-2 px-4 text-sm font-medium text-[var(--text-muted)]">Project</th>
                      <th className="text-center py-2 px-4 text-sm font-medium text-[var(--text-muted)]">Team Size</th>
                      <th className="text-right py-2 px-4 text-sm font-medium text-[var(--text-muted)]">Total Hours</th>
                      <th className="text-right py-2 px-4 text-sm font-medium text-[var(--text-muted)]">Billable Hours
                      </th>
                      <th
                        className="text-left py-2 px-4 text-sm font-medium text-[var(--text-muted)] w-48">Utilization
                      </th>
                      <th className="text-right py-2 px-4 text-sm font-medium text-[var(--text-muted)]">Revenue</th>
                    </tr>
                    </thead>
                    <tbody>
                    {dashboardData.byProject.map((project) => (
                      <tr
                        key={project.projectId}
                        className="border-b border-[var(--border-main)] hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)]/50"
                      >
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-4">
                            <div
                              className='w-10 h-10 rounded-lg bg-accent-subtle flex items-center justify-center'>
                              <FolderOpen className='h-5 w-5 text-accent'/>
                            </div>
                            <span className="font-medium text-[var(--text-primary)]">
                                {project.projectName}
                              </span>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <Badge variant="secondary">{project.teamSize}</Badge>
                        </td>
                        <td className="py-4 px-4 text-right text-[var(--text-primary)]">
                          {formatHours(project.totalHours)}
                        </td>
                        <td className="py-4 px-4 text-right text-[var(--text-primary)]">
                          {formatHours(project.billableHours)}
                        </td>
                        <td className="py-4 px-4">
                          <UtilizationBar rate={project.utilizationRate}/>
                        </td>
                        <td className='py-4 px-4 text-right font-semibold text-status-success-text'>
                          {formatCurrency(project.billedAmount)}
                        </td>
                      </tr>
                    ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </motion.div>
      </div>
    </AppLayout>
  );
}
