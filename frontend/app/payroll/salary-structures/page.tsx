'use client';

import {AppLayout} from '@/components/layout';
import {PermissionGate} from '@/components/auth/PermissionGate';
import {Permissions} from '@/lib/hooks/usePermissions';
import {Badge, Box, Card, Group, Loader, Stack, Table, Text, Title,} from '@mantine/core';
import {AlertCircle, Banknote, Plus} from 'lucide-react';
import {useSalaryStructures} from '@/lib/hooks/queries/usePayroll';
import {useRouter} from 'next/navigation';

export default function SalaryStructuresPage() {
  const router = useRouter();
  const {data, isLoading, isError} = useSalaryStructures(0, 20);

  const rawContent = data?.content;
  const structures = Array.isArray(rawContent) ? rawContent : [];
  const hasStructures = structures.length > 0;

  return (
    <AppLayout activeMenuItem="payroll">
      <PermissionGate permission={Permissions.PAYROLL_VIEW}
                      fallback={<Box p="lg"><Text c="red">You do not have permission to view salary
                        structures.</Text></Box>}>
        <Box p="lg">
          <Stack gap="lg">
            {/* Page header */}
            <Group justify="space-between" align="flex-start">
              <div>
                <Title order={2} fw={600} className="skeuo-emboss">
                  Salary Structures
                </Title>
                <Text c="dimmed" size="sm" mt={4} className="skeuo-deboss">
                  Define and manage salary structures with component breakdowns, CTC calculations, and grade-based
                  templates.
                </Text>
              </div>
              <Group gap="sm">
                <Badge variant="light" color="blue" size="lg">
                  Payroll
                </Badge>
                <button
                  onClick={() => router.push('/payroll/salary-structures/create')}
                  aria-label="Create new salary structure"
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-accent-700 hover:bg-accent-800 rounded-lg transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
                >
                  <Plus className="w-4 h-4"/>
                  Create Structure
                </button>
              </Group>
            </Group>

            {/* Loading state */}
            {isLoading && (
              <Card withBorder shadow="xs" radius="md" p="xl" className="skeuo-card">
                <Stack align="center" gap="md" py="xl">
                  <Loader size="lg" color="blue"/>
                  <Text c="dimmed" size="sm">Loading salary structures...</Text>
                </Stack>
              </Card>
            )}

            {/* Error state */}
            {isError && !isLoading && (
              <Card withBorder shadow="xs" radius="md" p="xl" className="skeuo-card">
                <Stack align="center" gap="md" py="xl">
                  <div className="rounded-full bg-danger-50 dark:bg-danger-950/20 p-4">
                    <AlertCircle className="w-12 h-12 text-danger-500"/>
                  </div>
                  <Title order={4} fw={500} ta="center" className="skeuo-emboss">
                    Failed to Load Salary Structures
                  </Title>
                  <Text c="dimmed" size="sm" ta="center" maw={420}>
                    There was an error loading salary structures. Please try again later.
                  </Text>
                </Stack>
              </Card>
            )}

            {/* Empty state */}
            {!isLoading && !isError && !hasStructures && (
              <Card withBorder shadow="xs" radius="md" p="xl" className="skeuo-card">
                <Stack align="center" gap="md" py="xl">
                  <div className="rounded-full bg-[var(--bg-secondary)] p-4">
                    <Banknote className="w-12 h-12 text-[var(--text-muted)]"/>
                  </div>
                  <Title order={4} fw={500} ta="center" className="skeuo-emboss">
                    No Salary Structures Configured
                  </Title>
                  <Text c="dimmed" size="sm" ta="center" maw={420}>
                    Salary structures define how CTC is broken down into components like Basic, HRA, DA, and more.
                    Create your first structure to start configuring payroll.
                  </Text>
                  <button
                    onClick={() => router.push('/payroll/salary-structures/create')}
                    aria-label="Create new salary structure"
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-accent-700 hover:bg-accent-800 rounded-lg transition-colors mt-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
                  >
                    <Plus className="w-4 h-4"/>
                    Create Structure
                  </button>
                </Stack>
              </Card>
            )}

            {/* Data table */}
            {!isLoading && !isError && hasStructures && (
              <Card withBorder shadow="xs" radius="md" p="md" className="skeuo-card">
                <Table striped highlightOnHover>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Employee</Table.Th>
                      <Table.Th>Effective Date</Table.Th>
                      <Table.Th>Base Salary</Table.Th>
                      <Table.Th>Total CTC</Table.Th>
                      <Table.Th>Status</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {structures.filter(Boolean).map((structure) => (
                      <Table.Tr key={structure.id} className="cursor-pointer">
                        <Table.Td>{structure.employeeName || structure.employeeId || '—'}</Table.Td>
                        <Table.Td>{structure.effectiveDate ? new Date(structure.effectiveDate).toLocaleDateString() : '—'}</Table.Td>
                        <Table.Td>{new Intl.NumberFormat('en-IN', {
                          style: 'currency',
                          currency: 'INR'
                        }).format(Number(structure.baseSalary) || 0)}</Table.Td>
                        <Table.Td>{new Intl.NumberFormat('en-IN', {
                          style: 'currency',
                          currency: 'INR'
                        }).format(Number(structure.totalCTC) || 0)}</Table.Td>
                        <Table.Td>
                          <Badge
                            color={structure.status === 'ACTIVE' ? 'green' : structure.status === 'PENDING' ? 'yellow' : 'gray'}
                            variant="light"
                          >
                            {structure.status || 'UNKNOWN'}
                          </Badge>
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </Card>
            )}
          </Stack>
        </Box>
      </PermissionGate>
    </AppLayout>
  );
}
