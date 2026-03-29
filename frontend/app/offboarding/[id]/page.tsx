'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Title,
  Text,
  Paper,
  Group,
  Stack,
  Badge,
  Button,
  Divider,
  Loader,
  Center,
  Alert,
  SimpleGrid,
  Timeline,
  ThemeIcon,
  Tabs,
  Table,
  ActionIcon,
  Tooltip,
  Modal,
  Select,
  Textarea,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconCheck,
  IconAlertCircle,
  IconUser,
  IconCalendar,
  IconBuilding,
  IconClock,
  IconFileText,
  IconShieldCheck,
  IconCurrencyRupee,
  IconClipboardList,
  IconMessageCircle,
  IconDeviceLaptop,
  IconArrowLeft,
  IconTrash,
} from '@tabler/icons-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PermissionGate } from '@/components/auth/PermissionGate';
import { Permissions } from '@/lib/hooks/usePermissions';
import {
  useExitProcess,
  useClearancesByExitProcess,
  useAssetsByExitProcess,
  useSettlementByExitProcess,
  useUpdateClearance,
  useAllAssetsRecovered,
} from '@/lib/hooks/queries/useExit';
import {
  ExitType,
  ExitStatus,
  ClearanceStatus,
  ClearanceDepartment,
  RecoveryStatus,
  SettlementStatus,
} from '@/lib/types/exit';
import type { ExitClearance, AssetRecovery } from '@/lib/types/exit';
import { formatCurrency, formatDate } from '@/lib/utils';

const getExitTypeLabel = (type: ExitType | string | null | undefined): string => {
  if (!type) return 'Unknown';
  const labels: Record<string, string> = {
    RESIGNATION: 'Resignation',
    TERMINATION: 'Termination',
    RETIREMENT: 'Retirement',
    END_OF_CONTRACT: 'End of Contract',
    ABSCONDING: 'Absconding',
  };
  return labels[type] ?? String(type);
};

const getStatusColor = (status: ExitStatus | string | null | undefined): string => {
  if (!status) return 'gray';
  const map: Record<string, string> = {
    INITIATED: 'blue',
    IN_PROGRESS: 'yellow',
    CLEARANCE_PENDING: 'orange',
    COMPLETED: 'green',
    CANCELLED: 'red',
  };
  return map[status] ?? 'gray';
};

const getClearanceStatusColor = (status: ClearanceStatus | string): string => {
  const map: Record<string, string> = {
    PENDING: 'yellow',
    APPROVED: 'green',
    REJECTED: 'red',
    NOT_REQUIRED: 'gray',
  };
  return map[status] ?? 'gray';
};

const getRecoveryStatusColor = (status: RecoveryStatus | string): string => {
  const map: Record<string, string> = {
    PENDING: 'yellow',
    RETURNED: 'green',
    DAMAGED: 'orange',
    LOST: 'red',
    WAIVED: 'gray',
    NOT_APPLICABLE: 'gray',
  };
  return map[status] ?? 'gray';
};

const getSettlementStatusColor = (status: SettlementStatus | string): string => {
  const map: Record<string, string> = {
    DRAFT: 'gray',
    PENDING_APPROVAL: 'yellow',
    APPROVED: 'blue',
    PROCESSING: 'indigo',
    PAID: 'green',
    CANCELLED: 'red',
  };
  return map[status] ?? 'gray';
};

const getDepartmentLabel = (dept: ClearanceDepartment | string): string => {
  const labels: Record<string, string> = {
    IT: 'IT Department',
    ADMIN: 'Administration',
    FINANCE: 'Finance',
    HR: 'Human Resources',
    REPORTING_MANAGER: 'Reporting Manager',
    LIBRARY: 'Library',
    FACILITIES: 'Facilities',
  };
  return labels[dept] ?? String(dept);
};

const formatLabel = (str: string): string =>
  str.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

export default function SeparationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const exitProcessId = params.id as string;

  const [activeTab, setActiveTab] = useState<string | null>('overview');
  const [clearanceModalOpen, setClearanceModalOpen] = useState(false);
  const [selectedClearance, setSelectedClearance] = useState<ExitClearance | null>(null);
  const [clearanceComment, setClearanceComment] = useState('');
  const [clearanceAction, setClearanceAction] = useState<ClearanceStatus | null>(null);

  const { data: exitProcess, isLoading, error } = useExitProcess(exitProcessId);
  const { data: clearances, isLoading: clearancesLoading } = useClearancesByExitProcess(exitProcessId);
  const { data: assets, isLoading: assetsLoading } = useAssetsByExitProcess(exitProcessId);
  const { data: settlement } = useSettlementByExitProcess(exitProcessId);
  const { data: allRecovered } = useAllAssetsRecovered(exitProcessId);
  const updateClearanceMutation = useUpdateClearance();

  if (isLoading) {
    return (
      <AppLayout>
        <Center h={400}><Loader size="lg" /></Center>
      </AppLayout>
    );
  }

  if (error || !exitProcess) {
    return (
      <AppLayout>
        <Alert icon={<IconAlertCircle size={16} />} color="red" title="Error" m="md">
          Failed to load separation details. The exit process may not exist.
        </Alert>
      </AppLayout>
    );
  }

  const handleClearanceAction = (clearance: ExitClearance, action: ClearanceStatus) => {
    setSelectedClearance(clearance);
    setClearanceAction(action);
    setClearanceComment('');
    setClearanceModalOpen(true);
  };

  const submitClearanceAction = async () => {
    if (!selectedClearance || !clearanceAction) return;
    try {
      await updateClearanceMutation.mutateAsync({
        id: selectedClearance.id,
        data: {
          status: clearanceAction,
          approvedDate: clearanceAction === ClearanceStatus.APPROVED ? new Date().toISOString().split('T')[0] : undefined,
          comments: clearanceComment || undefined,
        },
      });
      notifications.show({
        title: 'Success',
        message: `Clearance ${clearanceAction.toLowerCase()} successfully`,
        color: 'green',
        icon: <IconCheck size={16} />,
      });
      setClearanceModalOpen(false);
    } catch {
      notifications.show({
        title: 'Error',
        message: 'Failed to update clearance',
        color: 'red',
      });
    }
  };

  const statusSteps = [
    { status: ExitStatus.INITIATED, label: 'Initiated', icon: IconFileText },
    { status: ExitStatus.IN_PROGRESS, label: 'In Progress', icon: IconClock },
    { status: ExitStatus.CLEARANCE_PENDING, label: 'Clearance Pending', icon: IconShieldCheck },
    { status: ExitStatus.COMPLETED, label: 'Completed', icon: IconCheck },
  ];

  const currentStepIndex = statusSteps.findIndex((s) => s.status === exitProcess.status);
  const isCancelled = exitProcess.status === ExitStatus.CANCELLED;

  const clearanceList = clearances ?? [];
  const assetList = assets ?? [];
  const approvedClearances = clearanceList.filter((c) => c.status === ClearanceStatus.APPROVED || c.status === ClearanceStatus.NOT_REQUIRED);
  const clearanceProgress = clearanceList.length > 0
    ? Math.round((approvedClearances.length / clearanceList.length) * 100)
    : 0;
  const recoveredAssets = assetList.filter((a) => a.isRecovered);
  const assetProgress = assetList.length > 0
    ? Math.round((recoveredAssets.length / assetList.length) * 100)
    : 0;

  return (
    <AppLayout>
      <PermissionGate anyOf={[Permissions.EXIT_VIEW, Permissions.EXIT_MANAGE]} fallback={<Stack p="md"><Text c="red">You do not have permission to view separation details.</Text></Stack>}>
      <Stack gap="lg" p="md">
        {/* Header */}
        <Group justify="space-between" align="flex-start">
          <Group>
            <ActionIcon variant="subtle" size="lg" onClick={() => router.push('/offboarding')}>
              <IconArrowLeft size={20} />
            </ActionIcon>
            <div>
              <Title order={2} className="text-surface-900 dark:text-surface-50">
                {exitProcess.employeeName ?? 'Employee'} - Separation
              </Title>
              <Text size="sm" c="dimmed">
                {getExitTypeLabel(exitProcess.exitType)} | Exit ID: {exitProcess.id.slice(0, 8)}...
              </Text>
            </div>
          </Group>
          <Group>
            <Badge
              color={isCancelled ? 'red' : getStatusColor(exitProcess.status)}
              variant="filled"
              size="lg"
            >
              {isCancelled ? 'Cancelled' : formatLabel(exitProcess.status)}
            </Badge>
          </Group>
        </Group>

        {/* Status Timeline */}
        {!isCancelled && (
          <Paper withBorder p="md" radius="md">
            <Timeline active={currentStepIndex} bulletSize={32} lineWidth={3}>
              {statusSteps.map((step) => (
                <Timeline.Item
                  key={step.status}
                  bullet={
                    <ThemeIcon
                      size={32}
                      radius="xl"
                      color={
                        statusSteps.indexOf(step) <= currentStepIndex ? 'sky.7' : 'gray'
                      }
                    >
                      <step.icon size={16} />
                    </ThemeIcon>
                  }
                  title={step.label}
                >
                  {step.status === exitProcess.status && (
                    <Text size="xs" c="dimmed">Current stage</Text>
                  )}
                </Timeline.Item>
              ))}
            </Timeline>
          </Paper>
        )}

        {/* Summary Cards */}
        <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="md">
          <Paper withBorder p="md" radius="md" className="bg-[var(--bg-card)]">
            <Group gap="xs" mb="xs">
              <IconCalendar size={16} className="text-sky-700" />
              <Text size="xs" c="dimmed">Resignation Date</Text>
            </Group>
            <Text fw={600}>{exitProcess.resignationDate ? formatDate(exitProcess.resignationDate) : '-'}</Text>
          </Paper>
          <Paper withBorder p="md" radius="md" className="bg-[var(--bg-card)]">
            <Group gap="xs" mb="xs">
              <IconCalendar size={16} className="text-sky-700" />
              <Text size="xs" c="dimmed">Last Working Day</Text>
            </Group>
            <Text fw={600}>{exitProcess.lastWorkingDate ? formatDate(exitProcess.lastWorkingDate) : '-'}</Text>
          </Paper>
          <Paper withBorder p="md" radius="md" className="bg-[var(--bg-card)]">
            <Group gap="xs" mb="xs">
              <IconClock size={16} className="text-sky-700" />
              <Text size="xs" c="dimmed">Notice Period</Text>
            </Group>
            <Text fw={600}>
              {exitProcess.noticePeriodServed ?? 0} / {exitProcess.noticePeriodDays ?? 0} days
            </Text>
          </Paper>
          <Paper withBorder p="md" radius="md" className="bg-[var(--bg-card)]">
            <Group gap="xs" mb="xs">
              <IconCurrencyRupee size={16} className="text-sky-700" />
              <Text size="xs" c="dimmed">Settlement Amount</Text>
            </Group>
            <Text fw={600}>
              {settlement ? formatCurrency(settlement.netPayable) : (exitProcess.finalSettlementAmount ? formatCurrency(exitProcess.finalSettlementAmount) : 'Pending')}
            </Text>
          </Paper>
        </SimpleGrid>

        {/* Tabs */}
        <Tabs value={activeTab} onChange={setActiveTab}>
          <Tabs.List>
            <Tabs.Tab value="overview" leftSection={<IconUser size={16} />}>
              Overview
            </Tabs.Tab>
            <Tabs.Tab value="clearance" leftSection={<IconClipboardList size={16} />}>
              Clearance ({approvedClearances.length}/{clearanceList.length})
            </Tabs.Tab>
            <Tabs.Tab value="assets" leftSection={<IconDeviceLaptop size={16} />}>
              Assets ({recoveredAssets.length}/{assetList.length})
            </Tabs.Tab>
            <Tabs.Tab value="fnf" leftSection={<IconCurrencyRupee size={16} />}>
              FnF Settlement
            </Tabs.Tab>
            <Tabs.Tab value="interview" leftSection={<IconMessageCircle size={16} />}>
              Exit Interview
            </Tabs.Tab>
          </Tabs.List>

          {/* ── Overview Tab ── */}
          <Tabs.Panel value="overview" pt="md">
            <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
              <Paper withBorder p="md" radius="md">
                <Title order={5} mb="md">Employee Details</Title>
                <Stack gap="sm">
                  <Group justify="space-between">
                    <Text size="sm" c="dimmed">Employee Name</Text>
                    <Text size="sm" fw={500}>{exitProcess.employeeName ?? '-'}</Text>
                  </Group>
                  <Divider />
                  <Group justify="space-between">
                    <Text size="sm" c="dimmed">Exit Type</Text>
                    <Badge color={getStatusColor(exitProcess.status)} variant="light">
                      {getExitTypeLabel(exitProcess.exitType)}
                    </Badge>
                  </Group>
                  <Divider />
                  <Group justify="space-between">
                    <Text size="sm" c="dimmed">Manager</Text>
                    <Text size="sm" fw={500}>{exitProcess.managerName ?? '-'}</Text>
                  </Group>
                  <Divider />
                  <Group justify="space-between">
                    <Text size="sm" c="dimmed">HR SPOC</Text>
                    <Text size="sm" fw={500}>{exitProcess.hrSpocName ?? '-'}</Text>
                  </Group>
                  <Divider />
                  <Group justify="space-between">
                    <Text size="sm" c="dimmed">Rehire Eligible</Text>
                    <Badge color={exitProcess.rehireEligible ? 'green' : 'red'} variant="light">
                      {exitProcess.rehireEligible ? 'Yes' : 'No'}
                    </Badge>
                  </Group>
                </Stack>
              </Paper>

              <Paper withBorder p="md" radius="md">
                <Title order={5} mb="md">Separation Details</Title>
                <Stack gap="sm">
                  <Group justify="space-between">
                    <Text size="sm" c="dimmed">Reason for Leaving</Text>
                    <Text size="sm" fw={500} maw={200} ta="right" lineClamp={2}>
                      {exitProcess.reasonForLeaving ?? '-'}
                    </Text>
                  </Group>
                  <Divider />
                  <Group justify="space-between">
                    <Text size="sm" c="dimmed">New Company</Text>
                    <Text size="sm" fw={500}>{exitProcess.newCompany ?? '-'}</Text>
                  </Group>
                  <Divider />
                  <Group justify="space-between">
                    <Text size="sm" c="dimmed">New Designation</Text>
                    <Text size="sm" fw={500}>{exitProcess.newDesignation ?? '-'}</Text>
                  </Group>
                  <Divider />
                  <Group justify="space-between">
                    <Text size="sm" c="dimmed">Buyout Amount</Text>
                    <Text size="sm" fw={500}>{formatCurrency(exitProcess.buyoutAmount)}</Text>
                  </Group>
                  <Divider />
                  <Group justify="space-between">
                    <Text size="sm" c="dimmed">Notes</Text>
                    <Text size="sm" fw={500} maw={200} ta="right" lineClamp={2}>
                      {exitProcess.notes ?? '-'}
                    </Text>
                  </Group>
                </Stack>
              </Paper>

              {/* Progress Summary */}
              <Paper withBorder p="md" radius="md">
                <Title order={5} mb="md">Clearance Progress</Title>
                <div className="w-full bg-surface-200 dark:bg-surface-700 rounded-full h-3 mb-2">
                  <div
                    className="bg-sky-700 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${clearanceProgress}%` }}
                  />
                </div>
                <Text size="sm" c="dimmed">{clearanceProgress}% complete ({approvedClearances.length} of {clearanceList.length} departments cleared)</Text>
              </Paper>

              <Paper withBorder p="md" radius="md">
                <Title order={5} mb="md">Asset Recovery Progress</Title>
                <div className="w-full bg-surface-200 dark:bg-surface-700 rounded-full h-3 mb-2">
                  <div
                    className="bg-sky-700 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${assetProgress}%` }}
                  />
                </div>
                <Text size="sm" c="dimmed">
                  {assetProgress}% complete ({recoveredAssets.length} of {assetList.length} assets recovered)
                  {allRecovered === true && assetList.length > 0 && (
                    <Badge color="green" variant="light" ml="xs" size="xs">All Recovered</Badge>
                  )}
                </Text>
              </Paper>
            </SimpleGrid>
          </Tabs.Panel>

          {/* ── Clearance Tab ── */}
          <Tabs.Panel value="clearance" pt="md">
            {clearancesLoading ? (
              <Center h={200}><Loader /></Center>
            ) : clearanceList.length === 0 ? (
              <Alert icon={<IconAlertCircle size={16} />} color="blue" variant="light">
                No clearance records found for this exit process. Clearances may need to be initiated by HR.
              </Alert>
            ) : (
              <Paper withBorder radius="md">
                <Table striped highlightOnHover>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Department</Table.Th>
                      <Table.Th>Approver</Table.Th>
                      <Table.Th>Status</Table.Th>
                      <Table.Th>Requested</Table.Th>
                      <Table.Th>Approved</Table.Th>
                      <Table.Th>Comments</Table.Th>
                      <Table.Th>Actions</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {clearanceList.map((clearance) => (
                      <Table.Tr key={clearance.id}>
                        <Table.Td>
                          <Text fw={500} size="sm">{getDepartmentLabel(clearance.department)}</Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm">{clearance.approverName ?? '-'}</Text>
                        </Table.Td>
                        <Table.Td>
                          <Badge color={getClearanceStatusColor(clearance.status)} variant="light" size="sm">
                            {formatLabel(clearance.status)}
                          </Badge>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm">{clearance.requestedDate ? formatDate(clearance.requestedDate) : '-'}</Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm">{clearance.approvedDate ? formatDate(clearance.approvedDate) : '-'}</Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm" lineClamp={1} maw={200}>{clearance.comments ?? '-'}</Text>
                        </Table.Td>
                        <Table.Td>
                          {clearance.status === ClearanceStatus.PENDING && (
                            <Group gap="xs">
                              <Tooltip label="Approve">
                                <ActionIcon
                                  size="sm"
                                  color="green"
                                  variant="light"
                                  onClick={() => handleClearanceAction(clearance, ClearanceStatus.APPROVED)}
                                >
                                  <IconCheck size={14} />
                                </ActionIcon>
                              </Tooltip>
                              <Tooltip label="Reject">
                                <ActionIcon
                                  size="sm"
                                  color="red"
                                  variant="light"
                                  onClick={() => handleClearanceAction(clearance, ClearanceStatus.REJECTED)}
                                >
                                  <IconTrash size={14} />
                                </ActionIcon>
                              </Tooltip>
                            </Group>
                          )}
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </Paper>
            )}
          </Tabs.Panel>

          {/* ── Assets Tab ── */}
          <Tabs.Panel value="assets" pt="md">
            {assetsLoading ? (
              <Center h={200}><Loader /></Center>
            ) : assetList.length === 0 ? (
              <Alert icon={<IconAlertCircle size={16} />} color="blue" variant="light">
                No asset recovery records found for this exit process.
              </Alert>
            ) : (
              <Paper withBorder radius="md">
                <Table striped highlightOnHover>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Asset</Table.Th>
                      <Table.Th>Type</Table.Th>
                      <Table.Th>Tag / Serial</Table.Th>
                      <Table.Th>Status</Table.Th>
                      <Table.Th>Condition</Table.Th>
                      <Table.Th>Deduction</Table.Th>
                      <Table.Th>Return Date</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {assetList.map((asset) => (
                      <Table.Tr key={asset.id}>
                        <Table.Td>
                          <Text fw={500} size="sm">{asset.assetName}</Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm">{formatLabel(asset.assetType)}</Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm">{asset.assetTag || asset.serialNumber || '-'}</Text>
                        </Table.Td>
                        <Table.Td>
                          <Badge color={getRecoveryStatusColor(asset.status)} variant="light" size="sm">
                            {formatLabel(asset.status)}
                          </Badge>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm">{asset.conditionOnReturn ? formatLabel(asset.conditionOnReturn) : '-'}</Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm" c={asset.deductionAmount > 0 ? 'red' : undefined}>
                            {asset.deductionAmount > 0 ? formatCurrency(asset.deductionAmount) : '-'}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm">{asset.actualReturnDate ? formatDate(asset.actualReturnDate) : '-'}</Text>
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </Paper>
            )}
          </Tabs.Panel>

          {/* ── FnF Tab ── */}
          <Tabs.Panel value="fnf" pt="md">
            {settlement ? (
              <Stack gap="md">
                <Group justify="space-between">
                  <div>
                    <Title order={4}>Full & Final Settlement</Title>
                    <Text size="sm" c="dimmed">Settlement ID: {settlement.id.slice(0, 8)}...</Text>
                  </div>
                  <Group>
                    <Badge
                      color={getSettlementStatusColor(settlement.status)}
                      variant="filled"
                      size="lg"
                    >
                      {formatLabel(settlement.status)}
                    </Badge>
                    <Button
                      variant="light"
                      color="sky.7"
                      onClick={() => router.push(`/offboarding/${exitProcessId}/fnf`)}
                    >
                      View Full Details
                    </Button>
                  </Group>
                </Group>

                {/* Gratuity Banner */}
                {settlement.yearsOfService != null && (
                  <Paper withBorder p="sm" bg="blue.0" radius="md">
                    <Group gap="xl">
                      <div>
                        <Text size="xs" c="dimmed">Years of Service</Text>
                        <Text fw={600}>{Number(settlement.yearsOfService).toFixed(1)} years</Text>
                      </div>
                      <div>
                        <Text size="xs" c="dimmed">Gratuity Eligible</Text>
                        <Badge color={settlement.isGratuityEligible ? 'green' : 'gray'} variant="light">
                          {settlement.isGratuityEligible ? 'Yes' : 'No (< 5 years)'}
                        </Badge>
                      </div>
                      {settlement.lastDrawnSalary != null && (
                        <div>
                          <Text size="xs" c="dimmed">Last Drawn Basic</Text>
                          <Text fw={600}>{formatCurrency(settlement.lastDrawnSalary)}</Text>
                        </div>
                      )}
                    </Group>
                  </Paper>
                )}

                <SimpleGrid cols={{ base: 1, md: 3 }} spacing="md">
                  <Paper withBorder p="md" radius="md" className="bg-[var(--bg-card)]">
                    <Text size="xs" c="dimmed" mb="xs">Total Earnings</Text>
                    <Text fw={700} size="xl" c="green.7">{formatCurrency(settlement.totalEarnings)}</Text>
                  </Paper>
                  <Paper withBorder p="md" radius="md" className="bg-[var(--bg-card)]">
                    <Text size="xs" c="dimmed" mb="xs">Total Deductions</Text>
                    <Text fw={700} size="xl" c="red.7">{formatCurrency(settlement.totalDeductions)}</Text>
                  </Paper>
                  <Paper withBorder p="md" radius="md" className="bg-sky-50 dark:bg-sky-900/20">
                    <Text size="xs" c="dimmed" mb="xs">Net Payable</Text>
                    <Text fw={700} size="xl" c="sky.7">{formatCurrency(settlement.netPayable)}</Text>
                  </Paper>
                </SimpleGrid>
              </Stack>
            ) : (
              <Alert icon={<IconCurrencyRupee size={16} />} color="blue" variant="light">
                <Group justify="space-between" align="center">
                  <Text size="sm">No FnF settlement has been created for this exit process yet.</Text>
                  <Button
                    size="xs"
                    variant="light"
                    color="sky.7"
                    onClick={() => router.push(`/offboarding/${exitProcessId}/fnf`)}
                  >
                    Create Settlement
                  </Button>
                </Group>
              </Alert>
            )}
          </Tabs.Panel>

          {/* ── Exit Interview Tab ── */}
          <Tabs.Panel value="interview" pt="md">
            <Group justify="space-between" mb="md">
              <Title order={4}>Exit Interview</Title>
              <Button
                variant="light"
                color="sky.7"
                onClick={() => router.push(`/offboarding/${exitProcessId}/exit-interview`)}
                leftSection={<IconMessageCircle size={16} />}
              >
                {exitProcess.exitInterviewScheduled ? 'View Interview' : 'Schedule Interview'}
              </Button>
            </Group>

            {exitProcess.exitInterviewScheduled ? (
              <Paper withBorder p="md" radius="md">
                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                  <div>
                    <Text size="xs" c="dimmed">Interview Date</Text>
                    <Text fw={500}>
                      {exitProcess.exitInterviewDate ? formatDate(exitProcess.exitInterviewDate) : 'TBD'}
                    </Text>
                  </div>
                  <div>
                    <Text size="xs" c="dimmed">Feedback</Text>
                    <Text fw={500} lineClamp={3}>
                      {exitProcess.exitInterviewFeedback ?? 'Not recorded yet'}
                    </Text>
                  </div>
                </SimpleGrid>
              </Paper>
            ) : (
              <Alert icon={<IconMessageCircle size={16} />} color="yellow" variant="light">
                Exit interview has not been scheduled yet. Click the button above to schedule one.
              </Alert>
            )}
          </Tabs.Panel>
        </Tabs>
      </Stack>

      {/* Clearance Action Modal */}
      <Modal
        opened={clearanceModalOpen}
        onClose={() => setClearanceModalOpen(false)}
        title={`${clearanceAction === ClearanceStatus.APPROVED ? 'Approve' : 'Reject'} Clearance`}
        centered
      >
        <Stack gap="md">
          <Text size="sm">
            {clearanceAction === ClearanceStatus.APPROVED
              ? 'Are you sure you want to approve this clearance?'
              : 'Are you sure you want to reject this clearance?'}
          </Text>
          <Text size="sm" fw={500}>
            Department: {selectedClearance ? getDepartmentLabel(selectedClearance.department) : ''}
          </Text>
          <Textarea
            label="Comments"
            placeholder="Add any comments..."
            value={clearanceComment}
            onChange={(e) => setClearanceComment(e.currentTarget.value)}
            rows={3}
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setClearanceModalOpen(false)}>
              Cancel
            </Button>
            <Button
              color={clearanceAction === ClearanceStatus.APPROVED ? 'green' : 'red'}
              onClick={submitClearanceAction}
              loading={updateClearanceMutation.isPending}
            >
              {clearanceAction === ClearanceStatus.APPROVED ? 'Approve' : 'Reject'}
            </Button>
          </Group>
        </Stack>
      </Modal>
      </PermissionGate>
    </AppLayout>
  );
}
