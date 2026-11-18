'use client';

import {useMemo} from 'react';
import type {UseQueryResult} from '@tanstack/react-query';
import {Badge, Skeleton, Text, Tooltip} from '@mantine/core';
import {AlertTriangle, BarChart3, BookOpen} from 'lucide-react';
import {Card} from '@/components/ui/Card';
import {QueryState} from '@/components/ui/QueryState';
import type {SkillGapDetail, SkillGapReport} from '@/lib/types/grow/competency';
import {GAP_LEVEL_COLORS} from '@/lib/types/grow/competency';
import {GapAnalysisRadarChart} from './lazyCharts';
import {PANEL_CLASS, ROW_CLASS} from './competencyMatrixConfig';

function GapDetails({gaps}: {gaps: SkillGapDetail[]}) {
  // Build radar chart data: current vs required
  const radarData = useMemo(
    () => gaps.map((gap) => ({
      skill: gap.skillName,
      current: gap.currentLevel,
      required: gap.requiredLevel,
      fullMark: 5,
    })),
    [gaps]
  );

  return (
    <>
      <GapAnalysisRadarChart data={radarData}/>
      <div className="flex flex-col gap-2">
        {gaps.map((gap) => (
          <div key={gap.skillName} className={ROW_CLASS}>
            <div className="flex items-center gap-2">
              <AlertTriangle
                aria-hidden
                className={`h-4 w-4 ${gap.gapLevel === 'CRITICAL' ? 'text-danger-500' : 'text-warning-500'}`}
              />
              <Text size="sm" fw={500}>{gap.skillName}</Text>
            </div>
            <div className="flex items-center gap-4">
              <Badge size="xs" color={GAP_LEVEL_COLORS[gap.gapLevel]} variant="light">
                {gap.gapLevel}
              </Badge>
              <Text size="xs" c="dimmed" className="tabular-nums">
                {gap.currentLevel} / {gap.requiredLevel}
              </Text>
              {gap.recommendedCourses.length > 0 && (
                <Tooltip label={`${gap.recommendedCourses.length} course(s) recommended`}>
                  <BookOpen className="h-4 w-4 text-accent-600" aria-label="Courses recommended"/>
                </Tooltip>
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

export function GapAnalysisPanel({gapQuery}: {gapQuery: UseQueryResult<SkillGapReport, unknown>}) {
  return (
    <Card as="section" className={PANEL_CLASS}>
      <h2 className="text-base font-semibold text-text-1">Gap Analysis</h2>
      <QueryState
        query={gapQuery}
        skeleton={<Skeleton height={280} radius="md" aria-label="Loading gap analysis"/>}
        isEmpty={(report) => !report?.gaps?.length}
        empty={{
          icon: <BarChart3 className="h-8 w-8"/>,
          title: 'No gap analysis data',
          description: 'Add skills and link them to required competencies to see gap analysis.',
          size: 'compact',
        }}
        errorTitle="Couldn't load gap analysis"
      >
        {(report) => <GapDetails gaps={report.gaps}/>}
      </QueryState>
    </Card>
  );
}
