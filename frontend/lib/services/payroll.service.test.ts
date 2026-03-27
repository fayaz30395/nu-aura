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

import { payrollService } from './payroll.service';
import { apiClient } from '@/lib/api/client';

// Types for test data
interface PayrollRun {
  id: string;
  payrollPeriodStart: string;
  payrollPeriodEnd: string;
  status: string;
  createdAt: string;
}

interface PayslipRequest {
  employeeId: string;
  payrollRunId: string;
  grossAmount: number;
  deductions: number;
  netAmount: number;
}

interface Payslip {
  id: string;
  employeeId: string;
  payrollRunId: string;
  grossAmount: number;
  deductions: number;
  netAmount: number;
}

interface SalaryStructure {
  id: string;
  employeeId: string;
  baseSalary: number;
  allowances: number;
  deductions: number;
  status: string;
}

interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
}

const mockApiClient = apiClient as {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
  put: ReturnType<typeof vi.fn>;
  patch: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
};

describe('PayrollService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Payroll Runs Management
  describe('Payroll Runs', () => {
    describe('createPayrollRun', () => {
      it('should create a payroll run with valid data', async () => {
        const mockPayrollRun: PayrollRun = {
          id: 'run-123',
          payrollPeriodStart: '2026-01-01',
          payrollPeriodEnd: '2026-01-31',
          status: 'DRAFT',
          createdAt: '2026-03-18T00:00:00Z',
        };

        mockApiClient.post.mockResolvedValue({ data: mockPayrollRun });

        const result = await payrollService.createPayrollRun({
          payrollPeriodStart: '2026-01-01',
          payrollPeriodEnd: '2026-01-31',
        } as Partial<{ payrollPeriodStart: string; payrollPeriodEnd: string }>);

        expect(mockApiClient.post).toHaveBeenCalledWith('/payroll/runs', {
          payrollPeriodStart: '2026-01-01',
          payrollPeriodEnd: '2026-01-31',
        });
        expect(result).toEqual(mockPayrollRun);
      });

      it('should handle errors when creating payroll run', async () => {
        const error = new Error('API Error');
        mockApiClient.post.mockRejectedValue(error);

        await expect(
          payrollService.createPayrollRun({
            payrollPeriodStart: '2026-01-01',
            payrollPeriodEnd: '2026-01-31',
          } as Partial<{ payrollPeriodStart: string; payrollPeriodEnd: string }>)
        ).rejects.toThrow('API Error');
      });
    });

    describe('updatePayrollRun', () => {
      it('should update a payroll run successfully', async () => {
        const mockUpdatedRun: PayrollRun = {
          id: 'run-123',
          payrollPeriodStart: '2026-02-01',
          payrollPeriodEnd: '2026-02-28',
          status: 'PROCESSING',
          createdAt: '2026-03-18T00:00:00Z',
        };

        mockApiClient.put.mockResolvedValue({ data: mockUpdatedRun });

        const result = await payrollService.updatePayrollRun('run-123', {
          payrollPeriodStart: '2026-02-01',
          payrollPeriodEnd: '2026-02-28',
        } as Partial<{ payrollPeriodStart: string; payrollPeriodEnd: string }>);

        expect(mockApiClient.put).toHaveBeenCalledWith('/payroll/runs/run-123', {
          payrollPeriodStart: '2026-02-01',
          payrollPeriodEnd: '2026-02-28',
        });
        expect(result.status).toBe('PROCESSING');
      });

      it('should handle errors when updating payroll run', async () => {
        mockApiClient.put.mockRejectedValue(new Error('Update failed'));

        await expect(payrollService.updatePayrollRun('run-123', {} as Partial<PayrollRun>)).rejects.toThrow(
          'Update failed'
        );
      });
    });

    describe('getPayrollRunById', () => {
      it('should retrieve a payroll run by ID', async () => {
        const mockRun: PayrollRun = {
          id: 'run-123',
          payrollPeriodStart: '2026-01-01',
          payrollPeriodEnd: '2026-01-31',
          status: 'DRAFT',
          createdAt: '2026-03-18T00:00:00Z',
        };

        mockApiClient.get.mockResolvedValue({ data: mockRun });

        const result = await payrollService.getPayrollRunById('run-123');

        expect(mockApiClient.get).toHaveBeenCalledWith('/payroll/runs/run-123');
        expect(result).toEqual(mockRun);
      });

      it('should handle 404 errors for missing payroll run', async () => {
        mockApiClient.get.mockRejectedValue(new Error('Not Found'));

        await expect(payrollService.getPayrollRunById('invalid-id')).rejects.toThrow('Not Found');
      });
    });

    describe('getAllPayrollRuns', () => {
      it('should retrieve all payroll runs with default pagination', async () => {
        const mockPage: Page<PayrollRun> = {
          content: [
            {
              id: 'run-1',
              payrollPeriodStart: '2026-01-01',
              payrollPeriodEnd: '2026-01-31',
              status: 'DRAFT',
              createdAt: '2026-03-18T00:00:00Z',
            },
          ],
          totalElements: 1,
          totalPages: 1,
          currentPage: 0,
          pageSize: 20,
        };

        mockApiClient.get.mockResolvedValue({ data: mockPage });

        const result = await payrollService.getAllPayrollRuns();

        expect(mockApiClient.get).toHaveBeenCalledWith('/payroll/runs', {
          params: { page: 0, size: 20 },
        });
        expect(result.content).toHaveLength(1);
      });

      it('should retrieve payroll runs with custom pagination', async () => {
        const mockPage: Page<PayrollRun> = {
          content: [],
          totalElements: 0,
          totalPages: 0,
          currentPage: 2,
          pageSize: 50,
        };

        mockApiClient.get.mockResolvedValue({ data: mockPage });

        await payrollService.getAllPayrollRuns(2, 50);

        expect(mockApiClient.get).toHaveBeenCalledWith('/payroll/runs', {
          params: { page: 2, size: 50 },
        });
      });
    });

    describe('getPayrollRunsByStatus', () => {
      it('should retrieve payroll runs by status', async () => {
        const mockPage: Page<PayrollRun> = {
          content: [
            {
              id: 'run-123',
              payrollPeriodStart: '2026-01-01',
              payrollPeriodEnd: '2026-01-31',
              status: 'PROCESSING',
              createdAt: '2026-03-18T00:00:00Z',
            },
          ],
          totalElements: 1,
          totalPages: 1,
          currentPage: 0,
          pageSize: 20,
        };

        mockApiClient.get.mockResolvedValue({ data: mockPage });

        const result = await payrollService.getPayrollRunsByStatus('PROCESSING');

        expect(mockApiClient.get).toHaveBeenCalledWith('/payroll/runs/status/PROCESSING', {
          params: { page: 0, size: 20 },
        });
        expect(result.content[0].status).toBe('PROCESSING');
      });

      it('should handle pagination for status-based search', async () => {
        mockApiClient.get.mockResolvedValue({ data: { content: [], totalElements: 0 } });

        await payrollService.getPayrollRunsByStatus('APPROVED', 1, 15);

        expect(mockApiClient.get).toHaveBeenCalledWith('/payroll/runs/status/APPROVED', {
          params: { page: 1, size: 15 },
        });
      });
    });

    describe('processPayrollRun', () => {
      it('should process a payroll run', async () => {
        const mockProcessedRun: PayrollRun = {
          id: 'run-123',
          payrollPeriodStart: '2026-01-01',
          payrollPeriodEnd: '2026-01-31',
          status: 'PROCESSED',
          createdAt: '2026-03-18T00:00:00Z',
        };

        mockApiClient.post.mockResolvedValue({ data: mockProcessedRun });

        const result = await payrollService.processPayrollRun('run-123');

        expect(mockApiClient.post).toHaveBeenCalledWith('/payroll/runs/run-123/process');
        expect(result.status).toBe('PROCESSED');
      });

      it('should handle processing errors', async () => {
        mockApiClient.post.mockRejectedValue(new Error('Processing failed'));

        await expect(payrollService.processPayrollRun('run-123')).rejects.toThrow(
          'Processing failed'
        );
      });
    });

    describe('approvePayrollRun', () => {
      it('should approve a payroll run', async () => {
        const mockApprovedRun: PayrollRun = {
          id: 'run-123',
          payrollPeriodStart: '2026-01-01',
          payrollPeriodEnd: '2026-01-31',
          status: 'APPROVED',
          createdAt: '2026-03-18T00:00:00Z',
        };

        mockApiClient.post.mockResolvedValue({ data: mockApprovedRun });

        const result = await payrollService.approvePayrollRun('run-123');

        expect(mockApiClient.post).toHaveBeenCalledWith('/payroll/runs/run-123/approve');
        expect(result.status).toBe('APPROVED');
      });

      it('should handle approval errors', async () => {
        mockApiClient.post.mockRejectedValue(new Error('Approval denied'));

        await expect(payrollService.approvePayrollRun('run-123')).rejects.toThrow(
          'Approval denied'
        );
      });
    });

    describe('lockPayrollRun', () => {
      it('should lock a payroll run', async () => {
        const mockLockedRun: PayrollRun = {
          id: 'run-123',
          payrollPeriodStart: '2026-01-01',
          payrollPeriodEnd: '2026-01-31',
          status: 'LOCKED',
          createdAt: '2026-03-18T00:00:00Z',
        };

        mockApiClient.post.mockResolvedValue({ data: mockLockedRun });

        const result = await payrollService.lockPayrollRun('run-123');

        expect(mockApiClient.post).toHaveBeenCalledWith('/payroll/runs/run-123/lock');
        expect(result.status).toBe('LOCKED');
      });

      it('should handle lock errors', async () => {
        mockApiClient.post.mockRejectedValue(new Error('Lock failed'));

        await expect(payrollService.lockPayrollRun('run-123')).rejects.toThrow('Lock failed');
      });
    });

    describe('deletePayrollRun', () => {
      it('should delete a payroll run', async () => {
        mockApiClient.delete.mockResolvedValue({});

        await payrollService.deletePayrollRun('run-123');

        expect(mockApiClient.delete).toHaveBeenCalledWith('/payroll/runs/run-123');
      });

      it('should handle deletion errors', async () => {
        mockApiClient.delete.mockRejectedValue(new Error('Deletion failed'));

        await expect(payrollService.deletePayrollRun('run-123')).rejects.toThrow(
          'Deletion failed'
        );
      });
    });
  });

  // Payslips Management
  describe('Payslips', () => {
    describe('createPayslip', () => {
      it('should create a payslip', async () => {
        const mockPayslip: Payslip = {
          id: 'slip-123',
          employeeId: 'emp-123',
          payrollRunId: 'run-123',
          grossAmount: 50000,
          deductions: 5000,
          netAmount: 45000,
        };

        mockApiClient.post.mockResolvedValue({ data: mockPayslip });

        const payslipData: PayslipRequest = {
          employeeId: 'emp-123',
          payrollRunId: 'run-123',
          grossAmount: 50000,
          deductions: 5000,
          netAmount: 45000,
        };

        const result = await payrollService.createPayslip(payslipData as Partial<PayslipRequest>);

        expect(mockApiClient.post).toHaveBeenCalledWith('/payroll/payslips', payslipData);
        expect(result.netAmount).toBe(45000);
      });

      it('should handle payslip creation errors', async () => {
        mockApiClient.post.mockRejectedValue(new Error('Creation failed'));

        await expect(
          payrollService.createPayslip({
            employeeId: 'emp-123',
            payrollRunId: 'run-123',
            grossAmount: 50000,
            deductions: 5000,
            netAmount: 45000,
          } as Partial<PayslipRequest>)
        ).rejects.toThrow('Creation failed');
      });
    });

    describe('updatePayslip', () => {
      it('should update a payslip', async () => {
        const updatedPayslip: Payslip = {
          id: 'slip-123',
          employeeId: 'emp-123',
          payrollRunId: 'run-123',
          grossAmount: 52000,
          deductions: 5200,
          netAmount: 46800,
        };

        mockApiClient.put.mockResolvedValue({ data: updatedPayslip });

        const result = await payrollService.updatePayslip('slip-123', {
          grossAmount: 52000,
        } as Partial<Payslip>);

        expect(mockApiClient.put).toHaveBeenCalledWith('/payroll/payslips/slip-123', {
          grossAmount: 52000,
        });
        expect(result.grossAmount).toBe(52000);
      });

      it('should handle payslip update errors', async () => {
        mockApiClient.put.mockRejectedValue(new Error('Update failed'));

        await expect(payrollService.updatePayslip('slip-123', {} as Partial<Payslip>)).rejects.toThrow(
          'Update failed'
        );
      });
    });

    describe('getPayslipById', () => {
      it('should retrieve a payslip by ID', async () => {
        const mockPayslip: Payslip = {
          id: 'slip-123',
          employeeId: 'emp-123',
          payrollRunId: 'run-123',
          grossAmount: 50000,
          deductions: 5000,
          netAmount: 45000,
        };

        mockApiClient.get.mockResolvedValue({ data: mockPayslip });

        const result = await payrollService.getPayslipById('slip-123');

        expect(mockApiClient.get).toHaveBeenCalledWith('/payroll/payslips/slip-123');
        expect(result).toEqual(mockPayslip);
      });

      it('should handle errors when fetching payslip', async () => {
        mockApiClient.get.mockRejectedValue(new Error('Not found'));

        await expect(payrollService.getPayslipById('invalid-id')).rejects.toThrow('Not found');
      });
    });

    describe('getAllPayslips', () => {
      it('should retrieve all payslips', async () => {
        const mockPage: Page<Payslip> = {
          content: [
            {
              id: 'slip-1',
              employeeId: 'emp-123',
              payrollRunId: 'run-123',
              grossAmount: 50000,
              deductions: 5000,
              netAmount: 45000,
            },
          ],
          totalElements: 1,
          totalPages: 1,
          currentPage: 0,
          pageSize: 20,
        };

        mockApiClient.get.mockResolvedValue({ data: mockPage });

        const result = await payrollService.getAllPayslips();

        expect(mockApiClient.get).toHaveBeenCalledWith('/payroll/payslips', {
          params: { page: 0, size: 20 },
        });
        expect(result.content).toHaveLength(1);
      });

      it('should handle custom pagination for payslips', async () => {
        mockApiClient.get.mockResolvedValue({ data: { content: [] } });

        await payrollService.getAllPayslips(1, 50);

        expect(mockApiClient.get).toHaveBeenCalledWith('/payroll/payslips', {
          params: { page: 1, size: 50 },
        });
      });
    });

    describe('getPayslipsByEmployee', () => {
      it('should retrieve payslips for an employee', async () => {
        const mockPage: Page<Payslip> = {
          content: [
            {
              id: 'slip-1',
              employeeId: 'emp-123',
              payrollRunId: 'run-123',
              grossAmount: 50000,
              deductions: 5000,
              netAmount: 45000,
            },
          ],
          totalElements: 1,
          totalPages: 1,
          currentPage: 0,
          pageSize: 20,
        };

        mockApiClient.get.mockResolvedValue({ data: mockPage });

        const result = await payrollService.getPayslipsByEmployee('emp-123');

        expect(mockApiClient.get).toHaveBeenCalledWith('/payroll/payslips/employee/emp-123', {
          params: { page: 0, size: 20 },
        });
        expect(result.content[0].employeeId).toBe('emp-123');
      });

      it('should handle pagination for employee payslips', async () => {
        mockApiClient.get.mockResolvedValue({ data: { content: [] } });

        await payrollService.getPayslipsByEmployee('emp-123', 2, 15);

        expect(mockApiClient.get).toHaveBeenCalledWith('/payroll/payslips/employee/emp-123', {
          params: { page: 2, size: 15 },
        });
      });
    });

    describe('downloadPayslipPdf', () => {
      it('should download payslip PDF', async () => {
        const mockBlob = new Blob(['pdf-content'], { type: 'application/pdf' });
        mockApiClient.get.mockResolvedValue({ data: mockBlob });

        const result = await payrollService.downloadPayslipPdf('slip-123');

        expect(mockApiClient.get).toHaveBeenCalledWith('/payroll/payslips/slip-123/pdf', {
          responseType: 'blob',
        });
        expect(result instanceof Blob).toBe(true);
      });

      it('should handle PDF download errors', async () => {
        mockApiClient.get.mockRejectedValue(new Error('Download failed'));

        await expect(payrollService.downloadPayslipPdf('slip-123')).rejects.toThrow(
          'Download failed'
        );
      });
    });
  });

  // Salary Structures Management
  describe('Salary Structures', () => {
    describe('createSalaryStructure', () => {
      it('should create a salary structure', async () => {
        const mockStructure: SalaryStructure = {
          id: 'ss-123',
          employeeId: 'emp-123',
          baseSalary: 50000,
          allowances: 10000,
          deductions: 5000,
          status: 'DRAFT',
        };

        mockApiClient.post.mockResolvedValue({ data: mockStructure });

        const result = await payrollService.createSalaryStructure({
          employeeId: 'emp-123',
          baseSalary: 50000,
        } as Partial<SalaryStructure>);

        expect(mockApiClient.post).toHaveBeenCalledWith('/payroll/salary-structures', {
          employeeId: 'emp-123',
          baseSalary: 50000,
        });
        expect(result.status).toBe('DRAFT');
      });

      it('should handle salary structure creation errors', async () => {
        mockApiClient.post.mockRejectedValue(new Error('Creation failed'));

        await expect(
          payrollService.createSalaryStructure({} as Partial<SalaryStructure>)
        ).rejects.toThrow('Creation failed');
      });
    });

    describe('getSalaryStructureById', () => {
      it('should retrieve a salary structure by ID', async () => {
        const mockStructure: SalaryStructure = {
          id: 'ss-123',
          employeeId: 'emp-123',
          baseSalary: 50000,
          allowances: 10000,
          deductions: 5000,
          status: 'APPROVED',
        };

        mockApiClient.get.mockResolvedValue({ data: mockStructure });

        const result = await payrollService.getSalaryStructureById('ss-123');

        expect(mockApiClient.get).toHaveBeenCalledWith('/payroll/salary-structures/ss-123');
        expect(result).toEqual(mockStructure);
      });

      it('should handle errors when fetching salary structure', async () => {
        mockApiClient.get.mockRejectedValue(new Error('Not found'));

        await expect(payrollService.getSalaryStructureById('invalid-id')).rejects.toThrow(
          'Not found'
        );
      });
    });

    // approveSalaryStructure removed — no backend endpoint exists

    describe('deactivateSalaryStructure', () => {
      it('should deactivate a salary structure', async () => {
        const mockStructure: SalaryStructure = {
          id: 'ss-123',
          employeeId: 'emp-123',
          baseSalary: 50000,
          allowances: 10000,
          deductions: 5000,
          status: 'INACTIVE',
        };

        mockApiClient.post.mockResolvedValue({ data: mockStructure });

        const result = await payrollService.deactivateSalaryStructure('ss-123');

        expect(mockApiClient.post).toHaveBeenCalledWith(
          '/payroll/salary-structures/ss-123/deactivate'
        );
        expect(result.status).toBe('INACTIVE');
      });

      it('should handle deactivation errors', async () => {
        mockApiClient.post.mockRejectedValue(new Error('Deactivation failed'));

        await expect(payrollService.deactivateSalaryStructure('ss-123')).rejects.toThrow(
          'Deactivation failed'
        );
      });
    });

    describe('deleteSalaryStructure', () => {
      it('should delete a salary structure', async () => {
        mockApiClient.delete.mockResolvedValue({});

        await payrollService.deleteSalaryStructure('ss-123');

        expect(mockApiClient.delete).toHaveBeenCalledWith('/payroll/salary-structures/ss-123');
      });

      it('should handle deletion errors', async () => {
        mockApiClient.delete.mockRejectedValue(new Error('Deletion failed'));

        await expect(payrollService.deleteSalaryStructure('ss-123')).rejects.toThrow(
          'Deletion failed'
        );
      });
    });
  });

  // Bulk Processing — CRIT-008: Backend not implemented.
  // Stubs throw errors; UI is gated via BULK_PROCESSING_AVAILABLE flag.
  describe('Bulk Processing (stubs — CRIT-008)', () => {
    describe('bulkProcessPayroll', () => {
      it('should throw because backend is not implemented', async () => {
        await expect(
          payrollService.bulkProcessPayroll({
            employeeIds: ['emp-1', 'emp-2'],
            payrollPeriodStart: '2026-01-01',
            payrollPeriodEnd: '2026-01-31',
            paymentDate: '2026-02-01',
          })
        ).rejects.toThrow('Bulk payroll processing is not yet available');
      });
    });

    describe('getBulkProcessingStatus', () => {
      it('should throw because backend is not implemented', async () => {
        await expect(
          payrollService.getBulkProcessingStatus('run-123')
        ).rejects.toThrow('Bulk processing status is not yet available');
      });
    });

    describe('previewBulkProcessing', () => {
      it('should throw because backend is not implemented', async () => {
        await expect(
          payrollService.previewBulkProcessing({
            employeeIds: ['emp-1'],
            payrollPeriodStart: '2026-01-01',
            payrollPeriodEnd: '2026-01-31',
          })
        ).rejects.toThrow('Bulk processing preview is not yet available');
      });
    });
  });
});
