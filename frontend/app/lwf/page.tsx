'use client';

import {useEffect, useState} from 'react';
import {useRouter} from 'next/navigation';
import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Card,
  Container,
  Grid,
  Group,
  Loader,
  Modal,
  NumberInput,
  Select,
  Stack,
  Table,
  Tabs,
  Text,
  TextInput,
  ThemeIcon,
  Title,
  Tooltip,
} from '@mantine/core';
import {
  IconBuildingBank,
  IconCalendar,
  IconDownload,
  IconEdit,
  IconFileAnalytics,
  IconInfoCircle,
  IconMapPin,
  IconPlus,
  IconTrash,
} from '@tabler/icons-react';
import {useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';
import {AppLayout} from '@/components/layout';
import {PermissionGate} from '@/components/auth/PermissionGate';
import {Permissions, usePermissions} from '@/lib/hooks/usePermissions';
import {useAuth} from '@/lib/hooks/useAuth';
import {
  useCreateOrUpdateLWFConfig,
  useDeactivateLWFConfig,
  useLWFConfigurations,
  useLWFDeductions,
  useLWFRemittanceReport,
} from '@/lib/hooks/queries/useLWF';
import {
  FREQUENCY_LABELS,
  LWFConfiguration,
  LWFConfigurationRequest,
  LWFFrequency,
  STATUS_CONFIG,
} from '@/lib/types/hrms/lwf';

// ─── Constants ──────────────────────────────────────────────────────────────

const MONTHS = [
  {value: '1', label: 'January'}, {value: '2', label: 'February'},
  {value: '3', label: 'March'}, {value: '4', label: 'April'},
  {value: '5', label: 'May'}, {value: '6', label: 'June'},
  {value: '7', label: 'July'}, {value: '8', label: 'August'},
  {value: '9', label: 'September'}, {value: '10', label: 'October'},
  {value: '11', label: 'November'}, {value: '12', label: 'December'},
];

const FREQUENCY_OPTIONS = [
  {value: 'MONTHLY', label: 'Monthly'},
  {value: 'HALF_YEARLY', label: 'Half-Yearly'},
  {value: 'YEARLY', label: 'Yearly'},
];

/** Default applicable months by frequency */
const DEFAULT_APPLICABLE_MONTHS: Record<LWFFrequency, string> = {
  MONTHLY: '[1,2,3,4,5,6,7,8,9,10,11,12]',
  HALF_YEARLY: '[6,12]',
  YEARLY: '[12]',
};

function fmt(n?: number | null): string {
  if (n == null || n === 0) return '--';
  return `\u20B9${n.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
}

function parseApplicableMonths(json: string): number[] {
  try {
    return JSON.parse(json);
  } catch {
    return [];
  }
}

function formatApplicableMonths(json: string): string {
  const months = parseApplicableMonths(json);
  return months.map(m => MONTHS[m - 1]?.label?.substring(0, 3) ?? String(m)).join(', ');
}

// ─── Zod Schema ─────────────────────────────────────────────────────────────

const lwfConfigSchema = z.object({
  stateCode: z.string().min(1, 'State code is required').max(5),
  stateName: z.string().min(1, 'State name is required').max(50),
  employeeContribution: z.number().min(0, 'Must be >= 0'),
  employerContribution: z.number().min(0, 'Must be >= 0'),
  frequency: z.enum(['MONTHLY', 'HALF_YEARLY', 'YEARLY']),
  applicableMonths: z.string().min(1, 'Applicable months required'),
  effectiveFrom: z.string().min(1, 'Effective from date required'),
  salaryThreshold: z.number().min(0).optional().nullable(),
});

type LWFConfigFormData = z.infer<typeof lwfConfigSchema>;

// ─── Main Component ─────────────────────────────────────────────────────────

export default function LWFPage() {
  const router = useRouter();
  const {isAuthenticated, hasHydrated} = useAuth();
  const {hasPermission, isReady: permissionsReady} = usePermissions();

  // BUG-L6-005: Page-level permission gate for LWF
  useEffect(() => {
    if (!hasHydrated || !permissionsReady) return;
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }
    if (!hasPermission(Permissions.STATUTORY_VIEW)) {
      router.replace('/me/dashboard');
    }
  }, [hasHydrated, permissionsReady, isAuthenticated, router, hasPermission]);

  const [activeTab, setActiveTab] = useState<string | null>('configurations');
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<LWFConfiguration | null>(null);

  // Deductions tab state
  const now = new Date();
  const [dedMonth, setDedMonth] = useState<string>(String(now.getMonth() + 1));
  const [dedYear, setDedYear] = useState<string>(String(now.getFullYear()));
  const [dedFetched, setDedFetched] = useState(false);

  // Report tab state
  const [rptMonth, setRptMonth] = useState<string>(String(now.getMonth() + 1));
  const [rptYear, setRptYear] = useState<string>(String(now.getFullYear()));
  const [rptFetched, setRptFetched] = useState(false);

  // Queries
  const {data: configurations = [], isLoading: configLoading} = useLWFConfigurations(
    activeTab === 'configurations'
  );
  const {data: deductions = [], isLoading: dedLoading, refetch: refetchDed} = useLWFDeductions(
    Number(dedMonth), Number(dedYear),
    activeTab === 'deductions' && dedFetched
  );
  const {data: report, isLoading: rptLoading, refetch: refetchRpt} = useLWFRemittanceReport(
    Number(rptMonth), Number(rptYear),
    activeTab === 'report' && rptFetched
  );

  // Mutations
  const createOrUpdate = useCreateOrUpdateLWFConfig();
  const deactivate = useDeactivateLWFConfig();

  // Form
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: {errors},
  } = useForm<LWFConfigFormData>({
    resolver: zodResolver(lwfConfigSchema),
    defaultValues: {
      frequency: 'HALF_YEARLY',
      applicableMonths: '[6,12]',
    },
  });

  const watchFrequency = watch('frequency');

  const openCreateModal = () => {
    setEditingConfig(null);
    reset({
      stateCode: '',
      stateName: '',
      employeeContribution: 0,
      employerContribution: 0,
      frequency: 'HALF_YEARLY',
      applicableMonths: '[6,12]',
      effectiveFrom: new Date().toISOString().split('T')[0],
      salaryThreshold: undefined,
    });
    setConfigModalOpen(true);
  };

  const openEditModal = (config: LWFConfiguration) => {
    setEditingConfig(config);
    reset({
      stateCode: config.stateCode,
      stateName: config.stateName,
      employeeContribution: config.employeeContribution,
      employerContribution: config.employerContribution,
      frequency: config.frequency,
      applicableMonths: config.applicableMonths,
      effectiveFrom: config.effectiveFrom,
      salaryThreshold: config.salaryThreshold ?? undefined,
    });
    setConfigModalOpen(true);
  };

  const onSubmitConfig = (data: LWFConfigFormData) => {
    const request: LWFConfigurationRequest = {
      stateCode: data.stateCode.toUpperCase(),
      stateName: data.stateName,
      employeeContribution: data.employeeContribution,
      employerContribution: data.employerContribution,
      frequency: data.frequency as LWFFrequency,
      applicableMonths: data.applicableMonths,
      effectiveFrom: data.effectiveFrom,
      salaryThreshold: data.salaryThreshold ?? undefined,
      isActive: true,
    };

    createOrUpdate.mutate(request, {
      onSuccess: () => {
        setConfigModalOpen(false);
        reset();
      },
    });
  };

  const handleDeactivate = (stateCode: string) => {
    if (window.confirm(`Deactivate LWF configuration for ${stateCode}?`)) {
      deactivate.mutate(stateCode);
    }
  };

  const exportDeductionsCSV = () => {
    const monthLabel = MONTHS.find(m => m.value === dedMonth)?.label ?? dedMonth;
    const headers = ['Employee ID', 'State', 'Employee Amount', 'Employer Amount', 'Status', 'Gross Salary'];
    const rows = deductions.map(d => [
      d.employeeId,
      d.stateCode,
      d.employeeAmount,
      d.employerAmount,
      d.status,
      d.grossSalary ?? '',
    ].join(','));
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], {type: 'text/csv'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lwf_deductions_${monthLabel}_${dedYear}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Permission guard
  if (!hasHydrated || !permissionsReady || !hasPermission(Permissions.STATUTORY_VIEW)) {
    return null;
  }

  return (
    <AppLayout>
      <Container size="xl" py="lg">
        <Group justify="space-between" mb="sm">
          <div>
            <Title order={2} className="skeuo-emboss">Labour Welfare Fund (LWF)</Title>
            <Text c="dimmed" mt={4}>
              Manage state-wise LWF configurations and track deductions for statutory compliance.
            </Text>
          </div>
          <ThemeIcon size="xl" radius="md" className="bg-accent-700">
            <IconBuildingBank size={28}/>
          </ThemeIcon>
        </Group>

        <Tabs value={activeTab} onChange={setActiveTab} variant="outline" radius="md" mt="lg">
          <Tabs.List>
            <Tabs.Tab value="configurations" leftSection={<IconMapPin size={16}/>}>
              State Configurations
            </Tabs.Tab>
            <Tabs.Tab value="deductions" leftSection={<IconCalendar size={16}/>}>
              Monthly Deductions
            </Tabs.Tab>
            <Tabs.Tab value="report" leftSection={<IconFileAnalytics size={16}/>}>
              Remittance Report
            </Tabs.Tab>
          </Tabs.List>

          {/* ───── Configurations Tab ───── */}
          <Tabs.Panel value="configurations" pt="md">
            <Group justify="space-between" mb="md">
              <Text fw={500}>LWF rates by Indian state</Text>
              <PermissionGate permission="STATUTORY:MANAGE">
                <Button
                  leftSection={<IconPlus size={16}/>}
                  className="bg-accent-700 hover:bg-accent-800"
                  onClick={openCreateModal}
                >
                  Add State Configuration
                </Button>
              </PermissionGate>
            </Group>

            {configLoading ? (
              <Group justify="center" py="xl"><Loader color="blue"/></Group>
            ) : configurations.length === 0 ? (
              <Alert icon={<IconInfoCircle size={16}/>} color="blue" variant="light">
                No LWF configurations found. Add state configurations to get started.
              </Alert>
            ) : (
              <Card shadow="sm" radius="md" withBorder>
                <Table striped highlightOnHover>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>State</Table.Th>
                      <Table.Th>Code</Table.Th>
                      <Table.Th style={{textAlign: 'right'}}>Employee</Table.Th>
                      <Table.Th style={{textAlign: 'right'}}>Employer</Table.Th>
                      <Table.Th>Frequency</Table.Th>
                      <Table.Th>Applicable Months</Table.Th>
                      <Table.Th>Threshold</Table.Th>
                      <Table.Th>Status</Table.Th>
                      <Table.Th>Actions</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {configurations.map((config) => (
                      <Table.Tr key={config.id}>
                        <Table.Td fw={500}>{config.stateName}</Table.Td>
                        <Table.Td>
                          <Badge variant="light" color="gray" size="sm">{config.stateCode}</Badge>
                        </Table.Td>
                        <Table.Td style={{textAlign: 'right'}}>{fmt(config.employeeContribution)}</Table.Td>
                        <Table.Td style={{textAlign: 'right'}}>{fmt(config.employerContribution)}</Table.Td>
                        <Table.Td>
                          <Badge variant="light" color="sky" size="sm">
                            {FREQUENCY_LABELS[config.frequency]}
                          </Badge>
                        </Table.Td>
                        <Table.Td>
                          <Text size="xs" c="dimmed">{formatApplicableMonths(config.applicableMonths)}</Text>
                        </Table.Td>
                        <Table.Td>{config.salaryThreshold ? fmt(config.salaryThreshold) : '--'}</Table.Td>
                        <Table.Td>
                          <Badge color={config.isActive ? 'green' : 'red'} variant="light" size="sm">
                            {config.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </Table.Td>
                        <Table.Td>
                          <PermissionGate permission="STATUTORY:MANAGE">
                            <Group gap="xs">
                              <Tooltip label="Edit">
                                <ActionIcon variant="subtle" color="sky" onClick={() => openEditModal(config)}>
                                  <IconEdit size={16}/>
                                </ActionIcon>
                              </Tooltip>
                              {config.isActive && (
                                <Tooltip label="Deactivate">
                                  <ActionIcon variant="subtle" color="red"
                                              onClick={() => handleDeactivate(config.stateCode)}>
                                    <IconTrash size={16}/>
                                  </ActionIcon>
                                </Tooltip>
                              )}
                            </Group>
                          </PermissionGate>
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </Card>
            )}
          </Tabs.Panel>

          {/* ───── Deductions Tab ───── */}
          <Tabs.Panel value="deductions" pt="md">
            <Card shadow="sm" radius="md" withBorder p="md" mb="md">
              <Group>
                <Select
                  label="Month"
                  data={MONTHS}
                  value={dedMonth}
                  onChange={(v) => {
                    setDedMonth(v ?? '1');
                    setDedFetched(false);
                  }}
                  w={160}
                />
                <TextInput
                  label="Year"
                  type="number"
                  value={dedYear}
                  onChange={(e) => {
                    setDedYear(e.target.value);
                    setDedFetched(false);
                  }}
                  w={120}
                />
                <Button
                  mt={24}
                  className="bg-accent-700 hover:bg-accent-800"
                  onClick={() => {
                    setDedFetched(true);
                    refetchDed();
                  }}
                >
                  Fetch Deductions
                </Button>
                {deductions.length > 0 && (
                  <Button
                    mt={24}
                    variant="outline"
                    leftSection={<IconDownload size={16}/>}
                    onClick={exportDeductionsCSV}
                  >
                    Export CSV
                  </Button>
                )}
              </Group>
            </Card>

            {dedLoading ? (
              <Group justify="center" py="xl"><Loader color="blue"/></Group>
            ) : !dedFetched ? (
              <Alert icon={<IconInfoCircle size={16}/>} color="blue" variant="light">
                Select a month and year, then click &quot;Fetch Deductions&quot;.
              </Alert>
            ) : deductions.length === 0 ? (
              <Alert icon={<IconInfoCircle size={16}/>} color="yellow" variant="light">
                No LWF deductions found for {MONTHS.find(m => m.value === dedMonth)?.label} {dedYear}.
              </Alert>
            ) : (
              <Card shadow="sm" radius="md" withBorder>
                <Table striped highlightOnHover>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Employee ID</Table.Th>
                      <Table.Th>State</Table.Th>
                      <Table.Th style={{textAlign: 'right'}}>Employee</Table.Th>
                      <Table.Th style={{textAlign: 'right'}}>Employer</Table.Th>
                      <Table.Th>Frequency</Table.Th>
                      <Table.Th>Status</Table.Th>
                      <Table.Th style={{textAlign: 'right'}}>Gross Salary</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {deductions.map((ded) => (
                      <Table.Tr key={ded.id}>
                        <Table.Td>
                          <Text size="xs" ff="monospace">{ded.employeeId.substring(0, 8)}...</Text>
                        </Table.Td>
                        <Table.Td><Badge variant="light" color="gray" size="sm">{ded.stateCode}</Badge></Table.Td>
                        <Table.Td style={{textAlign: 'right'}}>{fmt(ded.employeeAmount)}</Table.Td>
                        <Table.Td style={{textAlign: 'right'}}>{fmt(ded.employerAmount)}</Table.Td>
                        <Table.Td>{FREQUENCY_LABELS[ded.frequency]}</Table.Td>
                        <Table.Td>
                          <Badge color={STATUS_CONFIG[ded.status].color} variant="light" size="sm">
                            {STATUS_CONFIG[ded.status].label}
                          </Badge>
                        </Table.Td>
                        <Table.Td style={{textAlign: 'right'}}>{fmt(ded.grossSalary)}</Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </Card>
            )}
          </Tabs.Panel>

          {/* ───── Remittance Report Tab ───── */}
          <Tabs.Panel value="report" pt="md">
            <Card shadow="sm" radius="md" withBorder p="md" mb="md">
              <Group>
                <Select
                  label="Month"
                  data={MONTHS}
                  value={rptMonth}
                  onChange={(v) => {
                    setRptMonth(v ?? '1');
                    setRptFetched(false);
                  }}
                  w={160}
                />
                <TextInput
                  label="Year"
                  type="number"
                  value={rptYear}
                  onChange={(e) => {
                    setRptYear(e.target.value);
                    setRptFetched(false);
                  }}
                  w={120}
                />
                <Button
                  mt={24}
                  className="bg-accent-700 hover:bg-accent-800"
                  onClick={() => {
                    setRptFetched(true);
                    refetchRpt();
                  }}
                >
                  Generate Report
                </Button>
              </Group>
            </Card>

            {rptLoading ? (
              <Group justify="center" py="xl"><Loader color="blue"/></Group>
            ) : !rptFetched ? (
              <Alert icon={<IconInfoCircle size={16}/>} color="blue" variant="light">
                Select a period and click &quot;Generate Report&quot; to view the remittance summary.
              </Alert>
            ) : report ? (
              <>
                {/* Summary cards */}
                <Grid mb="md">
                  <Grid.Col span={{base: 12, sm: 6, md: 3}}>
                    <Card shadow="sm" radius="md" withBorder p="md">
                      <Text c="dimmed" size="xs" tt="uppercase" fw={600}>Total Employees</Text>
                      <Text fw={700} size="xl" mt={4}>{report.totalEmployees}</Text>
                    </Card>
                  </Grid.Col>
                  <Grid.Col span={{base: 12, sm: 6, md: 3}}>
                    <Card shadow="sm" radius="md" withBorder p="md">
                      <Text c="dimmed" size="xs" tt="uppercase" fw={600}>Employee Total</Text>
                      <Text fw={700} size="xl" mt={4}
                            className="text-accent-700">{fmt(report.totalEmployeeContribution)}</Text>
                    </Card>
                  </Grid.Col>
                  <Grid.Col span={{base: 12, sm: 6, md: 3}}>
                    <Card shadow="sm" radius="md" withBorder p="md">
                      <Text c="dimmed" size="xs" tt="uppercase" fw={600}>Employer Total</Text>
                      <Text fw={700} size="xl" mt={4}
                            className="text-accent-700">{fmt(report.totalEmployerContribution)}</Text>
                    </Card>
                  </Grid.Col>
                  <Grid.Col span={{base: 12, sm: 6, md: 3}}>
                    <Card shadow="sm" radius="md" withBorder p="md">
                      <Text c="dimmed" size="xs" tt="uppercase" fw={600}>Grand Total</Text>
                      <Text fw={700} size="xl" mt={4} c="green">{fmt(report.grandTotal)}</Text>
                    </Card>
                  </Grid.Col>
                </Grid>

                {/* State-wise breakdown */}
                {report.stateWiseSummary.length > 0 ? (
                  <Card shadow="sm" radius="md" withBorder>
                    <Text fw={600} mb="sm">State-wise Breakdown</Text>
                    <Table striped highlightOnHover>
                      <Table.Thead>
                        <Table.Tr>
                          <Table.Th>State</Table.Th>
                          <Table.Th>Code</Table.Th>
                          <Table.Th style={{textAlign: 'right'}}>Employees</Table.Th>
                          <Table.Th style={{textAlign: 'right'}}>Employee Total</Table.Th>
                          <Table.Th style={{textAlign: 'right'}}>Employer Total</Table.Th>
                          <Table.Th style={{textAlign: 'right'}}>Total</Table.Th>
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>
                        {report.stateWiseSummary.map((s) => (
                          <Table.Tr key={s.stateCode}>
                            <Table.Td fw={500}>{s.stateName}</Table.Td>
                            <Table.Td><Badge variant="light" color="gray" size="sm">{s.stateCode}</Badge></Table.Td>
                            <Table.Td style={{textAlign: 'right'}}>{s.employeeCount}</Table.Td>
                            <Table.Td style={{textAlign: 'right'}}>{fmt(s.employeeTotal)}</Table.Td>
                            <Table.Td style={{textAlign: 'right'}}>{fmt(s.employerTotal)}</Table.Td>
                            <Table.Td style={{textAlign: 'right'}} fw={600}>{fmt(s.total)}</Table.Td>
                          </Table.Tr>
                        ))}
                      </Table.Tbody>
                    </Table>
                  </Card>
                ) : (
                  <Alert icon={<IconInfoCircle size={16}/>} color="yellow" variant="light">
                    No LWF deductions recorded for this period.
                  </Alert>
                )}
              </>
            ) : null}
          </Tabs.Panel>
        </Tabs>

        {/* ───── Configuration Modal ───── */}
        <Modal
          opened={configModalOpen}
          onClose={() => setConfigModalOpen(false)}
          title={editingConfig ? 'Edit LWF Configuration' : 'Add LWF State Configuration'}
          size="lg"
        >
          <form onSubmit={handleSubmit(onSubmitConfig)}>
            <Stack gap="md">
              <Group grow>
                <TextInput
                  label="State Code"
                  placeholder="e.g. MH, KA, TN"
                  maxLength={5}
                  disabled={!!editingConfig}
                  error={errors.stateCode?.message}
                  {...register('stateCode')}
                />
                <TextInput
                  label="State Name"
                  placeholder="e.g. Maharashtra"
                  error={errors.stateName?.message}
                  {...register('stateName')}
                />
              </Group>

              <Group grow>
                <NumberInput
                  label="Employee Contribution (INR)"
                  placeholder="25.00"
                  min={0}
                  decimalScale={2}
                  value={watch('employeeContribution')}
                  onChange={(v) => setValue('employeeContribution', Number(v) || 0)}
                  error={errors.employeeContribution?.message}
                />
                <NumberInput
                  label="Employer Contribution (INR)"
                  placeholder="75.00"
                  min={0}
                  decimalScale={2}
                  value={watch('employerContribution')}
                  onChange={(v) => setValue('employerContribution', Number(v) || 0)}
                  error={errors.employerContribution?.message}
                />
              </Group>

              <Group grow>
                <Select
                  label="Frequency"
                  data={FREQUENCY_OPTIONS}
                  value={watchFrequency}
                  onChange={(v) => {
                    const freq = (v ?? 'HALF_YEARLY') as LWFFrequency;
                    setValue('frequency', freq);
                    setValue('applicableMonths', DEFAULT_APPLICABLE_MONTHS[freq]);
                  }}
                  error={errors.frequency?.message}
                />
                <TextInput
                  label="Applicable Months (JSON)"
                  placeholder="[6,12]"
                  error={errors.applicableMonths?.message}
                  {...register('applicableMonths')}
                />
              </Group>

              <Group grow>
                <TextInput
                  label="Effective From"
                  type="date"
                  error={errors.effectiveFrom?.message}
                  {...register('effectiveFrom')}
                />
                <NumberInput
                  label="Salary Threshold (optional)"
                  placeholder="Minimum gross salary"
                  min={0}
                  decimalScale={2}
                  value={watch('salaryThreshold') ?? undefined}
                  onChange={(v) => setValue('salaryThreshold', v ? Number(v) : null)}
                  error={errors.salaryThreshold?.message}
                />
              </Group>

              <Group justify="flex-end" mt="md">
                <Button variant="outline" onClick={() => setConfigModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-accent-700 hover:bg-accent-800"
                  loading={createOrUpdate.isPending}
                >
                  {editingConfig ? 'Update Configuration' : 'Create Configuration'}
                </Button>
              </Group>
            </Stack>
          </form>
        </Modal>
      </Container>
    </AppLayout>
  );
}
