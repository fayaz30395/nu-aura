import type {PerformanceReview} from '@/lib/types/grow/performance';

export interface EmployeePoint {
  employeeId: string;
  employeeName: string;
  performance: number; // 1-5
  potential: number; // 1-5
}

export type SortField = 'name' | 'performance' | 'potential';

export interface BoxMeta {
  label: string;
  sublabel: string;
  bg: string;
  border: string;
  text: string;
}

const DANGER = {
  bg: 'bg-danger-50 dark:bg-danger-900/10',
  border: 'border-danger-200 dark:border-danger-800',
  text: 'text-danger-700 dark:text-danger-400',
};
const WARNING = {
  bg: 'bg-warning-50 dark:bg-warning-900/10',
  border: 'border-warning-200 dark:border-warning-800',
  text: 'text-warning-700 dark:text-warning-400',
};
const ACCENT = {
  bg: 'bg-accent-50 dark:bg-accent-900/10',
  border: 'border-accent-200 dark:border-accent-800',
  text: 'text-accent-700 dark:text-accent-400',
};
const SUCCESS = {
  bg: 'bg-success-50 dark:bg-success-900/10',
  border: 'border-success-200 dark:border-success-800',
  text: 'text-success-700 dark:text-success-400',
};

/** Keyed by `${performanceBand}-${potentialBand}`. */
export const BOX_CONFIG: Record<string, BoxMeta> = {
  '1-1': {label: 'Deadwood', sublabel: 'Low Performance • Low Potential', ...DANGER},
  '2-1': {label: 'Dilemma', sublabel: 'Medium Performance • Low Potential', ...WARNING},
  '3-1': {label: 'Highly Skilled', sublabel: 'High Performance • Low Potential', ...WARNING},
  '1-2': {label: 'Inconsistent Player', sublabel: 'Low Performance • Medium Potential', ...WARNING},
  '2-2': {label: 'Core Player', sublabel: 'Medium Performance • Medium Potential', ...ACCENT},
  '3-2': {label: 'High Performer', sublabel: 'High Performance • Medium Potential', ...ACCENT},
  '1-3': {label: 'Growth Employee', sublabel: 'Low Performance • High Potential', ...ACCENT},
  '2-3': {label: 'Future Star', sublabel: 'Medium Performance • High Potential', ...SUCCESS},
  '3-3': {label: 'Star', sublabel: 'High Performance • High Potential', ...SUCCESS},
};

function toBand(value: number): 1 | 2 | 3 {
  if (value <= 2.33) return 1;
  if (value <= 3.66) return 2;
  return 3;
}

export function boxKey(perf: number, pot: number) {
  return `${toBand(perf)}-${toBand(pot)}`;
}

/** Performance = manager rating (falls back to self); potential = override, else derived from the self/manager gap. */
export function buildPoints(reviews: PerformanceReview[], potentialOverrides: Record<string, number>): EmployeePoint[] {
  const map = new Map<string, {name: string; selfRating: number | null; managerRating: number | null}>();
  for (const r of reviews) {
    if (!r.employeeId || !r.overallRating) continue;
    if (!map.has(r.employeeId))
      map.set(r.employeeId, {
        name: r.employeeName || r.employeeId,
        selfRating: null,
        managerRating: null,
      });
    const entry = map.get(r.employeeId)!;
    if (r.reviewType === 'SELF') entry.selfRating = r.overallRating;
    else if (r.reviewType === 'MANAGER') entry.managerRating = r.overallRating;
  }

  const result: EmployeePoint[] = [];
  for (const [empId, entry] of map.entries()) {
    const perf = entry.managerRating ?? entry.selfRating;
    if (!perf) continue;

    let potential = potentialOverrides[empId];
    if (potential == null) {
      if (entry.selfRating && entry.managerRating) {
        const delta = entry.selfRating - entry.managerRating;
        potential = Math.min(5, Math.max(1, perf + delta * 0.5 + 0.5));
      } else {
        potential = 3;
      }
    }
    result.push({
      employeeId: empId,
      employeeName: entry.name,
      performance: perf,
      potential,
    });
  }
  return result;
}

export function filterAndSortPoints(points: EmployeePoint[], searchQuery: string, sortField: SortField) {
  let result = [...points];

  if (searchQuery) {
    const query = searchQuery.toLowerCase();
    result = result.filter(p => p.employeeName.toLowerCase().includes(query));
  }

  result.sort((a, b) => {
    if (sortField === 'name') return a.employeeName.localeCompare(b.employeeName);
    if (sortField === 'performance') return a.performance - b.performance;
    return a.potential - b.potential;
  });

  return result;
}

export function groupByBox(points: EmployeePoint[]) {
  const groups: Record<string, EmployeePoint[]> = {};
  for (const p of points) {
    const key = boxKey(p.performance, p.potential);
    if (!groups[key]) groups[key] = [];
    groups[key].push(p);
  }
  return groups;
}

export function computeStats(points: EmployeePoint[]) {
  return {
    highPerformers: points.filter(p => p.performance > 3.5).length,
    highPotential: points.filter(p => p.potential > 3.5).length,
    stars: points.filter(p => p.performance > 3.5 && p.potential > 3.5).length,
  };
}

export function downloadNineBoxCsv(points: EmployeePoint[], cycleId: string) {
  const rows = points.map(p => {
    const meta = BOX_CONFIG[boxKey(p.performance, p.potential)];
    return [p.employeeName, p.performance.toFixed(1), p.potential.toFixed(1), meta?.label ?? ''].join(',');
  });
  const csv = ['Employee,Performance,Potential,Category', ...rows].join('\n');
  const blob = new Blob([csv], {type: 'text/csv'});
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `9box-${cycleId}.csv`;
  link.click();
}
