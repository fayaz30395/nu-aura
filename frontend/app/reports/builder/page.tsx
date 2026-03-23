'use client';

import { useState } from 'react';
import { AppLayout } from '@/components/layout';
import { apiClient } from '@/lib/api/client';
import { PermissionGate } from '@/components/auth/PermissionGate';
import { Permissions } from '@/lib/hooks/usePermissions';

// ─── Types ────────────────────────────────────────────────────────────────────

type Module = 'EMPLOYEE' | 'ATTENDANCE' | 'LEAVE' | 'PAYROLL' | 'PERFORMANCE';

interface FilterRow {
  column: string;
  operator: string;
  value: string;
}

interface ReportQuery {
  module: Module;
  selectedColumns: string[];
  filters: FilterRow[];
  sortBy: string;
  sortDirection: string;
  name?: string;
  description?: string;
}

// ─── Module definitions ───────────────────────────────────────────────────────

const MODULES: { value: Module; label: string }[] = [
  { value: 'EMPLOYEE', label: 'Employee' },
  { value: 'ATTENDANCE', label: 'Attendance' },
  { value: 'LEAVE', label: 'Leave' },
  { value: 'PAYROLL', label: 'Payroll' },
  { value: 'PERFORMANCE', label: 'Performance' },
];

const MODULE_COLUMNS: Record<Module, { key: string; label: string }[]> = {
  EMPLOYEE: [
    { key: 'employeeCode', label: 'Employee Code' },
    { key: 'fullName', label: 'Full Name' },
    { key: 'email', label: 'Email' },
    { key: 'designation', label: 'Designation' },
    { key: 'departmentId', label: 'Department' },
    { key: 'status', label: 'Status' },
    { key: 'joinDate', label: 'Join Date' },
  ],
  ATTENDANCE: [
    { key: 'employeeId', label: 'Employee' },
    { key: 'date', label: 'Date' },
    { key: 'checkInTime', label: 'Check In' },
    { key: 'checkOutTime', label: 'Check Out' },
    { key: 'status', label: 'Status' },
  ],
  LEAVE: [
    { key: 'employeeId', label: 'Employee' },
    { key: 'leaveType', label: 'Leave Type' },
    { key: 'startDate', label: 'Start Date' },
    { key: 'endDate', label: 'End Date' },
    { key: 'status', label: 'Status' },
    { key: 'reason', label: 'Reason' },
  ],
  PAYROLL: [
    { key: 'employeeId', label: 'Employee' },
    { key: 'month', label: 'Month' },
    { key: 'year', label: 'Year' },
    { key: 'basicSalary', label: 'Basic Salary' },
    { key: 'grossSalary', label: 'Gross Salary' },
    { key: 'netSalary', label: 'Net Salary' },
  ],
  PERFORMANCE: [
    { key: 'employeeId', label: 'Employee' },
    { key: 'reviewCycleId', label: 'Review Cycle' },
    { key: 'selfRating', label: 'Self Rating' },
    { key: 'managerRating', label: 'Manager Rating' },
    { key: 'finalRating', label: 'Final Rating' },
  ],
};

const OPERATORS = [
  { value: 'equals', label: 'Equals' },
  { value: 'contains', label: 'Contains' },
  { value: 'gt', label: 'Greater than' },
  { value: 'lt', label: 'Less than' },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function ReportBuilderPage() {
  const [module, setModule] = useState<Module>('EMPLOYEE');
  const [selectedCols, setSelectedCols] = useState<string[]>(['employeeCode', 'fullName', 'email']);
  const [filters, setFilters] = useState<FilterRow[]>([]);
  const [sortBy, setSortBy] = useState('');
  const [sortDir, setSortDir] = useState('ASC');
  const [templateName, setTemplateName] = useState('');

  const [previewRows, setPreviewRows] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [savedMsg, setSavedMsg] = useState('');

  const columns = MODULE_COLUMNS[module];

  function toggleColumn(key: string) {
    setSelectedCols(prev =>
      prev.includes(key) ? prev.filter(c => c !== key) : [...prev, key]
    );
  }

  function addFilter() {
    if (filters.length >= 5) return;
    setFilters(prev => [...prev, { column: columns[0].key, operator: 'equals', value: '' }]);
  }

  function updateFilter(i: number, field: keyof FilterRow, val: string) {
    setFilters(prev => prev.map((f, idx) => idx === i ? { ...f, [field]: val } : f));
  }

  function removeFilter(i: number) {
    setFilters(prev => prev.filter((_, idx) => idx !== i));
  }

  function buildQuery(): ReportQuery {
    return {
      module,
      selectedColumns: selectedCols,
      filters: filters.filter(f => f.value !== ''),
      sortBy,
      sortDirection: sortDir,
    };
  }

  async function handlePreview() {
    if (selectedCols.length === 0) {
      setError('Select at least one column.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await apiClient.post<Record<string, unknown>[]>(
        '/reports/custom/execute', buildQuery()
      );
      setPreviewRows(res.data);
    } catch {
      setError('Failed to execute report. Check your filters.');
    } finally {
      setLoading(false);
    }
  }

  async function handleExport() {
    setLoading(true);
    try {
      const res = await apiClient.post('/reports/custom/export', buildQuery(), {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data as BlobPart]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `report-${module.toLowerCase()}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      setError('Export failed.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!templateName.trim()) {
      setError('Enter a template name to save.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await apiClient.post('/reports/custom/templates', {
        ...buildQuery(),
        name: templateName,
      });
      setSavedMsg('Template saved.');
      setTimeout(() => setSavedMsg(''), 3000);
    } catch {
      setError('Failed to save template.');
    } finally {
      setSaving(false);
    }
  }

  // Change module → reset cols and filters
  function changeModule(m: Module) {
    setModule(m);
    setSelectedCols(MODULE_COLUMNS[m].slice(0, 3).map(c => c.key));
    setFilters([]);
    setSortBy('');
    setPreviewRows([]);
  }

  return (
    <AppLayout
      activeMenuItem="reports"
      breadcrumbs={[
        { label: 'Reports', href: '/reports' },
        { label: 'Custom Builder' },
      ]}
    >
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] skeuo-emboss">Custom Report Builder</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Select a data source, pick columns, add filters, then preview or export.
          </p>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 border border-red-200 p-4 text-sm text-red-700">
            {error}
          </div>
        )}
        {savedMsg && (
          <div className="rounded-md bg-green-50 border border-green-200 p-4 text-sm text-green-700">
            {savedMsg}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ── Left panel: Module + Columns ─────────────────────────────── */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white border border-[var(--border-main)] rounded-lg p-4">
              <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Data Source</h2>
              <div className="grid grid-cols-2 gap-2">
                {MODULES.map(m => (
                  <button
                    key={m.value}
                    onClick={() => changeModule(m.value)}
                    className={`px-3 py-2 rounded-md text-sm font-medium border transition-colors ${
                      module === m.value
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-[var(--text-primary)] border-[var(--border-strong)] hover:bg-[var(--bg-surface)]'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white border border-[var(--border-main)] rounded-lg p-4">
              <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Columns</h2>
              <div className="space-y-2">
                {columns.map(col => (
                  <label key={col.key} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedCols.includes(col.key)}
                      onChange={() => toggleColumn(col.key)}
                      className="rounded border-[var(--border-strong)] text-blue-600"
                    />
                    <span className="text-sm text-[var(--text-primary)]">{col.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* ── Middle panel: Filters + Sort + Save ──────────────────────── */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white border border-[var(--border-main)] rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-[var(--text-primary)]">Filters</h2>
                {filters.length < 5 && (
                  <button
                    onClick={addFilter}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                  >
                    + Add Filter
                  </button>
                )}
              </div>

              {filters.length === 0 && (
                <p className="text-xs text-[var(--text-muted)]">No filters applied. All rows returned.</p>
              )}

              <div className="space-y-4">
                {filters.map((f, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex gap-1">
                      <select
                        value={f.column}
                        onChange={e => updateFilter(i, 'column', e.target.value)}
                        className="flex-1 text-xs border border-[var(--border-strong)] rounded px-2 py-1"
                      >
                        {columns.map(c => (
                          <option key={c.key} value={c.key}>{c.label}</option>
                        ))}
                      </select>
                      <select
                        value={f.operator}
                        onChange={e => updateFilter(i, 'operator', e.target.value)}
                        className="text-xs border border-[var(--border-strong)] rounded px-2 py-1"
                      >
                        {OPERATORS.map(op => (
                          <option key={op.value} value={op.value}>{op.label}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => removeFilter(i)}
                        className="text-red-400 hover:text-red-600 text-xs px-1"
                      >
                        ✕
                      </button>
                    </div>
                    <input
                      type="text"
                      placeholder="Value"
                      value={f.value}
                      onChange={e => updateFilter(i, 'value', e.target.value)}
                      className="w-full text-xs border border-[var(--border-strong)] rounded px-2 py-1"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white border border-[var(--border-main)] rounded-lg p-4">
              <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Sort</h2>
              <div className="flex gap-2">
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value)}
                  className="flex-1 text-sm border border-[var(--border-strong)] rounded px-2 py-1.5"
                >
                  <option value="">No sort</option>
                  {columns
                    .filter(c => selectedCols.includes(c.key))
                    .map(c => (
                      <option key={c.key} value={c.key}>{c.label}</option>
                    ))}
                </select>
                <select
                  value={sortDir}
                  onChange={e => setSortDir(e.target.value)}
                  className="text-sm border border-[var(--border-strong)] rounded px-2 py-1.5"
                >
                  <option value="ASC">ASC</option>
                  <option value="DESC">DESC</option>
                </select>
              </div>
            </div>

            <div className="bg-white border border-[var(--border-main)] rounded-lg p-4">
              <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Save Template</h2>
              <input
                type="text"
                placeholder="Template name"
                value={templateName}
                onChange={e => setTemplateName(e.target.value)}
                className="w-full text-sm border border-[var(--border-strong)] rounded px-3 py-1.5 mb-2"
              />
              <PermissionGate permission={Permissions.REPORT_CREATE}>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full bg-[var(--bg-surface)] hover:bg-[var(--bg-card-hover)] text-[var(--text-primary)] text-sm font-medium py-1.5 rounded border border-[var(--border-strong)] disabled:opacity-50"
                >
                  {saving ? 'Saving…' : 'Save Template'}
                </button>
              </PermissionGate>
            </div>
          </div>

          {/* ── Right panel: Actions ──────────────────────────────────────── */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white border border-[var(--border-main)] rounded-lg p-4">
              <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Actions</h2>
              <div className="space-y-2">
                <PermissionGate permission={Permissions.REPORT_VIEW}>
                  <button
                    onClick={handlePreview}
                    disabled={loading || selectedCols.length === 0}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 rounded disabled:opacity-50"
                  >
                    {loading ? 'Loading…' : 'Preview Results'}
                  </button>
                </PermissionGate>
                <PermissionGate permission={Permissions.ANALYTICS_EXPORT}>
                  <button
                    onClick={handleExport}
                    disabled={loading || selectedCols.length === 0}
                    className="w-full bg-white hover:bg-[var(--bg-surface)] text-[var(--text-primary)] text-sm font-medium py-2 rounded border border-[var(--border-strong)] disabled:opacity-50"
                  >
                    Export CSV
                  </button>
                </PermissionGate>
              </div>
            </div>
          </div>
        </div>

        {/* ── Preview Table ───────────────────────────────────────────────── */}
        {previewRows.length > 0 && (
          <div className="bg-white border border-[var(--border-main)] rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-[var(--border-main)] flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                Preview — {previewRows.length} row{previewRows.length !== 1 ? 's' : ''}
              </h2>
              <span className="text-xs text-[var(--text-muted)]">Showing up to 100 rows</span>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm divide-y divide-[var(--border-main)]">
                <thead className="bg-[var(--bg-surface)]">
                  <tr>
                    {Object.keys(previewRows[0]).map(col => (
                      <th
                        key={col}
                        className="px-4 py-2 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider whitespace-nowrap"
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-[var(--bg-card)] divide-y divide-[var(--border-subtle)]">
                  {previewRows.slice(0, 50).map((row, i) => (
                    <tr key={i} className="hover:bg-[var(--bg-surface)]">
                      {Object.values(row).map((val, j) => (
                        <td key={j} className="px-4 py-2 text-[var(--text-primary)] whitespace-nowrap">
                          {val != null ? String(val) : '—'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {previewRows.length === 0 && !loading && (
          <div className="bg-[var(--bg-surface)] border border-dashed border-[var(--border-strong)] rounded-lg p-12 text-center text-[var(--text-muted)] text-sm">
            Select columns and click <strong>Preview Results</strong> to see data.
          </div>
        )}
      </div>
    </AppLayout>
  );
}
