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
  Tabs,
  Progress,
  ActionIcon,
  Tooltip,
  ThemeIcon,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconCheck,
  IconAlertTriangle,
  IconAlertCircle,
  IconShield,
  IconClipboardList,
  IconBell,
  IconFileText,
  IconArrowUpRight,
  IconRefresh,
  IconCheckbox,
} from '@tabler/icons-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PermissionGate } from '@/components/auth/PermissionGate';
import { Permissions } from '@/lib/hooks/usePermissions';
import {
  useComplianceDashboard,
  useActivePolicies,
  useActiveChecklists,
  useActiveAlerts,
  useCriticalAlerts,
  usePublishPolicy,
  useArchivePolicy,
  useCompleteChecklist,
  useUpdateAlertStatus,
  useEscalateAlert,
} from '@/lib/hooks/queries/useCompliance';
import type { CompliancePolicy, ComplianceChecklist, ComplianceAlert } from '@/lib/types/hrms/compliance';
import { formatDate } from '@/lib/utils';

// ─── Constants ────────────────────────────────────────────────────────────────

const POLICY_STATUS_COLOR: Record<string, string> = {
  DRAFT: 'gray',
  PENDING_APPROVAL: 'yellow',
  APPROVED: 'blue',
  PUBLISHED: 'green',
  ARCHIVED: 'dark',
};

const CHECKLIST_STATUS_COLOR: Record<string, string> = {
  NOT_STARTED: 'gray',
  IN_PROGRESS: 'blue',
  COMPLETED: 'green',
  OVERDUE: 'red',
  CANCELLED: 'dark',
};

const ALERT_PRIORITY_COLOR: Record<string, string> = {
  LOW: 'gray',
  MEDIUM: 'yellow',
  HIGH: 'orange',
  CRITICAL: 'red',
};

const ALERT_STATUS_COLOR: Record<string, string> = {
  OPEN: 'red',
  IN_PROGRESS: 'yellow',
  RESOLVED: 'green',
  DISMISSED: 'gray',
  ESCALATED: 'violet',
};

const fmtLabel = (s: string) => s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

// ─── Stat Card ────────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  color: string;
  sub?: string;
}

function StatCard({ label, value, icon, color, sub }: StatCardProps) {
  return (
    <Paper withBorder p="md" radius="md" className="shadow-[var(--shadow-card)]">
      <Group gap="sm" mb={8}>
        <ThemeIcon size="md" variant="light" color={color} radius="md">
          {icon}
        </ThemeIcon>
        <Text size="xs" c="dimmed" fw={500}>{label}</Text>
      </Group>
      <Text size="xl" fw={700}>{value}</Text>
      {sub && <Text size="xs" c="dimmed" mt={2}>{sub}</Text>}
    </Paper>
  );
}

// ─── Policies Tab ─────────────────────────────────────────────────────────────

function PoliciesTab() {
  const { data: policies = [], isLoading } = useActivePolicies();
  const publishMutation = usePublishPolicy();
  const archiveMutation = useArchivePolicy();

  const handlePublish = async (policy: CompliancePolicy) => {
    try {
      await publishMutation.mutateAsync(policy.id);
      notifications.show({ title: 'Published', message: `${policy.name} is now live`, color: 'green', icon: <IconCheck size={14} /> });
    } catch {
      notifications.show({ title: 'Error', message: 'Failed to publish policy', color: 'red' });
    }
  };

  const handleArchive = async (policy: CompliancePolicy) => {
    try {
      await archiveMutation.mutateAsync(policy.id);
      notifications.show({ title: 'Archived', message: `${policy.name} has been archived`, color: 'gray' });
    } catch {
      notifications.show({ title: 'Error', message: 'Failed to archive policy', color: 'red' });
    }
  };

  if (isLoading) return <Center h={200}><Loader /></Center>;
  if (!policies.length) return (
    <Center h={200}>
      <Stack align="center" gap="xs">
        <IconFileText size={32} color="var(--mantine-color-gray-4)" />
        <Text c="dimmed">No active policies</Text>
      </Stack>
    </Center>
  );

  return (
    <Paper withBorder radius="md" style={{ overflow: 'hidden' }}>
      <Table striped highlightOnHover>
        <Table.Thead className="bg-surface-100 dark:bg-surface-800">
          <Table.Tr>
            <Table.Th>Policy</Table.Th>
            <Table.Th>Category</Table.Th>
            <Table.Th>Status</Table.Th>
            <Table.Th>Version</Table.Th>
            <Table.Th>Effective Date</Table.Th>
            <Table.Th>Expiry Date</Table.Th>
            <Table.Th ta="center">Actions</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {policies.map((policy) => (
            <Table.Tr key={policy.id}>
              <Table.Td>
                <div>
                  <Text size="sm" fw={500}>{policy.name}</Text>
                  <Text size="xs" c="dimmed">{policy.code}</Text>
                </div>
              </Table.Td>
              <Table.Td>
                <Text size="sm" c="dimmed">{fmtLabel(policy.category)}</Text>
              </Table.Td>
              <Table.Td>
                <Badge color={POLICY_STATUS_COLOR[policy.status] ?? 'gray'} variant="light" size="sm">
                  {fmtLabel(policy.status)}
                </Badge>
              </Table.Td>
              <Table.Td>
                <Text size="sm" c="dimmed">v{policy.policyVersion ?? 1}</Text>
              </Table.Td>
              <Table.Td>
                <Text size="sm" c="dimmed">{policy.effectiveDate ? formatDate(policy.effectiveDate) : '—'}</Text>
              </Table.Td>
              <Table.Td>
                <Text size="sm" c={policy.expiryDate && new Date(policy.expiryDate) < new Date() ? 'red' : 'dimmed'}>
                  {policy.expiryDate ? formatDate(policy.expiryDate) : '—'}
                </Text>
              </Table.Td>
              <Table.Td>
                <Group gap={4} justify="center">
                  {(policy.status === 'DRAFT' || policy.status === 'APPROVED') && (
                    <Tooltip label="Publish">
                      <ActionIcon
                        variant="subtle"
                        color="green"
                        size="sm"
                        aria-label="Publish policy"
                        className="cursor-pointer"
                        loading={publishMutation.isPending && publishMutation.variables === policy.id}
                        onClick={() => handlePublish(policy)}
                      >
                        <IconCheck size={16} />
                      </ActionIcon>
                    </Tooltip>
                  )}
                  {policy.status === 'PUBLISHED' && (
                    <Tooltip label="Archive">
                      <ActionIcon
                        variant="subtle"
                        color="gray"
                        size="sm"
                        aria-label="Archive policy"
                        className="cursor-pointer"
                        loading={archiveMutation.isPending && archiveMutation.variables === policy.id}
                        onClick={() => handleArchive(policy)}
                      >
                        <IconFileText size={16} />
                      </ActionIcon>
                    </Tooltip>
                  )}
                </Group>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Paper>
  );
}

// ─── Checklists Tab ───────────────────────────────────────────────────────────

function ChecklistsTab() {
  const { data: checklists = [], isLoading } = useActiveChecklists();
  const completeMutation = useCompleteChecklist();

  const handleComplete = async (checklist: ComplianceChecklist) => {
    try {
      await completeMutation.mutateAsync(checklist.id);
      notifications.show({ title: 'Completed', message: `${checklist.name} marked complete`, color: 'green', icon: <IconCheck size={14} /> });
    } catch {
      notifications.show({ title: 'Error', message: 'Failed to complete checklist', color: 'red' });
    }
  };

  if (isLoading) return <Center h={200}><Loader /></Center>;
  if (!checklists.length) return (
    <Center h={200}>
      <Stack align="center" gap="xs">
        <IconClipboardList size={32} color="var(--mantine-color-gray-4)" />
        <Text c="dimmed">No active checklists</Text>
      </Stack>
    </Center>
  );

  return (
    <Stack gap="sm">
      {checklists.map((cl) => {
        const pct = cl.totalItems ? Math.round(((cl.completedItems ?? 0) / cl.totalItems) * 100) : 0;
        const isOverdue = cl.nextDueDate && new Date(cl.nextDueDate) < new Date();
        return (
          <Paper key={cl.id} withBorder p="md" radius="md" className="shadow-[var(--shadow-card)]">
            <Group justify="space-between" mb={8}>
              <div>
                <Group gap="xs">
                  <Text size="sm" fw={600}>{cl.name}</Text>
                  <Badge color={CHECKLIST_STATUS_COLOR[cl.status] ?? 'gray'} variant="light" size="xs">
                    {fmtLabel(cl.status)}
                  </Badge>
                  {isOverdue && (
                    <Badge color="red" variant="filled" size="xs">OVERDUE</Badge>
                  )}
                </Group>
                <Text size="xs" c="dimmed" mt={2}>
                  {fmtLabel(cl.category)} · Due: {cl.nextDueDate ? formatDate(cl.nextDueDate) : '—'}
                </Text>
              </div>
              {cl.status !== 'COMPLETED' && cl.status !== 'CANCELLED' && (
                <Tooltip label="Mark Complete">
                  <ActionIcon
                    variant="light"
                    color="green"
                    size="sm"
                    aria-label="Complete checklist"
                    className="cursor-pointer"
                    loading={completeMutation.isPending && completeMutation.variables === cl.id}
                    onClick={() => handleComplete(cl)}
                  >
                    <IconCheckbox size={16} />
                  </ActionIcon>
                </Tooltip>
              )}
            </Group>
            <Group gap="xs" align="center">
              <Progress
                value={pct}
                size="sm"
                radius="xl"
                color={pct === 100 ? 'green' : isOverdue ? 'red' : 'blue'}
                style={{ flex: 1 }}
              />
              <Text size="xs" c="dimmed" w={36} ta="right">
                {cl.completedItems ?? 0}/{cl.totalItems ?? 0}
              </Text>
            </Group>
          </Paper>
        );
      })}
    </Stack>
  );
}

// ─── Alerts Tab ───────────────────────────────────────────────────────────────

function AlertsTab() {
  const { data: alerts = [], isLoading } = useActiveAlerts();
  const updateMutation = useUpdateAlertStatus();
  const escalateMutation = useEscalateAlert();

  const handleResolve = async (alert: ComplianceAlert) => {
    try {
      await updateMutation.mutateAsync({ id: alert.id, status: 'RESOLVED', resolution: 'Resolved via dashboard' });
      notifications.show({ title: 'Resolved', message: alert.title, color: 'green', icon: <IconCheck size={14} /> });
    } catch {
      notifications.show({ title: 'Error', message: 'Failed to resolve alert', color: 'red' });
    }
  };

  const handleEscalate = async (alert: ComplianceAlert) => {
    try {
      await escalateMutation.mutateAsync(alert.id);
      notifications.show({ title: 'Escalated', message: alert.title, color: 'orange' });
    } catch {
      notifications.show({ title: 'Error', message: 'Failed to escalate alert', color: 'red' });
    }
  };

  if (isLoading) return <Center h={200}><Loader /></Center>;
  if (!alerts.length) return (
    <Center h={200}>
      <Stack align="center" gap="xs">
        <IconBell size={32} color="var(--mantine-color-gray-4)" />
        <Text c="dimmed">No active compliance alerts</Text>
        <Text size="xs" c="dimmed">You&apos;re all clear!</Text>
      </Stack>
    </Center>
  );

  return (
    <Paper withBorder radius="md" style={{ overflow: 'hidden' }}>
      <Table striped highlightOnHover>
        <Table.Thead className="bg-surface-100 dark:bg-surface-800">
          <Table.Tr>
            <Table.Th>Alert</Table.Th>
            <Table.Th>Type</Table.Th>
            <Table.Th>Priority</Table.Th>
            <Table.Th>Status</Table.Th>
            <Table.Th>Due Date</Table.Th>
            <Table.Th ta="center">Actions</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {alerts.map((alert) => (
            <Table.Tr key={alert.id}>
              <Table.Td>
                <div>
                  <Text size="sm" fw={500}>{alert.title}</Text>
                  {alert.description && (
                    <Text size="xs" c="dimmed" lineClamp={1}>{alert.description}</Text>
                  )}
                </div>
              </Table.Td>
              <Table.Td>
                <Text size="sm" c="dimmed">{fmtLabel(alert.type)}</Text>
              </Table.Td>
              <Table.Td>
                <Badge color={ALERT_PRIORITY_COLOR[alert.priority] ?? 'gray'} variant="filled" size="sm">
                  {alert.priority}
                </Badge>
              </Table.Td>
              <Table.Td>
                <Badge color={ALERT_STATUS_COLOR[alert.status] ?? 'gray'} variant="light" size="sm">
                  {fmtLabel(alert.status)}
                </Badge>
              </Table.Td>
              <Table.Td>
                <Text size="sm" c={alert.dueDate && new Date(alert.dueDate) < new Date() ? 'red' : 'dimmed'}>
                  {alert.dueDate ? formatDate(alert.dueDate) : '—'}
                </Text>
              </Table.Td>
              <Table.Td>
                <Group gap={4} justify="center">
                  {alert.status !== 'RESOLVED' && alert.status !== 'DISMISSED' && (
                    <>
                      <Tooltip label="Mark Resolved">
                        <ActionIcon
                          variant="subtle"
                          color="green"
                          size="sm"
                          aria-label="Resolve alert"
                          className="cursor-pointer"
                          onClick={() => handleResolve(alert)}
                          loading={updateMutation.isPending}
                        >
                          <IconCheck size={16} />
                        </ActionIcon>
                      </Tooltip>
                      {alert.status !== 'ESCALATED' && (
                        <Tooltip label="Escalate">
                          <ActionIcon
                            variant="subtle"
                            color="orange"
                            size="sm"
                            aria-label="Escalate alert"
                            className="cursor-pointer"
                            onClick={() => handleEscalate(alert)}
                            loading={escalateMutation.isPending}
                          >
                            <IconArrowUpRight size={16} />
                          </ActionIcon>
                        </Tooltip>
                      )}
                    </>
                  )}
                </Group>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Paper>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CompliancePage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<string | null>('overview');

  const { data: dashboard, isLoading: dashLoading, refetch } = useComplianceDashboard();
  const { data: criticalAlerts = [] } = useCriticalAlerts();

  const stats = dashboard as Record<string, number> | undefined;

  return (
    <AppLayout>
      <PermissionGate
        anyOf={[Permissions.COMPLIANCE_VIEW, Permissions.SYSTEM_ADMIN]}
        fallback={
          <Center h={400}>
            <Stack align="center" gap="sm">
              <Text size="xl">🔒</Text>
              <Text c="dimmed">You don&apos;t have permission to view compliance data.</Text>
              <Button variant="outline" size="sm" onClick={() => router.push('/me/dashboard')}>
                Go to Dashboard
              </Button>
            </Stack>
          </Center>
        }
      >
        <Stack gap="lg" p="md">
          {/* Header */}
          <Group justify="space-between">
            <div>
              <Title order={2} className="text-[var(--text-primary)]">Compliance</Title>
              <Text size="sm" c="dimmed">
                Policy management, compliance checklists, and regulatory alerts
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

          {/* Critical Alert Banner */}
          {criticalAlerts.length > 0 && (
            <Paper withBorder p="sm" radius="md" style={{ borderColor: 'var(--mantine-color-red-5)', background: 'var(--mantine-color-red-0)' }}>
              <Group gap="sm">
                <IconAlertTriangle size={20} color="var(--mantine-color-red-6)" />
                <Text size="sm" fw={600} c="red.7">
                  {criticalAlerts.length} critical compliance alert{criticalAlerts.length > 1 ? 's' : ''} require{criticalAlerts.length === 1 ? 's' : ''} immediate attention
                </Text>
                <Button
                  variant="outline"
                  color="red"
                  size="xs"
                  className="cursor-pointer"
                  style={{ marginLeft: 'auto' }}
                  onClick={() => setActiveTab('alerts')}
                >
                  View Alerts
                </Button>
              </Group>
            </Paper>
          )}

          {/* Stats */}
          {dashLoading ? (
            <Center h={100}><Loader size="sm" /></Center>
          ) : (
            <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="md">
              <StatCard
                label="Active Policies"
                value={stats?.activePolicies ?? stats?.totalPolicies ?? '—'}
                icon={<IconShield size={16} />}
                color="blue"
              />
              <StatCard
                label="Pending Acknowledgments"
                value={stats?.pendingAcknowledgments ?? '—'}
                icon={<IconFileText size={16} />}
                color="yellow"
                sub="Require employee sign-off"
              />
              <StatCard
                label="Open Checklists"
                value={stats?.openChecklists ?? stats?.totalChecklists ?? '—'}
                icon={<IconClipboardList size={16} />}
                color="indigo"
              />
              <StatCard
                label="Active Alerts"
                value={stats?.activeAlerts ?? stats?.totalAlerts ?? '—'}
                icon={<IconBell size={16} />}
                color={criticalAlerts.length > 0 ? 'red' : 'green'}
                sub={criticalAlerts.length > 0 ? `${criticalAlerts.length} critical` : 'All clear'}
              />
            </SimpleGrid>
          )}

          {/* Tabs */}
          <Tabs value={activeTab} onChange={setActiveTab}>
            <Tabs.List>
              <Tabs.Tab
                value="overview"
                leftSection={<IconShield size={14} />}
                className="cursor-pointer"
              >
                Policies
              </Tabs.Tab>
              <Tabs.Tab
                value="checklists"
                leftSection={<IconClipboardList size={14} />}
                className="cursor-pointer"
              >
                Checklists
              </Tabs.Tab>
              <Tabs.Tab
                value="alerts"
                leftSection={<IconAlertCircle size={14} />}
                className="cursor-pointer"
              >
                Alerts
                {criticalAlerts.length > 0 && (
                  <Badge color="red" variant="filled" size="xs" ml={6}>
                    {criticalAlerts.length}
                  </Badge>
                )}
              </Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel value="overview" pt="md">
              <PoliciesTab />
            </Tabs.Panel>
            <Tabs.Panel value="checklists" pt="md">
              <ChecklistsTab />
            </Tabs.Panel>
            <Tabs.Panel value="alerts" pt="md">
              <AlertsTab />
            </Tabs.Panel>
          </Tabs>
        </Stack>
      </PermissionGate>
    </AppLayout>
  );
}
