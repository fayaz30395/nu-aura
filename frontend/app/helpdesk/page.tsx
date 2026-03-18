'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { AppLayout, PageHeader } from '@/components/layout';
import { useSLADashboard, useMyPendingEscalations, useSlaConfigs } from '@/lib/hooks/queries/useHelpdeskSla';
import {
  Headphones,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
  BarChart3,
  Settings,
  Bell,
} from 'lucide-react';

export default function HelpdeskPage() {
  const router = useRouter();
  const { data: dashboard, isLoading: dashboardLoading } = useSLADashboard();
  const { data: escalations = [], isLoading: escalationsLoading } = useMyPendingEscalations();
  const { data: slasResponse } = useSlaConfigs(0, 100);

  const activeSlaCount = useMemo(
    () => (slasResponse?.content ?? []).filter((s) => s.isActive).length,
    [slasResponse],
  );

  const isLoading = dashboardLoading || escalationsLoading;

  const statCards = [
    {
      label: 'SLA Compliance',
      value: dashboard ? `${dashboard.slaComplianceRate.toFixed(1)}%` : '\u2014',
      icon: CheckCircle2,
      color: 'text-green-600',
      bg: 'bg-green-50 dark:bg-green-950/20',
    },
    {
      label: 'Avg First Response',
      value: dashboard ? `${dashboard.averageFirstResponseMinutes} min` : '\u2014',
      icon: Clock,
      color: 'text-blue-600',
      bg: 'bg-blue-50 dark:bg-blue-950/20',
    },
    {
      label: 'Avg Resolution',
      value: dashboard ? `${dashboard.averageResolutionMinutes} min` : '\u2014',
      icon: BarChart3,
      color: 'text-purple-600',
      bg: 'bg-purple-50 dark:bg-purple-950/20',
    },
    {
      label: 'Avg CSAT',
      value: dashboard ? `${dashboard.averageCSAT.toFixed(1)} / 5` : '\u2014',
      icon: Headphones,
      color: 'text-orange-600',
      bg: 'bg-orange-50 dark:bg-orange-950/20',
    },
  ];

  return (
    <AppLayout>
      <div className="space-y-6">
        <PageHeader
          title="Helpdesk"
          description="Manage SLA policies, escalations, and support metrics"
        />

        {/* Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((card) => (
            <div
              key={card.label}
              className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-main)] p-4 shadow-soft"
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${card.bg}`}>
                  <card.icon className={`w-5 h-5 ${card.color}`} />
                </div>
                <div>
                  <p className="text-xs text-[var(--text-muted)]">{card.label}</p>
                  <p className="text-lg font-semibold text-[var(--text-primary)]">
                    {isLoading ? '...' : card.value}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Pending Escalations */}
        {escalations.length > 0 && (
          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              <h3 className="font-semibold text-amber-800 dark:text-amber-300">
                Pending Escalations ({escalations.length})
              </h3>
            </div>
            <div className="space-y-2">
              {escalations.slice(0, 5).map((esc) => (
                <div
                  key={esc.id}
                  className="flex items-center justify-between bg-white/60 dark:bg-white/5 rounded-lg px-3 py-2"
                >
                  <div>
                    <span className="text-sm font-medium text-[var(--text-primary)]">
                      Ticket #{esc.ticketId.slice(0, 8)}
                    </span>
                    <span className="ml-2 text-xs text-[var(--text-muted)]">
                      {esc.escalationLevel} — {esc.escalationReason.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <span className="text-xs text-[var(--text-muted)]">
                    {new Date(esc.escalatedAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => router.push('/helpdesk/sla')}
            className="flex items-center justify-between bg-[var(--bg-card)] rounded-xl border border-[var(--border-main)] p-4 shadow-soft hover:shadow-md transition-shadow text-left"
          >
            <div className="flex items-center gap-3">
              <Settings className="w-5 h-5 text-[var(--text-muted)]" />
              <div>
                <p className="font-medium text-[var(--text-primary)]">SLA Policies</p>
                <p className="text-xs text-[var(--text-muted)]">{activeSlaCount} active policies</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-[var(--text-muted)]" />
          </button>

          <button
            onClick={() => router.push('/helpdesk/sla')}
            className="flex items-center justify-between bg-[var(--bg-card)] rounded-xl border border-[var(--border-main)] p-4 shadow-soft hover:shadow-md transition-shadow text-left"
          >
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-[var(--text-muted)]" />
              <div>
                <p className="font-medium text-[var(--text-primary)]">Escalations</p>
                <p className="text-xs text-[var(--text-muted)]">{escalations.length} pending</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-[var(--text-muted)]" />
          </button>

          <button
            onClick={() => router.push('/helpdesk/sla')}
            className="flex items-center justify-between bg-[var(--bg-card)] rounded-xl border border-[var(--border-main)] p-4 shadow-soft hover:shadow-md transition-shadow text-left"
          >
            <div className="flex items-center gap-3">
              <BarChart3 className="w-5 h-5 text-[var(--text-muted)]" />
              <div>
                <p className="font-medium text-[var(--text-primary)]">SLA Dashboard</p>
                <p className="text-xs text-[var(--text-muted)]">View detailed metrics</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-[var(--text-muted)]" />
          </button>
        </div>

        {/* Summary Stats */}
        {dashboard && (
          <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-main)] p-4 shadow-soft">
            <h3 className="font-semibold text-[var(--text-primary)] mb-3">Overview</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-green-600">{dashboard.slaMetCount}</p>
                <p className="text-xs text-[var(--text-muted)]">SLAs Met</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600">{dashboard.slaBreachedCount}</p>
                <p className="text-xs text-[var(--text-muted)]">SLAs Breached</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-600">{dashboard.firstContactResolutions}</p>
                <p className="text-xs text-[var(--text-muted)]">First Contact Resolutions</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-purple-600">{activeSlaCount}</p>
                <p className="text-xs text-[var(--text-muted)]">Active SLA Policies</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
