'use client';

import {useEffect} from 'react';
import {useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';
import {useQueryClient} from '@tanstack/react-query';
import {Button, Modal, NativeSelect, Textarea, TextInput} from '@mantine/core';
import {
  getGetByEmployeeQueryKey,
  useCreateExpense,
} from '@/lib/generated/api/travel-expense-management/travel-expense-management';
import {CreateTravelExpenseRequestExpenseType} from '@/lib/generated/api/model';
import type {CreateTravelExpenseRequest} from '@/lib/generated/api/model';
import {EXPENSE_TYPE_LABELS} from './labels';

const schema = z.object({
  travelRequestId: z.string().trim().min(1, 'Travel request ID is required'),
  expenseType: z.string(),
  expenseDate: z.string().min(1, 'Date is required'),
  amount: z.coerce.number({invalid_type_error: 'Amount is required'}).positive('Amount must be greater than 0'),
  currency: z.string(),
  description: z.string(),
  receiptNumber: z.string(),
  remarks: z.string(),
});

type FormValues = z.infer<typeof schema>;

const DEFAULTS: FormValues = {
  travelRequestId: '',
  expenseType: CreateTravelExpenseRequestExpenseType.MEALS,
  expenseDate: '',
  amount: '' as unknown as number,
  currency: 'INR',
  description: '',
  receiptNumber: '',
  remarks: '',
};

const TYPE_OPTIONS = Object.values(CreateTravelExpenseRequestExpenseType).map((t) => ({
  value: t,
  label: EXPENSE_TYPE_LABELS[t] ?? t,
}));

export function AddTravelExpenseModal({opened, employeeId, onClose}: {
  opened: boolean;
  employeeId: string;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const createMutation = useCreateExpense();
  const {register, handleSubmit, reset, formState: {errors}} = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: DEFAULTS,
  });

  useEffect(() => {
    if (opened) reset(DEFAULTS);
  }, [opened, reset]);

  const onSubmit = (values: FormValues) => {
    const data: CreateTravelExpenseRequest = {
      travelRequestId: values.travelRequestId.trim(),
      employeeId,
      expenseType: values.expenseType as CreateTravelExpenseRequest['expenseType'],
      description: values.description.trim() || undefined,
      expenseDate: values.expenseDate,
      amount: values.amount,
      currency: values.currency.trim() || undefined,
      receiptNumber: values.receiptNumber.trim() || undefined,
      remarks: values.remarks.trim() || undefined,
    };
    createMutation.mutate({data}, {
      onSuccess: () => {
        queryClient.invalidateQueries({queryKey: getGetByEmployeeQueryKey(employeeId)});
        onClose();
      },
    });
  };

  return (
    <Modal opened={opened} onClose={onClose} title="Add travel expense" size="md" centered>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
        <TextInput
          label="Travel request ID"
          withAsterisk
          placeholder="Request ID from your approved travel"
          error={errors.travelRequestId?.message}
          {...register('travelRequestId')}
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <NativeSelect label="Expense type" data={TYPE_OPTIONS} {...register('expenseType')}/>
          <TextInput
            label="Date"
            type="date"
            withAsterisk
            error={errors.expenseDate?.message}
            {...register('expenseDate')}
          />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <TextInput
            label="Amount"
            type="number"
            step="0.01"
            withAsterisk
            placeholder="0.00"
            className="col-span-2"
            classNames={{input: 'tabular-nums text-right'}}
            error={errors.amount?.message}
            {...register('amount')}
          />
          <TextInput label="Currency" placeholder="INR" {...register('currency')}/>
        </div>
        <TextInput label="Description" placeholder="Brief description" {...register('description')}/>
        <TextInput label="Receipt number" placeholder="INV-12345" {...register('receiptNumber')}/>
        <Textarea label="Remarks" rows={2} placeholder="Optional remarks..." {...register('remarks')}/>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="default" onClick={onClose} disabled={createMutation.isPending}>
            Cancel
          </Button>
          <Button type="submit" loading={createMutation.isPending}>
            Submit Expense
          </Button>
        </div>
      </form>
    </Modal>
  );
}
