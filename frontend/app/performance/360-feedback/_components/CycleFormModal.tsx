'use client';

import {useEffect} from 'react';
import {Controller, useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';
import {Button, Checkbox, NumberInput, TextInput, Textarea} from '@mantine/core';
import {Modal, ModalBody, ModalFooter, ModalHeader} from '@/components/ui/Modal';
import {PermissionGate} from '@/components/auth/PermissionGate';
import {Permissions} from '@/lib/hooks/usePermissions';
import {getLocalDateString} from '@/lib/utils/dateUtils';
import type {CycleRequest} from '@/lib/services/grow/feedback360.service';

const peerCount = z.number({invalid_type_error: 'Enter a number'}).int().min(1, 'Minimum is 1').max(10, 'Maximum is 10');

const cycleFormSchema = z.object({
  name: z.string().trim().min(1, 'Cycle name is required'),
  description: z.string(),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  nominationDeadline: z.string(),
  selfReviewDeadline: z.string(),
  peerReviewDeadline: z.string(),
  managerReviewDeadline: z.string(),
  minPeersRequired: peerCount,
  maxPeersAllowed: peerCount,
  isAnonymous: z.boolean(),
  includeSelfReview: z.boolean(),
  includeManagerReview: z.boolean(),
  includePeerReview: z.boolean(),
  includeUpwardReview: z.boolean(),
});

type CycleFormData = z.infer<typeof cycleFormSchema>;

const OPTIONAL_DEADLINES = ['nominationDeadline', 'selfReviewDeadline', 'peerReviewDeadline', 'managerReviewDeadline'] as const;

const defaultValues = (): CycleFormData => ({
  name: '',
  description: '',
  startDate: getLocalDateString(new Date()),
  endDate: getLocalDateString(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)),
  nominationDeadline: '',
  selfReviewDeadline: '',
  peerReviewDeadline: '',
  managerReviewDeadline: '',
  minPeersRequired: 3,
  maxPeersAllowed: 5,
  isAnonymous: true,
  includeSelfReview: true,
  includeManagerReview: true,
  includePeerReview: true,
  includeUpwardReview: false,
});

function toRequest(data: CycleFormData): CycleRequest {
  const request: CycleRequest = {...data};
  for (const key of OPTIONAL_DEADLINES) {
    if (!data[key]) delete request[key];
  }
  return request;
}

const DATE_FIELDS = [
  {name: 'startDate', id: 'cycle-start-date', label: 'Start Date *'},
  {name: 'endDate', id: 'cycle-end-date', label: 'End Date *'},
  {name: 'nominationDeadline', id: 'cycle-nomination-deadline', label: 'Nomination Deadline'},
  {name: 'selfReviewDeadline', id: 'cycle-self-review-deadline', label: 'Self Review Deadline'},
  {name: 'peerReviewDeadline', id: 'cycle-peer-review-deadline', label: 'Peer Review Deadline'},
  {name: 'managerReviewDeadline', id: 'cycle-manager-review-deadline', label: 'Manager Review Deadline'},
] as const;

const REVIEW_TYPE_FIELDS = [
  {name: 'includeSelfReview', id: 'cycle-include-self-review', label: 'Self Review'},
  {name: 'includeManagerReview', id: 'cycle-include-manager-review', label: 'Manager Review'},
  {name: 'includePeerReview', id: 'cycle-include-peer-review', label: 'Peer Review'},
  {name: 'includeUpwardReview', id: 'cycle-include-upward-review', label: 'Upward Review'},
] as const;

interface CycleFormModalProps {
  isOpen: boolean;
  isSaving: boolean;
  onClose: () => void;
  /** Resolves true when the cycle was created. */
  onSubmit: (data: CycleRequest) => Promise<boolean>;
}

export function CycleFormModal({isOpen, isSaving, onClose, onSubmit}: CycleFormModalProps) {
  const {register, control, handleSubmit, reset, formState: {errors, isSubmitting}} = useForm<CycleFormData>({
    resolver: zodResolver(cycleFormSchema),
    defaultValues: defaultValues(),
  });

  useEffect(() => {
    if (isOpen) reset(defaultValues());
  }, [isOpen, reset]);

  const submit = async (data: CycleFormData) => {
    if (await onSubmit(toRequest(data))) onClose();
  };

  const pending = isSaving || isSubmitting;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <form onSubmit={handleSubmit(submit)} noValidate className="flex min-h-0 flex-1 flex-col">
        <ModalHeader onClose={onClose}>Create 360 Feedback Cycle</ModalHeader>
        <ModalBody className="flex flex-col gap-4">
          <TextInput
            id="cycle-name"
            label="Cycle Name *"
            placeholder="Q4 2024 Performance Review"
            error={errors.name?.message}
            {...register('name')}
          />
          <Textarea id="cycle-description" label="Description" rows={2} {...register('description')}/>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {DATE_FIELDS.map(({name, id, label}) => (
              <TextInput key={name} id={id} type="date" label={label} error={errors[name]?.message} {...register(name)}/>
            ))}
            <Controller
              name="minPeersRequired"
              control={control}
              render={({field}) => (
                <NumberInput
                  id="cycle-min-peer-reviewers"
                  label="Min Peer Reviewers"
                  min={1}
                  max={10}
                  allowDecimal={false}
                  value={field.value}
                  onChange={(v) => field.onChange(typeof v === 'number' ? v : NaN)}
                  onBlur={field.onBlur}
                  error={errors.minPeersRequired?.message}
                />
              )}
            />
            <Controller
              name="maxPeersAllowed"
              control={control}
              render={({field}) => (
                <NumberInput
                  id="cycle-max-peer-reviewers"
                  label="Max Peer Reviewers"
                  min={1}
                  max={10}
                  allowDecimal={false}
                  value={field.value}
                  onChange={(v) => field.onChange(typeof v === 'number' ? v : NaN)}
                  onBlur={field.onBlur}
                  error={errors.maxPeersAllowed?.message}
                />
              )}
            />
          </div>
          <fieldset className="flex flex-col gap-4 border-t border-border pt-4">
            <legend className="text-sm font-medium text-text-1">Review Types</legend>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {REVIEW_TYPE_FIELDS.map(({name, id, label}) => (
                <Checkbox key={name} id={id} label={label} {...register(name)}/>
              ))}
            </div>
            <Checkbox id="cycle-is-anonymous" label="Anonymous peer feedback" {...register('isAnonymous')}/>
          </fieldset>
        </ModalBody>
        <ModalFooter>
          <Button type="button" variant="default" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <PermissionGate permission={Permissions.FEEDBACK_360_CREATE}>
            <Button type="submit" loading={pending}>Create Cycle</Button>
          </PermissionGate>
        </ModalFooter>
      </form>
    </Modal>
  );
}
