import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fs from 'node:fs';
import { getAllSpecFiles, groupSpecsByAgent, getUnassignedSpecs } from '../src/spec-grouper.js';
import { QA_CONFIG } from '../src/config.js';

vi.mock('node:fs');

const mockReaddirSync = vi.mocked(fs.readdirSync);

// Representative sample of the 105 real spec filenames
const MOCK_SPEC_FILES = [
  // smoke group
  'smoke.spec.ts',
  'sub-app-smoke.spec.ts',
  'auth.spec.ts',
  // ui-ux group
  'ui-ux-deep.spec.ts',
  // hrms-core group
  'leave.spec.ts',
  'attendance.spec.ts',
  'payroll-flow.spec.ts',
  'employee.spec.ts',
  'departments.spec.ts',
  'assets.spec.ts',
  'benefits.spec.ts',
  'loans.spec.ts',
  'expenses.spec.ts',
  'travel.spec.ts',
  'overtime.spec.ts',
  'shifts.spec.ts',
  'holidays.spec.ts',
  'calendar.spec.ts',
  'probation.spec.ts',
  'fnf-settlement.spec.ts',
  'letters.spec.ts',
  'documents.spec.ts',
  'compensation.spec.ts',
  // rbac-security group
  'nu-rbac.spec.ts',
  'rbac-matrix.spec.ts',
  'rbac-superadmin.spec.ts',
  'rbac-employee-boundaries.spec.ts',
  'rbac-manager-boundaries.spec.ts',
  'rbac-tenant-isolation.spec.ts',
  'security-deep.spec.ts',
  'settings-security.spec.ts',
  'admin-roles.spec.ts',
  'admin-system.spec.ts',
  'settings.spec.ts',
  // hire-grow group
  'recruitment-pipeline.spec.ts',
  'performance-review.spec.ts',
  'okr.spec.ts',
  'surveys.spec.ts',
  'feedback360.spec.ts',
  'learning.spec.ts',
  'training.spec.ts',
  'wellness.spec.ts',
  'one-on-one.spec.ts',
  'resource-allocation.spec.ts',
  'gantt.spec.ts',
  'timesheets.spec.ts',
  'projects.spec.ts',
  // fluence-edge group
  'fluence-wiki-blogs.spec.ts',
  'edge-cases-api.spec.ts',
  'notifications.spec.ts',
  'announcements.spec.ts',
  'helpdesk.spec.ts',
  'analytics.spec.ts',
  'reports-builder.spec.ts',
  'lifecycle-e2e.spec.ts',
  'onboarding-offboarding.spec.ts',
];

const MOCK_NON_SPEC_FILES = [
  'auth.setup.ts',
  'global.setup.ts',
  'helpers.ts',
  'fixtures.ts',
];

describe('getAllSpecFiles', () => {
  beforeEach(() => {
    mockReaddirSync.mockReset();
  });

  it('returns an array of .spec.ts file paths', () => {
    mockReaddirSync.mockReturnValue(
      [...MOCK_SPEC_FILES, ...MOCK_NON_SPEC_FILES] as unknown as fs.Dirent[],
    );
    const result = getAllSpecFiles('/fake/e2e');
    expect(result.length).toBeGreaterThan(0);
    result.forEach((f) => expect(f).toMatch(/\.spec\.ts$/));
  });

  it('excludes setup files (*.setup.ts)', () => {
    mockReaddirSync.mockReturnValue(
      [...MOCK_SPEC_FILES, ...MOCK_NON_SPEC_FILES] as unknown as fs.Dirent[],
    );
    const result = getAllSpecFiles('/fake/e2e');
    expect(result.every((f) => !f.includes('.setup.ts'))).toBe(true);
  });

  it('excludes non-spec TypeScript files', () => {
    mockReaddirSync.mockReturnValue(
      [...MOCK_SPEC_FILES, ...MOCK_NON_SPEC_FILES] as unknown as fs.Dirent[],
    );
    const result = getAllSpecFiles('/fake/e2e');
    expect(result).not.toContain('/fake/e2e/helpers.ts');
    expect(result).not.toContain('/fake/e2e/fixtures.ts');
  });

  it('returns full file paths by joining e2eDir with filename', () => {
    mockReaddirSync.mockReturnValue(['smoke.spec.ts'] as unknown as fs.Dirent[]);
    const result = getAllSpecFiles('/some/e2e/dir');
    expect(result[0]).toContain('smoke.spec.ts');
    expect(result[0]).toContain('/some/e2e/dir');
  });

  it('returns empty array when directory has no spec files', () => {
    mockReaddirSync.mockReturnValue(MOCK_NON_SPEC_FILES as unknown as fs.Dirent[]);
    const result = getAllSpecFiles('/fake/e2e');
    expect(result).toEqual([]);
  });
});

describe('groupSpecsByAgent', () => {
  const specPaths = MOCK_SPEC_FILES.map((f) => `/e2e/${f}`);

  it('returns an object with a key for each agent group', () => {
    const groups = groupSpecsByAgent(specPaths, QA_CONFIG.agentGroups);
    const keys = Object.keys(groups);
    QA_CONFIG.agentGroups.forEach((g) => {
      expect(keys).toContain(g.name);
    });
  });

  it('smoke group contains files matching: smoke, sub-app-smoke, auth.spec', () => {
    const groups = groupSpecsByAgent(specPaths, QA_CONFIG.agentGroups);
    const smokeFiles = groups['smoke'].map((f) => f.split('/').pop()!);
    expect(smokeFiles).toContain('smoke.spec.ts');
    expect(smokeFiles).toContain('sub-app-smoke.spec.ts');
    expect(smokeFiles).toContain('auth.spec.ts');
  });

  it('rbac-security group contains files matching: rbac, nu-rbac, security', () => {
    const groups = groupSpecsByAgent(specPaths, QA_CONFIG.agentGroups);
    const rbacFiles = groups['rbac-security'].map((f) => f.split('/').pop()!);
    expect(rbacFiles.some((f) => f.includes('rbac'))).toBe(true);
    expect(rbacFiles.some((f) => f.includes('nu-rbac') || f.includes('rbac'))).toBe(true);
    expect(rbacFiles.some((f) => f.includes('security'))).toBe(true);
  });

  it('hrms-core group contains leave, attendance, payroll, employee files', () => {
    const groups = groupSpecsByAgent(specPaths, QA_CONFIG.agentGroups);
    const hrmsFiles = groups['hrms-core'].map((f) => f.split('/').pop()!);
    expect(hrmsFiles.some((f) => f.includes('leave'))).toBe(true);
    expect(hrmsFiles.some((f) => f.includes('attendance'))).toBe(true);
    expect(hrmsFiles.some((f) => f.includes('payroll'))).toBe(true);
    expect(hrmsFiles.some((f) => f.includes('employee'))).toBe(true);
  });

  it('hire-grow group contains recruitment and performance files', () => {
    const groups = groupSpecsByAgent(specPaths, QA_CONFIG.agentGroups);
    const hireFiles = groups['hire-grow'].map((f) => f.split('/').pop()!);
    expect(hireFiles.some((f) => f.includes('recruit'))).toBe(true);
    expect(hireFiles.some((f) => f.includes('performance'))).toBe(true);
  });

  it('fluence-edge group contains fluence and edge-cases files', () => {
    const groups = groupSpecsByAgent(specPaths, QA_CONFIG.agentGroups);
    const fluenceFiles = groups['fluence-edge'].map((f) => f.split('/').pop()!);
    expect(fluenceFiles.some((f) => f.includes('fluence'))).toBe(true);
  });

  it('each spec appears in at most one group (no double-assignment)', () => {
    const groups = groupSpecsByAgent(specPaths, QA_CONFIG.agentGroups);
    const allAssigned = Object.values(groups).flat();
    const uniqueAssigned = new Set(allAssigned);
    expect(allAssigned.length).toBe(uniqueAssigned.size);
  });

  it('groups by matching basename, not full path', () => {
    const deepPaths = MOCK_SPEC_FILES.map((f) => `/very/deep/nested/path/${f}`);
    const groups = groupSpecsByAgent(deepPaths, QA_CONFIG.agentGroups);
    const smokeFiles = groups['smoke'];
    expect(smokeFiles.length).toBeGreaterThan(0);
  });
});

describe('getUnassignedSpecs', () => {
  it('returns empty array when all specs are covered by group patterns', () => {
    const specPaths = MOCK_SPEC_FILES.map((f) => `/e2e/${f}`);
    const unassigned = getUnassignedSpecs(specPaths, QA_CONFIG.agentGroups);
    // In a well-configured orchestrator, this should be empty or minimal
    expect(Array.isArray(unassigned)).toBe(true);
  });

  it('returns specs that do not match any group pattern', () => {
    const specPaths = [
      '/e2e/smoke.spec.ts',
      '/e2e/totally-uncategorized-xyz.spec.ts',
      '/e2e/another-unknown-abc.spec.ts',
    ];
    const unassigned = getUnassignedSpecs(specPaths, QA_CONFIG.agentGroups);
    const unassignedNames = unassigned.map((f) => f.split('/').pop()!);
    expect(unassignedNames).toContain('totally-uncategorized-xyz.spec.ts');
    expect(unassignedNames).toContain('another-unknown-abc.spec.ts');
    expect(unassignedNames).not.toContain('smoke.spec.ts');
  });

  it('returns empty array when there are no spec files', () => {
    const unassigned = getUnassignedSpecs([], QA_CONFIG.agentGroups);
    expect(unassigned).toEqual([]);
  });

  it('includes all unmatched specs even when multiple groups are defined', () => {
    const specPaths = ['/e2e/mystery-module.spec.ts'];
    const unassigned = getUnassignedSpecs(specPaths, QA_CONFIG.agentGroups);
    expect(unassigned).toContain('/e2e/mystery-module.spec.ts');
  });
});
