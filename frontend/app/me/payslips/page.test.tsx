import React from 'react';
import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import MyPayslipsPage from './page';
import {formatCurrency} from '@/lib/utils';
import {formatMonthYear} from '@/lib/utils/format/date';

const YEAR = new Date().getFullYear();

// ---- mocks: network boundary, auth, layout/motion wrappers -------------------------------------------------
const apiGet = vi.fn();
vi.mock('@/lib/api/client', () => ({
  apiClient: {
    get: (...args: unknown[]) => apiGet(...args),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('@/lib/hooks/useAuth', () => ({
  useAuth: () => ({
    hasHydrated: true,
    user: {employeeId: 'emp-1', roles: [{code: 'EMPLOYEE'}]},
  }),
}));

vi.mock('@/components/layout', () => ({
  AppLayout: ({children}: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/motion', () => {
  const Pass = ({children}: { children?: React.ReactNode }) => <div>{children}</div>;
  return {PageTransition: Pass, Reveal: Pass, Stagger: Pass, StaggerItem: Pass};
});

// ---- backend-shaped fixtures: exactly the fields the API sends (payDate, netSalary, ...; no status) -----------
const backendPayslip = (id: string, month: number, net: number) => ({
  id,
  tenantId: 't-1',
  payrollRunId: `run-${month}`,
  employeeId: 'emp-1',
  payPeriodMonth: month,
  payPeriodYear: YEAR,
  payDate: `${YEAR}-${String(month).padStart(2, '0')}-28`,
  basicSalary: net - 8000,
  hra: 4000,
  conveyanceAllowance: 1000,
  medicalAllowance: 500,
  specialAllowance: 1500,
  otherAllowances: 0,
  grossSalary: net + 5000,
  providentFund: 3000,
  professionalTax: 200,
  incomeTax: 1800,
  otherDeductions: 0,
  totalDeductions: 5000,
  netSalary: net,
});

const releaseStatus = (notReleased: number[], released: number[]) =>
  Array.from({length: 12}, (_, i) => {
    const month = i + 1;
    if (released.includes(month)) return {month, released: true, reason: 'RELEASED'};
    if (notReleased.includes(month)) return {month, released: false, reason: 'NOT_RELEASED'};
    return {month, released: false, reason: 'NO_PAYSLIP'};
  });

function serve(opts: { status: unknown | Error }) {
  apiGet.mockImplementation(async (url: string) => {
    if (url.includes('release-status')) {
      if (opts.status instanceof Error) throw opts.status;
      return {data: opts.status};
    }
    if (url.includes('/payslips/employee/')) {
      return {
        data: {
          content: [backendPayslip('p1', 1, 58000), backendPayslip('p2', 2, 60000)],
          totalElements: 2,
          totalPages: 1,
          number: 0,
          size: 100,
        },
      };
    }
    return {data: {content: [], totalElements: 0, totalPages: 0, number: 0, size: 100}};
  });
}

function renderPage() {
  const client = new QueryClient({defaultOptions: {queries: {retry: false}}});
  return render(
    <QueryClientProvider client={client}>
      <MyPayslipsPage/>
    </QueryClientProvider>
  );
}

describe('/me/payslips with the real API response shape', () => {
  beforeEach(() => {
    apiGet.mockReset();
  });

  it('shows correct periods and totals, never NaN or Invalid Date', async () => {
    serve({status: releaseStatus([], [1, 2])});
    renderPage();

    await waitFor(() => expect(screen.getByText(formatMonthYear(`${YEAR}-01-01`))).toBeTruthy());
    expect(screen.getByText(formatMonthYear(`${YEAR}-02-01`))).toBeTruthy();
    expect(screen.getByText(formatCurrency(118000))).toBeTruthy();   // total earnings
    expect(screen.getByText(formatCurrency(59000))).toBeTruthy();    // average
    expect(document.body.textContent).not.toMatch(/NaN|Invalid Date/);
  });

  it('lets the employee search without throwing', async () => {
    serve({status: releaseStatus([], [1, 2])});
    renderPage();
    await waitFor(() => expect(screen.getByText(formatMonthYear(`${YEAR}-01-01`))).toBeTruthy());

    const input = screen.getByLabelText(/search payslips/i);
    expect(() => fireEvent.change(input, {target: {value: 'zzz-no-match'}})).not.toThrow();
    expect(screen.getByText(/No Payslips Found/i)).toBeTruthy();
  });

  it('shows a Released badge and never claims PAID', async () => {
    serve({status: releaseStatus([], [1, 2])});
    renderPage();
    await waitFor(() => expect(screen.getByText(formatMonthYear(`${YEAR}-01-01`))).toBeTruthy());

    expect(screen.getAllByText('Released').length).toBeGreaterThan(0);
    expect(document.body.textContent).not.toMatch(/\bPAID\b/);
  });

  it('explains unreleased periods with a count (singular)', async () => {
    serve({status: releaseStatus([3], [1, 2])});
    renderPage();

    expect(await screen.findByText(
      '1 period is not yet released. Your totals include released periods only.')).toBeTruthy();
  });

  it('explains unreleased periods with a count (plural)', async () => {
    serve({status: releaseStatus([3, 4], [1, 2])});
    renderPage();

    expect(await screen.findByText(
      '2 periods are not yet released. Your totals include released periods only.')).toBeTruthy();
  });

  it('shows no note when every period with a payslip is released', async () => {
    serve({status: releaseStatus([], [1, 2])});
    renderPage();
    await waitFor(() => expect(screen.getByText(formatMonthYear(`${YEAR}-01-01`))).toBeTruthy());

    expect(document.body.textContent).not.toMatch(/not yet released|not yet available/);
  });

  it('does not count months that simply have no payslip', async () => {
    serve({status: releaseStatus([], [1, 2])});   // months 3..12 are NO_PAYSLIP
    renderPage();
    await waitFor(() => expect(screen.getByText(formatMonthYear(`${YEAR}-01-01`))).toBeTruthy());

    expect(document.body.textContent).not.toMatch(/\d+ periods? (is|are) not yet released/);
  });

  it('shows no count (and no claim) when release status cannot be loaded', async () => {
    serve({status: new Error('boom')});
    renderPage();
    await waitFor(() => expect(screen.getByText(formatMonthYear(`${YEAR}-01-01`))).toBeTruthy());

    expect(document.body.textContent).not.toMatch(/\d+ periods? (is|are) not yet released/);
    expect(document.body.textContent).not.toMatch(/not yet available/);
  });

  it('uses the generic wording, without a count, when All Years is selected', async () => {
    serve({status: releaseStatus([3], [1, 2])});
    renderPage();
    await waitFor(() => expect(screen.getByText(formatMonthYear(`${YEAR}-01-01`))).toBeTruthy());

    fireEvent.change(screen.getByLabelText('Year'), {target: {value: '0'}});

    expect(await screen.findByText(
      'Some payslips are not yet available. Your totals include released periods only.')).toBeTruthy();
    expect(document.body.textContent).not.toMatch(/\d+ periods? (is|are) not yet released/);
  });
});
