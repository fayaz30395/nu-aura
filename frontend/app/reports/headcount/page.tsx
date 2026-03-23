'use client';

import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout';
import { apiClient } from '@/lib/api/client';
import {
  Users,
  TrendingUp,
  TrendingDown,
  Download,
  RefreshCw,
  Building2,
} from 'lucide-react';
import { PermissionGate } from '@/components/auth/PermissionGate';
import { Permissions } from '@/lib/hooks/usePermissions';

interface EmployeeMetrics {
  totalEmployees: number;
  activeEmployees: number;
  newHiresThisMonth: number;
  exitedThisMonth: number;
  byDepartment: Array<{ department: string; count: number }>;
  byEmploymentType: Record<string, number>;
  byLocation: Record<string, number>;
}

interface HeadcountTrend {
  month: string;
  headcount: number;
  joiners: number;
  exits: number;
}

interface OrgHealth {
  healthScore: { score: number; status: string; trend: number };
  turnover: { annualTurnoverRate: number; monthlyExits: number; monthlyJoiners: number };
  diversity: { departmentDistribution: Record<string, number> };
}

const STATUS_COLOR: Record<string, string> = {
  EXCELLENT: 'text-green-600 bg-green-50',
  GOOD: 'text-blue-600 bg-blue-50',
  WARNING: 'text-yellow-600 bg-yellow-50',
  CRITICAL: 'text-red-600 bg-red-50',
};

export default function HeadcountReportPage() {
  const [metrics, setMetrics] = useState<EmployeeMetrics | null>(null);
  const [trend, setTrend] = useState<HeadcountTrend[]>([]);
  const [orgHealth, setOrgHealth] = useState<OrgHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [metricsRes, trendRes, healthRes] = await Promise.all([
        apiClient.get<EmployeeMetrics>('/analytics/employees').catch((): null => null),
        apiClient.get<HeadcountTrend[]>('/analytics/headcount-trend?months=12').catch((): null => null),
        apiClient.get<OrgHealth>('/analytics/org-health').catch((): null => null),
      ]);
      setMetrics(metricsRes?.data ?? null);
      setTrend(trendRes?.data ?? []);
      setOrgHealth(healthRes?.data ?? null);
    } catch {
      setError('Failed to load headcount data.');
    } finally {
      setLoading(false);
    }
  }

  function exportCSV() {
    if (!metrics) return;
    const rows = [
      ['Department', 'Headcount'],
      ...(metrics.byDepartment ?? []).map(d => [d.department, d.count]),
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `headcount_report_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // compute max for bar width scaling
  const maxDeptCount = Math.max(...(metrics?.byDepartment?.map(d => d.count) ?? [1]), 1);
  const maxTrendCount = Math.max(...trend.map(t => t.headcount), 1);

  return (
    <AppLayout activeMenuItem="reports">
      <div className="p-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] skeuo-emboss">Headcount Report</h1>
            <p className="text-sm text-[var(--text-muted)] mt-1">Organization headcount by department, type, and trend</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={load}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-2 text-sm border border-[var(--border-main)] rounded-md hover:bg-[var(--bg-surface)] disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <PermissionGate permission={Permissions.ANALYTICS_EXPORT}>
              <button
                onClick={exportCSV}
                disabled={!metrics}
                className="btn-primary !h-auto !rounded-md"
              >
                <Download className="h-4 w-4" />
                Export CSV
              </button>
            </PermissionGate>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md text-sm text-red-600">{error}</div>
        )}

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" />
          </div>
        ) : (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="skeuo-card p-4">
                <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">Total Employees</p>
                <p className="text-3xl font-bold text-[var(--text-primary)] mt-1">{metrics?.totalEmployees ?? '—'}</p>
                {orgHealth?.healthScore && (
                  <span className={`inline-block mt-2 text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLOR[orgHealth.healthScore.status] ?? 'bg-[var(--bg-surface)] text-[var(--text-secondary)]'}`}>
                    Org Health: {orgHealth.healthScore.score}/100
                  </span>
                )}
              </div>
              <div className="skeuo-card p-4">
                <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">Active Employees</p>
                <p className="text-3xl font-bold text-[var(--text-primary)] mt-1">{metrics?.activeEmployees ?? '—'}</p>
              </div>
              <div className="skeuo-card p-4">
                <div className="flex items-center gap-1 mb-1">
                  <TrendingUp className="h-3.5 w-3.5 text-green-500" />
                  <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">New Hires (Month)</p>
                </div>
                <p className="text-3xl font-bold text-green-600 mt-1">{metrics?.newHiresThisMonth ?? orgHealth?.turnover?.monthlyJoiners ?? '—'}</p>
              </div>
              <div className="skeuo-card p-4">
                <div className="flex items-center gap-1 mb-1">
                  <TrendingDown className="h-3.5 w-3.5 text-red-500" />
                  <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">Exits (Month)</p>
                </div>
                <p className="text-3xl font-bold text-red-600 mt-1">{metrics?.exitedThisMonth ?? orgHealth?.turnover?.monthlyExits ?? '—'}</p>
                {orgHealth?.turnover?.annualTurnoverRate != null && (
                  <p className="text-xs text-[var(--text-muted)] mt-1">Annual rate: {orgHealth.turnover.annualTurnoverRate.toFixed(1)}%</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* By Department */}
              <div className="skeuo-card p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Building2 className="h-4 w-4 text-blue-600" />
                  <h2 className="text-sm font-semibold text-gray-800">Headcount by Department</h2>
                </div>
                {metrics?.byDepartment && metrics.byDepartment.length > 0 ? (
                  <div className="space-y-2">
                    {metrics.byDepartment
                      .sort((a, b) => b.count - a.count)
                      .map(dept => (
                        <div key={dept.department}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-[var(--text-secondary)] truncate pr-2">{dept.department}</span>
                            <span className="font-semibold text-gray-800 shrink-0">{dept.count}</span>
                          </div>
                          <div className="h-2 bg-[var(--bg-surface)] rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-500 rounded-full"
                              style={{ width: `${(dept.count / maxDeptCount) * 100}%` }}
                            />
                          </div>
                        </div>
                      ))}
                  </div>
                ) : orgHealth?.diversity?.departmentDistribution ? (
                  <div className="space-y-2">
                    {Object.entries(orgHealth.diversity.departmentDistribution)
                      .sort(([, a], [, b]) => b - a)
                      .map(([dept, count]) => (
                        <div key={dept}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-[var(--text-secondary)] truncate pr-2">{dept}</span>
                            <span className="font-semibold text-gray-800 shrink-0">{count}</span>
                          </div>
                          <div className="h-2 bg-[var(--bg-surface)] rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-500 rounded-full"
                              style={{ width: `${(count / maxDeptCount) * 100}%` }}
                            />
                          </div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <p className="text-sm text-[var(--text-muted)] text-center py-8">No department data available</p>
                )}
              </div>

              {/* Headcount Trend */}
              <div className="skeuo-card p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Users className="h-4 w-4 text-indigo-600" />
                  <h2 className="text-sm font-semibold text-gray-800">12-Month Headcount Trend</h2>
                </div>
                {trend.length > 0 ? (
                  <div className="space-y-1.5">
                    {trend.map((t, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="text-xs text-[var(--text-muted)] w-16 shrink-0">{t.month}</span>
                        <div className="flex-1 h-5 bg-[var(--bg-surface)] rounded overflow-hidden relative">
                          <div
                            className="h-full bg-indigo-500 rounded"
                            style={{ width: `${(t.headcount / maxTrendCount) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs font-semibold text-[var(--text-primary)] w-10 text-right shrink-0">{t.headcount}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-[var(--text-muted)] text-center py-8">No trend data available</p>
                )}
              </div>
            </div>

            {/* By Employment Type */}
            {metrics?.byEmploymentType && Object.keys(metrics.byEmploymentType).length > 0 && (
              <div className="skeuo-card p-5">
                <h2 className="text-sm font-semibold text-gray-800 mb-4">By Employment Type</h2>
                <div className="flex flex-wrap gap-4">
                  {Object.entries(metrics.byEmploymentType).map(([type, count]) => (
                    <div key={type} className="flex items-center gap-2 px-3 py-2 bg-[var(--bg-surface)] rounded-lg">
                      <span className="text-xs text-[var(--text-secondary)]">{type}</span>
                      <span className="text-sm font-bold text-[var(--text-primary)]">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}
