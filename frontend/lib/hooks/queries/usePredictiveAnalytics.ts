'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { predictiveAnalyticsService } from '@/lib/services/predictive-analytics.service';
import type {
  PredictiveAnalyticsDashboard,
  AttritionPrediction,
  WorkforceTrend,
  AnalyticsInsight,
  SkillGap,
  PaginatedResponse,
} from '@/lib/types/predictive-analytics';

// ==================== Query Keys ====================

export const predictiveKeys = {
  all: ['predictive-analytics'] as const,
  dashboard: () => [...predictiveKeys.all, 'dashboard'] as const,
  attrition: () => [...predictiveKeys.all, 'attrition'] as const,
  highRisk: (minScore: number) => [...predictiveKeys.attrition(), 'high-risk', minScore] as const,
  byRiskLevel: (level: string) => [...predictiveKeys.attrition(), 'risk-level', level] as const,
  employeePredictions: (id: string) => [...predictiveKeys.attrition(), 'employee', id] as const,
  trends: () => [...predictiveKeys.all, 'trends'] as const,
  orgTrends: (year: number) => [...predictiveKeys.trends(), 'org', year] as const,
  deptTrends: (deptId: string, year: number) =>
    [...predictiveKeys.trends(), 'dept', deptId, year] as const,
  deptComparison: (year: number, month: number) =>
    [...predictiveKeys.trends(), 'compare', year, month] as const,
  insights: () => [...predictiveKeys.all, 'insights'] as const,
  insightsList: (page: number, size: number) =>
    [...predictiveKeys.insights(), 'list', page, size] as const,
  insightsByCategory: (cat: string) => [...predictiveKeys.insights(), 'category', cat] as const,
  insightsBySeverity: (sev: string) => [...predictiveKeys.insights(), 'severity', sev] as const,
  skillGaps: () => [...predictiveKeys.all, 'skill-gaps'] as const,
  skillGapsByPriority: (p: string) => [...predictiveKeys.skillGaps(), 'priority', p] as const,
  skillGapsByDept: (deptId: string) => [...predictiveKeys.skillGaps(), 'dept', deptId] as const,
  trainableGaps: () => [...predictiveKeys.skillGaps(), 'trainable'] as const,
};

// ==================== Dashboard ====================

export function usePredictiveDashboard(enabled: boolean = true) {
  return useQuery<PredictiveAnalyticsDashboard>({
    queryKey: predictiveKeys.dashboard(),
    queryFn: () => predictiveAnalyticsService.getDashboard(),
    enabled,
    staleTime: 5 * 60 * 1000,
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
  });
}

// ==================== Attrition ====================

export function useHighRiskEmployees(minScore: number = 70, enabled: boolean = true) {
  return useQuery<AttritionPrediction[]>({
    queryKey: predictiveKeys.highRisk(minScore),
    queryFn: () => predictiveAnalyticsService.getHighRiskEmployees(minScore),
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

export function useAttritionByRiskLevel(riskLevel: string, enabled: boolean = true) {
  return useQuery<AttritionPrediction[]>({
    queryKey: predictiveKeys.byRiskLevel(riskLevel),
    queryFn: () => predictiveAnalyticsService.getByRiskLevel(riskLevel),
    enabled: enabled && !!riskLevel,
    staleTime: 5 * 60 * 1000,
  });
}

export function useEmployeePredictions(employeeId: string, enabled: boolean = true) {
  return useQuery<AttritionPrediction[]>({
    queryKey: predictiveKeys.employeePredictions(employeeId),
    queryFn: () => predictiveAnalyticsService.getEmployeePredictions(employeeId),
    enabled: enabled && !!employeeId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useRunPrediction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (employeeId: string) => predictiveAnalyticsService.runPrediction(employeeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: predictiveKeys.attrition() });
      queryClient.invalidateQueries({ queryKey: predictiveKeys.dashboard() });
    },
  });
}

export function useMarkActionTaken() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ predictionId, notes }: { predictionId: string; notes?: string }) =>
      predictiveAnalyticsService.markActionTaken(predictionId, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: predictiveKeys.attrition() });
      queryClient.invalidateQueries({ queryKey: predictiveKeys.dashboard() });
    },
  });
}

// ==================== Trends ====================

export function useOrganizationTrends(year: number, enabled: boolean = true) {
  return useQuery<WorkforceTrend[]>({
    queryKey: predictiveKeys.orgTrends(year),
    queryFn: () => predictiveAnalyticsService.getOrganizationTrends(year),
    enabled,
    staleTime: 10 * 60 * 1000,
  });
}

export function useDepartmentTrends(
  departmentId: string,
  year: number,
  enabled: boolean = true
) {
  return useQuery<WorkforceTrend[]>({
    queryKey: predictiveKeys.deptTrends(departmentId, year),
    queryFn: () => predictiveAnalyticsService.getDepartmentTrends(departmentId, year),
    enabled: enabled && !!departmentId,
    staleTime: 10 * 60 * 1000,
  });
}

export function useDepartmentComparison(year: number, month: number, enabled: boolean = true) {
  return useQuery<WorkforceTrend[]>({
    queryKey: predictiveKeys.deptComparison(year, month),
    queryFn: () => predictiveAnalyticsService.compareDepartments(year, month),
    enabled,
    staleTime: 10 * 60 * 1000,
  });
}

// ==================== Insights ====================

export function useAnalyticsInsights(page: number = 0, size: number = 20, enabled: boolean = true) {
  return useQuery<PaginatedResponse<AnalyticsInsight>>({
    queryKey: predictiveKeys.insightsList(page, size),
    queryFn: () => predictiveAnalyticsService.getAllInsights(page, size),
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

export function useInsightsByCategory(category: string, enabled: boolean = true) {
  return useQuery<AnalyticsInsight[]>({
    queryKey: predictiveKeys.insightsByCategory(category),
    queryFn: () => predictiveAnalyticsService.getInsightsByCategory(category),
    enabled: enabled && !!category,
    staleTime: 5 * 60 * 1000,
  });
}

export function useInsightsBySeverity(severity: string, enabled: boolean = true) {
  return useQuery<AnalyticsInsight[]>({
    queryKey: predictiveKeys.insightsBySeverity(severity),
    queryFn: () => predictiveAnalyticsService.getInsightsBySeverity(severity),
    enabled: enabled && !!severity,
    staleTime: 5 * 60 * 1000,
  });
}

// ==================== Skill Gaps ====================

export function useLatestSkillGaps(enabled: boolean = true) {
  return useQuery<SkillGap[]>({
    queryKey: predictiveKeys.skillGaps(),
    queryFn: () => predictiveAnalyticsService.getLatestSkillGaps(),
    enabled,
    staleTime: 10 * 60 * 1000,
  });
}

export function useSkillGapsByPriority(priority: string, enabled: boolean = true) {
  return useQuery<SkillGap[]>({
    queryKey: predictiveKeys.skillGapsByPriority(priority),
    queryFn: () => predictiveAnalyticsService.getSkillGapsByPriority(priority),
    enabled: enabled && !!priority,
    staleTime: 10 * 60 * 1000,
  });
}

export function useTrainableGaps(enabled: boolean = true) {
  return useQuery<SkillGap[]>({
    queryKey: predictiveKeys.trainableGaps(),
    queryFn: () => predictiveAnalyticsService.getTrainableGaps(),
    enabled,
    staleTime: 10 * 60 * 1000,
  });
}
