export type PipelineType = 'feature' | 'bug' | 'security' | 'refactor' | 'perf' | 'none';
export type ReasoningEffort = 'minimal' | 'low' | 'medium' | 'high' | 'xhigh';

export interface RouteDecision {
  pipeline: PipelineType;
  confidence: number;
  reason: string;
  agents: string[];
  maxAgents: number;
  topology: 'hierarchical' | 'none';
  reasoningEffort: ReasoningEffort;
  workflowPath?: string;
}

const PIPELINES: Record<
  Exclude<PipelineType, 'none'>,
  Omit<RouteDecision, 'pipeline' | 'confidence' | 'reason'>
> = {
  feature: {
    agents: ['architect', 'coder', 'tester', 'reviewer'],
    maxAgents: 4,
    topology: 'hierarchical',
    reasoningEffort: 'high',
    workflowPath: 'docs/swarm/workflows/feature-pipeline.yaml',
  },
  bug: {
    agents: ['researcher', 'coder', 'tester'],
    maxAgents: 3,
    topology: 'hierarchical',
    reasoningEffort: 'high',
    workflowPath: 'docs/swarm/workflows/bug-pipeline.yaml',
  },
  security: {
    agents: ['security-architect', 'coder', 'security-auditor'],
    maxAgents: 3,
    topology: 'hierarchical',
    reasoningEffort: 'xhigh',
    workflowPath: 'docs/swarm/workflows/security-pipeline.yaml',
  },
  refactor: {
    agents: ['architect', 'coder', 'reviewer'],
    maxAgents: 3,
    topology: 'hierarchical',
    reasoningEffort: 'high',
    workflowPath: 'docs/swarm/workflows/refactor-pipeline.yaml',
  },
  perf: {
    agents: ['perf-engineer', 'coder'],
    maxAgents: 2,
    topology: 'hierarchical',
    reasoningEffort: 'high',
    workflowPath: 'docs/swarm/workflows/perf-pipeline.yaml',
  },
};

const RULES: Array<{pipeline: Exclude<PipelineType, 'none'>; pattern: RegExp; reason: string}> = [
  {
    pipeline: 'security',
    pattern: /\b(security|authz|authn|rbac|tenant leak|rls|csrf|xss|ssrf|cve|secret|pii|audit finding|hardening)\b/i,
    reason: 'security-sensitive keywords require threat-model and auditor coverage',
  },
  {
    pipeline: 'perf',
    pattern: /\b(performance|latency|p95|p99|slow|n\+1|throughput|benchmark|cpu|memory leak|optimi[sz]e)\b/i,
    reason: 'performance keywords require baseline and optimization coverage',
  },
  {
    pipeline: 'bug',
    pattern: /\b(bug|fix|failure|failing|error|regression|broken|crash|root cause|defect|incident)\b/i,
    reason: 'bug keywords require diagnosis, fix, and regression validation',
  },
  {
    pipeline: 'refactor',
    pattern: /\b(refactor|restructure|cleanup|migration path|split module|rename|dedupe|simplify)\b/i,
    reason: 'refactor keywords require behavior-preserving design and review',
  },
  {
    pipeline: 'feature',
    pattern: /\b(add|update|create|implement|build|new feature|endpoint|page|workflow|api|module)\b/i,
    reason: 'feature keywords require design, implementation, test, and review coverage',
  },
];

export function routeTask(task: string, changedFiles: string[] = []): RouteDecision {
  const normalized = task.trim();
  const questionOnly =
    changedFiles.length === 0 && /^(what|how|why|where|when|which|who|show|list)\b/i.test(normalized);
  if (questionOnly) {
    return {
      pipeline: 'none',
      confidence: 0.72,
      reason: 'question-shaped prompt appears better suited for direct Codex answer',
      agents: [],
      maxAgents: 0,
      topology: 'none',
      reasoningEffort: 'medium',
    };
  }

  const matched = RULES.find((rule) => rule.pattern.test(normalized));
  const broadChange = changedFiles.length >= 3;

  if (matched) {
    const base = PIPELINES[matched.pipeline];
    return {
      pipeline: matched.pipeline,
      confidence: broadChange ? 0.92 : 0.86,
      reason: broadChange
        ? `${matched.reason}; ${changedFiles.length} changed files indicates swarm scope`
        : matched.reason,
      ...base,
    };
  }

  if (broadChange) {
    return {
      pipeline: 'feature',
      confidence: 0.91,
      reason: `${changedFiles.length} changed files indicates multi-agent feature-style review`,
      ...PIPELINES.feature,
    };
  }

  return {
    pipeline: 'none',
    confidence: 0.65,
    reason: 'task appears narrow enough for direct Codex execution',
    agents: [],
    maxAgents: 0,
    topology: 'none',
    reasoningEffort: 'medium',
  };
}

export function buildStartWorkCommand(decision: RouteDecision, task: string): string | undefined {
  if (decision.pipeline === 'none') return undefined;
  const escaped = task.replaceAll('"', '\\"');
  return `./scripts/agents/start-work.sh ${decision.pipeline} "${escaped}"`;
}
