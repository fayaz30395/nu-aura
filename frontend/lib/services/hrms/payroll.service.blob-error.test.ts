import {beforeEach, describe, expect, it, vi} from 'vitest';
import {payrollService} from './payroll.service';
import {apiClient} from '@/lib/api/client';

vi.mock('@/lib/api/client', () => ({
  apiClient: {get: vi.fn()},
}));

const get = apiClient.get as unknown as ReturnType<typeof vi.fn>;

function blobError(body: string, type = 'application/json') {
  const err = new Error('Request failed with status code 403') as Error & {
    response: { status: number; data: unknown };
  };
  err.response = {status: 403, data: new Blob([body], {type})};
  return err;
}

type ApiError = Error & { response?: { data?: { message?: string } } };

describe('payrollService PDF download errors', () => {
  beforeEach(() => {
    get.mockReset();
  });

  it.each([
    ['downloadPayslipPdf', () => payrollService.downloadPayslipPdf('slip-1')],
    ['downloadPayslipPdfByPeriod', () => payrollService.downloadPayslipPdfByPeriod('emp-1', 2026, 5)],
  ])('%s exposes the server message from a JSON Blob error body', async (_name, call) => {
    get.mockRejectedValue(blobError(JSON.stringify({message: 'Payslip not released'})));

    const err = await call().catch((e: unknown) => e as ApiError);

    expect(err).toBeInstanceOf(Error);
    expect((err as ApiError).message).toBe('Payslip not released');
    expect((err as ApiError).response?.data?.message).toBe('Payslip not released');
  });

  it('rethrows the original error when the Blob body is not JSON', async () => {
    const original = blobError('<html>gateway</html>', 'text/html');
    get.mockRejectedValue(original);

    await expect(payrollService.downloadPayslipPdf('slip-1')).rejects.toBe(original);
    expect(original.message).toBe('Request failed with status code 403');
    expect(original.response.data).toBeInstanceOf(Blob);
  });

  it('rethrows non-Blob errors unchanged', async () => {
    const original = new Error('Network Error');
    get.mockRejectedValue(original);

    await expect(payrollService.downloadPayslipPdf('slip-1')).rejects.toBe(original);
  });
});
