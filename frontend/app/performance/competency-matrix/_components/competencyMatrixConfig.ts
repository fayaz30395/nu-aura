import {z} from 'zod';
import {COMPETENCY_CATEGORY_LABELS} from '@/lib/types/grow/competency';

export const addSkillSchema = z.object({
  skillName: z.string().min(1, 'Skill name is required').max(100),
  category: z.enum(['TECHNICAL', 'BEHAVIORAL', 'LEADERSHIP', 'DOMAIN', 'PROBLEM_SOLVING']),
  proficiencyLevel: z.number().min(1).max(5),
  source: z.enum(['SELF', 'MANAGER', 'COURSE_COMPLETION']),
});

export type AddSkillFormValues = z.infer<typeof addSkillSchema>;

export const ADD_SKILL_DEFAULTS: AddSkillFormValues = {
  skillName: '',
  category: 'TECHNICAL',
  proficiencyLevel: 3,
  source: 'SELF',
};

export const proficiencyOptions = [
  {value: '1', label: '1 - Beginner'},
  {value: '2', label: '2 - Basic'},
  {value: '3', label: '3 - Intermediate'},
  {value: '4', label: '4 - Advanced'},
  {value: '5', label: '5 - Expert'},
];

export const categoryOptions = Object.entries(COMPETENCY_CATEGORY_LABELS).map(([value, label]) => ({
  value,
  label,
}));

export const sourceOptions = [
  {value: 'SELF', label: 'Self Assessment'},
  {value: 'MANAGER', label: 'Manager Assessment'},
  {value: 'COURSE_COMPLETION', label: 'Course Completion'},
];

const HEATMAP_COLORS = [
  'bg-danger-100 text-danger-800 dark:bg-danger-900/40 dark:text-danger-300',
  'bg-warning-100 text-warning-800 dark:bg-warning-900/40 dark:text-warning-300',
  'bg-warning-100 text-warning-800 dark:bg-warning-900/40 dark:text-warning-300',
  'bg-accent-100 text-accent-800 dark:bg-accent-900/40 dark:text-accent-300',
  'bg-success-100 text-success-800 dark:bg-success-900/40 dark:text-success-300',
];

export const EMPTY_LEVEL_CLASS = 'bg-surface-aura-sunken text-text-3';

export function getHeatmapClass(level: number): string {
  if (level <= 0) return EMPTY_LEVEL_CLASS;
  return HEATMAP_COLORS[Math.min(level - 1, 4)];
}

export const ROW_CLASS = 'flex items-center justify-between gap-2 rounded-lg border border-border bg-card p-2';
export const PANEL_CLASS = 'flex flex-col gap-4 p-4';
