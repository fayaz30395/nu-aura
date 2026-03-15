'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/layout';
import { apiClient } from '@/lib/api/client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { usePermissions, Permissions } from '@/lib/hooks/usePermissions';
import {
  Box,
  Button,
  Card,
  Divider,
  Grid,
  Group,
  NumberInput,
  Select,
  Stack,
  Text,
  TextInput,
  Title,
  Alert,
  Badge,
  Table,
  LoadingOverlay,
} from '@mantine/core';

// ─── Types ────────────────────────────────────────────────────────────────────

interface StatutoryDeductions {
  employeeId: string;
  employeePf: number;
  employerPf: number;
  employeeEsi: number;
  employerEsi: number;
  professionalTax: number;
  tdsMonthly: number;
  totalEmployeeDeductions: number;
  totalEmployerContributions: number;
}

// ─── Validation Schema ────────────────────────────────────────────────────────

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const PreviewFormSchema = z.object({
  employeeId: z
    .string()
    .min(1, 'Employee ID is required')
    .regex(uuidRegex, 'Must be a valid UUID (e.g. 550e8400-e29b-41d4-a716-446655440000)'),
  basicSalary: z.coerce
    .number()
    .positive('Basic salary must be greater than 0'),
  grossSalary: z.coerce
    .number()
    .positive('Gross salary must be greater than 0'),
  state: z.string().min(1, 'State is required'),
});

type PreviewFormValues = z.infer<typeof PreviewFormSchema>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatINR(value: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

const STATE_OPTIONS = [
  { value: 'Karnataka', label: 'Karnataka' },
  { value: 'Maharashtra', label: 'Maharashtra' },
  { value: 'Tamil Nadu', label: 'Tamil Nadu' },
  { value: 'Others', label: 'Others' },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function StatutoryPage() {

  const router = useRouter();
  const { hasPermission, isReady: permReady } = usePermissions();

  // RBAC guard — redirect if user lacks required permission
  useEffect(() => {
    if (!permReady) return;
    if (!hasPermission(Permissions.PAYROLL_PROCESS)) {
      router.replace('/payroll');
    }
  }, [permReady, hasPermission, router]);

  if (!permReady || !hasPermission(Permissions.PAYROLL_PROCESS)) {
    return null;
  }
  const [result, setResult] = useState<StatutoryDeductions | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<PreviewFormValues>({
    resolver: zodResolver(PreviewFormSchema),
    defaultValues: {
      employeeId: '',
      basicSalary: 0,
      grossSalary: 0,
      state: 'Karnataka',
    },
  });

  async function handleCalculate(values: PreviewFormValues) {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const params = new URLSearchParams({
        employeeId: values.employeeId.trim(),
        basicSalary: String(values.basicSalary),
        grossSalary: String(values.grossSalary),
        state: values.state,
      });

      const response = await apiClient.get<StatutoryDeductions>(
        `/payroll/statutory/preview?${params.toString()}`
      );
      setResult(response.data);
    } catch (err: unknown) {
      const error = err as unknown as { response?: { data?: { message?: string } }; message?: string };
      setError(
        error?.response?.data?.message ||
          error?.message ||
          'Failed to calculate statutory deductions. Check your inputs and try again.'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppLayout>
      <Box p="lg">
        <Stack gap="lg">
          {/* Page header */}
          <Group justify="space-between" align="flex-start">
            <div>
              <Title order={2} fw={600}>
                Statutory Deduction Preview
              </Title>
              <Text c="dimmed" size="sm" mt={4}>
                Preview India statutory deductions (PF, ESI, Professional Tax, TDS) before
                applying them to a payslip.
              </Text>
            </div>
            <Badge variant="light" color="blue" size="lg">
              New Regime — FY 2024-25
            </Badge>
          </Group>

          <Grid gutter="lg">
            {/* Left: Input form */}
            <Grid.Col span={{ base: 12, md: 5 }}>
              <Card withBorder shadow="xs" radius="md" p="lg">
                <Title order={4} mb="md" fw={500}>
                  Input Parameters
                </Title>

                <form onSubmit={form.handleSubmit(handleCalculate)}>
                  <Stack gap="md">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Employee ID
                      </label>
                      <input
                        type="text"
                        placeholder="550e8400-e29b-41d4-a716-446655440000"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        {...form.register('employeeId')}
                      />
                      {form.formState.errors.employeeId && (
                        <p className="text-red-600 text-xs mt-1">{form.formState.errors.employeeId.message}</p>
                      )}
                      <p className="text-gray-500 text-xs mt-1">Enter the employee UUID</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Basic Salary (INR / month)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="25000"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        {...form.register('basicSalary')}
                      />
                      {form.formState.errors.basicSalary && (
                        <p className="text-red-600 text-xs mt-1">{form.formState.errors.basicSalary.message}</p>
                      )}
                      <p className="text-gray-500 text-xs mt-1">Monthly basic component only</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Gross Salary (INR / month)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="40000"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        {...form.register('grossSalary')}
                      />
                      {form.formState.errors.grossSalary && (
                        <p className="text-red-600 text-xs mt-1">{form.formState.errors.grossSalary.message}</p>
                      )}
                      <p className="text-gray-500 text-xs mt-1">Basic + all allowances</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        State
                      </label>
                      <select
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        {...form.register('state')}
                      >
                        {STATE_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                      {form.formState.errors.state && (
                        <p className="text-red-600 text-xs mt-1">{form.formState.errors.state.message}</p>
                      )}
                      <p className="text-gray-500 text-xs mt-1">Used for Professional Tax slab</p>
                    </div>

                    <Button
                      type="submit"
                      loading={loading}
                      fullWidth
                      mt="xs"
                    >
                      Calculate Deductions
                    </Button>
                  </Stack>
                </form>
              </Card>
            </Grid.Col>

            {/* Right: Results */}
            <Grid.Col span={{ base: 12, md: 7 }}>
              <Card withBorder shadow="xs" radius="md" p="lg" pos="relative">
                <LoadingOverlay visible={loading} overlayProps={{ radius: 'md', blur: 2 }} />
                <Title order={4} mb="md" fw={500}>
                  Deduction Breakdown
                </Title>

                {error && (
                  <Alert color="red" mb="md" radius="md">
                    {error}
                  </Alert>
                )}

                {!result && !error && !loading && (
                  <Text c="dimmed" size="sm" ta="center" py="xl">
                    Enter salary details on the left and click Calculate to see the breakdown.
                  </Text>
                )}

                {result && (
                  <Stack gap="md">
                    {/* PF Section */}
                    <Box>
                      <Text fw={600} size="sm" mb={6} c="blue">
                        Provident Fund (EPF)
                      </Text>
                      <Table withRowBorders={false} verticalSpacing={4}>
                        <Table.Tbody>
                          <Table.Tr>
                            <Table.Td c="dimmed">Employee PF (12% of basic)</Table.Td>
                            <Table.Td ta="right" fw={500}>{formatINR(result.employeePf)}</Table.Td>
                          </Table.Tr>
                          <Table.Tr>
                            <Table.Td c="dimmed">Employer PF (12% of basic, max ₹1,800)</Table.Td>
                            <Table.Td ta="right" fw={500}>{formatINR(result.employerPf)}</Table.Td>
                          </Table.Tr>
                        </Table.Tbody>
                      </Table>
                    </Box>

                    <Divider />

                    {/* ESI Section */}
                    <Box>
                      <Group justify="space-between" mb={6}>
                        <Text fw={600} size="sm" c="teal">
                          Employee State Insurance (ESI)
                        </Text>
                        {result.employeeEsi === 0 && (
                          <Badge color="gray" variant="light" size="xs">
                            Not applicable (gross &gt; ₹21,000)
                          </Badge>
                        )}
                      </Group>
                      <Table withRowBorders={false} verticalSpacing={4}>
                        <Table.Tbody>
                          <Table.Tr>
                            <Table.Td c="dimmed">Employee ESI (0.75% of gross)</Table.Td>
                            <Table.Td ta="right" fw={500}>{formatINR(result.employeeEsi)}</Table.Td>
                          </Table.Tr>
                          <Table.Tr>
                            <Table.Td c="dimmed">Employer ESI (3.25% of gross)</Table.Td>
                            <Table.Td ta="right" fw={500}>{formatINR(result.employerEsi)}</Table.Td>
                          </Table.Tr>
                        </Table.Tbody>
                      </Table>
                    </Box>

                    <Divider />

                    {/* PT Section */}
                    <Box>
                      <Text fw={600} size="sm" mb={6} c="orange">
                        Professional Tax
                      </Text>
                      <Table withRowBorders={false} verticalSpacing={4}>
                        <Table.Tbody>
                          <Table.Tr>
                            <Table.Td c="dimmed">Professional Tax (state slab)</Table.Td>
                            <Table.Td ta="right" fw={500}>{formatINR(result.professionalTax)}</Table.Td>
                          </Table.Tr>
                        </Table.Tbody>
                      </Table>
                    </Box>

                    <Divider />

                    {/* TDS Section */}
                    <Box>
                      <Text fw={600} size="sm" mb={6} c="grape">
                        TDS (Income Tax)
                      </Text>
                      <Table withRowBorders={false} verticalSpacing={4}>
                        <Table.Tbody>
                          <Table.Tr>
                            <Table.Td c="dimmed">Monthly TDS instalment (New Regime)</Table.Td>
                            <Table.Td ta="right" fw={500}>{formatINR(result.tdsMonthly)}</Table.Td>
                          </Table.Tr>
                        </Table.Tbody>
                      </Table>
                    </Box>

                    <Divider />

                    {/* Summary totals */}
                    <Box bg="gray.0" p="md" style={{ borderRadius: 8 }}>
                      <Group justify="space-between" mb={8}>
                        <Text size="sm" fw={600}>
                          Total Employee Deductions
                        </Text>
                        <Text size="sm" fw={700} c="red">
                          {formatINR(result.totalEmployeeDeductions)}
                        </Text>
                      </Group>
                      <Group justify="space-between">
                        <Text size="sm" fw={600}>
                          Total Employer Contributions
                        </Text>
                        <Text size="sm" fw={700} c="green">
                          {formatINR(result.totalEmployerContributions)}
                        </Text>
                      </Group>
                    </Box>
                  </Stack>
                )}
              </Card>
            </Grid.Col>
          </Grid>
        </Stack>
      </Box>
    </AppLayout>
  );
}
