'use client';

import {useEffect} from 'react';
import {Controller, useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';
import {Button, NativeSelect} from '@mantine/core';
import {Modal, ModalBody, ModalFooter, ModalHeader} from '@/components/ui/Modal';
import {EmployeeSearchAutocomplete} from '@/components/ui/EmployeeSearchAutocomplete';
import {PermissionGate} from '@/components/auth/PermissionGate';
import {Permissions} from '@/lib/hooks/usePermissions';
import type {Feedback360Cycle, NominationRequest} from '@/lib/services/grow/feedback360.service';

const REVIEWER_TYPE_OPTIONS = [
  {value: 'PEER', label: 'Peer'},
  {value: 'MANAGER', label: 'Manager'},
  {value: 'DIRECT_REPORT', label: 'Direct Report'},
  {value: 'EXTERNAL', label: 'External'},
];

const nominateSchema = z.object({
  nominee: z.object({id: z.string(), name: z.string()}).nullable()
    .refine((v): boolean => v !== null, 'Select a reviewer'),
  reviewerType: z.enum(['PEER', 'MANAGER', 'DIRECT_REPORT', 'EXTERNAL']),
});

type NominateFormData = z.infer<typeof nominateSchema>;

const EMPTY_NOMINATION: NominateFormData = {nominee: null, reviewerType: 'PEER'};

interface NominateReviewerModalProps {
  cycle: Feedback360Cycle | null;
  /** Current user's employee id; nomination is a no-op without it. */
  subjectEmployeeId?: string;
  isSaving: boolean;
  onClose: () => void;
  /** Resolves true when the reviewer was nominated. */
  onSubmit: (data: NominationRequest) => Promise<boolean>;
}

export function NominateReviewerModal({cycle, subjectEmployeeId, isSaving, onClose, onSubmit}: NominateReviewerModalProps) {
  const {register, control, handleSubmit, reset, watch, formState: {errors, isSubmitting}} = useForm<NominateFormData>({
    resolver: zodResolver(nominateSchema),
    defaultValues: EMPTY_NOMINATION,
  });

  useEffect(() => {
    if (cycle) reset(EMPTY_NOMINATION);
  }, [cycle, reset]);

  const submit = async ({nominee, reviewerType}: NominateFormData) => {
    if (!cycle || !nominee || !subjectEmployeeId) return;
    const ok = await onSubmit({cycleId: cycle.id, subjectEmployeeId, reviewerId: nominee.id, reviewerType});
    if (ok) onClose();
  };

  const pending = isSaving || isSubmitting;
  const nominee = watch('nominee');

  return (
    <Modal isOpen={!!cycle} onClose={onClose}>
      <form onSubmit={handleSubmit(submit)} noValidate className="flex min-h-0 flex-1 flex-col">
        <ModalHeader onClose={onClose}>Nominate a Reviewer</ModalHeader>
        <ModalBody className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <Controller
              name="nominee"
              control={control}
              render={({field}) => (
                <EmployeeSearchAutocomplete
                  label="Reviewer"
                  placeholder="Search for a colleague..."
                  value={field.value}
                  onChange={field.onChange}
                  excludeIds={subjectEmployeeId ? [subjectEmployeeId] : []}
                  required
                />
              )}
            />
            {errors.nominee?.message && <p className="text-xs text-danger-600">{errors.nominee.message}</p>}
          </div>
          <NativeSelect
            id="nominate-reviewer-type"
            label="Reviewer Type"
            data={REVIEWER_TYPE_OPTIONS}
            {...register('reviewerType')}
          />
        </ModalBody>
        <ModalFooter>
          <Button type="button" variant="default" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <PermissionGate permission={Permissions.FEEDBACK_360_CREATE}>
            <Button type="submit" loading={pending} disabled={!nominee}>Nominate</Button>
          </PermissionGate>
        </ModalFooter>
      </form>
    </Modal>
  );
}
