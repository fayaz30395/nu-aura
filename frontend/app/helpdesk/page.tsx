'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/layout';
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
  Ticket,
  BookOpen,
} from 'lucide-react';

export default function HelpdeskPage() {
  const router = useRouter();
  const { data: dashboard, isLoading: dashboardLoading, error: dashboardError } = useSLADashboard();
  const { data: escalations = [], isLoading: escalationsLoading } = useMyPendingEscalations();
  const { data: slasResponse } = useSlaConfigs(0, 100);

  const activeSlaCount = useMemo(
    () => (slasResponse?.content ?? []).filter((s) => s.isActive).length,
    [slasResponse],
  );

  const _isLoading = dashboardLoading || escalationsLoading;

  const getStatValue = (formatter: () => string): string => {
    if (dashboardLoading) return '...';
    if (dashboardError || !dashboard) return 'N/A';
    return formatter();
  };

  const statCards = [
    {
      label: 'SLA Compliance',
      value: getStatValue(() => `${dashboard.slaComplianceRate.toFixed(1)}%`),
      icon: CheckCircle2,
      color: 'text-success-600',
      bg: 'bg-success-50 dark:bg-success-950/20',
    },
    {
      label: 'Avg First Response',
      value: getStatValue(() => `${dashboard.averageFirstResponseMinutes} min`),
      icon: Clock,
      color: 'text-accent-600',
      bg: 'bg-accent-50 dark:bg-accent-950/20',
    },
    {
      label: 'Avg Resolution',
      value: getStatValue(() => `${dashboard.averageResolutionMinutes} min`),
      icon: BarChart3,
      color: 'text-accent-800',
      bg: 'bg-accent-250 dark:bg-accent-900/20',
    },
    {
      label: 'Avg CSAT',
      value: getStatValue(() => `${dashboard.averageCSAT.toFixed(1)} / 5`),
      icon: Headphones,
      color: 'text-warning-600',
      bg: 'bg-warning-50 dark:bg-warning-950/20',
    },
  ];

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] skeuo-emboss">Helpdesk</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1 skeuo-deboss">Manage SLA policies, escalations, and support metrics</p>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((card) => (
            <div
              key={card.label}
              className="skeuo-card p-4"
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${card.bg}`}>
                  <card.icon className={`w-5 h-5 ${card.color}`} />
                </div>
                <div>
                  <p className="text-xs text-[var(--text-muted)]">{card.label}</p>
                  <p className="text-lg font-semibold text-[var(--text-primary)]">
                    {card.value}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Pending Escalations */}
        {escalations.length > 0 && (
          <div className="bg-warning-50 dark:bg-warning-950/20 border border-warning-200 dark:border-warning-800 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-5 h-5 text-warning-600" />
              <h3 className="font-semibold text-warning-800 dark:text-warning-300">
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <button
            onClick={() => router.push('/helpdesk/tickets')}
            className="flex items-center justify-between card-interactive p-4 text-left"
          >
            <div className="flex items-center gap-3">
              <Ticket className="w-5 h-5 text-accent-700 dark:text-accent-400" />
              <div>
                <p className="font-medium text-[var(--text-primary)]">Tickets</p>
                <p className="text-xs text-[var(--text-muted)]">View and manage support tickets</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-[var(--text-muted)]" />
          </button>

          <button
            onClick={() => router.push('/helpdesk/sla')}
            className="flex items-center justify-between card-interactive p-4 text-left"
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
            className="flex items-center justify-between card-interactive p-4 text-left"
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
            onClick={() => router.push('/helpdesk/knowledge-base')}
            className="flex items-center justify-between card-interactive p-4 text-left"
          >
            <div className="flex items-center gap-3">
              <BookOpen className="w-5 h-5 text-[var(--text-muted)]" />
              <div>
                <p className="font-medium text-[var(--text-primary)]">Knowledge Base</p>
                <p className="text-xs text-[var(--text-muted)]">Find answers to common questions</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-[var(--text-muted)]" />
          </button>

          <button
            onClick={() => router.push('/helpdesk/sla')}
            className="flex items-center justify-between card-interactive p-4 text-left"
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
          <div className="skeuo-card p-4">
            <h3 className="font-semibold text-[var(--text-primary)] mb-3">Overview</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-success-600">{dashboard.slaMetCount}</p>
                <p className="text-xs text-[var(--text-muted)]">SLAs Met</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-danger-600">{dashboard.slaBreachedCount}</p>
                <p className="text-xs text-[var(--text-muted)]">SLAs Breached</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-accent-600">{dashboard.firstContactResolutions}</p>
                <p className="text-xs text-[var(--text-muted)]">First Contact Resolutions</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-accent-800">{activeSlaCount}</p>
                <p className="text-xs text-[var(--text-muted)]">Active SLA Policies</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
