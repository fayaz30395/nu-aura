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

import { compensationService } from './compensation.service';
import { apiClient } from '@/lib/api/client';

// Type definitions
interface CompensationReviewCycle {
  id: string;
  name: string;
  status: string;
  startDate?: string;
  endDate?: string;
}

interface SalaryRevision {
  id: string;
  cycleId: string;
  employeeId: string;
  status: string;
  proposedSalary: number;
}

interface CompensationStatistics {
  totalEmployees: number;
  averageSalary: number;
  salaryIncreasePercentage: number;
}

interface CompensationCycleRequest {
  name: string;
  startDate?: string;
  endDate?: string;
}

interface SalaryRevisionRequest {
  cycleId: string;
  employeeId: string;
  proposedSalary: number;
}

interface PaginatedResponse<T> {
  content: T[];
  totalElements: number;
  page: number;
  size: number;
}

type CycleStatus = 'DRAFT' | 'ACTIVE' | 'CLOSED' | 'ARCHIVED';

const mockedApiClient = apiClient as {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
  put: ReturnType<typeof vi.fn>;
  patch: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
};

describe('compensationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // createCycle tests
  describe('createCycle', () => {
    it('should create a new compensation cycle', async () => {
      const request: CompensationCycleRequest = {
        name: '2024 Q1 Review',
        startDate: '2024-01-01',
        endDate: '2024-03-31',
      };
      const mockResponse: CompensationReviewCycle = {
        id: 'cycle-1',
        name: '2024 Q1 Review',
        status: 'DRAFT',
        startDate: '2024-01-01',
        endDate: '2024-03-31',
      };
      mockedApiClient.post.mockResolvedValue({ data: mockResponse });

      const result = await compensationService.createCycle(request);

      expect(mockedApiClient.post).toHaveBeenCalledWith('/compensation/cycles', request);
      expect(result.id).toBe('cycle-1');
      expect(result.name).toBe('2024 Q1 Review');
    });

    it('should create cycle with minimal data', async () => {
      const request: CompensationCycleRequest = { name: 'Annual Review 2024' };
      const mockResponse: CompensationReviewCycle = {
        id: 'cycle-2',
        name: 'Annual Review 2024',
        status: 'DRAFT',
      };
      mockedApiClient.post.mockResolvedValue({ data: mockResponse });

      const result = await compensationService.createCycle(request);

      expect(result.name).toBe('Annual Review 2024');
      expect(result.status).toBe('DRAFT');
    });
  });

  // getCycleById tests
  describe('getCycleById', () => {
    it('should fetch cycle by ID', async () => {
      const mockCycle: CompensationReviewCycle = {
        id: 'cycle-1',
        name: '2024 Q1 Review',
        status: 'ACTIVE',
        startDate: '2024-01-01',
        endDate: '2024-03-31',
      };
      mockedApiClient.get.mockResolvedValue({ data: mockCycle });

      const result = await compensationService.getCycleById('cycle-1');

      expect(mockedApiClient.get).toHaveBeenCalledWith('/compensation/cycles/cycle-1');
      expect(result.id).toBe('cycle-1');
      expect(result.status).toBe('ACTIVE');
    });

    it('should return cycle with all properties', async () => {
      const mockCycle: CompensationReviewCycle = {
        id: 'cycle-2',
        name: 'Mid-year Review',
        status: 'DRAFT',
        startDate: '2024-06-01',
        endDate: '2024-06-30',
      };
      mockedApiClient.get.mockResolvedValue({ data: mockCycle });

      const result = await compensationService.getCycleById('cycle-2');

      expect(result.startDate).toBe('2024-06-01');
      expect(result.endDate).toBe('2024-06-30');
    });
  });

  // getAllCycles tests
  describe('getAllCycles', () => {
    it('should fetch all cycles with default pagination', async () => {
      const mockData: PaginatedResponse<CompensationReviewCycle> = {
        content: [
          { id: 'cycle-1', name: 'Q1 Review', status: 'CLOSED' },
          { id: 'cycle-2', name: 'Q2 Review', status: 'ACTIVE' },
        ],
        totalElements: 2,
        page: 0,
        size: 10,
      };
      mockedApiClient.get.mockResolvedValue({ data: mockData });

      const result = await compensationService.getAllCycles();

      expect(mockedApiClient.get).toHaveBeenCalledWith('/compensation/cycles?page=0&size=10');
      expect(result.content).toHaveLength(2);
      expect(result.totalElements).toBe(2);
    });

    it('should fetch cycles with custom pagination', async () => {
      const mockData: PaginatedResponse<CompensationReviewCycle> = {
        content: [],
        totalElements: 0,
        page: 1,
        size: 20,
      };
      mockedApiClient.get.mockResolvedValue({ data: mockData });

      const result = await compensationService.getAllCycles(1, 20);

      expect(mockedApiClient.get).toHaveBeenCalledWith('/compensation/cycles?page=1&size=20');
      expect(result.page).toBe(1);
    });
  });

  // getActiveCycles tests
  describe('getActiveCycles', () => {
    it('should fetch all active cycles', async () => {
      const mockCycles: CompensationReviewCycle[] = [
        { id: 'cycle-1', name: 'Q1 Review', status: 'ACTIVE' },
        { id: 'cycle-2', name: 'Q2 Review', status: 'ACTIVE' },
      ];
      mockedApiClient.get.mockResolvedValue({ data: mockCycles });

      const result = await compensationService.getActiveCycles();

      expect(mockedApiClient.get).toHaveBeenCalledWith('/compensation/cycles/active');
      expect(result).toHaveLength(2);
      expect(result.every((c) => c.status === 'ACTIVE')).toBe(true);
    });

    it('should return empty list when no active cycles', async () => {
      mockedApiClient.get.mockResolvedValue({ data: [] });

      const result = await compensationService.getActiveCycles();

      expect(result).toEqual([]);
    });
  });

  // updateCycleStatus tests
  describe('updateCycleStatus', () => {
    it('should update cycle status to ACTIVE', async () => {
      const mockResponse: CompensationReviewCycle = {
        id: 'cycle-1',
        name: 'Q1 Review',
        status: 'ACTIVE',
      };
      mockedApiClient.post.mockResolvedValue({ data: mockResponse });

      const result = await compensationService.updateCycleStatus('cycle-1', 'ACTIVE');

      expect(mockedApiClient.post).toHaveBeenCalledWith(
        '/compensation/cycles/cycle-1/status?status=ACTIVE'
      );
      expect(result.status).toBe('ACTIVE');
    });

    it('should update cycle status to CLOSED', async () => {
      const mockResponse: CompensationReviewCycle = {
        id: 'cycle-2',
        name: 'Q2 Review',
        status: 'CLOSED',
      };
      mockedApiClient.post.mockResolvedValue({ data: mockResponse });

      const result = await compensationService.updateCycleStatus('cycle-2', 'CLOSED');

      expect(result.status).toBe('CLOSED');
    });
  });

  // getCycleStatistics tests
  describe('getCycleStatistics', () => {
    it('should fetch cycle statistics', async () => {
      const mockStats: CompensationStatistics = {
        totalEmployees: 150,
        averageSalary: 75000,
        salaryIncreasePercentage: 5.5,
      };
      mockedApiClient.get.mockResolvedValue({ data: mockStats });

      const result = await compensationService.getCycleStatistics('cycle-1');

      expect(mockedApiClient.get).toHaveBeenCalledWith(
        '/compensation/cycles/cycle-1/statistics'
      );
      expect(result.totalEmployees).toBe(150);
      expect(result.salaryIncreasePercentage).toBe(5.5);
    });

    it('should return statistics with accurate data', async () => {
      const mockStats: CompensationStatistics = {
        totalEmployees: 200,
        averageSalary: 85000,
        salaryIncreasePercentage: 4.2,
      };
      mockedApiClient.get.mockResolvedValue({ data: mockStats });

      const result = await compensationService.getCycleStatistics('cycle-2');

      expect(result.averageSalary).toBe(85000);
    });
  });

  // createRevision tests
  describe('createRevision', () => {
    it('should create a new salary revision', async () => {
      const request: SalaryRevisionRequest = {
        cycleId: 'cycle-1',
        employeeId: 'emp-1',
        proposedSalary: 80000,
      };
      const mockResponse: SalaryRevision = {
        id: 'rev-1',
        cycleId: 'cycle-1',
        employeeId: 'emp-1',
        status: 'DRAFT',
        proposedSalary: 80000,
      };
      mockedApiClient.post.mockResolvedValue({ data: mockResponse });

      const result = await compensationService.createRevision(request);

      expect(mockedApiClient.post).toHaveBeenCalledWith('/compensation/revisions', request);
      expect(result.id).toBe('rev-1');
      expect(result.proposedSalary).toBe(80000);
    });

    it('should create revision with required data', async () => {
      const request: SalaryRevisionRequest = {
        cycleId: 'cycle-2',
        employeeId: 'emp-2',
        proposedSalary: 95000,
      };
      const mockResponse: SalaryRevision = {
        id: 'rev-2',
        cycleId: 'cycle-2',
        employeeId: 'emp-2',
        status: 'DRAFT',
        proposedSalary: 95000,
      };
      mockedApiClient.post.mockResolvedValue({ data: mockResponse });

      const result = await compensationService.createRevision(request);

      expect(result.status).toBe('DRAFT');
    });
  });

  // getRevisionById tests
  describe('getRevisionById', () => {
    it('should fetch revision by ID', async () => {
      const mockRevision: SalaryRevision = {
        id: 'rev-1',
        cycleId: 'cycle-1',
        employeeId: 'emp-1',
        status: 'PENDING_APPROVAL',
        proposedSalary: 80000,
      };
      mockedApiClient.get.mockResolvedValue({ data: mockRevision });

      const result = await compensationService.getRevisionById('rev-1');

      expect(mockedApiClient.get).toHaveBeenCalledWith('/compensation/revisions/rev-1');
      expect(result.id).toBe('rev-1');
      expect(result.status).toBe('PENDING_APPROVAL');
    });

    it('should return revision with all properties', async () => {
      const mockRevision: SalaryRevision = {
        id: 'rev-2',
        cycleId: 'cycle-1',
        employeeId: 'emp-2',
        status: 'APPROVED',
        proposedSalary: 95000,
      };
      mockedApiClient.get.mockResolvedValue({ data: mockRevision });

      const result = await compensationService.getRevisionById('rev-2');

      expect(result.proposedSalary).toBe(95000);
      expect(result.status).toBe('APPROVED');
    });
  });

  // getAllRevisions tests
  describe('getAllRevisions', () => {
    it('should fetch all revisions with default pagination', async () => {
      const mockData: PaginatedResponse<SalaryRevision> = {
        content: [
          { id: 'rev-1', cycleId: 'cycle-1', employeeId: 'emp-1', status: 'DRAFT', proposedSalary: 80000 },
          { id: 'rev-2', cycleId: 'cycle-1', employeeId: 'emp-2', status: 'DRAFT', proposedSalary: 85000 },
        ],
        totalElements: 2,
        page: 0,
        size: 10,
      };
      mockedApiClient.get.mockResolvedValue({ data: mockData });

      const result = await compensationService.getAllRevisions();

      expect(mockedApiClient.get).toHaveBeenCalledWith('/compensation/revisions?page=0&size=10');
      expect(result.content).toHaveLength(2);
    });

    it('should fetch revisions with custom pagination', async () => {
      const mockData: PaginatedResponse<SalaryRevision> = {
        content: [],
        totalElements: 0,
        page: 2,
        size: 25,
      };
      mockedApiClient.get.mockResolvedValue({ data: mockData });

      const result = await compensationService.getAllRevisions(2, 25);

      expect(mockedApiClient.get).toHaveBeenCalledWith('/compensation/revisions?page=2&size=25');
    });
  });

  // getRevisionsByCycle tests
  describe('getRevisionsByCycle', () => {
    it('should fetch revisions for a cycle with default pagination', async () => {
      const mockData: PaginatedResponse<SalaryRevision> = {
        content: [
          { id: 'rev-1', cycleId: 'cycle-1', employeeId: 'emp-1', status: 'DRAFT', proposedSalary: 80000 },
        ],
        totalElements: 1,
        page: 0,
        size: 10,
      };
      mockedApiClient.get.mockResolvedValue({ data: mockData });

      const result = await compensationService.getRevisionsByCycle('cycle-1');

      expect(mockedApiClient.get).toHaveBeenCalledWith(
        '/compensation/cycles/cycle-1/revisions?page=0&size=10'
      );
      expect(result.content).toHaveLength(1);
    });

    it('should fetch revisions for cycle with custom pagination', async () => {
      const mockData: PaginatedResponse<SalaryRevision> = {
        content: [],
        totalElements: 0,
        page: 1,
        size: 20,
      };
      mockedApiClient.get.mockResolvedValue({ data: mockData });

      const result = await compensationService.getRevisionsByCycle('cycle-1', 1, 20);

      expect(mockedApiClient.get).toHaveBeenCalledWith(
        '/compensation/cycles/cycle-1/revisions?page=1&size=20'
      );
    });
  });

  // getEmployeeRevisionHistory tests
  describe('getEmployeeRevisionHistory', () => {
    it('should fetch revision history for employee', async () => {
      const mockRevisions: SalaryRevision[] = [
        { id: 'rev-1', cycleId: 'cycle-1', employeeId: 'emp-1', status: 'APPROVED', proposedSalary: 75000 },
        { id: 'rev-2', cycleId: 'cycle-2', employeeId: 'emp-1', status: 'APPROVED', proposedSalary: 80000 },
      ];
      mockedApiClient.get.mockResolvedValue({ data: mockRevisions });

      const result = await compensationService.getEmployeeRevisionHistory('emp-1');

      expect(mockedApiClient.get).toHaveBeenCalledWith(
        '/compensation/employees/emp-1/revisions'
      );
      expect(result).toHaveLength(2);
      expect(result.every((r) => r.employeeId === 'emp-1')).toBe(true);
    });

    it('should return empty list for employee with no revisions', async () => {
      mockedApiClient.get.mockResolvedValue({ data: [] });

      const result = await compensationService.getEmployeeRevisionHistory('emp-new');

      expect(result).toEqual([]);
    });
  });

  // getPendingApprovals tests
  describe('getPendingApprovals', () => {
    it('should fetch pending approvals with default pagination', async () => {
      const mockData: PaginatedResponse<SalaryRevision> = {
        content: [
          { id: 'rev-1', cycleId: 'cycle-1', employeeId: 'emp-1', status: 'PENDING_APPROVAL', proposedSalary: 80000 },
          { id: 'rev-2', cycleId: 'cycle-1', employeeId: 'emp-2', status: 'PENDING_APPROVAL', proposedSalary: 85000 },
        ],
        totalElements: 2,
        page: 0,
        size: 10,
      };
      mockedApiClient.get.mockResolvedValue({ data: mockData });

      const result = await compensationService.getPendingApprovals();

      expect(mockedApiClient.get).toHaveBeenCalledWith(
        '/compensation/revisions/pending?page=0&size=10'
      );
      expect(result.content.every((r) => r.status === 'PENDING_APPROVAL')).toBe(true);
    });

    it('should fetch pending approvals with custom pagination', async () => {
      const mockData: PaginatedResponse<SalaryRevision> = {
        content: [],
        totalElements: 0,
        page: 1,
        size: 15,
      };
      mockedApiClient.get.mockResolvedValue({ data: mockData });

      const result = await compensationService.getPendingApprovals(1, 15);

      expect(mockedApiClient.get).toHaveBeenCalledWith(
        '/compensation/revisions/pending?page=1&size=15'
      );
    });
  });

  // submitRevision tests
  describe('submitRevision', () => {
    it('should submit a revision', async () => {
      const mockResponse: SalaryRevision = {
        id: 'rev-1',
        cycleId: 'cycle-1',
        employeeId: 'emp-1',
        status: 'SUBMITTED',
        proposedSalary: 80000,
      };
      mockedApiClient.post.mockResolvedValue({ data: mockResponse });

      const result = await compensationService.submitRevision('rev-1');

      expect(mockedApiClient.post).toHaveBeenCalledWith('/compensation/revisions/rev-1/submit');
      expect(result.status).toBe('SUBMITTED');
    });

    it('should transition revision from DRAFT to SUBMITTED', async () => {
      const mockResponse: SalaryRevision = {
        id: 'rev-2',
        cycleId: 'cycle-1',
        employeeId: 'emp-2',
        status: 'SUBMITTED',
        proposedSalary: 85000,
      };
      mockedApiClient.post.mockResolvedValue({ data: mockResponse });

      const result = await compensationService.submitRevision('rev-2');

      expect(result.id).toBe('rev-2');
      expect(result.status).toBe('SUBMITTED');
    });
  });

  // reviewRevision tests
  describe('reviewRevision', () => {
    it('should review revision without comments', async () => {
      const mockResponse: SalaryRevision = {
        id: 'rev-1',
        cycleId: 'cycle-1',
        employeeId: 'emp-1',
        status: 'UNDER_REVIEW',
        proposedSalary: 80000,
      };
      mockedApiClient.post.mockResolvedValue({ data: mockResponse });

      const result = await compensationService.reviewRevision('rev-1');

      expect(mockedApiClient.post).toHaveBeenCalledWith('/compensation/revisions/rev-1/review');
      expect(result.status).toBe('UNDER_REVIEW');
    });

    it('should review revision with comments', async () => {
      const mockResponse: SalaryRevision = {
        id: 'rev-2',
        cycleId: 'cycle-1',
        employeeId: 'emp-2',
        status: 'UNDER_REVIEW',
        proposedSalary: 85000,
      };
      mockedApiClient.post.mockResolvedValue({ data: mockResponse });

      const result = await compensationService.reviewRevision('rev-2', 'Needs adjustment');

      expect(mockedApiClient.post).toHaveBeenCalledWith(
        '/compensation/revisions/rev-2/review?comments=' + encodeURIComponent('Needs adjustment')
      );
      expect(result.status).toBe('UNDER_REVIEW');
    });
  });

  // approveRevision tests
  describe('approveRevision', () => {
    it('should approve revision without comments', async () => {
      const mockResponse: SalaryRevision = {
        id: 'rev-1',
        cycleId: 'cycle-1',
        employeeId: 'emp-1',
        status: 'APPROVED',
        proposedSalary: 80000,
      };
      mockedApiClient.post.mockResolvedValue({ data: mockResponse });

      const result = await compensationService.approveRevision('rev-1');

      expect(mockedApiClient.post).toHaveBeenCalledWith('/compensation/revisions/rev-1/approve');
      expect(result.status).toBe('APPROVED');
    });

    it('should approve revision with approval comments', async () => {
      const mockResponse: SalaryRevision = {
        id: 'rev-2',
        cycleId: 'cycle-1',
        employeeId: 'emp-2',
        status: 'APPROVED',
        proposedSalary: 85000,
      };
      mockedApiClient.post.mockResolvedValue({ data: mockResponse });

      const result = await compensationService.approveRevision('rev-2', 'Approved as discussed');

      expect(mockedApiClient.post).toHaveBeenCalledWith(
        '/compensation/revisions/rev-2/approve?comments=' + encodeURIComponent('Approved as discussed')
      );
      expect(result.status).toBe('APPROVED');
    });
  });

  // rejectRevision tests
  describe('rejectRevision', () => {
    it('should reject revision with reason', async () => {
      const mockResponse: SalaryRevision = {
        id: 'rev-1',
        cycleId: 'cycle-1',
        employeeId: 'emp-1',
        status: 'REJECTED',
        proposedSalary: 80000,
      };
      mockedApiClient.post.mockResolvedValue({ data: mockResponse });

      const result = await compensationService.rejectRevision('rev-1', 'Budget exceeded');

      expect(mockedApiClient.post).toHaveBeenCalledWith(
        '/compensation/revisions/rev-1/reject?reason=' + encodeURIComponent('Budget exceeded')
      );
      expect(result.status).toBe('REJECTED');
    });

    it('should reject with detailed reason', async () => {
      const mockResponse: SalaryRevision = {
        id: 'rev-2',
        cycleId: 'cycle-1',
        employeeId: 'emp-2',
        status: 'REJECTED',
        proposedSalary: 85000,
      };
      mockedApiClient.post.mockResolvedValue({ data: mockResponse });

      const result = await compensationService.rejectRevision('rev-2', 'Needs review by CFO');

      expect(result.status).toBe('REJECTED');
    });
  });

  // applyRevision tests
  describe('applyRevision', () => {
    it('should apply approved revision', async () => {
      const mockResponse: SalaryRevision = {
        id: 'rev-1',
        cycleId: 'cycle-1',
        employeeId: 'emp-1',
        status: 'APPLIED',
        proposedSalary: 80000,
      };
      mockedApiClient.post.mockResolvedValue({ data: mockResponse });

      const result = await compensationService.applyRevision('rev-1');

      expect(mockedApiClient.post).toHaveBeenCalledWith('/compensation/revisions/rev-1/apply');
      expect(result.status).toBe('APPLIED');
    });

    it('should finalize revision application', async () => {
      const mockResponse: SalaryRevision = {
        id: 'rev-2',
        cycleId: 'cycle-1',
        employeeId: 'emp-2',
        status: 'APPLIED',
        proposedSalary: 85000,
      };
      mockedApiClient.post.mockResolvedValue({ data: mockResponse });

      const result = await compensationService.applyRevision('rev-2');

      expect(result.status).toBe('APPLIED');
    });
  });
});
