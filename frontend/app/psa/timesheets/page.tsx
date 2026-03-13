'use client';
import { AppLayout } from '@/components/layout';

import { useState, useEffect } from 'react';
import { Title, Text, Button, Group, Card, Table, Badge, ActionIcon, Menu, Container, Tabs, Modal, Select, NumberInput, TextInput } from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { IconPlus, IconDotsVertical, IconCheck, IconX, IconCalendar, IconClock } from '@tabler/icons-react';
import { useRouter } from 'next/navigation';
import { psaService } from '@/lib/services/psa.service';
import { PSATimesheet, PSAProject, TimesheetStatus } from '@/lib/types/psa';
import { notifications } from '@mantine/notifications';
import { useDisclosure } from '@mantine/hooks';

export default function PsaTimesheetsPage() {
    const router = useRouter();
    const [timesheets, setTimesheets] = useState<PSATimesheet[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<string | null>('my-timesheets');

    // Create Timesheet Modal State
    const [opened, { open, close }] = useDisclosure(false);
    const [projects, setProjects] = useState<PSAProject[]>([]);
    const [newTimesheet, setNewTimesheet] = useState({
        projectId: '',
        weekStartDate: new Date(),
        hours: 0,
        description: ''
    });

    useEffect(() => {
        fetchTimesheets();
        fetchProjects();
    }, []);

    const fetchTimesheets = async () => {
        try {
            setLoading(true);
            // Mocking employee ID for now - In real app, get from auth context
            const employeeId = 'current-user-id-placeholder';
            const data = await psaService.getEmployeeTimesheets(employeeId);
            setTimesheets(data);
        } catch (error) {
            console.error('Error fetching timesheets:', error);
            // Fallback for demo if backend is empty/erroring
            setTimesheets([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchProjects = async () => {
        try {
            const data = await psaService.getAllProjects();
            setProjects(data);
        } catch (error) {
            console.log('Error fetching projects for select', error);
        }
    }

    const handleCreateTimesheet = async () => {
        try {
            // This is a simplified create flow. Ideally, we create a header then entries.
            // For this demo, we'll assume creating a timesheet header for the week.
            await psaService.createTimesheet({
                employeeId: 'current-user-uuid', // Should be dynamic
                weekStartDate: newTimesheet.weekStartDate.toISOString().split('T')[0],
                weekEndDate: new Date(newTimesheet.weekStartDate.getTime() + 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                totalHours: 0,
                status: TimesheetStatus.DRAFT
            });
            notifications.show({ title: 'Success', message: 'Timesheet created', color: 'green' });
            close();
            fetchTimesheets();
        } catch (error) {
            notifications.show({ title: 'Error', message: 'Failed to create timesheet', color: 'red' });
        }
    }

    const statusColor = (status: TimesheetStatus) => {
        switch (status) {
            case TimesheetStatus.APPROVED: return 'green';
            case TimesheetStatus.REJECTED: return 'red';
            case TimesheetStatus.SUBMITTED: return 'blue';
            case TimesheetStatus.UNDER_REVIEW: return 'yellow';
            default: return 'gray';
        }
    };

    const rows = timesheets.map((ts) => (
        <Table.Tr key={ts.id}>
            <Table.Td>{ts.weekStartDate} - {ts.weekEndDate}</Table.Td>
            <Table.Td>{ts.totalHours} hrs</Table.Td>
            <Table.Td>{ts.billableHours || 0} hrs</Table.Td>
            <Table.Td>
                <Badge color={statusColor(ts.status)}>{ts.status}</Badge>
            </Table.Td>
            <Table.Td>
                <Group gap={0} justify="flex-end">
                    <Menu transitionProps={{ transition: 'pop' }} withArrow position="bottom-end">
                        <Menu.Target>
                            <ActionIcon variant="subtle" color="gray">
                                <IconDotsVertical size={16} stroke={1.5} />
                            </ActionIcon>
                        </Menu.Target>
                        <Menu.Dropdown>
                            <Menu.Item leftSection={<IconClock size={16} stroke={1.5} />} onClick={() => router.push(`/psa/timesheets/${ts.id}`)}>
                                Edit Entries
                            </Menu.Item>
                            {ts.status === TimesheetStatus.DRAFT && (
                                <Menu.Item leftSection={<IconCheck size={16} stroke={1.5} />} onClick={() => psaService.submitTimesheet(ts.id)}>
                                    Submit
                                </Menu.Item>
                            )}
                        </Menu.Dropdown>
                    </Menu>
                </Group>
            </Table.Td>
        </Table.Tr>
    ));

    return (
        <AppLayout>
            <Container size="xl" py="lg">
            <Group justify="space-between" mb="lg">
                <div>
                    <Title order={2}>Timesheets</Title>
                    <Text c="dimmed">Track work hours and project billability</Text>
                </div>
                <Button leftSection={<IconPlus size={20} />} onClick={open}>
                    New Timesheet
                </Button>
            </Group>

            <Tabs value={activeTab} onChange={setActiveTab} mb="lg">
                <Tabs.List>
                    <Tabs.Tab value="my-timesheets" leftSection={<IconClock size={12} />}>My Timesheets</Tabs.Tab>
                    <Tabs.Tab value="approvals" leftSection={<IconCheck size={12} />}>Approvals</Tabs.Tab>
                </Tabs.List>

                <Tabs.Panel value="my-timesheets" pt="md">
                    <Card withBorder radius="md" p="md">
                        <Table verticalSpacing="sm" highlightOnHover>
                            <Table.Thead>
                                <Table.Tr>
                                    <Table.Th>Week</Table.Th>
                                    <Table.Th>Total Hours</Table.Th>
                                    <Table.Th>Billable</Table.Th>
                                    <Table.Th>Status</Table.Th>
                                    <Table.Th />
                                </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                                {loading ? (
                                    <Table.Tr><Table.Td colSpan={5} align="center">Loading...</Table.Td></Table.Tr>
                                ) : rows.length > 0 ? (
                                    rows
                                ) : (
                                    <Table.Tr>
                                        <Table.Td colSpan={5} align="center">
                                            <Text c="dimmed">No timesheets found</Text>
                                        </Table.Td>
                                    </Table.Tr>
                                )}
                            </Table.Tbody>
                        </Table>
                    </Card>
                </Tabs.Panel>

                <Tabs.Panel value="approvals" pt="md">
                    <Text c="dimmed" fs="italic">No timesheets pending approval.</Text>
                </Tabs.Panel>
            </Tabs>

            <Modal opened={opened} onClose={close} title="New Weekly Timesheet">
                <Group align="flex-end">
                    <DatePickerInput
                        label="Week Start Date"
                        placeholder="Pick date"
                        value={newTimesheet.weekStartDate}
                        onChange={(date) => setNewTimesheet({ ...newTimesheet, weekStartDate: date ? new Date(date) : new Date() })}
                        w="100%"
                    />
                    <Button fullWidth onClick={handleCreateTimesheet}>Create Draft</Button>
                </Group>
            </Modal>

            </Container>
        </AppLayout>
    );
}
