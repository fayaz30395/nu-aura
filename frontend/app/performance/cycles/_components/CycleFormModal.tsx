'use client';

import {useEffect} from 'react';
import {Controller, useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';
import {Button, NativeSelect, TextInput, Textarea} from '@mantine/core';
import {Modal, ModalBody, ModalFooter, ModalHeader} from '@/components/ui/Modal';
import {PermissionGate} from '@/components/auth/PermissionGate';
import {Permissions} from '@/lib/hooks/usePermissions';
import type {CycleStatus, CycleType, ReviewCycle, ReviewCycleRequest} from '@/lib/types/grow/performance';
import {CycleDateField} from './CycleDateField';
import {CYCLE_STATUS_OPTIONS, CYCLE_TYPE_OPTIONS} from './cycleOptions';

const cycleFormSchema = z.object({
  name: z.string().min(1, 'Cycle name is required').max(255),
  description: z.string().max(1000).optional().or(z.literal('')),
  cycleType: z.enum(['ANNUAL', 'SEMI_ANNUAL', 'QUARTERLY', 'MONTHLY', 'PROBATION', 'PROJECT_END'] as const) as z.ZodType<CycleType>,
  status: z.enum(['PLANNING', 'ACTIVE', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] as const) as z.ZodType<CycleStatus>,
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  reviewDeadline: z.string().min(1, 'Review deadline is required'),
  selfReviewDeadline: z.string().optional().or(z.literal('')),
}).refine(data => new Date(data.endDate) > new Date(data.startDate), {
  message: 'End date must be after start date',
  path: ['endDate'],
}).refine(data => !data.reviewDeadline || !data.startDate || !data.endDate
  || (data.reviewDeadline >= data.startDate && data.reviewDeadline <= data.endDate), {
  message: 'Review deadline must be within the cycle dates',
  path: ['reviewDeadline'],
});

type CycleFormData = z.infer<typeof cycleFormSchema>;

const EMPTY_FORM: CycleFormData = {
  name: '',
  description: '',
  cycleType: 'ANNUAL',
  status: 'PLANNING',
  startDate: '',
  endDate: '',
  reviewDeadline: '',
  selfReviewDeadline: '',
};

function toFormValues(cycle: ReviewCycle | null): CycleFormData {
  if (!cycle) return EMPTY_FORM;
  return {
    name: cycle.name ?? cycle.cycleName,
    description: cycle.description || '',
    cycleType: cycle.cycleType,
    status: cycle.status,
    startDate: cycle.startDate ?? '',
    endDate: cycle.endDate ?? '',
    reviewDeadline: cycle.reviewDeadline ?? cycle.managerReviewDeadline ?? '',
    selfReviewDeadline: cycle.selfReviewDeadline || '',
  };
}

interface CycleFormModalProps {
  isOpen: boolean;
  /** Cycle being edited; null when creating. */
  cycle: ReviewCycle | null;
  isSaving: boolean;
  onClose: () => void;
  onSubmit: (data: ReviewCycleRequest) => void | Promise<void>;
}

export function CycleFormModal({isOpen, cycle, isSaving, onClose, onSubmit}: CycleFormModalProps) {
  const {register, control, handleSubmit, reset, formState: {errors, isSubmitting}} = useForm<CycleFormData>({
    resolver: zodResolver(cycleFormSchema),
    defaultValues: EMPTY_FORM,
  });

  useEffect(() => {
    if (isOpen) reset(toFormValues(cycle));
  }, [isOpen, cycle, reset]);

  const submit = (data: CycleFormData) =>
    onSubmit({
      cycleName: data.name,
      cycleType: data.cycleType,
      status: data.status,
      startDate: data.startDate,
      endDate: data.endDate,
      managerReviewDeadline: data.reviewDeadline,
      description: data.description || '',
      selfReviewDeadline: data.selfReviewDeadline || '',
    });

  const pending = isSaving || isSubmitting;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <form onSubmit={handleSubmit(submit)} noValidate className="flex min-h-0 flex-1 flex-col">
        <ModalHeader onClose={onClose}>{cycle ? 'Edit Review Cycle' : 'Create Review Cycle'}</ModalHeader>
        <ModalBody className="flex flex-col gap-4">
          <TextInput
            id="name"
            label="Cycle Name *"
            placeholder="e.g., Annual Review 2026"
            error={errors.name?.message}
            {...register('name')}
          />
          <Textarea
            id="description"
            label="Description"
            rows={3}
            error={errors.description?.message}
            {...register('description')}
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <NativeSelect
              id="cycle-type"
              label="Cycle Type *"
              data={CYCLE_TYPE_OPTIONS}
              error={errors.cycleType?.message}
              {...register('cycleType')}
            />
            <NativeSelect
              id="cycle-status"
              label="Status *"
              data={CYCLE_STATUS_OPTIONS}
              error={errors.status?.message}
              {...register('status')}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Controller
              name="startDate"
              control={control}
              render={({field}) => (
                <CycleDateField id="cycle-start-date" label="Start Date *" value={field.value}
                                onChange={field.onChange} error={errors.startDate?.message}/>
              )}
            />
            <Controller
              name="endDate"
              control={control}
              render={({field}) => (
                <CycleDateField id="cycle-end-date" label="End Date *" value={field.value}
                                onChange={field.onChange} error={errors.endDate?.message}/>
              )}
            />
            <Controller
              name="reviewDeadline"
              control={control}
              render={({field}) => (
                <CycleDateField id="cycle-review-deadline" label="Review Deadline *" value={field.value}
                                onChange={field.onChange} error={errors.reviewDeadline?.message}/>
              )}
            />
            <Controller
              name="selfReviewDeadline"
              control={control}
              render={({field}) => (
                <CycleDateField id="cycle-self-review-deadline" label="Self Review Deadline" value={field.value ?? ''}
                                onChange={field.onChange} error={errors.selfReviewDeadline?.message}/>
              )}
            />
          </div>
        </ModalBody>
        <ModalFooter>
          <Button type="button" variant="default" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <PermissionGate permission={cycle ? Permissions.REVIEW_UPDATE : Permissions.REVIEW_CREATE}>
            <Button type="submit" loading={pending}>
              {cycle ? 'Update' : 'Create'}
            </Button>
          </PermissionGate>
        </ModalFooter>
      </form>
    </Modal>
  );
}
