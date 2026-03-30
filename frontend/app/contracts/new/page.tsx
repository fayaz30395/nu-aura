'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AppLayout } from '@/components/layout/AppLayout';
import { useCreateContract } from '@/lib/hooks/queries/useContracts';
import { Button, Input, Select, Textarea, Card } from '@mantine/core';
import { ArrowLeft } from 'lucide-react';
import { createLogger } from '@/lib/utils/logger';
import { usePermissions, Permissions } from '@/lib/hooks/usePermissions';

const log = createLogger('ContractPage');

const contractFormSchema = z.object({
  title: z.string().min(1, 'Contract title is required').max(255, 'Title must not exceed 255 characters'),
  type: z.enum(['EMPLOYMENT', 'VENDOR', 'NDA', 'SLA', 'FREELANCER', 'OTHER'], { errorMap: () => ({ message: 'Please select a contract type' }) }),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().optional(),
  description: z.string().optional(),
  currency: z.string().default('USD'),
});

type ContractFormData = z.infer<typeof contractFormSchema>;

export default function CreateContractPage() {
  const router = useRouter();
  const { hasPermission, isReady } = usePermissions();
  const createMutation = useCreateContract();

  const hasAccess = hasPermission(Permissions.CONTRACT_CREATE);

  useEffect(() => {
    if (isReady && !hasAccess) {
      router.replace('/me/dashboard');
    }
  }, [isReady, hasAccess, router]);

  const { register, control, handleSubmit, formState: { errors, isSubmitting } } = useForm<ContractFormData>({
    resolver: zodResolver(contractFormSchema),
    defaultValues: {
      title: '',
      type: 'EMPLOYMENT',
      startDate: new Date().toISOString().split('T')[0],
      endDate: undefined,
      description: '',
      currency: 'USD',
    },
  });

  if (!isReady || !hasAccess) return null;

  const onSubmit = async (data: ContractFormData) => {
    try {
      await createMutation.mutateAsync({
        title: data.title,
        type: data.type,
        startDate: data.startDate,
        endDate: data.endDate || undefined,
        description: data.description || undefined,
        currency: data.currency,
      });
      router.push('/contracts');
    } catch (error) {
      log.error('Error creating contract:', error);
    }
  };

  const breadcrumbs = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Contracts', href: '/contracts' },
    { label: 'New Contract', href: '/contracts/new' },
  ];

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <div className="space-y-6 max-w-2xl">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 hover:bg-[var(--bg-surface)] rounded">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-bold skeuo-emboss">Create Contract</h1>
        </div>

        <Card>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-1">Contract Title *</label>
              <Input
                placeholder="Enter contract title"
                {...register('title')}
              />
              {errors.title && <p className="text-danger-500 text-sm mt-1">{errors.title.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Contract Type *</label>
              <Controller
                name="type"
                control={control}
                render={({ field }) => (
                  <Select
                    placeholder="Select type"
                    data={[
                      { value: 'EMPLOYMENT', label: 'Employment Contract' },
                      { value: 'VENDOR', label: 'Vendor Contract' },
                      { value: 'NDA', label: 'Non-Disclosure Agreement' },
                      { value: 'SLA', label: 'Service Level Agreement' },
                      { value: 'FREELANCER', label: 'Freelancer Agreement' },
                      { value: 'OTHER', label: 'Other' },
                    ]}
                    value={field.value}
                    onChange={(value) => field.onChange(value)}
                  />
                )}
              />
              {errors.type && <p className="text-danger-500 text-sm mt-1">{errors.type.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Start Date *</label>
              <Input
                type="date"
                {...register('startDate')}
              />
              {errors.startDate && <p className="text-danger-500 text-sm mt-1">{errors.startDate.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">End Date</label>
              <Input
                type="date"
                {...register('endDate')}
              />
              {errors.endDate && <p className="text-danger-500 text-sm mt-1">{errors.endDate.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <Textarea
                placeholder="Enter contract description"
                rows={4}
                {...register('description')}
              />
              {errors.description && <p className="text-danger-500 text-sm mt-1">{errors.description.message}</p>}
            </div>

            <div className="flex gap-4">
              <Button
                type="submit"
                loading={createMutation.isPending || isSubmitting}
                disabled={createMutation.isPending || isSubmitting}
              >
                Create Contract
              </Button>
              <Button variant="light" onClick={() => router.back()}>
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </AppLayout>
  );
}
