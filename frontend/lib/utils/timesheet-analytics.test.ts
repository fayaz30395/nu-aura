import {describe, expect, it} from 'vitest';
import {isPastDue, summarizeProjectTime, summarizeWeeks} from './timesheet-analytics';
import type {TimeEntry, Timesheet} from '@/lib/types/hrms/timesheet';

const ts = (o: Partial<Timesheet>): Timesheet => ({
  id: 't', tenantId: 'x', employeeId: 'e', weekStartDate: '2026-11-02', weekEndDate: '2026-11-08',
  totalHours: 0, status: 'DRAFT', createdAt: '', ...o,
});
const entry = (o: Partial<TimeEntry>): TimeEntry => ({
  id: 'i', tenantId: 'x', timesheetId: 't', employeeId: 'e', projectId: 'p1',
  entryDate: '2026-11-03', hours: 1, isBillable: true, createdAt: '', ...o,
});

describe('isPastDue', () => {
  it('flags only drafts whose week ended', () => {
    expect(isPastDue(ts({}), '2026-11-09')).toBe(true);
    expect(isPastDue(ts({}), '2026-11-08')).toBe(false);
    expect(isPastDue(ts({status: 'SUBMITTED'}), '2026-12-01')).toBe(false);
  });
});

describe('summarizeWeeks', () => {
  it('sorts by week and derives non-billable when absent', () => {
    const rows = summarizeWeeks([
      ts({id: 'b', weekStartDate: '2026-11-09', totalHours: 40, billableHours: 30, nonBillableHours: 10}),
      ts({id: 'a', weekStartDate: '2026-11-02', totalHours: 20, billableHours: 12}),
    ]);
    expect(rows.map((r) => r.id)).toEqual(['a', 'b']);
    expect(rows[0]).toMatchObject({billable: 12, nonBillable: 8, total: 20});
  });
});

describe('summarizeProjectTime', () => {
  it('splits billable, filters by range, sorts by total', () => {
    const rows = summarizeProjectTime([
      entry({projectId: 'p1', hours: 4}),
      entry({projectId: 'p1', hours: 2, isBillable: false}),
      entry({projectId: 'p2', hours: 8}),
      entry({projectId: 'p2', hours: 5, entryDate: '2026-10-01'}),
    ], '2026-11-01', '2026-11-30');
    expect(rows).toEqual([
      {projectId: 'p2', billable: 8, nonBillable: 0, total: 8},
      {projectId: 'p1', billable: 4, nonBillable: 2, total: 6},
    ]);
  });
});
