'use client';

import { useState, useEffect, useMemo } from 'react';
import { AppLayout } from '@/components/layout';
import { reviewCycleService, reviewService } from '@/lib/services/performance.service';
import { ReviewCycle, PerformanceReview } from '@/lib/types/performance';
import { AlertTriangle, CheckCircle, Download, RefreshCw, Info } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface EmployeeRatingRow {
  employeeId: string;
  employeeName: string;
  selfRating: number | null;
  managerRating: number | null;
  finalRating: number | null;
  reviewIds: string[];
}

const RATING_LABELS: Record<number, { label: string; color: string; bg: string }> = {
  1: { label: 'Needs Improvement', color: 'text-red-700',    bg: 'bg-red-100' },
  2: { label: 'Below Expectations', color: 'text-orange-700', bg: 'bg-orange-100' },
  3: { label: 'Meets Expectations', color: 'text-yellow-700', bg: 'bg-yellow-100' },
  4: { label: 'Exceeds Expectations', color: 'text-blue-700',  bg: 'bg-blue-100' },
  5: { label: 'Outstanding',          color: 'text-green-700', bg: 'bg-green-100' },
};

function RatingBadge({ rating }: { rating: number | null }) {
  if (!rating) return <span className="text-surface-400 text-sm">—</span>;
  const meta = RATING_LABELS[Math.round(rating)] || RATING_LABELS[3];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${meta.bg} ${meta.color}`}>
      <span className="font-bold">{rating.toFixed(1)}</span>
      <span className="hidden sm:inline">· {meta.label}</span>
    </span>
  );
}

function DistributionBar({ counts, total }: { counts: Record<number, number>; total: number }) {
  const bars = [1, 2, 3, 4, 5];
  const colors = ['bg-red-400', 'bg-orange-400', 'bg-yellow-400', 'bg-blue-400', 'bg-green-400'];

  return (
    <div className="space-y-2">
      <div className="flex gap-1 h-8 rounded-lg overflow-hidden">
        {bars.map((r, i) => {
          const pct = total > 0 ? ((counts[r] || 0) / total) * 100 : 0;
          if (pct === 0) return null;
          return (
            <div
              key={r}
              title={`Rating ${r}: ${counts[r] || 0} (${pct.toFixed(0)}%)`}
              className={`${colors[i]} flex items-center justify-center text-white text-xs font-bold transition-all`}
              style={{ width: `${pct}%`, minWidth: pct > 0 ? '28px' : 0 }}
            >
              {counts[r] || 0}
            </div>
          );
        })}
        {total === 0 && (
          <div className="bg-surface-200 flex-1 flex items-center justify-center text-xs text-surface-400">
            No ratings yet
          </div>
        )}
      </div>
      <div className="flex gap-3 text-xs text-surface-500 flex-wrap">
        {bars.map((r, i) => (
          <span key={r} className="flex items-center gap-1">
            <span className={`inline-block w-2.5 h-2.5 rounded-sm ${colors[i]}`} />
            {r} – {counts[r] || 0}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Curve Warning ────────────────────────────────────────────────────────────

function bellCurveWarning(counts: Record<number, number>, total: number): string | null {
  if (total < 5) return null;
  const top = ((counts[5] || 0) / total) * 100;
  const bottom = ((counts[1] || 0) / total) * 100;
  if (top > 20) return `${top.toFixed(0)}% of employees rated Outstanding — typical bell curves have ≤10% at the top.`;
  if (bottom > 20) return `${bottom.toFixed(0)}% rated Needs Improvement — review if calibration is needed.`;
  return null;
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CalibrationPage() {
  const [cycles, setCycles] = useState<ReviewCycle[]>([]);
  const [selectedCycleId, setSelectedCycleId] = useState('');
  const [reviews, setReviews] = useState<PerformanceReview[]>([]);
  const [cyclesLoading, setCyclesLoading] = useState(true);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Local final rating overrides (editable in UI, not yet persisted to a separate endpoint)
  const [finalOverrides, setFinalOverrides] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState<string | null>(null);

  // Load cycles on mount
  useEffect(() => {
    setCyclesLoading(true);
    reviewCycleService.getAll(0, 100)
      .then(res => {
        const all = res.content;
        setCycles(all);
        const active = all.find(c => c.status === 'ACTIVE' || c.status === 'CALIBRATION');
        if (active) setSelectedCycleId(active.id);
        else if (all.length > 0) setSelectedCycleId(all[0].id);
      })
      .catch(() => setError('Failed to load review cycles'))
      .finally(() => setCyclesLoading(false));
  }, []);

  // Load reviews when cycle changes
  useEffect(() => {
    if (!selectedCycleId) return;
    setReviewsLoading(true);
    setError(null);
    // Fetch a large page — in production this should be paginated
    reviewService.getAllReviews(0, 500)
      .then(res => {
        const filtered = res.content.filter(r => (r.reviewCycleId || r.cycleId) === selectedCycleId);
        setReviews(filtered);
        setFinalOverrides({});
      })
      .catch(() => setError('Failed to load reviews for this cycle'))
      .finally(() => setReviewsLoading(false));
  }, [selectedCycleId]);

  // Build per-employee rows
  const rows = useMemo<EmployeeRatingRow[]>(() => {
    const map = new Map<string, EmployeeRatingRow>();
    for (const r of reviews) {
      if (!r.employeeId) continue;
      if (!map.has(r.employeeId)) {
        map.set(r.employeeId, {
          employeeId: r.employeeId,
          employeeName: r.employeeName || r.employeeId,
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
    return Array.from(map.values()).sort((a, b) =>
      (a.employeeName || '').localeCompare(b.employeeName || '')
    );
  }, [reviews]);

  // Rating distribution using finalOverrides if set
  const ratingCounts = useMemo(() => {
    const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const row of rows) {
      const r = finalOverrides[row.employeeId] ?? row.finalRating;
      if (r && r >= 1 && r <= 5) counts[Math.round(r)]++;
    }
    return counts;
  }, [rows, finalOverrides]);

  const totalRated = Object.values(ratingCounts).reduce((s, v) => s + v, 0);
  const curveWarning = bellCurveWarning(ratingCounts, totalRated);

  const handleFinalRatingChange = (employeeId: string, value: string) => {
    const num = parseFloat(value);
    if (isNaN(num) || num < 1 || num > 5) return;
    setFinalOverrides(prev => ({ ...prev, [employeeId]: Math.round(num * 10) / 10 }));
  };

  const handleSaveFinal = async (row: EmployeeRatingRow) => {
    const final = finalOverrides[row.employeeId];
    if (!final) return;
    setSaving(row.employeeId);
    try {
      // Update the manager review with the calibrated final rating
      const managerReview = reviews.find(r => r.employeeId === row.employeeId && r.reviewType === 'MANAGER');
      if (managerReview) {
        await reviewService.update(managerReview.id, {
          ...managerReview,
          overallRating: final,
          reviewerId: managerReview.reviewerId,
          employeeId: managerReview.employeeId,
          reviewType: managerReview.reviewType,
        } as any);
      }
    } catch {
      // Silently fail — final overrides are still kept in local state
    } finally {
      setSaving(null);
    }
  };

  const exportCsv = () => {
    const header = ['Employee', 'Self Rating', 'Manager Rating', 'Final Rating'];
    const csvRows = rows.map(r => [
      r.employeeName,
      r.selfRating ?? '',
      r.managerRating ?? '',
      finalOverrides[r.employeeId] ?? r.finalRating ?? '',
    ]);
    const csv = [header, ...csvRows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `calibration-${selectedCycleId}.csv`;
    a.click();
  };

  const selectedCycle = cycles.find(c => c.id === selectedCycleId);

  return (
    <AppLayout
      activeMenuItem="performance"
      breadcrumbs={[
        { label: 'Performance', href: '/performance' },
        { label: 'Calibration' },
      ]}
    >
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-surface-900">Calibration View</h1>
            <p className="text-sm text-surface-500 mt-0.5">
              Review and finalize employee ratings across the organization
            </p>
          </div>
          <button
            onClick={exportCsv}
            disabled={rows.length === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-surface-300 bg-white text-sm font-medium text-surface-700 hover:bg-surface-50 disabled:opacity-50 transition-colors"
          >
            <Download size={15} />
            Export CSV
          </button>
        </div>

        {/* Cycle Selector */}
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-surface-700 whitespace-nowrap">Review Cycle</label>
          {cyclesLoading ? (
            <div className="h-9 w-64 bg-surface-100 animate-pulse rounded-lg" />
          ) : (
            <select
              value={selectedCycleId}
              onChange={e => setSelectedCycleId(e.target.value)}
              className="w-72 px-3 py-2 border border-surface-300 rounded-lg text-sm text-surface-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
            >
              <option value="">Select a cycle</option>
              {cycles.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.status})
                </option>
              ))}
            </select>
          )}
          {selectedCycle && (
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
              selectedCycle.status === 'ACTIVE' ? 'bg-green-100 text-green-700' :
              selectedCycle.status === 'CALIBRATION' ? 'bg-purple-100 text-purple-700' :
              'bg-surface-100 text-surface-600'
            }`}>
              {selectedCycle.status}
            </span>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 flex items-center gap-2">
            <AlertTriangle size={15} />
            {error}
          </div>
        )}

        {selectedCycleId && !reviewsLoading && (
          <>
            {/* Distribution Bar */}
            <div className="bg-white border border-surface-200 rounded-xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-surface-800">
                  Rating Distribution — {totalRated} of {rows.length} employees rated
                </h2>
                <span className="text-xs text-surface-400">{rows.length} total in cycle</span>
              </div>
              <DistributionBar counts={ratingCounts} total={totalRated} />

              {curveWarning && (
                <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 text-xs text-amber-800">
                  <AlertTriangle size={13} className="mt-0.5 flex-shrink-0 text-amber-600" />
                  {curveWarning}
                </div>
              )}
            </div>

            {/* Employee Table */}
            {reviewsLoading ? (
              <div className="flex items-center justify-center py-16">
                <RefreshCw size={24} className="animate-spin text-primary-500 mr-3" />
                <span className="text-surface-500">Loading reviews...</span>
              </div>
            ) : rows.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-14 h-14 rounded-full bg-surface-100 flex items-center justify-center mb-3">
                  <Info size={24} className="text-surface-400" />
                </div>
                <p className="text-surface-600 font-medium">No reviews found for this cycle</p>
                <p className="text-surface-400 text-sm mt-1">
                  Activate the cycle first to generate reviews for employees.
                </p>
              </div>
            ) : (
              <div className="bg-white border border-surface-200 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-surface-50 border-b border-surface-200">
                      <th className="px-4 py-3 text-left font-semibold text-surface-700">Employee</th>
                      <th className="px-4 py-3 text-center font-semibold text-surface-700">Self Rating</th>
                      <th className="px-4 py-3 text-center font-semibold text-surface-700">Manager Rating</th>
                      <th className="px-4 py-3 text-center font-semibold text-surface-700">Final Rating</th>
                      <th className="px-4 py-3 text-center font-semibold text-surface-700">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-100">
                    {rows.map(row => {
                      const finalVal = finalOverrides[row.employeeId] ?? row.finalRating;
                      const isDirty = finalOverrides[row.employeeId] != null &&
                        finalOverrides[row.employeeId] !== row.finalRating;
                      return (
                        <tr key={row.employeeId} className="hover:bg-surface-50 transition-colors">
                          <td className="px-4 py-3 font-medium text-surface-900">
                            {row.employeeName}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <RatingBadge rating={row.selfRating} />
                          </td>
                          <td className="px-4 py-3 text-center">
                            <RatingBadge rating={row.managerRating} />
                          </td>
                          <td className="px-4 py-3 text-center">
                            <input
                              type="number"
                              min={1}
                              max={5}
                              step={0.5}
                              value={finalVal ?? ''}
                              onChange={e => handleFinalRatingChange(row.employeeId, e.target.value)}
                              placeholder="1–5"
                              className="w-16 text-center px-2 py-1 border border-surface-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                            />
                          </td>
                          <td className="px-4 py-3 text-center">
                            {isDirty && (
                              <button
                                onClick={() => handleSaveFinal(row)}
                                disabled={saving === row.employeeId}
                                className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg disabled:opacity-50 transition-colors mx-auto"
                              >
                                {saving === row.employeeId ? (
                                  <RefreshCw size={11} className="animate-spin" />
                                ) : (
                                  <CheckCircle size={11} />
                                )}
                                Save
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {!selectedCycleId && !cyclesLoading && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-14 h-14 rounded-full bg-surface-100 flex items-center justify-center mb-3">
              <Info size={24} className="text-surface-400" />
            </div>
            <p className="text-surface-600 font-medium">No review cycle selected</p>
            <p className="text-surface-400 text-sm mt-1">
              Select a review cycle to see the calibration view.
            </p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}