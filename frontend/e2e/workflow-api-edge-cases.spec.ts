import {expect, request as playwrightRequest, test, type APIRequestContext, type APIResponse} from '@playwright/test';
import {demoUsers} from './fixtures/testData';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080/api/v1';

interface EmployeeMe {
  id: string;
  workEmail?: string;
  email?: string;
}

interface LeaveType {
  id: string;
  leaveCode?: string;
  leaveName?: string;
}

interface ApiUser {
  api: APIRequestContext;
  employee: EmployeeMe;
  csrfToken: string;
}

function futureDate(daysOffset: number): string {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  return date.toISOString().split('T')[0];
}

function expectDenied(response: APIResponse): void {
  expect(
    [401, 403, 404],
    `Expected access denial, got HTTP ${response.status()}`
  ).toContain(response.status());
}

function csrfHeaders(user: ApiUser): Record<string, string> {
  return {'X-XSRF-TOKEN': user.csrfToken};
}

async function apiUser(email: string, password: string): Promise<ApiUser> {
  const loginApi = await playwrightRequest.newContext({baseURL: `${API_BASE}/`});
  const loginResponse = await loginApi.post('auth/login', {
    data: {email, password},
    failOnStatusCode: false,
  });
  expect(loginResponse.status(), await loginResponse.text()).toBe(200);
  const state = await loginApi.storageState();
  const csrfToken = state.cookies.find((cookie) => cookie.name === 'XSRF-TOKEN')?.value;
  expect(csrfToken, `csrf token for ${email}`).toBeTruthy();
  const meResponse = await loginApi.get('employees/me', {failOnStatusCode: false});
  expect(meResponse.status(), `GET /employees/me for ${email}`).toBe(200);
  const employee = await meResponse.json() as EmployeeMe;
  return {api: loginApi, employee, csrfToken: csrfToken as string};
}

async function getLeaveTypeId(api: APIRequestContext): Promise<string> {
  const response = await api.get('leave-types/active', {
    failOnStatusCode: false,
  });
  expect(response.status(), 'GET /leave-types/active').toBe(200);
  const leaveTypes = await response.json() as LeaveType[];
  const preferred = leaveTypes.find((type) =>
    /CASUAL|ANNUAL/i.test(`${type.leaveCode ?? ''} ${type.leaveName ?? ''}`)
  );
  const selected = preferred ?? leaveTypes[0];
  expect(selected?.id, 'At least one active leave type must exist').toBeTruthy();
  return selected.id;
}

test.describe('Workflow API edge cases @rbac @critical', () => {
  test('leave requests reject employeeId spoofing but allow self-service creation', async () => {
    const target = await apiUser(demoUsers.employeeSaran.email, demoUsers.employeeSaran.password);
    const requester = await apiUser(demoUsers.employeeRaj.email, demoUsers.employeeRaj.password);
    const leaveTypeId = await getLeaveTypeId(requester.api);
    const startDate = futureDate(140 + new Date().getSeconds());

    const spoofResponse = await requester.api.post('leave-requests', {
      headers: csrfHeaders(requester),
      data: {
        employeeId: target.employee.id,
        leaveTypeId,
        startDate,
        endDate: startDate,
        totalDays: 1,
        reason: 'API edge case should not allow another employee leave request',
      },
      failOnStatusCode: false,
    });
    expectDenied(spoofResponse);

    const ownResponse = await requester.api.post('leave-requests', {
      headers: csrfHeaders(requester),
      data: {
        employeeId: requester.employee.id,
        leaveTypeId,
        startDate: futureDate(142 + new Date().getSeconds()),
        endDate: futureDate(142 + new Date().getSeconds()),
        totalDays: 1,
        reason: 'API edge case should allow own employee leave request',
      },
      failOnStatusCode: false,
    });
    expect(ownResponse.status(), await ownResponse.text()).toBe(201);
    await target.api.dispose();
    await requester.api.dispose();
  });

  test('time tracking entries cannot be read or mutated by another employee', async () => {
    const owner = await apiUser(demoUsers.employeeSaran.email, demoUsers.employeeSaran.password);
    const other = await apiUser(demoUsers.employeeRaj.email, demoUsers.employeeRaj.password);
    const entryDate = futureDate(35 + new Date().getSeconds());
    const createResponse = await owner.api.post('time-tracking/entries', {
      headers: csrfHeaders(owner),
      data: {
        entryDate,
        hoursWorked: 2,
        billableHours: 2,
        isBillable: false,
        entryType: 'REGULAR',
        description: 'API edge case owned time entry',
      },
      failOnStatusCode: false,
    });
    expect(createResponse.status(), await createResponse.text()).toBe(201);
    const created = await createResponse.json() as { id: string };

    const readResponse = await other.api.get(`time-tracking/entries/${created.id}`, {
      failOnStatusCode: false,
    });
    expectDenied(readResponse);

    const updateResponse = await other.api.put(`time-tracking/entries/${created.id}`, {
      headers: csrfHeaders(other),
      data: {
        entryDate,
        hoursWorked: 3,
        billableHours: 3,
        isBillable: false,
        entryType: 'REGULAR',
        description: 'API edge case attempted overwrite',
      },
      failOnStatusCode: false,
    });
    expectDenied(updateResponse);

    const deleteResponse = await other.api.delete(`time-tracking/entries/${created.id}`, {
      headers: csrfHeaders(other),
      failOnStatusCode: false,
    });
    expectDenied(deleteResponse);
    await owner.api.dispose();
    await other.api.dispose();
  });

  test('payroll and payslip APIs enforce self-service and process permissions', async () => {
    const target = await apiUser(demoUsers.employeeArun.email, demoUsers.employeeArun.password);
    const other = await apiUser(demoUsers.employeeBharath.email, demoUsers.employeeBharath.password);

    const otherPayslips = await other.api.get(
      `payroll/payslips/employee/${target.employee.id}`,
      {failOnStatusCode: false}
    );
    expectDenied(otherPayslips);

    const createRun = await other.api.post('payroll/runs', {
      headers: csrfHeaders(other),
      data: {
        payPeriodMonth: 12,
        payPeriodYear: 2026,
        payrollDate: '2026-12-31',
        remarks: 'Employee must not be able to create payroll runs',
      },
      failOnStatusCode: false,
    });
    expectDenied(createRun);
    await target.api.dispose();
    await other.api.dispose();
  });

  test('employees cannot mutate onboarding or offboarding workflows directly', async () => {
    const target = await apiUser(demoUsers.employeeSaran.email, demoUsers.employeeSaran.password);
    const actor = await apiUser(demoUsers.employeeRaj.email, demoUsers.employeeRaj.password);

    const onboarding = await actor.api.post('onboarding/processes', {
      headers: csrfHeaders(actor),
      data: {
        employeeId: target.employee.id,
        processType: 'ONBOARDING',
        startDate: futureDate(5),
        expectedCompletionDate: futureDate(20),
        notes: 'Employee must not directly start onboarding',
      },
      failOnStatusCode: false,
    });
    expectDenied(onboarding);

    const offboarding = await actor.api.post('exit/processes', {
      headers: csrfHeaders(actor),
      data: {
        employeeId: target.employee.id,
        exitType: 'RESIGNATION',
        resignationDate: futureDate(1),
        lastWorkingDate: futureDate(45),
        noticePeriodDays: 45,
        noticePeriodServed: 0,
        reasonForLeaving: 'Employee must not directly initiate another employee offboarding',
      },
      failOnStatusCode: false,
    });
    expectDenied(offboarding);
    await target.api.dispose();
    await actor.api.dispose();
  });
});
