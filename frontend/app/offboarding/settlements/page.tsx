'use client';

import {useRouter} from 'next/navigation';
import {
  ActionIcon,
  Badge,
  Button,
  Center,
  Group,
  Loader,
  Paper,
  SimpleGrid,
  Stack,
  Table,
  Text,
  Title,
  Tooltip,
} from '@mantine/core';
import {notifications} from '@mantine/notifications';
import {IconAlertCircle, IconCash, IconCheck, IconEye, IconLock, IconRefresh,} from '@tabler/icons-react';
import {AppLayout} from '@/components/layout/AppLayout';
import {PermissionGate} from '@/components/auth/PermissionGate';
import {Permissions} from '@/lib/hooks/usePermissions';
import {useApproveSettlement, usePendingSettlementApprovals} from '@/lib/hooks/queries/useExit';
import {SettlementStatus} from '@/lib/types/hrms/exit';
import {formatCurrency} from '@/lib/utils';

const STATUS_COLOR: Record<string, string> = {
  DRAFT: 'gray',
  PENDING_APPROVAL: 'yellow',
  APPROVED: 'blue',
  PROCESSING: 'indigo',
  PAID: 'green',
  CANCELLED: 'red',
};

const fmtLabel = (s: string) => s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

export default function SettlementApprovalQueuePage() {
  const router = useRouter();
  const {data: settlements, isLoading, error, refetch} = usePendingSettlementApprovals();
  const approveMutation = useApproveSettlement();

  const handleApprove = async (id: string, employeeName?: string) => {
    try {
      await approveMutation.mutateAsync(id);
      notifications.show({
        title: 'Settlement Approved',
        message: `F&F settlement for ${employeeName ?? 'employee'} has been approved`,
        color: 'green',
        icon: <IconCheck size={16}/>,
      });
    } catch {
      notifications.show({title: 'Approval Failed', message: 'Unable to approve settlement. Please try again.', color: 'red'});
    }
  };

  const rows = settlements ?? [];
  const totalNetPayable = rows.reduce((sum, r) => sum + (r.netPayable ?? 0), 0);

  return (
    <AppLayout>
      <PermissionGate
        anyOf={[Permissions.EXIT_VIEW, Permissions.EXIT_MANAGE]}
        fallback={
          <Center h={400}>
            <Stack align="center" gap="sm">
              <IconLock size={28} color="var(--text-muted)"/>
              <Text c="dimmed">You don&apos;t have permission to view settlement approvals.</Text>
            </Stack>
          </Center>
        }
      >
        <Stack gap="lg" p="md">
          <Group justify="space-between" align="flex-start">
            <div>
              <Title order={2} className="text-[var(--text-primary)]">Settlement Approvals</Title>
              <Text size="sm" c="dimmed">Full &amp; Final settlements awaiting approval</Text>
            </div>
            <Button variant="subtle" leftSection={<IconRefresh size={16}/>} onClick={() => refetch()} className="cursor-pointer">
              Refresh
            </Button>
          </Group>

          <SimpleGrid cols={{base: 2, sm: 2}} spacing="md">
            <Paper withBorder p="md" radius="md" className="shadow-[var(--shadow-card)]">
              <Text size="xs" c="dimmed" mb={4}>Pending Approvals</Text>
              <Text size="xl" fw={700} className="text-warning-600 dark:text-warning-400">{rows.length}</Text>
            </Paper>
            <Paper withBorder p="md" radius="md" className="shadow-[var(--shadow-card)]">
              <Text size="xs" c="dimmed" mb={4}>Total Net Payable</Text>
              <Text size="xl" fw={700} className="text-[var(--accent-primary)]">{formatCurrency(totalNetPayable)}</Text>
            </Paper>
          </SimpleGrid>

          {isLoading ? (
            <Center h={300}><Loader size="lg"/></Center>
          ) : error ? (
            <Center h={200}>
              <Stack align="center" gap="sm">
                <IconAlertCircle size={32} color="var(--mantine-color-red-6)"/>
                <Text c="dimmed">Failed to load pending settlements.</Text>
                <Button variant="outline" size="sm" onClick={() => refetch()}>Retry</Button>
              </Stack>
            </Center>
          ) : rows.length === 0 ? (
            <Center h={200}>
              <Stack align="center" gap="xs">
                <IconCash size={40} color="var(--text-muted)"/>
                <Text c="dimmed">No settlements awaiting approval</Text>
              </Stack>
            </Center>
          ) : (
            <Paper withBorder radius="md" className="overflow-hidden shadow-[var(--shadow-card)]">
              <Table striped highlightOnHover>
                <Table.Thead className="bg-surface-100 dark:bg-surface-800">
                  <Table.Tr>
                    <Table.Th>Employee</Table.Th>
                    <Table.Th ta="right">Total Earnings</Table.Th>
                    <Table.Th ta="right">Total Deductions</Table.Th>
                    <Table.Th ta="right">Net Payable</Table.Th>
                    <Table.Th>Status</Table.Th>
                    <Table.Th ta="center">Actions</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {rows.map((row) => (
                    <Table.Tr key={row.id}>
                      <Table.Td>
                        <Text size="sm" fw={500}>{row.employeeName ?? row.employeeId}</Text>
                      </Table.Td>
                      <Table.Td ta="right">
                        <Text size="sm" c="green.7" fw={500}>{formatCurrency(row.totalEarnings)}</Text>
                      </Table.Td>
                      <Table.Td ta="right">
                        <Text size="sm" c="red.7" fw={500}>{formatCurrency(row.totalDeductions)}</Text>
                      </Table.Td>
                      <Table.Td ta="right">
                        <Text size="sm" fw={700} c={row.netPayable >= 0 ? 'accent.7' : 'red.7'}>
                          {formatCurrency(row.netPayable)}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Badge color={STATUS_COLOR[row.status] ?? 'gray'} variant="light" size="sm">
                          {fmtLabel(row.status)}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <Group gap={4} justify="center">
                          <Tooltip label="View / Process Payment">
                            <ActionIcon
                              variant="subtle"
                              size="sm"
                              aria-label="View settlement details"
                              className="cursor-pointer"
                              onClick={() => router.push(`/offboarding/${row.exitProcessId}/fnf`)}
                            >
                              <IconEye size={16}/>
                            </ActionIcon>
                          </Tooltip>
                          {row.status === SettlementStatus.PENDING_APPROVAL && (
                            <PermissionGate permission={Permissions.EXIT_MANAGE}>
                              <Tooltip label="Approve Settlement">
                                <ActionIcon
                                  variant="subtle"
                                  color="green"
                                  size="sm"
                                  aria-label="Approve settlement"
                                  className="cursor-pointer"
                                  loading={approveMutation.isPending && approveMutation.variables === row.id}
                                  onClick={() => handleApprove(row.id, row.employeeName)}
                                >
                                  <IconCheck size={16}/>
                                </ActionIcon>
                              </Tooltip>
                            </PermissionGate>
                          )}
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Paper>
          )}
        </Stack>
      </PermissionGate>
    </AppLayout>
  );
}
