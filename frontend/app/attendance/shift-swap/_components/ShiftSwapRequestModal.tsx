'use client';

import {useState} from 'react';
import {Controller, useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {useQuery} from '@tanstack/react-query';
import {Button, Modal, NativeSelect, Textarea} from '@mantine/core';
import {DateInput} from '@mantine/dates';
import {EmployeeSearchAutocomplete} from '@/components/ui/EmployeeSearchAutocomplete';
import {shiftService} from '@/lib/services/hrms/shift.service';
import {ShiftAssignment} from '@/lib/types/hrms/shift';
import {useSubmitShiftSwap} from '../_hooks/useShiftSwaps';
import {ShiftSwapFormData, shiftSwapSchema} from './types';

const SWAP_TYPE_OPTIONS = [
  {value: 'SWAP', label: 'Shift Swap (exchange with another employee)'},
  {value: 'GIVE_AWAY', label: 'Give Away (transfer shift to another employee)'},
  {value: 'PICK_UP', label: 'Pick Up (take an available shift)'},
];

interface Props {
  opened: boolean;
  onClose: () => void;
  employeeId: string;
}

export function ShiftSwapRequestModal({opened, onClose, employeeId}: Props) {
  const [selectedTargetEmployee, setSelectedTargetEmployee] = useState<{id: string; name: string} | null>(null);

  const {register, control, handleSubmit, watch, reset, setValue, formState: {errors}} = useForm<ShiftSwapFormData>({
    resolver: zodResolver(shiftSwapSchema),
    defaultValues: {
      swapType: 'SWAP',
      requesterShiftDate: '',
      targetShiftDate: '',
      requesterAssignmentId: '',
      targetEmployeeId: '',
      reason: '',
    },
  });
  const swapType = watch('swapType');

  const {data: myAssignmentsData} = useQuery({
    queryKey: ['shift-assignments', 'employee', employeeId],
    queryFn: () => shiftService.getEmployeeAssignments(employeeId, 0, 50),
    enabled: !!employeeId && opened,
    staleTime: 2 * 60 * 1000,
  });
  const activeAssignments = (myAssignmentsData?.content ?? []).filter((a: ShiftAssignment) => a.status === 'ACTIVE');

  const handleClose = () => {
    setSelectedTargetEmployee(null);
    reset();
    onClose();
  };

  const submitMutation = useSubmitShiftSwap(employeeId, handleClose);

  return (
    <Modal opened={opened} onClose={handleClose} title="New Shift Swap Request" size="lg" centered>
      <form onSubmit={handleSubmit((data) => submitMutation.mutate(data))} noValidate className="flex flex-col gap-4">
        <NativeSelect
          id="swap-type"
          label="Type"
          withAsterisk
          data={SWAP_TYPE_OPTIONS}
          error={errors.swapType?.message}
          {...register('swapType')}
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Controller
            name="requesterShiftDate"
            control={control}
            render={({field}) => (
              <DateInput
                id="requester-shift-date"
                label="My shift date"
                withAsterisk
                value={field.value || null}
                onChange={(d) => field.onChange(d ?? '')}
                onBlur={field.onBlur}
                valueFormat="YYYY-MM-DD"
                placeholder="YYYY-MM-DD"
                clearable
                error={errors.requesterShiftDate?.message}
              />
            )}
          />
          {swapType === 'SWAP' && (
            <Controller
              name="targetShiftDate"
              control={control}
              render={({field}) => (
                <DateInput
                  id="target-shift-date"
                  label="Target shift date"
                  value={field.value || null}
                  onChange={(d) => field.onChange(d ?? '')}
                  onBlur={field.onBlur}
                  valueFormat="YYYY-MM-DD"
                  placeholder="YYYY-MM-DD"
                  clearable
                />
              )}
            />
          )}
        </div>
        <NativeSelect
          id="requester-assignment"
          label="My shift assignment"
          withAsterisk
          description={activeAssignments.length === 0 ? 'No active shift assignments found' : undefined}
          error={errors.requesterAssignmentId?.message}
          data={[
            {value: '', label: 'Select your shift assignment'},
            ...activeAssignments.map((a: ShiftAssignment) => ({
              value: String(a.id),
              label: `${a.shiftName} (${a.shiftCode}), ${a.assignmentDate} (${a.shiftStartTime}–${a.shiftEndTime})`,
            })),
          ]}
          {...register('requesterAssignmentId')}
        />
        {swapType !== 'PICK_UP' && (
          <EmployeeSearchAutocomplete
            label="Target Employee"
            placeholder="Search for an employee..."
            excludeIds={[employeeId]}
            value={selectedTargetEmployee}
            onChange={(emp) => {
              setSelectedTargetEmployee(emp);
              setValue('targetEmployeeId', emp?.id ?? '', {shouldValidate: true});
            }}
          />
        )}
        <Textarea
          id="shift-swap-reason"
          label="Reason"
          rows={2}
          placeholder="Optional reason for the swap"
          {...register('reason')}
        />
        <div className="flex justify-end gap-2 border-t border-border pt-4">
          <Button type="button" variant="default" onClick={handleClose}>Cancel</Button>
          <Button type="submit" loading={submitMutation.isPending} disabled={submitMutation.isPending}>
            Submit Request
          </Button>
        </div>
      </form>
    </Modal>
  );
}
