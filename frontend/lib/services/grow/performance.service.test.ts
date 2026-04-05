import {beforeEach, describe, expect, it, vi} from 'vitest';
import {
  feedbackService,
  goalService,
  performanceRevolutionService,
  pipService,
  reviewCycleService,
  reviewService,
} from './performance.service';
import {apiClient} from '@/lib/api/client';

vi.mock('@/lib/api/client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

const mockApiClient = apiClient as {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
  put: ReturnType<typeof vi.fn>;
  patch: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
};

describe('Performance Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── Goal Service Tests ───────────────────────────────────────────────────
  describe('goalService', () => {
    const mockGoal = {
      id: 'goal-1',
      name: 'Q1 Goals',
      description: 'Goals for Q1',
      progress: 50,
    };

    const mockGoalRequest = {
      name: 'Q1 Goals',
      description: 'Goals for Q1',
    };

    it('should create a goal successfully', async () => {
      mockApiClient.post.mockResolvedValueOnce({data: mockGoal});
      const result = await goalService.createGoal(mockGoalRequest);
      expect(result).toEqual(mockGoal);
      expect(mockApiClient.post).toHaveBeenCalledWith('/goals', mockGoalRequest);
    });

    it('should handle error when creating goal fails', async () => {
      mockApiClient.post.mockRejectedValueOnce(new Error('Create failed'));
      await expect(goalService.createGoal(mockGoalRequest)).rejects.toThrow('Create failed');
    });

    it('should create goal via alias method', async () => {
      mockApiClient.post.mockResolvedValueOnce({data: mockGoal});
      const result = await goalService.create(mockGoalRequest);
      expect(result).toEqual(mockGoal);
      expect(mockApiClient.post).toHaveBeenCalledWith('/goals', mockGoalRequest);
    });

    it('should update a goal successfully', async () => {
      mockApiClient.put.mockResolvedValueOnce({data: mockGoal});
      const result = await goalService.updateGoal('goal-1', mockGoalRequest);
      expect(result).toEqual(mockGoal);
      expect(mockApiClient.put).toHaveBeenCalledWith('/goals/goal-1', mockGoalRequest);
    });

    it('should handle error when updating goal fails', async () => {
      mockApiClient.put.mockRejectedValueOnce(new Error('Update failed'));
      await expect(goalService.updateGoal('goal-1', mockGoalRequest)).rejects.toThrow('Update failed');
    });

    it('should update goal via alias method', async () => {
      mockApiClient.put.mockResolvedValueOnce({data: mockGoal});
      const result = await goalService.update('goal-1', mockGoalRequest);
      expect(result).toEqual(mockGoal);
      expect(mockApiClient.put).toHaveBeenCalledWith('/goals/goal-1', mockGoalRequest);
    });

    it('should get goal by ID successfully', async () => {
      mockApiClient.get.mockResolvedValueOnce({data: mockGoal});
      const result = await goalService.getGoalById('goal-1');
      expect(result).toEqual(mockGoal);
      expect(mockApiClient.get).toHaveBeenCalledWith('/goals/goal-1');
    });

    it('should handle error when getting goal by ID fails', async () => {
      mockApiClient.get.mockRejectedValueOnce(new Error('Not found'));
      await expect(goalService.getGoalById('goal-1')).rejects.toThrow('Not found');
    });

    it('should get all goals with pagination', async () => {
      const paginatedResponse = {
        content: [mockGoal],
        totalElements: 1,
        totalPages: 1,
        size: 20,
        number: 0,
      };
      mockApiClient.get.mockResolvedValueOnce({data: paginatedResponse});
      const result = await goalService.getAllGoals(0, 20);
      expect(result).toEqual(paginatedResponse);
      expect(mockApiClient.get).toHaveBeenCalledWith('/goals', {params: {page: 0, size: 20}});
    });

    it('should handle error when getting all goals fails', async () => {
      mockApiClient.get.mockRejectedValueOnce(new Error('Fetch failed'));
      await expect(goalService.getAllGoals()).rejects.toThrow('Fetch failed');
    });

    it('should get employee goals successfully', async () => {
      mockApiClient.get.mockResolvedValueOnce({data: [mockGoal]});
      const result = await goalService.getEmployeeGoals('emp-1');
      expect(result).toEqual([mockGoal]);
      expect(mockApiClient.get).toHaveBeenCalledWith('/goals/employee/emp-1');
    });

    it('should handle error when getting employee goals fails', async () => {
      mockApiClient.get.mockRejectedValueOnce(new Error('Not found'));
      await expect(goalService.getEmployeeGoals('emp-1')).rejects.toThrow('Not found');
    });

    it('should get employee goals via alias method', async () => {
      mockApiClient.get.mockResolvedValueOnce({data: [mockGoal]});
      const result = await goalService.getByEmployee('emp-1');
      expect(result).toEqual([mockGoal]);
    });

    it('should get team goals successfully', async () => {
      mockApiClient.get.mockResolvedValueOnce({data: [mockGoal]});
      const result = await goalService.getTeamGoals('mgr-1');
      expect(result).toEqual([mockGoal]);
      expect(mockApiClient.get).toHaveBeenCalledWith('/goals/team/mgr-1');
    });

    it('should handle error when getting team goals fails', async () => {
      mockApiClient.get.mockRejectedValueOnce(new Error('Not found'));
      await expect(goalService.getTeamGoals('mgr-1')).rejects.toThrow('Not found');
    });

    it('should update progress successfully', async () => {
      mockApiClient.put.mockResolvedValueOnce({data: mockGoal});
      const result = await goalService.updateProgress('goal-1', 75);
      expect(result).toEqual(mockGoal);
      expect(mockApiClient.put).toHaveBeenCalledWith('/goals/goal-1/progress', null, {params: {progressPercentage: 75}});
    });

    it('should handle error when updating progress fails', async () => {
      mockApiClient.put.mockRejectedValueOnce(new Error('Update failed'));
      await expect(goalService.updateProgress('goal-1', 75)).rejects.toThrow('Update failed');
    });

    it('should approve goal successfully', async () => {
      mockApiClient.put.mockResolvedValueOnce({data: mockGoal});
      const result = await goalService.approveGoal('goal-1', 'approver-1');
      expect(result).toEqual(mockGoal);
      expect(mockApiClient.put).toHaveBeenCalledWith('/goals/goal-1/approve', null, {params: {approverId: 'approver-1'}});
    });

    it('should handle error when approving goal fails', async () => {
      mockApiClient.put.mockRejectedValueOnce(new Error('Approve failed'));
      await expect(goalService.approveGoal('goal-1', 'approver-1')).rejects.toThrow('Approve failed');
    });

    it('should get goal analytics successfully', async () => {
      const analytics = {totalGoals: 10, completedGoals: 5, avgProgress: 50};
      mockApiClient.get.mockResolvedValueOnce({data: analytics});
      const result = await goalService.getGoalAnalytics();
      expect(result).toEqual(analytics);
      expect(mockApiClient.get).toHaveBeenCalledWith('/goals/analytics');
    });

    it('should handle error when getting goal analytics fails', async () => {
      mockApiClient.get.mockRejectedValueOnce(new Error('Fetch failed'));
      await expect(goalService.getGoalAnalytics()).rejects.toThrow('Fetch failed');
    });

    it('should delete goal successfully', async () => {
      mockApiClient.delete.mockResolvedValueOnce({});
      await goalService.deleteGoal('goal-1');
      expect(mockApiClient.delete).toHaveBeenCalledWith('/goals/goal-1');
    });

    it('should handle error when deleting goal fails', async () => {
      mockApiClient.delete.mockRejectedValueOnce(new Error('Delete failed'));
      await expect(goalService.deleteGoal('goal-1')).rejects.toThrow('Delete failed');
    });

    it('should delete goal via alias method', async () => {
      mockApiClient.delete.mockResolvedValueOnce({});
      await goalService.delete('goal-1');
      expect(mockApiClient.delete).toHaveBeenCalledWith('/goals/goal-1');
    });
  });

  // ─── Review Service Tests ─────────────────────────────────────────────────
  describe('reviewService', () => {
    const mockReview = {
      id: 'review-1',
      employeeId: 'emp-1',
      status: 'PENDING',
    };

    const mockReviewRequest = {
      employeeId: 'emp-1',
      reviewerIds: ['mgr-1'],
    };

    it('should create a review successfully', async () => {
      mockApiClient.post.mockResolvedValueOnce({data: mockReview});
      const result = await reviewService.createReview(mockReviewRequest);
      expect(result).toEqual(mockReview);
      expect(mockApiClient.post).toHaveBeenCalledWith('/reviews', mockReviewRequest);
    });

    it('should handle error when creating review fails', async () => {
      mockApiClient.post.mockRejectedValueOnce(new Error('Create failed'));
      await expect(reviewService.createReview(mockReviewRequest)).rejects.toThrow('Create failed');
    });

    it('should update a review successfully', async () => {
      mockApiClient.put.mockResolvedValueOnce({data: mockReview});
      const result = await reviewService.updateReview('review-1', mockReviewRequest);
      expect(result).toEqual(mockReview);
      expect(mockApiClient.put).toHaveBeenCalledWith('/reviews/review-1', mockReviewRequest);
    });

    it('should handle error when updating review fails', async () => {
      mockApiClient.put.mockRejectedValueOnce(new Error('Update failed'));
      await expect(reviewService.updateReview('review-1', mockReviewRequest)).rejects.toThrow('Update failed');
    });

    it('should get review by ID successfully', async () => {
      mockApiClient.get.mockResolvedValueOnce({data: mockReview});
      const result = await reviewService.getReviewById('review-1');
      expect(result).toEqual(mockReview);
      expect(mockApiClient.get).toHaveBeenCalledWith('/reviews/review-1');
    });

    it('should handle error when getting review by ID fails', async () => {
      mockApiClient.get.mockRejectedValueOnce(new Error('Not found'));
      await expect(reviewService.getReviewById('review-1')).rejects.toThrow('Not found');
    });

    it('should get all reviews with pagination', async () => {
      const paginatedResponse = {
        content: [mockReview],
        totalElements: 1,
        totalPages: 1,
        size: 20,
        number: 0,
      };
      mockApiClient.get.mockResolvedValueOnce({data: paginatedResponse});
      const result = await reviewService.getAllReviews(0, 20);
      expect(result).toEqual(paginatedResponse);
      expect(mockApiClient.get).toHaveBeenCalledWith('/reviews', {params: {page: 0, size: 20}});
    });

    it('should handle error when getting all reviews fails', async () => {
      mockApiClient.get.mockRejectedValueOnce(new Error('Fetch failed'));
      await expect(reviewService.getAllReviews()).rejects.toThrow('Fetch failed');
    });

    it('should get employee reviews successfully', async () => {
      mockApiClient.get.mockResolvedValueOnce({data: [mockReview]});
      const result = await reviewService.getEmployeeReviews('emp-1');
      expect(result).toEqual([mockReview]);
      expect(mockApiClient.get).toHaveBeenCalledWith('/reviews/employee/emp-1');
    });

    it('should handle error when getting employee reviews fails', async () => {
      mockApiClient.get.mockRejectedValueOnce(new Error('Not found'));
      await expect(reviewService.getEmployeeReviews('emp-1')).rejects.toThrow('Not found');
    });

    it('should get pending reviews successfully', async () => {
      mockApiClient.get.mockResolvedValueOnce({data: [mockReview]});
      const result = await reviewService.getPendingReviews('rev-1');
      expect(result).toEqual([mockReview]);
      expect(mockApiClient.get).toHaveBeenCalledWith('/reviews/pending/rev-1');
    });

    it('should handle error when getting pending reviews fails', async () => {
      mockApiClient.get.mockRejectedValueOnce(new Error('Not found'));
      await expect(reviewService.getPendingReviews('rev-1')).rejects.toThrow('Not found');
    });

    it('should submit review successfully', async () => {
      mockApiClient.put.mockResolvedValueOnce({data: mockReview});
      const result = await reviewService.submitReview('review-1');
      expect(result).toEqual(mockReview);
      expect(mockApiClient.put).toHaveBeenCalledWith('/reviews/review-1/submit');
    });

    it('should handle error when submitting review fails', async () => {
      mockApiClient.put.mockRejectedValueOnce(new Error('Submit failed'));
      await expect(reviewService.submitReview('review-1')).rejects.toThrow('Submit failed');
    });

    it('should complete review successfully', async () => {
      mockApiClient.put.mockResolvedValueOnce({data: mockReview});
      const result = await reviewService.completeReview('review-1');
      expect(result).toEqual(mockReview);
      expect(mockApiClient.put).toHaveBeenCalledWith('/reviews/review-1/complete');
    });

    it('should handle error when completing review fails', async () => {
      mockApiClient.put.mockRejectedValueOnce(new Error('Complete failed'));
      await expect(reviewService.completeReview('review-1')).rejects.toThrow('Complete failed');
    });

    it('should add competency successfully', async () => {
      const competency = {id: 'comp-1', name: 'Leadership'};
      mockApiClient.post.mockResolvedValueOnce({data: competency});
      const result = await reviewService.addCompetency({reviewId: 'review-1', name: 'Leadership'});
      expect(result).toEqual(competency);
      expect(mockApiClient.post).toHaveBeenCalledWith('/reviews/competencies', {
        reviewId: 'review-1',
        name: 'Leadership'
      });
    });

    it('should handle error when adding competency fails', async () => {
      mockApiClient.post.mockRejectedValueOnce(new Error('Add failed'));
      await expect(reviewService.addCompetency({
        reviewId: 'review-1',
        name: 'Leadership'
      })).rejects.toThrow('Add failed');
    });

    it('should get competencies successfully', async () => {
      const competencies = [{id: 'comp-1', name: 'Leadership'}];
      mockApiClient.get.mockResolvedValueOnce({data: competencies});
      const result = await reviewService.getCompetencies('review-1');
      expect(result).toEqual(competencies);
      expect(mockApiClient.get).toHaveBeenCalledWith('/reviews/review-1/competencies');
    });

    it('should handle error when getting competencies fails', async () => {
      mockApiClient.get.mockRejectedValueOnce(new Error('Not found'));
      await expect(reviewService.getCompetencies('review-1')).rejects.toThrow('Not found');
    });

    it('should delete review successfully', async () => {
      mockApiClient.delete.mockResolvedValueOnce({});
      await reviewService.deleteReview('review-1');
      expect(mockApiClient.delete).toHaveBeenCalledWith('/reviews/review-1');
    });

    it('should handle error when deleting review fails', async () => {
      mockApiClient.delete.mockRejectedValueOnce(new Error('Delete failed'));
      await expect(reviewService.deleteReview('review-1')).rejects.toThrow('Delete failed');
    });

    it('should delete competency successfully', async () => {
      mockApiClient.delete.mockResolvedValueOnce({});
      await reviewService.deleteCompetency('comp-1');
      expect(mockApiClient.delete).toHaveBeenCalledWith('/reviews/competencies/comp-1');
    });

    it('should handle error when deleting competency fails', async () => {
      mockApiClient.delete.mockRejectedValueOnce(new Error('Delete failed'));
      await expect(reviewService.deleteCompetency('comp-1')).rejects.toThrow('Delete failed');
    });
  });

  // ─── Feedback Service Tests ───────────────────────────────────────────────
  describe('feedbackService', () => {
    const mockFeedback = {
      id: 'feedback-1',
      giverEmployeeId: 'emp-1',
      recipientEmployeeId: 'emp-2',
      content: 'Great work',
    };

    const mockFeedbackRequest = {
      giverEmployeeId: 'emp-1',
      recipientEmployeeId: 'emp-2',
      content: 'Great work',
    };

    it('should give feedback successfully', async () => {
      mockApiClient.post.mockResolvedValueOnce({data: mockFeedback});
      const result = await feedbackService.giveFeedback(mockFeedbackRequest);
      expect(result).toEqual(mockFeedback);
      expect(mockApiClient.post).toHaveBeenCalledWith('/feedback', mockFeedbackRequest);
    });

    it('should handle error when giving feedback fails', async () => {
      mockApiClient.post.mockRejectedValueOnce(new Error('Create failed'));
      await expect(feedbackService.giveFeedback(mockFeedbackRequest)).rejects.toThrow('Create failed');
    });

    it('should get feedback by ID successfully', async () => {
      mockApiClient.get.mockResolvedValueOnce({data: mockFeedback});
      const result = await feedbackService.getFeedbackById('feedback-1');
      expect(result).toEqual(mockFeedback);
      expect(mockApiClient.get).toHaveBeenCalledWith('/feedback/feedback-1');
    });

    it('should handle error when getting feedback by ID fails', async () => {
      mockApiClient.get.mockRejectedValueOnce(new Error('Not found'));
      await expect(feedbackService.getFeedbackById('feedback-1')).rejects.toThrow('Not found');
    });

    it('should get received feedback successfully', async () => {
      mockApiClient.get.mockResolvedValueOnce({data: [mockFeedback]});
      const result = await feedbackService.getReceivedFeedback('emp-2');
      expect(result).toEqual([mockFeedback]);
      expect(mockApiClient.get).toHaveBeenCalledWith('/feedback/received/emp-2');
    });

    it('should handle error when getting received feedback fails', async () => {
      mockApiClient.get.mockRejectedValueOnce(new Error('Not found'));
      await expect(feedbackService.getReceivedFeedback('emp-2')).rejects.toThrow('Not found');
    });

    it('should get given feedback successfully', async () => {
      mockApiClient.get.mockResolvedValueOnce({data: [mockFeedback]});
      const result = await feedbackService.getGivenFeedback('emp-1');
      expect(result).toEqual([mockFeedback]);
      expect(mockApiClient.get).toHaveBeenCalledWith('/feedback/given/emp-1');
    });

    it('should handle error when getting given feedback fails', async () => {
      mockApiClient.get.mockRejectedValueOnce(new Error('Not found'));
      await expect(feedbackService.getGivenFeedback('emp-1')).rejects.toThrow('Not found');
    });

    it('should update feedback successfully', async () => {
      mockApiClient.put.mockResolvedValueOnce({data: mockFeedback});
      const result = await feedbackService.updateFeedback('feedback-1', mockFeedbackRequest);
      expect(result).toEqual(mockFeedback);
      expect(mockApiClient.put).toHaveBeenCalledWith('/feedback/feedback-1', mockFeedbackRequest);
    });

    it('should handle error when updating feedback fails', async () => {
      mockApiClient.put.mockRejectedValueOnce(new Error('Update failed'));
      await expect(feedbackService.updateFeedback('feedback-1', mockFeedbackRequest)).rejects.toThrow('Update failed');
    });

    it('should delete feedback successfully', async () => {
      mockApiClient.delete.mockResolvedValueOnce({});
      await feedbackService.deleteFeedback('feedback-1');
      expect(mockApiClient.delete).toHaveBeenCalledWith('/feedback/feedback-1');
    });

    it('should handle error when deleting feedback fails', async () => {
      mockApiClient.delete.mockRejectedValueOnce(new Error('Delete failed'));
      await expect(feedbackService.deleteFeedback('feedback-1')).rejects.toThrow('Delete failed');
    });
  });

  // ─── Review Cycle Service Tests ───────────────────────────────────────────
  describe('reviewCycleService', () => {
    const mockCycle = {
      id: 'cycle-1',
      name: 'Q1 2024',
      status: 'ACTIVE',
    };

    const mockCycleRequest = {
      name: 'Q1 2024',
      startDate: '2024-01-01',
      endDate: '2024-03-31',
    };

    it('should create a review cycle successfully', async () => {
      mockApiClient.post.mockResolvedValueOnce({data: mockCycle});
      const result = await reviewCycleService.createCycle(mockCycleRequest);
      expect(result).toEqual(mockCycle);
      expect(mockApiClient.post).toHaveBeenCalledWith('/review-cycles', mockCycleRequest);
    });

    it('should handle error when creating review cycle fails', async () => {
      mockApiClient.post.mockRejectedValueOnce(new Error('Create failed'));
      await expect(reviewCycleService.createCycle(mockCycleRequest)).rejects.toThrow('Create failed');
    });

    it('should update a review cycle successfully', async () => {
      mockApiClient.put.mockResolvedValueOnce({data: mockCycle});
      const result = await reviewCycleService.updateCycle('cycle-1', mockCycleRequest);
      expect(result).toEqual(mockCycle);
      expect(mockApiClient.put).toHaveBeenCalledWith('/review-cycles/cycle-1', mockCycleRequest);
    });

    it('should handle error when updating review cycle fails', async () => {
      mockApiClient.put.mockRejectedValueOnce(new Error('Update failed'));
      await expect(reviewCycleService.updateCycle('cycle-1', mockCycleRequest)).rejects.toThrow('Update failed');
    });

    it('should get review cycle by ID successfully', async () => {
      mockApiClient.get.mockResolvedValueOnce({data: mockCycle});
      const result = await reviewCycleService.getCycleById('cycle-1');
      expect(result).toEqual(mockCycle);
      expect(mockApiClient.get).toHaveBeenCalledWith('/review-cycles/cycle-1');
    });

    it('should handle error when getting review cycle by ID fails', async () => {
      mockApiClient.get.mockRejectedValueOnce(new Error('Not found'));
      await expect(reviewCycleService.getCycleById('cycle-1')).rejects.toThrow('Not found');
    });

    it('should get all review cycles with pagination', async () => {
      const paginatedResponse = {
        content: [mockCycle],
        totalElements: 1,
        totalPages: 1,
        size: 20,
        number: 0,
      };
      mockApiClient.get.mockResolvedValueOnce({data: paginatedResponse});
      const result = await reviewCycleService.getAllCycles(0, 20);
      expect(result).toEqual(paginatedResponse);
      expect(mockApiClient.get).toHaveBeenCalledWith('/review-cycles', {params: {page: 0, size: 20}});
    });

    it('should handle error when getting all review cycles fails', async () => {
      mockApiClient.get.mockRejectedValueOnce(new Error('Fetch failed'));
      await expect(reviewCycleService.getAllCycles()).rejects.toThrow('Fetch failed');
    });

    it('should get active review cycles successfully', async () => {
      mockApiClient.get.mockResolvedValueOnce({data: [mockCycle]});
      const result = await reviewCycleService.getActiveCycles();
      expect(result).toEqual([mockCycle]);
      expect(mockApiClient.get).toHaveBeenCalledWith('/review-cycles/active');
    });

    it('should handle error when getting active review cycles fails', async () => {
      mockApiClient.get.mockRejectedValueOnce(new Error('Fetch failed'));
      await expect(reviewCycleService.getActiveCycles()).rejects.toThrow('Fetch failed');
    });

    it('should complete a review cycle successfully', async () => {
      mockApiClient.post.mockResolvedValueOnce({data: mockCycle});
      const result = await reviewCycleService.completeCycle('cycle-1');
      expect(result).toEqual(mockCycle);
      expect(mockApiClient.post).toHaveBeenCalledWith('/review-cycles/cycle-1/complete');
    });

    it('should handle error when completing review cycle fails', async () => {
      mockApiClient.post.mockRejectedValueOnce(new Error('Complete failed'));
      await expect(reviewCycleService.completeCycle('cycle-1')).rejects.toThrow('Complete failed');
    });

    it('should activate a review cycle successfully', async () => {
      const response = {cycleId: 'cycle-1', reviewsCreated: 10};
      mockApiClient.post.mockResolvedValueOnce({data: response});
      const result = await reviewCycleService.activateCycle('cycle-1', {employeeFilter: []});
      expect(result).toEqual(response);
      expect(mockApiClient.post).toHaveBeenCalledWith('/review-cycles/cycle-1/activate', {employeeFilter: []});
    });

    it('should handle error when activating review cycle fails', async () => {
      mockApiClient.post.mockRejectedValueOnce(new Error('Activate failed'));
      await expect(reviewCycleService.activateCycle('cycle-1', {employeeFilter: []})).rejects.toThrow('Activate failed');
    });

    it('should delete a review cycle successfully', async () => {
      mockApiClient.delete.mockResolvedValueOnce({});
      await reviewCycleService.deleteCycle('cycle-1');
      expect(mockApiClient.delete).toHaveBeenCalledWith('/review-cycles/cycle-1');
    });

    it('should handle error when deleting review cycle fails', async () => {
      mockApiClient.delete.mockRejectedValueOnce(new Error('Delete failed'));
      await expect(reviewCycleService.deleteCycle('cycle-1')).rejects.toThrow('Delete failed');
    });
  });

  // ─── PIP Service Tests ────────────────────────────────────────────────────
  describe('pipService', () => {
    const mockPIP = {
      id: 'pip-1',
      employeeId: 'emp-1',
      status: 'ACTIVE',
      startDate: '2024-01-01',
      endDate: '2024-03-31',
    };

    it('should get all PIPs successfully', async () => {
      mockApiClient.get.mockResolvedValueOnce({data: [mockPIP]});
      const result = await pipService.getAll();
      expect(result).toEqual([mockPIP]);
      expect(mockApiClient.get).toHaveBeenCalledWith('/performance/pip', {params: {}});
    });

    it('should handle error when getting all PIPs fails', async () => {
      mockApiClient.get.mockRejectedValueOnce(new Error('Fetch failed'));
      await expect(pipService.getAll()).rejects.toThrow('Fetch failed');
    });

    it('should get PIP by ID successfully', async () => {
      mockApiClient.get.mockResolvedValueOnce({data: mockPIP});
      const result = await pipService.getById('pip-1');
      expect(result).toEqual(mockPIP);
      expect(mockApiClient.get).toHaveBeenCalledWith('/performance/pip/pip-1');
    });

    it('should handle error when getting PIP by ID fails', async () => {
      mockApiClient.get.mockRejectedValueOnce(new Error('Not found'));
      await expect(pipService.getById('pip-1')).rejects.toThrow('Not found');
    });

    it('should create a PIP successfully', async () => {
      const request = {
        employeeId: 'emp-1',
        managerId: 'mgr-1',
        startDate: '2024-01-01',
        endDate: '2024-03-31',
        reason: 'Performance improvement needed',
      };
      mockApiClient.post.mockResolvedValueOnce({data: mockPIP});
      const result = await pipService.create(request);
      expect(result).toEqual(mockPIP);
      expect(mockApiClient.post).toHaveBeenCalledWith('/performance/pip', request);
    });

    it('should handle error when creating PIP fails', async () => {
      const request = {
        employeeId: 'emp-1',
        managerId: 'mgr-1',
        startDate: '2024-01-01',
        endDate: '2024-03-31',
        reason: 'Performance improvement needed',
      };
      mockApiClient.post.mockRejectedValueOnce(new Error('Create failed'));
      await expect(pipService.create(request)).rejects.toThrow('Create failed');
    });

    it('should record a PIP check-in successfully', async () => {
      const checkInRequest = {
        checkInDate: '2024-01-15',
        progressNotes: 'On track',
      };
      const checkIn = {id: 'checkin-1', ...checkInRequest};
      mockApiClient.post.mockResolvedValueOnce({data: checkIn});
      const result = await pipService.recordCheckIn('pip-1', checkInRequest);
      expect(result).toEqual(checkIn);
      expect(mockApiClient.post).toHaveBeenCalledWith('/performance/pip/pip-1/check-in', checkInRequest);
    });

    it('should handle error when recording PIP check-in fails', async () => {
      const checkInRequest = {
        checkInDate: '2024-01-15',
        progressNotes: 'On track',
      };
      mockApiClient.post.mockRejectedValueOnce(new Error('Check-in failed'));
      await expect(pipService.recordCheckIn('pip-1', checkInRequest)).rejects.toThrow('Check-in failed');
    });

    it('should close a PIP successfully', async () => {
      const closeRequest = {
        closeNotes: 'Performance improved',
        status: 'COMPLETED' as const,
      };
      mockApiClient.put.mockResolvedValueOnce({});
      await pipService.close('pip-1', closeRequest);
      expect(mockApiClient.put).toHaveBeenCalledWith('/performance/pip/pip-1/close', closeRequest);
    });

    it('should handle error when closing PIP fails', async () => {
      const closeRequest = {
        closeNotes: 'Performance improved',
        status: 'COMPLETED' as const,
      };
      mockApiClient.put.mockRejectedValueOnce(new Error('Close failed'));
      await expect(pipService.close('pip-1', closeRequest)).rejects.toThrow('Close failed');
    });
  });

  // ─── Performance Revolution Service Tests ──────────────────────────────────
  describe('performanceRevolutionService', () => {
    it('should get OKR graph successfully', async () => {
      const mockGraphData = {nodes: [], edges: []};
      mockApiClient.get.mockResolvedValueOnce({data: mockGraphData});
      const result = await performanceRevolutionService.getOKRGraph();
      expect(result).toEqual(mockGraphData);
      expect(mockApiClient.get).toHaveBeenCalledWith('/performance/revolution/okr-graph');
    });

    it('should handle error when getting OKR graph fails', async () => {
      mockApiClient.get.mockRejectedValueOnce(new Error('Fetch failed'));
      await expect(performanceRevolutionService.getOKRGraph()).rejects.toThrow('Fetch failed');
    });

    it('should get performance spider successfully', async () => {
      const mockSpiderData = {dimensions: [], scores: []};
      mockApiClient.get.mockResolvedValueOnce({data: mockSpiderData});
      const result = await performanceRevolutionService.getPerformanceSpider('emp-1');
      expect(result).toEqual(mockSpiderData);
      expect(mockApiClient.get).toHaveBeenCalledWith('/performance/revolution/spider/emp-1');
    });

    it('should handle error when getting performance spider fails', async () => {
      mockApiClient.get.mockRejectedValueOnce(new Error('Fetch failed'));
      await expect(performanceRevolutionService.getPerformanceSpider('emp-1')).rejects.toThrow('Fetch failed');
    });
  });
});
