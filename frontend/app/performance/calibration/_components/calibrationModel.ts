import type {PerformanceReview} from '@/lib/types/grow/performance';

export interface EmployeeRatingRow {
  employeeId: string;
  employeeName: string;
  department?: string;
  selfRating: number | null;
  managerRating: number | null;
  finalRating: number | null;
  reviewIds: string[];
}

export type SortField = 'name' | 'rating' | 'department';
export type SortOrder = 'asc' | 'desc';
export type RatingCounts = Record<number, number>;

export const RATINGS = [1, 2, 3, 4, 5] as const;

export const RATING_LABELS: Record<number, { label: string; color: string; bg: string }> = {
  1: {label: 'Needs Improvement', color: 'text-danger-700', bg: 'bg-danger-100'},
  2: {label: 'Below Expectations', color: 'text-warning-700', bg: 'bg-warning-100'},
  3: {label: 'Meets Expectations', color: 'text-warning-700', bg: 'bg-warning-100'},
  4: {label: 'Exceeds Expectations', color: 'text-accent-700', bg: 'bg-accent-100'},
  5: {label: 'Outstanding', color: 'text-success-700', bg: 'bg-success-100'},
};

export function buildEmployeeRows(reviews: PerformanceReview[]): EmployeeRatingRow[] {
  const map = new Map<string, EmployeeRatingRow>();
  for (const r of reviews) {
    if (!r.employeeId) continue;
    let row = map.get(r.employeeId);
    if (!row) {
      row = {
        employeeId: r.employeeId,
        employeeName: r.employeeName || r.employeeId,
        department: r.department || 'Unknown',
        selfRating: null,
        managerRating: null,
        finalRating: null,
        reviewIds: [],
      };
      map.set(r.employeeId, row);
    }
    row.reviewIds.push(r.id);
    const rating = r.overallRating ?? null;
    if (r.reviewType === 'SELF') row.selfRating = rating;
    else if (r.reviewType === 'MANAGER') row.managerRating = rating;
  }
  for (const row of map.values()) {
    row.finalRating = row.managerRating ?? row.selfRating;
  }
  return Array.from(map.values());
}

export function filterAndSortRows(
  rows: EmployeeRatingRow[],
  {search, department, sortField, sortOrder, overrides}: {
    search: string;
    department: string;
    sortField: SortField;
    sortOrder: SortOrder;
    overrides: Record<string, number>;
  },
): EmployeeRatingRow[] {
  const query = search.toLowerCase();
  const result = rows.filter((r) =>
    (!query || r.employeeName.toLowerCase().includes(query) || r.department?.toLowerCase().includes(query)) &&
    (!department || r.department === department));

  const valueOf = (r: EmployeeRatingRow): string | number => {
    if (sortField === 'rating') return overrides[r.employeeId] ?? r.finalRating ?? 0;
    if (sortField === 'department') return r.department || '';
    return r.employeeName;
  };

  return result.sort((a, b) => {
    const aVal = valueOf(a);
    const bVal = valueOf(b);
    const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
    return sortOrder === 'asc' ? cmp : -cmp;
  });
}

export function countRatings(rows: EmployeeRatingRow[], overrides: Record<string, number>): RatingCounts {
  const counts: RatingCounts = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0};
  for (const row of rows) {
    const r = overrides[row.employeeId] ?? row.finalRating;
    if (r && r >= 1 && r <= 5) counts[Math.round(r)]++;
  }
  return counts;
}

export function getBellCurveWarning(counts: RatingCounts, total: number): string | null {
  if (total < 5) return null;
  const top = ((counts[5] || 0) / total) * 100;
  const bottom = ((counts[1] || 0) / total) * 100;
  const mid = ((counts[3] || 0) / total) * 100;

  const issues: string[] = [];
  if (top > 20) issues.push(`${top.toFixed(0)}% rated Outstanding (target ≤10%)`);
  if (bottom > 20) issues.push(`${bottom.toFixed(0)}% rated Needs Improvement (target ≤10%)`);
  if (mid < 30) issues.push(`Only ${mid.toFixed(0)}% in middle band (target ~40%)`);

  return issues.length > 0 ? `Bell curve warning: ${issues.join(' • ')}` : null;
}

export function downloadCalibrationCsv(
  rows: EmployeeRatingRow[],
  overrides: Record<string, number>,
  cycleId: string,
): void {
  const header = ['Employee Name', 'Department', 'Self Rating', 'Manager Rating', 'Final Rating'].join(',');
  const body = rows
    .map((r) => [
      `"${r.employeeName}"`,
      `"${r.department || ''}"`,
      r.selfRating ?? '',
      r.managerRating ?? '',
      overrides[r.employeeId] ?? r.finalRating ?? '',
    ].join(','))
    .join('\n');

  const blob = new Blob([`${header}\n${body}`], {type: 'text/csv;charset=utf-8;'});
  const link = document.createElement('a');
  link.setAttribute('href', URL.createObjectURL(blob));
  link.setAttribute('download', `calibration-${cycleId}.csv`);
  link.click();
}
