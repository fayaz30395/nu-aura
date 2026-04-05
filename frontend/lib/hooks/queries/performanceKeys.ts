/**
 * Query Key Factory for all performance-related React Query hooks.
 * Shared across domain-specific hook files to ensure consistent cache invalidation.
 */
export const performanceKeys = {
  all: ['performance'] as const,
  // Goals
  goals: () => [...performanceKeys.all, 'goals'] as const,
  allGoals: (page: number, size: number) =>
    [...performanceKeys.goals(), 'all', {page, size}] as const,
  employeeGoals: (employeeId: string) =>
    [...performanceKeys.goals(), 'employee', employeeId] as const,
  teamGoals: (managerId: string) =>
    [...performanceKeys.goals(), 'team', managerId] as const,
  goalDetail: (id: string) => [...performanceKeys.goals(), 'detail', id] as const,
  goalAnalytics: () => [...performanceKeys.goals(), 'analytics'] as const,
  // Review Cycles
  cycles: () => [...performanceKeys.all, 'cycles'] as const,
  allCycles: (page: number, size: number) =>
    [...performanceKeys.cycles(), 'all', {page, size}] as const,
  activeCycles: () => [...performanceKeys.cycles(), 'active'] as const,
  cycleDetail: (id: string) => [...performanceKeys.cycles(), 'detail', id] as const,
  // Performance Reviews
  reviews: () => [...performanceKeys.all, 'reviews'] as const,
  allReviews: (page: number, size: number) =>
    [...performanceKeys.reviews(), 'all', {page, size}] as const,
  employeeReviews: (employeeId: string) =>
    [...performanceKeys.reviews(), 'employee', employeeId] as const,
  pendingReviews: (reviewerId: string) =>
    [...performanceKeys.reviews(), 'pending', reviewerId] as const,
  reviewDetail: (id: string) => [...performanceKeys.reviews(), 'detail', id] as const,
  // OKR
  okr: () => [...performanceKeys.all, 'okr'] as const,
  okrGraph: () => [...performanceKeys.okr(), 'graph'] as const,
  performanceSpider: (employeeId: string) =>
    [...performanceKeys.okr(), 'spider', employeeId] as const,
  // Feedback
  feedback: () => [...performanceKeys.all, 'feedback'] as const,
  // 360 Feedback
  feedback360: () => [...performanceKeys.all, 'feedback360'] as const,
  feedback360Cycles: () => [...performanceKeys.feedback360(), 'cycles'] as const,
  // Competencies
  competencies: () => [...performanceKeys.all, 'competencies'] as const,
  reviewCompetencies: (reviewId: string) =>
    [...performanceKeys.competencies(), 'review', reviewId] as const,
};
