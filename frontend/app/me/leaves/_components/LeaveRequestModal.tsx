'use client';

import {useEffect} from 'react';
import {useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';
import {Send} from 'lucide-react';
import {Checkbox, NativeSelect, Radio, Textarea, TextInput} from '@mantine/core';
import {Button} from '@/components/ui/Button';
import {Modal, ModalBody, ModalFooter, ModalHeader} from '@/components/ui/Modal';
import {useAuth} from '@/lib/hooks/useAuth';
import {useCreateLeaveRequest, useUpdateLeaveRequest} from '@/lib/hooks/queries/useLeaves';
import type {HalfDayPeriod, LeaveBalance, LeaveRequest, LeaveRequestRequest, LeaveType} from '@/lib/types/hrms/leave';
import {createLogger} from '@/lib/utils/logger';

const log = createLogger('LeavesPage');

// DATA-5/BA-3 FIX: halfDayPeriod added (backend rejects isHalfDay=true without it),
// reason min aligned with backend @Size(min=10), and date/half-day invariants
// validated client-side so users get inline errors instead of server 400s.
const leaveFormSchema = z
  .object({
    leaveTypeId: z.string().min(1, 'Please select a leave type'),
    startDate: z.string().min(1, 'Start date is required'),
    endDate: z.string().min(1, 'End date is required'),
    isHalfDay: z.boolean().default(false),
    halfDayPeriod: z.enum(['FIRST_HALF', 'SECOND_HALF']).optional(),
    reason: z
      .string()
      .min(10, 'Reason must be at least 10 characters')
      .max(1000, 'Reason must not exceed 1000 characters'),
  })
  .refine((d) => !d.startDate || !d.endDate || d.endDate >= d.startDate, {
    message: 'End date must be on or after start date',
    path: ['endDate'],
  })
  .refine((d) => !d.isHalfDay || d.startDate === d.endDate, {
    message: 'Half-day leave must be a single day',
    path: ['endDate'],
  })
  .refine((d) => !d.isHalfDay || !!d.halfDayPeriod, {
    message: 'Please select first or second half',
    path: ['halfDayPeriod'],
  });

type LeaveFormData = z.infer<typeof leaveFormSchema>;

const EMPTY_FORM: LeaveFormData = {
  leaveTypeId: '',
  startDate: '',
  endDate: '',
  isHalfDay: false,
  halfDayPeriod: undefined,
  reason: '',
};

interface LeaveRequestModalProps {
  isOpen: boolean;
  editingRequest: LeaveRequest | null;
  leaveTypes: LeaveType[];
  leaveBalances: LeaveBalance[];
  onClose: () => void;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

export function LeaveRequestModal({
  isOpen,
  editingRequest,
  leaveTypes,
  leaveBalances,
  onClose,
  onSuccess,
  onError,
}: LeaveRequestModalProps) {
  const {user} = useAuth();
  const createLeaveRequest = useCreateLeaveRequest();
  const updateLeaveRequest = useUpdateLeaveRequest();

  const {register, handleSubmit, watch, reset, setValue, formState: {errors, isSubmitting, isSubmitted}} = useForm<LeaveFormData>({
    resolver: zodResolver(leaveFormSchema),
    defaultValues: EMPTY_FORM,
  });

  useEffect(() => {
    if (!isOpen) return;
    reset(editingRequest ? {
      leaveTypeId: editingRequest.leaveTypeId,
      startDate: editingRequest.startDate,
      endDate: editingRequest.endDate,
      isHalfDay: editingRequest.isHalfDay,
      halfDayPeriod: editingRequest.halfDayPeriod,
      reason: editingRequest.reason,
    } : EMPTY_FORM);
  }, [isOpen, editingRequest, reset]);

  const startDate = watch('startDate');
  const endDate = watch('endDate');
  const isHalfDay = watch('isHalfDay');
  const halfDayPeriod = watch('halfDayPeriod');

  const calculateDays = () => {
    if (!startDate || !endDate) return 1;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return isHalfDay ? 0.5 : diffDays;
  };

  const pending = createLeaveRequest.isPending || updateLeaveRequest.isPending || isSubmitting;

  const close = () => {
    onClose();
    reset(EMPTY_FORM);
  };

  const submit = async (data: LeaveFormData) => {
    try {
      const totalDays = calculateDays();

      const balance = leaveBalances.find((b) => b.leaveTypeId === data.leaveTypeId);
      const isSameEditingType = editingRequest?.leaveTypeId === data.leaveTypeId;
      const availableForCheck = isSameEditingType
        ? (balance?.available || 0) + editingRequest!.totalDays
        : balance?.available || 0;
      if (balance && totalDays > availableForCheck) {
        onError(`Insufficient leave balance. You have ${availableForCheck} day(s) available for this leave type.`);
        return;
      }

      const leaveRequestData: LeaveRequestRequest = {
        employeeId: user!.employeeId!,
        leaveTypeId: data.leaveTypeId,
        startDate: data.startDate,
        endDate: data.endDate,
        totalDays,
        isHalfDay: data.isHalfDay,
        // DATA-5 FIX: backend rejects isHalfDay=true without a halfDayPeriod
        halfDayPeriod: data.isHalfDay ? (data.halfDayPeriod as HalfDayPeriod) : undefined,
        reason: data.reason,
      };

      if (editingRequest) {
        await updateLeaveRequest.mutateAsync({id: editingRequest.id, data: leaveRequestData});
        onSuccess('Leave request updated successfully!');
      } else {
        await createLeaveRequest.mutateAsync(leaveRequestData);
        onSuccess('Leave request submitted successfully!');
      }
      close();
    } catch (err: unknown) {
      log.error('Failed to submit leave request:', err);
      onError((err as {
        response?: { data?: { message?: string } }
      })?.response?.data?.message || 'Failed to submit leave request');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={close} size="lg">
      <ModalHeader onClose={close}>{editingRequest ? 'Edit Leave Request' : 'Apply for Leave'}</ModalHeader>
      <form onSubmit={handleSubmit(submit)} noValidate>
        <ModalBody className="flex flex-col gap-4">
          <NativeSelect
            id="leave-type"
            label="Leave Type"
            withAsterisk
            error={errors.leaveTypeId?.message}
            data={[
              {value: '', label: 'Select leave type'},
              ...leaveTypes.map((type) => ({value: type.id, label: type.leaveName})),
            ]}
            {...register('leaveTypeId')}
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextInput
              type="date"
              id="leave-start-date"
              label="Start Date"
              withAsterisk
              error={errors.startDate?.message}
              {...register('startDate')}
            />
            <TextInput
              type="date"
              id="leave-end-date"
              label="End Date"
              withAsterisk
              min={startDate}
              error={errors.endDate?.message}
              {...register('endDate')}
            />
          </div>

          <Checkbox id="halfDay" label="This is a half-day leave" {...register('isHalfDay')}/>

          {isHalfDay && (
            <Radio.Group
              label="Which half?"
              withAsterisk
              value={halfDayPeriod ?? null}
              onChange={(value) =>
                setValue('halfDayPeriod', value as HalfDayPeriod, {shouldDirty: true, shouldValidate: isSubmitted})
              }
              error={errors.halfDayPeriod?.message}
            >
              <div className="mt-2 flex items-center gap-6">
                <Radio value="FIRST_HALF" label="First Half (Morning)"/>
                <Radio value="SECOND_HALF" label="Second Half (Afternoon)"/>
              </div>
            </Radio.Group>
          )}

          <div className="rounded-lg bg-accent-subtle p-4">
            <p className="text-sm text-text-2">
              Total Days: <span className="font-bold tabular-nums text-accent">{calculateDays()}</span>
            </p>
          </div>

          <Textarea
            id="leave-reason"
            label="Reason"
            withAsterisk
            rows={4}
            placeholder="Please provide a reason for your leave..."
            error={errors.reason?.message}
            {...register('reason')}
          />
        </ModalBody>
        <ModalFooter className="gap-4">
          <Button type="button" variant="outline" onClick={close} disabled={pending}>
            Cancel
          </Button>
          <Button
            type="submit"
            isLoading={pending}
            loadingText={editingRequest ? 'Updating...' : 'Submitting...'}
            leftIcon={<Send className="h-4 w-4" aria-hidden="true"/>}
          >
            {editingRequest ? 'Update Request' : 'Submit Request'}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
