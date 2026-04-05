'use client';

import { useCallback, useEffect } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Select, Textarea, Loader } from '@mantine/core';
import { Star, Save, Send, ChevronDown } from 'lucide-react';
import {
  useScorecardTemplates,
  useCreateScorecardMutation,
  useSubmitScorecardMutation,
} from '@/lib/hooks/queries/useScorecard';
import type {
  ScorecardCriterion,
  ScorecardRecommendation,
  ScorecardTemplate,
} from '@/lib/types/hire/scorecard';

// ==================== Schema ====================

const criterionSchema = z.object({
  name: z.string().min(1, 'Criterion name is required'),
  category: z.string().optional(),
  rating: z.number().min(1, 'Rating required').max(5),
  weight: z.number().min(0.1).max(10),
  notes: z.string().optional(),
  orderIndex: z.number().optional(),
});

const scorecardFormSchema = z.object({
  templateId: z.string().optional(),
  overallRating: z.number().min(1, 'Overall rating is required').max(5),
  recommendation: z.enum(['STRONG_YES', 'YES', 'NEUTRAL', 'NO', 'STRONG_NO'], {
    required_error: 'Recommendation is required',
  }),
  overallNotes: z.string().optional(),
  criteria: z.array(criterionSchema).min(1, 'At least one criterion is required'),
});

type ScorecardFormValues = z.infer<typeof scorecardFormSchema>;

// ==================== Constants ====================

const RECOMMENDATION_OPTIONS: {
  value: ScorecardRecommendation;
  label: string;
  color: string;
}[] = [
  { value: 'STRONG_YES', label: 'Strong Yes', color: 'var(--success-600)' },
  { value: 'YES', label: 'Yes', color: 'var(--success-400)' },
  { value: 'NEUTRAL', label: 'Neutral', color: 'var(--text-muted)' },
  { value: 'NO', label: 'No', color: 'var(--warning-500)' },
  { value: 'STRONG_NO', label: 'Strong No', color: 'var(--danger-500)' },
];

const DEFAULT_CRITERIA = [
  { name: 'Technical Skills', category: 'Technical', rating: 0, weight: 1, orderIndex: 0 },
  { name: 'Problem Solving', category: 'Technical', rating: 0, weight: 1, orderIndex: 1 },
  { name: 'Communication', category: 'Soft Skills', rating: 0, weight: 1, orderIndex: 2 },
  { name: 'Culture Fit', category: 'Soft Skills', rating: 0, weight: 1, orderIndex: 3 },
];

// ==================== Sub-components ====================

interface StarRatingProps {
  value: number;
  onChange: (rating: number) => void;
  size?: number;
}

function StarRating({ value, onChange, size = 18 }: StarRatingProps) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          className="cursor-pointer p-0.5 transition-transform hover:scale-110 focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] rounded"
          aria-label={`Rate ${star} out of 5`}
        >
          <Star
            size={size}
            className={
              star <= value
                ? 'fill-[var(--warning-400)] text-[var(--warning-400)]'
                : 'fill-none text-[var(--text-muted)]'
            }
          />
        </button>
      ))}
    </div>
  );
}

// ==================== Main Component ====================

interface ScorecardFormProps {
  interviewId: string;
  applicantId: string;
  jobOpeningId: string;
  onComplete: () => void;
}

export function ScorecardForm({
  interviewId,
  applicantId,
  jobOpeningId,
  onComplete,
}: ScorecardFormProps) {
  const { data: templates, isLoading: templatesLoading } = useScorecardTemplates();
  const createMutation = useCreateScorecardMutation();
  const submitMutation = useSubmitScorecardMutation();

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<ScorecardFormValues>({
    resolver: zodResolver(scorecardFormSchema),
    defaultValues: {
      templateId: undefined,
      overallRating: 0,
      recommendation: undefined,
      overallNotes: '',
      criteria: DEFAULT_CRITERIA,
    },
  });

  const { fields } = useFieldArray({ control, name: 'criteria' });
  const watchedTemplateId = watch('templateId');

  const applyTemplate = useCallback(
    (template: ScorecardTemplate) => {
      const mapped = template.criteria.map((c, i) => ({
        name: c.name,
        category: c.category ?? '',
        rating: 0,
        weight: c.weight,
        orderIndex: c.orderIndex ?? i,
      }));
      setValue('criteria', mapped);
    },
    [setValue]
  );

  useEffect(() => {
    if (watchedTemplateId && templates) {
      const found = templates.find((t) => t.id === watchedTemplateId);
      if (found) applyTemplate(found);
    }
  }, [watchedTemplateId, templates, applyTemplate]);

  const buildPayload = (values: ScorecardFormValues) => ({
    interviewId,
    applicantId,
    jobOpeningId,
    templateId: values.templateId,
    overallRating: values.overallRating,
    recommendation: values.recommendation,
    overallNotes: values.overallNotes,
    criteria: values.criteria as ScorecardCriterion[],
  });

  const handleSaveDraft = handleSubmit(async (values) => {
    const result = await createMutation.mutateAsync(buildPayload(values));
    reset();
    return result;
  });

  const handleSubmitScorecard = handleSubmit(async (values) => {
    const created = await createMutation.mutateAsync(buildPayload(values));
    await submitMutation.mutateAsync(created.id);
    onComplete();
  });

  const isSaving = createMutation.isPending || submitMutation.isPending;

  // Group criteria by category for visual separation
  const groupedCategories = fields.reduce<Record<string, number[]>>((acc, field, idx) => {
    const cat = field.category || 'General';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(idx);
    return acc;
  }, {});

  return (
    <div className="rounded-lg border border-[var(--border-main)] bg-[var(--bg-card)] p-4">
      <h3 className="text-sm font-semibold text-[var(--text-heading)] mb-4">
        Interview Scorecard
      </h3>

      {/* Template selector */}
      <div className="mb-4">
        <Controller
          control={control}
          name="templateId"
          render={({ field }) => (
            <Select
              label="Template"
              placeholder={templatesLoading ? 'Loading templates...' : 'Select a template (optional)'}
              data={
                templates?.map((t) => ({
                  value: t.id,
                  label: `${t.name}${t.isDefault ? ' (Default)' : ''}`,
                })) ?? []
              }
              value={field.value ?? null}
              onChange={(val) => field.onChange(val ?? undefined)}
              clearable
              size="sm"
              rightSection={templatesLoading ? <Loader size={14} /> : <ChevronDown size={14} />}
              classNames={{
                input: 'bg-[var(--bg-card)] border-[var(--border-main)] text-[var(--text-primary)] text-sm',
                label: 'text-xs font-medium text-[var(--text-secondary)] mb-1',
              }}
            />
          )}
        />
      </div>

      {/* Criteria by category */}
      <div className="space-y-4 mb-4">
        {Object.entries(groupedCategories).map(([category, indices]) => (
          <div key={category}>
            <p className="text-xs uppercase tracking-wide font-medium text-[var(--text-muted)] mb-2">
              {category}
            </p>
            <div className="space-y-2">
              {indices.map((idx) => (
                <div
                  key={fields[idx].id}
                  className="flex items-start gap-4 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-main)] p-2"
                >
                  {/* Name + weight */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-[var(--text-primary)] truncate">
                        {fields[idx].name}
                      </span>
                      <span className="text-2xs text-[var(--text-muted)] shrink-0">
                        w:{fields[idx].weight}
                      </span>
                    </div>
                    {/* Criterion notes */}
                    <Controller
                      control={control}
                      name={`criteria.${idx}.notes`}
                      render={({ field }) => (
                        <input
                          {...field}
                          value={field.value ?? ''}
                          type="text"
                          placeholder="Add notes..."
                          className="mt-1 w-full bg-transparent text-xs text-[var(--text-secondary)] placeholder:text-[var(--text-muted)] outline-none border-none p-0"
                        />
                      )}
                    />
                  </div>

                  {/* Star rating */}
                  <Controller
                    control={control}
                    name={`criteria.${idx}.rating`}
                    render={({ field }) => (
                      <StarRating
                        value={field.value}
                        onChange={field.onChange}
                        size={16}
                      />
                    )}
                  />
                  {errors.criteria?.[idx]?.rating && (
                    <span className="text-2xs text-[var(--danger-500)]">Required</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Overall rating */}
      <div className="flex items-center justify-between border-t border-[var(--border-subtle)] pt-4 mb-4">
        <div>
          <p className="text-xs font-medium text-[var(--text-secondary)] mb-1">
            Overall Rating
          </p>
          <Controller
            control={control}
            name="overallRating"
            render={({ field }) => (
              <StarRating value={field.value} onChange={field.onChange} size={22} />
            )}
          />
          {errors.overallRating && (
            <p className="text-2xs text-[var(--danger-500)] mt-0.5">
              {errors.overallRating.message}
            </p>
          )}
        </div>

        {/* Recommendation */}
        <div className="w-48">
          <Controller
            control={control}
            name="recommendation"
            render={({ field }) => (
              <Select
                label="Recommendation"
                placeholder="Select..."
                data={RECOMMENDATION_OPTIONS.map((opt) => ({
                  value: opt.value,
                  label: opt.label,
                }))}
                value={field.value ?? null}
                onChange={(val) => field.onChange(val ?? undefined)}
                size="sm"
                error={errors.recommendation?.message}
                classNames={{
                  input: 'bg-[var(--bg-card)] border-[var(--border-main)] text-[var(--text-primary)] text-sm',
                  label: 'text-xs font-medium text-[var(--text-secondary)] mb-1',
                }}
              />
            )}
          />
        </div>
      </div>

      {/* Overall notes */}
      <div className="mb-4">
        <Controller
          control={control}
          name="overallNotes"
          render={({ field }) => (
            <Textarea
              label="Overall Notes"
              placeholder="Summary of interview performance, key observations..."
              value={field.value ?? ''}
              onChange={field.onChange}
              minRows={3}
              maxRows={6}
              size="sm"
              classNames={{
                input: 'bg-[var(--bg-card)] border-[var(--border-main)] text-[var(--text-primary)] text-sm',
                label: 'text-xs font-medium text-[var(--text-secondary)] mb-1',
              }}
            />
          )}
        />
      </div>

      {/* Action buttons */}
      <div className="flex items-center justify-end gap-2 border-t border-[var(--border-subtle)] pt-4">
        <button
          type="button"
          onClick={handleSaveDraft}
          disabled={isSaving}
          className="skeuo-button flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-[var(--border-main)] bg-[var(--bg-card)] text-[var(--text-primary)] cursor-pointer hover:bg-[var(--bg-main)] active:translate-y-px disabled:opacity-50 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)]"
        >
          <Save size={14} />
          Save Draft
        </button>
        <button
          type="button"
          onClick={handleSubmitScorecard}
          disabled={isSaving}
          className="skeuo-button flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-[var(--accent-primary)] text-white cursor-pointer hover:bg-[var(--accent-primary-hover)] active:translate-y-px disabled:opacity-50 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)]"
        >
          <Send size={14} />
          Submit
        </button>
      </div>
    </div>
  );
}
