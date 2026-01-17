import { apiClient } from '../api/client';
import {
  Goal,
  GoalRequest,
  GoalAnalytics,
  PerformanceReview,
  ReviewRequest,
  ReviewCompetency,
  CompetencyRequest,
  Feedback,
  FeedbackRequest,
  ReviewCycle,
  ReviewCycleRequest,
  OKRGraphResponse,
  PerformanceSpiderResponse,
  ActivateCycleRequest,
  ActivateCycleResponse,
} from '../types/performance';

interface PaginatedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

// Goal Service
export const goalService = {
  // Create a new goal
  createGoal: async (data: GoalRequest): Promise<Goal> => {
    const response = await apiClient.post<Goal>('/goals', data);
    return response.data;
  },
  // Alias for createGoal
  create: async (data: GoalRequest): Promise<Goal> => {
    const response = await apiClient.post<Goal>('/goals', data);
    return response.data;
  },

  // Update an existing goal
  updateGoal: async (id: string, data: GoalRequest): Promise<Goal> => {
    const response = await apiClient.put<Goal>(`/goals/${id}`, data);
    return response.data;
  },
  // Alias for updateGoal
  update: async (id: string, data: GoalRequest): Promise<Goal> => {
    const response = await apiClient.put<Goal>(`/goals/${id}`, data);
    return response.data;
  },

  // Get goal by ID
  getGoalById: async (id: string): Promise<Goal> => {
    const response = await apiClient.get<Goal>(`/goals/${id}`);
    return response.data;
  },

  // Get all goals with pagination
  getAllGoals: async (page = 0, size = 20): Promise<PaginatedResponse<Goal>> => {
    const response = await apiClient.get<PaginatedResponse<Goal>>('/goals', {
      params: { page, size },
    });
    return response.data;
  },

  // Get goals for a specific employee
  getEmployeeGoals: async (employeeId: string): Promise<Goal[]> => {
    const response = await apiClient.get<Goal[]>(`/goals/employee/${employeeId}`);
    return response.data;
  },
  // Alias for getEmployeeGoals
  getByEmployee: async (employeeId: string): Promise<Goal[]> => {
    const response = await apiClient.get<Goal[]>(`/goals/employee/${employeeId}`);
    return response.data;
  },

  // Get team goals for a manager
  getTeamGoals: async (managerId: string): Promise<Goal[]> => {
    const response = await apiClient.get<Goal[]>(`/goals/team/${managerId}`);
    return response.data;
  },

  // Update goal progress
  updateProgress: async (id: string, progress: number): Promise<Goal> => {
    const response = await apiClient.patch<Goal>(`/goals/${id}/progress`, null, {
      params: { progress },
    });
    return response.data;
  },

  // Approve a goal
  approveGoal: async (id: string): Promise<Goal> => {
    const response = await apiClient.post<Goal>(`/goals/${id}/approve`);
    return response.data;
  },

  // Get goal analytics
  getGoalAnalytics: async (): Promise<GoalAnalytics> => {
    const response = await apiClient.get<GoalAnalytics>('/goals/analytics');
    return response.data;
  },

  // Delete a goal
  deleteGoal: async (id: string): Promise<void> => {
    await apiClient.delete(`/goals/${id}`);
  },
  // Alias for deleteGoal
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/goals/${id}`);
  },
};

// Review Service
export const reviewService = {
  // Create a new review
  createReview: async (data: ReviewRequest): Promise<PerformanceReview> => {
    const response = await apiClient.post<PerformanceReview>('/reviews', data);
    return response.data;
  },
  // Alias for createReview
  create: async (data: ReviewRequest): Promise<PerformanceReview> => {
    const response = await apiClient.post<PerformanceReview>('/reviews', data);
    return response.data;
  },

  // Update an existing review
  updateReview: async (id: string, data: ReviewRequest): Promise<PerformanceReview> => {
    const response = await apiClient.put<PerformanceReview>(`/reviews/${id}`, data);
    return response.data;
  },
  // Alias for updateReview
  update: async (id: string, data: ReviewRequest): Promise<PerformanceReview> => {
    const response = await apiClient.put<PerformanceReview>(`/reviews/${id}`, data);
    return response.data;
  },

  // Get review by ID
  getReviewById: async (id: string): Promise<PerformanceReview> => {
    const response = await apiClient.get<PerformanceReview>(`/reviews/${id}`);
    return response.data;
  },

  // Get all reviews with pagination
  getAllReviews: async (page = 0, size = 20): Promise<PaginatedResponse<PerformanceReview>> => {
    const response = await apiClient.get<PaginatedResponse<PerformanceReview>>('/reviews', {
      params: { page, size },
    });
    return response.data;
  },

  // Get reviews for a specific employee
  getEmployeeReviews: async (employeeId: string): Promise<PerformanceReview[]> => {
    const response = await apiClient.get<PerformanceReview[]>(`/reviews/employee/${employeeId}`);
    return response.data;
  },
  // Alias for getEmployeeReviews
  getByEmployee: async (employeeId: string): Promise<PerformanceReview[]> => {
    const response = await apiClient.get<PerformanceReview[]>(`/reviews/employee/${employeeId}`);
    return response.data;
  },

  // Get pending reviews for a reviewer
  getPendingReviews: async (reviewerId: string): Promise<PerformanceReview[]> => {
    const response = await apiClient.get<PerformanceReview[]>(`/reviews/reviewer/${reviewerId}/pending`);
    return response.data;
  },

  // Submit a review
  submitReview: async (id: string): Promise<PerformanceReview> => {
    const response = await apiClient.post<PerformanceReview>(`/reviews/${id}/submit`);
    return response.data;
  },

  // Complete a review
  completeReview: async (id: string): Promise<PerformanceReview> => {
    const response = await apiClient.post<PerformanceReview>(`/reviews/${id}/complete`);
    return response.data;
  },

  // Add a competency to a review
  addCompetency: async (data: CompetencyRequest): Promise<ReviewCompetency> => {
    const response = await apiClient.post<ReviewCompetency>('/reviews/competencies', data);
    return response.data;
  },

  // Get competencies for a review
  getCompetencies: async (reviewId: string): Promise<ReviewCompetency[]> => {
    const response = await apiClient.get<ReviewCompetency[]>(`/reviews/${reviewId}/competencies`);
    return response.data;
  },

  // Delete a review
  deleteReview: async (id: string): Promise<void> => {
    await apiClient.delete(`/reviews/${id}`);
  },
  // Alias for deleteReview
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/reviews/${id}`);
  },

  // Delete a competency
  deleteCompetency: async (id: string): Promise<void> => {
    await apiClient.delete(`/reviews/competencies/${id}`);
  },
};

// Feedback Service
export const feedbackService = {
  // Give feedback
  giveFeedback: async (data: FeedbackRequest): Promise<Feedback> => {
    const response = await apiClient.post<Feedback>('/feedback', data);
    return response.data;
  },
  // Alias for giveFeedback
  create: async (data: FeedbackRequest): Promise<Feedback> => {
    const response = await apiClient.post<Feedback>('/feedback', data);
    return response.data;
  },

  // Get feedback by ID
  getFeedbackById: async (id: string): Promise<Feedback> => {
    const response = await apiClient.get<Feedback>(`/feedback/${id}`);
    return response.data;
  },

  // Get received feedback for an employee
  getReceivedFeedback: async (employeeId: string): Promise<Feedback[]> => {
    const response = await apiClient.get<Feedback[]>(`/feedback/received/${employeeId}`);
    return response.data;
  },
  // Alias for getReceivedFeedback
  getByRecipient: async (employeeId: string): Promise<Feedback[]> => {
    const response = await apiClient.get<Feedback[]>(`/feedback/received/${employeeId}`);
    return response.data;
  },

  // Get given feedback by an employee
  getGivenFeedback: async (employeeId: string): Promise<Feedback[]> => {
    const response = await apiClient.get<Feedback[]>(`/feedback/given/${employeeId}`);
    return response.data;
  },
  // Alias for getGivenFeedback
  getByGiver: async (employeeId: string): Promise<Feedback[]> => {
    const response = await apiClient.get<Feedback[]>(`/feedback/given/${employeeId}`);
    return response.data;
  },

  // Update feedback
  updateFeedback: async (id: string, data: FeedbackRequest): Promise<Feedback> => {
    const response = await apiClient.put<Feedback>(`/feedback/${id}`, data);
    return response.data;
  },
  // Alias for updateFeedback
  update: async (id: string, data: FeedbackRequest): Promise<Feedback> => {
    const response = await apiClient.put<Feedback>(`/feedback/${id}`, data);
    return response.data;
  },

  // Delete feedback
  deleteFeedback: async (id: string): Promise<void> => {
    await apiClient.delete(`/feedback/${id}`);
  },
  // Alias for deleteFeedback
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/feedback/${id}`);
  },
};

// Review Cycle Service
export const reviewCycleService = {
  // Create a new review cycle
  createCycle: async (data: ReviewCycleRequest): Promise<ReviewCycle> => {
    const response = await apiClient.post<ReviewCycle>('/review-cycles', data);
    return response.data;
  },
  // Alias for createCycle
  create: async (data: ReviewCycleRequest): Promise<ReviewCycle> => {
    const response = await apiClient.post<ReviewCycle>('/review-cycles', data);
    return response.data;
  },

  // Update an existing review cycle
  updateCycle: async (id: string, data: ReviewCycleRequest): Promise<ReviewCycle> => {
    const response = await apiClient.put<ReviewCycle>(`/review-cycles/${id}`, data);
    return response.data;
  },
  // Alias for updateCycle
  update: async (id: string, data: ReviewCycleRequest): Promise<ReviewCycle> => {
    const response = await apiClient.put<ReviewCycle>(`/review-cycles/${id}`, data);
    return response.data;
  },

  // Get review cycle by ID
  getCycleById: async (id: string): Promise<ReviewCycle> => {
    const response = await apiClient.get<ReviewCycle>(`/review-cycles/${id}`);
    return response.data;
  },

  // Get all review cycles with pagination
  getAllCycles: async (page = 0, size = 20): Promise<PaginatedResponse<ReviewCycle>> => {
    const response = await apiClient.get<PaginatedResponse<ReviewCycle>>('/review-cycles', {
      params: { page, size },
    });
    return response.data;
  },
  // Alias for getAllCycles
  getAll: async (page = 0, size = 20): Promise<PaginatedResponse<ReviewCycle>> => {
    const response = await apiClient.get<PaginatedResponse<ReviewCycle>>('/review-cycles', {
      params: { page, size },
    });
    return response.data;
  },

  // Get active review cycles
  getActiveCycles: async (): Promise<ReviewCycle[]> => {
    const response = await apiClient.get<ReviewCycle[]>('/review-cycles/active');
    return response.data;
  },

  // Complete a review cycle
  completeCycle: async (id: string): Promise<ReviewCycle> => {
    const response = await apiClient.post<ReviewCycle>(`/review-cycles/${id}/complete`);
    return response.data;
  },

  // Activate a review cycle (creates reviews for employees in scope)
  activateCycle: async (id: string, data: ActivateCycleRequest): Promise<ActivateCycleResponse> => {
    const response = await apiClient.post<ActivateCycleResponse>(`/review-cycles/${id}/activate`, data);
    return response.data;
  },
  // Alias for activateCycle
  activate: async (id: string, data: ActivateCycleRequest): Promise<ActivateCycleResponse> => {
    const response = await apiClient.post<ActivateCycleResponse>(`/review-cycles/${id}/activate`, data);
    return response.data;
  },

  // Delete a review cycle
  deleteCycle: async (id: string): Promise<void> => {
    await apiClient.delete(`/review-cycles/${id}`);
  },
  // Alias for deleteCycle
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/review-cycles/${id}`);
  },
};

// Export performanceReviewService as alias for reviewService
export const performanceReviewService = reviewService;

export const performanceRevolutionService = {
  getOKRGraph: async (): Promise<OKRGraphResponse> => {
    const response = await apiClient.get<OKRGraphResponse>('/performance/revolution/okr-graph');
    return response.data;
  },

  getPerformanceSpider: async (employeeId: string): Promise<PerformanceSpiderResponse> => {
    const response = await apiClient.get<PerformanceSpiderResponse>(`/performance/revolution/spider/${employeeId}`);
    return response.data;
  },
};
