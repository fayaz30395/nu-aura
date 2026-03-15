'use client';
import { AppLayout } from '@/components/layout';

import { useMemo } from 'react';
import { Title, Text, Button, Group, Card, Table, Badge, ActionIcon, Menu, Container, SimpleGrid, RingProgress, Center, ThemeIcon } from '@mantine/core';
import { IconPlus, IconDotsVertical, IconBriefcase, IconClock, IconCurrencyDollar, IconChartPie } from '@tabler/icons-react';
import { useRouter } from 'next/navigation';
import { PSAProject, ProjectStatus } from '@/lib/types/psa';
import { notifications } from '@mantine/notifications';
import { usePsaProjects } from '@/lib/hooks/queries/usePsa';

export default function PsaProjectsPage() {
    const router = useRouter();
    const { data, isLoading, error } = usePsaProjects();

    const projects = data ?? [];
    const loading = isLoading;

    const stats = useMemo(() => {
        if (!projects.length) {
            return { active: 0, planned: 0, completed: 0, totalBudget: 0 };
        }
        const active = projects.filter(p => p.status === ProjectStatus.ACTIVE).length;
        const planned = projects.filter(p => p.status === ProjectStatus.PLANNED).length;
        const completed = projects.filter(p => p.status === ProjectStatus.COMPLETED).length;
        const totalBudget = projects.reduce((acc, p) => acc + (p.budget || 0), 0);
        return { active, planned, completed, totalBudget };
    }, [projects]);

    if (error) {
        notifications.show({
            title: 'Error',
            message: 'Failed to load projects',
            color: 'red',
        });
    }

    const statusColor = (status: ProjectStatus) => {
        switch (status) {
            case ProjectStatus.ACTIVE: return 'green';
            case ProjectStatus.PLANNED: return 'blue';
            case ProjectStatus.ON_HOLD: return 'orange';
            case ProjectStatus.COMPLETED: return 'cyan';
            case ProjectStatus.CANCELLED: return 'gray';
            default: return 'gray';
        }
    };

    const rows = projects.map((project) => (
        <Table.Tr key={project.id}>
            <Table.Td>
                <Text fw={500}>{project.projectName}</Text>
                <Text c="dimmed" size="xs">{project.projectCode}</Text>
            </Table.Td>
            <Table.Td>{project.billingType.replace(/_/g, ' ')}</Table.Td>
            <Table.Td>
                {project.budget ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(project.budget) : '-'}
            </Table.Td>
            <Table.Td>{project.startDate || '-'}</Table.Td>
            <Table.Td>{project.endDate || '-'}</Table.Td>
            <Table.Td>
                <Badge color={statusColor(project.status)}>{project.status}</Badge>
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
                            <Menu.Item leftSection={<IconBriefcase size={16} stroke={1.5} />} onClick={() => router.push(`/psa/projects/${project.id}`)}>
                                View Dashboard
                            </Menu.Item>
                            <Menu.Item leftSection={<IconClock size={16} stroke={1.5} />} onClick={() => router.push(`/psa/projects/${project.id}/timesheets`)}>
                                View Timesheets
                            </Menu.Item>
                            <Menu.Item leftSection={<IconCurrencyDollar size={16} stroke={1.5} />} onClick={() => router.push(`/psa/projects/${project.id}/invoices`)}>
                                View Invoices
                            </Menu.Item>
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
                    <Title order={2}>Projects</Title>
                    <Text c="dimmed">Manage client projects, resources, and billing</Text>
                </div>
                <Button leftSection={<IconPlus size={20} />} onClick={() => router.push('/psa/projects/new')}>
                    New Project
                </Button>
            </Group>

            <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md" mb="lg">
                <Card withBorder padding="md" radius="md">
                    <Group justify="space-between">
                        <div>
                            <Text size="xs" c="dimmed" fw={700} tt="uppercase">Active Projects</Text>
                            <Text fw={700} size="xl">{stats.active}</Text>
                        </div>
                        <ThemeIcon color="green" variant="light" size={38} radius="md">
                            <IconChartPie size={20} />
                        </ThemeIcon>
                    </Group>
                </Card>
                <Card withBorder padding="md" radius="md">
                    <Group justify="space-between">
                        <div>
                            <Text size="xs" c="dimmed" fw={700} tt="uppercase">Pipeline (Planned)</Text>
                            <Text fw={700} size="xl">{stats.planned}</Text>
                        </div>
                        <ThemeIcon color="blue" variant="light" size={38} radius="md">
                            <IconBriefcase size={20} />
                        </ThemeIcon>
                    </Group>
                </Card>
                <Card withBorder padding="md" radius="md">
                    <Group justify="space-between">
                        <div>
                            <Text size="xs" c="dimmed" fw={700} tt="uppercase">Total Budget</Text>
                            <Text fw={700} size="xl">
                                {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact' }).format(stats.totalBudget)}
                            </Text>
                        </div>
                        <ThemeIcon color="cyan" variant="light" size={38} radius="md">
                            <IconCurrencyDollar size={20} />
                        </ThemeIcon>
                    </Group>
                </Card>
            </SimpleGrid>

            <Card withBorder radius="md" p="md">
                <Table verticalSpacing="sm" highlightOnHover>
                    <Table.Thead>
                        <Table.Tr>
                            <Table.Th>Project</Table.Th>
                            <Table.Th>Type</Table.Th>
                            <Table.Th>Budget</Table.Th>
                            <Table.Th>Start Date</Table.Th>
                            <Table.Th>End Date</Table.Th>
                            <Table.Th>Status</Table.Th>
                            <Table.Th />
                        </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                        {loading ? (
                            <Table.Tr>
                                <Table.Td colSpan={7} align="center">Loading...</Table.Td>
                            </Table.Tr>
                        ) : rows.length > 0 ? (
                            rows
                        ) : (
                            <Table.Tr>
                                <Table.Td colSpan={7} align="center">
                                    <Text c="dimmed">No projects found</Text>
                                    <Button variant="light" mt="xs" onClick={() => router.push('/psa/projects/new')}>
                                        Create your first project
                                    </Button>
                                </Table.Td>
                            </Table.Tr>
                        )}
                    </Table.Tbody>
                </Table>
            </Card>
            </Container>
        </AppLayout>
    );
}
