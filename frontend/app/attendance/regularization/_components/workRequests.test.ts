import {describe, expect, it} from 'vitest';
import {validateWorkRequest} from './workRequests';

const TODAY = '2026-11-16';
const ok = {startDate: '2026-11-16', endDate: '2026-11-18', reason: 'Plumber visit'};

describe('validateWorkRequest', () => {
  it('accepts a valid range', () => {
    expect(validateWorkRequest('WORK_FROM_HOME', ok, TODAY)).toBeNull();
  });

  it('rejects missing dates', () => {
    expect(validateWorkRequest('ON_DUTY', {...ok, endDate: ''}, TODAY)).toMatch(/start and end/);
  });

  it('rejects end before start', () => {
    expect(validateWorkRequest('ON_DUTY', {...ok, endDate: '2026-11-15'}, TODAY)).toMatch(/End date/);
  });

  it('requires a single day for remote clock-in', () => {
    expect(validateWorkRequest('REMOTE_CLOCK_IN', ok, TODAY)).toMatch(/single day/);
    expect(validateWorkRequest('REMOTE_CLOCK_IN', {...ok, endDate: ok.startDate}, TODAY)).toBeNull();
  });

  it('caps the range at 31 days', () => {
    expect(validateWorkRequest('WORK_FROM_HOME', {...ok, endDate: '2026-12-17'}, TODAY)).toMatch(/more than 31/);
    expect(validateWorkRequest('WORK_FROM_HOME', {...ok, endDate: '2026-12-16'}, TODAY)).toBeNull();
  });

  it('rejects starts more than 30 days back', () => {
    const old = {...ok, startDate: '2026-10-16', endDate: '2026-10-16'};
    expect(validateWorkRequest('ON_DUTY', old, TODAY)).toMatch(/past/);
    expect(validateWorkRequest('ON_DUTY', {...old, startDate: '2026-10-17', endDate: '2026-10-17'}, TODAY)).toBeNull();
  });

  it('rejects short reasons', () => {
    expect(validateWorkRequest('ON_DUTY', {...ok, reason: ' ab '}, TODAY)).toMatch(/at least 5/);
  });
});
