'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { AppLayout } from '@/components/layout';
import { reviewCycleService, reviewService } from '@/lib/services/performance.service';
import { ReviewCycle, PerformanceReview } from '@/lib/types/performance';
import { Download, Info, RefreshCw } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface EmployeePoint {
  employeeId: string;
  employeeName: string;
  /** X-axis: Performance rating 1-5 from manager/self review */
  performance: number;
  /** Y-axis: Potential — HR-entered override or derived from self vs manager delta */
  potential: number;
}

// 9-box cell definitions (3x3 grid)
// col = performance band (1=low, 2=mid, 3=high), row = potential band (3=top, 1=bottom in display)
const BOX_META: Record<string, { label: string; sublabel: string; bg: string; border: string; text: string }> = {
  '1-1': { label: 'Deadwood',        sublabel: 'Low perf · Low potential',   bg: 'bg-red-50',     border: 'border-red-200',    text: 'text-red-700' },
  '2-1': { label: 'Dilemma',         sublabel: 'Mid perf · Low potential',   bg: 'bg-orange-50',  border: 'border-orange-200', text: 'text-orange-700' },
  '3-1': { label: 'Highly Skilled',  sublabel: 'High perf · Low potential',  bg: 'bg-yellow-50',  border: 'border-yellow-200', text: 'text-yellow-700' },
  '1-2': { label: 'Inconsistent Player', sublabel: 'Low perf · Mid potential',  bg: 'bg-amber-50',   border: 'border-amber-200',  text: 'text-amber-700' },
  '2-2': { label: 'Core Player',     sublabel: 'Mid perf · Mid potential',   bg: 'bg-blue-50',    border: 'border-blue-200',   text: 'text-blue-700' },
  '3-2': { label: 'High Performer',  sublabel: 'High perf · Mid potential',  bg: 'bg-indigo-50',  border: 'border-indigo-200', text: 'text-indigo-700' },
  '1-3': { label: 'Growth Employee', sublabel: 'Low perf · High potential',  bg: 'bg-teal-50',    border: 'border-teal-200',   text: 'text-teal-700' },
  '2-3': { label: 'Future Star',     sublabel: 'Mid perf · High potential',  bg: 'bg-green-50',   border: 'border-green-200',  text: 'text-green-700' },
  '3-3': { label: 'Star',            sublabel: 'High perf · High potential', bg: 'bg-emerald-50', border: 'border-emerald-200',text: 'text-emerald-700' },
};

/** Map 1-5 rating to 1-3 band */
function toBand(value: number): 1 | 2 | 3 {
  if (value <= 2.33) return 1;
  if (value <= 3.66) return 2;
  return 3;
}

function boxKey(perf: number, pot: number) {
  return `${toBand(perf)}-${toBand(pot)}`;
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function NineBoxPage() {
  const [cycles, setCycles] = useState<ReviewCycle[]>([]);
  const [selectedCycleId, setSelectedCycleId] = useState('');
  const [reviews, setReviews] = useState<PerformanceReview[]>([]);
  const [cyclesLoading, setCyclesLoading] = useState(true);
  const [reviewsLoading, setReviewsLoading] = useState(false);

  // HR can override potential scores locally
  const [potentialOverrides, setPotentialOverrides] = useState<Record<string, number>>({});
  const [selectedBox, setSelectedBox] = useState<string | null>(null);

  const exportRef = useRef<HTMLDivElement>(null);

  // Load cycles
  useEffect(() => {
    reviewCycleService.getAll(0, 100)
      .then(res => {
        const all = res.content;
        setCycles(all);
        const active = all.find(c => c.status === 'ACTIVE' || c.status === 'CALIBRATION');
        if (active) setSelectedCycleId(active.id);
        else if (all.length > 0) setSelectedCycleId(all[0].id);
      })
      .finally(() => setCyclesLoading(false));
  }, []);

  // Load reviews when cycle changes
  useEffect(() => {
    if (!selectedCycleId) return;
    setReviewsLoading(true);
    reviewService.getAllReviews(0, 500)
      .then(res => {
        const filtered = res.content.filter(r => (r.reviewCycleId || r.cycleId) === selectedCycleId);
        setReviews(filtered);
        setPotentialOverrides({});
        setSelectedBox(null);
      })
      .finally(() => setReviewsLoading(false));
  }, [selectedCycleId]);

  // Build employee points
  const points = useMemo<EmployeePoint[]>(() => {
    const map = new Map<string, { name: string; selfRating: number | null; managerRating: number | null }>();
    for (const r of reviews) {
      if (!r.employeeId || !r.overallRating) continue;
      if (!map.has(r.employeeId)) map.set(r.employeeId, { name: r.employeeName || r.employeeId, selfRating: null, managerRating: null });
      const entry = map.get(r.employeeId)!;
      if (r.reviewType === 'SELF') entry.selfRating = r.overallRating;
      else if (r.reviewType === 'MANAGER') entry.managerRating = r.overallRating;
    }

    const result: EmployeePoint[] = [];
    for (const [empId, entry] of map.entries()) {
      const perf = entry.managerRating ?? entry.selfRating;
      if (!perf) continue;
      // Potential: override > derived (self - manager delta indicates ambition) > default to midpoint
      let potential = potentialOverrides[empId];
      if (potential == null) {
        if (entry.selfRating && entry.managerRating) {
          // Higher self-assessment vs manager rating = higher perceived potential
          const delta = entry.selfRating - entry.managerRating;
          potential = Math.min(5, Math.max(1, perf + delta * 0.5 + 0.5));
        } else {
          potential = 3; // default midpoint
        }
      }
      result.push({ employeeId: empId, employeeName: entry.name, performance: perf, potential });
    }
    return result;
  }, [reviews, potentialOverrides]);

  // Group by box
  const byBox = useMemo(() => {
    const groups: Record<string, EmployeePoint[]> = {};
    for (const p of points) {
      const key = boxKey(p.performance, p.potential);
      if (!groups[key]) groups[key] = [];
      groups[key].push(p);
    }
    return groups;
  }, [points]);

  const selectedBoxPoints = selectedBox ? (byBox[selectedBox] || []) : null;

  const exportCsv = () => {
    const rows = points.map(p => [p.employeeName, p.performance.toFixed(1), p.potential.toFixed(1), BOX_META[boxKey(p.performance, p.potential)]?.label ?? ''].join(','));
    const csv = ['Employee,Performance,Potential,9-Box Category', ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `9box-${selectedCycleId}.csv`;
    a.click();
  };

  // Grid layout: rows = potential bands (high → low), cols = performance bands (low → high)
  const gridRows: Array<{ potBand: 1 | 2 | 3; label: string }> = [
    { potBand: 3, label: 'High Potential' },
    { potBand: 2, label: 'Mid Potential' },
    { potBand: 1, label: 'Low Potential' },
  ];
  const gridCols: Array<{ perfBand: 1 | 2 | 3; label: string }> = [
    { perfBand: 1, label: 'Low (1–2.3)' },
    { perfBand: 2, label: 'Mid (2.4–3.7)' },
    { perfBand: 3, label: 'High (3.8–5)' },
  ];

  return (
    <AppLayout
      activeMenuItem="performance"
      breadcrumbs={[
        { label: 'Performance', href: '/performance' },
        { label: '9-Box Grid' },
      ]}
    >
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-surface-900">9-Box Grid</h1>
            <p className="text-sm text-surface-500 mt-0.5">
              Talent segmentation by performance and potential
            </p>
          </div>
          <button
            onClick={exportCsv}
            disabled={points.length === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-surface-300 bg-white text-sm font-medium text-surface-700 hover:bg-surface-50 disabled:opacity-50 transition-colors"
          >
            <Download size={15} />
            Export CSV
          </button>
        </div>

        {/* Cycle selector */}
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
                <option key={c.id} value={c.id}>{c.name} ({c.status})</option>
              ))}
            </select>
          )}
          <span className="text-xs text-surface-400">{points.length} employees plotted</span>
        </div>

        {/* Info banner */}
        <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-xs text-blue-800">
          <Info size={13} className="mt-0.5 flex-shrink-0" />
          <span>
            <strong>X-axis:</strong> Performance = manager review rating (falls back to self-review).&nbsp;
            <strong>Y-axis:</strong> Potential = derived from self-vs-manager gap (you can override below).
            Click any cell to see employees in that quadrant.
          </span>
        </div>

        {reviewsLoading ? (
          <div className="flex items-center justify-center py-20">
            <RefreshCw size={24} className="animate-spin text-primary-500 mr-3" />
            <span className="text-surface-500">Loading reviews...</span>
          </div>
        ) : points.length === 0 && selectedCycleId ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-14 h-14 rounded-full bg-surface-100 flex items-center justify-center mb-3">
              <Info size={24} className="text-surface-400" />
            </div>
            <p className="text-surface-600 font-medium">No rated reviews found for this cycle</p>
            <p className="text-surface-400 text-sm mt-1">Complete reviews with overall ratings to populate the grid.</p>
          </div>
        ) : selectedCycleId ? (
          <div className="space-y-6" ref={exportRef}>
            {/* 9-Box Grid */}
            <div className="bg-white border border-surface-200 rounded-xl p-4 overflow-x-auto">
              <div className="flex gap-2">
                {/* Y-axis label */}
                <div className="flex flex-col items-center justify-center w-6 flex-shrink-0">
                  <span
                    className="text-xs font-semibold text-surface-500 whitespace-nowrap"
                    style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
                  >
                    POTENTIAL ↑
                  </span>
                </div>

                <div className="flex-1 min-w-[480px]">
                  {/* Grid rows */}
                  {gridRows.map(({ potBand, label: potLabel }) => (
                    <div key={potBand} className="flex gap-2 mb-2">
                      {/* Y-axis label per row */}
                      <div className="w-24 flex-shrink-0 flex items-center justify-end pr-2">
                        <span className="text-xs text-surface-400 text-right leading-tight">{potLabel}</span>
                      </div>

                      {/* 3 cells */}
                      {gridCols.map(({ perfBand }) => {
                        const key = `${perfBand}-${potBand}`;
                        const meta = BOX_META[key];
                        const cellPoints = byBox[key] || [];
                        const isSelected = selectedBox === key;

                        return (
                          <div
                            key={key}
                            onClick={() => setSelectedBox(isSelected ? null : key)}
                            className={`flex-1 min-h-[110px] rounded-xl border-2 p-3 cursor-pointer transition-all hover:shadow-md ${meta.bg} ${meta.border} ${isSelected ? 'ring-2 ring-primary-500 ring-offset-1' : ''}`}
                          >
                            <div className="flex items-start justify-between mb-2">
                              <span className={`text-xs font-semibold leading-tight ${meta.text}`}>
                                {meta.label}
                              </span>
                              <span className={`text-lg font-bold ml-1 ${meta.text}`}>
                                {cellPoints.length}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {cellPoints.slice(0, 6).map(p => (
                                <span
                                  key={p.employeeId}
                                  className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${meta.bg} ${meta.border} ${meta.text}`}
                                  title={`${p.employeeName} — Perf: ${p.performance.toFixed(1)}, Pot: ${p.potential.toFixed(1)}`}
                                >
                                  {p.employeeName.split(' ').map(w => w[0]).join('').slice(0, 3)}
                                </span>
                              ))}
                              {cellPoints.length > 6 && (
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${meta.text} opacity-60`}>
                                  +{cellPoints.length - 6}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}

                  {/* X-axis labels */}
                  <div className="flex gap-2 ml-26 mt-1" style={{ marginLeft: '7rem' }}>
                    {gridCols.map(({ perfBand, label }) => (
                      <div key={perfBand} className="flex-1 text-center text-xs text-surface-400">
                        {label}
                      </div>
                    ))}
                  </div>
                  <div className="text-center text-xs font-semibold text-surface-500 mt-1">
                    PERFORMANCE →
                  </div>
                </div>
              </div>
            </div>

            {/* Selected box detail */}
            {selectedBox && selectedBoxPoints && (
              <div className="bg-white border border-surface-200 rounded-xl p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`px-3 py-1.5 rounded-lg border ${BOX_META[selectedBox].bg} ${BOX_META[selectedBox].border}`}>
                    <span className={`text-sm font-semibold ${BOX_META[selectedBox].text}`}>
                      {BOX_META[selectedBox].label}
                    </span>
                  </div>
                  <span className="text-sm text-surface-500">{BOX_META[selectedBox].sublabel}</span>
                  <span className="ml-auto text-sm font-semibold text-surface-700">{selectedBoxPoints.length} employees</span>
                </div>

                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-surface-50 border-b border-surface-200">
                      <th className="px-4 py-2.5 text-left font-semibold text-surface-700">Employee</th>
                      <th className="px-4 py-2.5 text-center font-semibold text-surface-700">Performance</th>
                      <th className="px-4 py-2.5 text-center font-semibold text-surface-700">Potential (override)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-100">
                    {selectedBoxPoints.map(p => (
                      <tr key={p.employeeId} className="hover:bg-surface-50 transition-colors">
                        <td className="px-4 py-2.5 font-medium text-surface-900">{p.employeeName}</td>
                        <td className="px-4 py-2.5 text-center text-surface-700">{p.performance.toFixed(1)}</td>
                        <td className="px-4 py-2.5 text-center">
                          <input
                            type="number"
                            min={1} max={5} step={0.5}
                            value={potentialOverrides[p.employeeId] ?? p.potential.toFixed(1)}
                            onChange={e => {
                              const v = parseFloat(e.target.value);
                              if (!isNaN(v) && v >= 1 && v <= 5) {
                                setPotentialOverrides(prev => ({ ...prev, [p.employeeId]: v }));
                              }
                            }}
                            className="w-16 text-center px-2 py-1 border border-surface-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="text-xs text-surface-400 mt-3">
                  Changing potential scores here will re-plot employees in the grid instantly.
                </p>
              </div>
            )}

            {/* Summary table */}
            <div className="bg-white border border-surface-200 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-surface-800 mb-4">All Employees</h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-surface-50 border-b border-surface-200">
                    <th className="px-4 py-2.5 text-left font-semibold text-surface-700">Employee</th>
                    <th className="px-4 py-2.5 text-center font-semibold text-surface-700">Performance</th>
                    <th className="px-4 py-2.5 text-center font-semibold text-surface-700">Potential</th>
                    <th className="px-4 py-2.5 text-center font-semibold text-surface-700">Category</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100">
                  {points.map(p => {
                    const key = boxKey(p.performance, p.potential);
                    const meta = BOX_META[key];
                    return (
                      <tr key={p.employeeId} className="hover:bg-surface-50 transition-colors">
                        <td className="px-4 py-2.5 font-medium text-surface-900">{p.employeeName}</td>
                        <td className="px-4 py-2.5 text-center text-surface-700">{p.performance.toFixed(1)}</td>
                        <td className="px-4 py-2.5 text-center">
                          <input
                            type="number" min={1} max={5} step={0.5}
                            value={potentialOverrides[p.employeeId] ?? p.potential.toFixed(1)}
                            onChange={e => {
                              const v = parseFloat(e.target.value);
                              if (!isNaN(v) && v >= 1 && v <= 5) {
                                setPotentialOverrides(prev => ({ ...prev, [p.employeeId]: v }));
                              }
                            }}
                            className="w-16 text-center px-2 py-1 border border-surface-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                          />
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${meta?.bg} ${meta?.text}`}>
                            {meta?.label ?? '—'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </div>
    </AppLayout>
  );
}
