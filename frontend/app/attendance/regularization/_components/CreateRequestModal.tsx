'use client';

import React from 'react';
import {Send} from 'lucide-react';
import {Control, Controller, FieldErrors, UseFormHandleSubmit, UseFormRegister} from 'react-hook-form';
import {Button, Chip, Modal, Stepper, Textarea, TextInput} from '@mantine/core';
import {DateInput} from '@mantine/dates';
import {Callout} from '@/components/ui/Callout';

export interface RegularizationFormData {
  attendanceDate: string;
  requestedCheckIn: string;
  requestedCheckOut: string;
  reason: string;
}

const QUICK_REASON_TEMPLATES = [
  'Forgot to check in',
  'Forgot to check out',
  'System error',
  'Was on client visit',
  'Biometric not working',
  'Network connectivity issue',
];

interface CreateRequestModalProps {
  open: boolean;
  formStep: 1 | 2 | 3;
  register: UseFormRegister<RegularizationFormData>;
  control: Control<RegularizationFormData>;
  errors: FieldErrors<RegularizationFormData>;
  isSubmitting: boolean;
  isPending: boolean;
  reasonValue: string;
  managerName?: string;
  onClose: () => void;
  onNext: () => void;
  onPrev: () => void;
  onSubmit: (data: RegularizationFormData) => void | Promise<void>;
  onQuickReason: (template: string) => void;
  handleSubmit: UseFormHandleSubmit<RegularizationFormData>;
}

function reasonCountClass(length: number) {
  if (length > 450) return 'text-status-err-fg';
  if (length > 400) return 'text-status-warn-fg';
  return 'text-text-3';
}

export const CreateRequestModal = React.memo(function CreateRequestModal({
  open,
  formStep,
  register,
  control,
  errors,
  isSubmitting,
  isPending,
  reasonValue,
  managerName,
  onClose,
  onNext,
  onPrev,
  onSubmit,
  onQuickReason,
  handleSubmit,
}: CreateRequestModalProps) {
  const busy = isPending || isSubmitting;
  return (
    <Modal opened={open} onClose={onClose} title="Request Attendance Regularization" size="lg" centered>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-6">
        <Stepper active={formStep - 1} size="sm" allowNextStepsSelect={false} aria-label="Request progress">
          <Stepper.Step label="Select date"/>
          <Stepper.Step label="Add details"/>
          <Stepper.Step label="Provide reason"/>
        </Stepper>

        {formStep === 1 && (
          <Controller
            name="attendanceDate"
            control={control}
            render={({field}) => (
              <DateInput
                id="attendanceDate"
                label="Which date do you want to regularize?"
                withAsterisk
                value={field.value || null}
                onChange={(d) => field.onChange(d ?? '')}
                onBlur={field.onBlur}
                maxDate={new Date()}
                valueFormat="YYYY-MM-DD"
                placeholder="YYYY-MM-DD"
                clearable
                error={errors.attendanceDate?.message}
              />
            )}
          />
        )}

        {formStep === 2 && (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextInput
                id="requestedCheckIn"
                type="time"
                label="Check in time"
                error={errors.requestedCheckIn?.message}
                {...register('requestedCheckIn')}
              />
              <TextInput
                id="requestedCheckOut"
                type="time"
                label="Check out time"
                error={errors.requestedCheckOut?.message}
                {...register('requestedCheckOut')}
              />
            </div>
            <Callout tone="info">
              Provide the times you were actually present. Leave blank if only the status needs correction.
            </Callout>
          </div>
        )}

        {formStep === 3 && (
          <div className="flex flex-col gap-4">
            <Callout tone="info" title="Approval routing">
              This request will be sent to <span className="font-medium">{managerName || 'your reporting manager'}</span>{' '}
              for approval. HR Managers and Admins can also approve requests.
            </Callout>
            <div className="flex flex-col gap-1">
              <Textarea
                id="regularization-reason"
                label="Why do you need this regularization?"
                withAsterisk
                rows={4}
                placeholder="Please explain why you need attendance regularization..."
                error={errors.reason?.message}
                {...register('reason')}
              />
              <p className={`self-end text-xs font-medium ${reasonCountClass(reasonValue.length)}`}>
                {reasonValue.length}/500
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-xs font-medium text-text-3">Quick templates</span>
              <div className="flex flex-wrap gap-2">
                {QUICK_REASON_TEMPLATES.map((template) => (
                  <Chip
                    key={template}
                    size="xs"
                    checked={reasonValue === template}
                    onChange={() => onQuickReason(template)}
                  >
                    {template}
                  </Chip>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 border-t border-border pt-4">
          <Button type="button" variant="default" onClick={formStep > 1 ? onPrev : onClose}>
            {formStep === 1 ? 'Cancel' : 'Back'}
          </Button>
          {formStep < 3 ? (
            <Button type="button" onClick={onNext}>Next</Button>
          ) : (
            <Button type="submit" loading={busy} disabled={busy} leftSection={<Send size={16} aria-hidden/>}>
              Submit Request
            </Button>
          )}
        </div>
      </form>
    </Modal>
  );
});
