import {describe, expect, it} from 'vitest';
import type {JobRole} from '@/lib/types/hrms/employee';
import {JOB_ROLE_OPTIONS as EDIT_JOB_ROLE_OPTIONS} from '../[id]/edit/_components/edit-employee-schema';
import {createEmployeeFormSchema} from '../_components/create-employee-schema';
import {JOB_ROLE_GROUPS, JOB_ROLE_VALUES} from './job-roles';

// Typed as Record<JobRole, true> so tsc fails if this drifts from the JobRole union.
const ALL_JOB_ROLES: Record<JobRole, true> = {
  SOFTWARE_ENGINEER: true, FRONTEND_DEVELOPER: true, BACKEND_DEVELOPER: true, FULLSTACK_DEVELOPER: true,
  DEVOPS_ENGINEER: true, QA_ENGINEER: true, DATA_ENGINEER: true, MOBILE_DEVELOPER: true, SYSTEM_ARCHITECT: true,
  TECH_LEAD: true, ENGINEERING_MANAGER: true, PRODUCT_MANAGER: true, PRODUCT_OWNER: true, PRODUCT_ANALYST: true,
  UI_DESIGNER: true, UX_DESIGNER: true, GRAPHIC_DESIGNER: true, PRODUCT_DESIGNER: true, DATA_ANALYST: true,
  DATA_SCIENTIST: true, BUSINESS_ANALYST: true, MARKETING_MANAGER: true, CONTENT_WRITER: true,
  SEO_SPECIALIST: true, SOCIAL_MEDIA_MANAGER: true, DIGITAL_MARKETER: true, SALES_REPRESENTATIVE: true,
  SALES_MANAGER: true, ACCOUNT_MANAGER: true, BUSINESS_DEVELOPMENT: true, OPERATIONS_MANAGER: true,
  PROJECT_MANAGER: true, SCRUM_MASTER: true, PROGRAM_MANAGER: true, HR_MANAGER: true, HR_GENERALIST: true,
  RECRUITER: true, TALENT_ACQUISITION: true, ACCOUNTANT: true, FINANCIAL_ANALYST: true, FINANCE_MANAGER: true,
  ADMIN_ASSISTANT: true, OFFICE_MANAGER: true, CUSTOMER_SUPPORT: true, TECH_SUPPORT: true, LEGAL_COUNSEL: true,
  COMPLIANCE_OFFICER: true, CONSULTANT: true, INTERN: true, OTHER: true,
};

function editPageValues(): string[] {
  return EDIT_JOB_ROLE_OPTIONS.flatMap((o) => ('items' in o ? o.items.map((i) => i.value) : [o.value]))
    .filter(Boolean);
}

describe('job role options', () => {
  it('offers every create-modal value on the edit page', () => {
    const edit = new Set(editPageValues());
    const create = JOB_ROLE_GROUPS.flatMap((g) => g.items.map((i) => i.value));
    expect(create.length).toBeGreaterThan(0);
    expect(create.filter((v) => !edit.has(v))).toEqual([]);
  });

  it('covers exactly the JobRole union with no duplicates', () => {
    expect(new Set(JOB_ROLE_VALUES).size).toBe(JOB_ROLE_VALUES.length);
    expect([...JOB_ROLE_VALUES].sort()).toEqual(Object.keys(ALL_JOB_ROLES).sort());
  });

  it.each(['ENGINEER', 'MANAGER', 'ANALYST', 'DESIGNER', 'SUPPORT', 'SALES', 'MARKETING', 'HR', 'OPERATIONS'])(
    'rejects the legacy value %s in the create form',
    (jobRole) => {
      const result = createEmployeeFormSchema.shape.jobRole.safeParse(jobRole);
      expect(result.success).toBe(false);
    },
  );

  it('accepts a valid role and an empty value in the create form', () => {
    expect(createEmployeeFormSchema.shape.jobRole.safeParse('SOFTWARE_ENGINEER').success).toBe(true);
    expect(createEmployeeFormSchema.shape.jobRole.safeParse('').success).toBe(true);
    expect(createEmployeeFormSchema.shape.jobRole.safeParse(undefined).success).toBe(true);
  });
});
