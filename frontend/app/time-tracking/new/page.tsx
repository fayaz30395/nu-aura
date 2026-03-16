'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout';
import { CreateTimeEntryRequest, EntryType } from '@/lib/types/time-tracking';
import { useCreateTimeEntry, useSubmitTimeEntry } from '@/lib/hooks/queries/useTimeTracking';
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  Calendar,
  Clock,
  FileText,
  DollarSign,
} from 'lucide-react';

export default function NewTimeEntryPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const createMutation = useCreateTimeEntry();
  const submitMutation = useSubmitTimeEntry();

  const [formData, setFormData] = useState<CreateTimeEntryRequest>({
    entryDate: new Date().toISOString().split('T')[0],
    hoursWorked: 8,
    billableHours: 8,
    isBillable: true,
    entryType: 'REGULAR',
    description: '',
  });

  const entryTypes: { value: EntryType; label: string }[] = [
    { value: 'REGULAR', label: 'Regular' },
    { value: 'OVERTIME', label: 'Overtime' },
    { value: 'HOLIDAY', label: 'Holiday' },
    { value: 'WEEKEND', label: 'Weekend' },
  ];

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.entryDate) {
      errors.entryDate = 'Please select a date';
    }

    if (!formData.hoursWorked || formData.hoursWorked <= 0) {
      errors.hoursWorked = 'Please enter valid hours worked';
    }

    if (formData.hoursWorked > 24) {
      errors.hoursWorked = 'Hours worked cannot exceed 24 hours';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (submit: boolean = false) => {
    if (!validateForm()) return;

    try {
      setError(null);

      const entry = await createMutation.mutateAsync(formData);

      if (submit) {
        await submitMutation.mutateAsync(entry.id);
      }

      router.push('/time-tracking');
    } catch (err) {
      console.error('Error creating time entry:', err);
      setError('Failed to create time entry');
    }
  };

  const isLoading = createMutation.isPending || submitMutation.isPending;

  return (
    <AppLayout activeMenuItem="time-tracking">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)] rounded-xl transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-[var(--text-secondary)]" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">
              Log Time Entry
            </h1>
            <p className="text-[var(--text-muted)] mt-1">
              Record your work hours
            </p>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-4">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Form */}
        <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-main)] p-6 space-y-6">
          {/* Entry Date */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
              Date *
            </label>
            <div className="relative">
              <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--text-muted)]" />
              <input
                type="date"
                value={formData.entryDate}
                onChange={(e) => setFormData({ ...formData, entryDate: e.target.value })}
                className={`w-full pl-12 pr-4 py-3 bg-[var(--bg-secondary)] border ${
                  validationErrors.entryDate
                    ? 'border-red-500'
                    : 'border-[var(--border-main)]'
                } rounded-xl text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary-500`}
              />
            </div>
            {validationErrors.entryDate && (
              <p className="mt-1 text-sm text-red-500">{validationErrors.entryDate}</p>
            )}
          </div>

          {/* Time Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                Start Time
              </label>
              <div className="relative">
                <Clock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--text-muted)]" />
                <input
                  type="time"
                  value={formData.startTime || ''}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                  className="w-full pl-12 pr-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border-main)] rounded-xl text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                End Time
              </label>
              <div className="relative">
                <Clock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--text-muted)]" />
                <input
                  type="time"
                  value={formData.endTime || ''}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                  className="w-full pl-12 pr-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border-main)] rounded-xl text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
          </div>

          {/* Hours Worked */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
              Hours Worked *
            </label>
            <input
              type="number"
              step="0.5"
              value={formData.hoursWorked || ''}
              onChange={(e) => {
                const hours = parseFloat(e.target.value) || 0;
                setFormData({
                  ...formData,
                  hoursWorked: hours,
                  billableHours: formData.isBillable ? hours : (formData.billableHours || 0),
                });
              }}
              placeholder="8"
              className={`w-full px-4 py-3 bg-[var(--bg-secondary)] border ${
                validationErrors.hoursWorked
                  ? 'border-red-500'
                  : 'border-[var(--border-main)]'
              } rounded-xl text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary-500`}
            />
            {validationErrors.hoursWorked && (
              <p className="mt-1 text-sm text-red-500">{validationErrors.hoursWorked}</p>
            )}
          </div>

          {/* Entry Type */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
              Entry Type
            </label>
            <select
              value={formData.entryType}
              onChange={(e) => setFormData({ ...formData, entryType: e.target.value as EntryType })}
              className="w-full px-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border-main)] rounded-xl text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {entryTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {/* Billable */}
          <div className="flex items-center gap-4 p-4 bg-[var(--bg-secondary)] rounded-xl">
            <label className="flex items-center gap-4 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isBillable}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    isBillable: e.target.checked,
                    billableHours: e.target.checked ? formData.hoursWorked : 0,
                  })
                }
                className="w-5 h-5 rounded border-[var(--border-main)] text-primary-500 focus:ring-primary-500"
              />
              <span className="text-sm font-medium text-[var(--text-secondary)]">
                Billable Hours
              </span>
            </label>

            {formData.isBillable && (
              <div className="flex-1 flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-[var(--text-muted)]" />
                <input
                  type="number"
                  step="0.5"
                  value={formData.billableHours || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, billableHours: parseFloat(e.target.value) || 0 })
                  }
                  placeholder="Billable hours"
                  className="flex-1 px-3 py-2 bg-[var(--bg-card)] border border-[var(--border-main)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            )}
          </div>

          {/* Hourly Rate */}
          {formData.isBillable && (
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                Hourly Rate (optional)
              </label>
              <div className="relative">
                <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--text-muted)]" />
                <input
                  type="number"
                  step="0.01"
                  value={formData.hourlyRate || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, hourlyRate: parseFloat(e.target.value) || undefined })
                  }
                  placeholder="0.00"
                  className="w-full pl-12 pr-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border-main)] rounded-xl text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
          )}

          {/* Client Name */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
              Client / Project
            </label>
            <input
              type="text"
              value={formData.clientName || ''}
              onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
              placeholder="Enter client or project name"
              className="w-full px-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border-main)] rounded-xl text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
              Description
            </label>
            <div className="relative">
              <FileText className="absolute left-4 top-4 h-5 w-5 text-[var(--text-muted)]" />
              <textarea
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="What did you work on?"
                rows={4}
                className="w-full pl-12 pr-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border-main)] rounded-xl text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
              Notes
            </label>
            <textarea
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Any additional notes..."
              rows={2}
              className="w-full px-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border-main)] rounded-xl text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4">
          <button
            onClick={() => router.back()}
            className="px-6 py-3 bg-[var(--bg-secondary)] text-[var(--text-secondary)] rounded-xl font-medium hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => handleSubmit(false)}
            disabled={isLoading}
            className="flex-1 px-6 py-3 bg-[var(--bg-secondary)] dark:bg-[var(--bg-secondary)] text-[var(--text-secondary)] rounded-xl font-medium hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)] transition-colors disabled:opacity-50"
          >
            Save as Draft
          </button>
          <button
            onClick={() => handleSubmit(true)}
            disabled={isLoading}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white rounded-xl font-medium shadow-lg shadow-primary-500/25 transition-all duration-200 disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Saving...
              </>
            ) : (
              'Submit for Approval'
            )}
          </button>
        </div>
      </div>
    </AppLayout>
  );
}
