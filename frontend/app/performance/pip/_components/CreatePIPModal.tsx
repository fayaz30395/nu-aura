'use client';

import {useState} from 'react';
import {useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {Button, NativeSelect, Textarea, TextInput} from '@mantine/core';
import {Plus} from 'lucide-react';
import {Modal, ModalBody, ModalFooter, ModalHeader} from '@/components/ui/Modal';
import {EmployeeSearchAutocomplete} from '@/components/ui/EmployeeSearchAutocomplete';
import {getLocalDateString} from '@/lib/utils/dateUtils';
import {useCreatePip} from '../_hooks/usePips';
import {
  CHECK_IN_FREQUENCY_OPTIONS,
  createPIPSchema,
  type CreatePIPFormData,
  DURATION_PRESETS,
  PIP_REASON_OPTIONS,
} from './pipConfig';

interface CreatePIPModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreatePIPModal({open, onClose, onSuccess}: CreatePIPModalProps) {
  const [selectedEmployee, setSelectedEmployee] = useState<{id: string; name: string} | null>(null);
  const [selectedManager, setSelectedManager] = useState<{id: string; name: string} | null>(null);
  const createMutation = useCreatePip();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: {errors, isSubmitting},
  } = useForm<CreatePIPFormData>({
    resolver: zodResolver(createPIPSchema),
    defaultValues: {
      employeeId: '',
      managerId: '',
      reason: '',
      startDate: getLocalDateString(new Date()),
      endDate: getLocalDateString(new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)),
      goals: '',
      checkInFrequency: 'WEEKLY',
    },
  });

  const pending = isSubmitting || createMutation.isPending;

  const setDuration = (days: number) => {
    const newEndDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    setValue('endDate', newEndDate.toISOString().split('T')[0], {shouldValidate: true, shouldDirty: true});
  };

  // Failures are toasted by the mutation's onError; the dialog stays open so the user can retry.
  const submit = async (data: CreatePIPFormData) => {
    try {
      await createMutation.mutateAsync(data);
    } catch {
      return;
    }
    onSuccess();
    reset();
    setSelectedEmployee(null);
    setSelectedManager(null);
  };

  return (
    <Modal isOpen={open} onClose={onClose} size="lg">
      <form onSubmit={handleSubmit(submit)} noValidate className="flex min-h-0 flex-1 flex-col">
        <ModalHeader onClose={onClose}>Create Performance Improvement Plan</ModalHeader>
        <ModalBody className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <EmployeeSearchAutocomplete
                label="Employee"
                placeholder="Search employee..."
                value={selectedEmployee}
                onChange={(emp) => {
                  setSelectedEmployee(emp);
                  setValue('employeeId', emp?.id ?? '', {shouldValidate: true});
                }}
              />
              {errors.employeeId && <p className="text-xs text-danger-600">{errors.employeeId.message}</p>}
            </div>
            <div className="flex flex-col gap-1">
              <EmployeeSearchAutocomplete
                label="Manager"
                placeholder="Search manager..."
                value={selectedManager}
                onChange={(emp) => {
                  setSelectedManager(emp);
                  setValue('managerId', emp?.id ?? '', {shouldValidate: true});
                }}
              />
              {errors.managerId && <p className="text-xs text-danger-600">{errors.managerId.message}</p>}
            </div>
          </div>

          <NativeSelect
            id="pip-reason"
            label="Reason"
            data={PIP_REASON_OPTIONS}
            error={errors.reason?.message}
            {...register('reason')}
          />

          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-text-2">Duration</span>
            <div className="flex flex-wrap gap-2">
              {DURATION_PRESETS.map(preset => (
                <Button key={preset.days} type="button" variant="default" size="sm"
                        onClick={() => setDuration(preset.days)}>
                  {preset.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextInput
              id="pip-start-date"
              type="date"
              label="Start Date"
              error={errors.startDate?.message}
              {...register('startDate')}
            />
            <TextInput
              id="pip-end-date"
              type="date"
              label="End Date"
              error={errors.endDate?.message}
              {...register('endDate')}
            />
          </div>

          <Textarea
            id="pip-goals"
            label="Goals & Objectives"
            placeholder="Describe the specific goals and success criteria..."
            rows={4}
            error={errors.goals?.message}
            {...register('goals')}
          />

          <NativeSelect
            id="pip-checkin-frequency"
            label="Check-in Frequency"
            data={CHECK_IN_FREQUENCY_OPTIONS}
            error={errors.checkInFrequency?.message}
            {...register('checkInFrequency')}
          />
        </ModalBody>
        <ModalFooter>
          <Button type="button" variant="default" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button type="submit" loading={pending} leftSection={<Plus className="h-4 w-4" aria-hidden/>}>
            Create PIP
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
