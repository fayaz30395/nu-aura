'use client';

import { useState, useMemo, useCallback } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PermissionGate } from '@/components/auth/PermissionGate';
import { Permissions } from '@/lib/hooks/usePermissions';
import {
  useShiftPatterns,
  useActiveShiftDefinitions,
  useCreatePattern,
  useUpdatePattern,
  useDeletePattern,
} from '@/lib/hooks/queries/useShifts';
import { ShiftPattern, ShiftPatternRequest, ShiftDefinition } from '@/lib/types/hrms/shift';
import { NuAuraLoader } from '@/components/ui/Loading';
import { EmptyState } from '@/components/ui/EmptyState';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Edit2,
  Trash2,
  X,
  ChevronLeft,
  RotateCcw,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

const patternSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().optional(),
  rotationType: z.string().min(1, 'Rotation type is required'),
  cycleDays: z.coerce.number().min(1, 'At least 1 day').max(60),
  isActive: z.boolean().default(true),
  colorCode: z.string().optional(),
});

type PatternFormData = z.infer<typeof patternSchema>;

const ROTATION_TYPES = [
  { value: 'FIXED', label: 'Fixed' },
  { value: 'WEEKLY_ROTATING', label: 'Weekly Rotating' },
  { value: 'BIWEEKLY_ROTATING', label: 'Bi-weekly Rotating' },
  { value: 'CUSTOM', label: 'Custom' },
];

function PatternPreview({
  patternJson,
  shifts,
}: {
  patternJson: string;
  shifts: ShiftDefinition[];
}) {
  const entries: string[] = useMemo(() => {
    try {
      return JSON.parse(patternJson);
    } catch {
      return [];
    }
  }, [patternJson]);

  const shiftMap = useMemo(() => {
    const m = new Map<string, ShiftDefinition>();
    shifts.forEach((s) => m.set(s.id, s));
    return m;
  }, [shifts]);

  // Show 28 days (4 weeks) preview
  const previewDays = useMemo(() => {
    const days: { day: number; shift: ShiftDefinition | null; isOff: boolean }[] = [];
    for (let i = 0; i < 28; i++) {
      const idx = i % entries.length;
      const entry = entries[idx];
      if (entry === 'OFF') {
        days.push({ day: i + 1, shift: null, isOff: true });
      } else {
        days.push({ day: i + 1, shift: shiftMap.get(entry) ?? null, isOff: false });
      }
    }
    return days;
  }, [entries, shiftMap]);

  if (entries.length === 0) {
    return <p className="text-xs text-surface-400 italic">No pattern configured</p>;
  }

  return (
    <div className="grid grid-cols-7 gap-1">
      {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((d) => (
        <div key={d} className="text-center text-xs font-medium text-surface-400 pb-1">
          {d}
        </div>
      ))}
      {previewDays.map((pd) => (
        <div
          key={pd.day}
          className="text-center py-1 rounded text-xs font-medium"
          style={{
            backgroundColor: pd.isOff
              ? 'var(--bg-secondary)'
              : pd.shift?.colorCode
                ? pd.shift.colorCode + '30'
                : 'var(--border-main)',
            color: pd.isOff ? '#9CA3AF' : pd.shift?.colorCode || '#6B7280',
          }}
        >
          {pd.isOff ? 'OFF' : pd.shift?.shiftCode || '?'}
        </div>
      ))}
    </div>
  );
}

export default function ShiftPatternsPage() {
  const router = useRouter();
  const [page, _setPage] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [editingPattern, setEditingPattern] = useState<ShiftPattern | null>(null);
  const [patternSlots, setPatternSlots] = useState<string[]>([]);
  const [_previewPattern, _setPreviewPattern] = useState<ShiftPattern | null>(null);

  const { data, isLoading } = useShiftPatterns(page, 20);
  const { data: activeShifts = [] } = useActiveShiftDefinitions();
  const createMutation = useCreatePattern();
  const updateMutation = useUpdatePattern();
  const deleteMutation = useDeletePattern();

  const form = useForm<PatternFormData>({
    resolver: zodResolver(patternSchema),
    defaultValues: {
      name: '',
      rotationType: 'WEEKLY_ROTATING',
      cycleDays: 7,
      isActive: true,
    },
  });

  const openCreate = useCallback(() => {
    setEditingPattern(null);
    setPatternSlots(Array(7).fill('OFF'));
    form.reset({ name: '', rotationType: 'WEEKLY_ROTATING', cycleDays: 7, isActive: true });
    setShowForm(true);
  }, [form]);

  const openEdit = useCallback(
    (pattern: ShiftPattern) => {
      setEditingPattern(pattern);
      try {
        setPatternSlots(JSON.parse(pattern.pattern));
      } catch {
        setPatternSlots(Array(pattern.cycleDays).fill('OFF'));
      }
      form.reset({
        name: pattern.name,
        description: pattern.description ?? '',
        rotationType: pattern.rotationType,
        cycleDays: pattern.cycleDays,
        isActive: pattern.isActive,
        colorCode: pattern.colorCode ?? '',
      });
      setShowForm(true);
    },
    [form]
  );

  const _cycleDays = form.watch('cycleDays');

  // Sync slots when cycleDays changes
  const handleCycleDaysChange = useCallback(
    (newDays: number) => {
      setPatternSlots((prev) => {
        if (newDays > prev.length) {
          return [...prev, ...Array(newDays - prev.length).fill('OFF')];
        }
        return prev.slice(0, newDays);
      });
    },
    []
  );

  const onSubmit = useCallback(
    (data: PatternFormData) => {
      const payload = {
        ...data,
        pattern: JSON.stringify(patternSlots),
      } as ShiftPatternRequest;
      if (editingPattern) {
        updateMutation.mutate(
          { id: editingPattern.id, data: payload },
          { onSuccess: () => setShowForm(false) }
        );
      } else {
        createMutation.mutate(payload, { onSuccess: () => setShowForm(false) });
      }
    },
    [editingPattern, patternSlots, createMutation, updateMutation]
  );

  const patterns = data?.content ?? [];
  const _totalPages = data?.totalPages ?? 0;

  return (
    <AppLayout>
      <PermissionGate permission={Permissions.SHIFT_VIEW}>
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/shifts')}
                className="p-2 hover:bg-surface-100 dark:hover:bg-surface-700 rounded-lg"
              >
                <ChevronLeft className="w-5 h-5 text-surface-600 dark:text-surface-300" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-surface-900 dark:text-white">Shift Patterns</h1>
                <p className="text-sm text-surface-500 dark:text-surface-400">
                  Define rotation cycles for shift scheduling
                </p>
              </div>
            </div>
            <PermissionGate permission={Permissions.SHIFT_MANAGE}>
              <button
                onClick={openCreate}
                className="flex items-center gap-2 px-4 py-2 bg-accent-700 hover:bg-accent-800 text-white rounded-lg transition-colors text-sm font-medium"
              >
                <Plus className="w-4 h-4" />
                Add Pattern
              </button>
            </PermissionGate>
          </div>

          {/* Pattern List */}
          {isLoading ? (
            <NuAuraLoader />
          ) : patterns.length === 0 ? (
            <EmptyState
              icon={<RotateCcw className="w-12 h-12 text-surface-400" />}
              title="No Patterns Defined"
              description="Create rotation patterns to auto-generate shift schedules."
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {patterns.map((pattern) => (
                <motion.div
                  key={pattern.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white dark:bg-surface-800 rounded-xl border border-surface-200 dark:border-surface-700 p-4"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-surface-900 dark:text-white">{pattern.name}</h3>
                      <p className="text-xs text-surface-500 dark:text-surface-400">
                        {pattern.rotationType} - {pattern.cycleDays} day cycle
                      </p>
                      {pattern.description && (
                        <p className="text-xs text-surface-400 mt-1">{pattern.description}</p>
                      )}
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        pattern.isActive
                          ? 'bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400'
                          : 'bg-surface-100 text-surface-600 dark:bg-surface-700 dark:text-surface-400'
                      }`}
                    >
                      {pattern.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  {/* 4-week preview */}
                  <div className="mb-3">
                    <p className="text-xs font-medium text-surface-500 dark:text-surface-400 mb-2">
                      4-Week Preview
                    </p>
                    <PatternPreview patternJson={pattern.pattern} shifts={activeShifts} />
                  </div>

                  <PermissionGate permission={Permissions.SHIFT_MANAGE}>
                    <div className="flex items-center gap-2 pt-3 border-t border-surface-100 dark:border-surface-700">
                      <button
                        onClick={() => openEdit(pattern)}
                        className="flex items-center gap-1 px-4 py-1.5 text-xs font-medium text-accent-700 dark:text-accent-400 hover:bg-accent-50 dark:hover:bg-accent-900/20 rounded-lg transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        Edit
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('Delete this pattern?')) deleteMutation.mutate(pattern.id);
                        }}
                        className="flex items-center gap-1 px-4 py-1.5 text-xs font-medium text-danger-600 dark:text-danger-400 hover:bg-danger-50 dark:hover:bg-danger-900/20 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete
                      </button>
                    </div>
                  </PermissionGate>
                </motion.div>
              ))}
            </div>
          )}

          {/* Create/Edit Modal */}
          <AnimatePresence>
            {showForm && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
                onClick={(e) => {
                  if (e.target === e.currentTarget) setShowForm(false);
                }}
              >
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  className="bg-white dark:bg-surface-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
                >
                  <div className="flex items-center justify-between p-6 border-b border-surface-200 dark:border-surface-700">
                    <h2 className="text-xl font-semibold text-surface-900 dark:text-white">
                      {editingPattern ? 'Edit Pattern' : 'New Pattern'}
                    </h2>
                    <button
                      onClick={() => setShowForm(false)}
                      className="p-2 hover:bg-surface-100 dark:hover:bg-surface-700 rounded-lg"
                    >
                      <X className="w-5 h-5 text-surface-500" />
                    </button>
                  </div>

                  <form onSubmit={form.handleSubmit(onSubmit)} className="p-6 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                        Pattern Name *
                      </label>
                      <input
                        {...form.register('name')}
                        className="w-full px-4 py-2 border border-surface-300 dark:border-surface-600 rounded-lg bg-white dark:bg-surface-900 text-sm focus:outline-none focus:ring-2 focus:ring-accent-700"
                        placeholder="e.g., 4-on-2-off Rotation"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                        Description
                      </label>
                      <textarea
                        {...form.register('description')}
                        rows={2}
                        className="w-full px-4 py-2 border border-surface-300 dark:border-surface-600 rounded-lg bg-white dark:bg-surface-900 text-sm focus:outline-none focus:ring-2 focus:ring-accent-700"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                          Rotation Type
                        </label>
                        <select
                          {...form.register('rotationType')}
                          className="w-full px-4 py-2 border border-surface-300 dark:border-surface-600 rounded-lg bg-white dark:bg-surface-900 text-sm focus:outline-none focus:ring-2 focus:ring-accent-700"
                        >
                          {ROTATION_TYPES.map((t) => (
                            <option key={t.value} value={t.value}>
                              {t.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                          Cycle Days
                        </label>
                        <input
                          type="number"
                          {...form.register('cycleDays', {
                            onChange: (e) => handleCycleDaysChange(parseInt(e.target.value, 10) || 1),
                          })}
                          min={1}
                          max={60}
                          className="w-full px-4 py-2 border border-surface-300 dark:border-surface-600 rounded-lg bg-white dark:bg-surface-900 text-sm focus:outline-none focus:ring-2 focus:ring-accent-700"
                        />
                      </div>
                    </div>

                    {/* Pattern Builder */}
                    <div>
                      <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                        Pattern Cycle (assign a shift to each day)
                      </label>
                      <div className="grid grid-cols-7 gap-2">
                        {patternSlots.map((slot, idx) => (
                          <div key={idx} className="space-y-1">
                            <p className="text-xs text-center text-surface-400">Day {idx + 1}</p>
                            <select
                              value={slot}
                              onChange={(e) => {
                                const next = [...patternSlots];
                                next[idx] = e.target.value;
                                setPatternSlots(next);
                              }}
                              className="w-full px-1 py-1.5 border border-surface-300 dark:border-surface-600 rounded text-xs bg-white dark:bg-surface-900 focus:outline-none focus:ring-2 focus:ring-accent-700"
                            >
                              <option value="OFF">OFF</option>
                              {activeShifts.map((s) => (
                                <option key={s.id} value={s.id}>
                                  {s.shiftCode}
                                </option>
                              ))}
                            </select>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Preview */}
                    <div>
                      <p className="text-xs font-medium text-surface-500 dark:text-surface-400 mb-2">
                        4-Week Preview
                      </p>
                      <PatternPreview
                        patternJson={JSON.stringify(patternSlots)}
                        shifts={activeShifts}
                      />
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-4 pt-4 border-t border-surface-200 dark:border-surface-700">
                      <button
                        type="button"
                        onClick={() => setShowForm(false)}
                        className="px-4 py-2 text-sm font-medium text-surface-700 dark:text-surface-300 bg-surface-100 dark:bg-surface-700 rounded-lg hover:bg-surface-200 dark:hover:bg-surface-600"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={createMutation.isPending || updateMutation.isPending}
                        className="px-4 py-2 text-sm font-medium text-white bg-accent-700 hover:bg-accent-800 rounded-lg disabled:opacity-50"
                      >
                        {createMutation.isPending || updateMutation.isPending
                          ? 'Saving...'
                          : editingPattern
                            ? 'Update Pattern'
                            : 'Create Pattern'}
                      </button>
                    </div>
                  </form>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </PermissionGate>
    </AppLayout>
  );
}
