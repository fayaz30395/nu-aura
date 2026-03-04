'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Title,
  Text,
  Paper,
  Table,
  Badge,
  Group,
  Stack,
  Button,
  Modal,
  TextInput,
  Textarea,
  Select,
  ActionIcon,
  Loader,
  Center,
  Alert,
  Tooltip,
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconPlus, IconEye, IconAlertCircle } from '@tabler/icons-react';
import type { PIPResponse, CreatePIPRequest, PIPStatus } from '@/lib/types/performance';

const STATUS_COLORS: Record<PIPStatus, string> = {
  ACTIVE: 'blue',
  COMPLETED: 'green',
  EXTENDED: 'orange',
  TERMINATED: 'red',
};

async function fetchPIPs(): Promise<PIPResponse[]> {
  const res = await fetch('/api/v1/performance/pip', { credentials: 'include' });
  if (!res.ok) throw new Error('Failed to load PIPs');
  return res.json();
}

async function createPIP(data: CreatePIPRequest): Promise<PIPResponse> {
  const res = await fetch('/api/v1/performance/pip', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create PIP');
  return res.json();
}

async function fetchPIPById(id: string): Promise<PIPResponse> {
  const res = await fetch(`/api/v1/performance/pip/${id}`, { credentials: 'include' });
  if (!res.ok) throw new Error('Failed to load PIP');
  return res.json();
}

export default function PIPPage() {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [viewId, setViewId] = useState<string | null>(null);

  const { data: pips, isLoading, error } = useQuery({
    queryKey: ['pips'],
    queryFn: fetchPIPs,
  });

  const { data: selectedPIP } = useQuery({
    queryKey: ['pip', viewId],
    queryFn: () => fetchPIPById(viewId!),
    enabled: !!viewId,
  });

  const form = useForm<CreatePIPRequest>({
    initialValues: {
      employeeId: '',
      managerId: '',
      startDate: '',
      endDate: '',
      reason: '',
      goals: '',
      checkInFrequency: 'WEEKLY',
    },
    validate: {
      employeeId: (v) => (!v ? 'Employee ID is required' : null),
      managerId: (v) => (!v ? 'Manager ID is required' : null),
      startDate: (v) => (!v ? 'Start date is required' : null),
      endDate: (v) => (!v ? 'End date is required' : null),
    },
  });

  const createMutation = useMutation({
    mutationFn: createPIP,
    onSuccess: () => {
      notifications.show({ title: 'PIP Created', message: 'Performance Improvement Plan created successfully', color: 'green' });
      setCreateOpen(false);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ['pips'] });
    },
    onError: () => {
      notifications.show({ title: 'Error', message: 'Failed to create PIP', color: 'red' });
    },
  });

  if (isLoading) return <Center h={300}><Loader /></Center>;
  if (error) return (
    <Alert icon={<IconAlertCircle size={16} />} color="red">Failed to load PIPs</Alert>
  );

  return (
    <Stack gap="lg" p="md">
      <Group justify="space-between">
        <div>
          <Title order={2}>Performance Improvement Plans</Title>
          <Text c="dimmed" size="sm">Manage and track employee PIPs</Text>
        </div>
        <Button leftSection={<IconPlus size={16} />} onClick={() => setCreateOpen(true)}>
          Create PIP
        </Button>
      </Group>

      <Paper withBorder>
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Employee</Table.Th>
              <Table.Th>Manager</Table.Th>
              <Table.Th>Period</Table.Th>
              <Table.Th>Check-in Frequency</Table.Th>
              <Table.Th>Check-ins</Table.Th>
              <Table.Th>Status</Table.Th>
              <Table.Th>Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {(!pips || pips.length === 0) && (
              <Table.Tr>
                <Table.Td colSpan={7}>
                  <Text ta="center" c="dimmed" py="lg">No PIPs found</Text>
                </Table.Td>
              </Table.Tr>
            )}
            {pips?.map((pip) => (
              <Table.Tr key={pip.id}>
                <Table.Td>{pip.employeeName ?? pip.employeeId}</Table.Td>
                <Table.Td>{pip.managerName ?? pip.managerId}</Table.Td>
                <Table.Td>
                  <Text size="sm">{pip.startDate} → {pip.endDate}</Text>
                </Table.Td>
                <Table.Td>
                  <Badge variant="light" size="sm">{pip.checkInFrequency}</Badge>
                </Table.Td>
                <Table.Td>{pip.checkInCount ?? 0}</Table.Td>
                <Table.Td>
                  <Badge color={STATUS_COLORS[pip.status]} variant="filled" size="sm">
                    {pip.status}
                  </Badge>
                </Table.Td>
                <Table.Td>
                  <Tooltip label="View details">
                    <ActionIcon variant="subtle" onClick={() => setViewId(pip.id)}>
                      <IconEye size={16} />
                    </ActionIcon>
                  </Tooltip>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Paper>

      {/* Create PIP Modal */}
      <Modal opened={createOpen} onClose={() => setCreateOpen(false)} title="Create Performance Improvement Plan" size="lg">
        <form onSubmit={form.onSubmit((values) => createMutation.mutate(values))}>
          <Stack gap="sm">
            <TextInput
              label="Employee ID"
              placeholder="UUID of employee"
              required
              {...form.getInputProps('employeeId')}
            />
            <TextInput
              label="Manager ID"
              placeholder="UUID of manager"
              required
              {...form.getInputProps('managerId')}
            />
            <Group grow>
              <TextInput
                label="Start Date"
                placeholder="YYYY-MM-DD"
                required
                {...form.getInputProps('startDate')}
              />
              <TextInput
                label="End Date"
                placeholder="YYYY-MM-DD"
                required
                {...form.getInputProps('endDate')}
              />
            </Group>
            <Select
              label="Check-in Frequency"
              data={['WEEKLY', 'BIWEEKLY', 'MONTHLY']}
              {...form.getInputProps('checkInFrequency')}
            />
            <Textarea
              label="Reason"
              placeholder="Reason for PIP..."
              rows={3}
              {...form.getInputProps('reason')}
            />
            <Textarea
              label="Goals"
              placeholder="Specific improvement goals..."
              rows={4}
              {...form.getInputProps('goals')}
            />
            <Group justify="flex-end" mt="sm">
              <Button variant="subtle" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button type="submit" loading={createMutation.isPending}>Create PIP</Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      {/* View PIP Modal */}
      <Modal
        opened={!!viewId}
        onClose={() => setViewId(null)}
        title="PIP Details"
        size="xl"
      >
        {!selectedPIP ? (
          <Center h={100}><Loader /></Center>
        ) : (
          <Stack gap="md">
            <Group>
              <div>
                <Text size="xs" c="dimmed">Employee</Text>
                <Text fw={500}>{selectedPIP.employeeName ?? selectedPIP.employeeId}</Text>
              </div>
              <div>
                <Text size="xs" c="dimmed">Manager</Text>
                <Text fw={500}>{selectedPIP.managerName ?? selectedPIP.managerId}</Text>
              </div>
              <div>
                <Text size="xs" c="dimmed">Status</Text>
                <Badge color={STATUS_COLORS[selectedPIP.status]} variant="filled">
                  {selectedPIP.status}
                </Badge>
              </div>
            </Group>

            <div>
              <Text size="xs" c="dimmed" mb={4}>Period</Text>
              <Text>{selectedPIP.startDate} → {selectedPIP.endDate}</Text>
            </div>

            {selectedPIP.reason && (
              <div>
                <Text size="xs" c="dimmed" mb={4}>Reason</Text>
                <Text>{selectedPIP.reason}</Text>
              </div>
            )}

            {selectedPIP.goals && (
              <div>
                <Text size="xs" c="dimmed" mb={4}>Goals</Text>
                <Paper withBorder p="sm" bg="gray.0">
                  <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>{selectedPIP.goals}</Text>
                </Paper>
              </div>
            )}

            {selectedPIP.checkIns && selectedPIP.checkIns.length > 0 && (
              <div>
                <Text fw={500} mb="xs">Check-ins ({selectedPIP.checkIns.length})</Text>
                <Stack gap="xs">
                  {selectedPIP.checkIns.map((ci) => (
                    <Paper key={ci.id} withBorder p="sm">
                      <Group justify="space-between" mb={4}>
                        <Text size="sm" fw={500}>{ci.checkInDate}</Text>
                      </Group>
                      {ci.progressNotes && <Text size="sm">Progress: {ci.progressNotes}</Text>}
                      {ci.managerComments && <Text size="sm" c="dimmed">Manager: {ci.managerComments}</Text>}
                    </Paper>
                  ))}
                </Stack>
              </div>
            )}
          </Stack>
        )}
      </Modal>
    </Stack>
  );
}
