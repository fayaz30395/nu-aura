'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Title,
  Text,
  Paper,
  Group,
  Stack,
  Badge,
  Button,
  Table,
  Loader,
  Center,
  SimpleGrid,
  Select,
  ActionIcon,
  Tooltip,
  Pagination,
  TextInput,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconCheck,
  IconEye,
  IconSearch,
  IconCash,
  IconAlertCircle,
  IconRefresh,
} from '@tabler/icons-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PermissionGate } from '@/components/auth/PermissionGate';
import { Permissions } from '@/lib/hooks/usePermissions';
import { useFnFList, useFnFApprove } from '@/lib/hooks/queries/useFnF';
import { SettlementStatus } from '@/lib/types/hrms/exit';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { FnFCalculationResponse } from '@/lib/services/hrms/fnf.service';

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_COLOR: Record<string, string> = {
  DRAFT: 'gray',
  PENDING_APPROVAL: 'yellow',
  APPROVED: 'blue',
  PROCESSING: 'indigo',
  PAID: 'green',
  CANCELLED: 'red',
};

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: SettlementStatus.DRAFT, label: 'Draft' },
  { value: SettlementStatus.PENDING_APPROVAL, label: 'Pending Approval' },
  { value: SettlementStatus.APPROVED, label: 'Approved' },
  { value: SettlementStatus.PROCESSING, label: 'Processing' },
  { value: SettlementStatus.PAID, label: 'Paid' },
  { value: SettlementStatus.CANCELLED, label: 'Cancelled' },
];

const PAGE_SIZE = 20;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtLabel = (s: string) => s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

// ─── Stat Card ────────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: string | number;
  color?: string;
  sub?: string;
}

function StatCard({ label, value, color = 'var(--text-primary)', sub }: StatCardProps) {
  return (
    <Paper withBorder p="md" radius="md" className="shadow-[var(--shadow-card)]">
      <Text size="xs" c="dimmed" mb={4}>{label}</Text>
      <Text size="xl" fw={700} style={{ color }}>{value}</Text>
      {sub && <Text size="xs" c="dimmed" mt={2}>{sub}</Text>}
    </Paper>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function FnFManagementPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [search, setSearch] = useState('');

  const { data, isLoading, error, refetch } = useFnFList(page - 1, PAGE_SIZE);
  const approveMutation = useFnFApprove();

  const handleApprove = async (exitProcessId: string, employeeName: string) => {
    try {
      await approveMutation.mutateAsync(exitProcessId);
      notifications.show({
        title: 'Settlement Approved',
        message: `F&F settlement for ${employeeName} has been approved`,
        color: 'green',
        icon: <IconCheck size={16} />,
      });
    } catch {
      notifications.show({
        title: 'Approval Failed',
        message: 'Unable to approve settlement. Please try again.',
        color: 'red',
        icon: <IconAlertCircle size={16} />,
      });
    }
  };

  // Filter client-side by status and name search (server-side filtering not on this endpoint)
  const allRows: FnFCalculationResponse[] = data?.content ?? [];
  const filtered = allRows.filter((row) => {
    const matchesStatus = !statusFilter || row.status === statusFilter;
    const matchesSearch = !search || row.employeeName?.toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  // Derive stats from current page data
  const _draftCount = allRows.filter((r) => r.status === SettlementStatus.DRAFT).length;
  const pendingCount = allRows.filter((r) => r.status === SettlementStatus.PENDING_APPROVAL).length;
  const paidCount = allRows.filter((r) => r.status === SettlementStatus.PAID).length;
  const totalNetPayable = allRows.reduce((sum, r) => sum + (r.netPayable ?? 0), 0);

  return (
    <AppLayout>
      <PermissionGate
        anyOf={[Permissions.EXIT_VIEW, Permissions.EXIT_MANAGE]}
        fallback={
          <Center h={400}>
            <Stack align="center" gap="sm">
              <Text size="xl">🔒</Text>
              <Text c="dimmed">You don&apos;t have permission to view F&amp;F settlements.</Text>
            </Stack>
          </Center>
        }
      >
        <Stack gap="lg" p="md">
          {/* ── Header ── */}
          <Group justify="space-between" align="flex-start">
            <div>
              <Title order={2} className="text-[var(--text-primary)]">
                F&amp;F Settlement Management
              </Title>
              <Text size="sm" c="dimmed">
                Full &amp; Final Settlement processing for all offboarding employees
              </Text>
            </div>
            <Button
              variant="subtle"
              leftSection={<IconRefresh size={16} />}
              onClick={() => refetch()}
              className="cursor-pointer"
            >
              Refresh
            </Button>
          </Group>

          {/* ── Stats ── */}
          <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="md">
            <StatCard
              label="Total (this page)"
              value={data?.totalElements ?? 0}
              sub={`${data?.totalPages ?? 0} pages`}
            />
            <StatCard
              label="Pending Approval"
              value={pendingCount}
              color="var(--mantine-color-yellow-6)"
            />
            <StatCard
              label="Paid"
              value={paidCount}
              color="var(--mantine-color-green-7)"
            />
            <StatCard
              label="Net Payable (page)"
              value={formatCurrency(totalNetPayable)}
              color="var(--text-accent)"
            />
          </SimpleGrid>

          {/* ── Filters ── */}
          <Paper withBorder p="sm" radius="md">
            <Group gap="sm">
              <TextInput
                placeholder="Search by employee name..."
                leftSection={<IconSearch size={14} />}
                value={search}
                onChange={(e) => setSearch(e.currentTarget.value)}
                style={{ flex: 1, minWidth: 200 }}
              />
              <Select
                placeholder="Filter by status"
                data={STATUS_OPTIONS}
                value={statusFilter}
                onChange={(v) => setStatusFilter(v ?? '')}
                clearable
                style={{ minWidth: 180 }}
              />
              {(statusFilter || search) && (
                <Button
                  variant="subtle"
                  size="sm"
                  onClick={() => { setStatusFilter(''); setSearch(''); }}
                  className="cursor-pointer"
                >
                  Clear
                </Button>
              )}
            </Group>
          </Paper>

          {/* ── Table ── */}
          {isLoading ? (
            <Center h={300}><Loader size="lg" /></Center>
          ) : error ? (
            <Center h={200}>
              <Stack align="center" gap="sm">
                <IconAlertCircle size={32} color="var(--mantine-color-red-6)" />
                <Text c="dimmed">Failed to load F&amp;F settlements.</Text>
                <Button variant="outline" size="sm" onClick={() => refetch()}>Retry</Button>
              </Stack>
            </Center>
          ) : filtered.length === 0 ? (
            <Center h={200}>
              <Stack align="center" gap="xs">
                <IconCash size={40} color="var(--text-muted)" />
                <Text c="dimmed">No settlements found</Text>
                {(statusFilter || search) && (
                  <Text size="xs" c="dimmed">Try clearing your filters</Text>
                )}
              </Stack>
            </Center>
          ) : (
            <Paper withBorder radius="md" className="shadow-[var(--shadow-card)]" style={{ overflow: 'hidden' }}>
              <Table striped highlightOnHover withColumnBorders={false}>
                <Table.Thead className="bg-surface-100 dark:bg-surface-800">
                  <Table.Tr>
                    <Table.Th>Employee</Table.Th>
                    <Table.Th ta="right">Total Earnings</Table.Th>
                    <Table.Th ta="right">Total Deductions</Table.Th>
                    <Table.Th ta="right">Net Payable</Table.Th>
                    <Table.Th>Status</Table.Th>
                    <Table.Th>Payment Mode</Table.Th>
                    <Table.Th>Approval Date</Table.Th>
                    <Table.Th ta="center">Actions</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {filtered.map((row) => {
                    const canApprove = row.status === SettlementStatus.PENDING_APPROVAL ||
                      row.status === SettlementStatus.DRAFT;
                    return (
                      <Table.Tr key={row.id}>
                        <Table.Td>
                          <div>
                            <Text size="sm" fw={500}>{row.employeeName}</Text>
                            <Text size="xs" c="dimmed">
                              {row.exitProcessId?.slice(0, 8)}...
                            </Text>
                          </div>
                        </Table.Td>
                        <Table.Td ta="right">
                          <Text size="sm" c="green.7" fw={500}>
                            {formatCurrency(row.totalEarnings)}
                          </Text>
                        </Table.Td>
                        <Table.Td ta="right">
                          <Text size="sm" c="red.7" fw={500}>
                            {formatCurrency(row.totalDeductions)}
                          </Text>
                        </Table.Td>
                        <Table.Td ta="right">
                          <Text size="sm" fw={700} c={row.netPayable >= 0 ? 'accent.7' : 'red.7'}>
                            {formatCurrency(row.netPayable)}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Badge
                            color={STATUS_COLOR[row.status] ?? 'gray'}
                            variant="light"
                            size="sm"
                          >
                            {fmtLabel(row.status)}
                          </Badge>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm" c="dimmed">
                            {row.paymentMode ? fmtLabel(row.paymentMode) : '—'}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm" c="dimmed">
                            {row.approvalDate ? formatDate(row.approvalDate) : '—'}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Group gap={4} justify="center">
                            <Tooltip label="View Details">
                              <ActionIcon
                                variant="subtle"
                                size="sm"
                                aria-label="View F&F details"
                                className="cursor-pointer"
                                onClick={() =>
                                  router.push(`/offboarding/${row.exitProcessId}/fnf`)
                                }
                              >
                                <IconEye size={16} />
                              </ActionIcon>
                            </Tooltip>
                            {canApprove && (
                              <Tooltip label="Approve Settlement">
                                <ActionIcon
                                  variant="subtle"
                                  color="green"
                                  size="sm"
                                  aria-label="Approve F&F settlement"
                                  className="cursor-pointer"
                                  loading={
                                    approveMutation.isPending &&
                                    approveMutation.variables === row.exitProcessId
                                  }
                                  onClick={() => handleApprove(row.exitProcessId, row.employeeName)}
                                >
                                  <IconCheck size={16} />
                                </ActionIcon>
                              </Tooltip>
                            )}
                          </Group>
                        </Table.Td>
                      </Table.Tr>
                    );
                  })}
                </Table.Tbody>
              </Table>
            </Paper>
          )}

          {/* ── Pagination ── */}
          {data && data.totalPages > 1 && (
            <Group justify="center">
              <Pagination
                total={data.totalPages}
                value={page}
                onChange={setPage}
                size="sm"
              />
            </Group>
          )}
        </Stack>
      </PermissionGate>
    </AppLayout>
  );
}
