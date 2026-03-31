// Survey Types

export enum SurveyType {
  ENGAGEMENT = 'ENGAGEMENT',
  SATISFACTION = 'SATISFACTION',
  PULSE = 'PULSE',
  EXIT = 'EXIT',
  FEEDBACK = 'FEEDBACK',
  CUSTOM = 'CUSTOM',
}

export enum SurveyStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  COMPLETED = 'COMPLETED',
  ARCHIVED = 'ARCHIVED',
}

export enum QuestionType {
  SINGLE_CHOICE = 'SINGLE_CHOICE',
  MULTIPLE_CHOICE = 'MULTIPLE_CHOICE',
  TEXT = 'TEXT',
  RATING = 'RATING',
  SCALE = 'SCALE',
  YES_NO = 'YES_NO',
  DATE = 'DATE',
  NPS = 'NPS',
}

export interface Survey {
  id: string;
  surveyCode: string;
  title: string;
  description?: string;
  surveyType: SurveyType;
  isAnonymous: boolean;
  startDate?: string;
  endDate?: string;
  status: SurveyStatus;
  targetAudience?: string;
  totalResponses: number;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  questions?: SurveyQuestion[];
}

export interface SurveyRequest {
  surveyCode: string;
  title: string;
  description?: string;
  surveyType: SurveyType;
  isAnonymous?: boolean;
  startDate?: string;
  endDate?: string;
  status?: SurveyStatus;
  targetAudience?: string;
}

export interface SurveyQuestion {
  id: string;
  surveyId: string;
  questionText: string;
  questionType: QuestionType;
  isRequired: boolean;
  orderIndex: number;
  options?: string[];
  minValue?: number;
  maxValue?: number;
}

export interface QuestionRequest {
  surveyId: string;
  questionText: string;
  questionType: QuestionType;
  isRequired?: boolean;
  orderIndex?: number;
  options?: string[];
  minValue?: number;
  maxValue?: number;
}

export interface SurveyResponse {
  id: string;
  surveyId: string;
  employeeId?: string;
  submittedAt: string;
  answers: SurveyAnswer[];
}

export interface SurveyAnswer {
  id: string;
  questionId: string;
  answerText?: string;
  selectedOptions?: string[];
  ratingValue?: number;
}

export interface SubmitResponseRequest {
  surveyId: string;
  employeeId?: string;
  answers: {
    questionId: string;
    answerText?: string;
    selectedOptions?: string[];
    ratingValue?: number;
  }[];
}

export interface SurveyAnalyticsSummary {
  surveyId: string;
  totalResponses: number;
  completionRate: number;
  averageCompletionTime?: number;
  questionStats: QuestionStat[];
}

export interface QuestionStat {
  questionId: string;
  questionText: string;
  responseCount: number;
  averageRating?: number;
  optionDistribution?: Record<string, number>;
}

export interface EngagementScore {
  id: string;
  employeeId: string;
  surveyId: string;
  score: number;
  calculatedAt: string;
  category: string;
}
