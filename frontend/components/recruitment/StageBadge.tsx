'use client';

import { Badge } from '@mantine/core';
import type { RecruitmentStage } from '@/lib/types/recruitment';

interface StageBadgeProps {
  stage: RecruitmentStage;
}

const STAGE_COLOR: Record<RecruitmentStage, string> = {
  RECRUITERS_PHONE_CALL: 'gray',
  PANEL_REVIEW: 'blue',
  PANEL_REJECT: 'red',
  PANEL_SHORTLISTED: 'cyan',
  TECHNICAL_INTERVIEW_SCHEDULED: 'indigo',
  TECHNICAL_INTERVIEW_COMPLETED: 'indigo',
  MANAGEMENT_INTERVIEW_SCHEDULED: 'violet',
  MANAGEMENT_INTERVIEW_COMPLETED: 'violet',
  CLIENT_INTERVIEW_SCHEDULED: 'grape',
  CLIENT_INTERVIEW_COMPLETED: 'grape',
  HR_FINAL_INTERVIEW_COMPLETED: 'teal',
  CANDIDATE_REJECTED: 'red',
  OFFER_NDA_TO_BE_RELEASED: 'green',
};

const STAGE_LABEL: Record<RecruitmentStage, string> = {
  RECRUITERS_PHONE_CALL: 'Phone Call',
  PANEL_REVIEW: 'Panel Review',
  PANEL_REJECT: 'Panel Reject',
  PANEL_SHORTLISTED: 'Shortlisted',
  TECHNICAL_INTERVIEW_SCHEDULED: 'Tech Interview',
  TECHNICAL_INTERVIEW_COMPLETED: 'Tech Done',
  MANAGEMENT_INTERVIEW_SCHEDULED: 'Mgmt Interview',
  MANAGEMENT_INTERVIEW_COMPLETED: 'Mgmt Done',
  CLIENT_INTERVIEW_SCHEDULED: 'Client Interview',
  CLIENT_INTERVIEW_COMPLETED: 'Client Done',
  HR_FINAL_INTERVIEW_COMPLETED: 'HR Final Done',
  CANDIDATE_REJECTED: 'Rejected',
  OFFER_NDA_TO_BE_RELEASED: 'Offer / NDA',
};

export function StageBadge({ stage }: StageBadgeProps) {
  return (
    <Badge color={STAGE_COLOR[stage] ?? 'gray'} variant="light" size="sm">
      {STAGE_LABEL[stage] ?? stage}
    </Badge>
  );
}
