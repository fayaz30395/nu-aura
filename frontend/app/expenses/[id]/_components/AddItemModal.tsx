'use client';

import {Controller, type UseFormReturn} from 'react-hook-form';
import {z} from 'zod';
import {Button, Checkbox, Modal, NativeSelect, Textarea, TextInput} from '@mantine/core';
import {DateInput} from '@mantine/dates';
import type {ExpenseCategoryEntity} from '@/lib/types/hrms/expense';

export const itemSchema = z.object({
  description: z.string().min(1, 'Description required'),
  amount: z.coerce.number().positive('Amount must be positive'),
  expenseDate: z.string().min(1, 'Date required'),
  categoryId: z.string().optional(),
  merchantName: z.string().optional(),
  projectCode: z.string().optional(),
  notes: z.string().optional(),
  isBillable: z.boolean().optional(),
});

export type ItemFormData = z.infer<typeof itemSchema>;

export interface AddItemModalProps {
  opened: boolean;
  onClose: () => void;
  form: UseFormReturn<ItemFormData>;
  categories: Pick<ExpenseCategoryEntity, 'id' | 'name'>[];
  onSubmit: (data: ItemFormData) => void;
  submitting: boolean;
}

export function AddItemModal({opened, onClose, form, categories, onSubmit, submitting}: AddItemModalProps) {
  const {register, control, handleSubmit, formState: {errors}} = form;

  return (
    <Modal opened={opened} onClose={onClose} title="Add expense item" size="lg" centered>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
        <TextInput
          label="Description"
          withAsterisk
          error={errors.description?.message}
          {...register('description')}
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextInput
            label="Amount"
            type="number"
            step="0.01"
            withAsterisk
            classNames={{input: 'tabular-nums text-right'}}
            error={errors.amount?.message}
            {...register('amount')}
          />
          <Controller
            name="expenseDate"
            control={control}
            render={({field}) => (
              <DateInput
                label="Date"
                withAsterisk
                value={field.value || null}
                onChange={(d) => field.onChange(d ?? '')}
                onBlur={field.onBlur}
                valueFormat="YYYY-MM-DD"
                placeholder="YYYY-MM-DD"
                clearable
                error={errors.expenseDate?.message}
              />
            )}
          />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <NativeSelect
            label="Category"
            data={[{value: '', label: 'Select category'}, ...categories.map((c) => ({value: c.id, label: c.name}))]}
            {...register('categoryId')}
          />
          <TextInput label="Merchant" {...register('merchantName')}/>
        </div>
        <Textarea label="Notes" rows={2} placeholder="Notes" {...register('notes')}/>
        <Checkbox label="Billable to client" {...register('isBillable')}/>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="default" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" loading={submitting}>
            Add item
          </Button>
        </div>
      </form>
    </Modal>
  );
}
