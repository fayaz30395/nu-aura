'use client';

import type {ReactNode} from 'react';
import {Badge, Button, Text} from '@mantine/core';
import {AlertTriangle, BarChart3, BookOpen, CheckCircle, ChevronRight, Target, TrendingUp, Users} from 'lucide-react';
import {Card} from '@/components/ui/Card';
import {EmptyState} from '@/components/ui/EmptyState';
import {QueryState} from '@/components/ui/QueryState';
import {DashboardSkeleton} from '@/components/ui/skeletons';
import {useVerifySkill} from '@/lib/hooks/useCompetency';
import type {EmployeeSkill, ProficiencyLevel, SkillGapDetail} from '@/lib/types/grow/competency';
import {GAP_LEVEL_COLORS, PROFICIENCY_LEVEL_LABELS} from '@/lib/types/grow/competency';
import {type TeamCompetencyData, useTeamCompetencies} from '../_hooks/useTeamCompetencies';
import {CompetencyHeatmapChart} from './lazyCharts';
import {PANEL_CLASS, ROW_CLASS} from './competencyMatrixConfig';

function StatCard({label, value, icon, iconClass}: {
  label: string;
  value: ReactNode;
  icon: ReactNode;
  iconClass: string;
}) {
  return (
    <Card className="flex items-start justify-between p-4">
      <div>
        <Text size="xs" c="dimmed">{label}</Text>
        <Text size="xl" fw={700} className="tabular-nums">{value}</Text>
      </div>
      <div className={`rounded-lg p-2 ${iconClass}`} aria-hidden>{icon}</div>
    </Card>
  );
}

function PendingVerification({skills}: {skills: EmployeeSkill[]}) {
  const verifySkillMutation = useVerifySkill();
  const pending = skills.filter((s) => !s.isVerified);

  if (pending.length === 0) {
    return (
      <EmptyState
        icon={<CheckCircle className="h-full w-full"/>}
        iconColor="text-success-500"
        title="All skills are verified."
        size="compact"
      />
    );
  }

  return (
    <div className="flex max-h-72 flex-col gap-2 overflow-y-auto">
      {pending.map((skill) => (
        <div key={skill.id} className={ROW_CLASS}>
          <div>
            <Text size="sm" fw={500}>{skill.skillName}</Text>
            <Text size="xs" c="dimmed">
              Level {skill.proficiencyLevel} - {PROFICIENCY_LEVEL_LABELS[skill.proficiencyLevel as ProficiencyLevel]}
            </Text>
          </div>
          <Button
            size="sm"
            variant="light"
            color="green"
            leftSection={<CheckCircle className="h-4 w-4"/>}
            onClick={() => verifySkillMutation.mutate(skill.id)}
            loading={verifySkillMutation.isPending}
          >
            Verify
          </Button>
        </div>
      ))}
    </div>
  );
}

function TrainingRecommendations({gaps}: {gaps: SkillGapDetail[]}) {
  const withCourses = gaps.filter((gap) => gap.recommendedCourses.length > 0);

  return (
    <Card as="section" className={PANEL_CLASS}>
      <h2 className="text-base font-semibold text-text-1">Training Recommendations</h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {withCourses.map((gap) => (
          <div key={gap.skillName} className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-accent-600" aria-hidden/>
              <Text size="sm" fw={600}>{gap.skillName}</Text>
              <Badge size="xs" color={GAP_LEVEL_COLORS[gap.gapLevel]} variant="light">
                {gap.gapLevel}
              </Badge>
            </div>
            <Text size="xs" c="dimmed">
              Current: {gap.currentLevel} / Required: {gap.requiredLevel}
            </Text>
            <ul className="flex flex-col gap-1">
              {gap.recommendedCourses.map((course) => (
                <li
                  key={course.courseId}
                  className="flex items-center gap-2 text-xs text-accent-700 dark:text-accent-400"
                >
                  <ChevronRight className="h-3 w-3" aria-hidden/>
                  <span>{course.title}</span>
                  <Badge size="xs" variant="outline" color="gray">{course.difficulty}</Badge>
                </li>
              ))}
            </ul>
          </div>
        ))}
        {withCourses.length === 0 && (
          <Text c="dimmed" size="sm">No specific course recommendations at this time.</Text>
        )}
      </div>
    </Card>
  );
}

function TeamOverview({data}: {data: TeamCompetencyData}) {
  const {skills, gaps, heatmapData} = data;
  const avgProficiency = skills.length > 0
    ? (skills.reduce((sum, s) => sum + s.proficiencyLevel, 0) / skills.length).toFixed(1)
    : 'N/A';

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
        <StatCard
          label="Total Skills"
          value={skills.length}
          icon={<Target className="h-5 w-5 text-accent-700 dark:text-accent-400"/>}
          iconClass="bg-accent-100 dark:bg-accent-900/40"
        />
        <StatCard
          label="Verified Skills"
          value={skills.filter((s) => s.isVerified).length}
          icon={<CheckCircle className="h-5 w-5 text-success-600 dark:text-success-400"/>}
          iconClass="bg-success-100 dark:bg-success-900/40"
        />
        <StatCard
          label="Skill Gaps"
          value={gaps.length}
          icon={<AlertTriangle className="h-5 w-5 text-warning-600 dark:text-warning-400"/>}
          iconClass="bg-warning-100 dark:bg-warning-900/40"
        />
        <StatCard
          label="Avg Proficiency"
          value={avgProficiency}
          icon={<TrendingUp className="h-5 w-5 text-accent-800 dark:text-accent-600"/>}
          iconClass="bg-accent-300 dark:bg-accent-900/40"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card as="section" className={PANEL_CLASS}>
          <h2 className="text-base font-semibold text-text-1">Team Competency Heatmap</h2>
          {heatmapData.length === 0 ? (
            <EmptyState
              icon={<BarChart3 className="h-8 w-8"/>}
              title="No team skills data"
              description="Team competency heatmap will populate once team members record skills."
              size="compact"
            />
          ) : (
            <CompetencyHeatmapChart data={heatmapData}/>
          )}
        </Card>
        <Card as="section" className={PANEL_CLASS}>
          <h2 className="text-base font-semibold text-text-1">Skills Pending Verification</h2>
          <PendingVerification skills={skills}/>
        </Card>
      </div>

      {gaps.length > 0 && <TrainingRecommendations gaps={gaps}/>}
    </div>
  );
}

export function TeamViewTab({managerId}: {managerId: string}) {
  const teamQuery = useTeamCompetencies(managerId);

  return (
    <QueryState
      query={teamQuery}
      skeleton={<DashboardSkeleton showHeader={false} stats={4}/>}
      isEmpty={(data) => data.reportIds.length === 0}
      empty={{
        icon: <Users className="h-8 w-8"/>,
        title: 'No Direct Reports',
        description: 'Team competency data will appear here once you have direct reports.',
      }}
      errorTitle="Couldn't load your team"
    >
      {(data) => <TeamOverview data={data}/>}
    </QueryState>
  );
}
