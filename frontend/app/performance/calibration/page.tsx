'use client';
import { AppLayout } from '@/components/layout';

import { useState, useMemo, useEffect } from 'react';
import {
  Download,
  Info,
  RefreshCw,
  AlertTriangle,
  Search,
  TrendingUp,
  Users,
  Target,
  BarChart3,
} from 'lucide-react';
import { usePerformanceAllCycles, useAllReviews, useUpdateReview } from '@/lib/hooks/queries/usePerformance';
import type { ReviewRequest } from '@/lib/types/grow/performance';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { PermissionGate } from '@/components/auth/PermissionGate';
import { Permissions } from '@/lib/hooks/usePermissions';

// ─── Types & Constants ────────────────────────────────────────────────────────

interface EmployeeRatingRow {
  employeeId: string;
  employeeName: string;
  department?: string;
  selfRating: number | null;
  managerRating: number | null;
  finalRating: number | null;
  reviewIds: string[];
}

type SortField = 'name' | 'rating' | 'department';
type SortOrder = 'asc' | 'desc';

const RATING_LABELS: Record<number, { label: string; color: string; bg: string }> = {
  1: { label: 'Needs Improvement', color: 'text-danger-700', bg: 'bg-danger-100' },
  2: { label: 'Below Expectations', color: 'text-warning-700', bg: 'bg-warning-100' },
  3: { label: 'Meets Expectations', color: 'text-warning-700', bg: 'bg-warning-100' },
  4: { label: 'Exceeds Expectations', color: 'text-accent-700', bg: 'bg-accent-100' },
  5: { label: 'Outstanding', color: 'text-success-700', bg: 'bg-success-100' },
};

// ─── Components ────────────────────────────────────────────────────────────────

function RatingBadge({ rating }: { rating: number | null }) {
  if (!rating) return <span className="text-[var(--text-muted)] text-sm">—</span>;
  const rounded = Math.round(rating);
  const meta = RATING_LABELS[rounded] || RATING_LABELS[3];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${meta.bg} ${meta.color}`}>
      <span className="font-bold">{rating.toFixed(1)}</span>
      <span className="hidden md:inline">{meta.label}</span>
    </span>
  );
}

function DistributionChart({
  counts,
  total,
  label,
}: {
  counts: Record<number, number>;
  total: number;
  label?: string;
}) {
  const ratings = [1, 2, 3, 4, 5];
  const colors = ['bg-danger-400', 'bg-warning-400', 'bg-warning-400', 'bg-accent-400', 'bg-success-400'];

  return (
    <div className="space-y-2">
      {label && <p className="text-sm font-semibold text-[var(--text-primary)]">{label}</p>}
      <div className="flex gap-1 h-10 rounded-lg overflow-hidden bg-[var(--bg-secondary)] dark:bg-[var(--bg-secondary)]">
        {ratings.map((r, i) => {
          const pct = total > 0 ? ((counts[r] || 0) / total) * 100 : 0;
          return (
            <div
              key={r}
              title={`Rating ${r}: ${counts[r] || 0} (${pct.toFixed(0)}%)`}
              className={`flex items-center justify-center text-white text-xs font-bold transition-all ${colors[i]}`}
              style={{ width: `${Math.max(pct, 2)}%`, minWidth: pct > 5 ? '32px' : 'auto' }}
            >
              {pct > 8 && counts[r]}
            </div>
          );
        })}
        {total === 0 && (
          <div className="bg-[var(--bg-secondary)] flex-1 flex items-center justify-center text-xs text-[var(--text-muted)]">
            No ratings
          </div>
        )}
      </div>
      <div className="flex gap-2 text-xs text-[var(--text-muted)] flex-wrap">
        {ratings.map((r, i) => (
          <span key={r} className="flex items-center gap-1">
            <span className={`inline-block w-2 h-2 rounded-md ${colors[i]}`} />
            {r}: {counts[r] || 0} ({total > 0 ? (((counts[r] || 0) / total) * 100).toFixed(0) : 0}%)
          </span>
        ))}
      </div>
    </div>
  );
}

function getBellCurveWarning({
  counts,
  total,
}: {
  counts: Record<number, number>;
  total: number;
}): string | null {
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

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CalibrationPage() {
  // React Query hooks
  const cyclesQuery = usePerformanceAllCycles(0, 100);
  const allReviewsQuery = useAllReviews(0, 500);
  const updateReviewMutation = useUpdateReview();

  // Local state
  const [selectedCycleId, setSelectedCycleId] = useState('');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [finalOverrides, setFinalOverrides] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [publishConfirm, setPublishConfirm] = useState(false);

  // Initialize selected cycle (moved to useEffect to avoid setState during render)
  useEffect(() => {
    if (!selectedCycleId && cyclesQuery.data?.content?.length > 0) {
      const cycles = cyclesQuery.data.content;
      const active = cycles.find(c => c.status === 'ACTIVE' || c.status === 'CALIBRATION');
      if (active) {
        setSelectedCycleId(active.id);
      } else if (cycles.length > 0) {
        setSelectedCycleId(cycles[0].id);
      }
    }
  }, [selectedCycleId, cyclesQuery.data]);

  // Filter reviews by selected cycle
  const reviews = useMemo(() => {
    if (!selectedCycleId || !allReviewsQuery.data?.content) return [];
    return allReviewsQuery.data.content.filter(
      r => (r.reviewCycleId || r.cycleId) === selectedCycleId
    );
  }, [selectedCycleId, allReviewsQuery.data]);

  // Build per-employee rows
  const rows = useMemo<EmployeeRatingRow[]>(() => {
    const map = new Map<string, EmployeeRatingRow>();
    for (const r of reviews) {
      if (!r.employeeId) continue;
      if (!map.has(r.employeeId)) {
        map.set(r.employeeId, {
          employeeId: r.employeeId,
          employeeName: r.employeeName || r.employeeId,
          department: r.department || 'Unknown',
          selfRating: null,
          managerRating: null,
          finalRating: null,
          reviewIds: [],
        });
      }
      const row = map.get(r.employeeId)!;
      row.reviewIds.push(r.id);
      const rating = r.overallRating ?? null;
      if (r.reviewType === 'SELF') row.selfRating = rating;
      else if (r.reviewType === 'MANAGER') row.managerRating = rating;
    }

    // Compute initial finalRating = manager rating ?? self rating
    for (const row of map.values()) {
      row.finalRating = row.managerRating ?? row.selfRating;
    }

    return Array.from(map.values());
  }, [reviews]);

  // Filter & Sort
  const filteredAndSorted = useMemo(() => {
    let result = [...rows];

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        r =>
          r.employeeName.toLowerCase().includes(query) ||
          r.department?.toLowerCase().includes(query)
      );
    }

    // Filter by department
    if (departmentFilter) {
      result = result.filter(r => r.department === departmentFilter);
    }

    // Sort
    result.sort((a, b) => {
      let aVal: string | number = '';
      let bVal: string | number = '';

      if (sortField === 'name') {
        aVal = a.employeeName;
        bVal = b.employeeName;
      } else if (sortField === 'rating') {
        aVal = finalOverrides[a.employeeId] ?? a.finalRating ?? 0;
        bVal = finalOverrides[b.employeeId] ?? b.finalRating ?? 0;
      } else if (sortField === 'department') {
        aVal = a.department || '';
        bVal = b.department || '';
      }

      const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return sortOrder === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [rows, searchQuery, departmentFilter, sortField, sortOrder, finalOverrides]);

  // Rating distribution
  const ratingCounts = useMemo(() => {
    const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const row of filteredAndSorted) {
      const r = finalOverrides[row.employeeId] ?? row.finalRating;
      if (r && r >= 1 && r <= 5) counts[Math.round(r)]++;
    }
    return counts;
  }, [filteredAndSorted, finalOverrides]);

  const totalRated = Object.values(ratingCounts).reduce((s, v) => s + v, 0);
  const curveWarning = getBellCurveWarning({ counts: ratingCounts, total: totalRated });

  const uniqueDepartments = useMemo(
    () => Array.from(new Set(rows.map(r => r.department).filter(Boolean))),
    [rows]
  );

  // Handle rating change
  const handleFinalRatingChange = (employeeId: string, value: string) => {
    const num = parseFloat(value);
    if (isNaN(num) || num < 1 || num > 5) return;
    setFinalOverrides(prev => ({ ...prev, [employeeId]: Math.round(num * 10) / 10 }));
  };

  // Save final rating
  const handleSaveFinal = async (row: EmployeeRatingRow) => {
    const final = finalOverrides[row.employeeId];
    if (!final) return;

    setSaving(row.employeeId);
    try {
      const managerReview = reviews.find(
        r => r.employeeId === row.employeeId && r.reviewType === 'MANAGER'
      );
      if (managerReview) {
        const updateData: ReviewRequest = {
          ...managerReview,
          overallRating: final,
          reviewerId: managerReview.reviewerId,
          employeeId: managerReview.employeeId,
          reviewType: managerReview.reviewType,
        };
        await updateReviewMutation.mutateAsync({ id: managerReview.id, data: updateData });
      }
    } finally {
      setSaving(null);
    }
  };

  // Export CSV
  const exportCsv = () => {
    const header = [
      'Employee Name',
      'Department',
      'Self Rating',
      'Manager Rating',
      'Final Rating',
    ].join(',');

    const rows = filteredAndSorted
      .map(r => [
        `"${r.employeeName}"`,
        `"${r.department || ''}"`,
        r.selfRating ?? '',
        r.managerRating ?? '',
        finalOverrides[r.employeeId] ?? r.finalRating ?? '',
      ].join(','))
      .join('\n');

    const csv = `${header}\n${rows}`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `calibration-${selectedCycleId}.csv`);
    link.click();
  };

  // Publish ratings (would be a real API call)
  const publishRatings = async () => {
    setPublishConfirm(true);
  };

  const handleConfirmPublish = async () => {
    // API call would go here
    setPublishConfirm(false);
  };

  const cycles = cyclesQuery.data?.content || [];
  const selectedCycle = cycles.find(c => c.id === selectedCycleId);
  const cyclesLoading = cyclesQuery.isLoading;
  const reviewsLoading = allReviewsQuery.isLoading;

  return (
    <AppLayout>
      <PermissionGate permission={Permissions.CALIBRATION_MANAGE} fallback={
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-[var(--text-secondary)] font-medium">Access Denied</p>
          <p className="text-[var(--text-muted)] text-sm mt-1">You do not have permission to view calibration data.</p>
        </div>
      }>
      <div className="min-h-screen bg-[var(--bg-secondary)]">
        <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold skeuo-emboss">
              Calibration & Distribution
            </h1>
            <p className="text-[var(--text-muted)] mt-1">
              Review and finalize employee performance ratings
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={exportCsv}
              disabled={filteredAndSorted.length === 0}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[var(--border-main)] dark:border-[var(--border-main)] bg-[var(--bg-input)] text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)] disabled:opacity-50 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
            >
              <Download size={16} />
              Export
            </button>
            <PermissionGate permission={Permissions.CALIBRATION_MANAGE}>
              <button
                onClick={publishRatings}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent-700 text-white text-sm font-medium hover:bg-accent-700 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
              >
                <TrendingUp size={16} />
                Publish
              </button>
            </PermissionGate>
          </div>
        </div>

        {/* Cycle Selector */}
        <div className="bg-[var(--bg-input)] border border-[var(--border-main)] rounded-lg p-4">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                Review Cycle
              </label>
              {cyclesLoading ? (
                <div className="h-10 bg-[var(--bg-secondary)] dark:bg-[var(--bg-secondary)] rounded-lg animate-pulse" />
              ) : (
                <select
                  value={selectedCycleId}
                  onChange={e => setSelectedCycleId(e.target.value)}
                  className="w-full px-4 py-2.5 border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-lg text-sm text-[var(--text-primary)] bg-[var(--bg-surface)] focus:outline-none focus:ring-2 focus:ring-accent-500/20 focus:border-accent-500"
                >
                  <option value="">Select a cycle</option>
                  {cycles.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.status})
                    </option>
                  ))}
                </select>
              )}
            </div>
            {selectedCycle && (
              <div className="flex items-center gap-4 md:mt-6">
                <span
                  className={`px-4 py-1.5 rounded-full text-xs font-semibold ${
                    selectedCycle.status === 'ACTIVE'
                      ? 'bg-success-100 dark:bg-success-900/30 text-success-700 dark:text-success-400'
                      : selectedCycle.status === 'CALIBRATION'
                        ? 'bg-accent-300 dark:bg-accent-900/30 text-accent-900 dark:text-accent-600'
                        : 'bg-[var(--bg-secondary)] dark:bg-[var(--bg-secondary)] text-[var(--text-secondary)]'
                  }`}
                >
                  {selectedCycle.status}
                </span>
              </div>
            )}
          </div>
        </div>

        {selectedCycleId && !reviewsLoading ? (
          <>
            {/* Distribution Overview */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Current vs Target */}
              <div className="bg-[var(--bg-input)] border border-[var(--border-main)] rounded-lg p-6 space-y-4">
                <div>
                  <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-3">
                    Current Distribution
                  </h2>
                  <DistributionChart
                    counts={ratingCounts}
                    total={totalRated}
                  />
                  <p className="text-xs text-[var(--text-muted)] mt-2">
                    {totalRated} of {filteredAndSorted.length} employees have ratings
                  </p>
                </div>
              </div>

              {/* Stats */}
              <div className="space-y-4">
                <div className="bg-[var(--bg-input)] border border-[var(--border-main)] rounded-lg p-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-accent-100 dark:bg-accent-900/30 flex items-center justify-center">
                      <Users className="text-accent-600 dark:text-accent-400" size={20} />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-[var(--text-muted)]">Total Employees</p>
                      <p className="text-2xl font-bold text-[var(--text-primary)] skeuo-emboss">
                        {filteredAndSorted.length}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-[var(--bg-input)] border border-[var(--border-main)] rounded-lg p-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-success-100 dark:bg-success-900/30 flex items-center justify-center">
                      <Target className="text-success-600 dark:text-success-400" size={20} />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-[var(--text-muted)]">Rated</p>
                      <p className="text-2xl font-bold text-[var(--text-primary)] skeuo-emboss">
                        {totalRated} ({Math.round((totalRated / Math.max(1, filteredAndSorted.length)) * 100)}%)
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-[var(--bg-input)] border border-[var(--border-main)] rounded-lg p-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-accent-300 dark:bg-accent-900/30 flex items-center justify-center">
                      <BarChart3 className="text-accent-800 dark:text-accent-600" size={20} />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-[var(--text-muted)]">Avg Rating</p>
                      <p className="text-2xl font-bold text-[var(--text-primary)] skeuo-emboss">
                        {totalRated > 0
                          ? (
                              Object.entries(ratingCounts).reduce(
                                (sum, [rating, count]) => sum + parseInt(rating) * count,
                                0
                              ) / totalRated
                            ).toFixed(1)
                          : '—'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bell Curve Warning */}
            {curveWarning && (
              <div className="flex items-start gap-4 bg-warning-50 dark:bg-warning-900/20 border border-warning-200 dark:border-warning-800 rounded-lg px-4 py-4">
                <AlertTriangle
                  size={16}
                  className="text-warning-600 dark:text-warning-400 flex-shrink-0 mt-0.5"
                />
                <div>
                  <p className="text-sm font-medium text-warning-900 dark:text-warning-200">
                    Bell Curve Alert
                  </p>
                  <p className="text-sm text-warning-800 dark:text-warning-300 mt-0.5">
                    {curveWarning}
                  </p>
                </div>
              </div>
            )}

            {/* Filters & Search */}
            <div className="space-y-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                  />
                  <input
                    type="text"
                    placeholder="Search employee..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-3 py-2.5 border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-lg bg-[var(--bg-surface)] text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-accent-500/20 focus:border-accent-500"
                  />
                </div>

                {uniqueDepartments.length > 0 && (
                  <select
                    value={departmentFilter}
                    onChange={e => setDepartmentFilter(e.target.value)}
                    className="px-4 py-2.5 border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-lg bg-[var(--bg-surface)] text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-accent-500/20 focus:border-accent-500"
                  >
                    <option value="">All Departments</option>
                    {uniqueDepartments.map(dept => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            {/* Employee Table */}
            {reviewsLoading ? (
              <div className="flex items-center justify-center py-16">
                <RefreshCw
                  size={24}
                  className="animate-spin text-accent-500 mr-3"
                />
                <span className="text-[var(--text-muted)]">Loading reviews...</span>
              </div>
            ) : filteredAndSorted.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center bg-[var(--bg-input)] rounded-lg border border-[var(--border-main)]">
                <Info size={32} className="text-[var(--text-muted)] mb-3" />
                <p className="text-[var(--text-secondary)] font-medium">
                  No reviews found
                </p>
                <p className="text-[var(--text-muted)] text-sm mt-1">
                  Activate the cycle to generate reviews for employees
                </p>
              </div>
            ) : (
              <div className="bg-[var(--bg-input)] border border-[var(--border-main)] rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-[var(--bg-secondary)] dark:bg-[var(--bg-secondary)] border-b border-[var(--border-main)]">
                        <th className="px-4 py-2 text-left font-semibold text-[var(--text-secondary)]">
                          <button
                            onClick={() => {
                              setSortField('name');
                              setSortOrder(sortOrder === 'asc' && sortField === 'name' ? 'desc' : 'asc');
                            }}
                            className="hover:text-[var(--text-primary)] dark:hover:text-white transition-colors flex items-center gap-1"
                          >
                            Employee
                            {sortField === 'name' && (sortOrder === 'asc' ? ' ↑' : ' ↓')}
                          </button>
                        </th>
                        <th className="px-4 py-2 text-left font-semibold text-[var(--text-secondary)]">
                          <button
                            onClick={() => {
                              setSortField('department');
                              setSortOrder(
                                sortOrder === 'asc' && sortField === 'department' ? 'desc' : 'asc'
                              );
                            }}
                            className="hover:text-[var(--text-primary)] dark:hover:text-white transition-colors"
                          >
                            Department
                            {sortField === 'department' && (sortOrder === 'asc' ? ' ↑' : ' ↓')}
                          </button>
                        </th>
                        <th className="px-4 py-2 text-center font-semibold text-[var(--text-secondary)]">
                          Self Rating
                        </th>
                        <th className="px-4 py-2 text-center font-semibold text-[var(--text-secondary)]">
                          Manager Rating
                        </th>
                        <th className="px-4 py-2 text-center font-semibold text-[var(--text-secondary)]">
                          <button
                            onClick={() => {
                              setSortField('rating');
                              setSortOrder(
                                sortOrder === 'asc' && sortField === 'rating' ? 'desc' : 'asc'
                              );
                            }}
                            className="hover:text-[var(--text-primary)] dark:hover:text-white transition-colors"
                          >
                            Final Rating
                            {sortField === 'rating' && (sortOrder === 'asc' ? ' ↑' : ' ↓')}
                          </button>
                        </th>
                        <th className="px-4 py-2 text-center font-semibold text-[var(--text-secondary)]">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-100 dark:divide-surface-700">
                      {filteredAndSorted.map(row => {
                        const finalVal = finalOverrides[row.employeeId] ?? row.finalRating;
                        const isDirty =
                          finalOverrides[row.employeeId] != null &&
                          finalOverrides[row.employeeId] !== row.finalRating;
                        const differsFromManager =
                          row.managerRating != null &&
                          row.selfRating != null &&
                          Math.abs(row.managerRating - row.selfRating) > 0.5;

                        return (
                          <tr
                            key={row.employeeId}
                            className={`hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)] transition-colors ${
                              isDirty ? 'bg-warning-50 dark:bg-warning-900/10' : ''
                            } ${differsFromManager ? 'border-l-2 border-warning-400' : ''}`}
                          >
                            <td className="px-4 py-4 font-medium text-[var(--text-primary)]">
                              {row.employeeName}
                            </td>
                            <td className="px-4 py-4 text-[var(--text-secondary)] text-sm">
                              {row.department}
                            </td>
                            <td className="px-4 py-4 text-center">
                              <RatingBadge rating={row.selfRating} />
                            </td>
                            <td className="px-4 py-4 text-center">
                              <RatingBadge rating={row.managerRating} />
                            </td>
                            <td className="px-4 py-4 text-center">
                              <input
                                type="number"
                                min={1}
                                max={5}
                                step={0.5}
                                value={finalVal ?? ''}
                                onChange={e =>
                                  handleFinalRatingChange(row.employeeId, e.target.value)
                                }
                                placeholder="1–5"
                                className="w-20 text-center px-2 py-1.5 border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-lg text-sm bg-[var(--bg-surface)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-accent-500/20 focus:border-accent-500"
                              />
                            </td>
                            <td className="px-4 py-4 text-center">
                              {isDirty && (
                                <PermissionGate permission={Permissions.CALIBRATION_MANAGE}>
                                  <button
                                    onClick={() => handleSaveFinal(row)}
                                    disabled={saving === row.employeeId}
                                    className="px-4 py-1 text-xs font-medium text-white bg-accent-700 hover:bg-accent-700 rounded-lg disabled:opacity-50 transition-colors"
                                  >
                                    {saving === row.employeeId ? 'Saving...' : 'Save'}
                                  </button>
                                </PermissionGate>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        ) : !selectedCycleId && !cyclesLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-center bg-[var(--bg-input)] rounded-lg border border-[var(--border-main)]">
            <Info size={32} className="text-[var(--text-muted)] mb-3" />
            <p className="text-[var(--text-secondary)] font-medium">
              No review cycle selected
            </p>
            <p className="text-[var(--text-muted)] text-sm mt-1">
              Select a review cycle to see the calibration view
            </p>
          </div>
        ) : null}
        </div>
      </div>

      {/* Publish Ratings Confirmation */}
      <ConfirmDialog
        isOpen={publishConfirm}
        onClose={() => setPublishConfirm(false)}
        onConfirm={handleConfirmPublish}
        title="Publish Ratings"
        message="Publish calibrated ratings? This will notify all employees of their final performance ratings."
        confirmText="Publish"
        type="warning"
      />
      </PermissionGate>
    </AppLayout>
  );
}
