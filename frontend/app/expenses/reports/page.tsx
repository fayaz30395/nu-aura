'use client';

import { useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { AppLayout } from '@/components/layout';
import { BarChart3, PieChart, TrendingUp, Download, Calendar, Filter } from 'lucide-react';
import { PermissionGate } from '@/components/auth/PermissionGate';
import { Permissions } from '@/lib/hooks/usePermissions';
import { useExpenseReport } from '@/lib/hooks/queries';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';

// Chart skeleton displayed while the recharts bundle lazy-loads.
// Recharts uses browser-only SVG/ResizeObserver APIs so ssr: false is required.
const ChartSkeleton = () => (
  <div className="w-full h-[300px] animate-pulse bg-surface-100 dark:bg-surface-800 rounded-lg" />
);

const ExpenseTrendChart = dynamic(
  () => import('./ExpenseCharts').then(m => ({ default: m.ExpenseTrendChart })),
  { ssr: false, loading: ChartSkeleton }
);
const ExpenseCategoryChart = dynamic(
  () => import('./ExpenseCharts').then(m => ({ default: m.ExpenseCategoryChart })),
  { ssr: false, loading: ChartSkeleton }
);
const ExpenseStatusChart = dynamic(
  () => import('./ExpenseCharts').then(m => ({ default: m.ExpenseStatusChart })),
  { ssr: false, loading: ChartSkeleton }
);

export default function ExpenseReportsPage() {
  const [startDate, setStartDate] = useState(
    format(startOfMonth(subMonths(new Date(), 5)), 'yyyy-MM-dd')
  );
  const [endDate, setEndDate] = useState(
    format(endOfMonth(new Date()), 'yyyy-MM-dd')
  );

  const { data: report, isLoading } = useExpenseReport(startDate, endDate, true);

  const categoryChartData = useMemo(() => {
    if (!report?.byCategory) return [];
    return Object.entries(report.byCategory).map(([name, data]) => ({
      name: name.replace(/_/g, ' '),
      amount: data.amount,
      count: data.count,
    }));
  }, [report]);

  const statusChartData = useMemo(() => {
    if (!report?.byStatus) return [];
    return Object.entries(report.byStatus).map(([name, data]) => ({
      name: name.replace(/_/g, ' '),
      amount: data.amount,
      count: data.count,
    }));
  }, [report]);

  const trendData = useMemo(() => {
    if (!report?.monthlyTrend) return [];
    return report.monthlyTrend.map((item) => ({
      month: format(new Date(item.month), 'MMM yy'),
      amount: item.amount,
      count: item.count,
    }));
  }, [report]);

  return (
    <AppLayout>
      <PermissionGate
        permission={Permissions.EXPENSE_VIEW_ALL}
        fallback={<div className="p-8 text-center text-surface-500">You do not have permission to view expense reports.</div>}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-50 flex items-center gap-2">
                <BarChart3 className="w-6 h-6" />
                Expense Reports
              </h1>
              <p className="text-surface-500 mt-1">Organization-wide expense analytics</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-surface-500" />
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="px-4 py-1.5 border border-surface-300 dark:border-surface-600 rounded-lg bg-[var(--bg-input)] text-sm text-surface-900 dark:text-surface-50 focus:outline-none focus:ring-2 focus:ring-accent-700"
                />
                <span className="text-surface-400">to</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="px-4 py-1.5 border border-surface-300 dark:border-surface-600 rounded-lg bg-[var(--bg-input)] text-sm text-surface-900 dark:text-surface-50 focus:outline-none focus:ring-2 focus:ring-accent-700"
                />
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-accent-700" />
            </div>
          ) : !report ? (
            <div className="text-center py-20 text-surface-500">No report data available.</div>
          ) : (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-[var(--bg-input)] border border-surface-200 dark:border-surface-700 rounded-lg p-6">
                  <p className="text-sm text-surface-500 mb-1">Total Claims</p>
                  <p className="text-3xl font-bold text-surface-900 dark:text-surface-50">{report.totalClaims}</p>
                </div>
                <div className="bg-[var(--bg-input)] border border-surface-200 dark:border-surface-700 rounded-lg p-6">
                  <p className="text-sm text-surface-500 mb-1">Total Amount</p>
                  <p className="text-3xl font-bold text-surface-900 dark:text-surface-50">
                    {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(report.totalAmount)}
                  </p>
                </div>
                <div className="bg-[var(--bg-input)] border border-surface-200 dark:border-surface-700 rounded-lg p-6">
                  <p className="text-sm text-surface-500 mb-1">Avg per Claim</p>
                  <p className="text-3xl font-bold text-surface-900 dark:text-surface-50">
                    {report.totalClaims > 0
                      ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(report.totalAmount / report.totalClaims)
                      : '-'}
                  </p>
                </div>
                <div className="bg-[var(--bg-input)] border border-surface-200 dark:border-surface-700 rounded-lg p-6">
                  <p className="text-sm text-surface-500 mb-1">Categories</p>
                  <p className="text-3xl font-bold text-surface-900 dark:text-surface-50">{categoryChartData.length}</p>
                </div>
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Monthly Trend */}
                <div className="bg-[var(--bg-input)] border border-surface-200 dark:border-surface-700 rounded-lg p-6">
                  <h3 className="font-semibold text-surface-900 dark:text-surface-50 mb-4 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    Monthly Trend
                  </h3>
                  {trendData.length > 0 ? (
                    <ExpenseTrendChart data={trendData} />
                  ) : (
                    <p className="text-center text-surface-500 py-12">No trend data</p>
                  )}
                </div>

                {/* By Category Pie */}
                <div className="bg-[var(--bg-input)] border border-surface-200 dark:border-surface-700 rounded-lg p-6">
                  <h3 className="font-semibold text-surface-900 dark:text-surface-50 mb-4 flex items-center gap-2">
                    <PieChart className="w-4 h-4" />
                    By Category
                  </h3>
                  {categoryChartData.length > 0 ? (
                    <ExpenseCategoryChart data={categoryChartData} />
                  ) : (
                    <p className="text-center text-surface-500 py-12">No category data</p>
                  )}
                </div>
              </div>

              {/* Status Breakdown */}
              <div className="bg-[var(--bg-input)] border border-surface-200 dark:border-surface-700 rounded-lg p-6">
                <h3 className="font-semibold text-surface-900 dark:text-surface-50 mb-4 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" />
                  By Status
                </h3>
                {statusChartData.length > 0 ? (
                  <ExpenseStatusChart data={statusChartData} />
                ) : (
                  <p className="text-center text-surface-500 py-12">No status data</p>
                )}
              </div>
            </>
          )}
        </div>
      </PermissionGate>
    </AppLayout>
  );
}
