'use client';

import {useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';
import {Button, Textarea, TextInput} from '@mantine/core';
import {Modal, ModalBody, ModalFooter, ModalHeader} from '@/components/ui/Modal';
import {useCreateRevision} from '@/lib/hooks/queries/useCompensation';
import {RevisionType} from '@/lib/types/hrms/compensation';

const revisionSchema = z.object({
  newSalary: z
    .string()
    .min(1, 'New CTC is required')
    .refine((value) => Number(value) >= 1, 'New CTC must be at least 1'),
  designation: z.string(),
  effectiveDate: z.string().min(1, 'Effective date is required'),
  justification: z.string(),
});

type RevisionFormData = z.infer<typeof revisionSchema>;

const EMPTY_FORM: RevisionFormData = {newSalary: '', designation: '', effectiveDate: '', justification: ''};

interface NewRevisionModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeId: string;
  employeeLabel?: string;
}

export function NewRevisionModal({isOpen, onClose, employeeId, employeeLabel}: NewRevisionModalProps) {
  const createRevisionMutation = useCreateRevision();
  const {register, handleSubmit, reset, formState: {errors}} = useForm<RevisionFormData>({
    resolver: zodResolver(revisionSchema),
    defaultValues: EMPTY_FORM,
  });

  const close = () => {
    reset(EMPTY_FORM);
    onClose();
  };

  const onSubmit = async (values: RevisionFormData) => {
    try {
      await createRevisionMutation.mutateAsync({
        employeeId,
        revisionType: RevisionType.ANNUAL_INCREMENT,
        newSalary: Number(values.newSalary),
        newDesignation: values.designation || undefined,
        effectiveDate: values.effectiveDate,
        justification: values.justification || undefined,
      });
      close();
    } catch {
      // The global MutationCache handler shows the error toast.
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={close} size="md">
      <ModalHeader onClose={close}>
        <h2 className="text-xl font-semibold text-text-1">New Salary Revision</h2>
        {employeeLabel && <p className="mt-1 text-xs text-text-2">{employeeLabel}</p>}
      </ModalHeader>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex min-h-0 flex-1 flex-col">
        <ModalBody className="flex flex-col gap-4">
          <TextInput
            label="New CTC"
            type="number"
            min={1}
            placeholder="New CTC"
            withAsterisk
            error={errors.newSalary?.message}
            {...register('newSalary')}
          />
          <TextInput
            label="Designation"
            placeholder="New designation"
            error={errors.designation?.message}
            {...register('designation')}
          />
          <TextInput
            label="Effective Date"
            type="date"
            withAsterisk
            error={errors.effectiveDate?.message}
            {...register('effectiveDate')}
          />
          <Textarea label="Justification" rows={3} {...register('justification')}/>
        </ModalBody>
        <ModalFooter>
          <Button variant="default" onClick={close} disabled={createRevisionMutation.isPending}>
            Cancel
          </Button>
          <Button type="submit" loading={createRevisionMutation.isPending}>
            Save
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
