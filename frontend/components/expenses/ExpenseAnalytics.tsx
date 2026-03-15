'use client';

import { useState, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  PieChart,
  BarChart2,
  Calendar,
  Users,
  ArrowRight,
} from 'lucide-react';
import { ExpenseClaim, ExpenseCategory } from '@/lib/types/expense';
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns';

interface ExpenseAnalyticsProps {
  claims: ExpenseClaim[];
  className?: string;
}

interface CategoryData {
  category: ExpenseCategory;
  amount: number;
  count: number;
  percentage: number;
  color: string;
}

interface MonthlyData {
  month: string;
  amount: number;
  count: number;
}

interface TopSpender {
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  totalAmount: number;
  claimCount: number;
}

const CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  TRAVEL: '#3b82f6',
  ACCOMMODATION: '#8b5cf6',
  MEALS: '#f59e0b',
  TRANSPORTATION: '#10b981',
  OFFICE_SUPPLIES: '#6366f1',
  EQUIPMENT: '#ec4899',
  TRAINING: '#14b8a6',
  COMMUNICATION: '#f97316',
  ENTERTAINMENT: '#a855f7',
  MEDICAL: '#ef4444',
  OTHER: '#6b7280',
};

const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  TRAVEL: 'Travel',
  ACCOMMODATION: 'Accommodation',
  MEALS: 'Meals',
  TRANSPORTATION: 'Transportation',
  OFFICE_SUPPLIES: 'Office Supplies',
  EQUIPMENT: 'Equipment',
  TRAINING: 'Training',
  COMMUNICATION: 'Communication',
  ENTERTAINMENT: 'Entertainment',
  MEDICAL: 'Medical',
  OTHER: 'Other',
};

export function ExpenseAnalytics({ claims, className = '' }: ExpenseAnalyticsProps) {
  const [timeRange, setTimeRange] = useState<'3m' | '6m' | '12m'>('6m');

  // Filter claims based on time range
  const filteredClaims = useMemo(() => {
    const months = timeRange === '3m' ? 3 : timeRange === '6m' ? 6 : 12;
    const startDate = startOfMonth(subMonths(new Date(), months - 1));
    const endDate = endOfMonth(new Date());

    return claims.filter((claim) => {
      const claimDate = parseISO(claim.claimDate);
      return isWithinInterval(claimDate, { start: startDate, end: endDate });
    });
  }, [claims, timeRange]);

  // Calculate category breakdown
  const categoryData = useMemo<CategoryData[]>(() => {
    const totals: Record<string, { amount: number; count: number }> = {};

    filteredClaims.forEach((claim) => {
      if (!totals[claim.category]) {
        totals[claim.category] = { amount: 0, count: 0 };
      }
      totals[claim.category].amount += claim.amount;
      totals[claim.category].count += 1;
    });

    const totalAmount = Object.values(totals).reduce((sum, t) => sum + t.amount, 0);

    return Object.entries(totals)
      .map(([category, data]) => ({
        category: category as ExpenseCategory,
        amount: data.amount,
        count: data.count,
        percentage: totalAmount > 0 ? (data.amount / totalAmount) * 100 : 0,
        color: CATEGORY_COLORS[category as ExpenseCategory] || '#6b7280',
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [filteredClaims]);

  // Calculate monthly trends
  const monthlyData = useMemo<MonthlyData[]>(() => {
    const months = timeRange === '3m' ? 3 : timeRange === '6m' ? 6 : 12;
    const data: MonthlyData[] = [];

    for (let i = months - 1; i >= 0; i--) {
      const monthDate = subMonths(new Date(), i);
      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);

      const monthClaims = claims.filter((claim) => {
        const claimDate = parseISO(claim.claimDate);
        return isWithinInterval(claimDate, { start: monthStart, end: monthEnd });
      });

      data.push({
        month: format(monthDate, 'MMM yyyy'),
        amount: monthClaims.reduce((sum, c) => sum + c.amount, 0),
        count: monthClaims.length,
      });
    }

    return data;
  }, [claims, timeRange]);

  // Calculate top spenders
  const topSpenders = useMemo<TopSpender[]>(() => {
    const spenderMap: Record<string, TopSpender> = {};

    filteredClaims.forEach((claim) => {
      if (!claim.employeeId) return;

      if (!spenderMap[claim.employeeId]) {
        spenderMap[claim.employeeId] = {
          employeeId: claim.employeeId,
          employeeName: claim.employeeName || 'Unknown',
          employeeCode: claim.employeeCode || '',
          totalAmount: 0,
          claimCount: 0,
        };
      }
      spenderMap[claim.employeeId].totalAmount += claim.amount;
      spenderMap[claim.employeeId].claimCount += 1;
    });

    return Object.values(spenderMap)
      .sort((a, b) => b.totalAmount - a.totalAmount)
      .slice(0, 5);
  }, [filteredClaims]);

  // Calculate summary stats
  const summary = useMemo(() => {
    const totalAmount = filteredClaims.reduce((sum, c) => sum + c.amount, 0);
    const approvedClaims = filteredClaims.filter((c) => c.status === 'APPROVED' || c.status === 'PAID');
    const approvedAmount = approvedClaims.reduce((sum, c) => sum + c.amount, 0);
    const pendingClaims = filteredClaims.filter((c) => c.status === 'SUBMITTED');
    const pendingAmount = pendingClaims.reduce((sum, c) => sum + c.amount, 0);

    // Compare with previous period
    const months = timeRange === '3m' ? 3 : timeRange === '6m' ? 6 : 12;
    const prevStart = startOfMonth(subMonths(new Date(), months * 2 - 1));
    const prevEnd = endOfMonth(subMonths(new Date(), months));
    const prevPeriodClaims = claims.filter((claim) => {
      const claimDate = parseISO(claim.claimDate);
      return isWithinInterval(claimDate, { start: prevStart, end: prevEnd });
    });
    const prevTotal = prevPeriodClaims.reduce((sum, c) => sum + c.amount, 0);
    const percentChange = prevTotal > 0 ? ((totalAmount - prevTotal) / prevTotal) * 100 : 0;

    return {
      totalAmount,
      totalClaims: filteredClaims.length,
      approvedAmount,
      approvedCount: approvedClaims.length,
      pendingAmount,
      pendingCount: pendingClaims.length,
      percentChange,
      avgClaimAmount: filteredClaims.length > 0 ? totalAmount / filteredClaims.length : 0,
    };
  }, [filteredClaims, claims, timeRange]);

  // Find max amount for bar chart scaling
  const maxMonthlyAmount = Math.max(...monthlyData.map((d) => d.amount), 1);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-xl font-semibold text-surface-900 dark:text-surface-50 flex items-center gap-2">
          <BarChart2 className="w-5 h-5" />
          Expense Analytics
        </h2>
        <div className="flex gap-2">
          {(['3m', '6m', '12m'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                timeRange === range
                  ? 'bg-primary-500 text-white'
                  : 'bg-surface-100 dark:bg-surface-700 text-surface-600 dark:text-surface-300 hover:bg-surface-200 dark:hover:bg-surface-600'
              }`}
            >
              {range === '3m' ? '3 Months' : range === '6m' ? '6 Months' : '12 Months'}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[var(--bg-input)] rounded-lg p-4 border border-surface-200 dark:border-surface-700">
          <div className="flex items-center gap-2 text-surface-500 mb-2">
            <DollarSign className="w-4 h-4" />
            <span className="text-sm">Total Expenses</span>
          </div>
          <p className="text-2xl font-bold text-surface-900 dark:text-surface-50">
            ${summary.totalAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </p>
          <div className="flex items-center gap-1 mt-1">
            {summary.percentChange >= 0 ? (
              <TrendingUp className="w-4 h-4 text-green-500" />
            ) : (
              <TrendingDown className="w-4 h-4 text-red-500" />
            )}
            <span
              className={`text-sm ${summary.percentChange >= 0 ? 'text-green-600' : 'text-red-600'}`}
            >
              {Math.abs(summary.percentChange).toFixed(1)}% vs prev period
            </span>
          </div>
        </div>

        <div className="bg-[var(--bg-input)] rounded-lg p-4 border border-surface-200 dark:border-surface-700">
          <div className="flex items-center gap-2 text-surface-500 mb-2">
            <Calendar className="w-4 h-4" />
            <span className="text-sm">Average per Claim</span>
          </div>
          <p className="text-2xl font-bold text-surface-900 dark:text-surface-50">
            ${summary.avgClaimAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </p>
          <p className="text-sm text-surface-500 mt-1">{summary.totalClaims} total claims</p>
        </div>

        <div className="bg-[var(--bg-input)] rounded-lg p-4 border border-surface-200 dark:border-surface-700">
          <div className="flex items-center gap-2 text-green-500 mb-2">
            <DollarSign className="w-4 h-4" />
            <span className="text-sm">Approved</span>
          </div>
          <p className="text-2xl font-bold text-surface-900 dark:text-surface-50">
            ${summary.approvedAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </p>
          <p className="text-sm text-surface-500 mt-1">{summary.approvedCount} claims</p>
        </div>

        <div className="bg-[var(--bg-input)] rounded-lg p-4 border border-surface-200 dark:border-surface-700">
          <div className="flex items-center gap-2 text-warning-500 mb-2">
            <DollarSign className="w-4 h-4" />
            <span className="text-sm">Pending</span>
          </div>
          <p className="text-2xl font-bold text-surface-900 dark:text-surface-50">
            ${summary.pendingAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </p>
          <p className="text-sm text-surface-500 mt-1">{summary.pendingCount} claims</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Trend Chart */}
        <div className="bg-[var(--bg-input)] rounded-lg p-6 border border-surface-200 dark:border-surface-700">
          <h3 className="font-semibold text-surface-900 dark:text-surface-50 mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Monthly Trend
          </h3>
          <div className="space-y-3">
            {monthlyData.map((data) => (
              <div key={data.month} className="flex items-center gap-3">
                <span className="text-sm text-surface-600 dark:text-surface-400 w-20 flex-shrink-0">
                  {data.month}
                </span>
                <div className="flex-1 h-6 bg-surface-100 dark:bg-surface-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary-500 rounded-full transition-all duration-500"
                    style={{ width: `${(data.amount / maxMonthlyAmount) * 100}%` }}
                  />
                </div>
                <span className="text-sm font-medium text-surface-900 dark:text-surface-50 w-24 text-right">
                  ${data.amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="bg-[var(--bg-input)] rounded-lg p-6 border border-surface-200 dark:border-surface-700">
          <h3 className="font-semibold text-surface-900 dark:text-surface-50 mb-4 flex items-center gap-2">
            <PieChart className="w-4 h-4" />
            By Category
          </h3>
          {categoryData.length === 0 ? (
            <p className="text-surface-500 text-center py-8">No expense data available</p>
          ) : (
            <div className="space-y-3">
              {categoryData.slice(0, 6).map((data) => (
                <div key={data.category} className="flex items-center gap-3">
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: data.color }}
                  />
                  <span className="text-sm text-surface-600 dark:text-surface-400 flex-1 truncate">
                    {CATEGORY_LABELS[data.category]}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-surface-500">{data.percentage.toFixed(1)}%</span>
                    <span className="text-sm font-medium text-surface-900 dark:text-surface-50 w-20 text-right">
                      ${data.amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
          {/* Mini pie chart visualization */}
          {categoryData.length > 0 && (
            <div className="mt-4 flex justify-center">
              <div className="relative w-24 h-24">
                <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                  {categoryData.reduce(
                    (acc, data, index) => {
                      const startAngle = acc.angle;
                      const endAngle = startAngle + (data.percentage / 100) * 360;
                      const largeArc = data.percentage > 50 ? 1 : 0;

                      const startX = 50 + 40 * Math.cos((startAngle * Math.PI) / 180);
                      const startY = 50 + 40 * Math.sin((startAngle * Math.PI) / 180);
                      const endX = 50 + 40 * Math.cos((endAngle * Math.PI) / 180);
                      const endY = 50 + 40 * Math.sin((endAngle * Math.PI) / 180);

                      acc.elements.push(
                        <path
                          key={data.category}
                          d={`M 50 50 L ${startX} ${startY} A 40 40 0 ${largeArc} 1 ${endX} ${endY} Z`}
                          fill={data.color}
                          className="transition-opacity hover:opacity-80"
                        />
                      );
                      acc.angle = endAngle;
                      return acc;
                    },
                    { elements: [] as JSX.Element[], angle: 0 }
                  ).elements}
                </svg>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Top Spenders */}
      {topSpenders.length > 0 && (
        <div className="bg-[var(--bg-input)] rounded-lg p-6 border border-surface-200 dark:border-surface-700">
          <h3 className="font-semibold text-surface-900 dark:text-surface-50 mb-4 flex items-center gap-2">
            <Users className="w-4 h-4" />
            Top Spenders
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm text-surface-500 border-b border-surface-200 dark:border-surface-700">
                  <th className="pb-3 font-medium">Rank</th>
                  <th className="pb-3 font-medium">Employee</th>
                  <th className="pb-3 font-medium text-right">Claims</th>
                  <th className="pb-3 font-medium text-right">Total Amount</th>
                </tr>
              </thead>
              <tbody>
                {topSpenders.map((spender, index) => (
                  <tr
                    key={spender.employeeId}
                    className="border-b border-surface-100 dark:border-surface-800 last:border-0"
                  >
                    <td className="py-3">
                      <span
                        className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                          index === 0
                            ? 'bg-yellow-100 text-yellow-700'
                            : index === 1
                              ? 'bg-[var(--bg-surface)] text-[var(--text-primary)]'
                              : index === 2
                                ? 'bg-orange-100 text-orange-700'
                                : 'bg-surface-100 text-surface-600'
                        }`}
                      >
                        {index + 1}
                      </span>
                    </td>
                    <td className="py-3">
                      <p className="font-medium text-surface-900 dark:text-surface-50">
                        {spender.employeeName}
                      </p>
                      <p className="text-sm text-surface-500">{spender.employeeCode}</p>
                    </td>
                    <td className="py-3 text-right text-surface-600 dark:text-surface-400">
                      {spender.claimCount}
                    </td>
                    <td className="py-3 text-right font-semibold text-surface-900 dark:text-surface-50">
                      ${spender.totalAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
