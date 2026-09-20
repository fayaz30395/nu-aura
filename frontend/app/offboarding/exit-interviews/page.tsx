'use client';

import React, {useState} from 'react';
import {useRouter} from 'next/navigation';
import {ActionIcon, Badge, Center, Group, Loader, Pagination, Paper, Table, Text, Title,} from '@mantine/core';
import {IconArrowLeft, IconEye} from '@tabler/icons-react';
import {AppLayout} from '@/components/layout/AppLayout';
import {PermissionGate} from '@/components/auth/PermissionGate';
import {Permissions} from '@/lib/hooks/usePermissions';
import {useAllExitInterviews} from '@/lib/hooks/queries/useExit';
import type {InterviewStatus} from '@/lib/types/hrms/exit';
import {formatDate} from '@/lib/utils';

const getInterviewStatusColor = (status: InterviewStatus | string): string => {
  const map: Record<string, string> = {
    SCHEDULED: 'blue',
    COMPLETED: 'green',
    CANCELLED: 'red',
    NO_SHOW: 'orange',
    RESCHEDULED: 'yellow',
  };
  return map[status] ?? 'gray';
};

const formatLabel = (str: string): string =>
  str.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

const PAGE_SIZE = 20;

export default function ExitInterviewsPage() {
  const router = useRouter();
  const [page, setPage] = useState(0);
  const {data, isLoading} = useAllExitInterviews(page, PAGE_SIZE);

  const interviews = data?.content ?? [];

  return (
    <AppLayout>
      <PermissionGate anyOf={[Permissions.EXIT_VIEW, Permissions.EXIT_MANAGE]}>
        <div className="space-y-6 p-4 md:p-6">
          <Group>
            <ActionIcon variant="subtle" size="lg" aria-label="Back to offboarding list"
                        onClick={() => router.push('/offboarding')}>
              <IconArrowLeft size={20}/>
            </ActionIcon>
            <div>
              <Title order={2}>Exit Interviews</Title>
              <Text size="sm" c="dimmed">Company-wide exit interview records</Text>
            </div>
          </Group>

          {isLoading ? (
            <Center h={200}><Loader/></Center>
          ) : interviews.length === 0 ? (
            <Paper withBorder p="xl" ta="center">
              <Text c="dimmed">No exit interviews found.</Text>
            </Paper>
          ) : (
            <Paper withBorder radius="md">
              <Table striped highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Employee</Table.Th>
                    <Table.Th>Interviewer</Table.Th>
                    <Table.Th>Scheduled Date</Table.Th>
                    <Table.Th>Status</Table.Th>
                    <Table.Th>Actions</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {interviews.map((interview) => (
                    <Table.Tr key={interview.id}>
                      <Table.Td>
                        <Text size="sm" fw={500}>{interview.employeeName ?? '-'}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm">{interview.interviewerName ?? '-'}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm">
                          {interview.scheduledDate ? formatDate(interview.scheduledDate) : '-'}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Badge color={getInterviewStatusColor(interview.status)} variant="light" size="sm">
                          {formatLabel(interview.status)}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <ActionIcon
                          size="sm"
                          variant="light"
                          color="sky.7"
                          aria-label={`View exit interview for ${interview.employeeName ?? 'employee'}`}
                          onClick={() => router.push(`/offboarding/${interview.exitProcessId}/exit-interview`)}
                        >
                          <IconEye size={14}/>
                        </ActionIcon>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Paper>
          )}

          {data && data.totalPages > 1 && (
            <Group justify="center">
              <Pagination
                total={data.totalPages}
                value={page + 1}
                onChange={(p) => setPage(p - 1)}
                size="sm"
              />
            </Group>
          )}
        </div>
      </PermissionGate>
    </AppLayout>
  );
}
