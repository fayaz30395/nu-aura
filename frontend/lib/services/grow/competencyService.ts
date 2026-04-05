import {apiClient} from '../../api/client';
import type {
  CompetencyRequest,
  EmployeeSkill,
  EmployeeSkillRequest,
  ReviewCompetency,
  SkillGapReport,
} from '../../types/grow/competency';

// ─── Employee Skills Service ─────────────────────────────────────────────

export const employeeSkillService = {
  /** Get all skills for an employee */
  getByEmployee: async (employeeId: string): Promise<EmployeeSkill[]> => {
    const response = await apiClient.get<EmployeeSkill[]>(
      `/employees/${employeeId}/skills`
    );
    return response.data;
  },

  /** Add or update a skill for an employee */
  addOrUpdate: async (
    employeeId: string,
    data: EmployeeSkillRequest
  ): Promise<EmployeeSkill> => {
    const response = await apiClient.post<EmployeeSkill>(
      `/employees/${employeeId}/skills`,
      data
    );
    return response.data;
  },

  /** Verify a skill (manager action) */
  verify: async (skillId: string): Promise<void> => {
    await apiClient.put(`/employees/skills/${skillId}/verify`);
  },

  /** Remove a skill */
  remove: async (skillId: string): Promise<void> => {
    await apiClient.delete(`/employees/skills/${skillId}`);
  },
};

// ─── Review Competency Service ───────────────────────────────────────────

export const competencyService = {
  /** Get competencies for a specific review */
  getByReview: async (reviewId: string): Promise<ReviewCompetency[]> => {
    const response = await apiClient.get<ReviewCompetency[]>(
      `/reviews/${reviewId}/competencies`
    );
    return response.data;
  },

  /** Add a competency to a review */
  add: async (data: CompetencyRequest): Promise<ReviewCompetency> => {
    const response = await apiClient.post<ReviewCompetency>(
      '/reviews/competencies',
      data
    );
    return response.data;
  },

  /** Delete a competency from a review */
  remove: async (competencyId: string): Promise<void> => {
    await apiClient.delete(`/reviews/competencies/${competencyId}`);
  },
};

// ─── Skill Gap Analysis Service ──────────────────────────────────────────

export const skillGapService = {
  /** Analyze skill gaps for an employee */
  analyze: async (employeeId: string): Promise<SkillGapReport> => {
    const response = await apiClient.get<SkillGapReport>(
      `/lms/employees/${employeeId}/skill-gaps`
    );
    return response.data;
  },
};
