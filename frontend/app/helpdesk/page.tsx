'use client';

import {useMemo} from 'react';
import {useRouter} from 'next/navigation';
import {AppLayout} from '@/components/layout';
import {useMyPendingEscalations, useSlaConfigs, useSLADashboard} from '@/lib/hooks/queries/useHelpdeskSla';
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Bell,
  BookOpen,
  CheckCircle2,
  Clock,
  Headphones,
  Settings,
  Ticket,
} from 'lucide-react';
import {Permissions, usePermissions} from '@/lib/hooks/usePermissions';

export default function HelpdeskPage() {
  const router = useRouter();
  const {hasPermission} = usePermissions();
  const isHelpdeskAdmin = hasPermission(Permissions.SYSTEM_ADMIN);
  const {data: dashboard, isLoading: dashboardLoading, error: dashboardError} = useSLADashboard();
  const {data: escalations = [], isLoading: escalationsLoading} = useMyPendingEscalations();
  const {data: slasResponse} = useSlaConfigs(0, 100);

  const activeSlaCount = useMemo(
    () => (slasResponse?.content ?? []).filter((s) => s?.isActive).length,
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
      color: "text-status-success-text",
      bg: "bg-status-success-bg",
    },
    {
      label: 'Avg First Response',
      value: getStatValue(() => `${dashboard.averageFirstResponseMinutes} min`),
      icon: Clock,
      color: "text-accent",
      bg: "bg-accent-subtle",
    },
    {
      label: 'Avg Resolution',
      value: getStatValue(() => `${dashboard.averageResolutionMinutes} min`),
      icon: BarChart3,
      color: "text-accent",
      bg: "bg-accent-subtle",
    },
    {
      label: 'Avg CSAT',
      value: getStatValue(() => `${dashboard.averageCSAT.toFixed(1)} / 5`),
      icon: Headphones,
      color: "text-status-warning-text",
      bg: "bg-status-warning-bg",
    },
  ];

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)] skeuo-emboss">Helpdesk</h1>
          <p className="text-body-muted mt-1 skeuo-deboss">Manage SLA policies, escalations, and support metrics</p>
        </div>

        {/* Stat Cards — admin-only SLA metrics (DEF-56) */}
        {isHelpdeskAdmin && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {statCards.map((card) => (
              <div
                key={card.label}
                className="skeuo-card p-4"
              >
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-lg ${card.bg}`}>
                    <card.icon className={`w-5 h-5 ${card.color}`}/>
                  </div>
                  <div>
                    <p className="text-caption">{card.label}</p>
                    <p className="text-lg font-semibold text-[var(--text-primary)]">
                      {card.value}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pending Escalations */}
        {escalations.length > 0 && (
          <div
            className='bg-status-warning-bg border border-status-warning-border rounded-xl p-4'>
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className='w-5 h-5 text-status-warning-text'/>
              <h3 className='font-semibold text-status-warning-text'>
                Pending Escalations ({escalations.length})
              </h3>
            </div>
            <div className="space-y-2">
              {escalations.filter(Boolean).slice(0, 5).map((esc) => (
                <div
                  key={esc.id}
                  className="row-between bg-[var(--bg-surface)] rounded-lg px-4 py-2"
                >
                  <div>
                    <span className="text-sm font-medium text-[var(--text-primary)]">
                      Ticket #{esc.ticketId?.slice(0, 8) ?? '—'}
                    </span>
                    <span className="ml-2 text-caption">
                      {esc.escalationLevel ?? '-'} — {esc.escalationReason ? esc.escalationReason.replace(/_/g, ' ') : '-'}
                    </span>
                  </div>
                  <span className="text-caption">
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
            className="row-between card-interactive p-4 text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
          >
            <div className="flex items-center gap-4">
              <Ticket className='w-5 h-5 text-accent'/>
              <div>
                <p className="font-medium text-[var(--text-primary)]">Tickets</p>
                <p className="text-caption">View and manage support tickets</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-[var(--text-muted)]"/>
          </button>

          <button
            onClick={() => router.push('/helpdesk/sla')}
            className="row-between card-interactive p-4 text-left"
          >
            <div className="flex items-center gap-4">
              <Settings className="w-5 h-5 text-[var(--text-muted)]"/>
              <div>
                <p className="font-medium text-[var(--text-primary)]">SLA Policies</p>
                <p className="text-caption">{activeSlaCount} active policies</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-[var(--text-muted)]"/>
          </button>

          <button
            onClick={() => router.push('/helpdesk/sla')}
            className="row-between card-interactive p-4 text-left"
          >
            <div className="flex items-center gap-4">
              <Bell className="w-5 h-5 text-[var(--text-muted)]"/>
              <div>
                <p className="font-medium text-[var(--text-primary)]">Escalations</p>
                <p className="text-caption">{escalations.length} pending</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-[var(--text-muted)]"/>
          </button>

          <button
            onClick={() => router.push('/helpdesk/knowledge-base')}
            className="row-between card-interactive p-4 text-left"
          >
            <div className="flex items-center gap-4">
              <BookOpen className="w-5 h-5 text-[var(--text-muted)]"/>
              <div>
                <p className="font-medium text-[var(--text-primary)]">Knowledge Base</p>
                <p className="text-caption">Find answers to common questions</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-[var(--text-muted)]"/>
          </button>

          <button
            onClick={() => router.push('/helpdesk/sla')}
            className="row-between card-interactive p-4 text-left"
          >
            <div className="flex items-center gap-4">
              <BarChart3 className="w-5 h-5 text-[var(--text-muted)]"/>
              <div>
                <p className="font-medium text-[var(--text-primary)]">SLA Dashboard</p>
                <p className="text-caption">View detailed metrics</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-[var(--text-muted)]"/>
          </button>
        </div>

        {/* Summary Stats */}
        {dashboard && (
          <div className="skeuo-card p-4">
            <h3 className="font-semibold text-[var(--text-primary)] mb-4">Overview</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <p className='text-xl font-bold text-status-success-text'>{dashboard.slaMetCount}</p>
                <p className="text-caption">SLAs Met</p>
              </div>
              <div>
                <p className='text-xl font-bold text-status-danger-text'>{dashboard.slaBreachedCount}</p>
                <p className="text-caption">SLAs Breached</p>
              </div>
              <div>
                <p className='text-xl font-bold text-accent'>{dashboard.firstContactResolutions}</p>
                <p className="text-caption">First Contact Resolutions</p>
              </div>
              <div>
                <p className='text-xl font-bold text-accent'>{activeSlaCount}</p>
                <p className="text-caption">Active SLA Policies</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
