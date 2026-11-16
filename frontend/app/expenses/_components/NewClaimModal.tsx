'use client';

import {useEffect} from 'react';
import {useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';
import {Button, Modal, NativeSelect, Textarea, TextInput} from '@mantine/core';
import {PermissionGate} from '@/components/auth/PermissionGate';
import {Permissions} from '@/lib/hooks/usePermissions';
import {CLAIM_CATEGORY_OPTIONS, CLAIM_CURRENCY_OPTIONS} from './types';

const expenseClaimSchema = z.object({
  claimDate: z.string().min(1, 'Claim date required'),
  category: z.string().min(1, 'Category required'),
  description: z.string().min(1, 'Description required'),
  amount: z.coerce.number().positive('Amount must be positive'),
  currency: z.string().length(3, 'Invalid currency code'),
  receiptUrl: z.string().url().optional().or(z.literal('')),
  notes: z.string().optional().or(z.literal('')),
});

export type ExpenseClaimFormData = z.infer<typeof expenseClaimSchema>;

function toLocalDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function defaultValues(): ExpenseClaimFormData {
  return {
    claimDate: toLocalDateString(new Date()),
    category: 'TRAVEL',
    description: '',
    amount: 0,
    currency: 'INR',
    receiptUrl: '',
    notes: '',
  };
}

export interface NewClaimModalProps {
  opened: boolean;
  onClose: () => void;
  /** Resolves when the claim is created; rejects to keep the form open. */
  onCreate: (data: ExpenseClaimFormData) => Promise<void>;
}

export function NewClaimModal({opened, onClose, onCreate}: NewClaimModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: {errors, isSubmitting},
  } = useForm<ExpenseClaimFormData>({
    resolver: zodResolver(expenseClaimSchema),
    defaultValues: defaultValues(),
  });

  useEffect(() => {
    if (opened) reset(defaultValues());
  }, [opened, reset]);

  const submit = handleSubmit(async (data) => {
    try {
      await onCreate(data);
      onClose();
    } catch {
      // The global MutationCache handler shows the error toast; keep the form open.
    }
  });

  return (
    <Modal
      opened={opened}
      onClose={() => {
        if (!isSubmitting) onClose();
      }}
      title="New expense claim"
      size="lg"
      centered
    >
      <form onSubmit={submit} noValidate className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <TextInput
          label="Claim date"
          type="date"
          withAsterisk
          error={errors.claimDate?.message}
          {...register('claimDate')}
        />
        <NativeSelect
          label="Category"
          withAsterisk
          data={CLAIM_CATEGORY_OPTIONS}
          error={errors.category?.message}
          {...register('category')}
        />
        <Textarea
          className="md:col-span-2"
          label="Description"
          withAsterisk
          rows={3}
          placeholder="Describe your expense"
          error={errors.description?.message}
          {...register('description')}
        />
        <TextInput
          label="Amount"
          type="number"
          step="0.01"
          min="0"
          withAsterisk
          placeholder="0.00"
          classNames={{input: 'tabular-nums text-right'}}
          error={errors.amount?.message}
          {...register('amount')}
        />
        <NativeSelect
          label="Currency"
          data={[...CLAIM_CURRENCY_OPTIONS]}
          error={errors.currency?.message}
          {...register('currency')}
        />
        <TextInput
          className="md:col-span-2"
          label="Receipt URL"
          type="url"
          placeholder="https://example.com/receipt"
          error={errors.receiptUrl?.message}
          {...register('receiptUrl')}
        />
        <Textarea
          className="md:col-span-2"
          label="Notes"
          rows={2}
          placeholder="Additional notes"
          {...register('notes')}
        />
        <div className="flex justify-end gap-2 md:col-span-2">
          <Button type="button" variant="default" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <PermissionGate permission={Permissions.EXPENSE_CREATE}>
            <Button type="submit" loading={isSubmitting}>
              Create claim
            </Button>
          </PermissionGate>
        </div>
      </form>
    </Modal>
  );
}
