import type {CreateTimeEntryRequest, TimeEntry} from '@/lib/types/hrms/timesheet';

/** Adds days to a YYYY-MM-DD string without timezone drift. */
export function addDaysToDateString(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number);
  const out = new Date(Date.UTC(y, m - 1, d + days));
  return out.toISOString().slice(0, 10);
}

/**
 * Maps last week's entries to new entries for this week (same project, same weekday, same hours).
 * Skips a day when this week already has an entry for that project. Descriptions are copied only on request.
 */
export function mapEntriesToNextWeek(
  previous: readonly TimeEntry[],
  current: readonly Pick<TimeEntry, 'projectId' | 'entryDate'>[],
  employeeId: string,
  includeDescriptions = false,
): CreateTimeEntryRequest[] {
  const taken = new Set(current.map(e => `${e.projectId}|${e.entryDate}`));
  const result: CreateTimeEntryRequest[] = [];
  for (const e of previous) {
    const entryDate = addDaysToDateString(e.entryDate, 7);
    const key = `${e.projectId}|${entryDate}`;
    if (taken.has(key)) continue;
    taken.add(key);
    result.push({
      employeeId,
      projectId: e.projectId,
      taskId: e.taskId,
      entryDate,
      hours: e.hours,
      isBillable: e.isBillable,
      activityType: e.activityType,
      isOvertime: e.isOvertime,
      ...(includeDescriptions && e.workDescription ? {workDescription: e.workDescription} : {}),
    });
  }
  return result;
}
