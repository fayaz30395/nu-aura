'use client';

import { useState, useCallback } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PermissionGate } from '@/components/auth/PermissionGate';
import { Permissions } from '@/lib/hooks/usePermissions';
import {
  useShiftDefinitions,
  useCreateShiftDefinition,
  useUpdateShiftDefinition,
  useDeleteShiftDefinition,
} from '@/lib/hooks/queries/useShifts';
import { ShiftDefinition, ShiftDefinitionRequest } from '@/lib/types/hrms/shift';
import { NuAuraLoader } from '@/components/ui/Loading';
import { EmptyState } from '@/components/ui/EmptyState';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Edit2,
  Trash2,
  Clock,
  Moon,
  Sun,
  Zap,
  X,
  Check,
  ChevronLeft,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

const shiftSchema = z.object({
  shiftCode: z.string().min(1, 'Code is required').max(50),
  shiftName: z.string().min(1, 'Name is required').max(100),
  description: z.string().optional(),
  startTime: z.string().min(1, 'Start time is required'),
  endTime: z.string().min(1, 'End time is required'),
  gracePeriodInMinutes: z.coerce.number().min(0).default(15),
  lateMarkAfterMinutes: z.coerce.number().min(0).default(15),
  halfDayAfterMinutes: z.coerce.number().min(0).default(240),
  fullDayHours: z.coerce.number().min(1).max(24).default(8),
  breakDurationMinutes: z.coerce.number().min(0).default(60),
  isNightShift: z.boolean().default(false),
  workingDays: z.string().min(1, 'Working days required').default('MON,TUE,WED,THU,FRI'),
  isActive: z.boolean().default(true),
  shiftType: z.string().default('FIXED'),
  colorCode: z.string().default('#3B82F6'),
  isFlexible: z.boolean().default(false),
  flexibleWindowMinutes: z.coerce.number().min(0).default(0),
  minGapBetweenShiftsHours: z.coerce.number().min(0).default(11),
  allowsOvertime: z.boolean().default(true),
  overtimeMultiplier: z.coerce.number().min(1).max(5).default(1.5),
});

type ShiftFormData = z.infer<typeof shiftSchema>;

const SHIFT_TYPES = [
  { value: 'FIXED', label: 'Fixed' },
  { value: 'ROTATING', label: 'Rotating' },
  { value: 'FLEXIBLE', label: 'Flexible' },
  { value: 'SPLIT', label: 'Split' },
];

const WEEKDAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

const COLOR_PRESETS = [
  '#3B82F6', '#F59E0B', '#8B5CF6', '#EF4444', '#10B981',
  '#EC4899', '#F97316', '#06B6D4', '#6366F1', '#84CC16',
];

function formatTime(time: string | undefined): string {
  if (!time) return '';
  const parts = time.split(':');
  const h = parseInt(parts[0], 10);
  const m = parts[1];
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${m} ${ampm}`;
}

export default function ShiftDefinitionsPage() {
  const router = useRouter();
  const [page, setPage] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [editingShift, setEditingShift] = useState<ShiftDefinition | null>(null);

  const { data, isLoading } = useShiftDefinitions(page, 20);
  const createMutation = useCreateShiftDefinition();
  const updateMutation = useUpdateShiftDefinition();
  const deleteMutation = useDeleteShiftDefinition();

  const form = useForm<ShiftFormData>({
    resolver: zodResolver(shiftSchema),
    defaultValues: {
      shiftCode: '',
      shiftName: '',
      startTime: '09:00',
      endTime: '18:00',
      gracePeriodInMinutes: 15,
      lateMarkAfterMinutes: 15,
      halfDayAfterMinutes: 240,
      fullDayHours: 8,
      breakDurationMinutes: 60,
      isNightShift: false,
      workingDays: 'MON,TUE,WED,THU,FRI',
      isActive: true,
      shiftType: 'FIXED',
      colorCode: '#3B82F6',
      isFlexible: false,
      flexibleWindowMinutes: 0,
      minGapBetweenShiftsHours: 11,
      allowsOvertime: true,
      overtimeMultiplier: 1.5,
    },
  });

  const openCreate = useCallback(() => {
    setEditingShift(null);
    form.reset({
      shiftCode: '',
      shiftName: '',
      startTime: '09:00',
      endTime: '18:00',
      gracePeriodInMinutes: 15,
      lateMarkAfterMinutes: 15,
      halfDayAfterMinutes: 240,
      fullDayHours: 8,
      breakDurationMinutes: 60,
      isNightShift: false,
      workingDays: 'MON,TUE,WED,THU,FRI',
      isActive: true,
      shiftType: 'FIXED',
      colorCode: '#3B82F6',
      isFlexible: false,
      flexibleWindowMinutes: 0,
      minGapBetweenShiftsHours: 11,
      allowsOvertime: true,
      overtimeMultiplier: 1.5,
    });
    setShowForm(true);
  }, [form]);

  const openEdit = useCallback(
    (shift: ShiftDefinition) => {
      setEditingShift(shift);
      form.reset({
        shiftCode: shift.shiftCode,
        shiftName: shift.shiftName,
        description: shift.description ?? '',
        startTime: shift.startTime?.substring(0, 5) ?? '09:00',
        endTime: shift.endTime?.substring(0, 5) ?? '18:00',
        gracePeriodInMinutes: shift.gracePeriodInMinutes,
        lateMarkAfterMinutes: shift.lateMarkAfterMinutes,
        halfDayAfterMinutes: shift.halfDayAfterMinutes,
        fullDayHours: shift.fullDayHours,
        breakDurationMinutes: shift.breakDurationMinutes,
        isNightShift: shift.isNightShift,
        workingDays: shift.workingDays,
        isActive: shift.isActive,
        shiftType: shift.shiftType ?? 'FIXED',
        colorCode: shift.colorCode ?? '#3B82F6',
        isFlexible: shift.isFlexible,
        flexibleWindowMinutes: shift.flexibleWindowMinutes,
        minGapBetweenShiftsHours: shift.minGapBetweenShiftsHours,
        allowsOvertime: shift.allowsOvertime,
        overtimeMultiplier: shift.overtimeMultiplier,
      });
      setShowForm(true);
    },
    [form]
  );

  const onSubmit = useCallback(
    (data: ShiftFormData) => {
      const payload = {
        ...data,
        startTime: data.startTime + ':00',
        endTime: data.endTime + ':00',
      } as ShiftDefinitionRequest;

      if (editingShift) {
        updateMutation.mutate(
          { id: editingShift.id, data: payload },
          { onSuccess: () => setShowForm(false) }
        );
      } else {
        createMutation.mutate(payload, { onSuccess: () => setShowForm(false) });
      }
    },
    [editingShift, createMutation, updateMutation]
  );

  const shifts = data?.content ?? [];
  const totalPages = data?.totalPages ?? 0;

  return (
    <AppLayout>
      <PermissionGate permission={Permissions.SHIFT_VIEW}>
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="row-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/shifts')}
                className="p-2 hover:bg-surface-100 dark:hover:bg-surface-700 rounded-lg"
              >
                <ChevronLeft className="w-5 h-5 text-surface-600 dark:text-surface-300" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-surface-900 dark:text-white">Shift Definitions</h1>
                <p className="text-sm text-surface-500 dark:text-surface-400">
                  Manage shift types, times, and rules
                </p>
              </div>
            </div>
            <PermissionGate permission={Permissions.SHIFT_MANAGE}>
              <button
                onClick={openCreate}
                className="flex items-center gap-2 px-4 py-2 bg-accent-700 hover:bg-accent-800 text-white rounded-lg transition-colors text-sm font-medium cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
              >
                <Plus className="w-4 h-4" />
                Add Shift
              </button>
            </PermissionGate>
          </div>

          {/* Shift List */}
          {isLoading ? (
            <NuAuraLoader />
          ) : shifts.length === 0 ? (
            <EmptyState
              icon={<Clock className="w-12 h-12 text-surface-400" />}
              title="No Shifts Defined"
              description="Create your first shift definition to start scheduling."
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {shifts.map((shift) => (
                <motion.div
                  key={shift.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-[var(--bg-card)] rounded-xl border border-surface-200 dark:border-surface-700 p-4 hover:shadow-[var(--shadow-elevated)] transition-shadow"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-4 h-4 rounded-full flex-shrink-0"
                        style={{ backgroundColor: shift.colorCode || '#6B7280' }}
                      />
                      <div>
                        <h3 className="font-semibold text-surface-900 dark:text-white text-sm">
                          {shift.shiftName}
                        </h3>
                        <p className="text-xs text-surface-500 dark:text-surface-400">{shift.shiftCode}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {shift.isNightShift && <Moon className="w-4 h-4 text-accent-500" />}
                      {shift.isFlexible && <Zap className="w-4 h-4 text-warning-500" />}
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          shift.isActive
                            ? 'bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400'
                            : 'bg-surface-100 text-surface-600 dark:bg-surface-700 dark:text-surface-400'
                        }`}
                      >
                        {shift.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-surface-600 dark:text-surface-300">
                      <Clock className="w-3.5 h-3.5" />
                      <span>
                        {formatTime(shift.startTime)} - {formatTime(shift.endTime)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-surface-600 dark:text-surface-300">
                      <Sun className="w-3.5 h-3.5" />
                      <span>{shift.workingDays}</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      <span className="px-1.5 py-0.5 bg-surface-100 dark:bg-surface-700 rounded text-xs text-surface-600 dark:text-surface-300">
                        {shift.shiftType}
                      </span>
                      <span className="px-1.5 py-0.5 bg-surface-100 dark:bg-surface-700 rounded text-xs text-surface-600 dark:text-surface-300">
                        {shift.netWorkingHours}h net
                      </span>
                      <span className="px-1.5 py-0.5 bg-surface-100 dark:bg-surface-700 rounded text-xs text-surface-600 dark:text-surface-300">
                        {shift.breakDurationMinutes}m break
                      </span>
                      <span className="px-1.5 py-0.5 bg-surface-100 dark:bg-surface-700 rounded text-xs text-surface-600 dark:text-surface-300">
                        Grace {shift.gracePeriodInMinutes}m
                      </span>
                    </div>
                  </div>

                  <PermissionGate permission={Permissions.SHIFT_MANAGE}>
                    <div className="flex items-center gap-2 mt-4 pt-4 border-t border-surface-100 dark:border-surface-700">
                      <button
                        onClick={() => openEdit(shift)}
                        className="flex items-center gap-1 px-4 py-1.5 text-xs font-medium text-accent-700 dark:text-accent-400 hover:bg-accent-50 dark:hover:bg-accent-900/20 rounded-lg transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        Edit
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('Delete this shift?')) deleteMutation.mutate(shift.id);
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

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="px-4 py-1.5 text-sm rounded-lg bg-surface-100 dark:bg-surface-700 disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-sm text-surface-600 dark:text-surface-300">
                Page {page + 1} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="px-4 py-1.5 text-sm rounded-lg bg-surface-100 dark:bg-surface-700 disabled:opacity-50"
              >
                Next
              </button>
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
                  className="bg-[var(--bg-elevated)] rounded-lg shadow-[var(--shadow-dropdown)] w-full max-w-2xl max-h-[90vh] overflow-y-auto"
                >
                  <div className="row-between p-6 border-b border-surface-200 dark:border-surface-700">
                    <h2 className="text-xl font-semibold text-surface-900 dark:text-white">
                      {editingShift ? 'Edit Shift' : 'New Shift'}
                    </h2>
                    <button
                      onClick={() => setShowForm(false)}
                      className="p-2 hover:bg-surface-100 dark:hover:bg-surface-700 rounded-lg"
                    >
                      <X className="w-5 h-5 text-surface-500" />
                    </button>
                  </div>

                  <form onSubmit={form.handleSubmit(onSubmit)} className="p-6 space-y-4">
                    {/* Basic Info */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                          Shift Code *
                        </label>
                        <input
                          {...form.register('shiftCode')}
                          disabled={!!editingShift}
                          className="w-full px-4 py-2 border border-surface-300 dark:border-surface-600 rounded-lg bg-[var(--bg-input)] text-sm focus:outline-none focus:ring-2 focus:ring-accent-700 disabled:opacity-50"
                          placeholder="e.g., GEN"
                        />
                        {form.formState.errors.shiftCode && (
                          <p className="text-xs text-danger-500 mt-1">
                            {form.formState.errors.shiftCode.message}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                          Shift Name *
                        </label>
                        <input
                          {...form.register('shiftName')}
                          className="w-full px-4 py-2 border border-surface-300 dark:border-surface-600 rounded-lg bg-[var(--bg-input)] text-sm focus:outline-none focus:ring-2 focus:ring-accent-700"
                          placeholder="e.g., General Shift"
                        />
                        {form.formState.errors.shiftName && (
                          <p className="text-xs text-danger-500 mt-1">
                            {form.formState.errors.shiftName.message}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Times */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                          Start Time *
                        </label>
                        <input
                          type="time"
                          {...form.register('startTime')}
                          className="w-full px-4 py-2 border border-surface-300 dark:border-surface-600 rounded-lg bg-[var(--bg-input)] text-sm focus:outline-none focus:ring-2 focus:ring-accent-700"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                          End Time *
                        </label>
                        <input
                          type="time"
                          {...form.register('endTime')}
                          className="w-full px-4 py-2 border border-surface-300 dark:border-surface-600 rounded-lg bg-[var(--bg-input)] text-sm focus:outline-none focus:ring-2 focus:ring-accent-700"
                        />
                      </div>
                    </div>

                    {/* Type & Color */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                          Shift Type
                        </label>
                        <select
                          {...form.register('shiftType')}
                          className="w-full px-4 py-2 border border-surface-300 dark:border-surface-600 rounded-lg bg-[var(--bg-input)] text-sm focus:outline-none focus:ring-2 focus:ring-accent-700"
                        >
                          {SHIFT_TYPES.map((t) => (
                            <option key={t.value} value={t.value}>
                              {t.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                          Color
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            {...form.register('colorCode')}
                            className="w-8 h-8 rounded cursor-pointer border-0"
                          />
                          <div className="flex gap-1">
                            {COLOR_PRESETS.map((c) => (
                              <button
                                key={c}
                                type="button"
                                onClick={() => form.setValue('colorCode', c)}
                                className="w-5 h-5 rounded-full border-2 border-transparent hover:border-surface-400"
                                style={{ backgroundColor: c }}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Working Days */}
                    <div>
                      <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                        Working Days
                      </label>
                      <Controller
                        control={form.control}
                        name="workingDays"
                        render={({ field }) => {
                          const selected = field.value.split(',').filter(Boolean);
                          return (
                            <div className="flex gap-1">
                              {WEEKDAYS.map((day) => {
                                const isSelected = selected.includes(day);
                                return (
                                  <button
                                    key={day}
                                    type="button"
                                    onClick={() => {
                                      const next = isSelected
                                        ? selected.filter((d) => d !== day)
                                        : [...selected, day];
                                      field.onChange(next.join(','));
                                    }}
                                    className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                      isSelected
                                        ? 'bg-accent-700 text-white'
                                        : 'bg-surface-100 text-surface-600 dark:bg-surface-700 dark:text-surface-300 hover:bg-surface-200'
                                    }`}
                                  >
                                    {day}
                                  </button>
                                );
                              })}
                            </div>
                          );
                        }}
                      />
                    </div>

                    {/* Grace & Break */}
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                          Grace Period (min)
                        </label>
                        <input
                          type="number"
                          {...form.register('gracePeriodInMinutes')}
                          className="w-full px-4 py-2 border border-surface-300 dark:border-surface-600 rounded-lg bg-[var(--bg-input)] text-sm focus:outline-none focus:ring-2 focus:ring-accent-700"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                          Break Duration (min)
                        </label>
                        <input
                          type="number"
                          {...form.register('breakDurationMinutes')}
                          className="w-full px-4 py-2 border border-surface-300 dark:border-surface-600 rounded-lg bg-[var(--bg-input)] text-sm focus:outline-none focus:ring-2 focus:ring-accent-700"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                          Min Gap (hours)
                        </label>
                        <input
                          type="number"
                          {...form.register('minGapBetweenShiftsHours')}
                          className="w-full px-4 py-2 border border-surface-300 dark:border-surface-600 rounded-lg bg-[var(--bg-input)] text-sm focus:outline-none focus:ring-2 focus:ring-accent-700"
                        />
                      </div>
                    </div>

                    {/* Toggles */}
                    <div className="flex flex-wrap gap-4">
                      {[
                        { name: 'isNightShift' as const, label: 'Night Shift', icon: Moon },
                        { name: 'isFlexible' as const, label: 'Flexible', icon: Zap },
                        { name: 'allowsOvertime' as const, label: 'Allows Overtime', icon: Clock },
                        { name: 'isActive' as const, label: 'Active', icon: Check },
                      ].map(({ name, label, icon: Icon }) => (
                        <Controller
                          key={name}
                          control={form.control}
                          name={name}
                          render={({ field }) => (
                            <button
                              type="button"
                              onClick={() => field.onChange(!field.value)}
                              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-colors ${
                                field.value
                                  ? 'bg-accent-100 text-accent-700 dark:bg-accent-900/30 dark:text-accent-400'
                                  : 'bg-surface-100 text-surface-600 dark:bg-surface-700 dark:text-surface-400'
                              }`}
                            >
                              <Icon className="w-3.5 h-3.5" />
                              {label}
                            </button>
                          )}
                        />
                      ))}
                    </div>

                    {/* Flexible window */}
                    {form.watch('isFlexible') && (
                      <div>
                        <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                          Flexible Window (minutes before/after)
                        </label>
                        <input
                          type="number"
                          {...form.register('flexibleWindowMinutes')}
                          className="w-full px-4 py-2 border border-surface-300 dark:border-surface-600 rounded-lg bg-[var(--bg-input)] text-sm focus:outline-none focus:ring-2 focus:ring-accent-700"
                        />
                      </div>
                    )}

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
                        className="px-4 py-2 text-sm font-medium text-white bg-accent-700 hover:bg-accent-800 rounded-lg disabled:opacity-50 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
                      >
                        {createMutation.isPending || updateMutation.isPending
                          ? 'Saving...'
                          : editingShift
                            ? 'Update Shift'
                            : 'Create Shift'}
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
