'use client';

import type {ReactNode} from 'react';
import {Button, Progress} from '@mantine/core';
import {CheckCircle, Clock, Eye, Share2} from 'lucide-react';
import {PermissionGate} from '@/components/auth/PermissionGate';
import {Card} from '@/components/ui/Card';
import {Permissions} from '@/lib/hooks/usePermissions';
import type {Feedback360Summary} from '@/lib/services/grow/feedback360.service';
import {RatingStars} from './RatingStars';

interface SummaryCardProps {
  summary: Feedback360Summary;
  onView: (summary: Feedback360Summary) => void;
  onShare: (summaryId: string) => void;
}

function CompletionIcon({done}: {done: boolean}) {
  return done
    ? <CheckCircle className="inline h-4 w-4 text-success-500" aria-label="Completed"/>
    : <Clock className="inline h-4 w-4 text-text-3" aria-label="Pending"/>;
}

function Stat({label, children}: {label: string; children: ReactNode}) {
  return (
    <div className="flex justify-between gap-2">
      <dt className="text-text-3">{label}</dt>
      <dd className="font-medium text-text-1">{children}</dd>
    </div>
  );
}

function Competency({label, value, color}: {label: string; value: number; color: string}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-sm text-text-2">{label}</span>
      <div className="flex items-center gap-2">
        <Progress value={(value / 5) * 100} color={color} size="sm" className="w-24" aria-label={label}/>
        <span className="text-sm font-medium tabular-nums text-text-1">{value.toFixed(1)}</span>
      </div>
    </div>
  );
}

export function SummaryCard({summary, onView, onShare}: SummaryCardProps) {
  const hasCompetencies = !!(summary.avgCommunication || summary.avgTeamwork || summary.avgLeadership);
  const hasNarrative = !!(summary.consolidatedStrengths || summary.consolidatedImprovements);

  return (
    <Card as="article" className="flex flex-col gap-4 p-4">
      <header className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-base font-semibold text-text-1">Feedback Summary</h2>
          <p className="text-sm text-text-2">Cycle: {summary.cycleId.slice(0, 8)}</p>
        </div>
        {!!summary.finalRating && (
          <div className="flex flex-col items-end gap-1">
            <span className="text-xl font-semibold tabular-nums text-text-1">{summary.finalRating.toFixed(1)}</span>
            <RatingStars rating={Math.round(summary.finalRating)} label="Final rating"/>
          </div>
        )}
      </header>

      <dl className="grid grid-cols-2 gap-4 text-sm">
        <Stat label="Responses:">{summary.responsesReceived}/{summary.totalReviewers}</Stat>
        <Stat label="Self Review:"><CompletionIcon done={summary.selfReviewCompleted}/></Stat>
        <Stat label="Manager Review:"><CompletionIcon done={summary.managerReviewCompleted}/></Stat>
        <Stat label="Peer Reviews:">{summary.peerReviewsCompleted}</Stat>
      </dl>

      {hasCompetencies && (
        <section className="flex flex-col gap-2 border-t border-border pt-4">
          <h3 className="text-xs font-medium uppercase text-text-3">Competency Ratings</h3>
          {!!summary.avgCommunication && <Competency label="Communication" value={summary.avgCommunication} color="aura"/>}
          {!!summary.avgTeamwork && <Competency label="Teamwork" value={summary.avgTeamwork} color="green"/>}
          {!!summary.avgLeadership && <Competency label="Leadership" value={summary.avgLeadership} color="aura.7"/>}
        </section>
      )}

      {hasNarrative && (
        <section className="flex flex-col gap-4 border-t border-border pt-4">
          {summary.consolidatedStrengths && (
            <div>
              <h3 className="mb-1 text-xs font-medium text-success-600">Strengths</h3>
              <p className="line-clamp-2 text-sm text-text-2">{summary.consolidatedStrengths}</p>
            </div>
          )}
          {summary.consolidatedImprovements && (
            <div>
              <h3 className="mb-1 text-xs font-medium text-warning-600">Areas for Improvement</h3>
              <p className="line-clamp-2 text-sm text-text-2">{summary.consolidatedImprovements}</p>
            </div>
          )}
        </section>
      )}

      <footer className="mt-auto flex justify-end gap-2 border-t border-border pt-4">
        <Button variant="default" size="sm" leftSection={<Eye className="h-4 w-4" aria-hidden/>} onClick={() => onView(summary)}>
          View Details
        </Button>
        {!summary.sharedWithEmployee && (
          <PermissionGate permission={Permissions.FEEDBACK_360_MANAGE}>
            <Button size="sm" leftSection={<Share2 className="h-4 w-4" aria-hidden/>} onClick={() => onShare(summary.id)}>
              Share
            </Button>
          </PermissionGate>
        )}
      </footer>
    </Card>
  );
}
