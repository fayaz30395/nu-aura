'use client';

import {useMemo} from 'react';
import {useRouter} from 'next/navigation';
import {AppLayout} from '@/components/layout';
import {PageTransition, Reveal, Stagger} from '@/components/motion';
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
import {formatDate} from '@/lib/utils/format/date';
import {KNOWLEDGE_BASE_API_AVAILABLE} from '@/lib/hooks/queries/useKnowledgeBase';

export default function HelpdeskPage() {
  const router = useRouter();
  const {hasPermission} = usePermissions();
  const isHelpdeskAdmin = hasPermission(Permissions.SYSTEM_ADMIN);
  const {data: dashboard, isLoading: dashboardLoading, error: dashboardError} = useSLADashboard();
  const {data: escalations = []} = useMyPendingEscalations();
  const {data: slasResponse} = useSlaConfigs(0, 100);

  const activeSlaCount = useMemo(
    () => (slasResponse?.content ?? []).filter((s) => s?.isActive).length,
    [slasResponse],
  );

  const getStatValue = (formatter: (data: NonNullable<typeof dashboard>) => string): string => {
    if (dashboardLoading) return '...';
    if (dashboardError || !dashboard) return 'N/A';
    return formatter(dashboard);
  };

  const statCards = [
    {
      label: 'SLA Compliance',
      value: getStatValue((data) => `${data.slaComplianceRate.toFixed(1)}%`),
      icon: CheckCircle2,
      tone: 'ok',
      bg: 'bg-[--ok-bg]',
    },
    {
      label: 'Avg First Response',
      value: getStatValue((data) => `${data.averageFirstResponseMinutes} min`),
      icon: Clock,
      tone: 'accent',
      bg: 'bg-[--accent-soft]',
    },
    {
      label: 'Avg Resolution',
      value: getStatValue((data) => `${data.averageResolutionMinutes} min`),
      icon: BarChart3,
      tone: 'info',
      bg: 'bg-[--accent-soft]',
    },
    {
      label: 'Avg CSAT',
      value: getStatValue((data) => `${data.averageCSAT.toFixed(1)} / 5`),
      icon: Headphones,
      tone: 'warn',
      bg: 'bg-[--warn-bg]',
    },
  ];

  return (
    <PageTransition>
      <AppLayout>
        <div className="space-y-6">
          <Reveal>
            <div>
              <h1 className="text-aura-title text-[--text-1]">Helpdesk</h1>
              <p className="text-[--text-2] mt-2">Manage SLA policies, escalations, and support metrics</p>
            </div>
          </Reveal>

          {/* Stat Cards — admin-only SLA metrics (DEF-56) */}
          {isHelpdeskAdmin && (
            <Stagger>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {statCards.map((card) => (
                  <Reveal key={card.label}>
                    <div
                      className="bg-[--surface] border border-[--border-soft] rounded-[--r-lg] p-4 shadow-[--sh-sm] hover:shadow-[--sh-md] hover:translate-y-[-1px] transition-all duration-[--t-base]"
                    >
                      <div className="flex items-center gap-2">
                        <div className={`p-2 rounded-[--r-md] ${card.bg}`}>
                          <card.icon className="w-5 h-5 text-[--accent]"/>
                        </div>
                        <div>
                          <p className="text-[--text-3] text-aura-micro">{card.label}</p>
                          <p className="text-aura-stat text-[--text-1] num">
                            {card.value}
                          </p>
                        </div>
                      </div>
                    </div>
                  </Reveal>
                ))}
              </div>
            </Stagger>
          )}

          {/* Pending Escalations */}
          {escalations.length > 0 && (
            <Reveal>
              <div
                className="bg-[--warn-bg] border border-[--warn-bd] rounded-[--r-lg] p-4">
                <div className="flex items-center gap-2 mb-4">
                  <AlertTriangle className="w-5 h-5 text-[--warn-fg]"/>
                  <h2 className="text-[--text-1] font-700">
                    Pending Escalations <span className="num">({escalations.length})</span>
                  </h2>
                </div>
                <div className="space-y-2">
                  {escalations.filter(Boolean).slice(0, 5).map((esc) => (
                    <div
                      key={esc.id}
                      className="flex items-center justify-between bg-[--surface] rounded-[--r-md] px-3 py-2 hover:bg-[--surface-hover] transition-colors duration-[--t-base]"
                    >
                      <div>
                        <span className="text-sm font-600 text-[--text-1] num">
                          Ticket #{esc.ticketId?.slice(0, 8) ?? '—'}
                        </span>
                        <span className="ml-2 text-aura-micro text-[--text-3]">
                          {esc.escalationLevel ?? '-'}: {esc.escalationReason ? esc.escalationReason.replace(/_/g, ' ') : '-'}
                        </span>
                      </div>
                      <span className="text-aura-micro text-[--text-3]">
                        {formatDate(esc.escalatedAt)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>
          )}

          {/* Quick Actions */}
          <Stagger>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(KNOWLEDGE_BASE_API_AVAILABLE
                ? [
                    {route: '/helpdesk/tickets', icon: Ticket, label: 'Tickets', desc: 'View and manage support tickets'},
                    {route: '/helpdesk/sla', icon: Settings, label: 'SLA Policies', desc: `${activeSlaCount} active policies`},
                    {route: '/helpdesk/sla', icon: Bell, label: 'Escalations', desc: `${escalations.length} pending`},
                    {route: '/helpdesk/knowledge-base', icon: BookOpen, label: 'Knowledge Base', desc: 'Find answers to common questions'},
                    {route: '/helpdesk/sla', icon: BarChart3, label: 'SLA Dashboard', desc: 'View detailed metrics'},
                  ]
                : [
                    {route: '/helpdesk/tickets', icon: Ticket, label: 'Tickets', desc: 'View and manage support tickets'},
                    {route: '/helpdesk/sla', icon: Settings, label: 'SLA Policies', desc: `${activeSlaCount} active policies`},
                    {route: '/helpdesk/sla', icon: Bell, label: 'Escalations', desc: `${escalations.length} pending`},
                    {route: '/helpdesk/sla', icon: BarChart3, label: 'SLA Dashboard', desc: 'View detailed metrics'},
                  ]
              ).map(({route, icon: Icon, label, desc}) => (
                <Reveal key={label}>
                  <button
                    onClick={() => router.push(route)}
                    className="flex items-center justify-between bg-[--surface] border border-[--border-soft] rounded-[--r-lg] p-4 hover:shadow-[--sh-md] hover:-translate-y-1 transition-all duration-[--t-base] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--accent] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[--bg-app]"
                  >
                    <div className="flex items-center gap-4 text-left">
                      <Icon className="w-5 h-5 text-[--accent]"/>
                      <div>
                        <p className="font-600 text-[--text-1]">{label}</p>
                        <p className="text-aura-micro text-[--text-3]">{desc}</p>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-[--text-3] flex-shrink-0"/>
                  </button>
                </Reveal>
              ))}
            </div>
          </Stagger>

          {/* Summary Stats */}
          {dashboard && (
            <Reveal>
              <div className="bg-[--surface] border border-[--border-soft] rounded-[--r-lg] p-4 shadow-[--sh-sm]">
                <h2 className="text-[--text-1] font-700 mb-6 text-aura-micro">OVERVIEW</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <p className="text-aura-stat text-[--ok-fg] num">{dashboard.slaMetCount}</p>
                    <p className="text-aura-micro text-[--text-3] mt-2">SLAs Met</p>
                  </div>
                  <div className="text-center">
                    <p className="text-aura-stat text-[--err-fg] num">{dashboard.slaBreachedCount}</p>
                    <p className="text-aura-micro text-[--text-3] mt-2">SLAs Breached</p>
                  </div>
                  <div className="text-center">
                    <p className="text-aura-stat text-[--accent] num">{dashboard.firstContactResolutions}</p>
                    <p className="text-aura-micro text-[--text-3] mt-2">First Contact Resolutions</p>
                  </div>
                  <div className="text-center">
                    <p className="text-aura-stat text-[--accent] num">{activeSlaCount}</p>
                    <p className="text-aura-micro text-[--text-3] mt-2">Active SLA Policies</p>
                  </div>
                </div>
              </div>
            </Reveal>
          )}
        </div>
      </AppLayout>
    </PageTransition>
  );
}
