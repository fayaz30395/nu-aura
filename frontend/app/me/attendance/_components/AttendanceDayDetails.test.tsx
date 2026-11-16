import {render, screen} from '@testing-library/react';
import {describe, expect, it, vi} from 'vitest';
import {AttendanceDayDetails} from './AttendanceDayDetails';
import type {AttendanceRecord} from '@/lib/types/hrms/attendance';

const PAST = new Date(2020, 0, 10);

function record(overrides: Partial<AttendanceRecord>): AttendanceRecord {
  return {
    id: 'r1',
    employeeId: 'e1',
    attendanceDate: '2020-01-10',
    checkInTime: '2020-01-10T09:00:00',
    status: 'PRESENT',
    ...overrides,
  } as AttendanceRecord;
}

function renderDetails(selectedDate: Date, selectedAttendance: AttendanceRecord) {
  return render(
    <AttendanceDayDetails
      selectedDate={selectedDate}
      selectedAttendance={selectedAttendance}
      timeEntries={[]}
      isLoadingTimeEntries={false}
      onRequestRegularization={vi.fn()}
    />
  );
}

describe('AttendanceDayDetails regularise button', () => {
  it('shows Regularise for a past record with no check-out', () => {
    renderDetails(PAST, record({}));
    expect(screen.getByTestId('att-regularise-2020-01-10')).toBeTruthy();
  });

  it('hides Regularise for today even when check-out is missing', () => {
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    renderDetails(today, record({attendanceDate: todayStr}));
    expect(screen.queryByTestId(`att-regularise-${todayStr}`)).toBeNull();
  });

  it('hides Regularise when the record has a check-out', () => {
    renderDetails(PAST, record({checkOutTime: '2020-01-10T18:00:00'}));
    expect(screen.queryByTestId('att-regularise-2020-01-10')).toBeNull();
  });
});
