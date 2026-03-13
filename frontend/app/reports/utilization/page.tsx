'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { AppLayout } from '@/components/layout';
import {
  Clock,
  Users,
  TrendingUp,
  DollarSign,
  Calendar,
  ChevronDown,
  Download,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  Building2,
  FolderOpen,
  User,
  Search,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  EmployeeUtilization,
  DepartmentUtilization,
  ProjectUtilization,
  UtilizationTrend,
  getUtilizationColor,
  getUtilizationBgColor,
  formatHours,
  formatPercentage,
  formatCurrency,
  UtilizationDashboardData,
} from '@/lib/types/utilization';
import { utilizationService, getDateRanges } from '@/lib/services/utilization.service';



type DateRangeKey = 'thisWeek' | 'lastWeek' | 'thisMonth' | 'lastMonth' | 'thisQuarter' | 'thisYear' | 'custom';

export default function UtilizationReportsPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDateRange, setSelectedDateRange] = useState<DateRangeKey>('thisMonth');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'employees' | 'departments' | 'projects'>('overview');

  const dateRanges = useMemo(() => getDateRanges(), []);

  const currentRange = useMemo(() => {
    if (selectedDateRange === 'custom') {
      return { startDate: customStartDate, endDate: customEndDate, label: 'Custom Range' };
    }
    return dateRanges[selectedDateRange];
  }, [selectedDateRange, customStartDate, customEndDate, dateRanges]);

  // Initialize with null or empty structure
  const [dashboardData, setDashboardData] = useState<UtilizationDashboardData | null>(null);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await utilizationService.getDashboardData({
        startDate: currentRange.startDate,
        endDate: currentRange.endDate,
      });
      setDashboardData(data);
    } catch (err: unknown) {
      console.error('Error fetching dashboard data:', err);
      setError('Failed to load utilization data. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [currentRange]);

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
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-surface-500 dark:text-surface-400">{title}</p>
            <p className="text-3xl font-bold text-surface-900 dark:text-white">{value}</p>
            {subValue && (
              <p className="text-sm text-surface-500 dark:text-surface-400">{subValue}</p>
            )}
            {trend && (
              <div className="flex items-center gap-1">
                {trendDirection === 'up' ? (
                  <ArrowUpRight className="h-4 w-4 text-green-500" />
                ) : (
                  <ArrowDownRight className="h-4 w-4 text-red-500" />
                )}
                <span
                  className={`text-sm font-medium ${trendDirection === 'up' ? 'text-green-500' : 'text-red-500'
                    }`}
                >
                  {trend}
                </span>
              </div>
            )}
          </div>
          <div className={`p-3 rounded-xl ${color}`}>
            <Icon className="h-6 w-6 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );



  const UtilizationBar = ({ rate }: { rate: number }) => (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 bg-surface-100 dark:bg-surface-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${rate >= 90 ? 'bg-green-500' :
            rate >= 75 ? 'bg-blue-500' :
              rate >= 50 ? 'bg-yellow-500' :
                'bg-red-500'
            }`}
          style={{ width: `${Math.min(rate, 100)}%` }}
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
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-10 w-24" />
        </div>
      </div>

      {/* Stats Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-32 rounded-xl" />
        ))}
      </div>

      {/* Tabs Skeleton */}
      <div className="flex gap-6 border-b border-surface-200 dark:border-surface-700 pb-1">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-10 w-24" />
        ))}
      </div>

      {/* Content Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Skeleton className="h-96 rounded-xl" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    </div>
  );

  if (loading && !dashboardData) {
    return (
      <AppLayout activeMenuItem="reports">
        <div className="p-6">
          <LoadingSkeleton />
        </div>
      </AppLayout>
    );
  }

  if (!dashboardData && !loading) {
    return (
      <AppLayout activeMenuItem="reports">
        <div className="p-6 flex flex-col items-center justify-center h-[60vh]">
          <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
          <h2 className="text-xl font-bold text-surface-900 dark:text-white">Failed to load data</h2>
          <p className="text-surface-500 mt-2">{error || 'Unknown error occurred'}</p>
          <button
            onClick={fetchDashboardData}
            className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            Retry
          </button>
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
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row md:items-center md:justify-between gap-4"
        >
          <div>
            <h1 className="text-3xl font-bold text-surface-900 dark:text-white">
              Utilization Dashboard
            </h1>
            <p className="text-surface-600 dark:text-surface-400 mt-1">
              Track employee productivity and resource utilization
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Date Range Selector */}
            <div className="relative">
              <select
                value={selectedDateRange}
                onChange={(e) => setSelectedDateRange(e.target.value as DateRangeKey)}
                className="appearance-none pl-4 pr-10 py-2 bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="thisWeek">This Week</option>
                <option value="lastWeek">Last Week</option>
                <option value="thisMonth">This Month</option>
                <option value="lastMonth">Last Month</option>
                <option value="thisQuarter">This Quarter</option>
                <option value="thisYear">This Year</option>
                <option value="custom">Custom Range</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400 pointer-events-none" />
            </div>

            {selectedDateRange === 'custom' && (
              <>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="px-3 py-2 bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <span className="text-surface-400">to</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="px-3 py-2 bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </>
            )}

            <button
              onClick={fetchDashboardData}
              disabled={loading}
              className="p-2 bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg hover:bg-surface-50 dark:hover:bg-surface-700 transition-colors"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            <button className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
              <Download className="h-4 w-4" />
              Export
            </button>
          </div>
        </motion.div>

        {/* Error Alert */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-3"
          >
            <AlertCircle className="h-5 w-5 text-red-500" />
            <span className="text-red-700 dark:text-red-400">{error}</span>
          </motion.div>
        )}

        {/* Stats Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          <StatCard
            title="Average Utilization"
            value={formatPercentage(dashboardData.summary.averageUtilization)}
            icon={TrendingUp}
            trend="+5.2% vs last period"
            trendDirection="up"
            color="bg-gradient-to-br from-blue-500 to-blue-600"
          />
          <StatCard
            title="Billable Hours"
            value={formatHours(dashboardData.summary.totalBillableHours)}
            subValue={`of ${formatHours(dashboardData.summary.totalBillableHours + dashboardData.summary.totalNonBillableHours)} total`}
            icon={Clock}
            color="bg-gradient-to-br from-green-500 to-green-600"
          />
          <StatCard
            title="Active Resources"
            value={dashboardData.summary.totalEmployees}
            subValue="employees tracked"
            icon={Users}
            color="bg-gradient-to-br from-purple-500 to-purple-600"
          />
          <StatCard
            title="Revenue Generated"
            value={formatCurrency(dashboardData.summary.billedAmount)}
            icon={DollarSign}
            trend="+12.3% vs last period"
            trendDirection="up"
            color="bg-gradient-to-br from-amber-500 to-amber-600"
          />
        </motion.div>

        {/* Tabs */}
        <div className="border-b border-surface-200 dark:border-surface-700">
          <nav className="flex gap-6">
            {[
              { id: 'overview', label: 'Overview', icon: TrendingUp },
              { id: 'employees', label: 'By Employee', icon: User },
              { id: 'departments', label: 'By Department', icon: Building2 },
              { id: 'projects', label: 'By Project', icon: FolderOpen },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`flex items-center gap-2 px-1 py-3 border-b-2 transition-colors ${activeTab === tab.id
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-surface-500 hover:text-surface-700 dark:hover:text-surface-300'
                  }`}
              >
                <tab.icon className="h-4 w-4" />
                <span className="font-medium">{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top Performers */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ArrowUpRight className="h-5 w-5 text-green-500" />
                    Top Performers
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {dashboardData.topPerformers.slice(0, 5).map((emp, index) => (
                      <div
                        key={emp.employeeId}
                        className="flex items-center gap-4 p-3 rounded-lg bg-surface-50 dark:bg-surface-800/50"
                      >
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 text-sm font-bold">
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-surface-900 dark:text-white truncate">
                            {emp.employeeName}
                          </p>
                          <p className="text-sm text-surface-500 truncate">
                            {emp.designation} - {emp.departmentName}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className={`font-semibold ${getUtilizationColor(emp.utilizationRate)}`}>
                            {formatPercentage(emp.utilizationRate)}
                          </p>
                          <p className="text-xs text-surface-500">
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
                    <ArrowDownRight className="h-5 w-5 text-red-500" />
                    Under-Utilized Resources
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {dashboardData.underUtilized.map((emp) => (
                      <div
                        key={emp.employeeId}
                        className="flex items-center gap-4 p-3 rounded-lg bg-surface-50 dark:bg-surface-800/50"
                      >
                        <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                          <User className="h-5 w-5 text-red-600 dark:text-red-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-surface-900 dark:text-white truncate">
                            {emp.employeeName}
                          </p>
                          <p className="text-sm text-surface-500 truncate">
                            {emp.designation} - {emp.departmentName}
                          </p>
                        </div>
                        <div className="w-32">
                          <UtilizationBar rate={emp.utilizationRate} />
                        </div>
                      </div>
                    ))}
                    {dashboardData.underUtilized.length === 0 && (
                      <p className="text-center text-surface-500 py-8">
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
                    <Building2 className="h-5 w-5 text-primary-500" />
                    Department Utilization
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {dashboardData.byDepartment.map((dept) => (
                      <div
                        key={dept.departmentId}
                        className="p-4 rounded-lg border border-surface-200 dark:border-surface-700 hover:border-primary-300 dark:hover:border-primary-700 transition-colors"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-medium text-surface-900 dark:text-white">
                            {dept.departmentName}
                          </h4>
                          <Badge variant="secondary">{dept.employeeCount} members</Badge>
                        </div>
                        <UtilizationBar rate={dept.averageUtilization} />
                        <div className="mt-3 flex justify-between text-sm text-surface-500">
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
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400" />
                    <input
                      type="text"
                      placeholder="Search employees..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 pr-4 py-2 bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-surface-200 dark:border-surface-700">
                        <th className="text-left py-3 px-4 text-sm font-medium text-surface-500">Employee</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-surface-500">Department</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-surface-500">Total Hours</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-surface-500">Billable Hours</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-surface-500 w-48">Utilization</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-surface-500">Billable Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredEmployees.map((emp) => (
                        <tr
                          key={emp.employeeId}
                          className="border-b border-surface-100 dark:border-surface-800 hover:bg-surface-50 dark:hover:bg-surface-800/50"
                        >
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-700 dark:text-primary-300 text-sm font-medium">
                                {emp.employeeName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                              </div>
                              <div>
                                <p className="font-medium text-surface-900 dark:text-white">{emp.employeeName}</p>
                                <p className="text-xs text-surface-500">{emp.employeeCode}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-surface-600 dark:text-surface-400">{emp.departmentName}</td>
                          <td className="py-3 px-4 text-right text-surface-900 dark:text-white">{formatHours(emp.totalHours)}</td>
                          <td className="py-3 px-4 text-right text-surface-900 dark:text-white">{formatHours(emp.billableHours)}</td>
                          <td className="py-3 px-4">
                            <UtilizationBar rate={emp.utilizationRate} />
                          </td>
                          <td className={`py-3 px-4 text-right font-medium ${getUtilizationColor(emp.billableRate)}`}>
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
                        <h3 className="text-lg font-semibold text-surface-900 dark:text-white">
                          {dept.departmentName}
                        </h3>
                        <p className="text-sm text-surface-500">{dept.employeeCount} employees</p>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-sm font-medium ${getUtilizationBgColor(dept.averageUtilization)} ${getUtilizationColor(dept.averageUtilization)}`}>
                        {formatPercentage(dept.averageUtilization)}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-surface-500">Billable Hours</span>
                          <span className="font-medium text-surface-900 dark:text-white">
                            {formatHours(dept.billableHours)}
                          </span>
                        </div>
                        <div className="h-2 bg-surface-100 dark:bg-surface-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-green-500 rounded-full"
                            style={{ width: `${(dept.billableHours / dept.totalHours) * 100}%` }}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-surface-500">Non-Billable Hours</span>
                          <span className="font-medium text-surface-900 dark:text-white">
                            {formatHours(dept.totalHours - dept.billableHours)}
                          </span>
                        </div>
                        <div className="h-2 bg-surface-100 dark:bg-surface-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-yellow-500 rounded-full"
                            style={{ width: `${((dept.totalHours - dept.billableHours) / dept.totalHours) * 100}%` }}
                          />
                        </div>
                      </div>

                      <div className="pt-3 border-t border-surface-200 dark:border-surface-700">
                        <div className="flex justify-between">
                          <span className="text-sm text-surface-500">Total Hours</span>
                          <span className="font-semibold text-surface-900 dark:text-white">
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
                      <tr className="border-b border-surface-200 dark:border-surface-700">
                        <th className="text-left py-3 px-4 text-sm font-medium text-surface-500">Project</th>
                        <th className="text-center py-3 px-4 text-sm font-medium text-surface-500">Team Size</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-surface-500">Total Hours</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-surface-500">Billable Hours</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-surface-500 w-48">Utilization</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-surface-500">Revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dashboardData.byProject.map((project) => (
                        <tr
                          key={project.projectId}
                          className="border-b border-surface-100 dark:border-surface-800 hover:bg-surface-50 dark:hover:bg-surface-800/50"
                        >
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                                <FolderOpen className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                              </div>
                              <span className="font-medium text-surface-900 dark:text-white">
                                {project.projectName}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <Badge variant="secondary">{project.teamSize}</Badge>
                          </td>
                          <td className="py-3 px-4 text-right text-surface-900 dark:text-white">
                            {formatHours(project.totalHours)}
                          </td>
                          <td className="py-3 px-4 text-right text-surface-900 dark:text-white">
                            {formatHours(project.billableHours)}
                          </td>
                          <td className="py-3 px-4">
                            <UtilizationBar rate={project.utilizationRate} />
                          </td>
                          <td className="py-3 px-4 text-right font-semibold text-green-600 dark:text-green-400">
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
