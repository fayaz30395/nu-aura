'use client';

import {useEffect, useState} from 'react';
import {useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {Button, NativeSelect, Textarea, TextInput} from '@mantine/core';
import {Modal, ModalBody, ModalFooter, ModalHeader} from '@/components/ui/Modal';
import type {PerformanceReview} from '@/lib/types/grow/performance';
import {
  defaultCompetencyRatings,
  EMPTY_REVIEW_FORM,
  REVIEW_TYPE_OPTIONS,
  type ReviewFormData,
  reviewFormSchema,
  SELF_ASSESSMENT_COMPETENCIES,
  toReviewFormValues,
} from './reviewForm';

const TEXT_FIELDS: Array<{name: keyof ReviewFormData; id: string; label: string}> = [
  {name: 'strengths', id: 'review-strengths', label: 'Strengths'},
  {name: 'areasForImprovement', id: 'review-areas-improvement', label: 'Areas for Improvement'},
  {name: 'goals', id: 'review-goals', label: 'Goals'},
];

const COMMENT_FIELDS: Array<{name: keyof ReviewFormData; id: string; label: string}> = [
  {name: 'reviewerComments', id: 'review-reviewer-comments', label: 'Reviewer Comments'},
  {name: 'employeeComments', id: 'review-employee-comments', label: 'Employee Comments'},
];

interface ReviewFormModalProps {
  isOpen: boolean;
  /** Review being viewed/edited; null when creating. */
  review: PerformanceReview | null;
  isSaving: boolean;
  onClose: () => void;
  onSubmit: (data: ReviewFormData, competencyRatings: Record<string, number>) => Promise<void>;
}

export function ReviewFormModal({isOpen, review, isSaving, onClose, onSubmit}: ReviewFormModalProps) {
  const [competencyRatings, setCompetencyRatings] = useState<Record<string, number>>(defaultCompetencyRatings);
  const {register, handleSubmit, reset, formState: {errors, isSubmitting}} = useForm<ReviewFormData>({
    resolver: zodResolver(reviewFormSchema),
    defaultValues: EMPTY_REVIEW_FORM,
  });

  useEffect(() => {
    if (!isOpen) return;
    reset(toReviewFormValues(review));
    setCompetencyRatings(defaultCompetencyRatings());
  }, [isOpen, review, reset]);

  const isEditable = !review || review.status === 'DRAFT';
  const pending = isSaving || isSubmitting;

  const renderTextarea = ({name, id, label}: {name: keyof ReviewFormData; id: string; label: string}) => (
    <Textarea
      key={id}
      id={id}
      label={label}
      rows={3}
      disabled={!isEditable}
      error={errors[name]?.message}
      {...register(name)}
    />
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <form
        onSubmit={handleSubmit((data) => onSubmit(data, competencyRatings))}
        noValidate
        className="flex min-h-0 flex-1 flex-col"
      >
        <ModalHeader onClose={onClose}>
          {review ? (isEditable ? 'Edit Review' : 'View Review') : 'Create Review'}
        </ModalHeader>
        <ModalBody className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <NativeSelect
              id="review-type"
              label="Review Type *"
              data={REVIEW_TYPE_OPTIONS}
              disabled={!isEditable}
              error={errors.reviewType?.message}
              {...register('reviewType')}
            />
            <TextInput
              id="review-period-start"
              type="date"
              label="Review Period Start *"
              disabled={!isEditable}
              error={errors.reviewPeriodStart?.message}
              {...register('reviewPeriodStart')}
            />
            <TextInput
              id="review-period-end"
              type="date"
              label="Review Period End *"
              disabled={!isEditable}
              error={errors.reviewPeriodEnd?.message}
              {...register('reviewPeriodEnd')}
            />
            <TextInput
              id="review-rating"
              type="number"
              label="Overall Rating (1-5) *"
              min={1}
              max={5}
              step={0.1}
              disabled={!isEditable}
              error={errors.overallRating?.message}
              classNames={{input: 'review-rating-input'}}
              {...register('overallRating')}
            />
          </div>

          {TEXT_FIELDS.map(renderTextarea)}

          {review?.reviewType === 'SELF' && (
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-2 text-sm font-semibold text-text-2">Competency Ratings (1–5)</legend>
              {SELF_ASSESSMENT_COMPETENCIES.map((comp) => (
                <div key={comp.name} className="flex items-center gap-4">
                  <label htmlFor={`competency-${comp.name}`} className="flex-1 text-sm text-text-2">
                    {comp.label}
                  </label>
                  <TextInput
                    id={`competency-${comp.name}`}
                    type="number"
                    min={1}
                    max={5}
                    step={1}
                    w={96}
                    disabled={!isEditable}
                    value={competencyRatings[comp.name] ?? 3}
                    onChange={(e) => {
                      const value = Number(e.currentTarget.value);
                      setCompetencyRatings((prev) => ({...prev, [comp.name]: Math.min(5, Math.max(1, value))}));
                    }}
                    classNames={{input: 'review-rating-input text-center'}}
                  />
                </div>
              ))}
            </fieldset>
          )}

          {COMMENT_FIELDS.map(renderTextarea)}
        </ModalBody>
        <ModalFooter>
          <Button type="button" variant="default" onClick={onClose} disabled={pending}>
            {isEditable ? 'Cancel' : 'Close'}
          </Button>
          {isEditable && (
            <Button type="submit" loading={pending}>
              {review ? 'Update' : 'Create'}
            </Button>
          )}
        </ModalFooter>
      </form>
    </Modal>
  );
}
