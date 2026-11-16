'use client';

import {ThumbsDown} from 'lucide-react';
import {FieldErrors, UseFormHandleSubmit, UseFormRegister} from 'react-hook-form';
import {Button, Modal, Textarea} from '@mantine/core';

export interface RejectReasonData {
  reason: string;
}

interface RejectRequestModalProps {
  open: boolean;
  register: UseFormRegister<RejectReasonData>;
  errors: FieldErrors<RejectReasonData>;
  isSubmitting: boolean;
  isPending: boolean;
  rejectReasonValue: string;
  onClose: () => void;
  onSubmit: (data: RejectReasonData) => void | Promise<void>;
  handleSubmit: UseFormHandleSubmit<RejectReasonData>;
}

export function RejectRequestModal({
  open,
  register,
  errors,
  isSubmitting,
  isPending,
  rejectReasonValue,
  onClose,
  onSubmit,
  handleSubmit,
}: RejectRequestModalProps) {
  const busy = isPending || isSubmitting;
  const length = rejectReasonValue.length;
  const countClass = length > 450 ? 'text-status-err-fg' : length > 400 ? 'text-status-warn-fg' : 'text-text-3';
  return (
    <Modal opened={open} onClose={onClose} title="Reject Regularization Request" size="lg" centered>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <Textarea
            id="reject-reason"
            label="Reason for rejection"
            withAsterisk
            rows={4}
            placeholder="Please explain why you are rejecting this regularization request..."
            error={errors.reason?.message}
            {...register('reason')}
          />
          <p className={`self-end text-xs font-medium ${countClass}`}>{length}/500</p>
        </div>
        <div className="flex justify-end gap-2 border-t border-border pt-4">
          <Button type="button" variant="default" onClick={onClose}>Cancel</Button>
          <Button type="submit" color="red" loading={busy} disabled={busy} leftSection={<ThumbsDown size={16} aria-hidden/>}>
            Reject Request
          </Button>
        </div>
      </form>
    </Modal>
  );
}
