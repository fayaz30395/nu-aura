// QA Orchestrator configuration
export const QA_CONFIG = {
  servers: {
    frontend: {
      url: 'http://localhost:3000',
      healthPath: '/',
      startCwd: '../frontend',
      startCmd: 'npm run dev',
    },
    backend: {
      url: 'http://localhost:8080',
      healthPath: '/actuator/health',
    },
  },
  playwright: {
    baseUrl: 'http://localhost:3000',
    workers: 8,
    retries: 2,
    timeoutMs: 60000,
    e2eDir: '../frontend/e2e',
  },
  loop: {
    cooldownMs: 5 * 60 * 1000,
  },
  report: {
    outputDir: '../frontend/playwright-report/autonomous',
  },
  severity: {
    p0Patterns: [
      /blank.?page/i, /white.?screen/i, /auth.*fail/i, /login.*fail/i,
      /500|502|503/, /crash/i, /data.?loss/i, /corrupt/i,
      /navigation.*fail/i, /page.*not.*load/i,
    ],
    p1Patterns: [
      /form.*fail/i, /submit.*fail/i, /save.*fail/i, /rbac/i,
      /permission/i, /unauthorized/i, /forbidden/i, /api.*error/i,
      /validation.*fail/i, /400|401|403/,
    ],
  },
  agentGroups: [
    {
      name: 'smoke',
      label: 'Smoke & Auth',
      pattern: /(smoke|sub-app-smoke|auth\.spec)/i,
      priority: 1,
    },
    {
      name: 'ui-ux',
      label: 'UI/UX Deep',
      pattern: /(ui-ux|accessibility)/i,
      priority: 2,
    },
    {
      name: 'hrms-core',
      label: 'HRMS Core',
      pattern: /(leave|attendance|payroll|employee|department|asset|benefit|loan|expense|travel|overtime|shift|holiday|calendar|probation|fnf|letter|document|compensation)/i,
      priority: 3,
    },
    {
      name: 'rbac-security',
      label: 'RBAC & Security',
      pattern: /(rbac|nu-rbac|security|admin|settings)/i,
      priority: 4,
    },
    {
      name: 'hire-grow',
      label: 'NU-Hire & NU-Grow',
      pattern: /(recruit|performance|okr|survey|review|feedback|learning|lms|training|wellness|one-on-one|resource|gantt|timesheet|project|resource)/i,
      priority: 5,
    },
    {
      name: 'fluence-edge',
      label: 'NU-Fluence & Edge Cases',
      pattern: /(fluence|edge-cases|network|validation|notification|announcement|helpdesk|analytic|report|lifecycle|onboard)/i,
      priority: 6,
    },
  ],
} as const;

export type AgentGroupName = (typeof QA_CONFIG.agentGroups)[number]['name'];
