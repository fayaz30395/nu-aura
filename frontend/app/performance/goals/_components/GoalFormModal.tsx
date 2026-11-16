'use client';

import {useEffect} from 'react';
import {useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {Button, NativeSelect, Textarea, TextInput} from '@mantine/core';
import {Modal, ModalBody, ModalFooter, ModalHeader} from '@/components/ui/Modal';
import type {Goal} from '@/lib/types/grow/performance';
import {
  emptyGoalForm,
  GOAL_STATUS_OPTIONS,
  GOAL_TYPE_OPTIONS,
  goalFormSchema,
  type GoalFormData,
  goalToForm,
} from './goalConfig';

interface GoalFormModalProps {
  isOpen: boolean;
  /** Goal being edited; null when creating. */
  goal: Goal | null;
  employeeId: string;
  isSaving: boolean;
  onClose: () => void;
  onSubmit: (data: GoalFormData) => void | Promise<void>;
}

export function GoalFormModal({isOpen, goal, employeeId, isSaving, onClose, onSubmit}: GoalFormModalProps) {
  const {register, handleSubmit, reset, formState: {errors, isSubmitting}} = useForm<GoalFormData>({
    resolver: zodResolver(goalFormSchema),
    defaultValues: emptyGoalForm(employeeId),
  });

  useEffect(() => {
    if (isOpen) reset(goal ? goalToForm(goal) : emptyGoalForm(employeeId));
  }, [isOpen, goal, employeeId, reset]);

  const pending = isSaving || isSubmitting;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex min-h-0 flex-1 flex-col">
        <ModalHeader onClose={onClose}>{goal ? 'Edit Goal' : 'Create Goal'}</ModalHeader>
        <ModalBody className="flex flex-col gap-4">
          <TextInput id="goal-title" label="Title *" error={errors.title?.message} {...register('title')}/>
          <Textarea id="goal-description" label="Description" rows={3}
                    error={errors.description?.message} {...register('description')}/>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <NativeSelect id="goal-goal-type" label="Goal Type *" data={GOAL_TYPE_OPTIONS}
                          error={errors.goalType?.message} {...register('goalType')}/>
            <NativeSelect id="goal-status" label="Status *" data={GOAL_STATUS_OPTIONS}
                          error={errors.status?.message} {...register('status')}/>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <TextInput id="goal-target-value" type="number" label="Target Value *"
                       error={errors.targetValue?.message} {...register('targetValue')}/>
            <TextInput id="goal-current-value" type="number" label="Current Value *"
                       error={errors.currentValue?.message} {...register('currentValue')}/>
            <TextInput id="goal-unit" label="Unit *" placeholder="e.g., tasks, %"
                       error={errors.unit?.message} {...register('unit')}/>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextInput id="goal-start-date" type="date" label="Start Date *"
                       error={errors.startDate?.message} {...register('startDate')}/>
            <TextInput id="goal-end-date" type="date" label="End Date *"
                       error={errors.endDate?.message} {...register('endDate')}/>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button type="button" variant="default" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button type="submit" loading={pending}>
            {goal ? 'Update' : 'Create'}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
