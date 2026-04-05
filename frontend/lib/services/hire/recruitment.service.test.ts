import {beforeEach, describe, expect, it, vi} from 'vitest';
import {recruitmentService} from './recruitment.service';
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

describe('RecruitmentService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── Job Opening Tests ───────────────────────────────────────────────────
  describe('Job Opening Methods', () => {
    const mockJobOpening = {
      id: 'job-1',
      title: 'Software Engineer',
      department: 'Engineering',
      status: 'OPEN',
    };

    const mockJobRequest = {
      title: 'Software Engineer',
      department: 'Engineering',
      description: 'We are hiring',
    };

    it('should create a job opening successfully', async () => {
      mockApiClient.post.mockResolvedValueOnce({data: mockJobOpening});
      const result = await recruitmentService.createJobOpening(mockJobRequest);
      expect(result).toEqual(mockJobOpening);
      expect(mockApiClient.post).toHaveBeenCalledWith('/recruitment/job-openings', mockJobRequest);
    });

    it('should handle error when creating job opening fails', async () => {
      mockApiClient.post.mockRejectedValueOnce(new Error('Create failed'));
      await expect(recruitmentService.createJobOpening(mockJobRequest)).rejects.toThrow('Create failed');
    });

    it('should update a job opening successfully', async () => {
      mockApiClient.put.mockResolvedValueOnce({data: mockJobOpening});
      const result = await recruitmentService.updateJobOpening('job-1', mockJobRequest);
      expect(result).toEqual(mockJobOpening);
      expect(mockApiClient.put).toHaveBeenCalledWith('/recruitment/job-openings/job-1', mockJobRequest);
    });

    it('should handle error when updating job opening fails', async () => {
      mockApiClient.put.mockRejectedValueOnce(new Error('Update failed'));
      await expect(recruitmentService.updateJobOpening('job-1', mockJobRequest)).rejects.toThrow('Update failed');
    });

    it('should get job opening by ID successfully', async () => {
      mockApiClient.get.mockResolvedValueOnce({data: mockJobOpening});
      const result = await recruitmentService.getJobOpening('job-1');
      expect(result).toEqual(mockJobOpening);
      expect(mockApiClient.get).toHaveBeenCalledWith('/recruitment/job-openings/job-1');
    });

    it('should handle error when getting job opening fails', async () => {
      mockApiClient.get.mockRejectedValueOnce(new Error('Not found'));
      await expect(recruitmentService.getJobOpening('job-1')).rejects.toThrow('Not found');
    });

    it('should get all job openings with pagination', async () => {
      const paginatedResponse = {
        content: [mockJobOpening],
        totalElements: 1,
        totalPages: 1,
        size: 20,
        number: 0,
      };
      mockApiClient.get.mockResolvedValueOnce({data: paginatedResponse});
      const result = await recruitmentService.getAllJobOpenings(0, 20);
      expect(result).toEqual(paginatedResponse);
      expect(mockApiClient.get).toHaveBeenCalledWith('/recruitment/job-openings', {params: {page: 0, size: 20}});
    });

    it('should handle error when getting all job openings fails', async () => {
      mockApiClient.get.mockRejectedValueOnce(new Error('Fetch failed'));
      await expect(recruitmentService.getAllJobOpenings()).rejects.toThrow('Fetch failed');
    });

    it('should get job openings by status successfully', async () => {
      const paginatedData = {content: [mockJobOpening], totalElements: 1, totalPages: 1, size: 1000, number: 0};
      mockApiClient.get.mockResolvedValueOnce({data: paginatedData});
      const result = await recruitmentService.getJobOpeningsByStatus('OPEN');
      expect(result).toEqual([mockJobOpening]);
      expect(mockApiClient.get).toHaveBeenCalledWith('/recruitment/job-openings/status/OPEN', {params: {size: 1000}});
    });

    it('should handle error when getting job openings by status fails', async () => {
      mockApiClient.get.mockRejectedValueOnce(new Error('Not found'));
      await expect(recruitmentService.getJobOpeningsByStatus('OPEN')).rejects.toThrow('Not found');
    });

    it('should delete job opening successfully', async () => {
      mockApiClient.delete.mockResolvedValueOnce({});
      await recruitmentService.deleteJobOpening('job-1');
      expect(mockApiClient.delete).toHaveBeenCalledWith('/recruitment/job-openings/job-1');
    });

    it('should handle error when deleting job opening fails', async () => {
      mockApiClient.delete.mockRejectedValueOnce(new Error('Delete failed'));
      await expect(recruitmentService.deleteJobOpening('job-1')).rejects.toThrow('Delete failed');
    });
  });

  // ─── Candidate Tests ─────────────────────────────────────────────────────
  describe('Candidate Methods', () => {
    const mockCandidate = {
      id: 'cand-1',
      name: 'John Doe',
      email: 'john@example.com',
      stage: 'INITIAL_SCREENING',
    };

    const mockCandidateRequest = {
      name: 'John Doe',
      email: 'john@example.com',
      jobOpeningId: 'job-1',
    };

    it('should create a candidate successfully', async () => {
      mockApiClient.post.mockResolvedValueOnce({data: mockCandidate});
      const result = await recruitmentService.createCandidate(mockCandidateRequest);
      expect(result).toEqual(mockCandidate);
      expect(mockApiClient.post).toHaveBeenCalledWith('/recruitment/candidates', mockCandidateRequest);
    });

    it('should handle error when creating candidate fails', async () => {
      mockApiClient.post.mockRejectedValueOnce(new Error('Create failed'));
      await expect(recruitmentService.createCandidate(mockCandidateRequest)).rejects.toThrow('Create failed');
    });

    it('should update a candidate successfully', async () => {
      mockApiClient.put.mockResolvedValueOnce({data: mockCandidate});
      const result = await recruitmentService.updateCandidate('cand-1', mockCandidateRequest);
      expect(result).toEqual(mockCandidate);
      expect(mockApiClient.put).toHaveBeenCalledWith('/recruitment/candidates/cand-1', mockCandidateRequest);
    });

    it('should handle error when updating candidate fails', async () => {
      mockApiClient.put.mockRejectedValueOnce(new Error('Update failed'));
      await expect(recruitmentService.updateCandidate('cand-1', mockCandidateRequest)).rejects.toThrow('Update failed');
    });

    it('should get candidate by ID successfully', async () => {
      mockApiClient.get.mockResolvedValueOnce({data: mockCandidate});
      const result = await recruitmentService.getCandidate('cand-1');
      expect(result).toEqual(mockCandidate);
      expect(mockApiClient.get).toHaveBeenCalledWith('/recruitment/candidates/cand-1');
    });

    it('should handle error when getting candidate fails', async () => {
      mockApiClient.get.mockRejectedValueOnce(new Error('Not found'));
      await expect(recruitmentService.getCandidate('cand-1')).rejects.toThrow('Not found');
    });

    it('should get all candidates with pagination', async () => {
      const paginatedResponse = {
        content: [mockCandidate],
        totalElements: 1,
        totalPages: 1,
        size: 20,
        number: 0,
      };
      mockApiClient.get.mockResolvedValueOnce({data: paginatedResponse});
      const result = await recruitmentService.getAllCandidates(0, 20);
      expect(result).toEqual(paginatedResponse);
      expect(mockApiClient.get).toHaveBeenCalledWith('/recruitment/candidates', {params: {page: 0, size: 20}});
    });

    it('should handle error when getting all candidates fails', async () => {
      mockApiClient.get.mockRejectedValueOnce(new Error('Fetch failed'));
      await expect(recruitmentService.getAllCandidates()).rejects.toThrow('Fetch failed');
    });

    it('should get candidates by job opening successfully', async () => {
      const paginatedData = {content: [mockCandidate], totalElements: 1, totalPages: 1, size: 1000, number: 0};
      mockApiClient.get.mockResolvedValueOnce({data: paginatedData});
      const result = await recruitmentService.getCandidatesByJobOpening('job-1');
      expect(result).toEqual([mockCandidate]);
      expect(mockApiClient.get).toHaveBeenCalledWith('/recruitment/candidates/job-opening/job-1', {params: {size: 1000}});
    });

    it('should handle error when getting candidates by job opening fails', async () => {
      mockApiClient.get.mockRejectedValueOnce(new Error('Not found'));
      await expect(recruitmentService.getCandidatesByJobOpening('job-1')).rejects.toThrow('Not found');
    });

    it('should delete candidate successfully', async () => {
      mockApiClient.delete.mockResolvedValueOnce({});
      await recruitmentService.deleteCandidate('cand-1');
      expect(mockApiClient.delete).toHaveBeenCalledWith('/recruitment/candidates/cand-1');
    });

    it('should handle error when deleting candidate fails', async () => {
      mockApiClient.delete.mockRejectedValueOnce(new Error('Delete failed'));
      await expect(recruitmentService.deleteCandidate('cand-1')).rejects.toThrow('Delete failed');
    });

    it('should get candidates by job successfully', async () => {
      const paginatedResponse = {
        content: [mockCandidate],
        totalElements: 1,
        totalPages: 1,
        size: 1000,
        number: 0,
      };
      mockApiClient.get.mockResolvedValueOnce({data: paginatedResponse});
      const result = await recruitmentService.getCandidatesByJob('job-1');
      expect(result).toEqual([mockCandidate]);
      expect(mockApiClient.get).toHaveBeenCalledWith('/recruitment/candidates/job-opening/job-1', {params: {size: 1000}});
    });

    it('should handle error when getting candidates by job fails', async () => {
      mockApiClient.get.mockRejectedValueOnce(new Error('Fetch failed'));
      await expect(recruitmentService.getCandidatesByJob('job-1')).rejects.toThrow('Fetch failed');
    });

    it('should move candidate stage successfully', async () => {
      mockApiClient.put.mockResolvedValueOnce({data: mockCandidate});
      const result = await recruitmentService.moveCandidateStage('cand-1', {stage: 'INTERVIEW'});
      expect(result).toEqual(mockCandidate);
      expect(mockApiClient.put).toHaveBeenCalledWith('/recruitment/candidates/cand-1/stage', {stage: 'INTERVIEW'});
    });

    it('should handle error when moving candidate stage fails', async () => {
      mockApiClient.put.mockRejectedValueOnce(new Error('Update failed'));
      await expect(recruitmentService.moveCandidateStage('cand-1', {stage: 'INTERVIEW'})).rejects.toThrow('Update failed');
    });

    it('should create offer successfully', async () => {
      mockApiClient.post.mockResolvedValueOnce({data: mockCandidate});
      const result = await recruitmentService.createOffer('cand-1', {salaryRange: 'HIGH'});
      expect(result).toEqual(mockCandidate);
      expect(mockApiClient.post).toHaveBeenCalledWith('/recruitment/candidates/cand-1/offer', {salaryRange: 'HIGH'});
    });

    it('should handle error when creating offer fails', async () => {
      mockApiClient.post.mockRejectedValueOnce(new Error('Create failed'));
      await expect(recruitmentService.createOffer('cand-1', {salaryRange: 'HIGH'})).rejects.toThrow('Create failed');
    });
  });

  // ─── Offer Response Tests ────────────────────────────────────────────────
  describe('Offer Response Methods', () => {
    const mockCandidate = {
      id: 'cand-1',
      name: 'John Doe',
      offerStatus: 'ACCEPTED',
    };

    it('should accept offer successfully', async () => {
      mockApiClient.post.mockResolvedValueOnce({data: mockCandidate});
      const result = await recruitmentService.acceptOffer('cand-1');
      expect(result).toEqual(mockCandidate);
      expect(mockApiClient.post).toHaveBeenCalledWith('/recruitment/candidates/cand-1/accept-offer', {});
    });

    it('should handle error when accepting offer fails', async () => {
      mockApiClient.post.mockRejectedValueOnce(new Error('Accept failed'));
      await expect(recruitmentService.acceptOffer('cand-1')).rejects.toThrow('Accept failed');
    });

    it('should accept offer with data successfully', async () => {
      mockApiClient.post.mockResolvedValueOnce({data: mockCandidate});
      const result = await recruitmentService.acceptOffer('cand-1', {startDate: '2024-02-01'});
      expect(result).toEqual(mockCandidate);
      expect(mockApiClient.post).toHaveBeenCalledWith('/recruitment/candidates/cand-1/accept-offer', {startDate: '2024-02-01'});
    });

    it('should decline offer successfully', async () => {
      mockApiClient.post.mockResolvedValueOnce({data: mockCandidate});
      const result = await recruitmentService.declineOffer('cand-1');
      expect(result).toEqual(mockCandidate);
      expect(mockApiClient.post).toHaveBeenCalledWith('/recruitment/candidates/cand-1/decline-offer', {});
    });

    it('should handle error when declining offer fails', async () => {
      mockApiClient.post.mockRejectedValueOnce(new Error('Decline failed'));
      await expect(recruitmentService.declineOffer('cand-1')).rejects.toThrow('Decline failed');
    });

    it('should decline offer with data successfully', async () => {
      mockApiClient.post.mockResolvedValueOnce({data: mockCandidate});
      const result = await recruitmentService.declineOffer('cand-1', {reason: 'Other opportunity'});
      expect(result).toEqual(mockCandidate);
      expect(mockApiClient.post).toHaveBeenCalledWith('/recruitment/candidates/cand-1/decline-offer', {reason: 'Other opportunity'});
    });
  });

  // ─── Interview Tests ─────────────────────────────────────────────────────
  describe('Interview Methods', () => {
    const mockInterview = {
      id: 'interview-1',
      candidateId: 'cand-1',
      interviewType: 'TECHNICAL',
      status: 'SCHEDULED',
    };

    const mockInterviewRequest = {
      candidateId: 'cand-1',
      interviewType: 'TECHNICAL',
      scheduledDate: '2024-02-01T10:00:00Z',
    };

    it('should get all interviews with pagination', async () => {
      const paginatedResponse = {
        content: [mockInterview],
        totalElements: 1,
        totalPages: 1,
        size: 100,
        number: 0,
      };
      mockApiClient.get.mockResolvedValueOnce({data: paginatedResponse});
      const result = await recruitmentService.getAllInterviews(0, 100);
      expect(result).toEqual(paginatedResponse);
      expect(mockApiClient.get).toHaveBeenCalledWith('/recruitment/interviews', {params: {page: 0, size: 100}});
    });

    it('should handle error when getting all interviews fails', async () => {
      mockApiClient.get.mockRejectedValueOnce(new Error('Fetch failed'));
      await expect(recruitmentService.getAllInterviews()).rejects.toThrow('Fetch failed');
    });

    it('should schedule interview successfully', async () => {
      mockApiClient.post.mockResolvedValueOnce({data: mockInterview});
      const result = await recruitmentService.scheduleInterview(mockInterviewRequest);
      expect(result).toEqual(mockInterview);
      expect(mockApiClient.post).toHaveBeenCalledWith('/recruitment/interviews', mockInterviewRequest);
    });

    it('should handle error when scheduling interview fails', async () => {
      mockApiClient.post.mockRejectedValueOnce(new Error('Schedule failed'));
      await expect(recruitmentService.scheduleInterview(mockInterviewRequest)).rejects.toThrow('Schedule failed');
    });

    it('should update interview successfully', async () => {
      mockApiClient.put.mockResolvedValueOnce({data: mockInterview});
      const result = await recruitmentService.updateInterview('interview-1', mockInterviewRequest);
      expect(result).toEqual(mockInterview);
      expect(mockApiClient.put).toHaveBeenCalledWith('/recruitment/interviews/interview-1', mockInterviewRequest);
    });

    it('should handle error when updating interview fails', async () => {
      mockApiClient.put.mockRejectedValueOnce(new Error('Update failed'));
      await expect(recruitmentService.updateInterview('interview-1', mockInterviewRequest)).rejects.toThrow('Update failed');
    });

    it('should get interview by ID successfully', async () => {
      mockApiClient.get.mockResolvedValueOnce({data: mockInterview});
      const result = await recruitmentService.getInterview('interview-1');
      expect(result).toEqual(mockInterview);
      expect(mockApiClient.get).toHaveBeenCalledWith('/recruitment/interviews/interview-1');
    });

    it('should handle error when getting interview fails', async () => {
      mockApiClient.get.mockRejectedValueOnce(new Error('Not found'));
      await expect(recruitmentService.getInterview('interview-1')).rejects.toThrow('Not found');
    });

    it('should get interviews by candidate successfully', async () => {
      const paginatedData = {content: [mockInterview], totalElements: 1, totalPages: 1, size: 1000, number: 0};
      mockApiClient.get.mockResolvedValueOnce({data: paginatedData});
      const result = await recruitmentService.getInterviewsByCandidate('cand-1');
      expect(result).toEqual([mockInterview]);
      expect(mockApiClient.get).toHaveBeenCalledWith('/recruitment/interviews/candidate/cand-1', {params: {size: 1000}});
    });

    it('should handle error when getting interviews by candidate fails', async () => {
      mockApiClient.get.mockRejectedValueOnce(new Error('Not found'));
      await expect(recruitmentService.getInterviewsByCandidate('cand-1')).rejects.toThrow('Not found');
    });

    it('should delete interview successfully', async () => {
      mockApiClient.delete.mockResolvedValueOnce({});
      await recruitmentService.deleteInterview('interview-1');
      expect(mockApiClient.delete).toHaveBeenCalledWith('/recruitment/interviews/interview-1');
    });

    it('should handle error when deleting interview fails', async () => {
      mockApiClient.delete.mockRejectedValueOnce(new Error('Delete failed'));
      await expect(recruitmentService.deleteInterview('interview-1')).rejects.toThrow('Delete failed');
    });
  });
});
