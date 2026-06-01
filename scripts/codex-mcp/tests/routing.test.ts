import {describe, expect, it} from 'vitest';
import {buildStartWorkCommand, routeTask} from '../src/core/routing.js';

describe('routeTask', () => {
  it('routes security-sensitive tasks to the security pipeline', () => {
    const decision = routeTask('Fix RBAC tenant leak in payroll export');
    expect(decision.pipeline).toBe('security');
    expect(decision.agents).toEqual(['security-architect', 'coder', 'security-auditor']);
    expect(decision.reasoningEffort).toBe('xhigh');
  });

  it('routes unclear failures to the bug pipeline', () => {
    const decision = routeTask('Investigate failing leave approval regression');
    expect(decision.pipeline).toBe('bug');
    expect(decision.workflowPath).toBe('docs/swarm/workflows/bug-pipeline.yaml');
  });

  it('treats broad changed file sets as swarm scope', () => {
    const decision = routeTask('Update onboarding flow', ['a.ts', 'b.ts', 'c.ts']);
    expect(decision.pipeline).toBe('feature');
    expect(decision.confidence).toBeGreaterThan(0.9);
  });

  it('omits start-work command for direct execution', () => {
    const decision = routeTask('What is the build command?');
    expect(decision.pipeline).toBe('none');
    expect(buildStartWorkCommand(decision, 'What is the build command?')).toBeUndefined();
  });
});
