import {useMemo} from 'react';
import {useQueries} from '@tanstack/react-query';
import {useSubordinates} from '@/lib/hooks/queries/useEmployees';
import {employeeSkillService, skillGapService} from '@/lib/services/grow/competencyService';
import type {CompetencyCategory, EmployeeSkill, SkillGapDetail} from '@/lib/types/grow/competency';
import {COMPETENCY_CATEGORY_LABELS} from '@/lib/types/grow/competency';

export interface TeamCompetencyData {
  reportIds: string[];
  skills: EmployeeSkill[];
  gaps: SkillGapDetail[];
  heatmapData: {category: string; avgLevel: number; count: number}[];
}

/**
 * Loads skills + gap analysis for every direct report of `managerId` and exposes
 * them as a single QueryState-compatible result.
 */
export function useTeamCompetencies(managerId: string) {
  const subordinatesQuery = useSubordinates(managerId, !!managerId);
  const reportIds = useMemo(
    () => (subordinatesQuery.data || []).map((e) => e.id),
    [subordinatesQuery.data]
  );

  const skillsQueries = useQueries({
    queries: reportIds.map((id) => ({
      queryKey: ['employeeSkills', id],
      queryFn: () => employeeSkillService.getByEmployee(id),
      enabled: !!id,
      staleTime: 5 * 60 * 1000,
    })),
  });

  const gapQueries = useQueries({
    queries: reportIds.map((id) => ({
      queryKey: ['skillGapAnalysis', id],
      queryFn: () => skillGapService.analyze(id),
      enabled: !!id,
      staleTime: 5 * 60 * 1000,
    })),
  });

  const skillsLoading = subordinatesQuery.isLoading || skillsQueries.some((q) => q.isLoading);
  const gapsLoading = subordinatesQuery.isLoading || gapQueries.some((q) => q.isLoading);
  const isLoading = skillsLoading || gapsLoading;

  const skills = useMemo(
    () => skillsQueries.flatMap((q) => q.data || []),
    [skillsQueries]
  );

  // Merge each reportee's gaps into one list, keeping the worst-case gap per skill.
  const gaps = useMemo(() => {
    const bySkill = new Map<string, SkillGapDetail>();
    for (const q of gapQueries) {
      for (const gap of q.data?.gaps || []) {
        const existing = bySkill.get(gap.skillName);
        if (!existing || gap.currentLevel - gap.requiredLevel < existing.currentLevel - existing.requiredLevel) {
          bySkill.set(gap.skillName, gap);
        }
      }
    }
    return Array.from(bySkill.values());
  }, [gapQueries]);

  const heatmapData = useMemo(() => {
    if (!skills.length) return [];
    const grouped: Record<string, {total: number; count: number}> = {};
    skills.forEach((s) => {
      const cat = s.category || 'Other';
      if (!grouped[cat]) grouped[cat] = {total: 0, count: 0};
      grouped[cat].total += s.proficiencyLevel;
      grouped[cat].count += 1;
    });
    return Object.entries(grouped).map(([category, data]) => ({
      category: COMPETENCY_CATEGORY_LABELS[category as CompetencyCategory] || category,
      avgLevel: Math.round((data.total / data.count) * 10) / 10,
      count: data.count,
    }));
  }, [skills]);

  const data = useMemo<TeamCompetencyData | undefined>(
    () => (isLoading || subordinatesQuery.isError ? undefined : {reportIds, skills, gaps, heatmapData}),
    [isLoading, subordinatesQuery.isError, reportIds, skills, gaps, heatmapData]
  );

  return {
    data,
    isPending: isLoading,
    isError: subordinatesQuery.isError,
    isFetching: subordinatesQuery.isFetching,
    refetch: subordinatesQuery.refetch,
  };
}
