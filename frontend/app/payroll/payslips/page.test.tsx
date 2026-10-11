import React from 'react';
import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import PayslipsPage from './page';
import {payrollService} from '@/lib/services/hrms/payroll.service';
import type {Payslip} from '@/lib/types/hrms/payroll';

const THIS_MONTH = new Date().toISOString().substring(0, 7);

const payslip = (id: string): Payslip => ({
  id,
  employeeName: `Employee ${id}`,
  payrollRunName: 'Run',
  paymentDate: `${THIS_MONTH}-28`,
  status: 'PAID',
} as unknown as Payslip);

const PAYSLIPS = [payslip('a'), payslip('b'), payslip('c')];

vi.mock('@/lib/hooks/queries/usePayroll', () => ({
  usePayslips: () => ({
    data: {content: PAYSLIPS, totalPages: 1, totalElements: PAYSLIPS.length},
    isLoading: false,
    error: null,
  }),
}));

vi.mock('@/lib/services/hrms/payroll.service', () => ({
  payrollService: {downloadPayslipPdf: vi.fn()},
}));

vi.mock('@/components/auth/PermissionGate', () => ({
  PermissionGate: ({children}: { children: React.ReactNode }) => <>{children}</>,
  PageDeniedFallback: () => null,
}));

vi.mock('@/components/layout', () => ({
  AppLayout: ({children}: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/motion', () => {
  const Pass = ({children}: { children?: React.ReactNode }) => <div>{children}</div>;
  return {PageTransition: Pass, Reveal: Pass};
});

vi.mock('@/components/payroll/PayslipCard', () => ({
  PayslipCard: ({payslip: p}: { payslip: Payslip }) => <div>{p.employeeName}</div>,
}));

const downloadPdf = payrollService.downloadPayslipPdf as unknown as ReturnType<typeof vi.fn>;

describe('/payroll/payslips Download All', () => {
  beforeEach(() => {
    downloadPdf.mockReset();
    window.URL.createObjectURL = vi.fn(() => 'blob:url');
    window.URL.revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('keeps loading for the whole loop and reports partial failures', async () => {
    let releaseFirst: (b: Blob) => void = () => undefined;
    downloadPdf
      .mockImplementationOnce(() => new Promise<Blob>((resolve) => {
        releaseFirst = resolve;
      }))
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce(new Blob(['pdf']));

    render(<PayslipsPage/>);
    const button = screen.getByRole('button', {name: /download all/i});
    fireEvent.click(button);

    await waitFor(() => expect(downloadPdf).toHaveBeenCalledTimes(1));
    expect(button).toBeDisabled();

    releaseFirst(new Blob(['pdf']));
    // After the first file finishes the bulk run is still going, so the button stays disabled.
    await waitFor(() => expect(downloadPdf).toHaveBeenCalledTimes(2));
    expect(button).toBeDisabled();

    expect(await screen.findByText('1 of 3 payslips failed to download')).toBeTruthy();
    expect(downloadPdf).toHaveBeenCalledTimes(3);
    await waitFor(() => expect(button).not.toBeDisabled());
  });

  it('shows no error when every payslip downloads', async () => {
    downloadPdf.mockResolvedValue(new Blob(['pdf']));

    render(<PayslipsPage/>);
    const button = screen.getByRole('button', {name: /download all/i});
    fireEvent.click(button);

    await waitFor(() => expect(downloadPdf).toHaveBeenCalledTimes(3));
    await waitFor(() => expect(button).not.toBeDisabled());
    expect(document.body.textContent).not.toMatch(/failed to download/);
  });
});
