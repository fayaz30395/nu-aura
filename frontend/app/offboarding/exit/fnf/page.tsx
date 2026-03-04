'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Title,
  Text,
  Paper,
  Group,
  Stack,
  Badge,
  Button,
  Divider,
  NumberInput,
  Textarea,
  Select,
  Loader,
  Center,
  Alert,
  SimpleGrid,
  Table,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconCheck, IconAlertCircle } from '@tabler/icons-react';

interface FnFResponse {
  id: string;
  exitProcessId: string;
  employeeId: string;
  employeeName: string;
  pendingSalary: number;
  leaveEncashment: number;
  bonusAmount: number;
  gratuityAmount: number;
  noticePeriodRecovery: number;
  reimbursements: number;
  otherEarnings: number;
  noticeBuyout: number;
  loanRecovery: number;
  advanceRecovery: number;
  assetDamageDeduction: number;
  taxDeduction: number;
  otherDeductions: number;
  totalEarnings: number;
  totalDeductions: number;
  netPayable: number;
  yearsOfService?: number;
  isGratuityEligible?: boolean;
  lastDrawnSalary?: number;
  status: string;
  paymentMode?: string;
  paymentReference?: string;
  paymentDate?: string;
  remarks?: string;
  approvalDate?: string;
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'gray',
  PENDING_APPROVAL: 'yellow',
  APPROVED: 'teal',
  PROCESSING: 'blue',
  PAID: 'green',
  CANCELLED: 'red',
};

async function fetchFnF(exitProcessId: string): Promise<FnFResponse> {
  const res = await fetch(`/api/v1/exit/${exitProcessId}/fnf`, { credentials: 'include' });
  if (!res.ok) throw new Error('Failed to load FnF');
  return res.json();
}

async function adjustFnF(exitProcessId: string, data: object): Promise<FnFResponse> {
  const res = await fetch(`/api/v1/exit/${exitProcessId}/fnf/adjustments`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to save adjustments');
  return res.json();
}

async function approveFnF(exitProcessId: string): Promise<FnFResponse> {
  const res = await fetch(`/api/v1/exit/${exitProcessId}/fnf/approve`, {
    method: 'POST',
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Failed to approve FnF');
  return res.json();
}

const fmt = (v?: number) =>
  v != null ? `₹${Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—';

export default function FnFPage() {
  const searchParams = useSearchParams();
  const exitProcessId = searchParams.get('exitProcessId') ?? '';
  const queryClient = useQueryClient();

  const [remarks, setRemarks] = useState('');
  const [paymentMode, setPaymentMode] = useState<string | null>(null);
  const [loanRecovery, setLoanRecovery] = useState<number | string>('');
  const [taxDeduction, setTaxDeduction] = useState<number | string>('');
  const [otherDeductions, setOtherDeductions] = useState<number | string>('');
  const [reimbursements, setReimbursements] = useState<number | string>('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['fnf', exitProcessId],
    queryFn: () => fetchFnF(exitProcessId),
    enabled: !!exitProcessId,
  });

  const adjustMutation = useMutation({
    mutationFn: (adj: object) => adjustFnF(exitProcessId, adj),
    onSuccess: () => {
      notifications.show({ title: 'Saved', message: 'FnF adjustments saved', color: 'green', icon: <IconCheck size={16} /> });
      queryClient.invalidateQueries({ queryKey: ['fnf', exitProcessId] });
    },
    onError: () => notifications.show({ title: 'Error', message: 'Failed to save', color: 'red' }),
  });

  const approveMutation = useMutation({
    mutationFn: () => approveFnF(exitProcessId),
    onSuccess: () => {
      notifications.show({ title: 'Approved', message: 'FnF settlement approved', color: 'green' });
      queryClient.invalidateQueries({ queryKey: ['fnf', exitProcessId] });
    },
    onError: () => notifications.show({ title: 'Error', message: 'Approval failed', color: 'red' }),
  });

  if (!exitProcessId) return (
    <Alert icon={<IconAlertCircle size={16} />} color="orange">
      No exit process selected. Add ?exitProcessId=... to the URL.
    </Alert>
  );

  if (isLoading) return <Center h={300}><Loader /></Center>;
  if (error || !data) return (
    <Alert icon={<IconAlertCircle size={16} />} color="red">Failed to load FnF settlement</Alert>
  );

  const canEdit = data.status === 'DRAFT' || data.status === 'PENDING_APPROVAL';
  const canApprove = data.status === 'DRAFT' || data.status === 'PENDING_APPROVAL';

  return (
    <Stack gap="lg" p="md">
      <Group justify="space-between">
        <div>
          <Title order={2}>Full & Final Settlement</Title>
          <Text c="dimmed" size="sm">{data.employeeName}</Text>
        </div>
        <Group>
          <Badge color={STATUS_COLORS[data.status] ?? 'gray'} variant="filled" size="lg">
            {data.status}
          </Badge>
          {canApprove && (
            <Button
              color="teal"
              loading={approveMutation.isPending}
              onClick={() => approveMutation.mutate()}
            >
              Approve Settlement
            </Button>
          )}
        </Group>
      </Group>

      {/* Gratuity Info */}
      {data.yearsOfService != null && (
        <Paper withBorder p="sm" bg="blue.0">
          <Group gap="xl">
            <div>
              <Text size="xs" c="dimmed">Years of Service</Text>
              <Text fw={600}>{Number(data.yearsOfService).toFixed(1)} years</Text>
            </div>
            <div>
              <Text size="xs" c="dimmed">Gratuity Eligible</Text>
              <Badge color={data.isGratuityEligible ? 'green' : 'gray'}>
                {data.isGratuityEligible ? 'Yes' : 'No (< 5 years)'}
              </Badge>
            </div>
            {data.lastDrawnSalary && (
              <div>
                <Text size="xs" c="dimmed">Last Drawn Basic</Text>
                <Text fw={600}>{fmt(data.lastDrawnSalary)}</Text>
              </div>
            )}
          </Group>
        </Paper>
      )}

      <SimpleGrid cols={2} spacing="md">
        {/* Earnings */}
        <Paper withBorder p="md">
          <Title order={5} mb="sm" c="green.7">Earnings</Title>
          <Table>
            <Table.Tbody>
              <Table.Tr><Table.Td>Pending Salary</Table.Td><Table.Td ta="right">{fmt(data.pendingSalary)}</Table.Td></Table.Tr>
              <Table.Tr><Table.Td>Leave Encashment</Table.Td><Table.Td ta="right">{fmt(data.leaveEncashment)}</Table.Td></Table.Tr>
              <Table.Tr><Table.Td>Gratuity</Table.Td><Table.Td ta="right">{fmt(data.gratuityAmount)}</Table.Td></Table.Tr>
              <Table.Tr><Table.Td>Bonus</Table.Td><Table.Td ta="right">{fmt(data.bonusAmount)}</Table.Td></Table.Tr>
              <Table.Tr><Table.Td>Notice Period Recovery</Table.Td><Table.Td ta="right">{fmt(data.noticePeriodRecovery)}</Table.Td></Table.Tr>
              <Table.Tr><Table.Td>Reimbursements</Table.Td><Table.Td ta="right">{fmt(data.reimbursements)}</Table.Td></Table.Tr>
              <Table.Tr><Table.Td>Other Earnings</Table.Td><Table.Td ta="right">{fmt(data.otherEarnings)}</Table.Td></Table.Tr>
            </Table.Tbody>
          </Table>
          <Divider my="xs" />
          <Group justify="space-between">
            <Text fw={700}>Total Earnings</Text>
            <Text fw={700} c="green.7">{fmt(data.totalEarnings)}</Text>
          </Group>
        </Paper>

        {/* Deductions */}
        <Paper withBorder p="md">
          <Title order={5} mb="sm" c="red.7">Deductions</Title>
          <Table>
            <Table.Tbody>
              <Table.Tr><Table.Td>Notice Buyout</Table.Td><Table.Td ta="right">{fmt(data.noticeBuyout)}</Table.Td></Table.Tr>
              <Table.Tr><Table.Td>Loan Recovery</Table.Td><Table.Td ta="right">{fmt(data.loanRecovery)}</Table.Td></Table.Tr>
              <Table.Tr><Table.Td>Advance Recovery</Table.Td><Table.Td ta="right">{fmt(data.advanceRecovery)}</Table.Td></Table.Tr>
              <Table.Tr><Table.Td>Asset Damage</Table.Td><Table.Td ta="right">{fmt(data.assetDamageDeduction)}</Table.Td></Table.Tr>
              <Table.Tr><Table.Td>Tax Deduction</Table.Td><Table.Td ta="right">{fmt(data.taxDeduction)}</Table.Td></Table.Tr>
              <Table.Tr><Table.Td>Other Deductions</Table.Td><Table.Td ta="right">{fmt(data.otherDeductions)}</Table.Td></Table.Tr>
            </Table.Tbody>
          </Table>
          <Divider my="xs" />
          <Group justify="space-between">
            <Text fw={700}>Total Deductions</Text>
            <Text fw={700} c="red.7">{fmt(data.totalDeductions)}</Text>
          </Group>
        </Paper>
      </SimpleGrid>

      {/* Net Payable */}
      <Paper withBorder p="md" bg="teal.0">
        <Group justify="space-between">
          <Title order={3}>Net Payable</Title>
          <Title order={3} c="teal.7">{fmt(data.netPayable)}</Title>
        </Group>
      </Paper>

      {/* HR Adjustments */}
      {canEdit && (
        <Paper withBorder p="md">
          <Title order={5} mb="md">HR Adjustments</Title>
          <SimpleGrid cols={2} spacing="sm">
            <NumberInput
              label="Loan Recovery (₹)"
              value={loanRecovery}
              onChange={setLoanRecovery}
              min={0}
              decimalScale={2}
            />
            <NumberInput
              label="Tax Deduction (₹)"
              value={taxDeduction}
              onChange={setTaxDeduction}
              min={0}
              decimalScale={2}
            />
            <NumberInput
              label="Other Deductions (₹)"
              value={otherDeductions}
              onChange={setOtherDeductions}
              min={0}
              decimalScale={2}
            />
            <NumberInput
              label="Reimbursements (₹)"
              value={reimbursements}
              onChange={setReimbursements}
              min={0}
              decimalScale={2}
            />
            <Select
              label="Payment Mode"
              data={['BANK_TRANSFER', 'CHEQUE', 'CASH', 'DEMAND_DRAFT']}
              value={paymentMode}
              onChange={setPaymentMode}
            />
            <Textarea
              label="Remarks"
              value={remarks}
              onChange={(e) => setRemarks(e.currentTarget.value)}
              rows={2}
            />
          </SimpleGrid>
          <Group justify="flex-end" mt="md">
            <Button
              loading={adjustMutation.isPending}
              onClick={() =>
                adjustMutation.mutate({
                  loanRecovery: loanRecovery || undefined,
                  taxDeduction: taxDeduction || undefined,
                  otherDeductions: otherDeductions || undefined,
                  reimbursements: reimbursements || undefined,
                  paymentMode: paymentMode || undefined,
                  remarks: remarks || undefined,
                })
              }
            >
              Save Adjustments & Recalculate
            </Button>
          </Group>
        </Paper>
      )}
    </Stack>
  );
}
