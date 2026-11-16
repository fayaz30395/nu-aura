'use client';

import {useMemo, useState} from 'react';
import {ActionIcon, Badge, Button, Text, Tooltip} from '@mantine/core';
import {useDisclosure} from '@mantine/hooks';
import {CheckCircle, Plus, Target, Trash2} from 'lucide-react';
import {Card} from '@/components/ui/Card';
import {ConfirmDialog} from '@/components/ui/ConfirmDialog';
import {EmptyState} from '@/components/ui/EmptyState';
import {QueryState} from '@/components/ui/QueryState';
import {DashboardSkeleton} from '@/components/ui/skeletons';
import {
  useAddEmployeeSkill,
  useEmployeeSkills,
  useRemoveSkill,
  useSkillGapAnalysis,
} from '@/lib/hooks/useCompetency';
import type {CompetencyCategory, EmployeeSkill, ProficiencyLevel} from '@/lib/types/grow/competency';
import {
  COMPETENCY_CATEGORY_COLORS,
  COMPETENCY_CATEGORY_LABELS,
  PROFICIENCY_LEVEL_LABELS,
} from '@/lib/types/grow/competency';
import {AddSkillModal} from './AddSkillModal';
import {GapAnalysisPanel} from './GapAnalysisPanel';
import {
  type AddSkillFormValues,
  EMPTY_LEVEL_CLASS,
  getHeatmapClass,
  PANEL_CLASS,
  ROW_CLASS,
} from './competencyMatrixConfig';

const SOURCE_SUFFIX: Record<string, string> = {SELF: ' (Self)', MANAGER: ' (Manager)'};

function SkillRow({skill, onRemove}: {skill: EmployeeSkill; onRemove: (skill: EmployeeSkill) => void}) {
  return (
    <div className={ROW_CLASS}>
      <div className="flex min-w-0 flex-1 items-center gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Text size="sm" fw={500} truncate="end">{skill.skillName}</Text>
            {skill.isVerified && (
              <Tooltip label="Verified by manager">
                <CheckCircle className="h-4 w-4 shrink-0 text-success-500" aria-label="Verified by manager"/>
              </Tooltip>
            )}
          </div>
          <Text size="xs" c="dimmed">
            {PROFICIENCY_LEVEL_LABELS[skill.proficiencyLevel as ProficiencyLevel]}
            {SOURCE_SUFFIX[skill.source] ?? ' (Course)'}
          </Text>
        </div>
        <div className="flex items-center gap-1" aria-hidden>
          {[1, 2, 3, 4, 5].map((level) => (
            <div
              key={level}
              className={`flex h-5 w-5 items-center justify-center rounded-md text-2xs font-bold ${
                level <= skill.proficiencyLevel ? getHeatmapClass(level) : EMPTY_LEVEL_CLASS
              }`}
            >
              {level}
            </div>
          ))}
        </div>
      </div>
      <ActionIcon variant="subtle" color="red" size="md" aria-label="Remove skill" onClick={() => onRemove(skill)}>
        <Trash2 className="h-4 w-4"/>
      </ActionIcon>
    </div>
  );
}

function SkillsMatrix({skills, onRemove}: {skills: EmployeeSkill[]; onRemove: (skill: EmployeeSkill) => void}) {
  // Group skills by category for the matrix grid
  const skillsByCategory = useMemo(() => {
    const grouped: Record<string, EmployeeSkill[]> = {};
    skills.forEach((s) => {
      const cat = s.category || 'UNCATEGORIZED';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(s);
    });
    return grouped;
  }, [skills]);

  if (Object.keys(skillsByCategory).length === 0) {
    return (
      <EmptyState
        icon={<Target className="h-8 w-8"/>}
        title="No skills recorded yet"
        description="Add your first skill to start tracking your proficiency and growth."
        size="compact"
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {Object.entries(skillsByCategory).map(([category, catSkills]) => (
        <div key={category} className="flex flex-col gap-2">
          <Badge
            size="sm"
            variant="light"
            color={COMPETENCY_CATEGORY_COLORS[category as CompetencyCategory] || 'gray'}
          >
            {COMPETENCY_CATEGORY_LABELS[category as CompetencyCategory] || category}
          </Badge>
          {catSkills.map((skill) => <SkillRow key={skill.id} skill={skill} onRemove={onRemove}/>)}
        </div>
      ))}
    </div>
  );
}

export function MyCompetenciesTab({employeeId}: {employeeId: string}) {
  const [addModalOpened, {open: openAddModal, close: closeAddModal}] = useDisclosure(false);
  const [removeTarget, setRemoveTarget] = useState<EmployeeSkill | null>(null);

  const skillsQuery = useEmployeeSkills(employeeId);
  const gapQuery = useSkillGapAnalysis(employeeId);
  const addSkillMutation = useAddEmployeeSkill(employeeId);
  const removeSkillMutation = useRemoveSkill(employeeId);

  const handleAddSkill = async (values: AddSkillFormValues) => {
    try {
      await addSkillMutation.mutateAsync(values as Parameters<typeof addSkillMutation.mutateAsync>[0]);
      closeAddModal();
    } catch {
      // Global MutationCache toast reports the error; keep the modal open.
    }
  };

  const handleRemoveSkill = async () => {
    if (!removeTarget) return;
    try {
      await removeSkillMutation.mutateAsync(removeTarget.id);
      setRemoveTarget(null);
    } catch {
      // Global MutationCache toast reports the error; keep the dialog open.
    }
  };

  const gapCount = gapQuery.data?.gaps?.length ?? 0;

  return (
    <>
      <QueryState
        query={skillsQuery}
        skeleton={<DashboardSkeleton showHeader={false} stats={2}/>}
        errorTitle="Failed to load skills"
        errorMessage="Unable to fetch your competency data."
      >
        {(data) => {
          const skills = data || [];
          return (
            <div className="flex flex-col gap-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <Text size="sm" c="dimmed">
                  {skills.length} skill{skills.length !== 1 ? 's' : ''} recorded
                  {gapCount ? ` | ${gapCount} gap${gapCount !== 1 ? 's' : ''} identified` : ''}
                </Text>
                <Button leftSection={<Plus className="h-4 w-4"/>} onClick={openAddModal}>
                  Add Skill
                </Button>
              </div>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <Card as="section" className={PANEL_CLASS}>
                  <h2 className="text-base font-semibold text-text-1">Skills Matrix</h2>
                  <SkillsMatrix skills={skills} onRemove={setRemoveTarget}/>
                </Card>
                <GapAnalysisPanel gapQuery={gapQuery}/>
              </div>
            </div>
          );
        }}
      </QueryState>

      <AddSkillModal
        isOpen={addModalOpened}
        isSaving={addSkillMutation.isPending}
        onClose={closeAddModal}
        onSubmit={handleAddSkill}
      />
      <ConfirmDialog
        isOpen={!!removeTarget}
        onClose={() => setRemoveTarget(null)}
        onConfirm={handleRemoveSkill}
        title="Remove Skill"
        message={`Remove "${removeTarget?.skillName}" from your skills?`}
        confirmText="Remove"
        type="danger"
        loading={removeSkillMutation.isPending}
      />
    </>
  );
}
