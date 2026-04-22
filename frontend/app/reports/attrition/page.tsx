'use client';

import {useState} from 'react';
import {AppLayout} from '@/components/layout';
import {apiClient} from '@/lib/api/client';
import {useQuery, useQueryClient} from '@tanstack/react-query';
import {AlertTriangle, Download, RefreshCw, Shield, TrendingDown, Zap} from 'lucide-react';
import {Button} from '@/components/ui/Button';
import {PermissionGate} from '@/components/auth/PermissionGate';
import {Permissions} from '@/lib/hooks/usePermissions';

interface AttritionPrediction {
  id: string;
  employeeId: string;
  employeeName?: string;
  department?: string;
  jobTitle?: string;
  riskScore: number;
  riskLevel: string;
  predictedLeaveDate?: string;
  confidenceScore?: number;
  tenureMonths?: number;
  actionTaken?: boolean;
  riskFactors?: Array<{ name: string; score: number; impact: string }>;
  recommendations?: string[];
}

const RISK_COLOR: Record<string, { bg: string; text: string; bar: string }> = {
  CRITICAL: {
    bg: "bg-status-danger-bg border-status-danger-border",
    text: "text-status-danger-text",
    bar: "bg-status-danger-bg"
  },
  HIGH: {
    bg: "bg-status-warning-bg border-status-warning-border",
    text: "text-status-warning-text",
    bar: "bg-status-warning-bg"
  },
  MEDIUM: {
    bg: "bg-status-warning-bg border-status-warning-border",
    text: "text-status-warning-text",
    bar: "bg-status-warning-bg"
  },
  LOW: {
    bg: "bg-status-success-bg border-status-success-border",
    text: "text-status-success-text",
    bar: "bg-status-success-bg"
  },
};

export default function AttritionReportPage() {
  const queryClient = useQueryClient();
  const [minScore, setMinScore] = useState(50);
  const [selectedRisk, setSelectedRisk] = useState<string>('ALL');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [markingAction, setMarkingAction] = useState<string | null>(null);

  const {data: predictions = [], isLoading: loading, error: queryError, refetch} = useQuery<AttritionPrediction[]>({
    queryKey: ['attrition-predictions', minScore],
    queryFn: async () => {
      const res = await apiClient.get<AttritionPrediction[]>(
        `/predictive-analytics/attrition/high-risk?minScore=${minScore}`
      );
      return res.data ?? [];
    },
  });

  const error = queryError ? 'Failed to load attrition predictions. Predictive analytics may not be available.' : null;

  async function markActionTaken(predictionId: string) {
    setMarkingAction(predictionId);
    try {
      await apiClient.post(`/predictive-analytics/attrition/${predictionId}/action-taken`);
      // Optimistically update the cache
      queryClient.setQueryData<AttritionPrediction[]>(
        ['attrition-predictions', minScore],
        (old) => old?.map(p => p.id === predictionId ? {...p, actionTaken: true} : p) ?? []
      );
    } catch {
      // ignore
    } finally {
      setMarkingAction(null);
    }
  }

  function exportCSV() {
    const headers = ['Employee', 'Department', 'Title', 'Risk Score', 'Risk Level', 'Tenure (months)', 'Predicted Leave', 'Action Taken'];
    const rows = filtered.map(p => [
      p.employeeName ?? p.employeeId,
      p.department ?? '',
      p.jobTitle ?? '',
      p.riskScore,
      p.riskLevel,
      p.tenureMonths ?? '',
      p.predictedLeaveDate ?? '',
      p.actionTaken ? 'Yes' : 'No',
    ].join(','));
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], {type: 'text/csv'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attrition_report_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const filtered = predictions.filter(p =>
    selectedRisk === 'ALL' || p.riskLevel === selectedRisk
  );

  const byRisk = predictions.reduce((acc, p) => {
    acc[p.riskLevel] = (acc[p.riskLevel] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <AppLayout activeMenuItem="reports">
      <div className="p-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="row-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)] skeuo-emboss">Attrition Analysis</h1>
            <p className="text-body-muted mt-1">AI-powered attrition risk predictions and retention recommendations</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => refetch()} disabled={loading}
                    leftIcon={<RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`}/>}>
              Refresh
            </Button>
            <PermissionGate permission={Permissions.ANALYTICS_EXPORT}>
              <Button variant="primary" size="sm" onClick={exportCSV} disabled={filtered.length === 0}
                      leftIcon={<Download className="h-4 w-4"/>}>
                Export CSV
              </Button>
            </PermissionGate>
          </div>
        </div>

        {error && (
          <div
            className='mb-4 p-4 bg-status-warning-bg border border-status-warning-border rounded-md text-sm text-status-warning-text flex items-start gap-2'>
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5"/>
            {error}
          </div>
        )}

        {/* Summary cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            {level: 'CRITICAL', icon: Zap, label: 'Critical Risk'},
            {level: 'HIGH', icon: AlertTriangle, label: 'High Risk'},
            {level: 'MEDIUM', icon: TrendingDown, label: 'Medium Risk'},
            {level: 'LOW', icon: Shield, label: 'Low Risk'},
          ].map(({level, icon: Icon, label}) => {
            const colors = RISK_COLOR[level];
            return (
              <button
                key={level}
                onClick={() => setSelectedRisk(prev => prev === level ? 'ALL' : level)}
                aria-label={`Filter by ${label}`}
                className={`p-4 rounded-lg border text-left transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2 ${colors.bg} ${selectedRisk === level ? 'ring-2 ring-offset-1 ring-accent-500' : 'hover:opacity-80'}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Icon className={`h-4 w-4 ${colors.text}`}/>
                  <span className={`text-xs font-semibold uppercase ${colors.text}`}>{label}</span>
                </div>
                <p className={`text-3xl font-bold ${colors.text}`}>{byRisk[level] ?? 0}</p>
              </button>
            );
          })}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4 mb-4">
          <div className="flex items-center gap-2">
            <label className="text-caption">Min risk score:</label>
            <input
              type="number"
              min={0}
              max={100}
              value={minScore}
              onChange={e => setMinScore(Number(e.target.value))}
              className="w-16 text-sm border border-[var(--border-main)] rounded px-2 py-1"
            />
            <Button variant="primary" size="sm" onClick={() => refetch()}>Apply</Button>
          </div>
          <span className="text-caption">{filtered.length} employees shown</span>
          {selectedRisk !== 'ALL' && (
            <Button variant="ghost" size="sm" onClick={() => setSelectedRisk('ALL')}>Clear filter</Button>
          )}
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div
              className='animate-spin h-8 w-8 border-4 border-[var(--accent-primary)] border-t-transparent rounded-full'/>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 skeuo-card">
            <Shield className='h-12 w-12 text-status-success-text mx-auto mb-4'/>
            <p className="text-[var(--text-muted)] font-medium">No high-risk employees found</p>
            <p className="text-body-muted mt-1">Lower the minimum risk score to see more results</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered
              .sort((a, b) => b.riskScore - a.riskScore)
              .map(pred => {
                const colors = RISK_COLOR[pred.riskLevel] ?? RISK_COLOR.MEDIUM;
                const expanded = expandedId === pred.id;
                return (
                  <div key={pred.id}
                       className={`skeuo-card overflow-hidden transition-all ${expanded ? 'shadow-[var(--shadow-elevated)]' : ''}`}>
                    <button
                      onClick={() => setExpandedId(expanded ? null : pred.id)}
                      className="w-full flex items-center gap-4 px-6 py-4 text-left hover:bg-[var(--bg-surface)]"
                    >
                      {/* Risk score bar */}
                      <div className="shrink-0 w-16 text-center">
                        <div className="text-lg font-bold text-[var(--text-primary)]">{Math.round(pred.riskScore)}</div>
                        <div className="h-1.5 bg-[var(--border-main)] rounded-full overflow-hidden mt-1">
                          <div className={`h-full ${colors.bar} rounded-full`} style={{width: `${pred.riskScore}%`}}/>
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-[var(--text-primary)] truncate">
                            {pred.employeeName ?? `Employee ${pred.employeeId.slice(0, 8)}…`}
                          </p>
                          <span
                            className={`shrink-0 text-xs font-medium px-1.5 py-0.5 rounded ${colors.text} ${colors.bg} border ${colors.bg.replace('bg-', 'border-').replace('-50', '-200')}`}>
                            {pred.riskLevel}
                          </span>
                          {pred.actionTaken && (
                            <span
                              className='shrink-0 text-xs text-status-success-text bg-status-success-bg border border-status-success-border px-1.5 py-0.5 rounded'>
                              Action Taken
                            </span>
                          )}
                        </div>
                        <p className="text-caption mt-0.5">
                          {pred.department} {pred.jobTitle ? `· ${pred.jobTitle}` : ''}
                          {pred.tenureMonths ? ` · ${Math.round(pred.tenureMonths / 12 * 10) / 10}y tenure` : ''}
                        </p>
                      </div>

                      {pred.predictedLeaveDate && (
                        <div className="shrink-0 text-right hidden md:block">
                          <p className="text-caption">Predicted leave</p>
                          <p className="text-sm font-medium text-[var(--text-primary)]">
                            {new Date(pred.predictedLeaveDate).toLocaleDateString('en-IN', {
                              month: 'short',
                              year: 'numeric'
                            })}
                          </p>
                        </div>
                      )}

                      <div className={`shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`}>
                        <svg className="h-4 w-4 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24"
                             stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
                        </svg>
                      </div>
                    </button>
                    {expanded && (
                      <div className="px-6 pb-4 border-t border-[var(--border-subtle)] bg-[var(--bg-surface)]">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                          {/* Risk factors */}
                          {pred.riskFactors && pred.riskFactors.length > 0 && (
                            <div>
                              <p className="text-xs font-semibold text-[var(--text-muted)] uppercase mb-2">Risk
                                Factors</p>
                              <div className="space-y-1.5">
                                {pred.riskFactors.map((f, i) => (
                                  <div key={i} className="flex items-center gap-2">
                                    <span className="text-xs text-[var(--text-secondary)] w-28 shrink-0">{f.name}</span>
                                    <div className="flex-1 h-1.5 bg-[var(--border-main)] rounded-full overflow-hidden">
                                      <div
                                        className={`h-full rounded-full ${f.impact === 'HIGH' ? "bg-status-danger-bg" : f.impact === 'MEDIUM' ? "bg-status-warning-bg" : "bg-status-success-bg"}`}
                                        style={{width: `${f.score}%`}}
                                      />
                                    </div>
                                    <span
                                      className="text-xs font-medium text-[var(--text-primary)] w-8 text-right">{Math.round(f.score)}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Recommendations */}
                          {pred.recommendations && pred.recommendations.length > 0 && (
                            <div>
                              <p
                                className="text-xs font-semibold text-[var(--text-muted)] uppercase mb-2">Recommendations</p>
                              <ul className="space-y-1">
                                {pred.recommendations.map((r, i) => (
                                  <li key={i} className="text-xs text-[var(--text-secondary)] flex items-start gap-1.5">
                                    <span className='text-accent mt-0.5'>•</span>
                                    {r}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>

                        {!pred.actionTaken && (
                          <div className="mt-4 flex justify-end">
                            <button
                              onClick={() => markActionTaken(pred.id)}
                              disabled={markingAction === pred.id}
                              className='text-xs px-4 py-1.5 bg-accent text-inverse rounded-md hover:bg-accent disabled:opacity-50'
                            >
                              {markingAction === pred.id ? 'Saving…' : 'Mark Action Taken'}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
