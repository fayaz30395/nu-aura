'use client';

import React, {useMemo} from 'react';
import {BarChart3, Clock, TrendingUp, User} from 'lucide-react';
import {StatusBadge} from '@/components/ui/StatusBadge';
import {ApplicationSource, ApplicationStatus} from '@/lib/types/hire/applicant';
import type {PipelineData} from '@/lib/types/hire/applicant';
import {formatLabel, getDaysSince, SOURCE_TONE, STAGE_LABELS, STAGE_TONE, TONE_FILL} from './pipeline-config';

const FUNNEL_STAGES = [
  ApplicationStatus.APPLIED,
  ApplicationStatus.SCREENING,
  ApplicationStatus.PHONE_SCREEN,
  ApplicationStatus.INTERVIEW,
  ApplicationStatus.TECHNICAL_ROUND,
  ApplicationStatus.HR_ROUND,
  ApplicationStatus.OFFER_PENDING,
  ApplicationStatus.OFFERED,
  ApplicationStatus.ACCEPTED,
];

const BAR_STAGES = FUNNEL_STAGES.filter((s) => s !== ApplicationStatus.OFFER_PENDING);

function Metric({icon: Icon, label, value, caption}: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
  caption: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-border bg-card p-4">
      <span className="flex items-center gap-2 text-xs font-medium text-text-2">
        <Icon className="h-4 w-4" aria-hidden="true"/>
        {label}
      </span>
      <span className="text-xl font-semibold tabular-nums text-text-1">{value}</span>
      <span className="text-xs text-text-3">{caption}</span>
    </div>
  );
}

export function PipelineAnalytics({pipelineData}: {pipelineData: PipelineData}) {
  const allApplicants = useMemo(() => Object.values(pipelineData || {}).flat(), [pipelineData]);
  const counts = FUNNEL_STAGES.map((s) => pipelineData?.[s]?.length ?? 0);
  const totalApplied = counts[0];
  const totalAccepted = counts[counts.length - 1];
  const totalRejected = pipelineData?.[ApplicationStatus.REJECTED]?.length ?? 0;
  const totalActive = counts.reduce((s, c) => s + c, 0) - totalAccepted;
  const conversionRate = totalApplied > 0 ? ((totalAccepted / totalApplied) * 100).toFixed(1) : '0.0';

  const avgDaysInStage = useMemo(() => {
    const withStageTime = allApplicants.filter((a) => a.currentStageEnteredAt);
    if (withStageTime.length === 0) return null;
    const totalDays = withStageTime.reduce((sum, a) => sum + (getDaysSince(a.currentStageEnteredAt) || 0), 0);
    return Math.round(totalDays / withStageTime.length);
  }, [allApplicants]);

  const sourceBreakdown = useMemo(() => {
    const bySource: Record<string, number> = {};
    allApplicants.forEach((a) => {
      const src = a.source || 'OTHER';
      bySource[src] = (bySource[src] || 0) + 1;
    });
    return Object.entries(bySource).sort((a, b) => b[1] - a[1]).slice(0, 4);
  }, [allApplicants]);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Metric icon={User} label="Active pipeline" value={totalActive}
                caption={`${totalAccepted} accepted, ${totalRejected} rejected`}/>
        <Metric icon={TrendingUp} label="Conversion rate" value={`${conversionRate}%`} caption="Applied → Accepted"/>
        <Metric icon={Clock} label="Avg. time in stage" value={avgDaysInStage !== null ? `${avgDaysInStage}d` : '—'}
                caption="Across all stages"/>
        <Metric
          icon={BarChart3}
          label="Top sources"
          value={sourceBreakdown.length > 0 ? (
            <span className="flex flex-wrap gap-1">
              {sourceBreakdown.map(([src, count]) => (
                <StatusBadge key={src} status={src} label={`${formatLabel(src)} (${count})`}
                             tone={SOURCE_TONE[src as ApplicationSource] ?? 'neutral'} compact/>
              ))}
            </span>
          ) : '—'}
          caption={sourceBreakdown.length > 0 ? 'By applicant count' : 'No data'}
        />
      </div>
      <FunnelBar pipelineData={pipelineData}/>
    </div>
  );
}

function FunnelBar({pipelineData}: {pipelineData: PipelineData}) {
  const counts = BAR_STAGES.map((s) => pipelineData?.[s]?.length ?? 0);
  const maxCount = Math.max(...counts, 1);

  return (
    <figure className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4">
      <figcaption className="flex items-center gap-2 text-xs font-semibold text-text-2">
        <TrendingUp className="h-4 w-4" aria-hidden="true"/>
        Hiring funnel
      </figcaption>
      <ol className="flex h-16 items-end gap-2">
        {BAR_STAGES.map((stage, i) => {
          const count = counts[i];
          const height = Math.max((count / maxCount) * 100, 4);
          return (
            <li key={stage} className="flex h-full flex-1 flex-col items-center justify-end gap-1"
                aria-label={`${STAGE_LABELS[stage]}: ${count}`}>
              <span className="text-xs font-semibold tabular-nums text-text-2" aria-hidden="true">{count}</span>
              <span className={`w-full rounded-t-sm ${TONE_FILL[STAGE_TONE[stage]]}`} style={{height: `${height}%`}} aria-hidden="true"/>
              <span className="w-full truncate text-center text-2xs text-text-3" aria-hidden="true">
                {STAGE_LABELS[stage].split(' ')[0]}
              </span>
            </li>
          );
        })}
      </ol>
    </figure>
  );
}
