'use client';

import {useEffect} from 'react';
import {Controller, useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {Button, NativeSelect, NumberInput, Textarea, TextInput} from '@mantine/core';
import {Modal, ModalBody, ModalFooter, ModalHeader} from '@/components/ui/Modal';
import {useAddCompetency} from '@/lib/hooks/useCompetency';
import {
  CATEGORY_OPTIONS,
  competencySchema,
  type CompetencyFormData,
  type ReviewOption,
} from './competencyFrameworkConfig';

interface AddCompetencyModalProps {
  /** Preset review (opened from a review panel). When null the user picks one from `reviewOptions`. */
  reviewId: string | null;
  reviewOptions: ReviewOption[];
  isOpen: boolean;
  onClose: () => void;
}

const emptyForm = (reviewId: string | null): CompetencyFormData => ({
  reviewId: reviewId ?? '',
  competencyName: '',
  category: 'TECHNICAL',
  rating: 3,
  comments: '',
});

export function AddCompetencyModal({reviewId, reviewOptions, isOpen, onClose}: AddCompetencyModalProps) {
  const addMutation = useAddCompetency();

  const {register, control, handleSubmit, reset, formState: {errors, isSubmitting}} = useForm<CompetencyFormData>({
    resolver: zodResolver(competencySchema),
    defaultValues: emptyForm(reviewId),
  });

  useEffect(() => {
    if (isOpen) reset(emptyForm(reviewId));
  }, [isOpen, reviewId, reset]);

  const onSubmit = async (data: CompetencyFormData) => {
    try {
      await addMutation.mutateAsync({
        reviewId: data.reviewId,
        competencyName: data.competencyName,
        category: data.category,
        rating: data.rating,
        comments: data.comments,
      });
      onClose();
    } catch {
      // Global MutationCache toast reports the error; keep the modal open.
    }
  };

  const pending = isSubmitting || addMutation.isPending;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm">
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex min-h-0 flex-1 flex-col">
        <ModalHeader onClose={onClose}>Add Competency</ModalHeader>
        <ModalBody className="flex flex-col gap-4">
          {!reviewId && (
            <NativeSelect
              id="competency-review"
              label="Review"
              withAsterisk
              data={[{value: '', label: 'Select a review…'}, ...reviewOptions]}
              error={errors.reviewId?.message}
              {...register('reviewId')}
            />
          )}
          <TextInput
            id="competency-name"
            label="Competency Name"
            withAsterisk
            aria-required="true"
            placeholder="e.g. System Design, Communication"
            error={errors.competencyName?.message}
            {...register('competencyName')}
          />
          <NativeSelect
            id="competency-category"
            label="Category"
            withAsterisk
            aria-required="true"
            data={CATEGORY_OPTIONS.map((opt) => ({value: opt.value, label: opt.label}))}
            error={errors.category?.message}
            {...register('category')}
          />
          <Controller
            name="rating"
            control={control}
            render={({field}) => (
              <NumberInput
                id="competency-rating"
                label="Rating (1–5)"
                withAsterisk
                aria-required="true"
                min={1}
                max={5}
                step={0.5}
                value={field.value}
                onChange={(v) => field.onChange(typeof v === 'number' ? v : NaN)}
                onBlur={field.onBlur}
                error={errors.rating?.message}
              />
            )}
          />
          <Textarea
            id="competency-comments"
            label="Comments (Optional)"
            rows={3}
            placeholder="Add observations or development notes…"
            {...register('comments')}
          />
        </ModalBody>
        <ModalFooter>
          <Button type="button" variant="default" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button type="submit" loading={pending}>
            Add Competency
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
