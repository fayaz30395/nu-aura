'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AppLayout } from '@/components/layout';
import { PermissionGate } from '@/components/auth/PermissionGate';
import { Permissions } from '@/lib/hooks/usePermissions';
import { useCreateSalaryStructure } from '@/lib/hooks/queries/usePayroll';
import { Box, Stack, Title, Text, Card, Group, Loader } from '@mantine/core';
import { ArrowLeft, Banknote, Save } from 'lucide-react';

const createSalaryStructureSchema = z.object({
  employeeId: z.string().min(1, 'Employee ID is required'),
  effectiveDate: z.string().min(1, 'Effective date is required'),
  baseSalary: z
    .number({ invalid_type_error: 'Base salary must be a number' })
    .positive('Base salary must be greater than zero'),
  status: z.enum(['ACTIVE', 'INACTIVE', 'PENDING']).default('PENDING'),
});

type CreateSalaryStructureFormData = z.infer<typeof createSalaryStructureSchema>;

export default function CreateSalaryStructurePage() {
  const router = useRouter();
  const { mutate: createStructure, isPending } = useCreateSalaryStructure();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateSalaryStructureFormData>({
    resolver: zodResolver(createSalaryStructureSchema),
    defaultValues: {
      status: 'PENDING',
    },
  });

  const onSubmit = (data: CreateSalaryStructureFormData) => {
    createStructure(
      {
        employeeId: data.employeeId,
        effectiveDate: data.effectiveDate,
        baseSalary: data.baseSalary,
        status: data.status,
        allowances: [],
        deductions: [],
      },
      {
        onSuccess: () => {
          router.push('/payroll/salary-structures');
        },
      }
    );
  };

  return (
    <AppLayout activeMenuItem="payroll">
      <PermissionGate
        permission={Permissions.PAYROLL_VIEW}
        fallback={
          <Box p="lg">
            <Text c="red">You do not have permission to create salary structures.</Text>
          </Box>
        }
      >
        <Box p="lg">
          <Stack gap="lg">
            {/* Page header */}
            <Group justify="space-between" align="flex-start">
              <div>
                <Group gap="sm" mb={4}>
                  <button
                    type="button"
                    onClick={() => router.push('/payroll/salary-structures')}
                    className="inline-flex items-center gap-1.5 text-body-secondary hover:text-[var(--text-primary)] transition-colors"
                    aria-label="Back to salary structures"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back
                  </button>
                </Group>
                <Title order={2} fw={600} className="skeuo-emboss">
                  Create Salary Structure
                </Title>
                <Text c="dimmed" size="sm" mt={4} className="skeuo-deboss">
                  Define a salary structure for an employee with base salary and effective date.
                </Text>
              </div>
              <div className="p-4 rounded-xl bg-gradient-to-br from-accent-500 to-accent-700">
                <Banknote className="h-5 w-5 text-white" />
              </div>
            </Group>

            {/* Form */}
            <Card withBorder shadow="xs" radius="md" p="xl" className="skeuo-card">
              <form onSubmit={handleSubmit(onSubmit)} noValidate>
                <Stack gap="md">
                  {/* Employee ID */}
                  <div>
                    <label
                      htmlFor="employeeId"
                      className="block text-sm font-medium text-[var(--text-primary)] mb-1.5"
                    >
                      Employee ID <span className="text-danger-500">*</span>
                    </label>
                    <input
                      id="employeeId"
                      type="text"
                      placeholder="e.g. EMP-001"
                      {...register('employeeId')}
                      className="w-full rounded-lg border border-[var(--border-main)] bg-[var(--bg-input)] px-4 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--ring-primary)] focus:ring-offset-2 transition-colors"
                    />
                    {errors.employeeId && (
                      <p className="mt-1 text-xs text-danger-500">{errors.employeeId.message}</p>
                    )}
                  </div>

                  {/* Effective Date */}
                  <div>
                    <label
                      htmlFor="effectiveDate"
                      className="block text-sm font-medium text-[var(--text-primary)] mb-1.5"
                    >
                      Effective From <span className="text-danger-500">*</span>
                    </label>
                    <input
                      id="effectiveDate"
                      type="date"
                      {...register('effectiveDate')}
                      className="w-full rounded-lg border border-[var(--border-main)] bg-[var(--bg-input)] px-4 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--ring-primary)] focus:ring-offset-2 transition-colors"
                    />
                    {errors.effectiveDate && (
                      <p className="mt-1 text-xs text-danger-500">{errors.effectiveDate.message}</p>
                    )}
                  </div>

                  {/* Base Salary */}
                  <div>
                    <label
                      htmlFor="baseSalary"
                      className="block text-sm font-medium text-[var(--text-primary)] mb-1.5"
                    >
                      Base Salary (₹) <span className="text-danger-500">*</span>
                    </label>
                    <input
                      id="baseSalary"
                      type="number"
                      min={0}
                      step={1}
                      placeholder="e.g. 50000"
                      {...register('baseSalary', { valueAsNumber: true })}
                      className="w-full rounded-lg border border-[var(--border-main)] bg-[var(--bg-input)] px-4 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--ring-primary)] focus:ring-offset-2 transition-colors"
                    />
                    {errors.baseSalary && (
                      <p className="mt-1 text-xs text-danger-500">{errors.baseSalary.message}</p>
                    )}
                  </div>

                  {/* Status */}
                  <div>
                    <label
                      htmlFor="status"
                      className="block text-sm font-medium text-[var(--text-primary)] mb-1.5"
                    >
                      Status
                    </label>
                    <select
                      id="status"
                      {...register('status')}
                      className="w-full rounded-lg border border-[var(--border-main)] bg-[var(--bg-input)] px-4 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--ring-primary)] focus:ring-offset-2 transition-colors"
                    >
                      <option value="PENDING">Pending</option>
                      <option value="ACTIVE">Active</option>
                      <option value="INACTIVE">Inactive</option>
                    </select>
                  </div>

                  {/* Actions */}
                  <Group justify="flex-end" gap="sm" pt="sm">
                    <button
                      type="button"
                      onClick={() => router.push('/payroll/salary-structures')}
                      className="px-4 py-2 text-sm font-medium rounded-lg border border-[var(--border-main)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)] transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isPending}
                      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-accent-700 hover:bg-accent-800 disabled:opacity-60 disabled:cursor-not-allowed rounded-lg transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
                    >
                      {isPending ? (
                        <Loader size="xs" color="white" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                      {isPending ? 'Saving…' : 'Create Structure'}
                    </button>
                  </Group>
                </Stack>
              </form>
            </Card>
          </Stack>
        </Box>
      </PermissionGate>
    </AppLayout>
  );
}
