'use client';

import {useState} from 'react';
import {useParams} from 'next/navigation';
import {AppLayout} from '@/components/layout';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {apiClient} from '@/lib/api/client';
import {
  Alert,
  Badge,
  Button,
  Card,
  Center,
  Group,
  Loader,
  NumberInput,
  Paper,
  Progress,
  SimpleGrid,
  Stack,
  Table,
  Text,
  Title,
} from '@mantine/core';
import {notifications} from '@mantine/notifications';
import {IconAlertCircle, IconCheck} from '@tabler/icons-react';
import type {CalibrationEmployee, CalibrationResponse} from '@/lib/types/grow/performance';
import {PermissionGate} from '@/components/auth/PermissionGate';
import {Permissions} from '@/lib/hooks/usePermissions';

const RATING_LABELS: Record<number, { label: string; color: string }> = {
  1: {label: 'Needs Improvement', color: 'red'},
  2: {label: 'Below Expectations', color: 'orange'},
  3: {label: 'Meets Expectations', color: 'yellow'},
  4: {label: 'Exceeds Expectations', color: 'teal'},
  5: {label: 'Outstanding', color: 'green'},
};

async function fetchCalibration(cycleId: string): Promise<CalibrationResponse> {
  const res = await apiClient.get<CalibrationResponse>(`/review-cycles/${cycleId}/calibration`);
  return res.data;
}

async function saveCalibrationRating(reviewId: string, finalRating: number) {
  await apiClient.put(`/review-cycles/reviews/${reviewId}/calibration-rating?finalRating=${finalRating}`);
}

export default function CalibrationPage() {
  const {id: cycleId} = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [draftRatings, setDraftRatings] = useState<Record<string, number>>({});

  const {data, isLoading, error} = useQuery({
    queryKey: ['calibration', cycleId],
    queryFn: () => fetchCalibration(cycleId),
  });

  const saveMutation = useMutation({
    mutationFn: ({reviewId, rating}: { reviewId: string; rating: number }) =>
      saveCalibrationRating(reviewId, rating),
    onSuccess: (_, {reviewId}) => {
      notifications.show({
        title: 'Saved',
        message: 'Calibration rating updated',
        color: 'green',
        icon: <IconCheck size={16}/>
      });
      setDraftRatings((prev) => {
        const next = {...prev};
        delete next[reviewId];
        return next;
      });
      queryClient.invalidateQueries({queryKey: ['calibration', cycleId]});
    },
    onError: () => {
      notifications.show({title: 'Error', message: 'Failed to save rating', color: 'red'});
    },
  });

  if (isLoading) return <Center h={300}><Loader/></Center>;
  if (error || !data) return (
    <Alert icon={<IconAlertCircle size={16}/>} color="red">
      Failed to load calibration data
    </Alert>
  );

  const totalEmployees = data.totalEmployees || 0;

  return (
    <AppLayout>
      <Stack gap="lg" p="md">
        <Group justify="space-between">
          <div>
            <Title order={2} className="skeuo-emboss">Calibration</Title>
            <Text c="dimmed" size="sm">{data.cycleName} — {totalEmployees} employees</Text>
          </div>
        </Group>

        {/* Rating Distribution */}
        <SimpleGrid cols={5} spacing="sm">
          {[1, 2, 3, 4, 5].map((rating) => {
            const count = data.distribution[rating] ?? 0;
            const pct = totalEmployees > 0 ? Math.round((count / totalEmployees) * 100) : 0;
            const meta = RATING_LABELS[rating];
            return (
              <Card key={rating} withBorder padding="sm" className="skeuo-card">
                <Stack gap={4}>
                  <Group justify="space-between">
                    <Badge color={meta.color} variant="light" size="sm">{rating}</Badge>
                    <Text fw={700} size="lg">{count}</Text>
                  </Group>
                  <Text size="xs" c="dimmed">{meta.label}</Text>
                  <Progress value={pct} color={meta.color} size="xs"/>
                  <Text size="xs" ta="right">{pct}%</Text>
                </Stack>
              </Card>
            );
          })}
        </SimpleGrid>

        {/* Calibration Table */}
        <Paper withBorder>
          <Table striped highlightOnHover className="table-aura">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Employee</Table.Th>
                <Table.Th>Self Rating</Table.Th>
                <Table.Th>Manager Rating</Table.Th>
                <Table.Th>Final Rating</Table.Th>
                {data.employees.some((e) => e.editable) && <Table.Th>Actions</Table.Th>}
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {data.employees.map((emp: CalibrationEmployee) => {
                const draftVal = draftRatings[emp.reviewId];
                const displayRating = draftVal ?? emp.finalRating;
                return (
                  <Table.Tr key={emp.reviewId}>
                    <Table.Td>{emp.employeeName}</Table.Td>
                    <Table.Td>
                      {emp.selfRating ? (
                        <Badge color={RATING_LABELS[emp.selfRating]?.color ?? 'gray'} variant="light">
                          {emp.selfRating}
                        </Badge>
                      ) : <Text c="dimmed" size="sm">—</Text>}
                    </Table.Td>
                    <Table.Td>
                      {emp.managerRating ? (
                        <Badge color={RATING_LABELS[emp.managerRating]?.color ?? 'gray'} variant="light">
                          {emp.managerRating}
                        </Badge>
                      ) : <Text c="dimmed" size="sm">—</Text>}
                    </Table.Td>
                    <Table.Td>
                      {emp.editable ? (
                        <NumberInput
                          min={1}
                          max={5}
                          value={displayRating ?? ''}
                          onChange={(val) =>
                            setDraftRatings((prev) => ({...prev, [emp.reviewId]: Number(val)}))
                          }
                          w={80}
                          size="xs"
                        />
                      ) : (
                        displayRating ? (
                          <Badge color={RATING_LABELS[displayRating]?.color ?? 'gray'} variant="filled">
                            {displayRating}
                          </Badge>
                        ) : <Text c="dimmed" size="sm">—</Text>
                      )}
                    </Table.Td>
                    {emp.editable && (
                      <Table.Td>
                        <PermissionGate permission={Permissions.CALIBRATION_MANAGE}>
                          <Button
                            size="xs"
                            disabled={draftVal == null || draftVal === emp.finalRating}
                            loading={saveMutation.isPending}
                            onClick={() =>
                              saveMutation.mutate({reviewId: emp.reviewId, rating: draftVal!})
                            }
                          >
                            Save
                          </Button>
                        </PermissionGate>
                      </Table.Td>
                    )}
                  </Table.Tr>
                );
              })}
            </Table.Tbody>
          </Table>
        </Paper>
      </Stack>
    </AppLayout>
  );
}
