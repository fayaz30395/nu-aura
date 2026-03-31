// ─── Competency Matrix Types ──────────────────────────────────────────────

export type CompetencyCategory = 'TECHNICAL' | 'BEHAVIORAL' | 'LEADERSHIP' | 'DOMAIN' | 'PROBLEM_SOLVING';

export type ProficiencyLevel = 1 | 2 | 3 | 4 | 5;

export type GapLevel = 'CRITICAL' | 'MODERATE' | 'LOW';

export type AssessmentSource = 'SELF' | 'MANAGER' | 'COURSE_COMPLETION';

// ─── Employee Skill (maps to EmployeeSkill entity) ──────────────────────

export interface EmployeeSkill {
  id: string;
  employeeId: string;
  skillName: string;
  category: string;
  proficiencyLevel: ProficiencyLevel;
  yearsOfExperience?: number;
  lastUsed?: string;
  isVerified: boolean;
  verifiedBy?: string;
  verifiedAt?: string;
  source: AssessmentSource;
  createdAt?: string;
  updatedAt?: string;
}

export interface EmployeeSkillRequest {
  skillName: string;
  category: string;
  proficiencyLevel: ProficiencyLevel;
  source: AssessmentSource;
}

// ─── Review Competency (maps to ReviewCompetency entity) ─────────────────

export interface ReviewCompetency {
  id: string;
  reviewId: string;
  competencyName: string;
  category: CompetencyCategory;
  rating: number;
  comments?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CompetencyRequest {
  reviewId: string;
  competencyName: string;
  category: CompetencyCategory;
  rating: number;
  comments?: string;
}

// ─── Skill Gap Report (from LMS endpoint) ────────────────────────────────

export interface SkillGapReport {
  employeeName: string;
  department: string;
  gaps: SkillGapDetail[];
}

export interface SkillGapDetail {
  skillName: string;
  requiredLevel: number;
  currentLevel: number;
  gapLevel: GapLevel;
  recommendedCourses: SuggestedCourse[];
}

export interface SuggestedCourse {
  courseId: string;
  title: string;
  difficulty: string;
}

// ─── Competency Framework (admin-defined competencies per role/dept) ─────

export interface CompetencyDefinition {
  id: string;
  name: string;
  category: CompetencyCategory;
  description: string;
  requiredLevel: ProficiencyLevel;
  department?: string;
  role?: string;
}

// ─── Team Competency View ────────────────────────────────────────────────

export interface TeamMemberCompetency {
  employeeId: string;
  employeeName: string;
  department: string;
  role: string;
  skills: EmployeeSkill[];
  gapReport?: SkillGapReport;
}

// ─── Constants ───────────────────────────────────────────────────────────

export const COMPETENCY_CATEGORY_LABELS: Record<CompetencyCategory, string> = {
  TECHNICAL: 'Technical',
  BEHAVIORAL: 'Behavioral',
  LEADERSHIP: 'Leadership',
  DOMAIN: 'Domain',
  PROBLEM_SOLVING: 'Problem Solving',
};

export const PROFICIENCY_LEVEL_LABELS: Record<ProficiencyLevel, string> = {
  1: 'Beginner',
  2: 'Basic',
  3: 'Intermediate',
  4: 'Advanced',
  5: 'Expert',
};

export const GAP_LEVEL_COLORS: Record<GapLevel, string> = {
  CRITICAL: 'red',
  MODERATE: 'orange',
  LOW: 'yellow',
};

export const COMPETENCY_CATEGORY_COLORS: Record<CompetencyCategory, string> = {
  TECHNICAL: 'blue',
  BEHAVIORAL: 'green',
  LEADERSHIP: 'purple',
  DOMAIN: 'orange',
  PROBLEM_SOLVING: 'sky',
};

export const getProficiencyColor = (level: number): string => {
  if (level >= 5) return 'emerald';
  if (level >= 4) return 'green';
  if (level >= 3) return 'sky';
  if (level >= 2) return 'yellow';
  return 'red';
};
