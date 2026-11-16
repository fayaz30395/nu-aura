import {describe, expect, it} from 'vitest';
import {addDaysToDateString, mapEntriesToNextWeek} from './timesheet-copy';
import type {TimeEntry} from '@/lib/types/hrms/timesheet';

const e = (projectId: string, entryDate: string, hours = 4, workDescription?: string) =>
  ({projectId, entryDate, hours, isBillable: true, workDescription}) as TimeEntry;

describe('addDaysToDateString', () => {
  it('crosses month and year boundaries', () => {
    expect(addDaysToDateString('2026-12-28', 7)).toBe('2027-01-04');
  });
});

describe('mapEntriesToNextWeek', () => {
  it('shifts dates by 7 days and keeps project and hours', () => {
    const out = mapEntriesToNextWeek([e('p1', '2026-11-09', 6)], [], 'emp');
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({projectId: 'p1', entryDate: '2026-11-16', hours: 6, employeeId: 'emp'});
  });

  it('skips days that already have an entry for that project only', () => {
    const out = mapEntriesToNextWeek(
      [e('p1', '2026-11-09'), e('p2', '2026-11-09')],
      [{projectId: 'p1', entryDate: '2026-11-16'}],
      'emp',
    );
    expect(out.map(o => o.projectId)).toEqual(['p2']);
  });

  it('copies descriptions only when asked', () => {
    const prev = [e('p1', '2026-11-09', 4, 'work')];
    expect(mapEntriesToNextWeek(prev, [], 'emp')[0].workDescription).toBeUndefined();
    expect(mapEntriesToNextWeek(prev, [], 'emp', true)[0].workDescription).toBe('work');
  });

  it('returns empty for no previous entries', () => {
    expect(mapEntriesToNextWeek([], [], 'emp')).toEqual([]);
  });
});
