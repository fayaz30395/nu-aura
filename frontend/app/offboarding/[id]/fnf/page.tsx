'use client';

import React from 'react';
import {useParams, useRouter} from 'next/navigation';
import {Controller, useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';
import {
  ActionIcon,
  Badge,
  Button,
  Center,
  Divider,
  Group,
  Loader,
  NumberInput,
  Paper,
  Select,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
  Title,
} from '@mantine/core';
import {notifications} from '@mantine/notifications';
import {IconArrowLeft, IconCash, IconCheck, IconSend,} from '@tabler/icons-react';
import {AppLayout} from '@/components/layout/AppLayout';
import {PermissionGate} from '@/components/auth/PermissionGate';
import {Permissions} from '@/lib/hooks/usePermissions';
import {
  useApproveSettlement,
  useCreateSettlement,
  useExitProcess,
  useProcessSettlementPayment,
  useSettlementByExitProcess,
  useSubmitSettlementForApproval,
  useUpdateSettlement,
} from '@/lib/hooks/queries/useExit';
import {PaymentMode, SettlementStatus,} from '@/lib/types/hrms/exit';
import {formatCurrency, formatDate} from '@/lib/utils';

const fnfFormSchema = z.object({
  pendingSalary: z.number({coerce: true}).min(0).default(0),
  leaveEncashment: z.number({coerce: true}).min(0).default(0),
  bonusAmount: z.number({coerce: true}).min(0).default(0),
  gratuityAmount: z.number({coerce: true}).min(0).default(0),
  noticePeriodRecovery: z.number({coerce: true}).min(0).default(0),
  reimbursements: z.number({coerce: true}).min(0).default(0),
  otherEarnings: z.number({coerce: true}).min(0).default(0),
  noticeBuyout: z.number({coerce: true}).min(0).default(0),
  loanRecovery: z.number({coerce: true}).min(0).default(0),
  advanceRecovery: z.number({coerce: true}).min(0).default(0),
  assetDamageDeduction: z.number({coerce: true}).min(0).default(0),
  taxDeduction: z.number({coerce: true}).min(0).default(0),
  otherDeductions: z.number({coerce: true}).min(0).default(0),
  yearsOfService: z.number({coerce: true}).min(0).optional(),
  lastDrawnSalary: z.number({coerce: true}).min(0).optional(),
  remarks: z.string().optional(),
});

type FnFFormData = z.infer<typeof fnfFormSchema>;

const paymentFormSchema = z.object({
  paymentMode: z.nativeEnum(PaymentMode, {errorMap: () => ({message: 'Payment mode is required'})}),
  paymentReference: z.string().min(1, 'Payment reference is required'),
});

type PaymentFormData = z.infer<typeof paymentFormSchema>;

const fmt = (v?: number | null) =>
  v != null ? formatCurrency(v) : '-';

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

const formatLabel = (str: string): string =>
  str.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

export default function FnFSettlementPage() {
  const params = useParams();
  const router = useRouter();
  const exitProcessId = params.id as string;

  const {data: exitProcess} = useExitProcess(exitProcessId);
  const {data: settlement, isLoading, error: _loadError} = useSettlementByExitProcess(exitProcessId);

  const createMutation = useCreateSettlement();
  const updateMutation = useUpdateSettlement();
  const submitMutation = useSubmitSettlementForApproval();
  const approveMutation = useApproveSettlement();
  const paymentMutation = useProcessSettlementPayment();

  const fnfForm = useForm<FnFFormData>({
    resolver: zodResolver(fnfFormSchema),
    defaultValues: {
      pendingSalary: 0,
      leaveEncashment: 0,
      bonusAmount: 0,
      gratuityAmount: 0,
      noticePeriodRecovery: 0,
      reimbursements: 0,
      otherEarnings: 0,
      noticeBuyout: 0,
      loanRecovery: 0,
      advanceRecovery: 0,
      assetDamageDeduction: 0,
      taxDeduction: 0,
      otherDeductions: 0,
      remarks: '',
    },
  });

  const paymentForm = useForm<PaymentFormData>({
    resolver: zodResolver(paymentFormSchema),
  });

  // Populate form when settlement loads
  React.useEffect(() => {
    if (settlement) {
      fnfForm.reset({
        pendingSalary: settlement.pendingSalary ?? 0,
        leaveEncashment: settlement.leaveEncashment ?? 0,
        bonusAmount: settlement.bonusAmount ?? 0,
        gratuityAmount: settlement.gratuityAmount ?? 0,
        noticePeriodRecovery: settlement.noticePeriodRecovery ?? 0,
        reimbursements: settlement.reimbursements ?? 0,
        otherEarnings: settlement.otherEarnings ?? 0,
        noticeBuyout: settlement.noticeBuyout ?? 0,
        loanRecovery: settlement.loanRecovery ?? 0,
        advanceRecovery: settlement.advanceRecovery ?? 0,
        assetDamageDeduction: settlement.assetDamageDeduction ?? 0,
        taxDeduction: settlement.taxDeduction ?? 0,
        otherDeductions: settlement.otherDeductions ?? 0,
        yearsOfService: settlement.yearsOfService ?? undefined,
        lastDrawnSalary: settlement.lastDrawnSalary ?? undefined,
        remarks: settlement.remarks ?? '',
      });
    }
  }, [settlement]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCreateOrUpdate = async (data: FnFFormData) => {
    try {
      if (settlement) {
        await updateMutation.mutateAsync({
          id: settlement.id,
          data: {
            ...data,
            yearsOfService: data.yearsOfService ?? undefined,
            lastDrawnSalary: data.lastDrawnSalary ?? undefined,
            remarks: data.remarks ?? undefined,
          },
        });
        notifications.show({
          title: 'Saved',
          message: 'Settlement updated successfully',
          color: 'green',
          icon: <IconCheck size={16}/>
        });
      } else {
        await createMutation.mutateAsync({
          exitProcessId,
          employeeId: exitProcess?.employeeId ?? '',
          ...data,
          yearsOfService: data.yearsOfService ?? undefined,
          lastDrawnSalary: data.lastDrawnSalary ?? undefined,
          remarks: data.remarks ?? undefined,
        });
        notifications.show({
          title: 'Created',
          message: 'Settlement created successfully',
          color: 'green',
          icon: <IconCheck size={16}/>
        });
      }
    } catch {
      notifications.show({title: 'Error', message: 'Failed to save settlement', color: 'red'});
    }
  };

  const handleSubmitForApproval = async () => {
    if (!settlement) return;
    try {
      await submitMutation.mutateAsync(settlement.id);
      notifications.show({
        title: 'Submitted',
        message: 'Settlement submitted for approval',
        color: 'green',
        icon: <IconCheck size={16}/>
      });
    } catch {
      notifications.show({title: 'Error', message: 'Failed to submit for approval', color: 'red'});
    }
  };

  const handleApprove = async () => {
    if (!settlement) return;
    try {
      await approveMutation.mutateAsync(settlement.id);
      notifications.show({
        title: 'Approved',
        message: 'Settlement approved',
        color: 'green',
        icon: <IconCheck size={16}/>
      });
    } catch {
      notifications.show({title: 'Error', message: 'Failed to approve settlement', color: 'red'});
    }
  };

  const handleProcessPayment = async (data: PaymentFormData) => {
    if (!settlement) return;
    try {
      await paymentMutation.mutateAsync({
        id: settlement.id,
        paymentMode: data.paymentMode,
        paymentReference: data.paymentReference,
      });
      notifications.show({
        title: 'Paid',
        message: 'Payment processed successfully',
        color: 'green',
        icon: <IconCheck size={16}/>
      });
    } catch {
      notifications.show({title: 'Error', message: 'Failed to process payment', color: 'red'});
    }
  };

  if (isLoading) {
    return (
      <AppLayout>
        <Center h={400}><Loader size="lg"/></Center>
      </AppLayout>
    );
  }

  const canEdit = !settlement || settlement.status === SettlementStatus.DRAFT;
  const canSubmit = settlement?.status === SettlementStatus.DRAFT;
  const canApprove = settlement?.status === SettlementStatus.PENDING_APPROVAL;
  const canPay = settlement?.status === SettlementStatus.APPROVED || settlement?.status === SettlementStatus.PROCESSING;
  const isReadonly = settlement && settlement.status !== SettlementStatus.DRAFT;

  // Compute live totals from form values
  const watchedValues = fnfForm.watch();
  const liveEarnings =
    (watchedValues.pendingSalary ?? 0) +
    (watchedValues.leaveEncashment ?? 0) +
    (watchedValues.bonusAmount ?? 0) +
    (watchedValues.gratuityAmount ?? 0) +
    (watchedValues.noticePeriodRecovery ?? 0) +
    (watchedValues.reimbursements ?? 0) +
    (watchedValues.otherEarnings ?? 0);
  const liveDeductions =
    (watchedValues.noticeBuyout ?? 0) +
    (watchedValues.loanRecovery ?? 0) +
    (watchedValues.advanceRecovery ?? 0) +
    (watchedValues.assetDamageDeduction ?? 0) +
    (watchedValues.taxDeduction ?? 0) +
    (watchedValues.otherDeductions ?? 0);
  const liveNet = liveEarnings - liveDeductions;

  return (
    <AppLayout>
      <PermissionGate anyOf={[Permissions.EXIT_MANAGE, Permissions.SYSTEM_ADMIN]}
                      fallback={<Stack p="md"><Text c="red">You do not have permission to view FnF
                        settlements.</Text></Stack>}>
        <Stack gap="lg" p="md">
          {/* Header */}
          <Group justify="space-between" align="flex-start">
            <Group>
              <ActionIcon variant="subtle" size="lg" onClick={() => router.push(`/offboarding/${exitProcessId}`)}>
                <IconArrowLeft size={20}/>
              </ActionIcon>
              <div>
                <Title order={2} className="text-surface-900 dark:text-surface-50">
                  Full & Final Settlement
                </Title>
                <Text size="sm" c="dimmed">
                  {exitProcess?.employeeName ?? 'Employee'} | Exit Process: {exitProcessId.slice(0, 8)}...
                </Text>
              </div>
            </Group>
            <Group>
              {settlement && (
                <Badge
                  color={getSettlementStatusColor(settlement.status)}
                  variant="filled"
                  size="lg"
                >
                  {formatLabel(settlement.status)}
                </Badge>
              )}
            </Group>
          </Group>

          {/* Gratuity Info */}
          {settlement?.yearsOfService != null && (
            <Paper withBorder p="sm" bg="blue.0" radius="md">
              <Group gap="xl">
                <div>
                  <Text size="xs" c="dimmed">Years of Service</Text>
                  <Text fw={600}>{Number(settlement.yearsOfService).toFixed(1)} years</Text>
                </div>
                <div>
                  <Text size="xs" c="dimmed">Gratuity Eligible</Text>
                  <Badge color={settlement.isGratuityEligible ? 'green' : 'gray'} variant="light">
                    {settlement.isGratuityEligible ? 'Yes (5+ years)' : 'No (< 5 years)'}
                  </Badge>
                </div>
                {settlement.lastDrawnSalary != null && (
                  <div>
                    <Text size="xs" c="dimmed">Last Drawn Basic</Text>
                    <Text fw={600}>{fmt(settlement.lastDrawnSalary)}</Text>
                  </div>
                )}
              </Group>
            </Paper>
          )}

          {/* Settlement Form or Read-only View */}
          <form onSubmit={fnfForm.handleSubmit(handleCreateOrUpdate)}>
            <SimpleGrid cols={{base: 1, md: 2}} spacing="md">
              {/* Earnings */}
              <Paper withBorder p="md" radius="md">
                <Title order={5} mb="sm" c="green.7">Earnings</Title>
                <Stack gap="sm">
                  <Controller
                    name="pendingSalary"
                    control={fnfForm.control}
                    render={({field}) => (
                      <NumberInput
                        label="Pending Salary"
                        prefix="₹ "
                        thousandSeparator=","
                        decimalScale={2}
                        min={0}
                        disabled={!!isReadonly}
                        value={field.value}
                        onChange={(val) => field.onChange(val ?? 0)}
                      />
                    )}
                  />
                  <Controller
                    name="leaveEncashment"
                    control={fnfForm.control}
                    render={({field}) => (
                      <NumberInput
                        label="Leave Encashment"
                        prefix="₹ "
                        thousandSeparator=","
                        decimalScale={2}
                        min={0}
                        disabled={!!isReadonly}
                        value={field.value}
                        onChange={(val) => field.onChange(val ?? 0)}
                      />
                    )}
                  />
                  <Controller
                    name="bonusAmount"
                    control={fnfForm.control}
                    render={({field}) => (
                      <NumberInput
                        label="Bonus (Prorated)"
                        prefix="₹ "
                        thousandSeparator=","
                        decimalScale={2}
                        min={0}
                        disabled={!!isReadonly}
                        value={field.value}
                        onChange={(val) => field.onChange(val ?? 0)}
                      />
                    )}
                  />
                  <Controller
                    name="gratuityAmount"
                    control={fnfForm.control}
                    render={({field}) => (
                      <NumberInput
                        label="Gratuity"
                        prefix="₹ "
                        thousandSeparator=","
                        decimalScale={2}
                        min={0}
                        disabled={!!isReadonly}
                        value={field.value}
                        onChange={(val) => field.onChange(val ?? 0)}
                      />
                    )}
                  />
                  <Controller
                    name="noticePeriodRecovery"
                    control={fnfForm.control}
                    render={({field}) => (
                      <NumberInput
                        label="Notice Period Recovery"
                        prefix="₹ "
                        thousandSeparator=","
                        decimalScale={2}
                        min={0}
                        disabled={!!isReadonly}
                        value={field.value}
                        onChange={(val) => field.onChange(val ?? 0)}
                      />
                    )}
                  />
                  <Controller
                    name="reimbursements"
                    control={fnfForm.control}
                    render={({field}) => (
                      <NumberInput
                        label="Reimbursements"
                        prefix="₹ "
                        thousandSeparator=","
                        decimalScale={2}
                        min={0}
                        disabled={!!isReadonly}
                        value={field.value}
                        onChange={(val) => field.onChange(val ?? 0)}
                      />
                    )}
                  />
                  <Controller
                    name="otherEarnings"
                    control={fnfForm.control}
                    render={({field}) => (
                      <NumberInput
                        label="Other Earnings"
                        prefix="₹ "
                        thousandSeparator=","
                        decimalScale={2}
                        min={0}
                        disabled={!!isReadonly}
                        value={field.value}
                        onChange={(val) => field.onChange(val ?? 0)}
                      />
                    )}
                  />
                </Stack>
                <Divider my="sm"/>
                <Group justify="space-between">
                  <Text fw={700}>Total Earnings</Text>
                  <Text fw={700} c="green.7">{formatCurrency(liveEarnings)}</Text>
                </Group>
              </Paper>

              {/* Deductions */}
              <Paper withBorder p="md" radius="md">
                <Title order={5} mb="sm" c="red.7">Deductions</Title>
                <Stack gap="sm">
                  <Controller
                    name="noticeBuyout"
                    control={fnfForm.control}
                    render={({field}) => (
                      <NumberInput
                        label="Notice Buyout"
                        prefix="₹ "
                        thousandSeparator=","
                        decimalScale={2}
                        min={0}
                        disabled={!!isReadonly}
                        value={field.value}
                        onChange={(val) => field.onChange(val ?? 0)}
                      />
                    )}
                  />
                  <Controller
                    name="loanRecovery"
                    control={fnfForm.control}
                    render={({field}) => (
                      <NumberInput
                        label="Loan Recovery"
                        prefix="₹ "
                        thousandSeparator=","
                        decimalScale={2}
                        min={0}
                        disabled={!!isReadonly}
                        value={field.value}
                        onChange={(val) => field.onChange(val ?? 0)}
                      />
                    )}
                  />
                  <Controller
                    name="advanceRecovery"
                    control={fnfForm.control}
                    render={({field}) => (
                      <NumberInput
                        label="Advance Recovery"
                        prefix="₹ "
                        thousandSeparator=","
                        decimalScale={2}
                        min={0}
                        disabled={!!isReadonly}
                        value={field.value}
                        onChange={(val) => field.onChange(val ?? 0)}
                      />
                    )}
                  />
                  <Controller
                    name="assetDamageDeduction"
                    control={fnfForm.control}
                    render={({field}) => (
                      <NumberInput
                        label="Asset Damage Deduction"
                        prefix="₹ "
                        thousandSeparator=","
                        decimalScale={2}
                        min={0}
                        disabled={!!isReadonly}
                        value={field.value}
                        onChange={(val) => field.onChange(val ?? 0)}
                      />
                    )}
                  />
                  <Controller
                    name="taxDeduction"
                    control={fnfForm.control}
                    render={({field}) => (
                      <NumberInput
                        label="Tax Deduction"
                        prefix="₹ "
                        thousandSeparator=","
                        decimalScale={2}
                        min={0}
                        disabled={!!isReadonly}
                        value={field.value}
                        onChange={(val) => field.onChange(val ?? 0)}
                      />
                    )}
                  />
                  <Controller
                    name="otherDeductions"
                    control={fnfForm.control}
                    render={({field}) => (
                      <NumberInput
                        label="Other Deductions"
                        prefix="₹ "
                        thousandSeparator=","
                        decimalScale={2}
                        min={0}
                        disabled={!!isReadonly}
                        value={field.value}
                        onChange={(val) => field.onChange(val ?? 0)}
                      />
                    )}
                  />
                </Stack>
                <Divider my="sm"/>
                <Group justify="space-between">
                  <Text fw={700}>Total Deductions</Text>
                  <Text fw={700} c="red.7">{formatCurrency(liveDeductions)}</Text>
                </Group>
              </Paper>
            </SimpleGrid>

            {/* Net Payable */}
            <Paper withBorder p="md" radius="md" mt="md" className="bg-accent-50 dark:bg-accent-900/20">
              <Group justify="space-between">
                <Title order={3}>Net Payable</Title>
                <Title order={3} c={liveNet >= 0 ? 'sky.7' : 'red.7'}>
                  {formatCurrency(liveNet)}
                </Title>
              </Group>
            </Paper>

            {/* Gratuity & Remarks Section */}
            <SimpleGrid cols={{base: 1, md: 2}} spacing="md" mt="md">
              <Paper withBorder p="md" radius="md">
                <Title order={5} mb="sm">Gratuity Calculation</Title>
                <Stack gap="sm">
                  <Controller
                    name="yearsOfService"
                    control={fnfForm.control}
                    render={({field}) => (
                      <NumberInput
                        label="Years of Service"
                        decimalScale={2}
                        min={0}
                        disabled={!!isReadonly}
                        value={field.value ?? ''}
                        onChange={(val) => field.onChange(val ?? undefined)}
                      />
                    )}
                  />
                  <Controller
                    name="lastDrawnSalary"
                    control={fnfForm.control}
                    render={({field}) => (
                      <NumberInput
                        label="Last Drawn Basic Salary"
                        prefix="₹ "
                        thousandSeparator=","
                        decimalScale={2}
                        min={0}
                        disabled={!!isReadonly}
                        value={field.value ?? ''}
                        onChange={(val) => field.onChange(val ?? undefined)}
                      />
                    )}
                  />
                  <Text size="xs" c="dimmed">
                    Gratuity formula: (Last Drawn Salary x 15/26) x Years of Service. Eligible after 5+ years.
                  </Text>
                </Stack>
              </Paper>
              <Paper withBorder p="md" radius="md">
                <Title order={5} mb="sm">Remarks</Title>
                <Controller
                  name="remarks"
                  control={fnfForm.control}
                  render={({field}) => (
                    <Textarea
                      placeholder="Add any notes or remarks..."
                      rows={5}
                      disabled={!!isReadonly}
                      value={field.value ?? ''}
                      onChange={field.onChange}
                    />
                  )}
                />
              </Paper>
            </SimpleGrid>

            {/* Action Buttons */}
            <Group justify="flex-end" mt="md">
              {canEdit && (
                <Button
                  type="submit"
                  color="sky.7"
                  loading={createMutation.isPending || updateMutation.isPending}
                >
                  {settlement ? 'Save Changes' : 'Create Settlement'}
                </Button>
              )}
              {canSubmit && (
                <Button
                  color="yellow"
                  leftSection={<IconSend size={16}/>}
                  onClick={handleSubmitForApproval}
                  loading={submitMutation.isPending}
                >
                  Submit for Approval
                </Button>
              )}
              {canApprove && (
                <Button
                  color="green"
                  leftSection={<IconCheck size={16}/>}
                  onClick={handleApprove}
                  loading={approveMutation.isPending}
                >
                  Approve Settlement
                </Button>
              )}
            </Group>
          </form>

          {/* Payment Processing */}
          {canPay && settlement && (
            <Paper withBorder p="md" radius="md">
              <Title order={5} mb="md">Process Payment</Title>
              <form onSubmit={paymentForm.handleSubmit(handleProcessPayment)}>
                <SimpleGrid cols={{base: 1, md: 2}} spacing="md">
                  <Controller
                    name="paymentMode"
                    control={paymentForm.control}
                    render={({field, fieldState}) => (
                      <Select
                        label="Payment Mode"
                        placeholder="Select payment mode"
                        data={[
                          {value: PaymentMode.BANK_TRANSFER, label: 'Bank Transfer'},
                          {value: PaymentMode.CHEQUE, label: 'Cheque'},
                          {value: PaymentMode.CASH, label: 'Cash'},
                          {value: PaymentMode.DEMAND_DRAFT, label: 'Demand Draft'},
                        ]}
                        value={field.value ?? null}
                        onChange={(val) => field.onChange(val)}
                        error={fieldState.error?.message}
                      />
                    )}
                  />
                  <Controller
                    name="paymentReference"
                    control={paymentForm.control}
                    render={({field, fieldState}) => (
                      <Textarea
                        label="Payment Reference"
                        placeholder="Transaction ID, Cheque Number, etc."
                        value={field.value ?? ''}
                        onChange={field.onChange}
                        error={fieldState.error?.message}
                        rows={1}
                      />
                    )}
                  />
                </SimpleGrid>
                <Group justify="flex-end" mt="md">
                  <Button
                    type="submit"
                    color="green"
                    leftSection={<IconCash size={16}/>}
                    loading={paymentMutation.isPending}
                  >
                    Process Payment ({formatCurrency(settlement.netPayable)})
                  </Button>
                </Group>
              </form>
            </Paper>
          )}

          {/* Payment Details (if paid) */}
          {settlement?.status === SettlementStatus.PAID && (
            <Paper withBorder p="md" radius="md" bg="green.0">
              <Group gap="xl">
                <div>
                  <Text size="xs" c="dimmed">Payment Mode</Text>
                  <Text fw={600}>{settlement.paymentMode ? formatLabel(settlement.paymentMode) : '-'}</Text>
                </div>
                <div>
                  <Text size="xs" c="dimmed">Payment Reference</Text>
                  <Text fw={600}>{settlement.paymentReference ?? '-'}</Text>
                </div>
                <div>
                  <Text size="xs" c="dimmed">Payment Date</Text>
                  <Text fw={600}>{settlement.paymentDate ? formatDate(settlement.paymentDate) : '-'}</Text>
                </div>
                <div>
                  <Text size="xs" c="dimmed">Approved By</Text>
                  <Text fw={600}>{settlement.approvedByName ?? '-'}</Text>
                </div>
                <div>
                  <Text size="xs" c="dimmed">Net Amount Paid</Text>
                  <Text fw={700} c="green.7" size="lg">{formatCurrency(settlement.netPayable)}</Text>
                </div>
              </Group>
            </Paper>
          )}
        </Stack>
      </PermissionGate>
    </AppLayout>
  );
}
