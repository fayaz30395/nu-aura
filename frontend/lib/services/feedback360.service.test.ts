/**
 * Unit Tests for Feedback360 Service
 * Run with: npx vitest run lib/services/feedback360.service.test.ts
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@/lib/api/client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

import { feedback360Service } from './feedback360.service';
import {
  Feedback360Cycle,
  Feedback360Request,
  Feedback360Summary,
  CycleRequest,
  FeedbackResponse,
} from './feedback360.service';
import { apiClient } from '@/lib/api/client';

const mockedApiClient = apiClient as {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
  put: ReturnType<typeof vi.fn>;
  patch: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
};

describe('Feedback360Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --- Cycle Management Tests ---

  describe('createCycle', () => {
    it('should create a feedback cycle successfully', async () => {
      const cycleData: CycleRequest = {
        name: 'Annual Review 2024',
        description: 'Q1 2024 performance feedback cycle',
        startDate: '2024-01-01',
        endDate: '2024-03-31',
        minPeersRequired: 2,
        maxPeersAllowed: 5,
        isAnonymous: true,
        includeSelfReview: true,
        includeManagerReview: true,
        includePeerReview: true,
      };

      const mockCycle: Feedback360Cycle = {
        id: 'cycle-1',
        tenantId: 'tenant-1',
        name: 'Annual Review 2024',
        description: 'Q1 2024 performance feedback cycle',
        status: 'DRAFT',
        startDate: '2024-01-01',
        endDate: '2024-03-31',
        minPeersRequired: 2,
        maxPeersAllowed: 5,
        isAnonymous: true,
        includeSelfReview: true,
        includeManagerReview: true,
        includePeerReview: true,
        includeUpwardReview: false,
        createdAt: '2024-01-01T00:00:00Z',
      };

      mockedApiClient.post.mockResolvedValueOnce({ data: mockCycle });

      const result = await feedback360Service.createCycle(cycleData);

      expect(mockedApiClient.post).toHaveBeenCalledWith('/feedback360/cycles', cycleData);
      expect(result).toEqual(mockCycle);
      expect(result.status).toBe('DRAFT');
    });

    it('should handle error when creating cycle fails', async () => {
      const error = new Error('Validation error');
      mockedApiClient.post.mockRejectedValueOnce(error);

      const cycleData: CycleRequest = {
        name: 'Test Cycle',
        startDate: '2024-01-01',
        endDate: '2024-03-31',
      };

      await expect(feedback360Service.createCycle(cycleData)).rejects.toThrow('Validation error');
      expect(mockedApiClient.post).toHaveBeenCalled();
    });

    it('should create cycle with minimal required fields', async () => {
      const cycleData: CycleRequest = {
        name: 'Minimal Cycle',
        startDate: '2024-01-01',
        endDate: '2024-03-31',
      };

      const mockCycle: Feedback360Cycle = {
        id: 'cycle-2',
        tenantId: 'tenant-1',
        name: 'Minimal Cycle',
        status: 'DRAFT',
        startDate: '2024-01-01',
        endDate: '2024-03-31',
        minPeersRequired: 0,
        maxPeersAllowed: 0,
        isAnonymous: false,
        includeSelfReview: false,
        includeManagerReview: false,
        includePeerReview: false,
        includeUpwardReview: false,
        createdAt: '2024-01-01T00:00:00Z',
      };

      mockedApiClient.post.mockResolvedValueOnce({ data: mockCycle });

      const result = await feedback360Service.createCycle(cycleData);

      expect(result).toEqual(mockCycle);
    });
  });

  describe('getCycles', () => {
    it('should fetch cycles with default pagination', async () => {
      const mockCycles: Feedback360Cycle[] = [
        {
          id: 'cycle-1',
          tenantId: 'tenant-1',
          name: 'Cycle 1',
          status: 'ACTIVE',
          startDate: '2024-01-01',
          endDate: '2024-03-31',
          minPeersRequired: 2,
          maxPeersAllowed: 5,
          isAnonymous: true,
          includeSelfReview: true,
          includeManagerReview: true,
          includePeerReview: true,
          includeUpwardReview: false,
          createdAt: '2024-01-01T00:00:00Z',
        },
      ];

      const mockResponse = {
        content: mockCycles,
        totalElements: 1,
      };

      mockedApiClient.get.mockResolvedValueOnce({ data: mockResponse });

      const result = await feedback360Service.getCycles();

      expect(mockedApiClient.get).toHaveBeenCalledWith('/feedback360/cycles', {
        params: { page: 0, size: 20 },
      });
      expect(result).toEqual(mockResponse);
      expect(result.content).toHaveLength(1);
    });

    it('should fetch cycles with custom pagination', async () => {
      const mockResponse = {
        content: [],
        totalElements: 0,
      };

      mockedApiClient.get.mockResolvedValueOnce({ data: mockResponse });

      const result = await feedback360Service.getCycles(2, 10);

      expect(mockedApiClient.get).toHaveBeenCalledWith('/feedback360/cycles', {
        params: { page: 2, size: 10 },
      });
      expect(result).toEqual(mockResponse);
    });

    it('should handle empty cycles list', async () => {
      const mockResponse = {
        content: [],
        totalElements: 0,
      };

      mockedApiClient.get.mockResolvedValueOnce({ data: mockResponse });

      const result = await feedback360Service.getCycles();

      expect(result.content).toHaveLength(0);
      expect(result.totalElements).toBe(0);
    });

    it('should handle error when fetching cycles fails', async () => {
      const error = new Error('API error');
      mockedApiClient.get.mockRejectedValueOnce(error);

      await expect(feedback360Service.getCycles()).rejects.toThrow('API error');
    });
  });

  describe('getActiveCycles', () => {
    it('should fetch active cycles successfully', async () => {
      const mockCycles: Feedback360Cycle[] = [
        {
          id: 'cycle-1',
          tenantId: 'tenant-1',
          name: 'Active Cycle',
          status: 'ACTIVE',
          startDate: '2024-01-01',
          endDate: '2024-03-31',
          minPeersRequired: 2,
          maxPeersAllowed: 5,
          isAnonymous: true,
          includeSelfReview: true,
          includeManagerReview: true,
          includePeerReview: true,
          includeUpwardReview: false,
          createdAt: '2024-01-01T00:00:00Z',
        },
      ];

      mockedApiClient.get.mockResolvedValueOnce({ data: mockCycles });

      const result = await feedback360Service.getActiveCycles();

      expect(mockedApiClient.get).toHaveBeenCalledWith('/feedback360/cycles/active');
      expect(result).toEqual(mockCycles);
      expect(result[0].status).toBe('ACTIVE');
    });

    it('should handle empty active cycles', async () => {
      mockedApiClient.get.mockResolvedValueOnce({ data: [] });

      const result = await feedback360Service.getActiveCycles();

      expect(result).toHaveLength(0);
    });
  });

  describe('getCycle', () => {
    it('should fetch single cycle by ID', async () => {
      const mockCycle: Feedback360Cycle = {
        id: 'cycle-1',
        tenantId: 'tenant-1',
        name: 'Test Cycle',
        status: 'ACTIVE',
        startDate: '2024-01-01',
        endDate: '2024-03-31',
        minPeersRequired: 2,
        maxPeersAllowed: 5,
        isAnonymous: true,
        includeSelfReview: true,
        includeManagerReview: true,
        includePeerReview: true,
        includeUpwardReview: false,
        createdAt: '2024-01-01T00:00:00Z',
      };

      mockedApiClient.get.mockResolvedValueOnce({ data: mockCycle });

      const result = await feedback360Service.getCycle('cycle-1');

      expect(mockedApiClient.get).toHaveBeenCalledWith('/feedback360/cycles/cycle-1');
      expect(result).toEqual(mockCycle);
      expect(result.id).toBe('cycle-1');
    });

    it('should handle cycle not found error', async () => {
      const error = new Error('Cycle not found');
      mockedApiClient.get.mockRejectedValueOnce(error);

      await expect(feedback360Service.getCycle('invalid-id')).rejects.toThrow('Cycle not found');
    });
  });

  describe('activateCycle', () => {
    it('should activate cycle successfully', async () => {
      mockedApiClient.post.mockResolvedValueOnce({ data: {} });

      await feedback360Service.activateCycle('cycle-1');

      expect(mockedApiClient.post).toHaveBeenCalledWith('/feedback360/cycles/cycle-1/activate');
    });

    it('should handle error when activating cycle fails', async () => {
      const error = new Error('Cannot activate cycle');
      mockedApiClient.post.mockRejectedValueOnce(error);

      await expect(feedback360Service.activateCycle('cycle-1')).rejects.toThrow(
        'Cannot activate cycle'
      );
    });
  });

  describe('closeCycle', () => {
    it('should close cycle successfully', async () => {
      mockedApiClient.post.mockResolvedValueOnce({ data: {} });

      await feedback360Service.closeCycle('cycle-1');

      expect(mockedApiClient.post).toHaveBeenCalledWith('/feedback360/cycles/cycle-1/close');
    });

    it('should handle error when closing cycle fails', async () => {
      const error = new Error('Cannot close cycle');
      mockedApiClient.post.mockRejectedValueOnce(error);

      await expect(feedback360Service.closeCycle('cycle-1')).rejects.toThrow('Cannot close cycle');
    });
  });

  describe('deleteCycle', () => {
    it('should delete cycle successfully', async () => {
      mockedApiClient.delete.mockResolvedValueOnce({ data: {} });

      await feedback360Service.deleteCycle('cycle-1');

      expect(mockedApiClient.delete).toHaveBeenCalledWith('/feedback360/cycles/cycle-1');
    });

    it('should handle error when deleting cycle fails', async () => {
      const error = new Error('Cannot delete cycle');
      mockedApiClient.delete.mockRejectedValueOnce(error);

      await expect(feedback360Service.deleteCycle('cycle-1')).rejects.toThrow(
        'Cannot delete cycle'
      );
    });

    it('should handle permission denied for cycle deletion', async () => {
      const error = new Error('Forbidden');
      mockedApiClient.delete.mockRejectedValueOnce(error);

      await expect(feedback360Service.deleteCycle('cycle-1')).rejects.toThrow('Forbidden');
    });
  });

  // --- Pending Reviews Tests ---

  describe('getMyPendingReviews', () => {
    it('should fetch pending reviews successfully', async () => {
      const mockReviews: Feedback360Request[] = [
        {
          id: 'req-1',
          tenantId: 'tenant-1',
          cycleId: 'cycle-1',
          subjectEmployeeId: 'emp-1',
          reviewerId: 'emp-2',
          reviewerType: 'PEER',
          status: 'PENDING',
          nominationApproved: true,
          reminderCount: 0,
          createdAt: '2024-01-01T00:00:00Z',
        },
        {
          id: 'req-2',
          tenantId: 'tenant-1',
          cycleId: 'cycle-1',
          subjectEmployeeId: 'emp-1',
          reviewerId: 'emp-3',
          reviewerType: 'MANAGER',
          status: 'PENDING',
          nominationApproved: true,
          reminderCount: 1,
          createdAt: '2024-01-01T00:00:00Z',
        },
      ];

      mockedApiClient.get.mockResolvedValueOnce({ data: mockReviews });

      const result = await feedback360Service.getMyPendingReviews();

      expect(mockedApiClient.get).toHaveBeenCalledWith('/feedback360/my-pending-reviews');
      expect(result).toEqual(mockReviews);
      expect(result).toHaveLength(2);
    });

    it('should handle no pending reviews', async () => {
      mockedApiClient.get.mockResolvedValueOnce({ data: [] });

      const result = await feedback360Service.getMyPendingReviews();

      expect(result).toHaveLength(0);
    });

    it('should handle error when fetching pending reviews', async () => {
      const error = new Error('API error');
      mockedApiClient.get.mockRejectedValueOnce(error);

      await expect(feedback360Service.getMyPendingReviews()).rejects.toThrow('API error');
    });

    it('should handle different reviewer types in pending reviews', async () => {
      const mockReviews: Feedback360Request[] = [
        {
          id: 'req-1',
          tenantId: 'tenant-1',
          cycleId: 'cycle-1',
          subjectEmployeeId: 'emp-1',
          reviewerId: 'emp-1',
          reviewerType: 'SELF',
          status: 'PENDING',
          nominationApproved: true,
          reminderCount: 0,
          createdAt: '2024-01-01T00:00:00Z',
        },
      ];

      mockedApiClient.get.mockResolvedValueOnce({ data: mockReviews });

      const result = await feedback360Service.getMyPendingReviews();

      expect(result[0].reviewerType).toBe('SELF');
    });
  });

  // --- Response Submission Tests ---

  describe('submitResponse', () => {
    it('should submit feedback response successfully', async () => {
      const responseData: FeedbackResponse = {
        requestId: 'req-1',
        isDraft: false,
        overallRating: 4,
        communicationRating: 4,
        teamworkRating: 5,
        leadershipRating: 4,
        problemSolvingRating: 4,
        technicalSkillsRating: 5,
        strengths: 'Strong communication and technical skills',
        areasForImprovement: 'Time management',
        additionalComments: 'Good overall performer',
      };

      mockedApiClient.post.mockResolvedValueOnce({ data: {} });

      await feedback360Service.submitResponse(responseData);

      expect(mockedApiClient.post).toHaveBeenCalledWith('/feedback360/responses', responseData);
    });

    it('should submit draft response', async () => {
      const responseData: FeedbackResponse = {
        requestId: 'req-1',
        isDraft: true,
        overallRating: 3,
      };

      mockedApiClient.post.mockResolvedValueOnce({ data: {} });

      await feedback360Service.submitResponse(responseData);

      expect(mockedApiClient.post).toHaveBeenCalled();
    });

    it('should handle error when submitting response fails', async () => {
      const error = new Error('Submission failed');
      mockedApiClient.post.mockRejectedValueOnce(error);

      const responseData: FeedbackResponse = {
        requestId: 'req-1',
        isDraft: false,
      };

      await expect(feedback360Service.submitResponse(responseData)).rejects.toThrow(
        'Submission failed'
      );
    });
  });

  // --- Summary Tests ---

  describe('getMySummaries', () => {
    it('should fetch my feedback summaries successfully', async () => {
      const mockSummaries: Feedback360Summary[] = [
        {
          id: 'summary-1',
          cycleId: 'cycle-1',
          subjectEmployeeId: 'emp-1',
          totalReviewers: 5,
          responsesReceived: 5,
          selfReviewCompleted: true,
          managerReviewCompleted: true,
          peerReviewsCompleted: 3,
          finalRating: 4.2,
          avgCommunication: 4.2,
          avgTeamwork: 4.4,
          avgLeadership: 4.0,
          consolidatedStrengths: 'Strong technical and communication skills',
          consolidatedImprovements: 'Time management and delegation',
          sharedWithEmployee: true,
          createdAt: '2024-03-31T00:00:00Z',
        },
      ];

      mockedApiClient.get.mockResolvedValueOnce({ data: mockSummaries });

      const result = await feedback360Service.getMySummaries();

      expect(mockedApiClient.get).toHaveBeenCalledWith('/feedback360/my-summaries');
      expect(result).toEqual(mockSummaries);
      expect(result).toHaveLength(1);
    });

    it('should handle no summaries available', async () => {
      mockedApiClient.get.mockResolvedValueOnce({ data: [] });

      const result = await feedback360Service.getMySummaries();

      expect(result).toHaveLength(0);
    });

    it('should handle error when fetching summaries', async () => {
      const error = new Error('API error');
      mockedApiClient.get.mockRejectedValueOnce(error);

      await expect(feedback360Service.getMySummaries()).rejects.toThrow('API error');
    });
  });

  describe('generateSummary', () => {
    it('should generate summary successfully', async () => {
      const mockSummary: Feedback360Summary = {
        id: 'summary-1',
        cycleId: 'cycle-1',
        subjectEmployeeId: 'emp-1',
        totalReviewers: 5,
        responsesReceived: 5,
        selfReviewCompleted: true,
        managerReviewCompleted: true,
        peerReviewsCompleted: 3,
        finalRating: 4.2,
        avgCommunication: 4.2,
        avgTeamwork: 4.4,
        avgLeadership: 4.0,
        consolidatedStrengths: 'Strong technical and communication skills',
        consolidatedImprovements: 'Time management and delegation',
        sharedWithEmployee: false,
        createdAt: '2024-03-31T00:00:00Z',
      };

      mockedApiClient.post.mockResolvedValueOnce({ data: mockSummary });

      const result = await feedback360Service.generateSummary('cycle-1', 'emp-1');

      expect(mockedApiClient.post).toHaveBeenCalledWith(
        '/feedback360/cycles/cycle-1/summaries/emp-1/generate'
      );
      expect(result).toEqual(mockSummary);
      expect(result.finalRating).toBe(4.2);
    });

    it('should handle error when generating summary fails', async () => {
      const error = new Error('Summary generation failed');
      mockedApiClient.post.mockRejectedValueOnce(error);

      await expect(feedback360Service.generateSummary('cycle-1', 'emp-1')).rejects.toThrow(
        'Summary generation failed'
      );
    });

    it('should handle insufficient responses for summary', async () => {
      const error = new Error('Insufficient responses received');
      mockedApiClient.post.mockRejectedValueOnce(error);

      await expect(feedback360Service.generateSummary('cycle-1', 'emp-1')).rejects.toThrow(
        'Insufficient responses received'
      );
    });
  });

  describe('shareWithEmployee', () => {
    it('should share summary with employee successfully', async () => {
      mockedApiClient.post.mockResolvedValueOnce({ data: {} });

      await feedback360Service.shareWithEmployee('summary-1');

      expect(mockedApiClient.post).toHaveBeenCalledWith(
        '/feedback360/summaries/summary-1/share'
      );
    });

    it('should handle error when sharing with employee fails', async () => {
      const error = new Error('Sharing failed');
      mockedApiClient.post.mockRejectedValueOnce(error);

      await expect(feedback360Service.shareWithEmployee('summary-1')).rejects.toThrow(
        'Sharing failed'
      );
    });

    it('should handle permission denied when sharing', async () => {
      const error = new Error('Forbidden');
      mockedApiClient.post.mockRejectedValueOnce(error);

      await expect(feedback360Service.shareWithEmployee('summary-1')).rejects.toThrow(
        'Forbidden'
      );
    });
  });

  // --- Dashboard Tests ---

  describe('getDashboard', () => {
    it('should fetch dashboard data successfully', async () => {
      const mockDashboard = {
        activeCycles: 2,
        pendingReviews: 5,
        completedReviews: 12,
        upcomingDeadlines: [
          {
            cycleId: 'cycle-1',
            deadline: '2024-04-15',
            daysRemaining: 7,
          },
        ],
        recentSummaries: [
          {
            id: 'summary-1',
            employeeName: 'John Doe',
            finalRating: 4.2,
            sharedDate: '2024-03-31',
          },
        ],
      };

      mockedApiClient.get.mockResolvedValueOnce({ data: mockDashboard });

      const result = await feedback360Service.getDashboard();

      expect(mockedApiClient.get).toHaveBeenCalledWith('/feedback360/dashboard');
      expect(result).toEqual(mockDashboard);
      expect(result.activeCycles).toBe(2);
    });

    it('should handle empty dashboard data', async () => {
      const mockDashboard = {
        activeCycles: 0,
        pendingReviews: 0,
        completedReviews: 0,
        upcomingDeadlines: [],
        recentSummaries: [],
      };

      mockedApiClient.get.mockResolvedValueOnce({ data: mockDashboard });

      const result = await feedback360Service.getDashboard();

      expect(result.activeCycles).toBe(0);
      expect(result.pendingReviews).toBe(0);
    });

    it('should handle error when fetching dashboard data', async () => {
      const error = new Error('Dashboard unavailable');
      mockedApiClient.get.mockRejectedValueOnce(error);

      await expect(feedback360Service.getDashboard()).rejects.toThrow('Dashboard unavailable');
    });

    it('should handle different dashboard response structures', async () => {
      const mockDashboard = {
        stats: {
          total: 100,
          completed: 85,
        },
      };

      mockedApiClient.get.mockResolvedValueOnce({ data: mockDashboard });

      const result = await feedback360Service.getDashboard();

      expect(result).toEqual(mockDashboard);
    });
  });

  // --- Integration Tests ---

  describe('Full feedback workflow', () => {
    it('should handle complete feedback cycle workflow', async () => {
      // Create cycle
      const cycleData: CycleRequest = {
        name: 'Q1 2024 Review',
        startDate: '2024-01-01',
        endDate: '2024-03-31',
      };

      const mockCycle: Feedback360Cycle = {
        id: 'cycle-1',
        tenantId: 'tenant-1',
        name: 'Q1 2024 Review',
        status: 'DRAFT',
        startDate: '2024-01-01',
        endDate: '2024-03-31',
        minPeersRequired: 0,
        maxPeersAllowed: 0,
        isAnonymous: false,
        includeSelfReview: false,
        includeManagerReview: false,
        includePeerReview: false,
        includeUpwardReview: false,
        createdAt: '2024-01-01T00:00:00Z',
      };

      mockedApiClient.post.mockResolvedValueOnce({ data: mockCycle });
      const createdCycle = await feedback360Service.createCycle(cycleData);
      expect(createdCycle.id).toBe('cycle-1');

      // Activate cycle
      mockedApiClient.post.mockResolvedValueOnce({ data: {} });
      await feedback360Service.activateCycle('cycle-1');

      // Get pending reviews
      const mockReviews: Feedback360Request[] = [
        {
          id: 'req-1',
          tenantId: 'tenant-1',
          cycleId: 'cycle-1',
          subjectEmployeeId: 'emp-1',
          reviewerId: 'emp-2',
          reviewerType: 'PEER',
          status: 'PENDING',
          nominationApproved: true,
          reminderCount: 0,
          createdAt: '2024-01-01T00:00:00Z',
        },
      ];

      mockedApiClient.get.mockResolvedValueOnce({ data: mockReviews });
      const reviews = await feedback360Service.getMyPendingReviews();
      expect(reviews).toHaveLength(1);

      // Submit response
      const responseData: FeedbackResponse = {
        requestId: 'req-1',
        isDraft: false,
        overallRating: 4,
      };

      mockedApiClient.post.mockResolvedValueOnce({ data: {} });
      await feedback360Service.submitResponse(responseData);

      // Generate summary
      const mockSummary: Feedback360Summary = {
        id: 'summary-1',
        cycleId: 'cycle-1',
        subjectEmployeeId: 'emp-1',
        totalReviewers: 1,
        responsesReceived: 1,
        selfReviewCompleted: false,
        managerReviewCompleted: false,
        peerReviewsCompleted: 1,
        finalRating: 4.0,
        sharedWithEmployee: false,
        createdAt: '2024-03-31T00:00:00Z',
      };

      mockedApiClient.post.mockResolvedValueOnce({ data: mockSummary });
      const summary = await feedback360Service.generateSummary('cycle-1', 'emp-1');
      expect(summary.finalRating).toBe(4.0);

      // Share with employee
      mockedApiClient.post.mockResolvedValueOnce({ data: {} });
      await feedback360Service.shareWithEmployee('summary-1');

      // Close cycle
      mockedApiClient.post.mockResolvedValueOnce({ data: {} });
      await feedback360Service.closeCycle('cycle-1');

      expect(mockedApiClient.post).toHaveBeenCalledTimes(6);
    });
  });
});
