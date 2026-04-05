'use client';

import {AppLayout} from '@/components/layout';
import {apiClient} from '@/lib/api/client';
import {useQuery} from '@tanstack/react-query';
import {Building2, Download, RefreshCw, TrendingDown, TrendingUp, Users,} from 'lucide-react';
import {PermissionGate} from '@/components/auth/PermissionGate';
import {Permissions} from '@/lib/hooks/usePermissions';

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

interface HeadcountData {
  metrics: EmployeeMetrics | null;
  trend: HeadcountTrend[];
  orgHealth: OrgHealth | null;
}

const STATUS_COLOR: Record<string, string> = {
  EXCELLENT: 'text-success-600 bg-success-50',
  GOOD: 'text-accent-600 bg-accent-50',
  WARNING: 'text-warning-600 bg-warning-50',
  CRITICAL: 'text-danger-600 bg-danger-50',
};

export default function HeadcountReportPage() {
  const {data, isLoading: loading, error: queryError, refetch} = useQuery<HeadcountData>({
    queryKey: ['headcount-report'],
    queryFn: async () => {
      const [metricsRes, trendRes, healthRes] = await Promise.all([
        apiClient.get<EmployeeMetrics>('/analytics/employees').catch((): null => null),
        apiClient.get<HeadcountTrend[]>('/analytics/headcount-trend?months=12').catch((): null => null),
        apiClient.get<OrgHealth>('/analytics/org-health').catch((): null => null),
      ]);
      return {
        metrics: metricsRes?.data ?? null,
        trend: trendRes?.data ?? [],
        orgHealth: healthRes?.data ?? null,
      };
    },
  });

  const metrics = data?.metrics ?? null;
  const trend = data?.trend ?? [];
  const orgHealth = data?.orgHealth ?? null;
  const error = queryError ? 'Failed to load headcount data.' : null;

  function exportCSV() {
    if (!metrics) return;
    const rows = [
      ['Department', 'Headcount'],
      ...(metrics.byDepartment ?? []).map(d => [d.department, d.count]),
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], {type: 'text/csv'});
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
        <div className="row-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] skeuo-emboss">Headcount Report</h1>
            <p className="text-body-muted mt-1">Organization headcount by department, type, and trend</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => refetch()}
              disabled={loading}
              className="flex items-center gap-1.5 px-4 py-2 text-sm border border-[var(--border-main)] rounded-md hover:bg-[var(--bg-surface)] disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`}/>
              Refresh
            </button>
            <PermissionGate permission={Permissions.ANALYTICS_EXPORT}>
              <button
                onClick={exportCSV}
                disabled={!metrics}
                className="btn-primary !h-auto !rounded-md cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
              >
                <Download className="h-4 w-4"/>
                Export CSV
              </button>
            </PermissionGate>
          </div>
        </div>

        {error && (
          <div
            className="mb-4 p-4 bg-danger-50 border border-danger-200 rounded-md text-sm text-danger-600">{error}</div>
        )}

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin h-8 w-8 border-4 border-accent-600 border-t-transparent rounded-full"/>
          </div>
        ) : (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="skeuo-card p-4">
                <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">Total Employees</p>
                <p className="text-3xl font-bold text-[var(--text-primary)] mt-1">{metrics?.totalEmployees ?? '—'}</p>
                {orgHealth?.healthScore && (
                  <span
                    className={`inline-block mt-2 text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLOR[orgHealth.healthScore.status] ?? 'bg-[var(--bg-surface)] text-[var(--text-secondary)]'}`}>
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
                  <TrendingUp className="h-3.5 w-3.5 text-success-500"/>
                  <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">New Hires
                    (Month)</p>
                </div>
                <p
                  className="text-3xl font-bold text-success-600 mt-1">{metrics?.newHiresThisMonth ?? orgHealth?.turnover?.monthlyJoiners ?? '—'}</p>
              </div>
              <div className="skeuo-card p-4">
                <div className="flex items-center gap-1 mb-1">
                  <TrendingDown className="h-3.5 w-3.5 text-danger-500"/>
                  <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">Exits (Month)</p>
                </div>
                <p
                  className="text-3xl font-bold text-danger-600 mt-1">{metrics?.exitedThisMonth ?? orgHealth?.turnover?.monthlyExits ?? '—'}</p>
                {orgHealth?.turnover?.annualTurnoverRate != null && (
                  <p className="text-caption mt-1">Annual rate: {orgHealth.turnover.annualTurnoverRate.toFixed(1)}%</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* By Department */}
              <div className="skeuo-card p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Building2 className="h-4 w-4 text-accent-600"/>
                  <h2 className="text-sm font-semibold text-[var(--text-primary)]">Headcount by Department</h2>
                </div>
                {metrics?.byDepartment && metrics.byDepartment.length > 0 ? (
                  <div className="space-y-2">
                    {metrics.byDepartment
                      .sort((a, b) => b.count - a.count)
                      .map(dept => (
                        <div key={dept.department}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-[var(--text-secondary)] truncate pr-2">{dept.department}</span>
                            <span className="font-semibold text-[var(--text-primary)] shrink-0">{dept.count}</span>
                          </div>
                          <div className="h-2 bg-[var(--bg-surface)] rounded-full overflow-hidden">
                            <div
                              className="h-full bg-accent-500 rounded-full"
                              style={{width: `${(dept.count / maxDeptCount) * 100}%`}}
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
                            <span className="font-semibold text-[var(--text-primary)] shrink-0">{count}</span>
                          </div>
                          <div className="h-2 bg-[var(--bg-surface)] rounded-full overflow-hidden">
                            <div
                              className="h-full bg-accent-500 rounded-full"
                              style={{width: `${(count / maxDeptCount) * 100}%`}}
                            />
                          </div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <p className="text-body-muted text-center py-8">No department data available</p>
                )}
              </div>

              {/* Headcount Trend */}
              <div className="skeuo-card p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Users className="h-4 w-4 text-accent-600"/>
                  <h2 className="text-sm font-semibold text-[var(--text-primary)]">12-Month Headcount Trend</h2>
                </div>
                {trend.length > 0 ? (
                  <div className="space-y-1.5">
                    {trend.map((t, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="text-caption w-16 shrink-0">{t.month}</span>
                        <div className="flex-1 h-5 bg-[var(--bg-surface)] rounded overflow-hidden relative">
                          <div
                            className="h-full bg-accent-500 rounded"
                            style={{width: `${(t.headcount / maxTrendCount) * 100}%`}}
                          />
                        </div>
                        <span
                          className="text-xs font-semibold text-[var(--text-primary)] w-10 text-right shrink-0">{t.headcount}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-body-muted text-center py-8">No trend data available</p>
                )}
              </div>
            </div>

            {/* By Employment Type */}
            {metrics?.byEmploymentType && Object.keys(metrics.byEmploymentType).length > 0 && (
              <div className="skeuo-card p-6">
                <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-4">By Employment Type</h2>
                <div className="flex flex-wrap gap-4">
                  {Object.entries(metrics.byEmploymentType).map(([type, count]) => (
                    <div key={type} className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-surface)] rounded-lg">
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
