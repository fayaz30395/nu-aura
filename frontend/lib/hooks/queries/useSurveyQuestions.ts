'use client';

import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {apiClient} from '@/lib/api/client';
import {notifications} from '@mantine/notifications';
import type {
  QuestionRequest,
  QuestionStat,
  SubmitResponseRequest,
  SurveyAnalyticsSummary,
  SurveyQuestion,
} from '@/lib/types/grow/survey';
import {QuestionType} from '@/lib/types/grow/survey';

// ─── Backend Wire Types (SurveyAnalyticsController, base /survey-analytics) ─
// DEV-2: the question/response/analytics endpoints live on
// SurveyAnalyticsController (`/api/v1/survey-analytics/...`), NOT on
// `/survey-management/...`. Payload shapes also differ from the FE types,
// so this file maps between the two.

type BackendQuestionType =
  | 'SINGLE_CHOICE'
  | 'MULTIPLE_CHOICE'
  | 'LIKERT_SCALE'
  | 'RATING'
  | 'NET_PROMOTER_SCORE'
  | 'TEXT_SHORT'
  | 'TEXT_LONG'
  | 'RANKING'
  | 'MATRIX'
  | 'DATE'
  | 'NUMBER';

interface BackendQuestionResponse {
  id: string;
  surveyId: string;
  questionText: string;
  questionType: BackendQuestionType;
  questionOrder: number;
  required: boolean;
  options?: string[] | null;
  minScale?: number | null;
  maxScale?: number | null;
}

interface BackendQuestionAnalytics {
  questionId: string;
  questionText: string;
  questionType?: string;
  averageScore?: number | null;
  answerDistribution?: Record<string, number> | null;
  responseCount?: number | null;
}

interface BackendAnalyticsSummary {
  surveyId: string;
  totalResponses?: number | null;
  completionRate?: number | null;
  averageCompletionTimeMinutes?: number | null;
  questionAnalytics?: BackendQuestionAnalytics[] | null;
}

const TO_FE_QUESTION_TYPE: Record<BackendQuestionType, QuestionType> = {
  SINGLE_CHOICE: QuestionType.SINGLE_CHOICE,
  MULTIPLE_CHOICE: QuestionType.MULTIPLE_CHOICE,
  LIKERT_SCALE: QuestionType.SCALE,
  RATING: QuestionType.RATING,
  NET_PROMOTER_SCORE: QuestionType.NPS,
  TEXT_SHORT: QuestionType.TEXT,
  TEXT_LONG: QuestionType.TEXT,
  RANKING: QuestionType.TEXT,
  MATRIX: QuestionType.TEXT,
  DATE: QuestionType.DATE,
  NUMBER: QuestionType.TEXT,
};

const TO_BE_QUESTION_TYPE: Record<QuestionType, BackendQuestionType> = {
  [QuestionType.SINGLE_CHOICE]: 'SINGLE_CHOICE',
  [QuestionType.MULTIPLE_CHOICE]: 'MULTIPLE_CHOICE',
  [QuestionType.TEXT]: 'TEXT_LONG',
  [QuestionType.RATING]: 'RATING',
  [QuestionType.SCALE]: 'LIKERT_SCALE',
  [QuestionType.YES_NO]: 'SINGLE_CHOICE',
  [QuestionType.DATE]: 'DATE',
  [QuestionType.NPS]: 'NET_PROMOTER_SCORE',
};

function toFeQuestion(q: BackendQuestionResponse): SurveyQuestion {
  return {
    id: q.id,
    surveyId: q.surveyId,
    questionText: q.questionText,
    questionType: TO_FE_QUESTION_TYPE[q.questionType] ?? QuestionType.TEXT,
    isRequired: q.required,
    orderIndex: q.questionOrder,
    options: q.options ?? undefined,
    minValue: q.minScale ?? undefined,
    maxValue: q.maxScale ?? undefined,
  };
}

function toFeAnalytics(summary: BackendAnalyticsSummary): SurveyAnalyticsSummary {
  const questionStats: QuestionStat[] = (summary.questionAnalytics ?? []).map((qa) => ({
    questionId: qa.questionId,
    questionText: qa.questionText,
    responseCount: qa.responseCount ?? 0,
    averageRating: qa.averageScore ?? undefined,
    optionDistribution: qa.answerDistribution ?? undefined,
  }));

  return {
    surveyId: summary.surveyId,
    totalResponses: summary.totalResponses ?? 0,
    completionRate: summary.completionRate ?? 0,
    averageCompletionTime: summary.averageCompletionTimeMinutes ?? undefined,
    questionStats,
  };
}

function extractErrorMessage(error: unknown, fallback: string): string {
  const apiMessage = (error as { response?: { data?: { message?: string } } })?.response?.data
    ?.message;
  if (apiMessage) return apiMessage;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

// ─── Query Key Factory ─────────────────────────────────────────────────────
export const surveyQuestionKeys = {
  all: ['survey-questions'] as const,
  list: (surveyId: string) => [...surveyQuestionKeys.all, 'list', surveyId] as const,
  analytics: (surveyId: string) => [...surveyQuestionKeys.all, 'analytics', surveyId] as const,
};

// ─── Query Hooks ───────────────────────────────────────────────────────────

export function useSurveyQuestions(surveyId: string) {
  return useQuery({
    queryKey: surveyQuestionKeys.list(surveyId),
    queryFn: async () => {
      const response = await apiClient.get<BackendQuestionResponse[]>(
        `/survey-analytics/surveys/${surveyId}/questions`
      );
      return response.data.map(toFeQuestion);
    },
    enabled: !!surveyId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useSurveyAnalytics(surveyId: string) {
  return useQuery({
    queryKey: surveyQuestionKeys.analytics(surveyId),
    queryFn: async () => {
      const response = await apiClient.get<BackendAnalyticsSummary>(
        `/survey-analytics/surveys/${surveyId}/summary`
      );
      return toFeAnalytics(response.data);
    },
    enabled: !!surveyId,
    staleTime: 5 * 60 * 1000,
  });
}

// ─── Mutation Hooks ────────────────────────────────────────────────────────

export function useAddQuestion(surveyId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Omit<QuestionRequest, 'surveyId'>) => {
      const isYesNo = data.questionType === QuestionType.YES_NO;
      const payload = {
        questionText: data.questionText,
        questionType: TO_BE_QUESTION_TYPE[data.questionType] ?? 'TEXT_LONG',
        questionOrder: data.orderIndex ?? 0,
        required: data.isRequired ?? false,
        options: isYesNo && (!data.options || data.options.length === 0)
          ? ['Yes', 'No']
          : data.options,
        minScale: data.minValue,
        maxScale: data.maxValue,
      };
      const response = await apiClient.post<BackendQuestionResponse>(
        `/survey-analytics/surveys/${surveyId}/questions`,
        payload
      );
      return toFeQuestion(response.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: surveyQuestionKeys.list(surveyId)});
      notifications.show({
        title: 'Success',
        message: 'Question added successfully',
        color: 'green',
      });
    },
    onError: (error: unknown) => {
      notifications.show({
        title: 'Error',
        message: extractErrorMessage(error, 'Failed to add question'),
        color: 'red',
      });
    },
  });
}

export function useDeleteQuestion(surveyId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    // DEV-2: the backend exposes no DELETE question endpoint
    // (SurveyAnalyticsController has GET/POST questions only). Guarded until
    // the backend ships — surfaces a clear message instead of a 404.
    mutationFn: async (_questionId: string): Promise<void> => {
      throw new Error('Question deletion is not available yet.');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: surveyQuestionKeys.list(surveyId)});
    },
    onError: (error: unknown) => {
      notifications.show({
        title: 'Not available',
        message: extractErrorMessage(error, 'Failed to delete question'),
        color: 'red',
      });
    },
  });
}

export function useSubmitSurveyResponse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: SubmitResponseRequest) => {
      const response = await apiClient.post<void>('/survey-analytics/responses/submit', data);
      return response.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: surveyQuestionKeys.analytics(variables.surveyId),
      });
      notifications.show({
        title: 'Success',
        message: 'Survey response submitted successfully',
        color: 'green',
      });
    },
    onError: (error: unknown) => {
      notifications.show({
        title: 'Error',
        message: extractErrorMessage(error, 'Failed to submit response'),
        color: 'red',
      });
    },
  });
}
