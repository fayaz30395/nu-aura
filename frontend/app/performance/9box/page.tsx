'use client';
import { AppLayout } from '@/components/layout';

import { useState, useMemo } from 'react';
import {
  Download,
  Info,
  RefreshCw,
  Search,
  Maximize2,
  Grid3x3,
  Users,
  TrendingUp,
  Target,
} from 'lucide-react';
import { usePerformanceAllCycles, useAllReviews } from '@/lib/hooks/queries/usePerformance';
import type { ReviewCycle, PerformanceReview } from '@/lib/types/performance';

// ─── Types & Constants ────────────────────────────────────────────────────────

interface EmployeePoint {
  employeeId: string;
  employeeName: string;
  performance: number; // 1-5
  potential: number; // 1-5
}

type SortField = 'name' | 'performance' | 'potential';

const BOX_CONFIG: Record<string, { label: string; sublabel: string; bg: string; border: string; text: string }> = {
  '1-1': { label: 'Deadwood', sublabel: 'Low Performance • Low Potential', bg: 'bg-red-50 dark:bg-red-900/10', border: 'border-red-200 dark:border-red-800', text: 'text-red-700 dark:text-red-400' },
  '2-1': { label: 'Dilemma', sublabel: 'Medium Performance • Low Potential', bg: 'bg-orange-50 dark:bg-orange-900/10', border: 'border-orange-200 dark:border-orange-800', text: 'text-orange-700 dark:text-orange-400' },
  '3-1': { label: 'Highly Skilled', sublabel: 'High Performance • Low Potential', bg: 'bg-yellow-50 dark:bg-yellow-900/10', border: 'border-yellow-200 dark:border-yellow-800', text: 'text-yellow-700 dark:text-yellow-400' },
  '1-2': { label: 'Inconsistent Player', sublabel: 'Low Performance • Medium Potential', bg: 'bg-amber-50 dark:bg-amber-900/10', border: 'border-amber-200 dark:border-amber-800', text: 'text-amber-700 dark:text-amber-400' },
  '2-2': { label: 'Core Player', sublabel: 'Medium Performance • Medium Potential', bg: 'bg-blue-50 dark:bg-blue-900/10', border: 'border-blue-200 dark:border-blue-800', text: 'text-blue-700 dark:text-blue-400' },
  '3-2': { label: 'High Performer', sublabel: 'High Performance • Medium Potential', bg: 'bg-indigo-50 dark:bg-indigo-900/10', border: 'border-indigo-200 dark:border-indigo-800', text: 'text-indigo-700 dark:text-indigo-400' },
  '1-3': { label: 'Growth Employee', sublabel: 'Low Performance • High Potential', bg: 'bg-teal-50 dark:bg-teal-900/10', border: 'border-teal-200 dark:border-teal-800', text: 'text-teal-700 dark:text-teal-400' },
  '2-3': { label: 'Future Star', sublabel: 'Medium Performance • High Potential', bg: 'bg-green-50 dark:bg-green-900/10', border: 'border-green-200 dark:border-green-800', text: 'text-green-700 dark:text-green-400' },
  '3-3': { label: 'Star', sublabel: 'High Performance • High Potential', bg: 'bg-emerald-50 dark:bg-emerald-900/10', border: 'border-emerald-200 dark:border-emerald-800', text: 'text-emerald-700 dark:text-emerald-400' },
};

function toBand(value: number): 1 | 2 | 3 {
  if (value <= 2.33) return 1;
  if (value <= 3.66) return 2;
  return 3;
}

function boxKey(perf: number, pot: number) {
  return `${toBand(perf)}-${toBand(pot)}`;
}

// ─── Components ────────────────────────────────────────────────────────────────

function NineBoxGrid({
  points,
  byBox,
  selectedBox,
  onSelectBox,
}: {
  points: EmployeePoint[];
  byBox: Record<string, EmployeePoint[]>;
  selectedBox: string | null;
  onSelectBox: (box: string | null) => void;
}) {
  const gridRows = [
    { potBand: 3, label: 'High Potential' },
    { potBand: 2, label: 'Medium Potential' },
    { potBand: 1, label: 'Low Potential' },
  ];

  const gridCols = [
    { perfBand: 1, label: 'Low (1.0–2.3)' },
    { perfBand: 2, label: 'Medium (2.4–3.7)' },
    { perfBand: 3, label: 'High (3.8–5.0)' },
  ];

  return (
    <div className="bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg p-6 overflow-x-auto">
      <div className="flex gap-4 min-w-max">
        {/* Y-axis */}
        <div className="flex flex-col items-center justify-start w-6 flex-shrink-0">
          <span className="text-xs font-semibold text-surface-500 mt-2" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
            POTENTIAL ↑
          </span>
        </div>

        {/* Grid */}
        <div className="flex-1">
          {/* Rows (potential high to low) */}
          {gridRows.map(({ potBand, label: potLabel }) => (
            <div key={potBand} className="flex gap-3 mb-3">
              {/* Potential label */}
              <div className="w-28 flex-shrink-0 flex items-center justify-end pr-3">
                <span className="text-xs text-surface-400 text-right font-medium">{potLabel}</span>
              </div>

              {/* 3 cells */}
              {gridCols.map(({ perfBand }) => {
                const key = `${perfBand}-${potBand}`;
                const meta = BOX_CONFIG[key];
                const cellPoints = byBox[key] || [];
                const isSelected = selectedBox === key;

                return (
                  <div
                    key={key}
                    onClick={() => onSelectBox(isSelected ? null : key)}
                    className={`flex-1 min-w-[140px] min-h-[140px] rounded-xl border-2 p-3 cursor-pointer transition-all hover:shadow-lg ${meta.bg} ${meta.border} ${
                      isSelected
                        ? 'ring-2 ring-primary-500 ring-offset-2 dark:ring-offset-surface-800'
                        : ''
                    }`}
                  >
                    <div className="flex flex-col h-full">
                      <div className="flex items-start justify-between mb-2">
                        <span className={`text-xs font-bold leading-tight flex-1 ${meta.text}`}>
                          {meta.label}
                        </span>
                        <span className={`text-lg font-bold ml-1 ${meta.text}`}>
                          {cellPoints.length}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1 flex-1">
                        {cellPoints.slice(0, 8).map((p, idx) => {
                          const initials = p.employeeName
                            .split(' ')
                            .map(w => w[0])
                            .join('')
                            .slice(0, 2)
                            .toUpperCase();
                          return (
                            <span
                              key={p.employeeId}
                              className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold border ${meta.bg} ${meta.border} ${meta.text} whitespace-nowrap`}
                              title={`${p.employeeName} — Perf: ${p.performance.toFixed(1)}, Pot: ${p.potential.toFixed(1)}`}
                            >
                              {initials}
                            </span>
                          );
                        })}
                        {cellPoints.length > 8 && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${meta.text} opacity-60 font-semibold`}>
                            +{cellPoints.length - 8}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}

          {/* X-axis labels */}
          <div className="flex gap-3 mt-4">
            <div className="w-28 flex-shrink-0" />
            {gridCols.map(({ perfBand, label }) => (
              <div key={perfBand} className="flex-1 text-center text-xs text-surface-400 font-medium">
                {label}
              </div>
            ))}
          </div>
          <div className="text-center text-xs font-bold text-surface-500 mt-2">
            PERFORMANCE →
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function NineBoxPage() {
  // React Query hooks
  const cyclesQuery = usePerformanceAllCycles(0, 100);
  const allReviewsQuery = useAllReviews(0, 500);

  // Local state
  const [selectedCycleId, setSelectedCycleId] = useState('');
  const [selectedBox, setSelectedBox] = useState<string | null>(null);
  const [potentialOverrides, setPotentialOverrides] = useState<Record<string, number>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('name');

  // Initialize selected cycle
  if (!selectedCycleId && cyclesQuery.data?.content?.length > 0) {
    const cycles = cyclesQuery.data.content;
    const active = cycles.find(c => c.status === 'ACTIVE' || c.status === 'CALIBRATION');
    if (active) {
      setSelectedCycleId(active.id);
    } else if (cycles.length > 0) {
      setSelectedCycleId(cycles[0].id);
    }
  }

  // Filter reviews by selected cycle
  const reviews = useMemo(() => {
    if (!selectedCycleId || !allReviewsQuery.data?.content) return [];
    return allReviewsQuery.data.content.filter(
      r => (r.reviewCycleId || r.cycleId) === selectedCycleId
    );
  }, [selectedCycleId, allReviewsQuery.data]);

  // Build employee points
  const points = useMemo<EmployeePoint[]>(() => {
    const map = new Map<string, { name: string; selfRating: number | null; managerRating: number | null }>();
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
  }, [reviews, potentialOverrides]);

  // Filter & sort
  const filteredAndSorted = useMemo(() => {
    let result = [...points];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(p => p.employeeName.toLowerCase().includes(query));
    }

    result.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'name') {
        cmp = a.employeeName.localeCompare(b.employeeName);
      } else if (sortField === 'performance') {
        cmp = a.performance - b.performance;
      } else if (sortField === 'potential') {
        cmp = a.potential - b.potential;
      }
      return cmp;
    });

    return result;
  }, [points, searchQuery, sortField]);

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

  // Export CSV
  const exportCsv = () => {
    const rows = points
      .map(p => {
        const key = boxKey(p.performance, p.potential);
        const meta = BOX_CONFIG[key];
        return [p.employeeName, p.performance.toFixed(1), p.potential.toFixed(1), meta?.label ?? ''].join(',');
      });
    const csv = ['Employee,Performance,Potential,Category', ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `9box-${selectedCycleId}.csv`;
    link.click();
  };

  // Calculate stats
  const stats = useMemo(() => {
    const categories: Record<string, number> = {};
    for (const p of points) {
      const key = boxKey(p.performance, p.potential);
      categories[key] = (categories[key] || 0) + 1;
    }

    const highPerformers = points.filter(p => p.performance > 3.5).length;
    const highPotential = points.filter(p => p.potential > 3.5).length;
    const stars = points.filter(p => p.performance > 3.5 && p.potential > 3.5).length;

    return { categories, highPerformers, highPotential, stars };
  }, [points]);

  const cycles = cyclesQuery.data?.content || [];
  const cyclesLoading = cyclesQuery.isLoading;
  const reviewsLoading = allReviewsQuery.isLoading;

  return (
    <AppLayout>
      <div className="min-h-screen bg-surface-50 dark:bg-surface-900">
        <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-surface-900 dark:text-white">
              9-Box Talent Grid
            </h1>
            <p className="text-surface-500 mt-1">
              Segment talent by performance and potential
            </p>
          </div>
          <button
            onClick={exportCsv}
            disabled={points.length === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 text-sm font-medium text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-700 disabled:opacity-50 transition-colors"
          >
            <Download size={16} />
            Export CSV
          </button>
        </div>

        {/* Cycle Selector */}
        <div className="bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg p-4">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                Review Cycle
              </label>
              {cyclesLoading ? (
                <div className="h-10 bg-surface-200 dark:bg-surface-700 rounded-lg animate-pulse" />
              ) : (
                <select
                  value={selectedCycleId}
                  onChange={e => setSelectedCycleId(e.target.value)}
                  className="w-full px-3 py-2.5 border border-surface-300 dark:border-surface-600 rounded-lg text-sm text-surface-900 dark:text-white bg-white dark:bg-surface-700 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
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
            <div className="text-xs text-surface-400 md:mt-6">
              {points.length} employees plotted
            </div>
          </div>
        </div>

        {/* Info Banner */}
        <div className="flex items-start gap-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg px-4 py-3">
          <Info size={16} className="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-blue-800 dark:text-blue-300">
            <strong>X-axis:</strong> Performance = manager review rating.
            <strong className="ml-3">Y-axis:</strong> Potential = derived from self vs manager gap. Click cells to view
            employees and override potential scores.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <Users className="text-purple-600 dark:text-purple-400" size={20} />
              </div>
              <div>
                <p className="text-xs text-surface-500">Total Plotted</p>
                <p className="text-2xl font-bold text-surface-900 dark:text-white">{points.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <TrendingUp className="text-emerald-600 dark:text-emerald-400" size={20} />
              </div>
              <div>
                <p className="text-xs text-surface-500">Stars</p>
                <p className="text-2xl font-bold text-surface-900 dark:text-white">{stats.stars}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Target className="text-blue-600 dark:text-blue-400" size={20} />
              </div>
              <div>
                <p className="text-xs text-surface-500">High Performers</p>
                <p className="text-2xl font-bold text-surface-900 dark:text-white">{stats.highPerformers}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <Grid3x3 className="text-green-600 dark:text-green-400" size={20} />
              </div>
              <div>
                <p className="text-xs text-surface-500">High Potential</p>
                <p className="text-2xl font-bold text-surface-900 dark:text-white">{stats.highPotential}</p>
              </div>
            </div>
          </div>
        </div>

        {reviewsLoading ? (
          <div className="flex items-center justify-center py-20">
            <RefreshCw size={24} className="animate-spin text-primary-500 mr-3" />
            <span className="text-surface-500">Loading reviews...</span>
          </div>
        ) : points.length === 0 && selectedCycleId ? (
          <div className="flex flex-col items-center justify-center py-20 text-center bg-white dark:bg-surface-800 rounded-lg border border-surface-200 dark:border-surface-700">
            <Info size={32} className="text-surface-400 dark:text-surface-600 mb-3" />
            <p className="text-surface-600 dark:text-surface-400 font-medium">
              No rated reviews found
            </p>
            <p className="text-surface-500 text-sm mt-1">
              Complete reviews with overall ratings to populate the grid
            </p>
          </div>
        ) : selectedCycleId ? (
          <div className="space-y-6">
            {/* 9-Box Grid */}
            <NineBoxGrid
              points={points}
              byBox={byBox}
              selectedBox={selectedBox}
              onSelectBox={setSelectedBox}
            />

            {/* Selected Box Details */}
            {selectedBox && selectedBoxPoints && (
              <div className="bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg p-5 space-y-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`px-3 py-1.5 rounded-lg border ${BOX_CONFIG[selectedBox].bg} ${BOX_CONFIG[selectedBox].border}`}
                  >
                    <span
                      className={`text-sm font-bold ${BOX_CONFIG[selectedBox].text}`}
                    >
                      {BOX_CONFIG[selectedBox].label}
                    </span>
                  </div>
                  <span className="text-sm text-surface-500">
                    {BOX_CONFIG[selectedBox].sublabel}
                  </span>
                  <span className="ml-auto text-sm font-semibold text-surface-700 dark:text-surface-300">
                    {selectedBoxPoints.length} employees
                  </span>
                </div>

                {/* Employees Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-surface-50 dark:bg-surface-700 border-b border-surface-200 dark:border-surface-700">
                        <th className="px-4 py-2.5 text-left font-semibold text-surface-700 dark:text-surface-300">
                          Employee
                        </th>
                        <th className="px-4 py-2.5 text-center font-semibold text-surface-700 dark:text-surface-300">
                          Performance
                        </th>
                        <th className="px-4 py-2.5 text-center font-semibold text-surface-700 dark:text-surface-300">
                          Potential
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-100 dark:divide-surface-700">
                      {selectedBoxPoints.map(p => (
                        <tr key={p.employeeId} className="hover:bg-surface-50 dark:hover:bg-surface-700 transition-colors">
                          <td className="px-4 py-2.5 font-medium text-surface-900 dark:text-white">
                            {p.employeeName}
                          </td>
                          <td className="px-4 py-2.5 text-center text-surface-700 dark:text-surface-300">
                            {p.performance.toFixed(1)}
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            <input
                              type="number"
                              min={1}
                              max={5}
                              step={0.5}
                              value={potentialOverrides[p.employeeId] ?? p.potential.toFixed(1)}
                              onChange={e => {
                                const v = parseFloat(e.target.value);
                                if (!isNaN(v) && v >= 1 && v <= 5) {
                                  setPotentialOverrides(prev => ({
                                    ...prev,
                                    [p.employeeId]: v,
                                  }));
                                }
                              }}
                              className="w-20 text-center px-2 py-1 border border-surface-300 dark:border-surface-600 rounded-lg text-sm bg-white dark:bg-surface-700 text-surface-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-surface-500">
                  Edit potential scores to re-plot employees in the grid dynamically
                </p>
              </div>
            )}

            {/* All Employees Table */}
            <div className="bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg p-5 space-y-4">
              <div className="flex items-center gap-3">
                <h3 className="text-sm font-bold text-surface-900 dark:text-white">
                  All Employees
                </h3>
                <div className="flex-1 relative">
                  <Search
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400"
                  />
                  <input
                    type="text"
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="ml-auto w-full md:w-64 pl-10 pr-3 py-1.5 border border-surface-300 dark:border-surface-600 rounded-lg bg-white dark:bg-surface-700 text-surface-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-surface-50 dark:bg-surface-700 border-b border-surface-200 dark:border-surface-700">
                      <th className="px-4 py-2.5 text-left font-semibold text-surface-700 dark:text-surface-300">
                        <button
                          onClick={() => setSortField(sortField === 'name' ? 'name' : 'name')}
                          className="hover:text-surface-900 dark:hover:text-white transition-colors"
                        >
                          Employee {sortField === 'name' ? '↑' : ''}
                        </button>
                      </th>
                      <th className="px-4 py-2.5 text-center font-semibold text-surface-700 dark:text-surface-300">
                        <button
                          onClick={() => setSortField(sortField === 'performance' ? 'performance' : 'performance')}
                          className="hover:text-surface-900 dark:hover:text-white transition-colors"
                        >
                          Performance {sortField === 'performance' ? '↑' : ''}
                        </button>
                      </th>
                      <th className="px-4 py-2.5 text-center font-semibold text-surface-700 dark:text-surface-300">
                        <button
                          onClick={() => setSortField(sortField === 'potential' ? 'potential' : 'potential')}
                          className="hover:text-surface-900 dark:hover:text-white transition-colors"
                        >
                          Potential {sortField === 'potential' ? '↑' : ''}
                        </button>
                      </th>
                      <th className="px-4 py-2.5 text-center font-semibold text-surface-700 dark:text-surface-300">
                        Category
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-100 dark:divide-surface-700">
                    {filteredAndSorted.map(p => {
                      const key = boxKey(p.performance, p.potential);
                      const meta = BOX_CONFIG[key];
                      return (
                        <tr key={p.employeeId} className="hover:bg-surface-50 dark:hover:bg-surface-700 transition-colors">
                          <td className="px-4 py-2.5 font-medium text-surface-900 dark:text-white">
                            {p.employeeName}
                          </td>
                          <td className="px-4 py-2.5 text-center text-surface-700 dark:text-surface-300">
                            {p.performance.toFixed(1)}
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            <input
                              type="number"
                              min={1}
                              max={5}
                              step={0.5}
                              value={potentialOverrides[p.employeeId] ?? p.potential.toFixed(1)}
                              onChange={e => {
                                const v = parseFloat(e.target.value);
                                if (!isNaN(v) && v >= 1 && v <= 5) {
                                  setPotentialOverrides(prev => ({
                                    ...prev,
                                    [p.employeeId]: v,
                                  }));
                                }
                              }}
                              className="w-20 text-center px-2 py-1 border border-surface-300 dark:border-surface-600 rounded-lg text-sm bg-white dark:bg-surface-700 text-surface-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                            />
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            <span
                              className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold ${meta?.bg} ${meta?.text}`}
                            >
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
          </div>
        ) : null}
        </div>
      </div>
    </AppLayout>
  );
}
