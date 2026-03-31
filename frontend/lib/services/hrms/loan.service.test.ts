/**
 * Unit Tests for Loan Service
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@/lib/api/client', () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

import { loanService } from './loan.service';
import type { LoanStatus } from './loan.service';
import { apiClient } from '@/lib/api/client';

const mock = apiClient as {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
  put: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
};

interface EmployeeLoan { id: string; employeeId: string; amount: number; status: string; }
interface Page<T> { content: T[]; totalElements: number; totalPages: number; }

const makeLoan = (overrides: Partial<EmployeeLoan> = {}): EmployeeLoan => ({
  id: 'l-1', employeeId: 'e-1', amount: 100000, status: 'DRAFT', ...overrides,
});
const makePage = (items: EmployeeLoan[]): Page<EmployeeLoan> => ({
  content: items, totalElements: items.length, totalPages: 1,
});

describe('LoanService', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  describe('createLoan', () => {
    it('should create a loan', async () => {
      const loan = makeLoan();
      mock.post.mockResolvedValueOnce({ data: loan });
      const result = await loanService.createLoan({ employeeId: 'e-1', amount: 100000 } as Parameters<typeof loanService.createLoan>[0]);
      expect(result).toEqual(loan);
      expect(mock.post).toHaveBeenCalledWith('/loans', expect.any(Object));
    });

    it('should throw on error', async () => {
      mock.post.mockRejectedValueOnce(new Error('Validation error'));
      await expect(loanService.createLoan({} as Parameters<typeof loanService.createLoan>[0])).rejects.toThrow();
    });
  });

  describe('getLoanById', () => {
    it('should return a loan by ID', async () => {
      mock.get.mockResolvedValueOnce({ data: makeLoan() });
      const result = await loanService.getLoanById('l-1');
      expect(result).toEqual(makeLoan());
      expect(mock.get).toHaveBeenCalledWith('/loans/l-1');
    });

    it('should throw on 404', async () => {
      mock.get.mockRejectedValueOnce(new Error('Not Found'));
      await expect(loanService.getLoanById('bad')).rejects.toThrow();
    });
  });

  describe('updateLoan', () => {
    it('should update a loan', async () => {
      const loan = makeLoan({ amount: 200000 });
      mock.put.mockResolvedValueOnce({ data: loan });
      const result = await loanService.updateLoan('l-1', { amount: 200000 } as Parameters<typeof loanService.updateLoan>[1]);
      expect(result.amount).toBe(200000);
      expect(mock.put).toHaveBeenCalledWith('/loans/l-1', expect.any(Object));
    });

    it('should throw on error', async () => {
      mock.put.mockRejectedValueOnce(new Error('Not Found'));
      await expect(loanService.updateLoan('bad', {} as Parameters<typeof loanService.updateLoan>[1])).rejects.toThrow();
    });
  });

  describe('deleteLoan', () => {
    it('should delete a loan', async () => {
      mock.delete.mockResolvedValueOnce({ data: undefined });
      await loanService.deleteLoan('l-1');
      expect(mock.delete).toHaveBeenCalledWith('/loans/l-1');
    });

    it('should throw on error', async () => {
      mock.delete.mockRejectedValueOnce(new Error('Forbidden'));
      await expect(loanService.deleteLoan('l-1')).rejects.toThrow();
    });
  });

  describe('getMyLoans', () => {
    it('should return my loans with default pagination', async () => {
      mock.get.mockResolvedValueOnce({ data: makePage([makeLoan()]) });
      await loanService.getMyLoans();
      expect(mock.get).toHaveBeenCalledWith('/loans/my', { params: { page: 0, size: 20 } });
    });

    it('should support custom pagination', async () => {
      mock.get.mockResolvedValueOnce({ data: makePage([]) });
      await loanService.getMyLoans(1, 5);
      expect(mock.get).toHaveBeenCalledWith('/loans/my', { params: { page: 1, size: 5 } });
    });
  });

  describe('getAllLoans', () => {
    it('should return all loans', async () => {
      mock.get.mockResolvedValueOnce({ data: makePage([makeLoan()]) });
      await loanService.getAllLoans();
      expect(mock.get).toHaveBeenCalledWith('/loans', expect.objectContaining({ params: expect.objectContaining({ page: 0, size: 20 }) }));
    });

    it('should include filters when provided', async () => {
      mock.get.mockResolvedValueOnce({ data: makePage([]) });
      await loanService.getAllLoans(0, 20, { status: 'ACTIVE' as LoanStatus });
      expect(mock.get).toHaveBeenCalledWith('/loans', expect.objectContaining({
        params: expect.objectContaining({ status: 'ACTIVE' }),
      }));
    });
  });

  describe('getPendingApprovals', () => {
    it('should return pending approvals', async () => {
      mock.get.mockResolvedValueOnce({ data: makePage([makeLoan({ status: 'PENDING_APPROVAL' })]) });
      await loanService.getPendingApprovals();
      expect(mock.get).toHaveBeenCalledWith('/loans/pending', { params: { page: 0, size: 20 } });
    });

    it('should throw on error', async () => {
      mock.get.mockRejectedValueOnce(new Error('Unauthorized'));
      await expect(loanService.getPendingApprovals()).rejects.toThrow();
    });
  });

  describe('submitLoan', () => {
    it('should submit a loan for approval', async () => {
      mock.post.mockResolvedValueOnce({ data: makeLoan({ status: 'PENDING_APPROVAL' }) });
      const result = await loanService.submitLoan('l-1');
      expect(result.status).toBe('PENDING_APPROVAL');
      expect(mock.post).toHaveBeenCalledWith('/loans/l-1/submit');
    });

    it('should throw on error', async () => {
      mock.post.mockRejectedValueOnce(new Error('Not Found'));
      await expect(loanService.submitLoan('bad')).rejects.toThrow();
    });
  });

  describe('approveLoan', () => {
    it('should approve a loan', async () => {
      mock.post.mockResolvedValueOnce({ data: makeLoan({ status: 'APPROVED' }) });
      const result = await loanService.approveLoan('l-1');
      expect(result.status).toBe('APPROVED');
      expect(mock.post).toHaveBeenCalledWith('/loans/l-1/approve', {});
    });

    it('should pass approvedAmount when provided', async () => {
      mock.post.mockResolvedValueOnce({ data: makeLoan({ status: 'APPROVED', amount: 80000 }) });
      await loanService.approveLoan('l-1', 80000);
      expect(mock.post).toHaveBeenCalledWith('/loans/l-1/approve', { approvedAmount: 80000 });
    });
  });

  describe('rejectLoan', () => {
    it('should reject a loan with reason', async () => {
      mock.post.mockResolvedValueOnce({ data: makeLoan({ status: 'REJECTED' }) });
      const result = await loanService.rejectLoan('l-1', 'Insufficient eligibility');
      expect(result.status).toBe('REJECTED');
      expect(mock.post).toHaveBeenCalledWith('/loans/l-1/reject', { reason: 'Insufficient eligibility' });
    });

    it('should throw on error', async () => {
      mock.post.mockRejectedValueOnce(new Error('Not Found'));
      await expect(loanService.rejectLoan('bad', 'reason')).rejects.toThrow();
    });
  });

  describe('disburseLoan', () => {
    it('should disburse a loan', async () => {
      mock.post.mockResolvedValueOnce({ data: makeLoan({ status: 'DISBURSED' }) });
      const result = await loanService.disburseLoan('l-1');
      expect(result.status).toBe('DISBURSED');
      expect(mock.post).toHaveBeenCalledWith('/loans/l-1/disburse');
    });

    it('should throw on error', async () => {
      mock.post.mockRejectedValueOnce(new Error('Conflict'));
      await expect(loanService.disburseLoan('l-1')).rejects.toThrow();
    });
  });

  describe('recordPayment', () => {
    it('should record a payment', async () => {
      mock.post.mockResolvedValueOnce({ data: makeLoan({ status: 'ACTIVE' }) });
      await loanService.recordPayment('l-1', 5000);
      expect(mock.post).toHaveBeenCalledWith('/loans/l-1/payment', null, { params: { amount: 5000 } });
    });

    it('should throw on error', async () => {
      mock.post.mockRejectedValueOnce(new Error('Not Found'));
      await expect(loanService.recordPayment('bad', 5000)).rejects.toThrow();
    });
  });

  describe('closeLoan', () => {
    it('should close a loan', async () => {
      mock.post.mockResolvedValueOnce({ data: makeLoan({ status: 'CLOSED' }) });
      const result = await loanService.closeLoan('l-1');
      expect(result.status).toBe('CLOSED');
      expect(mock.post).toHaveBeenCalledWith('/loans/l-1/close');
    });

    it('should throw on error', async () => {
      mock.post.mockRejectedValueOnce(new Error('Not Found'));
      await expect(loanService.closeLoan('bad')).rejects.toThrow();
    });
  });

  describe('getLoanSummary', () => {
    it('should return loan summary', async () => {
      const summary = { totalLoans: 10, activeLoans: 5, totalDisbursed: 1000000 };
      mock.get.mockResolvedValueOnce({ data: summary });
      const result = await loanService.getLoanSummary();
      expect(result).toEqual(summary);
      expect(mock.get).toHaveBeenCalledWith('/loans/summary');
    });

    it('should throw on error', async () => {
      mock.get.mockRejectedValueOnce(new Error('Server error'));
      await expect(loanService.getLoanSummary()).rejects.toThrow();
    });
  });

  describe('getStatusColor (pure function)', () => {
    it('should return color for ACTIVE status', () => {
      const color = loanService.getStatusColor('ACTIVE');
      expect(color).toContain('green');
    });

    it('should return color for REJECTED status', () => {
      const color = loanService.getStatusColor('REJECTED');
      expect(color).toContain('red');
    });

    it('should return color for DRAFT status', () => {
      const color = loanService.getStatusColor('DRAFT');
      expect(color).toBeTruthy();
    });
  });

  describe('formatCurrency (pure function)', () => {
    it('should format amount as INR currency', () => {
      const formatted = loanService.formatCurrency(100000);
      expect(formatted).toContain('1,00,000');
    });

    it('should handle zero amount', () => {
      const formatted = loanService.formatCurrency(0);
      expect(formatted).toBeTruthy();
    });
  });

  describe('getLoanTypeLabel (pure function)', () => {
    it('should return label for PERSONAL loan type', () => {
      expect(loanService.getLoanTypeLabel('PERSONAL')).toBe('Personal Loan');
    });

    it('should return label for EDUCATION loan type', () => {
      expect(loanService.getLoanTypeLabel('EDUCATION')).toBe('Education Loan');
    });

    it('should return the type itself for unknown types', () => {
      expect(loanService.getLoanTypeLabel('UNKNOWN')).toBe('UNKNOWN');
    });
  });
});
