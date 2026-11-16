import type {TimeEntry, Timesheet} from '@/lib/types/hrms/timesheet';

export interface WeekSummaryRow {
  id: string;
  weekStartDate: string;
  weekEndDate: string;
  billable: number;
  nonBillable: number;
  total: number;
  status: Timesheet['status'];
}

export interface ProjectTimeRow {
  projectId: string;
  billable: number;
  nonBillable: number;
  total: number;
}

const round = (n: number): number => Math.round(n * 100) / 100;

/** A timesheet is past due when it is still a draft and its week has ended (dates are YYYY-MM-DD). */
export function isPastDue(ts: Pick<Timesheet, 'status' | 'weekEndDate'>, today: string): boolean {
  return ts.status === 'DRAFT' && ts.weekEndDate.slice(0, 10) < today;
}

/** Weekly billable / non-billable totals, oldest week first. Missing split falls back to total minus billable. */
export function summarizeWeeks(timesheets: readonly Timesheet[]): WeekSummaryRow[] {
  return timesheets
    .map((ts) => {
      const total = ts.totalHours ?? 0;
      const billable = ts.billableHours ?? 0;
      const nonBillable = ts.nonBillableHours ?? Math.max(total - billable, 0);
      return {
        id: ts.id,
        weekStartDate: ts.weekStartDate,
        weekEndDate: ts.weekEndDate,
        billable: round(billable),
        nonBillable: round(nonBillable),
        total: round(total),
        status: ts.status,
      };
    })
    .sort((a, b) => a.weekStartDate.localeCompare(b.weekStartDate));
}

/** Hours per project for entries whose date falls in [from, to] inclusive; biggest project first. */
export function summarizeProjectTime(entries: readonly TimeEntry[], from: string, to: string): ProjectTimeRow[] {
  const byProject = new Map<string, ProjectTimeRow>();
  for (const e of entries) {
    const day = e.entryDate.slice(0, 10);
    if (day < from || day > to) continue;
    const row = byProject.get(e.projectId) ?? {projectId: e.projectId, billable: 0, nonBillable: 0, total: 0};
    byProject.set(e.projectId, {
      ...row,
      billable: row.billable + (e.isBillable ? e.hours : 0),
      nonBillable: row.nonBillable + (e.isBillable ? 0 : e.hours),
      total: row.total + e.hours,
    });
  }
  return [...byProject.values()]
    .map((r) => ({...r, billable: round(r.billable), nonBillable: round(r.nonBillable), total: round(r.total)}))
    .sort((a, b) => b.total - a.total);
}
