'use client';

import {useMemo, useState} from 'react';
import dynamic from 'next/dynamic';
import {AppLayout} from '@/components/layout';
import {BarChart3, Calendar, PieChart, TrendingUp} from 'lucide-react';
import {PermissionGate} from '@/components/auth/PermissionGate';
import {Permissions} from '@/lib/hooks/usePermissions';
import {useExpenseReport} from '@/lib/hooks/queries';
import {endOfMonth, format, startOfMonth, subMonths} from 'date-fns';

// Chart skeleton displayed while the recharts bundle lazy-loads.
// Recharts uses browser-only SVG/ResizeObserver APIs so ssr: false is required.
const ChartSkeleton = () => (
  <div className='w-full h-[300px] animate-pulse bg-surface rounded-lg'/>
);

const ExpenseTrendChart = dynamic(
  () => import('./ExpenseCharts').then(m => ({default: m.ExpenseTrendChart})),
  {ssr: false, loading: ChartSkeleton}
);
const ExpenseCategoryChart = dynamic(
  () => import('./ExpenseCharts').then(m => ({default: m.ExpenseCategoryChart})),
  {ssr: false, loading: ChartSkeleton}
);
const ExpenseStatusChart = dynamic(
  () => import('./ExpenseCharts').then(m => ({default: m.ExpenseStatusChart})),
  {ssr: false, loading: ChartSkeleton}
);

export default function ExpenseReportsPage() {
  const [startDate, setStartDate] = useState(
    format(startOfMonth(subMonths(new Date(), 5)), 'yyyy-MM-dd')
  );
  const [endDate, setEndDate] = useState(
    format(endOfMonth(new Date()), 'yyyy-MM-dd')
  );

  const {data: report, isLoading} = useExpenseReport(startDate, endDate, true);

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
        fallback={<div className='p-8 text-center text-muted'>You do not have permission to view expense
          reports.</div>}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className='text-2xl font-bold text-primary flex items-center gap-2'>
                <BarChart3 className="w-6 h-6"/>
                Expense Reports
              </h1>
              <p className='text-muted mt-1'>Organization-wide expense analytics</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Calendar className='w-4 h-4 text-muted'/>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className='px-4 py-1.5 border border-subtle rounded-lg bg-[var(--bg-input)] text-sm text-primary focus:outline-none focus:ring-2 focus:ring-accent-700'
                />
                <span className='text-muted'>to</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className='px-4 py-1.5 border border-subtle rounded-lg bg-[var(--bg-input)] text-sm text-primary focus:outline-none focus:ring-2 focus:ring-accent-700'
                />
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className='animate-spin rounded-full h-8 w-8 border-t-2 border-[var(--accent-primary)]'/>
            </div>
          ) : !report ? (
            <div className='text-center py-20 text-muted'>No report data available.</div>
          ) : (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className='bg-[var(--bg-input)] border border-subtle rounded-lg p-6'>
                  <p className='text-sm text-muted mb-1'>Total Claims</p>
                  <p className='text-3xl font-bold text-primary'>{report.totalClaims}</p>
                </div>
                <div className='bg-[var(--bg-input)] border border-subtle rounded-lg p-6'>
                  <p className='text-sm text-muted mb-1'>Total Amount</p>
                  <p className='text-3xl font-bold text-primary'>
                    {new Intl.NumberFormat('en-IN', {
                      style: 'currency',
                      currency: 'INR',
                      maximumFractionDigits: 0
                    }).format(report.totalAmount)}
                  </p>
                </div>
                <div className='bg-[var(--bg-input)] border border-subtle rounded-lg p-6'>
                  <p className='text-sm text-muted mb-1'>Avg per Claim</p>
                  <p className='text-3xl font-bold text-primary'>
                    {report.totalClaims > 0
                      ? new Intl.NumberFormat('en-IN', {
                        style: 'currency',
                        currency: 'INR',
                        maximumFractionDigits: 0
                      }).format(report.totalAmount / report.totalClaims)
                      : '-'}
                  </p>
                </div>
                <div className='bg-[var(--bg-input)] border border-subtle rounded-lg p-6'>
                  <p className='text-sm text-muted mb-1'>Categories</p>
                  <p className='text-3xl font-bold text-primary'>{categoryChartData.length}</p>
                </div>
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Monthly Trend */}
                <div className='bg-[var(--bg-input)] border border-subtle rounded-lg p-6'>
                  <h3 className='font-semibold text-primary mb-4 flex items-center gap-2'>
                    <TrendingUp className="w-4 h-4"/>
                    Monthly Trend
                  </h3>
                  {trendData.length > 0 ? (
                    <ExpenseTrendChart data={trendData}/>
                  ) : (
                    <p className='text-center text-muted py-12'>No trend data</p>
                  )}
                </div>

                {/* By Category Pie */}
                <div className='bg-[var(--bg-input)] border border-subtle rounded-lg p-6'>
                  <h3 className='font-semibold text-primary mb-4 flex items-center gap-2'>
                    <PieChart className="w-4 h-4"/>
                    By Category
                  </h3>
                  {categoryChartData.length > 0 ? (
                    <ExpenseCategoryChart data={categoryChartData}/>
                  ) : (
                    <p className='text-center text-muted py-12'>No category data</p>
                  )}
                </div>
              </div>

              {/* Status Breakdown */}
              <div className='bg-[var(--bg-input)] border border-subtle rounded-lg p-6'>
                <h3 className='font-semibold text-primary mb-4 flex items-center gap-2'>
                  <BarChart3 className="w-4 h-4"/>
                  By Status
                </h3>
                {statusChartData.length > 0 ? (
                  <ExpenseStatusChart data={statusChartData}/>
                ) : (
                  <p className='text-center text-muted py-12'>No status data</p>
                )}
              </div>
            </>
          )}
        </div>
      </PermissionGate>
    </AppLayout>
  );
}
