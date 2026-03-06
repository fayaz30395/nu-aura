'use client';

import { Badge } from '@mantine/core';
import type { CandidateStage } from '@/lib/types/recruitment';

interface StageBadgeProps {
  stage: CandidateStage;
}

const STAGE_COLOR: Record<CandidateStage, string> = {
  APPLIED: 'gray',
  SCREENING: 'blue',
  INTERVIEW: 'orange',
  ASSESSMENT: 'violet',
  OFFER: 'yellow',
  HIRED: 'green',
  REJECTED: 'red',
};

const STAGE_LABEL: Record<CandidateStage, string> = {
  APPLIED: 'Applied',
  SCREENING: 'Screening',
  INTERVIEW: 'Interview',
  ASSESSMENT: 'Assessment',
  OFFER: 'Offer',
  HIRED: 'Hired',
  REJECTED: 'Rejected',
};

export function StageBadge({ stage }: StageBadgeProps) {
  return (
    <Badge color={STAGE_COLOR[stage]} variant="light" size="sm">
      {STAGE_LABEL[stage]}
    </Badge>
  );
}
