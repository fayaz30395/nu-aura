'use client';

import {useEffect} from 'react';
import {Controller, useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {Button, Checkbox, NativeSelect, NumberInput, TextInput, Textarea} from '@mantine/core';
import {Modal, ModalBody, ModalFooter, ModalHeader} from '@/components/ui/Modal';
import type {Objective} from '@/lib/services/grow/okr.service';
import {emptyObjectiveForm, humanize, OBJECTIVE_LEVELS, objectiveFormSchema, type ObjectiveFormData} from './okrConfig';

const LEVEL_OPTIONS = OBJECTIVE_LEVELS.map((level) => ({value: level, label: humanize(level)}));

function toFormValues(objective: Objective | null): ObjectiveFormData {
  if (!objective) return emptyObjectiveForm();
  return {
    title: objective.title,
    description: objective.description || '',
    startDate: objective.startDate.split('T')[0],
    endDate: objective.endDate.split('T')[0],
    objectiveLevel: objective.objectiveLevel,
    weight: objective.weight,
    isStretchGoal: objective.isStretchGoal,
  };
}

interface ObjectiveFormModalProps {
  isOpen: boolean;
  /** Objective being edited; null when creating. */
  objective: Objective | null;
  isSaving: boolean;
  onClose: () => void;
  onSubmit: (data: ObjectiveFormData) => void | Promise<void>;
}

export function ObjectiveFormModal({isOpen, objective, isSaving, onClose, onSubmit}: ObjectiveFormModalProps) {
  const {register, control, handleSubmit, reset, formState: {errors, isSubmitting}} = useForm<ObjectiveFormData>({
    resolver: zodResolver(objectiveFormSchema),
    defaultValues: emptyObjectiveForm(),
  });

  useEffect(() => {
    if (isOpen) reset(toFormValues(objective));
  }, [isOpen, objective, reset]);

  const pending = isSaving || isSubmitting;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex min-h-0 flex-1 flex-col">
        <ModalHeader onClose={onClose}>{objective ? 'Edit Objective' : 'Create Objective'}</ModalHeader>
        <ModalBody className="flex flex-col gap-4">
          <TextInput
            id="objective-title"
            label="Title *"
            placeholder="What do you want to achieve?"
            error={errors.title?.message}
            {...register('title')}
          />
          <Textarea
            id="objective-description"
            label="Description"
            placeholder="Why is this important?"
            rows={3}
            {...register('description')}
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextInput
              id="objective-start-date"
              type="date"
              label="Start Date *"
              error={errors.startDate?.message}
              {...register('startDate')}
            />
            <TextInput
              id="objective-end-date"
              type="date"
              label="End Date *"
              error={errors.endDate?.message}
              {...register('endDate')}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <NativeSelect id="objective-level" label="Level" data={LEVEL_OPTIONS} {...register('objectiveLevel')}/>
            <Controller
              name="weight"
              control={control}
              render={({field}) => (
                <NumberInput
                  id="objective-weight"
                  label="Weight"
                  min={0}
                  max={10}
                  step={0.1}
                  decimalScale={1}
                  value={field.value}
                  onChange={(v) => field.onChange(typeof v === 'number' ? v : NaN)}
                  onBlur={field.onBlur}
                  error={errors.weight?.message}
                />
              )}
            />
          </div>
          <Checkbox
            id="isStretchGoal"
            label="This is a stretch goal (ambitious target)"
            {...register('isStretchGoal')}
          />
        </ModalBody>
        <ModalFooter>
          <Button type="button" variant="default" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button type="submit" loading={pending}>
            {objective ? 'Update' : 'Create'}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
