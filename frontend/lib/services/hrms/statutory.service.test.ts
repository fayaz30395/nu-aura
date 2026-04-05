/**
 * Unit Tests for Statutory Service
 * Run with: npx vitest run lib/services/statutory.service.test.ts
 */

import {beforeEach, describe, expect, it, vi} from 'vitest';
import {statutoryService} from './statutory.service';
import {apiClient} from '@/lib/api/client';
import {
  EmployeeESIRecord,
  EmployeePFRecord,
  ESIConfig,
  MonthlyStatutoryContribution,
  PFStatus,
  ProfessionalTaxSlab,
  ProvidentFundConfig,
} from '@/lib/types/hrms/statutory';

vi.mock('@/lib/api/client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

const mockedApiClient = apiClient as {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
  put: ReturnType<typeof vi.fn>;
  patch: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
};

describe('StatutoryService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --- Provident Fund (PF) Tests ---

  describe('createPFConfig', () => {
    it('should create PF config successfully', async () => {
      const mockConfig: ProvidentFundConfig = {
        id: 'pf-1',
        tenantId: 'tenant-1',
        effectiveFrom: '2024-01-01',
        employeeContributionPercentage: 12,
        employerContributionPercentage: 3.67,
        isActive: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      mockedApiClient.post.mockResolvedValueOnce({data: mockConfig});

      const result = await statutoryService.createPFConfig({
        effectiveFrom: '2024-01-01',
        employeeContributionPercentage: 12,
        employerContributionPercentage: 3.67,
      });

      expect(mockedApiClient.post).toHaveBeenCalledWith('/statutory/pf/config', {
        effectiveFrom: '2024-01-01',
        employeeContributionPercentage: 12,
        employerContributionPercentage: 3.67,
      });
      expect(result).toEqual(mockConfig);
      expect(result.employeeContributionPercentage).toBe(12);
    });

    it('should handle error when creating PF config fails', async () => {
      const error = new Error('API error');
      mockedApiClient.post.mockRejectedValueOnce(error);

      await expect(
        statutoryService.createPFConfig({
          effectiveFrom: '2024-01-01',
          employeeContributionPercentage: 12,
          employerContributionPercentage: 3.67,
        })
      ).rejects.toThrow('API error');
      expect(mockedApiClient.post).toHaveBeenCalled();
    });
  });

  describe('getActivePFConfigs', () => {
    it('should fetch active PF configs successfully', async () => {
      const mockConfigs: ProvidentFundConfig[] = [
        {
          id: 'pf-1',
          tenantId: 'tenant-1',
          effectiveFrom: '2024-01-01',
          employeeContributionPercentage: 12,
          employerContributionPercentage: 3.67,
          isActive: true,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      ];

      mockedApiClient.get.mockResolvedValueOnce({data: mockConfigs});

      const result = await statutoryService.getActivePFConfigs();

      expect(mockedApiClient.get).toHaveBeenCalledWith('/statutory/pf/config');
      expect(result).toEqual(mockConfigs);
      expect(result).toHaveLength(1);
    });

    it('should handle empty PF configs', async () => {
      mockedApiClient.get.mockResolvedValueOnce({data: []});

      const result = await statutoryService.getActivePFConfigs();

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });

    it('should handle error when fetching PF configs fails', async () => {
      const error = new Error('Network error');
      mockedApiClient.get.mockRejectedValueOnce(error);

      await expect(statutoryService.getActivePFConfigs()).rejects.toThrow('Network error');
      expect(mockedApiClient.get).toHaveBeenCalledWith('/statutory/pf/config');
    });
  });

  describe('enrollEmployeePF', () => {
    it('should enroll employee in PF successfully', async () => {
      const mockRecord: EmployeePFRecord = {
        id: 'emp-pf-1',
        tenantId: 'tenant-1',
        employeeId: 'emp-1',
        uanNumber: 'UAN123456789',
        pfNumber: 'PF123456',
        enrollmentDate: '2024-01-01',
        status: PFStatus.ACTIVE,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      mockedApiClient.post.mockResolvedValueOnce({data: mockRecord});

      const result = await statutoryService.enrollEmployeePF({
        employeeId: 'emp-1',
        uanNumber: 'UAN123456789',
        enrollmentDate: '2024-01-01',
      });

      expect(mockedApiClient.post).toHaveBeenCalledWith('/statutory/pf/employee', {
        employeeId: 'emp-1',
        uanNumber: 'UAN123456789',
        enrollmentDate: '2024-01-01',
      });
      expect(result).toEqual(mockRecord);
      expect(result.status).toBe(PFStatus.ACTIVE);
    });

    it('should handle error when PF enrollment fails', async () => {
      const error = new Error('Enrollment failed');
      mockedApiClient.post.mockRejectedValueOnce(error);

      await expect(
        statutoryService.enrollEmployeePF({
          employeeId: 'emp-1',
          enrollmentDate: '2024-01-01',
        })
      ).rejects.toThrow('Enrollment failed');
    });
  });

  describe('getEmployeePFRecord', () => {
    it('should fetch employee PF record successfully', async () => {
      const mockRecord: EmployeePFRecord = {
        id: 'emp-pf-1',
        tenantId: 'tenant-1',
        employeeId: 'emp-1',
        uanNumber: 'UAN123456789',
        status: PFStatus.ACTIVE,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      mockedApiClient.get.mockResolvedValueOnce({data: mockRecord});

      const result = await statutoryService.getEmployeePFRecord('emp-1');

      expect(mockedApiClient.get).toHaveBeenCalledWith('/statutory/pf/employee/emp-1');
      expect(result).toEqual(mockRecord);
      expect(result.employeeId).toBe('emp-1');
    });

    it('should handle not found error', async () => {
      const error = new Error('Not found');
      mockedApiClient.get.mockRejectedValueOnce(error);

      await expect(statutoryService.getEmployeePFRecord('emp-1')).rejects.toThrow('Not found');
    });
  });

  // --- Employee State Insurance (ESI) Tests ---

  describe('createESIConfig', () => {
    it('should create ESI config successfully', async () => {
      const mockConfig: ESIConfig = {
        id: 'esi-1',
        tenantId: 'tenant-1',
        effectiveFrom: '2024-01-01',
        employeeContributionPercentage: 0.75,
        employerContributionPercentage: 3.25,
        isActive: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      mockedApiClient.post.mockResolvedValueOnce({data: mockConfig});

      const result = await statutoryService.createESIConfig({
        effectiveFrom: '2024-01-01',
        employeeContributionPercentage: 0.75,
        employerContributionPercentage: 3.25,
      });

      expect(mockedApiClient.post).toHaveBeenCalledWith('/statutory/esi/config', {
        effectiveFrom: '2024-01-01',
        employeeContributionPercentage: 0.75,
        employerContributionPercentage: 3.25,
      });
      expect(result).toEqual(mockConfig);
    });

    it('should handle error when creating ESI config fails', async () => {
      const error = new Error('Validation error');
      mockedApiClient.post.mockRejectedValueOnce(error);

      await expect(
        statutoryService.createESIConfig({
          effectiveFrom: '2024-01-01',
          employeeContributionPercentage: 0.75,
          employerContributionPercentage: 3.25,
        })
      ).rejects.toThrow('Validation error');
    });
  });

  describe('getActiveESIConfigs', () => {
    it('should fetch active ESI configs successfully', async () => {
      const mockConfigs: ESIConfig[] = [
        {
          id: 'esi-1',
          tenantId: 'tenant-1',
          effectiveFrom: '2024-01-01',
          employeeContributionPercentage: 0.75,
          employerContributionPercentage: 3.25,
          isActive: true,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      ];

      mockedApiClient.get.mockResolvedValueOnce({data: mockConfigs});

      const result = await statutoryService.getActiveESIConfigs();

      expect(mockedApiClient.get).toHaveBeenCalledWith('/statutory/esi/config');
      expect(result).toEqual(mockConfigs);
    });

    it('should handle empty ESI configs', async () => {
      mockedApiClient.get.mockResolvedValueOnce({data: []});

      const result = await statutoryService.getActiveESIConfigs();

      expect(result).toHaveLength(0);
    });
  });

  describe('enrollEmployeeESI', () => {
    it('should enroll employee in ESI successfully', async () => {
      const mockRecord: EmployeeESIRecord = {
        id: 'emp-esi-1',
        tenantId: 'tenant-1',
        employeeId: 'emp-1',
        insuranceNumber: 'ESI123456789',
        enrollmentDate: '2024-01-01',
        status: 'ACTIVE',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      mockedApiClient.post.mockResolvedValueOnce({data: mockRecord});

      const result = await statutoryService.enrollEmployeeESI({
        employeeId: 'emp-1',
        insuranceNumber: 'ESI123456789',
        enrollmentDate: '2024-01-01',
      });

      expect(mockedApiClient.post).toHaveBeenCalledWith('/statutory/esi/employee', {
        employeeId: 'emp-1',
        insuranceNumber: 'ESI123456789',
        enrollmentDate: '2024-01-01',
      });
      expect(result).toEqual(mockRecord);
      expect(result.status).toBe('ACTIVE');
    });

    it('should handle error when ESI enrollment fails', async () => {
      const error = new Error('ESI enrollment error');
      mockedApiClient.post.mockRejectedValueOnce(error);

      await expect(
        statutoryService.enrollEmployeeESI({
          employeeId: 'emp-1',
          enrollmentDate: '2024-01-01',
        })
      ).rejects.toThrow('ESI enrollment error');
    });
  });

  describe('getEmployeeESIRecord', () => {
    it('should fetch employee ESI record successfully', async () => {
      const mockRecord: EmployeeESIRecord = {
        id: 'emp-esi-1',
        tenantId: 'tenant-1',
        employeeId: 'emp-1',
        insuranceNumber: 'ESI123456789',
        status: 'ACTIVE',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      mockedApiClient.get.mockResolvedValueOnce({data: mockRecord});

      const result = await statutoryService.getEmployeeESIRecord('emp-1');

      expect(mockedApiClient.get).toHaveBeenCalledWith('/statutory/esi/employee/emp-1');
      expect(result).toEqual(mockRecord);
    });

    it('should handle not found error for ESI record', async () => {
      const error = new Error('ESI record not found');
      mockedApiClient.get.mockRejectedValueOnce(error);

      await expect(statutoryService.getEmployeeESIRecord('emp-1')).rejects.toThrow(
        'ESI record not found'
      );
    });
  });

  // --- Professional Tax (PT) Tests ---

  describe('createPTSlab', () => {
    it('should create PT slab successfully', async () => {
      const mockSlab: ProfessionalTaxSlab = {
        id: 'pt-1',
        tenantId: 'tenant-1',
        stateCode: 'MH',
        effectiveFrom: '2024-01-01',
        minSalary: 0,
        maxSalary: 50000,
        taxAmount: 150,
        isActive: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      mockedApiClient.post.mockResolvedValueOnce({data: mockSlab});

      const result = await statutoryService.createPTSlab({
        stateCode: 'MH',
        effectiveFrom: '2024-01-01',
        minSalary: 0,
        maxSalary: 50000,
        taxAmount: 150,
      });

      expect(mockedApiClient.post).toHaveBeenCalledWith('/statutory/pt/slab', {
        stateCode: 'MH',
        effectiveFrom: '2024-01-01',
        minSalary: 0,
        maxSalary: 50000,
        taxAmount: 150,
      });
      expect(result).toEqual(mockSlab);
      expect(result.stateCode).toBe('MH');
    });

    it('should handle error when creating PT slab fails', async () => {
      const error = new Error('PT slab creation failed');
      mockedApiClient.post.mockRejectedValueOnce(error);

      await expect(
        statutoryService.createPTSlab({
          stateCode: 'MH',
          effectiveFrom: '2024-01-01',
          minSalary: 0,
          maxSalary: 50000,
          taxAmount: 150,
        })
      ).rejects.toThrow('PT slab creation failed');
    });
  });

  describe('getPTSlabsByState', () => {
    it('should fetch PT slabs by state successfully', async () => {
      const mockSlabs: ProfessionalTaxSlab[] = [
        {
          id: 'pt-1',
          tenantId: 'tenant-1',
          stateCode: 'MH',
          effectiveFrom: '2024-01-01',
          minSalary: 0,
          maxSalary: 50000,
          taxAmount: 150,
          isActive: true,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
        {
          id: 'pt-2',
          tenantId: 'tenant-1',
          stateCode: 'MH',
          effectiveFrom: '2024-01-01',
          minSalary: 50001,
          maxSalary: 100000,
          taxAmount: 225,
          isActive: true,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      ];

      mockedApiClient.get.mockResolvedValueOnce({data: mockSlabs});

      const result = await statutoryService.getPTSlabsByState('MH');

      expect(mockedApiClient.get).toHaveBeenCalledWith('/statutory/pt/slabs/MH');
      expect(result).toEqual(mockSlabs);
      expect(result).toHaveLength(2);
    });

    it('should handle empty PT slabs for state', async () => {
      mockedApiClient.get.mockResolvedValueOnce({data: []});

      const result = await statutoryService.getPTSlabsByState('XX');

      expect(result).toHaveLength(0);
    });

    it('should handle different state codes', async () => {
      const mockSlabs: ProfessionalTaxSlab[] = [
        {
          id: 'pt-3',
          tenantId: 'tenant-1',
          stateCode: 'KA',
          effectiveFrom: '2024-01-01',
          minSalary: 0,
          maxSalary: 75000,
          taxAmount: 200,
          isActive: true,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      ];

      mockedApiClient.get.mockResolvedValueOnce({data: mockSlabs});

      const result = await statutoryService.getPTSlabsByState('KA');

      expect(mockedApiClient.get).toHaveBeenCalledWith('/statutory/pt/slabs/KA');
      expect(result[0].stateCode).toBe('KA');
    });

    it('should handle error when fetching PT slabs fails', async () => {
      const error = new Error('Failed to fetch PT slabs');
      mockedApiClient.get.mockRejectedValueOnce(error);

      await expect(statutoryService.getPTSlabsByState('MH')).rejects.toThrow(
        'Failed to fetch PT slabs'
      );
    });
  });

  // --- Monthly Contributions Report Tests ---

  describe('getMonthlyContributions', () => {
    it('should fetch monthly contributions successfully', async () => {
      const mockContributions: MonthlyStatutoryContribution[] = [
        {
          id: 'contrib-1',
          tenantId: 'tenant-1',
          employeeId: 'emp-1',
          payslipId: 'payslip-1',
          month: 1,
          year: 2024,
          grossSalary: 50000,
          pfWage: 50000,
          pfEmployeeContribution: 6000,
          pfEmployerContribution: 1835,
          epsContribution: 600,
          vpfContribution: 0,
          esiWage: 50000,
          esiEmployeeContribution: 375,
          esiEmployerContribution: 1625,
          professionalTax: 150,
          tdsDeducted: 5000,
          createdAt: '2024-01-31T00:00:00Z',
          updatedAt: '2024-01-31T00:00:00Z',
        },
      ];

      mockedApiClient.get.mockResolvedValueOnce({data: mockContributions});

      const result = await statutoryService.getMonthlyContributions(1, 2024);

      expect(mockedApiClient.get).toHaveBeenCalledWith('/statutory/contributions/month/1/year/2024');
      expect(result).toEqual(mockContributions);
      expect(result).toHaveLength(1);
    });

    it('should handle empty monthly contributions', async () => {
      mockedApiClient.get.mockResolvedValueOnce({data: []});

      const result = await statutoryService.getMonthlyContributions(2, 2024);

      expect(result).toHaveLength(0);
    });

    it('should handle error when fetching monthly contributions fails', async () => {
      const error = new Error('Failed to fetch contributions');
      mockedApiClient.get.mockRejectedValueOnce(error);

      await expect(statutoryService.getMonthlyContributions(1, 2024)).rejects.toThrow(
        'Failed to fetch contributions'
      );
    });

    it('should construct correct URL with month and year', async () => {
      mockedApiClient.get.mockResolvedValueOnce({data: []});

      await statutoryService.getMonthlyContributions(12, 2023);

      expect(mockedApiClient.get).toHaveBeenCalledWith('/statutory/contributions/month/12/year/2023');
    });
  });

  describe('getEmployeeContributions', () => {
    it('should fetch employee contributions successfully', async () => {
      const mockContributions: MonthlyStatutoryContribution[] = [
        {
          id: 'contrib-1',
          tenantId: 'tenant-1',
          employeeId: 'emp-1',
          payslipId: 'payslip-1',
          month: 1,
          year: 2024,
          grossSalary: 50000,
          pfWage: 50000,
          pfEmployeeContribution: 6000,
          pfEmployerContribution: 1835,
          epsContribution: 600,
          vpfContribution: 0,
          esiWage: 50000,
          esiEmployeeContribution: 375,
          esiEmployerContribution: 1625,
          professionalTax: 150,
          tdsDeducted: 5000,
          createdAt: '2024-01-31T00:00:00Z',
          updatedAt: '2024-01-31T00:00:00Z',
        },
        {
          id: 'contrib-2',
          tenantId: 'tenant-1',
          employeeId: 'emp-1',
          payslipId: 'payslip-2',
          month: 2,
          year: 2024,
          grossSalary: 50000,
          pfWage: 50000,
          pfEmployeeContribution: 6000,
          pfEmployerContribution: 1835,
          epsContribution: 600,
          vpfContribution: 0,
          esiWage: 50000,
          esiEmployeeContribution: 375,
          esiEmployerContribution: 1625,
          professionalTax: 150,
          tdsDeducted: 5000,
          createdAt: '2024-02-29T00:00:00Z',
          updatedAt: '2024-02-29T00:00:00Z',
        },
      ];

      mockedApiClient.get.mockResolvedValueOnce({data: mockContributions});

      const result = await statutoryService.getEmployeeContributions('emp-1');

      expect(mockedApiClient.get).toHaveBeenCalledWith('/statutory/contributions/employee/emp-1');
      expect(result).toEqual(mockContributions);
      expect(result).toHaveLength(2);
    });

    it('should handle empty employee contributions', async () => {
      mockedApiClient.get.mockResolvedValueOnce({data: []});

      const result = await statutoryService.getEmployeeContributions('emp-999');

      expect(result).toHaveLength(0);
    });

    it('should handle error when fetching employee contributions fails', async () => {
      const error = new Error('Employee not found');
      mockedApiClient.get.mockRejectedValueOnce(error);

      await expect(statutoryService.getEmployeeContributions('emp-1')).rejects.toThrow(
        'Employee not found'
      );
    });

    it('should construct correct URL with employee ID', async () => {
      mockedApiClient.get.mockResolvedValueOnce({data: []});

      await statutoryService.getEmployeeContributions('emp-123');

      expect(mockedApiClient.get).toHaveBeenCalledWith('/statutory/contributions/employee/emp-123');
    });
  });
});
