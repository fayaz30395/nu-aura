'use client';

import {useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';
import {Textarea} from '@mantine/core';
import {Button} from '@/components/ui';
import {Modal, ModalBody, ModalFooter, ModalHeader} from '@/components/ui/Modal';

// DEF-42: Zod schema for regularization form
const regularizationSchema = z.object({
  reason: z.string().min(1, 'Reason is required').max(1000, 'Reason must be 1000 characters or less'),
});

type RegularizationFormData = z.infer<typeof regularizationSchema>;

interface RegularizationModalProps {
  isOpen: boolean;
  pending: boolean;
  onClose: () => void;
  /** Resolves true when the request was accepted and the modal should close. */
  onSubmit: (reason: string) => Promise<boolean>;
}

export function RegularizationModal({isOpen, pending, onClose, onSubmit}: RegularizationModalProps) {
  const {register, handleSubmit, reset, watch, formState: {errors}} = useForm<RegularizationFormData>({
    resolver: zodResolver(regularizationSchema),
    defaultValues: {reason: ''},
  });

  const close = () => {
    onClose();
    reset();
  };

  const submit = async (formData: RegularizationFormData) => {
    if (await onSubmit(formData.reason)) {
      close();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={close} size="sm">
      <ModalHeader onClose={close}>Request Regularization</ModalHeader>
      <form onSubmit={handleSubmit(submit)} noValidate>
        <ModalBody>
          <Textarea
            id="regularization-reason"
            label="Reason"
            rows={4}
            placeholder="Please explain why you need regularization..."
            error={errors.reason?.message}
            {...register('reason')}
          />
        </ModalBody>
        <ModalFooter className="gap-4">
          <Button type="button" variant="outline" onClick={close}>
            Cancel
          </Button>
          <Button type="submit" disabled={!watch('reason')?.trim() || pending}>
            Submit Request
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
