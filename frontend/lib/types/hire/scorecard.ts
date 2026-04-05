export type ScorecardRecommendation =
  | 'STRONG_YES'
  | 'YES'
  | 'NEUTRAL'
  | 'NO'
  | 'STRONG_NO';

export type ScorecardStatus = 'DRAFT' | 'SUBMITTED';

export interface ScorecardCriterion {
  id?: string;
  name: string;
  category?: string;
  rating: number;
  weight: number;
  notes?: string;
  orderIndex?: number;
}

export interface InterviewScorecard {
  id: string;
  interviewId: string;
  applicantId: string;
  jobOpeningId: string;
  interviewerId: string;
  interviewerName?: string;
  templateId?: string;
  overallRating?: number;
  recommendation?: ScorecardRecommendation;
  overallNotes?: string;
  submittedAt?: string;
  status: ScorecardStatus;
  criteria: ScorecardCriterion[];
  createdAt: string;
  updatedAt?: string;
}

export interface ScorecardTemplateCriterion {
  id?: string;
  name: string;
  category?: string;
  weight: number;
  orderIndex?: number;
}

export interface ScorecardTemplate {
  id: string;
  name: string;
  description?: string;
  isDefault: boolean;
  criteria: ScorecardTemplateCriterion[];
}

export interface CreateScorecardRequest {
  interviewId: string;
  applicantId: string;
  jobOpeningId: string;
  templateId?: string;
  overallRating?: number;
  recommendation?: ScorecardRecommendation;
  overallNotes?: string;
  criteria: ScorecardCriterion[];
}

export interface UpdateScorecardRequest {
  overallRating?: number;
  recommendation?: ScorecardRecommendation;
  overallNotes?: string;
  criteria?: ScorecardCriterion[];
}

export interface CreateScorecardTemplateRequest {
  name: string;
  description?: string;
  isDefault?: boolean;
  criteria: ScorecardTemplateCriterion[];
}
