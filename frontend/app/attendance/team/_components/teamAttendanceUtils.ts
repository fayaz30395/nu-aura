import {AttendanceRecord} from '@/lib/types/hrms/attendance';

export interface StatusStats {
  present: number;
  absent: number;
  late: number;
  onLeave: number;
  halfDay: number;
  total: number;
}

export type SortKey = 'employeeId' | 'checkInTime' | 'checkOutTime' | 'totalWorkHours' | 'status';

export interface SortConfig {
  key: SortKey | null;
  direction: 'asc' | 'desc';
}

export const STATUS_FILTER_OPTIONS = [
  {value: 'all', label: 'All statuses'},
  {value: 'PRESENT', label: 'Present'},
  {value: 'ABSENT', label: 'Absent'},
  {value: 'LATE', label: 'Late'},
  {value: 'LEAVE', label: 'Leave'},
  {value: 'HALF_DAY', label: 'Half Day'},
];

export function formatClock(dateString?: string): string {
  if (!dateString) return '--:--';
  return new Date(dateString).toLocaleTimeString('en-US', {hour: '2-digit', minute: '2-digit'});
}

export function formatSource(source?: string): string {
  return source ? source.substring(0, 1).toUpperCase() + source.substring(1).toLowerCase() : 'N/A';
}

export function workPercent(record: AttendanceRecord): number {
  return Math.min(((record.totalWorkHours || 0) / 8) * 100, 100);
}

export function computeStatusStats(records: AttendanceRecord[]): StatusStats {
  return {
    present: records.filter((r) => r.status === 'PRESENT').length,
    absent: records.filter((r) => r.status === 'ABSENT').length,
    late: records.filter((r) => r.status === 'LATE').length,
    onLeave: records.filter((r) => r.status === 'LEAVE' || r.status === 'ON_LEAVE').length,
    halfDay: records.filter((r) => r.status === 'HALF_DAY').length,
    total: records.length,
  };
}

export function filterAndSort(
  records: AttendanceRecord[],
  searchTerm: string,
  statusFilter: string,
  sort: SortConfig
): AttendanceRecord[] {
  const filtered = records.filter((record) => {
    const matchesSearch = record.employeeId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || record.status === statusFilter;
    return matchesSearch && matchesStatus;
  });
  if (sort.key === null) return filtered;
  const key = sort.key;
  return filtered.sort((a, b) => {
    const aValue = a[key];
    const bValue = b[key];
    if (aValue === null || aValue === undefined) return 1;
    if (bValue === null || bValue === undefined) return -1;
    if (typeof aValue === 'string') {
      return sort.direction === 'asc' ? aValue.localeCompare(String(bValue)) : String(bValue).localeCompare(aValue);
    }
    if (typeof aValue === 'number') {
      return sort.direction === 'asc' ? aValue - (bValue as number) : (bValue as number) - aValue;
    }
    return 0;
  });
}

export function exportTeamCsv(records: AttendanceRecord[], date: string) {
  const headers = ['Employee ID', 'Check-In', 'Check-Out', 'Work Hours', 'Status', 'Late (min)', 'Source'];
  const rows = records.map((record) => [
    record.employeeId,
    formatClock(record.checkInTime),
    formatClock(record.checkOutTime),
    record.totalWorkHours?.toFixed(2) || '--',
    record.status || 'PRESENT',
    record.lateByMinutes || '--',
    record.checkInSource || 'N/A',
  ]);
  const csv = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');
  const url = window.URL.createObjectURL(new Blob([csv], {type: 'text/csv'}));
  const a = document.createElement('a');
  a.href = url;
  a.download = `team-attendance-${date}.csv`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}
