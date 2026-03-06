'use client';

import { useState } from 'react';
import { AppLayout } from '@/components/layout';
import { apiClient } from '@/lib/api/client';
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
import { useForm } from '@mantine/form';

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

interface PreviewFormValues {
  employeeId: string;
  basicSalary: number | string;
  grossSalary: number | string;
  state: string;
}

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
  const [result, setResult] = useState<StatutoryDeductions | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<PreviewFormValues>({
    initialValues: {
      employeeId: '',
      basicSalary: '',
      grossSalary: '',
      state: 'Karnataka',
    },
    validate: {
      employeeId: (v) =>
        v.trim().length === 0
          ? 'Employee ID is required'
          : !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v.trim())
          ? 'Must be a valid UUID (e.g. 550e8400-e29b-41d4-a716-446655440000)'
          : null,
      basicSalary: (v) =>
        !v || Number(v) <= 0 ? 'Basic salary must be greater than 0' : null,
      grossSalary: (v) =>
        !v || Number(v) <= 0 ? 'Gross salary must be greater than 0' : null,
      state: (v) => (!v ? 'State is required' : null),
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
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
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

                <form onSubmit={form.onSubmit(handleCalculate)}>
                  <Stack gap="md">
                    <TextInput
                      label="Employee ID"
                      description="Enter the employee UUID"
                      placeholder="550e8400-e29b-41d4-a716-446655440000"
                      {...form.getInputProps('employeeId')}
                    />

                    <NumberInput
                      label="Basic Salary (INR / month)"
                      description="Monthly basic component only"
                      placeholder="25000"
                      min={0}
                      decimalScale={2}
                      thousandSeparator=","
                      prefix="₹"
                      {...form.getInputProps('basicSalary')}
                    />

                    <NumberInput
                      label="Gross Salary (INR / month)"
                      description="Basic + all allowances"
                      placeholder="40000"
                      min={0}
                      decimalScale={2}
                      thousandSeparator=","
                      prefix="₹"
                      {...form.getInputProps('grossSalary')}
                    />

                    <Select
                      label="State"
                      description="Used for Professional Tax slab"
                      data={STATE_OPTIONS}
                      {...form.getInputProps('state')}
                    />

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
